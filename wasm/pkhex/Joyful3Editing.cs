// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using static System.Buffers.Binary.BinaryPrimitives;
namespace PokeRNGKit.SaveEditor;

public sealed record Joyful3Field(int Id, uint Value, int Max, int Width, uint? Stored);
public sealed record Joyful3Catalog(bool CanEdit, Joyful3Field[] Fields);
public sealed record Joyful3Change(int Id, int? Value);
public sealed record Joyful3Edit(Joyful3Change[] Fields);
internal static class Joyful3Editing
{
    private static SAV3 Save(SaveFile save) => save is SAV3E or SAV3FRLG ? (SAV3)save : throw new ArgumentException("Gen3 minigames are unavailable for this format.");
    private static ISaveBlock3SmallExpansion Block(SAV3 s) => s.SmallBlock as ISaveBlock3SmallExpansion ?? throw new ArgumentException("Missing minigame block.");
    internal static Joyful3Catalog Read(SaveFile save)
    {
        var s=Save(save); var b=Block(s); uint[] values=[b.JoyfulJumpInRow,b.JoyfulJumpScore,b.JoyfulJump5InRow,b.JoyfulJumpGamesMaxPlayers,b.JoyfulBerriesInRow,b.JoyfulBerriesScore,b.JoyfulBerries5InRow,b.BerryPowder];
        int score=s is SAV3E?0x208:0xB0C;
        return new(s.State.Exportable&&SaveChecksums.Valid(s),values.Select((value,id)=>new Joyful3Field(id,value,id==7?99999:9999,id==7?5:4,
            id is 1 or 5?ReadUInt32LittleEndian(s.Small[(score+(id==5?4:0))..]):null)).ToArray());
    }
    internal static byte[] Snapshot(SaveFile save)
    {
        var s=Save(save);int start=s is SAV3E?0x1EC:0xAF0, key=s is SAV3E?0xAC:0xF20;
        // Include adjacent Berry Crush values, gaps, link flags and the entire security key.
        return [..s.Small.Slice(start,0x38),..s.Small.Slice(0xA8,4),..s.Small.Slice(key,4)];
    }
    internal static void Apply(SaveFile save,Joyful3Edit edit)
    {
        var s=Save(save);
        if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Gen3 minigame editing requires valid checksums.");
        if(edit.Fields is not {} fields || fields.Length is 0 or >8 || fields.Any(v=>v is null) || fields.Select(v=>v.Id).Distinct().Count()!=fields.Length
            || fields.Any(v=>v.Id is <0 or >7 || v.Value is null || v.Value<0 || v.Value>(v.Id==7?99999:9999))) throw new ArgumentException("Invalid Gen3 minigame fields.");
        var b=Block(s);
        foreach(var field in fields)
        {
            int value=field.Value!.Value;
            switch(field.Id)
            {
                case 0:b.JoyfulJumpInRow=(ushort)value;break;
                case 1:b.JoyfulJumpScore=(ushort)value;break;
                case 2:b.JoyfulJump5InRow=(ushort)value;break;
                case 3:b.JoyfulJumpGamesMaxPlayers=(ushort)value;break;
                case 4:b.JoyfulBerriesInRow=(ushort)value;break;
                case 5:b.JoyfulBerriesScore=(ushort)value;break;
                case 6:b.JoyfulBerries5InRow=(ushort)value;break;
                case 7:b.BerryPowder=(uint)value;break;
            }
        }
    }
    internal static byte[] Edit(byte[] data,Joyful3Edit edit)
    {
        if(data.Length is 0 or >32*1024*1024)throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s=Save(SaveUtil.GetSaveFile(data.ToArray())??throw new ArgumentException("Unrecognized save."));
        Apply(s,edit);var expected=Snapshot(s);var output=s.Write().ToArray();
        var check=Save(SaveUtil.GetSaveFile(output.ToArray())??throw new InvalidOperationException("Gen3 minigame output was not recognized."));
        if(output.Length!=data.Length||check.GetType()!=s.GetType()||check.Version!=s.Version||check.SaveRevision!=s.SaveRevision||check.Japanese!=s.Japanese
            ||!SaveChecksums.Valid(check)||!expected.SequenceEqual(Snapshot(check)))throw new InvalidOperationException("Gen3 minigame export verification failed.");
        return output;
    }
}
public static partial class SaveService
{
    public static string ReadJoyful3(byte[] data)=>JsonSerializer.Serialize(Joyful3Editing.Read(Open(data)),SaveJsonContext.Default.Joyful3Catalog);
    public static byte[] EditJoyful3(byte[] data,string json)
    {
        if(json.Length>2048)throw new ArgumentException("Gen3 minigame request is too large.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Joyful3Edit)??throw new ArgumentException("Missing Gen3 minigame edit.");
        return Joyful3Editing.Edit(data,edit);
    }
}
