// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
namespace PokeRNGKit.SaveEditor;

public sealed record SaveFoodCatalog(string Kind, int[] Values, int? Count, LocalizedText[] Names, PokeBlocks6Catalog? Blocks = null, FoodCaseCatalog? Case = null);
public sealed record SaveFoodEdit(string Action, int[]? Values = null, int? Count = null, uint[]? BlockValues = null, FoodCaseEdit? Case = null);
internal static class SaveFood
{
    private static Puff6 Puff(SaveFile save) => save switch { SAV6XY s => s.Puff, SAV6AO s => s.Puff, _ => throw new ArgumentException("Food is unavailable for this format.") };
    private static ResortSave7 Resort(SaveFile save) => save switch { SAV7SM s => s.ResortSave, SAV7USUM s => s.ResortSave, _ => throw new ArgumentException("Food is unavailable for this format.") };
    public static SaveFoodCatalog Read(SaveFile save)
    {
        if(FoodCases.Supports(save)) return new("case",[],null,[],Case:FoodCases.Read(save));
        if (save is SAV6XY or SAV6AO)
        {
            var puff = Puff(save);
            var zh = GameInfo.GetStrings("zh-Hans").puffs; var en = GameInfo.GetStrings("en").puffs; var ja = GameInfo.GetStrings("ja").puffs;
            return new("puffs", puff.GetPuffs().ToArray().Select(x => (int)x).ToArray(), puff.PuffCount,
                Enumerable.Range(0, en.Length).Select(i => new LocalizedText(zh[i], en[i], ja[i])).ToArray(), save is SAV6AO oras ? PokeBlocks6.Read(oras) : null);
        }
        var resort = Resort(save);
        string[] zhColors = ["红色", "蓝色", "浅蓝色", "绿色", "黄色", "紫色", "橙色"];
        string[] jaColors = ["赤", "青", "水色", "緑", "黄", "紫", "橙"];
        var names = ResortSave7.GetBeanIndexNames();
        return new("beans", resort.GetBeans().ToArray().Select(x => (int)x).ToArray(), null,
            Enumerable.Range(0, names.Length).Select(i => new LocalizedText(
                i == 14 ? "彩虹宝可豆" : zhColors[i % 7] + (i < 7 ? "宝可豆" : "花纹宝可豆"), names[i],
                i == 14 ? "にじいろポケマメ" : jaColors[i % 7] + (i < 7 ? "のポケマメ" : "のがらつきポケマメ"))).ToArray());
    }
    public static string Snapshot(SaveFile save) => FoodCases.Supports(save) ? FoodCases.Snapshot(save) : save is SAV6AO oras
        ? Convert.ToHexString(oras.Puff.Data) + Convert.ToHexString(oras.Contest.Data) + Convert.ToHexString(oras.BerryField.Data)
        : Convert.ToHexString(save is SAV6XY ? Puff(save).Data : Resort(save).Data);
    public static void Apply(SaveFile save, SaveFoodEdit edit)
    {
        if(edit.Action is "caseEdit" or "caseFill" or "caseClear" or "caseSort") { FoodCases.Apply(save,edit); return; }
        if(edit.Case is not null || FoodCases.Supports(save)) throw new ArgumentException("Food case action is invalid.");
        if (edit.Action is "blocksEdit" or "blocksFill" or "blocksClear" or "berries") { PokeBlocks6.Apply(save, edit); return; }
        if (edit.BlockValues is not null) throw new ArgumentException("Food action contains unrelated fields.");
        var old = Read(save); bool puffs = old.Kind == "puffs";
        if (edit.Action == "edit")
        {
            if (edit.Values is not { } values || values.Length != old.Values.Length ||
                values.Where((v, i) => v < 0 || v > (puffs ? 26 : 255) && v != old.Values[i]).Any() ||
                (puffs ? edit.Count is null || (edit.Count < 0 || edit.Count > 100) && edit.Count != old.Count : edit.Count is not null))
                throw new ArgumentException("Food values are out of range.");
            byte[] bytes = values.Select(v => checked((byte)v)).ToArray();
            if (puffs) { Puff(save).SetPuffs(bytes); Puff(save).PuffCount = edit.Count!.Value; }
            else bytes.CopyTo(Resort(save).GetBeans());
            return;
        }
        if (edit.Values is not null || edit.Count is not null) throw new ArgumentException("Food action contains unrelated fields.");
        if (puffs)
        {
            var puff = Puff(save);
            switch (edit.Action)
            {
                case "reset": puff.Reset(); break;
                case "fill": puff.MaxCheat(); break;
                case "best": puff.MaxCheat(true); break;
                case "sort": puff.Sort(); break;
                case "reverse": puff.Sort(true); break;
                default: throw new ArgumentException("Food action is invalid.");
            }
        }
        else switch (edit.Action)
        {
            case "fill": Resort(save).FillBeans(); break;
            case "clear": Resort(save).ClearBeans(); break;
            default: throw new ArgumentException("Food action is invalid.");
        }
    }
}

public static partial class SaveService
{
    public static string ReadFood(byte[] data) => JsonSerializer.Serialize(SaveFood.Read(Open(data)), SaveJsonContext.Default.SaveFoodCatalog);
    public static byte[] EditFood(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save)) throw new ArgumentException("Editing requires a supported save with valid checksums.");
        if (json.Length > 8192) throw new ArgumentException("Food request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SaveFoodEdit) ?? throw new ArgumentException("Missing food edit.");
        SaveFood.Apply(save, edit);
        var expected = SaveFood.Snapshot(save); var output = save.Write().ToArray(); var check = Open(output);
        if (!SaveChecksums.Valid(check) || check.GetType() != save.GetType() || SaveFood.Snapshot(check) != expected) throw new InvalidOperationException("Food export verification failed.");
        return output;
    }
}
