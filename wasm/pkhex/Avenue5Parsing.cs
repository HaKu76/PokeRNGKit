// SPDX-License-Identifier: GPL-3.0-or-later
// Parsing and formatting derived from PKHeX 26.08.26 JoinAvenueVisitorSpecificEditor.
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static partial class Avenue5Fields {
    internal static string FormatDate(ushort raw)
    {
        if (raw == 0)
            return string.Empty;

        var date = new JoinAvenueDate5(raw);
        return date.Date is { } value ? value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : $"0x{raw:X4}";
    }

    internal static ushort ParseDate(string text)
    {
        text = text.Trim();
        if (string.IsNullOrWhiteSpace(text))
            return 0;
        if (TryParseUInt(text, out var raw))
            return (ushort)Math.Min(raw, ushort.MaxValue);
        if (DateOnly.TryParse(text, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
        {
            JoinAvenueDate5 value = default;
            value.Date = date;
            return value.RawValue;
        }
        return 0;
    }

    internal static byte[] ParseByteList(string text, int count, byte max)
    {
        var result = new byte[count];
        var split = Split(text);
        for (int i = 0; i < count && i < split.Length; i++)
        {
            if (TryParseUInt(split[i], out var value))
                result[i] = (byte)Math.Min(value, max);
        }
        return result;
    }

    internal static uint[] ParseUIntList(string text, int count)
    {
        var result = new uint[count];
        var split = Split(text);
        for (int i = 0; i < count && i < split.Length; i++)
        {
            if (TryParseUInt(split[i], out var value))
                result[i] = value;
        }
        return result;
    }

    internal static ushort[] ParseDateList(string text, int count)
    {
        var result = new ushort[count];
        var split = Split(text);
        for (int i = 0; i < count && i < split.Length; i++)
            result[i] = ParseDate(split[i]);
        return result;
    }

    internal static string[] Split(string text) => text.Split([',', ';', '|', '\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    internal static bool TryParseUInt(string text, out uint value)
    {
        text = text.Trim();
        if (text.StartsWith("0x", StringComparison.OrdinalIgnoreCase))
            return uint.TryParse(text[2..], NumberStyles.HexNumber, CultureInfo.InvariantCulture, out value);
        return uint.TryParse(text, NumberStyles.Integer, CultureInfo.InvariantCulture, out value);
    }

}
