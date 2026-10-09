// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record CGear5Catalog(bool CanEdit, string SourceHash, string Extension,
    bool Uninitialized, bool HasSkin, ushort Checksum, ushort DownloadState, uint DownloadCount,
    string Raw, string? Pixels, bool Renderable);
public sealed record CGear5Edit(string Action, string? SourceHash, string? Data, string? TargetHash = null);
public sealed record CGear5Preview(CGear5Edit Request, CGear5Catalog Result,
    int? Colors, int? Tiles, int? PixelChanges, int[] ChangedOffsets);

internal static class CGear5Editing
{
    internal const int PixelBytes = CGearBackground.Width * CGearBackground.Height * 4;
    private static SAV5 Save(SaveFile save) => save is SAV5BW or SAV5B2W2
        ? (SAV5)save : throw new ArgumentException("CGear5 tools are unavailable for this format.");
    internal static CGearBackground Background(SAV5 save, byte[] bytes) => save is SAV5BW
        ? new CGearBackgroundBW(bytes) : new CGearBackgroundB2W2(bytes);

    // Browser ImageData uses RGBA. Core and the source Bitmap use little-endian ARGB (BGRA).
    internal static byte[] SwapRedBlue(byte[] bytes)
    {
        var result = bytes.ToArray();
        for (int i = 0; i < result.Length; i += 4)
            (result[i], result[i + 2]) = (result[i + 2], result[i]);
        return result;
    }

    internal static CGear5Catalog Read(SaveFile save, string hash)
    {
        var s = Save(save);
        var raw = s.CGearSkinData.ToArray();
        var bg = Background(s, raw);
        string? pixels = null;
        bool renderable = false;
        if (!bg.IsUninitialized)
        {
            try { pixels = Convert.ToBase64String(SwapRedBlue(bg.GetImageData())); renderable = true; }
            catch (ArgumentException) { } // Preserve malformed stored layouts for raw export and replacement.
        }
        var (state, count) = s.PlayerData.GetExtData(ExtDataSectionNote5.CGearSkin);
        return new(s.State.Exportable && SaveChecksums.Valid(s), hash,
            s is SAV5BW ? CGearBackgroundBW.Extension : CGearBackgroundB2W2.Extension,
            bg.IsUninitialized, s.SkinInfo.HasCGearSkin, s.SkinInfo.CGearSkinChecksum, state, count,
            Convert.ToBase64String(raw), pixels, renderable);
    }

    internal static (byte[] Output, TiledImageStat? Stats, int? PixelChanges) Prepare(
        SaveFile save, CGear5Edit edit, string hash, int sourceLength)
    {
        var s = Save(save);
        if (!s.State.Exportable || !SaveChecksums.Valid(s))
            throw new ArgumentException("CGear5 editing requires valid checksums.");
        if (edit.SourceHash != hash || edit.SourceHash?.Length != 64)
            throw new ArgumentException("CGear5 preview is stale. Read it again.");
        if (edit.Action is not ("raw" or "image") || edit.Data is null || edit.Data.Length > 262144)
            throw new ArgumentException("Invalid CGear5 import fields.");
        byte[] input;
        try { input = Convert.FromBase64String(edit.Data); }
        catch (FormatException) { throw new ArgumentException("Invalid CGear5 import data."); }
        int size = edit.Action == "raw" ? CGearBackground.SIZE : PixelBytes;
        if (input.Length != size) throw new ArgumentException("Invalid CGear5 input size.");

        var copy = (SAV5)s.Clone();
        var bg = Background(copy, edit.Action == "raw" ? input.ToArray() : copy.CGearSkinData.ToArray());
        TiledImageStat? stats = null;
        int? changes = null;
        if (edit.Action == "image")
        {
            stats = bg.SetImageData(SwapRedBlue(input));
            var rendered = SwapRedBlue(bg.GetImageData());
            int changed = 0;
            for (int i = 0; i < input.Length; i += 4)
                if (!input.AsSpan(i, 4).SequenceEqual(rendered.AsSpan(i, 4))) changed++;
            changes = changed;
        }
        else
        {
            bool shifted = PaletteTileSelection.IsPaletteShiftFormat(bg.Arrange);
            if (copy is SAV5BW && !shifted)
                PaletteTileSelection.ConvertToShiftFormat<CGearBackgroundBW>(bg.Arrange);
            else if (copy is SAV5B2W2 && shifted)
                PaletteTileSelection.ConvertFromShiftFormat(bg.Arrange);
        }
        copy.SetCGearSkin(bg.Data); // Includes the ext-section footer, SkinInfo, and PlayerData note.
        var expected = bg.Data.ToArray();
        var output = copy.Write().ToArray();
        var check = SaveUtil.GetSaveFile(output.ToArray()) as SAV5;
        if (check is null || check.GetType() != copy.GetType() || check.Version != copy.Version ||
            output.Length != sourceLength || !SaveChecksums.Valid(check) ||
            !check.CGearSkinData.Span.SequenceEqual(expected))
            throw new InvalidOperationException("CGear5 export verification failed.");
        if (edit.TargetHash is { } target && target != Br4Editing.Hash(output))
            throw new ArgumentException("CGear5 preview target is stale.");
        return (output, stats, changes);
    }
}

public static partial class SaveService
{
    private static CGear5Edit ParseCGear5(string json)
    {
        // System.Text.Json may encode '+' in Base64 as six-character Unicode escapes.
        if (json.Length > 1600000) throw new ArgumentException("CGear5 request is too large.");
        return JsonSerializer.Deserialize(json, SaveJsonContext.Default.CGear5Edit)
            ?? throw new ArgumentException("Missing CGear5 edit.");
    }
    public static string ReadCGear5(byte[] data) => JsonSerializer.Serialize(
        CGear5Editing.Read(Open(data), Br4Editing.Hash(data)), SaveJsonContext.Default.CGear5Catalog);
    public static string PreviewCGear5(byte[] data, string json)
    {
        var edit = ParseCGear5(json);
        var (output, stats, changes) = CGear5Editing.Prepare(Open(data), edit, Br4Editing.Hash(data), data.Length);
        var hash = Br4Editing.Hash(output);
        var preview = new CGear5Preview(edit with { TargetHash = hash }, CGear5Editing.Read(Open(output), hash),
            stats?.ColorCount, stats?.TileCount, changes,
            Enumerable.Range(0, data.Length).Where(i => data[i] != output[i]).ToArray());
        return JsonSerializer.Serialize(preview, SaveJsonContext.Default.CGear5Preview);
    }
    public static byte[] EditCGear5(byte[] data, string json)
    {
        var edit = ParseCGear5(json);
        if (edit.TargetHash?.Length != 64) throw new ArgumentException("CGear5 editing requires a frozen preview.");
        return CGear5Editing.Prepare(Open(data), edit, Br4Editing.Hash(data), data.Length).Output;
    }
    public static byte[] ExportCGear5(byte[] data)
    {
        var catalog = CGear5Editing.Read(Open(data), Br4Editing.Hash(data));
        if (catalog.Uninitialized) throw new ArgumentException("CGear5 skin is uninitialized.");
        return Convert.FromBase64String(catalog.Raw);
    }
}
