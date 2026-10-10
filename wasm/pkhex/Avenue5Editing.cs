// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record Avenue5Field(string Id,string Group,LocalizedText Name,string Kind,string Value,long Maximum,int TextMaximum,OriginChoice[]? Choices);
public sealed record Avenue5Object(string Group,int Index,string Name,string? Extension,string RawHex,Avenue5Field[] Fields);
public sealed record Avenue5Catalog(bool CanEdit,string SourceHash,Avenue5Object[] Objects,string RawHex);
public sealed record Avenue5FieldEdit(string Id,string? Value);
public sealed record Avenue5Edit(string Action,string? SourceHash,string Group,int? Index,Avenue5FieldEdit[]? Fields=null,string? DataBase64=null,string? TargetHash=null);
public sealed record Avenue5Preview(Avenue5Edit Request,Avenue5Catalog Result,int[] ChangedOffsets);
internal sealed record Avenue5Definition(string Id,string Group,LocalizedText Name,string Kind,long Maximum,int TextMaximum,OriginChoice[]? Choices,Func<string> Get,Action<string> Set)
{
    internal static Avenue5Definition Number(string id,string group,LocalizedText name,long max,Func<long> get,Action<long> set,bool boolean=false)=>new(id,group,name,boolean?"boolean":"number",max,0,null,()=>get().ToString(CultureInfo.InvariantCulture),v=>set(long.Parse(v,CultureInfo.InvariantCulture)));
    internal static Avenue5Definition Text(string id,string group,LocalizedText name,int max,Func<string> get,Action<string> set)=>new(id,group,name,"text",0,max,null,get,set);
    internal Avenue5Field Read()=>new(Id,Group,Name,Kind,Get(),Maximum,TextMaximum,Choices);
    internal void Validate(string? text)
    {
        if(text is null||text.Length>(Kind is "number" or "boolean"?20:TextMaximum))throw new ArgumentException("Invalid Avenue5 field text.");
        if(Kind is "number" or "boolean"){
            if(!long.TryParse(text,NumberStyles.None,CultureInfo.InvariantCulture,out var n)||n<0||n>Maximum||Choices is {} choices&&!choices.Any(c=>c.Id==n))throw new ArgumentException("Invalid Avenue5 numeric field.");
        }else if(Kind=="shop")Avenue5Fields.ParseShop(text);
    }
}
internal static partial class Avenue5Fields
{
    private static readonly Lazy<GameDataSource[]> Sources=new(()=>new[]{"zh-Hans","en","ja"}.Select(l=>new GameDataSource(GameInfo.GetStrings(l))).ToArray());
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<GameVersion,OriginChoice[]> GameChoices=new();
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<GameVersion,OriginChoice[]> SpeciesChoices=new();
    private static OriginChoice[] Species(SAV5B2W2 s)=>SpeciesChoices.GetOrAdd(s.Version,_=>Misc5Forest.Species(s));
    private static Avenue5Definition NumberChoice(string id,LocalizedText name,Func<long> get,Action<long> set,OriginChoice[] choices)=>Avenue5Definition.Number(id,"general",name,uint.MaxValue,get,set) with{Choices=choices};
    private static OriginChoice[] Games(SAV5B2W2 s)=>GameChoices.GetOrAdd(s.Version,_=>{var languages=Sources.Value;var ids=GameUtil.GetVersionsWithinRange(s,s.Context).Select(v=>(int)v).ToHashSet();return languages[1].VersionDataSource.Where(v=>v.Value==0||ids.Contains(v.Value)).Select(v=>new OriginChoice(v.Value,new(languages[0].VersionDataSource.First(x=>x.Value==v.Value).Text,languages[1].VersionDataSource.First(x=>x.Value==v.Value).Text,languages[2].VersionDataSource.First(x=>x.Value==v.Value).Text))).ToArray();});
    private static OriginChoice[] Languages()=>GameInfo.LanguageDataSource(5,EntityContext.Gen5).Select(v=>new OriginChoice(v.Value,new(GameInfo.GetStrings("zh-Hans").languageNames[v.Value],GameInfo.GetStrings("en").languageNames[v.Value],GameInfo.GetStrings("ja").languageNames[v.Value]))).ToArray();
    internal static (byte Version,JoinAvenueShopType5 Type,byte Rank)? ParseShop(string text)
    {
        var parts=text.Split(',');if(parts.Length!=3||!int.TryParse(parts[0],out int type)||!int.TryParse(parts[1],out int rank)||!int.TryParse(parts[2],out int version)||type is < -1 or >7||rank is <0 or >9||version is <0 or >3)throw new ArgumentException("Invalid Avenue5 shop tuple.");
        return type==-1?null:((byte)version,(JoinAvenueShopType5)type,(byte)rank);
    }
    private static string FormatShop((byte Version,JoinAvenueShopType5 Type,byte Rank)? value)=>value is {} t?$"{(int)t.Type}, {t.Rank}, {t.Version}":"-1, 0, 0";
    private static void AddVisitorExtra(JoinAvenueVisitor5 v,List<Avenue5Definition> fields,SAV5B2W2 save)
    {
        Avenue5Definition Text(string id,string label,Func<string> get,Action<string> set,string kind="list")=>new(id,"specific",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor."+label),kind,0,32767,null,get,set);
        void InsertBefore(string before,Avenue5Definition field)=>fields.Insert(fields.FindIndex(d=>d.Id==before),field);
        var counts=Text("ShopCounts","L_ShopCounts",()=>string.Join(", ",new byte[]{v.ShopCountRaffle,v.ShopCountSalon,v.ShopCountMarket,v.ShopCountFlorist,v.ShopCountDojo,v.ShopCountNurse,v.ShopCountAntique,v.ShopCountCafe}),text=>{var n=ParseByteList(text,8,15);v.ShopCountRaffle=n[0];v.ShopCountSalon=n[1];v.ShopCountMarket=n[2];v.ShopCountFlorist=n[3];v.ShopCountDojo=n[4];v.ShopCountNurse=n[5];v.ShopCountAntique=n[6];v.ShopCountCafe=n[7];});
        InsertBefore("DexSeen",counts);
        InsertBefore("MedalRank",NumberChoice("FavoriteSpecies",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_FavoriteSpecies"),()=>v.FavoriteSpecies,n=>v.FavoriteSpecies=(ushort)n,Species(save)) with{Group="specific"});
        InsertBefore("MetHour",Text("Date1","L_Date1",()=>FormatDate(v.Date1.RawValue),t=>v.Date1=new(ParseDate(t)),"date"));
        InsertBefore("MetHour",Text("DateAdventureStart","L_DateStart",()=>FormatDate(v.DateAdventureStart.RawValue),t=>v.DateAdventureStart=new(ParseDate(t)),"date"));
        InsertBefore("MetHour",Text("DateHallOfFame","L_DateHall",()=>FormatDate(v.DateHallOfFame.RawValue),t=>v.DateHallOfFame=new(ParseDate(t)),"date"));
        InsertBefore("MetHour",Text("Records","L_Records",()=>string.Join(", ",Enumerable.Range(0,8).Select(i=>v.GetRecord((JoinAvenueRecordIndex5)i))),t=>{var n=ParseUIntList(t,8);for(int i=0;i<8;i++)v.SetRecord((JoinAvenueRecordIndex5)i,n[i]);}));
        InsertBefore("MetHour",Text("Trivia","L_Trivia",()=>string.Join(", ",Enumerable.Range(0,16).Select(v.GetTrivia)),t=>{var n=ParseByteList(t,16,255);for(int i=0;i<16;i++)v.SetTrivia(i,n[i]);}));
        InsertBefore("MetHour",Text("Activities","L_Activities",()=>string.Join(", ",Enumerable.Range(0,4).Select(v.GetActivity)),t=>{var n=ParseByteList(t,4,255);for(int i=0;i<4;i++)v.SetActivity(i,n[i]);}));
        InsertBefore("MetHour",Text("ActivityDates","L_ActivityDates",()=>string.Join(", ",Enumerable.Range(0,4).Select(i=>FormatDate(v.GetActivityDate(i).RawValue))),t=>{var n=ParseDateList(t,4);for(int i=0;i<4;i++)v.SetActivityDate(i,new(n[i]));}));
        InsertBefore("MetHour",NumberChoice("Origin",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_Origin"),()=>v.Origin,n=>v.Origin=(ushort)n,[new(0,new("非玩家角色","NPC","NPC")),new(1,new("玩家","Human Player","プレイヤー"))])with{Group="specific"});
        var choices=new[]{new OriginChoice(-1,new("无","None","なし"))}.Concat(Enum.GetValues<JoinAvenueShopType5>().Select(t=>new OriginChoice((int)t,Avenue5Text.Get("JoinAvenueShopType5."+t)))).ToArray();
        fields.Add(Text("DesiredShop","L_DesiredShopType",()=>FormatShop(v.DesiredShopTypeTuple),t=>v.DesiredShopTypeTuple=ParseShop(t),"shop")with{Choices=choices});
        fields.Add(Text("Shop","L_ShopType",()=>FormatShop(v.ShopTypeTuple),t=>v.ShopTypeTuple=ParseShop(t),"shop")with{Choices=choices});
    }
}
internal static class Avenue5Editing
{
    private static SAV5B2W2 Save(SaveFile save)=>save as SAV5B2W2??throw new ArgumentException("Avenue5 tools require B2W2.");
    internal static IJoinAvenueEntity5 Entity(SAV5B2W2 s,string group,int index)
    {
        if(index<0)throw new ArgumentException("Invalid Avenue5 slot.");var a=s.JoinAvenue;
        return group switch{"visitors" when index<8=>a.GetVisitor(index),"fans" when index<12=>a.GetFan(index),"occupants" when index<8=>a.GetOccupant(index),"assistants" when index<4=>a.GetAssistant(index),"self" when index==0=>a.Self,_=>throw new ArgumentException("Invalid Avenue5 entity target.")};
    }
    internal static List<Avenue5Definition> Definitions(SAV5B2W2 s,string group,int index)
    {
        if(group=="settings"&&index==0)return Avenue5Fields.Settings(s);
        if(group=="avenue"&&index==0){var a=s.JoinAvenue;return[
            Avenue5Definition.Number("ScriptFlag","avenue",Avenue5Text.Get("SAV_JoinAvenue.CHK_ScriptFlag"),1,()=>a.ScriptFlag?1:0,v=>a.ScriptFlag=v==1,true),
            Avenue5Definition.Number("CountVisitor","avenue",Avenue5Text.Get("SAV_JoinAvenue.L_VisitorCount"),uint.MaxValue,()=>a.CountVisitor,v=>a.CountVisitor=(uint)v),
            Avenue5Definition.Number("CountFan","avenue",Avenue5Text.Get("SAV_JoinAvenue.L_FanCount"),uint.MaxValue,()=>a.CountFan,v=>a.CountFan=(uint)v)];}
        var entity=Entity(s,group,index);var fields=new List<Avenue5Definition>();Avenue5Fields.Common(entity,fields,s);Avenue5Fields.Specific(entity,fields,s);return fields;
    }
    internal static Avenue5Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var objects=new List<Avenue5Object>();
        foreach(var (group,count) in new[]{("avenue",1),("settings",1),("visitors",8),("fans",12),("occupants",8),("assistants",4),("self",1)})for(int i=0;i<count;i++){
            var defs=Definitions(s,group,i);var entity=group is "avenue" or "settings"?null:Entity(s,group,i);
            objects.Add(new(group,i,entity?.Name??group,group=="self"?null:entity?.FileExtension,entity is null?Convert.ToHexString(s.JoinAvenue.Data):Convert.ToHexString(entity.Write()),defs.Select(d=>d.Read()).ToArray()));
        }
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,objects.ToArray(),Convert.ToHexString(s.JoinAvenue.Data));
    }
    internal static byte[] Prepare(SaveFile save,Avenue5Edit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Avenue5 editing requires valid checksums.");
        if(e.SourceHash!=hash||e.SourceHash?.Length!=64)throw new ArgumentException("Avenue5 preview is stale. Read it again.");
        if(e.Index is null)throw new ArgumentException("Missing Avenue5 slot.");var copy=(SAV5B2W2)s.Clone();var defs=Definitions(copy,e.Group,e.Index.Value);
        switch(e.Action){
            case "patch":
                if(e.DataBase64 is not null||e.Fields is null||e.Fields.Length is 0||e.Fields.Length>defs.Count||e.Fields.Any(f=>f is null)||e.Fields.Select(f=>f.Id).Distinct().Count()!=e.Fields.Length)throw new ArgumentException("Invalid Avenue5 patch fields.");
                var edits=e.Fields.ToDictionary(f=>f.Id,f=>f.Value);if(edits.Keys.Any(k=>!defs.Any(d=>d.Id==k)))throw new ArgumentException("Unknown Avenue5 field.");
                foreach(var d in defs)if(edits.TryGetValue(d.Id,out var v))d.Validate(v);
                // Apply in source control save order, never in request order.
                foreach(var d in defs)if(edits.TryGetValue(d.Id,out var v))d.Set(v!);break;
            case "resave":
                if(e.DataBase64 is not null||e.Fields is not null)throw new ArgumentException("Invalid Avenue5 resave fields.");
                var values=defs.Select(d=>{string value=d.Get();if(d.Kind is "number" or "boolean"){long n=long.Parse(value,CultureInfo.InvariantCulture);if(d.Id=="Gender")n=Math.Min(2,n);else if(d.Choices is {} choices&&!choices.Any(c=>c.Id==n))n=-1;else n=Math.Clamp(n,0,d.Maximum);value=n.ToString(CultureInfo.InvariantCulture);}return value;}).ToArray();
                for(int i=0;i<defs.Count;i++)defs[i].Set(values[i]);break;
            case "import":
                if(e.Fields is not null||e.Group=="self"||e.DataBase64 is null||e.DataBase64.Length>264)throw new ArgumentException("Invalid Avenue5 import fields.");
                byte[] data;try{data=Convert.FromBase64String(e.DataBase64);}catch(FormatException){throw new ArgumentException("Invalid Avenue5 import data.");}
                IJoinAvenueEntity5 source=data.Length switch{JoinAvenueVisitor5.SIZE=>new JoinAvenueVisitor5(data),JoinAvenueFan5.SIZE=>new JoinAvenueFan5(data),JoinAvenueAssistant5.SIZE=>new JoinAvenueAssistant5(data),_=>throw new ArgumentException("Invalid Avenue5 entity size.")};Entity(copy,e.Group,e.Index.Value).CopyFrom(source);break;
            default:throw new ArgumentException("Invalid Avenue5 action.");
        }
        var expected=copy.JoinAvenue.Data.ToArray();var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray())as SAV5B2W2;
        if(check is null||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!check.JoinAvenue.Data.SequenceEqual(expected))throw new InvalidOperationException("Avenue5 export verification failed.");
        if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Avenue5 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Avenue5Edit ParseAvenue5(string json)=>json.Length>300000?throw new ArgumentException("Avenue5 request is too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Avenue5Edit)??throw new ArgumentException("Missing Avenue5 edit.");
    public static string ReadAvenue5(byte[] data)=>JsonSerializer.Serialize(Avenue5Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Avenue5Catalog);
    public static string PreviewAvenue5(byte[] data,string json){var e=ParseAvenue5(json);var output=Avenue5Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Avenue5Preview(e with{TargetHash=hash},Avenue5Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Avenue5Preview);}
    public static byte[] EditAvenue5(byte[] data,string json){var e=ParseAvenue5(json);if(e.TargetHash?.Length!=64)throw new ArgumentException("Avenue5 editing requires a frozen preview.");return Avenue5Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
    public static byte[] ExportAvenue5(byte[] data,string json){var e=ParseAvenue5(json);if(e.Action!="export"||e.Index is null||e.Fields is not null||e.DataBase64 is not null||e.TargetHash is not null||e.Group=="self")throw new ArgumentException("Invalid Avenue5 export fields.");var hash=Br4Editing.Hash(data);if(e.SourceHash!=hash)throw new ArgumentException("Avenue5 export is stale.");var save=Open(data)as SAV5B2W2??throw new ArgumentException("Avenue5 requires B2W2.");return Avenue5Editing.Entity(save,e.Group,e.Index.Value).Write().ToArray();}
}
