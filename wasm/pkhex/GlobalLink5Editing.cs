// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record Gl5Scalar(string Id, LocalizedText Name, int Value, int Minimum, int Maximum);
public sealed record Gl5Flag(string Id, LocalizedText Name, bool Value, int Raw);
public sealed record Gl5Date(bool Empty, bool Valid, string? Value, string RawHex);
public sealed record Gl5Item(int Index, int Id, int Count, LocalizedText Name, string Sprite);
public sealed record Gl5Furniture(int Index, int Value, string Name, string RawHex);
public sealed record Gl5Catalog(bool CanEdit, string SourceHash, Gl5Scalar[] Scalars, Gl5Flag[] Flags,
    Gl5Date Date, Gl5Item[] Items, OriginChoice[] Choices, Gl5Furniture[] Furniture, string RawHex);
public sealed record Gl5ScalarEdit(string Id, int? Value);
public sealed record Gl5FlagEdit(string Id, bool? Value);
public sealed record Gl5ItemEdit(int? Index, int? Id = null, int? Count = null);
public sealed record Gl5FurnitureEdit(int? Index, int? Value = null, string? Name = null);
public sealed record Gl5Edit(string Action, string? SourceHash, Gl5ScalarEdit[]? Scalars = null,
    Gl5FlagEdit[]? Flags = null, bool? DateSet = null, string? Date = null,
    Gl5ItemEdit[]? Items = null, Gl5FurnitureEdit[]? Furniture = null, string? TargetHash = null);
public sealed record Gl5Preview(Gl5Edit Request, Gl5Catalog Result, int[] ChangedOffsets);
internal static class GlobalLink5Editing
{
    private static SAV5 Save(SaveFile s) => s is SAV5BW or SAV5B2W2 ? (SAV5)s : throw new ArgumentException("GlobalLink5 tools are unavailable for this format.");
    private static readonly string[] ScalarIds = ["uploadCount", "uploadStatus", "musical", "cgear", "dex", "selected"];
    private static readonly LocalizedText[] ScalarNames = [new("上传次数","Upload Count","アップロード回数"),new("上传状态","Upload Status","アップロード状態"),new("音乐剧","Musical","ミュージカル"),new("C装置皮肤","CGear Skin","Cギアスキン"),new("图鉴皮肤","Pokédex Skin","ポケモンずかんスキン"),new("已选中","Selected","選択中")];
    private static readonly string[] FlagIds = ["slot", "registered", "full", "synced"];
    private static readonly LocalizedText[] FlagNames = [new("上传槽位使用中","Upload Slot Tucked In","アップロードスロット使用中"),new("已注册游戏卡","Game Card Registered","ゲームカード登録済み"),new("完全访问","Full Access","全機能利用可"),new("已同步","Synchronized","同期済み")];
    private static int Scalar(GlobalLink5 b, string id) => id switch { "uploadCount"=>b.UploadCount,"uploadStatus"=>b.UploadStatus,"musical"=>b.Musical,"cgear"=>b.CGearSkin,"dex"=>b.DexSkin,"selected"=>b.SelectedFurnitureIndex,_=>throw new ArgumentException("Invalid GlobalLink5 scalar.") };
    private static void SetScalar(GlobalLink5 b, string id, int v) { switch(id){case "uploadCount":b.UploadCount=v;break;case "uploadStatus":b.UploadStatus=(byte)v;break;case "musical":b.Musical=(byte)v;break;case "cgear":b.CGearSkin=(byte)v;break;case "dex":b.DexSkin=(byte)v;break;case "selected":b.SelectedFurnitureIndex=(byte)v;break;default:throw new ArgumentException("Invalid GlobalLink5 scalar.");} }
    private static bool Flag(GlobalLink5 b,string id)=>id switch{"slot"=>b.IsSlotPresent,"registered"=>b.IsRegistered,"full"=>b.IsAccountFullAccess,"synced"=>b.IsFurnitureSynchronized,_=>throw new ArgumentException("Invalid GlobalLink5 flag.")};
    private static void SetFlag(GlobalLink5 b,string id,bool v){switch(id){case "slot":b.IsSlotPresent=v;break;case "registered":b.IsRegistered=v;break;case "full":b.IsAccountFullAccess=v;break;case "synced":b.IsFurnitureSynchronized=v;break;default:throw new ArgumentException("Invalid GlobalLink5 flag.");}}
    private static int RawFlag(GlobalLink5 b,string id)=>id switch{"slot"=>b.Data[0x1A3],"registered"=>b.Data[0x1A4],"full"=>b.Data[0x1A5],_=>b.Data[0x1A6]};
    private static LocalizedText ItemName(SAV5 s,int id)
    {
        string Get(string lang){var names=GameInfo.GetStrings(lang).GetItemStrings(s.Context,s.Version);return id>=0&&id<names.Length?names[id]:"";}
        return new(Get("zh-Hans"),Get("en"),Get("ja"));
    }
    private static int[] ChoiceIds(SAV5 s)=>new FilteredGameDataSource(s,new GameDataSource(GameInfo.GetStrings("en"))).Items.Select(i=>i.Value).Distinct().ToArray();
    internal static Gl5Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var b=s.GlobalLink;var date=b.UploadDate;
        var scalars=ScalarIds.Select((id,i)=>new Gl5Scalar(id,ScalarNames[i],Scalar(b,id),id=="uploadCount"?int.MinValue:0,id=="uploadCount"?int.MaxValue:255)).ToArray();
        var flags=FlagIds.Select((id,i)=>new Gl5Flag(id,FlagNames[i],Flag(b,id),RawFlag(b,id))).ToArray();
        var items=Enumerable.Range(0,20).Select(i=>new Gl5Item(i,b.GetItem(i),b.GetItemQuantity(i),ItemName(s,b.GetItem(i)),InventoryReader.Sprite(b.GetItem(i),s.Context))).ToArray();
        var furniture=Enumerable.Range(0,5).Select(i=>{var f=b.GetFurniture(i);return new Gl5Furniture(i,f.Value,f.Name,Convert.ToHexString(f.Data));}).ToArray();
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,scalars,flags,new(date.IsEmpty,date.IsValid,date.IsValid?date.ToDateOnly().ToString("yyyy-MM-dd",CultureInfo.InvariantCulture):null,Convert.ToHexString(date.Data)),items,ChoiceIds(s).Select(id=>new OriginChoice(id,ItemName(s,id))).ToArray(),furniture,Convert.ToHexString(b.Data));
    }
    private static DateOnly Date(string? value)
    {
        if(value is null||!DateOnly.TryParseExact(value,"yyyy-MM-dd",CultureInfo.InvariantCulture,DateTimeStyles.None,out var date)||date.Year is <2000 or >2099)throw new ArgumentException("Invalid GlobalLink5 date.");return date;
    }
    internal static byte[] Prepare(SaveFile save,Gl5Edit edit,string hash,int sourceLength)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("GlobalLink5 editing requires valid checksums.");
        if(edit.SourceHash!=hash||edit.SourceHash?.Length!=64)throw new ArgumentException("GlobalLink5 preview is stale. Read it again.");
        var copy=(SAV5)s.Clone();var b=copy.GlobalLink;
        if(edit.Action=="resave"){
            if(edit.Scalars is not null||edit.Flags is not null||edit.DateSet is not null||edit.Date is not null||edit.Items is not null||edit.Furniture is not null)throw new ArgumentException("Invalid GlobalLink5 resave fields.");
            var date=b.UploadDate;if(date.IsValid)date.FromDateOnly(date.ToDateOnly());else date.SetEmpty();
            foreach(string id in ScalarIds)SetScalar(b,id,Scalar(b,id));foreach(string id in FlagIds)SetFlag(b,id,Flag(b,id));
            for(int i=0;i<5;i++){var f=b.GetFurniture(i);var name=f.Name;f.Name=name;}
        }else if(edit.Action=="patch"){
            if(edit.Scalars is null&&edit.Flags is null&&edit.DateSet is null&&edit.Items is null&&edit.Furniture is null)throw new ArgumentException("Empty GlobalLink5 patch.");
            if(edit.Scalars is {} scalars){if(scalars.Length is 0 or >6||scalars.Any(v=>v is null||!ScalarIds.Contains(v.Id)||v.Value is null||v.Id!="uploadCount"&&(v.Value<0||v.Value>255))||scalars.Select(v=>v.Id).Distinct().Count()!=scalars.Length)throw new ArgumentException("Invalid GlobalLink5 scalar fields.");foreach(var v in scalars)SetScalar(b,v.Id,v.Value!.Value);}
            if(edit.Flags is {} flags){if(flags.Length is 0 or >4||flags.Any(v=>v is null||!FlagIds.Contains(v.Id)||v.Value is null)||flags.Select(v=>v.Id).Distinct().Count()!=flags.Length)throw new ArgumentException("Invalid GlobalLink5 flag fields.");foreach(var v in flags)SetFlag(b,v.Id,v.Value!.Value);}
            if(edit.DateSet is true){var date=b.UploadDate;date.FromDateOnly(Date(edit.Date));}else if(edit.DateSet is false){if(edit.Date is not null)throw new ArgumentException("Invalid GlobalLink5 clear date fields.");var date=b.UploadDate;date.SetEmpty();}else if(edit.Date is not null)throw new ArgumentException("Missing GlobalLink5 date state.");
            if(edit.Items is {} items){
                var allowed=ChoiceIds(s);if(items.Length is 0 or >20||items.Any(v=>v is null||v.Index is null or <0 or >=20||v.Id is null&&v.Count is null||v.Id is {} id&&!allowed.Contains(id)||v.Count is <0 or >255)||items.Select(v=>v.Index).Distinct().Count()!=items.Length)throw new ArgumentException("Invalid GlobalLink5 item fields.");
                foreach(var v in items){int i=v.Index!.Value;if(v.Id is {} id)b.SetItem(i,(ushort)id);if(v.Count is {} count)b.SetItemQuantity(i,(byte)count);}
            }
            if(edit.Furniture is {} furniture){
                if(furniture.Length is 0 or >5||furniture.Any(v=>v is null||v.Index is null or <0 or >=5||v.Value is null&&v.Name is null||v.Value is <0 or >65535||v.Name?.Length>32767)||furniture.Select(v=>v.Index).Distinct().Count()!=furniture.Length)throw new ArgumentException("Invalid GlobalLink5 furniture fields.");
                foreach(var v in furniture){var f=b.GetFurniture(v.Index!.Value);if(v.Value is {} value)f.Value=(ushort)value;if(v.Name is {} name)f.Name=name;}
            }
        }else throw new ArgumentException("Invalid GlobalLink5 action.");
        var expected=b.Data.ToArray();var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray())as SAV5;
        if(check is null||check.GetType()!=copy.GetType()||check.Version!=copy.Version||output.Length!=sourceLength||!SaveChecksums.Valid(check)||!check.GlobalLink.Data.SequenceEqual(expected))throw new InvalidOperationException("GlobalLink5 export verification failed.");
        if(edit.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("GlobalLink5 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Gl5Edit ParseGlobalLink5(string json)=>json.Length>1100000?throw new ArgumentException("GlobalLink5 request is too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Gl5Edit)??throw new ArgumentException("Missing GlobalLink5 edit.");
    public static string ReadGlobalLink5(byte[] data)=>JsonSerializer.Serialize(GlobalLink5Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Gl5Catalog);
    public static string PreviewGlobalLink5(byte[] data,string json){var edit=ParseGlobalLink5(json);var output=GlobalLink5Editing.Prepare(Open(data),edit,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Gl5Preview(edit with{TargetHash=hash},GlobalLink5Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Gl5Preview);}
    public static byte[] EditGlobalLink5(byte[] data,string json){var edit=ParseGlobalLink5(json);if(edit.TargetHash?.Length!=64)throw new ArgumentException("GlobalLink5 editing requires a frozen preview.");return GlobalLink5Editing.Prepare(Open(data),edit,Br4Editing.Hash(data),data.Length);}
}
