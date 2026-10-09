import type { SaveReport, PokemonLegalityReport } from "./domain";
import { browserCryptography } from "./browserCryptography";
import type {
  StandalonePokemonReport,
  StandalonePokemonRequest,
} from "./standalonePokemon";

interface SaveExports {
  PokeRNGKit: {
    SaveEditor: {
      Program: {
        ConfigureBrowserCrypto(): void;
        ResetBRProfile(): void;
        ConfigureBRProfile(profile: number): void;
        SelectBRProfile(data: Uint8Array, profile: number): string;
        AnalyzeStandalonePokemon(data: Uint8Array, json: string): string;
        EditStandalonePokemonRaw(data: Uint8Array, json: string): Uint8Array;
        EditStandalonePokemonGb(data: Uint8Array, json: string): Uint8Array;
        ReadStandalonePokemonAdvanced(data: Uint8Array, json: string): string;
        InspectStandalonePokemon(data: Uint8Array, json: string): string;
        EditStandalonePokemon(data: Uint8Array, json: string): Uint8Array;
        ExportStandalonePokemon(data: Uint8Array, json: string): Uint8Array;
        ExportBoxBinary(data: Uint8Array, json: string): Uint8Array;
        PreviewBoxBinary(data: Uint8Array, json: string): string;
        CommitBoxBinary(data: Uint8Array, json: string): Uint8Array;
        DiscardBoxBinary(token: string): void;
        PreviewBoxImport(data: Uint8Array, json: string): string;
        CommitBoxImport(data: Uint8Array, json: string): Uint8Array;
        DiscardBoxImport(token: string): void;
        PreviewFileBatch(data: Uint8Array, json: string): string;
        ExportFileBatch(json: string): Uint8Array;
        DiscardFileBatch(token: string): void;
        ReadFileBatchCatalog(): string;
        Inspect(data: Uint8Array): string;
        ReadPokedex9a(data: Uint8Array): string;
        EditPokedex9a(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex9(data: Uint8Array): string;
        EditPokedex9(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex8a(data: Uint8Array): string;
        EditPokedex8a(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex8(data: Uint8Array): string;
        EditPokedex8(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex8b(data: Uint8Array): string;
        EditPokedex8b(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex7(data: Uint8Array): string;
        EditPokedex7(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex6(data: Uint8Array): string;
        EditPokedex6(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex5(data: Uint8Array): string;
        EditPokedex5(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex4(data: Uint8Array): string;
        EditPokedex4(data: Uint8Array, json: string): Uint8Array;
        ReadPokedex(data: Uint8Array, json: string): string;
        EditPokedex(data: Uint8Array, json: string): Uint8Array;
        ExportWorkingCopy(data: Uint8Array): Uint8Array;
        ReadInventory(data: Uint8Array): string;
        ReadEvents(data: Uint8Array, json: string): string;
        EditEvents(data: Uint8Array, json: string): Uint8Array;
        CompareEvents(data: Uint8Array, json: string): string;
        ReadGsBall2(data: Uint8Array): string;
        EnableGsBall2(data: Uint8Array): Uint8Array;
        ReadHall3(data: Uint8Array, json: string): string;
        EditHall3(data: Uint8Array, json: string): Uint8Array;
        ReadHall1(data: Uint8Array): string;
        EditHall1(data: Uint8Array, json: string): Uint8Array;
        ReadEventReset(data: Uint8Array, json: string): string;
        EditEventReset(data: Uint8Array, json: string): Uint8Array;
        ReadFerry3(data: Uint8Array): string;
        EditFerry3(data: Uint8Array, json: string): Uint8Array;
        ReadMisc3(data: Uint8Array): string;
        EditMisc3(data: Uint8Array, json: string): Uint8Array;
        ReadSecretBase3(data: Uint8Array): string;
        SuggestSecretBase3Form(data: Uint8Array, json: string): string;
        EditSecretBase3(data: Uint8Array, json: string): Uint8Array;
        ReadPokeGear4(data: Uint8Array): string;
        EditPokeGear4(data: Uint8Array, json: string): Uint8Array;
        ReadPokeathlon4(data: Uint8Array): string;
        EditPokeathlon4(data: Uint8Array, json: string): Uint8Array;
        PreviewBattlePassPokemon4(data: Uint8Array, json: string): string;
        ReadBattlePass4(data: Uint8Array, json: string): string;
        EditBattlePass4(data: Uint8Array, json: string): Uint8Array;
        ExportBattlePass4(data: Uint8Array, index: number): string;
        ExportBattlePassPokemon4(
          data: Uint8Array,
          index: number,
          slot: number,
        ): string;
        ReadBr4Gear(data: Uint8Array): string;
        EditBr4Gear(data: Uint8Array, json: string): Uint8Array;
        ReadJoyful3(data: Uint8Array): string;
        EditJoyful3(data: Uint8Array, json: string): Uint8Array;
        ReadFrontier3(data: Uint8Array): string;
        EditFrontier3(data: Uint8Array, json: string): Uint8Array;
        ReadGameRecords3(data: Uint8Array): string;
        EditGameRecords3(data: Uint8Array, json: string): Uint8Array;
        ReadPaintings3(data: Uint8Array): string;
        EditPaintings3(data: Uint8Array, json: string): Uint8Array;
        ReadDecorations3(data: Uint8Array): string;
        EditDecorations3(data: Uint8Array, json: string): Uint8Array;
        ReadRoamer3(data: Uint8Array): string;
        EditRoamer3(data: Uint8Array, json: string): Uint8Array;
        ReadRoamer(data: Uint8Array): string;
        EditRoamer(data: Uint8Array, json: string): Uint8Array;
        ReadRtc(data: Uint8Array): string;
        EditRtc(data: Uint8Array, json: string): Uint8Array;
        ReadOPowers(data: Uint8Array): string;
        EditOPowers(data: Uint8Array, json: string): Uint8Array;
        ReadFood(data: Uint8Array): string;
        EditFood(data: Uint8Array, json: string): Uint8Array;
        ReadRecords(data: Uint8Array): string;
        EditRecord(data: Uint8Array, json: string): Uint8Array;
        EditInventory(data: Uint8Array, json: string): Uint8Array;
        EditInventoryBatch(data: Uint8Array, json: string): Uint8Array;
        Export(data: Uint8Array, json: string): Uint8Array;
        EditPokemon(data: Uint8Array, json: string): Uint8Array;
        EditPokemonRaw(data: Uint8Array, json: string): Uint8Array;
        EditBox(data: Uint8Array, json: string): Uint8Array;
        ReadPropertyBatchCatalog(data: Uint8Array): string;
        PreviewPropertyBatch(data: Uint8Array, json: string): string;
        CommitPropertyBatch(data: Uint8Array, json: string): Uint8Array;
        DiscardPropertyBatch(token: string): void;
        EditStorage(data: Uint8Array, json: string): Uint8Array;
        ImportPokemon(data: Uint8Array, json: string): Uint8Array;
        ExportPokemon(data: Uint8Array, json: string): string;
        ExportBoxes(data: Uint8Array, json: string): Uint8Array;
        ReadHistory(data: Uint8Array, json: string): string;
        ReadMemory(data: Uint8Array, json: string): string;
        ReadRibbons(data: Uint8Array, json: string): string;
        SuggestRelearn(data: Uint8Array, json: string): string;
        ReadOrigin(data: Uint8Array, json: string): string;
        AnalyzePokemon(data: Uint8Array, json: string): string;
      };
    };
  };
}

let runtime: Promise<SaveExports> | undefined;
async function loadRuntime(base: string): Promise<SaveExports> {
  const runtimeUrl = new URL("pkhex/_framework/dotnet.js", base).href;
  const { dotnet } = await import(/* @vite-ignore */ runtimeUrl);
  const host = await dotnet.withDiagnosticTracing(false).create();
  host.setModuleImports("pkhex-crypto", browserCryptography);
  const api: SaveExports = await host.getAssemblyExports(
    host.getConfig().mainAssemblyName,
  );
  api.PokeRNGKit.SaveEditor.Program.ConfigureBrowserCrypto();
  return api;
}

// .NET distinguishes a standalone worker from a pthread using self.onmessage.
// Keep that property unset during initialization: dotnet/runtime#114918.
self.addEventListener(
  "message",
  async (
    event: MessageEvent<{
      id: number;
      base: string;
      bytes: Uint8Array;
      brProfile?: number;
      edit?: string;
      kind?:
        | "entityRaw"
        | "entityGb"
        | "entityDetails"
        | "entityLegality"
        | "entityInspect"
        | "entityEdit"
        | "entityExport"
        | "boxBinaryPreview"
        | "boxBinaryCommit"
        | "boxBinaryDiscard"
        | "boxBinaryExport"
        | "boxImportPreview"
        | "boxImportCommit"
        | "boxImportDiscard"
        | "boxArchive"
        | "filePreview"
        | "fileExport"
        | "fileDiscard"
        | "fileCatalog"
        | "pokedex9a"
        | "pokedex9aEdit"
        | "pokedex9"
        | "pokedex9Edit"
        | "pokedex8a"
        | "pokedex8aEdit"
        | "pokedex8"
        | "pokedex8Edit"
        | "pokedex8b"
        | "pokedex8bEdit"
        | "pokedex7"
        | "pokedex7Edit"
        | "pokedex6"
        | "pokedex6Edit"
        | "pokedex5"
        | "pokedex5Edit"
        | "pokedex4"
        | "pokedex4Edit"
        | "pokedex"
        | "pokedexEdit"
        | "exportWorkingCopy"
        | "trainer"
        | "inventory"
        | "events"
        | "eventsEdit"
        | "eventsCompare"
        | "gsBall2"
        | "gsBall2Edit"
        | "hall3"
        | "hall3Edit"
        | "hall1"
        | "hall1Edit"
        | "eventReset"
        | "eventResetEdit"
        | "ferry3"
        | "ferry3Edit"
        | "misc3"
        | "misc3Edit"
        | "secretBase3"
        | "secretBase3Form"
        | "secretBase3Edit"
        | "pokegear4"
        | "pokegear4Edit"
        | "pokeathlon4"
        | "pokeathlon4Edit"
        | "battlePass4"
        | "battlePass4Edit"
        | "battlePass4Preview"
        | "battlePass4Export"
        | "br4Gear"
        | "brProfile"
        | "inspectWorking"
        | "br4GearEdit"
        | "joyful3"
        | "joyful3Edit"
        | "frontier3"
        | "frontier3Edit"
        | "gameRecords3"
        | "gameRecords3Edit"
        | "paintings3"
        | "paintings3Edit"
        | "decorations3"
        | "decorations3Edit"
        | "roamer3"
        | "roamer3Edit"
        | "roamer"
        | "roamerEdit"
        | "rtc"
        | "rtcEdit"
        | "opowers"
        | "opowersEdit"
        | "food"
        | "foodEdit"
        | "records"
        | "recordEdit"
        | "inventoryEdit"
        | "inventoryBatch"
        | "pokemon"
        | "pokemonRaw"
        | "legality"
        | "box"
        | "storage"
        | "pokemonImport"
        | "historyCatalog"
        | "memoryCatalog"
        | "ribbons"
        | "relearnSuggestion"
        | "originCatalog"
        | "pokemonExport"
        | "propertyCatalog"
        | "propertyPreview"
        | "propertyCommit"
        | "propertyDiscard";
    }>,
  ) => {
    const { id, base, bytes, kind } = event.data;
    const edit = event.data.edit;
    const payload = edit ?? "";
    try {
      runtime ??= loadRuntime(base).catch((error) => {
        runtime = undefined;
        throw error;
      });
      const api = (await runtime).PokeRNGKit.SaveEditor.Program;
      if (typeof api.ConfigureBRProfile !== "function")
        throw new Error("Save editor API version mismatch.");
      api.ConfigureBRProfile(event.data.brProfile ?? -1);
      if (kind === "brProfile") {
        const profile = JSON.parse(payload);
        if (!Number.isInteger(profile) || profile < 0 || profile > 3)
          throw new Error("Invalid Battle Revolution player.");
        const report: SaveReport = JSON.parse(
          api.SelectBRProfile(bytes, profile),
        );
        if (report.apiVersion !== 100)
          throw new Error("Save editor API version mismatch.");
        self.postMessage({ id, report });
        return;
      }
      if (kind?.startsWith("entity")) {
        if (typeof api.InspectStandalonePokemon !== "function")
          throw new Error("Save editor API version mismatch.");
        const before: StandalonePokemonReport = JSON.parse(
          api.InspectStandalonePokemon(bytes, payload),
        );
        if (before.apiVersion !== 100)
          throw new Error("Save editor API version mismatch.");
        const output =
          kind === "entityGb"
            ? new Uint8Array(api.EditStandalonePokemonGb(bytes, payload))
            : kind === "entityRaw"
              ? new Uint8Array(api.EditStandalonePokemonRaw(bytes, payload))
              : kind === "entityEdit"
                ? new Uint8Array(api.EditStandalonePokemon(bytes, payload))
                : undefined;
        const entityFile =
          kind === "entityExport"
            ? new Uint8Array(api.ExportStandalonePokemon(bytes, payload))
            : undefined;
        const request: StandalonePokemonRequest = JSON.parse(payload);
        const details =
          kind === "entityDetails"
            ? JSON.parse(api.ReadStandalonePokemonAdvanced(bytes, payload))
            : undefined;
        const legality =
          kind === "entityLegality"
            ? JSON.parse(api.AnalyzeStandalonePokemon(bytes, payload))
            : undefined;
        const entity = output
          ? JSON.parse(
              api.InspectStandalonePokemon(
                output,
                JSON.stringify({
                  ...request,
                  fileName: `.${before.extension}`,
                  inputEncrypted: false,
                  useFileFormat: true,
                }),
              ),
            )
          : before;
        self.postMessage(
          { id, entity, output, entityFile, legality, details },
          output ? [output.buffer] : entityFile ? [entityFile.buffer] : [],
        );
        return;
      }
      if (kind?.startsWith("boxBinary")) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 100)
          throw new Error("Save editor API version mismatch.");
        if (kind === "boxBinaryDiscard") api.DiscardBoxBinary(payload);
        const output =
          kind === "boxBinaryCommit"
            ? new Uint8Array(api.CommitBoxBinary(bytes, payload))
            : undefined;
        const boxBinary =
          kind === "boxBinaryExport"
            ? new Uint8Array(api.ExportBoxBinary(bytes, payload))
            : undefined;
        self.postMessage(
          {
            id,
            report: output ? JSON.parse(api.Inspect(output)) : before,
            output,
            boxBinary,
            boxBinaryPreview:
              kind === "boxBinaryPreview"
                ? JSON.parse(api.PreviewBoxBinary(bytes, payload))
                : undefined,
          },
          output ? [output.buffer] : boxBinary ? [boxBinary.buffer] : [],
        );
        return;
      }
      if (kind?.startsWith("boxImport")) {
        const before: SaveReport = JSON.parse(api.Inspect(bytes));
        if (before.apiVersion !== 100)
          throw new Error("Save editor API version mismatch.");
        if (kind === "boxImportDiscard") api.DiscardBoxImport(payload);
        const output =
          kind === "boxImportCommit"
            ? new Uint8Array(api.CommitBoxImport(bytes, payload))
            : undefined;
        self.postMessage(
          {
            id,
            report: output ? JSON.parse(api.Inspect(output)) : before,
            output,
            boxImportPreview:
              kind === "boxImportPreview"
                ? JSON.parse(api.PreviewBoxImport(bytes, payload))
                : undefined,
          },
          output ? [output.buffer] : [],
        );
        return;
      }
      if (kind?.startsWith("file") || kind === "boxArchive") {
        const report: SaveReport = JSON.parse(api.Inspect(bytes));
        if (report.apiVersion !== 100)
          throw new Error("Save editor API version mismatch.");
        if (kind === "fileDiscard") api.DiscardFileBatch(payload);
        const archive =
          kind === "boxArchive"
            ? new Uint8Array(api.ExportBoxes(bytes, payload))
            : kind === "fileExport"
              ? new Uint8Array(api.ExportFileBatch(payload))
              : undefined;
        self.postMessage(
          {
            id,
            report,
            archive,
            filePreview:
              kind === "filePreview"
                ? JSON.parse(api.PreviewFileBatch(bytes, payload))
                : undefined,
            fileCatalog:
              kind === "fileCatalog"
                ? JSON.parse(api.ReadFileBatchCatalog())
                : undefined,
          },
          archive ? [archive.buffer] : [],
        );
        return;
      }
      if (kind === "propertyDiscard") api.DiscardPropertyBatch(payload);
      const output =
        (edit === undefined && kind !== "exportWorkingCopy") ||
        kind === "propertyCatalog" ||
        kind === "propertyPreview" ||
        kind === "propertyDiscard" ||
        kind === "pokedex9a" ||
        kind === "pokedex9" ||
        kind === "pokedex8a" ||
        kind === "pokedex8" ||
        kind === "pokedex8b" ||
        kind === "pokedex7" ||
        kind === "pokedex6" ||
        kind === "pokedex5" ||
        kind === "pokedex4" ||
        kind === "pokedex" ||
        kind === "inventory" ||
        kind === "events" ||
        kind === "eventsCompare" ||
        kind === "gsBall2" ||
        kind === "hall3" ||
        kind === "hall1" ||
        kind === "eventReset" ||
        kind === "ferry3" ||
        kind === "misc3" ||
        kind === "secretBase3" ||
        kind === "secretBase3Form" ||
        kind === "pokegear4" ||
        kind === "pokeathlon4" ||
        kind === "battlePass4" ||
        kind === "battlePass4Preview" ||
        kind === "battlePass4Export" ||
        kind === "br4Gear" ||
        kind === "inspectWorking" ||
        kind === "joyful3" ||
        kind === "frontier3" ||
        kind === "gameRecords3" ||
        kind === "paintings3" ||
        kind === "decorations3" ||
        kind === "roamer3" ||
        kind === "roamer" ||
        kind === "rtc" ||
        kind === "opowers" ||
        kind === "food" ||
        kind === "records" ||
        kind === "legality" ||
        kind === "pokemonExport" ||
        kind === "originCatalog" ||
        kind === "historyCatalog" ||
        kind === "memoryCatalog" ||
        kind === "ribbons" ||
        kind === "relearnSuggestion"
          ? undefined
          : new Uint8Array(
              kind === "ferry3Edit"
                ? api.EditFerry3(bytes, payload)
                : kind === "misc3Edit"
                  ? api.EditMisc3(bytes, payload)
                  : kind === "secretBase3Edit"
                    ? api.EditSecretBase3(bytes, payload)
                    : kind === "pokegear4Edit"
                      ? api.EditPokeGear4(bytes, payload)
                      : kind === "pokeathlon4Edit"
                        ? api.EditPokeathlon4(bytes, payload)
                        : kind === "battlePass4Edit"
                          ? api.EditBattlePass4(bytes, payload)
                          : kind === "br4GearEdit"
                            ? api.EditBr4Gear(bytes, payload)
                            : kind === "joyful3Edit"
                              ? api.EditJoyful3(bytes, payload)
                              : kind === "frontier3Edit"
                                ? api.EditFrontier3(bytes, payload)
                                : kind === "gameRecords3Edit"
                                  ? api.EditGameRecords3(bytes, payload)
                                  : kind === "paintings3Edit"
                                    ? api.EditPaintings3(bytes, payload)
                                    : kind === "decorations3Edit"
                                      ? api.EditDecorations3(bytes, payload)
                                      : kind === "roamer3Edit"
                                        ? api.EditRoamer3(bytes, payload)
                                        : kind === "hall3Edit"
                                          ? api.EditHall3(bytes, payload)
                                          : kind === "gsBall2Edit"
                                            ? api.EnableGsBall2(bytes)
                                            : kind === "hall1Edit"
                                              ? api.EditHall1(bytes, payload)
                                              : kind === "eventResetEdit"
                                                ? api.EditEventReset(
                                                    bytes,
                                                    payload,
                                                  )
                                                : kind === "eventsEdit"
                                                  ? api.EditEvents(
                                                      bytes,
                                                      payload,
                                                    )
                                                  : kind === "propertyCommit"
                                                    ? api.CommitPropertyBatch(
                                                        bytes,
                                                        payload,
                                                      )
                                                    : kind ===
                                                        "exportWorkingCopy"
                                                      ? api.ExportWorkingCopy(
                                                          bytes,
                                                        )
                                                      : kind === "pokedex9aEdit"
                                                        ? api.EditPokedex9a(
                                                            bytes,
                                                            payload,
                                                          )
                                                        : kind ===
                                                            "pokedex9Edit"
                                                          ? api.EditPokedex9(
                                                              bytes,
                                                              payload,
                                                            )
                                                          : kind ===
                                                              "pokedex8aEdit"
                                                            ? api.EditPokedex8a(
                                                                bytes,
                                                                payload,
                                                              )
                                                            : kind ===
                                                                "pokedex8Edit"
                                                              ? api.EditPokedex8(
                                                                  bytes,
                                                                  payload,
                                                                )
                                                              : kind ===
                                                                  "pokedex8bEdit"
                                                                ? api.EditPokedex8b(
                                                                    bytes,
                                                                    payload,
                                                                  )
                                                                : kind ===
                                                                    "pokedex7Edit"
                                                                  ? api.EditPokedex7(
                                                                      bytes,
                                                                      payload,
                                                                    )
                                                                  : kind ===
                                                                      "pokedex6Edit"
                                                                    ? api.EditPokedex6(
                                                                        bytes,
                                                                        payload,
                                                                      )
                                                                    : kind ===
                                                                        "pokedex5Edit"
                                                                      ? api.EditPokedex5(
                                                                          bytes,
                                                                          payload,
                                                                        )
                                                                      : kind ===
                                                                          "pokedex4Edit"
                                                                        ? api.EditPokedex4(
                                                                            bytes,
                                                                            payload,
                                                                          )
                                                                        : kind ===
                                                                            "pokedexEdit"
                                                                          ? api.EditPokedex(
                                                                              bytes,
                                                                              payload,
                                                                            )
                                                                          : kind ===
                                                                              "roamerEdit"
                                                                            ? api.EditRoamer(
                                                                                bytes,
                                                                                payload,
                                                                              )
                                                                            : kind ===
                                                                                "rtcEdit"
                                                                              ? api.EditRtc(
                                                                                  bytes,
                                                                                  payload,
                                                                                )
                                                                              : kind ===
                                                                                  "opowersEdit"
                                                                                ? api.EditOPowers(
                                                                                    bytes,
                                                                                    payload,
                                                                                  )
                                                                                : kind ===
                                                                                    "foodEdit"
                                                                                  ? api.EditFood(
                                                                                      bytes,
                                                                                      payload,
                                                                                    )
                                                                                  : kind ===
                                                                                      "recordEdit"
                                                                                    ? api.EditRecord(
                                                                                        bytes,
                                                                                        payload,
                                                                                      )
                                                                                    : kind ===
                                                                                        "inventoryBatch"
                                                                                      ? api.EditInventoryBatch(
                                                                                          bytes,
                                                                                          payload,
                                                                                        )
                                                                                      : kind ===
                                                                                          "inventoryEdit"
                                                                                        ? api.EditInventory(
                                                                                            bytes,
                                                                                            payload,
                                                                                          )
                                                                                        : kind ===
                                                                                            "pokemonRaw"
                                                                                          ? api.EditPokemonRaw(
                                                                                              bytes,
                                                                                              payload,
                                                                                            )
                                                                                          : kind ===
                                                                                              "pokemon"
                                                                                            ? api.EditPokemon(
                                                                                                bytes,
                                                                                                payload,
                                                                                              )
                                                                                            : kind ===
                                                                                                "box"
                                                                                              ? api.EditBox(
                                                                                                  bytes,
                                                                                                  payload,
                                                                                                )
                                                                                              : kind ===
                                                                                                  "storage"
                                                                                                ? api.EditStorage(
                                                                                                    bytes,
                                                                                                    payload,
                                                                                                  )
                                                                                                : kind ===
                                                                                                    "pokemonImport"
                                                                                                  ? api.ImportPokemon(
                                                                                                      bytes,
                                                                                                      payload,
                                                                                                    )
                                                                                                  : api.Export(
                                                                                                      bytes,
                                                                                                      payload,
                                                                                                    ),
            );
      const report: SaveReport = JSON.parse(api.Inspect(output ?? bytes));
      if (report.apiVersion !== 100)
        throw new Error("Save editor API version mismatch.");
      const legality: PokemonLegalityReport | undefined =
        kind === "legality" && edit !== undefined
          ? JSON.parse(api.AnalyzePokemon(bytes, payload))
          : undefined;
      const pokemonFile =
        kind === "pokemonExport" && edit !== undefined
          ? JSON.parse(api.ExportPokemon(bytes, payload))
          : undefined;
      const originCatalog =
        kind === "originCatalog" && edit !== undefined
          ? JSON.parse(api.ReadOrigin(bytes, payload))
          : undefined;
      const relearnSuggestion =
        kind === "relearnSuggestion" && edit !== undefined
          ? JSON.parse(api.SuggestRelearn(bytes, payload))
          : undefined;
      const ribbons =
        kind === "ribbons" && edit !== undefined
          ? JSON.parse(api.ReadRibbons(bytes, payload))
          : undefined;
      const historyCatalog =
        kind === "historyCatalog" && edit !== undefined
          ? JSON.parse(api.ReadHistory(bytes, payload))
          : undefined;
      const memoryCatalog =
        kind === "memoryCatalog" && edit !== undefined
          ? JSON.parse(api.ReadMemory(bytes, payload))
          : undefined;
      self.postMessage(
        {
          id,
          report,
          pokedex9a:
            kind === "pokedex9a"
              ? JSON.parse(api.ReadPokedex9a(bytes))
              : undefined,
          pokedex9:
            kind === "pokedex9"
              ? JSON.parse(api.ReadPokedex9(bytes))
              : undefined,
          pokedex8a:
            kind === "pokedex8a"
              ? JSON.parse(api.ReadPokedex8a(bytes))
              : undefined,
          pokedex8:
            kind === "pokedex8"
              ? JSON.parse(api.ReadPokedex8(bytes))
              : undefined,
          pokedex8b:
            kind === "pokedex8b"
              ? JSON.parse(api.ReadPokedex8b(bytes))
              : undefined,
          pokedex7:
            kind === "pokedex7"
              ? JSON.parse(api.ReadPokedex7(bytes))
              : undefined,
          pokedex6:
            kind === "pokedex6"
              ? JSON.parse(api.ReadPokedex6(bytes))
              : undefined,
          pokedex5:
            kind === "pokedex5"
              ? JSON.parse(api.ReadPokedex5(bytes))
              : undefined,
          pokedex4:
            kind === "pokedex4"
              ? JSON.parse(api.ReadPokedex4(bytes))
              : undefined,
          pokedex:
            kind === "pokedex" && edit !== undefined
              ? JSON.parse(api.ReadPokedex(bytes, payload))
              : undefined,
          events:
            kind === "events"
              ? JSON.parse(api.ReadEvents(bytes, payload))
              : undefined,
          eventDiff:
            kind === "eventsCompare"
              ? JSON.parse(api.CompareEvents(bytes, payload))
              : undefined,
          gsBall2:
            kind === "gsBall2" ? JSON.parse(api.ReadGsBall2(bytes)) : undefined,
          hall3:
            kind === "hall3"
              ? JSON.parse(api.ReadHall3(bytes, payload))
              : undefined,
          hall1:
            kind === "hall1" ? JSON.parse(api.ReadHall1(bytes)) : undefined,
          eventReset:
            kind === "eventReset"
              ? JSON.parse(api.ReadEventReset(bytes, payload))
              : undefined,
          ferry3:
            kind === "ferry3" ? JSON.parse(api.ReadFerry3(bytes)) : undefined,
          misc3:
            kind === "misc3" ? JSON.parse(api.ReadMisc3(bytes)) : undefined,
          secretBase3:
            kind === "secretBase3"
              ? JSON.parse(api.ReadSecretBase3(bytes))
              : undefined,
          secretBase3Form:
            kind === "secretBase3Form"
              ? JSON.parse(api.SuggestSecretBase3Form(bytes, payload))
              : undefined,
          pokegear4:
            kind === "pokegear4"
              ? JSON.parse(api.ReadPokeGear4(bytes))
              : undefined,
          pokeathlon4:
            kind === "pokeathlon4"
              ? JSON.parse(api.ReadPokeathlon4(bytes))
              : undefined,
          battlePassPreview:
            kind === "battlePass4Preview"
              ? JSON.parse(api.PreviewBattlePassPokemon4(bytes, payload))
              : undefined,
          battlePass4:
            kind === "battlePass4"
              ? JSON.parse(api.ReadBattlePass4(bytes, payload))
              : undefined,
          battlePassFile:
            kind === "battlePass4Export"
              ? (() => {
                  const query = JSON.parse(payload) as {
                    index: number;
                    slot?: number;
                  };
                  return {
                    fileName:
                      query.slot === undefined
                        ? `battle-pass-${query.index + 1}.bin`
                        : `battle-pass-${query.index + 1}-${query.slot + 1}.bk4`,
                    data:
                      query.slot === undefined
                        ? api.ExportBattlePass4(bytes, query.index)
                        : api.ExportBattlePassPokemon4(
                            bytes,
                            query.index,
                            query.slot,
                          ),
                  };
                })()
              : undefined,
          br4Gear:
            kind === "br4Gear" ? JSON.parse(api.ReadBr4Gear(bytes)) : undefined,
          joyful3:
            kind === "joyful3" ? JSON.parse(api.ReadJoyful3(bytes)) : undefined,
          frontier3:
            kind === "frontier3"
              ? JSON.parse(api.ReadFrontier3(bytes))
              : undefined,
          gameRecords3:
            kind === "gameRecords3"
              ? JSON.parse(api.ReadGameRecords3(bytes))
              : undefined,
          paintings3:
            kind === "paintings3"
              ? JSON.parse(api.ReadPaintings3(bytes))
              : undefined,
          decorations3:
            kind === "decorations3"
              ? JSON.parse(api.ReadDecorations3(bytes))
              : undefined,
          roamer3:
            kind === "roamer3" ? JSON.parse(api.ReadRoamer3(bytes)) : undefined,
          roamer:
            kind === "roamer" ? JSON.parse(api.ReadRoamer(bytes)) : undefined,
          rtc: kind === "rtc" ? JSON.parse(api.ReadRtc(bytes)) : undefined,
          opowers:
            kind === "opowers" ? JSON.parse(api.ReadOPowers(bytes)) : undefined,
          food: kind === "food" ? JSON.parse(api.ReadFood(bytes)) : undefined,
          records:
            kind === "records" ? JSON.parse(api.ReadRecords(bytes)) : undefined,
          inventory:
            kind === "inventory"
              ? JSON.parse(api.ReadInventory(bytes))
              : undefined,
          propertyCatalog:
            kind === "propertyCatalog"
              ? JSON.parse(api.ReadPropertyBatchCatalog(bytes))
              : undefined,
          propertyPreview:
            kind === "propertyPreview"
              ? JSON.parse(api.PreviewPropertyBatch(bytes, payload))
              : undefined,
          output,
          legality,
          pokemonFile,
          originCatalog,
          relearnSuggestion,
          ribbons,
          memoryCatalog,
          historyCatalog,
        },
        output ? [output.buffer] : [],
      );
    } catch (error) {
      self.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
