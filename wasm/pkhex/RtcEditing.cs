// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
namespace PokeRNGKit.SaveEditor;
public sealed record RtcCatalog(int[] Initial,int[] Elapsed);
public sealed record RtcEdit(string Action,int[]? Initial=null,int[]? Elapsed=null);
internal static class RtcEditing
{
    internal static ISaveBlock3SmallHoenn Block(SaveFile save)=>save switch{SAV3RS s=>s.SmallBlock,SAV3E s=>s.SmallBlock,_=>throw new ArgumentException("RTC editing is unavailable for this format.")};
    private static int[] Values(RTC3 clock)=>[clock.Day,clock.Hour,clock.Minute,clock.Second];
    public static RtcCatalog Read(SaveFile save){var b=Block(save);return new(Values(b.ClockInitial),Values(b.ClockElapsed));}
    public static string Snapshot(SaveFile save){var b=Block(save);return Convert.ToHexString(b.ClockInitial.Data)+Convert.ToHexString(b.ClockElapsed.Data);}
    private static void Validate(int[]? values,RTC3 clock)
    {
        if(values is not {Length:4})throw new ArgumentException("Four clock fields are required.");
        int[] old=Values(clock),max=[65535,23,59,59];
        for(int i=0;i<4;i++)if(values[i]<0 || values[i]>max[i]&&values[i]!=old[i])throw new ArgumentException("Clock value is out of range.");
    }
    private static void Set(RTC3 clock,int[] values){clock.Day=values[0];clock.Hour=values[1];clock.Minute=values[2];clock.Second=values[3];}
    public static void Apply(SaveFile save,RtcEdit edit)
    {
        var b=Block(save);var initial=b.ClockInitial;var elapsed=b.ClockElapsed;
        if(edit.Action=="edit"){Validate(edit.Initial,initial);Validate(edit.Elapsed,elapsed);Set(initial,edit.Initial!);Set(elapsed,edit.Elapsed!);}
        else
        {
            if(edit.Initial is not null || edit.Elapsed is not null)throw new ArgumentException("Clock bulk actions do not accept draft fields.");
            switch(edit.Action){case "reset":Set(initial,[0,0,0,0]);Set(elapsed,[0,0,0,0]);break;case "berryFix":elapsed.Day=Math.Max(734,elapsed.Day);break;default:throw new ArgumentException("Unknown clock action.");}
        }
        b.ClockInitial=initial;b.ClockElapsed=elapsed;
    }
}
public static partial class SaveService
{
    public static string ReadRtc(byte[] data)=>JsonSerializer.Serialize(RtcEditing.Read(Open(data)),SaveJsonContext.Default.RtcCatalog);
    public static byte[] EditRtc(byte[] data,string json)
    {
        var save=Open(data);
        if(!CanEdit(save)||!save.State.Exportable||!SaveChecksums.Valid(save))throw new ArgumentException("Editing requires a supported save with valid checksums.");
        if(json.Length>2048)throw new ArgumentException("Clock request is too large.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.RtcEdit)??throw new ArgumentException("Missing clock edit.");
        RtcEditing.Apply(save,edit);var expected=RtcEditing.Snapshot(save);var output=save.Write().ToArray();var check=Open(output);
        if(check.GetType()!=save.GetType()||!SaveChecksums.Valid(check)||RtcEditing.Snapshot(check)!=expected)throw new InvalidOperationException("Clock export verification failed.");
        return output;
    }
}
