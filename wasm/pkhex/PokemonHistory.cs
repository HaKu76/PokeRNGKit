// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record GeoValue(int Index, int Country, int Region);
public sealed record GeoEntry(int Index, int Country, int Region, bool CanEdit);
public sealed record GeoRegions(int Country, OriginChoice[] Choices);
public sealed record GeoCatalog(GeoEntry[] Entries, OriginChoice[] Countries, GeoRegions[] Regions);
public sealed record HolderState(int Current, string Original, string Handling);
public sealed record HistoryCatalog(HolderState Holder, GeoCatalog? Geo);
public sealed record HistoryEdit(int? Handler = null, GeoValue[]? Locations = null);

internal static class GeographicCatalog
{
    private static OriginChoice[] Choices(string resource)
    {
        var lists = new[] { "zh-Hans", "en", "ja" }.Select(l => Util.GetCountryRegionList(resource, l).ToDictionary(c => c.Value, c => c.Text)).ToArray();
        return lists[0].Keys.Select(id => new OriginChoice(id, new(lists[0][id], lists[1][id], lists[2][id]))).ToArray();
    }
    internal static readonly Lazy<OriginChoice[]> Countries = new(() => Choices("countries"));
    internal static readonly Lazy<TrainerGeoOrder[]> Gen6Orders=new(()=>new[]{("zh","zh-Hans"),("en","en"),("ja","ja")}.Select(l=>new TrainerGeoOrder(l.Item1,Util.GetCountryRegionList("countries",l.Item2).Select(v=>v.Value).ToArray(),Countries.Value.Select(c=>new TrainerGeoRegionOrder(c.Id,c.Id==0?[]:Util.GetCountryRegionList($"sr_{c.Id:000}",l.Item2).Select(v=>v.Value).ToArray())).ToArray())).ToArray());
    internal static readonly Lazy<GeoRegions[]> Regions = new(() => Countries.Value.Select(c => new GeoRegions(c.Id, c.Id == 0 ? [new(0, new("—", "—", "—"))] : Choices($"sr_{c.Id:000}"))).ToArray());
    internal static readonly Lazy<OriginChoice[]> Gen4Countries = new(() => Choices("gen4_countries"));
    internal static readonly Lazy<OriginChoice[]> Gen5Countries = new(() => Choices("gen5_countries"));
    internal static readonly Lazy<GeoRegions[]> Gen4Regions = new(() => NdsRegions(4, Gen4Countries.Value));
    internal static readonly Lazy<GeoRegions[]> Gen5Regions = new(() => NdsRegions(5, Gen5Countries.Value));
    private static GeoRegions[] NdsRegions(int generation, OriginChoice[] countries) => countries.Select(country =>
    {
        var choices = Choices($"gen{generation}_sr_{country.Id:000}");
        // SAV_SimpleTrainer.UpdateCountry uses the default list if a country has no dedicated resource.
        return new GeoRegions(country.Id, choices.Length == 0 ? Choices($"gen{generation}_sr_default") : choices);
    }).ToArray();
}
internal static class PokemonHistory
{
    public static HistoryCatalog Read(PKM p)
    {
        if (p.Format < 6) throw new ArgumentException("Pokemon trainer history is unavailable for this format.");
        GeoCatalog? geo = null;
        if (p is IGeoTrack g)
        {
            var pairs = new[] { (g.Geo1_Country, g.Geo1_Region), (g.Geo2_Country, g.Geo2_Region), (g.Geo3_Country, g.Geo3_Region), (g.Geo4_Country, g.Geo4_Region), (g.Geo5_Country, g.Geo5_Region) };
            bool handling = p.IsEgg || p.Generation < 6 || p.HandlingTrainerName.Length != 0;
            geo = new(pairs.Select((v, i) => new GeoEntry(i, v.Item1, v.Item2, i == 0 || handling)).ToArray(), GeographicCatalog.Countries.Value, GeographicCatalog.Regions.Value);
        }
        return new(new(p.CurrentHandler, p.OriginalTrainerName, p.HandlingTrainerName), geo);
    }
    public static void Apply(PKM p, HistoryEdit edit)
    {
        var catalog = Read(p);
        if (edit.Handler is null && (edit.Locations is null || edit.Locations.Length == 0)) throw new ArgumentException("Pokemon history edit is empty.");
        if (edit.Handler is int h && (h is not (0 or 1) || (h == 1 && p.HandlingTrainerName.Length == 0)))
            throw new ArgumentException("Pokemon handling trainer is unavailable.");
        if (edit.Locations is { } locations)
        {
            if (catalog.Geo is not { } geo || locations.Select(v => v.Index).Distinct().Count() != locations.Length)
                throw new ArgumentException("Pokemon residence history is unavailable or duplicated.");
            foreach (var v in locations)
            {
                if (v.Index is < 0 or > 4 || v.Country is < 0 or > 255 || v.Region is < 0 or > 255 ||
                    (!geo.Entries[v.Index].CanEdit && v.Country != 0) || !geo.Countries.Any(c => c.Id == v.Country) ||
                    (v.Country != 0 && !geo.Regions.Single(r => r.Country == v.Country).Choices.Any(c => c.Id == v.Region)))
                    throw new ArgumentException("Pokemon residence selection is outside the supported catalog.");
            }
            var g = (IGeoTrack)p;
            foreach (var v in locations)
            {
                byte country = (byte)v.Country, region = v.Country == 0 ? (byte)0 : (byte)v.Region;
                switch (v.Index)
                {
                    case 0: g.Geo1_Country = country; g.Geo1_Region = region; break;
                    case 1: g.Geo2_Country = country; g.Geo2_Region = region; break;
                    case 2: g.Geo3_Country = country; g.Geo3_Region = region; break;
                    case 3: g.Geo4_Country = country; g.Geo4_Region = region; break;
                    case 4: g.Geo5_Country = country; g.Geo5_Region = region; break;
                }
            }
        }
        if (edit.Handler is int handler) p.CurrentHandler = (byte)handler;
        var actual = Read(p);
        if ((edit.Handler is int wanted && actual.Holder.Current != wanted) ||
            (edit.Locations is { } values && values.Any(v => actual.Geo!.Entries[v.Index].Country != v.Country || actual.Geo.Entries[v.Index].Region != (v.Country == 0 ? 0 : v.Region))))
            throw new ArgumentException("Pokemon trainer history cannot be represented.");
    }
}
