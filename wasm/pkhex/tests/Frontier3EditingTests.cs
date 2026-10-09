// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Frontier3EditingTests
{
    private static readonly int[] Modes=[4,2,2,1,2,1,1];
    private static readonly int[][] StatIds=[[1,4],[1,4,0],[1,4],[1,4],[1,2,4,5],[1,4,3],[1,4]];
    private static readonly int[][] Bases=[[0x004,0x014],[0x030,0x038,0x040],[0x0EC,0x0F4],[0x0FE,0x102],[0x106,0x116,0x10E,0x11E],[0x128,0x12C,0x130],[0x13E,0x142]];
    private static readonly int[][] ContinueBits=[[0,14,16,18],[2,20],[4,22],[6],[8,24],[10],[12]];
    private static void Check(bool v,string message){if(!v)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Frontier accepted");}catch(ArgumentException){}}
    private static SAV3E Open(byte[] bytes)=>SaveUtil.GetSaveFile(bytes.ToArray()) as SAV3E??throw new Exception("Fixture not recognized");
    private static void Flag(SAV3E s,int index,bool value){int at=0x1270+(index>>3),mask=1<<(index&7);s.Large[at]=(byte)(value?s.Large[at]|mask:s.Large[at]&~mask);}
    private static byte[] Apply(byte[] bytes,Frontier3Edit edit)
    {
        var original=bytes.ToArray();try{return SaveService.EditFrontier3(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Frontier3Edit));}
        finally{Check(original.SequenceEqual(bytes),"Original immutable on success and rejection");}
    }
    private static void Compare(byte[] bytes,Frontier3Edit edit,Action<SAV3E> mutate)
    {
        var expected=Open(bytes);mutate(expected);var output=Apply(bytes,edit);
        Check(output.SequenceEqual(expected.Write().ToArray()),"Independent full-file oracle including reserved data and other flags");
        Check(SaveChecksums.Valid(Open(output))&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Checksum and exact download");
    }
    public static void Run()
    {
        foreach(bool jp in new[]{false,true})
        {
            var raw=new byte[0x20000];
            for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++)
            {int at=(bank*14+sector)*0x1000;WriteUInt16LittleEndian(raw.AsSpan(at+0xFF4),sector);WriteUInt32LittleEndian(raw.AsSpan(at+0xFF8),0x08012025);}
            raw[6]=raw[7]=jp?(byte)0:(byte)255;raw[0xAC]=2;raw[0x890]=1;var seed=new SAV3E(raw);
            for(int i=-4;i<0x1E4;i++)seed.Small[0xCDC+i]=(byte)(i*31+7);
            for(int i=-4;i<304;i++)seed.Large[0x1270+i]=(byte)(i*17+9);
            WriteUInt32LittleEndian(seed.Small[0xCDC..],uint.MaxValue);WriteUInt16LittleEndian(seed.Small[0xEB8..],65535);WriteUInt16LittleEndian(seed.Small[0xEBA..],65535);
            var bytes=seed.Write().ToArray();var source=Open(bytes);var c=JsonSerializer.Deserialize(SaveService.ReadFrontier3(bytes),SaveJsonContext.Default.Frontier3Catalog)!;
            Check(source.Japanese==jp&&c.CanEdit&&c.Facilities.Length==7&&c.Symbols.Length==7&&c.Bp==65535&&c.Earned==65535,"Public layout and raw BP");
            Check(c.Facilities.Sum(f=>f.Records.Sum(r=>r.Stats.Length))==66&&c.Facilities.Sum(f=>f.Records.Length)==26,"All 66 stats and 26 continuation combinations");
            for(int f=0;f<7;f++)for(int m=0;m<Modes[f];m++)for(int r=0;r<2;r++)
            {
                var entry=c.Facilities[f].Records.Single(v=>v.Mode==m&&v.Record==r);
                Check(c.Facilities[f].ModeCount==Modes[f]&&entry.Stats.Select(v=>v.Id).SequenceEqual(StatIds[f])&&entry.Continue,"Allowed combinations and order");
                for(int i=0;i<StatIds[f].Length;i++)
                {
                    int id=StatIds[f][i],at=0xCDC+Bases[f][i]+4*m+2*r;
                    Check(entry.Stats[i].Value==ReadUInt16LittleEndian(source.Small[at..]),"Exact raw stat address");
                    foreach(int value in new[]{0,1,9998,9999})Compare(bytes,new("record",f,m,r,Stats:[new(id,value)]),s=>WriteUInt16LittleEndian(s.Small[at..],(ushort)value));
                }
                int bit=ContinueBits[f][m]+r;
                foreach(bool value in new[]{false,true})Compare(bytes,new("record",f,m,r,Continue:value),s=>WriteUInt32LittleEndian(s.Small[0xCDC..],value?uint.MaxValue:uint.MaxValue&~(1u<<bit)));
            }
            foreach(int bp in new[]{0,1,9999})Compare(bytes,new("global",Bp:bp),s=>WriteUInt16LittleEndian(s.Small[0xEB8..],(ushort)bp));
            foreach(int earned in new[]{0,1,65535})Compare(bytes,new("global",Earned:earned),s=>WriteUInt16LittleEndian(s.Small[0xEBA..],(ushort)earned));
            foreach(bool pass in new[]{false,true})Compare(bytes,new("global",Pass:pass),s=>Flag(s,0x8D2,pass));
            for(int f=0;f<7;f++)foreach(bool silver in new[]{false,true})foreach(bool gold in new[]{false,true})
            {
                var s=Open(bytes);Flag(s,0x8C4+f*2,silver);Flag(s,0x8C5+f*2,gold);var before=s.Write().ToArray();
                var symbol=Frontier3Editing.Read(Open(before)).Symbols[f];Check(symbol.Silver==silver&&symbol.Gold==gold,"Raw symbol combinations, including gold-only");
                Compare(before,new("global",Earned:1),x=>WriteUInt16LittleEndian(x.Small[0xEBA..],1));
                foreach(int level in new[]{0,1,2})Compare(before,new("global",Symbols:[new(f,level)]),x=>{Flag(x,0x8C4+f*2,level>0);Flag(x,0x8C5+f*2,level==2);});
            }
            Compare(bytes,new("record",4,1,1,Stats:[new(1,1),new(2,2),new(4,3),new(5,4)],Continue:false),s=>{for(int i=0;i<4;i++)WriteUInt16LittleEndian(s.Small[(0xCDC+Bases[4][i]+6)..],(ushort)(i+1));WriteUInt32LittleEndian(s.Small[0xCDC..],uint.MaxValue&~(1u<<25));});
            Frontier3Edit[] bad=[new("record"),new("record",-1,0,0,Continue:false),new("record",7,0,0,Continue:false),new("record",3,1,0,Continue:false),new("record",0,4,0,Continue:false),new("record",0,0,2,Continue:false),new("record",0,0,0,Stats:[]),new("record",0,0,0,Stats:[new(1,10000)]),new("record",0,0,0,Stats:[new(1,-1)]),new("record",0,0,0,Stats:[new(0,0)]),new("record",0,0,0,Stats:[new(1,0),new(1,1)]),new("record",0,0,0,Continue:false,Bp:0),new("global"),new("global",Bp:10000),new("global",Earned:65536),new("global",Pass:false,Symbols:[new(7,0)]),new("global",Symbols:[new(0,3)]),new("global",Symbols:[new(0,0),new(0,1)]),new("global",Symbols:[]),new("global",Continue:false),new("record",0,0,0,Stats:[null!]),new("global",Pass:false,Symbols:[null!])];
            foreach(var edit in bad){Reject(()=>Apply(bytes,edit));var s=Open(bytes);var small=s.Small.ToArray();var large=s.Large.ToArray();Reject(()=>Frontier3Editing.Apply(s,edit));Check(s.Small.SequenceEqual(small)&&s.Large.SequenceEqual(large),"Atomic complete-request rejection");}
            var corrupt=bytes.ToArray();corrupt[0x20]^=1;Check(!Frontier3Editing.Read(Open(corrupt)).CanEdit,"Corrupt save readonly");Reject(()=>Apply(corrupt,new("global",Bp:0)));
            Reject(()=>SaveService.EditFrontier3(bytes,new string(' ',2049)));
            Console.WriteLine($"PASS Frontier3 JP={jp}: 66 stat addresses, 26 continuation bits, all 7 silver/gold combinations, BP bounds/raw preservation, reserved bits/full-file oracle, atomic rejection and exact export");
        }
        Reject(()=>Frontier3Editing.Read(new SAV3RS(false)));Reject(()=>Frontier3Editing.Read(new SAV3FRLG(false)));Reject(()=>Frontier3Editing.Read(new SAV1(LanguageID.English)));
    }
}
