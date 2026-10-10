// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record TrainerEdit(string Ot, ushort Tid, ushort Sid, uint Money,
    int? Gender = null, int? Hours = null, int? Minutes = null, int? Seconds = null, int? Language = null,
    int? Country = null, int? Region = null, int? ConsoleRegion = null, int? Badges = null, TrainerCurrencyEdit? Currencies = null, TrainerGameOptionEdit? GameOptions = null, TrainerPositionEdit? Position = null, TrainerDateEdit? Dates = null, TrainerSpatialEdit? SpatialPosition = null, int? GameVersion = null, TrainerAppearance6Edit? Appearance6 = null);
public sealed record TrainerLocation(int Country, int Region, int? ConsoleRegion);
public sealed record TrainerGeoRegionOrder(int Country,int[] Ids);
public sealed record TrainerGeoOrder(string Language,int[] Countries,TrainerGeoRegionOrder[] Regions);
public sealed record TrainerGeography(TrainerLocation Value, OriginChoice[] Countries, GeoRegions[] Regions, OriginChoice[] Consoles, bool KeepRegionWhenCountryZero,TrainerGeoOrder[]? Orders=null);
public sealed record TrainerOptions(bool CanGender, bool CanPlayTime, int Hours, int Minutes, int Seconds, OriginChoice[] Languages, TrainerGeography? Geography, TrainerBadgeState? Badges, TrainerCurrencyField[] Currencies, bool CanRecords, TrainerGameOptionState? GameOptions, TrainerPositionState? Position, TrainerDateField[] Dates, TrainerSpatialField[] SpatialPosition, TrainerGameVersionState GameVersion, TrainerAppearance6State? Appearance6);
internal sealed record TrainerSnapshot(string Ot, ushort Tid, ushort Sid, uint Money, byte Gender, int Hours, int Minutes, int Seconds, string? Appearance, int Language, uint? RuntimeLanguage, TrainerLocation? Location, TrainerBadgeState? Badges, string Currencies, TrainerGameOptionState? GameOptions, TrainerPositionSnapshot? Position, TrainerDateSnapshot? Dates, string? SpatialPosition, GameVersion Version, string? Appearance6);

internal static class TrainerEditing
{
    public static TrainerOptions Options(SaveFile save) => new(save.Generation > 1,
        save is SAV3 or SAV4 or SAV5 or SAV6XY or SAV6AO or SAV7SM or SAV7USUM or SAV8SWSH or SAV8BS,
        save.PlayedHours,save.PlayedMinutes,save.PlayedSeconds, Languages(save), Geography(save), TrainerBadges.Read(save), TrainerCurrencies.Read(save), SaveRecords.Supports(save), TrainerGameOptions.Read(save), TrainerPosition.Read(save), TrainerDates.Read(save), TrainerSpatialPosition.Read(save), TrainerGameVersion.Read(save), TrainerAppearance6.Read(save));
    private static readonly Lazy<OriginChoice[]> Consoles = new(() => Locale3DS.DefinedLocales.ToArray().Select(id =>
        new OriginChoice(id,new(GameInfo.GetStrings("zh-Hans").console3ds[id],GameInfo.GetStrings("en").console3ds[id],GameInfo.GetStrings("ja").console3ds[id]))).ToArray());
    private static TrainerLocation? Location(SaveFile save) => save switch
    {
        SAV4 s => new(s.Country, s.Region, null),
        SAV5 s => new(s.Country, s.Region, null),
        IRegionOrigin g => new(g.Country, g.Region, g.ConsoleRegion),
        _ => null,
    };
    private static TrainerGeography? Geography(SaveFile save) => save switch
    {
        SAV4 => new(Location(save)!, GeographicCatalog.Gen4Countries.Value, GeographicCatalog.Gen4Regions.Value, [], false),
        SAV5 => new(Location(save)!, GeographicCatalog.Gen5Countries.Value, GeographicCatalog.Gen5Regions.Value, [], false),
        SAV6XY or SAV6AO => new(Location(save)!, GeographicCatalog.Countries.Value, GeographicCatalog.Regions.Value, Consoles.Value, true,GeographicCatalog.Gen6Orders.Value),
        SAV7SM or SAV7USUM => new(Location(save)!, GeographicCatalog.Countries.Value, GeographicCatalog.Regions.Value, Consoles.Value, true),
        _ => null,
    };
    internal static OriginChoice[] Languages(SaveFile save)
    {
        if (save is not (SAV6XY or SAV6AO or SAV7SM or SAV7USUM or SAV8SWSH or SAV8BS)) return [];
        var zh = GameInfo.GetStrings("zh-Hans").languageNames;
        var en = GameInfo.GetStrings("en").languageNames;
        var ja = GameInfo.GetStrings("ja").languageNames;
        return GameInfo.LanguageDataSource(save.Generation,save.Context).Select(x =>
            new OriginChoice(x.Value,new(zh[x.Value],en[x.Value],ja[x.Value]))).ToArray();
    }
    internal static TrainerSnapshot Snapshot(SaveFile save) => new(save.OT,save.TID16,save.SID16,save.Money,save.Gender,save.PlayedHours,save.PlayedMinutes,save.PlayedSeconds,
        save is SAV8SWSH swsh ? Convert.ToHexString(swsh.MyStatus.Data) : null,
        save.Language, save is SAV8SWSH runtime ? runtime.GetValue<uint>(SaveBlockAccessor8SWSH.KGameLanguage) : null, Location(save), TrainerBadges.Read(save), TrainerCurrencies.Snapshot(save), TrainerGameOptions.Read(save), TrainerPosition.Snapshot(save), TrainerDates.Snapshot(save), TrainerSpatialPosition.Snapshot(save), save.Version, TrainerAppearance6.Snapshot(save));

    public static void Apply(SaveFile save, TrainerEdit edit)
    {
        var options = Options(save);
        var maxName = save is SAV3 { Japanese: true } ? 5 : save.MaxStringLengthTrainer;
        int minName = save is SAV6XY or SAV6AO ? 0 : 1;
        if (edit.Ot is null || edit.Ot.Length < minName || edit.Ot.Length > maxName || edit.Ot.Any(char.IsControl))
            throw new ArgumentException($"Trainer name must contain {minName}–{maxName} supported characters.");
        if (edit.Money > save.MaxMoney) throw new ArgumentException($"Money must be between 0 and {save.MaxMoney}.");
        if (edit.Gender.HasValue && (!options.CanGender || edit.Gender is < 0 or > 1))
            throw new ArgumentException("Trainer gender must be 0 or 1 for this format.");
        if ((!options.CanPlayTime && (edit.Hours.HasValue || edit.Minutes.HasValue || edit.Seconds.HasValue)) ||
            edit.Hours is < 0 or > ushort.MaxValue || edit.Minutes is < 0 or > 99 || edit.Seconds is < 0 or > 99)
            throw new ArgumentException("Trainer play time is out of range or unsupported.");
        if (edit.Language is int language && !options.Languages.Any(x => x.Id == language))
            throw new ArgumentException("Trainer language is unsupported for this save.");
        if (edit.Country.HasValue || edit.Region.HasValue || edit.ConsoleRegion.HasValue)
        {
            if (options.Geography is not { } geo || edit.Country is < 0 or > 255 || edit.Region is < 0 or > 255 || edit.ConsoleRegion is < 0 or > 255)
                throw new ArgumentException("Trainer geography is unsupported or out of range.");
            int country = edit.Country ?? geo.Value.Country, region = edit.Region ?? geo.Value.Region;
            bool pairChanged = country != geo.Value.Country || region != geo.Value.Region;
            if ((pairChanged && (!geo.Countries.Any(c => c.Id == country) || ((country != 0 || !geo.KeepRegionWhenCountryZero) && !geo.Regions.Any(r => r.Country == country && r.Choices.Any(c => c.Id == region))))) ||
                (edit.ConsoleRegion is int console && console != geo.Value.ConsoleRegion && !geo.Consoles.Any(c => c.Id == console)))
                throw new ArgumentException("Trainer geography is outside the supported catalog.");
            switch(save)
            {
                case SAV4 s:
                    if (country != s.Country) s.Country = country;
                    if (region != s.Region) s.Region = region;
                    break;
                case SAV5 s:
                    if (country != s.Country) s.Country = country;
                    if (region != s.Region) s.Region = region;
                    break;
                case IRegionOrigin origin:
                    if (country != origin.Country) origin.Country = (byte)country;
                    if (region != origin.Region) origin.Region = (byte)region;
                    if (edit.ConsoleRegion is int nextConsole && nextConsole != origin.ConsoleRegion) origin.ConsoleRegion = (byte)nextConsole;
                    break;
            }
        }
        if(edit.Badges is int badges) TrainerBadges.Apply(save,badges);
        if(edit.Currencies is { } currencies) TrainerCurrencies.Apply(save,currencies);
        if(edit.GameOptions is { } gameOptions) TrainerGameOptions.Apply(save,gameOptions);
        if(edit.Position is { } position) TrainerPosition.Apply(save,position);
        if(edit.Dates is { } dates) TrainerDates.Apply(save,dates);
        if(edit.SpatialPosition is { } spatial) TrainerSpatialPosition.Apply(save, spatial);
        if (edit.GameVersion is int gameVersion) TrainerGameVersion.Apply(save, gameVersion);
        bool nameChanged = save.OT != edit.Ot;
        // Encode an explicitly changed name using the requested language. Unchanged bytes stay intact.
        if (edit.Language is int targetLanguage && targetLanguage != save.Language) save.Language = targetLanguage;
        if (edit.Appearance6 is { } appearance6) TrainerAppearance6.Apply(save, appearance6);
        // Like SAV_SimpleTrainer, preserve unchanged name bytes (including trailing data).
        if (nameChanged) save.OT = edit.Ot;
        if (save.TID16 != edit.Tid) save.TID16 = edit.Tid;
        if (save.SID16 != edit.Sid) save.SID16 = edit.Sid;
        if (save.Money != edit.Money) save.Money = edit.Money;
        if (edit.Gender is int gender && gender != save.Gender)
        {
            if (save is SAV8SWSH swsh)
            {
                int color = (int)PlayerSkinColor8Extensions.GetSkinColorFromSkin(swsh.MyStatus.Skin);
                if (color < 0) throw new ArgumentException("Cannot reset trainer appearance with an unrecognized skin color.");
                save.Gender = (byte)gender;
                // SAV_Trainer8.CB_Gender_SelectedIndexChanged / ResetAppearance.
                swsh.MyStatus.ResetAppearance((PlayerSkinColor8)((color & ~1) | gender));
            }
            else save.Gender = (byte)gender;
        }
        if (edit.Hours is int hours && hours != save.PlayedHours) save.PlayedHours = hours;
        if (edit.Minutes is int minutes && minutes % 60 != save.PlayedMinutes) save.PlayedMinutes = minutes % 60;
        if (edit.Seconds is int seconds && seconds % 60 != save.PlayedSeconds) save.PlayedSeconds = seconds % 60;
        if (save.OT != edit.Ot) throw new ArgumentException("This game cannot represent the requested trainer name.");
    }
}
