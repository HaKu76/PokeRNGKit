// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class Geonet4EditingTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Geonet4 request accepted");}catch(ArgumentException){}}
    private static SAV4 Open(byte[] data)=>SaveUtil.GetSaveFile(data.ToArray())as SAV4??throw new Exception("Gen4 fixture not recognized");
    private static Geo4Catalog Read(byte[] data)=>JsonSerializer.Deserialize(SaveService.ReadGeonet4(data),SaveJsonContext.Default.Geo4Catalog)!;
    private static byte[] Apply(byte[] data,Geo4Edit edit){var original=data.ToArray();try{return SaveService.EditGeonet4(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Geo4Edit));}finally{Check(data.SequenceEqual(original),"Original immutable on success/rejection");}}
    private static void Compare(byte[] data,Geo4Edit edit,Action<SAV4> mutate){var expected=Open(data);mutate(expected);var output=Apply(data,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"Complete file parity, adjacent fields, hidden points and spare partition");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Exact complete export");}
    private static int Get(SAV4 s,int id)=>s.General[s.Geonet+3+(id/64)*16+(id%64)/4]>>(2*(id%4))&3;
    private static void Set(SAV4 s,int id,int point){int at=s.Geonet+3+(id/64)*16+(id%64)/4,shift=2*(id%4);s.General[at]=(byte)((s.General[at]&~(3<<shift))|(point<<shift));}
    private static void Own(SAV4 s){if(s.Country>0)Set(s,(s.Country-1)*64+s.Region,3);}
    public static void Run()
    {
        foreach(string game in new[]{"D","Pt","HG"})foreach(int country in new[]{0,103,220})
        {
            var s=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{game}.sav"));for(int i=-4;i<3735;i++)s.General[s.Geonet+i]=(byte)(i*19+7);s.Country=country;s.Region=country==0?0:1;s.General[s.Geonet]=0x82;var bytes=s.Write().ToArray();var original=bytes.ToArray();var c=Read(bytes);Check(bytes.SequenceEqual(original)&&c.CanEdit&&c.RawGlobal==0x82&&c.Global&&c.Country==country&&c.Rows.Select(v=>v.Id).Distinct().Count()==c.Rows.Length&&c.Rows.Select(v=>v.Country).Distinct().Count()==233&&c.Rows.All(v=>!string.IsNullOrWhiteSpace(v.CountryName.Zh)&&!string.IsNullOrWhiteSpace(v.RegionName.Ja))&&c.Plans.Length==4,"Read without constructor flag mutation, exact coordinates and three-language names");
            var allPoints=c.Rows.Select(v=>new Geo4Point(v.Id,(v.Point+1)%4)).ToArray();Compare(bytes,new("points",c.SourceHash,allPoints),x=>{foreach(var point in allPoints)Set(x,point.Id!.Value,point.Point!.Value);Own(x);});
            foreach(var row in new[]{c.Rows[0],c.Rows[^1],c.Rows.First(v=>v.Country==103),c.Rows.First(v=>v.Country==220)})for(int p=0;p<4;p++){int point=p;Compare(bytes,new("points",c.SourceHash,[new(row.Id,point)]),x=>{Set(x,row.Id,point);Own(x);});}
            foreach(bool enabled in new[]{false,true})Compare(bytes,new("global",c.SourceHash,Global:enabled),x=>{Own(x);x.General[x.Geonet]=(byte)(enabled?1:0);});
            foreach(string action in new[]{"all","legal","clear","save"})
            {
                var target=Open(bytes);if(action!="save")foreach(var row in c.Rows){if(action=="legal"&&!row.Legal)continue;Set(target,row.Id,action=="clear"?0:2);}Own(target);target.General[target.Geonet]=(byte)(action is "all" or "legal"?1:action=="clear"?(country>0&&country!=103?1:0):1);var source=Open(bytes);var plan=c.Plans.Single(v=>v.Action==action);Check(plan.TargetHex==Convert.ToHexString(Geonet4Editing.Snapshot(target))&&plan.Changed.SequenceEqual(Enumerable.Range(0,233*64).Where(id=>Get(source,id)!=Get(target,id)))&&plan.Counts.SequenceEqual(Enumerable.Range(0,4).Select(p=>c.Rows.Count(v=>Get(target,v.Id)==p))),"Independent full-block plan and all changed physical points");Compare(bytes,new(action,c.SourceHash),x=>target.General.Slice(target.Geonet,3731).CopyTo(x.General.Slice(x.Geonet,3731)));
            }
            int hidden=Enumerable.Range(0,233*64).First(id=>!c.Rows.Any(v=>v.Id==id));Geo4Edit[] invalid=[new("points",c.SourceHash),new("points",c.SourceHash,[]),new("points",c.SourceHash,[new(-1,0)]),new("points",c.SourceHash,[new(hidden,0)]),new("points",c.SourceHash,[new(c.Rows[0].Id,4)]),new("points",c.SourceHash,[new(c.Rows[0].Id,0),new(c.Rows[0].Id,1)]),new("global",c.SourceHash),new("global",c.SourceHash,[new(c.Rows[0].Id,0)],true),new("all",c.SourceHash,Global:true),new("clear",new string('0',64)),new("unknown",c.SourceHash)];foreach(var edit in invalid){Reject(()=>Apply(bytes,edit));var local=Open(bytes);var before=local.General.ToArray();Reject(()=>Geonet4Editing.Apply(local,edit,c.SourceHash));Check(before.SequenceEqual(local.General),"Atomic rejection");}
            Console.WriteLine($"PASS Geonet4 {game} country={country}: all visible point addresses, four colors, raw flag/hidden point protection, own red, all bulk plans, source immutability and complete file parity");
        }
        var hiddenOwn=Open(File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav"));hiddenOwn.Country=233;hiddenOwn.Region=63;hiddenOwn.General[hiddenOwn.Geonet]=130;var hiddenBytes=hiddenOwn.Write().ToArray();var hiddenCatalog=Read(hiddenBytes);Check(hiddenCatalog.OwnValid&&hiddenCatalog.CanEdit&&!hiddenCatalog.Rows.Any(v=>v.Owned),"Representable hidden registered location");Compare(hiddenBytes,new("points",hiddenCatalog.SourceHash,[new(hiddenCatalog.Rows[0].Id,2)]),x=>{Set(x,hiddenCatalog.Rows[0].Id,2);Own(x);});
        var bad=Open(File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav"));bad.Country=255;bad.Region=255;var badBytes=bad.Write().ToArray();var read=Read(badBytes);Check(!read.OwnValid&&!read.CanEdit&&read.Plans.Length==0,"Unrepresentable registered location disables writes without losing read access");Reject(()=>Apply(badBytes,new("all",read.SourceHash)));
    }
}
