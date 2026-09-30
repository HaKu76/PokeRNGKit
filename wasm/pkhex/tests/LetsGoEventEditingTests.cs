// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class LetsGoEventEditingTests
{
    private static void Check(bool condition,string message){if(!condition)throw new Exception(message);}
    private static SAV7b Open(byte[] data)=>SaveUtil.GetSaveFile(data.ToArray()) as SAV7b??throw new Exception("LGPE fixture not detected");
    private static byte[] Apply(byte[] data,EventEdit edit)
    {
        var original=data.ToArray();try{return SaveService.EditEvents(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.EventEdit));}
        finally{Check(data.SequenceEqual(original),"Original remains immutable");}
    }
    private static EventCatalog Read(byte[] data,string lang)=>JsonSerializer.Deserialize(SaveService.ReadEvents(data,JsonSerializer.Serialize(new EventQuery(lang),SaveJsonContext.Default.EventQuery)),SaveJsonContext.Default.EventCatalog)!;
    private static EventDiff Diff(byte[] a,byte[] b)=>JsonSerializer.Deserialize(SaveService.CompareEvents(a,JsonSerializer.Serialize(new EventCompareQuery(Convert.ToBase64String(b)),SaveJsonContext.Default.EventCompareQuery)),SaveJsonContext.Default.EventDiff)!;
    private static void Reject(Action action){try{action();throw new Exception("Invalid LGPE event accepted");}catch(ArgumentException){}catch(JsonException){}}
    public static void Run()
    {
        foreach(var version in new[]{"GP","GE"})
        {
            var seed=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav"));
            // Independent byte oracle from SaveBlockAccessor7b (block 3 at 0x1200) and EventWork7b.
            for(int i=0;i<1000;i++)WriteInt32LittleEndian(seed.Data[(0x1200+i*4)..],unchecked(i*123456789));
            for(int i=0;i<512;i++)seed.Data[0x21A0+i]=(byte)(i*37+9);
            seed.Data.Slice(0x23A0,0x660).Fill(0xA5); // Includes title flags and all remaining unrelated block bytes.
            var data=seed.Write().ToArray();var original=data.ToArray();var source=Open(data);
            Check(SaveChecksums.Valid(source),"Valid input checksums");
            foreach(var lang in new[]{"zh","en","ja"})
            {
                var c=Read(data,lang);
                Check(c.CanEdit&&!c.UpdatesQr&&c.MinimumValue==int.MinValue&&c.MaximumValue==int.MaxValue&&c.Flags.Length==4096&&c.Values.Length==1000,"Full signed catalog and independent edit capability");
                Check(c.FlagGroups.SequenceEqual(new EventGroup[]{new(200,0,128),new(201,128,512),new(202,640,1536),new(203,2176,1920)})&&c.WorkGroups.SequenceEqual(new EventGroup[]{new(200,0,32),new(201,32,128),new(202,160,512),new(203,672,256),new(204,928,72)}),"All raw group boundaries and unused slots");
                for(int i=0;i<4096;i++)Check(c.Flags[i]==((source.Data[0x21A0+(i>>3)]&(1<<(i&7)))!=0),"Every raw flag position");
                for(int i=0;i<1000;i++)Check(c.Values[i]==ReadInt32LittleEndian(source.Data[(0x1200+i*4)..]),"Every raw signed value position");
                var language=lang=="zh"?"zh-Hans":lang;
                var labels=new SplitEventEditor<int>(source.Blocks.EventWork,GameLanguage.GetStrings("gg",language,"const"),GameLanguage.GetStrings("gg",language,"flags"));
                var fl=labels.Flag.SelectMany(g=>g.Vars).ToArray();var wl=labels.Work.SelectMany(g=>g.Vars).Cast<EventWork<int>>().ToArray();
                Check(fl.Length==c.FlagLabels.Length&&wl.Length==c.WorkLabels.Length&&fl.Length>0&&wl.Length>0,"All upstream localized labels loaded");
                foreach(var label in fl){var x=c.FlagLabels.Single(l=>l.Index==label.RawIndex);Check(x.Name==label.Name&&x.Category==200+(int)label.Type,"Exact flag name and split category");}
                foreach(var label in wl){var x=c.WorkLabels.Single(l=>l.Index==label.RawIndex);Check(x.Name==label.Name&&x.Category==200+(int)label.Type&&x.Presets.SequenceEqual(label.Options.Where(o=>!o.Custom).Select(o=>new EventPreset(o.Text,o.Value))),"Exact work names and signed presets, without custom sentinel");}
            }
            Check(Apply(data,new([],[])).SequenceEqual(data),"No-op exact output preservation");
            foreach(int index in new[]{0,31,32,159,160,671,672,927,928,999})foreach(int value in new[]{int.MinValue,int.MinValue+1,-65536,-1,0,1,65535,65536,int.MaxValue})
            {
                var expected=Open(data);WriteInt32LittleEndian(expected.Data[(0x1200+index*4)..],value);
                Check(Apply(data,new([],[new(index,value)])).SequenceEqual(expected.Write().ToArray()),"Signed value boundaries and group edges match complete raw-byte oracle");
            }
            foreach(int index in new[]{0,7,8,127,128,639,640,2175,2176,4095})foreach(bool value in new[]{false,true})
            {
                var expected=Open(data);int at=0x21A0+(index>>3);byte mask=(byte)(1<<(index&7));expected.Data[at]=value?(byte)(expected.Data[at]|mask):(byte)(expected.Data[at]&~mask);
                Check(Apply(data,new([new(index,value)],[])).SequenceEqual(expected.Write().ToArray()),"Bit and group edges preserve every other byte");
            }
            var flags=Enumerable.Range(0,4096).Select(i=>new EventFlagChange(i,!source.Blocks.EventWork.GetFlag(i))).ToArray();
            var values=Enumerable.Range(0,1000).Select(i=>new EventWorkChange(i,~source.Blocks.EventWork.GetWork(i))).ToArray();
            var oracle=Open(data);for(int i=0;i<0x11A0;i++)oracle.Data[0x1200+i]^=255;
            var output=Apply(data,new(flags,values));Check(output.SequenceEqual(oracle.Write().ToArray()),"All flags and work values including unused slots match full-file oracle");
            var check=Open(output);Check(check.Version==source.Version&&SaveChecksums.Valid(check)&&output.Length==data.Length,"Output game, size and checksum verified");
            Check(check.Data.Slice(0x23A0,0x660).SequenceEqual(source.Data.Slice(0x23A0,0x660)),"Title flags and unrelated event-block bytes preserved");
            Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Exact working-copy download");
            var diff=Diff(data,output);Check(diff.SetFlags.SequenceEqual(flags.Where(f=>f.Value==true).Select(f=>f.Index!.Value))&&diff.ClearedFlags.SequenceEqual(flags.Where(f=>f.Value==false).Select(f=>f.Index!.Value)),"Core comparison flag direction");
            Check(diff.Values.Length==1000&&diff.Values.All(v=>v.Before==source.Blocks.EventWork.GetWork(v.Index)&&v.After==~v.Before),"Core comparison covers signed and unclassified values");
            Check(Diff(data,data) is {SetFlags.Length:0,ClearedFlags.Length:0,Values.Length:0},"Identical comparison empty");
            foreach(var bad in new EventEdit[]{new(),new([new(-1,true)],[]),new([new(4096,true)],[]),new([],[new(-1,0)]),new([],[new(1000,0)]),new([new(0,true),new(0,false)],[]),new([],[new(0,0),new(0,1)]),new([new(0)],[]),new([],[new(0)]),new([null!],[]),new([],[null!])})Reject(()=>Apply(data,bad));
            foreach(var value in new[]{"2147483648","-2147483649","4294967295","1.5","null"})Reject(()=>SaveService.EditEvents(data,"{\"flags\":[],\"values\":[{\"index\":0,\"value\":"+value+"}]}"));
            var atomic=Open(data);var before=atomic.Data.ToArray();Reject(()=>EventEditing.Apply(atomic,new([new(0,true)],[new(1000,0)])));Check(before.SequenceEqual(atomic.Data.ToArray()),"Invalid later value cannot partially write a flag");
            var corrupt=data.ToArray();corrupt[0x1200]^=1;Check(!Read(corrupt,"zh").CanEdit,"Bad checksums give read-only catalog");Reject(()=>Apply(corrupt,new([],[new(0,1)])));Reject(()=>SaveService.ExportWorkingCopy(corrupt));
            using(var report=JsonDocument.Parse(SaveService.Inspect(output)))Check(!report.RootElement.GetProperty("canEdit").GetBoolean(),"No unrelated LGPE editors enabled");
            Check(data.SequenceEqual(original),"Read, edit and comparison preserve original");
            Console.WriteLine($"PASS {version} events: all 4096 flags/1000 signed values, split groups, 72 unclassified slots, localized resources, raw/full-file oracle, title preservation, atomic rejection, diff and export");
        }
        Reject(()=>Diff(File.ReadAllBytes(".tmp/pkhex-fixtures/GP.sav"),File.ReadAllBytes(".tmp/pkhex-fixtures/GE.sav")));
    }
}
