// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;

internal static class HallOfFame3Tests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Hall3 operation accepted");}catch(ArgumentException){}}
    private static SAV3 Open(byte[] data)=>SaveUtil.GetSaveFile(data.ToArray()) as SAV3??throw new Exception("Hall3 fixture not recognized");
    private static SAV3 Construct(byte[] data,int kind)=>kind switch {0=>new SAV3RS(data),1=>new SAV3E(data),_=>new SAV3FRLG(data)};
    private static byte[] Raw(SAV3 s)=>[..s.Data.Slice(0x1C000,0xF80),..s.Data.Slice(0x1D000,0xF80)];
    private static void Raw(SAV3 s,byte[] raw){raw.AsSpan(0,0xF80).CopyTo(s.Data[0x1C000..]);raw.AsSpan(0xF80,0xF80).CopyTo(s.Data[0x1D000..]);}
    private static byte[] Apply(byte[] data,Hall3Edit edit)
    {
        var original=data.ToArray();try{return SaveService.EditHall3(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Hall3Edit));}finally{Check(data.SequenceEqual(original),"Original immutable on success/rejection");}
    }
    private static void Compare(byte[] data,Hall3Edit edit,Action<SAV3> change)
    {
        var expected=Open(data);change(expected);var output=Apply(data,edit);
        Check(output.SequenceEqual(expected.Write().ToArray()),"Full-file independent/Core oracle");
        Check(SaveChecksums.Valid(Open(output))&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Checksum and exact working-copy download");
    }
    public static void Run()
    {
        foreach(bool jp in new[]{false,true})for(int kind=0;kind<3;kind++)
        {
            var bytes=new byte[0x20000];
            for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++)
            {
                int at=(bank*14+sector)*0x1000;WriteUInt16LittleEndian(bytes.AsSpan(at+0xFF4),sector);WriteUInt32LittleEndian(bytes.AsSpan(at+0xFF8),0x08012025);
            }
            bytes[6]=bytes[7]=jp?(byte)0:(byte)255;
            if(kind==1){bytes[0xAC]=2;bytes[0x890]=1;}else if(kind==2)bytes[0xAC]=1;
            var seed=Construct(bytes,kind);
            var party=new PK3{Species=25,Language=jp?1:2,TID16=123,SID16=456,PID=0x12345678,CurrentLevel=50};party.Nickname=jp?"ピカチュウ":"PIKA";
            seed.PartyData=[party];
            var raw=new byte[7936];
            for(int i=0;i<raw.Length;i++)raw[i]=(byte)(i*29+17);
            for(int i=0;i<300;i++)
            {
                int at=i*20;WriteUInt16LittleEndian(raw.AsSpan(at+8),(ushort)(SpeciesConverter.GetInternal3((ushort)(1+i%386))|(127<<9)));
                raw[at+10]=255; // An empty decoded name with meaningful trailing bytes.
            }
            Raw(seed,raw);seed.Data[0x1CFA0]=0x17;seed.Data[0x1DFA0]=0x29;
            var data=seed.Write().ToArray();var source=Open(data);Check(source.Japanese==jp&&source.GetType()==seed.GetType(),"Correct region and game detection");
            var catalog=JsonSerializer.Deserialize(SaveService.ReadHall3(data,"{}"),SaveJsonContext.Default.Hall3Catalog)!;
            Reject(()=>SaveService.ReadHall3(data,new string(' ',129)));
            Reject(()=>SaveService.EditHall3(data,new string(' ',4097)));Check(catalog.Available&&catalog.CanEdit&&catalog.Teams.Length==50&&catalog.Teams.All(t=>t.Length==6)&&catalog.SpeciesChoices.Length==386,"Complete catalog");
            for(int i=0;i<300;i++)
            {
                int at=i*20;
                Compare(data,new("member",i/6,i%6,Fields:new(Level:101)),s=>{var r=Raw(s);WriteUInt16LittleEndian(r.AsSpan(at+8),(ushort)((ReadUInt16LittleEndian(r.AsSpan(at+8))&511)|(100<<9)));Raw(s,r);});
            }
            foreach(int level in new[]{0,100,101,127,255})
                Compare(data,new("member",33,0,Fields:new(Level:level)),s=>{if(level==127)return;var r=Raw(s);const int at=198*20+8;WriteUInt16LittleEndian(r.AsSpan(at),(ushort)((ReadUInt16LittleEndian(r.AsSpan(at))&511)|(Math.Min(100,level)<<9)));Raw(s,r);});
            Compare(data,new("member",0,0,Fields:new(Tid:65535,Sid:0,Pid:uint.MaxValue)),s=>{var r=Raw(s);WriteUInt16LittleEndian(r,65535);WriteUInt16LittleEndian(r.AsSpan(2),0);WriteUInt32LittleEndian(r.AsSpan(4),uint.MaxValue);Raw(s,r);});
            Compare(data,new("member",0,0,Fields:new(Species:386)),s=>{var r=Raw(s);WriteUInt16LittleEndian(r.AsSpan(8),(ushort)((127<<9)|SpeciesConverter.GetInternal3(386)));Raw(s,r);});
            Compare(data,new("member",0,0,Fields:new(Nickname:"")),_=>{});
            Compare(data,new("clearMember",0,0),s=>{var r=Raw(s);r.AsSpan(0,10).Clear();Raw(s,r);});
            Compare(data,new("member",0,0,Fields:new(NicknameHex:new string('A',20))),s=>{var r=Raw(s);r.AsSpan(10,10).Fill(0xAA);Raw(s,r);});
            string nickname=new(jp?'ア':'A',10);
            Compare(data,new("member",0,0,Fields:new(Nickname:nickname)),s=>{var r=Raw(s);new HallFame3PKM(r.AsMemory(0,20),jp).Nickname=nickname;Raw(s,r);});
            foreach(bool all in new[]{false,true})
                Compare(data,new("party",49,All:all),s=>{var r=Raw(s);PKM[] team=[s.GetPartySlotAtIndex(0),new PK3(),new PK3(),new PK3(),new PK3(),new PK3()];for(int t=0;t<50;t++)if(all||t==49)new HallFame3Entry(r.AsMemory(t*120,120),jp).CopyFrom(team);Raw(s,r);});
            for(uint form=0;form<28;form++)
            {
                uint pid=(form&3)|((form&12)<<6)|((form&48)<<12)|((form&192)<<18);
                var output=Apply(data,new("member",0,0,Fields:new(Species:201,Pid:pid)));
                var member=HallOfFame3.Read(Open(output)).Teams[0][0];Check(member.Form==form,"All Unown forms from independent PID packing");
            }
            foreach(int shinyXor in new[]{0,7,8,15})
            {
                var output=Apply(data,new("member",0,0,Fields:new(Tid:100,Sid:200,Pid:100^200^shinyXor)));
                Check(HallOfFame3.Read(Open(output)).Teams[0][0].Shiny==(shinyXor<8),"Gen3 shiny threshold");
            }
            var deoxys=Open(Apply(data,new("member",0,0,Fields:new(Species:386))));
            foreach(var choice in catalog.Versions)
            {
                int expected=(GameVersion)choice.Id switch {GameVersion.FR=>1,GameVersion.LG=>2,GameVersion.E=>3,_=>0};
                Check(HallOfFame3.Read(deoxys,choice.Id).Teams[0][0].Form==expected,"Deoxys display context");
            }
            Reject(()=>HallOfFame3.Read(source,(int)GameVersion.SW));
            Hall3Edit[] invalid=[new("bad"),new("member"),new("member",50,0,Fields:new(Level:1)),new("member",0,6,Fields:new(Level:1)),new("member",0,0,Fields:new()),new("member",0,0,Fields:new(Level:256)),new("member",0,0,Fields:new(Species:387)),new("member",0,0,Fields:new(Tid:-1)),new("member",0,0,Fields:new(Sid:65536)),new("member",0,0,Fields:new(Pid:0x100000000)),new("member",0,0,Fields:new(Tid:1,Nickname:"汉")),new("member",0,0,Fields:new(Nickname:new string('A',11))),new("member",0,0,Fields:new(NicknameHex:"GG")),new("member",0,0,Fields:new(Nickname:"A",NicknameHex:new string('A',20))),new("party",0),new("party",0,Slot:0,All:true),new("clearMember",0,0,All:false)];
            foreach(var bad in invalid){Reject(()=>Apply(data,bad));var s=Open(data);var before=s.Data.ToArray();Reject(()=>HallOfFame3.Apply(s,bad));Check(before.SequenceEqual(s.Data.ToArray()),"No partial writes on invalid request");}
            foreach(int at in new[]{0x1C000,0x1D000,0x1CFF4,0x1DFF4})
            {
                var corrupt=data.ToArray();corrupt[at]^=1;Check(!HallOfFame3.Read(Open(corrupt)).CanEdit,"Damaged Hall sector/checksum is read-only");Reject(()=>Apply(corrupt,new("clearMember",0,0)));
            }
            var half=Construct(data[..0x10000],kind);Check(HallOfFame3.Read(half) is {Available:false,CanEdit:false,Teams.Length:0},"Half-length never reads missing sectors");Reject(()=>HallOfFame3.Apply(half,new("clearMember",0,0)));Reject(()=>Apply(data[..0x10000],new("clearMember",0,0)));
            foreach(byte fill in new byte[]{0,255})
            {
                var empty=Open(data);empty.Data.Slice(0x1C000,0x2000).Fill(fill);var blank=empty.Write().ToArray();
                Check(HallOfFame3.Read(Open(blank)).CanEdit,"Core-uninitialized sectors remain readable/editable");
                Compare(blank,new("member",0,0,Fields:new(Tid:123)),s=>{var r=Raw(s);WriteUInt16LittleEndian(r,123);Raw(s,r);});
            }
            Console.WriteLine($"PASS Hall3 {seed.GetType().Name}/JP={jp}: all 300 slots, crossing sectors, full raw oracle, level clamp/preservation, names/raw bytes, party scopes, all Unown/Deoxys forms, shiny threshold, checksums, uninitialized sectors and half-file rejection");
        }
        Reject(()=>HallOfFame3.Read(new SAV1()));
    }
}
