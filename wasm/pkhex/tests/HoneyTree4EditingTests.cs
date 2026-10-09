// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class HoneyTree4EditingTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid HoneyTree4 request accepted");}catch(ArgumentException){}}
    private static SAV4Sinnoh Open(byte[] data)=>SaveUtil.GetSaveFile(data.ToArray())as SAV4Sinnoh??throw new Exception("Sinnoh fixture not recognized");
    private static Honey4Catalog Read(byte[] data)=>JsonSerializer.Deserialize(SaveService.ReadHoneyTree4(data),SaveJsonContext.Default.Honey4Catalog)!;
    private static byte[] Apply(byte[] data,Honey4Edit edit){var original=data.ToArray();try{return SaveService.EditHoneyTree4(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Honey4Edit));}finally{Check(data.SequenceEqual(original),"Honey original immutable on success/rejection");}}
    private static int Base(SAV4Sinnoh s)=>s is SAV4DP?0x72E4:0x7F38;
    private static void Compare(byte[] bytes,Honey4Edit edit,Action<byte[]> mutate){var s=Open(bytes);var general=s.General.ToArray();mutate(general);general.CopyTo(s.General);var output=Apply(bytes,edit);Check(output.SequenceEqual(s.Write().ToArray()),"Honey complete file parity and neighboring/other tree/spare partition protection");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Honey exact whole export");}
    public static void Run()
    {
        foreach(string game in new[]{"D","Pt"})
        {
            var s=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{game}.sav"));s.ID32=1935328924;int start=Base(s);for(int i=-1;i<169;i++)s.General[start+i]=(byte)(i*13+91);var bytes=s.Write().ToArray();var original=bytes.ToArray();var c=Read(bytes);Check(bytes.SequenceEqual(original)&&c.CanEdit&&c.Trees.Length==21&&c.Choices.Length==24,"Honey immutable catalog/21 trees/24 choices");Check(c.MunchlaxTrees.SequenceEqual(new[]{10,6,9,10}),"Core duplicate rare-tree rule preserved");
            for(int i=0;i<21;i++){var row=c.Trees[i];var raw=Open(bytes).General.Slice(start+i*8,8).ToArray();Check(row.Id==i&&row.RawHex==Convert.ToHexString(raw)&&row.Time==BinaryPrimitives.ReadUInt32LittleEndian(raw)&&row.Slot==raw[4]&&row.SubTable==raw[5]&&row.Group==raw[6]&&row.Shake==raw[7]&&row.Rare==c.MunchlaxTrees.Contains(i),"Honey physical eight-byte layout and rare status");
                foreach(int value in new[]{0,1,2,3}){uint time=value==3?1440u:(uint)value;int slot=value==3?5:value;var edit=new Honey4Edit("patch",c.SourceHash,i,time,value,value,slot);Compare(bytes,edit,g=>{BinaryPrimitives.WriteUInt32LittleEndian(g.AsSpan(start+i*8),time);g[start+i*8+4]=(byte)slot;g[start+i*8+5]=(byte)Math.Max(0,value-1);g[start+i*8+6]=(byte)value;g[start+i*8+7]=(byte)value;});}
                Compare(bytes,new("catchable",c.SourceHash,i),g=>BinaryPrimitives.WriteUInt32LittleEndian(g.AsSpan(start+i*8),1080));
                var normalized=raw.ToArray();BinaryPrimitives.WriteUInt32LittleEndian(normalized,Math.Min(row.Time,1440u));normalized[4]=(byte)Math.Min(row.Slot,5);normalized[6]=(byte)Math.Min(row.Group,3);normalized[5]=(byte)Math.Max(0,normalized[6]-1);normalized[7]=(byte)Math.Min(row.Shake,3);Check(row.SaveHex==Convert.ToHexString(normalized)&&row.SaveValues.SequenceEqual(new[]{(int)BinaryPrimitives.ReadUInt32LittleEndian(normalized), (int)normalized[7],(int)normalized[6],(int)normalized[4]}),"Honey native normalize plan");Compare(bytes,new("save",c.SourceHash,i),g=>normalized.CopyTo(g,start+i*8));
            }
            foreach(var choice in c.Choices){Check(choice.Species==s.GetHoneyTreeSpecies(choice.Group,choice.Slot)&&choice.Name.Zh.Length>0&&choice.Name.En.Length>0&&choice.Name.Ja.Length>0,"Honey exact Core species choices/localization");Check(choice.Alternate==(s is SAV4DP&&choice.Species==266?268:null),"Diamond/Pearl Silcoon/Cascoon distinction");}
            Compare(bytes,new("patch",c.SourceHash,0,Time:0),g=>BinaryPrimitives.WriteUInt32LittleEndian(g.AsSpan(start),0));Compare(bytes,new("patch",c.SourceHash,20,Slot:0),g=>g[start+20*8+4]=0);Compare(bytes,new("patch",c.SourceHash,20,Shake:0),g=>g[start+20*8+7]=0);
            Honey4Edit[] invalid=[new("patch",c.SourceHash,0),new("patch",c.SourceHash,null,Time:0),new("patch",c.SourceHash,21,Time:0),new("patch",c.SourceHash,-1,Time:0),new("patch",c.SourceHash,0,Time:1441),new("patch",c.SourceHash,0,Shake:-1),new("patch",c.SourceHash,0,Group:4),new("patch",c.SourceHash,0,Slot:6),new("save",c.SourceHash,0,Time:0),new("catchable",c.SourceHash,0,Group:0),new("invalid",c.SourceHash,0),new("save",new string('0',64),0)];foreach(var edit in invalid){Reject(()=>Apply(bytes,edit));var local=Open(bytes);var before=local.General.ToArray();Reject(()=>HoneyTree4Editing.Apply(local,edit,c.SourceHash));Check(before.SequenceEqual(local.General),"Honey atomic invalid rejection");}
            var damaged=bytes.ToArray();damaged[start]^=1;Check(!Read(damaged).CanEdit,"Honey damaged checksum read-only");Reject(()=>Apply(damaged,new("save",Br4Editing.Hash(damaged),0)));
            Console.WriteLine($"PASS HoneyTree4 {game}: all 21 eight-byte addresses, limits, partial-field/raw-subtable protection, catchable/resave, 24 species, duplicate rare-tree rule, atomic rejection, checksums, original and complete file parity");
        }
        Reject(()=>SaveService.ReadHoneyTree4(File.ReadAllBytes(".tmp/pkhex-fixtures/HG.sav")));
    }
}
