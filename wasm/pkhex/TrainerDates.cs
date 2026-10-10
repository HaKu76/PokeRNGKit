// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record TrainerDateField(string Key, string Value, string Min, string Max, string Kind);
public sealed record TrainerDateEdit(string? Started = null, string? Fame = null, string? Saved = null);
internal sealed record TrainerDateSnapshot(string Raw);

internal static class TrainerDates
{
    private const string Format = "yyyy-MM-dd'T'HH:mm:ss";
    private static readonly DateTime Epoch = new(2000, 1, 1);
    private static bool HasEpoch(SaveFile save) => save is SAV4 or SAV5 or SAV6XY or SAV6AO or SAV6AODemo or SAV7SM or SAV7USUM;
    private static string Text(DateTime date) => date.ToString(Format, CultureInfo.InvariantCulture);
    private static string SafeText(Func<DateTime?> read)
    {
        try { return read() is { } value ? Text(value) : ""; }
        catch (ArgumentOutOfRangeException) { return ""; }
    }
    public static TrainerDateField[] Read(SaveFile save)
    {
        var fields = new List<TrainerDateField>();
        if (HasEpoch(save))
        {
            string max = save.Generation <= 5 ? "2099-12-31T23:59:59" : "2050-12-31T23:59:59";
            fields.Add(new("started", Text(Epoch.AddSeconds(save.SecondsToStart)), "2000-01-01T00:00:00", max, "second"));
            fields.Add(new("fame", Text(Epoch.AddSeconds(save.SecondsToFame)), "2000-01-01T00:00:00", max, "second"));
        }
        if (save is SAV6 s6)
            fields.Add(new("saved", SafeText(() => s6.Played.LastSavedDate), "2000-01-01T00:00:00", "2050-12-31T23:59:00", "minute"));
        else if (save is SAV7 s7)
            fields.Add(new("saved", SafeText(() => s7.Played.LastSavedDate), "1753-01-01T00:00:00", "2050-12-31T23:59:00", "minute"));
        else if (save is SAV8SWSH sw)
        {
            string start = SafeText(() => new DateTime(sw.TrainerCard.StartedYear, sw.TrainerCard.StartedMonth, sw.TrainerCard.StartedDay));
            fields.Add(new("started", start.Length == 0 ? "" : start[..10], "2000-01-01", "2060-12-31", "date"));
            fields.Add(new("saved", SafeText(() => sw.Played.LastSavedDate), "1900-01-01T00:00:00", "4095-12-31T23:59:00", "minute"));
        }
        else if (save is SAV8BS bs)
        {
            string start = SafeText(() => bs.System.TimestampStart), saved = SafeText(() => bs.System.TimestampLatest);
            fields.Add(new("started", start.Length == 0 ? "" : start + "Z", "2000-01-01T00:00:00", "2099-12-31T23:59:59", "utc"));
            fields.Add(new("saved", saved.Length == 0 ? "" : saved + "Z", "2000-01-01T00:00:00", "2099-12-31T23:59:59", "utc"));
        }
        return fields.ToArray();
    }
    public static TrainerDateSnapshot? Snapshot(SaveFile save)
    {
        string raw = save is SAV5 s5 ? $"{s5.AdventureInfo.SecondsToStart}:{s5.AdventureInfo.SecondsToFame}"
            : HasEpoch(save) ? $"{save.SecondsToStart}:{save.SecondsToFame}" : "";
        raw += save switch
        {
            SAV6 s => ":" + Convert.ToHexString(s.Played.Data.Slice(4, 4)),
            SAV7 s => ":" + Convert.ToHexString(s.Played.Data.Slice(4, 4)),
            SAV8SWSH s => Convert.ToHexString(s.TrainerCard.Data.Slice(0x170, 4)) + ":" + Convert.ToHexString(s.Played.Data.Slice(4, 4)),
            SAV8BS s => Convert.ToHexString(s.System.Data[..24]),
            _ => "",
        };
        return raw.Length == 0 ? null : new(raw);
    }
    public static void Apply(SaveFile save, TrainerDateEdit edit)
    {
        var fields = Read(save);
        if (fields.Length == 0) throw Invalid();
        var updates = new List<Action>();
        var expected = new List<(string Key, string Value)>();
        foreach (var (key, value) in new[] { ("started", edit.Started), ("fame", edit.Fame), ("saved", edit.Saved) })
        {
            if (value is null) continue;
            var field = fields.FirstOrDefault(f => f.Key == key) ?? throw Invalid();
            if (value == field.Value) continue;
            if (field.Kind == "utc")
            {
                // The browser supplies the selected local clock's explicit offset. Never use Wasm's timezone.
                if (!DateTimeOffset.TryParseExact(value, Format + "zzz", CultureInfo.InvariantCulture, DateTimeStyles.None, out var stamp) ||
                    !InRange(Text(stamp.DateTime), field)) throw Invalid();
                var bs = (SAV8BS)save;
                long original = key == "started" ? bs.System.TicksStart : bs.System.TicksLatest;
                long fraction = original >= 0 ? original % TimeSpan.TicksPerSecond : 0;
                if (field.Value.Length == 0) fraction = 0;
                long next = stamp.UtcDateTime.AddTicks(fraction).ToFileTimeUtc();
                if (next == original) continue;
                expected.Add((key, Text(stamp.UtcDateTime) + "Z"));
                updates.Add(() => { if (key == "started") bs.System.TicksStart = next; else bs.System.TicksLatest = next; });
                continue;
            }
            string format = field.Kind == "date" ? "yyyy-MM-dd" : Format;
            if (!DateTime.TryParseExact(value, format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ||
                !InRange(value, field) || (field.Kind == "minute" && date.Second != 0)) throw Invalid();
            if (key == "saved")
                updates.Add(() => { switch (save) { case SAV6 s: s.Played.LastSavedDate = date; break; case SAV7 s: s.Played.LastSavedDate = date; break; case SAV8SWSH s: s.Played.LastSavedDate = date; break; default: throw Invalid(); } });
            else if (save is SAV8SWSH sw)
                updates.Add(() => { sw.TrainerCard.StartedYear = (ushort)date.Year; sw.TrainerCard.StartedMonth = (byte)date.Month; sw.TrainerCard.StartedDay = (byte)date.Day; });
            else
            {
                // Avoid DateUtil's signed int intermediate, which overflows inside the DS calendar range.
                uint seconds = checked((uint)((date.Ticks - Epoch.Ticks) / TimeSpan.TicksPerSecond));
                updates.Add(() => { if (key == "started") save.SecondsToStart = seconds; else save.SecondsToFame = seconds; });
            }
            expected.Add((key, value));
        }
        foreach (var apply in updates) apply();
        var after = Read(save);
        if (expected.Any(e => after.First(f => f.Key == e.Key).Value != e.Value))
            throw new ArgumentException("Trainer dates cannot be represented by this format.");
    }
    private static bool InRange(string value, TrainerDateField field) => string.CompareOrdinal(value, field.Min) >= 0 && string.CompareOrdinal(value, field.Max) <= 0;
    private static ArgumentException Invalid() => new("Trainer dates are unsupported or out of range.");
}
