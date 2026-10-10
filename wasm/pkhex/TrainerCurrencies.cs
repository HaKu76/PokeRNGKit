// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record TrainerCurrencyField(string Key, long Value, int Max);
public sealed record TrainerCurrencyEdit(long? Bp = null, long? PokeMiles = null, long? FestivalCoins = null, long? Watts = null);
internal static class TrainerCurrencies
{
    public static TrainerCurrencyField[] Read(SaveFile save) => save switch
    {
        SAV5 s => [new("bp",s.BattleSubway.BP,s.MaxCoins)],
        SAV6XY s => [new("bp",s.BP,9999),new("pokeMiles",s.GetRecord(63),9999999)],
        SAV6AO s => [new("bp",s.BP,9999),new("pokeMiles",s.GetRecord(63),9999999)],
        SAV6AODemo s => [new("bp",s.BP,9999),new("pokeMiles",s.GetRecord(63),9999999)],
        SAV7 s => [new("bp",s.Misc.BP,9999),new("festivalCoins",s.Festa.FestaCoins,9999999)],
        SAV8SWSH s => [new("bp",s.Misc.BP,9999),new("watts",s.MyStatus.Watt,(int)MyStatus8.MaxWatt)],
        SAV8BS s => [new("bp",s.BattleTower.BP,9999)],
        _ => [],
    };
    public static string Snapshot(SaveFile save) => string.Join(";",Read(save).Select(f=>$"{f.Key}={f.Value}")) + "/" + (save switch
    {
        SAV6 s => s.GetRecord(64).ToString(),
        SAV7 s => s.Festa.TotalFestaCoins.ToString(),
        SAV8SWSH s => s.GetRecord(Record8.WattTotal).ToString(),
        _ => "",
    });
    public static void Apply(SaveFile save,TrainerCurrencyEdit edit)
    {
        var fields=Read(save);
        var changes=new (string Key,long? Value)[]{("bp",edit.Bp),("pokeMiles",edit.PokeMiles),("festivalCoins",edit.FestivalCoins),("watts",edit.Watts)};
        foreach(var (key,value) in changes)
        {
            if(value is null) continue;
            var field=fields.SingleOrDefault(f=>f.Key==key);
            if(field is null || value < 0 || value > field.Max)
                throw new ArgumentException("Trainer currency is unsupported or out of range.");
        }
        foreach(var (key,value) in changes)
        {
            if(value is null || fields.Single(f=>f.Key==key).Value==value) continue;
            int v=(int)value.Value;
            switch(key,save)
            {
                case ("bp",SAV5 s): s.BattleSubway.BP=v; break;
                case ("bp",SAV6 s): s.BP=v; break;
                case ("bp",SAV7 s): s.Misc.BP=(uint)v; break;
                case ("bp",SAV8SWSH s): s.Misc.BP=v; break;
                case ("bp",SAV8BS s): s.BattleTower.BP=(uint)v; break;
                case ("pokeMiles",SAV6 s): s.SetRecord(63,v); s.SetRecord(64,v); break;
                case ("festivalCoins",SAV7 s): s.Festa.FestaCoins=v; break;
                case ("watts",SAV8SWSH s):
                    s.MyStatus.Watt=(uint)v;
                    if(s.GetRecord(Record8.WattTotal)<v) s.SetRecord(Record8.WattTotal,v);
                    break;
            }
            if(Read(save).Single(f=>f.Key==key).Value!=v)
                throw new ArgumentException("Trainer currency cannot be represented by this save.");
        }
    }
}
