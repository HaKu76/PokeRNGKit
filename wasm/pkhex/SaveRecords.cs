// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Globalization;
namespace PokeRNGKit.SaveEditor;

public sealed record SaveRecordEntry(int Index,string Name,int Value,int Max,int NormalMax,int Offset,string? TimeHint,LocalizedText? TimeHintLocalized=null);
public sealed record SaveRecordCatalog(SaveRecordEntry[] Entries);
public sealed record SaveRecordEdit(int Index,int Value);
internal static class SaveRecords
{
    private static LocalizedText LocalizedTime(int value,int bias)
    {
        int days=value/86400,remaining=value%86400;string clock=new TimeOnly(remaining*TimeSpan.TicksPerSecond).ToString("HH:mm:ss",CultureInfo.InvariantCulture);
        // DateUtil uses the within-day remainder and an unchecked int addition. Preserve both.
        string? date=bias<0?null:new DateTime(2000,1,1).AddSeconds(unchecked(remaining+bias)).ToString("yyyy-MM-dd HH:mm:ss",CultureInfo.InvariantCulture);
        return new((days>0?days+"天 ":"")+clock+(date is null?"":"\n日期："+date),(days>0?days+"d ":"")+clock+(date is null?"":"\nDate: "+date),(days>0?days+"日 ":"")+clock+(date is null?"":"\n日時："+date));
    }
    public static bool Supports(SaveFile save) => save is SAV6XY or SAV6AO or SAV7SM or SAV7USUM or SAV8SWSH or SAV8BS;
    public static SaveRecordCatalog Read(SaveFile save)
    {
        if(!Supports(save)) throw new ArgumentException("Game records are unavailable for this format.");
        var records=(ITrainerStatRecord)save;
        var names=save switch { SAV6 => RecordLists.RecordList_6, SAV7 => RecordLists.RecordList_7, SAV8BS => Record8b.RecordList_8b, _ => RecordLists.RecordList_8 };
        return new(Enumerable.Range(0,records.RecordCount).Select(i => {
            int value=records.GetRecord(i),max=records.GetRecordMax(i);
            string? time= i==2 && save is SAV6 or SAV7 && value>=0
                ? DateUtil.ConvertDateValueToString(value,save.SecondsToStart <= int.MaxValue ? (int)save.SecondsToStart : -1) : null;
            return new SaveRecordEntry(i,names.GetValueOrDefault(i,i.ToString("D3")),value,Math.Max(value,max),max,records.GetRecordOffset(i),time,time is null?null:LocalizedTime(value,save.SecondsToStart<=int.MaxValue?(int)save.SecondsToStart:-1));
        }).ToArray());
    }
    public static string Snapshot(SaveFile save) => Convert.ToHexString(save switch {
        SAV6 s => s.Records.Data, SAV7 s => s.Records.Data, SAV8SWSH s => s.Records.Data, SAV8BS s => s.Records.Data,
        _ => throw new ArgumentException("Game records are unavailable for this format."),
    });
    public static string Apply(SaveFile save,SaveRecordEdit edit)
    {
        var catalog=Read(save);
        if(edit.Index < 0 || edit.Index >= catalog.Entries.Length) throw new ArgumentException("Game record index is out of range.");
        var entry=catalog.Entries[edit.Index];
        if(edit.Value < 0 || edit.Value > entry.Max) throw new ArgumentException("Game record value is out of range.");
        if(edit.Value!=entry.Value)
        {
            var records=(ITrainerStatRecord)save;
            records.SetRecord(edit.Index,edit.Value);
            if(records.GetRecord(edit.Index)!=Math.Min(edit.Value,entry.NormalMax))
                throw new ArgumentException("Game record value cannot be represented by this save.");
        }
        return Snapshot(save);
    }
}
