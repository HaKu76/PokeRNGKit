// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PKHeX.Drawing.PokeSprite;
namespace PokeRNGKit.SaveEditor;
public sealed record Misc5ForestSlot(int Index,int Area,int Species,int Move,int Gender,int Form,int Animation,uint Raw,string Sprite,OriginChoice[] Forms,int[] Genders);
public sealed record Misc5ForestEdit(int? Index,int? Species=null,int? Move=null,int? Gender=null,int? Form=null,int? Animation=null);
public sealed record Misc5ForestSpecies(int Species,OriginChoice[] Forms,int[] Genders);
public sealed record Misc5RandomEntry(int SourceIndex,uint Raw);
internal static class Misc5Forest
{
    private static OriginChoice[] Choices(SAV5 s,bool species){var filtered=new FilteredGameDataSource(s,new GameDataSource(GameInfo.GetStrings("en")));return (species?filtered.Species:filtered.Moves).Select(v=>new OriginChoice(v.Value,new(GameInfo.GetStrings("zh-Hans").GetText(species,v.Value),GameInfo.GetStrings("en").GetText(species,v.Value),GameInfo.GetStrings("ja").GetText(species,v.Value)))).ToArray();}
    internal static OriginChoice[] Species(SAV5 s)=>Choices(s,true);
    internal static OriginChoice[] Moves(SAV5 s)=>Choices(s,false);
    private static string GetText(this GameStrings strings,bool species,int index)=>(species?strings.specieslist:strings.movelist)[index];
    internal static int[] Genders(int species){if(species==0)return[0];if(species<0||species>649)return[];var p=PersonalTable.B2W2[species];if(p.Genderless)return[2];var list=new List<int>();if(!p.OnlyFemale)list.Add(0);if(!p.OnlyMale)list.Add(1);return list.ToArray();}
    internal static OriginChoice[] Forms(int species)
    {
        if(species<0||species>649)return[];
        string[] Get(string lang){var s=GameInfo.GetStrings(lang);return FormConverter.GetFormList((ushort)species,s.types,s.forms,["♂","♀","-"],EntityContext.Gen5);}
        var en=Get("en");var zh=Get("zh-Hans");var ja=Get("ja");bool has=PersonalTable.B2W2[species].HasForms||species==(int)PKHeX.Core.Species.Mothim;int count=has?en.Length:1;
        return Enumerable.Range(0,count).Select(i=>new OriginChoice(i,new(i<zh.Length?zh[i]:i.ToString(),i<en.Length?en[i]:i.ToString(),i<ja.Length?ja[i]:i.ToString()))).ToArray();
    }
    internal static Misc5ForestSlot[] Read(SAV5 s)=>s.EntreeForest.Slots.Select((x,i)=>new Misc5ForestSlot(i,(int)x.Area,x.Species,x.Move,x.Gender,x.Form,(int)x.Animation,x.RawValue,"b"+SpriteName.GetResourceStringSprite(x.Species,x.Form,(byte)Math.Min(x.Gender,(byte)2),0,EntityContext.Gen5),Forms(x.Species),Genders(x.Species))).ToArray();
    internal static void Apply(SAV5 s,Misc5ForestEdit[]? edits)
    {
        if(edits is null)return;var slots=s.EntreeForest.Slots;var species=Species(s).Select(v=>v.Id).ToArray();var moves=Moves(s).Select(v=>v.Id).ToArray();
        if(edits.Length is 0 or >530||edits.Any(e=>e is null||e.Index is null or <0 or >=530||e.Species is {} p&&!species.Contains(p)||e.Move is {} m&&!moves.Contains(m)||e.Animation is <0 or >7||e.Species is null&&e.Move is null&&e.Form is null&&e.Gender is null&&e.Animation is null)||edits.Select(e=>e.Index).Distinct().Count()!=edits.Length)throw new ArgumentException("Invalid Misc5 forest fields.");
        foreach(var e in edits){var x=slots[e.Index!.Value];int next=e.Species??x.Species;if(e.Form is {} form&&!Forms(next).Any(v=>v.Id==form)||e.Gender is {} gender&&!Genders(next).Contains(gender))throw new ArgumentException("Invalid Misc5 forest form or gender.");
            if(e.Species is {} p)x.Species=(ushort)p;if(e.Move is {} move)x.Move=(ushort)move;if(e.Gender is {} g)x.Gender=(byte)g;if(e.Form is {} f)x.Form=(byte)f;if(e.Animation is {} a)x.Animation=(EntreeForestAnimation)a;
        }
    }
    internal static EncounterStatic5Entree[] RandomSource(SAV5 s)=>(s is SAV5BW?Encounters5BW.DreamWorld_BW:Encounters5B2W2.DreamWorld_B2W2).Concat(Encounters5DR.DreamWorld_Common).ToArray();
    internal static Misc5RandomEntry[] Randomize(SAV5 s)
    {
        var source=RandomSource(s).Select((entry,index)=>(entry,index)).ToList();var slots=s.EntreeForest.Slots;if(source.Count<slots.Length)throw new ArgumentException("Misc5 random source cannot fill all forest slots.");var frozen=new List<Misc5RandomEntry>();
        foreach(var target in slots){int index=Util.Rand.Next(source.Count);var draw=source[index];var entry=draw.entry;source.RemoveAt(index);target.Species=entry.Species;target.Form=entry.Form;target.Gender=!((IFixedGender)entry).IsFixedGender?PersonalTable.B2W2[entry.Species].RandomGender():entry.Gender;ReadOnlySpan<ushort> moves=entry.Moves;int count=moves.Length-moves.Count<ushort>(0);target.Move=count==0?(ushort)0:moves[Util.Rand.Next(count)];frozen.Add(new(draw.index,target.RawValue));}
        return frozen.ToArray();
    }
    internal static void ApplyFrozen(SAV5 s,Misc5RandomEntry[]? raw)
    {
        if(raw is null||raw.Length!=530)throw new ArgumentException("Misc5 randomization requires a frozen forest.");
        var slots=s.EntreeForest.Slots;var source=RandomSource(s);var seen=new HashSet<int>();
        for(int i=0;i<raw.Length;i++){var draw=raw[i];if(draw is null||draw.SourceIndex<0||draw.SourceIndex>=source.Length||!seen.Add(draw.SourceIndex))throw new ArgumentException("Invalid Misc5 frozen forest source.");var e=source[draw.SourceIndex];var memory=BitConverter.GetBytes(draw.Raw);var x=new EntreeSlot(memory);ReadOnlySpan<ushort> moves=e.Moves;int count=moves.Length-moves.Count<ushort>(0);bool move=count==0?x.Move==0:moves[..count].Contains(x.Move);
            if(e.Species!=x.Species||e.Form!=x.Form||(((IFixedGender)e).IsFixedGender?e.Gender!=x.Gender:!Genders(e.Species).Contains(x.Gender))||!move||x.Animation!=slots[i].Animation||(x.RawValue&0x400)!=0)throw new ArgumentException("Invalid Misc5 frozen forest entry.");slots[i].RawValue=draw.Raw;
        }
    }
}
