// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;

namespace PokeRNGKit.SaveEditor;

public sealed record LocalizedText(string Zh, string En, string Ja);
public sealed record MoveChoice(LocalizedText Name, int[] MaxPp);
public sealed record AttributeChoices(LocalizedText[] Natures, LocalizedText[] Items, SpeciesChoice[] Species);
public sealed record PokemonLimits(int Nickname, int TrainerName, int Iv, int Ev, int Move);
public sealed record BoxEntry(int Index, string Name, int Wallpaper);
public sealed record PokemonEntry(
    int Box, int Slot, ushort Species, byte Form, string Nickname, byte Level,
    byte Gender, bool Shiny, bool Egg, bool Valid, string Ot, ushort Tid, ushort Sid,
    uint Pid, uint EncryptionConstant, uint Experience, byte Friendship,
    LocalizedText SpeciesName, LocalizedText Nature, LocalizedText Ability,
    LocalizedText Item, LocalizedText[] Moves, int[] MovePp, int[] Ivs, int[] Evs, string Sprite, ushort[] MoveIds, PokemonLimits Limits, int[] MovePpUps,
    int NatureId, int StatAlignment, bool CanStatAlignment, int AbilityIndex, LocalizedText[] AbilityChoices, int HeldItem, bool IsNicknamed, bool CanEditEncryptionConstant, FormArgumentInfo? FormArgument, EncounterInfo Encounter, OriginInfo Origin, EggInfo? EggInfo, ushort[]? RelearnMoves, TrainingInfo Training);

internal static class PokemonReader
{
    private static LocalizedText Text(Func<GameStrings, string> read) =>
        new(read(GameInfo.GetStrings("zh-Hans")), read(GameInfo.GetStrings("en")), read(GameInfo.GetStrings("ja")));
    private static string Name(string[] names, int id) => (uint)id < names.Length ? names[id] : $"#{id}";
    public static AttributeChoices Attributes(SaveFile save) => new(
        Enumerable.Range(0, 25).Select(i => Text(s => Name(s.natures, i))).ToArray(),
        Enumerable.Range(0, save.BlankPKM.MaxItemID + 1).Select(i => Text(s => Name(s.GetItemStrings(save.Context, save.Version), i))).ToArray(), PokemonIdentity.Choices(save));

    public static MoveChoice[] MoveChoices(SaveFile save)
    {
        var p = save.BlankPKM;
        return MoveChoices(p, save.MaxMoveID);
    }
    public static MoveChoice[] MoveChoices(PKM p, int? maximum = null) =>
        Enumerable.Range(0, (maximum ?? p.MaxMoveID) + 1).Select(i => new MoveChoice(Text(s => Name(s.movelist, i)),
            Enumerable.Range(0, 4).Select(up => p.GetMovePP((ushort)i, up)).ToArray())).ToArray();
    public static AttributeChoices Attributes(PKM p) => new(
        Enumerable.Range(0, 25).Select(i => Text(s => Name(s.natures, i))).ToArray(),
        Enumerable.Range(0, p.MaxItemID + 1).Select(i => Text(s => Name(s.GetItemStrings(p.Context, p.Version), i))).ToArray(), PokemonIdentity.Choices(p));

    public static BoxEntry[] Boxes(SaveFile save) => Enumerable.Range(0, save.HasBox ? save.BoxCount : 0).Select(i =>
        new BoxEntry(i, save is IBoxDetailNameRead names ? names.GetBoxName(i) : string.Empty,
            save is IBoxDetailWallpaper wallpaper ? wallpaper.GetBoxWallpaper(i) : -1)).ToArray();

    public static PokemonEntry[] Read(SaveFile save)
    {
        var entries = new List<PokemonEntry>();
        if (save.HasParty)
            for (var slot = 0; slot < save.PartyCount; slot++)
                Add(save.GetPartySlotAtIndex(slot), -1, slot);
        if (save.HasBox)
            for (var box = 0; box < save.BoxCount; box++)
                for (var slot = 0; slot < save.BoxSlotCount; slot++)
                    Add(save.GetBoxSlotAtIndex(box, slot), box, slot);
        return entries.ToArray();

        void Add(PKM p, int box, int slot)
        {
            if (p.Species != 0) entries.Add(Read(p, box, slot));
        }
    }

    public static PokemonEntry Read(PKM p, int box, int slot)
    {
        return new(box, slot, p.Species, p.Form, p.Nickname, p.CurrentLevel,
            p.Gender, p.IsShiny, p.IsEgg, p.ChecksumValid, p.OriginalTrainerName, p.TID16, p.SID16,
            p.PID, p.EncryptionConstant, p.EXP, p.IsEgg ? p.OriginalTrainerFriendship : p.CurrentFriendship,
            Text(s => Name(s.specieslist, p.Species)), Text(s => Name(s.natures, (int)p.Nature)),
            Text(s => Name(s.abilitylist, p.Ability)), Text(s => Name(s.GetItemStrings(p.Context, p.Version), p.HeldItem)),
            p.Moves.Select(m => Text(s => Name(s.movelist, m))).ToArray(),
            [p.Move1_PP, p.Move2_PP, p.Move3_PP, p.Move4_PP],
            [p.IV_HP, p.IV_ATK, p.IV_DEF, p.IV_SPA, p.IV_SPD, p.IV_SPE],
            [p.EV_HP, p.EV_ATK, p.EV_DEF, p.EV_SPA, p.EV_SPD, p.EV_SPE],
            p.IsEgg ? (p.Species == 490 ? "b_490_e" : "b_egg") : "b" + SpriteName.GetResourceStringSprite(
                p.Species, p.Form, p.Gender, p is IFormArgument argument ? argument.FormArgument : 0, p.Context),
            p.Moves, new(p.MaxStringLengthNickname, p.MaxStringLengthTrainer, p.MaxIV, p.MaxEV, p.MaxMoveID),
            [p.Move1_PPUps, p.Move2_PPUps, p.Move3_PPUps, p.Move4_PPUps],
            (int)p.Nature, (int)p.StatAlignment, p.Format >= 8,
            p.AbilityNumber switch { 1 => 0, 2 => 1, 4 => 2, _ => -1 },
            Enumerable.Range(0, p.PersonalInfo.AbilityCount).Select(i => Text(s => Name(s.abilitylist, p.PersonalInfo.GetAbilityAtIndex(i)))).ToArray(), p.HeldItem, p.IsNicknamed, p.Format >= 6, PokemonFormArgument.Read(p, box), PokemonEncounter.Read(p), PokemonOrigin.Read(p), PokemonEgg.Read(p), PokemonRelearn.Read(p), PokemonTraining.Read(p));
    }
}
