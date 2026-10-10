// SPDX-License-Identifier: GPL-3.0-or-later
using System.Globalization;
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;
public sealed record Sb6FormInfo(int Index,OriginChoice[] Abilities,int FixedGender);
public sealed record Sb6SpeciesInfo(int Species,OriginChoice[] Forms,bool FormSelectable,bool DualGender,int FixedGender,Sb6FormInfo[] FormInfo);
public sealed record Sb6Pokemon(int Index,int Species,LocalizedText Name,string Sprite,Sb6Field[] Fields,bool IsEgg,int RawAbilityNumber,string RawHex);
internal static class SecretBase6Pokemon
{
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<GameVersion,Sb6SpeciesInfo[]> InfoCache=new();
    internal static Sb6SpeciesInfo[] Info(SAV6AO s)=>InfoCache.GetOrAdd(s.Version,_=>{
        var strings=new[]{"zh-Hans","en","ja"}.Select(GameInfo.GetStrings).ToArray();
        var sources=strings.Select(x=>new FilteredGameDataSource(s,new GameDataSource(x))).ToArray();
        return HallOfFame6Editing.Choices(s).Species.Select(v=>{
            int id=v.Id;var forms=HallOfFame6Editing.Forms(s,id);if(forms.Length==0)forms=[new(0,new("默认","Normal","通常"))];var basePi=PersonalTable.AO[id];
            return new Sb6SpeciesInfo(id,forms,FormInfo.HasFormSelection(basePi,(ushort)id,6),basePi.IsDualGender,basePi.IsDualGender?-1:basePi.FixedGender(),forms.Select(f=>{
                var pi=PersonalTable.AO.GetFormEntry((ushort)id,(byte)f.Id);var rows=sources.Select(x=>x.GetAbilityList(pi)).ToArray();
                return new Sb6FormInfo(f.Id,Enumerable.Range(0,pi.AbilityCount).Select(i=>new OriginChoice(i,new(rows[0][i].Text,rows[1][i].Text,rows[2][i].Text))).ToArray(),EntityGender.GetFromString(forms[f.Id].Name.En) is <2?(int)f.Id:-1);
            }).ToArray());
        }).ToArray();
    });
    internal static (OriginChoice[] Balls,OriginChoice[] Natures) ExtraChoices(SAV6AO s){var strings=new[]{"zh-Hans","en","ja"}.Select(GameInfo.GetStrings).ToArray();var d=new FilteredGameDataSource(s,new GameDataSource(strings[1]));OriginChoice[] Map(IReadOnlyList<ComboItem> rows,Func<GameStrings,string[]> list)=>rows.Select(x=>new OriginChoice(x.Value,new(list(strings[0])[x.Value],list(strings[1])[x.Value],list(strings[2])[x.Value]))).ToArray();return(Map(d.Balls,x=>x.balllist),Map(d.Natures,x=>x.natures));}
    private static Sb6Field Numeric(string id,int value,int maximum,int width,OriginChoice[]? choices=null)=>new(id,"number",value.ToString(CultureInfo.InvariantCulture),0,maximum,width,0,choices);
    internal static Sb6Pokemon Read(SAV6AO s,SecretBase6PKM p,int index)
    {
        var fields=new List<Sb6Field>{new("Ec","hex",p.EncryptionConstant.ToString("X8"),0,uint.MaxValue,8,0,null),Numeric("Species",p.Species,65535,5),Numeric("HeldItem",p.HeldItem,65535,5),Numeric("AbilitySlot",p.AbilityNumber>>1,2,1),Numeric("Nature",(byte)p.Nature,255,3),Numeric("Gender",p.Gender,2,1),Numeric("Form",p.Form,31,2),Numeric("Level",p.CurrentLevel,255,3),Numeric("Friendship",p.CurrentFriendship,255,3),Numeric("Ball",p.Ball,255,3),new("Shiny","boolean",p.IsShiny?"1":"0",0,1,1,0,null)};
        int[] moves=[p.Move1,p.Move2,p.Move3,p.Move4],pp=[p.Move1_PPUps,p.Move2_PPUps,p.Move3_PPUps,p.Move4_PPUps],iv=[p.IV_HP,p.IV_ATK,p.IV_DEF,p.IV_SPE,p.IV_SPA,p.IV_SPD],ev=[p.EV_HP,p.EV_ATK,p.EV_DEF,p.EV_SPE,p.EV_SPA,p.EV_SPD];
        for(int i=0;i<4;i++){fields.Add(Numeric($"Move{i+1}",moves[i],65535,5));fields.Add(Numeric($"PP{i+1}",pp[i],3,1));}
        string[] stats=["HP","ATK","DEF","SPE","SPA","SPD"];for(int i=0;i<6;i++){fields.Add(Numeric("IV_"+stats[i],iv[i],99,2));fields.Add(Numeric("EV_"+stats[i],ev[i],999,3));}
        var names=new[]{"zh-Hans","en","ja"}.Select(l=>{var a=GameInfo.GetStrings(l).specieslist;return p.Species<a.Length?a[p.Species]:p.Species.ToString();}).ToArray();
        return new(index,p.Species,new(names[0],names[1],names[2]),"b"+SpriteName.GetResourceStringSprite(p.Species,p.Form,(byte)Math.Min((int)p.Gender,2),0,s.Context),fields.ToArray(),p.IsEgg,p.AbilityNumber,Convert.ToHexString(p.Data));
    }
    private static int Number(string text,int width,int maximum){if(text.Length>width||text.Any(c=>!char.IsAsciiDigit(c)&&c!=' '&&c!='_'))throw new ArgumentException("Invalid SecretBase6 masked number.");string value=text.Replace('_',' ').Trim();if(!int.TryParse(value,NumberStyles.None,CultureInfo.InvariantCulture,out int n)||n>maximum)throw new ArgumentException("Invalid SecretBase6 masked number.");return n;}
    private static int Pick(string text,OriginChoice[] choices){if(!int.TryParse(text,NumberStyles.None,CultureInfo.InvariantCulture,out int n)||!choices.Any(x=>x.Id==n))throw new ArgumentException("Invalid SecretBase6 Pokemon choice.");return n;}
    private static byte Gender(Sb6SpeciesInfo info,int form,int value){var f=info.FormInfo.Single(x=>x.Index==form);if(f.FixedGender>=0)return(byte)f.FixedGender;return(byte)(info.DualGender?Math.Min(value,2):info.FixedGender);}
    internal static void Apply(SAV6AO s,SecretBase6PKM p,Sb6Value[] fields)
    {
        var map=fields.ToDictionary(x=>x.Id,x=>x.Value??throw new ArgumentException("Missing SecretBase6 Pokemon value."));var c=HallOfFame6Editing.Choices(s);var extra=ExtraChoices(s);
        int species=map.TryGetValue("Species",out string? sp)?Pick(sp,c.Species):p.Species;
        Sb6SpeciesInfo? info=Info(s).FirstOrDefault(x=>x.Species==species);
        if(map.ContainsKey("Species")||map.ContainsKey("Form")||map.ContainsKey("AbilitySlot")||map.ContainsKey("Gender")){
            if(info is null)throw new ArgumentException("Choose a recognized SecretBase6 Pokemon species first.");
            int form=map.TryGetValue("Form",out string? f)?Pick(f,info.Forms):map.ContainsKey("Species")?0:p.Form;if(!info.Forms.Any(x=>x.Id==form))throw new ArgumentException("Invalid SecretBase6 Pokemon form.");
            if(map.ContainsKey("Species"))p.Species=(ushort)species;if(map.ContainsKey("Species")||map.ContainsKey("Form"))p.Form=(byte)form;
            int g=map.TryGetValue("Gender",out string? v)?Number(v,1,2):p.Gender<3?p.Gender:0;if(map.ContainsKey("Species")||map.ContainsKey("Form")||map.ContainsKey("Gender"))p.Gender=Gender(info,form,g);
            if(map.ContainsKey("Species")||map.ContainsKey("Form")||map.ContainsKey("AbilitySlot")){int stored=p.AbilityNumber>>1;int slot=map.TryGetValue("AbilitySlot",out string? a)?Number(a,1,2):stored<3?stored:0;var pi=PersonalTable.AO.GetFormEntry((ushort)species,(byte)form);if(slot>=pi.AbilityCount)slot=0;p.Ability=pi.GetAbilityAtIndex(slot);p.AbilityNumber=slot<<1;}
        }
        foreach(var (id,text) in map){if(id is "Species" or "Form" or "Gender" or "AbilitySlot")continue;
            switch(id){
                case "Ec":if(text.Length>8)throw new ArgumentException("Invalid SecretBase6 EC length.");p.EncryptionConstant=Util.GetHexValue(text);break;
                case "HeldItem":p.HeldItem=Pick(text,c.Items);break;
                case "Nature":p.Nature=(Nature)Pick(text,extra.Natures);break;
                case "Ball":p.Ball=(byte)Pick(text,extra.Balls);break;
                case "Level":p.CurrentLevel=(byte)Number(text,3,255);break;
                case "Friendship":p.CurrentFriendship=Number(text,3,255);break;
                case "Shiny":if(text is not("0" or "1"))throw new ArgumentException("Invalid SecretBase6 shiny.");p.IsShiny=text=="1";break;
                case "Move1":p.Move1=(ushort)Pick(text,c.Moves);break;case "Move2":p.Move2=(ushort)Pick(text,c.Moves);break;case "Move3":p.Move3=(ushort)Pick(text,c.Moves);break;case "Move4":p.Move4=(ushort)Pick(text,c.Moves);break;
                case "PP1":p.Move1_PPUps=Number(text,1,3);break;case "PP2":p.Move2_PPUps=Number(text,1,3);break;case "PP3":p.Move3_PPUps=Number(text,1,3);break;case "PP4":p.Move4_PPUps=Number(text,1,3);break;
                case "IV_HP":p.IV_HP=Number(text,2,99)&31;break;case "IV_ATK":p.IV_ATK=Number(text,2,99)&31;break;case "IV_DEF":p.IV_DEF=Number(text,2,99)&31;break;case "IV_SPE":p.IV_SPE=Number(text,2,99)&31;break;case "IV_SPA":p.IV_SPA=Number(text,2,99)&31;break;case "IV_SPD":p.IV_SPD=Number(text,2,99)&31;break;
                case "EV_HP":p.EV_HP=Math.Min(252,Number(text,3,999));break;case "EV_ATK":p.EV_ATK=Math.Min(252,Number(text,3,999));break;case "EV_DEF":p.EV_DEF=Math.Min(252,Number(text,3,999));break;case "EV_SPE":p.EV_SPE=Math.Min(252,Number(text,3,999));break;case "EV_SPA":p.EV_SPA=Math.Min(252,Number(text,3,999));break;case "EV_SPD":p.EV_SPD=Math.Min(252,Number(text,3,999));break;
                default:throw new ArgumentException("Invalid SecretBase6 Pokemon field.");
            }
        }
    }
    internal static void Resave(SAV6AO s,SecretBase6PKM p)
    {
        var info=Info(s).FirstOrDefault(x=>x.Species==p.Species);if(info is null||!info.Forms.Any(x=>x.Id==p.Form))throw new ArgumentException("SecretBase6 Pokemon cannot be loaded by the source window.");
        var c=HallOfFame6Editing.Choices(s);var extra=ExtraChoices(s);int Select(int n,OriginChoice[] choices)=>choices.Any(x=>x.Id==n)?n:-1;
        int slot=p.AbilityNumber>>1;if(slot>=3)slot=0;var pi=PersonalTable.AO.GetFormEntry(p.Species,p.Form);if(slot>=pi.AbilityCount)throw new ArgumentException("SecretBase6 ability cannot be loaded by the source window.");
        var fields=Read(s,p,0).Fields.Where(x=>x.Id is not("HeldItem" or "Ball" or "Nature" or "Move1" or "Move2" or "Move3" or "Move4" or "Species" or "Form" or "Gender" or "AbilitySlot")).Select(x=>new Sb6Value(x.Id,x.Value.Length>x.TextMaximum?x.Value[..x.TextMaximum]:x.Value)).ToArray();Apply(s,p,fields);
        p.HeldItem=(ushort)Select(p.HeldItem,c.Items);p.Ball=(byte)Select(p.Ball,extra.Balls);p.Nature=(Nature)(byte)Select((byte)p.Nature,extra.Natures);p.Move1=(ushort)Select(p.Move1,c.Moves);p.Move2=(ushort)Select(p.Move2,c.Moves);p.Move3=(ushort)Select(p.Move3,c.Moves);p.Move4=(ushort)Select(p.Move4,c.Moves);p.Ability=pi.GetAbilityAtIndex(slot);p.AbilityNumber=slot<<1;p.Gender=Gender(info,p.Form,p.Gender<3?p.Gender:0);
    }
}
