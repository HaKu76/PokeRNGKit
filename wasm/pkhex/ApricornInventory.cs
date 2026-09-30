// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record ApricornItem(int Index, int Id, LocalizedText Name, int Count, string Sprite);

internal static class ApricornInventory
{
    // SAV_Apricorn uses storage order, not numeric item order: yellow precedes blue.
    private static ReadOnlySpan<int> ItemIds => [485, 487, 486, 488, 489, 490, 491];

    public static ApricornItem[] Read(SAV4HGSS save)
    {
        var zh = GameInfo.GetStrings("zh-Hans").Item;
        var en = GameInfo.GetStrings("en").Item;
        var ja = GameInfo.GetStrings("ja").Item;
        var items = new ApricornItem[7];
        for (int i = 0; i < items.Length; i++)
        {
            int id = ItemIds[i];
            items[i] = new(i, id, new(zh[id], en[id], ja[id]), save.GetApricornCount(i), InventoryReader.Sprite(id, save.Context));
        }
        return items;
    }

    public static void Apply(SaveFile save, BagOperation edit)
    {
        if (save is not SAV4HGSS hgss || edit.Pouch != -1 || edit.Count is not null || edit.Shuffle || edit.Advanced || edit.Language is not ("zh-Hans" or "en" or "ja"))
            throw new ArgumentException("Apricorn action is unavailable or contains unrelated fields.");
        if (edit.Action == "apricornEdit")
        {
            if (edit.ApricornValues is not { Length: 7 } values || values.Any(v => v is < 0 or > 255))
                throw new ArgumentException("Seven apricorn counts between 0 and 255 are required.");
            for (int i = 0; i < 7; i++) hgss.SetApricornCount(i, values[i]);
        }
        else
        {
            if (edit.ApricornValues is not null || edit.Action is not ("apricornFill" or "apricornClear"))
                throw new ArgumentException("Apricorn action is invalid.");
            for (int i = 0; i < 7; i++) hgss.SetApricornCount(i, edit.Action == "apricornFill" ? 99 : 0);
        }
    }
}
