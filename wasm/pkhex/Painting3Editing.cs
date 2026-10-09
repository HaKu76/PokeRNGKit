// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;

public sealed record Painting3Entry(int Index, bool Enabled, int Species, int SpeciesInternal, int Caption, int CaptionRaw, int Tid, int Sid, string Pid, string Nickname, string Trainer, string NicknameHex, string TrainerHex, bool Shiny, string Sprite);
public sealed record Painting3Catalog(bool CanEdit, Painting3Entry[] Entries, OriginChoice[] SpeciesChoices);
public sealed record Painting3Fields(bool? Enabled = null, int? Species = null, int? Caption = null, int? Tid = null, int? Sid = null, long? Pid = null, string? Nickname = null, string? Trainer = null, string? NicknameHex = null, string? TrainerHex = null);
public sealed record Painting3Edit(int? Index, Painting3Fields? Fields);
internal static class Painting3Editing
{
    private static SAV3 Save(SaveFile save) => save is SAV3RS or SAV3E ? (SAV3)save : throw new ArgumentException("Gen3 paintings are unavailable for this format.");
    // Upstream GetPainting returns a five-record-length slice starting at the selected record.
    // Bound every view, including Clear, to one record to protect later paintings and daycare data.
    private static Paintings3 Painting(SAV3 s, int index) => new(((ISaveBlock3LargeHoenn)s.LargeBlock).GetPainting(index, s.Japanese).Data[..Paintings3.SIZE].ToArray(), s.Japanese);
    public static Painting3Catalog Read(SaveFile save)
    {
        var s = Save(save); var zh = GameInfo.GetStrings("zh-Hans"); var en = GameInfo.GetStrings("en"); var ja = GameInfo.GetStrings("ja");
        var choices = Enumerable.Range(1, 386).Select(i => new OriginChoice(i, new(zh.specieslist[i], en.specieslist[i], ja.specieslist[i]))).ToArray();
        var entries = new Painting3Entry[5];
        for (int i = 0; i < entries.Length; i++)
        {
            var p = Painting(s, i);
            int form = p.Species == 201 ? EntityPID.GetUnownForm3(p.PID) : p.Species == 386 && s is SAV3E ? 3 : 0;
            entries[i] = new(i, s.GetEventFlag(Paintings3.GetFlagIndexContestStat(i)), p.Species, BinaryPrimitives.ReadUInt16LittleEndian(p.Data[8..]), p.GetCaptionRelative(i), p.Caption,
                p.TID, p.SID, p.PID.ToString("X8"), p.Nickname, p.OT, Convert.ToHexString(p.NicknameTrash), Convert.ToHexString(p.OriginalTrainerTrash), p.IsShiny,
                "b" + SpriteName.GetResourceStringSprite(p.Species, (byte)form, 0, 0, EntityContext.Gen3));
        }
        return new(s.State.Exportable && SaveChecksums.Valid(s), entries, choices);
    }
    internal static byte[] Snapshot(SaveFile save)
    {
        var s = Save(save); var bytes = new List<byte>(165);
        for (int i = 0; i < 5; i++) { bytes.AddRange(Painting(s, i).Data.ToArray()); bytes.Add(s.GetEventFlag(160 + i) ? (byte)1 : (byte)0); }
        return bytes.ToArray();
    }
    private static void Name(Paintings3 p, string? text, string? hex, bool trainer)
    {
        var raw = trainer ? p.OriginalTrainerTrash : p.NicknameTrash; int max = trainer ? 7 : 10;
        if (text is not null && hex is not null) throw new ArgumentException("Gen3 painting name modes conflict.");
        if (hex is not null)
        {
            if (hex.Length != max * 2 || hex.Any(c => !Uri.IsHexDigit(c))) throw new ArgumentException("Invalid Gen3 painting name bytes.");
            Convert.FromHexString(hex).CopyTo(raw);
        }
        else if (text is not null && text != (trainer ? p.OT : p.Nickname))
        {
            if (text.Length > max) throw new ArgumentException("Gen3 painting name is too long.");
            if (trainer) p.OT = text; else p.Nickname = text;
            if (text != (trainer ? p.OT : p.Nickname)) throw new ArgumentException("Gen3 painting name cannot be encoded without loss.");
        }
    }
    internal static void Apply(SaveFile save, Painting3Edit edit)
    {
        var s = Save(save);
        if (!s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Gen3 painting editing requires valid checksums.");
        if (edit.Index is not (>= 0 and < 5) || edit.Fields is not {} f) throw new ArgumentException("Invalid Gen3 painting position or fields.");
        int i = edit.Index.Value;
        if (f is { Enabled:null, Species:null, Caption:null, Tid:null, Sid:null, Pid:null, Nickname:null, Trainer:null, NicknameHex:null, TrainerHex:null })
            throw new ArgumentException("Missing Gen3 painting changes.");
        if (f.Species is < 0 or > 386 || f.Caption is < 0 or > 2 || f.Tid is < 0 or > 65535 || f.Sid is < 0 or > 65535 || f.Pid is < 0 or > uint.MaxValue)
            throw new ArgumentException("Invalid Gen3 painting fields.");
        var p = Painting(s, i); bool enabled = f.Enabled ?? s.GetEventFlag(160 + i);
        if (!enabled)
        {
            if (f is not { Enabled:false, Species:null, Caption:null, Tid:null, Sid:null, Pid:null, Nickname:null, Trainer:null, NicknameHex:null, TrainerHex:null })
                throw new ArgumentException("Disabling a Gen3 painting requires an explicit clear-only request.");
            p.Clear();
        }
        else
        {
            if (f.Species is {} species) p.Species = (ushort)species;
            if (f.Caption is {} caption) p.SetCaptionRelative(i, caption);
            if (f.Tid is {} tid) p.TID = (ushort)tid;
            if (f.Sid is {} sid) p.SID = (ushort)sid;
            if (f.Pid is {} pid) p.PID = (uint)pid;
            Name(p, f.Nickname, f.NicknameHex, false); Name(p, f.Trainer, f.TrainerHex, true);
        }
        ((ISaveBlock3LargeHoenn)s.LargeBlock).SetPainting(i, p);
        s.SetEventFlag(160 + i, enabled);
    }
    internal static byte[] Edit(byte[] data, Painting3Edit edit)
    {
        if (data.Length is 0 or > (32 * 1024 * 1024)) throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s = Save(SaveUtil.GetSaveFile(data.ToArray()) ?? throw new ArgumentException("Unrecognized save."));
        Apply(s, edit); var expected = Snapshot(s); var output = s.Write().ToArray();
        var check = Save(SaveUtil.GetSaveFile(output.ToArray()) ?? throw new InvalidOperationException("Gen3 painting output was not recognized."));
        if (output.Length != data.Length || check.GetType() != s.GetType() || check.Version != s.Version || check.SaveRevision != s.SaveRevision
            || !SaveChecksums.Valid(check) || !expected.SequenceEqual(Snapshot(check))) throw new InvalidOperationException("Gen3 painting export verification failed.");
        return output;
    }
}
public static partial class SaveService
{
    public static string ReadPaintings3(byte[] data) => JsonSerializer.Serialize(Painting3Editing.Read(Open(data)), SaveJsonContext.Default.Painting3Catalog);
    public static byte[] EditPaintings3(byte[] data, string json)
    {
        if (json.Length > 2048) throw new ArgumentException("Gen3 painting request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Painting3Edit) ?? throw new ArgumentException("Missing Gen3 painting edit.");
        return Painting3Editing.Edit(data, edit);
    }
}
