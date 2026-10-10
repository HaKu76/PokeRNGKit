// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Dlc5EditingTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Dlc5 request accepted");}catch(ArgumentException){}}
    private static SAV5 Open(byte[] bytes)=>SaveUtil.GetSaveFile(bytes.ToArray())as SAV5??throw new Exception("Gen5 fixture not recognized");
    private static Dlc5Catalog Read(byte[] bytes)=>JsonSerializer.Deserialize(SaveService.ReadDlc5(bytes),SaveJsonContext.Default.Dlc5Catalog)!;
    private static Dlc5Preview Preview(byte[] bytes,Dlc5Edit edit)=>JsonSerializer.Deserialize(SaveService.PreviewDlc5(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Dlc5Edit)),SaveJsonContext.Default.Dlc5Preview)!;
    private static byte[] Apply(byte[] bytes,Dlc5Edit edit){var original=bytes.ToArray();try{var p=Preview(bytes,edit);var output=SaveService.EditDlc5(bytes,JsonSerializer.Serialize(p.Request,SaveJsonContext.Default.Dlc5Edit));Check(p.Request.TargetHash==Br4Editing.Hash(output),"Dlc frozen entire output");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Dlc exact full export");return output;}finally{Check(bytes.SequenceEqual(original),"Dlc original immutable");}}
    private static byte[] Raw(SAV5 s,string kind,int i)=>kind switch{"video"=>s.GetBattleVideo(i).ToArray(),"memory"=>(i==0?s.Link1Data:s.Link2Data).ToArray(),"musical"=>s.MusicalDownloadData.ToArray(),"dexSkin"=>s.PokedexSkinData.ToArray(),"battleTest"=>s.BattleTest.ToArray(),"pwt"=>((SAV5B2W2)s).GetPWT(i).ToArray(),_=>((SAV5B2W2)s).GetPokestarMovie(i).ToArray()};
    private static byte[] Export(byte[] bytes,string kind,int i,bool decrypted=false){var q=new Dlc5Export(kind,i,decrypted);var f=JsonSerializer.Deserialize(SaveService.ExportDlc5(bytes,JsonSerializer.Serialize(q,SaveJsonContext.Default.Dlc5Export)),SaveJsonContext.Default.Dlc5File)!;return Convert.FromBase64String(f.Data);}
    private static void SourceImport(SAV5 s,Dlc5Slot slot,byte[] source,string? name)
    {
        var raw=source.ToArray();Array.Resize(ref raw,slot.Size);int i=slot.Index;
        switch(slot.Kind){
            case "video":var v=new BattleVideo5(raw){IsDecrypted=BattleVideo5.GetIsDecrypted(raw)};v.Encrypt();if(!v.IsUninitialized)v.RefreshChecksums();s.SetBattleVideo(i,raw);break;
            case "memory":if(i==0)s.SetLink1Data(raw);else s.SetLink2Data(raw);break;
            case "pwt":((SAV5B2W2)s).SetPWT(i,raw);break;
            case "movie":((SAV5B2W2)s).SetPokestarMovie(i,raw);break;
            case "musical":s.SetMusical(raw);s.Musical.MusicalName=new MusicalShow5(raw).IsUninitialized?"":name!;break;
            case "dexSkin":s.SetPokeDexSkin(raw);break;
            case "battleTest":var t=new BattleTest5(raw);if(!t.IsUninitialized){t.Magic=BattleTest5.Sentinel;t.RefreshChecksums();}s.SetBattleTest(raw);break;
        }
    }
    private static byte[] Video(bool decrypted)
    {
        var bytes=new byte[BattleVideo5.SIZE];var v=new BattleVideo5(bytes){IsDecrypted=true};
        v.RandomMult=LCRNG64.Mult;v.RandomAdd=LCRNG64.Add;v.VideoName="Test";v.EndSentinel=0xE281;
        for(int t=0;t<4;t++){
            var team=bytes.AsSpan(new[]{0xCFC,0xFA0,0x1244,0x14E8}[t],0x2A4);team[0]=6;team[2]=6;
            var trainer=bytes.AsSpan(0x178C+t*0x44,0x44);WriteUInt32LittleEndian(trainer,1);StringConverter5.SetString(trainer[4..],$"Train{t}",7,2,StringConverterOption.ClearZero);
            for(int i=0;i<6;i++){
                var p=new PK5{Species=(ushort)(25+t*6+i),PID=(uint)(0x12340000+t*6+i),TID16=123,SID16=456,CurrentLevel=30,OriginalTrainerName="Tester",Nickname=$"P{t}{i}",Language=2,Move1=85,Move1_PP=15,IV_HP=31,EV_ATK=252,Ability=9,Nature=Nature.Adamant};
                p.RefreshChecksum();var target=team.Slice(4+i*0x70,0x70);BattleVideo5.DeflateFromPK5(p.Data,target);
                // Source deflater also omits species/item. A real video includes them at these known offsets.
                WriteUInt16LittleEndian(target[6..],p.Species);WriteUInt16LittleEndian(target[8..],1);
            }
        }
        v.RefreshChecksums();if(!decrypted)v.Encrypt();return bytes;
    }
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.B,GameVersion.W,GameVersion.B2,GameVersion.W2}){
            var source=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{(version is GameVersion.B or GameVersion.W?"B":"B2")}.sav"));source.Version=version;
            var bytes=source.Write().ToArray();var original=bytes.ToArray();var c=Read(bytes);
            Check(c.Slots.Length==(source is SAV5BW?9:20)&&bytes.SequenceEqual(original),"Dlc supported slot inventory and immutable read");
            foreach(var slot in c.Slots){
                foreach(int size in slot.ImportSizes){
                    var raw=new byte[size];new Random(500+slot.Index).NextBytes(raw);string? file=slot.Kind=="musical"?"42 - Hello (EN).pms":null;
                    var expected=Open(bytes);SourceImport(expected,slot,raw,slot.Kind=="musical"?"Hello":null);
                    var edit=new Dlc5Edit(slot.Kind,slot.Index,c.SourceHash,Convert.ToBase64String(raw),file);
                    var preview=Preview(bytes,edit);var output=Apply(bytes,edit);
                    Check(output.SequenceEqual(expected.Write().ToArray()),"Dlc source whole-file parity, padding/truncation, metadata, footer and neighboring protection");
                    Check(preview.InputSize==size&&preview.Result.Size==slot.Size,"Dlc size adjustment preview");
                    Check(preview.ChangedOffsets.SequenceEqual(Enumerable.Range(0,bytes.Length).Where(i=>bytes[i]!=output[i])),"Dlc all raw output changes");
                    Check(Export(output,slot.Kind,slot.Index).SequenceEqual(Raw(Open(output),slot.Kind,slot.Index)),"Dlc exact stored file export");
                    if(slot.Kind!="memory")Check(preview.Result.DownloadState==0xC21E&&preview.Result.DownloadCount==1,"Dlc source download flags/counters including PWT and movies");
                }
                foreach(byte fill in new byte[]{0,255}){
                    var raw=Enumerable.Repeat(fill,slot.Size).ToArray();var edit=new Dlc5Edit(slot.Kind,slot.Index,c.SourceHash,Convert.ToBase64String(raw),slot.Kind=="musical"?"Empty.pms":null);
                    var expected=Open(bytes);SourceImport(expected,slot,raw,null);
                    Check(Apply(bytes,edit).SequenceEqual(expected.Write().ToArray()),"Dlc all-zero/all-FF source behavior");
                }
                Reject(()=>Preview(bytes,new(slot.Kind,slot.Index,c.SourceHash,Convert.ToBase64String(new byte[slot.Size-1]),slot.Kind=="musical"?"File.pms":null)));
            }
            foreach(bool decrypted in new[]{false,true})foreach(int index in Enumerable.Range(0,4)){
                var raw=Video(decrypted);var edit=new Dlc5Edit("video",index,c.SourceHash,Convert.ToBase64String(raw));var p=Preview(bytes,edit);var output=Apply(bytes,edit);
                Check(p.InputDecrypted==decrypted&&p.Result.Valid==true&&p.Result.Teams.Length==4,"Dlc video crypto and checksums");
                for(int t=0;t<4;t++)for(int i=0;i<6;i++){
                    var team=p.Result.Teams[t];var member=team.Members[i];Check(team.Name==$"Train{t}"&&team.StoredCount==6&&member.Species==25+t*6+i&&member.Pokemon is {} pk&&pk.Nickname==$"P{t}{i}"&&pk.Ot=="Tester"&&pk.MoveIds[0]==85&&pk.Ivs[0]==31,"Dlc real team span and Core inflater recover every member");
                }
                var dec=Export(output,"video",index,true);Check(BattleVideo5.GetIsDecrypted(dec),"Dlc decoded export");
                var enc=Export(output,"video",index);var v=new BattleVideo5(dec){IsDecrypted=true};v.Encrypt();Check(dec.SequenceEqual(enc),"Dlc export crypto roundtrip");
            }
            var m=c.Slots.Single(s=>s.Kind=="musical");
            foreach(var pair in new[]{("42 - Hello (EN).pms","Hello"),("File (en).pms","File (en)"),("  LongName1234567890123456.pms","LongName123456789012"),("Music (ABCDEFG).pms","Music (ABCDEFG)")}){
                var raw=new byte[m.Size];raw[0]=1;var p=Preview(bytes,new("musical",0,c.SourceHash,Convert.ToBase64String(raw),pair.Item1));Check(p.Result.Name==pair.Item2,"Dlc source musical filename parser");
            }
            var good=new Dlc5Edit("memory",0,c.SourceHash,Convert.ToBase64String(new byte[0x400]));
            foreach(var bad in new[]{good with{Index=-1},good with{Index=2},good with{Kind="unknown"},good with{FileName="Extra"},good with{SourceHash=new string('0',64)},good with{Data="bad"},good with{TargetHash=new string('0',64)}})Reject(()=>Preview(bytes,bad));
            Reject(()=>SaveService.EditDlc5(bytes,JsonSerializer.Serialize(good,SaveJsonContext.Default.Dlc5Edit)));
            Reject(()=>Export(bytes,"memory",0,true));Reject(()=>Preview(bytes,good with{Kind="pwt",Index=3}));Reject(()=>Preview(bytes,good with{Kind="movie",Index=8}));
            var corrupt=bytes.ToArray();corrupt[0x100]^=1;var badC=Read(corrupt);Check(!badC.CanEdit,"Dlc bad save checksums disable edit");Reject(()=>Preview(corrupt,good with{SourceHash=badC.SourceHash}));
            Check(bytes.SequenceEqual(original),"Dlc all failures preserve original");
            Console.WriteLine($"PASS {version}: all DLC groups/slots/sizes, both video crypto forms/all 24 members, musical names, empty imports, footer/metadata/full files, frozen edits and atomic rejection");
        }
        Reject(()=>SaveService.ReadDlc5(File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav")));
    }
}
