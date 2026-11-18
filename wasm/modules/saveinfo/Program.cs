// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

namespace PokeRNGKit.SaveInfo;

public static partial class Program
{
    private const int MaximumSize = 32 * 1024 * 1024;

    public static void Main() { }

    [JSExport]
    public static void ConfigureBrowserCrypto()
    {
        RuntimeCryptographyProvider.Aes = new BrowserAesProvider();
        RuntimeCryptographyProvider.Md5 = new BrowserMd5Provider();
    }

    [JSExport]
    public static string ReadSummary(byte[] data)
    {
        if (data.Length is 0 or > MaximumSize || data.AsSpan().StartsWith("PK\u0003\u0004"u8))
            return "null";

        var save = SaveUtil.GetSaveFile(data);
        if (save is null)
            return "null";

        var summary = new SaveSummary(
            new(GameName(save.Version, "zh-Hans"), GameName(save.Version, "en"), GameName(save.Version, "ja")),
            save is SAV4BR br ? br.CurrentOT : save.OT,
            save.TID16,
            save.SID16,
            save.TrainerIDDisplayFormat == TrainerIDFormat.SixDigit
                ? save.DisplayTID.ToString("D6", CultureInfo.InvariantCulture)
                : null,
            save.PlayTimeString,
            SaveChecksums.Valid(save));
        return JsonSerializer.Serialize(summary, SaveInfoJson.Default.SaveSummary);
    }

    private static string GameName(GameVersion version, string language)
    {
        var names = GameInfo.GetStrings(language).gamelist;
        return (uint)version < names.Length && !string.IsNullOrWhiteSpace(names[(int)version])
            ? names[(int)version]
            : version.ToString();
    }
}

internal sealed record GameNames(string Zh, string En, string Ja);
internal sealed record SaveSummary(GameNames Game, string Trainer, ushort Tid, ushort Sid,
    string? DisplayTid, string PlayTime, bool ChecksumsValid);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveSummary))]
internal partial class SaveInfoJson : JsonSerializerContext { }
