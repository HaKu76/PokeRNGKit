// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Honey4Row(int Id,uint Time,int Shake,int Group,int Slot,int SubTable,bool Rare,int? Species,int? Alternate,string RawHex,int[] SaveValues,string SaveHex);
public sealed record Honey4Species(int Group,int Slot,int Species,int? Alternate,LocalizedText Name,LocalizedText? AlternateName);
public sealed record Honey4Catalog(bool CanEdit,string SourceHash,int[] MunchlaxTrees,Honey4Row[] Trees,Honey4Species[] Choices);
public sealed record Honey4Edit(string Action,string? SourceHash,int? Id,uint? Time=null,int? Shake=null,int? Group=null,int? Slot=null);
internal static class HoneyTree4Editing
{
    private static SAV4Sinnoh Save(SaveFile s)=>s is SAV4DP or SAV4Pt?(SAV4Sinnoh)s:throw new ArgumentException("HoneyTree4 tools are unavailable for this format.");
    private static int? Alternate(SAV4Sinnoh s,int species)=>s is SAV4DP&&species==(int)Species.Silcoon?(int)Species.Cascoon:null;
    private static LocalizedText Name(int id)=>new(GameInfo.GetStrings("zh-Hans").specieslist[id],GameInfo.GetStrings("en").specieslist[id],GameInfo.GetStrings("ja").specieslist[id]);
    private static void Normalize(HoneyTreeValue tree){tree.Time=Math.Min(tree.Time,1440u);tree.Shake=Math.Min(tree.Shake,3);tree.Group=Math.Min(tree.Group,3);tree.Slot=Math.Min(tree.Slot,5);}
    internal static Honey4Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);byte[] rare=new byte[4];HoneyTreeUtil.CalculateMunchlaxTrees(s.ID32,rare);
        var rows=Enumerable.Range(0,21).Select(id=>{var t=s.GetHoneyTree(id);int? species=t.Group<=3&&t.Slot<=5?s.GetHoneyTreeSpecies(t.Group,t.Slot):null;var n=new HoneyTreeValue(t.Data.ToArray());Normalize(n);return new Honey4Row(id,t.Time,t.Shake,t.Group,t.Slot,t.SubTable,rare.Contains((byte)id),species,species is {} sp?Alternate(s,sp):null,Convert.ToHexString(t.Data),[(int)n.Time,n.Shake,n.Group,n.Slot],Convert.ToHexString(n.Data));}).ToArray();
        var choices=Enumerable.Range(0,24).Select(i=>{int sp=s.GetHoneyTreeSpecies(i/6,i%6);var alt=Alternate(s,sp);return new Honey4Species(i/6,i%6,sp,alt,Name(sp),alt is {} a?Name(a):null);}).ToArray();
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,rare.Select(v=>(int)v).ToArray(),rows,choices);
    }
    internal static void Apply(SaveFile save,Honey4Edit edit,string hash)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("HoneyTree4 editing requires valid checksums.");
        if(edit.SourceHash!=hash||edit.SourceHash?.Length!=64)throw new ArgumentException("HoneyTree4 preview is stale. Read it again.");
        if(edit.Id is null or <0 or >=21)throw new ArgumentException("Invalid HoneyTree4 tree index.");
        bool fields=edit.Time is not null||edit.Shake is not null||edit.Group is not null||edit.Slot is not null;
        if(edit.Time>1440||edit.Shake is <0 or >3||edit.Group is <0 or >3||edit.Slot is <0 or >5||edit.Action=="patch"&&!fields||edit.Action is "save" or "catchable"&&fields||edit.Action is not ("patch" or "save" or "catchable"))throw new ArgumentException("Invalid HoneyTree4 fields or action.");
        var tree=s.GetHoneyTree(edit.Id.Value);
        if(edit.Action=="save")Normalize(tree);
        else if(edit.Action=="catchable")tree.Time=1080;
        else {if(edit.Time is {} time)tree.Time=time;if(edit.Shake is {} shake)tree.Shake=shake;if(edit.Group is {} group)tree.Group=group;if(edit.Slot is {} slot)tree.Slot=slot;}
        s.SetHoneyTree(tree,edit.Id.Value);
    }
    internal static byte[] Snapshot(SaveFile save){var s=Save(save);return Enumerable.Range(0,21).SelectMany(id=>s.GetHoneyTree(id).Data.ToArray()).ToArray();}
}
public static partial class SaveService
{
    public static string ReadHoneyTree4(byte[] data)=>JsonSerializer.Serialize(HoneyTree4Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Honey4Catalog);
    public static byte[] EditHoneyTree4(byte[] data,string json){if(json.Length>4096)throw new ArgumentException("HoneyTree4 request is too large.");var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Honey4Edit)??throw new ArgumentException("Missing HoneyTree4 edit.");var s=Open(data);HoneyTree4Editing.Apply(s,edit,Br4Editing.Hash(data));var expected=HoneyTree4Editing.Snapshot(s);var output=s.Write().ToArray();var check=Open(output);if(output.Length!=data.Length||check.GetType()!=s.GetType()||check.Version!=s.Version||!SaveChecksums.Valid(check)||!expected.SequenceEqual(HoneyTree4Editing.Snapshot(check)))throw new InvalidOperationException("HoneyTree4 export verification failed.");return output;}
}
