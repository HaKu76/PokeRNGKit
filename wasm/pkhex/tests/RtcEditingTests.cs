// SPDX-License-Identifier: GPL-3.0-or-later
using System.Buffers.Binary;
using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;
internal static class RtcEditingTests
{
    private static void Check(bool value,string message){if(!value)throw new Exception(message);}
    private static SAV3RS Ruby()
    {
        var data=new byte[SaveUtil.SIZE_G3RAW];
        for(int slot=0;slot<2;slot++)for(ushort sector=0;sector<14;sector++){int at=(slot*14+sector)*0x1000;BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(at+0xFF4),sector);BinaryPrimitives.WriteUInt32LittleEndian(data.AsSpan(at+0xFF8),0x08012025);}
        data[6]=data[7]=255;return new SAV3RS(data){OT="TEST"};
    }
    private static byte[] Apply(byte[] data,RtcEdit edit)
    {
        var original=data.ToArray();try{return SaveService.EditRtc(data,JsonSerializer.Serialize(edit,SaveJsonContext.Default.RtcEdit));}
        finally{Check(data.SequenceEqual(original),"Clock input preserved on success and rejection");}
    }
    private static void Reject(byte[] data,RtcEdit edit){try{Apply(data,edit);throw new Exception("Invalid clock request accepted");}catch(ArgumentException){}}
    public static void Run()
    {
        SAV3[] seeds=[Ruby(),(SAV3E)SaveUtil.GetSaveFile(File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav"))!];
        foreach(var seed in seeds)
        {
            for(int i=0;i<18;i++)seed.SmallBlock.Data[0x97+i]=(byte)(201+i);
            var data=seed.Write().ToArray();var original=data.ToArray();var catalog=JsonSerializer.Deserialize(SaveService.ReadRtc(data),SaveJsonContext.Default.RtcCatalog)!;
            var draft=new RtcEdit("edit",catalog.Initial,catalog.Elapsed);
            Check(catalog.Initial.SequenceEqual(new[]{(int)BinaryPrimitives.ReadUInt16LittleEndian(seed.SmallBlock.Data[0x98..]),204,205,206}),"Initial full raw clock");
            Check(catalog.Elapsed.SequenceEqual(new[]{(int)BinaryPrimitives.ReadUInt16LittleEndian(seed.SmallBlock.Data[0xA0..]),212,213,214}),"Elapsed full raw clock");
            Check(Apply(data,draft).SequenceEqual(data),"Unchanged abnormal clocks preserve complete file");
            for(int clock=0;clock<2;clock++)for(int field=0;field<4;field++)
            {
                int[] values=field==0?[0,1,733,734,735,32767,32768,65534,65535]:Enumerable.Range(0,field==1?24:60).ToArray();
                foreach(int value in values)
                {
                    var initial=catalog.Initial.ToArray();var elapsed=catalog.Elapsed.ToArray();(clock==0?initial:elapsed)[field]=value;
                    var expected=(SAV3)SaveUtil.GetSaveFile(data.ToArray())!;var raw=expected.SmallBlock.Data.Slice(clock==0?0x98:0xA0,8);
                    if(field==0)BinaryPrimitives.WriteUInt16LittleEndian(raw,(ushort)value);else raw[field+1]=(byte)value;
                    var output=Apply(data,new("edit",initial,elapsed));Check(output.SequenceEqual(expected.Write().ToArray()),"Every time value and day boundary vs raw offsets and full file");Check(SaveUtil.GetSaveFile(output.ToArray())!.ChecksumsValid,"Clock export checksum");
                }
            }
            var reset=(SAV3)SaveUtil.GetSaveFile(data.ToArray())!;reset.SmallBlock.Data.Slice(0x98,5).Clear();reset.SmallBlock.Data.Slice(0xA0,5).Clear();
            Check(Apply(data,new("reset")).SequenceEqual(reset.Write().ToArray()),"Reset clears both clocks but preserves all six padding bytes and neighbors");
            foreach(int days in new[]{0,1,733,734,735,65535})
            {
                var before=(SAV3)SaveUtil.GetSaveFile(data.ToArray())!;BinaryPrimitives.WriteUInt16LittleEndian(before.SmallBlock.Data[0xA0..],(ushort)days);var input=before.Write().ToArray();
                BinaryPrimitives.WriteUInt16LittleEndian(before.SmallBlock.Data[0xA0..],(ushort)Math.Max(days,734));
                Check(Apply(input,new("berryFix")).SequenceEqual(before.Write().ToArray()),"Berry fix is monotonic, bounded and changes only elapsed day");
            }
            foreach(var edit in new RtcEdit[]{new("edit"),new("edit",[],catalog.Elapsed),new("edit",new int[5],catalog.Elapsed),new("edit",catalog.Initial,[]),new("edit",[-1,0,0,0],catalog.Elapsed),new("edit",[65536,0,0,0],catalog.Elapsed),new("edit",[0,24,0,0],catalog.Elapsed),new("edit",[0,0,60,0],catalog.Elapsed),new("edit",[0,0,0,60],catalog.Elapsed),new("edit",[0,256,0,0],catalog.Elapsed),new("edit",catalog.Initial,[0,catalog.Initial[1],0,0]),new("unknown"),new("reset",catalog.Initial),new("berryFix",Elapsed:catalog.Elapsed)})Reject(data,edit);
            Check(data.SequenceEqual(original),"Read preserves input");
            Console.WriteLine($"PASS {seed.GetType().Name}: eight fields, all time values/day boundaries, unusual source preservation, reset padding, berry day threshold, full-file oracle and rejected requests");
        }
        foreach(var version in new[]{"D","HG","X","OR","SN","BD"})
        {
            var data=File.ReadAllBytes($".tmp/pkhex-fixtures/{version}.sav");Reject(data,new("reset"));try{SaveService.ReadRtc(data);throw new Exception("Unsupported clock read accepted");}catch(ArgumentException){}
        }
        try{RtcEditing.Read(new SAV3FRLG());throw new Exception("FRLG clock capability accepted");}catch(ArgumentException){}
    }
}
