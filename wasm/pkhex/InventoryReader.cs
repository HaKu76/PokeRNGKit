// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record BagItem(int Slot, int Id, LocalizedText Name, int Count, int MaxCount, bool Allowed,
    bool? Favorite, bool? IsNew, bool? FreeSpace, uint? FreeSpaceIndex, bool? NewShop, bool? Held, string Sprite);
public sealed record BagChoice(int Id, LocalizedText Name, int MaxCount, string Sprite);
public sealed record BagPouch(int Index, string Type, int MaxCount, BagItem[] Items, BagChoice[] Choices, bool CanGive, bool IsCramped);
public sealed record BagReport(BagPouch[] Pouches, BagChoice[] AdvancedChoices, ApricornItem[]? Apricorns = null);

internal static class InventoryReader
{
    // SAV_Inventory.UpdateSprite + SpriteBuilder.GetItemSprite, classic local sprites.
    internal static string Sprite(int id, EntityContext context)
    {
        if (id == 0) return "";
        if (id is < 0 or > ushort.MaxValue) return "bitem_unk";
        if (context is EntityContext.Gen1 or EntityContext.Gen2 && id > byte.MaxValue) return "bitem_unk";
        int display = ItemConverter.GetItemDisplay(id, context);
        return HeldItemLumpUtil.GetIsLump(display, context) switch
        {
            HeldItemLumpImage.TechnicalMachine => "bitem_tm",
            HeldItemLumpImage.TechnicalRecord => "bitem_tr",
            _ => $"bitem_{display}",
        };
    }

    public static BagReport Read(SaveFile save)
    {
        var bag = save.Inventory;
        var zh = GameInfo.GetStrings("zh-Hans").GetItemStrings(save.Context, save.Version);
        var en = GameInfo.GetStrings("en").GetItemStrings(save.Context, save.Version);
        var ja = GameInfo.GetStrings("ja").GetItemStrings(save.Context, save.Version);
        static string Name(IReadOnlyList<string> names, int id) =>
            (uint)id < names.Count && !string.IsNullOrEmpty(names[id]) ? names[id] : $"#{id}";
        // Read the actual slots without Sanitize, ClearCount0, sorting, or CopyTo.
        return new(bag.Pouches.Select((pouch, index) => new BagPouch(index, pouch.Type.ToString(), pouch.MaxCount,
            pouch.Items.Select((item, slot) => new BagItem(slot, item.Index,
                new(Name(zh, item.Index), Name(en, item.Index), Name(ja, item.Index)),
                item.Count, bag.GetMaxCount(pouch.Type, item.Index),
                item.Index == 0 || (item.Index is > 0 and <= ushort.MaxValue && pouch.CanContain((ushort)item.Index)),
                item is IItemFavorite favorite ? favorite.IsFavorite : null,
                item is IItemNewFlag fresh ? fresh.IsNew : null,
                item is IItemFreeSpace free ? free.IsFreeSpace : null,
                item is IItemFreeSpaceIndex order ? order.FreeSpaceIndex : null,
                item is IItemNewShopFlag shop ? shop.IsNewShop : null,
                item is IItemHeldFlag held ? held.IsHeld : null, Sprite(item.Index,save.Context))).ToArray(),
            new ushort[] { 0 }.Concat(pouch.GetAllItems().ToArray()).Distinct().Select(id =>
                new BagChoice(id, new(Name(zh,id),Name(en,id),Name(ja,id)), id == 0 ? 0 : bag.GetMaxCount(pouch.Type,id), Sprite(id,save.Context))).ToArray(),
            InventoryBatch.CanGive(save,pouch),pouch.IsCramped)).ToArray(),
            Enumerable.Range(0,en.Length).Select(id => new BagChoice(id,
                new(Name(zh,id),Name(en,id),Name(ja,id)),bag.MaxQuantityHaX,Sprite(id,save.Context))).ToArray(),
            save is SAV4HGSS hgss ? ApricornInventory.Read(hgss) : null);
    }
}
