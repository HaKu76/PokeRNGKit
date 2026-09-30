// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
using System.Buffers.Binary;
internal static class RoamerEditingTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static byte[] Apply(byte[] data,RoamerEdit edit)
    {
        var original=data.ToArray();try{return SaveService.EditRoamer(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.RoamerEdit));}
        finally{Check(data.SequenceEqual(original),"Original preserved on success and rejection");}
    }
    private static void Reject(byte[] data,RoamerEdit edit){try{Apply(data,edit);throw new Exception("Invalid roamer edit accepted");}catch(ArgumentException){}}
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.X,GameVersion.Y})
        {
            var seed=(SAV6XY)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav"))!;seed.Version=version;
            var raw=seed.Encount.Roamer.Data.Span;for(int i=0;i<raw.Length;i++)raw[i]=(byte)(i*17+3);
            BinaryPrimitives.WriteUInt16LittleEndian(raw,0xFC00);raw[7]=0xFE;BinaryPrimitives.WriteUInt32LittleEndian(raw[36..],uint.MaxValue);
            seed.EventWork.SetWork(48,2);var data=seed.Write().ToArray();var original=data.ToArray();
            var c=JsonSerializer.Deserialize(SaveService.ReadRoamer(data),SaveJsonContext.Default.RoamerCatalog)!;
            Check(c==new RoamerCatalog(0,15,uint.MaxValue,146),"Raw fields and explicit starter suggestion");
            Check(data.SequenceEqual(original),"Read never initializes the species");
            Check(Apply(data,new(c.Species,c.State,c.Encounters)).SequenceEqual(data),"No-op preserves full file and unset species");
            for(int species=144;species<=146;species++)for(int state=0;state<5;state++)for(int count=0;count<=11;count++)
            {
                var expected=(SAV6XY)SaveUtil.GetSaveFile(data.ToArray())!;var b=expected.Encount.Roamer.Data.Span;
                BinaryPrimitives.WriteUInt16LittleEndian(b,(ushort)(0xFC00|species));b[7]=(byte)((state<<4)|0x0E);BinaryPrimitives.WriteUInt32LittleEndian(b[36..],(uint)count);
                var output=Apply(data,new(species,state,count));Check(output.SequenceEqual(expected.Write().ToArray()),"Every valid combination matches independent raw offsets and full file");
                Check(SaveUtil.GetSaveFile(output.ToArray())!.ChecksumsValid,"Export checksum");
            }
            foreach(var edit in new RoamerEdit[]{new(),new(144),new(144,0),new(-1,0,0),new(143,0,0),new(147,0,0),new(1024,0,0),new(144,-1,0),new(144,5,0),new(144,16,0),new(144,0,-1),new(144,0,12),new(144,0,(long)uint.MaxValue+1)})Reject(data,edit);
            foreach(int starter in new[]{0,1,2,3,65535})
            {
                seed.EventWork.SetWork(48,(ushort)starter);var before=seed.Encount.Roamer.Data.ToArray();var report=RoamerEditing.Read(seed);
                Check(report.SuggestedSpecies==(starter<=2?144+starter:(int?)null),"Starter bounds");Check(before.SequenceEqual(seed.Encount.Roamer.Data.ToArray()),"Read does not alter roamer memory");
            }
            seed.Encount.Roamer.Species=999;seed.Encount.Roamer.RoamStatus=(Roamer6State)9;seed.Encount.Roamer.TimesEncountered=12;
            data=seed.Write().ToArray();Check(Apply(data,new(999,9,12)).SequenceEqual(data),"Unknown original species/state/count preserved");
            Console.WriteLine($"PASS {version}: all 180 combinations, bit/byte preservation, unset/unknown values, starter suggestions, original isolation, checksums and invalid requests");
        }
        foreach(var version in new[]{"E","HG","B","OR","US","BD"})
        {
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");Reject(data,new(144,0,0));try{SaveService.ReadRoamer(data);throw new Exception("Unsupported read accepted");}catch(ArgumentException){}
        }
    }
}
