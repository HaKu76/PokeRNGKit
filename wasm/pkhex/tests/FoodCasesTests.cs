// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class FoodCasesTests
{
    private static void Check(bool value,string message) { if(!value) throw new Exception(message); }
    private static ISaveBlock3LargeHoenn Hoenn(SaveFile save) => save is SAV3RS rs ? rs.LargeBlock : ((SAV3E)save).LargeBlock;
    private static SAV3RS Ruby()
    {
        var data=new byte[SaveUtil.SIZE_G3RAW];
        for(int slot=0;slot<2;slot++) for(ushort sector=0;sector<14;sector++) {int at=(slot*14+sector)*0x1000;BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(at+0xFF4),sector);BinaryPrimitives.WriteUInt32LittleEndian(data.AsSpan(at+0xFF8),0x08012025);}
        data[6]=data[7]=255;return new SAV3RS(data){OT="TEST"};
    }
    private static byte[] Apply(byte[] input,SaveFoodEdit edit)
    {
        var original=input.ToArray();
        try{return SaveService.EditFood(input,JsonSerializer.Serialize(edit,SaveJsonContext.Default.SaveFoodEdit));}
        finally{Check(input.SequenceEqual(original),"Case edits preserve original on success and rejection");}
    }
    private static void Reject(byte[] input,SaveFoodEdit edit)
    {
        try{Apply(input,edit);throw new Exception("Invalid case edit accepted");}catch(ArgumentException){}
    }
    private static void Seed(SaveFile save)
    {
        if(save is SAV3RS or SAV3E) {var c=Hoenn(save).PokeBlocks;for(int i=0;i<c.Blocks.Length;i++){c.Blocks[i].Data.Fill((byte)(i+101));c.Blocks[i].Color=(PokeBlock3Color)(i==0?255:i%15);}Hoenn(save).PokeBlocks=c;}
        else if(save is SAV4Sinnoh sinnoh) {var c=new PoffinCase4(sinnoh);for(int i=0;i<c.Poffins.Length;i++){c.Poffins[i].Data.Fill((byte)(i+101));c.Poffins[i].Type=(PoffinFlavor4)(i==0?255:i%31);}c.Save();}
        else {var s=(SAV8BS)save;for(int i=0;i<100;i++){byte[] raw=Enumerable.Repeat((byte)(i+101),16).ToArray();raw[0]=(byte)(i%4==0?255:i%4==1?200:i%30);raw[1]=(byte)i;BinaryPrimitives.WriteUInt32LittleEndian(raw.AsSpan(4),i%3==0?1u:i%3==1?0u:2u);s.Poffins.SetPoffin(i,new Poffin8b(raw));}s.Poffins.CookingCount=int.MinValue;}
    }
    // Independent raw layout oracle; the bridge writes named Core properties.
    private static void DirectEdit(SaveFile save,FoodCaseEdit edit)
    {
        void Bytes(Span<byte> bytes){bytes[0]=(byte)edit.Type;for(int n=0;n<6;n++)bytes[n+1]=(byte)edit.Stats[n];}
        if(save is SAV3RS or SAV3E){var c=Hoenn(save).PokeBlocks;Bytes(c.Blocks[edit.Index].Data);Hoenn(save).PokeBlocks=c;}
        else if(save is SAV4Sinnoh sinnoh){var c=new PoffinCase4(sinnoh);Bytes(c.Poffins[edit.Index].Data);c.Save();}
        else {var s=(SAV8BS)save;var items=s.Poffins.GetPoffins();byte[] raw=new byte[16];items[edit.Index].CopyTo(raw);raw[0]=(byte)edit.Type;raw[1]=(byte)edit.Level!.Value;raw[2]=(byte)edit.Stats[5];for(int n=0;n<5;n++)raw[8+n]=(byte)edit.Stats[n];if(items[edit.Index].IsNew!=edit.New!.Value)BinaryPrimitives.WriteUInt32LittleEndian(raw.AsSpan(4),edit.New.Value?1u:0u);items[edit.Index]=new Poffin8b(raw);s.Poffins.SetPoffins(items);}
    }
    private static void DirectBatch(SaveFile save,string action)
    {
        if(save is SAV3RS or SAV3E){var c=Hoenn(save).PokeBlocks;if(action=="caseFill")c.MaximizeAll(true);else c.DeleteAll();Hoenn(save).PokeBlocks=c;}
        else if(save is SAV4Sinnoh sinnoh){var c=new PoffinCase4(sinnoh);if(action=="caseFill")c.FillCase();else c.DeleteAll();c.Save();}
        else {var s=(SAV8BS)save;var items=s.Poffins.GetPoffins();foreach(var p in items){if(action=="caseFill"){p.MstID=28;p.Level=60;p.Taste=p.FlavorSpicy=p.FlavorDry=p.FlavorSweet=p.FlavorBitter=p.FlavorSour=255;}else if(action=="caseClear")p.ToNull();}s.Poffins.SetPoffins(items);}
    }
    public static void Run()
    {
        SaveFile[] saves=[Ruby(),..new[]{"E","D","Pt","BD"}.Select(v=>SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{v}.sav"))!)];
        var pearl=(SAV8BS)saves[^1].Clone();pearl.Version=GameVersion.SP;
        foreach(var template in saves.Append(pearl))
        {
            Seed(template);var input=template.Write().ToArray();var save=SaveUtil.GetSaveFile(input.ToArray())!;
            var catalog=JsonSerializer.Deserialize(SaveService.ReadFood(input),SaveJsonContext.Default.SaveFoodCatalog)!.Case!;
            bool bdsp=save is SAV8BS;int slots=save is SAV3RS or SAV3E?40:100;
            Check(catalog.Entries.Length==slots&&catalog.Types.Length==(slots==40?15:31),"All slots and type choices");
            Check(catalog.Types.All(t=>!string.IsNullOrWhiteSpace(t.Name.Zh)&&!string.IsNullOrWhiteSpace(t.Name.En)&&!string.IsNullOrWhiteSpace(t.Name.Ja)),"Three-language case names including empty and enum marker");
            foreach(var entry in catalog.Entries)
            {
                var edit=new FoodCaseEdit(entry.Index,entry.Type,[0,255,1,254,37,99],bdsp?255:null,bdsp?!entry.New!.Value:null);
                var expected=SaveUtil.GetSaveFile(input.ToArray())!;DirectEdit(expected,edit);
                var output=Apply(input,new("caseEdit",Case:edit));
                Check(output.SequenceEqual(expected.Write().ToArray()),"Every physical slot matches raw layout oracle and full Core save output");
                var after=SaveUtil.GetSaveFile(output.ToArray())!;Check(SaveChecksums.Valid(after),"Case checksum survives reread");
                if(!bdsp)Check(FoodCases.Read(after).Entries[entry.Index].Level==255,"Derived level ignores feel and follows five flavors");
            }
            foreach(var type in catalog.Types)
            {
                var edit=new FoodCaseEdit(0,type.Value,[255,0,0,0,0,0],bdsp?0:null,bdsp?false:null);
                var expected=SaveUtil.GetSaveFile(input.ToArray())!;DirectEdit(expected,edit);
                Check(Apply(input,new("caseEdit",Case:edit)).SequenceEqual(expected.Write().ToArray()),"Every enum/list type, including empty and fourth-gen marker");
            }
            foreach(var action in bdsp?new[]{"caseFill","caseClear","caseSort"}:new[]{"caseFill","caseClear"})
            {
                var expected=SaveUtil.GetSaveFile(input.ToArray())!;DirectBatch(expected,action);
                var output=Apply(input,new(action));Check(output.SequenceEqual(expected.Write().ToArray()),"Batch defaults, reserved bytes, stable sorting and unrelated save data match Core");
                var after=SaveUtil.GetSaveFile(output.ToArray())!;
                if(bdsp)Check(((SAV8BS)after).Poffins.CookingCount==int.MinValue,"Cooking count preserved");
                if(action=="caseClear")Check(FoodCases.Read(after).Entries.All(e=>e.Type==(slots==40?0:bdsp?255:30)),"Correct per-format empty sentinel");
                if(action=="caseFill")Check(FoodCases.Read(after).Entries.All(e=>e.Stats.All(v=>v==255)&&e.Level==(bdsp?60:255)&&e.Type==(slots==40?14:bdsp?28:25)),"Exact upstream fill defaults");
            }
            var first=catalog.Entries[0];var valid=new FoodCaseEdit(0,first.Type,first.Stats,bdsp?first.Level:null,bdsp?first.New:null);
            foreach(var edit in new[]{valid with{Index=-1},valid with{Index=slots},valid with{Type=256},valid with{Type=254},valid with{Stats=[]},valid with{Stats=[-1,0,0,0,0,0]},valid with{Stats=[256,0,0,0,0,0]},valid with{Level=bdsp?256:0},valid with{New=bdsp?null:false}})Reject(input,new("caseEdit",Case:edit));
            foreach(var request in new[]{new SaveFoodEdit("caseEdit"),new("caseFill",Case:valid),new("caseClear",Values:[]),new("caseEdit",Count:0,Case:valid),new("caseEdit",BlockValues:[],Case:valid),new("edit",Case:valid),new("fill")})Reject(input,request);
            if(!bdsp)Reject(input,new("caseSort"));
            foreach(var json in new[]{"{\"action\":\"caseEdit\",\"case\":{\"type\":0,\"stats\":[0,0,0,0,0,0]}}","{\"action\":\"caseEdit\",\"case\":{\"index\":0,\"stats\":[0,0,0,0,0,0]}}"})
            {
                var original=input.ToArray();
                try{SaveService.EditFood(input,json);throw new Exception("Missing case address/type accepted");}catch(JsonException){Check(input.SequenceEqual(original),"Malformed request preserves input");}
            }
            if(save is SAV4Sinnoh)foreach(var e in catalog.Entries){var core=new PoffinCase4((SAV4Sinnoh)save).Poffins[e.Index];Check(e.Primary==(byte)core.StatPrimary&&e.Secondary==(byte)core.StatSecondary&&e.Many==core.IsManyStat,"Read-only flavor descriptors");}
            Console.WriteLine($"PASS {save.GetType().Name}/{save.Version}: {slots} slots, every type, byte boundaries, native batch defaults, raw full-file parity, sort/reserved data and original preservation");
        }
        foreach(var version in new[]{"HG","B","X","OR","SN","US","GP"}) {var input=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");foreach(var action in new[]{"caseEdit","caseFill","caseClear","caseSort"})Reject(input,new(action));}
    }
}
