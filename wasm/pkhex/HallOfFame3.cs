// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;

namespace PokeRNGKit.SaveEditor;

public sealed record Hall3Member(int Species, int SpeciesInternal, int Level, int Tid, int Sid, string Pid, string Nickname, string NicknameHex, bool Shiny, int Form, string Sprite);
public sealed record Hall3Catalog(bool Available, bool CanEdit, int Version, OriginChoice[] Versions, Hall3Member[][] Teams, OriginChoice[] SpeciesChoices);
public sealed record Hall3Fields(int? Species = null, int? Level = null, int? Tid = null, int? Sid = null, long? Pid = null, string? Nickname = null, string? NicknameHex = null);
public sealed record Hall3Edit(string Action, int? Team = null, int? Slot = null, bool? All = null, Hall3Fields? Fields = null);
public sealed record Hall3Read(int? Version = null);

internal static class HallOfFame3
{
    private static SAV3 Save(SaveFile save) => save is SAV3RS or SAV3E or SAV3FRLG ? (SAV3)save
        : throw new ArgumentException("Gen3 Hall of Fame is unavailable for this format.");
    private static GameVersion[] Versions(SAV3 save) => save switch
    {
        SAV3RS => [GameVersion.R, GameVersion.S], SAV3E => [GameVersion.E], SAV3FRLG => [GameVersion.FR, GameVersion.LG], _ => [],
    };
    private static LocalizedText Text(Func<GameStrings, string> get) => new(get(GameInfo.GetStrings("zh-Hans")), get(GameInfo.GetStrings("en")), get(GameInfo.GetStrings("ja")));
    private static string VersionName(GameStrings strings, GameVersion version) => new GameDataSource(strings).VersionDataSource.First(v => v.Value == (int)version).Text;
    public static Hall3Catalog Read(SaveFile save, int? version = null)
    {
        var s = Save(save); var versions = Versions(s);
        var selected = version is null ? (versions.Contains(s.Version) ? s.Version : versions[0]) : (GameVersion)version.Value;
        if (!versions.Contains(selected)) throw new ArgumentException("Invalid Gen3 Hall of Fame display version.");
        var choices = versions.Select(v => new OriginChoice((int)v, Text(strings => VersionName(strings, v)))).ToArray();
        var species = Enumerable.Range(1, 386).Select(i => new OriginChoice(i, Text(strings => strings.specieslist[i]))).ToArray();
        if (!s.IsFullSaveFile) return new(false, false, (int)selected, choices, [], species);
        var raw = s.GetHallOfFameData(); var teams = new Hall3Member[50][];
        for (int t = 0; t < 50; t++)
        {
            teams[t] = new Hall3Member[6];
            for (int i = 0; i < 6; i++)
            {
                var p = Member(raw, s.Japanese, t, i); var form = p.DisplayForm(selected);
                teams[t][i] = new(p.Species, BinaryPrimitives.ReadUInt16LittleEndian(p.Data[8..]) & 0x1FF,
                    p.Level, p.TID16, p.SID16, p.PID.ToString("X8"), p.Nickname, Convert.ToHexString(p.NicknameTrash), p.IsShiny, form,
                    "b" + SpriteName.GetResourceStringSprite(p.Species, form, 0, 0, EntityContext.Gen3));
            }
        }
        return new(true, s.State.Exportable && SaveChecksums.Valid(s), (int)selected, choices, teams, species);
    }
    private static HallFame3PKM Member(byte[] raw, bool japanese, int team, int slot) => new(raw.AsMemory((team * 6 + slot) * 20, 20), japanese);
    private static void Position(int? team, int? slot)
    {
        if (team is not (>= 0 and < 50) || slot is not (>= 0 and < 6)) throw new ArgumentException("Invalid Gen3 Hall of Fame position.");
    }
    internal static void Apply(SaveFile save, Hall3Edit edit)
    {
        var s = Save(save);
        if (!s.IsFullSaveFile || !s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Gen3 Hall of Fame editing requires a complete valid save.");
        // The merged copy retains all 7936 bytes, including data after the 300 members.
        var raw = s.GetHallOfFameData();
        switch (edit.Action)
        {
            case "member" when edit.All is null && edit.Fields is { } fields:
                Position(edit.Team, edit.Slot);
                EditMember(Member(raw, s.Japanese, edit.Team!.Value, edit.Slot!.Value), fields);
                break;
            case "clearMember" when edit.All is null && edit.Fields is null:
                Position(edit.Team, edit.Slot);
                var member = Member(raw, s.Japanese, edit.Team!.Value, edit.Slot!.Value);
                member.TID16 = member.SID16 = 0; member.PID = 0; member.Species = 0; member.Level = 0;
                if (member.Nickname.Length != 0) member.Nickname = string.Empty;
                break;
            case "party" when edit.Team is >= 0 and < 50 && edit.Slot is null && edit.Fields is null && edit.All is not null:
                if (s.PartyCount is < 0 or > 6) throw new ArgumentException("Invalid Gen3 Hall of Fame party count.");
                var party = new PKM[6];
                for (int i = 0; i < 6; i++) party[i] = i < s.PartyCount ? s.GetPartySlotAtIndex(i) : new PK3();
                for (int t = 0; t < 50; t++)
                    if (edit.All == true || t == edit.Team)
                        for (int i = 0; i < 6; i++) Member(raw, s.Japanese, t, i).CopyFrom(party[i]);
                break;
            default: throw new ArgumentException("Invalid Gen3 Hall of Fame action or fields.");
        }
        s.SetHallOfFameData(raw);
    }
    private static void EditMember(HallFame3PKM member, Hall3Fields f)
    {
        if (f is { Species:null, Level:null, Tid:null, Sid:null, Pid:null, Nickname:null, NicknameHex:null })
            throw new ArgumentException("Missing Gen3 Hall of Fame member fields.");
        if (f.Species is < 0 or > 386 || f.Level is < 0 or > 255 || f.Tid is < 0 or > 65535 || f.Sid is < 0 or > 65535
            || f.Pid is < 0 or > uint.MaxValue || (f.Nickname is not null && f.NicknameHex is not null))
            throw new ArgumentException("Invalid Gen3 Hall of Fame member fields.");
        if (f.Species is { } species) member.Species = (ushort)species;
        if (f.Level is { } level && level != member.Level) member.Level = level;
        if (f.Tid is { } tid) member.TID16 = (ushort)tid;
        if (f.Sid is { } sid) member.SID16 = (ushort)sid;
        if (f.Pid is { } pid) member.PID = (uint)pid;
        if (f.NicknameHex is { } hex)
        {
            if (hex.Length != 20 || hex.Any(c => !Uri.IsHexDigit(c))) throw new ArgumentException("Invalid Gen3 Hall of Fame nickname bytes.");
            Convert.FromHexString(hex).CopyTo(member.NicknameTrash);
        }
        else if (f.Nickname is { } name && name != member.Nickname)
        {
            if (name.Length > 10) throw new ArgumentException("Gen3 Hall of Fame nickname is too long.");
            member.Nickname = name;
            if (member.Nickname != name) throw new ArgumentException("Gen3 Hall of Fame nickname cannot be encoded without loss.");
        }
    }
    internal static byte[] Edit(byte[] data, Hall3Edit edit)
    {
        if (data.Length is 0 or > (32 * 1024 * 1024)) throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s = Save(SaveUtil.GetSaveFile(data.ToArray()) ?? throw new ArgumentException("Unrecognized save."));
        Apply(s, edit); var expected = s.GetHallOfFameData(); var output = s.Write().ToArray();
        var check = Save(SaveUtil.GetSaveFile(output.ToArray()) ?? throw new InvalidOperationException("Gen3 Hall of Fame output was not recognized."));
        if (output.Length != data.Length || check.GetType() != s.GetType() || check.Version != s.Version || check.SaveRevision != s.SaveRevision
            || !check.IsFullSaveFile || !SaveChecksums.Valid(check) || !expected.SequenceEqual(check.GetHallOfFameData()))
            throw new InvalidOperationException("Gen3 Hall of Fame export verification failed.");
        return output;
    }
}

public static partial class SaveService
{
    public static string ReadHall3(byte[] data, string json)
    {
        if (json.Length > 128) throw new ArgumentException("Hall of Fame request is too large.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Hall3Read) ?? throw new ArgumentException("Missing Hall of Fame request.");
        return JsonSerializer.Serialize(HallOfFame3.Read(Open(data), request.Version), SaveJsonContext.Default.Hall3Catalog);
    }
    public static byte[] EditHall3(byte[] data, string json)
    {
        if (json.Length > 4096) throw new ArgumentException("Hall of Fame request is too large.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Hall3Edit) ?? throw new ArgumentException("Missing Hall of Fame edit.");
        return HallOfFame3.Edit(data, edit);
    }
}
