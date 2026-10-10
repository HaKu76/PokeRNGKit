// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record Tr6Field(string Key,string Group,LocalizedText Name,string Value,string Kind,int MaxLength,long Min,long Max,OriginChoice[] Choices);
public sealed record Tr6Basics(string Name,ushort Tid,ushort Sid,uint Money,byte Gender);
public sealed record Tr6Catalog(bool CanEdit,string SourceHash,Tr6Field[] Fields,string Sprite,int PlayerModel,string NameTrash,int[] Characters,OriginChoice[] TrashSpecies,OriginChoice[] TrashLanguages,TrainerOptions Existing,Tr6Basics Basics,Tr6Position Position);
public sealed record Tr6Value(string Key,string Value);
public sealed record Tr6Edit(string Action,string? SourceHash,Tr6Value[]? Fields=null,Hall6Trash? Trash=null,string? TargetHash=null,string? UiLanguage=null);
public sealed record Tr6Preview(Tr6Edit Request,Tr6Catalog Result,int[] ChangedOffsets,string[] IgnoredFields);
internal static class Trainer6Editing
{
    internal static SAV6 Save(SaveFile s)=>s is SAV6XY or SAV6AO?(SAV6)s:throw new ArgumentException("Trainer6 requires X/Y or ORAS.");
    internal static MaisonBlock Maison(SAV6 s)=>((ISaveBlock6Main)s).Maison;
    private static string Text(int n)=>n.ToString(CultureInfo.InvariantCulture);
    private static LocalizedText Label(string key,string fallback)=>Trainer6Names.Get("SAV_Trainer."+key,fallback);
    private static OriginChoice[] Sprites(SAV6 s){var values=Enum.GetValues<TrainerSprite6>();int count=s is SAV6XY?(int)TrainerSprite6.Trevor:values.Length;return values.Take(count).Select(v=>new OriginChoice((int)v,Trainer6Names.Get("TrainerSprite6."+v,v.ToString()))).ToArray();}
    private static OriginChoice[] Vivillon(SAV6 s){string[] List(string l){var g=GameInfo.GetStrings(l);return FormConverter.GetFormList((ushort)Species.Vivillon,g.types,g.forms,["♂","♀","-"],s.Context);}var z=List("zh-Hans");var e=List("en");var j=List("ja");return Enumerable.Range(0,z.Length).Select(i=>new OriginChoice(i,new(z[i],e[i],j[i]))).ToArray();}
    private static string[] Sayings(SAV6 s)=>[s.Status.Saying1,s.Status.Saying2,s.Status.Saying3,s.Status.Saying4,s.Status.Saying5];
    private static void Saying(SAV6 s,int i,string v){switch(i){case 0:s.Status.Saying1=v;break;case 1:s.Status.Saying2=v;break;case 2:s.Status.Saying3=v;break;case 3:s.Status.Saying4=v;break;case 4:s.Status.Saying5=v;break;default:throw new ArgumentException("Invalid Trainer6 saying.");}}
    private static Tr6Field[] Fields(SAV6 s)
    {
        var result=new List<Tr6Field>();
        void Add(string key,string group,string label,int value,int max,int width,OriginChoice[]? choices=null)=>result.Add(new(key,group,Label(label,key),Text(value),choices is null?"number":"choice",width,0,max,choices??[]));
        var sayings=Sayings(s);for(int i=0;i<5;i++)result.Add(new("Saying"+i,"sayings",Label("L_Saying"+(i+1),Text(i+1)),sayings[i],"text",16,0,0,[]));
        string[] modes=["Singles","Doubles","Triples","Rotation","Multi"];
        for(int i=0;i<20;i++)Add("Maison"+i,"maison",$"L_{modes[i/4]}{(i%4<2?"C":"B")}",Maison(s).GetMaisonStat(i),9999,4);
        Add("Sprite","multiplayer","L_MultiplayerSprite",((IMultiplayerSprite)s).MultiplayerSpriteID,255,3,Sprites(s));
        var viv=Vivillon(s);result.Add(new("Vivillon","multiplayer",new(GameInfo.GetStrings("zh-Hans").specieslist[666],GameInfo.GetStrings("en").specieslist[666],GameInfo.GetStrings("ja").specieslist[666]),Text(s.Vivillon),"choice",2,0,viv.Length-1,viv));
        OriginChoice[] flags=[new(0,new("关","Off","オフ")),new(1,new("开","On","オン"))];
        Add("Mega","flags","CHK_MegaUnlocked",s.Status.IsMegaEvolutionUnlocked?1:0,1,1,flags);
        if(s is SAV6AO){Add("Rayquaza","flags","CHK_MegaRayquazaUnlocked",s.Status.IsMegaRayquazaUnlocked?1:0,1,1,flags);var label=result[^1].Name;result[^1]=result[^1] with{Name=new(GameInfo.GetStrings("zh-Hans").specieslist[384]+" · "+label.Zh,GameInfo.GetStrings("en").specieslist[384]+" · "+label.En,GameInfo.GetStrings("ja").specieslist[384]+" · "+label.Ja)};}
        if(s is SAV6XY xy){Add("Style","chateau","L_Style",s.Situation.Style,255,3);var ranks=Enum.GetValues<BattleChateauRank6>().Select(v=>new OriginChoice((int)v,Trainer6Names.Get("BattleChateauRank6."+v,v.ToString()))).ToArray();Add("Rank","chateau","L_BattleChateauRank",xy.SUBE.ChateauRank,5,1,ranks);Add("Points","chateau","L_BattleChateauPoints",xy.SUBE.ChateauPoints,4095,4);}
        if(s is SAV6XY appearance)result.AddRange(TrainerAppearance6.WindowFields(appearance));
        return result.ToArray();
    }
    internal static Tr6Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);int sprite=((IMultiplayerSprite)s).MultiplayerSpriteID;return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,Fields(s),$"tr_{sprite:00}",s.Overworld.PlayerModel,Convert.ToHexString(s.Status.OriginalTrainerTrash),Hall6TrashEditing.Chars,Hall6TrashEditing.Species.Value,Hall6TrashEditing.Languages.Value,TrainerEditing.Options(s),new(s.OT,s.TID16,s.SID16,s.Money,s.Gender),Trainer6Position.Read(s));
    }
    private static int Number(Tr6Field field,string text)
    {
        // Masked controls restore zero on empty; Style then clamps to byte.MaxValue.
        if(text.Length>field.MaxLength||text.Any(c=>!char.IsAsciiDigit(c)))throw new ArgumentException("Invalid Trainer6 decimal input.");
        int n=text.Length==0?0:int.Parse(text,CultureInfo.InvariantCulture);
        if(field.Key=="Style")n=Math.Min(n,255);
        if(n<field.Min||n>field.Max||field.Kind=="choice"&&!field.Choices.Any(v=>v.Id==n)||text.Length==0&&field.Kind=="choice")throw new ArgumentException("Invalid Trainer6 number or choice.");return n;
    }
    private static void Patch(SAV6 s,Tr6Value[] rows)
    {
        var catalog=Fields(s).ToDictionary(v=>v.Key);if(rows.Length<1||rows.Length>catalog.Count||rows.Select(v=>v.Key).Distinct().Count()!=rows.Length)throw new ArgumentException("Invalid Trainer6 field list.");var parsed=new List<(Tr6Field Field,string Text,int Number)>();
        foreach(var v in rows){if(!catalog.TryGetValue(v.Key,out var f)||v.Value is null)throw new ArgumentException("Invalid Trainer6 field.");if(f.Kind is "text" or "property"){if(v.Value.Length>f.MaxLength)throw new ArgumentException("Trainer6 text exceeds its control width.");parsed.Add((f,v.Value,0));}else parsed.Add((f,v.Value,Number(f,v.Value)));}
        var appearanceRows=rows.Where(v=>v.Key.StartsWith("Appearance.",StringComparison.Ordinal)).ToArray();if(appearanceRows.Length>0)TrainerAppearance6.WindowApply((SAV6XY)s,appearanceRows);
        foreach(var (f,text,n) in parsed){if(f.Key.StartsWith("Appearance.",StringComparison.Ordinal))continue;if(f.Kind=="text"){Saying(s,int.Parse(f.Key[6..],CultureInfo.InvariantCulture),text);continue;}if(f.Key.StartsWith("Maison",StringComparison.Ordinal)){Maison(s).SetMaisonStat(int.Parse(f.Key[6..],CultureInfo.InvariantCulture),(ushort)n);continue;}switch(f.Key){case "Sprite":((IMultiplayerSprite)s).MultiplayerSpriteID=n;break;case "Vivillon":s.Vivillon=n;break;case "Mega":s.Status.IsMegaEvolutionUnlocked=n==1;break;case "Rayquaza":s.Status.IsMegaRayquazaUnlocked=n==1;break;case "Style":s.Situation.Style=n;break;case "Rank":((SAV6XY)s).SUBE.SetChateauByRank((ushort)n);break;case "Points":((SAV6XY)s).SUBE.ChateauPoints=(ushort)n;break;}}
        // Rank selection changes points first; an explicit point draft overrides it, independent of request order.
        var points=parsed.FirstOrDefault(v=>v.Field.Key=="Points");if(points.Field is not null)((SAV6XY)s).SUBE.ChateauPoints=(ushort)points.Number;
    }
    private static int Prefix(long n,int width,int max=int.MaxValue){var text=n.ToString(CultureInfo.InvariantCulture);if(text.StartsWith('-'))text=text[1..];return Math.Min(int.Parse(text[..Math.Min(width,text.Length)],CultureInfo.InvariantCulture),max);}
    private static int Pick(int n,IEnumerable<int> ids)=>ids.Contains(n)?n:-1;
    internal static void Resave(SAV6 s)
    {
        // Reproduce SAV_Trainer.Save after loading its unchanged controls. Position is not dirty.
        if(s.Gender>1||s.Situation.M>1000||s.Situation.R>7||!Vivillon(s).Any(v=>v.Id==s.Vivillon))throw new ArgumentException("Trainer6 source window cannot load the stored fields.");
        foreach(uint seconds in new[]{s.SecondsToStart,s.SecondsToFame})if(new DateTime(2000,1,1).AddSeconds(seconds)>new DateTime(2050,12,31))throw new ArgumentException("Trainer6 source date cannot be loaded.");
        DateTime? saved;try{saved=s.Played.LastSavedDate;}catch(ArgumentOutOfRangeException){throw new ArgumentException("Trainer6 saved date cannot be loaded.");}if(saved is {} date&&(date<new DateTime(2000,1,1)||date>new DateTime(2050,12,31)))throw new ArgumentException("Trainer6 source date cannot be loaded.");
        var options=TrainerEditing.Options(s);var sayings=Sayings(s);s.Overworld.ResetPlayerModel();s.Money=(uint)Prefix(s.Money,7);
        int country=Pick(s.Country,options.Geography!.Countries.Select(v=>v.Id));var regions=country>0?Util.GetCountryRegionList($"sr_{country:000}","en").Select(v=>v.Value):[];
        s.Region=unchecked((byte)Pick(s.Region,regions));s.Country=unchecked((byte)country);s.ConsoleRegion=unchecked((byte)Pick(s.ConsoleRegion,options.Geography.Consoles.Select(v=>v.Id)));s.Language=Pick(s.Language,options.Languages.Select(v=>v.Id));
        for(int i=0;i<5;i++)Saying(s,i,sayings[i]);for(int i=0;i<20;i++)Maison(s).SetMaisonStat(i,(ushort)Prefix(Maison(s).GetMaisonStat(i),4));s.BP=Prefix(s.BP,4);int miles=Prefix(s.GetRecord(63),7);s.SetRecord(63,miles);s.SetRecord(64,miles);s.Situation.Style=Math.Min(s.Situation.Style,255);
        s.Badges=s.Badges;s.Vivillon=s.Vivillon;s.PlayedMinutes=Prefix(s.PlayedMinutes,2)%60;s.PlayedSeconds=Prefix(s.PlayedSeconds,2)%60;((IMultiplayerSprite)s).MultiplayerSpriteID=unchecked((byte)Pick(((IMultiplayerSprite)s).MultiplayerSpriteID,Sprites(s).Select(v=>v.Id)));
        if(s is SAV6XY xy){xy.SUBE.ChateauRank=(ushort)Math.Min((int)xy.SUBE.ChateauRank,5);var appearance=xy.Status.Fashion;xy.Status.Fashion=appearance;xy.Status.Nickname=xy.Status.Nickname;}
        if(saved is {} d)s.Played.LastSavedDate=new(d.Year,d.Month,d.Day,d.Hour,d.Minute,0);
    }
    private static byte[] Encode(SAV6 s,string text){var bytes=new byte[26];int length=s.SetString(bytes,text,text.Length,StringConverterOption.None);return bytes[..length];}
    internal static void Trash(SAV6 s,Hall6Trash e)
    {
        var bytes=s.Status.OriginalTrainerTrash.ToArray();string old=s.OT;s.SetString(bytes,old,12,StringConverterOption.None);
        if(e.Action!="layer"&&(e.Species is not null||e.Language is not null||e.Generation is not null||e.UiLanguage is not null)||e.Action!="hex"&&e.Hex is not null||e.Action!="text"&&e.Text is not null)throw new ArgumentException("Invalid Trainer6 trash fields.");
        switch(e.Action){case "prepare":break;case "hex":if(e.Hex is null||e.Hex.Length!=52||e.Hex.Any(c=>!char.IsAsciiHexDigit(c)))throw new ArgumentException("Invalid Trainer6 name hex.");bytes=Convert.FromHexString(e.Hex);break;case "text":if(e.Text is null||e.Text.Length>12)throw new ArgumentException("Invalid Trainer6 name text.");Encode(s,e.Text).CopyTo(bytes,0);break;case "clear":int start=Encode(s,old).Length;Array.Clear(bytes,start,26-start);break;case "layer":if(e.Species is null||!Hall6TrashEditing.Species.Value.Any(v=>v.Id==e.Species)||e.Language is null||!Hall6TrashEditing.Languages.Value.Any(v=>v.Id==e.Language)||e.Generation is null or <0 or >100||e.UiLanguage is not ("zh" or "en" or "ja"))throw new ArgumentException("Invalid Trainer6 trash layer.");string name=SpeciesName.GetSpeciesNameGeneration((ushort)e.Species.Value,e.Language.Value,(byte)e.Generation.Value);if(name.Length==0){var v=Hall6TrashEditing.Species.Value.Single(v=>v.Id==e.Species);name=e.UiLanguage=="zh"?v.Name.Zh:e.UiLanguage=="ja"?v.Name.Ja:v.Name.En;}var layer=Encode(s,name);int from=Encode(s,old).Length;if(layer.Length<=from||layer.Length>26)throw new ArgumentException("Trainer6 trash layer is hidden or too long.");layer.AsSpan(from).CopyTo(bytes.AsSpan(from));break;default:throw new ArgumentException("Invalid Trainer6 trash action.");}
        // TrashEditor.Show updates the parent text and bytes; Save only re-encodes when text differs.
        string next=s.GetString(bytes);if(next!=old)s.OT=next;bytes.CopyTo(s.Status.OriginalTrainerTrash);
    }
    internal static byte[] Prepare(SaveFile save,Tr6Edit edit,string hash,int length,out string[] ignored)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Trainer6 editing requires valid checksums.");if(edit.SourceHash!=hash)throw new ArgumentException("Trainer6 preview is stale.");var copy=(SAV6)s.Clone();ignored=[];
        if(edit.Action=="position"){if(edit.Fields is null||edit.Trash is not null)throw new ArgumentException("Invalid Trainer6 position edit.");ignored=Trainer6Position.Apply(copy,edit.Fields,edit.UiLanguage);}
        else{
        if(edit.UiLanguage is not null)throw new ArgumentException("Invalid Trainer6 position-only language.");
        switch(edit.Action){case "patch":if(edit.Fields is null||edit.Trash is not null)throw new ArgumentException("Invalid Trainer6 patch.");Patch(copy,edit.Fields);break;case "resave":if(edit.Fields is not null||edit.Trash is not null)throw new ArgumentException("Invalid Trainer6 resave.");Resave(copy);break;case "accessories":if(copy is not SAV6XY xy||edit.Fields is not null||edit.Trash is not null)throw new ArgumentException("Trainer6 accessories require X/Y.");xy.Blocks.Fashion.UnlockAllAccessories();break;case "trash":if(edit.Fields is not null||edit.Trash is null)throw new ArgumentException("Invalid Trainer6 trash.");Trash(copy,edit.Trash);break;default:throw new ArgumentException("Invalid Trainer6 action.");}
        }
        var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray());if(check is null||check.GetType()!=copy.GetType()||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!check.Data.SequenceEqual(copy.Data))throw new InvalidOperationException("Trainer6 export verification failed.");if(edit.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Trainer6 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Tr6Edit ParseTrainer6(string json)=>json.Length>2300000?throw new ArgumentException("Trainer6 request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Tr6Edit)??throw new ArgumentException("Missing Trainer6 edit.");
    public static string ReadTrainer6(byte[] data)=>JsonSerializer.Serialize(Trainer6Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Tr6Catalog);
    public static string PreviewTrainer6(byte[] data,string json){var e=ParseTrainer6(json);var output=Trainer6Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length,out var ignored);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Tr6Preview(e with{TargetHash=hash},Trainer6Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray(),ignored),SaveJsonContext.Default.Tr6Preview);}
    public static byte[] EditTrainer6(byte[] data,string json){var e=ParseTrainer6(json);if(e.TargetHash?.Length!=64)throw new ArgumentException("Trainer6 requires a frozen preview.");return Trainer6Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length,out _);}
}
