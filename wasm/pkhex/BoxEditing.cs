// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record BoxEdit(int Box, string? Name, int? Wallpaper, int? Unlocked = null, int[]? Flags = null, int? SwapWith = null, string? Batch = null, bool All = false, bool Reverse = false, string? Language = null);
public sealed record BoxOptions(bool CanName, int NameLength, LocalizedText[] Wallpapers, int? Unlocked, int[] Flags, int FlagMaximum, bool CanSwap, BoxBatchChoice[] BatchActions);

internal static class BoxEditing
{
    // PKHeX.WinForms/Subforms/Save Editors/Gen6/SAV_BoxLayout.cs.
    public static BoxOptions Options(SaveFile save)
    {
        if(!save.HasBox)return new(false,0,[],null,[],0,false,[]);
        var length = save.Generation switch
        {
            2 when save is SAV2 { Japanese: false, Korean: false } => 16,
            3 when save is SAV3RSBox => 8 + SAV3RSBox.BoxNamePrefix,
            6 or 7 => 14,
            >= 8 => 16,
            _ => 8,
        };
        var count = save is not IBoxDetailWallpaper ? 0 : save.Generation switch
        {
            3 when save is SAV3 or SAV3RSBox => 16,
            4 or 5 or 6 => 24,
            7 => 16,
            8 when save is SAV8BS => 32,
            8 => 19,
            9 => 20,
            _ => 0,
        };
        var named = save.Generation < 8 || save is SAV8BS;
        var wallpapers = Enumerable.Range(0, count).Select(i => named
            ? new LocalizedText(GameInfo.GetStrings("zh-Hans").wallpapernames[i],
                GameInfo.GetStrings("en").wallpapernames[i], GameInfo.GetStrings("ja").wallpapernames[i])
            : new LocalizedText($"壁纸 {i + 1}", $"Wallpaper {i + 1}", $"壁紙 {i + 1}")).ToArray();
        return new(save is IBoxDetailName, length, wallpapers, save.BoxesUnlocked < 0 ? null : save.BoxesUnlocked,
            Array.ConvertAll(save.BoxFlags, b => (int)b), save is SAV8SWSH or SAV8LA ? 1 : 255, save.BoxCount > 1, BoxBatch.Choices(save));
    }

    public static void Apply(SaveFile save, BoxEdit edit)
    {
        if ((uint)edit.Box >= save.BoxCount)
            throw new ArgumentException("Invalid box position.");
        if (edit.Batch is not null) { BoxBatch.Apply(save, edit); return; }
        if (edit.All || edit.Reverse || edit.Language is not null) throw new ArgumentException("Invalid box batch values.");
        var options = Options(save);
        // Validate the complete request before changing any field. Raw untouched values are omitted.
        if (edit.Unlocked is { } unlocked && (options.Unlocked is null || (uint)unlocked > save.BoxCount))
            throw new ArgumentException("Invalid box layout values.");
        if (edit.Flags is { } flags && (flags.Length == 0 || flags.Length != options.Flags.Length || flags.Any(f => (uint)f > options.FlagMaximum)))
            throw new ArgumentException("Invalid box layout values.");
        if (edit.Wallpaper is { } wp && (save is not IBoxDetailWallpaper || (uint)wp >= options.Wallpapers.Length))
            throw new ArgumentException("Invalid box wallpaper.");
        if (edit.Name is { } candidate && (save is not IBoxDetailName || candidate.Length > options.NameLength || candidate.Any(char.IsControl)))
            throw new ArgumentException("Invalid box name.");
        if (edit.SwapWith is { } target)
        {
            if (!options.CanSwap || (uint)target >= save.BoxCount || target == edit.Box || edit.Name is not null || edit.Wallpaper is not null || edit.Unlocked is not null || edit.Flags is not null)
                throw new ArgumentException("Invalid box layout values.");
            if (!save.SwapBox(edit.Box, target)) throw new ArgumentException("Storage slot is locked.");
            return;
        }
        if (edit.Name is { } name)
        {
            if (save is not IBoxDetailName names || name.Length > options.NameLength || name.Any(char.IsControl))
                throw new ArgumentException("Invalid box name.");
            names.SetBoxName(edit.Box, name);
            if (names.GetBoxName(edit.Box) != DisplayName(save, edit.Box, name))
                throw new ArgumentException("This game cannot represent the requested box name.");
        }
        if (edit.Wallpaper is { } wallpaper)
        {
            if (save is not IBoxDetailWallpaper backgrounds || (uint)wallpaper >= options.Wallpapers.Length)
                throw new ArgumentException("Invalid box wallpaper.");
            backgrounds.SetBoxWallpaper(edit.Box, wallpaper);
        }
        if (edit.Flags is { } values) save.BoxFlags = Array.ConvertAll(values, value => (byte)value);
        // Match desktop save ordering: Gen VI count updates the final-box bit after raw flags.
        if (edit.Unlocked is { } count) save.BoxesUnlocked = count;
    }

    public static string Snapshot(SaveFile save)
    {
        var result = new List<string> { save.BoxesUnlocked.ToString(), Convert.ToHexString(save.BoxFlags), save.CurrentBox.ToString() };
        for (int box = 0; box < save.BoxCount; box++)
        {
            result.Add(save is IBoxDetailNameRead n ? Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(n.GetBoxName(box))) : "");
            result.Add(save is IBoxDetailWallpaper w ? w.GetBoxWallpaper(box).ToString() : "");
            for (int slot = 0; slot < save.BoxSlotCount; slot++)
            {
                var p = save.GetBoxSlotAtIndex(box, slot);
                result.Add(Convert.ToHexString(p.Data[..p.SIZE_STORED]));
                result.Add(((int)save.GetBoxSlotFlags(box, slot)).ToString());
            }
        }
        return string.Join('|', result);
    }

    public static void Verify(SaveFile save, BoxEdit edit)
    {
        if ((edit.Name is { } name && ((IBoxDetailNameRead)save).GetBoxName(edit.Box) != DisplayName(save, edit.Box, name)) ||
            (edit.Wallpaper is { } wallpaper && ((IBoxDetailWallpaper)save).GetBoxWallpaper(edit.Box) != wallpaper))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
    }

    // BoxLayout8b.GetBoxName displays a default when the stored string is empty.
    private static string DisplayName(SaveFile save, int box, string name) =>
        save is SAV8BS && name.Length == 0 ? BoxDetailNameExtensions.GetDefaultBoxName(box) : name;
}
