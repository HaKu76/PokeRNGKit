// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Roamer3EditingTests
{
    private static void Check(bool v,string m){if(!v)throw new Exception(m);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Gen3 roamer accepted");}catch(ArgumentException){}}
    private static SAV3 Open(byte[] data)=>SaveUtil.GetSaveFile(data.ToArray()) as SAV3??throw new Exception("Fixture not recognized");
    private static int Offset(int kind)=>kind switch{0=>0x3144,1=>0x31DC,_=>0x30D0};
    private static byte[] Apply(byte[] data,Roamer3Edit edit)
    {
        var before=data.ToArray();try{return SaveService.EditRoamer3(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Roamer3Edit));}
        finally{Check(data.SequenceEqual(before),"Original retained on success and rejection");}
    }
    private static void Compare(byte[] data,int kind,Roamer3Edit edit,Action<byte[]> mutate)
    {
        var expected=Open(data);int at=Offset(kind);var raw=expected.Large.Slice(at,20).ToArray();mutate(raw);raw.CopyTo(expected.Large[at..]);
        var output=Apply(data,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"Complete independent byte oracle including adjacent and backup regions");
        Check(SaveChecksums.Valid(Open(output))&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Checksum and exact working-copy export");
    }
    public static void Run()
    {
        foreach(bool jp in new[]{false,true})for(int kind=0;kind<3;kind++)
        {
            var bytes=new byte[0x20000];
            for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++)
            {
                int at=(bank*14+sector)*0x1000;WriteUInt16LittleEndian(bytes.AsSpan(at+0xFF4),sector);WriteUInt32LittleEndian(bytes.AsSpan(at+0xFF8),0x08012025);
            }
            bytes[6]=bytes[7]=jp?(byte)0:(byte)255;
            if(kind==1){bytes[0xAC]=2;bytes[0x890]=1;}else if(kind==2)bytes[0xAC]=1;
            SAV3 seed=kind switch{0=>new SAV3RS(bytes),1=>new SAV3E(bytes),_=>new SAV3FRLG(bytes)};
            seed.TID16=123;seed.SID16=456;int offset=Offset(kind);
            for(int i=-4;i<28;i++)seed.Large[offset+i]=(byte)(i*17+70);
            var raw=seed.Large.Slice(offset,20);WriteUInt32LittleEndian(raw,0xFEDCBA98);WriteUInt32LittleEndian(raw[4..],0x12345678);
            WriteUInt16LittleEndian(raw[8..],SpeciesConverter.GetInternal3(381));WriteUInt16LittleEndian(raw[10..],12345);raw[12]=255;raw[19]=254;
            var data=seed.Write().ToArray();var source=Open(data);var before=source.Large.ToArray();
            var c=JsonSerializer.Deserialize(SaveService.ReadRoamer3(data),SaveJsonContext.Default.Roamer3Catalog)!;
            var direct=Roamer3Editing.Read(source);
            Check(source.Japanese==jp&&source.GetType()==seed.GetType()&&c.CanEdit&&c.Species==381&&c.SpeciesChoices.Length==386,"Layout and public catalog");
            Check(source.Large.SequenceEqual(before)&&direct.Ivs.SequenceEqual(c.Ivs),"Read including glitched IVs is nonmutating");
            Check(c.Glitched==(kind!=1)&&c.Level==255&&!c.Active&&c.Hp==12345&&c.Pid=="12345678","Raw values retained");
            var packed=ReadUInt32LittleEndian(before.AsSpan(offset));
            Check(c.Ivs.SequenceEqual(Enumerable.Range(0,6).Select(i=>(int)(packed>>(i*5))&31)),"Stored IV order");
            Check(c.EncounterIvs.SequenceEqual(Enumerable.Range(0,6).Select(i=>(int)((kind==1?packed:packed&255)>>(i*5))&31)),"Game glitch projection without loss");
            foreach(int species in new[]{0,1,251,252,386})Compare(data,kind,new(Species:species),r=>WriteUInt16LittleEndian(r.AsSpan(8),SpeciesConverter.GetInternal3((ushort)species)));
            foreach(long pid in new long[]{0,1,uint.MaxValue})Compare(data,kind,new(Pid:pid),r=>WriteUInt32LittleEndian(r.AsSpan(4),(uint)pid));
            for(int i=0;i<6;i++)foreach(int value in new[]{0,1,7,31,32,99})
            {
                int?[] values=new int?[6];values[i]=value;int shift=i*5;
                Compare(data,kind,new(Ivs:values),r=>WriteUInt32LittleEndian(r,(ReadUInt32LittleEndian(r)&~(31u<<shift))|((uint)Math.Min(value,31)<<shift)));
            }
            foreach(int level in new[]{0,1,100})Compare(data,kind,new(Level:level),r=>r[12]=(byte)level);
            foreach(int hp in new[]{0,1,65535})Compare(data,kind,new(Hp:hp),r=>WriteUInt16LittleEndian(r.AsSpan(10),(ushort)hp));
            foreach(byte active in new byte[]{0,1,2,255})
            {
                var s=Open(data);s.Large[offset+19]=active;var d=s.Write().ToArray();
                Check(Roamer3Editing.Read(Open(d)).Active==(active==1),"Exact active predicate");
                Compare(d,kind,new(Hp:0),r=>WriteUInt16LittleEndian(r.AsSpan(10),0));
                foreach(bool next in new[]{false,true})Compare(d,kind,new(Active:next),r=>r[19]=next?(byte)1:(byte)0);
            }
            foreach(uint xor in new uint[]{0,7,8,15})
            {
                var s=Open(data);WriteUInt32LittleEndian(s.Large[(offset+4)..],s.ID32^xor);
                Check(Roamer3Editing.Read(s).Shiny==(xor<8),"Shiny threshold");
            }
            Roamer3Edit[] invalid=[new(),new(Species:-1),new(Species:387),new(Pid:-1),new(Pid:(long)uint.MaxValue+1),new(Level:-1),new(Level:101),new(Level:255),new(Hp:-1),new(Hp:65536),new(Ivs:[]),new(Ivs:new int?[5]),new(Ivs:new int?[6]),new(Ivs:[0,0,0,0,0,100]),new(Ivs:[0,0,0,0,-1,0]),new(Hp:0,Ivs:[0,0,0,0,100,0])];
            foreach(var edit in invalid)
            {
                Reject(()=>Apply(data,edit));var s=Open(data);var old=s.Large.ToArray();Reject(()=>Roamer3Editing.Apply(s,edit));Check(s.Large.SequenceEqual(old),"Atomic invalid patch");
            }
            var broken=data.ToArray();broken[0x20]^=1;Check(!Roamer3Editing.Read(Open(broken)).CanEdit,"Corruption read-only");Reject(()=>Apply(broken,new(Hp:0)));
            Reject(()=>SaveService.EditRoamer3(data,new string(' ',1025)));Reject(()=>Apply(data[..0x10000],new(Hp:0)));
            Console.WriteLine($"PASS Roamer3 {source.GetType().Name}/JP={jp}: six IV fields, clamp and high bits, glitch projection, all field boundaries, abnormal level/active preservation, raw full-file oracle, immutable input and exact export");
        }
        Reject(()=>Roamer3Editing.Read(new SAV1(LanguageID.English)));Reject(()=>Roamer3Editing.Apply(new SAV1(LanguageID.English),new(Hp:0)));
    }
}
