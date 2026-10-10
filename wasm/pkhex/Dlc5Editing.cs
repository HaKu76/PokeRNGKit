// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using static System.Buffers.Binary.BinaryPrimitives;

namespace PokeRNGKit.SaveEditor;

public sealed record Dlc5Member(int Slot, ushort Species, PokemonEntry? Pokemon);
public sealed record Dlc5Team(int Index, string Name, int StoredCount, Dlc5Member[] Members);
public sealed record Dlc5Slot(string Kind, int Index, string Extension, int Size, int[] ImportSizes,
    bool Uninitialized, bool CanExport, string Name, string Description, string About,
    bool? Valid, int? Magic, int? Flags, ushort? DownloadState, uint? DownloadCount, Dlc5Team[] Teams);
public sealed record Dlc5Catalog(bool CanEdit, string SourceHash, Dlc5Slot[] Slots);
public sealed record Dlc5Edit(string Kind, int? Index, string? SourceHash, string? Data,
    string? FileName = null, string? TargetHash = null);
public sealed record Dlc5Export(string Kind, int? Index, bool? Decrypted);
public sealed record Dlc5Preview(Dlc5Edit Request, Dlc5Slot Result, int InputSize,
    bool? InputDecrypted, int[] ChangedOffsets);
public sealed record Dlc5File(string FileName, string Data);

internal static class Dlc5Editing
{
    private static SAV5 Save(SaveFile save) => save is SAV5BW or SAV5B2W2
        ? (SAV5)save : throw new ArgumentException("Dlc5 tools are unavailable for this format.");
    private static int Index(SAV5 s, string kind, int? index)
    {
        int count = kind switch {
            "video" => 4, "memory" => 2, "musical" or "dexSkin" or "battleTest" => 1,
            "pwt" when s is SAV5B2W2 => 3, "movie" when s is SAV5B2W2 => 8,
            _ => throw new ArgumentException("Invalid Dlc5 group for this game.") };
        if (index is null || index < 0 || index >= count) throw new ArgumentException("Invalid Dlc5 slot.");
        return index.Value;
    }
    private static byte[] Raw(SAV5 s, string kind, int? index)
    {
        int i = Index(s, kind, index);
        return kind switch {
            "video" => s.GetBattleVideo(i).ToArray(), "memory" => (i == 0 ? s.Link1Data : s.Link2Data).ToArray(),
            "musical" => s.MusicalDownloadData.ToArray(), "dexSkin" => s.PokedexSkinData.ToArray(),
            "battleTest" => s.BattleTest.ToArray(), "pwt" => ((SAV5B2W2)s).GetPWT(i).ToArray(),
            "movie" => ((SAV5B2W2)s).GetPokestarMovie(i).ToArray(), _ => throw new ArgumentException("Invalid Dlc5 group.") };
    }
    private static ExtDataSectionNote5? Note(string kind, int i) => kind switch {
        "video" => ExtDataSectionNote5.BattleVideo0 + i, "pwt" => ExtDataSectionNote5.PWT1 + i,
        "movie" => ExtDataSectionNote5.Movie1 + i, "musical" => ExtDataSectionNote5.Musical,
        "dexSkin" => ExtDataSectionNote5.PokedexSkin, "battleTest" => ExtDataSectionNote5.BattleTest, _ => null };
    private static Span<byte> Team(BattleVideo5 v, int i) => i switch {
        0 => v.Team1, 1 => v.Team2, 2 => v.Team3, 3 => v.Team4, _ => throw new ArgumentOutOfRangeException(nameof(i)) };
    private static Dlc5Team[] Teams(BattleVideo5 v)
    {
        v.Decrypt(); var result = new Dlc5Team[4];
        for (int t = 0; t < 4; t++) {
            // Core GetTeam selects Trainer instead of Team. Use the actual team span and Core inflater.
            var span = Team(v, t); int stored = span[2]; var members = new Dlc5Member[Math.Min(stored, 6)];
            for (int i = 0; i < members.Length; i++) {
                var p = new PK5(); BattleVideo5.InflateToPK5(span.Slice(4 + i * BattleVideo5.SizeVideoPoke, BattleVideo5.SizeVideoPoke), p.Data);
                PokemonEntry? entry = null;
                if (p.Species is > 0 and <= 649) {
                    try { entry = PokemonReader.Read(p, -1, i); }
                    catch (ArgumentException) { }
                    catch (IndexOutOfRangeException) { }
                }
                members[i] = new(i, p.Species, entry);
            }
            result[t] = new(t, v.GetTrainerName(t), stored, members);
        }
        return result;
    }
    internal static Dlc5Slot Slot(SAV5 s, string kind, int index)
    {
        var raw = Raw(s, kind, index); bool empty = !raw.AsSpan().ContainsAnyExcept<byte>(0, 255);
        string extension = kind switch { "video" => "bv5", "memory" => "ml5", "musical" => "pms", "dexSkin" => "pds", "battleTest" => "bt5", "pwt" => "pwt", _ => "psm5" };
        int[] sizes = kind switch { "pwt" => [raw.Length, 0x1314], "musical" => [raw.Length, 0x17D78], "dexSkin" => [raw.Length, 0x6200], _ => [raw.Length] };
        string name = "", description = "", about = ""; bool? valid = null; int? magic = null, flags = null; Dlc5Team[] teams = [];
        if (kind == "pwt") { var p = new WorldTournament5(raw); name = p.Name; description = p.Description; about = p.About; valid = p.Checksum == Checksums.CRC16_CCITT(raw.AsSpan(0, raw.Length - 4)); }
        if (kind == "musical") name = s.Musical.MusicalName;
        if (kind == "video" && !empty) {
            var v = new BattleVideo5(raw) { IsDecrypted = BattleVideo5.GetIsDecrypted(raw) }; v.Decrypt();
            valid = BattleVideo5.IsValid(raw) && v.Seed == Checksums.CRC16_CCITT(v.DecryptedChecksumRegion);
            name = v.VideoName; teams = Teams(v);
        }
        if (kind == "battleTest") { var test = new BattleTest5(raw); magic = test.Magic; flags = test.Flags; valid = test.Magic == BattleTest5.Sentinel && test.Checksum == test.CalculateChecksum(); }
        var note = Note(kind, index); ushort? state = null; uint? count = null;
        if (note is {} n) {
            // B2W2's getter incorrectly stops at HallOfFame, unlike its writer and declared movie/PWT fields.
            if (s is SAV5B2W2 && n > ExtDataSectionNote5.HallOfFame) {
                state = ReadUInt16LittleEndian(s.PlayerData.Data[(0x30 + (int)n * 2)..]);
                count = ReadUInt32LittleEndian(s.PlayerData.Data[(0x5C + (int)n * 4)..]);
            } else { var pair = s.PlayerData.GetExtData(n); state = pair.Item1; count = pair.Item2; }
        }
        return new(kind, index, extension, raw.Length, sizes, empty, kind != "dexSkin" || !empty,
            name, description, about, valid, magic, flags, state, count, teams);
    }
    internal static Dlc5Catalog Read(SaveFile save, string hash)
    {
        var s = Save(save); var slots = new List<Dlc5Slot>();
        foreach (string kind in new[] { "video", "memory", "musical", "dexSkin", "battleTest", "pwt", "movie" }) {
            if (s is not SAV5B2W2 && kind is "pwt" or "movie") continue;
            int count = kind switch { "video" => 4, "memory" => 2, "pwt" => 3, "movie" => 8, _ => 1 };
            for (int i = 0; i < count; i++) slots.Add(Slot(s, kind, i));
        }
        return new(s.State.Exportable && SaveChecksums.Valid(s), hash, slots.ToArray());
    }
    internal static string MusicalName(string fileName)
    {
        var name = Path.GetFileNameWithoutExtension(fileName).Trim();
        int split = name.LastIndexOf(" - ", StringComparison.Ordinal);
        if (split >= 0 && split + 3 < name.Length) name = name.AsSpan()[(split + 3)..].Trim().ToString();
        int suffix = name.LastIndexOf(" (", StringComparison.Ordinal);
        if (suffix > 0 && name[^1] == ')') {
            var tag = name.AsSpan()[(suffix + 2)..^1];
            if (tag.Length is >= 2 and <= 5 && !tag.ContainsAnyExceptInRange('A', 'Z')) name = name.AsSpan()[..suffix].TrimEnd().ToString();
        }
        if (name.Length > Musical5.MusicalNameMaxLength) name = name.AsSpan()[..Musical5.MusicalNameMaxLength].TrimEnd().ToString();
        return name;
    }
    internal static (byte[] Output, int InputSize, bool? Decrypted) Prepare(SaveFile save, Dlc5Edit edit, string hash, int sourceLength)
    {
        var s = Save(save); int i = Index(s, edit.Kind, edit.Index);
        if (!s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Dlc5 editing requires valid checksums.");
        if (edit.SourceHash != hash || edit.SourceHash?.Length != 64) throw new ArgumentException("Dlc5 preview is stale. Read it again.");
        if (edit.Data is null || edit.Data.Length > 180000 ||
            edit.Kind == "musical" && (string.IsNullOrEmpty(edit.FileName) || edit.FileName.Length > 1024 || edit.FileName.Contains('\0')) ||
            edit.Kind != "musical" && edit.FileName is not null) throw new ArgumentException("Invalid Dlc5 import fields.");
        byte[] raw;
        try { raw = Convert.FromBase64String(edit.Data); } catch (FormatException) { throw new ArgumentException("Invalid Dlc5 binary."); }
        var slot = Slot(s, edit.Kind, i); int inputSize = raw.Length;
        if (!slot.ImportSizes.Contains(inputSize)) throw new ArgumentException("Invalid Dlc5 file size.");
        Array.Resize(ref raw, slot.Size); var copy = (SAV5)s.Clone(); bool? decrypted = null;
        switch (edit.Kind) {
            case "video":
                decrypted = BattleVideo5.GetIsDecrypted(raw);
                var v = new BattleVideo5(raw) { IsDecrypted = decrypted.Value }; v.Encrypt();
                if (!v.IsUninitialized) v.RefreshChecksums(); copy.SetBattleVideo(i, raw); break;
            case "pwt": ((SAV5B2W2)copy).SetPWT(i, raw); break;
            case "movie": ((SAV5B2W2)copy).SetPokestarMovie(i, raw); break;
            case "memory": if (i == 0) copy.SetLink1Data(raw); else copy.SetLink2Data(raw); break;
            case "musical": copy.SetMusical(raw); copy.Musical.MusicalName = new MusicalShow5(raw).IsUninitialized ? "" : MusicalName(edit.FileName!); break;
            case "dexSkin": copy.SetPokeDexSkin(raw); break;
            case "battleTest":
                var test = new BattleTest5(raw); if (!test.IsUninitialized) { test.Magic = BattleTest5.Sentinel; test.RefreshChecksums(); }
                copy.SetBattleTest(raw); break;
        }
        var expected = Raw(copy, edit.Kind, i); var output = copy.Write().ToArray();
        var check = SaveUtil.GetSaveFile(output.ToArray()) as SAV5;
        if (check is null || check.GetType() != copy.GetType() || check.Version != copy.Version || output.Length != sourceLength ||
            !SaveChecksums.Valid(check) || !expected.SequenceEqual(Raw(check, edit.Kind, i))) throw new InvalidOperationException("Dlc5 export verification failed.");
        if (edit.TargetHash is {} target && target != Br4Editing.Hash(output)) throw new ArgumentException("Dlc5 preview target is stale.");
        return (output, inputSize, decrypted);
    }
    internal static Dlc5File Export(SaveFile save, Dlc5Export query)
    {
        var s = Save(save); int i = Index(s, query.Kind, query.Index);
        if (query.Decrypted is null || query.Kind != "video" && query.Decrypted.Value) throw new ArgumentException("Invalid Dlc5 export mode.");
        var slot = Slot(s, query.Kind, i); if (!slot.CanExport) throw new ArgumentException("Dlc5 skin is uninitialized.");
        var raw = Raw(s, query.Kind, i);
        if (query.Decrypted.Value && !slot.Uninitialized) { var v = new BattleVideo5(raw) { IsDecrypted = BattleVideo5.GetIsDecrypted(raw) }; v.Decrypt(); }
        return new($"{query.Kind}-{i + 1}{(query.Decrypted.Value ? "-decrypted" : "")}.{slot.Extension}", Convert.ToBase64String(raw));
    }
}
public static partial class SaveService
{
    private static Dlc5Edit ParseDlc5(string json) => json.Length > 1200000
        ? throw new ArgumentException("Dlc5 request is too large.")
        : JsonSerializer.Deserialize(json, SaveJsonContext.Default.Dlc5Edit) ?? throw new ArgumentException("Missing Dlc5 edit.");
    public static string ReadDlc5(byte[] data) => JsonSerializer.Serialize(Dlc5Editing.Read(Open(data), Br4Editing.Hash(data)), SaveJsonContext.Default.Dlc5Catalog);
    public static string PreviewDlc5(byte[] data, string json)
    {
        var edit = ParseDlc5(json); var (output, size, decrypted) = Dlc5Editing.Prepare(Open(data), edit, Br4Editing.Hash(data), data.Length);
        var result = Dlc5Editing.Slot((SAV5)Open(output), edit.Kind, edit.Index!.Value);
        return JsonSerializer.Serialize(new Dlc5Preview(edit with { TargetHash = Br4Editing.Hash(output) }, result, size, decrypted,
            Enumerable.Range(0, data.Length).Where(i => data[i] != output[i]).ToArray()), SaveJsonContext.Default.Dlc5Preview);
    }
    public static byte[] EditDlc5(byte[] data, string json)
    {
        var edit = ParseDlc5(json); if (edit.TargetHash?.Length != 64) throw new ArgumentException("Dlc5 editing requires a frozen preview.");
        return Dlc5Editing.Prepare(Open(data), edit, Br4Editing.Hash(data), data.Length).Output;
    }
    public static string ExportDlc5(byte[] data, string json)
    {
        if (json.Length > 1024) throw new ArgumentException("Dlc5 export query is too large.");
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Dlc5Export) ?? throw new ArgumentException("Missing Dlc5 export query.");
        return JsonSerializer.Serialize(Dlc5Editing.Export(Open(data), query), SaveJsonContext.Default.Dlc5File);
    }
}
