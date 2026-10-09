// SPDX-License-Identifier: GPL-3.0-or-later
using System.Security.Cryptography;
using System.Text.Json;
using PKHeX.Core;

namespace PokeRNGKit.SaveEditor;

public sealed record Ferry3Flag(int Index, bool Value);
public sealed record Ferry3Ticket(int Id, LocalizedText Name, bool Present);
public sealed record Ferry3Addition(int Id, int Slot);
public sealed record Ferry3Plan(bool IncludeOldSeaMap, string Status, int[] Have, int[] Missing, Ferry3Addition[] Additions);
public sealed record Ferry3Catalog(bool CanEdit, bool Japanese, string SourceHash, Ferry3Flag[] Flags, Ferry3Ticket[] Tickets, Ferry3Plan[] Plans);
public sealed record Ferry3Edit(string Action, Ferry3Flag[]? Flags = null, bool? IncludeOldSeaMap = null, string? SourceHash = null);

internal static class Ferry3Editing
{
    private static readonly int[] FlagIndices = [0x864,0x8B3,0x8D5,0x8D6,0x8E0,0x1D0,0x1AE,0x1AF,0x1B0,0x1DB];
    private static readonly ushort[] TicketIds = [265,275,370,371,376];
    private static SAV3E Save(SaveFile save) => save as SAV3E ?? throw new ArgumentException("Gen3 ferry editing is unavailable for this format.");
    internal static string Hash(byte[] data) => Convert.ToHexString(SHA256.HashData(data));
    internal static Ferry3Plan Plan(SAV3E save, InventoryPouch pouch, bool include)
    {
        include |= save.Japanese || pouch.HasItem(376);
        var requested = TicketIds.Where(id => id != 376 || include).ToArray();
        var have = requested.Where(pouch.HasItem).Select(id => (int)id).ToArray();
        var missing = requested.Where(id => !pouch.HasItem(id)).Select(id => (int)id).ToArray();
        int start = pouch.FindIndexFirstEmptySlot();
        string status = missing.Length == 0 ? "complete"
            : start < 0 || start + missing.Length >= pouch.Items.Length ? "space"
            : Enumerable.Range(start, missing.Length).Any(i => pouch.Items[i].Index != 0) ? "occupied" : "ready";
        var additions = status == "ready" ? missing.Select((id,i) => new Ferry3Addition(id,start+i)).ToArray() : [];
        return new(include,status,have,missing,additions);
    }
    internal static Ferry3Catalog Read(SaveFile save, string hash)
    {
        var s = Save(save); var p = s.Inventory.GetPouch(InventoryType.KeyItems);
        var zh = GameInfo.GetStrings("zh-Hans").GetItemStrings(s.Context,s.Version);
        var en = GameInfo.GetStrings("en").GetItemStrings(s.Context,s.Version);
        var ja = GameInfo.GetStrings("ja").GetItemStrings(s.Context,s.Version);
        return new(s.State.Exportable && SaveChecksums.Valid(s),s.Japanese,hash,
            FlagIndices.Select(i => new Ferry3Flag(i,s.GetEventFlag(i))).ToArray(),
            TicketIds.Select(id => new Ferry3Ticket(id,new(zh[id],en[id],ja[id]),p.HasItem(id))).ToArray(),
            [Plan(s,p,false),Plan(s,p,true)]);
    }
    internal static byte[] Snapshot(SaveFile save)
    {
        var s = Save(save);
        return [..s.Large.Slice(0x1270,300),..s.LargeBlock.Inventory,..s.Small.Slice(0xAC,4)];
    }
    internal static void Apply(SaveFile save, Ferry3Edit edit, string hash)
    {
        var s = Save(save);
        if (!s.State.Exportable || !SaveChecksums.Valid(s)) throw new ArgumentException("Gen3 ferry editing requires valid checksums.");
        switch(edit.Action)
        {
            case "flags" when edit.Flags is {} flags && edit.IncludeOldSeaMap is null && edit.SourceHash is null:
                if (flags.Length is 0 or > 10 || flags.Any(v => v is null) || flags.Select(v=>v.Index).Distinct().Count()!=flags.Length
                    || flags.Any(v=>!FlagIndices.Contains(v.Index))) throw new ArgumentException("Invalid Gen3 ferry flags.");
                foreach(var flag in flags) s.SetEventFlag(flag.Index,flag.Value);
                break;
            case "tickets" when edit.Flags is null && edit.IncludeOldSeaMap is {} include && edit.SourceHash is {} expected:
                if (expected.Length!=64 || !StringComparer.Ordinal.Equals(expected,hash)) throw new ArgumentException("The ferry ticket preview is stale. Read it again.");
                var pouch = s.Inventory.GetPouch(InventoryType.KeyItems);
                var plan = Plan(s,pouch,include);
                if (plan.Status!="ready") throw new ArgumentException("Ferry tickets cannot be added: "+plan.Status);
                foreach(var addition in plan.Additions) { pouch.Items[addition.Slot].Index=addition.Id; pouch.Items[addition.Slot].Count=1; }
                // Use Core's keyed codec for only the selected pouch; no sorting, clamping or other pouch writes.
                pouch.SetPouch(s.LargeBlock.Inventory);
                break;
            default: throw new ArgumentException("Invalid Gen3 ferry action or mixed fields.");
        }
    }
    internal static byte[] Edit(byte[] data,Ferry3Edit edit)
    {
        if (data.Length is 0 or > (32*1024*1024)) throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        var s = Save(SaveUtil.GetSaveFile(data.ToArray()) ?? throw new ArgumentException("Unrecognized save."));
        Apply(s,edit,Hash(data)); var expected=Snapshot(s); var output=s.Write().ToArray();
        var check=Save(SaveUtil.GetSaveFile(output.ToArray()) ?? throw new InvalidOperationException("Gen3 ferry output was not recognized."));
        if(output.Length!=data.Length || check.GetType()!=s.GetType() || check.Version!=s.Version || check.SaveRevision!=s.SaveRevision || check.Japanese!=s.Japanese
            || !SaveChecksums.Valid(check) || !expected.SequenceEqual(Snapshot(check))) throw new InvalidOperationException("Gen3 ferry export verification failed.");
        return output;
    }
}
public static partial class SaveService
{
    public static string ReadFerry3(byte[] data) => JsonSerializer.Serialize(Ferry3Editing.Read(Open(data),Ferry3Editing.Hash(data)),SaveJsonContext.Default.Ferry3Catalog);
    public static byte[] EditFerry3(byte[] data,string json)
    {
        if(json.Length>2048) throw new ArgumentException("Gen3 ferry request is too large.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Ferry3Edit) ?? throw new ArgumentException("Missing Gen3 ferry edit.");
        return Ferry3Editing.Edit(data,edit);
    }
}
