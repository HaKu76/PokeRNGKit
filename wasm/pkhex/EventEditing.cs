// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
namespace PokeRNGKit.SaveEditor;

public sealed record EventQuery(string Language);
public sealed record EventPreset(string Name, int Value);
public sealed record EventLabel(int Index, string Name, int Category, EventPreset[] Presets);
public sealed record EventCatalog(bool[] Flags, ushort[] Values, EventLabel[] FlagLabels, EventLabel[] WorkLabels, bool UpdatesQr);
public sealed record EventFlagChange(int? Index = null, bool? Value = null);
public sealed record EventWorkChange(int? Index = null, int? Value = null);
public sealed record EventEdit(EventFlagChange[]? Flags = null, EventWorkChange[]? Values = null);
public sealed record EventCompareQuery(string NewData);
public sealed record EventValueDiff(int Index, int Before, int After);
public sealed record EventDiff(int[] SetFlags, int[] ClearedFlags, EventValueDiff[] Values);

internal static class EventEditing
{
    internal static string Suffix(SaveFile save) => save switch
    {
        SAV3RS => "rs", SAV3E => "e", SAV3FRLG => "frlg",
        SAV4DP => "dp", SAV4Pt => "pt", SAV4HGSS => "hgss",
        SAV5BW => "bw", SAV5B2W2 => "b2w2",
        SAV6XY => "xy", SAV6AO => "oras", SAV7SM => "sm", SAV7USUM => "usum",
        _ => throw new ArgumentException("Event editing is unavailable for this format."),
    };
    internal static IEventFlag37 Block(SaveFile save)
    {
        _ = Suffix(save);
        return save is IEventFlagProvider37 p ? p.EventWork : (IEventFlag37)save;
    }
    public static EventCatalog Read(SaveFile save, string language)
    {
        var lang = language switch { "zh" => "zh-Hans", "en" => "en", "ja" => "ja", _ => throw new ArgumentException("Unsupported event language.") };
        var block = Block(save); var suffix = Suffix(save);
        var flags = EventLabelParsing.GetFlags(GameLanguage.GetStrings(suffix, lang, "flags"), block.EventFlagCount);
        var work = EventLabelParsing.GetWork(GameLanguage.GetStrings(suffix, lang, "const"), block.EventWorkCount);
        return new(block.GetEventFlags(), block.GetAllEventWork(),
            flags.Select(f => new EventLabel(f.Index, f.Name, (int)f.Type, [])).ToArray(),
            work.Select(w => new EventLabel(w.Index, w.Name, (int)w.Type,
                w.PredefinedValues.Where(v => !v.IsCustom).Select(v => new EventPreset(v.Name, v.Value)).ToArray())).ToArray(), save is SAV7);
    }
    internal static byte[] Qr(SaveFile save) => save is SAV7 s
        ? s.Data.Slice(s.AllBlocks[35].Offset + 0x168, save is SAV7USUM ? 12 : 8).ToArray() : [];

    public static void Apply(SaveFile save, EventEdit edit)
    {
        var block = Block(save);
        if (edit.Flags is null || edit.Values is null || edit.Flags.Length > block.EventFlagCount || edit.Values.Length > block.EventWorkCount)
            throw new ArgumentException("Event changes require bounded flag and value arrays.");
        var flags = new HashSet<int>(); var work = new HashSet<int>();
        foreach (var f in edit.Flags)
            if (f is null || f.Index is not {} i || (uint)i >= block.EventFlagCount || f.Value is null || !flags.Add(i))
                throw new ArgumentException("Invalid or duplicate event flag.");
        foreach (var w in edit.Values)
            if (w is null || w.Index is not {} i || (uint)i >= block.EventWorkCount || w.Value is not {} v || (uint)v > ushort.MaxValue || !work.Add(i))
                throw new ArgumentException("Invalid or duplicate event value.");
        bool changed = false;
        foreach (var f in edit.Flags)
        {
            int i = f.Index!.Value; bool value = f.Value!.Value;
            if (block.GetEventFlag(i) == value) continue;
            block.SetEventFlag(i, value); changed = true;
        }
        foreach (var w in edit.Values)
        {
            int i = w.Index!.Value; ushort value = (ushort)w.Value!.Value;
            if (block.GetWork(i) == value) continue;
            block.SetWork(i, value); changed = true;
        }
        // Match EventWorkspace.Save's QR linkage only when an actual edit occurs.
        // Opening the editor or submitting unchanged data preserves unusual bytes.
        if (changed && block is EventWork7 gen7) gen7.UpdateQrConstants();
    }
}

public static partial class SaveService
{
    public static string ReadEvents(byte[] data, string json)
    {
        if (json.Length > 128) throw new ArgumentException("Event query is too large.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.EventQuery) ?? throw new ArgumentException("Missing event query.");
        return JsonSerializer.Serialize(EventEditing.Read(Open(data), query.Language), SaveJsonContext.Default.EventCatalog);
    }
    public static byte[] EditEvents(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save)) throw new ArgumentException("Editing requires a supported save with valid checksums.");
        if (json.Length > 1024 * 1024) throw new ArgumentException("Event edit is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.EventEdit) ?? throw new ArgumentException("Missing event edit.");
        EventEditing.Apply(save, edit);
        var block = EventEditing.Block(save); var flags = block.GetEventFlags(); var values = block.GetAllEventWork(); var qr = EventEditing.Qr(save);
        var output = save.Write().ToArray(); var check = Open(output); var actual = EventEditing.Block(check);
        if (check.GetType() != save.GetType() || !SaveChecksums.Valid(check) || !flags.SequenceEqual(actual.GetEventFlags()) || !values.SequenceEqual(actual.GetAllEventWork()) || !qr.SequenceEqual(EventEditing.Qr(check)))
            throw new InvalidOperationException("Event export verification failed.");
        return output;
    }
    public static string CompareEvents(byte[] data, string json)
    {
        if (data.Length > 1024 * 1024 || json.Length > 1500000) throw new ArgumentException("Event comparison files must not exceed 1 MiB.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.EventCompareQuery) ?? throw new ArgumentException("Missing event comparison.");
        if (string.IsNullOrEmpty(query.NewData)) throw new ArgumentException("Missing new save.");
        var bytes = Convert.FromBase64String(query.NewData);
        if (bytes.Length > 1024 * 1024) throw new ArgumentException("Event comparison files must not exceed 1 MiB.");
        var before = Open(data); var after = Open(bytes);
        if (before.GetType() != after.GetType() || before.Version != after.Version) throw new ArgumentException("Event comparison requires the same game version.");
        var a = EventEditing.Block(before); var b = EventEditing.Block(after);
        if (a.EventFlagCount != b.EventFlagCount || a.EventWorkCount != b.EventWorkCount) throw new ArgumentException("Event layouts differ.");
        var diff = new EventBlockDiff<IEventFlag37, ushort>(a, b);
        if (diff.Message != EventWorkDiffCompatibility.Valid) throw new ArgumentException("Event layouts differ.");
        return JsonSerializer.Serialize(new EventDiff(diff.SetFlags.ToArray(), diff.ClearedFlags.ToArray(), diff.WorkChanged.Select(i => new EventValueDiff(i, a.GetWork(i), b.GetWork(i))).ToArray()), SaveJsonContext.Default.EventDiff);
    }
}
