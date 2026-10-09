// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Painting3EditingTests
{
    private static void Check(bool v,string message){if(!v)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid painting accepted");}catch(ArgumentException){}}
    private static SAV3 Open(byte[] bytes)=>SaveUtil.GetSaveFile(bytes.ToArray()) as SAV3??throw new Exception("Fixture not recognized");
    private static byte[] Apply(byte[] bytes,Painting3Edit edit)
    {
        var before=bytes.ToArray();try{return SaveService.EditPaintings3(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Painting3Edit));}
        finally{Check(bytes.SequenceEqual(before),"Original immutable on success or rejection");}
    }
    private static void Compare(byte[] bytes,int start,int index,Painting3Fields fields,Action<Paintings3> mutate,bool? enabled=null)
    {
        var expected=Open(bytes);int at=start+32*index;var raw=expected.Large.Slice(at,32).ToArray();var p=new Paintings3(raw,expected.Japanese);mutate(p);raw.CopyTo(expected.Large[at..]);
        if(enabled is {} flag)expected.SetEventFlag(160+index,flag);
        var output=Apply(bytes,new(index,fields));Check(output.SequenceEqual(expected.Write().ToArray()),"Exact full-file oracle: adjacent paintings, daycare, backups and flags retained");
        Check(SaveChecksums.Valid(Open(output))&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Checksums and exact download");
    }
    public static void Run()
    {
        foreach(bool jp in new[]{false,true})foreach(bool emerald in new[]{false,true})
        {
            var raw=new byte[0x20000];
            for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++)
            {int at=(bank*14+sector)*0x1000;WriteUInt16LittleEndian(raw.AsSpan(at+0xFF4),sector);WriteUInt32LittleEndian(raw.AsSpan(at+0xFF8),0x08012025);}
            raw[6]=raw[7]=jp?(byte)0:(byte)255;if(emerald){raw[0xAC]=2;raw[0x890]=1;}
            SAV3 seed=emerald?new SAV3E(raw):new SAV3RS(raw);int start=emerald?0x2F90:0x2EFC;
            // Seed all five paintings and the full erroneous upstream slice past the last painting.
            for(int i=-8;i<32*9;i++)seed.Large[start+i]=(byte)(i*23+11);
            for(int i=0;i<5;i++)
            {
                int at=start+32*i;var r=seed.Large.Slice(at,32);WriteUInt16LittleEndian(r[8..],SpeciesConverter.GetInternal3(25));r[10]=200;r[11]=r[22]=255;seed.SetEventFlag(160+i,true);
            }
            var bytes=seed.Write().ToArray();var source=Open(bytes);var before=source.Large.ToArray();
            var c=JsonSerializer.Deserialize(SaveService.ReadPaintings3(bytes),SaveJsonContext.Default.Painting3Catalog)!;
            Check(c.CanEdit&&c.Entries.Length==5&&c.SpeciesChoices.Length==386&&source.Japanese==jp&&source.GetType()==seed.GetType(),"Public catalog and layout");
            Check(source.Large.SequenceEqual(before),"Read-only catalog preserves source");
            for(int i=0;i<5;i++)
            {
                var entry=c.Entries[i];Check(entry.Index==i&&entry.Enabled&&entry.Caption==2&&entry.CaptionRaw==200&&entry.NicknameHex.Length==20&&entry.TrainerHex.Length==14,"Raw and displayed caption, names and flags");
                foreach(int species in new[]{0,1,251,252,386})Compare(bytes,start,i,new(Species:species),p=>WriteUInt16LittleEndian(p.Data[8..],SpeciesConverter.GetInternal3((ushort)species)));
                foreach(int caption in new[]{0,1,2})Compare(bytes,start,i,new(Caption:caption),p=>p.Data[10]=(byte)(i*3+caption));
                Compare(bytes,start,i,new(Tid:65535,Sid:0,Pid:uint.MaxValue),p=>{WriteUInt16LittleEndian(p.Data[4..],65535);WriteUInt16LittleEndian(p.Data[6..],0);WriteUInt32LittleEndian(p.Data,uint.MaxValue);});
                Compare(bytes,start,i,new(Nickname:"",Trainer:""),_=>{}); // unchanged decoded empty text preserves trailing bytes
                string name=jp?"アイウエオカキクケコ":"ABCDEFGHIJ",trainer=jp?"アイウエオカキ":"ABCDEFG";
                Compare(bytes,start,i,new(Nickname:name,Trainer:trainer),p=>{p.Nickname=name;p.OT=trainer;});
                Compare(bytes,start,i,new(NicknameHex:new string('A',20),TrainerHex:new string('B',14)),p=>{p.Data.Slice(11,10).Fill(0xAA);p.Data.Slice(22,7).Fill(0xBB);});
                Compare(bytes,start,i,new(Enabled:false),p=>{p.Data.Clear();p.Data[11]=p.Data[22]=255;},false);
                var off=Open(bytes);off.SetEventFlag(160+i,false);var disabled=off.Write().ToArray();
                Compare(disabled,start,i,new(Enabled:true),_=>{},true);Compare(disabled,start,i,new(Enabled:false),p=>{p.Data.Clear();p.Data[11]=p.Data[22]=255;},false);
                Reject(()=>Apply(disabled,new(i,new(Tid:0))));
                foreach(uint xor in new uint[]{0,7,8,15})
                {var s=Open(bytes);WriteUInt16LittleEndian(s.Large[(start+32*i+4)..],0);WriteUInt16LittleEndian(s.Large[(start+32*i+6)..],0);WriteUInt32LittleEndian(s.Large[(start+32*i)..],xor);Check(Painting3Editing.Read(s).Entries[i].Shiny==(xor<8),"Shiny threshold");}
            }
            // Clearing a named painting should still affect exactly its 32 bytes.
            var named=Apply(bytes,new(4,new(Nickname:jp?"ピカ":"PIKA",Trainer:jp?"ア":"A")));
            Compare(named,start,4,new(Enabled:false),p=>{p.Data.Clear();p.Data[11]=p.Data[22]=255;},false);
            for(int form=0;form<28;form++)
            {
                // Inverse of the documented four two-bit Unown PID fields; independent of the read helper.
                uint pid=(uint)((form&3)|((form&12)<<6)|((form&48)<<12)|((form&192)<<18));
                var s=Open(bytes);WriteUInt32LittleEndian(s.Large[start..],pid);WriteUInt16LittleEndian(s.Large[(start+8)..],SpeciesConverter.GetInternal3(201));
                Check(Painting3Editing.Read(s).Entries[0].Sprite==(form==0?"b_201":$"b_201_{form}"),"All 28 Unown sprite forms");
            }
            var deoxys=Open(bytes);WriteUInt16LittleEndian(deoxys.Large[(start+8)..],SpeciesConverter.GetInternal3(386));
            Check(Painting3Editing.Read(deoxys).Entries[0].Sprite==(emerald?"b_386_3":"b_386"),"Emerald and RS Deoxys sprite context");
            Painting3Edit[] bad=[new(null,new(Tid:0)),new(-1,new(Tid:0)),new(5,new(Tid:0)),new(0,null),new(0,new()),new(0,new(Species:-1)),new(0,new(Species:387)),new(0,new(Caption:3)),new(0,new(Tid:65536)),new(0,new(Sid:-1)),new(0,new(Pid:-1)),new(0,new(Pid:(long)uint.MaxValue+1)),new(0,new(Nickname:new string('A',11))),new(0,new(Trainer:new string('A',8))),new(0,new(Nickname:"😀")),new(0,new(NicknameHex:"FF")),new(0,new(TrainerHex:new string('G',14))),new(0,new(Nickname:"A",NicknameHex:new string('A',20))),new(0,new(Enabled:false,Species:0)),new(0,new(Tid:0,Trainer:"😀"))];
            foreach(var edit in bad){Reject(()=>Apply(bytes,edit));var s=Open(bytes);var old=s.Large.ToArray();bool flag=s.GetEventFlag(160);Reject(()=>Painting3Editing.Apply(s,edit));Check(old.AsSpan().SequenceEqual(s.Large)&&s.GetEventFlag(160)==flag,"Atomic validation including flags");}
            var corrupt=bytes.ToArray();corrupt[0x20]^=1;Check(!Painting3Editing.Read(Open(corrupt)).CanEdit,"Corrupt save readonly");Reject(()=>Apply(corrupt,new(0,new(Tid:0))));
            Reject(()=>SaveService.EditPaintings3(bytes,new string(' ',2049)));
            Console.WriteLine($"PASS Paintings3 {source.GetType().Name}/JP={jp}: all five bounded records, captions and fields, names/raw bytes, clear/enable, exact adjacent/daycare/full-file preservation, shiny boundaries, atomic rejection and download");
        }
        Reject(()=>Painting3Editing.Read(new SAV3FRLG(false)));Reject(()=>Painting3Editing.Read(new SAV1(LanguageID.English)));
    }
}
