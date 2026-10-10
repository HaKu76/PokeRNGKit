// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using System.Buffers.Binary;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class HallOfFame6EditingTests
{
    private static void Check(bool b,string message){if(!b)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Hall6 edit accepted");}catch(ArgumentException){}}
    private static SAV6 Open(byte[] data)=>(SAV6)SaveUtil.GetSaveFile(data.ToArray())!;
    private static HallOfFame6 Fame(SAV6 s)=>((ISaveBlock6Main)s).HallOfFame;
    private static Hall6Catalog Read(byte[] data)=>JsonSerializer.Deserialize(SaveService.ReadHall6(data),SaveJsonContext.Default.Hall6Catalog)!;
    private static Hall6Preview Preview(byte[] data,Hall6Edit edit)=>JsonSerializer.Deserialize(SaveService.PreviewHall6(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Hall6Edit)),SaveJsonContext.Default.Hall6Preview)!;
    private static byte[] Apply(byte[] data,Hall6Edit edit){var original=data.ToArray();var p=Preview(data,edit);var result=SaveService.EditHall6(data,JsonSerializer.Serialize(p.Request,SaveJsonContext.Default.Hall6Edit));Check(data.SequenceEqual(original),"Hall6 original immutable");Check(p.Result.SourceHash==Br4Editing.Hash(result)&&p.Request.TargetHash==p.Result.SourceHash,"Hall6 full-file frozen target");Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0,data.Length).Where(i=>data[i]!=result[i])),"Hall6 exact changed bytes");Check(SaveService.ExportWorkingCopy(result).SequenceEqual(result),"Hall6 complete export");return result;}
    private static void Compare(byte[] data,Hall6Edit e,Action<SAV6> oracle){var s=Open(data);oracle(s);Check(Apply(data,e).SequenceEqual(s.Write().ToArray()),"Hall6 independent full-file oracle");}
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.X,GameVersion.Y,GameVersion.OR,GameVersion.AS}){
            var s=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{(version is GameVersion.X or GameVersion.Y?"X":"OR")}.sav"));s.Version=version;s.Language=2;var f=Fame(s);f.Data.Fill(0xA6);
            for(int t=0;t<16;t++){for(int m=0;m<6;m++){var p=new HallFame6Entity(f.GetEntity(t,m),2){Species=25,HeldItem=0,Move1=1,Move2=2,Move3=3,Move4=4,Form=0,Gender=0,Level=50,IsShiny=false,IsNicknamed=true,Nickname="Pika",OriginalTrainerName="Trainer",OriginalTrainerGender=1};}var idx=new HallFame6Index(f.GetEntry(t)[^4..]){ClearIndex=1024,Year=1,Month=2,Day=3,HasData=true};}
            var data=s.Write().ToArray();var original=data.ToArray();var c=Read(data);Check(c.CanEdit&&c.Teams.Length==16&&c.Teams.All(t=>t.Members.Length==6),"Hall6 all real slots");Check(c.Species.All(v=>v.Name.Zh.Length>0&&v.Name.En.Length>0&&v.Name.Ja.Length>0)&&c.Items.Length>0&&c.Moves.Length>0,"Hall6 complete localized candidates");
            for(int t=0;t<16;t++)for(int m=0;m<6;m++){
                var e=new Hall6Edit("patch",c.SourceHash,t,m,[new("TrainerGender","0"),new("Sid","99999"),new("Tid",""),new("Ec","x1A!b?"),new("Level","999"),new("Shiny","1"),new("TrainerName","♀OT"),new("Nickname","♂Nick")]);int team=t,member=m;
                Compare(data,e,x=>{var p=new HallFame6Entity(Fame(x).GetEntity(team,member),2){EncryptionConstant=0x1AB,TID16=0,SID16=65535,Level=100,IsShiny=true,Nickname="♂Nick",OriginalTrainerName="♀OT",OriginalTrainerGender=0};});
            }
            for(int t=1;t<16;t++){int team=t;Compare(data,new("delete",c.SourceHash,t),x=>{var block=Fame(x).Data;int start=team*436;block.Slice(start+436,(15-team)*436).CopyTo(block[start..]);block.Slice(15*436,436).Clear();});}
            Compare(data,new("patch",c.SourceHash,0,0,[new("ClearIndex","999"),new("Date","2050-12-31")]),x=>{var raw=Fame(x).GetEntry(0)[^4..];uint old=BinaryPrimitives.ReadUInt32LittleEndian(raw);uint next=(old&0x80000000)|255u|(50u<<14)|(12u<<22)|(31u<<26);BinaryPrimitives.WriteUInt32LittleEndian(raw,next);});
            Compare(data,new("patch",c.SourceHash,0,0,[new("Species","1"),new("Nicknamed","0")]),x=>{var p=new HallFame6Entity(Fame(x).GetEntity(0,0),2){Species=1,Form=0,IsNicknamed=false,Nickname=SpeciesName.GetSpeciesNameGeneration(1,2,6)};});
            Compare(data,new("patch",c.SourceHash,0,0,[new("Gender","1")]),x=>{var raw=Fame(x).GetEntity(0,0);uint old=BinaryPrimitives.ReadUInt32LittleEndian(raw[20..]);BinaryPrimitives.WriteUInt32LittleEndian(raw[20..],(old&~(3u<<5))|(1u<<5));});
            Compare(data,new("resave",c.SourceHash,0,0),x=>{var p=new HallFame6Entity(Fame(x).GetEntity(0,0),2);string nick=p.Nickname,ot=p.OriginalTrainerName;p.Nickname=nick;p.OriginalTrainerName=ot;var idx=new HallFame6Index(Fame(x).GetEntry(0)[^4..]){ClearIndex=102};});
            var twelve=Open(data);var p12=new HallFame6Entity(Fame(twelve).GetEntity(0,0),2){Nickname="123456789012"};var full=twelve.Write().ToArray();var fullc=Read(full);
            Compare(full,new("trash",fullc.SourceHash,0,0,Trash:new("prepare")),x=>{var raw=Fame(x).GetEntity(0,0);raw[0x30]=0;raw[0x31]=0;});
            var raw26=Convert.FromHexString(c.Teams[0].Members[0].TrashHex);raw26[24]=0x41;raw26[25]=0;
            Compare(data,new("trash",c.SourceHash,0,0,Trash:new("hex",Hex:Convert.ToHexString(raw26))),x=>raw26.CopyTo(Fame(x).GetEntity(0,0).Slice(24,26)));
            Compare(data,new("trash",c.SourceHash,0,0,Trash:new("clear")),x=>Fame(x).GetEntity(0,0).Slice(24+10,26-10).Clear());
            Compare(data,new("trash",c.SourceHash,0,0,Trash:new("text",Text:"New")),x=>{var raw=Fame(x).GetEntity(0,0);var bytes=raw.Slice(24,26).ToArray();StringConverter6.SetString(bytes,"New",3,2,StringConverterOption.None);var entry=new HallFame6Entity(raw,2){Nickname="New",OriginalTrainerName="Trainer"};var idx=new HallFame6Index(Fame(x).GetEntry(0)[^4..]){ClearIndex=102};bytes.CopyTo(raw.Slice(24,26));});
            Compare(data,new("trash",c.SourceHash,0,0,Trash:new("layer",Species:1,Language:2,Generation:6,UiLanguage:"en")),x=>{var raw=Fame(x).GetEntity(0,0);var bytes=new byte[26];int n=StringConverter6.SetString(bytes,"Bulbasaur",9,2,StringConverterOption.None);bytes.AsSpan(10,n-10).CopyTo(raw.Slice(24+10,n-10));});
            foreach(int generation in new[]{0,100}){var req=new Hall6Edit("trash",c.SourceHash,0,0,Trash:new("layer",Species:1,Language:2,Generation:generation,UiLanguage:"en"));var result=Apply(data,req);Check(Read(result).Teams[0].Members[0].Nickname=="Pika","Hall6 generation endpoints retain visible text");}
            var norm=Open(data);var np=new HallFame6Entity(Fame(norm).GetEntity(0,0),2){Gender=3,Level=127,HeldItem=65535,Move1=65535};var normData=norm.Write().ToArray();var nc=Read(normData);Compare(normData,new("resave",nc.SourceHash,0,0),x=>{var p=new HallFame6Entity(Fame(x).GetEntity(0,0),2){Gender=2,Level=100,HeldItem=0,Move1=0,Nickname="Pika",OriginalTrainerName="Trainer"};var i=new HallFame6Index(Fame(x).GetEntry(0)[^4..]){ClearIndex=102};});
            // Invalid raw dates and unknown old values remain readable; unrelated patches protect them.
            var strange=Open(data);var badIdx=new HallFame6Index(Fame(strange).GetEntry(1)[^4..]){Month=0,Day=31};var oldMember=new HallFame6Entity(Fame(strange).GetEntity(1,0),2){Gender=3,Form=31,Level=127,HeldItem=65535,Move1=65535};var oldData=strange.Write().ToArray();var oldc=Read(oldData);Check(oldc.Teams[1].Date is null&&!oldc.Teams[1].DateEditable&&oldc.Teams[1].Members[0].Gender==3,"Hall6 old raw read preservation");Compare(oldData,new("patch",oldc.SourceHash,1,0,[new("Tid","7")]),x=>BinaryPrimitives.WriteUInt16LittleEndian(Fame(x).GetEntity(1,0)[16..],7));Reject(()=>Preview(oldData,new("resave",oldc.SourceHash,1,0)));
            var holes=Open(data);new HallFame6Entity(Fame(holes).GetEntity(0,0),2){Species=0};for(int i=2;i<6;i++)new HallFame6Entity(Fame(holes).GetEntity(0,i),2){Species=0};var holeData=holes.Write().ToArray();var hc=Read(holeData);Check(hc.Teams[0].VisibleMembers==1&&hc.Teams[0].Members[1].Species==25&&!hc.Teams[0].Members[1].Editable,"Hall6 source count-based visibility with holes");Reject(()=>Preview(holeData,new("patch",hc.SourceHash,0,1,[new("Tid","1")])));
            var good=new Hall6Edit("patch",c.SourceHash,0,0,[new("Tid","1")]);foreach(var e in new[]{good with{Team=-1},good with{Team=16},good with{Member=6},good with{Fields=[]},good with{Fields=[new("Tid","1"),new("Tid","2")]},good with{Fields=[new("Nickname","1234567890123")]},good with{Fields=[new("Tid","123456")]},good with{Fields=[new("Tid","-1")]},good with{Fields=[new("Date","2051-01-01")]},good with{Fields=[new("Species","65535")]},good with{Fields=[new("missing","0")]},good with{SourceHash=new string('0',64)},good with{Action="delete",Member=null,Fields=null},good with{Action="trash",Fields=null,Trash=new("hex",Hex:"00")}})Reject(()=>Preview(data,e));Reject(()=>SaveService.EditHall6(data,JsonSerializer.Serialize(good,SaveJsonContext.Default.Hall6Edit)));var frozen=Preview(data,good).Request;Reject(()=>SaveService.EditHall6(data,JsonSerializer.Serialize(frozen with{TargetHash=new string('0',64)},SaveJsonContext.Default.Hall6Edit)));
            var corrupt=data.ToArray();corrupt[0x100]^=1;var cc=Read(corrupt);Check(!cc.CanEdit,"Hall6 checksum gate");Reject(()=>Preview(corrupt,good with{SourceHash=cc.SourceHash}));Check(data.SequenceEqual(original),"Hall6 immutable reads and rejections");
            Console.WriteLine($"PASS {version}: 16x6 physical slots, source masks/limits and nickname linkage, all deletions, raw dates/holes/flags, 26-byte nickname boundary, full-file frozen oracles and atomic rejection");
        }
        Reject(()=>SaveService.ReadHall6(File.ReadAllBytes(".tmp/pkhex-fixtures/B2.sav")));
    }
}
