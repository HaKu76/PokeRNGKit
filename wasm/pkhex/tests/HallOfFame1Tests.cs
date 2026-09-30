// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;

internal static class HallOfFame1Tests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static SAV1 Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray()) as SAV1 ?? throw new Exception("Hall fixture not recognized");
    private static void Reject(Action action) { try { action(); throw new Exception("Invalid Hall operation accepted"); } catch (ArgumentException) { } }
    private static byte[] Apply(byte[] input, Hall1Edit edit)
    {
        var original = input.ToArray();
        try { return SaveService.EditHall1(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.Hall1Edit)); }
        finally { Check(input.SequenceEqual(original), "Original remains immutable"); }
    }
    private static void Compare(byte[] input, Hall1Edit edit, Action<SAV1> change)
    {
        var expected = Open(input); change(expected);
        var output = Apply(input, edit);
        Check(output.SequenceEqual(expected.Write().ToArray()), "Full file differs from independent/Core oracle");
        Check(SaveChecksums.Valid(Open(output)), "Output checksum");
        Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output), "Exact working-copy download");
    }
    public static void Run()
    {
        foreach (var lang in new[] { LanguageID.English, LanguageID.Japanese })
        foreach (var version in new[] { GameVersion.RB, GameVersion.YW })
        {
            bool jp = lang == LanguageID.Japanese;
            var s = new SAV1(lang, version); var p = s.BlankPKM;
            p.Species = 25; p.CurrentLevel = 7; p.Nickname = jp ? "ピカ" : "PIKA";
            s.SetBoxSlotAtIndex(p, 0, 0); s.PartyData = [p];
            s.Data[jp ? 0x29B9 : 0x29C3] = version == GameVersion.YW ? (byte)0x54 : (byte)0x99;
            s.Data[jp ? 0x2712 : 0x271C] = version == GameVersion.YW ? (byte)1 : (byte)0;
            s.HallOfFame.Clear(); s.HallOfFameCount = 49;
            for (int t = 0; t < 50; t++) for (int i = 0; i < 6; i++)
            {
                var m = s.HallOfFame.GetEntity(t, i); m.Species = (ushort)(1 + (t * 6 + i) % 151);
                m.Level = (byte)(t + i); m.Nickname = jp ? "ア" : "A";
                m.Data[^1] = (byte)(t * 6 + i); // Per-slot trailing bytes must survive edits.
            }
            var input = s.Write().ToArray(); var before = input.ToArray();
            var catalog = HallOfFame1.Read(Open(input));
            var apiCatalog = JsonSerializer.Deserialize(SaveService.ReadHall1(input), SaveJsonContext.Default.Hall1Catalog)!;
            Check(apiCatalog.SpeciesChoices.Length == 151 && apiCatalog.SpeciesChoices[24].Id == 25 && apiCatalog.SpeciesChoices[24].Name.Zh == GameInfo.GetStrings("zh-Hans").specieslist[25], "API catalog contains localized species choices");
            Check(apiCatalog.Teams[49].Members[5] == catalog.Teams[49].Members[5], "API includes last team and last member");
            Reject(() => SaveService.EditHall1(input, new string(' ',4097)));
            Check(catalog.Teams.Length == 50 && catalog.Teams.All(t => t.Members.Length == 6 && t.Count == 6), "All teams and slots exposed");
            Check(catalog.Count == 49 && catalog.NicknameLength == (jp ? 5 : 10) && catalog.CanEdit, "Count and regional capability");
            Check(before.SequenceEqual(input), "Catalog is read-only");
            for (int t = 0; t < 50; t++) for (int i = 0; i < 6; i++)
            {
                int offset = 0x598 + (t * 6 + i) * 16;
                Compare(input, new("member", t, i, Fields: new(Level: 255)), x => x.Data[offset + 1] = 255);
            }
            foreach (int count in new[] { 0, 49, 50, 255 })
            {
                Compare(input, new("count", Count: count), x => x.Data[jp ? 0x2844 : 0x284E] = (byte)count);
                var seed = Open(input); seed.HallOfFameCount = (byte)count; var data = seed.Write().ToArray();
                Compare(data, new("registerParty"), x => x.HallOfFameCount = x.HallOfFame.RegisterParty(x, (byte)count));
                var added = Open(Apply(data, new("registerParty")));
                int last = count >= 50 ? 49 : count;
                Check(added.HallOfFameCount == (count >= 50 ? 50 : count + 1), "Register count transition");
                Check(added.HallOfFame.GetEntity(last, 0).Nickname == p.Nickname && added.HallOfFame.GetEntity(last, 0).Level == 7, "Actual party member copied");
                Check(added.HallOfFame.GetTeamMemberCount(last) == 1, "Remaining party members cleared");
            }
            foreach (int team in new[] { 1, 25, 49 })
                Compare(input, new("deleteTeam", team), x => x.HallOfFame.Delete(team));
            Compare(input, new("clearSlot", 49, 5), x => x.HallOfFame.GetEntity(49, 5).Clear());
            Compare(input, new("member", 0, 0, Fields: new(Species: 0)), x => x.HallOfFame.GetEntity(0, 0).Clear());
            Compare(input, new("clearAll"), x => { x.HallOfFame.Clear(); x.HallOfFameCount = 0; });
            var hole = Open(Apply(input, new("clearSlot", 0, 1)));
            Check(HallOfFame1.Read(hole).Teams[0].Count == 1 && !hole.HallOfFame.GetEntity(0, 2).IsEmpty, "Hole does not erase trailing members");
            string name = new(jp ? 'ア' : 'A', jp ? 5 : 10);
            Compare(input, new("member", 0, 0, Fields: new(Nickname: name)), x => { var member = x.HallOfFame.GetEntity(0, 0); member.Nickname = name; });
            var unchanged = catalog.Teams[0].Members[0].Nickname;
            Compare(input, new("member", 0, 0, Fields: new(Nickname: unchanged)), _ => { });
            string hex = new('A', jp ? 12 : 22);
            Compare(input, new("member", 0, 0, Fields: new(NicknameHex: hex)), x => x.HallOfFame.GetEntity(0, 0).NicknameTrash.Fill(0xAA));
            Compare(input, new("member", 0, 0, Fields: new(Species: 25, DefaultNickname: true)), x =>
            {
                var m = x.HallOfFame.GetEntity(0, 0); m.Species = 25;
                m.Nickname = SpeciesName.GetSpeciesNameGeneration(25, x.Language, 1);
            });
            Hall1Edit[] invalid = [new("bad"), new("member"), new("member", -1, 0, Fields: new(Level: 1)), new("member", 50, 0, Fields: new(Level: 1)),
                new("member", 0, 6, Fields: new(Level: 1)), new("member", 0, 0, Fields: new()), new("member", 0, 0, Fields: new(Level: 256)),
                new("member", 0, 0, Fields: new(Species: 152)), new("member", 0, 0, Fields: new(Species: 0, Level: 1)),
                new("member", 0, 0, Fields: new(Nickname: name + name)), new("member", 0, 0, Fields: new(Nickname: "汉")),
                new("member", 0, 0, Fields: new(NicknameHex: "ZZ")), new("member", 0, 0, Fields: new(Nickname: "A", NicknameHex: hex)),
                new("member", 0, 0, Fields: new(DefaultNickname: false)), new("count", Count: -1), new("count", Count: 256),
                new("clearSlot", 0, 0), new("deleteTeam", 0), new("clearAll", Count: 0), new("registerParty", Slot: 0)];
            foreach (var bad in invalid)
            {
                Reject(() => Apply(input, bad));
                var working = Open(input); var raw = working.Data.ToArray();
                Reject(() => HallOfFame1.Apply(working, bad));
                Check(raw.SequenceEqual(working.Data.ToArray()), "Rejected operation is atomic");
            }
            var corrupt = input.ToArray(); corrupt[jp ? 0x3594 : 0x3523] ^= 1;
            Check(!HallOfFame1.Read(Open(corrupt)).CanEdit, "Corrupt file is read-only");
            Reject(() => Apply(corrupt, new("clearAll")));
            Console.WriteLine($"PASS Hall1 {lang}/{version}: all 300 slots, byte counts and levels, regional names/raw bytes, party rollover, deletion, holes, full output, atomic rejection and original preservation");
        }
        Reject(() => HallOfFame1.Read(new SAV6XY()));
    }
}
