// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Misc4Row(string Key,string Group,LocalizedText Name,long Value,long Minimum,long Maximum,int Width,bool Writable,OriginChoice[]? Choices=null,long? StoreMaximum=null);
public sealed record Misc4Group(string Id,LocalizedText Name);
public sealed record Misc4Catalog(bool CanEdit,string SourceHash,Misc4Group[] Groups,Misc4Row[] Rows,int[]? Backdrops,OriginChoice[] BackdropChoices,int[]? Pixels,bool HallAvailable);
public sealed record Misc4Value(string? Key,long? Value);
public sealed record Misc4Edit(string Action,string? SourceHash,Misc4Value[]? Values=null,string? Group=null,int[]? Backdrops=null,int? Pixel=null,int[]? Rgb=null,int? ImageSize=null,string? TargetHash=null);
public sealed record Misc4Delta(string Region,int Offset,string Before,string After);
public sealed record Misc4Preview(Misc4Edit Request,Misc4Row[] Changed,Misc4Delta[] Data,int[]? Backdrops,int[]? Pixels);
internal sealed record Misc4Def(Misc4Row Row,Action<SAV4,long> Set);
internal static partial class Misc4Editing
{
    internal static SAV4 Save(SaveFile s)=>s is SAV4DP or SAV4Pt or SAV4HGSS?(SAV4)s:throw new ArgumentException("Misc4 tools are unavailable for this format.");
    internal static LocalizedText Text(string zh,string en,string ja)=>new(zh,en,ja);
    internal static LocalizedText Resource(Func<GameStrings,string[]> list,int id)=>new(list(GameInfo.GetStrings("zh-Hans"))[id],list(GameInfo.GetStrings("en"))[id],list(GameInfo.GetStrings("ja"))[id]);
    private static OriginChoice[] Choices(Func<GameStrings,string[]> list,int count)=>Enumerable.Range(0,count).Select(id=>new OriginChoice(id,Resource(list,id))).ToArray();
    private static readonly int[] FlySinnoh=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,67,68];
    private static readonly int[] LocSinnoh=[1,2,3,4,5,82,83,6,7,8,9,10,11,12,13,14,54,81,55,15];
    private static readonly int[] FlyJohto=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,27,30,33,35];
    private static readonly int[] LocJohto=[138,139,140,141,142,143,144,145,146,147,148,126,127,128,129,130,131,132,133,134,135,136,137,229,227,221,225];
    internal static void Add(List<Misc4Def> defs,string key,string group,LocalizedText name,long value,long maximum,Action<SAV4,long> set,long minimum=0,bool writable=true,OriginChoice[]? choices=null,long? storeMaximum=null)=>defs.Add(new(new(key,group,name,value,minimum,maximum,Math.Max(minimum.ToString().Length,maximum.ToString().Length),writable,choices,storeMaximum),set));
    private static List<Misc4Def> Definitions(SAV4 s)
    {
        var d=new List<Misc4Def>();Add(d,"coins","general",Text("代币","Coins","コイン"),s.Coin,s.MaxCoins,(x,v)=>x.Coin=(uint)v);Add(d,"bp","general",Text("对战点数","Battle Points","バトルポイント"),s.BP,9999,(x,v)=>x.BP=(ushort)v);
        var flags=s is SAV4Sinnoh?FlySinnoh:FlyJohto;var locations=s is SAV4Sinnoh?LocSinnoh:LocJohto;
        for(int i=0;i<flags.Length;i++){int flag=2480+flags[i],loc=locations[i];Add(d,$"fly.{flag}","fly",Resource(t=>t.Gen4.Met0,loc),s.GetEventFlag(flag)?1:0,1,(x,v)=>x.SetEventFlag(flag,v!=0));}
        if(s is SAV4Sinnoh sn)
        {
            Add(d,"ugFlags","general",Text("已获得旗标","Flags captured","獲得した旗"),sn.UG_FlagsCaptured,SAV4Sinnoh.UG_MAX,(x,v)=>((SAV4Sinnoh)x).UG_FlagsCaptured=(uint)v);
            var apps=Choices(t=>t.poketchapps,(int)PoketchApp.Alarm_Clock+1);OriginChoice[] appChoices=[new(-1,Text("未选择","None selected","未選択")),..apps];Add(d,"app","poketch",Text("当前应用","Current app","現在のアプリ"),sn.CurrentPoketchApp,(int)PoketchApp.Alarm_Clock,(x,v)=>((SAV4Sinnoh)x).CurrentPoketchApp=(sbyte)v,-1,choices:appChoices);
            Add(d,"appCount","poketch",Text("已解锁数量","Unlocked count","解放済みの数"),sn.PoketchUnlockedCount,apps.Length,(_,_)=>{},writable:false);
            foreach(var app in apps){int id=app.Id;Add(d,$"app.{id}","poketch",app.Name,sn.GetPoketchAppUnlocked((PoketchApp)id)?1:0,1,(x,v)=>{var t=(SAV4Sinnoh)x;t.SetPoketchAppUnlocked((PoketchApp)id,v!=0);t.PoketchUnlockedCount=(byte)Enumerable.Range(0,apps.Length).Count(a=>t.GetPoketchAppUnlocked((PoketchApp)a));});}
        }
        else if(s is SAV4HGSS hg)
        {
            OriginChoice[] maps=[new(0,Text("城都地图","Map Johto","ジョウトの地図")),new(1,Text("扩展城都地图","Map Johto+","ジョウトの地図＋")),new(2,Text("城都与关都地图","Map Johto & Kanto","ジョウトとカントーの地図"))];Add(d,"map","general",Text("当前地图","Current map","現在の地図"),(int)hg.MapUnlockState,2,(x,v)=>((SAV4HGSS)x).MapUnlockState=(MapUnlockState4)v,choices:maps);
            Add(d,"athPoints","general",Text("全能竞技赛点数","Pokeathlon Points","ポケスロンポイント"),hg.Pokeathlon.Points,9999999,(x,v)=>((SAV4HGSS)x).Pokeathlon.Points=(uint)v,storeMaximum:99999);
            Add(d,"watts","walker",Text("瓦特","Watts","ワット"),hg.PokewalkerWatts,9999999,(x,v)=>((SAV4HGSS)x).PokewalkerWatts=(uint)v);Add(d,"steps","walker",Text("步数","Steps","歩数"),hg.PokewalkerSteps,9999999,(x,v)=>((SAV4HGSS)x).PokewalkerSteps=(uint)v);
            bool[] courses=new bool[32];hg.GetPokewalkerCoursesUnlocked(courses);int count=GameInfo.GetStrings("en").walkercourses.Length;for(int i=0;i<count;i++){int id=i;Add(d,$"course.{id}","walker",Resource(t=>t.walkercourses,id),courses[id]?1:0,1,(x,v)=>{var t=(SAV4HGSS)x;bool[] b=new bool[32];t.GetPokewalkerCoursesUnlocked(b);b[id]=v!=0;t.SetPokewalkerCoursesUnlocked(b);});}
        }
        for(int i=0;i<(int)Seal4.MAX;i++){int id=i;Add(d,$"seal.{id}","seals",Resource(t=>t.seals,id),s.GetSealCount((Seal4)id),99,(x,v)=>x.SetSealCount((Seal4)id,(byte)v));}
        for(int i=0;i<AccessoryInfo.Count;i++){int id=i;Add(d,$"accessory.{id}","accessories",Resource(t=>t.accessories,id),s.GetAccessoryOwnedCount((Accessory4)id),9,(x,v)=>x.SetAccessoryOwnedCount((Accessory4)id,(byte)v),storeMaximum:id<=AccessoryInfo.MaxMulti?9:1);}
        var record=((SAV4)s.Clone()).Records;for(int i=0;i<record.Record32;i++){int id=i;Add(d,$"r32.{id}","records32",Text($"记录 {id}",$"Record {id}",$"記録 {id}"),record.GetRecord32(id),uint.MaxValue,(x,v)=>{var r=x.Records;r.SetRecord32(id,(uint)v);r.EndAccess();},storeMaximum:record.GetMax32(id));}for(int i=0;i<Record4.Record16;i++){int id=i;Add(d,$"r16.{id}","records16",Text($"记录 {id}",$"Record {id}",$"記録 {id}"),record.GetRecord16(id),ushort.MaxValue,(x,v)=>{var r=x.Records;r.SetRecord16(id,(ushort)v);r.EndAccess();},storeMaximum:record.GetMax16(id));}
        AddFrontier(s,d);return d;
    }
    private static int[] BackdropRows(SAV4 s){int[] rows=Enumerable.Repeat((int)Backdrop4.Unset,BackdropInfo.Count).ToArray();for(int id=0;id<BackdropInfo.Count;id++){int pos=s.GetBackdropPosition((Backdrop4)id);if(pos<rows.Length)rows[pos]=id;}return rows;}
    private static void SetBackdrops(SAV4 s,int[] rows){for(int id=0;id<BackdropInfo.Count;id++)s.RemoveBackdrop((Backdrop4)id);byte position=0;foreach(int id in rows){if(id>=BackdropInfo.Count)continue;s.SetBackdropPosition((Backdrop4)id,position++);}}
    private static int[]? Pixels(SAV4 s){if(s is not SAV4Sinnoh sn)return null;var data=sn.GetPoketchDotArtistData();return Enumerable.Range(0,480).Select(i=>(int)(data[i/4]>>(2*(i%4))&3)).ToArray();}
    private static Misc4Group Group(string id)=>id switch{"general"=>new(id,Text("常规","General","基本")),"fly"=>new(id,Text("飞翔目的地","Fly destinations","そらをとぶ場所")),"poketch"=>new(id,Text("宝可表","Poketch","ポケッチ")),"walker"=>new(id,Text("宝可计步器","Pokewalker","ポケウォーカー")),"seals"=>new(id,Text("贴纸","Seals","シール")),"accessories"=>new(id,Text("饰品","Accessories","アクセサリー")),"backdrops"=>new(id,Text("背景","Backdrops","背景")),"records32"=>new(id,Text("32 位记录","32-bit records","32ビット記録")),"records16"=>new(id,Text("16 位记录","16-bit records","16ビット記録")),_=>FrontierGroup(id)};
    internal static Misc4Catalog Read(SaveFile save,string hash){var s=Save(save);var rows=Definitions(s).Select(v=>v.Row).ToArray();var groups=rows.Select(v=>v.Group).Distinct().Select(Group).ToList();groups.Add(Group("backdrops"));return new(s.State.Exportable&&s.Data.Length>=0x80000&&SaveChecksums.Valid(s),hash,groups.ToArray(),rows,BackdropRows(s),Choices(t=>t.backdrops,BackdropInfo.Count+1),Pixels(s),Hall(s) is {IsValid:true});}
    internal static SAV4 Prepare(SaveFile save,Misc4Edit edit,string hash)
    {
        var s=Save(save);if(!s.State.Exportable||s.Data.Length<0x80000||!SaveChecksums.Valid(s))throw new ArgumentException("Misc4 editing requires valid checksums.");if(edit.SourceHash!=hash||edit.SourceHash?.Length!=64)throw new ArgumentException("Misc4 preview is stale. Read it again.");var defs=Definitions(s).ToDictionary(v=>v.Row.Key);bool numbers=edit.Values is not null,backdrops=edit.Backdrops is not null,pixel=edit.Pixel is not null,rgb=edit.Rgb is not null,group=edit.Group is not null;var copy=(SAV4)s.Clone();
        switch(edit.Action)
        {
            case "numbers":
                if(!numbers||backdrops||pixel||rgb||group||edit.ImageSize is not null||edit.Values!.Length is 0 or >4096||edit.Values.Any(v=>v is null||v.Key is null||!defs.TryGetValue(v.Key,out var d)||!d.Row.Writable||v.Value is null||v.Value<d.Row.Minimum||v.Value>d.Row.Maximum||d.Row.Choices is {} choices&&!choices.Any(c=>c.Id==v.Value))||edit.Values.Select(v=>v.Key).Distinct().Count()!=edit.Values.Length)throw new ArgumentException("Invalid Misc4 numeric fields.");
                foreach(var value in edit.Values)defs[value.Key!].Set(copy,value.Value!.Value);break;
            case "backdrops":
                if(numbers||!backdrops||pixel||rgb||group||edit.ImageSize is not null||edit.Backdrops!.Length!=BackdropInfo.Count||edit.Backdrops.Any(v=>v<0||v>(int)Backdrop4.Unset))throw new ArgumentException("Invalid Misc4 backdrop fields.");SetBackdrops(copy,edit.Backdrops);break;
            case "all":case "legal":case "clear":case "resave":
                if(numbers||backdrops||pixel||rgb||!group||edit.ImageSize is not null)throw new ArgumentException("Invalid Misc4 bulk fields.");Bulk(copy,edit.Action,edit.Group!);break;
            case "dotCycle":
                if(s is not SAV4Sinnoh||numbers||backdrops||!pixel||rgb||group||edit.ImageSize is not null||edit.Pixel is <0 or >=480)throw new ArgumentException("Invalid Misc4 dot fields.");var sn=(SAV4Sinnoh)copy;var raw=sn.GetPoketchDotArtistData();int id=edit.Pixel!.Value,shift=2*(id%4);int next=((raw[id/4]>>shift&3)+1)%4;raw[id/4]=(byte)((raw[id/4]&~(3<<shift))|(next<<shift));sn.SetPoketchDotArtistData(raw);break;
            case "dotImport":
                if(s is not SAV4Sinnoh||numbers||backdrops||pixel||!rgb||group||edit.ImageSize is null or <1 or >0x80A||edit.Rgb!.Length!=1440||edit.Rgb.Any(v=>v<0||v>255))throw new ArgumentException("Invalid Misc4 image fields.");var sinnoh=(SAV4Sinnoh)copy;var destination=sinnoh.GetPoketchDotArtistData();Misc4DotImage.Build(edit.Rgb,destination);sinnoh.SetPoketchDotArtistData(destination);break;
            default:throw new ArgumentException("Invalid Misc4 action.");
        }
        copy.State.Edited=true;if(edit.TargetHash is {} target&&target!=Br4Editing.Hash(Snapshot(copy)))throw new ArgumentException("Misc4 preview target is stale.");return copy;
    }
    private static void Bulk(SAV4 s,string action,string group)
    {
        switch(group)
        {
            case "fly" when action=="all":foreach(int flag in s is SAV4Sinnoh?FlySinnoh:FlyJohto)s.SetEventFlag(2480+flag,true);break;
            case "poketch" when s is SAV4Sinnoh sn&&action is "all" or "resave":if(sn.CurrentPoketchApp is <-1 or >(sbyte)PoketchApp.Alarm_Clock)throw new ArgumentException("Invalid Misc4 current app for resave.");for(int id=0;id<=(int)PoketchApp.Alarm_Clock;id++)sn.SetPoketchAppUnlocked((PoketchApp)id,action=="all"||sn.GetPoketchAppUnlocked((PoketchApp)id));sn.PoketchUnlockedCount=(byte)Enumerable.Range(0,(int)PoketchApp.Alarm_Clock+1).Count(id=>sn.GetPoketchAppUnlocked((PoketchApp)id));break;
            case "walker" when s is SAV4HGSS hg&&action=="all":hg.PokewalkerCoursesUnlockAll();break;
            case "seals" when action is "clear" or "all" or "legal":for(int id=0;id<(action=="legal"?(int)Seal4.MAXLEGAL:(int)Seal4.MAX);id++)s.SetSealCount((Seal4)id,action=="clear"?(byte)0:SAV4.SealMaxCount);break;
            case "accessories" when action is "clear" or "all" or "legal":for(int id=0;id<(action=="legal"?AccessoryInfo.MaxLegal+1:AccessoryInfo.Count);id++)s.SetAccessoryOwnedCount((Accessory4)id,action=="clear"?(byte)0:(byte)(id<=AccessoryInfo.MaxMulti?9:1));break;
            case "backdrops" when action is "clear" or "all" or "legal" or "resave":var rows=BackdropRows(s);if(action=="clear")Array.Fill(rows,(int)Backdrop4.Unset);else if(action!="resave")for(int id=0;id<(action=="legal"?(int)BackdropInfo.MaxLegal+1:BackdropInfo.Count);id++)rows[id]=id;SetBackdrops(s,rows);break;
            case "records" when action=="resave":var records=s.Records;records.GetRecord32(0);records.EndAccess();break;
            default:throw new ArgumentException("Invalid Misc4 bulk group.");
        }
    }
    private static IEnumerable<(string Region,byte[] Data)> Regions(SAV4 s){yield return("general",s.General[..^(s is SAV4Sinnoh?0x14:0x10)].ToArray());yield return("extra0",s.Data.Slice(0x20000,0x20000).ToArray());if(s.Data.Length>=0x80000)yield return("extra1",s.Data.Slice(0x60000,0x20000).ToArray());}
    internal static byte[] Snapshot(SAV4 s)=>Regions(s).SelectMany(v=>v.Data).ToArray();
    internal static Misc4Preview Preview(SaveFile save,Misc4Edit edit,string hash)
    {
        var s=Save(save);var target=Prepare(s,edit,hash);var before=Read(s,hash);var after=Read(target,hash);var old=before.Rows.ToDictionary(v=>v.Key);var deltas=new List<Misc4Delta>();var targets=Regions(target).ToDictionary(v=>v.Region,v=>v.Data);foreach(var region in Regions(s)){var b=region.Data;var a=targets[region.Region];for(int i=0;i<b.Length;){if(b[i]==a[i]){i++;continue;}int start=i;while(i<b.Length&&b[i]!=a[i]&&i-start<32)i++;deltas.Add(new(region.Region,start,Convert.ToHexString(b.AsSpan(start,i-start)),Convert.ToHexString(a.AsSpan(start,i-start))));}}
        return new(edit with {TargetHash=Br4Editing.Hash(Snapshot(target))},after.Rows.Where(v=>v.Value!=old[v.Key].Value||(edit.Values?.Any(n=>n.Key==v.Key&&n.Value!=v.Value)??false)).ToArray(),deltas.ToArray(),after.Backdrops,after.Pixels);
    }
}
public static partial class SaveService
{
    private static Misc4Edit ParseMisc4(string json){if(json.Length>131072)throw new ArgumentException("Misc4 request is too large.");return JsonSerializer.Deserialize(json,SaveJsonContext.Default.Misc4Edit)??throw new ArgumentException("Missing Misc4 edit.");}
    public static string ReadMisc4(byte[] data)=>JsonSerializer.Serialize(Misc4Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Misc4Catalog);
    public static string PreviewMisc4(byte[] data,string json)=>JsonSerializer.Serialize(Misc4Editing.Preview(Open(data),ParseMisc4(json),Br4Editing.Hash(data)),SaveJsonContext.Default.Misc4Preview);
    public static byte[] EditMisc4(byte[] data,string json){var edit=ParseMisc4(json);if(edit.TargetHash?.Length!=64)throw new ArgumentException("Misc4 editing requires a frozen preview.");var target=Misc4Editing.Prepare(Open(data),edit,Br4Editing.Hash(data));var expected=Misc4Editing.Snapshot(target);var output=target.Write().ToArray();var check=Misc4Editing.Save(Open(output));if(output.Length!=data.Length||check.GetType()!=target.GetType()||check.Version!=target.Version||!SaveChecksums.Valid(check)||!expected.SequenceEqual(Misc4Editing.Snapshot(check)))throw new InvalidOperationException("Misc4 export verification failed.");return output;}
}
