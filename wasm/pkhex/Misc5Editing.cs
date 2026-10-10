// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record Misc5Field(string Id,string Group,LocalizedText Name,long Value,long Minimum,long Maximum,bool Boolean,OriginChoice[]? Choices,string? RawHex);
public sealed record Misc5FieldEdit(string Id,long? Value);
public sealed record Misc5Mission(int Index,LocalizedText Name,int Score,int Total,int Level,bool IsNew,bool Unlocked,uint Raw);
public sealed record Misc5MissionEdit(int? Index,int? Score=null,int? Total=null,int? Level=null,bool? IsNew=null);
public sealed record Misc5Catalog(bool CanEdit,string SourceHash,Misc5Field[] Fields,Misc5Mission[] Missions,Misc5ForestSlot[] Forest,
    OriginChoice[] SpeciesChoices,OriginChoice[] MoveChoices,int RandomCandidates,string[] Groups,string RawHex,
    Misc5ForestSpecies[] ForestChoices,int[] ExperienceLimits,bool CanExportFc);
public sealed record Misc5Edit(string Action,string? SourceHash,Misc5FieldEdit[]? Fields=null,Misc5MissionEdit[]? Missions=null,
    Misc5ForestEdit[]? Forest=null,string? DataBase64=null,Misc5RandomEntry[]? FrozenForest=null,string? TargetHash=null);
public sealed record Misc5Preview(Misc5Edit Request,Misc5Catalog Result,int[] ChangedOffsets);
internal sealed record Misc5Definition(string Id,string Group,LocalizedText Name,long Minimum,long Maximum,bool Boolean,
    Func<SAV5,long> Get,Action<SAV5,long> Set,OriginChoice[]? Choices=null,Func<SAV5,string>? Raw=null);
internal static class Misc5Editing
{
    internal static SAV5 Save(SaveFile s)=>s is SAV5BW or SAV5B2W2?(SAV5)s:throw new ArgumentException("Misc5 tools are unavailable for this format.");
    private static readonly int[] FlyBW=[0,1,2,3,4,5,6,7,8,9,15,11,10,13,12,14];
    private static readonly int[] FlyB2=[24,27,25,8,9,10,11,12,13,14,15,16,17,18,21,20,28,26,66,19,5,6,7,22];
    private static readonly string[] DestBW=["Nuvema Town","Accumula Town","Striaton City","Nacrene City","Castelia City","Nimbasa City","Driftveil City","Mistralton City","Icirrus City","Opelucid City","Victory Road","Pokémon League","Lacunosa Town","Undella Town","Black City/White Forest","Unity Tower"];
    private static readonly string[] DestB2=["Aspertia City","Floccesy Town","Virbank City","Nuvema Town","Accumula Town","Striaton City","Nacrene City","Castelia City","Nimbasa City","Driftveil City","Mistralton City","Icirrus City","Opelucid City","Lacunosa Town","Undella Town","Black City/White Forest","Lentimas Town","Humilau City","Victory Road","Pokémon League","Pokéstar Studios","Join Avenue","PWT","Unity Tower"];
    private static LocalizedText Name(string key)=>Misc5Text.Get("SAV_Misc5."+key);
    private static LocalizedText Indexed(LocalizedText name,int i)=>new($"{name.Zh} {i}",$"{name.En} {i}",$"{name.Ja} {i}");
    private static LocalizedText KeyName(int index,bool obtain){string[] zh=obtain?["获得简单钥匙","获得挑战钥匙","获得城市钥匙","获得钢铁钥匙","获得冰山钥匙"]:["解锁简单模式","解锁挑战模式","解锁城市","解锁钢铁之间","解锁冰山之间"];string[] en=obtain?["Obtain EasyKey","Obtain ChallengeKey","Obtain CityKey","Obtain IronKey","Obtain IcebergKey"]:["Unlock EasyMode","Unlock ChallengeMode","Unlock City","Unlock IronChamber","Unlock IcebergChamber"];string[] ja=obtain?["イージーキー入手","チャレンジキー入手","街のキー入手","鉄のキー入手","氷山のキー入手"]:["イージーモード解放","チャレンジモード解放","街を解放","鉄の間解放","氷山の間解放"];return new(zh[index],en[index],ja[index]);}
    private static readonly Dictionary<string,string[]> LocationText=new[]{"zh-Hans","en","ja"}.ToDictionary(lang=>lang,lang=>Util.GetStringResource("text_bw2_00000_"+lang).Split('\n').Select(line=>line.TrimEnd('\r')).ToArray());
    private static LocalizedText Place(string name)
    {
        var en=LocationText["en"];
        string Get(string lang){var text=LocationText[lang];return string.Join("/",name.Split('/').Select(part=>{int i=Array.IndexOf(en,part);if(i<0)throw new InvalidOperationException("Missing Misc5 location: "+part);return text[i];}));}
        return new(Get("zh-Hans"),Get("en"),Get("ja"));
    }
    internal static List<Misc5Definition> Definitions(SAV5 s)
    {
        var result=new List<Misc5Definition>();
        void Add(string id,string group,string key,long max,Func<SAV5,long> get,Action<SAV5,long> set,long min=0,bool boolean=false,OriginChoice[]? choices=null,Func<SAV5,string>? raw=null)=>result.Add(new(id,group,Name(key),min,max,boolean,get,set,choices,raw));
        int flyOffset=s is SAV5BW?0x204B2:0x20392;var bits=s is SAV5BW?FlyBW:FlyB2;var names=s is SAV5BW?DestBW:DestB2;
        for(int i=0;i<bits.Length;i++){int bit=bits[i],offset=flyOffset+(bit>>3),mask=1<<(bit&7);result.Add(new("fly"+i,"general",Place(names[i]),0,1,true,x=>(x.Data[offset]&mask)!=0?1:0,(x,v)=>x.Data[offset]=(byte)((x.Data[offset]&~mask)|(v==1?mask:0))));}
        if(s is SAV5BW bw){
            for(int i=0;i<2;i++){int index=i;int current=bw.Encount.GetRoamerState(i);var choices=new[]{2,3,current}.Distinct().Select(v=>new OriginChoice(v,v switch{0=>new("未游走","Not roamed","未徘徊"),1=>new("游走中","Roaming","徘徊中"),2=>new("已打倒","Defeated","倒した"),3=>new("已捕获","Captured","捕獲済み"),_=>new($"0x{v:X2}",$"0x{v:X2}",$"0x{v:X2}")})).ToArray();
                Add("roamer"+i,"general",i==0?"L_Roamer642":"L_Roamer641",255,x=>((SAV5BW)x).Encount.GetRoamerState(index),(x,v)=>{var b=((SAV5BW)x).Encount;int old=b.GetRoamerState(index);if(old==v)return;b.SetRoamerState(index,(byte)v);if(old==1){(index==0?b.Roamer1:b.Roamer2).Clear();b.SetRoamerState2C(index,0);}},choices:choices);
            }
            int status=bw.EventWork.GetWorkRoamer();var choicesStatus=new[]{0,1,3,status}.Distinct().Select(v=>new OriginChoice(v,v switch{0=>new("尚未发生","Not happened","未発生"),1=>new("前往7号道路","Go to route 7","7番道路へ"),3=>new("事件结束","Event finished","イベント終了"),_=>new($"0x{v:X4}",$"0x{v:X4}",$"0x{v:X4}")})).ToArray();
            Add("roamStatus","general","L_RoamStatus",65535,x=>((SAV5BW)x).EventWork.GetWorkRoamer(),(x,v)=>((SAV5BW)x).EventWork.SetWorkRoamer((ushort)v),choices:choicesStatus);
            Add("liberty","general","CHK_LibertyPass",1,x=>((SAV5BW)x).Misc.IsLibertyTicketActivated?1:0,(x,v)=>{var b=((SAV5BW)x).Misc;if(b.IsLibertyTicketActivated!=(v==1))b.IsLibertyTicketActivated=v==1;},boolean:true);
        }else{
            for(int i=0;i<5;i++){var key=(KeyType5)i;
                Add("keyObtain"+i,"general","GB_KeySystem",1,x=>((SAV5B2W2)x).Keys.GetIsKeyObtained(key)?1:0,(x,v)=>{var b=((SAV5B2W2)x).Keys;if(b.GetIsKeyObtained(key)!=(v==1))b.SetIsKeyObtained(key,v==1);},boolean:true);
                result[^1]=result[^1] with{Name=KeyName(i,true)};
                Add("keyUnlock"+i,"general","GB_KeySystem",1,x=>((SAV5B2W2)x).Keys.GetIsKeyUnlocked(key)?1:0,(x,v)=>{var b=((SAV5B2W2)x).Keys;if(b.GetIsKeyUnlocked(key)!=(v==1))b.SetIsKeyUnlocked(key,v==1);},boolean:true);
                result[^1]=result[^1] with{Name=KeyName(i,false)};
            }
        }
        Add("currentType","subway","L_CurrentType",255,x=>x.BattleSubwayPlay.CurrentType,(x,v)=>x.BattleSubwayPlay.CurrentType=(int)v);
        Add("currentBattle","subway","L_CurrentBattle",255,x=>x.BattleSubwayPlay.CurrentBattle,(x,v)=>x.BattleSubwayPlay.CurrentBattle=(int)v);
        for(int i=0;i<8;i++){int bit=i;if(i==3)continue;Add("subwayFlag"+i,"subway","CHK_"+(i<4||i==7?"Subway"+i:i==4?"SuperSingle":i==5?"SuperDouble":"SuperMulti"),1,x=>(x.BattleSubway.Flags>>bit)&1,(x,v)=>{var b=x.BattleSubway;b.Flags=(b.Flags&~(1<<bit))|((int)v<<bit);if(bit==7)b.Flag3=v==1;},boolean:true,raw:x=>x.BattleSubway.Flags.ToString("X2"));}
        Add("npc","subway","CHK_SWNPCMet",1,x=>x.BattleSubway.NPCMet?1:0,(x,v)=>x.BattleSubway.NPCMet=v==1,boolean:true);
        AddRoutes(result);
        Add("whiteLevel","entralink","L_EntreeWhite",999,x=>x.Entralink.WhiteForestLevel,(x,v)=>x.Entralink.WhiteForestLevel=(ushort)v);
        Add("blackLevel","entralink","L_EntreeBlack",999,x=>x.Entralink.BlackCityLevel,(x,v)=>x.Entralink.BlackCityLevel=(ushort)v);
        if(s is SAV5B2W2){
            var powers=Enum.GetValues<PassPower5>().Select(v=>new OriginChoice((int)v,Misc5Text.Get("PassPower5."+v))).ToArray();
            for(int i=0;i<3;i++){int offset=0x1A0+i;Add("power"+i,"entralink","GB_PassPowers",255,x=>x.Entralink.Data[offset],(x,v)=>x.Entralink.Data[offset]=(byte)v,choices:powers);}
            Add("hosted","entralink","L_FMHosted",9999,x=>((SAV5B2W2)x).Festa.Hosted,(x,v)=>((SAV5B2W2)x).Festa.Hosted=(ushort)v);
            Add("participated","entralink","L_FMParticipated",9999,x=>((SAV5B2W2)x).Festa.Participated,(x,v)=>((SAV5B2W2)x).Festa.Participated=(ushort)v);
            Add("completed","entralink","L_FMCompleted",9999,x=>((SAV5B2W2)x).Festa.Completed,(x,v)=>((SAV5B2W2)x).Festa.Completed=(ushort)v);
            Add("topScores","entralink","L_FMTopScore",9999,x=>((SAV5B2W2)x).Festa.TopScores,(x,v)=>((SAV5B2W2)x).Festa.TopScores=(ushort)v);
            Add("participants","entralink","L_FMParticipants",255,x=>((SAV5B2W2)x).Festa.Participants,(x,v)=>((SAV5B2W2)x).Festa.Participants=(byte)v);
            // The pinned window returns early for black-side level changes. Preserve that asymmetry explicitly.
            Add("whiteExp","entralink","L_EntreeWhite",FestaBlock5.GetExpNeededForLevelUp(Math.Min(999,(int)s.Entralink.WhiteForestLevel))-1,x=>((SAV5B2W2)x).Festa.WhiteEXP,(x,v)=>((SAV5B2W2)x).Festa.WhiteEXP=(byte)v);
            Add("blackExp","entralink","L_EntreeBlack",FestaBlock5.GetExpNeededForLevelUp(Math.Min(999,(int)s.Entralink.BlackCityLevel))-1,x=>((SAV5B2W2)x).Festa.BlackEXP,(x,v)=>((SAV5B2W2)x).Festa.BlackEXP=(byte)v);
        }
        Add("forestAreas","forest","L_Area18",8,x=>x.EntreeForest.Unlock38Areas+2,(x,v)=>x.EntreeForest.Unlock38Areas=(int)v-2,min:2);
        Add("forest9","forest","CHK_Area9",1,x=>x.EntreeForest.Unlock9thArea?1:0,(x,v)=>x.EntreeForest.Unlock9thArea=v==1,boolean:true);
        for(int i=0;i<100;i++){int index=i;var zh=Util.GetStringList("props","zh-Hans")[i];var en=Util.GetStringList("props","en")[i];var ja=Util.GetStringList("props","ja")[i];result.Add(new("prop"+i,"props",new(zh,en,ja),0,1,true,x=>x.Musical.GetHasProp(index)?1:0,(x,v)=>x.Musical.SetHasProp(index,v==1)));}
        for(int i=0;i<68;i++){int index=i;result.Add(new("record32_"+i,"records",Indexed(Name("L_Record32"),i),0,uint.MaxValue,false,x=>x.Records.GetRecord32(index),(x,v)=>x.Records.SetRecord32(index,(uint)v)));}
        for(int i=0;i<100;i++){int index=i;result.Add(new("record16_"+i,"records",Indexed(Name("L_Record16"),i),0,ushort.MaxValue,false,x=>x.Records.GetRecord16(index),(x,v)=>x.Records.SetRecord16(index,(ushort)v)));}
        return result;
    }
    internal static Misc5Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);s.EntreeForest.StartAccess();
        var forest=Misc5Forest.Read(s);var fields=Definitions(s).Select(d=>new Misc5Field(d.Id,d.Group,d.Name,d.Get(s),d.Minimum,d.Maximum,d.Boolean,d.Choices,d.Raw?.Invoke(s))).ToArray();
        var missions=s is SAV5B2W2 b?Enumerable.Range(0,FestaBlock5.MaxMissionIndex+1).Select(i=>{var r=b.Festa.GetMissionRecord(i);return new Misc5Mission(i,Misc5Text.Get("Funfest5Mission."+(Funfest5Mission)i),r.Score,r.Total,r.Level,r.IsNew,b.Festa.IsFunfestMissionUnlocked(i),r.RawValue);}).ToArray():[];
        s.EntreeForest.EndAccess();s.Records.EndAccess();
        var speciesChoices=Misc5Forest.Species(s);
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,fields,missions,forest,speciesChoices,Misc5Forest.Moves(s),Misc5Forest.RandomSource(s).Length,fields.Select(f=>f.Group).Distinct().ToArray(),Convert.ToHexString(Regions(s).SelectMany(r=>r).ToArray()),
            speciesChoices.Select(v=>new Misc5ForestSpecies(v.Id,Misc5Forest.Forms(v.Id),Misc5Forest.Genders(v.Id))).ToArray(),
            s is SAV5B2W2?Enumerable.Range(0,1000).Select(level=>FestaBlock5.GetExpNeededForLevelUp(level)-1).ToArray():[],s is SAV5BW);
    }
    internal static byte[][] Regions(SAV5 s){var list=new List<byte[]>{s.Records.Data.ToArray(),s.Musical.Data.ToArray(),s.Entralink.Data.ToArray(),s.EntreeForest.Data.ToArray(),s.BattleSubway.Data.ToArray(),s.BattleSubwayPlay.Data.ToArray(),s.Encount.Data.ToArray(),s.EventWork.Data.ToArray(),s.Misc.Data.ToArray()};if(s is SAV5BW bw)list.Add(bw.Forest.Data.ToArray());else{var b=(SAV5B2W2)s;list.Add(b.Keys.Data.ToArray());list.Add(b.Festa.Data.ToArray());}return list.ToArray();}
    internal static byte[] Prepare(SaveFile save,Misc5Edit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Misc5 editing requires valid checksums.");
        if(e.SourceHash!=hash||e.SourceHash?.Length!=64)throw new ArgumentException("Misc5 preview is stale. Read it again.");
        var c=(SAV5)s.Clone();c.EntreeForest.StartAccess();
        if(e.Action!="patch"&&(e.Fields is not null||e.Missions is not null||e.Forest is not null)||e.Action!="importFc"&&e.DataBase64 is not null||e.Action!="forestRandom"&&e.FrozenForest is not null)throw new ArgumentException("Invalid Misc5 action fields.");
        switch(e.Action){
            case "patch":
                if(e.Fields is null&&e.Missions is null&&e.Forest is null)throw new ArgumentException("Empty Misc5 patch.");
                ApplyFields(c,e.Fields);ApplyMissions(c,e.Missions);Misc5Forest.Apply(c,e.Forest);break;
            case "giveFly":foreach(var d in Definitions(c).Where(d=>d.Id.StartsWith("fly")))d.Set(c,1);break;
            case "giveKeys":if(c is not SAV5B2W2)throw new ArgumentException("Misc5 keys require B2W2.");foreach(var d in Definitions(c).Where(d=>d.Id.StartsWith("key")))d.Set(c,1);break;
            case "giveProps":c.Musical.UnlockAllMusicalProps();break;
            case "missionUnlockAll":if(c is not SAV5B2W2 missions)throw new ArgumentException("Misc5 missions require B2W2.");missions.Festa.UnlockAllFunfestMissions();break;
            case "forestRandom":Misc5Forest.ApplyFrozen(c,e.FrozenForest);c.EntreeForest.UnlockAllAreas();break;
            case "importFc":if(c is not SAV5BW bw)throw new ArgumentException("Misc5 fc5 requires BW.");byte[] data;try{data=Convert.FromBase64String(e.DataBase64??"");}catch(FormatException){throw new ArgumentException("Invalid Misc5 fc5 data.");}if(data.Length!=WhiteBlack5BW.ForestCitySize)throw new ArgumentException("Invalid Misc5 fc5 size.");data.CopyTo(bw.Forest.ForestCity.Span);break;
            default:throw new ArgumentException("Invalid Misc5 action.");
        }
        c.Records.EndAccess();c.EntreeForest.EndAccess();var expected=Regions(c);var output=c.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray())as SAV5;
        if(check is null||check.GetType()!=c.GetType()||check.Version!=c.Version||output.Length!=length||!SaveChecksums.Valid(check)||!expected.Zip(Regions(check)).All(pair=>pair.First.SequenceEqual(pair.Second)))throw new InvalidOperationException("Misc5 export verification failed.");
        if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Misc5 preview target is stale.");return output;
    }
    private static void ApplyFields(SAV5 s,Misc5FieldEdit[]? fields)
    {
        if(fields is null)return;var definitions=Definitions(s);if(fields.Length is 0||fields.Length>definitions.Count||fields.Any(f=>f is null||f.Value is null)||fields.Select(f=>f.Id).Distinct().Count()!=fields.Length)throw new ArgumentException("Invalid Misc5 fields.");
        foreach(var f in fields){var d=definitions.Find(d=>d.Id==f.Id);long maximum=d?.Maximum??0;
            if(s is SAV5B2W2&&fields.Any(v=>v.Id=="whiteLevel")&&f.Id is "whiteExp" or "blackExp"){var levelId=f.Id=="whiteExp"?"whiteLevel":"blackLevel";int level=(int)(fields.FirstOrDefault(v=>v.Id==levelId)?.Value??(f.Id=="whiteExp"?s.Entralink.WhiteForestLevel:s.Entralink.BlackCityLevel));maximum=FestaBlock5.GetExpNeededForLevelUp(level)-1;}
            if(d is null||f.Value<d.Minimum||f.Value>maximum||d.Choices is {} choices&&!choices.Any(v=>v.Id==f.Value))throw new ArgumentException("Invalid Misc5 field value.");}
        foreach(var d in definitions){var f=fields.FirstOrDefault(f=>f.Id==d.Id);if(f is not null)d.Set(s,f.Value!.Value);}
        if(s is SAV5B2W2 b&&fields.Any(f=>f.Id=="whiteLevel")){int whiteMax=FestaBlock5.GetExpNeededForLevelUp(b.Entralink.WhiteForestLevel)-1;int blackMax=FestaBlock5.GetExpNeededForLevelUp(b.Entralink.BlackCityLevel)-1;b.Festa.WhiteEXP=(byte)Math.Min(b.Festa.WhiteEXP,whiteMax);b.Festa.BlackEXP=(byte)Math.Min(b.Festa.BlackEXP,blackMax);}
    }
    private static void ApplyMissions(SAV5 s,Misc5MissionEdit[]? edits)
    {
        if(edits is null)return;if(s is not SAV5B2W2 b||edits.Length is 0 or >45||edits.Any(v=>v is null||v.Index is null or <0 or >44||v.Score is <0 or >9999||v.Total is <0 or >9999||v.Level is {} level&&level is not(0 or 1 or 2 or 3 or 7)||v.Score is null&&v.Total is null&&v.Level is null&&v.IsNew is null)||edits.Select(v=>v.Index).Distinct().Count()!=edits.Length)throw new ArgumentException("Invalid Misc5 mission fields.");
        foreach(var e in edits){var r=b.Festa.GetMissionRecord(e.Index!.Value);if(e.Score is {} score)r.Score=score;if(e.Total is {} total)r.Total=total;if(e.Level is {} level)r.Level=level;if(e.IsNew is {} isNew)r.IsNew=isNew;b.Festa.SetMissionRecord(e.Index.Value,r);}
    }
    private static void AddRoutes(List<Misc5Definition> list)=>Misc5Subway.Add(list);
}
public static partial class SaveService
{
    private static Misc5Edit ParseMisc5(string json)=>json.Length>150000?throw new ArgumentException("Misc5 request is too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Misc5Edit)??throw new ArgumentException("Missing Misc5 edit.");
    public static string ReadMisc5(byte[] data)=>JsonSerializer.Serialize(Misc5Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Misc5Catalog);
    public static string PreviewMisc5(byte[] data,string json){var e=ParseMisc5(json);if(e.Action=="forestRandom"&&e.FrozenForest is null)e=e with{FrozenForest=Misc5Forest.Randomize(Misc5Editing.Save(Open(data)))};var output=Misc5Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Misc5Preview(e with{TargetHash=hash},Misc5Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Misc5Preview);}
    public static byte[] EditMisc5(byte[] data,string json){var e=ParseMisc5(json);if(e.TargetHash?.Length!=64)throw new ArgumentException("Misc5 editing requires a frozen preview.");return Misc5Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
    public static byte[] ExportMisc5Fc(byte[] data)=>(Open(data)as SAV5BW??throw new ArgumentException("Misc5 fc5 requires BW.")).Forest.ForestCity.ToArray();
}
