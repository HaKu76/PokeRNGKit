// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Medals5EditingTests
{
    private static void Check(bool ok, string message) { if (!ok) throw new Exception(message); }
    private static void Reject(Action action) { try { action(); throw new Exception("Invalid Medals5 request accepted"); } catch (ArgumentException) {} }
    private static SAV5B2W2 Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray()) as SAV5B2W2 ?? throw new Exception("Medals fixture not recognized");
    private static Medals5Catalog Read(byte[] data) => JsonSerializer.Deserialize(SaveService.ReadMedals5(data), SaveJsonContext.Default.Medals5Catalog)!;
    private static Medals5Preview Preview(byte[] data, Medals5Edit e) => JsonSerializer.Deserialize(SaveService.PreviewMedals5(data, JsonSerializer.Serialize(e, SaveJsonContext.Default.Medals5Edit)), SaveJsonContext.Default.Medals5Preview)!;
    private static void Compare(byte[] data, Medals5Edit e, Action<SAV5B2W2> oracle)
    {
        var original = data.ToArray(); var expected = Open(data); oracle(expected); var p = Preview(data, e);
        var output = SaveService.EditMedals5(data, JsonSerializer.Serialize(p.Request, SaveJsonContext.Default.Medals5Edit));
        Check(output.SequenceEqual(expected.Write().ToArray()), "Medals full-file source oracle, protected bytes and checksums");
        Check(data.SequenceEqual(original), "Medals original immutable");
        Check(p.Result.SourceHash == Br4Editing.Hash(output) && p.Request.TargetHash == p.Result.SourceHash, "Medals frozen full-file hash");
        Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0, data.Length).Where(i => data[i] != output[i])), "Medals complete changed offsets");
        Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output), "Medals complete export");
    }
    public static void Run()
    {
        foreach (var version in new[] { GameVersion.B2, GameVersion.W2 }) {
            var save = Open(File.ReadAllBytes(".tmp/pkhex-fixtures/B2.sav")); save.Version = version; var b = save.Medals; b.Data.Fill(0xA5);
            for (int i = 0; i < 255; i++) { var m = b[i]; m.RawDate = i % 3 == 0 ? (ushort)0 : i % 3 == 1 ? (ushort)0xFFFF : (ushort)0xA5A5; b.Data[i * 4 + 2] = (byte)(0xF8 | (i % 8)); }
            b.Data[0x3FE] = 9; b.Data[0x494] = 3; b.Data[0x495] = 255;
            var data = save.Write().ToArray(); var original = data.ToArray(); var c = Read(data);
            Check(c.Medals.Length == 255 && c.Habitats.Length == 90 && c.Medals.Any(m => m.State > 4) && c.Medals.Any(m => m.HasDate && !m.ValidDate), "Medals unknown states and invalid dates readable");
            Check(c.Medals[0].Name.Zh == "开始的一步" && c.Medals[254].Name.En == "Supreme Challenger" && c.Medals.All(m => m.Name.Ja.Length > 0 && m.Type.Zh.Length > 0), "Medals all three-language names and types");
            Check(c.Settings.TutorialRaw == 9 && c.Settings.ViewedRaw == 3 && c.Settings.CaptureRaw == 255 && data.SequenceEqual(original), "Medals raw flags and immutable read");
            var hash = c.SourceHash; var date = new DateOnly(2000, 2, 29); const string today = "2000-02-29";
            for (int state = 0; state <= 4; state++) {
                var patches = Enumerable.Range(0, 255).Select(i => new Medal5Patch(i, State:state, Unread:(i & 1) == 0)).ToArray();
                Compare(data, new("patch", hash, Medals:patches, Today:today), s => { for (int i = 0; i < 255; i++) { var m = s.Medals[i]; m.State = (MedalState5)state; if (m.CanHaveDate && !m.HasDate) m.Date = date; m.IsUnread = (i & 1) == 0; } });
            }
            foreach (var d in new[] { "2000-01-01", "2000-02-29", "2099-12-31" }) {
                var patches = Enumerable.Range(0, 255).Select(i => new Medal5Patch(i, State:4, Date:d)).ToArray();
                Compare(data, new("patch", hash, Medals:patches, Today:today), s => { for (int i = 0; i < 255; i++) { var m = s.Medals[i]; m.State = MedalState5.Obtained; m.Date = DateOnly.Parse(d); } });
            }
            Compare(data, new("patch", hash, Medals:[new(1, Unread:false)]), s => { var m = s.Medals[1]; m.IsUnread = false; });
            var automatic = Preview(data, new("patch", hash, Medals:[new(0, State:2)]));
            Check(automatic.Request.Today is not null && automatic.Result.Medals[0].Date == automatic.Request.Today, "Medals automatic local date frozen in request");
            var missingDate = automatic.Request with { Today = null };
            Reject(() => SaveService.EditMedals5(data, JsonSerializer.Serialize(missingDate, SaveJsonContext.Default.Medals5Edit)));
            Compare(data, new("giveAll", hash, Today:today), s => s.Medals.GiveAll(date));
            Compare(data, new("calculateRank", hash), s => s.Medals.Rank = s.Medals.CalculateRank());
            foreach (int count in new[] { 0, 49, 50, 99, 100, 149, 150, 199, 200, 255 }) {
                var rankSave = Open(data); rankSave.Medals.AllMedals.Clear(); for (int i = 0; i < count; i++) { var m = rankSave.Medals[i]; m.State = MedalState5.Obtained; }
                var rankData = rankSave.Write().ToArray(); var rc = Read(rankData); Compare(rankData, new("calculateRank", rc.SourceHash), s => s.Medals.Rank = s.Medals.CalculateRank());
            }
            for (int status = 0; status <= 3; status++) {
                var patches = Enumerable.Range(0, 90).Select(i => new Habitat5Patch(i, status, status, status, status % 2 == 0)).ToArray();
                Compare(data, new("patch", hash, Habitats:patches), s => { for (int i = 0; i < 90; i++) { var h = s.Medals.HabitatList.GetHabitat(i); h.Grass = h.Surf = h.Fish = (HabitatCompletion5)status; h.IsComplete = status % 2 == 0; } });
            }
            foreach (string action in new[] { "complete", "clear" }) foreach (var indices in new[] { new[] { 0, 89 }, Enumerable.Range(0, 90).ToArray() })
                Compare(data, new(action, hash, Indices:indices), s => { foreach (int i in indices) { var h = s.Medals.HabitatList.GetHabitat(i); if (action == "complete") h.SetComplete(); else h.Clear(); } });
            foreach (int endpoint in new[] { 0, 1 }) {
                var settings = new Medals5SettingsPatch(endpoint * 255, endpoint * 4, endpoint == 1, endpoint * 65535, endpoint * 255, endpoint * 2, endpoint == 1, endpoint == 1);
                Compare(data, new("patch", hash, Settings:settings), s => { var m = s.Medals; var h = m.HabitatList; m.PinnedMedal = (byte)(endpoint * 255); m.Rank = (MedalRank5)(endpoint * 4); m.IsTutorialComplete = endpoint == 1; h.Unknown90 = (ushort)(endpoint * 65535); h.Unknown92 = (byte)(endpoint * 255); h.LastEncounterType = (HabitatEncounterType5)(endpoint * 2); h.IsTutorialViewed = h.IsTutorialCompleteCapture = endpoint == 1; });
            }
            var exported = SaveService.ExportMedals5(data); Check(exported.Length == 1020 && exported.SequenceEqual(Open(data).Medals.AllMedals.ToArray()), "Medals exact ml5 export excludes settings/habitat");
            var imported = Enumerable.Range(0, 1020).Select(i => (byte)i).ToArray(); Compare(data, new("import", hash, DataBase64:Convert.ToBase64String(imported)), s => imported.CopyTo(s.Medals.AllMedals));
            var patch = new Medals5Edit("patch", hash, Medals:[new(0, State:4)], Today:today);
            foreach (var bad in new[] { patch with { SourceHash = new string('0',64) }, patch with { TargetHash = new string('0',64) }, patch with { Medals = [new(-1, State:0)] }, patch with { Medals = [new(255, State:0)] }, patch with { Medals = [new(0, State:5)] }, patch with { Medals = [new(0, State:0), new(0, State:1)] }, patch with { Medals = [new(0, State:0, Date:today)] }, patch with { Today = "2100-01-01" }, new("patch", hash, Settings:new(Rank:5)), new("patch", hash, Settings:new(Unknown90:65536)), new("patch", hash, Settings:new(LastEncounter:3)), new("patch", hash, Habitats:[new(90, Grass:0)]), new("patch", hash, Habitats:[new(0, Fish:4)]), new("clear", hash, Indices:[]), new("complete", hash, Indices:[1,1]), new("import", hash, DataBase64:Convert.ToBase64String(new byte[1024])), new("giveAll", hash, Settings:new(Rank:0), Today:today), new("calculateRank", hash, Today:today) }) Reject(() => Preview(data,bad));
            foreach (string invalid in new[] { "1999-12-31", "2100-01-01", "2001-02-29", "", "garbage" }) Reject(() => Preview(data, patch with { Medals = [new(0, State:4, Date:invalid)] }));
            Reject(() => SaveService.EditMedals5(data, JsonSerializer.Serialize(patch, SaveJsonContext.Default.Medals5Edit)));
            var corrupted = data.ToArray(); corrupted[0x100] ^= 1; var cc = Read(corrupted); Check(!cc.CanEdit,"Medals checksum gate"); Reject(() => Preview(corrupted,patch with { SourceHash = cc.SourceHash }));
            Check(data.SequenceEqual(original), "Medals rejects preserve original");
            Console.WriteLine($"PASS {version}: all 255 medals/90 habitats, raw states/dates/reserved bits, three-language resources, settings/rank thresholds, frozen automatic dates, source batches and exact ml5, full-file oracle and atomic rejection");
        }
        Reject(() => SaveService.ReadMedals5(File.ReadAllBytes(".tmp/pkhex-fixtures/B.sav")));
    }
}
