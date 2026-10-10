// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record Zygarde7Entry(int Index,LocalizedText Location,int State);
public sealed record Zygarde7Catalog(bool CanEdit,string SourceHash,bool Stickers,int Total,int Collected,Zygarde7Entry[] Entries);
public sealed record Zygarde7Value(int Index,int State);
public sealed record Zygarde7Edit(string Action,string? SourceHash,Zygarde7Value[]? Entries=null,int? Total=null,int? Collected=null,string? TargetHash=null);
public sealed record Zygarde7Preview(Zygarde7Edit Request,Zygarde7Catalog Result,int[] ChangedOffsets);
internal static class Zygarde7Editing
{
    private static SAV7 Save(SaveFile save)=>save is SAV7SM or SAV7USUM?(SAV7)save:throw new ArgumentException("Collectibles7 requires Sun/Moon or Ultra Sun/Ultra Moon.");
    internal static Zygarde7Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var w=s.EventWork;var locations=Zygarde7Locations.Read(s is SAV7USUM);
        if(locations.Length!=w.TotalZygardeCellCount)throw new InvalidOperationException("Collectibles7 location layout mismatch.");
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,s is SAV7USUM,w.ZygardeCellTotal,w.ZygardeCellCount,Enumerable.Range(0,locations.Length).Select(i=>new Zygarde7Entry(i,locations[i],w.GetZygardeCell(i))).ToArray());
    }
    internal static byte[] Prepare(SaveFile save,Zygarde7Edit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Collectibles7 editing requires valid checksums.");
        if(e.SourceHash!=hash)throw new ArgumentException("Collectibles7 preview is stale.");
        if(e.Total is <0 or >65535||e.Collected is <0 or >65535)throw new ArgumentException("Collectibles7 counters require 0–65535.");
        var copy=(SAV7)s.Clone();var w=copy.EventWork;
        switch(e.Action)
        {
            case "patch":
                if(e.Entries is null&&e.Total is null&&e.Collected is null)throw new ArgumentException("Missing Collectibles7 changes.");
                if(e.Entries is {} rows){if(rows.Length<1||rows.Length>w.TotalZygardeCellCount||rows.Select(v=>v.Index).Distinct().Count()!=rows.Length||rows.Any(v=>v.Index<0||v.Index>=w.TotalZygardeCellCount||v.State<0||v.State>2))throw new ArgumentException("Invalid Collectibles7 entries.");foreach(var row in rows)w.SetZygardeCell(row.Index,(ushort)row.State);}
                if(e.Total is {} total)w.ZygardeCellTotal=(ushort)total;
                if(e.Collected is {} collected)w.ZygardeCellCount=(ushort)collected;
                break;
            case "giveAll":
                if(e.Entries is not null||e.Total is not null||e.Collected is not null)throw new ArgumentException("Invalid Collectibles7 give-all fields.");
                if(Enumerable.Range(0,w.TotalZygardeCellCount).Any(i=>w.GetZygardeCell(i)>2))throw new ArgumentException("Collectibles7 give-all requires recognized states.");
                int added=Enumerable.Range(0,w.TotalZygardeCellCount).Count(i=>w.GetZygardeCell(i)!=2);
                int count=w.ZygardeCellCount+added;int all=w.ZygardeCellTotal+(copy is SAV7USUM?0:added);
                if(count>65535||all>65535)throw new ArgumentException("Collectibles7 give-all counter overflow.");
                for(int i=0;i<w.TotalZygardeCellCount;i++)w.SetZygardeCell(i,2);w.ZygardeCellCount=(ushort)count;w.ZygardeCellTotal=(ushort)all;
                break;
            case "resave":
                if(e.Entries is not null||e.Total is not null||e.Collected is not null||Enumerable.Range(0,w.TotalZygardeCellCount).Any(i=>w.GetZygardeCell(i)>2))throw new ArgumentException("Invalid Collectibles7 source resave.");
                for(int i=0;i<w.TotalZygardeCellCount;i++)w.SetZygardeCell(i,w.GetZygardeCell(i));w.ZygardeCellTotal=w.ZygardeCellTotal;w.ZygardeCellCount=w.ZygardeCellCount;
                break;
            default:throw new ArgumentException("Invalid Collectibles7 action.");
        }
        // The source Save button synchronizes USUM record 72 even when only a state changes.
        if(copy is SAV7USUM)copy.SetRecord(72,w.ZygardeCellCount);
        var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray());
        if(check is null||check.GetType()!=copy.GetType()||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!check.Data.SequenceEqual(copy.Data))throw new InvalidOperationException("Collectibles7 export verification failed.");
        if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Collectibles7 preview target is stale.");
        return output;
    }
}
public static partial class SaveService
{
    private static Zygarde7Edit ParseZygarde7(string json)=>json.Length>30000?throw new ArgumentException("Collectibles7 request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Zygarde7Edit)??throw new ArgumentException("Missing Collectibles7 edit.");
    public static string ReadZygarde7(byte[] data)=>JsonSerializer.Serialize(Zygarde7Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Zygarde7Catalog);
    public static string PreviewZygarde7(byte[] data,string json){var e=ParseZygarde7(json);var output=Zygarde7Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Zygarde7Preview(e with{TargetHash=hash},Zygarde7Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Zygarde7Preview);}
    public static byte[] EditZygarde7(byte[] data,string json){var e=ParseZygarde7(json);if(e.TargetHash is null)throw new ArgumentException("Collectibles7 requires a frozen preview.");return Zygarde7Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
}
