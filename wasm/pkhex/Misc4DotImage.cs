// SPDX-License-Identifier: GPL-3.0-or-later
// Adapted from PKHeX.WinForms PoketchDotMatrix. Image decoding stays in the local browser.
namespace PokeRNGKit.SaveEditor;
internal static class Misc4DotImage
{
    internal static void Build(int[] rgb,byte[] destination)
    {
        byte[] brightMap=new byte[480],counts=new byte[256];for(int i=0;i<480;i++){int max=Math.Max(rgb[i*3],Math.Max(rgb[i*3+1],rgb[i*3+2])),min=Math.Min(rgb[i*3],Math.Min(rgb[i*3+1],rgb[i*3+2]));byte brightness=(byte)(255*((max+min)/510f));brightMap[i]=brightness;counts[brightness]=unchecked((byte)(counts[brightness]+1));}
        int colorCount=counts.Count(v=>v!=0);if(colorCount<1||colorCount>4)throw new ArgumentException("Misc4 image requires one to four brightness values.");
        // The upstream iterator visits only the initial mapping; preserve that mapping and its byte histogram behavior.
        byte[] mapping=new byte[256];int index=0;for(int i=0;i<256;i++)if(counts[i]!=0)mapping[i]=(byte)(colorCount-index++-1);
        for(int i=0;i<480;i++)destination[i/4]|=(byte)((mapping[brightMap[i]]&3)<<(2*(i%4)));
    }
}
