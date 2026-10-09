// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Globalization;
using PKHeX.Core;
using static System.Buffers.Binary.BinaryPrimitives;
namespace PokeRNGKit.SaveEditor;
public sealed record BrTrainer4Time(int? Hours,int? Minutes,int? Seconds,string Hex);
public sealed record BrTrainer4Catalog(bool CanEdit,int Profile,string SourceHash,bool Japanese,Bp4Number[] Numbers,Bp4Text[] Text,bool[] Flags,BrTrainer4Time Time,GeoRegions[] Regions);
public sealed record BrTrainer4Edit(string Action,int? Profile,string? SourceHash,Bp4Value[]? Values=null,int? Hours=null,int? Minutes=null,int? Seconds=null);
internal static class BrTrainer4Editing
{
    private static readonly string[] Names=["Money","TID","SID","Country","Region","Language","RecordTotalBattles","RecordColosseumBattles","RecordFreeBattles","RecordWiFiBattles","RecordGatewayColosseumClears","RecordMainStreetColosseumClears","RecordWaterfallColosseumClears","RecordNeonColosseumClears","RecordCrystalColosseumClears","RecordSunnyParkColosseumClears","RecordMagmaColosseumClears","RecordCourtyardColosseumClears","RecordSunsetColosseumClears","RecordStargazerColosseumClears"];
    private static readonly int[] ClearOffsets=[0x12870,0x12877,0x12876,0x12875,0x12874,0x1287B,0x1287A,0x12879,0x12878,0x1287F];
    private static readonly string[] TextNames=["OTName","BirthMonth","BirthDay","SelfIntroduction","PlayerID"];
    private static readonly int[] TextOffsets=[0x390,0x3B0,0x3B8,0x3C4];
    private static readonly int[] TextBytes=[16,8,8,108];
    private static readonly int[] PlayerOffsets=[0x128CA,0x128CC,0x128CE,0x128C0,0x128D2,0x128D4,0x128D6,0x128C8];
    private static void Index(int? id,int count){if(id is null||id<0||id>=count)throw new ArgumentException("Invalid BR trainer field.");}
    private static OriginChoice[] Languages()=>GameInfo.LanguageDataSource(3,EntityContext.Gen4).Select(v=>new OriginChoice(v.Value,new(GameInfo.GetStrings("zh-Hans").languageNames[v.Value],GameInfo.GetStrings("en").languageNames[v.Value],GameInfo.GetStrings("ja").languageNames[v.Value]))).ToArray();
    private static OriginChoice[] Choices(int id,SAV4BR s)=>id switch{3=>GeographicCatalog.Gen4Countries.Value,4=>GeographicCatalog.Gen4Regions.Value.FirstOrDefault(v=>v.Country==s.Country)?.Choices??[],5=>Languages(),_=>[]};
    private static long Maximum(int id)=>id==0?999999:id is 1 or 2?65535:id is >=6 and <=9?0xFFFFFF:id>=10?255:65535;
    private static long[] Numbers(SAV4BR s)=>[s.Money,s.TID16,s.SID16,s.Country,s.Region,s.Language,s.RecordTotalBattles,s.RecordColosseumBattles,s.RecordFreeBattles,s.RecordWiFiBattles,..ClearOffsets.Select(v=>(long)s.Data[v])];
    private static bool[] Flags(SAV4BR s)=>[s.UnlockedGatewayColosseum,s.UnlockedMainStreetColosseum,s.UnlockedWaterfallColosseum,s.UnlockedNeonColosseum,s.UnlockedCrystalColosseum,s.UnlockedSunnyParkColosseum,s.UnlockedMagmaColosseum,s.UnlockedCourtyardColosseum,s.UnlockedSunsetColosseum,s.UnlockedStargazerColosseum,s.UnlockedPostGame];
    private static string[] Text(SAV4BR s)=>[s.CurrentOT,s.BirthMonth,s.BirthDay,s.SelfIntroduction.TrimStart(StringConverter4GC.Proportional).Replace(StringConverter4GC.LineBreak,'\n'),s.PlayerID.ToString("X16")];
    internal static BrTrainer4Catalog Read(SaveFile save,string hash)
    {
        var s=Br4Editing.Save(save);var numbers=Numbers(s).Select((v,i)=>new Bp4Number(i,Names[i],v,0,Maximum(i),i is >=3 and <=5?Choices(i,s):null)).ToArray();int[] limits=[7,4,4,s.Japanese?53:51,16];var texts=Text(s).Select((v,i)=>new Bp4Text(i,TextNames[i],v,i==4?Convert.ToHexString(PlayerOffsets.Select(at=>s.Data[at]).ToArray()):Convert.ToHexString(s.Data.Slice(TextOffsets[i],TextBytes[i])),limits[i],i==4?8:TextBytes[i],i==3)).ToArray();double raw=ReadDoubleBigEndian(s.Data[0x388..]);BrTrainer4Time time;try{time=double.IsFinite(raw)?new(s.PlayedHours,s.PlayedMinutes,s.PlayedSeconds,Convert.ToHexString(s.Data.Slice(0x388,8))):new(null,null,null,Convert.ToHexString(s.Data.Slice(0x388,8)));}catch(OverflowException){time=new(null,null,null,Convert.ToHexString(s.Data.Slice(0x388,8)));}return new(s.State.Exportable&&SaveChecksums.Valid(s),s.CurrentSlot,hash,s.Japanese,numbers,texts,Flags(s),time,GeographicCatalog.Gen4Regions.Value);
    }
    private static void Number(SAV4BR s,int id,long value){switch(id){case 0:s.Money=(uint)value;break;case 1:s.TID16=(ushort)value;break;case 2:s.SID16=(ushort)value;break;case 3:WriteUInt16BigEndian(s.Data[0x3C0..],(ushort)value);break;case 4:WriteUInt16BigEndian(s.Data[0x3C2..],(ushort)value);break;case 5:s.Language=(int)value;break;case 6:s.RecordTotalBattles=(uint)value;break;case 7:s.RecordColosseumBattles=(uint)value;break;case 8:s.RecordFreeBattles=(uint)value;break;case 9:s.RecordWiFiBattles=(uint)value;break;case >=10 and <=19:s.Data[ClearOffsets[id-10]]=(byte)value;break;default:throw new ArgumentException("Invalid BR trainer number.");}}
    internal static void Apply(SaveFile save,BrTrainer4Edit edit,string hash)
    {
        var s=Br4Editing.Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("BR trainer editing requires valid checksums.");if(edit.Profile!=s.CurrentSlot||edit.SourceHash!=hash||edit.SourceHash?.Length!=64)throw new ArgumentException("BR trainer preview is stale or player changed. Read it again.");var copy=(SAV4BR)s.Clone();
        if(edit.Action=="time"&&edit.Values is null){if(edit.Hours is null or <0 or >65535||edit.Minutes is null or <0 or >99||edit.Seconds is null or <0 or >99)throw new ArgumentException("Invalid BR trainer time values.");WriteDoubleBigEndian(copy.Data[0x388..],edit.Hours.Value*3600d+(edit.Minutes.Value%60)*60+edit.Seconds.Value%60);}
        else if(edit.Action is "numbers" or "flags" or "text" or "rawText"&&edit.Hours is null&&edit.Minutes is null&&edit.Seconds is null&&edit.Values is {} fields)
        {
            if(fields.Length is 0 or >20||fields.Any(v=>v is null||v.Id is null||v.Value is null)||fields.Select(v=>v.Id).Distinct().Count()!=fields.Length)throw new ArgumentException("Invalid BR trainer fields.");
            if(edit.Action=="numbers")
            {
                var values=fields.Select(v=>{Index(v.Id,20);if(v.Id==0&&v.Value!.Length>6||v.Id is 1 or 2&&v.Value!.Length>5)throw new ArgumentException("BR trainer number exceeds the control width.");if(!long.TryParse(v.Value,NumberStyles.None,CultureInfo.InvariantCulture,out long n)){if(v.Id is 0 or 1 or 2&&string.IsNullOrWhiteSpace(v.Value))n=0;else throw new ArgumentException("Invalid BR trainer decimal number.");}if(v.Id is 1 or 2&&n<=99999)n=Math.Min(n,65535);if(n<0||n>Maximum(v.Id!.Value))throw new ArgumentException("BR trainer number exceeds the control range.");return (Id:v.Id.Value,Value:n);}).ToArray();var country=values.FirstOrDefault(v=>v.Id==3);if(values.Any(v=>v.Id==3)){if(!Choices(3,copy).Any(v=>v.Id==country.Value))throw new ArgumentException("Invalid BR trainer country.");Number(copy,3,country.Value);if(!values.Any(v=>v.Id==4))Number(copy,4,Choices(4,copy).FirstOrDefault()?.Id??0);}
                foreach(var v in values){if(v.Id is >=3 and <=5&&!Choices(v.Id,copy).Any(c=>c.Id==v.Value))throw new ArgumentException("Invalid BR trainer candidate.");Number(copy,v.Id,v.Value);}
            }
            else if(edit.Action=="flags"){foreach(var v in fields){Index(v.Id,11);if(v.Value is not("0" or "1"))throw new ArgumentException("Invalid BR trainer boolean.");int id=v.Id!.Value,at=id<4?0x12889:id<10?0x12888:0x12891,bit=id<4?id+4:id<10?id-4:6;FlagUtil.SetFlag(copy.Data,at,bit,v.Value=="1");}}
            else foreach(var v in fields)
            {
                Index(v.Id,5);int id=v.Id!.Value;var input=v.Value!;
                if(edit.Action=="rawText"){int size=id==4?8:TextBytes[id];if(input.Length!=size*2||input.Any(c=>!Uri.IsHexDigit(c)))throw new ArgumentException("Invalid BR trainer raw text bytes.");var bytes=Convert.FromHexString(input);if(id==4)for(int i=0;i<8;i++)copy.Data[PlayerOffsets[i]]=bytes[i];else bytes.CopyTo(copy.Data.Slice(TextOffsets[id],size));continue;}
                int limit=id==0?7:id is 1 or 2?4:id==3?(copy.Japanese?53:51):16;if(input.Length>limit)throw new ArgumentException("BR trainer text exceeds the control length.");if(id==4){copy.PlayerID=Util.GetHexValue64(input);continue;}
                if(id!=3&&input.Any(char.IsControl))throw new ArgumentException("BR trainer text is single-line.");input=input.Replace("\r\n","\n").Replace('\r','\n').Replace('\n',StringConverter4GC.LineBreak);if(input.Sum(c=>c is StringConverter4GC.LineBreak or StringConverter4GC.Proportional or StringConverter4GC.PokemonName?2:1)>limit)throw new ArgumentException("BR trainer text exceeds encoded length.");if(id==3&&!copy.Japanese)input=StringConverter4GC.Proportional+input;
                if(id==0){if(input==copy.CurrentOT)continue;copy.CurrentOT=input;if(copy.CurrentOT!=input)throw new ArgumentException("BR trainer name cannot be encoded without loss.");}
                else{var target=copy.Data.Slice(TextOffsets[id],TextBytes[id]);if(input==StringConverter4GC.GetStringUnicodeBR(target))continue;StringConverter4GC.SetStringUnicodeBR(input,target);if(StringConverter4GC.GetStringUnicodeBR(target)!=input)throw new ArgumentException("BR trainer text cannot be encoded without loss.");}
            }
        }
        else throw new ArgumentException("Invalid BR trainer action or mixed fields.");copy.Data.CopyTo(s.Data);s.State.Edited=true;
    }
    internal static byte[] Snapshot(SAV4BR s){var bytes=s.Data.ToArray();if(s.CurrentSlot==0)bytes.AsSpan(8,64).Clear();return bytes;}
}
public static partial class SaveService
{
    public static string ReadBrTrainer4(byte[] data)=>JsonSerializer.Serialize(BrTrainer4Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.BrTrainer4Catalog);
    public static byte[] EditBrTrainer4(byte[] data,string json){if(json.Length>32768)throw new ArgumentException("BR trainer request is too large.");var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.BrTrainer4Edit)??throw new ArgumentException("Missing BR trainer edit.");var s=Br4Editing.Save(Open(data));BrTrainer4Editing.Apply(s,edit,Br4Editing.Hash(data));var expected=BrTrainer4Editing.Snapshot(s);var output=s.Write().ToArray();var check=Br4Editing.Save(Open(output));if(output.Length!=data.Length||check.CurrentSlot!=s.CurrentSlot||!SaveChecksums.Valid(check)||!expected.SequenceEqual(BrTrainer4Editing.Snapshot(check)))throw new InvalidOperationException("BR trainer export verification failed.");return output;}
}
