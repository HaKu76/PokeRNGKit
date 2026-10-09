// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Underground4EditingTests
{
    private static readonly int[] Offsets=[0,4,8,12,16,24,28,32,36,40,44,48,52];
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Underground4 request accepted");}catch(ArgumentException){}}
    private static SAV4Sinnoh Open(byte[] data)=>SaveUtil.GetSaveFile(data.ToArray())as SAV4Sinnoh??throw new Exception("Sinnoh fixture not recognized");
    private static Ug4Catalog Read(byte[] data)=>JsonSerializer.Deserialize(SaveService.ReadUnderground4(data),SaveJsonContext.Default.Ug4Catalog)!;
    private static Ug4Preview Preview(byte[] data,Ug4Edit edit)=>JsonSerializer.Deserialize(SaveService.PreviewUnderground4(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Ug4Edit)),SaveJsonContext.Default.Ug4Preview)!;
    private static byte[] Apply(byte[] data,Ug4Edit edit){var original=data.ToArray();try{var preview=Preview(data,edit);return SaveService.EditUnderground4(data,JsonSerializer.Serialize(preview.Request,SaveJsonContext.Default.Ug4Edit));}finally{Check(data.SequenceEqual(original),"Underground original immutable");}}
    private static Span<byte> Pouch(SAV4Sinnoh s,string kind)=>kind switch{"goods"=>s.GetUGI_Goods(),"spheres"=>s.GetUGI_Spheres(),"traps"=>s.GetUGI_Traps(),_=>s.GetUGI_Treasures()};
    private static string[] Names(GameStrings s,string kind)=>kind switch{"goods"=>s.uggoods,"spheres"=>s.ugspheres,"traps"=>s.ugtraps,_=>s.ugtreasures};
    private static void Compare(byte[] bytes,Ug4Edit edit,Action<SAV4Sinnoh> mutate){var s=Open(bytes);mutate(s);var output=Apply(bytes,edit);Check(output.SequenceEqual(s.Write().ToArray()),"Underground whole-file parity and hidden/adjacent/spare partition protection");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Underground exact complete export");}
    private static void Resave(SAV4Sinnoh s,string kind,GameStrings language){var list=Names(language,kind);var old=Pouch(s,kind).ToArray();var output=Pouch(s,kind);output.Clear();int n=0;for(int i=0;i<40;i++){int id=old[i]<list.Length?old[i]:0;int next=Array.IndexOf(list,list[id]);if(next<=0)continue;output[n]=(byte)next;if(kind=="spheres")output[n+40]=old[i+40];n++;}}
    public static void Run()
    {
        foreach(string game in new[]{"D","Pt"})
        {
            var s=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{game}.sav"));int stats=game=="D"?0x3A2C:0x3CB4;for(int i=-1;i<57;i++)s.General[stats+i]=(byte)(i*37+31);foreach(string kind in new[]{"goods","spheres","traps","treasures"}){var raw=Pouch(s,kind);for(int i=0;i<raw.Length;i++)raw[i]=(byte)(i%7==0?0:i%5==0?255:i%8);}
            var bytes=s.Write().ToArray();var original=bytes.ToArray();var c=Read(bytes);Check(c.CanEdit&&bytes.SequenceEqual(original)&&c.Stats.Length==13&&c.Pouches.Length==4&&c.Pouches.All(p=>p.Slots.Length==40),"Underground complete immutable catalog");for(int id=0;id<13;id++)Check(c.Stats[id].Id==id&&c.Stats[id].Value==ReadUInt32LittleEndian(s.General[(stats+Offsets[id])..]),"Underground exact stat offsets/old uint values");
            foreach(string lang in new[]{"zh","en","ja"})
            {
                var strings=GameInfo.GetStrings(lang=="zh"?"zh-Hans":lang);
                for(int id=0;id<13;id++)foreach(uint value in new[]{0u,999999u}){int index=id;Compare(bytes,new("stats",c.SourceHash,lang,Stats:[new(id,value)]),x=>WriteUInt32LittleEndian(x.General[(stats+Offsets[index])..],value));}
                foreach(var pouch in c.Pouches)
                {
                    var names=Names(strings,pouch.Kind);int item=Enumerable.Range(1,names.Length-1).First(i=>!string.IsNullOrEmpty(names[i]));var all=Enumerable.Range(0,40).Select(id=>new Ug4SlotEdit(id,id%2==0?item:0)).ToArray();Compare(bytes,new("pouch",c.SourceHash,lang,Kind:pouch.Kind,Slots:all),x=>{for(int id=0;id<40;id++)Pouch(x,pouch.Kind)[id]=(byte)(id%2==0?item:0);});
                    Compare(bytes,new("resavePouch",c.SourceHash,lang,Kind:pouch.Kind),x=>Resave(x,pouch.Kind,strings));
                }
                Compare(bytes,new("resave",c.SourceHash,lang),x=>{for(int id=0;id<13;id++){int at=stats+Offsets[id];WriteUInt32LittleEndian(x.General[at..],Math.Min(ReadUInt32LittleEndian(x.General[at..]),999999u));}foreach(string kind in new[]{"goods","spheres","traps","treasures"})Resave(x,kind,strings);});
                var sphereNames=strings.ugspheres;int sphere=Enumerable.Range(1,sphereNames.Length-1).First(i=>!string.IsNullOrEmpty(sphereNames[i]));
                foreach(var (text,value) in new[]{("-1",255),("-9",247),("+9",9),(" 9",9),("9 ",9),("01",1),("99",99),("0",0)}){Compare(bytes,new("pouch",c.SourceHash,lang,Kind:"spheres",Slots:[new(39,sphere,text)]),x=>{x.GetUGI_Spheres()[39]=(byte)sphere;x.GetUGI_Spheres()[79]=(byte)value;});}
                foreach(string text in new[]{""," ","xx","-"})Compare(bytes,new("pouch",c.SourceHash,lang,Kind:"spheres",Slots:[new(0,sphere,text)]),x=>{x.GetUGI_Spheres()[0]=0;x.GetUGI_Spheres()[40]=0;});
                var old=Open(bytes);old.GetUGI_Spheres()[40]=255;var oldBytes=old.Write().ToArray();Compare(oldBytes,new("pouch",Read(oldBytes).SourceHash,lang,Kind:"spheres",Slots:[new(0,sphere,"255")]),x=>x.GetUGI_Spheres()[0]=(byte)sphere);
            }
            Ug4Edit[] invalid=[new("stats",c.SourceHash,"en",Stats:[]),new("stats",c.SourceHash,"en",Stats:[new(13,0)]),new("stats",c.SourceHash,"en",Stats:[new(0,1000000)]),new("stats",c.SourceHash,"en",Stats:[new(0,0),new(0,1)]),new("pouch",c.SourceHash,"en",Kind:"goods",Slots:[new(40,0)]),new("pouch",c.SourceHash,"en",Kind:"goods",Slots:[new(0,0,"1")]),new("pouch",c.SourceHash,"en",Kind:"spheres",Slots:[new(0,0,"100")]),new("pouch",c.SourceHash,"en",Kind:"spheres",Slots:[new(0,0),new(0,1)]),new("resave",c.SourceHash,"xx"),new("resave",new string('0',64),"en"),new("resave",c.SourceHash,"en",Kind:"goods")];foreach(var edit in invalid){Reject(()=>Preview(bytes,edit));var local=Open(bytes);var before=local.Data.ToArray();Reject(()=>Underground4Editing.Prepare(local,edit,c.SourceHash));Check(before.SequenceEqual(local.Data),"Underground invalid requests are atomic");}
            var frozen=Preview(bytes,new("stats",c.SourceHash,"en",Stats:[new(0,0)])).Request;Reject(()=>SaveService.EditUnderground4(bytes,JsonSerializer.Serialize(frozen with {TargetHash=null},SaveJsonContext.Default.Ug4Edit)));Reject(()=>SaveService.EditUnderground4(bytes,JsonSerializer.Serialize(frozen with {TargetHash=new string('0',64)},SaveJsonContext.Default.Ug4Edit)));
            Console.WriteLine($"PASS Underground4 {game}: 13 score offsets/bounds, all 160 item positions/three languages, independent resave/compaction, signed/empty/invalid/old sphere sizes, protected hole and fields, frozen previews, atomic requests, original and whole-file parity");
        }
        Reject(()=>SaveService.ReadUnderground4(File.ReadAllBytes(".tmp/pkhex-fixtures/HG.sav")));
    }
}
