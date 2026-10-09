// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record Decoration3Category(int Id, LocalizedText Name, int[] Slots, OriginChoice[] Choices);
public sealed record Decoration3Catalog(bool CanEdit, Decoration3Category[] Categories);
public sealed record Decoration3Edit(int Category, int[] Slots);
internal static class Decoration3Editing
{
    private static SAV3 Save(SaveFile save) => save is SAV3RS or SAV3E ? (SAV3)save : throw new ArgumentException("Gen3 decorations are unavailable for this format.");
    private static Span<Decoration3> Slots(SAV3 s, int category)
    {
        var d = ((ISaveBlock3LargeHoenn)s.LargeBlock).Decorations;
        return category switch { 0 => d.Desk, 1 => d.Chair, 2 => d.Plant, 3 => d.Ornament, 4 => d.Mat, 5 => d.Poster, 6 => d.Doll, 7 => d.Cushion, _ => throw new ArgumentException("Invalid Gen3 decoration category.") };
    }
    private static LocalizedText[] Names => [new("桌子", "Desks", "机"), new("椅子", "Chairs", "椅子"), new("植物", "Plants", "植物"), new("摆设", "Ornaments", "置物"), new("地毯", "Mats", "マット"), new("海报", "Posters", "ポスター"), new("玩偶", "Dolls", "ぬいぐるみ"), new("坐垫", "Cushions", "クッション")];
    private static bool Allowed(int category, int value) => value == 0 || (value is >= 1 and <= (int)Decoration3.REGISTEEL_DOLL && (int)((Decoration3)value).GetCategory() == category);
    public static Decoration3Catalog Read(SaveFile save)
    {
        var s = Save(save); var zh = Util.GetStringList("decoration3", "zh-Hans"); var en = Util.GetStringList("decoration3", "en"); var ja = Util.GetStringList("decoration3", "ja");
        var result = new Decoration3Category[8]; var names = Names;
        for (int c = 0; c < 8; c++)
        {
            var values = Slots(s, c).ToArray().Select(v => (int)v).ToArray();
            var choices = Enumerable.Range(0, (int)Decoration3.REGISTEEL_DOLL + 1).Where(v => Allowed(c, v)).Select(v => new OriginChoice(v, new(zh[v], en[v], ja[v]))).ToArray();
            result[c] = new(c, names[c], values, choices);
        }
        return new(s.State.Exportable && SaveChecksums.Valid(s), result);
    }
    internal static byte[] Snapshot(SaveFile save)
    {
        var s = Save(save); var result = new List<byte>(150);
        for (int i = 0; i < 8; i++) foreach (var v in Slots(s, i)) result.Add((byte)v);
        return result.ToArray();
    }
    internal static void Apply(SaveFile save, Decoration3Edit edit)
    {
        var s = Save(save);
        if (!s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Gen3 decoration editing requires valid checksums.");
        var slots = Slots(s, edit.Category);
        if (edit.Slots is null || edit.Slots.Length != slots.Length) throw new ArgumentException("Invalid Gen3 decoration slot count.");
        for (int i = 0; i < slots.Length; i++)
            if (edit.Slots[i] is < 0 or > 255 || (!Allowed(edit.Category, edit.Slots[i]) && edit.Slots[i] != (int)slots[i]))
                throw new ArgumentException("Invalid Gen3 decoration item or category.");
        // Match SaveDecorationCategory: stable compression of empty slots within this category only.
        var next = edit.Slots.Where(v => v != 0).Select(v => (Decoration3)v).ToArray();
        slots.Clear(); next.CopyTo(slots);
    }
    internal static byte[] Edit(byte[] data, Decoration3Edit edit)
    {
        if (data.Length is 0 or > (32 * 1024 * 1024)) throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s = Save(SaveUtil.GetSaveFile(data.ToArray()) ?? throw new ArgumentException("Unrecognized save."));
        Apply(s, edit); var expected = Snapshot(s); var output = s.Write().ToArray();
        var check = Save(SaveUtil.GetSaveFile(output.ToArray()) ?? throw new InvalidOperationException("Gen3 decoration output was not recognized."));
        if (output.Length != data.Length || check.GetType() != s.GetType() || check.Version != s.Version || check.SaveRevision != s.SaveRevision
            || !SaveChecksums.Valid(check) || !expected.SequenceEqual(Snapshot(check))) throw new InvalidOperationException("Gen3 decoration export verification failed.");
        return output;
    }
}
public static partial class SaveService
{
    public static string ReadDecorations3(byte[] data) => JsonSerializer.Serialize(Decoration3Editing.Read(Open(data)), SaveJsonContext.Default.Decoration3Catalog);
    public static byte[] EditDecorations3(byte[] data, string json)
    {
        if (json.Length > 2048) throw new ArgumentException("Gen3 decoration request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Decoration3Edit) ?? throw new ArgumentException("Missing Gen3 decoration edit.");
        return Decoration3Editing.Edit(data, edit);
    }
}
