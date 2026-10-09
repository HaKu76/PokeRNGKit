// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
using static System.Buffers.Binary.BinaryPrimitives;
namespace PokeRNGKit.SaveEditor;
public sealed record Ath4Form(int Id,LocalizedText Name,string Sprite,string FemaleSprite);
public sealed record Ath4Species(int Id,LocalizedText Name,Ath4Form[] Forms);
public sealed record Ath4Pokemon(int Species,int Form,int Gender,bool Shiny,string Pid,int Tid,int Sid,string Sprite);
public sealed record Ath4Trainer(string Name,string NameHex,int Tid,int Sid,int Language);
public sealed record Ath4Record(int Value,Ath4Pokemon[] Members);
public sealed record Ath4Event(uint Attempts,Ath4Record[] Records,Ath4Trainer[]? Trainers);
public sealed record Ath4Course(int[] Scores,Ath4Pokemon[] Members);
public sealed record Ath4Counter(string Source,uint Value,uint Maximum);
public sealed record Pokeathlon4Catalog(bool CanEdit,string SourceHash,uint Points,int DailyFlags,uint CardFlags,int[] Medals,Ath4Course[] Courses,Ath4Event[] Personal,Ath4Event[] Connections,Ath4Counter[] Counters,int[] Best,uint TotalFirst,uint GlobalScore,int Trophies,int FameLevel,Ath4Species[] SpeciesChoices,OriginChoice[] LanguageChoices,OriginChoice[] CardChoices,uint[] CardStats);
public sealed record Ath4Value(int? Id,long? Value);
public sealed record Ath4PokemonEdit(int? Species=null,int? Form=null,int? Gender=null,bool? Shiny=null,long? Pid=null,int? Tid=null,int? Sid=null);
public sealed record Ath4TrainerEdit(string? Name=null,string? NameHex=null,int? Tid=null,int? Sid=null,int? Language=null);
public sealed record Pokeathlon4Edit(string Action,int? Index=null,int? Slot=null,int? Member=null,bool? Connection=null,Ath4Value[]? Values=null,Ath4PokemonEdit? Pokemon=null,Ath4TrainerEdit? Trainer=null,bool? Enabled=null,string? SourceHash=null);
internal static class Pokeathlon4Editing
{
    private static SAV4HGSS Save(SaveFile s)=>s as SAV4HGSS??throw new ArgumentException("Pokeathlon4 is unavailable for this format.");
    private static readonly string[] CounterNames=["TimeSpent","SessionsJoined","PlacedFirst","PlacedLast","BonusesEarned","Instructions","Failed","Jumped","Acquired","Tackled","FellDown","Dashed","Switched","SelfImpeded","ConnectionJoined","ConnectionFirst","ConnectionLast","HurdleDashFirst","PennantCaptureFirst","CirclePushFirst","BlockSmashFirst","DiscCatchFirst","LampJumpFirst","RelayRunFirst","RingDropFirst","SnowThrowFirst","GoalRollFirst","TotalEventLast","Fame"];
    private static uint Maximum(int id)=>id==0?59999u:id==28?65535u:9999999u;
    private static string Sprite(int species,int form,int gender=0)=>"b"+SpriteName.GetResourceStringSprite((ushort)species,(byte)form,(byte)Math.Min(gender,2),0,EntityContext.Gen4);
    private static string[] Forms(int species,GameStrings s)=>FormConverter.GetFormList((ushort)species,s.types,s.forms,["♂","♀","-"],EntityContext.Gen4);
    private static FilteredGameDataSource Choices(SAV4HGSS s)=>new(s,new GameDataSource(GameInfo.GetStrings("en")));
    internal static Pokeathlon4Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var a=s.Pokeathlon;var z=GameInfo.GetStrings("zh-Hans");var e=GameInfo.GetStrings("en");var j=GameInfo.GetStrings("ja");var choices=Choices(s);
        var species=choices.Species.OrderBy(v=>v.Value).Select(v=>{var f=Forms(v.Value,e);var fz=Forms(v.Value,z);var fj=Forms(v.Value,j);return new Ath4Species(v.Value,new(z.specieslist[v.Value],e.specieslist[v.Value],j.specieslist[v.Value]),Enumerable.Range(0,Math.Max(f.Length,1)).Select(i=>new Ath4Form(i,new(i<fz.Length&&!string.IsNullOrWhiteSpace(fz[i])?fz[i]:"默认形态",i<f.Length&&!string.IsNullOrWhiteSpace(f[i])?f[i]:"Default form",i<fj.Length&&!string.IsNullOrWhiteSpace(fj[i])?fj[i]:"通常のフォルム"),Sprite(v.Value,i),Sprite(v.Value,i,1))).ToArray());}).ToArray();
        var courses=Enumerable.Range(0,5).Select(i=>{var c=a.GetCourseRecord((PokeathlonStat4)i);return new Ath4Course([c.Score0,c.Score1,c.Score2,c.ScoreMax],Enumerable.Range(0,3).Select(k=>{var p=c.GetParticipant(k);return new Ath4Pokemon(p.Species,p.Form,p.Gender,p.IsShiny,p.EncryptionConstant.ToString("X8"),p.TID16,p.SID16,Sprite(p.Species,p.Form,p.Gender));}).ToArray());}).ToArray();
        Ath4Event Event(int i,bool connection){var c=a.GetEventConnection((PokeathlonEvent4)i);var d=connection?c.Inner:a.GetEventSelf((PokeathlonEvent4)i);var records=Enumerable.Range(0,5).Select(k=>{var r=d.GetRecord(k);return new Ath4Record(r.Record,new[]{r.Entry0,r.Entry1,r.Entry2}.Select(p=>new Ath4Pokemon(p.Species,p.Form,0,false,"00000000",0,0,Sprite(p.Species,p.Form))).ToArray());}).ToArray();return new(d.Attempts,records,connection?Enumerable.Range(0,5).Select(k=>{var t=c.GetTrainer(k);return new Ath4Trainer(t.OriginalTrainerName,Convert.ToHexString(t.OriginalTrainerTrash),t.TID16,t.SID16,t.Language);}).ToArray():null);}
        var counters=a.GlobalCounters;var raw=counters.Data.ToArray();var cs=CounterNames.Select((n,i)=>new Ath4Counter(n,ReadUInt32LittleEndian(raw.AsSpan(i*4)),Maximum(i))).ToArray();uint score=a.CalculateGlobalScore();
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,a.Points,a.FlagsDailyShop,a.FlagsDataCard,a.Medals.Data.ToArray().Select(v=>(int)v).ToArray(),courses,Enumerable.Range(0,10).Select(i=>Event(i,false)).ToArray(),Enumerable.Range(0,10).Select(i=>Event(i,true)).ToArray(),cs,Enumerable.Range(0,10).Select(i=>(int)a.GetBestScore((PokeathlonEvent4)i)).ToArray(),counters.TotalEventFirst,score,Pokeathlon4.CalculateFriendshipTrophyCount(score),PokeathlonGlobalCounters4.GetFameLevel(counters.Fame),species,new[]{new OriginChoice(0,new("未设置","Unset","未設定"))}.Concat(choices.Languages.Select(v=>new OriginChoice(v.Value,new(z.languageNames[v.Value],e.languageNames[v.Value],j.languageNames[v.Value])))).ToArray(),Enumerable.Range(0,27).Select(i=>new OriginChoice(i,new(z.itemlist[505+i],e.itemlist[505+i],j.itemlist[505+i]))).ToArray(),Enumerable.Range(0,27).Select(i=>counters.GetDataCardStat((DataCard4)i)).ToArray());
    }
    private static void Index(int? value,int count){if(value is null||value<0||value>=count)throw new ArgumentException("Invalid Pokeathlon4 position.");}
    private static Ath4Value[] Values(Ath4Value[]? values,int count,Func<int,long> max)
    {
        if(values is null||values.Length==0||values.Length>count||values.Any(v=>v is null||v.Id is null||v.Id<0||v.Id>=count||v.Value is null||v.Value<0)||values.Select(v=>v.Id).Distinct().Count()!=values.Length||values.Any(v=>v.Value>max(v.Id!.Value)))throw new ArgumentException("Invalid Pokeathlon4 numeric fields.");return values;
    }
    private static void Pair(SAV4HGSS s,int species,int form)
    {
        if(!Choices(s).Species.Any(v=>v.Value==species)||form<0||form>=Math.Max(1,Forms(species,GameInfo.GetStrings("en")).Length))throw new ArgumentException("Invalid Pokeathlon4 species or form.");
    }
    private static void Pokemon(SAV4HGSS s,PokeathlonParticipant4 p,Ath4PokemonEdit f)
    {
        if(f is {Species:null,Form:null,Gender:null,Shiny:null,Pid:null,Tid:null,Sid:null}||f.Species is <0 or >493||f.Form is <0 or >31||f.Gender is <0 or >1||f.Gender is not null&&p.Gender>1||f.Pid is <0 or >uint.MaxValue||f.Tid is <0 or >65535||f.Sid is <0 or >65535)throw new ArgumentException("Invalid Pokeathlon4 participant fields.");
        int species=f.Species??p.Species,form=f.Form??(f.Species is not null?0:p.Form);if(f.Species is not null||f.Form is not null)Pair(s,species,form);
        if(f.Species is not null)p.Species=(ushort)species;if(f.Species is not null||f.Form is not null)p.Form=(byte)form;if(f.Gender is {} g)p.Gender=(byte)g;if(f.Shiny is {} shiny)p.IsShiny=shiny;if(f.Pid is {} pid)p.EncryptionConstant=(uint)pid;if(f.Tid is {} tid)p.TID16=(ushort)tid;if(f.Sid is {} sid)p.SID16=(ushort)sid;
    }
    private static void Counter(PokeathlonGlobalCounters4 c,int id,uint v)
    {
        switch(id){case 0:c.TimeSpent=v;break;case 1:c.SessionsJoined=v;break;case 2:c.PlacedFirst=v;break;case 3:c.PlacedLast=v;break;case 4:c.BonusesEarned=v;break;case 5:c.Instructions=v;break;case 6:c.Failed=v;break;case 7:c.Jumped=v;break;case 8:c.Acquired=v;break;case 9:c.Tackled=v;break;case 10:c.FellDown=v;break;case 11:c.Dashed=v;break;case 12:c.Switched=v;break;case 13:c.SelfImpeded=v;break;case 14:c.ConnectionJoined=v;break;case 15:c.ConnectionFirst=v;break;case 16:c.ConnectionLast=v;break;case >=17 and <=26:c[(PokeathlonEvent4)(id-17)]=v;break;case 27:c.TotalEventLast=v;break;case 28:c.Fame=v;break;default:throw new ArgumentException("Invalid Pokeathlon4 counter.");}
    }
    internal static void Apply(SaveFile save,Pokeathlon4Edit edit,string hash)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Pokeathlon4 requires valid checksums.");
        var raw=s.Pokeathlon.Data.ToArray();var a=new Pokeathlon4(raw);
        switch(edit)
        {
            case {Action:"general",Index:null,Slot:null,Member:null,Connection:null,Pokemon:null,Trainer:null,Enabled:null,SourceHash:null}:
                foreach(var v in Values(edit.Values,40,i=>i==0?99999:1)){int id=v.Id!.Value;uint value=(uint)v.Value!.Value;if(id==0)a.Points=value;else if(id<=12){ushort flags=ReadUInt16LittleEndian(raw.AsSpan(0xB7C));flags=(ushort)((flags&~(1<<(id-1)))|(value<<(id-1)));WriteUInt16LittleEndian(raw.AsSpan(0xB7C),flags);}else{uint flags=ReadUInt32LittleEndian(raw.AsSpan(0xB78));flags=(flags&~(1u<<(id-13)))|(value<<(id-13));WriteUInt32LittleEndian(raw.AsSpan(0xB78),flags);}}break;
            case {Action:"medal",Slot:null,Member:null,Connection:null,Pokemon:null,Trainer:null,Enabled:null,SourceHash:null}:
                Index(edit.Index-1,493);byte medal=a.Medals.GetMedal((ushort)edit.Index!.Value);foreach(var v in Values(edit.Values,5,_=>1))medal=(byte)((medal&~(1<<v.Id!.Value))|((int)v.Value!.Value<<v.Id.Value));a.Medals.SetMedal((ushort)edit.Index.Value,medal);break;
            case {Action:"medalsBatch",Index:null,Slot:null,Member:null,Connection:null,Values:null,Pokemon:null,Trainer:null,Enabled:{} enabled,SourceHash:{} source}:
                if(source.Length!=64||source!=hash)throw new ArgumentException("Pokeathlon4 preview is stale. Read it again.");if(enabled)a.Medals.SetAllMedals();else a.Medals.Clear();break;
            case {Action:"counters",Index:null,Slot:null,Member:null,Connection:null,Pokemon:null,Trainer:null,Enabled:null,SourceHash:null}:
                foreach(var v in Values(edit.Values,29,i=>Maximum(i)))Counter(a.GlobalCounters,v.Id!.Value,(uint)v.Value!.Value);break;
            case {Action:"best",Index:null,Slot:null,Member:null,Connection:null,Pokemon:null,Trainer:null,Enabled:null,SourceHash:null}:
                foreach(var v in Values(edit.Values,10,_=>65535))a.SetBestScore((PokeathlonEvent4)v.Id!.Value,(ushort)v.Value!.Value);break;
            case {Action:"course",Slot:null,Member:null,Connection:null,Pokemon:null,Trainer:null,Enabled:null,SourceHash:null}:
                Index(edit.Index,5);var c=a.GetCourseRecord((PokeathlonStat4)edit.Index!.Value);foreach(var v in Values(edit.Values,4,_=>65535)){ushort value=(ushort)v.Value!.Value;switch(v.Id){case 0:c.Score0=value;break;case 1:c.Score1=value;break;case 2:c.Score2=value;break;case 3:c.ScoreMax=value;break;}}break;
            case {Action:"participant",Member:null,Connection:null,Values:null,Pokemon:{} p,Trainer:null,Enabled:null,SourceHash:null}:
                Index(edit.Index,5);Index(edit.Slot,3);Pokemon(s,a.GetCourseRecord((PokeathlonStat4)edit.Index!.Value).GetParticipant(edit.Slot!.Value),p);break;
            case {Action:"attempts" or "record" or "entry",Connection:{} connection,Trainer:null,Enabled:null,SourceHash:null}:
                Index(edit.Index,10);var d=connection?a.GetEventConnection((PokeathlonEvent4)edit.Index!.Value).Inner:a.GetEventSelf((PokeathlonEvent4)edit.Index!.Value);
                if(edit.Action=="attempts"&&edit.Slot is null&&edit.Member is null&&edit.Pokemon is null){var vs=Values(edit.Values,1,_=>9999999);d.Attempts=(uint)vs[0].Value!.Value;}
                else if(edit.Action=="record"&&edit.Member is null&&edit.Pokemon is null){Index(edit.Slot,5);var vs=Values(edit.Values,1,_=>65535);var r=d.GetRecord(edit.Slot!.Value);r.Record=(ushort)vs[0].Value!.Value;}
                else if(edit.Action=="entry"&&edit.Values is null&&edit.Pokemon is {Gender:null,Shiny:null,Pid:null,Tid:null,Sid:null} f&&(f.Species is not null||f.Form is not null))
                {Index(edit.Slot,5);Index(edit.Member,3);var r=d.GetRecord(edit.Slot!.Value);var current=edit.Member==0?r.Entry0:edit.Member==1?r.Entry1:r.Entry2;int sp=f.Species??current.Species,form=f.Form??(f.Species is not null?0:current.Form);Pair(s,sp,form);current.Species=(ushort)sp;current.Form=(byte)form;switch(edit.Member){case 0:r.Entry0=current;break;case 1:r.Entry1=current;break;case 2:r.Entry2=current;break;}}
                else throw new ArgumentException("Invalid Pokeathlon4 event fields.");break;
            case {Action:"trainer",Member:null,Connection:null,Values:null,Pokemon:null,Trainer:{} t,Enabled:null,SourceHash:null}:
                Index(edit.Index,10);Index(edit.Slot,5);var trainer=a.GetEventConnection((PokeathlonEvent4)edit.Index!.Value).GetTrainer(edit.Slot!.Value);
                if(t is {Name:null,NameHex:null,Tid:null,Sid:null,Language:null}||t.Name is not null&&t.NameHex is not null||t.Tid is <0 or >65535||t.Sid is <0 or >65535||t.Language is {} language&&language!=0&&!Choices(s).Languages.Any(v=>v.Value==language))throw new ArgumentException("Invalid Pokeathlon4 trainer fields.");
                if(t.Language is {} lang)trainer.Language=(byte)lang;
                if(t.NameHex is {} hex){if(hex.Length!=32||hex.Any(c=>!Uri.IsHexDigit(c)))throw new ArgumentException("Pokeathlon4 trainer name requires 32 hex digits.");Convert.FromHexString(hex).CopyTo(trainer.OriginalTrainerTrash);}
                else if(t.Name is {} name&&name!=trainer.OriginalTrainerName){if(name.Length>7)throw new ArgumentException("Pokeathlon4 trainer name accepts seven characters.");trainer.OriginalTrainerName=name;if(trainer.OriginalTrainerName!=name)throw new ArgumentException("Pokeathlon4 trainer name cannot be encoded without loss.");}
                if(t.Tid is {} tid)trainer.TID16=(ushort)tid;if(t.Sid is {} sid)trainer.SID16=(ushort)sid;break;
            default:throw new ArgumentException("Invalid Pokeathlon4 action or mixed fields.");
        }
        raw.CopyTo(s.Pokeathlon.Data);
    }
    internal static byte[] Snapshot(SaveFile save)=>Save(save).General.Slice(0xD9D0,Pokeathlon4.SIZE+8).ToArray();
    internal static byte[] Edit(byte[] data,Pokeathlon4Edit edit)
    {
        if(data.Length is 0 or >32*1024*1024)throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");var s=Save(SaveUtil.GetSaveFile(data.ToArray())??throw new ArgumentException("Unrecognized save."));Apply(s,edit,PokeGear4Editing.Hash(data));var expected=Snapshot(s);var output=s.Write().ToArray();var check=Save(SaveUtil.GetSaveFile(output.ToArray())??throw new InvalidOperationException("Pokeathlon4 output was not recognized."));if(output.Length!=data.Length||check.Version!=s.Version||check.Magic!=s.Magic||!SaveChecksums.Valid(check)||!expected.SequenceEqual(Snapshot(check)))throw new InvalidOperationException("Pokeathlon4 export verification failed.");return output;
    }
}
public static partial class SaveService
{
    public static string ReadPokeathlon4(byte[] data)=>JsonSerializer.Serialize(Pokeathlon4Editing.Read(Open(data),PokeGear4Editing.Hash(data)),SaveJsonContext.Default.Pokeathlon4Catalog);
    public static byte[] EditPokeathlon4(byte[] data,string json){if(json.Length>8192)throw new ArgumentException("Pokeathlon4 request is too large.");var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Pokeathlon4Edit)??throw new ArgumentException("Missing Pokeathlon4 edit.");return Pokeathlon4Editing.Edit(data,edit);}
}
