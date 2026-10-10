// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.ComponentModel;
using System.Diagnostics.CodeAnalysis;

namespace PokeRNGKit.SaveEditor;

public sealed record TrainerAppearanceChoice(uint Id, string Name);
public sealed record TrainerAppearanceField(string Key, uint Value, uint Max, TrainerAppearanceChoice[] Choices);
public sealed record TrainerAppearance6State(string Nickname, int Gender, TrainerAppearanceField[] Fields);
public sealed record TrainerAppearance6Edit(int Gender, string? Nickname = null, Dictionary<string, uint>? Fields = null);

internal static class TrainerAppearance6
{
    private sealed record Binding(TrainerAppearanceField Field, Action<uint> Set, Func<string,uint> Parse);
    private static Binding Number(string key, uint max, Func<uint> get, Action<uint> set) => new(new(key, get(), max, []), set, text => (uint)new UInt32Converter().ConvertFromInvariantString(text)!);
    private static Binding Boolean(string key, Func<bool> get, Action<bool> set) => new(new(key, get() ? 1u : 0, 1, [new(0, "Off"), new(1, "On")]), v => set(v == 1), text => text switch{"0"=>0,"1"=>1,_=>throw new ArgumentException("Invalid Trainer6 appearance boolean.")});
    private static Binding EnumField<[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicFields)] T>(string key, uint max, Func<T> get, Action<T> set) where T : struct, Enum => new(
        new(key, Convert.ToUInt32(get()), max, Enum.GetValues<T>().Select(v => new TrainerAppearanceChoice(Convert.ToUInt32(v), v.ToString())).ToArray()),
        v => set((T)Enum.ToObject(typeof(T), v)), text => unchecked((uint)Convert.ToInt64(new EnumConverter(typeof(T)).ConvertFromInvariantString(text)!)));
    internal static Tr6Field[] WindowFields(SAV6XY save)=>Fields(save.Status.Fashion).Select(b=>new Tr6Field("Appearance."+b.Field.Key,"appearance",new(b.Field.Key,b.Field.Key,b.Field.Key),b.Field.Value.ToString(System.Globalization.CultureInfo.InvariantCulture),b.Field.Key=="Contacts"?"choice":"property",32767,b.Field.Choices.Length==0?0:int.MinValue,b.Field.Choices.Length==0?uint.MaxValue:int.MaxValue,b.Field.Choices.Select(v=>new OriginChoice((int)v.Id,new(v.Name,v.Name,v.Name))).ToArray())).ToArray();
    internal static void WindowApply(SAV6XY save,Tr6Value[] rows)
    {
        var fashion=save.Status.Fashion;var bindings=Fields(fashion).ToDictionary(v=>"Appearance."+v.Field.Key);var setters=new List<(Binding Binding,uint Value)>();
        foreach(var row in rows){if(!bindings.TryGetValue(row.Key,out var b)||row.Value.Length>32767)throw new ArgumentException("Invalid Trainer6 appearance property.");uint value;try{value=b.Parse(row.Value);}catch(Exception e)when(e is FormatException or ArgumentException or OverflowException){throw new ArgumentException("Invalid Trainer6 appearance property value.",e);}setters.Add((b,value));}
        foreach(var (b,value) in setters)b.Set(value);save.Status.Fashion=fashion;
    }
    private static Binding[] Fields(TrainerFashion6 fashion) => fashion switch { Fashion6Male m => Fields(m), Fashion6Female f => Fields(f), _ => [] };
    public static TrainerAppearance6State? Read(SaveFile save) => save is SAV6XY xy ? new(xy.Status.Nickname, xy.Gender, Fields(xy.Status.Fashion).Select(b => b.Field).ToArray()) : null;
    public static string? Snapshot(SaveFile save) => save is SAV6XY xy ? Convert.ToHexString(xy.Status.Data.Slice(0x30, 16)) + Convert.ToHexString(xy.Status.Data.Slice(0x62, 26)) : null;
    public static void Apply(SaveFile save, TrainerAppearance6Edit edit)
    {
        if (save is not SAV6XY xy || edit.Gender != xy.Gender) throw new ArgumentException("Trainer appearance format or gender has changed. Reset the appearance draft.");
        if (edit.Nickname is { } nickname && nickname != xy.Status.Nickname && (nickname.Length > 12 || nickname.Any(char.IsControl)))
            throw new ArgumentException("Trainer nickname must contain at most 12 characters without control characters.");
        var fashion = xy.Status.Fashion;
        var bindings = Fields(fashion).ToDictionary(b => b.Field.Key);
        foreach (var (key, value) in edit.Fields ?? [])
            if (!bindings.TryGetValue(key, out var b) || value > b.Field.Max) throw new ArgumentException("Trainer appearance field is unsupported or out of range.");
        bool changed = false;
        foreach (var (key, value) in edit.Fields ?? [])
        {
            var binding = bindings[key];
            if (value == binding.Field.Value) continue;
            binding.Set(value); changed = true;
        }
        if (changed) xy.Status.Fashion = fashion;
        if (edit.Nickname is { } name && name != xy.Status.Nickname)
        {
            xy.Status.Nickname = name;
            if (xy.Status.Nickname != name) throw new ArgumentException("Trainer nickname cannot be represented by this game.");
        }
        var actual = Fields(xy.Status.Fashion).ToDictionary(b => b.Field.Key, b => b.Field.Value);
        foreach (var (key, value) in edit.Fields ?? [])
            if (actual[key] != value) throw new ArgumentException("Trainer appearance field cannot be stored exactly.");
    }
    private static Binding[] Fields(Fashion6Male f) => [
        Number("Version", 7, () => f.Version, v => f.Version = v),
        Number("Model", 7, () => f.Model, v => f.Model = v),
        EnumField("Skin", 3, () => f.Skin, v => f.Skin = v),
        EnumField("HairColor", 7, () => f.HairColor, v => f.HairColor = v),
        EnumField("Hat", 31, () => f.Hat, v => f.Hat = v),
        EnumField("Front", 7, () => f.Front, v => f.Front = v),
        EnumField("Hair", 15, () => f.Hair, v => f.Hair = v),
        Number("Face", 7, () => f.Face, v => f.Face = v),
        Number("Arms", 3, () => f.Arms, v => f.Arms = v),
        Number("Unknown0", 3, () => f.Unknown0, v => f.Unknown0 = v),
        Number("Unused0", 3, () => f.Unused0, v => f.Unused0 = v),
        EnumField("Top", 63, () => f.Top, v => f.Top = v),
        EnumField("Legs", 31, () => f.Legs, v => f.Legs = v),
        EnumField("Socks", 7, () => f.Socks, v => f.Socks = v),
        EnumField("Shoes", 31, () => f.Shoes, v => f.Shoes = v),
        EnumField("Bag", 15, () => f.Bag, v => f.Bag = v),
        EnumField("AHat", 15, () => f.AHat, v => f.AHat = v),
        Number("Unknown1", 3, () => f.Unknown1, v => f.Unknown1 = v),
        Number("Unused1", 7, () => f.Unused1, v => f.Unused1 = v),
        Boolean("Contacts", () => f.Contacts, v => f.Contacts = v),
        Number("FacialHair", 7, () => f.FacialHair, v => f.FacialHair = v),
        EnumField("ColorContacts", 7, () => f.ColorContacts, v => f.ColorContacts = v),
        Number("FacialColor", 7, () => f.FacialColor, v => f.FacialColor = v),
        Number("PaintLeft", 15, () => f.PaintLeft, v => f.PaintLeft = v),
        Number("PaintRight", 15, () => f.PaintRight, v => f.PaintRight = v),
        Number("PaintLeftC", 7, () => f.PaintLeftC, v => f.PaintLeftC = v),
        Number("PaintRightC", 7, () => f.PaintRightC, v => f.PaintRightC = v),
        Boolean("Freckles", () => f.Freckles, v => f.Freckles = v),
        Number("ColorFreckles", 7, () => f.ColorFreckles, v => f.ColorFreckles = v),
        Number("Unused2", 7, () => f.Unused2, v => f.Unused2 = v),
    ];
    private static Binding[] Fields(Fashion6Female f) => [
        Number("Version", 7, () => f.Version, v => f.Version = v),
        Number("Model", 7, () => f.Model, v => f.Model = v),
        EnumField("Skin", 3, () => f.Skin, v => f.Skin = v),
        EnumField("HairColor", 7, () => f.HairColor, v => f.HairColor = v),
        EnumField("Hat", 63, () => f.Hat, v => f.Hat = v),
        EnumField("Front", 7, () => f.Front, v => f.Front = v),
        EnumField("Hair", 15, () => f.Hair, v => f.Hair = v),
        Number("Face", 7, () => f.Face, v => f.Face = v),
        Number("Arms", 3, () => f.Arms, v => f.Arms = v),
        Number("Unknown0", 3, () => f.Unknown0, v => f.Unknown0 = v),
        Number("Unused0", 1, () => f.Unused0, v => f.Unused0 = v),
        EnumField("Top", 63, () => f.Top, v => f.Top = v),
        EnumField("Legs", 127, () => f.Legs, v => f.Legs = v),
        EnumField("Dress", 15, () => f.Dress, v => f.Dress = v),
        EnumField("Socks", 31, () => f.Socks, v => f.Socks = v),
        EnumField("Shoes", 63, () => f.Shoes, v => f.Shoes = v),
        Number("Unknown1", 3, () => f.Unknown1, v => f.Unknown1 = v),
        Number("Unused1", 3, () => f.Unused1, v => f.Unused1 = v),
        EnumField("Bag", 31, () => f.Bag, v => f.Bag = v),
        EnumField("AHat", 31, () => f.AHat, v => f.AHat = v),
        Boolean("Contacts", () => f.Contacts, v => f.Contacts = v),
        Number("MascaraType", 3, () => f.MascaraType, v => f.MascaraType = v),
        Boolean("Eyeliner", () => f.Eyeliner, v => f.Eyeliner = v),
        Boolean("Cheek", () => f.Cheek, v => f.Cheek = v),
        Boolean("Lips", () => f.Lips, v => f.Lips = v),
        EnumField("ColorContacts", 7, () => f.ColorContacts, v => f.ColorContacts = v),
        Boolean("Mascara", () => f.Mascara, v => f.Mascara = v),
        Number("ColorEyeliner", 7, () => f.ColorEyeliner, v => f.ColorEyeliner = v),
        Number("ColorCheek", 7, () => f.ColorCheek, v => f.ColorCheek = v),
        Number("Unused2", 1, () => f.Unused2, v => f.Unused2 = v),
        Number("ColorLips", 3, () => f.ColorLips, v => f.ColorLips = v),
        Number("ColorFreckles", 7, () => f.ColorFreckles, v => f.ColorFreckles = v),
        Boolean("Freckles", () => f.Freckles, v => f.Freckles = v),
        Number("Unused3", 16777215, () => f.Unused3, v => f.Unused3 = v),
    ];
}
