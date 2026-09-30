// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
namespace PokeRNGKit.SaveEditor;
public sealed record EventResetEntry(string Id,string Name,bool Hidden);
public sealed record EventResetCatalog(EventResetEntry[] Entries,bool CanEdit);
public sealed record EventResetEdit(string[]? Ids=null);
internal static class EventReset1
{
    internal static SAV1 Save(SaveFile save)=>save is SAV1 {Version:GameVersion.RB or GameVersion.YW} s ? s : throw new ArgumentException("Event reset is unavailable for this format.");
    public static EventResetCatalog Read(SaveFile save,string language)
    {
        var s=Save(save);
        var lang=language switch {"zh"=>"zh-Hans","en"=>"en","ja"=>"ja",_=>throw new ArgumentException("Invalid event reset language.")};
        var names=GameInfo.GetStrings(lang).specieslist;
        var entries=new G1OverworldSpawner(s).GetFlagPairs().OrderBy(p=>p.Name,StringComparer.Ordinal).Select(p=>
        {
            var key=p.Name.AsSpan(G1OverworldSpawner.FlagPropertyPrefix.Length);int split=key.IndexOf('_');
            if(!SpeciesName.TryGetSpecies(split<0?key:key[..split],(int)LanguageID.English,out var species))throw new InvalidOperationException("Unknown event reset species.");
            var name=names[species]+(split<0?string.Empty:" "+key[(split+1)..].ToString());
            return new EventResetEntry(p.Name,name,p.IsHidden);
        }).ToArray();
        if(entries.Length!=(s.Version==GameVersion.YW?21:18))throw new InvalidOperationException("Incomplete event reset catalog.");
        return new(entries,s.State.Exportable&&SaveChecksums.Valid(s));
    }
    internal static void Apply(SaveFile save,EventResetEdit edit)
    {
        var s=Save(save);var spawner=new G1OverworldSpawner(s);var pairs=spawner.GetFlagPairs().ToDictionary(p=>p.Name,StringComparer.Ordinal);
        if(edit.Ids is not {Length:>0} ids||ids.Length>pairs.Count)throw new ArgumentException("Missing or excessive event reset selection.");
        var seen=new HashSet<string>(StringComparer.Ordinal);
        foreach(var id in ids)
            if(string.IsNullOrEmpty(id)||!seen.Add(id)||!pairs.TryGetValue(id,out var pair)||!pair.IsHidden)
                throw new ArgumentException("Invalid, duplicate or already reset event selection.");
        foreach(var id in ids)pairs[id].Reset();
        spawner.Save();
    }
}
public static partial class SaveService
{
    public static string ReadEventReset(byte[] data,string json)
    {
        if(json.Length>128)throw new ArgumentException("Event reset query is too large.");
        var query=JsonSerializer.Deserialize(json,SaveJsonContext.Default.EventQuery)??throw new ArgumentException("Missing event reset query.");
        return JsonSerializer.Serialize(EventReset1.Read(Open(data),query.Language),SaveJsonContext.Default.EventResetCatalog);
    }
    public static byte[] EditEventReset(byte[] data,string json)
    {
        var save=EventReset1.Save(Open(data));
        if(!save.State.Exportable||!SaveChecksums.Valid(save))throw new ArgumentException("Event reset requires a valid exportable save.");
        if(json.Length>8192)throw new ArgumentException("Event reset request is too large.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.EventResetEdit)??throw new ArgumentException("Missing event reset edit.");
        EventReset1.Apply(save,edit);var flags=save.GetEventFlags();var spawn=save.EventSpawnFlags;var output=save.Write().ToArray();var check=EventReset1.Save(Open(output));
        if(check.Version!=save.Version||check.SaveRevision!=save.SaveRevision||!SaveChecksums.Valid(check)||!flags.SequenceEqual(check.GetEventFlags())||!spawn.SequenceEqual(check.EventSpawnFlags))
            throw new InvalidOperationException("Event reset export verification failed.");
        return output;
    }
}
