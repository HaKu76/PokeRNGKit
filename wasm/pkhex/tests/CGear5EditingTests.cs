// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;

internal static class CGear5EditingTests
{
    private static void Check(bool ok, string message) { if (!ok) throw new Exception(message); }
    private static void Reject(Action action)
    {
        try { action(); throw new Exception("Invalid CGear5 request accepted"); }
        catch (ArgumentException) { }
    }
    private static SAV5 Open(byte[] bytes) => SaveUtil.GetSaveFile(bytes.ToArray()) as SAV5 ?? throw new Exception("Gen5 fixture not recognized");
    private static CGear5Catalog Read(byte[] bytes) => JsonSerializer.Deserialize(SaveService.ReadCGear5(bytes), SaveJsonContext.Default.CGear5Catalog)!;
    private static CGear5Preview Preview(byte[] bytes, CGear5Edit edit) => JsonSerializer.Deserialize(
        SaveService.PreviewCGear5(bytes, JsonSerializer.Serialize(edit, SaveJsonContext.Default.CGear5Edit)), SaveJsonContext.Default.CGear5Preview)!;
    private static byte[] Apply(byte[] bytes, CGear5Edit edit)
    {
        var original = bytes.ToArray();
        var preview = Preview(bytes, edit);
        var output = SaveService.EditCGear5(bytes, JsonSerializer.Serialize(preview.Request, SaveJsonContext.Default.CGear5Edit));
        Check(bytes.SequenceEqual(original), "CGear original immutable");
        Check(Br4Editing.Hash(output) == preview.Request.TargetHash, "CGear frozen complete output");
        Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output), "CGear full export parity");
        return output;
    }
    private static CGearBackground Background(SAV5 save, byte[] raw) => save is SAV5BW ? new CGearBackgroundBW(raw) : new CGearBackgroundB2W2(raw);
    private static byte[] BitmapBytes(byte[] rgba)
    {
        var result = new byte[rgba.Length];
        for (int i = 0; i < rgba.Length; i += 4)
            WriteUInt32LittleEndian(result.AsSpan(i), ((uint)rgba[i + 3] << 24) | ((uint)rgba[i] << 16) | ((uint)rgba[i + 1] << 8) | rgba[i + 2]);
        return result;
    }
    private static byte[] Pixels(bool manyColors = false, bool manyTiles = false)
    {
        var pixels = new byte[256 * 192 * 4];
        var random = new Random(500);
        for (int y = 0; y < 192; y++) for (int x = 0; x < 256; x++)
        {
            int i = (y * 256 + x) * 4;
            int color = manyTiles ? random.Next(16) : manyColors ? (x + y) % 30 : ((x / 8 + y / 8) % 3);
            pixels[i] = (byte)(color == 0 ? 255 : manyColors || manyTiles ? color * 8 : 0);
            pixels[i + 1] = (byte)(color == 1 ? 255 : 0);
            pixels[i + 2] = (byte)(color == 2 ? 255 : 0);
            pixels[i + 3] = (byte)(x == 0 ? 0 : 255);
        }
        return pixels;
    }
    public static void Run()
    {
        foreach (var version in new[] { GameVersion.B, GameVersion.W, GameVersion.B2, GameVersion.W2 })
        {
            string file = version is GameVersion.B or GameVersion.W ? "B" : "B2";
            var s = Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{file}.sav")); s.Version = version;
            var initial = s.Write().ToArray();
            var initialCopy = initial.ToArray(); var c = Read(initial);
            Check(c.Extension == (s is SAV5BW ? "psk" : "cgb"), "CGear game extension");
            Check(initial.SequenceEqual(initialCopy), "CGear read immutable");
            // Read all-zero, all-FF and mixed zero/FF skins without initializing download records.
            foreach (int fill in new[] { 0, 255, -1 })
            {
                var empty = Open(initial);
                for (int i = 0; i < empty.CGearSkinData.Length; i++) empty.CGearSkinData.Span[i] = fill == -1 ? (i % 2 == 0 ? (byte)0 : (byte)255) : (byte)fill;
                var raw = empty.Write().ToArray(); var copy = raw.ToArray(); var catalog = Read(raw);
                Check(catalog.Uninitialized && catalog.Pixels is null && !catalog.Renderable && raw.SequenceEqual(copy), "CGear empty raw preservation");
                Reject(() => SaveService.ExportCGear5(raw));
            }
            foreach (var pixels in new[] { Pixels(), Pixels(manyColors: true), Pixels(manyTiles: true) })
            {
                var source = Open(initial); var bg = Background(source, source.CGearSkinData.ToArray());
                var stats = bg.SetImageData(BitmapBytes(pixels)); source.SetCGearSkin(bg.Data);
                var expected = source.Write().ToArray();
                var edit = new CGear5Edit("image", c.SourceHash, Convert.ToBase64String(pixels));
                var preview = Preview(initial, edit); var output = Apply(initial, edit);
                Check(output.SequenceEqual(expected), "CGear bitmap/Core whole-file parity including metadata/footer/other sections");
                Check(preview.Colors == stats.ColorCount && preview.Tiles == stats.TileCount, "CGear source statistics");
                if (pixels.SequenceEqual(Pixels(manyTiles: true))) Check(preview.Tiles > 255, "CGear overflow retained and previewed");
                var renderedArgb = bg.GetImageData(); var renderedRgba = Convert.FromBase64String(preview.Result.Pixels!);
                Check(BitmapBytes(renderedRgba).SequenceEqual(renderedArgb), "CGear exact BGRA/RGBA channel order");
                int changes = 0; for (int i = 0; i < pixels.Length; i += 4) if (!pixels.AsSpan(i, 4).SequenceEqual(renderedRgba.AsSpan(i, 4))) changes++;
                Check(preview.PixelChanges == changes && changes > 0, "CGear transparent pixels/quantization preview");
                Check(preview.ChangedOffsets.SequenceEqual(Enumerable.Range(0, initial.Length).Where(i => initial[i] != output[i])), "CGear all output changes including general checksums");
                Check(SaveService.ExportCGear5(output).SequenceEqual(bg.Data.ToArray()), "CGear exact skin export");
                Check(preview.Result.HasSkin && preview.Result.DownloadCount == 1 && preview.Result.DownloadState == 0xC21E, "CGear source metadata updates");
            }
            // Raw same-game/cross-game formats preserve all other sections and use source layout conversion.
            foreach (bool bw in new[] { false, true })
            {
                CGearBackground rawBg = bw ? new CGearBackgroundBW(new byte[0x2600]) : new CGearBackgroundB2W2(new byte[0x2600]);
                rawBg.SetImageData(BitmapBytes(Pixels()));
                var imported = rawBg.Data.ToArray();
                var source = Open(initial); var converted = Background(source, imported.ToArray());
                bool shifted = PaletteTileSelection.IsPaletteShiftFormat(converted.Arrange);
                if (source is SAV5BW && !shifted) PaletteTileSelection.ConvertToShiftFormat<CGearBackgroundBW>(converted.Arrange);
                else if (source is SAV5B2W2 && shifted) PaletteTileSelection.ConvertFromShiftFormat(converted.Arrange);
                source.SetCGearSkin(converted.Data);
                var edit = new CGear5Edit("raw", c.SourceHash, Convert.ToBase64String(imported));
                Check(Apply(initial, edit).SequenceEqual(source.Write().ToArray()), "CGear both raw formats whole-file parity");
                Check(imported.SequenceEqual(rawBg.Data.ToArray()), "CGear source raw immutable");
            }
            var good = new CGear5Edit("image", c.SourceHash, Convert.ToBase64String(Pixels()));
            var malformed = Open(initial);
            var badLayout = Background(malformed, new byte[0x2600]);
            badLayout.Colors[0] = 1;
            badLayout.SetArrange(0, malformed is SAV5BW
                ? PaletteTileSelection.ComposeSelection(CGearBackgroundBW.GetLayoutIndex(255), 0, 10)
                : (ushort)255);
            malformed.SetCGearSkin(badLayout.Data);
            var malformedBytes = malformed.Write().ToArray(); var malformedCopy = malformedBytes.ToArray();
            var malformedRead = Read(malformedBytes);
            Check(!malformedRead.Uninitialized && !malformedRead.Renderable && malformedRead.Pixels is null,
                "CGear malformed stored layout remains browsable");
            Check(SaveService.ExportCGear5(malformedBytes).SequenceEqual(badLayout.Data.ToArray()) && malformedBytes.SequenceEqual(malformedCopy),
                "CGear malformed raw export preserves original");
            Check(Read(Apply(malformedBytes, good with { SourceHash = malformedRead.SourceHash })).Renderable,
                "CGear malformed background can be replaced");
            Reject(() => Preview(initial, good with { Action = "delete" }));
            Reject(() => Preview(initial, good with { SourceHash = new string('0', 64) }));
            Reject(() => Preview(initial, good with { Data = "not base64" }));
            Reject(() => Preview(initial, good with { Data = Convert.ToBase64String(new byte[196607]) }));
            Reject(() => Preview(initial, good with { Action = "raw" }));
            Reject(() => Preview(initial, good with { Data = new string('A', 270001) }));
            Reject(() => SaveService.EditCGear5(initial, JsonSerializer.Serialize(good, SaveJsonContext.Default.CGear5Edit)));
            Reject(() => Apply(initial, good with { TargetHash = new string('0', 64) }));
            var corrupt = initial.ToArray(); corrupt[0x100] ^= 1;
            var badCatalog = Read(corrupt); Check(!badCatalog.CanEdit, "CGear invalid checksums disable edits");
            Reject(() => Preview(corrupt, good with { SourceHash = Br4Editing.Hash(corrupt) }));
            Check(initial.SequenceEqual(initialCopy), "CGear rejection atomicity");
            Console.WriteLine($"PASS {version}: C-Gear images/raw formats, source capacity results, color channels, full files/footer/metadata, immutable reads and frozen/rejected edits");
        }
        Reject(() => SaveService.ReadCGear5(File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav")));
    }
}
