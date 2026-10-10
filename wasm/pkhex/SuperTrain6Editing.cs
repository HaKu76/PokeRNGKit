// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;
public sealed record St6Holder(int Lane,int Species,int Form,int Gender,LocalizedText Name,string Sprite,string Time,string TimeBits,string RawHex);
public sealed record St6Stage(int Index,LocalizedText Name,St6Holder[] Holders);
public sealed record St6Bag(int Index,int Id,LocalizedText Name,bool SourceReadable);
public sealed record St6NumberSymbols(LocalizedText NaN,LocalizedText PositiveInfinity,LocalizedText NegativeInfinity);
public sealed record St6Catalog(bool CanEdit,string SourceHash,St6Stage[] Stages,St6Bag[] Bags,OriginChoice[] BagChoices,OriginChoice[] Species,St6NumberSymbols NumberSymbols,string RawHex);
public sealed record St6BagEdit(int Index,int Id);
public sealed record St6Edit(string Action,string? SourceHash,string? UiLanguage,int? Stage=null,int? Lane=null,int? Species=null,string? Form=null,string? Gender=null,string? Time=null,St6BagEdit[]? Bags=null,string? TargetHash=null);
public sealed record St6Preview(St6Edit Request,St6Catalog Result,int[] ChangedOffsets,string[] IgnoredFields);
internal static class SuperTrain6Editing
{
    private static readonly string[] Languages=["zh-Hans","en","ja"];
    private static readonly Lazy<(string[] Bags,string[] Stages,string[] Species)[]> Strings=new(()=>Languages.Select(l=>{var s=GameInfo.GetStrings(l);var bags=s.trainingbags.ToArray();bags[0]="---";return(bags,s.trainingstage.ToArray(),s.specieslist.ToArray());}).ToArray());
    private static SAV6 Save(SaveFile s)=>s is SAV6XY or SAV6AO?(SAV6)s:throw new ArgumentException("SuperTrain6 requires X/Y or ORAS.");
    internal static SuperTrainBlock Block(SAV6 s)=>((ISaveBlock6Main)s).SuperTrain;
    internal static CultureInfo Culture(string? language)=>CultureInfo.GetCultureInfo(language switch{"zh"=>"zh-Hans","en"=>"en","ja"=>"ja",_=>throw new ArgumentException("Invalid SuperTrain6 UI language.")});
    private static int LanguageIndex(string? language)=>language switch{"zh"=>0,"en"=>1,"ja"=>2,_=>throw new ArgumentException("Invalid SuperTrain6 UI language.")};
    private static LocalizedText Name(int id,Func<(string[] Bags,string[] Stages,string[] Species),string[]> list){string Get(int i){var rows=list(Strings.Value[i]);return id>=0&&id<rows.Length?rows[id]:id.ToString(CultureInfo.InvariantCulture);}return new(Get(0),Get(1),Get(2));}
    internal static string[] BagNames(string language)=>Strings.Value[LanguageIndex(language)].Bags;
    internal static St6Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var b=Block(s);var stages=new St6Stage[32];
        for(int i=0;i<32;i++){var holders=new St6Holder[2];for(int lane=0;lane<2;lane++){var p=lane==0?b.GetHolder1(i):b.GetHolder2(i);float time=lane==0?b.GetTime1(i):b.GetTime2(i);uint bits=BinaryPrimitives.ReadUInt32LittleEndian(b.Data[((lane==0?0x08:0xC8)+i*4)..]);holders[lane]=new(lane,p.Species,p.Form,p.Gender,Name(p.Species,x=>x.Species),"b"+SpriteName.GetResourceStringSprite(p.Species,p.Form,(byte)Math.Min((int)p.Gender,2),0,s.Context),time.ToString("R",CultureInfo.InvariantCulture),bits.ToString("X8"),Convert.ToHexString(b.Data.Slice((lane==0?0x188:0x248)+i*4,4)));}stages[i]=new(i,Name(i,x=>x.Stages),holders);}
        var bags=Enumerable.Range(0,12).Select(i=>{int id=b.GetBag(i);return new St6Bag(i,id,Name(id,x=>x.Bags),Strings.Value.All(x=>id<x.Bags.Length));}).ToArray();
        var choices=Enumerable.Range(0,Strings.Value[0].Bags.Length).Where(i=>Strings.Value.Any(x=>i<x.Bags.Length&&x.Bags[i].Length!=0)).Select(i=>new OriginChoice(i,Name(i,x=>x.Bags))).ToArray();
        var formats=new[]{"zh","en","ja"}.Select(l=>Culture(l).NumberFormat).ToArray();LocalizedText Symbol(Func<NumberFormatInfo,string> get)=>new(get(formats[0]),get(formats[1]),get(formats[2]));
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,stages,bags,choices,HallOfFame6Editing.Choices(s).Species,new(Symbol(x=>x.NaNSymbol),Symbol(x=>x.PositiveInfinitySymbol),Symbol(x=>x.NegativeInfinitySymbol)),Convert.ToHexString(b.Data));
    }
    private static void Pack(SuperTrainBlock b,string language,St6BagEdit[]? changes)
    {
        var names=BagNames(language);var selected=Enumerable.Range(0,12).Select(b.GetBag).Select(x=>(int)x).ToArray();
        if(changes is {} rows){if(rows.Length is <1 or >12||rows.Select(x=>x.Index).Distinct().Count()!=rows.Length)throw new ArgumentException("Invalid SuperTrain6 bag list.");foreach(var e in rows){if(e.Index is <0 or >11||e.Id<0||e.Id>=names.Length||names[e.Id].Length==0)throw new ArgumentException("Invalid SuperTrain6 bag choice.");selected[e.Index]=e.Id;}}
        if(selected.Any(i=>i>=names.Length))throw new ArgumentException("SuperTrain6 old bag cannot be loaded by the source window.");
        int empty=0;for(int i=0;i<12;i++){int id=Array.IndexOf(names,names[selected[i]]);if(id<=0){empty++;continue;}b.SetBag(i-empty,(byte)id);}
    }
    internal static byte[] Prepare(SaveFile save,St6Edit e,string hash,int length,out string[] ignored)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("SuperTrain6 editing requires valid save checksums.");if(e.SourceHash!=hash)throw new ArgumentException("SuperTrain6 preview is stale.");var culture=Culture(e.UiLanguage);var copy=(SAV6)s.Clone();var b=Block(copy);var skipped=new List<string>();
        if(e.Action=="record"){
            if(e.Stage is null or <0 or >31||e.Lane is null or <0 or >1||e.Bags is not null||e.Species is null&&e.Form is null&&e.Gender is null&&e.Time is null)throw new ArgumentException("Invalid SuperTrain6 record target.");var p=e.Lane==0?b.GetHolder1(e.Stage.Value):b.GetHolder2(e.Stage.Value);
            if(e.Species is {} species){if(!HallOfFame6Editing.Choices(copy).Species.Any(v=>v.Id==species))throw new ArgumentException("Invalid SuperTrain6 species.");p.Species=(ushort)species;}
            if(e.Form is {} form){if(form.Length>32767)throw new ArgumentException("SuperTrain6 form text too long.");if(byte.TryParse(form,NumberStyles.Integer,culture,out byte v))p.Form=v;else skipped.Add("Form");}
            if(e.Gender is {} gender){if(gender.Length>32767)throw new ArgumentException("SuperTrain6 gender text too long.");if(byte.TryParse(gender,NumberStyles.Integer,culture,out byte v))p.Gender=v;else skipped.Add("Gender");}
            if(e.Time is {} time){if(time.Length>32767)throw new ArgumentException("SuperTrain6 time text too long.");if(float.TryParse(time,NumberStyles.Float|NumberStyles.AllowThousands,culture,out float v)){if(e.Lane==0)b.SetTime1(e.Stage.Value,v);else b.SetTime2(e.Stage.Value,v);}else skipped.Add("Time");}
        }else if(e.Action is "bags" or "resave"){
            if(e.Stage is not null||e.Lane is not null||e.Species is not null||e.Form is not null||e.Gender is not null||e.Time is not null||e.Action=="bags"&&e.Bags is null||e.Action=="resave"&&e.Bags is not null)throw new ArgumentException("Invalid SuperTrain6 bag fields.");Pack(b,e.UiLanguage!,e.Bags);
        }else throw new ArgumentException("Invalid SuperTrain6 action.");
        ignored=skipped.ToArray();var expected=b.Data.ToArray();var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray())as SAV6;
        if(check is null||check.GetType()!=copy.GetType()||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!Block(check).Data.SequenceEqual(expected))throw new InvalidOperationException("SuperTrain6 export verification failed.");if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("SuperTrain6 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static St6Edit ParseSuperTrain6(string json)=>json.Length>110000?throw new ArgumentException("SuperTrain6 request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.St6Edit)??throw new ArgumentException("Missing SuperTrain6 edit.");
    public static string ReadSuperTrain6(byte[] data)=>JsonSerializer.Serialize(SuperTrain6Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.St6Catalog);
    public static string PreviewSuperTrain6(byte[] data,string json){var e=ParseSuperTrain6(json);var output=SuperTrain6Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length,out var ignored);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new St6Preview(e with{TargetHash=hash},SuperTrain6Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray(),ignored),SaveJsonContext.Default.St6Preview);}
    public static byte[] EditSuperTrain6(byte[] data,string json){var e=ParseSuperTrain6(json);if(e.TargetHash?.Length!=64)throw new ArgumentException("SuperTrain6 requires a frozen preview.");return SuperTrain6Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length,out _);}
}
