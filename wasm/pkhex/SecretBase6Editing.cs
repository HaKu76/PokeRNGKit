// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
public sealed record Sb6Value(string Id,string? Value);
public sealed record Sb6Placement(int Index,int Good,int X,int Y,int Rotation,int Param1,int Param2,string RawHex);
public sealed record Sb6Base(int Index,bool Self,bool IsEmpty,bool IsDummiedLocation,string Name,Sb6Field[] Properties,Sb6Placement[] Placements,Sb6Pokemon[] Pokemon,string RawHex);
public sealed record Sb6Stock(int Index,int Count,bool IsNew,string RawHex);
public sealed record Sb6Catalog(bool CanEdit,string SourceHash,int CapturedRecord,uint RawCapturedRecord,Sb6Base[] Bases,Sb6Stock[] Stock,OriginChoice[] Species,OriginChoice[] Items,OriginChoice[] Moves,OriginChoice[] Balls,OriginChoice[] Natures,Sb6SpeciesInfo[] SpeciesInfo,string RawHex);
public sealed record Sb6Edit(string Action,string? SourceHash,int? Base=null,int? Placement=null,int? Member=null,Sb6Value[]? Fields=null,string? CapturedRecord=null,string? DataBase64=null,string? TargetHash=null);
public sealed record Sb6Preview(Sb6Edit Request,Sb6Catalog Result,int[] ChangedOffsets);
internal static class SecretBase6Editing
{
    private static SAV6AO Save(SaveFile s)=>s as SAV6AO??throw new ArgumentException("SecretBase6 tools require ORAS.");
    internal static SecretBase6 Target(SAV6AO s,int? index){if(index is null or <0 or >30)throw new ArgumentException("Invalid SecretBase6 base slot.");return index==0?s.SecretBase.GetSecretBaseSelf():s.SecretBase.GetSecretBaseOther(index.Value-1);}
    internal static Sb6Catalog Read(SaveFile save,string hash)
    {
        var s=Save(save);var block=s.SecretBase;var bases=new Sb6Base[31];
        for(int i=0;i<31;i++){var b=Target(s,i);var placements=new Sb6Placement[28];for(int n=0;n<28;n++){var p=b.GetPlacement(n);placements[n]=new(n,p.Good,p.X,p.Y,p.Rotation,p.Param1,p.Param2,Convert.ToHexString(b.Data.Slice(4+n*12,12)));}var pokemon=b is SecretBase6Other o?Enumerable.Range(0,3).Select(n=>SecretBase6Pokemon.Read(s,o.GetParticipant(n),n)).ToArray():[];bases[i]=new(i,i==0,b.IsEmpty,b.IsDummiedBaseLocation,b.TrainerName,SecretBase6Fields.Definitions(b).Select(x=>x.Field).ToArray(),placements,pokemon,Convert.ToHexString(b.Data));}
        var stock=Enumerable.Range(0,200).Select(i=>{var g=block.GetGood(i);return new Sb6Stock(i,g.Count,g.IsNew,Convert.ToHexString(block.Data.Slice(i*4,4)));}).ToArray();var c=HallOfFame6Editing.Choices(s);var e=SecretBase6Pokemon.ExtraChoices(s);int record=s.Records.GetRecord(80);
        return new(s.State.Exportable&&SaveChecksums.Valid(s),hash,record,unchecked((uint)record),bases,stock,c.Species,c.Items,c.Moves,e.Balls,e.Natures,SecretBase6Pokemon.Info(s),Convert.ToHexString(block.Data));
    }
    private static Sb6Value[] Fields(Sb6Edit e){if(e.Fields is not{Length:>0 and <=40} fields||fields.Any(x=>x.Value is null)||fields.Select(x=>x.Id).Distinct().Count()!=fields.Length)throw new ArgumentException("Invalid SecretBase6 field list.");return fields;}
    private static void Placement(SecretBase6 b,int? index,Sb6Value[] fields){if(index is null or <0 or >27)throw new ArgumentException("Invalid SecretBase6 placement.");var p=b.GetPlacement(index.Value);foreach(var f in fields){int min=f.Id=="Good"?-1:0,max=f.Id=="Rotation"?255:65535;if(f.Value!.Length>6||!int.TryParse(f.Value,NumberStyles.Integer,CultureInfo.InvariantCulture,out int v)||v<min||v>max)throw new ArgumentException("Invalid SecretBase6 placement value.");switch(f.Id){case"Good":p.Good=(ushort)v;break;case"X":p.X=(ushort)v;break;case"Y":p.Y=(ushort)v;break;case"Rotation":p.Rotation=(byte)v;break;default:throw new ArgumentException("Invalid SecretBase6 placement field.");}}}
    private static void Record(SAV6AO s,string value){if(value.Length>10||!uint.TryParse(value,NumberStyles.None,CultureInfo.InvariantCulture,out uint v))throw new ArgumentException("Invalid SecretBase6 captured record.");s.Records.SetRecord(80,unchecked((int)v));}
    internal static void ResaveCurrent(SAV6AO s,Sb6Edit e,bool record)
    {
        var b=Target(s,e.Base);if(e.Placement is null or <0 or >27)throw new ArgumentException("Invalid SecretBase6 resave placement.");var p=b.GetPlacement(e.Placement.Value);Placement(b,e.Placement,[new("Good",p.Good.ToString()),new("X",p.X.ToString()),new("Y",p.Y.ToString()),new("Rotation",p.Rotation.ToString())]);
        if(b is SecretBase6Other o){if(e.Member is null or <0 or >2)throw new ArgumentException("Invalid SecretBase6 member.");var pk=o.GetParticipant(e.Member.Value);SecretBase6Pokemon.Resave(s,pk);o.SetParticipant(e.Member.Value,pk);}else if(e.Member is not null)throw new ArgumentException("SecretBase6 self has no team.");
        if(record){int old=s.Records.GetRecord(80);if(old<0)throw new ArgumentException("SecretBase6 captured record cannot be loaded by the source window.");Record(s,old.ToString(CultureInfo.InvariantCulture));}
    }
    internal static byte[] Prepare(SaveFile save,Sb6Edit e,string hash,int length)
    {
        var s=Save(save);if(!s.State.Exportable||!SaveChecksums.Valid(s))throw new ArgumentException("SecretBase6 editing requires valid save checksums.");if(e.SourceHash!=hash)throw new ArgumentException("SecretBase6 preview is stale.");var copy=(SAV6AO)s.Clone();
        if(e.Action is "property" or "placement" or "member"){
            if(e.CapturedRecord is not null||e.DataBase64 is not null)throw new ArgumentException("Invalid SecretBase6 mixed fields.");var b=Target(copy,e.Base);var f=Fields(e);
            switch(e.Action){case"property":if(e.Placement is not null||e.Member is not null)throw new ArgumentException("Invalid SecretBase6 property target.");SecretBase6Fields.Apply(b,f);break;case"placement":if(e.Member is not null)throw new ArgumentException("Invalid SecretBase6 placement target.");Placement(b,e.Placement,f);break;case"member":if(e.Placement is not null||e.Member is null or <0 or >2||b is not SecretBase6Other o)throw new ArgumentException("Invalid SecretBase6 member target.");var p=o.GetParticipant(e.Member.Value);SecretBase6Pokemon.Apply(copy,p,f);o.SetParticipant(e.Member.Value,p);break;}
        }else{
            if(e.Fields is not null)throw new ArgumentException("Invalid SecretBase6 action fields.");
            switch(e.Action){
                case"record":if(e.Base is not null||e.Placement is not null||e.Member is not null||e.CapturedRecord is null||e.DataBase64 is not null)throw new ArgumentException("Invalid SecretBase6 record target.");Record(copy,e.CapturedRecord);break;
                case"goods":if(e.Base is not null||e.Placement is not null||e.Member is not null||e.CapturedRecord is not null||e.DataBase64 is not null)throw new ArgumentException("Invalid SecretBase6 goods fields.");copy.SecretBase.GiveAllGoods();break;
                case"delete":if(e.Base is null or <1 or >30||e.Placement is not null||e.Member is not null||e.CapturedRecord is not null||e.DataBase64 is not null)throw new ArgumentException("Invalid SecretBase6 delete fields.");copy.SecretBase.DeleteOther(e.Base.Value-1);break;
                case"import":if(e.Placement is not null||e.Member is not null||e.CapturedRecord is not null||e.DataBase64 is null||e.DataBase64.Length>1324)throw new ArgumentException("Invalid SecretBase6 import fields.");byte[] data;try{data=Convert.FromBase64String(e.DataBase64);}catch(FormatException){throw new ArgumentException("Invalid SecretBase6 import data.");}var source=SecretBase6.Read(data)??throw new ArgumentException("Invalid SecretBase6 sb6 size.");Target(copy,e.Base).Load(source);break;
                case"resave":if(e.CapturedRecord is not null||e.DataBase64 is not null)throw new ArgumentException("Invalid SecretBase6 resave fields.");ResaveCurrent(copy,e,true);break;
                default:throw new ArgumentException("Invalid SecretBase6 action.");
            }
        }
        var expected=copy.SecretBase.Data.ToArray();var records=copy.Records.Data.ToArray();var output=copy.Write().ToArray();var check=SaveUtil.GetSaveFile(output.ToArray())as SAV6AO;if(check is null||check.Version!=copy.Version||output.Length!=length||!SaveChecksums.Valid(check)||!check.SecretBase.Data.SequenceEqual(expected)||!check.Records.Data.SequenceEqual(records))throw new InvalidOperationException("SecretBase6 export verification failed.");if(e.TargetHash is {} target&&target!=Br4Editing.Hash(output))throw new ArgumentException("SecretBase6 preview target is stale.");return output;
    }
}
public static partial class SaveService
{
    private static Sb6Edit ParseSecretBase6(string json)=>json.Length>300000?throw new ArgumentException("SecretBase6 request too large."):JsonSerializer.Deserialize(json,SaveJsonContext.Default.Sb6Edit)??throw new ArgumentException("Missing SecretBase6 edit.");
    public static string ReadSecretBase6(byte[] data)=>JsonSerializer.Serialize(SecretBase6Editing.Read(Open(data),Br4Editing.Hash(data)),SaveJsonContext.Default.Sb6Catalog);
    public static string PreviewSecretBase6(byte[] data,string json){var e=ParseSecretBase6(json);var output=SecretBase6Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);var hash=Br4Editing.Hash(output);return JsonSerializer.Serialize(new Sb6Preview(e with{TargetHash=hash},SecretBase6Editing.Read(Open(output),hash),Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i]).ToArray()),SaveJsonContext.Default.Sb6Preview);}
    public static byte[] EditSecretBase6(byte[] data,string json){var e=ParseSecretBase6(json);if(e.TargetHash?.Length!=64)throw new ArgumentException("SecretBase6 requires a frozen preview.");return SecretBase6Editing.Prepare(Open(data),e,Br4Editing.Hash(data),data.Length);}
    public static byte[] ExportSecretBase6(byte[] data,string json){var e=ParseSecretBase6(json);if(e.Action!="export"||e.Fields is not null||e.CapturedRecord is not null||e.DataBase64 is not null||e.TargetHash is not null)throw new ArgumentException("Invalid SecretBase6 export fields.");if(e.SourceHash!=Br4Editing.Hash(data))throw new ArgumentException("SecretBase6 export is stale.");var save=Open(data)as SAV6AO??throw new ArgumentException("SecretBase6 export requires ORAS.");SecretBase6Editing.ResaveCurrent(save,e,false);return SecretBase6Editing.Target(save,e.Base).Data.ToArray();}
}
