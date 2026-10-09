// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Decoration3EditingTests
{
    private static readonly int[] Starts = [0,10,20,30,60,90,100,140];
    private static readonly int[] Sizes = [10,10,10,30,30,10,40,10];
    private static void Check(bool v,string message){if(!v)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid decorations accepted");}catch(ArgumentException){}}
    private static SAV3 Open(byte[] bytes)=>SaveUtil.GetSaveFile(bytes.ToArray()) as SAV3??throw new Exception("Fixture not recognized");
    private static byte[] Apply(byte[] bytes,Decoration3Edit edit)
    {
        var before=bytes.ToArray();try{return SaveService.EditDecorations3(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Decoration3Edit));}
        finally{Check(bytes.SequenceEqual(before),"Input immutable on success and rejection");}
    }
    private static void Compare(byte[] bytes,int offset,Decoration3Edit edit)
    {
        var expected=Open(bytes);var packed=edit.Slots.Where(v=>v!=0).Select(v=>(byte)v).Concat(Enumerable.Repeat((byte)0,edit.Slots.Count(v=>v==0))).ToArray();
        packed.CopyTo(expected.Large[(offset+Starts[edit.Category])..]);
        var output=Apply(bytes,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"Full-file raw oracle, other categories and neighbours preserved");
        Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output)&&SaveChecksums.Valid(Open(output)),"Exact download and checksums");
    }
    public static void Run()
    {
        foreach(bool jp in new[]{false,true})foreach(bool emerald in new[]{false,true})
        {
            var raw=new byte[0x20000];
            for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++)
            {int at=(bank*14+sector)*0x1000;WriteUInt16LittleEndian(raw.AsSpan(at+0xFF4),sector);WriteUInt32LittleEndian(raw.AsSpan(at+0xFF8),0x08012025);}
            raw[6]=raw[7]=jp?(byte)0:(byte)255;if(emerald){raw[0xAC]=2;raw[0x890]=1;}
            SAV3 seed=emerald?new SAV3E(raw):new SAV3RS(raw);int offset=emerald?0x2734:0x26A0;
            for(int i=-4;i<154;i++)seed.Large[offset+i]=(byte)(i*17+33);
            var bytes=seed.Write().ToArray();var source=Open(bytes);var old=source.Large.ToArray();
            var c=JsonSerializer.Deserialize(SaveService.ReadDecorations3(bytes),SaveJsonContext.Default.Decoration3Catalog)!;
            Check(c.CanEdit&&c.Categories.Length==8&&source.Japanese==jp&&source.GetType()==seed.GetType(),"Public catalog layout");
            Check(source.Large.SequenceEqual(old),"Read nonmutating");
            var all=c.Categories.SelectMany(x=>x.Choices).Where(x=>x.Id!=0).Select(x=>x.Id).Order().ToArray();
            Check(all.SequenceEqual(Enumerable.Range(1,120)),"All 120 decorations exactly once across categories");
            Check(c.Categories.All(x=>x.Choices[0].Id==0&&x.Choices.All(v=>v.Name.Zh.Length>0&&v.Name.En.Length>0&&v.Name.Ja.Length>0)),"Localized names and empty choice");
            for(int category=0;category<8;category++)
            {
                var entry=c.Categories[category];Check(entry.Id==category&&entry.Slots.Length==Sizes[category]&&entry.Slots.SequenceEqual(old.AsSpan(offset+Starts[category],Sizes[category]).ToArray().Select(v=>(int)v)),"Every physical slot retained");
                foreach(var choice in entry.Choices.Where(v=>v.Id!=0))
                {
                    var slots=new int[Sizes[category]];slots[^1]=choice.Id;
                    Compare(bytes,offset,new(category,slots));
                }
                for(int slot=0;slot<Sizes[category];slot++)
                {
                    var slots=new int[Sizes[category]];slots[slot]=entry.Choices[1].Id;Compare(bytes,offset,new(category,slots));
                }
                Compare(bytes,offset,new(category,new int[Sizes[category]]));
                Compare(bytes,offset,new(category,entry.Slots)); // Unchanged malformed bytes remain available for preservation.
                var duplicates=Enumerable.Repeat(entry.Choices[1].Id,Sizes[category]).ToArray();Compare(bytes,offset,new(category,duplicates));
                var bad=entry.Slots.ToArray();bad[0]=256;Reject(()=>Apply(bytes,new(category,bad)));
                bad[0]=-1;Reject(()=>Apply(bytes,new(category,bad)));
                bad[0]=c.Categories[(category+1)%8].Choices[1].Id;if(bad[0]!=entry.Slots[0])Reject(()=>Apply(bytes,new(category,bad)));
                Reject(()=>Apply(bytes,new(category,new int[Sizes[category]-1])));
                var direct=Open(bytes);var before=direct.Large.ToArray();Reject(()=>Decoration3Editing.Apply(direct,new(category,bad)));Check(direct.Large.SequenceEqual(before),"Atomic rejection");
            }
            Reject(()=>Apply(bytes,new(-1,[])));Reject(()=>Apply(bytes,new(8,[])));Reject(()=>Apply(bytes,new(0,null!)));
            Reject(()=>SaveService.EditDecorations3(bytes,new string(' ',2049)));
            var broken=bytes.ToArray();broken[0x20]^=1;Check(!Decoration3Editing.Read(Open(broken)).CanEdit,"Corrupt save readonly");Reject(()=>Apply(broken,new(0,new int[10])));
            Console.WriteLine($"PASS Decorations3 {source.GetType().Name}/JP={jp}: all 150 positions, all 120 items, 8 category mappings, stable compression, duplicates and abnormal bytes, complete oracle, atomic rejection and exact export");
        }
        Reject(()=>Decoration3Editing.Read(new SAV3FRLG(false)));Reject(()=>Decoration3Editing.Read(new SAV1(LanguageID.English)));
    }
}
