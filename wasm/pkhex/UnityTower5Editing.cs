// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Tower5Point(int Id,int Country,int Region,int Point,bool Owned,LocalizedText CountryName,LocalizedText RegionName);
public sealed record Tower5Floor(int Country,LocalizedText Name,bool Legal,bool Unlocked);
public sealed record Tower5Catalog(bool CanEdit,string SourceHash,int Country,int Region,bool OwnSafe,bool OwnListed,
    bool Global,int RawGlobal,bool Unlocked,int RawUnlocked,Tower5Point[] Points,Tower5Floor[] Floors,string RawHex);
public sealed record Tower5PointEdit(int? Id,int? Point);
public sealed record Tower5FloorEdit(int? Country,bool? Unlocked);
public sealed record Tower5Edit(string Action,string? SourceHash,Tower5PointEdit[]? Points=null,
    Tower5FloorEdit[]? Floors=null,bool? Global=null,bool? Unlocked=null,string? TargetHash=null);
public sealed record Tower5Preview(Tower5Edit Request,Tower5Catalog Result,int[] ChangedOffsets);
internal static class UnityTower5Editing
{
    private static SAV5 Save(SaveFile save)=>save is SAV5BW or SAV5B2W2?(SAV5)save:throw new ArgumentException("UnityTower5 tools are unavailable for this format.");
    internal static IEnumerable<(int Country,int Region)> Coordinates(){foreach(var c in GeographicCatalog.Gen5Countries.Value.Where(c=>c.Id is >0 and <=LocaleNDS5.CountryCount).OrderBy(c=>c.Id)){int count=UnityTower5.GetSubregionCount((byte)c.Id);var regions=GeographicCatalog.Gen5Regions.Value.Single(r=>r.Country==c.Id).Choices;foreach(var r in regions.Where(r=>count==0?r.Id==0:r.Id>0&&r.Id<=count).OrderBy(r=>r.Id))yield return(c.Id,r.Id);}}
    private static int Id(int country,int region)=>(country-1)*64+region;
    internal static bool OwnSafe(SAV5 s)=>s.Country==0||(s.Country is >=1 and <=255&&s.Region is >=0 and <64);
    internal static Tower5Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var b=s.UnityTower;var countries=GeographicCatalog.Gen5Countries.Value.ToDictionary(c=>c.Id,c=>c.Name);var regions=GeographicCatalog.Gen5Regions.Value.ToDictionary(r=>r.Country,r=>r.Choices.ToDictionary(v=>v.Id,v=>v.Name));var legal=LocaleNDS5.LegalCountries.ToArray().ToHashSet();var pairs=Coordinates().ToArray();
        var points=pairs.Select(p=>new Tower5Point(Id(p.Country,p.Region),p.Country,p.Region,(int)b.GetCountrySubregion((byte)p.Country,(byte)p.Region),s.Country==p.Country&&s.Region==p.Region,countries[p.Country],regions[p.Country][p.Region])).ToArray();
        var floors=countries.Where(c=>c.Key is >0 and <=LocaleNDS5.CountryCount).OrderBy(c=>c.Key).Select(c=>new Tower5Floor(c.Key,c.Value,legal.Contains((byte)c.Key),b.GetUnityTowerFloor((byte)c.Key))).ToArray();
        bool safe=OwnSafe(s);return new(s.State.Exportable&&SaveChecksums.Valid(s)&&safe,hash,s.Country,s.Region,safe,s.Country==0||points.Any(p=>p.Owned),b.GlobalFlag,b.Data[0x344],b.UnityTowerFlag,b.Data[0x345],points,floors,Convert.ToHexString(b.Data));
    }
    internal static byte[] Prepare(SaveFile save,Tower5Edit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("UnityTower5 editing requires valid checksums.");if(!OwnSafe(s))throw new ArgumentException("UnityTower5 registered location is outside its physical country slot.");
        if(e.SourceHash!=hash||e.SourceHash?.Length!=64)throw new ArgumentException("UnityTower5 preview is stale. Read it again.");var copy=(SAV5)s.Clone();var b=copy.UnityTower;
        if(e.Action=="patch"){
            if(e.Points is null&&e.Floors is null&&e.Global is null&&e.Unlocked is null)throw new ArgumentException("Empty UnityTower5 patch.");
            if(e.Points is {} points){var allowed=Coordinates().Select(p=>Id(p.Country,p.Region)).ToHashSet();if(points.Length is 0||points.Length>allowed.Count||points.Any(p=>p is null||p.Id is null||!allowed.Contains(p.Id.Value)||p.Point is null or <0 or >3)||points.Select(p=>p.Id).Distinct().Count()!=points.Length)throw new ArgumentException("Invalid UnityTower5 point fields.");foreach(var p in points){int id=p.Id!.Value;b.SetCountrySubregion((byte)(id/64+1),(byte)(id%64),(GeonetPoint)p.Point!.Value);}}
            if(e.Floors is {} floors){if(floors.Length is 0 or >232||floors.Any(f=>f is null||f.Country is null or <1 or >232||f.Unlocked is null)||floors.Select(f=>f.Country).Distinct().Count()!=floors.Length)throw new ArgumentException("Invalid UnityTower5 floor fields.");foreach(var f in floors)b.SetUnityTowerFloor((byte)f.Country!.Value,f.Unlocked!.Value);}
            if(e.Global is {} global)b.GlobalFlag=global;if(e.Unlocked is {} unlocked)b.UnityTowerFlag=unlocked;
            b.SetSAVCountry();
        }else{
            if(e.Points is not null||e.Floors is not null||e.Global is not null||e.Unlocked is not null)throw new ArgumentException("Invalid UnityTower5 batch fields.");
            switch(e.Action){case "all":b.SetAll();break;case "legal":b.SetAllLegal();break;case "clear":b.ClearAll();break;
                case "resave":var points=Coordinates().Select(p=>(p.Country,p.Region,Point:b.GetCountrySubregion((byte)p.Country,(byte)p.Region))).ToArray();var floors=Enumerable.Range(1,232).Select(c=>(Country:c,Unlocked:b.GetUnityTowerFloor((byte)c))).ToArray();bool global=b.GlobalFlag,unlocked=b.UnityTowerFlag;b.ClearAll();foreach(var p in points)b.SetCountrySubregion((byte)p.Country,(byte)p.Region,p.Point);foreach(var f in floors)b.SetUnityTowerFloor((byte)f.Country,f.Unlocked);b.SetSAVCountry();b.GlobalFlag=global;b.UnityTowerFlag=unlocked;break;
                default:throw new ArgumentException("Invalid UnityTower5 action.");}
        }
        var expected=b.Data.ToArray();var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray())as SAV5;
        if(check is null||check.GetType()!=copy.GetType()||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!check.UnityTower.Data.SequenceEqual(expected))throw new InvalidOperationException("UnityTower5 export verification failed.");
        if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("UnityTower5 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Tower5Edit ParseUnityTower5(string json)=>json.Length>150000?throw new ArgumentException("UnityTower5 request is too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Tower5Edit)??throw new ArgumentException("Missing UnityTower5 edit.");
    public static string ReadUnityTower5(byte[] data)=>JsonSerializer.Serialize(UnityTower5Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Tower5Catalog);
    public static string PreviewUnityTower5(byte[] data,string json){var e=ParseUnityTower5(json);var output=UnityTower5Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Tower5Preview(e with{TargetHash=hash},UnityTower5Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Tower5Preview);}
    public static byte[] EditUnityTower5(byte[] data,string json){var e=ParseUnityTower5(json);if(e.TargetHash?.Length!=64)throw new ArgumentException("UnityTower5 editing requires a frozen preview.");return UnityTower5Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
}
