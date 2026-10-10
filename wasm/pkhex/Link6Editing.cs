// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;
public sealed record Link6Item(int Index,int Item,int Quantity,LocalizedText Name,string Sprite);
public sealed record Link6Pokemon(int Index,int Species,int Form,int Gender,LocalizedText Name,string Sprite,string RawHex);
public sealed record Link6Catalog(bool CanEdit,string SourceHash,bool Enabled,int Flags,string Origin,int BattlePoints,int Pokemiles,bool InternalChecksumValid,int StoredChecksum,int CalculatedChecksum,Link6Item[] Items,Link6Pokemon[] Pokemon,string RawHex,string BlockHex);
public sealed record Link6Edit(string Action,string? SourceHash,int? BattlePoints=null,int? Pokemiles=null,string? DataBase64=null,string? TargetHash=null);
public sealed record Link6Preview(Link6Edit Request,Link6Catalog Result,int[] ChangedOffsets);
internal static class Link6Editing
{
    private static SAV6 Save(SaveFile save)=>save is SAV6XY or SAV6AO?(SAV6)save:throw new ArgumentException("Link6 tools require X/Y or ORAS.");
    internal static LinkBlock6 Block(SAV6 s)=>((ISaveBlock6Main)s).Link;
    internal static int Calculated(LinkBlock6 block)=>Checksums.CRC16_CCITT(block.Data[0x200..^4]);
    private static LocalizedText Name(int id,bool species){string Get(string lang){var list=species?GameInfo.GetStrings(lang).specieslist:GameInfo.GetStrings(lang).itemlist;return id>=0&&id<list.Length?list[id]:id.ToString();}return new(Get("zh-Hans"),Get("en"),Get("ja"));}
    internal static Link6Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var b=Block(s);var gifts=b.Gifts;var items=new Link6Item[6];var pokemon=new Link6Pokemon[6];
        for(int i=0;i<6;i++){int offset=0x489+i*4,item=BinaryPrimitives.ReadUInt16LittleEndian(gifts.Data[offset..]),quantity=BinaryPrimitives.ReadUInt16LittleEndian(gifts.Data[(offset+2)..]);items[i]=new(i,item,quantity,Name(item,false),$"bitem_{item}");var p=new LinkEntity6(b.PL6.Slice(0x09D+i*0xA8,0xA0));pokemon[i]=new(i,p.Species,p.Form,p.Gender,Name(p.Species,true),"b"+SpriteName.GetResourceStringSprite(p.Species,p.Form,(byte)Math.Min(p.Gender,(byte)2),0,s.Context),Convert.ToHexString(p.Data));}
        int crc=Calculated(b);return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,gifts.Enabled,gifts.Flags,gifts.Origin,gifts.BattlePoints,gifts.Pokemiles,b.Checksum==crc,b.Checksum,crc,items,pokemon,Convert.ToHexString(gifts.Data),Convert.ToHexString(b.Data));
    }
    private static void Resave(SAV6 s)
    {
        var b=Block(s);var gifts=b.Gifts;if(gifts.BattlePoints>9999)throw new ArgumentException("Link6 source BP is above the readable window limit.");
        string origin=gifts.Origin;bool enabled=gifts.Enabled;var ids=HallOfFame6Editing.Choices(s).Items.Select(v=>v.Id).ToHashSet();var items=new ushort[6];var quantities=new byte[6];
        for(int i=0;i<6;i++){int offset=0x489+i*4;ushort value=BinaryPrimitives.ReadUInt16LittleEndian(gifts.Data[offset..]);items[i]=ids.Contains(value)?value:ushort.MaxValue;quantities[i]=(byte)BinaryPrimitives.ReadUInt16LittleEndian(gifts.Data[(offset+2)..]);}
        gifts.Origin=origin;gifts.Enabled=enabled;
        for(int i=0;i<6;i++){int offset=0x489+i*4;BinaryPrimitives.WriteUInt16LittleEndian(gifts.Data[offset..],items[i]);BinaryPrimitives.WriteUInt16LittleEndian(gifts.Data[(offset+2)..],quantities[i]);}
        b.RefreshChecksum();
    }
    internal static byte[] Prepare(SaveFile save,Link6Edit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Link6 editing requires valid save checksums.");if(e.SourceHash!=hash||e.SourceHash?.Length!=64)throw new ArgumentException("Link6 preview is stale.");var copy=(SAV6)s.Clone();var b=Block(copy);var gifts=b.Gifts;
        switch(e.Action){
            case "patch":if(!gifts.Enabled||e.DataBase64 is not null||e.BattlePoints is null&&e.Pokemiles is null||e.BattlePoints is <0 or >9999||e.Pokemiles is <0 or >65535)throw new ArgumentException("Invalid Link6 editable fields.");if(e.BattlePoints is {} bp)gifts.BattlePoints=(ushort)bp;if(e.Pokemiles is {} miles)gifts.Pokemiles=(ushort)miles;b.RefreshChecksum();break;
            case "resave":if(e.BattlePoints is not null||e.Pokemiles is not null||e.DataBase64 is not null)throw new ArgumentException("Invalid Link6 resave fields.");Resave(copy);break;
            case "import":if(e.BattlePoints is not null||e.Pokemiles is not null||e.DataBase64 is null||e.DataBase64.Length>3508)throw new ArgumentException("Invalid Link6 import fields.");byte[] bytes;try{bytes=Convert.FromBase64String(e.DataBase64);}catch(FormatException){throw new ArgumentException("Invalid Link6 import data.");}if(bytes.Length!=PL6.Size)throw new ArgumentException("Invalid Link6 pl6 size.");bytes.CopyTo(gifts.Data);break;
            default:throw new ArgumentException("Invalid Link6 action.");
        }
        var expected=b.Data.ToArray();var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray())as SAV6;
        if(check is null||check.GetType()!=copy.GetType()||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!Block(check).Data.SequenceEqual(expected))throw new InvalidOperationException("Link6 export verification failed.");if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("Link6 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Link6Edit ParseLink6(string json)=>json.Length>20000?throw new ArgumentException("Link6 request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Link6Edit)??throw new ArgumentException("Missing Link6 edit.");
    public static string ReadLink6(byte[] data)=>JsonSerializer.Serialize(Link6Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Link6Catalog);
    public static string PreviewLink6(byte[] data,string json){var e=ParseLink6(json);var output=Link6Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Link6Preview(e with{TargetHash=hash},Link6Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Link6Preview);}
    public static byte[] EditLink6(byte[] data,string json){var e=ParseLink6(json);if(e.TargetHash?.Length!=64)throw new ArgumentException("Link6 requires a frozen preview.");return Link6Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
    public static byte[] ExportLink6(byte[] data,string json){var e=ParseLink6(json);if(e.Action!="export"||e.BattlePoints is not null||e.Pokemiles is not null||e.DataBase64 is not null||e.TargetHash is not null)throw new ArgumentException("Invalid Link6 export fields.");if(e.SourceHash!=Br4Editing.Hash(data))throw new ArgumentException("Link6 export is stale.");if(Open(data) is not SAV6XY and not SAV6AO)throw new ArgumentException("Link6 requires X/Y or ORAS.");var b=Link6Editing.Block((SAV6)Open(data));if(!b.Gifts.Enabled)throw new ArgumentException("Link6 export is disabled by the source window.");return b.Gifts.Data.ToArray();}
}
