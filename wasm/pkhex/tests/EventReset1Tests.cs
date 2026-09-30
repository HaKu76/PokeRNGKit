// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class EventReset1Tests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static SAV1 Open(byte[] data)=>SaveUtil.GetSaveFile(data.ToArray()) as SAV1??throw new Exception("Gen1 fixture not detected");
    private static EventResetCatalog Read(byte[] data,string lang)=>JsonSerializer.Deserialize(SaveService.ReadEventReset(data,JsonSerializer.Serialize(new EventQuery(lang),SaveJsonContext.Default.EventQuery)),SaveJsonContext.Default.EventResetCatalog)!;
    private static byte[] Apply(byte[] data,EventResetEdit edit)
    {
        var original=data.ToArray();try{return SaveService.EditEventReset(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.EventResetEdit));}
        finally{Check(data.SequenceEqual(original),"Reset leaves original immutable on success and rejection");}
    }
    private static void Reject(Action action){try{action();throw new Exception("Invalid reset accepted");}catch(ArgumentException){}}
    private static void Bit(SAV1 save,int start,int bit,bool value)
    {
        if(bit==0)return;int offset=start+(bit>>3);byte mask=(byte)(1<<(bit&7));save.Data[offset]=value?(byte)(save.Data[offset]|mask):(byte)(save.Data[offset]&~mask);
    }
    private static bool Bit(SAV1 save,int start,int bit)=>bit!=0&&(save.Data[start+(bit>>3)]&(1<<(bit&7)))!=0;
    public static void Run()
    {
        // Independent final assignments in G1OverworldSpawner. Yellow's earlier Kabuto assignment is overwritten upstream.
        (string Name,int Species,int Event,int Spawn)[] common=[("Eevee",133,0,0x45),("Aerodactyl",142,0x69,0x34),("Hitmonlee",106,0x356,0x4A),("Hitmonchan",107,0x357,0x4B),("Voltorb_1",100,0x461,0x4D),("Voltorb_2",100,0x462,0x4E),("Voltorb_3",100,0x463,0x4F),("Electrode_1",101,0x464,0x50),("Voltorb_4",100,0x465,0x51),("Voltorb_5",100,0x466,0x52),("Electrode_2",101,0x467,0x53),("Voltorb_6",100,0x468,0x54),("Zapdos",145,0x469,0x55),("Moltres",146,0x53E,0x5B),("Kabuto",140,0x57E,0x6D),("Omanyte",138,0x57F,0x6E),("Mewtwo",150,0x8C1,0xD1),("Articuno",144,0x9DA,0xE3)];
        foreach(var language in new[]{LanguageID.English,LanguageID.Japanese})foreach(var version in new[]{GameVersion.RB,GameVersion.YW})
        {
            bool japan=language==LanguageID.Japanese,yellow=version==GameVersion.YW;int events=japan?0x29E9:0x29F3,spawn=japan?0x2848:0x2852;
            var seed=new SAV1(language,version){OT="TEST"};var pk=seed.BlankPKM;pk.Species=25;pk.Nickname="PIKA";pk.OriginalTrainerName="A";pk.CurrentLevel=5;seed.SetBoxSlotAtIndex(pk,0,0);seed.PartyData=[pk];
            seed.Data[japan?0x29B9:0x29C3]=yellow?(byte)0x54:(byte)0x99;seed.Data[japan?0x2712:0x271C]=yellow?(byte)1:(byte)0;
            seed.Data.Slice(events,320).Fill(0xA5);seed.Data.Slice(spawn,30).Fill(0x5A);
            var data=seed.Write().ToArray();var original=data.ToArray();var source=Open(data);Check(source.Version==version&&source.Japanese==japan&&SaveChecksums.Valid(source),"Game and layout detected with valid checksum");
            var map=common.Select(p=>yellow?p.Name switch {"Aerodactyl"=>(p.Name,p.Species,p.Event,Spawn:0x33),"Kabuto"=>(p.Name,p.Species,p.Event,Spawn:0x6F),"Omanyte"=>(p.Name,p.Species,p.Event,Spawn:0x70),"Mewtwo"=>(p.Name,p.Species,p.Event,Spawn:0xD7),"Articuno"=>(p.Name,p.Species,p.Event,Spawn:0xEB),_=>p}:p).ToList();
            if(yellow)map.AddRange(new[]{("Bulbasaur",1,0xA8,0x34),("Squirtle",7,0x147,0),("Charmander",4,0x54F,0)});
            foreach(var lang in new[]{"zh","en","ja"})
            {
                var c=Read(data,lang);Check(c.CanEdit&&c.Entries.Length==map.Count,"Complete independent capability and list");var names=GameInfo.GetStrings(lang=="zh"?"zh-Hans":lang).specieslist;
                foreach(var p in map){var e=c.Entries.Single(e=>e.Id=="Flag"+p.Name);string suffix=p.Name.Contains('_')?" "+p.Name.Split('_')[1]:"";Check(e.Name==names[p.Species]+suffix&&e.Hidden==(Bit(source,events,p.Event)||Bit(source,spawn,p.Spawn)),"Three-language names, suffixes and OR-of-two-flags state");}
            }
            Check(data.SequenceEqual(original),"Reading never writes or normalizes original");
            foreach(var p in map)for(int mask=0;mask<4;mask++)
            {
                var s=Open(data);Bit(s,events,p.Event,(mask&1)!=0);Bit(s,spawn,p.Spawn,(mask&2)!=0);var input=s.Write().ToArray();bool hidden=Bit(s,events,p.Event)||Bit(s,spawn,p.Spawn);
                Check(Read(input,"zh").Entries.Single(e=>e.Id=="Flag"+p.Name).Hidden==hidden,"Each single/pair flag combination");
                if(!hidden){Reject(()=>Apply(input,new(["Flag"+p.Name])));continue;}
                var oracle=Open(input);Bit(oracle,events,p.Event,false);Bit(oracle,spawn,p.Spawn,false);
                var output=Apply(input,new(["Flag"+p.Name]));Check(output.SequenceEqual(oracle.Write().ToArray()),"Each reset matches raw-bit full-file oracle and keeps every unrelated byte");
                var reloaded=Open(output);Check(reloaded.Version==version&&reloaded.Japanese==japan&&SaveChecksums.Valid(reloaded),"Reset preserves version/layout and checksum");
                Check(!Read(output,"en").Entries.Single(e=>e.Id=="Flag"+p.Name).Hidden,"Applied reset is disabled on reload");
            }
            var full=Open(data);full.Data.Slice(events,320).Fill(255);full.Data.Slice(spawn,30).Fill(255);var allInput=full.Write().ToArray();var ids=map.Select(p=>"Flag"+p.Name).ToArray();
            var expected=Open(allInput);foreach(var p in map){Bit(expected,events,p.Event,false);Bit(expected,spawn,p.Spawn,false);}
            var allOutput=Apply(allInput,new(ids));Check(allOutput.SequenceEqual(expected.Write().ToArray())&&Read(allOutput,"ja").Entries.All(e=>!e.Hidden),"Whole selection uses exact final upstream mapping");
            Check(Open(allOutput).GetEventFlag(0)&&(!yellow||Open(allOutput).GetEventFlag(0x578)),"Sentinel zero and overwritten Yellow Kabuto script are preserved");
            Check(SaveService.ExportWorkingCopy(allOutput).SequenceEqual(allOutput),"Exact working-copy download");
            foreach(var bad in new EventResetEdit[]{new(),new([]),new(["unknown"]),new(["FlagEevee","FlagEevee"]),new([null!]),new(["flagEevee"]),new(Enumerable.Repeat("FlagEevee",22).ToArray())})Reject(()=>Apply(allInput,bad));
            if(!yellow)Reject(()=>Apply(allInput,new(["FlagBulbasaur"])));
            var atomic=Open(allInput);var before=atomic.Data.ToArray();Reject(()=>EventReset1.Apply(atomic,new([ids[0],"unknown"])));Check(before.SequenceEqual(atomic.Data.ToArray()),"Invalid later selection has no partial effect");
            var corrupt=allInput.ToArray();corrupt[japan?0x3594:0x3523]^=1;Check(!Read(corrupt,"zh").CanEdit,"Bad checksum catalog remains read-only");Reject(()=>Apply(corrupt,new([ids[0]])));Reject(()=>SaveService.ExportWorkingCopy(corrupt));
            Reject(()=>SaveService.ReadEventReset(data,"{\"language\":\"bad\"}"));Reject(()=>SaveService.EditEventReset(data,new string(' ',8193)));
            using(var report=JsonDocument.Parse(SaveService.Inspect(allOutput)))Check(!report.RootElement.GetProperty("canEdit").GetBoolean(),"Reset does not open unrelated Gen1 editors");
            Console.WriteLine($"PASS Gen1 event reset {language}/{version}: {map.Count} entries, three languages, all paired/single flag states, raw full-file oracle, atomic rejection, regional checksum and original/export preservation");
        }
        var x=File.ReadAllBytes(".tmp/pkhex-fixtures/X.sav");Reject(()=>Read(x,"en"));Reject(()=>Apply(x,new(["FlagEevee"])));
    }
}
