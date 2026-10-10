// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record TrainerBadgeState(int Count, int Value);
internal static class TrainerBadges
{
    public static TrainerBadgeState? Read(SaveFile save) => save switch
    {
        SAV3 s => new(8,s.Badges),
        SAV4HGSS s => new(16,s.Badges | (s.Badges16 << 8)),
        SAV4 s => new(8,s.Badges),
        SAV5 s => new(8,s.Misc.Badges),
        SAV6XY s => new(8,s.Badges),
        SAV6AO s => new(8,s.Badges),
        SAV6AODemo s => new(8,s.Badges),
        SAV8BS s => new(8,Enumerable.Range(0,8).Aggregate(0,(mask,i) => mask | (s.FlagWork.GetSystemFlag(124+i) ? 1 << i : 0))),
        _ => null,
    };
    public static void Apply(SaveFile save,int value)
    {
        if (Read(save) is not { } before || value < 0 || value >= (1 << before.Count))
            throw new ArgumentException("Trainer badges are unsupported or out of range.");
        if (before.Value == value) return;
        switch(save)
        {
            case SAV3 s: s.Badges=value; break;
            case SAV4HGSS s:
                if((before.Value & 255)!=(value & 255)) s.Badges=(byte)value;
                if((before.Value >> 8)!=(value >> 8)) s.Badges16=value >> 8;
                break;
            case SAV4 s: s.Badges=(byte)value; break;
            case SAV5 s: s.Misc.Badges=value; break;
            case SAV6 s: s.Badges=value; break;
            case SAV8BS s:
                // Preserve noncanonical unchanged system flags, rather than rewriting all eight.
                for(int i=0;i<8;i++)
                    if(((before.Value ^ value) & (1 << i))!=0) s.FlagWork.SetSystemFlag(124+i,(value & (1 << i))!=0);
                break;
        }
    }
}
