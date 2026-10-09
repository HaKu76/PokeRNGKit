// SPDX-License-Identifier: GPL-3.0-or-later
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
using static System.Buffers.Binary.BinaryPrimitives;
internal static class Ferry3EditingTests
{
    private static readonly int[] Indices=[0x864,0x8B3,0x8D5,0x8D6,0x8E0,0x1D0,0x1AE,0x1AF,0x1B0,0x1DB];
    private static readonly int[] Tickets=[265,275,370,371,376];
    private static void Check(bool v,string message){if(!v)throw new Exception(message);}
    private static void Reject(Action action){try{action();throw new Exception("Invalid Ferry accepted");}catch(ArgumentException){}}
    private static SAV3E Open(byte[] b)=>SaveUtil.GetSaveFile(b.ToArray()) as SAV3E??throw new Exception("Fixture not recognized");
    private static void Item(SAV3E s,int slot,int id,int count){int at=0x498+0x140+4*slot;WriteUInt16LittleEndian(s.Large[at..],(ushort)id);WriteUInt16LittleEndian(s.Large[(at+2)..],(ushort)(count ^ ReadUInt32LittleEndian(s.Small[0xAC..])));}
    private static void Flag(SAV3E s,int index,bool value){int at=0x1270+(index>>3),mask=1<<(index&7);s.Large[at]=(byte)(value?s.Large[at]|mask:s.Large[at]&~mask);}
    private static byte[] Apply(byte[] bytes,Ferry3Edit edit){var original=bytes.ToArray();try{return SaveService.EditFerry3(bytes,JsonSerializer.Serialize(edit,SaveJsonContext.Default.Ferry3Edit));}finally{Check(original.SequenceEqual(bytes),"Original immutable on success and rejection");}}
    private static Ferry3Catalog Read(byte[] bytes){var original=bytes.ToArray();var c=JsonSerializer.Deserialize(SaveService.ReadFerry3(bytes),SaveJsonContext.Default.Ferry3Catalog)!;Check(bytes.SequenceEqual(original),"Read is nonmutating");return c;}
    private static void Compare(byte[] bytes,Ferry3Edit edit,Action<SAV3E> mutate){var expected=Open(bytes);mutate(expected);var output=Apply(bytes,edit);Check(output.SequenceEqual(expected.Write().ToArray()),"Independent full-file raw oracle, all unrelated pouches/flags and security key");Check(SaveChecksums.Valid(Open(output))&&SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Checksums and exact download");}
    private static byte[] Fixture(bool jp,uint key)
    {
        var raw=new byte[0x20000];for(int bank=0;bank<2;bank++)for(ushort sector=0;sector<14;sector++){int at=(bank*14+sector)*0x1000;WriteUInt16LittleEndian(raw.AsSpan(at+0xFF4),sector);WriteUInt32LittleEndian(raw.AsSpan(at+0xFF8),0x08012025);}
        raw[6]=raw[7]=jp?(byte)0:(byte)255;raw[0xAC]=2;raw[0x890]=1;var s=new SAV3E(raw);
        WriteUInt32LittleEndian(s.Small[0xAC..],key);
        for(int i=-4;i<0x3B4;i++)s.Large[0x498+i]=(byte)(i*31+7);
        for(int i=-4;i<304;i++)s.Large[0x1270+i]=(byte)(i*17+9);
        for(int i=0;i<30;i++)Item(s,i,0,0);
        return s.Write().ToArray();
    }
    public static void Run()
    {
        foreach(bool jp in new[]{false,true})foreach(uint key in new[]{2u,0x12345678u,uint.MaxValue})
        {
            var bytes=Fixture(jp,key);var source=Open(bytes);var c=Read(bytes);
            Check(source.Japanese==jp&&c.CanEdit&&c.Japanese==jp&&c.SourceHash==Ferry3Editing.Hash(bytes)&&c.Flags.Select(f=>f.Index).SequenceEqual(Indices)&&c.Tickets.Select(t=>t.Id).SequenceEqual(Tickets),"Public layout and source fingerprint");
            Check(c.Tickets.All(t=>t.Name.Zh.Length>0&&t.Name.En.Length>0&&t.Name.Ja.Length>0&&!t.Present),"Core trilingual ticket names");
            for(int i=0;i<10;i++)foreach(bool value in new[]{false,true})Compare(bytes,new("flags",Flags:[new(Indices[i],value)]),s=>Flag(s,Indices[i],value));
            for(int mask=0;mask<32;mask++)
            {
                var s=Open(bytes);int occupied=0;
                for(int t=0;t<5;t++)if((mask&(1<<t))!=0)Item(s,occupied++,Tickets[t],65535);
                var before=s.Write().ToArray();var catalog=Read(before);
                Check(catalog.Tickets.Select(t=>t.Present).SequenceEqual(Enumerable.Range(0,5).Select(t=>(mask&(1<<t))!=0)),"Positive abnormal quantities still count as present");
                foreach(bool include in new[]{false,true})
                {
                    bool effective=include||jp||(mask&16)!=0;var requested=Tickets.Where(t=>t!=376||effective).ToArray();
                    var have=requested.Where(t=>(mask&(1<<Array.IndexOf(Tickets,t)))!=0).ToArray();var missing=requested.Except(have).ToArray();var p=catalog.Plans[include?1:0];
                    Check(p.IncludeOldSeaMap==effective&&p.Have.SequenceEqual(have)&&p.Missing.SequenceEqual(missing),"All ticket presence combinations and old-map regional choice");
                    var edit=new Ferry3Edit("tickets",IncludeOldSeaMap:include,SourceHash:catalog.SourceHash);
                    if(missing.Length==0){Check(p.Status=="complete"&&p.Additions.Length==0,"Complete preview");Reject(()=>Apply(before,edit));}
                    else{Check(p.Status=="ready"&&p.Additions.Select(a=>a.Id).SequenceEqual(missing)&&p.Additions.Select(a=>a.Slot).SequenceEqual(Enumerable.Range(occupied,missing.Length)),"Exact reviewed additions");Compare(before,edit,x=>{for(int i=0;i<missing.Length;i++)Item(x,occupied+i,missing[i],1);});}
                }
            }
            foreach(int occupied in new[]{24,25,26,27,28,29,30})
            {
                var s=Open(bytes);for(int i=0;i<occupied;i++)Item(s,i,60000,0);var before=s.Write().ToArray();var catalog=Read(before);int missing=jp?5:4;
                var edit=new Ferry3Edit("tickets",IncludeOldSeaMap:false,SourceHash:catalog.SourceHash);
                if(occupied+missing>=30){Check(catalog.Plans[0].Status=="space","Strict upstream capacity boundary, not fill-to-last");Reject(()=>Apply(before,edit));}
                else Compare(before,edit,x=>{for(int i=0;i<missing;i++)Item(x,occupied+i,Tickets[i],1);});
            }
            foreach(int blocked in new[]{1,2,3})
            {
                var s=Open(bytes);Item(s,blocked,265,0);var before=s.Write().ToArray();var catalog=Read(before);
                Check(catalog.Plans[0].Status=="occupied"&&!catalog.Tickets[0].Present&&catalog.Plans[0].Additions.Length==0,"Protect nonzero ID even with zero quantity after a hole");
                Reject(()=>Apply(before,new("tickets",IncludeOldSeaMap:false,SourceHash:catalog.SourceHash)));
            }
            // Zero-quantity tickets before the first empty slot are preserved; HasItem follows Core, without normalization.
            var duplicate=Open(bytes);Item(duplicate,0,265,0);var duplicateBytes=duplicate.Write().ToArray();var dc=Read(duplicateBytes);int add=jp?5:4;
            Compare(duplicateBytes,new("tickets",IncludeOldSeaMap:false,SourceHash:dc.SourceHash),s=>{for(int i=0;i<add;i++)Item(s,i+1,Tickets[i],1);});
            var changed=Apply(bytes,new("flags",Flags:[new(Indices[0],!c.Flags[0].Value)]));Reject(()=>Apply(changed,new("tickets",IncludeOldSeaMap:true,SourceHash:c.SourceHash)));
            Ferry3Edit[] bad=[new("unknown"),new("flags"),new("flags",Flags:[]),new("flags",Flags:[null!]),new("flags",Flags:[new(0,true)]),new("flags",Flags:[new(Indices[0],true),new(Indices[0],false)]),new("flags",Flags:[new(Indices[0],true)],IncludeOldSeaMap:true),new("flags",Flags:[new(Indices[0],true)],SourceHash:c.SourceHash),new("tickets"),new("tickets",IncludeOldSeaMap:true),new("tickets",IncludeOldSeaMap:true,SourceHash:new string('0',64)),new("tickets",Flags:[],IncludeOldSeaMap:true,SourceHash:c.SourceHash)];
            foreach(var edit in bad){Reject(()=>Apply(bytes,edit));var s=Open(bytes);var small=s.Small.ToArray();var large=s.Large.ToArray();Reject(()=>Ferry3Editing.Apply(s,edit,c.SourceHash));Check(s.Small.SequenceEqual(small)&&s.Large.SequenceEqual(large),"Atomic complete-request rejection");}
            var corrupt=bytes.ToArray();corrupt[0x20]^=1;Check(!Read(corrupt).CanEdit,"Corrupt save readonly");Reject(()=>Apply(corrupt,new("flags",Flags:[new(Indices[0],true)])));
            Reject(()=>SaveService.EditFerry3(bytes,new string(' ',2049)));
            Console.WriteLine($"PASS Ferry3 JP={jp} key={key:X8}: ten flag addresses, 32 ticket combinations, regional map choice, keyed raw full-file oracle, strict capacity/hole protection, stale preview, atomic rejection and exact export");
        }
        Reject(()=>Ferry3Editing.Read(new SAV3RS(false),""));Reject(()=>Ferry3Editing.Read(new SAV3FRLG(false),""));Reject(()=>Ferry3Editing.Read(new SAV1(LanguageID.English),""));
    }
}
