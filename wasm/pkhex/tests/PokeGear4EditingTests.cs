// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class PokeGear4EditingTests
{
    private static void Check(bool v,string m){if(!v)throw new Exception(m);}
    private static void Reject(Action a){try{a();throw new Exception("Invalid PokeGear4 accepted");}catch(ArgumentException){}}
    private static SAV4HGSS Open(byte[] b)=>SaveUtil.GetSaveFile(b.ToArray())as SAV4HGSS??throw new Exception("Fixture not recognized");
    private static byte[] Apply(byte[] bytes,PokeGear4Edit edit){var original=bytes.ToArray();try{return SaveService.EditPokeGear4(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.PokeGear4Edit));}finally{Check(bytes.SequenceEqual(original),"Original immutable on success/rejection");}}
    private static void Compare(byte[] bytes,PokeGear4Edit edit,Action<SAV4HGSS> mutate){var expected=Open(bytes);mutate(expected);var output=Apply(bytes,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"Independent complete-file oracle including adjacent fields and character gender");Check(SaveChecksums.Valid(Open(output))&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Checksum and exact download");}
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.HG,GameVersion.SS})foreach(uint magic in new[]{SAV4.MAGIC_JAPAN_INTL,SAV4.MAGIC_KOREAN})foreach(byte gender in new byte[]{0,1})
        {
            var seed=Open(File.ReadAllBytes(".tmp/pkhex-fixtures/HG.sav"));seed.Version=version;seed.Magic=magic;seed.Gender=gender;
            for(int i=-4;i<79;i++)seed.General[0xC0EC+i]=(byte)(i*19+7);var bytes=seed.Write().ToArray();var original=bytes.ToArray();var s=Open(bytes);
            var c=JsonSerializer.Deserialize(SaveService.ReadPokeGear4(bytes),SaveJsonContext.Default.PokeGear4Catalog)!;
            Check(bytes.SequenceEqual(original)&&c.CanEdit&&c.Slots.Length==75&&c.Choices.Length==76&&c.Choices.Select(v=>v.Id).SequenceEqual(Enumerable.Range(-1,76))&&c.Player==(gender==0?3:4),"Public source/enum width, genders and names");
            Check(c.SourceHash==PokeGear4Editing.Hash(bytes)&&c.Choices[0].Source=="None"&&c.Choices[^1].Source=="Ernest","Frozen source and compile-time names");
            for(int i=0;i<75;i++){Check(c.Slots[i]==unchecked((sbyte)s.General[0xC0EC+i]),"Signed raw decoding");foreach(int value in new[]{-128,-1,0,74,127}){int at=i;Compare(bytes,new("slots",[new(i,value)]),x=>x.General[0xC0EC+at]=unchecked((byte)(sbyte)value));}}
            // Every byte encoding at varying positions, without multiplying full-file writes by all 75 coordinates.
            for(int raw=0;raw<256;raw++){int pos=raw%75;int value=unchecked((sbyte)raw);Compare(bytes,new("slots",[new(pos,value)]),x=>x.General[0xC0EC+pos]=(byte)raw);}
            foreach(var action in new[]{"all","nonTrainers","clear"})
            {
                int player=gender==0?3:4;
                int[] values=action=="all"?Enumerable.Range(0,75).Where(v=>v!=player&&v!=15).ToArray():action=="nonTrainers"?new[]{0,1,2,3,4,5,6,7,9,24}.Where(v=>v!=player).ToArray():[];
                int[] expected=values.Concat(Enumerable.Repeat(-1,75-values.Length)).ToArray();var plan=c.Plans.Single(p=>p.Action==action);
                Check(plan.Slots.SequenceEqual(expected)&&plan.Slots.Length==75,"Exact upstream batch order and exclusions, not merging");
                Compare(bytes,new(action,SourceHash:c.SourceHash),x=>{for(int i=0;i<75;i++)x.General[0xC0EC+i]=unchecked((byte)(sbyte)expected[i]);});
            }
            var duplicate=Open(bytes);duplicate.General[0xC0EC]=duplicate.General[0xC0ED]=0;duplicate.General[0xC0EE]=255;var duplicated=duplicate.Write().ToArray();Compare(duplicated,new("slots",[new(74,15)]),x=>x.General[0xC0EC+74]=15);
            PokeGear4Edit[] bad=[new("unknown"),new("slots"),new("slots",[]),new("slots",[null!]),new("slots",[new(null,0)]),new("slots",[new(0,null)]),new("slots",[new(-1,0)]),new("slots",[new(75,0)]),new("slots",[new(0,-129)]),new("slots",[new(0,128)]),new("slots",[new(0,0),new(0,1)]),new("slots",[new(0,0)],c.SourceHash),new("all"),new("all",[new(0,0)],c.SourceHash),new("clear",SourceHash:new string('0',64))];
            foreach(var edit in bad){Reject(()=>Apply(bytes,edit));var x=Open(bytes);var general=x.General.ToArray();Reject(()=>PokeGear4Editing.Apply(x,edit,c.SourceHash));Check(x.General.SequenceEqual(general),"Atomic full-request rejection");}
            var changed=Apply(bytes,new("slots",[new(0,-1)]));foreach(string action in new[]{"all","nonTrainers","clear"})Reject(()=>Apply(changed,new(action,SourceHash:c.SourceHash)));
            var genderChanged=Open(bytes);genderChanged.Gender=(byte)(1-gender);Reject(()=>Apply(genderChanged.Write().ToArray(),new("all",SourceHash:c.SourceHash)));
            var corrupt=bytes.ToArray();corrupt[0x20]^=1;Check(!PokeGear4Editing.Read(Open(corrupt),PokeGear4Editing.Hash(corrupt)).CanEdit,"Corrupt readonly");Reject(()=>Apply(corrupt,new("slots",[new(0,0)])));Reject(()=>SaveService.EditPokeGear4(bytes,new string(' ',4097)));
            Console.WriteLine($"PASS PokeGear4 {version} magic={magic:X8} gender={gender}: 75 addresses/all byte encodings, every batch order/exclusion, duplicate/gap/raw preservation, frozen preview, atomic requests and full-file parity");
        }
        Reject(()=>PokeGear4Editing.Read(new SAV4DP(),""));Reject(()=>PokeGear4Editing.Read(new SAV4Pt(),""));Reject(()=>PokeGear4Editing.Read(new SAV1(LanguageID.English),""));
    }
}
