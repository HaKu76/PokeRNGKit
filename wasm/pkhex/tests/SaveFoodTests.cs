// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class SaveFoodTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static Puff6 Puff(SaveFile save) => ((ISaveBlock6Main)save).Puff;
    private static byte[] Apply(byte[] data, SaveFoodEdit edit)
    {
        var original = data.ToArray();
        try { return SaveService.EditFood(data, JsonSerializer.Serialize(edit, SaveJsonContext.Default.SaveFoodEdit)); }
        finally { Check(data.SequenceEqual(original), "Food request preserves input, including rejected edits"); }
    }
    private static void Reject(byte[] data, SaveFoodEdit edit)
    {
        try { Apply(data, edit); throw new Exception("Invalid food request accepted"); } catch (ArgumentException) { }
    }
    public static void Run()
    {
        foreach (var version in new[] { "X", "OR", "SN", "US" })
        {
            var data = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var save = SaveUtil.GetSaveFile(data.ToArray())!; bool puffs = save is SAV6;
            if (puffs) { Puff(save).SetPuffs(Enumerable.Range(0,100).Select(i => (byte)((99-i)%27)).ToArray()); Puff(save).PuffCount = 19; }
            else for (int i = 0; i < 15; i++) ((SAV7)save).ResortSave.SetPokebeanCount(i, i * 17);
            data = save.Write().ToArray();
            var catalog = JsonSerializer.Deserialize(SaveService.ReadFood(data), SaveJsonContext.Default.SaveFoodCatalog)!;
            Check(catalog.Values.Length == (puffs ? 100 : 15) && catalog.Names.Length == (puffs ? 27 : 15), "Complete food catalog");
            Check(catalog.Names.All(n => !string.IsNullOrWhiteSpace(n.Zh) && !string.IsNullOrWhiteSpace(n.En) && !string.IsNullOrWhiteSpace(n.Ja)), "Three language food names");
            // Check every valid value across all positions, including count boundaries.
            for (int value = 0; value <= (puffs ? 26 : 255); value++)
            {
                var values = Enumerable.Repeat(value, catalog.Values.Length).ToArray();
                int? count = puffs ? value % 2 == 0 ? 0 : 100 : null;
                var expected = SaveUtil.GetSaveFile(data.ToArray())!;
                if (puffs) { Puff(expected).SetPuffs(values.Select(x => (byte)x).ToArray()); Puff(expected).PuffCount = count!.Value; }
                else ((SAV7)expected).ResortSave.GetBeans().Fill((byte)value);
                var output = Apply(data, new("edit", values, count));
                Check(output.SequenceEqual(expected.Write().ToArray()), "Every food value matches full Core output");
            }
            foreach (var action in puffs ? new[] { "reset", "sort", "reverse", "fill", "best" } : new[] { "fill", "clear" })
            {
                var output = Apply(data, new(action)); var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Check(after.ChecksumsValid, "Food checksum round trip");
                var expected = SaveUtil.GetSaveFile(data.ToArray())!;
                if (puffs)
                {
                    var actual = Puff(after).GetPuffs().ToArray(); var target = Puff(expected);
                    if (action == "reset") target.Reset();
                    else if (action is "sort" or "reverse") target.Sort(action == "reverse");
                    else
                    {
                        Check(Puff(after).PuffCount == 100, "Filled puff count");
                        Check(action == "best" ? actual.All(v => v is 21 or 22) : actual.Order().SequenceEqual(Enumerable.Range(0,100).Select(i => (byte)(i % 26 + 1)).Order()), "Core random fill distribution");
                        target.SetPuffs(actual); target.PuffCount = 100;
                    }
                }
                else { var target = ((SAV7)expected).ResortSave; if (action == "fill") target.FillBeans(); else target.ClearBeans(); }
                Check(output.SequenceEqual(expected.Write().ToArray()), "Bulk food operation changes only Core target bytes");
            }
            foreach (var edit in new[] { new SaveFoodEdit("edit"), new("edit", []), new("unknown"), new("fill", catalog.Values),
                new("edit", Enumerable.Repeat(-1, catalog.Values.Length).ToArray(), catalog.Count),
                new("edit", Enumerable.Repeat(256, catalog.Values.Length).ToArray(), catalog.Count),
                new("edit", catalog.Values, puffs ? 101 : 0), new(puffs ? "clear" : "best") }) Reject(data, edit);
            if (puffs)
            {
                // Preserve abnormal existing values; reject introducing one in another slot.
                Puff(save).GetPuffs()[0] = 255; Puff(save).PuffCount = -1; var odd = save.Write().ToArray();
                var values = SaveFood.Read(save).Values; values[1] = 26;
                var output = Apply(odd, new("edit", values, -1));
                var after = SaveUtil.GetSaveFile(output.ToArray())!;
                Check(Puff(after).GetPuffs()[0] == 255 && Puff(after).PuffCount == -1 && Puff(after).GetPuffs()[1] == 26, "Untouched unusual puff and count preserved");
                values[1] = 255; Reject(odd, new("edit", values, -1));
                Reject(data, new("edit", catalog.Values));
            }
            Console.WriteLine($"PASS {version}: complete food catalog, all values, bulk operations, full-file Core comparison, rejection and original preservation");
        }
        foreach (var version in new[] { "HG", "B", "B2", "GP" })
        {
            var data = File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            try { SaveService.ReadFood(data); throw new Exception("Unsupported food read accepted"); } catch (ArgumentException) { }
            Reject(data, new("fill"));
        }
    }
}
