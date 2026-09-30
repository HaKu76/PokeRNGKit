// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;

namespace PokeRNGKit.SaveEditor;

public sealed record GsBall2Catalog(bool Available, bool Enabled, bool CanEdit);
internal static class GsBall2
{
    private static SAV2 Save(SaveFile save) => save is SAV2 { Version: GameVersion.C, Korean: false } s
        ? s : throw new ArgumentException("GS Ball event is unavailable for this format.");
    private static (int Primary, int Backup) Positions(SAV2 save) => save.Japanese ? (0xA000, 0xA083) : (0x3E3C, 0x3E44);
    public static GsBall2Catalog Read(SaveFile save)
    {
        var s = Save(save); var (_, backup) = Positions(s);
        bool available = s.Data.Length > backup;
        return new(available, available && s.IsEnabledGSBallMobileEvent,
            available && s.State.Exportable && SaveChecksums.Valid(s));
    }
    internal static void Apply(SaveFile save)
    {
        var s = Save(save); var state = Read(s);
        if (!state.CanEdit || state.Enabled)
            throw new ArgumentException("GS Ball event requires an intact, valid save with an event that is not already enabled.");
        s.EnableGSBallMobileEvent();
    }
    internal static byte[] Edit(byte[] data)
    {
        if (data.Length is 0 or > (32 * 1024 * 1024)) throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s = Save(SaveUtil.GetSaveFile(data.ToArray()) ?? throw new ArgumentException("Unrecognized save."));
        Apply(s); var output = s.Write().ToArray();
        var check = Save(SaveUtil.GetSaveFile(output.ToArray()) ?? throw new InvalidOperationException("GS Ball output was not recognized."));
        var (primary, backup) = Positions(check);
        if (output.Length != data.Length || check.Version != s.Version || check.SaveRevision != s.SaveRevision || !SaveChecksums.Valid(check)
            || check.Data.Length <= backup || check.Data[primary] != 0x0B || check.Data[backup] != 0x0B)
            throw new InvalidOperationException("GS Ball export verification failed.");
        return output;
    }
}

public static partial class SaveService
{
    public static string ReadGsBall2(byte[] data) => JsonSerializer.Serialize(GsBall2.Read(Open(data)), SaveJsonContext.Default.GsBall2Catalog);
    public static byte[] EnableGsBall2(byte[] data) => GsBall2.Edit(data);
}
