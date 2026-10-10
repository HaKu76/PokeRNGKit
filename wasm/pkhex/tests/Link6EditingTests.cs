// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Link6EditingTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action a){try{a();throw new Exception("Invalid Link6 request accepted");}catch(ArgumentException){}}
    private static SAV6 Open(byte[] b)=>(SAV6)SaveUtil.GetSaveFile(b.ToArray())!;
    private static LinkBlock6 Block(SAV6 s)=>((ISaveBlock6Main)s).Link;
    private static Link6Catalog Read(byte[] b)=>JsonSerializer.Deserialize(SaveService.ReadLink6(b),SaveJsonContext.Default.Link6Catalog)!;
    private static Link6Preview Preview(byte[] b,Link6Edit e)=>JsonSerializer.Deserialize(SaveService.PreviewLink6(b,JsonSerializer.Serialize(e,SaveJsonContext.Default.Link6Edit)),SaveJsonContext.Default.Link6Preview)!;
    private static byte[] Apply(byte[] data,Link6Edit edit){var original=data.ToArray();var p=Preview(data,edit);var output=SaveService.EditLink6(data,JsonSerializer.Serialize(p.Request,SaveJsonContext.Default.Link6Edit));Check(data.SequenceEqual(original),"Link6 original immutable");Check(p.Request.TargetHash==Br4Editing.Hash(output)&&p.Result.SourceHash==p.Request.TargetHash,"Link6 complete frozen target");Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i])),"Link6 whole-file offsets");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Link6 complete export");return output;}
    private static void Compare(byte[] data,Link6Edit e,Action<SAV6> oracle){var s=Open(data);oracle(s);Check(Apply(data,e).SequenceEqual(s.Write().ToArray()),"Link6 independent whole-file oracle");}
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.X,GameVersion.Y,GameVersion.OR,GameVersion.AS}){
            var s=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{(version is GameVersion.X or GameVersion.Y?"X":"OR")}.sav"));s.Version=version;var b=Block(s);b.Data.Fill(0xA6);var gifts=b.Gifts;gifts.Flags=0xA6;gifts.Origin="Source";gifts.BattlePoints=9999;gifts.Pokemiles=65535;
            var qty=new ushort[]{0,255,256,257,32768,65535};for(int i=0;i<6;i++){BinaryPrimitives.WriteUInt16LittleEndian(gifts.Data[(0x489+i*4)..],0);BinaryPrimitives.WriteUInt16LittleEndian(gifts.Data[(0x48B+i*4)..],qty[i]);BinaryPrimitives.WriteUInt16LittleEndian(gifts.Data[(0x09D+i*0xA8+0x1A)..],(ushort)(25+i));}b.RefreshChecksum();var data=s.Write().ToArray();var original=data.ToArray();var c=Read(data);
            Check(c.CanEdit&&c.Enabled&&c.Flags==0xA6&&c.InternalChecksumValid&&c.Items.Length==6&&c.Pokemon.Length==6,"Link6 complete catalog/raw flags/checksum");for(int i=0;i<6;i++){Check(c.Items[i].Index==i&&c.Items[i].Quantity==qty[i],"Link6 source quantity UInt16 reads");Check(c.Pokemon[i].RawHex.Length==320,"Link6 all full entity spans");}
            foreach(int bp in new[]{0,9999})foreach(int miles in new[]{0,65535})Compare(data,new("patch",c.SourceHash,bp,miles),x=>{var block=Block(x);BinaryPrimitives.WriteUInt16LittleEndian(block.Data[(0x1FF+0x4A1)..],(ushort)bp);BinaryPrimitives.WriteUInt16LittleEndian(block.Data[(0x1FF+0x4A3)..],(ushort)miles);BinaryPrimitives.WriteUInt16LittleEndian(block.Data[^4..],Checksums.CRC16_CCITT(block.Data[0x200..^4]));});
            Compare(data,new("resave",c.SourceHash),x=>{var z=Block(x);var g=z.Gifts;g.Origin="Source";g.Flags=128;for(int i=0;i<6;i++)BinaryPrimitives.WriteUInt16LittleEndian(g.Data[(0x48B+i*4)..],(byte)qty[i]);z.RefreshChecksum();});
            var exported=SaveService.ExportLink6(data,JsonSerializer.Serialize(new Link6Edit("export",c.SourceHash),SaveJsonContext.Default.Link6Edit));Check(exported.Length==0xA47&&exported.SequenceEqual(Convert.FromHexString(c.RawHex)),"Link6 exact raw export without normalization");
            var imported=exported.ToArray();imported[0]=0x35;imported[1]=0;imported[^1]^=0xFF;var request=new Link6Edit("import",c.SourceHash,DataBase64:Convert.ToBase64String(imported));Compare(data,request,x=>imported.CopyTo(Block(x).Gifts.Data));var loaded=Read(Apply(data,request));Check(!loaded.Enabled&&loaded.Flags==0x35&&!loaded.InternalChecksumValid,"Link6 import preserves raw flags/inner CRC until source save");
            var disabled=Apply(data,request);Compare(disabled,new("resave",loaded.SourceHash),x=>{var z=Block(x);var g=z.Gifts;g.Origin=g.Origin;g.Enabled=false;for(int i=0;i<6;i++)BinaryPrimitives.WriteUInt16LittleEndian(g.Data[(0x48B+i*4)..],(byte)qty[i]);z.RefreshChecksum();});Reject(()=>Preview(disabled,new("patch",loaded.SourceHash,0)));Reject(()=>SaveService.ExportLink6(disabled,JsonSerializer.Serialize(new Link6Edit("export",loaded.SourceHash),SaveJsonContext.Default.Link6Edit)));
            var strange=Open(data);Block(strange).Gifts.BattlePoints=65535;var odd=strange.Write().ToArray();var oc=Read(odd);Check(oc.BattlePoints==65535,"Link6 old excessive BP is readable");Reject(()=>Preview(odd,new("resave",oc.SourceHash)));Compare(odd,new("patch",oc.SourceHash,9999),x=>{Block(x).Gifts.BattlePoints=9999;Block(x).RefreshChecksum();});
            var good=new Link6Edit("patch",c.SourceHash,1);foreach(var e in new[]{good with{BattlePoints=-1},good with{BattlePoints=10000},good with{BattlePoints=null},good with{Pokemiles=65536},good with{DataBase64=""},good with{SourceHash=new string('0',64)},good with{Action="resave"},good with{Action="import",BattlePoints=null,DataBase64=Convert.ToBase64String(new byte[2630])},good with{Action="import",BattlePoints=null,DataBase64="bad!"}})Reject(()=>Preview(data,e));Reject(()=>SaveService.EditLink6(data,JsonSerializer.Serialize(good,SaveJsonContext.Default.Link6Edit)));var frozen=Preview(data,good).Request;Reject(()=>SaveService.EditLink6(data,JsonSerializer.Serialize(frozen with{TargetHash=new string('0',64)},SaveJsonContext.Default.Link6Edit)));
            var corrupt=data.ToArray();corrupt[0x100]^=1;var bad=Read(corrupt);Check(!bad.CanEdit,"Link6 outer checksum gate");Reject(()=>Preview(corrupt,good with{SourceHash=bad.SourceHash}));Check(data.SequenceEqual(original),"Link6 read/export/rejections preserve original");
            Console.WriteLine($"PASS {version}: six item/entity addresses, enabled gating, BP/miles limits, byte quantity source resave, exact pl6 import/export and inner/outer CRC timing, protected bytes, whole-file frozen oracles and atomic rejection");
        }
        Reject(()=>SaveService.ReadLink6(File.ReadAllBytes(".tmp/pkhex-fixtures/B2.sav")));
    }
}
