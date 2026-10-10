// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class BerryField6XYReadingTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.X,GameVersion.Y}){
            var save=(SAV6XY)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav"))!;save.Version=version;save.BerryField.Data.Fill(0xA6);
            var values=new ushort[]{0,1,255,256,32767,32768,65534,65535};
            for(int index=0;index<32;index++)for(int column=0;column<8;column++)BinaryPrimitives.WriteUInt16LittleEndian(save.BerryField.Data[(12+index*16+column*2)..],values[(index+column)%8]);
            var data=save.Write().ToArray();var original=data.ToArray();var c=JsonSerializer.Deserialize(SaveService.ReadBerryField6XY(data),SaveJsonContext.Default.Berry6XYCatalog)!;
            Check(!c.Editable&&c.Count==32&&c.Plots.Length==32,"XY source read-only plot count");Check(c.SourceHash==Br4Editing.Hash(original)&&data.SequenceEqual(original),"XY immutable read and full source hash");
            var block=original.AsSpan(0x1B800,0x390);Check(Convert.FromHexString(c.RawHex).AsSpan().SequenceEqual(block),"XY complete block includes protected header/tail");
            for(int i=0;i<32;i++){var plot=c.Plots[i];Check(plot.Index==i&&plot.Values.Length==8,"XY stable physical index");for(int j=0;j<8;j++)Check(plot.Values[j]==BinaryPrimitives.ReadUInt16LittleEndian(original.AsSpan(0x1B80C+i*16+j*2)),"XY independent eight UInt16 addresses");Check(Convert.FromHexString(plot.RawHex).AsSpan().SequenceEqual(block.Slice(12+i*16,16)),"XY exact raw plot bytes");}
            Check(SaveService.ExportWorkingCopy(data).SequenceEqual(original),"XY reading retains complete save export");
            Console.WriteLine($"PASS {version}: all 32 source plots/256 UInt16 offsets and boundary values, header/tail/raw data, immutable source hash and complete export");
        }
        foreach(string format in new[]{"OR","B2"}){try{SaveService.ReadBerryField6XY(File.ReadAllBytes($".tmp/pkhex-fixtures/{format}.sav"));throw new Exception("Unsupported BerryField6XY format accepted");}catch(ArgumentException){}}
    }
}
