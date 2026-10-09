// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record Frontier3Stat(int Id, int Value);
public sealed record Frontier3Record(int Mode, int Record, bool Continue, Frontier3Stat[] Stats);
public sealed record Frontier3Facility(int Id, int ModeCount, Frontier3Record[] Records);
public sealed record Frontier3Symbol(int Facility, bool Silver, bool Gold);
public sealed record Frontier3Catalog(bool CanEdit, bool Pass, int Bp, int Earned, Frontier3Symbol[] Symbols, Frontier3Facility[] Facilities);
public sealed record Frontier3SymbolEdit(int Facility, int Level);
public sealed record Frontier3Edit(string Action, int? Facility = null, int? Mode = null, int? Record = null, Frontier3Stat[]? Stats = null, bool? Continue = null, bool? Pass = null, int? Bp = null, int? Earned = null, Frontier3SymbolEdit[]? Symbols = null);
internal static class Frontier3Editing
{
    private static SAV3E Save(SaveFile save) => save as SAV3E ?? throw new ArgumentException("Gen3 Battle Frontier is unavailable for this format.");
    public static Frontier3Catalog Read(SaveFile save)
    {
        var s = Save(save); var bf = s.SmallBlock.BattleFrontier;
        var facilities = new Frontier3Facility[7]; var symbols = new Frontier3Symbol[7];
        for (int f = 0; f < 7; f++)
        {
            var facility = (BattleFrontierFacility3)f; int modes = BattleFrontier3.GetModeCount(facility);
            var records = new List<Frontier3Record>(); var ids = BattleFrontier3.GetValidStats(facility);
            for (int m = 0; m < modes; m++) for (int r = 0; r < 2; r++)
            {
                var stats = new Frontier3Stat[ids.Length];
                for (int i = 0; i < ids.Length; i++) stats[i] = new((int)ids[i], bf.GetStat(facility, (BattleFrontierBattleMode3)m, (BattleFrontierRecordType3)r, ids[i]));
                records.Add(new(m, r, bf.GetContinueFlag(facility, (BattleFrontierBattleMode3)m, (BattleFrontierRecordType3)r), stats));
            }
            facilities[f] = new(f, modes, records.ToArray());
            symbols[f] = new(f, s.GetEventFlag(BattleFrontier3.GetSymbolSilverFlagIndex(facility)), s.GetEventFlag(BattleFrontier3.GetSymbolGoldFlagIndex(facility)));
        }
        return new(s.State.Exportable && SaveChecksums.Valid(s), s.GetEventFlag(BattleFrontier3.FrontierPassFlagIndex), s.SmallBlock.BP, s.SmallBlock.BPEarned, symbols, facilities);
    }
    internal static byte[] Snapshot(SaveFile save)
    {
        var s = Save(save);
        // Frontier block, both adjacent BP fields, and every story flag are retained for export verification.
        return [..s.Small.Slice(0xCDC, BattleFrontier3.SIZE + 4), ..s.Large.Slice(0x1270, 300)];
    }
    internal static void Apply(SaveFile save, Frontier3Edit edit)
    {
        var s = Save(save);
        if (!s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Gen3 Battle Frontier editing requires valid checksums.");
        switch (edit.Action)
        {
            case "record" when edit.Facility is >= 0 and < 7 && edit.Mode is >= 0 && edit.Record is >= 0 and < 2
                && edit.Pass is null && edit.Bp is null && edit.Earned is null && edit.Symbols is null:
                var facility = (BattleFrontierFacility3)edit.Facility.Value;
                if (edit.Mode >= BattleFrontier3.GetModeCount(facility) || (edit.Stats is null && edit.Continue is null)) throw new ArgumentException("Invalid Gen3 Battle Frontier record mode or fields.");
                var valid = BattleFrontier3.GetValidStats(facility);
                if (edit.Stats is {} stats && (stats.Length == 0 || stats.Length > valid.Length || stats.Any(v => v is null) || stats.Select(v => v.Id).Distinct().Count() != stats.Length
                    || stats.Any(v => !valid.Contains((BattleFrontierStatType3)v.Id) || v.Value is < 0 or > 9999))) throw new ArgumentException("Invalid Gen3 Battle Frontier stats.");
                var mode = (BattleFrontierBattleMode3)edit.Mode.Value; var record = (BattleFrontierRecordType3)edit.Record.Value; var bf = s.SmallBlock.BattleFrontier;
                if (edit.Stats is {} values) foreach (var v in values) bf.SetStat(facility, mode, record, (BattleFrontierStatType3)v.Id, (ushort)v.Value);
                if (edit.Continue is {} next) bf.SetContinueFlag(facility, mode, record, next);
                break;
            case "global" when edit.Facility is null && edit.Mode is null && edit.Record is null && edit.Stats is null && edit.Continue is null:
                if (edit.Pass is null && edit.Bp is null && edit.Earned is null && edit.Symbols is null) throw new ArgumentException("Missing Gen3 Battle Frontier global fields.");
                if (edit.Bp is < 0 or > 9999 || edit.Earned is < 0 or > 65535) throw new ArgumentException("Invalid Gen3 Battle Frontier BP.");
                if (edit.Symbols is {} edits && (edits.Length is 0 or > 7 || edits.Any(v => v is null) || edits.Select(v => v.Facility).Distinct().Count() != edits.Length || edits.Any(v => v.Facility is < 0 or > 6 || v.Level is < 0 or > 2))) throw new ArgumentException("Invalid Gen3 Battle Frontier symbols.");
                if (edit.Pass is {} pass) s.SetEventFlag(BattleFrontier3.FrontierPassFlagIndex, pass);
                if (edit.Bp is {} bp) s.SmallBlock.BP = (ushort)bp;
                if (edit.Earned is {} earned) s.SmallBlock.BPEarned = (ushort)earned;
                if (edit.Symbols is {} symbols) foreach (var v in symbols)
                {
                    var f = (BattleFrontierFacility3)v.Facility;
                    s.SetEventFlag(BattleFrontier3.GetSymbolSilverFlagIndex(f), v.Level > 0);
                    s.SetEventFlag(BattleFrontier3.GetSymbolGoldFlagIndex(f), v.Level == 2);
                }
                break;
            default: throw new ArgumentException("Invalid Gen3 Battle Frontier action or mixed fields.");
        }
    }
    internal static byte[] Edit(byte[] data, Frontier3Edit edit)
    {
        if (data.Length is 0 or > (32 * 1024 * 1024)) throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s = Save(SaveUtil.GetSaveFile(data.ToArray()) ?? throw new ArgumentException("Unrecognized save."));
        Apply(s, edit); var expected = Snapshot(s); var output = s.Write().ToArray();
        var check = Save(SaveUtil.GetSaveFile(output.ToArray()) ?? throw new InvalidOperationException("Gen3 Battle Frontier output was not recognized."));
        if (output.Length != data.Length || check.GetType() != s.GetType() || check.Version != s.Version || check.SaveRevision != s.SaveRevision
            || !SaveChecksums.Valid(check) || !expected.SequenceEqual(Snapshot(check))) throw new InvalidOperationException("Gen3 Battle Frontier export verification failed.");
        return output;
    }
}
public static partial class SaveService
{
    public static string ReadFrontier3(byte[] data) => JsonSerializer.Serialize(Frontier3Editing.Read(Open(data)), SaveJsonContext.Default.Frontier3Catalog);
    public static byte[] EditFrontier3(byte[] data, string json)
    {
        if (json.Length > 2048) throw new ArgumentException("Gen3 Battle Frontier request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Frontier3Edit) ?? throw new ArgumentException("Missing Gen3 Battle Frontier edit.");
        return Frontier3Editing.Edit(data, edit);
    }
}
