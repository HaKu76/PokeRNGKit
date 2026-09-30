// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
using System.Buffers.Binary;
internal static class EventEditingTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid event request accepted");}catch(ArgumentException){}catch(JsonException){}catch(FormatException){}}
    private static SaveFile Open(byte[] data)=>SaveUtil.GetSaveFile(data.ToArray())??throw new Exception("Fixture not detected");
    private static IEventFlag37 Block(SaveFile s)=>s is IEventFlagProvider37 p?p.EventWork:(IEventFlag37)s;
    private static byte[] Apply(byte[] data,EventEdit edit)
    {
        var original=data.ToArray();try{return SaveService.EditEvents(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.EventEdit));}
        finally{Check(original.SequenceEqual(data),"Edit never mutates input");}
    }
    private static SAV3 Gba(bool frlg)
    {
        var data=new byte[SaveUtil.SIZE_G3RAW];
        for(int slot=0;slot<2;slot++)for(ushort sector=0;sector<14;sector++){int at=(slot*14+sector)*0x1000;BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(at+0xFF4),sector);BinaryPrimitives.WriteUInt32LittleEndian(data.AsSpan(at+0xFF8),0x08012025);}
        if(frlg)data[0xAC]=1;data[6]=data[7]=255;return frlg?new SAV3FRLG(data):new SAV3RS(data);
    }
    public static void Run()
    {
        var seeds=new List<SaveFile>{Gba(false),Gba(true)};
        seeds.AddRange(new[]{"E","D","Pt","HG","B","B2","X","OR","SN","US"}.Select(v=>Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{v}.sav"))));
        foreach(var seed in seeds)
        {
            var originalBlock=Block(seed);
            for(int i=0;i<originalBlock.EventFlagCount;i++)originalBlock.SetEventFlag(i,i%3==0);
            for(int i=0;i<originalBlock.EventWorkCount;i++)originalBlock.SetWork(i,(ushort)((i*137)%65536));
            if(seed is SAV7 seven)seven.Data.Slice(seven.AllBlocks[35].Offset+0x168,12).Fill(0xA5);
            var data=seed.Write().ToArray();var original=data.ToArray();var source=Open(data);var block=Block(source);
            foreach(var language in new[]{"zh","en","ja"})
            {
                var c=JsonSerializer.Deserialize(SaveService.ReadEvents(data,JsonSerializer.Serialize(new EventQuery(language),SaveJsonContext.Default.EventQuery)),SaveJsonContext.Default.EventCatalog)!;
                Check(c.MaximumValue==65535&&c.CanEdit&&c.UpdatesQr==(source is SAV7),"Gen3–7 retains ushort limits and its independent edit capability");
                Check(c.Flags.SequenceEqual(block.GetEventFlags())&&c.Values.SequenceEqual(block.GetAllEventWork()),"Catalog values match every position");
                Check(c.FlagLabels.All(l=>l.Index>=0&&l.Index<c.Flags.Length)&&c.WorkLabels.All(l=>l.Index>=0&&l.Index<c.Values.Length),"All localized resource indices bounded");
                Check(c.FlagLabels.Select(l=>l.Index).Distinct().Count()==c.FlagLabels.Length&&c.WorkLabels.Select(l=>l.Index).Distinct().Count()==c.WorkLabels.Length,"Unique labels");
                Check(c.WorkLabels.All(l=>l.Presets.All(p=>p.Value>=0&&p.Value<65535)),"Custom sentinel is not a preset");
            }
            Check(original.SequenceEqual(data),"Catalog leaves source intact");
            Check(Apply(data,new([],[])).SequenceEqual(data),"No-op keeps unrelated QR bytes");
            Check(Apply(data,new([new(0,block.GetEventFlag(0))],[new(0,block.GetWork(0))])).SequenceEqual(data),"Unchanged explicit fields preserve QR bytes");
            var flagIndices=new[]{0,1,7,8,block.EventFlagCount-1};
            var workIndices=new[]{0,1,block.EventWorkCount-1};
            foreach(int index in flagIndices)foreach(bool value in new[]{false,true})
            {
                var expected=Open(data);var b=Block(expected);bool changed=b.GetEventFlag(index)!=value;b.SetEventFlag(index,value);if(changed&&expected is SAV7 s)s.UpdateQrConstants();
                Check(Apply(data,new([new(index,value)],[])).SequenceEqual(expected.Write().ToArray()),"Flag bit boundaries match full Core output including QR linkage");
            }
            foreach(int index in workIndices)foreach(int value in new[]{0,1,32767,32768,65534,65535})
            {
                var expected=Open(data);var b=Block(expected);bool changed=b.GetWork(index)!=value;b.SetWork(index,(ushort)value);if(changed&&expected is SAV7 s)s.UpdateQrConstants();
                Check(Apply(data,new([],[new(index,value)])).SequenceEqual(expected.Write().ToArray()),"ushort boundaries match full Core output");
            }
            var flags=Enumerable.Range(0,block.EventFlagCount).Select(i=>new EventFlagChange(i,!block.GetEventFlag(i))).ToArray();
            var values=Enumerable.Range(0,block.EventWorkCount).Select(i=>new EventWorkChange(i,65535-block.GetWork(i))).ToArray();
            var all=Open(data);var allBlock=Block(all);foreach(var f in flags)allBlock.SetEventFlag(f.Index!.Value,f.Value!.Value);foreach(var w in values)allBlock.SetWork(w.Index!.Value,(ushort)w.Value!.Value);if(all is SAV7 a)a.UpdateQrConstants();
            var output=Apply(data,new(flags,values));Check(output.SequenceEqual(all.Write().ToArray()),"Every flag and value maps to its exact index and full serialized output");Check(Open(output).ChecksumsValid,"Output checksums");
            var diff=JsonSerializer.Deserialize(SaveService.CompareEvents(data,JsonSerializer.Serialize(new EventCompareQuery(Convert.ToBase64String(output)),SaveJsonContext.Default.EventCompareQuery)),SaveJsonContext.Default.EventDiff)!;
            Check(diff.SetFlags.SequenceEqual(flags.Where(f=>f.Value==true).Select(f=>f.Index!.Value))&&diff.ClearedFlags.SequenceEqual(flags.Where(f=>f.Value==false).Select(f=>f.Index!.Value)),"Comparison set/clear direction");
            Check(diff.Values.Length==values.Length&&diff.Values.All(v=>v.Before==block.GetWork(v.Index)&&v.After==65535-v.Before),"Comparison keeps old and new values");
            Check(data.SequenceEqual(original),"Comparison preserves old input");
            foreach(var bad in new EventEdit[]{new(),new([]),new(Values:[]),new([new()],[]),new([new(0)],[]),new([new(-1,true)],[]),new([new(block.EventFlagCount,true)],[]),new([new(0,true),new(0,false)],[]),new([], [new()]),new([],[new(0)]),new([],[new(-1,0)]),new([],[new(block.EventWorkCount,0)]),new([],[new(0,-1)]),new([],[new(0,65536)]),new([],[new(0,1),new(0,2)]),new([null!],[]),new([],[null!])})Reject(()=>Apply(data,bad));
            var atomic=Open(data);var beforeFlags=Block(atomic).GetEventFlags();Reject(()=>EventEditing.Apply(atomic,new([new(0,!beforeFlags[0])],[new(-1,5)])));Check(beforeFlags.SequenceEqual(Block(atomic).GetEventFlags()),"Validate entire request before any write");
            Reject(()=>SaveService.ReadEvents(data,"{\"language\":\"invalid\"}"));Reject(()=>SaveService.EditEvents(data,new string(' ',1048577)));
            Console.WriteLine($"PASS {seed.GetType().Name}: three-language catalog, every index, ushort/bit edges, atomic rejection, no-op QR preservation, full-file Core oracle and diff direction");
        }
        foreach(var file in new[]{"SN","US"})
        {
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{file}.sav");
            var indices=file=="SN"?new[]{3100}:new[]{4060,4562};
            for(int mask=0;mask<(1<<indices.Length);mask++)
            {
                var s=(SAV7)Open(data);s.Data.Slice(s.AllBlocks[35].Offset+0x168,12).Fill(0xA5);var baseline=s.Write().ToArray();
                var flags=indices.Select((i,j)=>new EventFlagChange(i,(mask&(1<<j))!=0)).ToArray();
                // Also change a work value so every QR combination exercises Save's linkage.
                var b=Block(s);var next=(ushort)(b.GetWork(0)^1);foreach(var f in flags)b.SetEventFlag(f.Index!.Value,f.Value!.Value);b.SetWork(0,next);s.UpdateQrConstants();
                Check(Apply(baseline,new(flags,[new(0,next)])).SequenceEqual(s.Write().ToArray()),"Gen7 QR combinations follow exact upstream overlapping writes");
            }
        }
        var x=File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav");var y=Open(x);y.Version=GameVersion.Y;
        Reject(()=>SaveService.CompareEvents(x,JsonSerializer.Serialize(new EventCompareQuery(Convert.ToBase64String(y.Write().ToArray())),SaveJsonContext.Default.EventCompareQuery)));
        Reject(()=>SaveService.CompareEvents(new byte[1048577],"{}"));Reject(()=>SaveService.CompareEvents(x,"{\"newData\":\"bad!\"}"));
        foreach(var file in new[]{"GP","GE","BD"}){var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{file}.sav");Reject(()=>SaveService.ReadEvents(data,"{\"language\":\"en\"}"));Reject(()=>Apply(data,new([],[])));}
    }
}
