// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;
public sealed record Base3Member(int Slot,int Species,int RawSpecies,string Pid,int HeldItem,int[] Moves,int Level,int Ev,int Form,string Sprite);
public sealed record Base3Entry(int Slot,string Name,string NameHex,int Language,int Location,int Class,int Tid,int Sid,int Gender,int Times,int Registry,bool Battled,Base3Member[] Members);
public sealed record SecretBase3Catalog(bool CanEdit,Base3Entry[] Bases,OriginChoice[] SpeciesChoices,OriginChoice[] MoveChoices,OriginChoice[] ItemChoices);
public sealed record Base3TrainerEdit(string? Name=null,string? NameHex=null,int? Tid=null,int? Sid=null,int? Gender=null,int? Times=null,int? Registry=null,bool? Battled=null);
public sealed record Base3MemberEdit(int? Species=null,long? Pid=null,int? HeldItem=null,int?[]? Moves=null,int? Level=null,int? Ev=null);
public sealed record SecretBase3Edit(string Action,int? Base=null,int? Member=null,Base3TrainerEdit? Trainer=null,Base3MemberEdit? Pokemon=null);
public sealed record Base3FormQuery(int? Base,int? Member,long? Pid,int? Form);
public sealed record Base3FormSuggestion(string Pid,int Form,string Sprite);
internal static class SecretBase3Editing
{
    private static SAV3 Save(SaveFile save)=>save is SAV3RS or SAV3E?(SAV3)save:throw new ArgumentException("Gen3 secret bases are unavailable for this format.");
    private static int Offset(SAV3 s)=>s is SAV3RS?0x1A08:0x1A9C;
    private static SecretBase3 Copy(SAV3 s,int slot,bool occupied=true)
    {
        if(slot is <0 or >=20)throw new ArgumentException("Invalid Gen3 secret base slot.");
        var b=new SecretBase3(s.Large.Slice(Offset(s)+slot*160,160).ToArray());
        if(occupied&&!b.IsTrainerPresent)throw new ArgumentException("This Gen3 secret base slot has no trainer.");return b;
    }
    private static FilteredGameDataSource Choices(SAV3 s)=>new(s,new GameDataSource(GameInfo.GetStrings("en")));
    internal static SecretBase3Catalog Read(SaveFile save)
    {
        var s=Save(save);var ids=Choices(s);var zh=GameInfo.GetStrings("zh-Hans");var en=GameInfo.GetStrings("en");var ja=GameInfo.GetStrings("ja");
        OriginChoice[] Names(IEnumerable<ComboItem> source,IReadOnlyList<string> z,IReadOnlyList<string> e,IReadOnlyList<string> j)=>source.OrderBy(v=>v.Value).Select(v=>new OriginChoice(v.Value,new(z[v.Value],e[v.Value],j[v.Value]))).ToArray();
        var bases=new List<Base3Entry>();for(int i=0;i<20;i++)
        {
            var b=Copy(s,i,false);if(!b.IsTrainerPresent)continue;
            var members=b.Team.Team.Select((p,slot)=>new Base3Member(slot,p.Species,p.SpeciesInternal,p.PID.ToString("X8"),p.HeldItem,[p.Move1,p.Move2,p.Move3,p.Move4],p.Level,p.EVAll,p.Form,"b"+SpriteName.GetResourceStringSprite(p.Species,p.Form,0,0,EntityContext.Gen3))).ToArray();
            bases.Add(new(i,b.OriginalTrainerName,Convert.ToHexString(b.OriginalTrainerTrash),b.Language,b.SecretBaseLocation,b.OriginalTrainerClass,b.TID16,b.SID16,b.OriginalTrainerGender,b.TimesEntered,b.RegistryStatus,b.BattledToday,members));
        }
        return new(s.State.Exportable&&SaveChecksums.Valid(s),bases.ToArray(),Names(ids.Species,zh.specieslist,en.specieslist,ja.specieslist),Names(ids.Moves,zh.movelist,en.movelist,ja.movelist),Names(ids.Items,zh.GetItemStrings(s.Context,s.Version),en.GetItemStrings(s.Context,s.Version),ja.GetItemStrings(s.Context,s.Version)));
    }
    internal static byte[] Snapshot(SaveFile save){var s=Save(save);return s.Large.Slice(Offset(s)-4,3208).ToArray();}
    internal static void Apply(SaveFile save,SecretBase3Edit edit)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Gen3 secret base editing requires valid checksums.");
        if(edit.Base is null)throw new ArgumentException("Missing Gen3 secret base slot.");var b=Copy(s,edit.Base.Value);
        if(edit.Action=="trainer"&&edit.Member is null&&edit.Pokemon is null&&edit.Trainer is {} t)
        {
            if(t is {Name:null,NameHex:null,Tid:null,Sid:null,Gender:null,Times:null,Registry:null,Battled:null} ||t.Name is not null&&t.NameHex is not null||t.Tid is <0 or >65535||t.Sid is <0 or >65535||t.Gender is <0 or >1||t.Times is <0 or >255||t.Registry is <0 or >1)throw new ArgumentException("Invalid Gen3 secret base trainer fields.");
            if(t.NameHex is {} hex){if(hex.Length!=14||hex.Any(c=>!Uri.IsHexDigit(c)))throw new ArgumentException("Gen3 secret base name bytes require 14 hex digits.");Convert.FromHexString(hex).CopyTo(b.OriginalTrainerTrash);}
            else if(t.Name is {} name&&name!=b.OriginalTrainerName){if(name.Length>7)throw new ArgumentException("Gen3 secret base name accepts seven characters.");b.OriginalTrainerName=name;if(b.OriginalTrainerName!=name)throw new ArgumentException("Gen3 secret base name cannot be encoded without loss.");}
            if(t.Tid is {} tid)b.TID16=(ushort)tid;if(t.Sid is {} sid)b.SID16=(ushort)sid;if(t.Gender is {} gender)b.OriginalTrainerGender=(byte)gender;if(t.Times is {} times)b.TimesEntered=(byte)times;if(t.Registry is {} registry)b.RegistryStatus=registry;if(t.Battled is {} battled)b.BattledToday=battled;
        }
        else if(edit.Action=="member"&&edit.Trainer is null&&edit.Member is >=0 and <6&&edit.Pokemon is {} f)
        {
            if(f is {Species:null,Pid:null,HeldItem:null,Moves:null,Level:null,Ev:null}||f.Species is <0 or >386||f.Pid is <0 or >uint.MaxValue||f.Level is <2 or >100||f.Ev is <0 or >85)throw new ArgumentException("Invalid Gen3 secret base member fields.");
            var team=b.Team;var p=team.Team[edit.Member.Value];
            if(f.Species==0)
            {
                if(f is not {Pid:null,HeldItem:null,Moves:null,Level:null,Ev:null})throw new ArgumentException("Gen3 secret base clearing requires a species-only request.");
                p.SpeciesInternal=0;p.PID=0;p.HeldItem=0;p.Move1=p.Move2=p.Move3=p.Move4=0;p.Level=p.EVAll=0;
            }
            else
            {
                if((f.Species??p.Species)==0)throw new ArgumentException("Choose a nonempty Gen3 secret base species before editing.");
                var choices=Choices(s);
                if(f.HeldItem is {} item&&!choices.Items.Any(v=>v.Value==item)||f.Moves is {} moves&&(moves.Length!=4||moves.Any(v=>v is {} id&&!choices.Moves.Any(m=>m.Value==id))))throw new ArgumentException("Invalid Gen3 secret base move or held item.");
                if(f.Species is {} species){bool wasEmpty=p.Species==0;p.Species=(ushort)species;if(wasEmpty&&p.Level<2&&f.Level is null)p.Level=2;}
                if(f.Pid is {} pid)p.PID=(uint)pid;if(f.HeldItem is {} held)p.HeldItem=(ushort)held;
                if(f.Moves is {} ms){if(ms[0] is {} m)p.Move1=(ushort)m;if(ms[1] is {} n)p.Move2=(ushort)n;if(ms[2] is {} o)p.Move3=(ushort)o;if(ms[3] is {} q)p.Move4=(ushort)q;}
                if(f.Level is {} level)p.Level=(byte)level;if(f.Ev is {} ev)p.EVAll=(byte)ev;
            }
            b.Team=team;
        }
        else throw new ArgumentException("Invalid Gen3 secret base action or mixed fields.");
        b.Data.CopyTo(s.Large[(Offset(s)+edit.Base.Value*160)..]);
    }
    internal static Base3FormSuggestion Suggest(SaveFile save,Base3FormQuery query)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s)||query.Base is null||query.Member is not(>=0 and <6)||query.Pid is not(>=0 and <=uint.MaxValue)||query.Form is not(>=0 and <28))throw new ArgumentException("Invalid Gen3 secret base form preview.");
        _=Copy(s,query.Base.Value);var pk=new PK3{Species=201,PID=(uint)query.Pid.Value};pk.Form=(byte)query.Form.Value;return new(pk.PID.ToString("X8"),pk.Form,"b"+SpriteName.GetResourceStringSprite(pk.Species,pk.Form,0,0,EntityContext.Gen3));
    }
    internal static byte[] Edit(byte[] data,SecretBase3Edit edit)
    {
        if(data.Length is 0 or >32*1024*1024)throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");var s=Save(SaveUtil.GetSaveFile(data.ToArray())??throw new ArgumentException("Unrecognized save."));Apply(s,edit);var expected=Snapshot(s);var output=s.Write().ToArray();var check=Save(SaveUtil.GetSaveFile(output.ToArray())??throw new InvalidOperationException("Gen3 secret base output was not recognized."));
        if(output.Length!=data.Length||check.GetType()!=s.GetType()||check.Version!=s.Version||check.SaveRevision!=s.SaveRevision||check.Japanese!=s.Japanese||!SaveChecksums.Valid(check)||!expected.SequenceEqual(Snapshot(check)))throw new InvalidOperationException("Gen3 secret base export verification failed.");return output;
    }
}
public static partial class SaveService
{
    public static string ReadSecretBase3(byte[] data)=>JsonSerializer.Serialize(SecretBase3Editing.Read(Open(data)),SaveJsonContext.Default.SecretBase3Catalog);
    public static byte[] EditSecretBase3(byte[] data,string json){if(json.Length>4096)throw new ArgumentException("Gen3 secret base request is too large.");var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.SecretBase3Edit)??throw new ArgumentException("Missing Gen3 secret base edit.");return SecretBase3Editing.Edit(data,edit);}
    public static string SuggestSecretBase3Form(byte[] data,string json){if(json.Length>1024)throw new ArgumentException("Gen3 secret base form request is too large.");var query=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Base3FormQuery)??throw new ArgumentException("Missing Gen3 secret base form query.");return JsonSerializer.Serialize(SecretBase3Editing.Suggest(Open(data),query),SaveJsonContext.Default.Base3FormSuggestion);}
}
