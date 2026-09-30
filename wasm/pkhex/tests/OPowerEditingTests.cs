// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using System.Text.Json;
internal static class OPowerEditingTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static byte[] Apply(byte[] data,OPowerEdit edit)
    {
        var original=data.ToArray();try{return SaveService.EditOPowers(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.OPowerEdit));}
        finally{Check(data.SequenceEqual(original),"O-Power request preserves original on success and rejection");}
    }
    private static void Reject(byte[] data,OPowerEdit edit){try{Apply(data,edit);throw new Exception("Invalid O-Power request accepted");}catch(ArgumentException){}}
    private static OPowerEdit Draft(OPowerCatalog c)=>new("edit",c.Points,c.States.Select(v=>v==1).ToArray(),c.Field1,c.Field2,c.Battle1,c.Battle2);
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.X,GameVersion.Y,GameVersion.OR,GameVersion.AS})
        {
            var seed=SaveUtil.GetSaveFile(File.ReadAllBytes($".tmp/pkhex-fixtures/{(version is GameVersion.X or GameVersion.Y?"X":"OR")}.sav"))!;seed.Version=version;
            var block=OPowerEditing.Block(seed);for(int i=0;i<100;i++)block.Data[i]=(byte)(i*19%256);
            block.Data[0]=255;block.Data[1]=0;block.Data[2]=1;
            var data=seed.Write().ToArray();var original=data.ToArray();
            var catalog=JsonSerializer.Deserialize(SaveService.ReadOPowers(data),SaveJsonContext.Default.OPowerCatalog)!;
            Check(catalog.StateKeys.SequenceEqual(Enum.GetNames<OPower6Index>()[..^1])&&catalog.States.Length==65&&catalog.FieldKeys.Length==10&&catalog.BattleKeys.Length==7,"Complete catalog and physical enum order");
            Check(catalog.States.SequenceEqual(block.Data[..65].ToArray().Select(v=>(int)v))&&catalog.Points==block.Data[65],"Raw source flags and points");
            var draft=Draft(catalog);
            Check(Apply(data,draft).SequenceEqual(data),"Unchanged draft preserves noncanonical flags");
            for(int i=0;i<65;i++)
            {
                var states=draft.States!.ToArray();states[i]=!states[i];var edit=draft with{States=states};
                var expected=SaveUtil.GetSaveFile(data.ToArray())!;OPowerEditing.Block(expected).Data[i]=states[i]?(byte)1:(byte)0;
                Check(Apply(data,edit).SequenceEqual(expected.Write().ToArray()),"Each unlock state changes only its own byte");
            }
            for(int value=0;value<256;value++)
            {
                int[] Values(int count,int step)=>Enumerable.Range(0,count).Select(i=>(value+i*step)%256).ToArray();
                var edit=draft with{Points=value,Field1=Values(10,3),Field2=Values(10,7),Battle1=Values(7,13),Battle2=Values(7,17)};
                var expected=SaveUtil.GetSaveFile(data.ToArray())!;var b=OPowerEditing.Block(expected).Data;b[65]=(byte)value;
                for(int i=0;i<10;i++){b[66+i]=(byte)edit.Field1[i];b[76+i]=(byte)edit.Field2[i];}
                for(int i=0;i<7;i++){b[86+i]=(byte)edit.Battle1[i];b[93+i]=(byte)edit.Battle2[i];}
                var output=Apply(data,edit);
                Check(output.SequenceEqual(expected.Write().ToArray()),"All 256 byte values at each numeric field vs independent offsets and full file");
                Check(SaveUtil.GetSaveFile(output.ToArray())!.ChecksumsValid,"Export checksum");
            }
            foreach(var action in new[]{"unlock","clear"})
            {
                var expected=SaveUtil.GetSaveFile(data.ToArray())!;var b=OPowerEditing.Block(expected);if(action=="unlock")b.UnlockAll();else b.ClearAll();
                var output=Apply(data,new(action));Check(output.SequenceEqual(expected.Write().ToArray()),"Exact Core batch output");
                var actual=OPowerEditing.Block(SaveUtil.GetSaveFile(output.ToArray())!);
                if(action=="unlock")Check(actual.Points==catalog.Points&&actual.Data[..65].ToArray().All(v=>v==1)&&actual.Data[66..].ToArray().All(v=>v==3),"Unlock preserves points and sets every state/value");
                else Check(actual.Data[0]==255&&actual.Data[1..].ToArray().All(v=>v==0),"Clear preserves raw master switch");
            }
            foreach(var edit in new OPowerEdit[]{new("edit"),new("unknown"),draft with{Points=-1},draft with{Points=256},draft with{Points=null},draft with{States=new bool[64]},draft with{States=new bool[66]},draft with{Field1=[]},draft with{Field2=new int[11]},draft with{Battle1=new int[6]},draft with{Battle2=null},draft with{Field1=[0,0,0,0,0,0,0,0,0,256]},draft with{Battle2=[0,0,0,0,0,0,-1]},new("unlock",Points:0),new("clear",States:new bool[65]),new("clear",Field1:[])})Reject(data,edit);
            Check(data.SequenceEqual(original),"Read original preserved");
            Console.WriteLine($"PASS {version}: 65 state edits, all byte values for 35 numbers, full-file raw offset parity, batch semantics, unknown flags, input preservation and invalid requests");
        }
        foreach(var version in new[]{"E","D","HG","SN","US","BD"})
        {
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");Reject(data,new("unlock"));try{SaveService.ReadOPowers(data);throw new Exception("Unsupported O-Power read accepted");}catch(ArgumentException){}
        }
    }
}
