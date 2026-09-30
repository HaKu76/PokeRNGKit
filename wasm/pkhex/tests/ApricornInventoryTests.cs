// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class ApricornInventoryTests
{
    private static void Check(bool value, string message) { if (!value) throw new Exception(message); }
    private static byte[] Apply(byte[] input, BagOperation edit)
    {
        var original = input.ToArray();
        try { return SaveService.EditInventoryBatch(input, JsonSerializer.Serialize(edit, SaveJsonContext.Default.BagOperation)); }
        finally { Check(input.SequenceEqual(original), "Apricorn input preserved on success and rejection"); }
    }
    private static void Reject(byte[] input, BagOperation edit)
    {
        try { Apply(input,edit); throw new Exception("Invalid apricorn action accepted"); } catch (ArgumentException) { }
    }
    public static void Run()
    {
        foreach (var version in new[] { GameVersion.HG, GameVersion.SS })
        {
            var seed = (SAV4HGSS)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/HG.sav"))!;
            seed.Version = version;
            for(int i=0;i<9;i++) seed.General[0xE557+i] = (byte)(201+i);
            var input=seed.Write().ToArray(); var original=input.ToArray();
            var report=JsonSerializer.Deserialize(SaveService.ReadInventory(input),SaveJsonContext.Default.BagReport)!;
            var items=report.Apricorns!;
            int[] ids=[485,487,486,488,489,490,491];
            Check(items.Length==7 && items.Select(i=>i.Id).SequenceEqual(ids), "Physical order including yellow/blue");
            for(int i=0;i<7;i++)
            {
                Check(items[i].Index==i && items[i].Count==202+i && items[i].Sprite==$"bitem_{ids[i]}","Counts, indices and local sprites");
                Check(items[i].Name.Zh==GameInfo.GetStrings("zh-Hans").Item[ids[i]] && items[i].Name.En==GameInfo.GetStrings("en").Item[ids[i]] && items[i].Name.Ja==GameInfo.GetStrings("ja").Item[ids[i]],"Exact three-language names");
            }
            for(int value=0;value<=255;value++)
            {
                var values=Enumerable.Range(0,7).Select(i=>(value+i*31)%256).ToArray();
                var output=Apply(input,new(-1,"apricornEdit",ApricornValues:values));
                var expected=(SAV4HGSS)SaveUtil.GetSaveFile(input.ToArray())!;
                for(int i=0;i<7;i++) expected.General[0xE558+i]=(byte)values[i];
                Check(output.SequenceEqual(expected.Write().ToArray()),"Full serialized file vs independent seven-byte oracle");
                var actual=(SAV4HGSS)SaveUtil.GetSaveFile(output.ToArray())!;
                Check(actual.ChecksumsValid && Enumerable.Range(0,7).All(i=>actual.GetApricornCount(i)==values[i]),"All 256 values in every physical slot round-trip");
            }
            foreach(var action in new[]{"apricornFill","apricornClear"})
            {
                var expected=(SAV4HGSS)SaveUtil.GetSaveFile(input.ToArray())!;
                for(int i=0;i<7;i++) expected.SetApricornCount(i,action=="apricornFill"?99:0);
                Check(Apply(input,new(-1,action)).SequenceEqual(expected.Write().ToArray()),"Exact desktop bulk output");
            }
            foreach(var edit in new BagOperation[] {
                new(-1,"apricornEdit"),new(-1,"apricornEdit",ApricornValues:[]),new(-1,"apricornEdit",ApricornValues:new int[8]),
                new(-1,"apricornEdit",ApricornValues:[-1,0,0,0,0,0,0]),new(-1,"apricornEdit",ApricornValues:[256,0,0,0,0,0,0]),
                new(0,"apricornFill"),new(-1,"apricornFill",Count:99),new(-1,"apricornClear",Shuffle:true),new(-1,"apricornFill",Advanced:true),
                new(-1,"apricornFill",Language:"fr"),new(-1,"apricornFill",ApricornValues:new int[7]),new(-1,"apricornSort"),
                new(0,"clear",ApricornValues:new int[7]) }) Reject(input,edit);
            // Ordinary inventory actions also preserve the separately stored apricorn pouch.
            var cleared=Apply(input,new(0,"clear"));
            var normal=(SAV4HGSS)SaveUtil.GetSaveFile(cleared.ToArray())!;
            Check(normal.General.Slice(0xE557,9).SequenceEqual(seed.General.Slice(0xE557,9)),"Bag actions preserve apricorns and neighboring bytes");
            Check(input.SequenceEqual(original),"Read preserves original");
            Console.WriteLine($"PASS {version}: all 256 values in seven slots, item order/names/sprites, desktop bulk parity, complete-file preservation, invalid actions and ordinary bag coexistence");
        }
        foreach(var version in new[]{"D","Pt","E","X","OR","SN","BD"})
        {
            var input=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");
            var report=JsonSerializer.Deserialize(SaveService.ReadInventory(input),SaveJsonContext.Default.BagReport)!;
            Check(report.Apricorns is null,"No apricorn capability outside HGSS");
            Reject(input,new(-1,"apricornFill"));
        }
    }
}
