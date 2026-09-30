// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;

namespace PokeRNGKit.SaveEditor;

public sealed record Hall1Member(int Species, int SpeciesInternal, int Level, string Nickname, string NicknameHex, bool Empty, string DefaultNickname);
public sealed record Hall1Team(int Count, Hall1Member[] Members);
public sealed record Hall1Catalog(int Count, int NicknameLength, Hall1Team[] Teams, bool CanEdit, OriginChoice[] SpeciesChoices);
public sealed record Hall1Fields(int? Species = null, int? Level = null, string? Nickname = null, string? NicknameHex = null, bool? DefaultNickname = null);
public sealed record Hall1Edit(string Action, int? Team = null, int? Slot = null, int? Count = null, Hall1Fields? Fields = null);

internal static class HallOfFame1
{
    internal const int Offset = 0x598;
    internal static SAV1 Save(SaveFile save) => save is SAV1 { Version: GameVersion.RB or GameVersion.YW } s
        ? s : throw new ArgumentException("Hall of Fame is unavailable for this format.");

    public static Hall1Catalog Read(SaveFile save)
    {
        var s = Save(save); var fame = s.HallOfFame;
        var teams = new Hall1Team[HallOfFameReader1.TeamCount];
        for (int t = 0; t < teams.Length; t++)
        {
            var members = new Hall1Member[HallOfFameReader1.SlotsPerTeam];
            for (int i = 0; i < members.Length; i++)
            {
                var p = fame.GetEntity(t, i);
                var name = p.Species is > 0 and <= 151 ? SpeciesName.GetSpeciesNameGeneration(p.Species, s.Language, 1) : string.Empty;
                members[i] = new(p.Species, p.SpeciesInternal, p.Level, p.Nickname, Convert.ToHexString(p.NicknameTrash), p.IsEmpty, name);
            }
            teams[t] = new(fame.GetTeamMemberCount(t), members);
        }
        var zh = GameInfo.GetStrings("zh-Hans").specieslist;
        var en = GameInfo.GetStrings("en").specieslist;
        var ja = GameInfo.GetStrings("ja").specieslist;
        var choices = Enumerable.Range(1, 151).Select(i => new OriginChoice(i, new(zh[i], en[i], ja[i]))).ToArray();
        return new(s.HallOfFameCount, s.Japanese ? 5 : 10, teams, s.State.Exportable && SaveChecksums.Valid(s), choices);
    }

    internal static void Apply(SaveFile save, Hall1Edit edit)
    {
        var s = Save(save); var fame = s.HallOfFame;
        switch (edit.Action)
        {
            case "member" when edit.Count is null && edit.Fields is { } fields:
                Position(edit.Team, edit.Slot);
                var member = fame.GetEntity(edit.Team!.Value, edit.Slot!.Value);
                // Validate and encode against detached bytes before touching the working save.
                var bytes = member.Data.ToArray();
                var draft = new HallOfFameEntity1(bytes, s.Japanese);
                EditMember(s, draft, fields);
                bytes.CopyTo(member.Data);
                return;
            case "count" when edit.Team is null && edit.Slot is null && edit.Fields is null && edit.Count is >= 0 and <= 255:
                s.HallOfFameCount = (byte)edit.Count.Value;
                return;
            case "clearSlot" when edit.Count is null && edit.Fields is null:
                Position(edit.Team, edit.Slot);
                if (edit.Slot == 0) throw new ArgumentException("The first Hall of Fame slot has no clear-slot action.");
                fame.GetEntity(edit.Team!.Value, edit.Slot!.Value).Clear();
                return;
            case "deleteTeam" when edit.Slot is null && edit.Count is null && edit.Fields is null && edit.Team is > 0 and < 50:
                fame.Delete(edit.Team.Value);
                return;
            case "registerParty" when edit.Team is null && edit.Slot is null && edit.Count is null && edit.Fields is null:
                s.HallOfFameCount = fame.RegisterParty(s, s.HallOfFameCount);
                return;
            case "clearAll" when edit.Team is null && edit.Slot is null && edit.Count is null && edit.Fields is null:
                fame.Clear(); s.HallOfFameCount = 0;
                return;
            default:
                throw new ArgumentException("Invalid Hall of Fame operation or fields.");
        }
    }

    private static void Position(int? team, int? slot)
    {
        if (team is not (>= 0 and < 50) || slot is not (>= 0 and < 6))
            throw new ArgumentException("Invalid Hall of Fame position.");
    }

    private static void EditMember(SAV1 save, HallOfFameEntity1 member, Hall1Fields fields)
    {
        int names = (fields.Nickname is null ? 0 : 1) + (fields.NicknameHex is null ? 0 : 1) + (fields.DefaultNickname is null ? 0 : 1);
        if (fields.Species is null && fields.Level is null && names == 0)
            throw new ArgumentException("Missing Hall of Fame member fields.");
        if (names > 1 || fields.DefaultNickname == false || fields.Species is < 0 or > 151 || fields.Level is < 0 or > 255)
            throw new ArgumentException("Invalid Hall of Fame member fields.");
        if (fields.Species == 0)
        {
            if (fields.Level is not null || names != 0) throw new ArgumentException("Clearing a Hall of Fame member cannot include other fields.");
            member.Clear(); return;
        }
        if (fields.Species is { } species) member.Species = (ushort)species;
        if (fields.Level is { } level) member.Level = (byte)level;
        if (fields.NicknameHex is { } hex)
        {
            if (hex.Length != member.NicknameTrash.Length * 2 || hex.Any(c => !Uri.IsHexDigit(c)))
                throw new ArgumentException("Invalid Hall of Fame nickname bytes.");
            Convert.FromHexString(hex).CopyTo(member.NicknameTrash);
        }
        else
        {
            string? name = fields.Nickname;
            if (fields.DefaultNickname == true)
            {
                if (member.Species is 0 or > 151) throw new ArgumentException("Invalid species for Hall of Fame nickname reset.");
                name = SpeciesName.GetSpeciesNameGeneration(member.Species, save.Language, 1);
            }
            if (name is not null && name != member.Nickname)
            {
                if (name.Length > (save.Japanese ? 5 : 10)) throw new ArgumentException("Hall of Fame nickname is too long.");
                member.Nickname = name;
                if (member.Nickname != name) throw new ArgumentException("Hall of Fame nickname cannot be encoded without loss.");
            }
        }
    }

    internal static byte[] Edit(byte[] data, Hall1Edit edit)
    {
        if (data.Length is 0 or > (32 * 1024 * 1024)) throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s = Save(SaveUtil.GetSaveFile(data.ToArray()) ?? throw new ArgumentException("Unrecognized save."));
        if (!s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Hall of Fame editing requires a valid exportable save.");
        Apply(s, edit);
        var expected = s.Data.Slice(Offset, HallOfFameReader1.SIZE).ToArray(); var count = s.HallOfFameCount;
        var output = s.Write().ToArray();
        var check = Save(SaveUtil.GetSaveFile(output.ToArray()) ?? throw new InvalidOperationException("Hall of Fame output was not recognized."));
        if (output.Length != data.Length || check.Version != s.Version || check.SaveRevision != s.SaveRevision || !SaveChecksums.Valid(check)
            || check.HallOfFameCount != count || !check.Data.Slice(Offset, expected.Length).SequenceEqual(expected))
            throw new InvalidOperationException("Hall of Fame export verification failed.");
        return output;
    }
}

public static partial class SaveService
{
    public static string ReadHall1(byte[] data) => JsonSerializer.Serialize(HallOfFame1.Read(Open(data)), SaveJsonContext.Default.Hall1Catalog);
    public static byte[] EditHall1(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Hall of Fame request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Hall1Edit) ?? throw new ArgumentException("Missing Hall of Fame edit.");
        return HallOfFame1.Edit(data, edit);
    }
}
