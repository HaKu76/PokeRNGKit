// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record Medal5Entry(int Index, LocalizedText Name, LocalizedText Type, int State,
    bool Unread, bool CanHaveDate, bool HasDate, bool ValidDate, string? Date, string RawHex);
public sealed record Habitat5Entry(int Index, int Grass, int Surf, int Fish, bool Complete, int Raw);
public sealed record Medals5Settings(int Pinned, int Rank, int CalculatedRank, bool Tutorial, int TutorialRaw,
    int Unknown90, int Unknown92, int LastEncounter, bool Viewed, int ViewedRaw, bool Capture, int CaptureRaw);
public sealed record Medals5Catalog(bool CanEdit, string SourceHash, Medal5Entry[] Medals,
    Habitat5Entry[] Habitats, Medals5Settings Settings, string RawHex);
public sealed record Medal5Patch(int? Index, int? State = null, bool? Unread = null, string? Date = null);
public sealed record Habitat5Patch(int? Index, int? Grass = null, int? Surf = null, int? Fish = null, bool? Complete = null);
public sealed record Medals5SettingsPatch(int? Pinned = null, int? Rank = null, bool? Tutorial = null,
    int? Unknown90 = null, int? Unknown92 = null, int? LastEncounter = null, bool? Viewed = null, bool? Capture = null);
public sealed record Medals5Edit(string Action, string? SourceHash, Medal5Patch[]? Medals = null,
    Habitat5Patch[]? Habitats = null, Medals5SettingsPatch? Settings = null, int[]? Indices = null,
    string? DataBase64 = null, string? Today = null, string? TargetHash = null);
public sealed record Medals5Preview(Medals5Edit Request, Medals5Catalog Result, int[] ChangedOffsets);
internal static class Medals5Editing
{
    private static SAV5B2W2 Save(SaveFile save) => save as SAV5B2W2 ?? throw new ArgumentException("Medals5 tools are unavailable for this format.");
    private static DateOnly ParseDate(string value)
    {
        if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            || !EncounterDate.IsValidDateNDS(date)) throw new ArgumentException("Invalid Medals5 date.");
        return date;
    }
    private static LocalizedText Text(string resource, int index)
    {
        string Get(string lang) => Util.GetStringList(resource, lang)[index];
        return new(Get("zh-Hans"), Get("en"), Get("ja"));
    }
    internal static Medals5Catalog Read(SaveFile save, string hash)
    {
        var s = Save(save); var b = s.Medals; var h = b.HabitatList;
        var medals = Enumerable.Range(0, 255).Select(i => {
            var m = b[i]; string? date = null; bool valid = false;
            if (m.HasDate) { try { var d = m.Date; valid = EncounterDate.IsValidDateNDS(d); date = d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture); } catch (ArgumentOutOfRangeException) {} }
            return new Medal5Entry(i, Text("medals", i), Text("medal_types", (int)MedalList5.GetMedalType(i)),
                (int)m.State, m.IsUnread, m.CanHaveDate, m.HasDate, valid, date, Convert.ToHexString(b.AllMedals.Slice(i * 4, 4)));
        }).ToArray();
        var habitats = Enumerable.Range(0, 90).Select(i => { var v = h.GetHabitat(i); return new Habitat5Entry(i, (int)v.Grass, (int)v.Surf, (int)v.Fish, v.IsComplete, v.Value); }).ToArray();
        return new(s.State.Exportable && SaveChecksums.Valid(s), hash, medals, habitats,
            new(b.PinnedMedal, (int)b.Rank, (int)b.CalculateRank(), b.IsTutorialComplete, b.Data[0x3FE],
                h.Unknown90, h.Unknown92, (int)h.LastEncounterType, h.IsTutorialViewed, b.Data[0x494], h.IsTutorialCompleteCapture, b.Data[0x495]), Convert.ToHexString(b.Data));
    }
    internal static Medals5Edit Freeze(Medals5Edit e)
    {
        if (e.Action == "giveAll" || e.Medals?.Any(m => m?.State is not null) == true)
            return e with { Today = e.Today ?? EncounterDate.GetDateNDS().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) };
        if (e.Today is not null) throw new ArgumentException("Unexpected Medals5 automatic date.");
        return e;
    }
    private static void ValidateActionFields(Medals5Edit e)
    {
        bool patch = e.Action == "patch", import = e.Action == "import", range = e.Action is "complete" or "clear";
        if (!patch && (e.Medals is not null || e.Habitats is not null || e.Settings is not null)
            || !import && e.DataBase64 is not null || !range && e.Indices is not null)
            throw new ArgumentException("Invalid Medals5 action fields.");
    }
    internal static byte[] Prepare(SaveFile save, Medals5Edit e, string hash, int sourceLength)
    {
        var s = Save(save);
        if (!s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Medals5 editing requires valid checksums.");
        if (e.SourceHash != hash || e.SourceHash?.Length != 64) throw new ArgumentException("Medals5 preview is stale. Read it again.");
        ValidateActionFields(e);
        var copy = (SAV5B2W2)s.Clone(); var b = copy.Medals; var h = b.HabitatList;
        DateOnly? today = e.Today is null ? null : ParseDate(e.Today);
        switch (e.Action) {
            case "patch":
                if (e.Medals is null && e.Habitats is null && e.Settings is null) throw new ArgumentException("Empty Medals5 patch.");
                if (e.Medals is {} medals) {
                    if (medals.Length is 0 or >255 || medals.Any(v => v is null || v.Index is null or <0 or >=255 || v.State is <0 or >4 || v.State is null && v.Unread is null && v.Date is null) || medals.Select(v => v.Index).Distinct().Count() != medals.Length) throw new ArgumentException("Invalid Medals5 medal fields.");
                    foreach (var v in medals) {
                        var m = b[v.Index!.Value];
                        if (v.State is {} state) { m.State = (MedalState5)state; if (m.CanHaveDate && !m.HasDate) m.Date = today ?? throw new ArgumentException("Missing Medals5 automatic date."); }
                        if (v.Unread is {} unread) m.IsUnread = unread;
                        if (v.Date is {} date) { if (!m.CanHaveDate) throw new ArgumentException("Medals5 date is not editable in this state."); m.Date = ParseDate(date); }
                    }
                }
                if (e.Habitats is {} habitats) {
                    if (habitats.Length is 0 or >90 || habitats.Any(v => v is null || v.Index is null or <0 or >=90 || v.Grass is <0 or >3 || v.Surf is <0 or >3 || v.Fish is <0 or >3 || v.Grass is null && v.Surf is null && v.Fish is null && v.Complete is null) || habitats.Select(v => v.Index).Distinct().Count() != habitats.Length) throw new ArgumentException("Invalid Medals5 habitat fields.");
                    foreach (var v in habitats) { var x = h.GetHabitat(v.Index!.Value); if (v.Grass is {} grass) x.Grass = (HabitatCompletion5)grass; if (v.Surf is {} surf) x.Surf = (HabitatCompletion5)surf; if (v.Fish is {} fish) x.Fish = (HabitatCompletion5)fish; if (v.Complete is {} complete) x.IsComplete = complete; }
                }
                if (e.Settings is {} settings) {
                    if (settings.Pinned is <0 or >255 || settings.Rank is <0 or >4 || settings.Unknown90 is <0 or >65535 || settings.Unknown92 is <0 or >255 || settings.LastEncounter is <0 or >2 || settings == new Medals5SettingsPatch()) throw new ArgumentException("Invalid Medals5 settings.");
                    if (settings.Pinned is {} pinned) b.PinnedMedal = (byte)pinned;
                    if (settings.Rank is {} rank) b.Rank = (MedalRank5)rank;
                    if (settings.Tutorial is {} tutorial) b.IsTutorialComplete = tutorial;
                    if (settings.Unknown90 is {} unknown90) h.Unknown90 = (ushort)unknown90;
                    if (settings.Unknown92 is {} unknown92) h.Unknown92 = (byte)unknown92;
                    if (settings.LastEncounter is {} encounter) h.LastEncounterType = (HabitatEncounterType5)encounter;
                    if (settings.Viewed is {} viewed) h.IsTutorialViewed = viewed;
                    if (settings.Capture is {} capture) h.IsTutorialCompleteCapture = capture;
                }
                break;
            case "giveAll": b.GiveAll(today ?? throw new ArgumentException("Missing Medals5 automatic date.")); break;
            case "calculateRank": b.Rank = b.CalculateRank(); break;
            case "import":
                if (e.DataBase64 is null || e.DataBase64.Length != 1360) throw new ArgumentException("Invalid Medals5 import size.");
                byte[] imported; try { imported = Convert.FromBase64String(e.DataBase64); } catch (FormatException) { throw new ArgumentException("Invalid Medals5 import data."); }
                if (imported.Length != MedalList5.LengthAllMedals) throw new ArgumentException("Invalid Medals5 import size.");
                imported.CopyTo(b.AllMedals); break;
            case "complete": case "clear":
                if (e.Indices is not {} indices || indices.Length is 0 or >90 || indices.Any(i => i is <0 or >=90) || indices.Distinct().Count() != indices.Length) throw new ArgumentException("Invalid Medals5 habitat range.");
                foreach (int i in indices) { var x = h.GetHabitat(i); if (e.Action == "complete") x.SetComplete(); else x.Clear(); } break;
            default: throw new ArgumentException("Invalid Medals5 action.");
        }
        var expected = b.Data.ToArray(); var output = copy.Write().ToArray(); var check = SaveUtil.GetSaveFile(output.ToArray()) as SAV5B2W2;
        if (check is null || check.Version != copy.Version || output.Length != sourceLength || !SaveChecksums.Valid(check) || !check.Medals.Data.SequenceEqual(expected)) throw new InvalidOperationException("Medals5 export verification failed.");
        if (e.TargetHash is {} target && target != Br4Editing.Hash(output)) throw new ArgumentException("Medals5 preview target is stale.");
        return output;
    }
}
public static partial class SaveService
{
    private static Medals5Edit ParseMedals5(string json) => json.Length > 100000 ? throw new ArgumentException("Medals5 request is too large.") : JsonSerializer.Deserialize(json, SaveJsonContext.Default.Medals5Edit) ?? throw new ArgumentException("Missing Medals5 edit.");
    public static string ReadMedals5(byte[] data) => JsonSerializer.Serialize(Medals5Editing.Read(Open(data), Br4Editing.Hash(data)), SaveJsonContext.Default.Medals5Catalog);
    public static string PreviewMedals5(byte[] data, string json) { var e = Medals5Editing.Freeze(ParseMedals5(json)); var output = Medals5Editing.Prepare(Open(data), e, Br4Editing.Hash(data), data.Length); var hash = Br4Editing.Hash(output); return JsonSerializer.Serialize(new Medals5Preview(e with { TargetHash = hash }, Medals5Editing.Read(Open(output), hash), Enumerable.Range(0, data.Length).Where(i => data[i] != output[i]).ToArray()), SaveJsonContext.Default.Medals5Preview); }
    public static byte[] EditMedals5(byte[] data, string json) { var e = ParseMedals5(json); if (e.TargetHash?.Length != 64) throw new ArgumentException("Medals5 editing requires a frozen preview."); if (Medals5Editing.Freeze(e) != e) throw new ArgumentException("Missing Medals5 frozen automatic date."); return Medals5Editing.Prepare(Open(data), e, Br4Editing.Hash(data), data.Length); }
    public static byte[] ExportMedals5(byte[] data) => (Open(data) as SAV5B2W2 ?? throw new ArgumentException("Medals5 tools are unavailable for this format.")).Medals.AllMedals.ToArray();
}
