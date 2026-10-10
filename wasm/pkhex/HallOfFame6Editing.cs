// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;
public sealed record Hall6Member(int Index,bool Editable,int Species,int HeldItem,int[] Moves,string Ec,int Tid,int Sid,int Form,int Gender,int Level,bool Shiny,bool Nicknamed,string Nickname,string TrainerName,int TrainerGender,string Sprite,string RawHex,string TrashHex,OriginChoice[] Forms,bool DualGender);
public sealed record Hall6Team(int Index,bool HasData,int ClearIndex,string? Date,bool DateEditable,int Year,int Month,int Day,uint RawIndex,int VisibleMembers,Hall6Member[] Members,string RawHex);
public sealed record Hall6SpeciesInfo(int Id,OriginChoice[] Forms,bool DualGender,bool FormSelectable);
public sealed record Hall6Catalog(bool CanEdit,string SourceHash,Hall6Team[] Teams,OriginChoice[] Species,OriginChoice[] Items,OriginChoice[] Moves,OriginChoice[] TrashSpecies,OriginChoice[] TrashLanguages,int[] SpecialChars,string RawHex,Hall6SpeciesInfo[] SpeciesInfo);
public sealed record Hall6Value(string Id,string? Value);
public sealed record Hall6Trash(string Action,string? Text=null,string? Hex=null,int? Species=null,int? Language=null,int? Generation=null,string? UiLanguage=null);
public sealed record Hall6Edit(string Action,string? SourceHash,int? Team,int? Member=null,Hall6Value[]? Fields=null,Hall6Trash? Trash=null,string? TargetHash=null);
public sealed record Hall6Preview(Hall6Edit Request,Hall6Catalog Result,int[] ChangedOffsets);
internal static class HallOfFame6Editing
{
    private static SAV6 Save(SaveFile save)=>save is SAV6XY or SAV6AO?(SAV6)save:throw new ArgumentException("Hall6 tools require X/Y or ORAS.");
    internal static HallOfFame6 Fame(SAV6 s)=>((ISaveBlock6Main)s).HallOfFame;
    private static readonly string[] FieldOrder=["Species","HeldItem","Move1","Move2","Move3","Move4","Ec","Tid","Sid","Form","Gender","Level","Shiny","Nicknamed","Nickname","TrainerName","TrainerGender","ClearIndex","Date"];
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<GameVersion,(OriginChoice[] Species,OriginChoice[] Items,OriginChoice[] Moves)> ChoiceCache=new();
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<GameVersion,Hall6SpeciesInfo[]> InfoCache=new();
    internal static (OriginChoice[] Species,OriginChoice[] Items,OriginChoice[] Moves) Choices(SAV6 s)=>ChoiceCache.GetOrAdd(s.Version,_=>{var strings=new[]{"zh-Hans","en","ja"}.Select(GameInfo.GetStrings).ToArray();var d=new FilteredGameDataSource(s,new GameDataSource(strings[1]));OriginChoice[] Map(IReadOnlyList<ComboItem> rows,Func<GameStrings,string[]> list)=>rows.Select(v=>new OriginChoice(v.Value,new(list(strings[0])[v.Value],list(strings[1])[v.Value],list(strings[2])[v.Value]))).ToArray();return(Map(d.Species,x=>x.specieslist),Map(d.Items,x=>x.itemlist),Map(d.Moves,x=>x.movelist));});
    internal static OriginChoice[] Forms(SAV6 s,int species){if(species<0||species>s.MaxSpeciesID)return[];GameStrings z=GameInfo.GetStrings("zh-Hans"),e=GameInfo.GetStrings("en"),j=GameInfo.GetStrings("ja");var en=FormConverter.GetFormList((ushort)species,e.types,e.forms,["♂","♀","-"],s.Context);var zh=FormConverter.GetFormList((ushort)species,z.types,z.forms,["♂","♀","-"],s.Context);var ja=FormConverter.GetFormList((ushort)species,j.types,j.forms,["♂","♀","-"],s.Context);return Enumerable.Range(0,en.Length).Select(i=>new OriginChoice(i,new(zh[i],en[i],ja[i]))).ToArray();}
    private static bool ValidDate(HallFame6Index index)=>DateUtil.IsValidDate((int)index.Year+2000,(int)index.Month,(int)index.Day);
    internal static bool UiDate(HallFame6Index index)=>index.Year<=50&&ValidDate(index);
    internal static int Visible(HallOfFame6 fame,int team,int language){int count=0;for(int i=0;i<6;i++)if(new HallFame6Entity(fame.GetEntity(team,i),language).Species!=0)count++;return Math.Max(1,count);}
    internal static Hall6Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var fame=Fame(s);var teams=new Hall6Team[16];
        for(int t=0;t<16;t++){var raw=fame.GetEntry(t);var index=new HallFame6Index(raw[^4..]);int visible=Visible(fame,t,s.Language);var members=new Hall6Member[6];
            for(int m=0;m<6;m++){var bytes=fame.GetEntity(t,m);var p=new HallFame6Entity(bytes,s.Language);members[m]=new(m,index.HasData&&m<visible,p.Species,p.HeldItem,[p.Move1,p.Move2,p.Move3,p.Move4],p.EncryptionConstant.ToString("X8"),p.TID16,p.SID16,p.Form,(int)p.Gender,(int)p.Level,p.IsShiny,p.IsNicknamed,p.Nickname,p.OriginalTrainerName,(int)p.OriginalTrainerGender,"b"+SpriteName.GetResourceStringSprite(p.Species,p.Form,(byte)Math.Min(p.Gender,2u),0,s.Context),Convert.ToHexString(bytes),Convert.ToHexString(bytes.Slice(0x18,26)),Forms(s,p.Species),p.Species<=s.MaxSpeciesID&&s.Personal[p.Species].IsDualGender);}
            teams[t]=new(t,index.HasData,(int)index.ClearIndex,ValidDate(index)?new DateOnly((int)index.Year+2000,(int)index.Month,(int)index.Day).ToString("yyyy-MM-dd"):null,UiDate(index),(int)index.Year+2000,(int)index.Month,(int)index.Day,index.Value,visible,members,Convert.ToHexString(raw));
        }
        var choices=Choices(s);return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,teams,choices.Species,choices.Items,choices.Moves,Hall6TrashEditing.Species.Value,Hall6TrashEditing.Languages.Value,Hall6TrashEditing.Chars,Convert.ToHexString(fame.Data),InfoCache.GetOrAdd(s.Version,_=>choices.Species.Select(p=>new Hall6SpeciesInfo(p.Id,Forms(s,p.Id),s.Personal[p.Id].IsDualGender,FormInfo.HasFormSelection(PersonalTable.AO[p.Id],(ushort)p.Id,6))).ToArray()));
    }
    private static int Number(string? value,int width,int max){if(value is null||value.Length>width||value.Any(c=>!char.IsAsciiDigit(c)&&c!=' '&&c!='_'))throw new ArgumentException("Invalid Hall6 masked number.");return Math.Min(max,Util.ToInt32(value));}
    private static int Pick(string? value,OriginChoice[] choices){if(!int.TryParse(value,NumberStyles.None,CultureInfo.InvariantCulture,out int n)||!choices.Any(c=>c.Id==n))throw new ArgumentException("Invalid Hall6 choice.");return n;}
    private static bool Flag(string? value)=>value switch{"0"=>false,"1"=>true,_=>throw new ArgumentException("Invalid Hall6 flag.")};
    private static string Text(string? value){if(value is null||value.Length>12)throw new ArgumentException("Invalid Hall6 text.");return value;}
    internal static void Patch(SAV6 s,int team,int member,Hall6Value[] values)
    {
        if(values.Length is 0 or >19||values.Any(v=>v is null||!FieldOrder.Contains(v.Id))||values.Select(v=>v.Id).Distinct().Count()!=values.Length)throw new ArgumentException("Invalid Hall6 fields.");var fields=values.ToDictionary(v=>v.Id,v=>v.Value);var fame=Fame(s);var p=new HallFame6Entity(fame.GetEntity(team,member),s.Language);var index=new HallFame6Index(fame.GetEntry(team)[^4..]);var choices=Choices(s);int species=fields.TryGetValue("Species",out var specie)?Pick(specie,choices.Species):p.Species;bool nicknamed=fields.TryGetValue("Nicknamed",out var nickFlag)?Flag(nickFlag):p.IsNicknamed;
        if(fields.ContainsKey("Nickname")&&!nicknamed)throw new ArgumentException("Hall6 nickname is read-only without the custom flag.");
        foreach(string id in FieldOrder)if(fields.TryGetValue(id,out var v))switch(id){
            case "Species":p.Species=(ushort)species;p.Form=0;break;
            case "HeldItem":p.HeldItem=(ushort)Pick(v,choices.Items);break;
            case "Move1":p.Move1=(ushort)Pick(v,choices.Moves);break;case "Move2":p.Move2=(ushort)Pick(v,choices.Moves);break;case "Move3":p.Move3=(ushort)Pick(v,choices.Moves);break;case "Move4":p.Move4=(ushort)Pick(v,choices.Moves);break;
            case "Ec":if(v is null||v.Length>8)throw new ArgumentException("Invalid Hall6 EC text.");p.EncryptionConstant=Util.GetHexValue(v);break;
            case "Tid":p.TID16=(ushort)Number(v,5,65535);break;case "Sid":p.SID16=(ushort)Number(v,5,65535);break;
            case "Form":p.Form=(byte)Pick(v,Forms(s,species));break;
            case "Gender":if(species>s.MaxSpeciesID||!s.Personal[species].IsDualGender||v is not ("0" or "1"))throw new ArgumentException("Invalid Hall6 gender toggle.");p.Gender=(uint)(v=="1"?1:0);var forms=Forms(s,species);int currentForm=p.Form;if(species==(int)PKHeX.Core.Species.Pyroar||forms.Any(f=>f.Id==currentForm&&EntityGender.GetFromString(f.Name.En) is 0 or 1))p.Form=(byte)p.Gender;break;
            case "Level":p.Level=(uint)Number(v,3,100);break;case "Shiny":p.IsShiny=Flag(v);break;case "Nicknamed":p.IsNicknamed=nicknamed;break;
            case "Nickname":p.Nickname=Text(v);break;case "TrainerName":p.OriginalTrainerName=Text(v);break;case "TrainerGender":p.OriginalTrainerGender=Flag(v)?1u:0u;break;
            case "ClearIndex":index.ClearIndex=(uint)Number(v,3,255);break;
            case "Date":if(!DateOnly.TryParseExact(v,"yyyy-MM-dd",CultureInfo.InvariantCulture,DateTimeStyles.None,out var date)||date.Year is <2000 or >2050)throw new ArgumentException("Invalid Hall6 date.");index.Year=(uint)(date.Year-2000);index.Month=(uint)date.Month;index.Day=(uint)date.Day;break;
        }
        if(!nicknamed&&(fields.ContainsKey("Species")||fields.ContainsKey("Nicknamed")))p.Nickname=species is 0 or >721?string.Empty:SpeciesName.GetSpeciesNameGeneration((ushort)species,s.Language,6);
        index.HasData=true;
    }
    internal static void Resave(SAV6 s,int team,int member,string? nicknameOverride=null)
    {
        var fame=Fame(s);var p=new HallFame6Entity(fame.GetEntity(team,member),s.Language);var index=new HallFame6Index(fame.GetEntry(team)[^4..]);var choices=Choices(s);int oldSpecies=p.Species,oldForm=p.Form,oldItem=p.HeldItem;
        if(!UiDate(index)||!choices.Species.Any(c=>c.Id==oldSpecies)||!Forms(s,p.Species).Any(c=>c.Id==oldForm))throw new ArgumentException("Hall6 resave requires readable source species, form and date.");
        string nickname=nicknameOverride??(p.IsNicknamed?p.Nickname:p.Species is 0 or >721?string.Empty:SpeciesName.GetSpeciesNameGeneration(p.Species,s.Language,6)),trainer=p.OriginalTrainerName;
        int item=choices.Items.Any(c=>c.Id==oldItem)?p.HeldItem:0;var moves=new[]{p.Move1,p.Move2,p.Move3,p.Move4}.Select(v=>choices.Moves.Any(c=>c.Id==v)?v:(ushort)0).ToArray();
        uint ec=p.EncryptionConstant,gender=Math.Min(p.Gender,2u),level=Math.Min(p.Level,100u);ushort tid=p.TID16,sid=p.SID16;byte form=p.Form;bool shiny=p.IsShiny,custom=p.IsNicknamed;uint otGender=p.OriginalTrainerGender;
        p.Species=p.Species;p.HeldItem=(ushort)item;p.Move1=moves[0];p.Move2=moves[1];p.Move3=moves[2];p.Move4=moves[3];p.EncryptionConstant=ec;p.TID16=tid;p.SID16=sid;p.Form=form;p.Gender=gender;p.Level=level;p.IsShiny=shiny;p.IsNicknamed=custom;p.Nickname=nickname;p.OriginalTrainerName=trainer;p.OriginalTrainerGender=otGender;
        string raw=index.ClearIndex.ToString("000");index.ClearIndex=(uint)Math.Min(255,Util.ToInt32(raw.AsSpan(0,Math.Min(3,raw.Length))));index.HasData=true;
    }
    internal static byte[] Prepare(SaveFile save,Hall6Edit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Hall6 editing requires valid checksums.");if(e.SourceHash!=hash||e.SourceHash?.Length!=64)throw new ArgumentException("Hall6 preview is stale.");if(e.Team is null or <0 or >=16)throw new ArgumentException("Invalid Hall6 team.");var copy=(SAV6)s.Clone();var fame=Fame(copy);int team=e.Team.Value;
        if(e.Action=="delete"){if(team==0||e.Member is not null||e.Fields is not null||e.Trash is not null)throw new ArgumentException("Hall6 first entry is protected or delete fields are invalid.");fame.ClearEntry(team);}
        else {if(e.Member is null or <0 or >=6||!new HallFame6Index(fame.GetEntry(team)[^4..]).HasData||e.Member.Value>=Visible(fame,team,copy.Language))throw new ArgumentException("Hall6 member is outside the editable source range.");int member=e.Member.Value;
            switch(e.Action){case "patch":if(e.Fields is null||e.Trash is not null)throw new ArgumentException("Invalid Hall6 patch.");Patch(copy,team,member,e.Fields);break;
                case "resave":if(e.Fields is not null||e.Trash is not null)throw new ArgumentException("Invalid Hall6 resave.");Resave(copy,team,member);break;
                case "trash":if(e.Fields is not null||e.Trash is null)throw new ArgumentException("Invalid Hall6 trash edit.");Hall6TrashEditing.Apply(copy,team,member,e.Trash);break;
                default:throw new ArgumentException("Invalid Hall6 action.");}
        }
        var expected=fame.Data.ToArray();var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray())as SAV6;
        if(check is null||check.GetType()!=copy.GetType()||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!Fame(check).Data.SequenceEqual(expected))throw new InvalidOperationException("Hall6 export verification failed.");if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Hall6 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Hall6Edit ParseHall6(string json)=>json.Length>150000?throw new ArgumentException("Hall6 request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Hall6Edit)??throw new ArgumentException("Missing Hall6 edit.");
    public static string ReadHall6(byte[] data)=>JsonSerializer.Serialize(HallOfFame6Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Hall6Catalog);
    public static string PreviewHall6(byte[] data,string json){var e=ParseHall6(json);var output=HallOfFame6Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Hall6Preview(e with{TargetHash=hash},HallOfFame6Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Hall6Preview);}
    public static byte[] EditHall6(byte[] data,string json){var e=ParseHall6(json);if(e.TargetHash?.Length!=64)throw new ArgumentException("Hall6 requires a frozen preview.");return HallOfFame6Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
}
