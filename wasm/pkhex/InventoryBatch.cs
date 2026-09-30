// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record BagOperation(int Pouch, string Action, int? Count = null, string Language = "en", bool Shuffle = false, bool Advanced = false, int[]? ApricornValues = null);

internal static class InventoryBatch
{
    internal static bool CanGive(SaveFile save, InventoryPouch pouch) => save is SAV8LA || pouch.Type is not (InventoryType.PCItems or InventoryType.FreeSpace);

    public static string Apply(SaveFile save, BagOperation edit)
    {
        if (edit.Action is "apricornEdit" or "apricornFill" or "apricornClear")
        {
            ApricornInventory.Apply(save, edit);
            return InventoryEditing.Snapshot(save);
        }
        if (edit.ApricornValues is not null) throw new ArgumentException("Apricorn values require an apricorn action.");
        var bag = save.Inventory;
        if ((uint)edit.Pouch >= bag.Pouches.Count) throw new ArgumentException("Inventory pouch is out of range.");
        var pouch = bag.Pouches[edit.Pouch];
        if (edit.Language is not ("zh-Hans" or "en" or "ja")) throw new ArgumentException("Inventory sort language is unsupported.");
        bool quantity = edit.Action is "giveAll" or "setCount";
        if (quantity && ((!edit.Advanced && !CanGive(save,pouch)) || edit.Count is null or < 1 || edit.Count > pouch.MaxCount))
            throw new ArgumentException("Inventory bulk quantity is out of range or unsupported in this pouch.");
        if (!quantity && edit.Count.HasValue) throw new ArgumentException("This inventory action does not accept a quantity.");
        if (edit.Shuffle && (edit.Action != "giveAll" || !pouch.IsCramped))
            throw new ArgumentException("Random selection is only available for a cramped pouch.");
        if (edit.Action is not ("sortName" or "sortNameReverse" or "sortCount" or "sortCountReverse" or "sortId" or "sortIdReverse" or "giveAll" or "setCount" or "clear"))
            throw new ArgumentException("Inventory action is unsupported.");
        return InventoryEditing.Transform(save,bag,() => {
            switch(edit.Action)
            {
                case "sortName": case "sortNameReverse":
                    var names = GameInfo.GetStrings(edit.Language).GetItemStrings(save.Context,save.Version).ToArray();
                    for(int i=0;i<names.Length;i++) if(string.IsNullOrEmpty(names[i])) names[i] = $"(Item #{i:000})";
                    pouch.SortByName(names, edit.Action == "sortNameReverse"); break;
                case "sortCount": case "sortCountReverse": pouch.SortByCount(edit.Action == "sortCountReverse"); break;
                case "sortId": case "sortIdReverse": pouch.SortByIndex(edit.Action == "sortIdReverse"); break;
                case "setCount": pouch.ModifyAllCount(bag,edit.Count!.Value); break;
                case "clear": pouch.RemoveAll(); break;
                case "giveAll":
                    var ids = pouch.GetAllItems().ToArray();
                    if(edit.Shuffle) Util.Rand.Shuffle(ids);
                    pouch.GiveAllItems(bag,ids,edit.Count!.Value); break;
            }
        });
    }
}
