// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Misc3EditingTests
{
    private static void Check(bool v,string m){if(!v)throw new Exception(m);}
    private static void Reject(Action a){try{a();throw new Exception("Invalid Misc3 accepted");}catch(ArgumentException){}}
    private static SAV3 Open(byte[] b)=>SaveUtil.GetSaveFile(b.ToArray()) as SAV3??throw new Exception("Fixture not recognized");
    private static int Work(SAV3 s)=>s is SAV3RS?0x1340:s is SAV3E?0x139C:0x1000;
    private static byte[] Fixture(int type,bool jp,uint key)
    {
        var raw=new byte[0x20000];for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++){int at=(bank*14+sector)*0x1000;WriteUInt16LittleEndian(raw.AsSpan(at+0xFF4),sector);WriteUInt32LittleEndian(raw.AsSpan(at+0xFF8),0x08012025);}
        raw[6]=raw[7]=jp?(byte)0:(byte)255;raw[0xAC]=type==2?(byte)1:type==1?(byte)2:(byte)0;raw[0x890]=1;
        SAV3 s=type==0?new SAV3RS(raw):type==1?new SAV3E(raw):new SAV3FRLG(raw);
        if(type!=0)WriteUInt32LittleEndian(s.Small[(type==1?0xAC:0xF20)..],key);
        int work=Work(s);for(int i=-4;i<516;i++)s.Large[work+i]=(byte)(i*17+3);
        int coin=type==2?0x294:0x494;for(int i=-4;i<6;i++)s.Large[coin+i]=(byte)(i*31+9);
        WriteUInt16LittleEndian(s.Large[coin..],(ushort)(65535^key));
        s.LargeBlock.PartyCount=0;WriteUInt32LittleEndian(s.LargeBlock.PartyBuffer,0xABCD0123);
        if(s is SAV3FRLG f){for(int i=-4;i<12;i++)s.Large[0x3A4C+i]=(byte)(i*5+1);f.SetString(f.LargeBlock.RivalNameTrash,jp?"あいう":"OLD",7,StringConverterOption.ClearZero);f.LargeBlock.RivalNameTrash[7]=0xAB;}
        return s.Write().ToArray();
    }
    private static byte[] Apply(byte[] bytes,Misc3Edit edit){var original=bytes.ToArray();try{return SaveService.EditMisc3(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Misc3Edit));}finally{Check(original.SequenceEqual(bytes),"Original immutable on success and rejection");}}
    private static void Compare(byte[] bytes,Misc3Edit edit,Action<SAV3> mutate){var expected=Open(bytes);mutate(expected);var output=Apply(bytes,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"Full-file oracle protects all variables, other icons, party, adjacent names/money and key");Check(SaveChecksums.Valid(Open(output))&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Checksum and exact download");}
    public static void Run()
    {
        for(int type=0;type<3;type++)foreach(bool jp in new[]{false,true})foreach(uint key in (type==0?new[]{0u}:type==1?new[]{2u,0x12345678u,uint.MaxValue}:new[]{0u,2u,0x12345678u,uint.MaxValue}))
        {
            var bytes=Fixture(type,jp,key);var original=bytes.ToArray();var s=Open(bytes);var c=JsonSerializer.Deserialize(SaveService.ReadMisc3(bytes),SaveJsonContext.Default.Misc3Catalog)!;
            Check(bytes.SequenceEqual(original)&&s.Japanese==jp&&c.CanEdit&&c.Coins==65535,"Read is nonmutating and retains old coin value");
            int coin=type==2?0x294:0x494;
            foreach(int value in new[]{0,1,9998,9999})Compare(bytes,new("coins",Coins:value),x=>WriteUInt16LittleEndian(x.Large[coin..],(ushort)(value^key)));
            var invalid=new List<Misc3Edit>{new("unknown"),new("coins"),new("coins",Coins:-1),new("coins",Coins:10000),new("coins",Coins:0,Name:"A"),new("coins",Coins:0,Pid:"00000000"),new("rival"),new("rival",Name:"A",NameHex:"0000000000000000"),new("icons"),new("icons",Icons:[]),new("icons",Icons:[null!]),new("icons",Icons:[new(null,0)]),new("icons",Icons:[new(0,null)]),new("icons",Icons:[new(-1,0)]),new("icons",Icons:[new(6,0)]),new("icons",Icons:[new(0,-1)]),new("icons",Icons:[new(0,387)]),new("icons",Icons:[new(0,0),new(0,1)]),new("icons",Coins:1,Icons:[new(0,0)]),new("mirage"),new("mirage",Pid:"00000000"),new("mirage",Pid:"ABCD0123",Coins:1)};
            if(type==2)
            {
                Check(c.Rival is not null&&c.Icons?.Length==6&&c.SpeciesChoices.Length==387&&c.Mirage is null,"FRLG fields and 0–386 choices");
                var f=(SAV3FRLG)s;Check(c.Rival!.Hex==Convert.ToHexString(f.LargeBlock.RivalNameTrash)&&c.Rival.MaxLength==7,"Exact eight raw name bytes");
                Compare(bytes,new("rival",Name:f.RivalName),_=>{});
                foreach(string name in (jp?new[]{"","あ","あいうえおかき"}:new[]{"","A","ABCDEFG"}))Compare(bytes,new("rival",Name:name),x=>{var target=((SAV3FRLG)x).LargeBlock.RivalNameTrash;StringConverter3.SetString(target,name,7,jp,StringConverterOption.ClearZero);});
                foreach(string rawName in new[]{"FFFFFFFFFFFFFFFF","0001020304050607","AABBCCDDEEFF0011"})Compare(bytes,new("rival",NameHex:rawName),x=>Convert.FromHexString(rawName).CopyTo(((SAV3FRLG)x).LargeBlock.RivalNameTrash));
                invalid.AddRange([new("rival",Name:"ABCDEFGH"),new("rival",Name:"😀"),new("rival",NameHex:"00"),new("rival",NameHex:new string('G',16)),new("mirage",Pid:"ABCD0123")]);
                for(int slot=0;slot<6;slot++)foreach(int species in new[]{0,1,201,251,252,386}){int index=slot;Compare(bytes,new("icons",Icons:[new(slot,species)]),x=>WriteUInt16LittleEndian(x.Large[(0x1000+2*(0x43+index))..],SpeciesConverter.GetInternal3((ushort)species)));}
                // Exercise every national species under both region codecs with a representative key, spread across all six addresses.
                if(key==2)for(int species=0;species<=386;species++){int national=species,slot=species%6;Compare(bytes,new("icons",Icons:[new(slot,species)]),x=>WriteUInt16LittleEndian(x.Large[(0x1000+2*(0x43+slot))..],SpeciesConverter.GetInternal3((ushort)national)));}
                foreach(ushort rawSpecies in new ushort[]{252,253,276,412,413,65535}){var x=Open(bytes);WriteUInt16LittleEndian(x.Large[(0x1000+2*0x43)..],rawSpecies);var before=x.Write().ToArray();var icon=Misc3Editing.Read(Open(before)).Icons![0];Check(icon.Raw==rawSpecies&&icon.Species==0,"Unknown internal icon IDs are retained independently of None");Compare(before,new("coins",Coins:1),a=>WriteUInt16LittleEndian(a.Large[coin..],(ushort)(1^key)));Compare(before,new("icons",Icons:[new(0,0)]),a=>WriteUInt16LittleEndian(a.Large[(0x1000+2*0x43)..],0));}
            }
            else
            {
                Check(c.Rival is null&&c.Icons is null&&c.SpeciesChoices.Length==0&&c.Mirage is not null,"RS/E availability");
                foreach(byte count in new byte[]{0,1,6,255})foreach(uint pid in new[]{0u,1u,0xDEADBEEFu,uint.MaxValue}){var x=Open(bytes);x.LargeBlock.PartyCount=count;WriteUInt32LittleEndian(x.LargeBlock.PartyBuffer,pid);var before=x.Write().ToArray();var m=Misc3Editing.Read(Open(before)).Mirage!;Check(m.PartyCount==count&&m.Pid==pid.ToString("X8")&&m.Target==(ushort)pid,"Raw slot source ignores party list/count and PK3 validity");Compare(before,new("mirage",Pid:m.Pid),a=>WriteUInt16LittleEndian(a.Large[(Work(a)+2*0x24)..],(ushort)pid));}
                invalid.AddRange([new("rival",Name:"A"),new("icons",Icons:[new(0,0)])]);
                var changed=Open(bytes);WriteUInt32LittleEndian(changed.LargeBlock.PartyBuffer,0x11111111);Reject(()=>Apply(changed.Write().ToArray(),new("mirage",Pid:c.Mirage!.Pid)));
            }
            foreach(var edit in invalid){Reject(()=>Apply(bytes,edit));var x=Open(bytes);var small=x.Small.ToArray();var large=x.Large.ToArray();Reject(()=>Misc3Editing.Apply(x,edit));Check(x.Small.SequenceEqual(small)&&x.Large.SequenceEqual(large),"Atomic complete-request rejection including unencodable names");}
            var corrupt=bytes.ToArray();corrupt[0x20]^=1;Check(!Misc3Editing.Read(Open(corrupt)).CanEdit,"Corrupt readonly");Reject(()=>Apply(corrupt,new("coins",Coins:0)));Reject(()=>SaveService.EditMisc3(bytes,new string(' ',2049)));
            Console.WriteLine($"PASS Misc3 type={type} JP={jp} key={key:X8}: coin bounds/XOR, rival text/raw/trash/encoding, six icons and canonical species, raw Mirage PID with empty/invalid party count, atomic rejection, original and full export");
        }
        Reject(()=>Misc3Editing.Read(new SAV1(LanguageID.English)));
    }
}
