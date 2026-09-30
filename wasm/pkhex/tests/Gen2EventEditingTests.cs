// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class Gen2EventEditingTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static SAV2 Open(byte[] data)=>SaveUtil.GetSaveFile(data.ToArray()) as SAV2??throw new Exception("Gen2 fixture not detected");
    private static byte[] Apply(byte[] data,EventEdit edit)
    {
        var original=data.ToArray();try{return SaveService.EditEvents(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.EventEdit));}
        finally{Check(data.SequenceEqual(original),"Original isolated on success and rejection");}
    }
    private static void Reject(Action action){try{action();throw new Exception("Invalid Gen2 event edit accepted");}catch(ArgumentException){}}
    private static EventCatalog Read(byte[] data,string language)=>JsonSerializer.Deserialize(SaveService.ReadEvents(data,JsonSerializer.Serialize(new EventQuery(language),SaveJsonContext.Default.EventQuery)),SaveJsonContext.Default.EventCatalog)!;
    private static EventDiff Diff(byte[] a,byte[] b)=>JsonSerializer.Deserialize(SaveService.CompareEvents(a,JsonSerializer.Serialize(new EventCompareQuery(Convert.ToBase64String(b)),SaveJsonContext.Default.EventCompareQuery)),SaveJsonContext.Default.EventDiff)!;
    public static void Run()
    {
        var examples=new List<byte[]>();
        // Flag offsets are taken from SAV2Offsets' five layout branches, independently of the adapter.
        (LanguageID Language,GameVersion Version,int Flags)[] layouts=[
            (LanguageID.English,GameVersion.GS,0x261F),(LanguageID.English,GameVersion.C,0x2600),
            (LanguageID.Japanese,GameVersion.GS,0x2600),(LanguageID.Japanese,GameVersion.C,0x25E2),
            (LanguageID.Korean,GameVersion.GS,0x25F7)];
        foreach(var layout in layouts)
        {
            var seed=new SAV2(layout.Language,layout.Version){OT="TEST"};
            var pokemon=seed.BlankPKM;pokemon.Species=25;pokemon.Nickname="PIKA";pokemon.OriginalTrainerName="A";pokemon.CurrentLevel=5;
            seed.SetBoxSlotAtIndex(pokemon,0,0);seed.PartyData=[pokemon];
            for(int i=0;i<256;i++)seed.Data[layout.Flags-256+i]=(byte)i;
            for(int i=0;i<250;i++)seed.Data[layout.Flags+i]=(byte)(i*37+11);
            var full=seed.Write().ToArray();
            foreach(var length in seed.Japanese?new[]{0x10000}:new[]{0x8000,0x10000})
            {
                var data=full.AsSpan(0,length).ToArray();var original=data.ToArray();var source=Open(data);examples.Add(data);
                Check(source.Version==layout.Version&&source.Japanese==seed.Japanese&&source.Korean==seed.Korean,"Version and regional layout detection");
                Check(SaveChecksums.Valid(source),"Regional checksums valid");
                foreach(var lang in new[]{"zh","en","ja"})
                {
                    var c=Read(data,lang);Check(c.Flags.Length==2000&&c.Values.Length==256&&c.MaximumValue==255&&c.CanEdit&&!c.UpdatesQr,"Byte capability and complete arrays");
                    for(int i=0;i<2000;i++)Check(c.Flags[i]==((source.Data[layout.Flags+(i>>3)]&(1<<(i&7)))!=0),"Every flag bit matches raw layout");
                    for(int i=0;i<256;i++)Check(c.Values[i]==source.Data[layout.Flags-256+i],"Every byte value matches raw layout");
                    Check(c.FlagLabels.All(l=>l.Index>=0&&l.Index<2000)&&c.WorkLabels.All(l=>l.Index>=0&&l.Index<256&&l.Presets.All(p=>p.Value<=255)),"Localized labels and presets obey Gen2 limits");
                }
                Check(data.SequenceEqual(original),"Read is immutable");
                Check(Apply(data,new([],[])).SequenceEqual(source.Write().ToArray()),"Empty edit follows normal Core serialization");
                // Each byte value at the first, middle and last work positions, using direct raw-byte expected writes.
                foreach(int index in new[]{0,127,255})for(int value=0;value<=255;value++)
                {
                    var expected=Open(data);expected.Data[layout.Flags-256+index]=(byte)value;
                    Check(Apply(data,new([],[new(index,value)])).SequenceEqual(expected.Write().ToArray()),"All byte values preserve adjacent bytes and complete output");
                }
                foreach(int index in new[]{0,1,7,8,1998,1999})foreach(bool value in new[]{false,true})
                {
                    var expected=Open(data);int at=layout.Flags+(index>>3);byte mask=(byte)(1<<(index&7));expected.Data[at]=value?(byte)(expected.Data[at]|mask):(byte)(expected.Data[at]&~mask);
                    Check(Apply(data,new([new(index,value)],[])).SequenceEqual(expected.Write().ToArray()),"Flag edge writes match independent raw-bit oracle");
                }
                var flags=Enumerable.Range(0,2000).Select(i=>new EventFlagChange(i,!source.GetEventFlag(i))).ToArray();var values=Enumerable.Range(0,256).Select(i=>new EventWorkChange(i,255-source.GetWork(i))).ToArray();
                var oracle=Open(data);for(int i=0;i<250;i++)oracle.Data[layout.Flags+i]^=255;for(int i=0;i<256;i++)oracle.Data[layout.Flags-256+i]^=255;
                var output=Apply(data,new(flags,values));Check(output.SequenceEqual(oracle.Write().ToArray()),"All entries and both backup/checksum layouts match full raw oracle");
                var actual=Open(output);Check(SaveChecksums.Valid(actual)&&actual.Version==source.Version&&actual.SaveRevision==source.SaveRevision&&output.Length==data.Length,"Reload preserves version, layout, size and checksums");
                Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Download retains exact working copy");
                var diff=Diff(data,output);Check(diff.SetFlags.SequenceEqual(flags.Where(f=>f.Value==true).Select(f=>f.Index!.Value))&&diff.ClearedFlags.SequenceEqual(flags.Where(f=>f.Value==false).Select(f=>f.Index!.Value)),"Gen2 typed comparison direction");
                Check(diff.Values.Length==256&&diff.Values.All(v=>v.Before==source.GetWork(v.Index)&&v.After==255-v.Before),"Gen2 comparison has byte before/after values");
                Check(Diff(data,data) is {SetFlags.Length:0,ClearedFlags.Length:0,Values.Length:0},"Equal-file comparison");
                foreach(var bad in new EventEdit[]{new([],[new(0,-1)]),new([],[new(0,256)]),new([],[new(0,65535)]),new([],[new(-1,0)]),new([],[new(256,0)]),new([new(2000,true)],[]),new([new(-1,true)],[]),new([new(0,true),new(0,false)],[]),new([],[new(0,0),new(0,1)]),new(),new([new(0)],[]),new([],[new(0)])})Reject(()=>Apply(data,bad));
                var atomic=Open(data);var before=atomic.Data.ToArray();Reject(()=>EventEditing.Apply(atomic,new([new(0,!atomic.GetEventFlag(0))],[new(0,256)])));Check(before.SequenceEqual(atomic.Data.ToArray()),"No partial flag write before invalid byte value");
                var offsets=new SAV2Offsets(source);
                foreach(int offset in new[]{layout.Flags,offsets.OverallChecksumPosition,offsets.OverallChecksumPosition2}.Concat(source.Korean?new[]{0x106B}:Array.Empty<int>()))
                {
                    var corrupt=data.ToArray();corrupt[offset]^=1;Check(!Read(corrupt,"zh").CanEdit,"Corruption disables editing but keeps read catalog");Reject(()=>Apply(corrupt,new([],[new(0,1)])));Reject(()=>SaveService.ExportWorkingCopy(corrupt));
                }
                using(var report=JsonDocument.Parse(SaveService.Inspect(output)))Check(!report.RootElement.GetProperty("canEdit").GetBoolean(),"Adding event capability never opens unrelated GB editors");
                Console.WriteLine($"PASS Gen2 events {layout.Language}/{layout.Version}/{length}: three languages, every flag/work index, all byte values, raw/full-file oracle, backups, regional checksums, atomic rejection, diff and export");
            }
        }
        var gs=examples.First(b=>Open(b).Version==GameVersion.GS);var crystal=examples.First(b=>Open(b).Version==GameVersion.C);Reject(()=>Diff(gs,crystal));
    }
}
