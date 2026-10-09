// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Joyful3EditingTests
{
    private static readonly int[] E=[0x1FC,0x208,0x200,0x202,0x210,0x20C,0x212,0x1F4], F=[0xB00,0xB0C,0xB04,0xB06,0xB14,0xB10,0xB16,0xAF8];
    private static void Check(bool v,string m){if(!v)throw new Exception(m);}
    private static void Reject(Action a){try{a();throw new Exception("Invalid Joyful accepted");}catch(ArgumentException){}}
    private static SAV3 Open(byte[] b)=>SaveUtil.GetSaveFile(b.ToArray()) as SAV3??throw new Exception("Fixture not recognized");
    private static byte[] Fixture(bool emerald,bool jp,uint key)
    {
        var raw=new byte[0x20000];for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++){int at=(bank*14+sector)*0x1000;WriteUInt16LittleEndian(raw.AsSpan(at+0xFF4),sector);WriteUInt32LittleEndian(raw.AsSpan(at+0xFF8),0x08012025);}
        raw[6]=raw[7]=jp?(byte)0:(byte)255;raw[0xAC]=emerald?(byte)2:(byte)1;raw[0x890]=1;
        SAV3 s=emerald?new SAV3E(raw):new SAV3FRLG(raw);int start=emerald?0x1EC:0xAF0;
        for(int i=-4;i<0x40;i++)s.Small[start+i]=(byte)(i*31+7);
        WriteUInt32LittleEndian(s.Small[(emerald?0xAC:0xF20)..],key);WriteUInt32LittleEndian(s.Small[0xA8..],0xABCDEF12);
        int[] offsets=emerald?E:F;
        for(int i=0;i<8;i++){if(i==7)WriteUInt32LittleEndian(s.Small[offsets[i]..],uint.MaxValue^key);else if(i is 1 or 5)WriteUInt32LittleEndian(s.Small[offsets[i]..],0xABCDFFFF);else WriteUInt16LittleEndian(s.Small[offsets[i]..],65535);}
        return s.Write().ToArray();
    }
    private static byte[] Apply(byte[] bytes,Joyful3Edit edit){var original=bytes.ToArray();try{return SaveService.EditJoyful3(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Joyful3Edit));}finally{Check(original.SequenceEqual(bytes),"Original immutable on success/rejection");}}
    private static void Write(SAV3 s,int id,int value){var offsets=s is SAV3E?E:F;var span=s.Small[offsets[id]..];if(id==7)WriteUInt32LittleEndian(span,(uint)value^ReadUInt32LittleEndian(s.Small[(s is SAV3E?0xAC:0xF20)..]));else if(id is 1 or 5)WriteUInt32LittleEndian(span,(uint)value);else WriteUInt16LittleEndian(span,(ushort)value);}
    private static void Compare(byte[] bytes,Joyful3Edit edit)
    {
        var s=Open(bytes);foreach(var f in edit.Fields)Write(s,f.Id,f.Value!.Value);var output=Apply(bytes,edit);
        Check(output.SequenceEqual(s.Write().ToArray()),"Independent raw full-file oracle: widths, high words, unrelated gaps, link/press speed records and keys");
        Check(SaveChecksums.Valid(Open(output))&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Checksum and exact download");
        var read=Joyful3Editing.Read(Open(output));foreach(var f in edit.Fields)Check(read.Fields[f.Id].Value==(uint)f.Value!.Value,"Exact scalar roundtrip, including powder above 65535");
    }
    public static void Run()
    {
        foreach(bool emerald in new[]{false,true})foreach(bool jp in new[]{false,true})foreach(uint key in (emerald?new[]{2u,0x12345678u,uint.MaxValue}:new[]{0u,2u,0x12345678u,uint.MaxValue}))
        {
            var bytes=Fixture(emerald,jp,key);var original=bytes.ToArray();var s=Open(bytes);
            var c=JsonSerializer.Deserialize(SaveService.ReadJoyful3(bytes),SaveJsonContext.Default.Joyful3Catalog)!;
            Check(bytes.SequenceEqual(original)&&s.Japanese==jp&&((s is SAV3E)==emerald)&&c.CanEdit&&c.Fields.Length==8,"Public read layout, regional gate and original");
            for(int i=0;i<8;i++)
            {
                var f=c.Fields[i];Check(f.Id==i&&f.Value==(i==7?uint.MaxValue:65535u)&&f.Max==(i==7?99999:9999)&&f.Width==(i==7?5:4),"Unclamped old values and exact GUI limits");
                uint? stored=i is 1 or 5?0xABCDFFFFu:null;Check(f.Stored==stored,"Score getter low16 vs full stored high16");
                foreach(int value in (i==7?new[]{0,1,65535,65536,99998,99999}:new[]{0,1,9998,9999}))Compare(bytes,new([new(i,value)]));
            }
            Compare(bytes,new(Enumerable.Range(0,8).Select(i=>new Joyful3Change(i,i==7?99999:9999)).ToArray()));
            foreach(int score in new[]{1,5}){var x=Open(bytes);WriteUInt32LittleEndian(x.Small[(emerald?E[score]:F[score])..],0xABCD0007);var before=x.Write().ToArray();Check(Joyful3Editing.Read(Open(before)).Fields[score].Value==7,"Noncanonical old score");Compare(before,new([new(score,7)]));Compare(before,new([new(0,1)]));}
            Joyful3Edit[] bad=[new(null!),new([]),new([null!]),new([new(0,null)]),new([new(-1,0)]),new([new(8,0)]),new([new(0,-1)]),new([new(0,10000)]),new([new(1,65535)]),new([new(5,99990)]),new([new(7,100000)]),new([new(0,0),new(0,1)]),new([new(0,1),new(7,-1)])];
            foreach(var edit in bad){Reject(()=>Apply(bytes,edit));var x=Open(bytes);var small=x.Small.ToArray();var large=x.Large.ToArray();Reject(()=>Joyful3Editing.Apply(x,edit));Check(x.Small.SequenceEqual(small)&&x.Large.SequenceEqual(large),"Atomic full-request validation");}
            Reject(()=>SaveService.EditJoyful3(bytes,"{\"fields\":[{\"id\":0}]}"));Reject(()=>SaveService.EditJoyful3(bytes,new string(' ',2049)));
            var corrupt=bytes.ToArray();corrupt[0x20]^=1;Check(!Joyful3Editing.Read(Open(corrupt)).CanEdit,"Corrupt readonly");Reject(()=>Apply(corrupt,new([new(0,0)])));
            Console.WriteLine($"PASS Joyful3 E={emerald} JP={jp} key={key:X8}: eight offsets/limits, score read16/write32 and preserved high words, powder uint XOR and >65535, neighboring records, atomic requests, original and exact export");
        }
        Reject(()=>Joyful3Editing.Read(new SAV3RS(false)));Reject(()=>Joyful3Editing.Read(new SAV1(LanguageID.English)));
    }
}
