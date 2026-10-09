// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Br4EditingTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid BR request accepted");}catch(ArgumentException){}}
    private static SAV4BR Open(byte[] bytes,int profile){var save=SaveUtil.GetSaveFile(bytes.ToArray()) as SAV4BR??throw new Exception("BR fixture not recognized");save.CurrentSlot=profile;return save;}
    internal static byte[] Fixture(bool japanese,int partition)
    {
        // All-zero plaintext has valid zero bit-count checksums for both full partitions.
        var plaintext=new byte[SaveUtil.SIZE_G4BR];var save=new SAV4BR(plaintext,false);
        for(int p=0;p<4;p++){save.CurrentSlot=p;save.Japanese=japanese;save.CurrentOT=$"Player{p}";save.Money=(uint)(1000+p);save.TID16=(ushort)(100+p);for(int i=0;i<GearUnlock.Size;i++)save.GearUnlock.Data[i]=(byte)(i*19+p*23+3);save.Data[0x434]=(byte)(0xC0+p);save.Data[GearUnlock.Offset-1]=0x75;save.Data[GearUnlock.Offset+GearUnlock.Size]=0xA3;var mon=new BK4{Species=(ushort)(25+p),PID=(uint)(100+p),TID16=(ushort)p,Version=GameVersion.D};save.SetBoxSlotAtIndex(mon,0,0);}
        var bytes=save.Write().ToArray();if(partition==1){var decrypted=bytes.ToArray();SAV4BR.Decrypt(decrypted);decrypted.AsSpan(0,SAV4BR.SIZE_HALF).CopyTo(decrypted.AsSpan(SAV4BR.SIZE_HALF));decrypted.AsSpan(0,SAV4BR.SIZE_HALF).Clear();decrypted[0x100]=1;var second=new SAV4BR(decrypted,false);Check(second.CurrentSlot==0&&second.CurrentOT=="Player0","Second partition selection with invalid first-partition checksum");bytes=second.Write().ToArray();}
        return bytes;
    }
    private static byte[] Apply(byte[] bytes,Br4GearEdit edit){var original=bytes.ToArray();try{return SaveService.EditBr4Gear(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Br4GearEdit));}finally{Check(bytes.SequenceEqual(original),"Immutable encrypted source on success/rejection");}}
    private static void Compare(byte[] bytes,int profile,Br4GearEdit edit,Action<SAV4BR> mutate){var expected=Open(bytes,profile);mutate(expected);var output=Apply(bytes,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"Whole encrypted container parity, other players and inactive partition");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output)&&SaveChecksums.Valid(Open(output,profile)),"Exact export and complete checksums");}
    public static void Run()
    {
        foreach(bool japanese in new[]{false,true})foreach(int partition in new[]{0,1})
        {
            var bytes=Fixture(japanese,partition);SaveService.ResetBRProfile();var baseline=JsonSerializer.Deserialize(SaveService.Inspect(bytes),SaveJsonContext.Default.SaveReport)!;
            Check(baseline.Format=="SAV4BR"&&baseline.BrProfiles is {Active:0,CanEdit:true}&&baseline.BrProfiles.Choices.Length==4&&!baseline.CanEdit,"Scoped format available without enabling generic trainer editing");
            for(int profile=0;profile<4;profile++)
            {
                var original=bytes.ToArray();var report=JsonSerializer.Deserialize(SaveService.SelectBRProfile(bytes,profile),SaveJsonContext.Default.SaveReport)!;
                Check(bytes.SequenceEqual(original)&&report.Ot==$"Player{profile}"&&report.BrProfiles!.Active==profile&&report.Tid==100+profile&&report.Pokemon.Single(v=>v.Box==0&&v.Slot==0).Species==25+profile,"Player selection links trainer and real box Pokemon without changing the file");
                var c=JsonSerializer.Deserialize(SaveService.ReadBr4Gear(bytes),SaveJsonContext.Default.Br4GearCatalog)!;
                Check(c.CanEdit&&c.Profile==profile&&c.Outfits.Length==6&&c.Plans.Length==2&&c.Gear.Select(v=>v.Id).Distinct().Count()==c.Gear.Length&&c.Gear.All(v=>v.Model is >=1 and <=6&&v.Category is >=0 and <=9&&!string.IsNullOrWhiteSpace(v.Name.En)),"Complete gear categories and exact names");
                var allFlags=c.Gear.Select(row=>new Br4FlagEdit(row.Id,!row.Unlocked)).ToArray();
                Compare(bytes,profile,new("gear",profile,allFlags),s=>{foreach(var row in c.Gear){int id=row.Id,at=GearUnlock.Offset+(id>>3),bit=id&7;s.Data[at]=(byte)((s.Data[at]&~(1<<bit))|(!row.Unlocked?1<<bit:0));}});
                foreach(var row in new[]{c.Gear[0],c.Gear[^1],c.Gear.First(v=>v.Shared)}){int id=row.Id;bool enabled=!row.Unlocked;Compare(bytes,profile,new("gear",profile,[new(id,enabled)]),s=>{int at=GearUnlock.Offset+(id>>3),bit=id&7;s.Data[at]=(byte)((s.Data[at]&~(1<<bit))|(enabled?1<<bit:0));});}
                for(int id=0;id<6;id++){int bit=id;foreach(bool enabled in new[]{true,false})Compare(bytes,profile,new("outfits",profile,[new(id,enabled)]),s=>s.Data[0x434]=(byte)((s.Data[0x434]&~(1<<bit))|(enabled?1<<bit:0)));}
                foreach(string action in new[]{"all","defaults"})
                {
                    var target=new byte[GearUnlock.Size];for(int model=1;model<=6;model++)for(int category=0;category<10;category++){var (offset,count)=GearUnlock.GetOffsetCount((ModelBR)model,(GearCategory)category);if(action=="all")for(int i=0;i<count;i++)target[(offset+i)>>3]|=(byte)(1<<((offset+i)&7));else{int id=offset+GearUnlock.GetDefault((ModelBR)model,(GearCategory)category);target[id>>3]|=(byte)(1<<(id&7));}}
                    Check(c.Plans.Single(v=>v.Action==action).TargetHex==Convert.ToHexString(target),"Preview exact whole-block plan, including gap clearing and default choices");Compare(bytes,profile,new(action,profile,SourceHash:c.SourceHash),s=>target.CopyTo(s.GearUnlock.Data));
                }
                int gap=Enumerable.Range(0,1536).First(v=>!c.Gear.Any(r=>r.Id==v));Br4GearEdit[] invalid=[new("unknown",profile),new("gear",null,[new(0,true)]),new("gear",(profile+1)%4,[new(0,true)]),new("gear",profile),new("gear",profile,[]),new("gear",profile,[null!]),new("gear",profile,[new(null,true)]),new("gear",profile,[new(0,null)]),new("gear",profile,[new(-1,true)]),new("gear",profile,[new(gap,true)]),new("gear",profile,[new(0,true),new(0,false)]),new("outfits",profile,[new(6,true)]),new("all",profile),new("defaults",profile,SourceHash:new string('0',64)),new("all",profile,[new(0,true)],c.SourceHash)];
                foreach(var edit in invalid){Reject(()=>Apply(bytes,edit));var s=Open(bytes,profile);var before=s.Data.ToArray();Reject(()=>Br4Editing.ApplyGear(s,edit,c.SourceHash));Check(before.SequenceEqual(s.Data),"Atomic invalid gear requests");}
                var changed=Apply(bytes,new("outfits",profile,[new(0,!c.Outfits[0])]));Reject(()=>Apply(changed,new("all",profile,SourceHash:c.SourceHash)));
            }
            SaveService.ResetBRProfile();Check(JsonSerializer.Deserialize(SaveService.Inspect(bytes),SaveJsonContext.Default.SaveReport)!.BrProfiles!.Active==0,"New-file context resets selected player");SaveService.ConfigureBRProfile(3);Check(JsonSerializer.Deserialize(SaveService.Inspect(bytes),SaveJsonContext.Default.SaveReport)!.BrProfiles!.Active==3,"Explicit per-request context restores player after Worker recreation");SaveService.ResetBRProfile();Reject(()=>SaveService.ConfigureBRProfile(-2));Reject(()=>SaveService.ConfigureBRProfile(4));Reject(()=>SaveService.SelectBRProfile(bytes,-1));Reject(()=>SaveService.SelectBRProfile(bytes,4));Reject(()=>SaveService.EditBr4Gear(bytes,new string(' ',32769)));
            Console.WriteLine($"PASS BR gear Japanese={japanese} partition={partition}: four profiles, every selectable bit, outfits, complete bulk plans, linked trainer/box view, encrypted full-file parity, original and atomic requests");
        }
        SaveService.ResetBRProfile();Reject(()=>Br4Editing.ReadGear(new SAV4HGSS(),""));
    }
}
