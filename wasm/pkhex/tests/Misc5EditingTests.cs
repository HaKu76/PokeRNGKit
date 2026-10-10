// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Misc5EditingTests
{
    private static void Check(bool ok,string message){if(!ok)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Misc5 request accepted");}catch(ArgumentException){}}
    private static SAV5 Open(byte[] bytes)=>SaveUtil.GetSaveFile(bytes.ToArray())as SAV5??throw new Exception("Unrecognized Gen5 fixture");
    private static Misc5Catalog Read(byte[] data)=>JsonSerializer.Deserialize(SaveService.ReadMisc5(data),SaveJsonContext.Default.Misc5Catalog)!;
    private static Misc5Preview Preview(byte[] data,Misc5Edit e)=>JsonSerializer.Deserialize(SaveService.PreviewMisc5(data,JsonSerializer.Serialize(e,SaveJsonContext.Default.Misc5Edit)),SaveJsonContext.Default.Misc5Preview)!;
    private static byte[] Apply(byte[] data,Misc5Edit e){var original=data.ToArray();var p=Preview(data,e);var output=SaveService.EditMisc5(data,JsonSerializer.Serialize(p.Request,SaveJsonContext.Default.Misc5Edit));Check(data.SequenceEqual(original),"Misc5 immutable original");Check(Br4Editing.Hash(output)==p.Result.SourceHash&&p.Request.TargetHash==p.Result.SourceHash,"Misc5 frozen complete output");Check(p.ChangedOffsets.SequenceEqual(Enumerable.Range(0,data.Length).Where(i=>data[i]!=output[i])),"Misc5 exact all-byte offsets");Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Misc5 full export");return output;}
    private static void Compare(byte[] data,Misc5Edit e,Action<SAV5> oracle){var save=Open(data);oracle(save);save.Records.EndAccess();save.EntreeForest.EndAccess();var expected=save.Write().ToArray();Check(Apply(data,e).SequenceEqual(expected),"Misc5 independent full-file Core oracle and protected regions");}
    public static void Run()
    {
        foreach(var version in new[]{GameVersion.B,GameVersion.W,GameVersion.B2,GameVersion.W2}){
            var save=Open(File.ReadAllBytes($".tmp/pkhex-fixtures/{(version is GameVersion.B or GameVersion.W?"B":"B2")}.sav"));save.Version=version;
            save.BattleSubway.Flags=0xA5;save.BattleSubway.Data[5]=0xF3;
            save.Entralink.WhiteForestLevel=0;save.Entralink.BlackCityLevel=3;
            save.EntreeForest.StartAccess();foreach(var slot in save.EntreeForest.Slots)slot.RawValue=0xE0000400;save.EntreeForest.Slots[0].RawValue=0xFFFFFFFF;save.EntreeForest.Data[0x849]=0xFF;save.EntreeForest.Data[0x848]=9;save.EntreeForest.EndAccess();
            save.Records.SetRecord32(0,100);save.Records.SetRecord16(99,65535);save.Records.EndAccess();save.Musical.Data[0x264]=0xA5;
            save.Records.GetRecord32(67);WriteUInt32LittleEndian(save.Records.Data[(4+67*4)..],uint.MaxValue);save.Records.EndAccess();
            if(save is SAV5BW bw){bw.Encount.SetRoamerState(0,1);bw.Encount.SetRoamerState(1,0xC3);bw.Encount.SetRoamerState2C(0,0xAB);bw.Encount.Data.Slice(4,Roamer5.SIZE).Fill(0xA5);bw.EventWork.SetWorkRoamer(0xABCD);}
            else{var b=(SAV5B2W2)save;b.Festa.WhiteEXP=49;b.Festa.BlackEXP=49;}
            var data=save.Write().ToArray();var original=data.ToArray();var c=Read(data);var hash=c.SourceHash;
            Check(c.CanEdit&&data.SequenceEqual(original)&&c.Forest.Length==530&&c.Fields.Count(f=>f.Id.StartsWith("record32_"))==68&&c.Fields.Count(f=>f.Id.StartsWith("record16_"))==100,"Misc5 immutable catalog and record counts");
            Check(c.RandomCandidates==(save is SAV5BW?651:578)&&c.Fields.All(f=>f.Name.Zh.Length>0&&f.Name.En.Length>0&&f.Name.Ja.Length>0),"Misc5 actual source pool and three-language labels");
            Check(c.Forest[0].Raw==0xFFFFFFFF&&c.Forest[0].Species==1023&&c.Forest[0].Move==1023&&c.Forest[0].Gender==3&&c.Forest[0].Form==63&&c.Forest.Skip(1).All(f=>f.Raw==0xE0000400)&&c.Fields.Single(f=>f.Id=="forestAreas").Value==9,"Misc5 unknown forest values and unusual bit/area preservation");
            Check(c.Fields.Single(f=>f.Id=="record32_67").Value==uint.MaxValue&&c.ExperienceLimits.Length==(save is SAV5BW?0:1000)&&c.ForestChoices.All(v=>v.Forms.Length>0&&v.Genders.Length>0),"Misc5 old over-cap record and complete Core input metadata");
            int flyOffset=save is SAV5BW?0x204B2:0x20392;int[] fly=save is SAV5BW?[0,1,2,3,4,5,6,7,8,9,15,11,10,13,12,14]:[24,27,25,8,9,10,11,12,13,14,15,16,17,18,21,20,28,26,66,19,5,6,7,22];
            foreach(bool set in new[]{false,true})Compare(data,new("patch",hash,Fields:fly.Select((_,i)=>new Misc5FieldEdit("fly"+i,set?1:0)).ToArray()),s=>{foreach(int bit in fly){int off=flyOffset+(bit>>3),mask=1<<(bit&7);s.Data[off]=(byte)((s.Data[off]&~mask)|(set?mask:0));}});
            Compare(data,new("giveFly",hash),s=>{foreach(int bit in fly)s.Data[flyOffset+(bit>>3)]|=(byte)(1<<(bit&7));});
            foreach(int value in new[]{0,255})Compare(data,new("patch",hash,Fields:[new("currentType",value),new("currentBattle",value)]),s=>{s.BattleSubwayPlay.CurrentType=value;s.BattleSubwayPlay.CurrentBattle=value;});
            foreach(int bit in new[]{0,1,2,4,5,6,7})foreach(int value in new[]{0,1})Compare(data,new("patch",hash,Fields:[new("subwayFlag"+bit,value)]),s=>{s.BattleSubway.Flags=(s.BattleSubway.Flags&~(1<<bit))|(value<<bit);if(bit==7)s.BattleSubway.Flag3=value==1;});
            foreach(bool value in new[]{false,true})Compare(data,new("patch",hash,Fields:[new("npc",value?1:0)]),s=>s.BattleSubway.NPCMet=value);
            string[] routes=["single","double","multiNpc","multiFriends","superSingle","superDouble","superMultiNpc","superMultiFriends"];
            int[] past=[8,10,12,14,18,20,22,24],record=[26,28,30,32,36,38,40,42],sets=[44,46,48,50,54,56,58,60];
            foreach(int value in new[]{0,9999}){
                var fields=routes.SelectMany(id=>new[]{new Misc5FieldEdit(id+"Past",value),new(id+"Record",value),new(id+"Active",1)}).Reverse().ToArray();
                Compare(data,new("patch",hash,Fields:fields),s=>{for(int i=0;i<8;i++){WriteUInt16LittleEndian(s.BattleSubway.Data[past[i]..],(ushort)value);WriteUInt16LittleEndian(s.BattleSubway.Data[record[i]..],(ushort)value);WriteUInt16LittleEndian(s.BattleSubway.Data[sets[i]..],(ushort)(value/7+1));}});
            }
            Compare(data,new("patch",hash,Fields:routes.Select(id=>new Misc5FieldEdit(id+"Active",0)).ToArray()),s=>{foreach(int off in sets)WriteUInt16LittleEndian(s.BattleSubway.Data[off..],0);});
            foreach(int value in new[]{0,999})Compare(data,new("patch",hash,Fields:[new("whiteLevel",value),new("blackLevel",value)]),s=>{s.Entralink.WhiteForestLevel=s.Entralink.BlackCityLevel=(ushort)value;if(s is SAV5B2W2 b){int max=FestaBlock5.GetExpNeededForLevelUp(value)-1;b.Festa.WhiteEXP=(byte)Math.Min((int)b.Festa.WhiteEXP,max);b.Festa.BlackEXP=(byte)Math.Min((int)b.Festa.BlackEXP,max);}});
            foreach(int value in new[]{2,8})Compare(data,new("patch",hash,Fields:[new("forestAreas",value),new("forest9",value==8?1:0)]),s=>{s.EntreeForest.StartAccess();s.EntreeForest.Unlock38Areas=value-2;s.EntreeForest.Unlock9thArea=value==8;});
            foreach(bool value in new[]{false,true})Compare(data,new("patch",hash,Fields:Enumerable.Range(0,100).Select(i=>new Misc5FieldEdit("prop"+i,value?1:0)).ToArray()),s=>{for(int i=0;i<100;i++)s.Musical.SetHasProp(i,value);});
            Compare(data,new("giveProps",hash),s=>s.Musical.UnlockAllMusicalProps());
            foreach(long value in new[]{0L,(long)uint.MaxValue})Compare(data,new("patch",hash,Fields:Enumerable.Range(0,68).Select(i=>new Misc5FieldEdit("record32_"+i,value)).Concat(Enumerable.Range(0,100).Select(i=>new Misc5FieldEdit("record16_"+i,value==0?0:65535))).ToArray()),s=>{for(int i=0;i<68;i++)s.Records.SetRecord32(i,(uint)value);for(int i=0;i<100;i++)s.Records.SetRecord16(i,value==0?(ushort)0:(ushort)65535);});
            Compare(data,new("patch",hash,Forest:Enumerable.Range(0,530).Select(i=>new Misc5ForestEdit(i,Species:25,Move:85,Form:0,Gender:i%2,Animation:i%8)).ToArray()),s=>{var slots=s.EntreeForest.Slots;for(int i=0;i<530;i++){var f=slots[i];f.Species=25;f.Move=85;f.Form=0;f.Gender=(byte)(i%2);f.Animation=(EntreeForestAnimation)(i%8);}});
            Compare(data,new("patch",hash,Forest:Enumerable.Range(0,530).Select(i=>new Misc5ForestEdit(i,Animation:0)).ToArray()),s=>{foreach(var slot in s.EntreeForest.Slots)slot.Animation=0;});
            var random=Preview(data,new("forestRandom",hash));Check(random.Request.FrozenForest?.Length==530&&random.Request.FrozenForest.Select(v=>v.SourceIndex).Distinct().Count()==530,"Misc5 freezes unique source draws");
            var r1=SaveService.EditMisc5(data,JsonSerializer.Serialize(random.Request,SaveJsonContext.Default.Misc5Edit));var r2=SaveService.EditMisc5(data,JsonSerializer.Serialize(random.Request,SaveJsonContext.Default.Misc5Edit));Check(r1.SequenceEqual(r2),"Misc5 confirmation never rerolls");var rs=Open(r1);Check(rs.EntreeForest.Slots.Select(x=>x.RawValue).SequenceEqual(random.Request.FrozenForest!.Select(x=>x.Raw))&&rs.EntreeForest.Unlock9thArea&&rs.EntreeForest.Unlock38Areas==6,"Misc5 frozen raw values and unlocked areas");
            if(save is SAV5BW){foreach(int state in new[]{2,3})Compare(data,new("patch",hash,Fields:[new("roamer0",state)]),s=>{var b=(SAV5BW)s;b.Encount.SetRoamerState(0,(byte)state);b.Encount.Roamer1.Clear();b.Encount.SetRoamerState2C(0,0);});Reject(()=>Preview(data,new("patch",hash,Fields:[new("roamer0",0)])));var raw=Enumerable.Range(0,0x1E8).Select(i=>(byte)i).ToArray();Compare(data,new("importFc",hash,DataBase64:Convert.ToBase64String(raw)),s=>raw.CopyTo(((SAV5BW)s).Forest.ForestCity.Span));Check(SaveService.ExportMisc5Fc(data).SequenceEqual(((SAV5BW)Open(data)).Forest.ForestCity.ToArray()),"Misc5 exact fc5 export");}
            else{Check(c.Missions.Length==45,"Misc5 all mission requirements readable");Compare(data,new("missionUnlockAll",hash),s=>((SAV5B2W2)s).Festa.UnlockAllFunfestMissions());
                foreach(int value in new[]{0,9999})Compare(data,new("patch",hash,Missions:Enumerable.Range(0,45).Select(i=>new Misc5MissionEdit(i,value,value,i%2==0?3:7,true)).ToArray()),s=>{var b=(SAV5B2W2)s;for(int i=0;i<45;i++){var r=b.Festa.GetMissionRecord(i);r.Score=r.Total=value;r.Level=i%2==0?3:7;r.IsNew=true;b.Festa.SetMissionRecord(i,r);}});
                Compare(data,new("giveKeys",hash),s=>{var b=(SAV5B2W2)s;for(int i=0;i<5;i++){var key=(KeyType5)i;b.Keys.SetIsKeyObtained(key,true);b.Keys.SetIsKeyUnlocked(key,true);}});
                Compare(data,new("patch",hash,Fields:[new("whiteLevel",9),new("whiteExp",49)]),s=>{var b=(SAV5B2W2)s;b.Entralink.WhiteForestLevel=9;b.Festa.WhiteEXP=49;b.Festa.BlackEXP=19;});
            }
            foreach(var e in new Misc5Edit[]{new("patch",hash),new("patch",hash,Fields:[]),new("patch",hash,Fields:[new("unknown",0)]),new("patch",hash,Fields:[new("record32_0",4294967296)]),new("patch",hash,Fields:[new("forestAreas",9)]),new("patch",hash,Fields:[new("singlePast",10000)]),new("patch",hash,Forest:[new(530,Animation:0)]),new("patch",hash,Forest:[new(0,Species:650)]),new("patch",hash,Forest:[new(0,Gender:3)]),new("giveFly",hash,Fields:[new("currentType",0)]),new("importFc",hash,DataBase64:Convert.ToBase64String(new byte[0x1E9])),new("patch",new string('0',64),Fields:[new("currentType",1)])})Reject(()=>Preview(data,e));
            Reject(()=>SaveService.EditMisc5(data,JsonSerializer.Serialize(new Misc5Edit("patch",hash,Fields:[new("currentType",1)]),SaveJsonContext.Default.Misc5Edit)));
            var badDraw=random.Request.FrozenForest!.ToArray();badDraw[1]=badDraw[0];Reject(()=>Preview(data,random.Request with{FrozenForest=badDraw}));
            Check(data.SequenceEqual(original),"Misc5 all rejection paths preserve original");
            Console.WriteLine($"PASS {version}: fly/Subway/levels/records/props, 530 forest slots and unique frozen draws, mission/key/fc5 operations, independent full-file oracles and rejection");
        }
        Reject(()=>SaveService.ReadMisc5(File.ReadAllBytes(".tmp/pkhex-fixtures/D.sav")));
    }
}
