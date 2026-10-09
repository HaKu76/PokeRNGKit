// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Security.Cryptography;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Br4Profile(int Id,string Name);
public sealed record Br4Profiles(int Active,bool CanEdit,Br4Profile[] Choices);
public sealed record Br4GearEntry(int Id,int Model,int Category,bool Shared,bool Unlocked,LocalizedText Name);
public sealed record Br4GearPlan(string Action,int Unlocked,int[] Changed,string TargetHex);
public sealed record Br4GearCatalog(bool CanEdit,int Profile,string SourceHash,Br4GearEntry[] Gear,bool[] Outfits,Br4GearPlan[] Plans);
public sealed record Br4FlagEdit(int? Id,bool? Enabled);
public sealed record Br4GearEdit(string Action,int? Profile,Br4FlagEdit[]? Flags=null,string? SourceHash=null);
internal static class Br4Editing
{
    internal static SAV4BR Save(SaveFile save)=>save as SAV4BR??throw new ArgumentException("Battle Revolution tools are unavailable for this format.");
    internal static string Hash(byte[] bytes)=>Convert.ToHexString(SHA256.HashData(bytes));
    internal static Br4Profiles? Profiles(SaveFile save)
    {
        if(save is not SAV4BR s)return null;var copy=(SAV4BR)s.Clone();var names=new List<Br4Profile>();for(int i=0;i<4;i++){copy.CurrentSlot=i;names.Add(new(i,copy.CurrentOT));}return new(s.CurrentSlot,s.State.Exportable&&SaveChecksums.Valid(s),names.ToArray());
    }
    private static IEnumerable<(int Id,int Model,int Category,bool Shared)> Rows()
    {
        for(int model=1;model<=6;model++)for(int category=0;category<10;category++){var (offset,count)=GearUnlock.GetOffsetCount((ModelBR)model,(GearCategory)category);for(int i=0;i<count;i++)yield return(offset+i,model,category,category==9&&i!=0);}
    }
    private static bool[] Outfits(SAV4BR s)=>[s.GearShinyGroudonOutfit,s.GearShinyLucarioOutfit,s.GearShinyElectivireOutfit,s.GearShinyKyogreOutfit,s.GearShinyRoseradeOutfit,s.GearShinyPachirisuOutfit];
    private static void Outfit(SAV4BR s,int id,bool v){switch(id){case 0:s.GearShinyGroudonOutfit=v;break;case 1:s.GearShinyLucarioOutfit=v;break;case 2:s.GearShinyElectivireOutfit=v;break;case 3:s.GearShinyKyogreOutfit=v;break;case 4:s.GearShinyRoseradeOutfit=v;break;case 5:s.GearShinyPachirisuOutfit=v;break;default:throw new ArgumentException("Invalid Battle Revolution outfit.");}}
    internal static Br4GearCatalog ReadGear(SaveFile save,string hash)
    {
        var s=Save(save);var gear=s.GearUnlock;var z=GameLanguage.GetStrings("gear","zh-Hans");var e=GameLanguage.GetStrings("gear","en");var j=GameLanguage.GetStrings("gear","ja");
        var rows=Rows().Select(v=>new Br4GearEntry(v.Id,v.Model,v.Category,v.Shared,gear.Get(v.Id),new(v.Id<z.Length?z[v.Id]:e[v.Id],e[v.Id],j[v.Id]))).ToArray();var plans=new List<Br4GearPlan>();
        foreach(var action in new[]{"all","defaults"}){var target=new GearUnlock(gear.Data.ToArray());if(action=="all")target.UnlockAll();else target.Clear();plans.Add(new(action,rows.Count(v=>target.Get(v.Id)),Enumerable.Range(0,GearUnlock.Size*8).Where(i=>target.Get(i)!=gear.Get(i)).ToArray(),Convert.ToHexString(target.Data)));}
        return new(s.State.Exportable&&SaveChecksums.Valid(s),s.CurrentSlot,hash,rows,Outfits(s),plans.ToArray());
    }
    internal static void ApplyGear(SaveFile save,Br4GearEdit edit,string hash)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Battle Revolution editing requires valid checksums.");
        if(edit.Profile is null or <0 or >3||edit.Profile!=s.CurrentSlot)throw new ArgumentException("Battle Revolution player changed. Read the data again.");
        if(edit.Action is "gear" or "outfits"&&edit.SourceHash is null&&edit.Flags is {} flags)
        {
            var allowed=edit.Action=="gear"?Rows().Select(v=>v.Id).ToHashSet():Enumerable.Range(0,6).ToHashSet();
            if(flags.Length==0||flags.Length>allowed.Count||flags.Any(v=>v is null||v.Id is null||!allowed.Contains(v.Id.Value)||v.Enabled is null)||flags.Select(v=>v.Id).Distinct().Count()!=flags.Length)throw new ArgumentException("Invalid Battle Revolution gear flags.");
            foreach(var flag in flags)if(edit.Action=="gear")s.GearUnlock.Set(flag.Id!.Value,flag.Enabled!.Value);else Outfit(s,flag.Id!.Value,flag.Enabled!.Value);
        }
        else if(edit.Action is "all" or "defaults"&&edit.Flags is null&&edit.SourceHash is {} source)
        {if(source.Length!=64||source!=hash)throw new ArgumentException("Battle Revolution preview is stale. Read it again.");if(edit.Action=="all")s.GearUnlock.UnlockAll();else s.GearUnlock.Clear();}
        else throw new ArgumentException("Invalid Battle Revolution gear action or mixed fields.");
    }
    internal static byte[] Snapshot(SaveFile save){var s=Save(save);return [..s.Data.Slice(GearUnlock.Offset-4,GearUnlock.Size+8),..s.Data.Slice(0x430,9)];}
}
public static partial class SaveService
{
    private static int BRProfile=-1;
    public static void ResetBRProfile()=>BRProfile=-1;
    public static void ConfigureBRProfile(int profile){if(profile is < -1 or >3)throw new ArgumentException("Invalid Battle Revolution player.");BRProfile=profile;}
    public static string SelectBRProfile(byte[] data,int profile)
    {
        if(profile is <0 or >3)throw new ArgumentException("Invalid Battle Revolution player.");_=Br4Editing.Save(Open(data));int previous=BRProfile;BRProfile=profile;try{return Inspect(data);}catch{BRProfile=previous;throw;}
    }
    public static string ReadBr4Gear(byte[] data)=>JsonSerializer.Serialize(Br4Editing.ReadGear(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Br4GearCatalog);
    public static byte[] EditBr4Gear(byte[] data,string json)
    {
        if(json.Length>32768)throw new ArgumentException("Battle Revolution gear request is too large.");var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Br4GearEdit)??throw new ArgumentException("Missing Battle Revolution gear edit.");var s=Br4Editing.Save(Open(data));Br4Editing.ApplyGear(s,edit,Br4Editing.Hash(data));var expected=Br4Editing.Snapshot(s);var output=s.Write().ToArray();var check=Br4Editing.Save(Open(output));if(output.Length!=data.Length||check.CurrentSlot!=s.CurrentSlot||check.Japanese!=s.Japanese||!SaveChecksums.Valid(check)||!expected.SequenceEqual(Br4Editing.Snapshot(check)))throw new InvalidOperationException("Battle Revolution gear export verification failed.");return output;
    }
}
