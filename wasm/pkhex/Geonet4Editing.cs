// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Geo4Row(int Id,int Country,int Region,bool Legal,bool Owned,int Point,LocalizedText CountryName,LocalizedText RegionName);
public sealed record Geo4Point(int? Id,int? Point);
public sealed record Geo4Plan(string Action,int[] Counts,int[] Changed,bool Global,string TargetHex);
public sealed record Geo4Catalog(bool CanEdit,string SourceHash,int Country,int Region,bool OwnValid,bool Global,int RawGlobal,Geo4Row[] Rows,Geo4Plan[] Plans);
public sealed record Geo4Edit(string Action,string? SourceHash,Geo4Point[]? Points=null,bool? Global=null);
internal static class Geonet4Editing
{
    private const int Size=3+LocaleNDS4.CountryCount*16;
    private static SAV4 Save(SaveFile save)=>save is SAV4DP or SAV4Pt or SAV4HGSS?(SAV4)save:throw new ArgumentException("Geonet4 tools are unavailable for this format.");
    private static bool OwnValid(SAV4 s)=>s.Country==0||(s.Country is >=1 and <=LocaleNDS4.CountryCount&&s.Region is >=0 and <64);
    private static int Address(int country,int region)=>(country-1)*64+region;
    private static IEnumerable<(int Country,int Region)> Coordinates(){for(int country=1;country<=LocaleNDS4.CountryCount;country++){int count=LocaleNDS4.GetSubregionCount((byte)country);if(count==0)yield return(country,0);else for(int region=1;region<=count;region++)yield return(country,region);}}
    private static int Get(SAV4 s,int id){int country=id/64,region=id%64,at=s.Geonet+3+country*16+region/4;return(s.General[at]>>(2*(region%4)))&3;}
    private static Geo4Row[] Rows(SAV4 s)
    {
        var countries=GeographicCatalog.Gen4Countries.Value.ToDictionary(v=>v.Id,v=>v.Name);var regions=GeographicCatalog.Gen4Regions.Value.ToDictionary(v=>v.Country,v=>v.Choices.ToDictionary(r=>r.Id,r=>r.Name));var legal=LocaleNDS4.LegalCountries.ToArray().Select(v=>(int)v).ToHashSet();return Coordinates().Select(v=>new Geo4Row(Address(v.Country,v.Region),v.Country,v.Region,legal.Contains(v.Country),s.Country==v.Country&&s.Region==v.Region,Get(s,Address(v.Country,v.Region)),countries[v.Country],regions[v.Country][v.Region])).ToArray();
    }
    private static SAV4 Batch(SAV4 s,string action){var copy=(SAV4)s.Clone();var geo=new Geonet4(copy);switch(action){case "all":geo.SetAll();break;case "legal":geo.SetAllLegal();break;case "clear":geo.ClearAll();break;case "save":geo.SetSAVCountry();break;default:throw new ArgumentException("Invalid Geonet4 batch action.");}geo.Save();return copy;}
    internal static Geo4Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var rows=Rows(s);var plans=new List<Geo4Plan>();bool valid=OwnValid(s);if(valid)foreach(string action in new[]{"all","legal","clear","save"}){var target=Batch(s,action);var targetRows=Rows(target);plans.Add(new(action,Enumerable.Range(0,4).Select(p=>targetRows.Count(v=>v.Point==p)).ToArray(),Enumerable.Range(0,LocaleNDS4.CountryCount*64).Where(id=>Get(s,id)!=Get(target,id)).ToArray(),target.GeonetGlobalFlag,Convert.ToHexString(Snapshot(target))));}return new(s.State.Exportable&&SaveChecksums.Valid(s)&&valid,hash,s.Country,s.Region,valid,s.GeonetGlobalFlag,s.General[s.Geonet],rows,plans.ToArray());
    }
    internal static void Apply(SaveFile save,Geo4Edit edit,string hash)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Geonet4 editing requires valid checksums.");if(!OwnValid(s))throw new ArgumentException("Geonet4 registered location is outside the stored map.");if(edit.SourceHash!=hash||edit.SourceHash?.Length!=64)throw new ArgumentException("Geonet4 preview is stale. Read it again.");SAV4 copy;
        if(edit.Action=="points"&&edit.Global is null&&edit.Points is {} points)
        {
            var allowed=Coordinates().Select(v=>Address(v.Country,v.Region)).ToHashSet();if(points.Length==0||points.Length>allowed.Count||points.Any(v=>v is null||v.Id is null||!allowed.Contains(v.Id.Value)||v.Point is null or <0 or >3)||points.Select(v=>v.Id).Distinct().Count()!=points.Length)throw new ArgumentException("Invalid Geonet4 point fields.");copy=(SAV4)s.Clone();byte original=copy.General[copy.Geonet];var geo=new Geonet4(copy);foreach(var point in points){int id=point.Id!.Value;geo.SetCountrySubregion((byte)(id/64+1),(byte)(id%64),(GeonetPoint)point.Point!.Value);}geo.SetSAVCountry();geo.Save();copy.General[copy.Geonet]=original;
        }
        else if(edit.Action=="global"&&edit.Points is null&&edit.Global is {} global){copy=(SAV4)s.Clone();var geo=new Geonet4(copy);geo.SetSAVCountry();geo.Save();copy.GeonetGlobalFlag=global;}
        else if(edit.Action is "all" or "legal" or "clear" or "save"&&edit.Points is null&&edit.Global is null)copy=Batch(s,edit.Action);
        else throw new ArgumentException("Invalid Geonet4 action or mixed fields.");copy.General.Slice(copy.Geonet,Size).CopyTo(s.General.Slice(s.Geonet,Size));s.State.Edited=true;
    }
    internal static byte[] Snapshot(SaveFile save){var s=Save(save);return s.General.Slice(s.Geonet,Size).ToArray();}
}
public static partial class SaveService
{
    public static string ReadGeonet4(byte[] data)=>JsonSerializer.Serialize(Geonet4Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Geo4Catalog);
    public static byte[] EditGeonet4(byte[] data,string json){if(json.Length>131072)throw new ArgumentException("Geonet4 request is too large.");var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Geo4Edit)??throw new ArgumentException("Missing Geonet4 edit.");var s=Open(data);Geonet4Editing.Apply(s,edit,Br4Editing.Hash(data));var expected=Geonet4Editing.Snapshot(s);var output=s.Write().ToArray();var check=Open(output);if(output.Length!=data.Length||check.GetType()!=s.GetType()||check.Version!=s.Version||!SaveChecksums.Valid(check)||!expected.SequenceEqual(Geonet4Editing.Snapshot(check)))throw new InvalidOperationException("Geonet4 export verification failed.");return output;}
}
