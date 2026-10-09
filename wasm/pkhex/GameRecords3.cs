// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record GameRecord3Entry(int Index, string Name, uint Value);
public sealed record FameTime3(int Hours, int Minutes, int Seconds, int RawHours, int RawMinutes, int RawSeconds);
public sealed record GameRecord3Catalog(bool CanEdit, GameRecord3Entry[] Entries, FameTime3 Time);
public sealed record GameRecord3Edit(string Action, int? Index = null, long? Value = null, int? Hours = null, int? Minutes = null, int? Seconds = null);
internal static class GameRecords3
{
    private static SAV3 Save(SaveFile save) => save is SAV3RS or SAV3E or SAV3FRLG ? (SAV3)save : throw new ArgumentException("Gen3 game records are unavailable for this format.");
    private static int Count(SAV3 s) => s is SAV3RS ? (int)RecID3RuSa.NUM_GAME_STATS : (int)RecID3Emerald.BERRY_CRUSH_WITH_FRIENDS + 1;
    // Compile-time enum member names retain the upstream list without runtime enum reflection after trimming.
    private static readonly string[] Names = [nameof(RecID3RuSa.SAVED_GAME), nameof(RecID3RuSa.FIRST_HOF_PLAY_TIME), nameof(RecID3RuSa.STARTED_TRENDS), nameof(RecID3RuSa.PLANTED_BERRIES), nameof(RecID3RuSa.TRADED_BIKES), nameof(RecID3RuSa.STEPS), nameof(RecID3RuSa.GOT_INTERVIEWED), nameof(RecID3RuSa.TOTAL_BATTLES), nameof(RecID3RuSa.WILD_BATTLES), nameof(RecID3RuSa.TRAINER_BATTLES), nameof(RecID3RuSa.ENTERED_HOF), nameof(RecID3RuSa.POKEMON_CAPTURES), nameof(RecID3RuSa.FISHING_CAPTURES), nameof(RecID3RuSa.HATCHED_EGGS), nameof(RecID3RuSa.EVOLVED_POKEMON), nameof(RecID3RuSa.USED_POKECENTER), nameof(RecID3RuSa.RESTED_AT_HOME), nameof(RecID3RuSa.ENTERED_SAFARI_ZONE), nameof(RecID3RuSa.USED_CUT), nameof(RecID3RuSa.USED_ROCK_SMASH), nameof(RecID3RuSa.MOVED_SECRET_BASE), nameof(RecID3RuSa.POKEMON_TRADES), nameof(RecID3RuSa.UNKNOWN_22), nameof(RecID3RuSa.LINK_BATTLE_WINS), nameof(RecID3RuSa.LINK_BATTLE_LOSSES), nameof(RecID3RuSa.LINK_BATTLE_DRAWS), nameof(RecID3RuSa.USED_SPLASH), nameof(RecID3RuSa.USED_STRUGGLE), nameof(RecID3RuSa.SLOT_JACKPOTS), nameof(RecID3RuSa.CONSECUTIVE_ROULETTE_WINS), nameof(RecID3RuSa.ENTERED_BATTLE_TOWER), nameof(RecID3RuSa.UNKNOWN_31), nameof(RecID3RuSa.BATTLE_TOWER_BEST_STREAK), nameof(RecID3RuSa.POKEBLOCKS), nameof(RecID3RuSa.POKEBLOCKS_WITH_FRIENDS), nameof(RecID3RuSa.WON_LINK_CONTEST), nameof(RecID3RuSa.ENTERED_CONTEST), nameof(RecID3RuSa.WON_CONTEST), nameof(RecID3RuSa.SHOPPED), nameof(RecID3RuSa.USED_ITEMFINDER), nameof(RecID3RuSa.GOT_RAINED_ON), nameof(RecID3RuSa.CHECKED_POKEDEX), nameof(RecID3RuSa.RECEIVED_RIBBONS), nameof(RecID3RuSa.JUMPED_DOWN_LEDGES), nameof(RecID3RuSa.WATCHED_TV), nameof(RecID3RuSa.CHECKED_CLOCK), nameof(RecID3RuSa.WON_POKEMON_LOTTERY), nameof(RecID3RuSa.USED_DAYCARE), nameof(RecID3RuSa.RODE_CABLE_CAR), nameof(RecID3RuSa.ENTERED_HOT_SPRINGS), nameof(RecID3Emerald.UNION_WITH_FRIENDS), nameof(RecID3Emerald.BERRY_CRUSH_WITH_FRIENDS)];
    public static GameRecord3Catalog Read(SaveFile save)
    {
        var s = Save(save); uint time = s.GetRecord(1);
        int hours = (int)(time >> 16), minutes = (byte)(time >> 8), seconds = (byte)time;
        return new(s.State.Exportable && SaveChecksums.Valid(s), Enumerable.Range(0, Count(s)).Select(i => new GameRecord3Entry(i, Util.ToTitleCase(Names[i].Replace('_', ' ')), s.GetRecord(i))).ToArray(),
            new(Math.Min(9999, hours), Math.Min(59, minutes), Math.Min(59, seconds), hours, minutes, seconds));
    }
    internal static uint[] Snapshot(SaveFile save)
    {
        var s = Save(save); int count = s is SAV3RS ? (int)RecID3RuSa.NUM_GAME_STATS : (int)RecID3Emerald.NUM_GAME_STATS;
        return Enumerable.Range(0, count).Select(s.GetRecord).ToArray();
    }
    internal static void Apply(SaveFile save, GameRecord3Edit edit)
    {
        var s = Save(save);
        if (!s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Gen3 game record editing requires valid checksums.");
        int index; uint value;
        switch (edit.Action)
        {
            case "value" when edit.Index is {} id && id >= 0 && id < Count(s) && edit.Value is >= 0 and <= uint.MaxValue
                && edit.Hours is null && edit.Minutes is null && edit.Seconds is null:
                index = id; value = (uint)edit.Value.Value; break;
            case "time" when edit.Index == 1 && edit.Value is null && edit.Hours is >= 0 and <= 9999 && edit.Minutes is >= 0 and <= 59 && edit.Seconds is >= 0 and <= 59:
                index = 1; value = ((uint)edit.Hours.Value << 16) | ((uint)edit.Minutes.Value << 8) | (uint)edit.Seconds.Value; break;
            default: throw new ArgumentException("Invalid Gen3 game record action or fields.");
        }
        if (s.GetRecord(index) != value) s.SetRecord(index, value);
    }
    internal static byte[] Edit(byte[] data, GameRecord3Edit edit)
    {
        if (data.Length is 0 or > (32 * 1024 * 1024)) throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s = Save(SaveUtil.GetSaveFile(data.ToArray()) ?? throw new ArgumentException("Unrecognized save."));
        Apply(s, edit); var expected = Snapshot(s); var output = s.Write().ToArray();
        var check = Save(SaveUtil.GetSaveFile(output.ToArray()) ?? throw new InvalidOperationException("Gen3 game record output was not recognized."));
        if (output.Length != data.Length || check.GetType() != s.GetType() || check.Version != s.Version || check.SaveRevision != s.SaveRevision
            || !SaveChecksums.Valid(check) || !expected.SequenceEqual(Snapshot(check))) throw new InvalidOperationException("Gen3 game record export verification failed.");
        return output;
    }
}
public static partial class SaveService
{
    public static string ReadGameRecords3(byte[] data) => JsonSerializer.Serialize(GameRecords3.Read(Open(data)), SaveJsonContext.Default.GameRecord3Catalog);
    public static byte[] EditGameRecords3(byte[] data, string json)
    {
        if (json.Length > 1024) throw new ArgumentException("Gen3 game record request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.GameRecord3Edit) ?? throw new ArgumentException("Missing Gen3 game record edit.");
        return GameRecords3.Edit(data, edit);
    }
}
