// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Video4Member(int Slot,ushort Species,PokemonEntry? Pokemon);
public sealed record Video4Team(int Index,string Name,int StoredCount,Video4Member[] Members);
public sealed record Video4Info(int Index,bool Available,bool Valid,uint Key,uint Magic,uint Revision,int BlockID,Video4Team[] Teams);
public sealed record Video4Catalog(bool CanEdit,string SourceHash,int Index,Video4Info[] Slots);
public sealed record Video4Query(int? Index);
public sealed record Video4Import(int? Index,string? Data,string? SourceHash);
public sealed record Video4Export(int? Index,bool? Decrypted);
public sealed record Video4Preview(string SourceHash,int Index,bool InputDecrypted,Video4Info Video);
public sealed record Video4File(string FileName,string Data);
internal static class BattleVideo4Editing
{
    private static SAV4 Save(SaveFile save)=>save is SAV4Pt or SAV4HGSS?(SAV4)save:throw new ArgumentException("Battle video4 tools are unavailable for this format.");
    private static int Index(int? index){if(index is null or <0 or >=4)throw new ArgumentException("Invalid battle video4 position.");return index.Value;}
    private static BattleVideo4 Target(SAV4 s,int? index)=>s.GetBattleVideo(Index(index))??throw new ArgumentException("Battle video4 target is uninitialized.");
    private static Video4Info Info(BattleVideo4? original,int index)
    {
        if(original is null)return new(index,false,false,0,0,0,0,[]);var v=new BattleVideo4(original.Data.ToArray()){IsDecrypted=original.IsDecrypted};bool footer;var encrypted=new BattleVideo4(v.Data.ToArray()){IsDecrypted=v.IsDecrypted};encrypted.Encrypt();footer=encrypted.ChecksumValid;v.Decrypt();bool valid=footer&&Checksums.CRC16_CCITT(v.DecryptedChecksumRegion)==v.Seed;var names=v.GetTrainerNames();var teams=v.GetTeams();var entries=teams.Select((members,t)=>new Video4Team(t,names[t],v.GetTrainerTeam(t)[2],members.Select((p,i)=>new Video4Member(i,p.Species,p.Species is >0 and <=493?PokemonReader.Read(p,-1,i):null)).ToArray())).ToArray();return new(index,true,valid,v.Key,v.Magic,v.Revision,v.BlockID,entries);
    }
    internal static Video4Catalog Read(SaveFile save,int? index,string hash){var s=Save(save);Index(index);return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,index!.Value,Enumerable.Range(0,4).Select(i=>Info(s.GetBattleVideo(i),i)).ToArray());}
    private static (BattleVideo4 Video,bool Decrypted) Prepare(SAV4 save,Video4Import edit,string hash)
    {
        if(edit.SourceHash!=hash||edit.SourceHash?.Length!=64)throw new ArgumentException("Battle video4 preview is stale. Read it again.");var target=Target(save,edit.Index);if(edit.Data is null)throw new ArgumentException("Missing battle video4 binary.");byte[] bytes;try{bytes=Convert.FromBase64String(edit.Data);}catch(FormatException){throw new ArgumentException("Invalid battle video4 binary.");}if(!BattleVideo4.IsValid(bytes))throw new ArgumentException("Battle video4 binary size or declared size is invalid.");var state=BattleVideo4.DetectEncryption(bytes);if(state==BattleVideo4DecryptionState.Invalid)throw new ArgumentException("Battle video4 binary checksum is invalid.");var imported=new BattleVideo4(bytes){IsDecrypted=state==BattleVideo4DecryptionState.Decrypted};
        // General selects the block by its leading key. Keep destination ownership.
        imported.Key=target.Key;imported.Magic=target.Magic;imported.Revision=target.Revision;imported.BlockSize=target.BlockSize;imported.BlockID=target.BlockID;imported.RefreshChecksums();imported.Encrypt();return(imported,state==BattleVideo4DecryptionState.Decrypted);
    }
    internal static Video4Preview Preview(SaveFile save,Video4Import edit,string hash){var s=Save(save);var prepared=Prepare(s,edit,hash);return new(hash,edit.Index!.Value,prepared.Decrypted,Info(prepared.Video,edit.Index.Value));}
    internal static void Apply(SaveFile save,Video4Import edit,string hash){var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Battle video4 editing requires valid save checksums.");var prepared=Prepare(s,edit,hash);prepared.Video.Data.CopyTo(Target(s,edit.Index).Data);s.State.Edited=true;}
    internal static Video4File Export(SaveFile save,Video4Export query){var s=Save(save);if(query.Decrypted is null)throw new ArgumentException("Missing battle video4 export state.");var video=new BattleVideo4(Target(s,query.Index).Data.ToArray());if(query.Decrypted.Value)video.Decrypt();return new($"battle-video-{query.Index!.Value+1}{(query.Decrypted.Value?"-decrypted":"")}.bv4",Convert.ToBase64String(video.Data));}
    internal static byte[] Snapshot(SaveFile save){var s=Save(save);return Enumerable.Range(0,4).SelectMany(i=>s.GetBattleVideo(i)?.Data.ToArray()??[]).ToArray();}
}
public static partial class SaveService
{
    public static string ReadBattleVideo4(byte[] data,string json){if(json.Length>1024)throw new ArgumentException("Battle video4 query is too large.");var query=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Video4Query)??throw new ArgumentException("Missing battle video4 query.");return JsonSerializer.Serialize(BattleVideo4Editing.Read(Open(data),query.Index,Br4Editing.Hash(data)),SaveJsonContext.Default.Video4Catalog);}
    private static Video4Import ParseVideo4(string json){if(json.Length>32768)throw new ArgumentException("Battle video4 request is too large.");return JsonSerializer.Deserialize(json,SaveJsonContext.Default.Video4Import)??throw new ArgumentException("Missing battle video4 import.");}
    public static string PreviewBattleVideo4(byte[] data,string json)=>JsonSerializer.Serialize(BattleVideo4Editing.Preview(Open(data),ParseVideo4(json),Br4Editing.Hash(data)),SaveJsonContext.Default.Video4Preview);
    public static byte[] ImportBattleVideo4(byte[] data,string json){var edit=ParseVideo4(json);var s=Open(data);BattleVideo4Editing.Apply(s,edit,Br4Editing.Hash(data));var expected=BattleVideo4Editing.Snapshot(s);var output=s.Write().ToArray();var check=Open(output);if(output.Length!=data.Length||check.GetType()!=s.GetType()||check.Version!=s.Version||!SaveChecksums.Valid(check)||!expected.SequenceEqual(BattleVideo4Editing.Snapshot(check)))throw new InvalidOperationException("Battle video4 export verification failed.");return output;}
    public static string ExportBattleVideo4(byte[] data,string json){if(json.Length>1024)throw new ArgumentException("Battle video4 export query is too large.");var query=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Video4Export)??throw new ArgumentException("Missing battle video4 export.");return JsonSerializer.Serialize(BattleVideo4Editing.Export(Open(data),query),SaveJsonContext.Default.Video4File);}
}
