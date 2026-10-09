using System.Text.Json;
using PKHeX.Core;
using PokeRNGKit.SaveEditor;

internal static class SaveEditorTests
{
    private static void Require(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    public static void Main()
    {
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "gs-ball2") { GsBall2Tests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "paintings3") { Painting3EditingTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "decorations3") { Decoration3EditingTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "roamer3") { Roamer3EditingTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "hall3") { HallOfFame3Tests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "hall1") { HallOfFame1Tests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "event-reset1") { EventReset1Tests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "events8b") { BdspEventEditingTests.Run(); LetsGoEventEditingTests.Run(); Gen2EventEditingTests.Run(); EventEditingTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "events7b") { LetsGoEventEditingTests.Run(); Gen2EventEditingTests.Run(); EventEditingTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "events2") { Gen2EventEditingTests.Run(); EventEditingTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "events") { EventEditingTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "roamer") { RoamerEditingTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "rtc") { RtcEditingTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "opowers") { OPowerEditingTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "apricorns") { ApricornInventoryTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "food") { SaveFoodTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "blocks6") { PokeBlocks6Tests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "food-cases") { FoodCasesTests.Run(); return; }
        // Incremental development after the full suite has generated the shared synthetic fixtures.
        // The default command still runs every suite and is required before committing.
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "standalone-gb-special") { StandaloneGbSpecialTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "standalone-gb") { StandaloneGbTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "standalone-egg") { StandaloneEggTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "standalone-origin") { StandaloneOriginTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "standalone-raw") { StandaloneRawTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "standalone-legality") { StandaloneLegalityTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "standalone-api") { StandalonePokemonApiTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "standalone") { StandalonePokemonTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "box-binary-api") { BoxBinaryTests.Run(); BoxBinaryApiTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "pk3-checksum") { Pk3ChecksumTests.Run(); BoxBinaryTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "box-binary") { BoxBinaryTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "box-import-api") { BoxImportApiTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "box-import-files") { BoxImportFileTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "box-import") { BoxImportContractTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "box-archive") { BoxArchiveTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "box-batch") { BoxBatchTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "property-batch") { PropertyBatchContractTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "folder-batch") { FolderBatchContractTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "file-preview") { FilePropertyBatchTests.Run(); PropertyBatchTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "property-preview") { PropertyBatchTests.Run(); return; }
        if (Environment.GetEnvironmentVariable("PKHEX_TEST_FOCUS") == "property-trim") { PropertyBatchTrimTests.Run(); return; }
        foreach (var version in new[] { GameVersion.E, GameVersion.D, GameVersion.Pt, GameVersion.HG, GameVersion.B, GameVersion.B2, GameVersion.X, GameVersion.OR, GameVersion.SN, GameVersion.US, GameVersion.BD })
        {
            var save = CreateFixture(version);
            save.Money = 100;
            var pokemon = save.BlankPKM;
            pokemon.Species = 25;
            pokemon.Version = version;
            pokemon.Language = 2;
            pokemon.TID16 = 12345;
            pokemon.SID16 = 54321;
            pokemon.OriginalTrainerName = "TEST";
            pokemon.CurrentLevel = 25;
            pokemon.IV_ATK = 27;
            pokemon.EV_SPE = 12;
            pokemon.Move1 = 85;
            pokemon.RefreshChecksum();
            if (save is IBoxDetailName boxNames) boxNames.SetBoxName(0, "TESTBOX");
            if (save is IBoxDetailWallpaper boxWallpaper) boxWallpaper.SetBoxWallpaper(0, 2);
            save.SetBoxSlotAtIndex(pokemon, 0, 0);
            save.SetPartySlotAtIndex(pokemon, 0);
            save.SetBoxSlotAtIndex(pokemon, save.BoxCount - 1, save.BoxSlotCount - 1);
            var input = save.Write().ToArray();
            var original = input.ToArray();
            var report = SaveService.Inspect(input);
            using var document = JsonDocument.Parse(report);
            Require(document.RootElement.GetProperty("checksumsValid").GetBoolean(), $"{version}: blank fixture checksum");
            var entries = document.RootElement.GetProperty("pokemon");
            var thunderbolt = document.RootElement.GetProperty("moveChoices")[85];
            Require(thunderbolt.GetProperty("name").GetProperty("zh").GetString() == "十万伏特", $"{version}: localized move choices");
            Require(thunderbolt.GetProperty("maxPp")[3].GetInt32() == pokemon.GetMovePP(85, 3), $"{version}: PP Up limit");
            Require(document.RootElement.GetProperty("apiVersion").GetInt32() == 90, $"{version}: API version");
            Require(document.RootElement.GetProperty("boxSlotCount").GetInt32() == save.BoxSlotCount, $"{version}: box dimensions");
            var boxes = document.RootElement.GetProperty("boxes");
            Require(boxes.GetArrayLength() == save.BoxCount, $"{version}: box metadata count");
            if (save is IBoxDetailNameRead) Require(boxes[0].GetProperty("name").GetString() == "TESTBOX", $"{version}: box name");
            if (save is IBoxDetailWallpaper) Require(boxes[0].GetProperty("wallpaper").GetInt32() == 2, $"{version}: box wallpaper");
            Require(entries[0].GetProperty("sprite").GetString() == "b_25", $"{version}: sprite key");
            Require(entries.GetArrayLength() == 3, $"{version}: party and box entries");
            Require(entries[2].GetProperty("box").GetInt32() == save.BoxCount - 1 && entries[2].GetProperty("slot").GetInt32() == save.BoxSlotCount - 1, $"{version}: final box slot");
            Require(entries[0].GetProperty("box").GetInt32() == -1 && entries[1].GetProperty("box").GetInt32() == 0, $"{version}: storage addresses");
            Require(entries[0].GetProperty("speciesName").GetProperty("zh").GetString() == "皮卡丘", $"{version}: Chinese species");
            Require(entries[1].GetProperty("ivs")[1].GetInt32() == 27 && entries[1].GetProperty("evs")[5].GetInt32() == 12, $"{version}: stat order");
            Require(entries[1].GetProperty("moves")[0].GetProperty("en").GetString() == "Thunderbolt", $"{version}: move names");
            var pokemonEdit = new PokemonEdit(0, 0, "EDITMON", 26, 100, "EDIT", 42, 43,
                [31, 30, 29, 28, 27, 26], [4, 8, 12, 16, 20, 24], [85, 0, 0, 0], [10, 0, 0, 0]);
            var changedPokemon = SaveService.EditPokemon(input, JsonSerializer.Serialize(pokemonEdit, SaveJsonContext.Default.PokemonEdit));
            var changedSave = SaveUtil.GetSaveFile(changedPokemon.ToArray())!;
            PokemonEditing.Verify(changedSave, pokemonEdit);
            foreach (ushort species in new ushort[] { 1, 201, 81, 29, 32 })
            {
                var form = (byte)(species == 201 ? 27 : 0);
                foreach (var gender in PokemonIdentity.Genders(save, species, form))
                {
                    var identity = new PokemonIdentityEdit(species, form, gender, true);
                    var identityEdit = pokemonEdit with { Identity = identity };
                    var identityOutput = SaveService.EditPokemon(input, JsonSerializer.Serialize(identityEdit, SaveJsonContext.Default.PokemonEdit));
                    var identitySave = SaveUtil.GetSaveFile(identityOutput.ToArray())!;
                    var result = identitySave.GetBoxSlotAtIndex(0, 0);
                    Require(identitySave.ChecksumsValid && result.Species == species && result.Form == form && result.Gender == gender && result.CurrentLevel == identityEdit.Level, $"{version}: species/form/gender/level");
                    Require(!result.IsNicknamed && result.Nickname == SpeciesName.GetSpeciesNameGeneration(species, result.Language, result.Format), $"{version}: default species name");
                    Require(result.EXP == Experience.GetEXP(result.CurrentLevel, result.PersonalInfo.EXPGrowth), $"{version}: changed growth curve");
                    Require(input.SequenceEqual(original) && identitySave.GetPartySlotAtIndex(0).Data.SequenceEqual(save.GetPartySlotAtIndex(0).Data), $"{version}: identity original/party preservation");
                }
            }
            for (var abilityIndex = 0; abilityIndex < pokemon.PersonalInfo.AbilityCount; abilityIndex++)
            {
                var attributes = pokemonEdit with { Nature = 13, AbilityIndex = abilityIndex, HeldItem = 1,
                    StatAlignment = pokemon.Format >= 8 ? 3 : null };
                var attributeOutput = SaveService.EditPokemon(input, JsonSerializer.Serialize(attributes, SaveJsonContext.Default.PokemonEdit));
                var attributeSave = SaveUtil.GetSaveFile(attributeOutput.ToArray())!;
                PokemonEditing.Verify(attributeSave, attributes);
                Require(attributeSave.ChecksumsValid && input.SequenceEqual(original), $"{version}: attributes and original preservation");
                Require(attributeSave.GetPartySlotAtIndex(0).Data.SequenceEqual(save.GetPartySlotAtIndex(0).Data), $"{version}: attributes preserved party");
                Require(attributeSave.GetBoxSlotAtIndex(save.BoxCount - 1, save.BoxSlotCount - 1).Data.SequenceEqual(save.GetBoxSlotAtIndex(save.BoxCount - 1, save.BoxSlotCount - 1).Data), $"{version}: attributes preserved other box");
                if (pokemon is PK5 && abilityIndex == 2)
                {
                    var normal = attributes with { AbilityIndex = 0 };
                    var normalBytes = SaveService.EditPokemon(attributeOutput, JsonSerializer.Serialize(normal, SaveJsonContext.Default.PokemonEdit));
                    PokemonEditing.Verify(SaveUtil.GetSaveFile(normalBytes.ToArray())!, normal);
                }
            }
            foreach (ushort species in new ushort[] { 479, 678 })
            {
                if (species > pokemon.MaxSpeciesID) continue;
                var forms = PokemonIdentity.Forms(save, species, GameInfo.GetStrings("en"));
                var form = (byte)(forms.Length - 1);
                var gender = PokemonIdentity.Genders(save, species, form)[0];
                var identityEdit = pokemonEdit with { Identity = new(species, form, gender, false), AbilityIndex = 0 };
                var outputIdentity = SaveService.EditPokemon(input, JsonSerializer.Serialize(identityEdit, SaveJsonContext.Default.PokemonEdit));
                var identitySave = SaveUtil.GetSaveFile(outputIdentity.ToArray())!;
                PokemonEditing.Verify(identitySave, identityEdit);
                Require(identitySave.GetBoxSlotAtIndex(0, 0).IsNicknamed, $"{version}: custom nickname retained");
                Require(identitySave.GetBoxSlotAtIndex(save.BoxCount - 1, save.BoxSlotCount - 1).Data.SequenceEqual(save.GetBoxSlotAtIndex(save.BoxCount - 1, save.BoxSlotCount - 1).Data), $"{version}: identity other box preserved");
            }
            for (var ppUps = 0; ppUps <= 3; ppUps++)
            {
                var maximum = save.GetBoxSlotAtIndex(0, 0).GetMovePP(85, ppUps);
                var ppEdit = pokemonEdit with { MovePpUps = [ppUps, 0, 0, 0], MovePp = [maximum, 0, 0, 0] };
                var ppOutput = SaveService.EditPokemon(input, JsonSerializer.Serialize(ppEdit, SaveJsonContext.Default.PokemonEdit));
                var ppSave = SaveUtil.GetSaveFile(ppOutput.ToArray())!;
                PokemonEditing.Verify(ppSave, ppEdit);
                Require(ppSave.ChecksumsValid && input.SequenceEqual(original), $"{version}: PP Ups roundtrip and input preservation");
                try
                {
                    SaveService.EditPokemon(input, JsonSerializer.Serialize(ppEdit with { MovePp = [maximum + 1, 0, 0, 0] }, SaveJsonContext.Default.PokemonEdit));
                    throw new Exception("PP above selected boost maximum accepted");
                }
                catch (ArgumentException) { }
            }
            Require(changedSave.GetPartySlotAtIndex(0).Data.SequenceEqual(save.GetPartySlotAtIndex(0).Data), $"{version}: party preserved during box edit");
            Require(changedSave.GetBoxSlotAtIndex(save.BoxCount - 1, save.BoxSlotCount - 1).Data.SequenceEqual(save.GetBoxSlotAtIndex(save.BoxCount - 1, save.BoxSlotCount - 1).Data), $"{version}: other box preserved during edit");
            Require(input.SequenceEqual(original), $"{version}: Pokemon edit changed input");
            var partyEdit = pokemonEdit with { Box = -1, Slot = 0 };
            var changedParty = SaveService.EditPokemon(input, JsonSerializer.Serialize(partyEdit, SaveJsonContext.Default.PokemonEdit));
            var partySave = SaveUtil.GetSaveFile(changedParty.ToArray())!;
            PokemonEditing.Verify(partySave, partyEdit);
            Require(partySave.PartyCount == save.PartyCount, $"{version}: party count preserved");
            Require(partySave.GetBoxSlotAtIndex(0, 0).Data.SequenceEqual(save.GetBoxSlotAtIndex(0, 0).Data), $"{version}: box preserved during party edit");
            var edited = SaveService.Export(input, "{\"ot\":\"EDIT\",\"tid\":65535,\"sid\":0,\"money\":500}");
            Require(input.SequenceEqual(original), $"{version}: original mutated");
            var reread = SaveUtil.GetSaveFile(edited.ToArray())!;
            Require(reread.ChecksumsValid && reread.OT == "EDIT" && reread.TID16 == 65535 && reread.SID16 == 0 && reread.Money == 500, $"{version}: roundtrip");
            var before = SaveUtil.GetSaveFile(input.ToArray())!;
            Require(reread.BoxData.Select(p => Convert.ToBase64String(p.Data)).SequenceEqual(before.BoxData.Select(p => Convert.ToBase64String(p.Data))), $"{version}: boxes changed");
            Require(reread.PartyData.Select(p => Convert.ToBase64String(p.Data)).SequenceEqual(before.PartyData.Select(p => Convert.ToBase64String(p.Data))), $"{version}: party changed");
            Directory.CreateDirectory(".tmp/pkhex-fixtures");
            File.WriteAllBytes($".tmp/pkhex-fixtures/{version}.sav", input);
            File.WriteAllBytes($".tmp/pkhex-fixtures/{version}-edited.sav", edited);
            Console.WriteLine($"PASS {version}: read, edit, checksum, original preservation, boxes");
        }
        try { SaveService.Inspect(new byte[32]); throw new Exception("Bad data accepted"); }
        catch (ArgumentException) { Console.WriteLine("PASS unsupported data rejected"); }
        // The upstream SWSH blank template has untyped (SCTypeCode.None) blocks.
        // It is not a serialized game save and must not count as a roundtrip fixture.
        var template = BlankSaveFile.Get(GameVersion.SW, "TEST").Write().ToArray();
        try { SaveService.Inspect(template); throw new Exception("Unserialized SWSH template accepted"); }
        catch (ArgumentException) { Console.WriteLine("PASS unserialized SWSH template rejected; SWSH roundtrip still requires a representative fixture"); }
        var valid = File.ReadAllBytes(".tmp/pkhex-fixtures/E.sav");
        var basicEdit = new PokemonEdit(0, 0, "EDITMON", 26, 100, "EDIT", 42, 43,
            [31, 30, 29, 28, 27, 26], [4, 8, 12, 16, 20, 24], [85, 0, 0, 0], [10, 0, 0, 0]);
        foreach (var bad in new[] {
            basicEdit with { Slot = 30 }, basicEdit with { Box = -2 },
            basicEdit with { Level = 0 }, basicEdit with { Ivs = [32,0,0,0,0,0] },
            basicEdit with { Evs = [255,255,1,0,0,0] }, basicEdit with { Moves = [65535,0,0,0] },
            basicEdit with { MovePp = [255,0,0,0] }, basicEdit with { Ot = "" },
            basicEdit with { MovePpUps = [4,0,0,0] }, basicEdit with { MovePpUps = [-1,0,0,0] },
            basicEdit with { MovePpUps = [0,1,0,0] }, basicEdit with { MovePpUps = [0] },
            basicEdit with { Nature = 25 }, basicEdit with { Nature = -1 },
            basicEdit with { AbilityIndex = 3 }, basicEdit with { AbilityIndex = -1 },
            basicEdit with { HeldItem = 65535 }, basicEdit with { HeldItem = -1 },
            basicEdit with { StatAlignment = 1 },
            basicEdit with { Identity = new(0, 0, 0, false) }, basicEdit with { Identity = new(65535, 0, 0, false) },
            basicEdit with { Identity = new(25, 255, 0, false) }, basicEdit with { Identity = new(81, 0, 0, false) },
            basicEdit with { Identity = new(25, 0, 3, false) } })
        {
            var before = valid.ToArray();
            try { SaveService.EditPokemon(valid, JsonSerializer.Serialize(bad, SaveJsonContext.Default.PokemonEdit)); throw new Exception("Invalid Pokemon edit accepted"); }
            catch (ArgumentException) { Require(valid.SequenceEqual(before), "Rejected Pokemon edit changed input"); }
        }
        Console.WriteLine("PASS Pokemon edit positions, level, IVs, EVs, moves, PP, names and input preservation");
        var corrupt = valid.ToArray();
        corrupt[0x100] ^= 1;
        using var damagedReport = JsonDocument.Parse(SaveService.Inspect(corrupt));
        Require(!damagedReport.RootElement.GetProperty("canEdit").GetBoolean(), "Damaged save remained editable");
        RejectExport(corrupt, "{\"ot\":\"TEST\",\"tid\":1,\"sid\":2,\"money\":100}");
        RejectExport(valid, "{\"ot\":\"TEST\",\"tid\":1,\"sid\":2,\"money\":4294967295}");
        RejectExport(valid, "{\"ot\":\"TOOLONGNAME\",\"tid\":1,\"sid\":2,\"money\":100}");
        Console.WriteLine("PASS invalid checksum, money and trainer-name edits rejected");
        Gen6PokedexTests.Run();
        Gen7PokedexTests.Run();
        LetsGoPokedexTests.Run();
        BdspPokedexTests.Run();
        SwshBlockFixtureTests.Run();
        SwshPokedexTests.Run();
        LegendsPokedexTests.Run();
        SvBlockFixtureTests.Run();
        SvPokedexTests.Run();
        ZaBlockFixtureTests.Run();
        ZaPokedexTests.Run();
        Gen5PokedexTests.Run();
        Gen4PokedexTests.Run();
        SimplePokedexTests.Run();
        PokemonLegalityTests.Run(CreateFixture);
        BoxEditingTests.Run();
        BoxLayoutTests.Run();
        BoxBatchTests.Run();
        PropertyBatchContractTests.Run();
        FolderBatchContractTests.Run();
        FilePropertyBatchTests.Run();
        BoxArchiveTests.Run();
        BoxImportContractTests.Run();
        BoxImportFileTests.Run();
        BoxImportApiTests.Run();
        BoxBinaryTests.Run();
        BoxBinaryApiTests.Run();
        StandalonePokemonTests.Run();
        StandalonePokemonApiTests.Run();
        StandaloneLegalityTests.Run();
        StandaloneRawTests.Run();
        StandaloneEggTests.Run();
        StandaloneGbTests.Run();
        FoodCasesTests.Run();
        PokeBlocks6Tests.Run();
        SaveFoodTests.Run();
        StandaloneGbSpecialTests.Run();
        StandaloneOriginTests.Run();
        Pk3ChecksumTests.Run();
        PropertyBatchTests.Run();
        StorageEditingTests.Run();
        PartyStorageTests.Run();
        PokemonFileTests.Run();
        PokemonRawTests.Run();
        PokemonFormArgumentTests.Run();
        PokemonEncounterTests.Run();
        PokemonOriginTests.Run();
        PokemonEggTests.Run();
        PokemonMakeEggTests.Run();
        PokemonShinyTests.Run();
        PokemonRelearnTests.Run();
        PokemonRibbonTests.Run();
        PokemonRibbonSuggestionTests.Run();
        PokemonMemoryTests.Run();
        PokemonCareTests.Run();
        PokemonHistoryTests.Run();
        PokemonTrainingTests.Run();
        PokemonBasicPreservationTests.Run();
        InventoryReaderTests.Run();
        InventoryEditingTests.Run();
        InventoryBatchTests.Run();
        ApricornInventoryTests.Run();
        OPowerEditingTests.Run();
        EventEditingTests.Run();
        Gen2EventEditingTests.Run();
        LetsGoEventEditingTests.Run();
        BdspEventEditingTests.Run();
        EventReset1Tests.Run();
        HallOfFame1Tests.Run();
        HallOfFame3Tests.Run();
        Roamer3EditingTests.Run();
        Decoration3EditingTests.Run();
        Painting3EditingTests.Run();
        GsBall2Tests.Run();
        RoamerEditingTests.Run();
        RtcEditingTests.Run();
        InventoryAdvancedTests.Run();
        TrainerEditingTests.Run();
        TrainerLanguageTests.Run();
        TrainerGeographyTests.Run();
        TrainerNdsGeographyTests.Run();
        TrainerPositionTests.Run();
        TrainerSpatialTests.Run();
        TrainerGameVersionTests.Run();
        TrainerAppearance6Tests.Run();
        TrainerDateTests.Run();
        TrainerTimestampTests.Run();
        TrainerBadgeTests.Run();
        TrainerCurrencyTests.Run();
        TrainerGameOptionTests.Run();
        SaveRecordTests.Run();
    }

    private static void RejectExport(byte[] data, string edit)
    {
        var original = data.ToArray();
        try { SaveService.Export(data, edit); throw new Exception("Invalid edit accepted"); }
        catch (ArgumentException) { Require(data.SequenceEqual(original), "Rejected edit mutated original"); }
    }

    private static SaveFile CreateFixture(GameVersion version)
    {
        if (version == GameVersion.E) return CreateEmerald();
        if (version is not (GameVersion.D or GameVersion.Pt or GameVersion.HG))
        {
            var blank = BlankSaveFile.Get(version, "TEST");
            if (blank is SAV_BEEF)
                System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(blank.Data[^0x1F0..], 0x42454546);
            return blank;
        }
        var data = new byte[SaveUtil.SIZE_G4RAW];
        SAV4 save = version switch
        {
            GameVersion.D => new SAV4DP(data),
            GameVersion.Pt => new SAV4Pt(data),
            _ => new SAV4HGSS(data),
        };
        var size = version switch
        {
            GameVersion.D => SAV4DP.GeneralSize,
            GameVersion.Pt => SAV4Pt.GeneralSize,
            _ => SAV4HGSS.GeneralSize,
        };
        for (var slot = 0; slot < 2; slot++)
            System.Buffers.Binary.BinaryPrimitives.WriteInt32LittleEndian(data.AsSpan(slot * 0x40000 + size - 12), size);
        save.Magic = SAV4.MAGIC_JAPAN_INTL;
        save.OT = "TEST";
        save.TID16 = 12345;
        save.SID16 = 54321;
        return save;
    }

    private static SaveFile CreateEmerald()
    {
        // BlankSaveFile supplies an in-memory template without serialized GBA sectors.
        // Construct the sector directory required by SAV3 and SaveUtil detection.
        var data = new byte[SaveUtil.SIZE_G3RAW];
        for (var slot = 0; slot < 2; slot++)
        for (ushort sector = 0; sector < 14; sector++)
        {
            var offset = (slot * 14 + sector) * 0x1000;
            System.Buffers.Binary.BinaryPrimitives.WriteUInt16LittleEndian(data.AsSpan(offset + 0xFF4), sector);
            System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(data.AsSpan(offset + 0xFF8), 0x08012025);
        }
        data[0xAC] = 2; // Emerald security key; distinguishes it from FRLG and empty RS.
        data[0x890] = 1; // Emerald's small block extends beyond the RS small block.
        data[6] = data[7] = 0xFF; // International trainer-name encoding.
        return new SAV3E(data) { OT = "TEST", TID16 = 12345, SID16 = 54321 };
    }
}
