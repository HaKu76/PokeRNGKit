// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Security.Cryptography;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Gear4Choice(int Id,string Source);
public sealed record Gear4Plan(string Action,int[] Slots);
public sealed record PokeGear4Catalog(bool CanEdit,int Player,string SourceHash,int[] Slots,Gear4Choice[] Choices,Gear4Plan[] Plans);
public sealed record Gear4SlotEdit(int? Slot,int? Value);
public sealed record PokeGear4Edit(string Action,Gear4SlotEdit[]? Slots=null,string? SourceHash=null);
internal static class PokeGear4Editing
{
    private static SAV4HGSS Save(SaveFile s)=>s as SAV4HGSS??throw new ArgumentException("PokeGear4 is unavailable for this format.");
    private static readonly PokegearNumber[] Contacts=[PokegearNumber.Mother,PokegearNumber.Professor_Elm,PokegearNumber.Professor_Oak,PokegearNumber.Ethan,PokegearNumber.Lyra,PokegearNumber.Kurt,PokegearNumber.Daycare_Man,PokegearNumber.Daycare_Lady,PokegearNumber.Buena,PokegearNumber.Bill,PokegearNumber.Joey,PokegearNumber.Ralph,PokegearNumber.Liz,PokegearNumber.Wade,PokegearNumber.Anthony,PokegearNumber.Bike_Shop,PokegearNumber.Kenji,PokegearNumber.Whitney,PokegearNumber.Falkner,PokegearNumber.Jack,PokegearNumber.Chad,PokegearNumber.Brent,PokegearNumber.Todd,PokegearNumber.Arnie,PokegearNumber.Baoba,PokegearNumber.Irwin,PokegearNumber.Janine,PokegearNumber.Clair,PokegearNumber.Erika,PokegearNumber.Misty,PokegearNumber.Blaine,PokegearNumber.Blue,PokegearNumber.Chuck,PokegearNumber.Brock,PokegearNumber.Bugsy,PokegearNumber.Sabrina,PokegearNumber.Lieutenant_Surge,PokegearNumber.Morty,PokegearNumber.Jasmine,PokegearNumber.Pryce,PokegearNumber.Huey,PokegearNumber.Gaven,PokegearNumber.Jamie,PokegearNumber.Reena,PokegearNumber.Vance,PokegearNumber.Parry,PokegearNumber.Erin,PokegearNumber.Beverly,PokegearNumber.Jose,PokegearNumber.Gina,PokegearNumber.Alan,PokegearNumber.Dana,PokegearNumber.Derek,PokegearNumber.Tully,PokegearNumber.Tiffany,PokegearNumber.Wilton,PokegearNumber.Krise,PokegearNumber.Ian,PokegearNumber.Walt,PokegearNumber.Alfred,PokegearNumber.Doug,PokegearNumber.Rob,PokegearNumber.Kyle,PokegearNumber.Kyler,PokegearNumber.Tim_and_Sue,PokegearNumber.Kenny,PokegearNumber.Tanner,PokegearNumber.Josh,PokegearNumber.Torin,PokegearNumber.Hillary,PokegearNumber.Billy,PokegearNumber.Kay_and_Tia,PokegearNumber.Reese,PokegearNumber.Aiden,PokegearNumber.Ernest];
    // Compile-time names avoid runtime enum-name reflection after trimming.
    private static readonly string[] Names=[nameof(PokegearNumber.Mother),nameof(PokegearNumber.Professor_Elm),nameof(PokegearNumber.Professor_Oak),nameof(PokegearNumber.Ethan),nameof(PokegearNumber.Lyra),nameof(PokegearNumber.Kurt),nameof(PokegearNumber.Daycare_Man),nameof(PokegearNumber.Daycare_Lady),nameof(PokegearNumber.Buena),nameof(PokegearNumber.Bill),nameof(PokegearNumber.Joey),nameof(PokegearNumber.Ralph),nameof(PokegearNumber.Liz),nameof(PokegearNumber.Wade),nameof(PokegearNumber.Anthony),nameof(PokegearNumber.Bike_Shop),nameof(PokegearNumber.Kenji),nameof(PokegearNumber.Whitney),nameof(PokegearNumber.Falkner),nameof(PokegearNumber.Jack),nameof(PokegearNumber.Chad),nameof(PokegearNumber.Brent),nameof(PokegearNumber.Todd),nameof(PokegearNumber.Arnie),nameof(PokegearNumber.Baoba),nameof(PokegearNumber.Irwin),nameof(PokegearNumber.Janine),nameof(PokegearNumber.Clair),nameof(PokegearNumber.Erika),nameof(PokegearNumber.Misty),nameof(PokegearNumber.Blaine),nameof(PokegearNumber.Blue),nameof(PokegearNumber.Chuck),nameof(PokegearNumber.Brock),nameof(PokegearNumber.Bugsy),nameof(PokegearNumber.Sabrina),nameof(PokegearNumber.Lieutenant_Surge),nameof(PokegearNumber.Morty),nameof(PokegearNumber.Jasmine),nameof(PokegearNumber.Pryce),nameof(PokegearNumber.Huey),nameof(PokegearNumber.Gaven),nameof(PokegearNumber.Jamie),nameof(PokegearNumber.Reena),nameof(PokegearNumber.Vance),nameof(PokegearNumber.Parry),nameof(PokegearNumber.Erin),nameof(PokegearNumber.Beverly),nameof(PokegearNumber.Jose),nameof(PokegearNumber.Gina),nameof(PokegearNumber.Alan),nameof(PokegearNumber.Dana),nameof(PokegearNumber.Derek),nameof(PokegearNumber.Tully),nameof(PokegearNumber.Tiffany),nameof(PokegearNumber.Wilton),nameof(PokegearNumber.Krise),nameof(PokegearNumber.Ian),nameof(PokegearNumber.Walt),nameof(PokegearNumber.Alfred),nameof(PokegearNumber.Doug),nameof(PokegearNumber.Rob),nameof(PokegearNumber.Kyle),nameof(PokegearNumber.Kyler),nameof(PokegearNumber.Tim_and_Sue),nameof(PokegearNumber.Kenny),nameof(PokegearNumber.Tanner),nameof(PokegearNumber.Josh),nameof(PokegearNumber.Torin),nameof(PokegearNumber.Hillary),nameof(PokegearNumber.Billy),nameof(PokegearNumber.Kay_and_Tia),nameof(PokegearNumber.Reese),nameof(PokegearNumber.Aiden),nameof(PokegearNumber.Ernest)];
    private static int[] Slots(SAV4HGSS s)=>s.GetPokeGearRoloDex().ToArray().Select(v=>(int)v).ToArray();
    internal static string Hash(byte[] data)=>Convert.ToHexString(SHA256.HashData(data));
    private static void Batch(SAV4HGSS s,string action){switch(action){case "all":s.PokeGearUnlockAllCallers();break;case "nonTrainers":s.PokeGearUnlockAllCallersNoTrainers();break;case "clear":s.PokeGearClearAllCallers();break;default:throw new ArgumentException("Invalid PokeGear4 batch action.");}}
    internal static PokeGear4Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var choices=new List<Gear4Choice>{new(-1,nameof(PokegearNumber.None))};for(int i=0;i<Contacts.Length;i++)choices.Add(new((int)Contacts[i],Names[i]));
        var plans=new List<Gear4Plan>();foreach(var action in new[]{"all","nonTrainers","clear"}){var scratch=(SAV4HGSS)s.Clone();Batch(scratch,action);plans.Add(new(action,Slots(scratch)));}
        return new(s.State.Exportable&&SaveChecksums.Valid(s),s.Gender==0?3:4,hash,Slots(s),choices.ToArray(),plans.ToArray());
    }
    internal static byte[] Snapshot(SaveFile save){var s=Save(save);return [..s.General.Slice(0xC0E8,83),s.Gender];}
    internal static void Apply(SaveFile save,PokeGear4Edit edit,string hash)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("PokeGear4 requires valid checksums.");
        if(edit.Action=="slots"&&edit.SourceHash is null&&edit.Slots is {} slots)
        {
            int count=s.GetPokeGearRoloDex().Length;
            if(slots.Length==0||slots.Length>count||slots.Any(v=>v is null)||slots.Any(v=>v.Slot is null||v.Slot<0||v.Slot>=count||v.Value is null or <sbyte.MinValue or >sbyte.MaxValue)||slots.Select(v=>v.Slot).Distinct().Count()!=slots.Length)throw new ArgumentException("Invalid PokeGear4 slot values.");
            foreach(var slot in slots)s.SetCallerAtIndex(slot.Slot!.Value,(PokegearNumber)(sbyte)slot.Value!.Value);
        }
        else if(edit.Slots is null&&edit.Action is "all" or "nonTrainers" or "clear"&&edit.SourceHash is {} expected)
        {if(expected.Length!=64||expected!=hash)throw new ArgumentException("PokeGear4 preview is stale. Read it again.");Batch(s,edit.Action);}
        else throw new ArgumentException("Invalid PokeGear4 action or mixed fields.");
    }
    internal static byte[] Edit(byte[] data,PokeGear4Edit edit)
    {
        if(data.Length is 0 or >32*1024*1024)throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");var s=Save(SaveUtil.GetSaveFile(data.ToArray())??throw new ArgumentException("Unrecognized save."));Apply(s,edit,Hash(data));var expected=Snapshot(s);var output=s.Write().ToArray();var check=Save(SaveUtil.GetSaveFile(output.ToArray())??throw new InvalidOperationException("PokeGear4 output was not recognized."));
        if(output.Length!=data.Length||check.GetType()!=s.GetType()||check.Version!=s.Version||check.Magic!=s.Magic||!SaveChecksums.Valid(check)||!expected.SequenceEqual(Snapshot(check)))throw new InvalidOperationException("PokeGear4 export verification failed.");return output;
    }
}
public static partial class SaveService
{
    public static string ReadPokeGear4(byte[] data)=>JsonSerializer.Serialize(PokeGear4Editing.Read(Open(data),PokeGear4Editing.Hash(data)),SaveJsonContext.Default.PokeGear4Catalog);
    public static byte[] EditPokeGear4(byte[] data,string json){if(json.Length>4096)throw new ArgumentException("PokeGear4 request is too large.");var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.PokeGear4Edit)??throw new ArgumentException("Missing PokeGear4 edit.");return PokeGear4Editing.Edit(data,edit);}
}
