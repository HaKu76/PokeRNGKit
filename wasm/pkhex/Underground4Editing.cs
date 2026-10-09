// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using PKHeX.Core;
using static System.Buffers.Binary.BinaryPrimitives;
namespace PokeRNGKit.SaveEditor;
public sealed record Ug4Stat(int Id,LocalizedText Name,uint Value);
public sealed record Ug4Slot(int Id,int Item,int? Size);
public sealed record Ug4Pouch(string Kind,LocalizedText Name,Ug4Slot[] Slots,OriginChoice[] Choices);
public sealed record Ug4Catalog(bool CanEdit,string SourceHash,Ug4Stat[] Stats,Ug4Pouch[] Pouches);
public sealed record Ug4StatEdit(int? Id,uint? Value);
public sealed record Ug4SlotEdit(int? Id,int? Item=null,string? SizeText=null);
public sealed record Ug4Edit(string Action,string? SourceHash,string? Language,Ug4StatEdit[]? Stats=null,string? Kind=null,Ug4SlotEdit[]? Slots=null,string? TargetHash=null);
public sealed record Ug4Preview(Ug4Edit Request,Ug4Stat[] Stats,Ug4Pouch[] Pouches,int[] Changed,string BeforeHex,string AfterHex);
internal static class Underground4Editing
{
    private static readonly int[] StatOffsets=[0,4,8,0xC,0x10,0x18,0x1C,0x20,0x24,0x28,0x2C,0x30,0x34];
    private static readonly LocalizedText[] StatNames=[new("遇见玩家","Players met","出会ったプレイヤー"),new("赠予的礼物","Gifts given","贈ったプレゼント"),new("获得的旗子","Flags obtained","入手した旗"),new("获得的玉","Spheres obtained","入手したタマ"),new("获得的化石","Fossils obtained","入手した化石"),new("陷阱命中（玩家）","Players trapped","他のプレイヤーへのトラップ"),new("触发陷阱次数","Traps triggered","トラップ発動回数"),new("帮助他人次数","Times helped others","他の人を助けた回数"),new("获得的礼物","Gifts received","受け取ったプレゼント"),new("自己旗子被夺取","My flag taken","自分の旗を取られた回数"),new("恢复的旗子","My flag recovered","自分の旗を取り戻した回数"),new("搬动基地次数","Base moved","基地の移動回数"),new("夺取旗子","Flags captured","奪った旗")];
    private static readonly string[] Kinds=["goods","spheres","traps","treasures"];
    private static readonly LocalizedText[] PouchNames=[new("家具","Goods","グッズ"),new("玉","Spheres","タマ"),new("陷阱","Traps","トラップ"),new("宝物","Treasures","お宝")];
    private static SAV4Sinnoh Save(SaveFile s)=>s is SAV4DP or SAV4Pt?(SAV4Sinnoh)s:throw new ArgumentException("Underground4 tools are unavailable for this format.");
    private static int StatBase(SAV4Sinnoh s)=>s is SAV4DP?0x3A2C:0x3CB4;
    private static Span<byte> Pouch(SAV4Sinnoh s,string kind)=>kind switch{"goods"=>s.GetUGI_Goods(),"spheres"=>s.GetUGI_Spheres(),"traps"=>s.GetUGI_Traps(),"treasures"=>s.GetUGI_Treasures(),_=>throw new ArgumentException("Invalid Underground4 pouch.")};
    private static string[] Names(GameStrings s,string kind)=>kind switch{"goods"=>s.uggoods,"spheres"=>s.ugspheres,"traps"=>s.ugtraps,"treasures"=>s.ugtreasures,_=>throw new ArgumentException("Invalid Underground4 pouch.")};
    private static GameStrings Language(string? language)=>GameInfo.GetStrings(language switch{"zh"=>"zh-Hans","en"=>"en","ja"=>"ja",_=>throw new ArgumentException("Invalid Underground4 language.")});
    private static OriginChoice[] Choices(string kind)
    {
        var z=Names(GameInfo.GetStrings("zh-Hans"),kind);var e=Names(GameInfo.GetStrings("en"),kind);var j=Names(GameInfo.GetStrings("ja"),kind);int count=Math.Min(256,Math.Max(z.Length,Math.Max(e.Length,j.Length)));return Enumerable.Range(0,count).Select(id=>new OriginChoice(id,new(id<z.Length?z[id]:"",id<e.Length?e[id]:"",id<j.Length?j[id]:""))).ToArray();
    }
    internal static Ug4Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var stats=Enumerable.Range(0,13).Select(id=>new Ug4Stat(id,StatNames[id],ReadUInt32LittleEndian(s.General[(StatBase(s)+StatOffsets[id])..]))).ToArray();var pouches=Kinds.Select((kind,index)=>{var raw=Pouch(s,kind).ToArray();return new Ug4Pouch(kind,PouchNames[index],Enumerable.Range(0,40).Select(id=>new Ug4Slot(id,raw[id],kind=="spheres"?(int?)raw[id+40]:null)).ToArray(),Choices(kind));}).ToArray();return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,stats,pouches);
    }
    private static void ResavePouch(SAV4Sinnoh s,string kind,GameStrings language)
    {
        var names=Names(language,kind);var source=Pouch(s,kind).ToArray();var destination=Pouch(s,kind);destination.Clear();int next=0;for(int i=0;i<40;i++){int id=source[i];if(id>=names.Length)id=0;int mapped=Array.IndexOf(names,names[id]);if(mapped<=0)continue;destination[next]=(byte)mapped;if(kind=="spheres")destination[next+40]=source[i+40];next++;}
    }
    internal static SAV4Sinnoh Prepare(SaveFile save,Ug4Edit edit,string hash)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("Underground4 editing requires valid checksums.");if(edit.SourceHash!=hash||edit.SourceHash?.Length!=64)throw new ArgumentException("Underground4 preview is stale. Read it again.");var language=Language(edit.Language);var copy=(SAV4Sinnoh)s.Clone();
        switch(edit.Action)
        {
            case "stats":
                if(edit.Kind is not null||edit.Slots is not null||edit.Stats is not {} stats||stats.Length is 0 or >13||stats.Any(v=>v is null||v.Id is null or <0 or >=13||v.Value is null or >999999)||stats.Select(v=>v.Id).Distinct().Count()!=stats.Length)throw new ArgumentException("Invalid Underground4 score fields.");foreach(var value in stats)WriteUInt32LittleEndian(copy.General[(StatBase(copy)+StatOffsets[value.Id!.Value])..],value.Value!.Value);break;
            case "pouch":
                if(edit.Stats is not null||edit.Kind is null||!Kinds.Contains(edit.Kind)||edit.Slots is not {} slots||slots.Length is 0 or >40||slots.Any(v=>v is null||v.Id is null or <0 or >=40)||slots.Select(v=>v.Id).Distinct().Count()!=slots.Length)throw new ArgumentException("Invalid Underground4 slot fields.");
                var names=Names(language,edit.Kind);var original=Pouch(s,edit.Kind).ToArray();foreach(var value in slots){if(value.Item is null&&value.SizeText is null||value.Item is {} item&&(item<0||item>=names.Length||item>255||item!=0&&edit.Kind!="spheres"&&string.IsNullOrEmpty(names[item]))||value.SizeText is {} text&&(edit.Kind!="spheres"||text.Length>2&&text!=original[value.Id!.Value+40].ToString(CultureInfo.InvariantCulture)))throw new ArgumentException("Invalid Underground4 item or sphere size.");}
                var raw=Pouch(copy,edit.Kind);foreach(var value in slots){int id=value.Id!.Value;if(value.Item is {} item)raw[id]=(byte)item;if(value.SizeText is {} text){if(int.TryParse(text,NumberStyles.Integer,CultureInfo.InvariantCulture,out int size)){raw[id+40]=unchecked((byte)size);}else{raw[id]=0;raw[id+40]=0;}}}break;
            case "resavePouch":
                if(edit.Stats is not null||edit.Slots is not null||edit.Kind is null||!Kinds.Contains(edit.Kind))throw new ArgumentException("Invalid Underground4 resave fields.");ResavePouch(copy,edit.Kind,language);break;
            case "resave":
                if(edit.Stats is not null||edit.Slots is not null||edit.Kind is not null)throw new ArgumentException("Invalid Underground4 resave fields.");for(int id=0;id<13;id++){int at=StatBase(copy)+StatOffsets[id];WriteUInt32LittleEndian(copy.General[at..],Math.Min(ReadUInt32LittleEndian(copy.General[at..]),999999u));}foreach(string kind in Kinds)ResavePouch(copy,kind,language);break;
            default:throw new ArgumentException("Invalid Underground4 action.");
        }
        copy.State.Edited=true;if(edit.TargetHash is {} target&&target!=Br4Editing.Hash(Snapshot(copy)))throw new ArgumentException("Underground4 preview target is stale.");return copy;
    }
    internal static byte[] Snapshot(SaveFile save){var s=Save(save);return s.General.Slice(StatBase(s),0x38).ToArray().Concat(s.GetUGI_Traps().ToArray()).Concat(s.GetUGI_Goods().ToArray()).Concat(s.GetUGI_Treasures().ToArray()).Concat(s.GetUGI_Spheres().ToArray()).ToArray();}
    internal static Ug4Preview Preview(SaveFile save,Ug4Edit edit,string hash){var s=Save(save);var copy=Prepare(s,edit,hash);var before=Snapshot(s);var after=Snapshot(copy);var c=Read(copy,hash);return new(edit with{TargetHash=Br4Editing.Hash(after)},c.Stats,c.Pouches,Enumerable.Range(0,before.Length).Where(i=>before[i]!=after[i]).ToArray(),Convert.ToHexString(before),Convert.ToHexString(after));}
}
public static partial class SaveService
{
    private static Ug4Edit ParseUnderground4(string json){if(json.Length>32768)throw new ArgumentException("Underground4 request is too large.");return JsonSerializer.Deserialize(json,SaveJsonContext.Default.Ug4Edit)??throw new ArgumentException("Missing Underground4 edit.");}
    public static string ReadUnderground4(byte[] data)=>JsonSerializer.Serialize(Underground4Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Ug4Catalog);
    public static string PreviewUnderground4(byte[] data,string json)=>JsonSerializer.Serialize(Underground4Editing.Preview(Open(data),ParseUnderground4(json),Br4Editing.Hash(data)),SaveJsonContext.Default.Ug4Preview);
    public static byte[] EditUnderground4(byte[] data,string json){var edit=ParseUnderground4(json);if(edit.TargetHash?.Length!=64)throw new ArgumentException("Underground4 editing requires a frozen preview.");var copy=Underground4Editing.Prepare(Open(data),edit,Br4Editing.Hash(data));var expected=Underground4Editing.Snapshot(copy);var output=copy.Write().ToArray();var check=Open(output);if(output.Length!=data.Length||check.GetType()!=copy.GetType()||check.Version!=copy.Version||!SaveChecksums.Valid(check)||!expected.SequenceEqual(Underground4Editing.Snapshot(check)))throw new InvalidOperationException("Underground4 export verification failed.");return output;}
}
