// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class GlobalLink5EditingTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid GlobalLink5 request accepted");}catch(ArgumentException){}}
    private static SAV5 Open(byte[] bytes)=>SaveUtil.GetSaveFile(bytes.ToArray())as SAV5??throw new Exception("Gen5 fixture not recognized");
    private static Gl5Catalog Read(byte[] bytes)=>JsonSerializer.Deserialize(SaveService.ReadGlobalLink5(bytes),SaveJsonContext.Default.Gl5Catalog)!;
    private static Gl5Preview Preview(byte[] bytes,Gl5Edit edit)=>JsonSerializer.Deserialize(SaveService.PreviewGlobalLink5(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Gl5Edit)),SaveJsonContext.Default.Gl5Preview)!;
    private static byte[] Apply(byte[] bytes,Gl5Edit edit){var original=bytes.ToArray();try{var p=Preview(bytes,edit);var output=SaveService.EditGlobalLink5(bytes,JsonSerializer.Serialize(p.Request,SaveJsonContext.Default.Gl5Edit));Check(Br4Editing.Hash(output)==p.Request.TargetHash,"GlobalLink frozen complete output");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"GlobalLink complete export");return output;}finally{Check(bytes.SequenceEqual(original),"GlobalLink immutable original");}}
    private static void Compare(byte[] bytes,Gl5Edit edit,Action<GlobalLink5> update){var source=Open(bytes);update(source.GlobalLink);var expected=source.Write().ToArray();var p=Preview(bytes,edit);var output=Apply(bytes,edit);Check(expected.SequenceEqual(output),"GlobalLink independent full-file oracle, upload/reserved/footer and other areas protected");Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0,bytes.Length).Where(i=>bytes[i]!=output[i])),"GlobalLink all byte offsets and actual write checksums");}
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.B,GameVersion.W,GameVersion.B2,GameVersion.W2}){
            var s=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{(version is GameVersion.B or GameVersion.W?"B":"B2")}.sav"));s.Version=version;
            var b=s.GlobalLink;b.Data.Fill(0xA5);new byte[]{7,32,13,200}.CopyTo(b.UploadDate.Data);b.Data[0x1A3]=255;b.Data[0x1A4]=3;b.Data[0x1A5]=9;b.Data[0x1A6]=0xFD;
            for(int i=0;i<20;i++){b.SetItem(i,65535);b.SetItemQuantity(i,247);}
            for(int i=0;i<5;i++){var f=b.GetFurniture(i);f.Value=65535;f.Name=$"Old{i}";f.Data[^1]=0xA5;}
            var bytes=s.Write().ToArray();var original=bytes.ToArray();var c=Read(bytes);Check(c.Items.Length==20&&c.Furniture.Length==5&&c.Scalars.Length==6&&c.Flags.Length==4&&!c.Date.Valid&&!c.Date.Empty,"GlobalLink raw catalog inventory/date");
            Check(bytes.SequenceEqual(original)&&c.Flags[0].Raw==255&&c.Furniture[0].RawHex.EndsWith("A5"),"GlobalLink immutable read and abnormal/trash preservation");
            var allowed=new FilteredGameDataSource(Open(bytes),new GameDataSource(GameInfo.GetStrings("en"))).Items.Select(v=>v.Value).Distinct().ToArray();Check(c.Choices.Select(v=>v.Id).SequenceEqual(allowed),"GlobalLink source save-sensitive item choices");
            foreach(var field in c.Scalars)foreach(int value in new[]{field.Minimum,field.Maximum}){
                var edit=new Gl5Edit("patch",c.SourceHash,Scalars:[new(field.Id,value)]);
                Compare(bytes,edit,x=>{switch(field.Id){case "uploadCount":x.UploadCount=value;break;case "uploadStatus":x.UploadStatus=(byte)value;break;case "musical":x.Musical=(byte)value;break;case "cgear":x.CGearSkin=(byte)value;break;case "dex":x.DexSkin=(byte)value;break;case "selected":x.SelectedFurnitureIndex=(byte)value;break;}});
            }
            foreach(var field in c.Flags)foreach(bool value in new[]{false,true})Compare(bytes,new("patch",c.SourceHash,Flags:[new(field.Id,value)]),x=>{switch(field.Id){case "slot":x.IsSlotPresent=value;break;case "registered":x.IsRegistered=value;break;case "full":x.IsAccountFullAccess=value;break;case "synced":x.IsFurnitureSynchronized=value;break;}});
            foreach(int value in new[]{0,127,128,255}){
                var p=Preview(bytes,new("patch",c.SourceHash,Scalars:[new("selected",value)]));Check(p.Result.Scalars.Single(v=>v.Id=="selected").Value==(value&127)&&p.Result.Flags.Single(v=>v.Id=="synced").Value,"GlobalLink GUI 255 bound and stored low-seven bits");
            }
            foreach(var date in new[]{new DateOnly(2000,1,1),new DateOnly(2000,2,29),new DateOnly(2099,12,31)})Compare(bytes,new("patch",c.SourceHash,DateSet:true,Date:date.ToString("yyyy-MM-dd")),x=>{var d=x.UploadDate;d.FromDateOnly(date);});
            Compare(bytes,new("patch",c.SourceHash,DateSet:false),x=>{var d=x.UploadDate;d.SetEmpty();});
            foreach(int i in Enumerable.Range(0,20))foreach(int count in new[]{0,255})Compare(bytes,new("patch",c.SourceHash,Items:[new(i,Count:count)]),x=>x.SetItemQuantity(i,(byte)count));
            var zeroOrFirst=c.Choices.First().Id;
            foreach(int i in Enumerable.Range(0,20))Compare(bytes,new("patch",c.SourceHash,Items:[new(i,Id:zeroOrFirst)]),x=>x.SetItem(i,(ushort)zeroOrFirst));
            if(c.Choices.Any(v=>v.Id==0))Compare(bytes,new("patch",c.SourceHash,Items:[new(0,Id:0,Count:255)]),x=>{x.SetItem(0,0);x.SetItemQuantity(0,255);});
            foreach(int i in Enumerable.Range(0,5)){
                foreach(int value in new[]{0,65535})Compare(bytes,new("patch",c.SourceHash,Furniture:[new(i,Value:value)]),x=>{var f=x.GetFurniture(i);f.Value=(ushort)value;});
                foreach(string name in new[]{"","Name","123456789012","123456789012Extra","桌子♂♀", "A\0B",new string('A',32767)})Compare(bytes,new("patch",c.SourceHash,Furniture:[new(i,Name:name)]),x=>{var f=x.GetFurniture(i);f.Name=name;});
            }
            Compare(bytes,new("resave",c.SourceHash),x=>{var d=x.UploadDate;if(d.IsValid)d.FromDateOnly(d.ToDateOnly());else d.SetEmpty();x.IsSlotPresent=x.IsSlotPresent;x.IsRegistered=x.IsRegistered;x.IsAccountFullAccess=x.IsAccountFullAccess;x.SelectedFurnitureIndex=x.SelectedFurnitureIndex;x.IsFurnitureSynchronized=x.IsFurnitureSynchronized;for(int i=0;i<5;i++){var f=x.GetFurniture(i);var name=f.Name;f.Name=name;}});
            var patch=new Gl5Edit("patch",c.SourceHash,Items:[new(0,Count:1)]);
            foreach(var invalid in new[]{patch with{SourceHash=new string('0',64)},patch with{TargetHash=new string('0',64)},patch with{Items=[new(-1,Count:1)]},patch with{Items=[new(20,Count:1)]},patch with{Items=[new(0,Count:256)]},patch with{Items=[new(0,Id:65535)]},patch with{Items=[new(0,Count:1),new(0,Count:2)]},patch with{Furniture=[new(0,Name:new string('A',32768))]},patch with{Flags=[new("wrong",true)]},patch with{Scalars=[new("uploadStatus",256)]},patch with{Action="resave"}})Reject(()=>Preview(bytes,invalid));
            foreach(string date in new[]{"1999-12-31","2100-01-01","2001-02-29","2000-13-01","bad"})Reject(()=>Preview(bytes,new("patch",c.SourceHash,DateSet:true,Date:date)));
            Reject(()=>Preview(bytes,new("patch",c.SourceHash,DateSet:false,Date:"2000-01-01")));Reject(()=>Preview(bytes,new("patch",c.SourceHash,Date:"2000-01-01")));
            Reject(()=>SaveService.EditGlobalLink5(bytes,JsonSerializer.Serialize(patch,SaveJsonContext.Default.Gl5Edit)));
            var corrupt=bytes.ToArray();corrupt[0x100]^=1;var bad=Read(corrupt);Check(!bad.CanEdit,"GlobalLink invalid save checksum edit gate");Reject(()=>Preview(corrupt,patch with{SourceHash=bad.SourceHash}));
            Check(bytes.SequenceEqual(original),"GlobalLink all rejection paths preserve original");
            Console.WriteLine($"PASS {version}: Global Link fields/Int32 extremes, raw flags, dates, all 20 items/5 furniture, source choices/masking/truncation/resave, protected upload/padding/full output, frozen edits and rejection");
        }
        Reject(()=>SaveService.ReadGlobalLink5(File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav")));
    }
}
