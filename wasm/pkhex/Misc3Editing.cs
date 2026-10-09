// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
using static System.Buffers.Binary.BinaryPrimitives;
namespace PokeRNGKit.SaveEditor;
public sealed record Misc3Rival(string Name,string Hex,int MaxLength);
public sealed record Misc3Icon(int Slot,int Species,int Raw,string Sprite);
public sealed record Misc3Mirage(int Current,string Pid,int Target,int PartyCount);
public sealed record Misc3Catalog(bool CanEdit,int Coins,Misc3Rival? Rival,Misc3Icon[]? Icons,OriginChoice[] SpeciesChoices,Misc3Mirage? Mirage);
public sealed record Misc3IconEdit(int? Slot,int? Species);
public sealed record Misc3Edit(string Action,int? Coins=null,string? Name=null,string? NameHex=null,Misc3IconEdit[]? Icons=null,string? Pid=null);
internal static class Misc3Editing
{
    private static SAV3 Save(SaveFile save)=>save is SAV3RS or SAV3E or SAV3FRLG?(SAV3)save:throw new ArgumentException("Gen3 main settings are unavailable for this format.");
    internal static Misc3Catalog Read(SaveFile save)
    {
        var s=Save(save);bool can=s.State.Exportable&&SaveChecksums.Valid(s);
        if(s is SAV3FRLG f)
        {
            var zh=GameInfo.GetStrings("zh-Hans");var en=GameInfo.GetStrings("en");var ja=GameInfo.GetStrings("ja");
            var choices=Enumerable.Range(0,387).Select(id=>new OriginChoice(id,new(zh.specieslist[id],en.specieslist[id],ja.specieslist[id]))).ToArray();
            var icons=Enumerable.Range(0,6).Select(i=>{int raw=s.GetWork(0x43+i);ushort species=SpeciesConverter.GetNational3((ushort)raw);return new Misc3Icon(i,species,raw,"b"+SpriteName.GetResourceStringSprite(species,0,0,0,EntityContext.Gen3));}).ToArray();
            return new(can,(int)s.Coin,new(f.RivalName,Convert.ToHexString(f.LargeBlock.RivalNameTrash),7),icons,choices,null);
        }
        uint pid=ReadUInt32LittleEndian(s.LargeBlock.PartyBuffer);
        return new(can,(int)s.Coin,null,null,[],new(s.GetWork(0x24),pid.ToString("X8"),(ushort)pid,s.LargeBlock.PartyCount));
    }
    internal static byte[] Snapshot(SaveFile save)
    {
        var s=Save(save);int work=s is SAV3RS?0x1340:s is SAV3E?0x139C:0x1000,coin=s is SAV3FRLG?0x294:0x494;
        byte[] extra=s is SAV3FRLG f?f.LargeBlock.RivalNameTrash.ToArray():[];
        return [..s.Large.Slice(work,512),..s.Large.Slice(coin-4,10),..extra,..s.LargeBlock.PartyBuffer,s.LargeBlock.PartyCount,..s.Small.Slice(0xAC,4),..(s is SAV3FRLG?s.Small.Slice(0xF20,4).ToArray():[])];
    }
    internal static void Apply(SaveFile save,Misc3Edit edit)
    {
        var s=Save(save);
        if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Gen3 main settings require valid checksums.");
        switch(edit.Action)
        {
            case "coins" when edit.Coins is >=0 and <=9999 && edit.Name is null && edit.NameHex is null && edit.Icons is null && edit.Pid is null:
                s.Coin=(ushort)edit.Coins.Value;break;
            case "rival" when s is SAV3FRLG f && edit.Coins is null && edit.Icons is null && edit.Pid is null && (edit.Name is not null || edit.NameHex is not null):
                if(edit.Name is not null&&edit.NameHex is not null)throw new ArgumentException("Rival name text and raw bytes are exclusive.");
                var bytes=f.LargeBlock.RivalNameTrash.ToArray();
                if(edit.NameHex is {} hex)
                {
                    if(hex.Length!=16||hex.Any(c=>!Uri.IsHexDigit(c)))throw new ArgumentException("Rival raw name must contain 16 hex digits.");
                    bytes=Convert.FromHexString(hex);
                }
                else if(edit.Name is {} name && name!=f.RivalName)
                {
                    if(name.Length>7)throw new ArgumentException("Rival name accepts up to seven characters.");
                    f.SetString(bytes,name,7,StringConverterOption.ClearZero);
                    if(f.GetString(bytes)!=name)throw new ArgumentException("Rival name cannot be encoded without loss.");
                }
                bytes.CopyTo(f.LargeBlock.RivalNameTrash);break;
            case "icons" when s is SAV3FRLG && edit.Coins is null && edit.Name is null && edit.NameHex is null && edit.Pid is null && edit.Icons is {} icons:
                if(icons.Length is 0 or >6 || icons.Any(i=>i is null) || icons.Any(i=>i.Slot is null or <0 or >5 || i.Species is null or <0 or >386) || icons.Select(i=>i.Slot).Distinct().Count()!=icons.Length)throw new ArgumentException("Invalid trainer card icon changes.");
                foreach(var icon in icons)s.SetWork(0x43+icon.Slot!.Value,SpeciesConverter.GetInternal3((ushort)icon.Species!.Value));break;
            case "mirage" when s is SAV3RS or SAV3E && edit.Coins is null && edit.Name is null && edit.NameHex is null && edit.Icons is null && edit.Pid is {} expected:
                uint pid=ReadUInt32LittleEndian(s.LargeBlock.PartyBuffer);
                if(expected!=pid.ToString("X8"))throw new ArgumentException("The first raw party PID changed. Read the Mirage Island source again.");
                s.SetWork(0x24,(ushort)pid);break;
            default:throw new ArgumentException("Invalid Gen3 main action or mixed fields.");
        }
    }
    internal static byte[] Edit(byte[] data,Misc3Edit edit)
    {
        if(data.Length is 0 or >32*1024*1024)throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s=Save(SaveUtil.GetSaveFile(data.ToArray())??throw new ArgumentException("Unrecognized save."));
        Apply(s,edit);var expected=Snapshot(s);var output=s.Write().ToArray();
        var check=Save(SaveUtil.GetSaveFile(output.ToArray())??throw new InvalidOperationException("Gen3 main output was not recognized."));
        if(output.Length!=data.Length||check.GetType()!=s.GetType()||check.Version!=s.Version||check.SaveRevision!=s.SaveRevision||check.Japanese!=s.Japanese||!SaveChecksums.Valid(check)||!expected.SequenceEqual(Snapshot(check)))throw new InvalidOperationException("Gen3 main export verification failed.");
        return output;
    }
}
public static partial class SaveService
{
    public static string ReadMisc3(byte[] data)=>JsonSerializer.Serialize(Misc3Editing.Read(Open(data)),SaveJsonContext.Default.Misc3Catalog);
    public static byte[] EditMisc3(byte[] data,string json)
    {
        if(json.Length>2048)throw new ArgumentException("Gen3 main request is too large.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Misc3Edit)??throw new ArgumentException("Missing Gen3 main edit.");
        return Misc3Editing.Edit(data,edit);
    }
}
