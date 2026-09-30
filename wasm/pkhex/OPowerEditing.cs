// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
namespace PokeRNGKit.SaveEditor;
public sealed record OPowerCatalog(string[] StateKeys, int[] States, int Points, string[] FieldKeys, int[] Field1, int[] Field2, string[] BattleKeys, int[] Battle1, int[] Battle2);
public sealed record OPowerEdit(string Action, int? Points=null, bool[]? States=null, int[]? Field1=null, int[]? Field2=null, int[]? Battle1=null, int[]? Battle2=null);
internal static class OPowerEditing
{
    internal static OPower6 Block(SaveFile save) => save switch { SAV6XY s=>s.OPower, SAV6AO s=>s.OPower, _=>throw new ArgumentException("O-Powers are unavailable for this format.") };
    public static OPowerCatalog Read(SaveFile save)
    {
        var b=Block(save);
        return new(Enum.GetNames<OPower6Index>()[..^1], Enumerable.Range(0,65).Select(i=>(int)b.GetState((OPower6Index)i)).ToArray(), b.Points,
            Enum.GetNames<OPower6FieldType>()[..^1], Enumerable.Range(0,10).Select(i=>(int)b.GetLevel1((OPower6FieldType)i)).ToArray(), Enumerable.Range(0,10).Select(i=>(int)b.GetLevel2((OPower6FieldType)i)).ToArray(),
            Enum.GetNames<OPower6BattleType>()[..^1], Enumerable.Range(0,7).Select(i=>(int)b.GetLevel1((OPower6BattleType)i)).ToArray(), Enumerable.Range(0,7).Select(i=>(int)b.GetLevel2((OPower6BattleType)i)).ToArray());
    }
    private static bool Bytes(int[]? values,int count) => values is not null && values.Length==count && values.All(v=>v is >=0 and <=255);
    public static void Apply(SaveFile save, OPowerEdit edit)
    {
        var b=Block(save);
        if(edit.Action=="edit")
        {
            if(edit.Points is null or <0 or >255 || edit.States is not {Length:65} || !Bytes(edit.Field1,10) || !Bytes(edit.Field2,10) || !Bytes(edit.Battle1,7) || !Bytes(edit.Battle2,7)) throw new ArgumentException("O-Power values are missing or out of range.");
            for(int i=0;i<65;i++) if(edit.States[i] != (b.GetState((OPower6Index)i)==OPowerFlagState.Unlocked)) b.SetState((OPower6Index)i,edit.States[i]?OPowerFlagState.Unlocked:OPowerFlagState.Locked);
            for(int i=0;i<10;i++) { b.SetLevel1((OPower6FieldType)i,(byte)edit.Field1![i]); b.SetLevel2((OPower6FieldType)i,(byte)edit.Field2![i]); }
            for(int i=0;i<7;i++) { b.SetLevel1((OPower6BattleType)i,(byte)edit.Battle1![i]); b.SetLevel2((OPower6BattleType)i,(byte)edit.Battle2![i]); }
            b.Points=(byte)edit.Points.Value;
            return;
        }
        if(edit.Points is not null || edit.States is not null || edit.Field1 is not null || edit.Field2 is not null || edit.Battle1 is not null || edit.Battle2 is not null) throw new ArgumentException("Bulk O-Power actions do not accept draft values.");
        switch(edit.Action) { case "unlock": b.UnlockAll(); break; case "clear": b.ClearAll(); break; default: throw new ArgumentException("Unknown O-Power action."); }
    }
}
public static partial class SaveService
{
    public static string ReadOPowers(byte[] data) => JsonSerializer.Serialize(OPowerEditing.Read(Open(data)),SaveJsonContext.Default.OPowerCatalog);
    public static byte[] EditOPowers(byte[] data,string json)
    {
        var save=Open(data);
        if(!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save)) throw new ArgumentException("Editing requires a supported save with valid checksums.");
        if(json.Length>8192) throw new ArgumentException("O-Power request is too large.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.OPowerEdit)??throw new ArgumentException("Missing O-Power edit.");
        OPowerEditing.Apply(save,edit);
        var expected=OPowerEditing.Block(save).Data.ToArray();var output=save.Write().ToArray();var check=Open(output);
        if(check.GetType()!=save.GetType() || !SaveChecksums.Valid(check) || !OPowerEditing.Block(check).Data.SequenceEqual(expected)) throw new InvalidOperationException("O-Power export verification failed.");
        return output;
    }
}
