// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json.Serialization;
namespace PokeRNGKit.SaveEditor;

public sealed record FoodCaseType(int Value, LocalizedText Name);
public sealed record FoodCaseEntry(int Index, int Type, int[] Stats, int Level, bool? New, int? Primary = null, int? Secondary = null, bool? Many = null);
public sealed record FoodCaseCatalog(string Kind, FoodCaseEntry[] Entries, FoodCaseType[] Types);
public sealed record FoodCaseEdit([property: JsonRequired] int Index, [property: JsonRequired] int Type, int[] Stats, int? Level = null, bool? New = null);
internal static class FoodCases
{
    public static bool Supports(SaveFile save) => save is SAV3RS or SAV3E or SAV4DP or SAV4Pt or SAV8BS;
    private static ISaveBlock3LargeHoenn Hoenn(SaveFile save) => save switch { SAV3RS s => s.LargeBlock, SAV3E s => s.LargeBlock, _ => throw new ArgumentException("Food case is unavailable for this format.") };
    private static FoodCaseType[] Types(string resource, bool bdsp = false)
    {
        var zh = Util.GetStringList(resource,"zh-Hans"); var en = Util.GetStringList(resource,"en"); var ja = Util.GetStringList(resource,"ja");
        IEnumerable<int> indices = resource switch { "pokeblock3" => Enum.GetValues<PokeBlock3Color>().Select(v => (int)v), "poffin4" => Enum.GetValues<PoffinFlavor4>().Select(v => (int)v), _ => Enumerable.Range(0,en.Length) };
        return indices.Select(i => {
            int value = bdsp ? i == 0 ? 255 : i - 1 : i;
            LocalizedText name = bdsp && i == 0 ? new(GameInfo.GetStrings("zh-Hans").Item[0],GameInfo.GetStrings("en").Item[0],GameInfo.GetStrings("ja").Item[0])
                : new(string.IsNullOrWhiteSpace(zh[i]) ? $"未定义口味（{value}）" : zh[i],string.IsNullOrWhiteSpace(en[i]) ? $"Undefined flavor ({value})" : en[i],string.IsNullOrWhiteSpace(ja[i]) ? $"未定義の味（{value}）" : ja[i]);
            return new FoodCaseType(value,name);
        }).ToArray();
    }
    public static FoodCaseCatalog Read(SaveFile save) => save switch {
        SAV3RS or SAV3E => new("blocks3", Hoenn(save).PokeBlocks.Blocks.Select((p,i) => new FoodCaseEntry(i,(byte)p.Color,[p.Spicy,p.Dry,p.Sweet,p.Bitter,p.Sour,p.Feel],p.Level,null)).ToArray(), Types("pokeblock3")),
        SAV4DP or SAV4Pt => new("poffins4", new PoffinCase4((SAV4Sinnoh)save).Poffins.Select((p,i) => new FoodCaseEntry(i,(byte)p.Type,Enumerable.Range(0,6).Select(n => (int)p.GetStat(n)).ToArray(),p.Level,null,(byte)p.StatPrimary,(byte)p.StatSecondary,p.IsManyStat)).ToArray(), Types("poffin4")),
        SAV8BS s => new("poffins8b", s.Poffins.GetPoffins().Select((p,i) => new FoodCaseEntry(i,p.MstID,[p.FlavorSpicy,p.FlavorDry,p.FlavorSweet,p.FlavorBitter,p.FlavorSour,p.Taste],p.Level,p.IsNew)).ToArray(),Types("poffin8b",true)),
        _ => throw new ArgumentException("Food case is unavailable for this format."),
    };
    public static string Snapshot(SaveFile save) => save switch {
        SAV3RS or SAV3E => Convert.ToHexString(Hoenn(save).PokeBlocks.Write()),
        SAV4DP or SAV4Pt => string.Concat(new PoffinCase4((SAV4Sinnoh)save).Poffins.Select(p => Convert.ToHexString(p.Data))),
        SAV8BS s => Convert.ToHexString(s.Poffins.Data),
        _ => throw new ArgumentException("Food case is unavailable for this format."),
    };
    public static void Apply(SaveFile save, SaveFoodEdit request)
    {
        var catalog = Read(save);
        if(request.Values is not null || request.Count is not null || request.BlockValues is not null) throw new ArgumentException("Food action contains unrelated fields.");
        var edit = request.Case;
        if(request.Action == "caseEdit")
        {
            if(edit is null || edit.Index < 0 || edit.Index >= catalog.Entries.Length || edit.Type is <0 or >255 || edit.Stats is not {Length:6} || edit.Stats.Any(v => v is <0 or >255)) throw new ArgumentException("Food case values are out of range.");
            var old = catalog.Entries[edit.Index];
            if(edit.Type != old.Type && !catalog.Types.Any(t => t.Value == edit.Type)) throw new ArgumentException("Food case type is invalid.");
            if(save is SAV8BS ? edit.Level is null or <0 or >255 || edit.New is null : edit.Level is not null || edit.New is not null) throw new ArgumentException("Food case fields are invalid for this format.");
        }
        else if(edit is not null || request.Action is not ("caseFill" or "caseClear" or "caseSort") || request.Action == "caseSort" && save is not SAV8BS) throw new ArgumentException("Food case action is invalid.");
        if(save is SAV3RS or SAV3E)
        {
            var block = Hoenn(save); var box = block.PokeBlocks;
            if(edit is not null) { var p=box.Blocks[edit.Index]; p.Color=(PokeBlock3Color)edit.Type; p.Spicy=(byte)edit.Stats[0]; p.Dry=(byte)edit.Stats[1]; p.Sweet=(byte)edit.Stats[2]; p.Bitter=(byte)edit.Stats[3]; p.Sour=(byte)edit.Stats[4]; p.Feel=(byte)edit.Stats[5]; }
            else if(request.Action == "caseFill") box.MaximizeAll(true); else box.DeleteAll();
            block.PokeBlocks = box;
        }
        else if(save is SAV4Sinnoh sinnoh)
        {
            var box = new PoffinCase4(sinnoh);
            if(edit is not null) { var p=box.Poffins[edit.Index]; p.Type=(PoffinFlavor4)edit.Type; for(int n=0;n<6;n++) p.SetStat(n,(byte)edit.Stats[n]); }
            else if(request.Action == "caseFill") box.FillCase(); else box.DeleteAll();
            box.Save();
        }
        else
        {
            var block = ((SAV8BS)save).Poffins; var items=block.GetPoffins();
            if(edit is not null)
            {
                var p=items[edit.Index]; p.MstID=(byte)edit.Type; p.Level=(byte)edit.Level!.Value;
                if(p.IsNew != edit.New!.Value) p.IsNew=edit.New.Value;
                p.FlavorSpicy=(byte)edit.Stats[0]; p.FlavorDry=(byte)edit.Stats[1]; p.FlavorSweet=(byte)edit.Stats[2]; p.FlavorBitter=(byte)edit.Stats[3]; p.FlavorSour=(byte)edit.Stats[4]; p.Taste=(byte)edit.Stats[5];
            }
            else if(request.Action == "caseFill") foreach(var p in items) { p.MstID=0x1C; p.Level=60; p.Taste=p.FlavorSpicy=p.FlavorDry=p.FlavorSweet=p.FlavorBitter=p.FlavorSour=255; }
            else if(request.Action == "caseClear") foreach(var p in items) p.ToNull();
            block.SetPoffins(items);
        }
    }
}
