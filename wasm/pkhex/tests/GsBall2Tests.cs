// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using System.Text.Json;
using PokeRNGKit.SaveEditor;

internal static class GsBall2Tests
{
    private static void Check(bool value,string message) { if(!value)throw new Exception(message); }
    private static SAV2 Open(byte[] data) => SaveUtil.GetSaveFile(data.ToArray()) as SAV2 ?? throw new Exception("Crystal fixture not recognized");
    private static void Reject(Action action) { try { action();throw new Exception("Invalid GS Ball operation accepted"); } catch(ArgumentException) { } }
    public static void Run()
    {
        foreach(var lang in new[]{LanguageID.English,LanguageID.Japanese})
        {
            bool jp=lang==LanguageID.Japanese;
            var seed=new SAV2(lang,GameVersion.C); var pk=seed.BlankPKM;
            pk.Species=25;pk.CurrentLevel=5;seed.SetBoxSlotAtIndex(pk,0,0);seed.PartyData=[pk];
            var full=seed.Write().ToArray();int primary=jp?0xA000:0x3E3C,backup=jp?0xA083:0x3E44;
            foreach(int length in jp?new[]{0x10000}:new[]{0x8000,0x10000})
            {
                using(var report=JsonDocument.Parse(SaveService.Inspect(full[..length])))
                    Check(report.RootElement.GetProperty("version").GetString()=="C" && report.RootElement.GetProperty("apiVersion").GetInt32() == 97,"Public report matches frontend Crystal gate and protocol");
                foreach(byte a in new byte[]{0,1,0x0B,255})foreach(byte b in new byte[]{0,1,0x0B,255})
                {
                    var s=Open(full[..length]);s.Data[primary]=a;s.Data[backup]=b;
                    s.Data[primary-1]=0xA5;s.Data[primary+1]=0x5A;s.Data[backup-1]=0x96;s.Data[backup+1]=0x69;
                    var data=s.Write().ToArray();var original=data.ToArray();var state=JsonSerializer.Deserialize(SaveService.ReadGsBall2(data),SaveJsonContext.Default.GsBall2Catalog)!;
                    Check(state.Available&&state.CanEdit&&state.Enabled==(a==0x0B),"Exact primary-only upstream enable state");
                    if(a==0x0B){Reject(()=>SaveService.EnableGsBall2(data));Check(data.SequenceEqual(original),"Enabled input unchanged");continue;}
                    var oracle=Open(data);oracle.Data[primary]=oracle.Data[backup]=0x0B;
                    var output=SaveService.EnableGsBall2(data);
                    Check(output.SequenceEqual(oracle.Write().ToArray()),"Independent two-byte/full-file oracle including all regional backups and checksum");
                    Check(data.SequenceEqual(original),"Original immutable");
                    Check(GsBall2.Read(Open(output)).Enabled&&Open(output).Data[backup]==0x0B,"Both states survive output reload");
                    Check(SaveService.ExportWorkingCopy(output).SequenceEqual(output),"Exact working-copy export");
                }
                var clean=Open(full[..length]);clean.Data[primary]=clean.Data[backup]=0;var bytes=clean.Write().ToArray();
                var offsets=new SAV2Offsets(clean);
                foreach(int position in new[]{offsets.OverallChecksumPosition,offsets.OverallChecksumPosition2})
                {
                    var corrupt=bytes.ToArray();corrupt[position]^=1;
                    Check(!GsBall2.Read(Open(corrupt)).CanEdit,"Corrupt checksum disables action");
                    var copy=corrupt.ToArray();Reject(()=>SaveService.EnableGsBall2(corrupt));Check(copy.SequenceEqual(corrupt),"Rejected input preserved");
                }
                Console.WriteLine($"PASS GS Ball {lang}/{length}: all main/backup state combinations, independent raw/full-file oracle, immutable source, checksum rejection and exact export");
            }
            if(jp)
            {
                var shortSave=new SAV2(full[..0x8000],LanguageID.Japanese,GameVersion.C);var before=shortSave.Data.ToArray();
                Check(GsBall2.Read(shortSave) is {Available:false,Enabled:false,CanEdit:false},"Missing Japanese extension stays unavailable without out-of-bounds read");
                Reject(()=>GsBall2.Apply(shortSave));Check(shortSave.Data.SequenceEqual(before),"Missing extension is never padded or written");
            }
        }
        Reject(()=>GsBall2.Read(new SAV2(LanguageID.English,GameVersion.GS)));
        Reject(()=>GsBall2.Read(new SAV2(LanguageID.Korean,GameVersion.GS)));
        Reject(()=>GsBall2.Read(new SAV1()));
    }
}
