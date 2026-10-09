// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class GameRecords3Tests
{
    private static void Check(bool v,string message){if(!v)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Gen3 record accepted");}catch(ArgumentException){}}
    private static SAV3 Open(byte[] bytes)=>SaveUtil.GetSaveFile(bytes.ToArray()) as SAV3??throw new Exception("Fixture not recognized");
    private static byte[] Apply(byte[] bytes,GameRecord3Edit edit)
    {
        var original=bytes.ToArray();try{return SaveService.EditGameRecords3(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.GameRecord3Edit));}
        finally{Check(bytes.SequenceEqual(original),"Original immutable on success and rejection");}
    }
    private static void Compare(byte[] bytes,int offset,int index,uint value,GameRecord3Edit edit)
    {
        var expected=Open(bytes);WriteUInt32LittleEndian(expected.Large[(offset+index*4)..],value^expected.SmallBlock.SecurityKey);
        var output=Apply(bytes,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"Complete raw XOR oracle including neighbours and reserved records");
        Check(SaveChecksums.Valid(Open(output))&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Checksums and exact working-copy download");
    }
    public static void Run()
    {
        foreach(bool jp in new[]{false,true})for(int kind=0;kind<3;kind++)foreach(uint key in kind==0?new uint[]{0}:kind==1?new uint[]{2,0x12345678,uint.MaxValue}:new uint[]{0,0x12345678,uint.MaxValue})
        {
            var raw=new byte[0x20000];
            for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++)
            {int at=(bank*14+sector)*0x1000;WriteUInt16LittleEndian(raw.AsSpan(at+0xFF4),sector);WriteUInt32LittleEndian(raw.AsSpan(at+0xFF8),0x08012025);}
            raw[6]=raw[7]=jp?(byte)0:(byte)255;if(kind==1){raw[0xAC]=2;raw[0x890]=1;}else if(kind==2)raw[0xAC]=1;
            SAV3 seed=kind switch{0=>new SAV3RS(raw),1=>new SAV3E(raw),_=>new SAV3FRLG(raw)};
            if(seed is SAV3E e)e.SmallBlock.SecurityKey=key;else if(seed is SAV3FRLG f)f.SmallBlock.SecurityKey=key;
            int offset=kind switch{0=>0x1540,1=>0x159C,_=>0x1200},physical=kind==0?50:64,visible=kind==0?50:52;
            for(int i=-4;i<physical*4+4;i++)seed.Large[offset+i]=(byte)(i*17+15);
            for(int i=0;i<physical;i++)WriteUInt32LittleEndian(seed.Large[(offset+i*4)..],(uint.MaxValue-(uint)(i*12345))^key);
            WriteUInt32LittleEndian(seed.Large[(offset+4)..],uint.MaxValue^key);
            var bytes=seed.Write().ToArray();var source=Open(bytes);Check(source.GetType()==seed.GetType()&&source.Japanese==jp&&source.SmallBlock.SecurityKey==key,"Correct type, region and key");
            var c=JsonSerializer.Deserialize(SaveService.ReadGameRecords3(bytes),SaveJsonContext.Default.GameRecord3Catalog)!;var upstream=Record3.GetItems(source);
            Check(c.CanEdit&&c.Entries.Length==visible&&c.Entries.Select(v=>v.Index).SequenceEqual(upstream.Select(v=>v.Value))&&c.Entries.Select(v=>v.Name).SequenceEqual(upstream.Select(v=>v.Text)),"Exact upstream selectable IDs and labels, excluding NUM_GAME_STATS and unlisted slots");
            Check(c.Time==new FameTime3(9999,59,59,65535,255,255)&&c.Entries[1].Value==uint.MaxValue,"Time display clamps without mutating raw record");
            Check(c.Entries.All(v=>v.Value==(v.Index==1?uint.MaxValue:uint.MaxValue-(uint)(v.Index*12345))),"Every plaintext record and unsigned values");
            for(int i=0;i<visible;i++)foreach(uint value in new uint[]{0,1,0x7FFFFFFF,0x80000000,uint.MaxValue})Compare(bytes,offset,i,value,new("value",i,value));
            foreach(var time in new[]{(0,0,0),(9999,59,59),(1,2,3),(9999,0,0),(0,59,59)})
                Compare(bytes,offset,1,((uint)time.Item1<<16)|((uint)time.Item2<<8)|(uint)time.Item3,new("time",1,Hours:time.Item1,Minutes:time.Item2,Seconds:time.Item3));
            Compare(bytes,offset,1,uint.MaxValue,new("value",1,uint.MaxValue)); // unchanged abnormal time remains byte-for-byte
            GameRecord3Edit[] bad=[new("value"),new("value",-1,0),new("value",visible,0),new("value",0,-1),new("value",0,(long)uint.MaxValue+1),new("value",0,0,Hours:0),new("time",0,Hours:0,Minutes:0,Seconds:0),new("time",1,0,0,0,0),new("time",1,Hours:-1,Minutes:0,Seconds:0),new("time",1,Hours:10000,Minutes:0,Seconds:0),new("time",1,Hours:0,Minutes:60,Seconds:0),new("time",1,Hours:0,Minutes:0,Seconds:60),new("time",1,Hours:0,Minutes:0),new("unknown",0,0)];
            foreach(var edit in bad){Reject(()=>Apply(bytes,edit));var s=Open(bytes);var before=s.Large.ToArray();Reject(()=>GameRecords3.Apply(s,edit));Check(before.AsSpan().SequenceEqual(s.Large),"Atomic rejection");}
            var corrupt=bytes.ToArray();corrupt[0x20]^=1;Check(!GameRecords3.Read(Open(corrupt)).CanEdit,"Corrupt save readonly");Reject(()=>Apply(corrupt,new("value",0,0)));
            Reject(()=>SaveService.EditGameRecords3(bytes,new string(' ',1025)));
            Console.WriteLine($"PASS Records3 {source.GetType().Name}/JP={jp}/key={key:X8}: all {visible} upstream entries, {physical} storage slots, UInt32 boundaries/XOR, fame-time ranges, raw abnormal preservation, full-file oracle, atomic rejection and exact export");
        }
        Reject(()=>GameRecords3.Read(new SAV1(LanguageID.English)));
    }
}
