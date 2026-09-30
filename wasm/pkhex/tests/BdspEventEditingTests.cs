// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class BdspEventEditingTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static SAV8BS Open(byte[] data)=>SaveUtil.GetSaveFile(data.ToArray()) as SAV8BS??throw new Exception("BDSP fixture not detected");
    private static byte[] Apply(byte[] data,EventEdit edit)
    {
        var original=data.ToArray();try{return SaveService.EditEvents(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.EventEdit));}
        finally{Check(data.SequenceEqual(original),"Original immutable on success or rejection");}
    }
    private static EventCatalog Read(byte[] data,string lang)=>JsonSerializer.Deserialize(SaveService.ReadEvents(data,JsonSerializer.Serialize(new EventQuery(lang),SaveJsonContext.Default.EventQuery)),SaveJsonContext.Default.EventCatalog)!;
    private static EventDiff Diff(byte[] a,byte[] b)=>JsonSerializer.Deserialize(SaveService.CompareEvents(a,JsonSerializer.Serialize(new EventCompareQuery(Convert.ToBase64String(b)),SaveJsonContext.Default.EventCompareQuery)),SaveJsonContext.Default.EventDiff)!;
    private static void Reject(Action action){try{action();throw new Exception("Invalid BDSP event accepted");}catch(ArgumentException){}catch(JsonException){}}
    public static void Run()
    {
        var sourceBytes=File.ReadAllBytes(".tmp/pkhex-fixtures/BD.sav");
        var all=new List<byte[]>();
        (Gem8Version Revision,int Length)[] layouts=[(Gem8Version.V1_0,0xE9828),(Gem8Version.V1_1,0xEDC20),(Gem8Version.V1_2,0xEED8C),(Gem8Version.V1_3,0xEF0A4)];
        foreach(var version in new[]{GameVersion.BD,GameVersion.SP})foreach(var layout in layouts)
        {
            var bytes=sourceBytes.AsSpan(0,layout.Length).ToArray();WriteInt32LittleEndian(bytes,(int)layout.Revision);
            var seed=new SAV8BS(bytes){Version=version};
            // Independent raw oracle: the block begins at 4; work/flag/system each store 4-byte values.
            for(int i=0;i<500;i++)WriteInt32LittleEndian(seed.Data[(4+4*i)..],unchecked(i*123456789));
            int[] rawFlags=[0,1,2,-1,int.MinValue,int.MaxValue];
            for(int i=0;i<4000;i++)WriteInt32LittleEndian(seed.Data[(0x7D4+4*i)..],rawFlags[i%rawFlags.Length]);
            for(int i=0;i<1000;i++)WriteInt32LittleEndian(seed.Data[(0x4654+4*i)..],rawFlags[i%rawFlags.Length]);
            var data=seed.Write().ToArray();var original=data.ToArray();var source=Open(data);all.Add(data);
            Check(source.Version==version&&source.SaveRevision==(int)layout.Revision&&SaveChecksums.Valid(source),"Game, revision, size and checksum detection");
            foreach(var lang in new[]{"zh","en","ja"})
            {
                var c=Read(data,lang);Check(c.CanEdit&&!c.UpdatesQr&&c.MinimumValue==int.MinValue&&c.MaximumValue==int.MaxValue&&c.Flags.Length==4000&&c.Values.Length==500&&c.SystemFlags.Length==1000,"Three complete arrays and signed bounds");
                for(int i=0;i<4000;i++)Check(c.Flags[i]==(ReadInt32LittleEndian(source.Data[(0x7D4+4*i)..])==1),"Every ordinary flag uses equals-one semantics");
                for(int i=0;i<1000;i++)Check(c.SystemFlags[i]==(ReadInt32LittleEndian(source.Data[(0x4654+4*i)..])==1),"Every system flag keeps separate raw mapping");
                for(int i=0;i<500;i++)Check(c.Values[i]==ReadInt32LittleEndian(source.Data[(4+4*i)..]),"Every signed work value");
                var language=lang=="zh"?"zh-Hans":lang;
                foreach(var pair in new[]{(Labels:c.FlagLabels,Resource:"flag",Count:4000),(Labels:c.SystemLabels,Resource:"system",Count:1000)})
                {
                    var labels=EventLabelParsing.GetFlags(GameLanguage.GetStrings("bdsp",language,pair.Resource),pair.Count);
                    Check(labels.Count==pair.Labels.Length&&labels.Count>0,"All localized boolean labels loaded");
                    foreach(var l in labels){var actual=pair.Labels.Single(a=>a.Index==l.Index);Check(actual.Name==l.Name&&actual.Category==(int)l.Type,"Exact upstream name and category");}
                }
                var work=EventLabelParsing.GetWork(GameLanguage.GetStrings("bdsp",language,"work"),500);Check(work.Count==c.WorkLabels.Length&&work.Count>0,"All work labels loaded");
                foreach(var l in work){var a=c.WorkLabels.Single(a=>a.Index==l.Index);Check(a.Name==l.Name&&a.Category==(int)l.Type&&a.Presets.SequenceEqual(l.PredefinedValues.Where(v=>!v.IsCustom).Select(v=>new EventPreset(v.Name,v.Value))),"Exact presets without custom sentinel");}
            }
            Check(Apply(data,new([],[])).SequenceEqual(data),"No-op retains abnormal boolean encodings");
            Check(Apply(data,new([new(2,false)],[],[new(2,false)])).SequenceEqual(data),"Unchanged explicit false retains raw 2 values in both flag arrays");
            foreach(int index in new[]{0,1,249,499})foreach(int value in new[]{int.MinValue,int.MinValue+1,-65536,-1,0,1,65535,65536,int.MaxValue})
            {
                var expected=Open(data);WriteInt32LittleEndian(expected.Data[(4+4*index)..],value);
                Check(Apply(data,new([],[new(index,value)])).SequenceEqual(expected.Write().ToArray()),"Signed boundaries match independent full-file oracle");
            }
            foreach(bool system in new[]{false,true})foreach(int index in new[]{0,1,2,3,4,5,system?999:3999})foreach(bool value in new[]{false,true})
            {
                int offset=(system?0x4654:0x7D4)+4*index;var expected=Open(data);
                if((ReadInt32LittleEndian(expected.Data[offset..])==1)!=value)WriteInt32LittleEndian(expected.Data[offset..],value?1:0);
                var edit=system?new EventEdit([],[],[new(index,value)]):new EventEdit([new(index,value)],[]);
                Check(Apply(data,edit).SequenceEqual(expected.Write().ToArray()),"Every raw flag encoding, changed-only semantics and full output");
            }
            var flags=Enumerable.Range(0,4000).Select(i=>new EventFlagChange(i,!source.FlagWork.GetFlag(i))).ToArray();
            var systems=Enumerable.Range(0,1000).Select(i=>new EventFlagChange(i,!source.FlagWork.GetSystemFlag(i))).ToArray();
            var values=Enumerable.Range(0,500).Select(i=>new EventWorkChange(i,~source.FlagWork.GetWork(i))).ToArray();
            var oracle=Open(data);for(int i=0;i<4000;i++)WriteInt32LittleEndian(oracle.Data[(0x7D4+4*i)..],flags[i].Value==true?1:0);for(int i=0;i<1000;i++)WriteInt32LittleEndian(oracle.Data[(0x4654+4*i)..],systems[i].Value==true?1:0);for(int i=0;i<500;i++)WriteInt32LittleEndian(oracle.Data[(4+4*i)..],values[i].Value!.Value);
            var output=Apply(data,new(flags,values,systems));Check(output.SequenceEqual(oracle.Write().ToArray()),"Every array entry and unrelated bytes match complete raw oracle");
            var check=Open(output);Check(check.Version==version&&check.SaveRevision==(int)layout.Revision&&output.Length==layout.Length&&SaveChecksums.Valid(check),"Exact revision, size and checksum preserved");
            Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Exact working-copy download");
            var diff=Diff(data,output);Check(diff.SetFlags.SequenceEqual(flags.Where(f=>f.Value==true).Select(f=>f.Index!.Value))&&diff.ClearedFlags.SequenceEqual(flags.Where(f=>f.Value==false).Select(f=>f.Index!.Value)),"Ordinary flag comparison direction");
            Check(diff.SetSystem.SequenceEqual(systems.Where(f=>f.Value==true).Select(f=>f.Index!.Value))&&diff.ClearedSystem.SequenceEqual(systems.Where(f=>f.Value==false).Select(f=>f.Index!.Value)),"System comparison independent of ordinary flags");
            Check(diff.Values.Length==500&&diff.Values.All(v=>v.Before==source.FlagWork.GetWork(v.Index)&&v.After==~v.Before),"Signed comparison before and after");
            var onlySystem=Diff(data,Apply(data,new([],[],[new(999,true)])));Check(onlySystem.SetFlags.Length==0&&onlySystem.Values.Length==0&&onlySystem.SetSystem.SequenceEqual(new[]{999}),"System-only comparison never disappears");
            Check(Diff(data,data) is {SetFlags.Length:0,ClearedFlags.Length:0,Values.Length:0,SetSystem.Length:0,ClearedSystem.Length:0},"Equal files compare empty");
            foreach(var bad in new EventEdit[]{new(),new([new(4000,true)],[]),new([],[new(500,0)]),new([],[],[new(1000,true)]),new([],[],[new(-1,true)]),new([],[],[new(0,true),new(0,false)]),new([],[],[new(0)]),new([],[],[null!]),new([new(-1,true)],[]),new([],[new(-1,0)])})Reject(()=>Apply(data,bad));
            foreach(var value in new[]{"2147483648","-2147483649","1.5","null"})Reject(()=>SaveService.EditEvents(data,"{\"flags\":[],\"values\":[{\"index\":0,\"value\":"+value+"}]}"));
            var atomic=Open(data);var before=atomic.Data.ToArray();Reject(()=>EventEditing.Apply(atomic,new([new(0,true)],[new(0,1)],[new(1000,true)])));Check(before.SequenceEqual(atomic.Data.ToArray()),"Invalid system flag rejects entire mixed patch before any write");
            var corrupt=data.ToArray();corrupt[4]^=1;Check(!Read(corrupt,"zh").CanEdit,"Checksum failure keeps read-only catalog");Reject(()=>Apply(corrupt,new([],[],[new(0,true)])));Reject(()=>SaveService.ExportWorkingCopy(corrupt));
            Check(data.SequenceEqual(original),"All public operations preserve input");
            Console.WriteLine($"PASS {version} events {layout.Revision}: all three arrays, signed edges, abnormal bool preservation, localized resources, full raw oracle, atomic rejection, independent system diff and exact revision export");
        }
        Check(Diff(all[0],all[3]) is {SetFlags.Length:0,ClearedFlags.Length:0,Values.Length:0,SetSystem.Length:0,ClearedSystem.Length:0},"Same-game revision comparison follows Core");
        Reject(()=>Diff(all[0],all[4]));
    }
}
