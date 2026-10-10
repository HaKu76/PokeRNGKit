// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Berry6XYPlot(int Index,ushort[] Values,string RawHex);
public sealed record Berry6XYCatalog(bool Editable,string SourceHash,int Count,Berry6XYPlot[] Plots,string RawHex);
public static partial class SaveService
{
    public static string ReadBerryField6XY(byte[] data)
    {
        if(Open(data) is not SAV6XY s)throw new ArgumentException("BerryField6XY reading requires X/Y.");
        var plots=new Berry6XYPlot[BerryField6XY.Count];
        for(int i=0;i<plots.Length;i++){
            var bytes=s.BerryField.GetPlot(i);var values=new ushort[8];
            for(int j=0;j<values.Length;j++)values[j]=BinaryPrimitives.ReadUInt16LittleEndian(bytes[(j*2)..]);
            plots[i]=new(i,values,Convert.ToHexString(bytes));
        }
        return JsonSerializer.Serialize(new Berry6XYCatalog(false,Br4Editing.Hash(data),plots.Length,plots,Convert.ToHexString(s.BerryField.Data)),SaveJsonContext.Default.Berry6XYCatalog);
    }
}
