using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using System.Text.Json.Serialization;
using PKHeX.Core;

// SPDX-License-Identifier: GPL-3.0-or-later
namespace PokeRNGKit.SaveEditor;

public static partial class Program
{
    public static void Main() { }

    [JSExport]
    public static void ConfigureBrowserCrypto()
    {
        RuntimeCryptographyProvider.Aes = new BrowserAesProvider();
        RuntimeCryptographyProvider.Md5 = new BrowserMd5Provider();
    }

    [JSExport]
    public static string Inspect(byte[] data) => SaveService.Inspect(data);

    [JSExport]
    public static string ReadPokedex9a(byte[] data) => SaveService.ReadPokedex9a(data);
    [JSExport]
    public static byte[] EditPokedex9a(byte[] data, string json) => SaveService.EditPokedex9a(data, json);
    [JSExport]
    public static string ReadPokedex9(byte[] data) => SaveService.ReadPokedex9(data);
    [JSExport]
    public static byte[] EditPokedex9(byte[] data, string json) => SaveService.EditPokedex9(data, json);
    [JSExport]
    public static string ReadPokedex8a(byte[] data) => SaveService.ReadPokedex8a(data);
    [JSExport]
    public static byte[] EditPokedex8a(byte[] data,string json) => SaveService.EditPokedex8a(data,json);
    [JSExport]
    public static string ReadPokedex8(byte[] data) => SaveService.ReadPokedex8(data);
    [JSExport]
    public static byte[] EditPokedex8(byte[] data, string json) => SaveService.EditPokedex8(data, json);
    [JSExport]
    public static string ReadPokedex8b(byte[] data) => SaveService.ReadPokedex8b(data);
    [JSExport]
    public static byte[] EditPokedex8b(byte[] data, string json) => SaveService.EditPokedex8b(data, json);

    [JSExport]
    public static string ReadPokedex7(byte[] data) => SaveService.ReadPokedex7(data);
    [JSExport]
    public static byte[] EditPokedex7(byte[] data, string json) => SaveService.EditPokedex7(data, json);

    [JSExport]
    public static string ReadPokedex6(byte[] data) => SaveService.ReadPokedex6(data);

    [JSExport]
    public static byte[] EditPokedex6(byte[] data, string json) => SaveService.EditPokedex6(data, json);

    [JSExport]
    public static string ReadPokedex5(byte[] data) => SaveService.ReadPokedex5(data);

    [JSExport]
    public static byte[] EditPokedex5(byte[] data, string json) => SaveService.EditPokedex5(data, json);

    [JSExport]
    public static string ReadPokedex4(byte[] data) => SaveService.ReadPokedex4(data);

    [JSExport]
    public static byte[] EditPokedex4(byte[] data, string json) => SaveService.EditPokedex4(data, json);

    [JSExport]
    public static string ReadInventory(byte[] data) => SaveService.ReadInventory(data);

    [JSExport]
    public static string ReadPokedex(byte[] data, string json) => SaveService.ReadPokedex(data, json);

    [JSExport]
    public static byte[] EditPokedex(byte[] data, string json) => SaveService.EditPokedex(data, json);

    [JSExport]
    public static byte[] ExportWorkingCopy(byte[] data) => SaveService.ExportWorkingCopy(data);

    [JSExport]
    public static string ReadEvents(byte[] data, string json) => SaveService.ReadEvents(data, json);
    [JSExport]
    public static byte[] EditEvents(byte[] data, string json) => SaveService.EditEvents(data, json);
    [JSExport]
    public static string CompareEvents(byte[] data, string json) => SaveService.CompareEvents(data, json);
    [JSExport]
    public static string ReadEventReset(byte[] data, string json) => SaveService.ReadEventReset(data, json);
    [JSExport]
    public static byte[] EditEventReset(byte[] data, string json) => SaveService.EditEventReset(data, json);
    [JSExport]
    public static string ReadHall1(byte[] data) => SaveService.ReadHall1(data);
    [JSExport]
    public static byte[] EditHall1(byte[] data, string json) => SaveService.EditHall1(data, json);
    [JSExport]
    public static string ReadRoamer(byte[] data) => SaveService.ReadRoamer(data);
    [JSExport]
    public static byte[] EditRoamer(byte[] data, string json) => SaveService.EditRoamer(data, json);
    [JSExport]
    public static string ReadRtc(byte[] data) => SaveService.ReadRtc(data);
    [JSExport]
    public static byte[] EditRtc(byte[] data, string json) => SaveService.EditRtc(data, json);

    [JSExport]
    public static string ReadOPowers(byte[] data) => SaveService.ReadOPowers(data);
    [JSExport]
    public static byte[] EditOPowers(byte[] data, string json) => SaveService.EditOPowers(data, json);

    [JSExport]
    public static string ReadFood(byte[] data) => SaveService.ReadFood(data);
    [JSExport]
    public static byte[] EditFood(byte[] data, string json) => SaveService.EditFood(data, json);

    [JSExport]
    public static string ReadRecords(byte[] data) => SaveService.ReadRecords(data);

    [JSExport]
    public static byte[] EditRecord(byte[] data,string json) => SaveService.EditRecord(data,json);

    [JSExport]
    public static byte[] EditInventory(byte[] data, string json) => SaveService.EditInventory(data, json);

    [JSExport]
    public static byte[] EditInventoryBatch(byte[] data, string json) => SaveService.EditInventoryBatch(data, json);

    [JSExport]
    public static byte[] Export(byte[] data, string json) => SaveService.Export(data, json);

    [JSExport]
    public static string AnalyzePokemon(byte[] data, string json) => SaveService.AnalyzePokemon(data, json);

    [JSExport]
    public static byte[] EditPokemon(byte[] data, string json) => SaveService.EditPokemon(data, json);

    [JSExport]
    public static byte[] EditPokemonRaw(byte[] data, string json) => SaveService.EditPokemonRaw(data, json);

    [JSExport]
    public static byte[] EditBox(byte[] data, string json) => SaveService.EditBox(data, json);

    [JSExport]
    public static byte[] EditStorage(byte[] data, string json) => SaveService.EditStorage(data, json);

    [JSExport]
    public static string ExportPokemon(byte[] data, string json) => SaveService.ExportPokemon(data, json);

    [JSExport]
    public static byte[] ExportBoxes(byte[] data, string json) => SaveService.ExportBoxes(data, json);

    [JSExport]
    public static string ReadHistory(byte[] data, string json) => SaveService.ReadHistory(data, json);

    [JSExport]
    public static string ReadMemory(byte[] data, string json) => SaveService.ReadMemory(data, json);

    [JSExport]
    public static string ReadRibbons(byte[] data, string json) => SaveService.ReadRibbons(data, json);

    [JSExport]
    public static string SuggestRelearn(byte[] data, string json) => SaveService.SuggestRelearn(data, json);

    [JSExport]
    public static string ReadOrigin(byte[] data, string json) => SaveService.ReadOrigin(data, json);

    [JSExport]
    public static byte[] ImportPokemon(byte[] data, string json) => SaveService.ImportPokemon(data, json);
}

public static partial class SaveService
{
    public const int ApiVersion = 85;
    public const int MaximumSize = 32 * 1024 * 1024;
    public static string ReadPokedex9a(byte[] data) => JsonSerializer.Serialize(ZaPokedex.Read(Open(data)), SaveJsonContext.Default.Dex9aCatalog);
    public static byte[] EditPokedex9a(byte[] data, string json)
    {
        var save = Open(data);
        if (!ZaPokedex.Supports(save) || !save.State.Exportable || !SaveChecksums.Valid(save)) throw new ArgumentException("Pokedex editing requires a supported valid save.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Dex9aEdit) ?? throw new ArgumentException("Pokedex edit is missing.");
        var expected = ZaPokedex.Apply(save, edit); var output = save.Write().ToArray(); var check = Open(output);
        if (check is not SAV9ZA after || !ZaPokedex.Supports(check) || !SaveChecksums.Valid(check) || ZaPokedex.Snapshot(after) != expected) throw new InvalidOperationException("Pokedex export verification failed.");
        return output;
    }
    public static string ReadPokedex9(byte[] data) => JsonSerializer.Serialize(SvPokedex.Read(Open(data)), SaveJsonContext.Default.Dex9Catalog);
    public static byte[] EditPokedex9(byte[] data, string json)
    {
        var save = Open(data);
        if (save is not SAV9SV || !save.State.Exportable || !SaveChecksums.Valid(save)) throw new ArgumentException("Pokedex editing requires a supported valid save.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Dex9Edit) ?? throw new ArgumentException("Pokedex edit is missing.");
        var expected = SvPokedex.Apply(save, edit); var output = save.Write().ToArray(); var check = Open(output);
        if (check is not SAV9SV after || !SaveChecksums.Valid(check) || SvPokedex.Snapshot(after) != expected) throw new InvalidOperationException("Pokedex export verification failed.");
        return output;
    }

    public static string ReadPokedex8a(byte[] data) => JsonSerializer.Serialize(LegendsPokedex.Read(Open(data)),SaveJsonContext.Default.Dex8aCatalog);
    public static byte[] EditPokedex8a(byte[] data,string json)
    {
        var save=Open(data);
        if(save is not SAV8LA||!save.State.Exportable||!SaveChecksums.Valid(save))throw new ArgumentException("Pokedex editing requires a supported valid save.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Dex8aEdit)??throw new ArgumentException("Pokedex edit is missing.");
        var expected=LegendsPokedex.Apply(save,edit);var output=save.Write().ToArray();var check=Open(output);
        if(check is not SAV8LA after||check.GetType()!=save.GetType()||!SaveChecksums.Valid(check)||LegendsPokedex.Snapshot(after)!=expected)throw new InvalidOperationException("Pokedex export verification failed.");
        return output;
    }
    public static string ReadPokedex8(byte[] data) => JsonSerializer.Serialize(SwshPokedex.Read(Open(data)),SaveJsonContext.Default.Dex8Catalog);
    public static byte[] EditPokedex8(byte[] data,string json)
    {
        var save=Open(data);
        if(save is not SAV8SWSH||!save.State.Exportable||!SaveChecksums.Valid(save))throw new ArgumentException("Pokedex editing requires a supported valid save.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Dex8Edit)??throw new ArgumentException("Pokedex edit is missing.");
        var expected=SwshPokedex.Apply(save,edit);var output=save.Write().ToArray();var check=Open(output);
        if(check is not SAV8SWSH after||check.GetType()!=save.GetType()||!SaveChecksums.Valid(check)||SwshPokedex.Snapshot(after)!=expected)throw new InvalidOperationException("Pokedex export verification failed.");
        return output;
    }
    public static string ReadPokedex8b(byte[] data) => JsonSerializer.Serialize(BdspPokedex.Read(Open(data)),SaveJsonContext.Default.Dex8bCatalog);
    public static byte[] EditPokedex8b(byte[] data,string json)
    {
        var save=Open(data);
        if(save is not SAV8BS||!save.State.Exportable||!SaveChecksums.Valid(save))throw new ArgumentException("Pokedex editing requires a supported valid save.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Dex8bEdit)??throw new ArgumentException("Pokedex edit is missing.");
        var expected=BdspPokedex.Apply(save,edit);var output=save.Write().ToArray();var check=Open(output);
        if(check is not SAV8BS after||check.GetType()!=save.GetType()||!SaveChecksums.Valid(check)||BdspPokedex.Snapshot(after)!=expected)throw new InvalidOperationException("Pokedex export verification failed.");
        return output;
    }
    public static string ReadPokedex7(byte[] data) => JsonSerializer.Serialize(Gen7Pokedex.Read(Open(data)), SaveJsonContext.Default.Dex7Catalog);
    public static byte[] EditPokedex7(byte[] data,string json)
    {
        var save=Open(data);
        if(save is not (SAV7 or SAV7b)||!save.State.Exportable||!SaveChecksums.Valid(save))throw new ArgumentException("Pokedex editing requires a supported valid save.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Dex7Edit)??throw new ArgumentException("Pokedex edit is missing.");
        var expected=Gen7Pokedex.Apply(save,edit);var output=save.Write().ToArray();var check=Open(output);
        if(check.GetType()!=save.GetType()||!SaveChecksums.Valid(check)||Gen7Pokedex.Snapshot(check)!=expected)throw new InvalidOperationException("Pokedex export verification failed.");
        return output;
    }
    public static string ReadPokedex6(byte[] data) => JsonSerializer.Serialize(Gen6Pokedex.Read(Open(data)), SaveJsonContext.Default.Dex6Catalog);
    public static byte[] EditPokedex6(byte[] data,string json)
    {
        var save=Open(data);
        if(save is not (SAV6XY or SAV6AO)||!save.State.Exportable||!SaveChecksums.Valid(save))throw new ArgumentException("Pokedex editing requires a supported valid save.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Dex6Edit)??throw new ArgumentException("Pokedex edit is missing.");
        var expected=Gen6Pokedex.Apply(save,edit);var output=save.Write().ToArray();var check=Open(output);
        if(check is not SAV6 after||check.GetType()!=save.GetType()||!SaveChecksums.Valid(check)||Gen6Pokedex.Snapshot(after)!=expected)throw new InvalidOperationException("Pokedex export verification failed.");
        return output;
    }
    public static string ReadPokedex5(byte[] data) => JsonSerializer.Serialize(Gen5Pokedex.Read(Open(data)), SaveJsonContext.Default.Dex5Catalog);
    public static byte[] EditPokedex5(byte[] data,string json)
    {
        var save=Open(data);
        if(save is not SAV5 gen5||!save.State.Exportable||!SaveChecksums.Valid(save))throw new ArgumentException("Pokedex editing requires a supported valid save.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.Dex5Edit)??throw new ArgumentException("Pokedex edit is missing.");
        var expected=Gen5Pokedex.Apply(gen5,edit);var output=save.Write().ToArray();var check=Open(output);
        if(check is not SAV5 after||check.GetType()!=save.GetType()||!SaveChecksums.Valid(check)||Gen5Pokedex.Snapshot(after)!=expected)throw new InvalidOperationException("Pokedex export verification failed.");
        return output;
    }
    public static string ReadPokedex4(byte[] data) => JsonSerializer.Serialize(Gen4Pokedex.Read(Open(data)), SaveJsonContext.Default.Dex4Catalog);
    public static byte[] EditPokedex4(byte[] data, string json)
    {
        var save = Open(data);
        if (save is not SAV4 gen4 || !save.State.Exportable || !SaveChecksums.Valid(save)) throw new ArgumentException("Pokedex editing requires a supported valid save.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.Dex4Edit) ?? throw new ArgumentException("Pokedex edit is missing.");
        var expected = Gen4Pokedex.Apply(gen4, edit);
        var output = save.Write().ToArray(); var check = Open(output);
        if (check is not SAV4 after || check.GetType() != save.GetType() || !SaveChecksums.Valid(check) || Gen4Pokedex.Snapshot(after) != expected)
            throw new InvalidOperationException("Pokedex export verification failed.");
        return output;
    }
    public static string ReadPokedex(byte[] data, string json)
    {
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SimpleDexQuery) ?? throw new ArgumentException("Missing Pokedex query.");
        return JsonSerializer.Serialize(SimplePokedex.Read(Open(data), query.FileName), SaveJsonContext.Default.SimpleDexCatalog);
    }
    public static byte[] EditPokedex(byte[] data, string json)
    {
        var save = Open(data);
        if (!SimplePokedex.Supports(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Pokedex editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.SimpleDexEdit) ?? throw new ArgumentException("Missing Pokedex edit.");
        var expected = SimplePokedex.Apply(save, edit);
        var output = save.Write().ToArray(); var check = Open(output);
        if (!SaveChecksums.Valid(check) || check.GetType() != save.GetType() || SimplePokedex.Snapshot(check) != expected)
            throw new InvalidOperationException("Pokedex export verification failed.");
        return output;
    }
    public static byte[] ExportWorkingCopy(byte[] data)
    {
        var save = Open(data);
        if ((!CanEdit(save) && !SimplePokedex.Supports(save) && !ZaPokedex.Supports(save) && save is not (SAV7b or SAV8LA or SAV9SV)) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Export requires a supported save with valid checksums.");
        // Every edit already recomputes checksums and verifies a reload. Preserve those exact verified bytes.
        return data.ToArray();
    }

    public static string ReadRecords(byte[] data) => JsonSerializer.Serialize(SaveRecords.Read(Open(data)),SaveJsonContext.Default.SaveRecordCatalog);
    public static byte[] EditRecord(byte[] data,string json)
    {
        var save=Open(data);
        if(!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit=JsonSerializer.Deserialize(json,SaveJsonContext.Default.SaveRecordEdit) ?? throw new ArgumentException("Missing game record edit.");
        var expected=SaveRecords.Apply(save,edit);
        var output=save.Write().ToArray(); var check=Open(output);
        if(!SaveChecksums.Valid(check) || check.GetType()!=save.GetType() || SaveRecords.Snapshot(check)!=expected)
            throw new InvalidOperationException("Game record export verification failed.");
        return output;
    }

    public static string ReadInventory(byte[] data) =>
        JsonSerializer.Serialize(InventoryReader.Read(Open(data)), SaveJsonContext.Default.BagReport);

    public static byte[] EditInventory(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.BagEdit) ?? throw new ArgumentException("Missing inventory edit.");
        var expected = InventoryEditing.Apply(save, edit);
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!SaveChecksums.Valid(check) || check.GetType() != save.GetType() || InventoryEditing.Snapshot(check) != expected)
            throw new InvalidOperationException("Inventory export verification failed.");
        return output;
    }

    public static byte[] EditInventoryBatch(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.BagOperation) ?? throw new ArgumentException("Missing inventory action.");
        var expected = InventoryBatch.Apply(save,edit);
        var output = save.Write().ToArray(); var check = Open(output);
        if (!SaveChecksums.Valid(check) || check.GetType() != save.GetType() || InventoryEditing.Snapshot(check) != expected)
            throw new InvalidOperationException("Inventory export verification failed.");
        return output;
    }

    private static SaveFile Open(byte[] data)
    {
        if (data.Length is 0 or > MaximumSize)
            throw new ArgumentException("Save file must be between 1 byte and 32 MiB.");
        if (data.Length >= 4 && data[0] == 0x50 && data[1] == 0x4B && data[2] == 3 && data[3] == 4)
            throw new ArgumentException("Extract the save from its ZIP archive before opening it.");
        // PKHeX owns this copy. Never pass the caller's original buffer to a parser.
        return SaveUtil.GetSaveFile(data.ToArray())
            ?? throw new ArgumentException("Unrecognized save file. Open decrypted save data, not a ROM or encrypted console container.");
    }

    internal static bool CanEdit(SaveFile save) => save is
        SAV3RS or SAV3E or SAV3FRLG or SAV3Colosseum or SAV3XD or
        SAV4DP or SAV4Pt or SAV4HGSS or SAV5BW or SAV5B2W2 or
        SAV6XY or SAV6AO or SAV7SM or SAV7USUM or SAV8SWSH or SAV8BS;

    public static string ReadHistory(byte[] data, string json)
    {
        var save = Open(data);
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonPosition) ?? throw new ArgumentException("Missing history query.");
        return JsonSerializer.Serialize(PokemonHistory.Read(PokemonEditing.Read(save, query.Box, query.Slot)), SaveJsonContext.Default.HistoryCatalog);
    }

    public static string ReadMemory(byte[] data, string json)
    {
        var save = Open(data);
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.MemoryQuery) ?? throw new ArgumentException("Missing memory query.");
        return JsonSerializer.Serialize(PokemonMemories.Read(PokemonEditing.Read(save, query.Box, query.Slot), query.Handler, query.Memory), SaveJsonContext.Default.MemoryCatalog);
    }

    public static string ReadRibbons(byte[] data, string json)
    {
        var save = Open(data);
        var position = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonPosition) ?? throw new ArgumentException("Missing Pokemon position.");
        return JsonSerializer.Serialize(PokemonRibbons.Read(PokemonEditing.Read(save, position.Box, position.Slot), analyze: true), SaveJsonContext.Default.RibbonCatalog);
    }

    public static string SuggestRelearn(byte[] data, string json)
    {
        var save = Open(data);
        var position = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonPosition)
            ?? throw new ArgumentException("Missing Pokemon position.");
        return JsonSerializer.Serialize(PokemonRelearn.Suggest(save, position), SaveJsonContext.Default.UInt16Array);
    }

    public static string ReadOrigin(byte[] data, string json)
    {
        var save = Open(data);
        var query = JsonSerializer.Deserialize(json, SaveJsonContext.Default.OriginQuery)
            ?? throw new ArgumentException("Missing origin query.");
        return JsonSerializer.Serialize(PokemonOrigin.Catalog(save, query), SaveJsonContext.Default.OriginCatalog);
    }

    public static string AnalyzePokemon(byte[] data, string json)
    {
        var save = Open(data);
        var position = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonPosition)
            ?? throw new ArgumentException("Missing Pokemon position.");
        return JsonSerializer.Serialize(PokemonLegality.Analyze(save, position), SaveJsonContext.Default.PokemonLegalityReport);
    }

    public static byte[] EditPokemon(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonEdit)
            ?? throw new ArgumentException("Missing Pokemon values.");
        edit = PokemonEditing.Apply(save, edit);
        var position = new PokemonPosition(edit.Box, edit.Slot);
        var expected = StorageEditing.StoredData(save, position);
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!SaveChecksums.Valid(check) || check.GetType() != save.GetType() || !StorageEditing.StoredData(check, position).SequenceEqual(expected))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        PokemonEditing.Verify(check, edit);
        return output;
    }

    public static string Inspect(byte[] data)
    {
        var save = Open(data);
        var valid = SaveChecksums.Valid(save);
        var report = new SaveReport(
            ApiVersion, save.GetType().Name, save.Generation, save.Version.ToString(),
            save.OT, save.TID16, save.SID16, save.DisplayTID, save.DisplaySID,
            save.Language, save.Gender, save.Money, save.MaxMoney,
            save is SAV3 { Japanese: true } ? 5 : save.MaxStringLengthTrainer,
            save.BoxCount, save.PartyCount, save.PlayTimeString, valid,
            valid && CanEdit(save) && save.State.Exportable,
            save.Extension, save is SAV4 gen4 ? gen4.NationalDex : null,
            PokemonReader.Read(save), save.BoxSlotCount, PokemonReader.Boxes(save), PokemonReader.MoveChoices(save), BoxEditing.Options(save), PokemonReader.Attributes(save), TrainerEditing.Options(save), ZaPokedex.Supports(save) ? new PokedexCapability("za", valid && save.State.Exportable) : save is SAV9SV ? new PokedexCapability("sv", valid && save.State.Exportable) : save is SAV8LA ? new PokedexCapability("legends", valid && save.State.Exportable) : save is SAV8SWSH ? new PokedexCapability("swsh", valid && save.State.Exportable) : save is SAV8BS ? new PokedexCapability("bdsp", valid && save.State.Exportable) : save is SAV7 or SAV7b ? new PokedexCapability("gen7", valid && save.State.Exportable) : save is SAV6XY or SAV6AO ? new PokedexCapability("gen6", valid && save.State.Exportable) : save is SAV5 ? new PokedexCapability("gen5", valid && save.State.Exportable) : save is SAV4 ? new PokedexCapability("gen4", valid && save.State.Exportable) : SimplePokedex.Capability(save));
        return JsonSerializer.Serialize(report, SaveJsonContext.Default.SaveReport);
    }

    public static string ExportPokemon(byte[] data, string json)
    {
        var save = Open(data);
        var position = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonPosition)
            ?? throw new ArgumentException("Missing Pokemon position.");
        return JsonSerializer.Serialize(PokemonFiles.Export(save, position), SaveJsonContext.Default.PokemonFile);
    }

    public static byte[] ExportBoxes(byte[] data, string json)
    {
        var save = Open(data);
        if (!SaveChecksums.Valid(save)) throw new ArgumentException("Box archive requires valid save checksums.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.BoxArchiveRequest)
            ?? throw new ArgumentException("Box archive options are missing.");
        return BoxArchive.Export(save, request);
    }

    public static byte[] ImportPokemon(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var request = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonImport)
            ?? throw new ArgumentException("Missing Pokemon file.");
        var position = PokemonFiles.Import(save, request);
        var expected = StorageEditing.StoredData(save, position);
        var partyCount = save.PartyCount;
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!SaveChecksums.Valid(check) || check.GetType() != save.GetType() || check.PartyCount != partyCount ||
            !StorageEditing.StoredData(check, position).SequenceEqual(expected))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        return output;
    }

    public static byte[] EditPokemonRaw(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.PokemonRawEdit)
            ?? throw new ArgumentException("Missing Pokemon values.");
        PokemonRawEditing.Apply(save, edit);
        var position = new PokemonPosition(edit.Box, edit.Slot);
        var expected = StorageEditing.StoredData(save, position);
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!SaveChecksums.Valid(check) || check.GetType() != save.GetType() || check.PartyCount != save.PartyCount ||
            !StorageEditing.StoredData(check, position).SequenceEqual(expected))
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        return output;
    }

    public static byte[] EditStorage(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.StorageEdit)
            ?? throw new ArgumentException("Missing storage values.");
        if (edit.Source is null) throw new ArgumentException("Storage source is missing.");
        var positions = StorageEditing.Apply(save, edit);
        var expected = positions.Select(p => StorageEditing.StoredData(save, p)).ToArray();
        var partyCount = save.PartyCount;
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!SaveChecksums.Valid(check) || check.GetType() != save.GetType() || check.PartyCount != partyCount ||
            positions.Where((position, index) => !StorageEditing.StoredData(check, position).SequenceEqual(expected[index])).Any())
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        return output;
    }

    public static byte[] EditBox(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.BoxEdit)
            ?? throw new ArgumentException("Missing box values.");
        BoxEditing.Apply(save, edit);
        var expected = BoxEditing.Snapshot(save);
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!SaveChecksums.Valid(check) || check.GetType() != save.GetType())
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        BoxEditing.Verify(check, edit);
        if (BoxEditing.Snapshot(check) != expected) throw new InvalidOperationException("Export verification failed. No file was exported.");
        return output;
    }

    public static byte[] Export(byte[] data, string json)
    {
        var save = Open(data);
        if (!CanEdit(save) || !save.State.Exportable || !SaveChecksums.Valid(save))
            throw new ArgumentException("Editing requires a supported save with valid checksums.");
        var edit = JsonSerializer.Deserialize(json, SaveJsonContext.Default.TrainerEdit)
            ?? throw new ArgumentException("Missing trainer values.");
        TrainerEditing.Apply(save,edit);
        var expected = TrainerEditing.Snapshot(save);
        var output = save.Write().ToArray();
        var check = Open(output);
        if (!SaveChecksums.Valid(check) || check.GetType() != save.GetType() ||
            TrainerEditing.Snapshot(check) != expected)
            throw new InvalidOperationException("Export verification failed. No file was exported.");
        return output;
    }
}

public sealed record SaveReport(
    int ApiVersion, string Format, byte Generation, string Version, string Ot,
    ushort Tid, ushort Sid, uint DisplayTid, uint DisplaySid, int Language,
    byte Gender, uint Money, int MaxMoney, int MaxNameLength, int BoxCount,
    int PartyCount, string PlayTime, bool ChecksumsValid, bool CanEdit,
    string Extension, bool? NationalDex, PokemonEntry[] Pokemon, int BoxSlotCount, BoxEntry[] Boxes, MoveChoice[] MoveChoices, BoxOptions BoxOptions, AttributeChoices AttributeChoices, TrainerOptions Trainer, PokedexCapability? Pokedex);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(SaveReport))]
[JsonSerializable(typeof(Dex9aCatalog))]
[JsonSerializable(typeof(Dex9aEdit))]
[JsonSerializable(typeof(Dex9Catalog))]
[JsonSerializable(typeof(Dex9Edit))]
[JsonSerializable(typeof(Dex8aCatalog))]
[JsonSerializable(typeof(Dex8aEdit))]
[JsonSerializable(typeof(Dex8Catalog))]
[JsonSerializable(typeof(Dex8Edit))]
[JsonSerializable(typeof(Dex8bCatalog))]
[JsonSerializable(typeof(Dex8bEdit))]
[JsonSerializable(typeof(Dex7Catalog))]
[JsonSerializable(typeof(Dex7Edit))]
[JsonSerializable(typeof(Dex6Catalog))]
[JsonSerializable(typeof(Dex6Edit))]
[JsonSerializable(typeof(Dex5Catalog))]
[JsonSerializable(typeof(Dex5Edit))]
[JsonSerializable(typeof(Dex4Catalog))]
[JsonSerializable(typeof(Dex4Edit))]
[JsonSerializable(typeof(SimpleDexQuery))]
[JsonSerializable(typeof(SimpleDexCatalog))]
[JsonSerializable(typeof(SimpleDexEdit))]
[JsonSerializable(typeof(EventQuery))]
[JsonSerializable(typeof(EventCatalog))]
[JsonSerializable(typeof(EventEdit))]
[JsonSerializable(typeof(EventCompareQuery))]
[JsonSerializable(typeof(EventDiff))]
[JsonSerializable(typeof(EventResetCatalog))]
[JsonSerializable(typeof(EventResetEdit))]
[JsonSerializable(typeof(Hall1Catalog))]
[JsonSerializable(typeof(Hall1Edit))]
[JsonSerializable(typeof(RoamerCatalog))]
[JsonSerializable(typeof(RoamerEdit))]
[JsonSerializable(typeof(RtcCatalog))]
[JsonSerializable(typeof(RtcEdit))]
[JsonSerializable(typeof(OPowerCatalog))]
[JsonSerializable(typeof(OPowerEdit))]
[JsonSerializable(typeof(SaveFoodCatalog))]
[JsonSerializable(typeof(SaveFoodEdit))]
[JsonSerializable(typeof(SaveRecordCatalog))]
[JsonSerializable(typeof(SaveRecordEdit))]
[JsonSerializable(typeof(BagReport))]
[JsonSerializable(typeof(BagEdit))]
[JsonSerializable(typeof(BagOperation))]
[JsonSerializable(typeof(RibbonCatalog))]
[JsonSerializable(typeof(MemoryQuery))]
[JsonSerializable(typeof(MemoryCatalog))]
[JsonSerializable(typeof(HistoryCatalog))]
[JsonSerializable(typeof(ushort[]))]
[JsonSerializable(typeof(OriginQuery))]
[JsonSerializable(typeof(OriginCatalog))]
[JsonSerializable(typeof(TrainerEdit))]
[JsonSerializable(typeof(PokemonEdit))]
[JsonSerializable(typeof(PokemonRawEdit))]
[JsonSerializable(typeof(BoxEdit))]
[JsonSerializable(typeof(StorageEdit))]
[JsonSerializable(typeof(PokemonImport))]
[JsonSerializable(typeof(PokemonFile))]
[JsonSerializable(typeof(BoxArchiveRequest))]
[JsonSerializable(typeof(PokemonPosition))]
[JsonSerializable(typeof(PokemonLegalityReport))]
internal partial class SaveJsonContext : JsonSerializerContext;
