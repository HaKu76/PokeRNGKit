// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static class Hall6TrashEditing
{
    internal static readonly int[] Chars=Enumerable.Range(0xE081,9).Concat(Enumerable.Range(0xE08D,25)).ToArray();
    internal static readonly Lazy<OriginChoice[]> Species=new(()=>{string[] z=GameInfo.GetStrings("zh-Hans").specieslist,e=GameInfo.GetStrings("en").specieslist,j=GameInfo.GetStrings("ja").specieslist;return new GameDataSource(GameInfo.GetStrings("en")).SpeciesDataSource.Select(v=>new OriginChoice(v.Value,new(z[v.Value],e[v.Value],j[v.Value]))).ToArray();});
    internal static readonly Lazy<OriginChoice[]> Languages=new(()=>GameInfo.LanguageDataSource(6,EntityContext.Gen6).Select(v=>new OriginChoice(v.Value,new(GameInfo.GetStrings("zh-Hans").languageNames[v.Value],GameInfo.GetStrings("en").languageNames[v.Value],GameInfo.GetStrings("ja").languageNames[v.Value]))).ToArray());
    private static byte[] Encode(SAV6 s,string text){if(text.Length>13)throw new ArgumentException("Hall6 trash text is too long.");var bytes=new byte[26];int length=s.SetString(bytes,text,text.Length,StringConverterOption.None);return bytes[..length];}
    internal static void Apply(SAV6 s,int team,int member,Hall6Trash e)
    {
        var raw=HallOfFame6Editing.Fame(s).GetEntity(team,member);var entity=new HallFame6Entity(raw,s.Language);string old=entity.Nickname;var bytes=raw.Slice(0x18,26).ToArray();s.SetString(bytes,old,12,StringConverterOption.None);
        if(e.Action!="layer"&&(e.Species is not null||e.Language is not null||e.Generation is not null||e.UiLanguage is not null)||e.Action!="hex"&&e.Hex is not null||e.Action!="text"&&e.Text is not null)throw new ArgumentException("Invalid Hall6 trash fields.");
        switch(e.Action){case "prepare":break;
            case "hex":if(e.Hex is null||e.Hex.Length!=52||e.Hex.Any(c=>!char.IsAsciiHexDigit(c)))throw new ArgumentException("Invalid Hall6 26-byte trash hex.");bytes=Convert.FromHexString(e.Hex);break;
            case "text":if(e.Text is null||e.Text.Length>12)throw new ArgumentException("Invalid Hall6 trash text.");Encode(s,e.Text).CopyTo(bytes,0);break;
            case "clear":Array.Clear(bytes,Encode(s,old).Length,26-Encode(s,old).Length);break;
            case "layer":if(e.Species is null||!Species.Value.Any(v=>v.Id==e.Species)||e.Language is null||!Languages.Value.Any(v=>v.Id==e.Language)||e.Generation is null or <0 or >100||e.UiLanguage is not ("zh" or "en" or "ja"))throw new ArgumentException("Invalid Hall6 trash layer choices.");string name=SpeciesName.GetSpeciesNameGeneration((ushort)e.Species.Value,e.Language.Value,(byte)e.Generation.Value);if(name.Length==0){var v=Species.Value.Single(v=>v.Id==e.Species);name=e.UiLanguage=="zh"?v.Name.Zh:e.UiLanguage=="ja"?v.Name.Ja:v.Name.En;}var layer=Encode(s,name);int start=Encode(s,old).Length;if(layer.Length<=start||layer.Length>26)throw new ArgumentException("Hall6 trash layer is hidden or too long.");layer.AsSpan(start).CopyTo(bytes.AsSpan(start));break;
            default:throw new ArgumentException("Invalid Hall6 trash action.");}
        string next=s.GetString(bytes);if(next!=old)HallOfFame6Editing.Resave(s,team,member,next);bytes.CopyTo(raw.Slice(0x18,26));
    }
}
