// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Tr6PositionField(string Key,string Value,string Display,string Min,string Max,int Places);
public sealed record Tr6Position(bool CanEdit,Tr6PositionField[] Fields);
internal static class Trainer6Position
{
    private static readonly string[] Keys=["map","x","z","y","rotation"];
    private static readonly decimal[] Minimum=[0,0,-65535,0,0],Maximum=[1000,65535,65535,65535,7];
    private static decimal[] Values(SAV6 save){var p=save.Situation;return[p.M,(decimal)(p.X/18.0),(decimal)(p.Z/18.0),(decimal)(p.Y/18.0),p.R];}
    internal static Tr6Position Read(SAV6 save)
    {
        decimal[]? values=null;try{values=Values(save);}catch(OverflowException){}
        bool valid=values is not null&&Enumerable.Range(0,5).All(i=>values[i]>=Minimum[i]&&values[i]<=Maximum[i]);
        var p=save.Situation;string[] fallback=[p.M.ToString(CultureInfo.InvariantCulture),(p.X/18.0).ToString("R",CultureInfo.InvariantCulture),(p.Z/18.0).ToString("R",CultureInfo.InvariantCulture),(p.Y/18.0).ToString("R",CultureInfo.InvariantCulture),p.R.ToString(CultureInfo.InvariantCulture)];
        return new(valid,Enumerable.Range(0,5).Select(i=>new Tr6PositionField(Keys[i],values is null?fallback[i]:values[i].ToString(CultureInfo.InvariantCulture),values is null?fallback[i]:values[i].ToString(i is 0 or 4?"F0":"F6",CultureInfo.InvariantCulture),Minimum[i].ToString(CultureInfo.InvariantCulture),Maximum[i].ToString(CultureInfo.InvariantCulture),i is 0 or 4?0:6)).ToArray());
    }
    internal static string[] Apply(SAV6 save,Tr6Value[] rows,string? language)
    {
        var culture=SuperTrain6Editing.Culture(language);
        if(!Read(save).CanEdit)throw new ArgumentException("Trainer6 source position cannot be loaded.");
        if(rows.Length is <1 or >5||rows.Select(v=>v.Key).Distinct().Count()!=rows.Length)throw new ArgumentException("Invalid Trainer6 position list.");
        var values=Values(save);bool dirty=false;var ignored=new List<string>();
        foreach(var row in rows){int index=Array.IndexOf(Keys,row.Key);if(index<0||row.Value is null||row.Value.Length>32767)throw new ArgumentException("Invalid Trainer6 position field.");if(!decimal.TryParse(row.Value,NumberStyles.Number,culture,out decimal value)){ignored.Add(row.Key);continue;}value=Math.Clamp(value,Minimum[index],Maximum[index]);if(value!=values[index]){dirty=true;values[index]=value;}}
        if(dirty){var p=save.Situation;p.M=(int)values[0];p.X=(float)(values[1]*18);p.Z=(float)(values[2]*18);p.Y=(float)(values[3]*18);p.R=(int)values[4];}
        return ignored.ToArray();
    }
}
