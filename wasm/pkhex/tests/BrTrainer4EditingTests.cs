// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class BrTrainer4EditingTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid BR trainer request accepted");}catch(ArgumentException){}}
    private static SAV4BR Open(byte[] bytes,int profile){var s=(SAV4BR)SaveUtil.GetSaveFile(bytes.ToArray())!;s.CurrentSlot=profile;return s;}
    private static BrTrainer4Catalog Read(byte[] bytes)=>JsonSerializer.Deserialize(SaveService.ReadBrTrainer4(bytes),SaveJsonContext.Default.BrTrainer4Catalog)!;
    private static byte[] Apply(byte[] bytes,BrTrainer4Edit edit){var original=bytes.ToArray();try{return SaveService.EditBrTrainer4(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.BrTrainer4Edit));}finally{Check(bytes.SequenceEqual(original),"Immutable encrypted source");}}
    private static void Compare(byte[] bytes,int profile,BrTrainer4Edit edit,Action<SAV4BR> mutate){var s=Open(bytes,profile);mutate(s);var result=Apply(bytes,edit);Check(result.SequenceEqual(s.Write().ToArray()),"Complete encrypted parity including other players/inactive partition");Check(SaveService.ExportWorkingCopy(result).SequenceEqual(result),"Exact complete export");}
    public static void Run()
    {
        foreach(bool japanese in new[]{false,true})foreach(int partition in new[]{0,1})
        {
            var input=Br4EditingTests.Fixture(japanese,partition);var seed=Open(input,0);for(int i=0;i<4;i++){seed.CurrentSlot=i;seed.CurrentOT=$"P{i}";seed.Data[0x39C]=0xAB;seed.Data[0x39D]=0xCD;WriteDoubleBigEndian(seed.Data[0x388..],3600*(12+i)+125.5);seed.Data[0x578]=0xA5;seed.Data[0x57A]=0xB6;seed.Data[0x12888]=0xC0;seed.Data[0x12889]=0x0F;seed.Data[0x12891]=0xBF;seed.BirthMonth="12";seed.BirthDay="25";seed.SelfIntroduction="Old";seed.PlayerID=(ulong)(0x11223344+i);}var bytes=seed.Write().ToArray();
            foreach(int profile in new[]{0,3})
            {
                SaveService.ConfigureBRProfile(profile);var c=Read(bytes);Check(c.CanEdit&&c.Profile==profile&&c.Numbers.Length==20&&c.Text.Length==5&&c.Flags.Length==11&&c.Time.Hours==12+profile&&c.Time.Minutes==2&&c.Time.Seconds==5&&c.Numbers[5].Choices!.Select(v=>v.Id).Order().SequenceEqual(new[]{1,2,3,4,5,7}),"Complete source controls and explicit six languages");
                Compare(bytes,profile,new("text",profile,c.SourceHash,[new(0,c.Text[0].Value)]),_=>{});
                Compare(bytes,profile,new("text",profile,c.SourceHash,[new(0,"")]),s=>s.CurrentOT="");
                Compare(bytes,profile,new("text",profile,c.SourceHash,[new(4,"GH12")]),s=>s.PlayerID=0x12);
                var values=new[]{new Bp4Value(0,"999999"),new Bp4Value(1,"99999"),new Bp4Value(2,"")}.Concat(Enumerable.Range(6,14).Select(i=>new Bp4Value(i,i<10?"16777215":"255"))).ToArray();Compare(bytes,profile,new("numbers",profile,c.SourceHash,values),s=>{s.Money=999999;s.TID16=65535;s.SID16=0;s.RecordTotalBattles=s.RecordColosseumBattles=s.RecordFreeBattles=s.RecordWiFiBattles=0xFFFFFF;int[] offsets=[0x12870,0x12877,0x12876,0x12875,0x12874,0x1287B,0x1287A,0x12879,0x12878,0x1287F];foreach(int at in offsets)s.Data[at]=255;});
                var country=c.Numbers[3].Choices!.First(v=>v.Id>0);var region=c.Regions.First(v=>v.Country==country.Id).Choices[^1];Compare(bytes,profile,new("numbers",profile,c.SourceHash,[new(4,region.Id.ToString()),new(3,country.Id.ToString())]),s=>{WriteUInt16BigEndian(s.Data[0x3C0..],(ushort)country.Id);WriteUInt16BigEndian(s.Data[0x3C2..],(ushort)region.Id);});
                Compare(bytes,profile,new("time",profile,c.SourceHash,Hours:65535,Minutes:99,Seconds:99),s=>WriteDoubleBigEndian(s.Data[0x388..],65535*3600d+39*60+39));
                var flags=Enumerable.Range(0,11).Select(i=>new Bp4Value(i,"1")).ToArray();Compare(bytes,profile,new("flags",profile,c.SourceHash,flags),s=>{for(int bit=4;bit<8;bit++)FlagUtil.SetFlag(s.Data,0x12889,bit,true);for(int bit=0;bit<6;bit++)FlagUtil.SetFlag(s.Data,0x12888,bit,true);FlagUtil.SetFlag(s.Data,0x12891,6,true);});
                Compare(bytes,profile,new("text",profile,c.SourceHash,[new(0,"Name"),new(1,"123"),new(2,"25"),new(3,"Hi\nⓅ"),new(4,"FEDCBA9876543210")]),s=>{s.CurrentOT="Name";s.BirthMonth="123";s.BirthDay="25";s.SelfIntroduction=(japanese?"":"￼")+"Hi⏎Ⓟ";s.PlayerID=0xFEDCBA9876543210;});
                Compare(bytes,profile,new("rawText",profile,c.SourceHash,[new(1,"FFFFFFFF1234ABCD"),new(4,"1122334455667788")]),s=>{Convert.FromHexString("FFFFFFFF1234ABCD").CopyTo(s.Data.Slice(0x3B0,8));s.PlayerID=0x1122334455667788;});
                foreach(int lang in new[]{1,2,3,4,5,7}){var s=Open(bytes,profile);var before=s.Data.ToArray();BrTrainer4Editing.Apply(s,new("numbers",profile,c.SourceHash,[new(5,lang.ToString())]),c.SourceHash);Check(s.Language==lang&&s.Japanese==(lang==1)&&before.AsSpan(0x3C4,108).SequenceEqual(s.Data.Slice(0x3C4,108)),"Language round-trip and unchanged introduction bytes");}
                BrTrainer4Edit[] invalid=[new("numbers",profile,c.SourceHash,[new(0,"1000000")]),new("numbers",profile,c.SourceHash,[new(1,"100000")]),new("numbers",profile,c.SourceHash,[new(1,"000001")]),new("numbers",profile,c.SourceHash,[new(6,"16777216")]),new("numbers",profile,c.SourceHash,[new(10,"256")]),new("numbers",profile,c.SourceHash,[new(5,"8")]),new("numbers",profile,c.SourceHash,[new(1,"1"),new(1,"2")]),new("flags",profile,c.SourceHash,[new(11,"1")]),new("text",profile,c.SourceHash,[new(1,"1234")]),new("text",profile,c.SourceHash,[new(0,"12345678")]),new("text",profile,c.SourceHash,[new(3,"Ⓟ".PadRight(54,'A'))]),new("text",profile,c.SourceHash,[new(4,"12345678901234567")]),new("time",profile,c.SourceHash,Hours:65536,Minutes:0,Seconds:0),new("time",profile,c.SourceHash,Hours:0,Minutes:100,Seconds:0),new("time",profile,c.SourceHash,Hours:0,Minutes:0),new("numbers",profile,new string('0',64),[new(1,"0")]),new("numbers",(profile+1)%4,c.SourceHash,[new(1,"0")]),new("flags",profile,c.SourceHash,[new(0,"1")],Hours:0)];foreach(var edit in invalid){Reject(()=>Apply(bytes,edit));var s=Open(bytes,profile);var before=s.Data.ToArray();Reject(()=>BrTrainer4Editing.Apply(s,edit,c.SourceHash));Check(before.SequenceEqual(s.Data),"Atomic invalid requests");}
            }
            Console.WriteLine($"PASS BR trainer Japanese={japanese} partition={partition}: fields, separated UInt24 addresses, geography correction, time grouping, text/raw/encoding, language, flags, original and complete encrypted parity");
        }
        SaveService.ResetBRProfile();
    }
}
