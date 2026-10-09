// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;

public sealed record Roamer3Catalog(bool CanEdit, int Species, string Pid, int[] Ivs, int[] EncounterIvs, bool Glitched, int Level, int Hp, bool Active, bool Shiny, string Sprite, OriginChoice[] SpeciesChoices);
public sealed record Roamer3Edit(int? Species = null, long? Pid = null, int?[]? Ivs = null, int? Level = null, int? Hp = null, bool? Active = null);
internal static class Roamer3Editing
{
    private static SAV3 Save(SaveFile save) => save is SAV3RS or SAV3E or SAV3FRLG ? (SAV3)save : throw new ArgumentException("Gen3 roamer is unavailable for this format.");
    public static Roamer3Catalog Read(SaveFile save)
    {
        var s = Save(save); var r = new Roamer3(s.LargeBlock);
        var zh = GameInfo.GetStrings("zh-Hans"); var en = GameInfo.GetStrings("en"); var ja = GameInfo.GetStrings("ja");
        var choices = Enumerable.Range(1, 386).Select(i => new OriginChoice(i, new(zh.specieslist[i], en.specieslist[i], ja.specieslist[i]))).ToArray();
        var pk = new PK3 { Species = r.Species, PID = r.PID };
        return new(s.State.Exportable && SaveChecksums.Valid(s), r.Species, r.PID.ToString("X8"), r.IVs,
            r.IsGlitched ? r.IVsGlitch : r.IVs, r.IsGlitched, r.CurrentLevel, r.HP_Current, r.IsActive, Roamer3.IsShiny(r.PID, s),
            "b" + SpriteName.GetResourceStringSprite(pk.Species, pk.Form, 0, 0, EntityContext.Gen3), choices);
    }
    internal static void Apply(SaveFile save, Roamer3Edit edit)
    {
        var s = Save(save);
        if (!s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Gen3 roamer editing requires valid checksums.");
        if (edit is { Species: null, Pid: null, Ivs: null, Level: null, Hp: null, Active: null }) throw new ArgumentException("Missing Gen3 roamer fields.");
        if (edit.Species is < 0 or > 386 || edit.Pid is < 0 or > uint.MaxValue || edit.Level is < 0 or > 100 || edit.Hp is < 0 or > 65535
            || (edit.Ivs is {} ivs && (ivs.Length != 6 || ivs.All(v => v is null) || ivs.Any(v => v is < 0 or > 99))))
            throw new ArgumentException("Invalid Gen3 roamer fields.");
        // Validate the complete patch before touching the save; retain status, contest bytes and IV high bits.
        var raw = s.LargeBlock.RoamerData.ToArray(); var r = new Roamer3(raw, s is not SAV3E);
        if (edit.Species is {} species) r.Species = (ushort)species;
        if (edit.Pid is {} pid) r.PID = (uint)pid;
        if (edit.Ivs is {} values)
        {
            int[] next = r.IVs;
            for (int i = 0; i < 6; i++) if (values[i] is {} v) next[i] = v;
            r.SetIVs(next);
        }
        if (edit.Level is {} level) r.CurrentLevel = (byte)level;
        if (edit.Hp is {} hp) r.HP_Current = (ushort)hp;
        if (edit.Active is {} active) r.IsActive = active;
        raw.CopyTo(s.LargeBlock.RoamerData.Span);
    }
    internal static byte[] Edit(byte[] data, Roamer3Edit edit)
    {
        if (data.Length is 0 or > (32 * 1024 * 1024)) throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s = Save(SaveUtil.GetSaveFile(data.ToArray()) ?? throw new ArgumentException("Unrecognized save."));
        Apply(s, edit); var expected = s.LargeBlock.RoamerData.ToArray(); var output = s.Write().ToArray();
        var check = Save(SaveUtil.GetSaveFile(output.ToArray()) ?? throw new InvalidOperationException("Gen3 roamer output was not recognized."));
        if (output.Length != data.Length || check.GetType() != s.GetType() || check.Version != s.Version || check.SaveRevision != s.SaveRevision
            || !SaveChecksums.Valid(check) || !expected.AsSpan().SequenceEqual(check.LargeBlock.RoamerData.Span))
            throw new InvalidOperationException("Gen3 roamer export verification failed.");
        return output;
    }
}
public static partial class SaveService
{
    public static string ReadRoamer3(byte[] data) => JsonSerializer.Serialize(Roamer3Editing.Read(Open(data)), SaveJsonContext.Default.Roamer3Catalog);
    public static byte[] EditRoamer3(byte[] data, string json)
    {
        if (json.Length > 1024) throw new ArgumentException("Gen3 roamer request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Roamer3Edit) ?? throw new ArgumentException("Missing Gen3 roamer edit.");
        return Roamer3Editing.Edit(data, edit);
    }
}
