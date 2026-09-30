// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
namespace PokeRNGKit.SaveEditor;

public sealed record EventQuery(string Language);
public sealed record EventPreset(string Name, int Value);
public sealed record EventLabel(int Index, string Name, int Category, EventPreset[] Presets);
public sealed record EventGroup(int Category, int Start, int Count);
public sealed record EventCatalog(bool[] Flags, int[] Values, EventLabel[] FlagLabels, EventLabel[] WorkLabels, bool UpdatesQr, int MinimumValue, int MaximumValue, bool CanEdit, EventGroup[] FlagGroups, EventGroup[] WorkGroups, bool[] SystemFlags, EventLabel[] SystemLabels);
public sealed record EventFlagChange(int? Index = null, bool? Value = null);
public sealed record EventWorkChange(int? Index = null, int? Value = null);
public sealed record EventEdit(EventFlagChange[]? Flags = null, EventWorkChange[]? Values = null, EventFlagChange[]? System = null);
public sealed record EventCompareQuery(string NewData);
public sealed record EventValueDiff(int Index, int Before, int After);
public sealed record EventDiff(int[] SetFlags, int[] ClearedFlags, EventValueDiff[] Values, int[] SetSystem, int[] ClearedSystem);

internal static class EventEditing
{
    // Normalize the read model, while writes keep Gen2's byte-width contract.
    private sealed class ByteEventBlock(SAV2 save) : IEventFlag37
    {
        public int EventFlagCount => save.EventFlagCount;
        public int EventWorkCount => save.EventWorkCount;
        public bool GetEventFlag(int index) => save.GetEventFlag(index);
        public void SetEventFlag(int index, bool value) => save.SetEventFlag(index, value);
        public ushort GetWork(int index) => save.GetWork(index);
        public void SetWork(int index, ushort value) => save.SetWork(index, checked((byte)value));
    }
    internal static int Minimum(SaveFile save) => save is SAV7b or SAV8BS ? int.MinValue : 0;
    internal static int Maximum(SaveFile save) => save is SAV7b or SAV8BS ? int.MaxValue : save is SAV2 ? byte.MaxValue : ushort.MaxValue;
    internal static bool[] SystemFlags(SaveFile save) => save is SAV8BS b ? Enumerable.Range(0,b.FlagWork.CountSystem).Select(b.FlagWork.GetSystemFlag).ToArray() : [];
    internal static bool[] Flags(SaveFile save) => save is SAV8BS bs ? Enumerable.Range(0,bs.FlagWork.CountFlag).Select(bs.FlagWork.GetFlag).ToArray() : save is SAV7b b
        ? Enumerable.Range(0, b.Blocks.EventWork.CountFlag).Select(b.Blocks.EventWork.GetFlag).ToArray() : Block(save).GetEventFlags();
    internal static int[] Values(SaveFile save) => save is SAV8BS bs ? Enumerable.Range(0,bs.FlagWork.CountWork).Select(bs.FlagWork.GetWork).ToArray() : save is SAV7b b
        ? Enumerable.Range(0, b.Blocks.EventWork.CountWork).Select(b.Blocks.EventWork.GetWork).ToArray() : Block(save).GetAllEventWork().Select(v => (int)v).ToArray();
    internal static string Suffix(SaveFile save) => save switch
    {
        SAV2 { Version: GameVersion.C } => "c",
        SAV2 { Version: GameVersion.GD or GameVersion.SI or GameVersion.GS } => "gs",
        SAV3RS => "rs", SAV3E => "e", SAV3FRLG => "frlg",
        SAV4DP => "dp", SAV4Pt => "pt", SAV4HGSS => "hgss",
        SAV5BW => "bw", SAV5B2W2 => "b2w2",
        SAV6XY => "xy", SAV6AO => "oras", SAV7SM => "sm", SAV7USUM => "usum",
        SAV7b => "gg",
        SAV8BS => "bdsp",
        _ => throw new ArgumentException("Event editing is unavailable for this format."),
    };
    internal static IEventFlag37 Block(SaveFile save)
    {
        _ = Suffix(save);
        return save is SAV2 two ? new ByteEventBlock(two) : save is IEventFlagProvider37 p ? p.EventWork : (IEventFlag37)save;
    }
    public static EventCatalog Read(SaveFile save, string language)
    {
        var lang = language switch { "zh" => "zh-Hans", "en" => "en", "ja" => "ja", _ => throw new ArgumentException("Unsupported event language.") };
        if (save is SAV8BS bdsp)
        {
            // Same resources/parser as EventLabelCollectionSystem, without mutable GameInfo.CurrentLanguage.
            EventLabel[] Labels(string[] resource, int count) => EventLabelParsing.GetFlags(resource,count)
                .Select(f=>new EventLabel(f.Index,f.Name,(int)f.Type,[])).ToArray();
            var wl=EventLabelParsing.GetWork(GameLanguage.GetStrings("bdsp",lang,"work"),bdsp.FlagWork.CountWork)
                .Select(w=>new EventLabel(w.Index,w.Name,(int)w.Type,w.PredefinedValues.Where(v=>!v.IsCustom).Select(v=>new EventPreset(v.Name,v.Value)).ToArray())).ToArray();
            return new(Flags(save),Values(save),Labels(GameLanguage.GetStrings("bdsp",lang,"flag"),bdsp.FlagWork.CountFlag),wl,false,Minimum(save),Maximum(save),
                save.State.Exportable && SaveChecksums.Valid(save),[],[],SystemFlags(save),Labels(GameLanguage.GetStrings("bdsp",lang,"system"),bdsp.FlagWork.CountSystem));
        }
        if (save is SAV7b letsGo)
        {
            var editor = new SplitEventEditor<int>(letsGo.Blocks.EventWork, GameLanguage.GetStrings("gg", lang, "const"), GameLanguage.GetStrings("gg", lang, "flags"));
            // Group ranges come from EventWork7b. Keep the final 72 raw work slots accessible too.
            EventGroup[] fg = [new(200,0,128),new(201,128,512),new(202,640,1536),new(203,2176,1920)];
            EventGroup[] wg = [new(200,0,32),new(201,32,128),new(202,160,512),new(203,672,256),new(204,928,72)];
            EventLabel Label(EventVar item, EventPreset[] presets, EventGroup[] groups)
            {
                var group = groups.Single(g => g.Category == 200 + (int)item.Type);
                // Core permits index == group count; do not allow a resource to spill into the next group.
                if ((uint)item.RelativeIndex >= group.Count || item.RawIndex != group.Start + item.RelativeIndex)
                    throw new InvalidOperationException("Invalid split event resource index.");
                return new(item.RawIndex, item.Name, group.Category, presets);
            }
            return new(Flags(save), Values(save),
                editor.Flag.SelectMany(g => g.Vars).Select(f => Label(f, [], fg)).ToArray(),
                editor.Work.SelectMany(g => g.Vars).Cast<EventWork<int>>().Select(w => Label(w, w.Options.Where(v => !v.Custom).Select(v => new EventPreset(v.Text,v.Value)).ToArray(), wg)).ToArray(),
                false, Minimum(save), Maximum(save), save.State.Exportable && SaveChecksums.Valid(save), fg, wg, [], []);
        }
        var block = Block(save); var suffix = Suffix(save);
        var flags = EventLabelParsing.GetFlags(GameLanguage.GetStrings(suffix, lang, "flags"), block.EventFlagCount);
        var work = EventLabelParsing.GetWork(GameLanguage.GetStrings(suffix, lang, "const"), block.EventWorkCount);
        return new(Flags(save), Values(save),
            flags.Select(f => new EventLabel(f.Index, f.Name, (int)f.Type, [])).ToArray(),
            work.Select(w => new EventLabel(w.Index, w.Name, (int)w.Type,
                w.PredefinedValues.Where(v => !v.IsCustom).Select(v => new EventPreset(v.Name, v.Value)).ToArray())).ToArray(), save is SAV7,
            Minimum(save), Maximum(save), save.State.Exportable && SaveChecksums.Valid(save), [], [], [], []);
    }
    internal static byte[] Qr(SaveFile save) => save is SAV7 s
        ? s.Data.Slice(s.AllBlocks[35].Offset + 0x168, save is SAV7USUM ? 12 : 8).ToArray() : [];

    public static void Apply(SaveFile save, EventEdit edit)
    {
        var beforeFlags = Flags(save); var beforeValues = Values(save); var beforeSystem = SystemFlags(save);
        var system = edit.System ?? [];
        if (edit.Flags is null || edit.Values is null || edit.Flags.Length > beforeFlags.Length || edit.Values.Length > beforeValues.Length || system.Length > beforeSystem.Length)
            throw new ArgumentException("Event changes require bounded flag and value arrays.");
        var flags = new HashSet<int>(); var work = new HashSet<int>();
        foreach (var f in edit.Flags)
            if (f is null || f.Index is not {} i || (uint)i >= beforeFlags.Length || f.Value is null || !flags.Add(i))
                throw new ArgumentException("Invalid or duplicate event flag.");
        foreach (var w in edit.Values)
            if (w is null || w.Index is not {} i || (uint)i >= beforeValues.Length || w.Value is not {} v || v < Minimum(save) || v > Maximum(save) || !work.Add(i))
                throw new ArgumentException("Invalid or duplicate event value.");
        var systemIndices = new HashSet<int>();
        foreach (var f in system)
            if (f is null || f.Index is not {} i || (uint)i >= beforeSystem.Length || f.Value is null || !systemIndices.Add(i))
                throw new ArgumentException("Invalid or duplicate system flag.");
        bool changed = false;
        var split = (save as SAV7b)?.Blocks.EventWork;
        var bdsp = (save as SAV8BS)?.FlagWork;
        var block = split is null && bdsp is null ? Block(save) : null;
        foreach (var f in edit.Flags)
        {
            int i = f.Index!.Value; bool value = f.Value!.Value;
            if (beforeFlags[i] == value) continue;
            if (bdsp is not null) bdsp.SetFlag(i, value); else if (split is not null) split.SetFlag(i, value); else block!.SetEventFlag(i, value);
            changed = true;
        }
        foreach (var w in edit.Values)
        {
            int i = w.Index!.Value; int value = w.Value!.Value;
            if (beforeValues[i] == value) continue;
            if (bdsp is not null) bdsp.SetWork(i, value); else if (split is not null) split.SetWork(i, value); else block!.SetWork(i, checked((ushort)value));
            changed = true;
        }
        foreach (var f in system)
        {
            int i=f.Index!.Value; bool value=f.Value!.Value;
            if (beforeSystem[i] != value) bdsp!.SetSystemFlag(i,value);
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
        if ((!CanEdit(save) && save is not (SAV2 or SAV7b)) || !save.State.Exportable || !SaveChecksums.Valid(save)) throw new ArgumentException("Editing requires a supported save with valid checksums.");
        if (json.Length > 1024 * 1024) throw new ArgumentException("Event edit is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.EventEdit) ?? throw new ArgumentException("Missing event edit.");
        EventEditing.Apply(save, edit);
        var flags = EventEditing.Flags(save); var values = EventEditing.Values(save); var system = EventEditing.SystemFlags(save); var qr = EventEditing.Qr(save);
        var output = save.Write().ToArray(); var check = Open(output);
        if (check.GetType() != save.GetType() || check.Version != save.Version ||
            (save is SAV2 two && (check is not SAV2 reloaded || two.SaveRevision != reloaded.SaveRevision)) ||
            (save is SAV8BS bs && (check is not SAV8BS bsCheck || bs.SaveRevision != bsCheck.SaveRevision || output.Length != data.Length)) ||
            !SaveChecksums.Valid(check) || !flags.SequenceEqual(EventEditing.Flags(check)) || !values.SequenceEqual(EventEditing.Values(check)) || !system.SequenceEqual(EventEditing.SystemFlags(check)) || !qr.SequenceEqual(EventEditing.Qr(check)))
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
        if (before is SAV8BS old8b && after is SAV8BS new8b)
        {
            var diff8b=new EventWorkDiff8b(old8b,new8b);
            if (diff8b.Message != EventWorkDiffCompatibility.Valid) throw new ArgumentException("Event layouts differ.");
            return JsonSerializer.Serialize(new EventDiff(diff8b.SetFlags.ToArray(),diff8b.ClearedFlags.ToArray(),diff8b.WorkChanged.Select(i=>new EventValueDiff(i,old8b.FlagWork.GetWork(i),new8b.FlagWork.GetWork(i))).ToArray(),diff8b.SetSystem.ToArray(),diff8b.ClearedSystem.ToArray()),SaveJsonContext.Default.EventDiff);
        }
        if (before is SAV7b old7b && after is SAV7b new7b)
        {
            var diff7b = new EventWorkDiff7b(old7b, new7b);
            if (diff7b.Message != EventWorkDiffCompatibility.Valid) throw new ArgumentException("Event layouts differ.");
            // Use typed indices; Core's text summary does not classify the final raw work slots.
            return JsonSerializer.Serialize(new EventDiff(diff7b.SetFlags.ToArray(), diff7b.ClearedFlags.ToArray(), diff7b.WorkChanged.Select(i => new EventValueDiff(i, old7b.Blocks.EventWork.GetWork(i), new7b.Blocks.EventWork.GetWork(i))).ToArray(),[],[]), SaveJsonContext.Default.EventDiff);
        }
        if (before is SAV2 old2 && after is SAV2 new2)
        {
            var diff2 = new EventBlockDiff<SAV2, byte>(old2, new2);
            if (diff2.Message != EventWorkDiffCompatibility.Valid) throw new ArgumentException("Event layouts differ.");
            return JsonSerializer.Serialize(new EventDiff(diff2.SetFlags.ToArray(), diff2.ClearedFlags.ToArray(), diff2.WorkChanged.Select(i => new EventValueDiff(i, old2.GetWork(i), new2.GetWork(i))).ToArray(),[],[]), SaveJsonContext.Default.EventDiff);
        }
        var a = EventEditing.Block(before); var b = EventEditing.Block(after);
        if (a.EventFlagCount != b.EventFlagCount || a.EventWorkCount != b.EventWorkCount) throw new ArgumentException("Event layouts differ.");
        var diff = new EventBlockDiff<IEventFlag37, ushort>(a, b);
        if (diff.Message != EventWorkDiffCompatibility.Valid) throw new ArgumentException("Event layouts differ.");
        return JsonSerializer.Serialize(new EventDiff(diff.SetFlags.ToArray(), diff.ClearedFlags.ToArray(), diff.WorkChanged.Select(i => new EventValueDiff(i, a.GetWork(i), b.GetWork(i))).ToArray(),[],[]), SaveJsonContext.Default.EventDiff);
    }
}
