// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
namespace PokeRNGKit.SaveEditor;
public sealed record RoamerCatalog(int Species,int State,uint Encounters,int? SuggestedSpecies);
public sealed record RoamerEdit(int? Species=null,int? State=null,long? Encounters=null);
internal static class RoamerEditing
{
    internal static SAV6XY Save(SaveFile save)=>save as SAV6XY??throw new ArgumentException("Roamer editing is unavailable for this format.");
    public static RoamerCatalog Read(SaveFile save)
    {
        var s=Save(save);var r=s.Encount.Roamer;var starter=s.EventWork.GetWork(48);
        return new(r.Species,(int)r.RoamStatus,r.TimesEncountered,r.Species==0&&starter<=2?144+starter:null);
    }
    public static string Snapshot(SaveFile save)=>Convert.ToHexString(Save(save).Encount.Roamer.Data.Span);
    public static void Apply(SaveFile save,RoamerEdit edit)
    {
        var r=Save(save).Encount.Roamer;
        if(edit.Species is not {} species || edit.State is not {} state || edit.Encounters is not {} count)
            throw new ArgumentException("All roamer fields are required.");
        if(species!=r.Species && species is not (144 or 145 or 146))throw new ArgumentException("Invalid roamer species.");
        if(state!= (int)r.RoamStatus && state is <0 or >4)throw new ArgumentException("Invalid roamer state.");
        if(count!=r.TimesEncountered && count is <0 or >11)throw new ArgumentException("Encounter count is out of range.");
        if(species!=r.Species)r.Species=(ushort)species;
        if(state!=(int)r.RoamStatus)r.RoamStatus=(Roamer6State)state;
        if(count!=r.TimesEncountered)r.TimesEncountered=(uint)count;
    }
}
public static partial class SaveService
{
    public static string ReadRoamer(byte[] data)=>JsonSerializer.Serialize(RoamerEditing.Read(Open(data)),SaveJsonContext.Default.RoamerCatalog);
    public static byte[] EditRoamer(byte[] data,string json)
    {
        var save=Open(data);
        if(!CanEdit(save)||!save.State.Exportable||!SaveChecksums.Valid(save))throw new ArgumentException("Editing requires a supported save with valid checksums.");
        if(json.Length>1024)throw new ArgumentException("Roamer request is too large.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.RoamerEdit)??throw new ArgumentException("Missing roamer edit.");
        RoamerEditing.Apply(save,edit);var expected=RoamerEditing.Snapshot(save);var output=save.Write().ToArray();var check=Open(output);
        if(check.GetType()!=save.GetType()||!SaveChecksums.Valid(check)||RoamerEditing.Snapshot(check)!=expected)throw new InvalidOperationException("Roamer export verification failed.");
        return output;
    }
}
