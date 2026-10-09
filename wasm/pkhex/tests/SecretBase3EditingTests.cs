// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class SecretBase3EditingTests
{
    private static void Check(bool v,string m){if(!v)throw new Exception(m);}
    private static void Reject(Action a){try{a();throw new Exception("Invalid secret base accepted");}catch(ArgumentException){}}
    private static SAV3 Open(byte[] b)=>SaveUtil.GetSaveFile(b.ToArray())as SAV3??throw new Exception("Fixture not recognized");
    private static int Offset(SAV3 s)=>s is SAV3RS?0x1A08:0x1A9C;
    private static int At(SAV3 s,int slot)=>Offset(s)+slot*160;
    private static byte[] Fixture(bool e,bool jp)
    {
        var raw=new byte[0x20000];for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++){int at=(bank*14+sector)*0x1000;WriteUInt16LittleEndian(raw.AsSpan(at+0xFF4),sector);WriteUInt32LittleEndian(raw.AsSpan(at+0xFF8),0x08012025);}
        raw[6]=raw[7]=jp?(byte)0:(byte)255;raw[0xAC]=e?(byte)2:(byte)0;raw[0x890]=1;SAV3 s=e?new SAV3E(raw):new SAV3RS(raw);int start=Offset(s);
        for(int i=-4;i<3204;i++)s.Large[start+i]=(byte)(i*17+9);
        for(int slot=0;slot<20;slot++)
        {
            var b=new SecretBase3(s.Large.Slice(start+slot*160,160).ToArray());b.Language=slot%2==0?1:2;b.OriginalTrainerName=slot%2==0?"あいう":"BASE";b.RegistryStatus=slot%4;
            var team=b.Team;for(int i=0;i<6;i++){var p=team.Team[i];p.Species=(ushort)(i==1||i==5?201:i==2?0:25);p.PID=0xABCD0123+(uint)i;p.Level=(byte)(i%2==0?1:255);p.EVAll=255;p.HeldItem=65535;p.Move1=p.Move2=p.Move3=p.Move4=65535;}b.Team=team;
            if(slot is 1 or 5)b.OriginalTrainerTrash[0]=255;b.Data.CopyTo(s.Large[(start+slot*160)..]);
        }return s.Write().ToArray();
    }
    private static byte[] Apply(byte[] bytes,SecretBase3Edit edit){var before=bytes.ToArray();try{return SaveService.EditSecretBase3(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.SecretBase3Edit));}finally{Check(before.SequenceEqual(bytes),"Original immutable on success/rejection");}}
    private static void Compare(byte[] bytes,SecretBase3Edit edit,Action<SAV3> mutate){var expected=Open(bytes);mutate(expected);var output=Apply(bytes,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"Independent full-file raw oracle including hidden slots, decorations, flags, five other members and neighboring data");Check(SaveChecksums.Valid(Open(output))&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Checksum and exact download");}
    public static void Run()
    {
        foreach(bool e in new[]{false,true})foreach(bool jp in new[]{false,true})
        {
            var bytes=Fixture(e,jp);var original=bytes.ToArray();var s=Open(bytes);var c=JsonSerializer.Deserialize(SaveService.ReadSecretBase3(bytes),SaveJsonContext.Default.SecretBase3Catalog)!;
            Check(bytes.SequenceEqual(original)&&c.CanEdit&&c.Bases.Length==18&&c.Bases.Select(b=>b.Slot).SequenceEqual(Enumerable.Range(0,20).Where(i=>i is not(1 or 5)))&&s.Japanese==jp,"Nonmutating filtered catalog with real slot IDs");
            var filtered=new FilteredGameDataSource(s,new GameDataSource(GameInfo.GetStrings("en")));
            Check(c.SpeciesChoices.Select(v=>v.Id).SequenceEqual(filtered.Species.Select(v=>v.Value).Order())&&c.MoveChoices.Select(v=>v.Id).SequenceEqual(filtered.Moves.Select(v=>v.Value).Order())&&c.ItemChoices.Select(v=>v.Id).SequenceEqual(filtered.Items.Select(v=>v.Value).Order()),"Exact upstream choices including held-item whitelist");
            foreach(var b in c.Bases)
            {
                int slot=b.Slot,at=At(s,slot);Check(b.NameHex.Length==14&&b.Members.Length==6&&b.Language==(slot%2==0?1:2),"Per-record language and six members");
                foreach(int value in new[]{0,65535})Compare(bytes,new("trainer",slot,Trainer:new(Tid:value)),x=>WriteUInt16LittleEndian(x.Large[(At(x,slot)+9)..],(ushort)value));
                Compare(bytes,new("trainer",slot,Trainer:new(Sid:65535,Times:255)),x=>{WriteUInt16LittleEndian(x.Large[(At(x,slot)+11)..],65535);x.Large[At(x,slot)+16]=255;});
                foreach(int gender in new[]{0,1})Compare(bytes,new("trainer",slot,Trainer:new(Gender:gender)),x=>{int p=At(x,slot)+1;x.Large[p]=(byte)((x.Large[p]&0xEF)|(gender<<4));});
                foreach(bool value in new[]{false,true})Compare(bytes,new("trainer",slot,Trainer:new(Battled:value)),x=>{int p=At(x,slot)+1;x.Large[p]=(byte)((x.Large[p]&0xDF)|(value?0x20:0));});
                foreach(int registry in new[]{0,1})Compare(bytes,new("trainer",slot,Trainer:new(Registry:registry)),x=>{int p=At(x,slot)+1;x.Large[p]=(byte)((x.Large[p]&0x3F)|(registry<<6));});
                string name=b.Language==1?"あいうえおかき":"ABCDEFG";
                Compare(bytes,new("trainer",slot,Trainer:new(Name:name)),x=>StringConverter3.SetString(x.Large.Slice(At(x,slot)+2,7),name,7,b.Language,StringConverterOption.None));
                Compare(bytes,new("trainer",slot,Trainer:new(Name:b.Name)),_=>{});
                for(int member=0;member<6;member++)
                {
                    int index=member,team=At(s,slot)+0x34;var p=b.Members[member];Check(p.Form==(p.Species==201?EntityPID.GetUnownForm3(Convert.ToUInt32(p.Pid,16)):0)&&p.Level==(member%2==0?1:255)&&p.Ev==255,"Raw old values and zero-based Unown form");
                    Compare(bytes,new("member",slot,member,Pokemon:new(Species:0)),x=>{int t=At(x,slot)+0x34;WriteUInt32LittleEndian(x.Large[(t+4*index)..],0);x.Large.Slice(t+0x18+8*index,8).Clear();WriteUInt16LittleEndian(x.Large[(t+0x48+2*index)..],0);WriteUInt16LittleEndian(x.Large[(t+0x54+2*index)..],0);x.Large[t+0x60+index]=0;x.Large[t+0x66+index]=0;});
                    if(p.Species==0){Compare(bytes,new("member",slot,member,Pokemon:new(Species:25)),x=>{int t=At(x,slot)+0x34;WriteUInt16LittleEndian(x.Large[(t+0x48+2*index)..],25);x.Large[t+0x60+index]=2;});continue;}
                    foreach(uint pid in new[]{0u,uint.MaxValue})Compare(bytes,new("member",slot,member,Pokemon:new(Pid:pid)),x=>WriteUInt32LittleEndian(x.Large[(At(x,slot)+0x34+4*index)..],pid));
                    foreach(int level in new[]{2,100})Compare(bytes,new("member",slot,member,Pokemon:new(Level:level)),x=>x.Large[At(x,slot)+0x34+0x60+index]=(byte)level);
                    foreach(int ev in new[]{0,85})Compare(bytes,new("member",slot,member,Pokemon:new(Ev:ev)),x=>x.Large[At(x,slot)+0x34+0x66+index]=(byte)ev);
                    int item=c.ItemChoices.Last().Id;Compare(bytes,new("member",slot,member,Pokemon:new(HeldItem:item)),x=>WriteUInt16LittleEndian(x.Large[(At(x,slot)+0x34+0x54+2*index)..],(ushort)item));
                    Compare(bytes,new("member",slot,member,Pokemon:new(Moves:[null,354,null,0])),x=>{int t=At(x,slot)+0x34+0x18+8*index;WriteUInt16LittleEndian(x.Large[(t+2)..],354);WriteUInt16LittleEndian(x.Large[(t+6)..],0);});
                }
            }
            foreach(string hex in new[]{"FFFFFFFFFFFFFF","00010203040506"})Compare(bytes,new("trainer",0,Trainer:new(NameHex:hex)),x=>Convert.FromHexString(hex).CopyTo(x.Large.Slice(At(x,0)+2,7)));
            var hidden=Apply(bytes,new("trainer",0,Trainer:new(Name:"")));Check(!SecretBase3Editing.Read(Open(hidden)).Bases.Any(b=>b.Slot==0),"Empty name hides only the chosen slot, with other bytes preserved");
            for(int form=0;form<28;form++){var before=bytes.ToArray();var query=new Base3FormQuery(0,1,0x12345678,form);var result=JsonSerializer.Deserialize(SaveService.SuggestSecretBase3Form(bytes,JsonSerializer.Serialize(query,SaveJsonContext.Default.Base3FormQuery)),SaveJsonContext.Default.Base3FormSuggestion)!;uint pid=Convert.ToUInt32(result.Pid,16);Check(result.Form==form&&EntityPID.GetUnownForm3(pid)==form&&bytes.SequenceEqual(before)&&result.Sprite.Length>0,"All 28 Core form previews are nonmutating with exact proposed PID");Compare(bytes,new("member",0,1,Pokemon:new(Pid:pid)),x=>WriteUInt32LittleEndian(x.Large[(At(x,0)+0x34+4)..],pid));}
            SecretBase3Edit[] bad=[new("trainer"),new("trainer",1,Trainer:new(Tid:1)),new("trainer",20,Trainer:new(Tid:1)),new("trainer",0,Trainer:new()),new("trainer",0,Trainer:new(Tid:-1)),new("trainer",0,Trainer:new(Tid:65536)),new("trainer",0,Trainer:new(Gender:2)),new("trainer",0,Trainer:new(Times:256)),new("trainer",0,Trainer:new(Registry:2)),new("trainer",0,Trainer:new(Name:"😀")),new("trainer",0,Trainer:new(Name:"ABCDEFGH")),new("trainer",0,Trainer:new(Name:"A",NameHex:"00000000000000")),new("trainer",0,Trainer:new(NameHex:"00")),new("trainer",0,Trainer:new(NameHex:new string('G',14))),new("member",0,6,Pokemon:new(Pid:0)),new("member",0,0,Pokemon:new()),new("member",0,0,Pokemon:new(Species:0,Pid:0)),new("member",0,0,Pokemon:new(Species:387)),new("member",0,0,Pokemon:new(Pid:-1)),new("member",0,0,Pokemon:new(Pid:4294967296)),new("member",0,0,Pokemon:new(Level:1)),new("member",0,0,Pokemon:new(Level:101)),new("member",0,0,Pokemon:new(Ev:86)),new("member",0,0,Pokemon:new(HeldItem:65535)),new("member",0,0,Pokemon:new(Moves:[])),new("member",0,0,Pokemon:new(Moves:[355,null,null,null])),new("member",0,2,Pokemon:new(Pid:0)),new("trainer",0,0,Trainer:new(Tid:1),Pokemon:new(Pid:1))];
            foreach(var edit in bad){Reject(()=>Apply(bytes,edit));var x=Open(bytes);var large=x.Large.ToArray();Reject(()=>SecretBase3Editing.Apply(x,edit));Check(x.Large.SequenceEqual(large),"Atomic rejection before live single-record copy");}
            foreach(var query in new Base3FormQuery[]{new(null,0,0,0),new(1,0,0,0),new(0,6,0,0),new(0,0,-1,0),new(0,0,0,-1),new(0,0,0,28)})Reject(()=>SecretBase3Editing.Suggest(Open(bytes),query));
            var corrupt=bytes.ToArray();corrupt[0x20]^=1;Check(!SecretBase3Editing.Read(Open(corrupt)).CanEdit,"Corrupt read-only");Reject(()=>Apply(corrupt,new("trainer",0,Trainer:new(Tid:0))));Reject(()=>SaveService.EditSecretBase3(bytes,new string(' ',4097)));
            Console.WriteLine($"PASS SecretBase3 E={e} JP={jp}: all occupied slots/six member offsets, record-language names/trash, flags/classes, exact choices, empty/hidden preservation, 28 form previews, old values, full-file oracle and atomic requests");
        }
        Reject(()=>SecretBase3Editing.Read(new SAV3FRLG(false)));Reject(()=>SecretBase3Editing.Read(new SAV1(LanguageID.English)));
    }
}
