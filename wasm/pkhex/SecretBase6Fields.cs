// SPDX-License-Identifier: GPL-3.0-or-later
using System.ComponentModel;
using System.Globalization;
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;

public sealed record Sb6Field(string Id,string Kind,string Value,long Minimum,long Maximum,int TextMaximum,int StoredTextMaximum,OriginChoice[]? Choices);
internal sealed record Sb6Definition(Sb6Field Field,Action<string> Set)
{
    internal static Sb6Definition Numeric(string id,long min,long max,Func<long> get,Action<long> set,TypeConverter converter)=>new(new(id,"number",get().ToString(CultureInfo.InvariantCulture),min,max,20,0,null),v=>{
        if(v.Length>20)throw new ArgumentException("Invalid SecretBase6 property number.");
        long n=Convert.ToInt64(converter.ConvertFromInvariantString(v),CultureInfo.InvariantCulture);
        if(n<min||n>max)throw new ArgumentException("Invalid SecretBase6 property number.");set(n);
    });
    internal static Sb6Definition Byte(string id,Func<byte> get,Action<byte> set)=>Numeric(id,0,255,()=>get(),n=>set((byte)n),new ByteConverter());
    internal static Sb6Definition Int(string id,Func<int> get,Action<int> set)=>Numeric(id,int.MinValue,int.MaxValue,()=>get(),n=>set((int)n),new Int32Converter());
    internal static Sb6Definition UInt(string id,Func<uint> get,Action<uint> set)=>Numeric(id,0,uint.MaxValue,()=>get(),n=>set((uint)n),new UInt32Converter());
    internal static Sb6Definition Text(string id,int stored,Func<string> get,Action<string> set)=>new(new(id,"text",get(),0,0,32767,stored,null),v=>{if(v.Length>32767)throw new ArgumentException("Invalid SecretBase6 property text.");set(v);});
    internal static Sb6Definition Bool(string id,Func<bool> get,Action<bool> set)=>new(new(id,"boolean",get()?"1":"0",0,1,1,0,null),v=>{if(v is not("0" or "1"))throw new ArgumentException("Invalid SecretBase6 property flag.");set(v=="1");});
}
internal static class SecretBase6Fields
{
    internal static Sb6Definition[] Definitions(SecretBase6 b)
    {
        var list=new List<Sb6Definition>{
            Sb6Definition.Bool("IsNew",()=>b.IsNew,v=>b.IsNew=v),
            Sb6Definition.Int("BaseLocation",()=>b.BaseLocation,v=>b.BaseLocation=v),
            Sb6Definition.Byte("BoppoyamaScore",()=>b.BoppoyamaScore,v=>b.BoppoyamaScore=v),
            Sb6Definition.Text("TrainerName",12,()=>b.TrainerName,v=>b.TrainerName=v),
            Sb6Definition.Text("TeamName",16,()=>b.TeamName,v=>b.TeamName=v),
            Sb6Definition.Text("TeamSlogan",16,()=>b.TeamSlogan,v=>b.TeamSlogan=v),
            Sb6Definition.Text("SayHappy",16,()=>b.SayHappy,v=>b.SayHappy=v),
            Sb6Definition.Text("SayEncourage",16,()=>b.SayEncourage,v=>b.SayEncourage=v),
            Sb6Definition.Text("SayBlackboard",16,()=>b.SayBlackboard,v=>b.SayBlackboard=v),
            Sb6Definition.Text("SayConfettiBall",16,()=>b.SayConfettiBall,v=>b.SayConfettiBall=v),
            new(new("Rank","enum",((int)b.Rank).ToString(CultureInfo.InvariantCulture),int.MinValue,int.MaxValue,20,0,[new(0,new("默认","Default","通常")),new(1,new("铜","Bronze","ブロンズ")),new(2,new("银","Silver","シルバー")),new(3,new("金","Gold","ゴールド")),new(4,new("白金","Platinum","プラチナ"))]),v=>{if(v.Length>20||!Enum.TryParse<SecretBase6Rank>(v,true,out var rank))throw new ArgumentException("Invalid SecretBase6 rank.");b.Rank=rank;}),
            Sb6Definition.UInt("TotalFlagsFromFriends",()=>b.TotalFlagsFromFriends,v=>b.TotalFlagsFromFriends=v),
            Sb6Definition.UInt("TotalFlagsFromOther",()=>b.TotalFlagsFromOther,v=>b.TotalFlagsFromOther=v),
            Sb6Definition.Byte("CollectedFlagsToday",()=>b.CollectedFlagsToday,v=>b.CollectedFlagsToday=v),
            Sb6Definition.Byte("CollectedFlagsYesterday",()=>b.CollectedFlagsYesterday,v=>b.CollectedFlagsYesterday=v),
        };
        if(b is SecretBase6Other other){list.Add(Sb6Definition.Byte("Language",()=>other.Language,v=>other.Language=v));list.Add(Sb6Definition.Byte("Gender",()=>other.Gender,v=>other.Gender=v));}
        return list.ToArray();
    }
    internal static void Apply(SecretBase6 b,Sb6Value[] fields)
    {
        var definitions=Definitions(b).ToDictionary(x=>x.Field.Id);
        foreach(var f in fields){if(f.Value is null||!definitions.TryGetValue(f.Id,out var d))throw new ArgumentException("Invalid SecretBase6 property field.");try{d.Set(f.Value);}catch(Exception e)when(e is ArgumentException or FormatException or OverflowException or NotSupportedException){throw new ArgumentException("Invalid SecretBase6 property value.",e);}}
    }
}
