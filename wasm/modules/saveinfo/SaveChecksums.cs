// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using PKHeX.Core;

namespace PokeRNGKit.SaveInfo;

internal static class SaveChecksums
{
    public static bool Valid(SaveFile save)
    {
        if (save is not SAV2 { Korean: true } korean) return save.ChecksumsValid;
        // SAV2.GetFinalData writes GetKoreanChecksum to the second location.
        // SAV2.ChecksumInfo compares both locations with the primary checksum, incorrectly rejecting this layout.
        var offsets = new SAV2Offsets(korean);
        ushort primary = 0, backup = 0;
        for (int i = offsets.Trainer1; i <= offsets.AccumulatedChecksumEnd; i++) primary = unchecked((ushort)(primary + korean.Data[i]));
        foreach (var (start, end) in new (int, int)[] { (0x106B, 0x1533), (0x1534, 0x1A12), (0x1A13, 0x1C38), (0x3DD8, 0x3F79), (0x7E39, 0x7E6A) })
            for (int i = start; i < end; i++) backup = unchecked((ushort)(backup + korean.Data[i]));
        return BinaryPrimitives.ReadUInt16LittleEndian(korean.Data[offsets.OverallChecksumPosition..]) == primary &&
            BinaryPrimitives.ReadUInt16LittleEndian(korean.Data[offsets.OverallChecksumPosition2..]) == backup;
    }
}
