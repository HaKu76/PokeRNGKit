// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text;
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Zygarde7EditingTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Collectibles7 edit accepted");}catch(ArgumentException){}}
    private static SAV7 Open(byte[] bytes)=>(SAV7)SaveUtil.GetSaveFile(bytes.ToArray())!;
    private static Zygarde7Catalog Read(byte[] bytes)=>JsonSerializer.Deserialize(SaveService.ReadZygarde7(bytes),SaveJsonContext.Default.Zygarde7Catalog)!;
    private static string Json(Zygarde7Edit e)=>JsonSerializer.Serialize(e,SaveJsonContext.Default.Zygarde7Edit);
    private static byte[] Compare(byte[] bytes,Zygarde7Edit e,Action<SAV7> oracle)
    {
        var original=bytes.ToArray();var expected=Open(bytes);oracle(expected);if(expected is SAV7USUM)expected.SetRecord(72,expected.EventWork.ZygardeCellCount);
        var p=JsonSerializer.Deserialize(SaveService.PreviewZygarde7(bytes,Json(e)),SaveJsonContext.Default.Zygarde7Preview)!;
        var output=SaveService.EditZygarde7(bytes,Json(p.Request));Check(output.SequenceEqual(expected.Write().ToArray()),"Collectibles7 independent full-file source parity");
        Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0,bytes.Length).Where(i=>bytes[i]!=output[i])),"Collectibles7 exact changed addresses");Check(p.Request.TargetHash==Br4Editing.Hash(output)&&p.Result.SourceHash==p.Request.TargetHash,"Collectibles7 frozen result hash");Check(bytes.SequenceEqual(original),"Collectibles7 original immutable");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Collectibles7 exact export");return output;
    }
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.SN,GameVersion.MN,GameVersion.US,GameVersion.UM})
        {
            bool stickers=version is GameVersion.US or GameVersion.UM;var s=Open(File.ReadAllBytes(stickers?".tmp/pkhex-fixtures/US.sav":".tmp/pkhex-fixtures/SN.sav"));s.Version=version;
            int count=stickers?100:95,baseOffset=stickers?0x1E00:0x1C00;for(int i=0;i<1000;i++)s.EventWork.SetWork(i,(ushort)(50000+i));for(int i=0;i<count;i++)s.EventWork.SetZygardeCell(i,(ushort)(i%3));s.EventWork.ZygardeCellTotal=127;s.EventWork.ZygardeCellCount=8;s.SetRecord(72,4321);
            var bytes=s.Write().ToArray();var original=bytes.ToArray();var c=Read(bytes);Check(c.CanEdit&&c.Stickers==stickers&&c.Entries.Length==count&&c.Total==127&&c.Collected==8,"Collectibles7 actual layout/counters");
            string locationHash=Br4Editing.Hash(Encoding.UTF8.GetBytes(string.Join('\n',c.Entries.Select(v=>v.Location.En))));Check(locationHash==(stickers?"E7B2B63DBC7D463E8B86066128C2FAEAEDA67EE8A5925E17EBB7CC8447583C56":"5E33C8180C8B964A21F6BC826D298C5436F107F42C8DB327BC1A0179F0A2A3D1"),"Collectibles7 exact independent upstream location order hash");Check(c.Entries.All(v=>v.Location.Zh.Length>0&&v.Location.Ja.Length>0&&v.Location.Zh!=v.Location.En&&v.Location.Ja!=v.Location.En),"Collectibles7 all locations localized");
            // Binary index patterns identify every distinct physical slot, rather than hiding swaps behind a constant fill.
            for(int bit=0;bit<7;bit++){var rows=Enumerable.Range(0,count).Select(i=>new Zygarde7Value(i,(i>>bit)&1)).ToArray();var output=Compare(bytes,new("patch",c.SourceHash,rows),copy=>{foreach(var row in rows)BinaryPrimitives.WriteUInt16LittleEndian(copy.Data.Slice(baseOffset+(198+row.Index)*2),checked((ushort)row.State));});Check(Read(output).Entries.Select(v=>v.State).SequenceEqual(rows.Select(v=>v.State)),"Collectibles7 all indexed states");}
            foreach(int index in new[]{0,count/2,count-1})foreach(int state in new[]{0,1,2})Compare(bytes,new("patch",c.SourceHash,[new(index,state)]),copy=>BinaryPrimitives.WriteUInt16LittleEndian(copy.Data.Slice(baseOffset+(198+index)*2),(ushort)state));
            foreach(int value in new[]{0,1,95,100,65535}){Compare(bytes,new("patch",c.SourceHash,Total:value),copy=>BinaryPrimitives.WriteUInt16LittleEndian(copy.Data.Slice(baseOffset+161*2),(ushort)value));Compare(bytes,new("patch",c.SourceHash,Collected:value),copy=>BinaryPrimitives.WriteUInt16LittleEndian(copy.Data.Slice(baseOffset+169*2),(ushort)value));}
            Action<SAV7> give=copy=>{int added=Enumerable.Range(0,count).Count(i=>copy.EventWork.GetZygardeCell(i)!=2);for(int i=0;i<count;i++)copy.EventWork.SetZygardeCell(i,2);copy.EventWork.ZygardeCellCount+=(ushort)added;if(!stickers)copy.EventWork.ZygardeCellTotal+=(ushort)added;};var all=Compare(bytes,new("giveAll",c.SourceHash),give);Compare(all,new("giveAll",Read(all).SourceHash),give);Compare(bytes,new("resave",c.SourceHash),_=>{});
            var unusual=Open(bytes);unusual.EventWork.SetZygardeCell(2,65535);var raw=unusual.Write().ToArray();var unknown=Read(raw);Check(unknown.Entries[2].State==65535,"Collectibles7 unknown state readable");Compare(raw,new("patch",unknown.SourceHash,Total:0),copy=>copy.EventWork.ZygardeCellTotal=0);Compare(raw,new("patch",unknown.SourceHash,[new(2,2)]),copy=>copy.EventWork.SetZygardeCell(2,2));Reject(()=>SaveService.PreviewZygarde7(raw,Json(new("giveAll",unknown.SourceHash))));Reject(()=>SaveService.PreviewZygarde7(raw,Json(new("resave",unknown.SourceHash))));
            foreach(var e in new Zygarde7Edit[]{new("patch",c.SourceHash),new("patch",c.SourceHash,[]),new("patch",c.SourceHash,[new(-1,0)]),new("patch",c.SourceHash,[new(count,0)]),new("patch",c.SourceHash,[new(0,3)]),new("patch",c.SourceHash,[new(0,-1)]),new("patch",c.SourceHash,[new(0,0),new(0,1)]),new("patch",c.SourceHash,Total:-1),new("patch",c.SourceHash,Collected:65536),new("giveAll",c.SourceHash,Total:0),new("resave",c.SourceHash,Collected:0),new("patch","bad",[new(0,0)])})Reject(()=>SaveService.PreviewZygarde7(bytes,Json(e)));
            var overflow=Open(bytes);overflow.EventWork.ZygardeCellCount=65535;var overflowing=overflow.Write().ToArray();Reject(()=>SaveService.PreviewZygarde7(overflowing,Json(new("giveAll",Read(overflowing).SourceHash))));overflow=Open(bytes);overflow.EventWork.ZygardeCellTotal=65535;overflowing=overflow.Write().ToArray();if(stickers)Compare(overflowing,new("giveAll",Read(overflowing).SourceHash),give);else Reject(()=>SaveService.PreviewZygarde7(overflowing,Json(new("giveAll",Read(overflowing).SourceHash))));
            Reject(()=>SaveService.EditZygarde7(bytes,Json(new("patch",c.SourceHash,[new(0,0)]))));Reject(()=>SaveService.EditZygarde7(bytes,Json(new("patch",c.SourceHash,[new(0,0)],TargetHash:new string('0',64)))));var corrupt=bytes.ToArray();corrupt[baseOffset]^=1;Check(!Read(corrupt).CanEdit,"Collectibles7 invalid CRC read-only");Reject(()=>SaveService.PreviewZygarde7(corrupt,Json(new("giveAll",Read(corrupt).SourceHash))));Check(bytes.SequenceEqual(original),"Collectibles7 all reads/rejections preserve original");
            Console.WriteLine($"PASS {version}: {count} source locations/physical states, three languages, counters/full-range, source give-all/resave and USUM record72, old-state preservation/repair, overflow, exact frozen full-file source oracles and immutable export");
        }
        Reject(()=>SaveService.ReadZygarde7(File.ReadAllBytes(".tmp/pkhex-fixtures/OR.sav")));
    }
}
