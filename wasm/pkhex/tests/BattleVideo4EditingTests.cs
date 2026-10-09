// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class BattleVideo4EditingTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid video4 request accepted");}catch(ArgumentException){}}
    private static SAV4 Open(byte[] bytes)=>SaveUtil.GetSaveFile(bytes.ToArray())as SAV4??throw new Exception("Gen4 fixture not recognized");
    private static BattleVideo4 Video(uint key,int block,int variant)
    {
        var v=new BattleVideo4(new byte[BattleVideo4.SIZE_USED]){IsDecrypted=true,Key=key,Magic=SAV4.MAGIC_JAPAN_INTL,Revision=(uint)(5+variant),BlockSize=0x1D50,BlockID=(ushort)block};
        for(int t=0;t<4;t++){var span=v.GetTrainerTeam(t);span[0]=6;span[2]=(byte)(6-t);StringConverter4.SetString(v.GetTrainerDetail(t),$"T{variant}{t}",7,(int)LanguageID.English,StringConverterOption.ClearZero);for(int m=0;m<6-t;m++){var pk=new PK4{Species=(ushort)(25+t*10+m+variant),PID=(uint)(100+t+m),Version=GameVersion.Pt,Nickname=$"P{t}{m}",OriginalTrainerName="Trainer",Language=2,EXP=1000};var raw=new byte[pk.SIZE_PARTY];pk.WriteDecryptedDataParty(raw);var target=span.Slice(4+m*0x70,0x70);BattleVideo4.DeflateFromPK4(raw,target);raw.AsSpan(8,4).CopyTo(target.Slice(6,4));}}
        v.RefreshChecksums();v.Encrypt();return v;
    }
    private static byte[] Fixture(string game,int active)
    {
        var s=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{game}.sav"));int extra=s is SAV4Pt?0x2820:0x230C,first=s is SAV4Pt?0x24000:0x27000;
        for(int i=0;i<4;i++){int offset=first+0x2000*i;for(int p=0;p<2;p++){var v=Video((uint)(1000+i),i+2,p);v.Data.CopyTo(s.Data.Slice(p*0x40000+offset,BattleVideo4.SIZE_USED));s.Data[p*0x40000+offset+BattleVideo4.SIZE_USED]=0xAB;}WriteUInt32LittleEndian(s.General[(extra+4*(i+1))..],(uint)(1000+i));WriteUInt32LittleEndian(s.General[(extra+20+4*(i+1))..],(uint)(1000+i));s.General[extra+40+i+1]=(byte)active;}
        var data=s.Write().ToArray();Check(Enumerable.Range(0,4).All(i=>Open(data).GetBattleVideo(i)!=null),"Four initialized extra-data slots");return data;
    }
    private static Video4Catalog Read(byte[] bytes)=>JsonSerializer.Deserialize(SaveService.ReadBattleVideo4(bytes,"{\"index\":0}"),SaveJsonContext.Default.Video4Catalog)!;
    private static byte[] Apply(byte[] bytes,Video4Import edit){var original=bytes.ToArray();try{return SaveService.ImportBattleVideo4(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Video4Import));}finally{Check(bytes.SequenceEqual(original),"Source file immutable");}}
    public static void Run()
    {
        foreach(string game in new[]{"Pt","HG"})foreach(int active in new[]{0,1})
        {
            var bytes=Fixture(game,active);var baseline=bytes.ToArray();var c=Read(bytes);Check(bytes.SequenceEqual(baseline)&&c.CanEdit&&c.Slots.Length==4&&c.Slots.All(v=>v.Available&&v.Valid&&v.Teams.Length==4&&v.Teams.Select(t=>t.Members.Length).SequenceEqual(new[]{6,5,4,3}))&&c.Slots[0].Teams[3].Members[0].Species==55+active,"Read all four trainers, partial PK4 info and selected extra-data partition");
            for(int index=0;index<4;index++)foreach(bool decrypted in new[]{false,true})
            {
                var exported=JsonSerializer.Deserialize(SaveService.ExportBattleVideo4(bytes,JsonSerializer.Serialize(new Video4Export(index,decrypted),SaveJsonContext.Default.Video4Export)),SaveJsonContext.Default.Video4File)!;var raw=Convert.FromBase64String(exported.Data);var expected=new BattleVideo4(Open(bytes).GetBattleVideo(index)!.Data.ToArray());if(decrypted)expected.Decrypt();Check(raw.SequenceEqual(expected.Data.ToArray())&&raw.Length==7520&&BattleVideo4.DetectEncryption(raw)==(decrypted?BattleVideo4DecryptionState.Decrypted:BattleVideo4DecryptionState.Encrypted),"Exact encrypted/decrypted standalone export");
                var imported=Video(9000,77,10);if(decrypted)imported.Decrypt();var edit=new Video4Import(index,Convert.ToBase64String(imported.Data),c.SourceHash);var preview=JsonSerializer.Deserialize(SaveService.PreviewBattleVideo4(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Video4Import)),SaveJsonContext.Default.Video4Preview)!;Check(preview.InputDecrypted==decrypted&&preview.Video.Key==1000+index&&preview.Video.BlockID==index+2&&preview.Video.Teams[3].Members[0].Species==65,"Preview retains destination ownership with distinct source key/footer and all teams");
                var oracle=Open(bytes);var target=oracle.GetBattleVideo(index)!;var v=new BattleVideo4(imported.Data.ToArray()){IsDecrypted=decrypted,Key=target.Key,Magic=target.Magic,Revision=target.Revision,BlockSize=target.BlockSize,BlockID=target.BlockID};v.RefreshChecksums();v.Encrypt();v.Data.CopyTo(target.Data);var result=Apply(bytes,edit);Check(result.SequenceEqual(oracle.Write().ToArray())&&SaveService.ExportWorkingCopy(result).SequenceEqual(result)&&Open(result).GetBattleVideo(index)!.Key==1000+index,"Complete-file oracle, spare partitions, adjacent padding, other videos/General/storage/Hall preserved and slot discoverable");Reject(()=>Apply(result,edit));
            }
            Video4Import[] invalid=[new(null,"AA==",c.SourceHash),new(4,"AA==",c.SourceHash),new(0,null,c.SourceHash),new(0,"AA==",c.SourceHash),new(0,"???",c.SourceHash),new(0,Convert.ToBase64String(new byte[7520]),c.SourceHash),new(0,Convert.ToBase64String(Video(9,9,9).Data),new string('0',64))];foreach(var edit in invalid){Reject(()=>Apply(bytes,edit));var s=Open(bytes);var before=s.Data.ToArray();Reject(()=>BattleVideo4Editing.Apply(s,edit,c.SourceHash));Check(before.SequenceEqual(s.Data),"Atomic invalid import requests");}
            Console.WriteLine($"PASS battle video4 {game} active={active}: four slots/all four teams, encrypted/decrypted preview/import/export, destination key/footer ownership, immutable source, full-file oracle and atomic requests");
        }
        var empty=File.ReadAllBytes(".tmp/pkhex-fixtures/Pt.sav");var catalog=Read(empty);Check(catalog.Slots.All(v=>!v.Available),"Uninitialized slots remain uninitialized");Reject(()=>Apply(empty,new(0,Convert.ToBase64String(Video(9,9,9).Data),catalog.SourceHash)));Reject(()=>SaveService.ReadBattleVideo4(File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav"),"{\"index\":0}"));
    }
}
