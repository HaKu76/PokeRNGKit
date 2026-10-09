import { ZaPokedexEditor } from "./ZaPokedexEditor";
import { SvPokedexEditor } from "./SvPokedexEditor";
import { LegendsPokedexEditor } from "./LegendsPokedexEditor";
import { SwshPokedexEditor } from "./SwshPokedexEditor";
import { BdspPokedexEditor } from "./BdspPokedexEditor";
import { Gen7PokedexEditor } from "./Gen7PokedexEditor";
import { FlagPokedexEditor } from "./FlagPokedexEditor";
import { Gen4PokedexEditor } from "./Gen4PokedexEditor";
import { SimplePokedexEditor } from "./SimplePokedexEditor";
import { TrainerAppearance6Fields } from "./TrainerAppearance6Fields";
import { TrainerDateFields } from "./TrainerDateFields";
import { useCallback, useEffect, useRef, useState } from "react";
import { PropertyBatchEditor } from "./PropertyBatchEditor";
import { FileBatchEditor } from "./FileBatchEditor";
import {
  fileBatchWords,
  readBatchFiles,
  type FileBatchConfirmation,
} from "./fileBatch";
import { propertyBatchWords } from "./propertyBatch";
import { useTranslation } from "react-i18next";
import { Download, FileUp, RotateCcw, Unplug } from "lucide-react";
import { Select } from "../shared/Select";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import { SaveEditorClient } from "./client";
import {
  exportSaveName,
  MAX_SAVE_BYTES,
  saveGameChoices,
  reconcileSaveGame,
  trainerDraft,
  trainerDraftMatches,
  rebaseTrainerDraft,
  validateTrainer,
  type OriginCatalog,
  type SaveReport,
  type BoxEdit,
  type StorageEdit,
  type PokemonImport,
  type PokemonLegalityReport,
  type PokemonPosition,
  type PokemonRawEdit,
  type TrainerDraft,
} from "./domain";
import { profileLink, type SaveProfileControllers } from "./profileLink";
import "./SaveEditorPanel.css";
import { saveEditorResources, localizeSaveError } from "./locales";
import type { PokemonEdit } from "./PokemonEditor";
import { SavePokemonBrowser } from "./SavePokemonBrowser";
import { SaveInventoryBrowser } from "./SaveInventoryBrowser";
import { TrainerGeographyFields } from "./TrainerGeographyFields";
import { EventEditor } from "./EventEditor";
import { supportsEvents, eventWords, validateEventFiles } from "./events";
import { GsBall2Editor } from "./GsBall2Editor";
import { supportsGsBall2, gsBall2Words } from "./gsBall2";
import { Hall3Editor } from "./Hall3Editor";
import { supportsHall3, hall3Words } from "./hall3";
import { Hall1Editor } from "./Hall1Editor";
import { supportsHall1, hall1Words } from "./hall1";
import { EventResetEditor } from "./EventResetEditor";
import { supportsEventReset, eventResetWords } from "./eventReset";
import { Ferry3Editor } from "./Ferry3Editor";
import { supportsFerry3, ferry3Words } from "./ferry3";
import { Joyful3Editor } from "./Joyful3Editor";
import { supportsJoyful3, joyful3Words } from "./joyful3";
import { Frontier3Editor } from "./Frontier3Editor";
import { supportsFrontier3, frontier3Words } from "./frontier3";
import { GameRecords3Editor } from "./GameRecords3Editor";
import { supportsGameRecords3, gameRecords3Words } from "./gameRecords3";
import { Paintings3Editor } from "./Paintings3Editor";
import { supportsPaintings3, paintings3Words } from "./paintings3";
import { Decorations3Editor } from "./Decorations3Editor";
import { supportsDecorations3, decorations3Words } from "./decorations3";
import { Roamer3Editor } from "./Roamer3Editor";
import { supportsRoamer3, roamer3Words } from "./roamer3";
import { RoamerEditor } from "./RoamerEditor";
import { supportsRoamer, roamerWords } from "./roamer";
import { RtcEditor } from "./RtcEditor";
import { supportsRtc, rtcWords } from "./rtc";
import { OPowerEditor } from "./OPowerEditor";
import { supportsOPowers, opowerWords } from "./opowers";
import { SaveFoodEditor } from "./SaveFoodEditor";
import { supportsFood, foodWords } from "./saveFood";
import { SaveRecordEditor } from "./SaveRecordEditor";
import { TrainerGameOptionFields } from "./TrainerGameOptionFields";
import { TrainerPositionFields } from "./TrainerPositionFields";

export function SaveEditorPanel(
  controllers: Omit<SaveProfileControllers, "gen5">,
) {
  const { t, i18n } = useTranslation();
  const words = t("saveEditor", {
    returnObjects: true,
  }) as typeof saveEditorResources.en;
  const gen5 = useGen5Profiles();
  const client = useRef(new SaveEditorClient());
  const original = useRef<Uint8Array | undefined>(undefined);
  const working = useRef<Uint8Array | undefined>(undefined);
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const operation = useRef(0);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [cancellable, setCancellable] = useState(false);
  const [name, setName] = useState("");
  const [fileRevision, setFileRevision] = useState(0);
  const [report, setReport] = useState<SaveReport>();
  const [workingRevision, setWorkingRevision] = useState(0);
  const [legality, setLegality] = useState<PokemonLegalityReport>();
  const [section, setSection] = useState<
    | "pokemon"
    | "trainer"
    | "inventory"
    | "events"
    | "gsBall2"
    | "hall3"
    | "hall1"
    | "eventReset"
    | "ferry3"
    | "joyful3"
    | "frontier3"
    | "gameRecords3"
    | "paintings3"
    | "decorations3"
    | "roamer3"
    | "roamer"
    | "rtc"
    | "opowers"
    | "food"
    | "records"
    | "pokedex"
    | "batch"
    | "files"
  >("pokemon");
  const [draft, setDraft] = useState<TrainerDraft>({
    nickname: "",
    fashionGender: "",
    gameVersion: "",
    saved: "",
    started: "",
    fame: "",
    rotation: "",
    scaleX: "",
    scaleZ: "",
    scaleY: "",
    map: "",
    x: "",
    z: "",
    y: "",
    textSpeed: "",
    battleStyle: "",
    sound: "",
    battleEffects: "",
    bp: "",
    pokeMiles: "",
    festivalCoins: "",
    watts: "",
    badges: "",
    country: "",
    region: "",
    consoleRegion: "",
    language: "",
    ot: "",
    tid: "",
    sid: "",
    money: "",
    gender: "",
    hours: "",
    minutes: "",
    seconds: "",
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [version, setVersion] = useState("");
  const [target, setTarget] = useState("new");
  const [profileName, setProfileName] = useState("");
  const [reviewDefaults, setReviewDefaults] = useState(false);
  const link = report
    ? profileLink(report, version, { ...controllers, gen5 })
    : undefined;
  const choices = report ? saveGameChoices(report) : [];

  useEffect(() => {
    const instance = client.current;
    const lifecycle = operation;
    return () => {
      lifecycle.current++;
      instance.dispose();
    };
  }, []);

  const perform = async (
    action: (id: number) => Promise<void>,
    canCancel = true,
  ) => {
    if (running.current) return;
    const id = ++operation.current;
    running.current = true;
    setBusy(true);
    setCancellable(canCancel);
    setError("");
    setStatus("");
    try {
      await action(id);
    } catch (cause) {
      if (id === operation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (id === operation.current) {
        running.current = false;
        setBusy(false);
      }
    }
  };

  const openFile = (file: File) =>
    perform(async (id) => {
      if (!file.size || file.size > MAX_SAVE_BYTES)
        throw new Error("Save file must be between 1 byte and 32 MiB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (id !== operation.current) return;
      const result = await client.current.run(bytes);
      if (id !== operation.current) return;
      original.current = bytes;
      working.current = bytes;
      setHistory([]);
      setReport(result.report);
      setVersion((previous) => reconcileSaveGame(previous, result.report));
      if (report && report.version !== result.report.version) {
        setTarget("new");
        setReviewDefaults(false);
      }
      setSection((previous) =>
        (previous === "batch" && !result.report.canEdit) ||
        (previous === "pokedex" && !result.report.pokedex) ||
        (previous === "records" && !result.report.trainer.canRecords) ||
        (previous === "food" && !supportsFood(result.report.format)) ||
        (previous === "opowers" && !supportsOPowers(result.report.format)) ||
        (previous === "events" && !supportsEvents(result.report.format)) ||
        (previous === "gsBall2" &&
          !supportsGsBall2(result.report.format, result.report.version)) ||
        (previous === "hall3" && !supportsHall3(result.report.format)) ||
        (previous === "hall1" && !supportsHall1(result.report.format)) ||
        (previous === "eventReset" &&
          !supportsEventReset(result.report.format)) ||
        (previous === "ferry3" && !supportsFerry3(result.report.format)) ||
        (previous === "joyful3" && !supportsJoyful3(result.report.format)) ||
        (previous === "frontier3" &&
          !supportsFrontier3(result.report.format)) ||
        (previous === "gameRecords3" &&
          !supportsGameRecords3(result.report.format)) ||
        (previous === "paintings3" &&
          !supportsPaintings3(result.report.format)) ||
        (previous === "decorations3" &&
          !supportsDecorations3(result.report.format)) ||
        (previous === "roamer3" && !supportsRoamer3(result.report.format)) ||
        (previous === "roamer" && !supportsRoamer(result.report.format)) ||
        (previous === "rtc" && !supportsRtc(result.report.format))
          ? "trainer"
          : previous,
      );
      setWorkingRevision((previous) => previous + 1);
      setLegality(undefined);
      setDraft(trainerDraft(result.report));
      setName(file.name);
      setFileRevision((previous) => previous + 1);
      setProfileName(`${result.report.ot} · ${result.report.version}`);
      const games = saveGameChoices(result.report);
      setVersion(games.length === 1 ? games[0] : "");
      setTarget("new");
      setReviewDefaults(false);
    });

  const exportFile = () =>
    perform(async (id) => {
      if (!report || !original.current) return;
      const result = report.canEdit
        ? await client.current.run(
            working.current ?? original.current,
            JSON.stringify(validateTrainer(draft, report)),
          )
        : await client.current.run(
            working.current ?? original.current,
            undefined,
            "exportWorkingCopy",
          );
      if (id !== operation.current) return;
      if (!result.output) throw new Error("No output was returned.");
      const blob = new Blob([new Uint8Array(result.output)], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportSaveName(name);
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus("exported");
    });

  const batchLang = i18n.language.startsWith("zh")
    ? "zh"
    : i18n.language.startsWith("ja")
      ? "ja"
      : "en";
  const discardPropertyPreview = useCallback((token: string) => {
    if (working.current)
      client.current.discardPropertyPreview(working.current, token);
  }, []);
  const readPropertyBatch = async (
    kind: "propertyCatalog" | "propertyPreview" | "fileCatalog",
    payload?: string,
  ) => {
    let response: import("./domain").SaveEditorResult | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(working.current, payload, kind);
      if (id === operation.current) response = result;
    });
    return response;
  };
  const discardFilePreview = useCallback((token: string) => {
    if (working.current)
      client.current.discardFilePreview(working.current, token);
  }, []);
  const discardBoxImport = useCallback((token: string) => {
    if (working.current)
      client.current.discardBoxImport(working.current, token);
  }, []);
  const discardBoxBinary = useCallback((token: string) => {
    if (working.current)
      client.current.discardBoxBinary(working.current, token);
  }, []);
  const previewBoxBinary = async (
    file: File,
    options: import("./boxBinary").BoxBinaryOptions,
  ) => {
    let response: import("./domain").SaveEditorResult | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      if (file.size === 0 || file.size > MAX_SAVE_BYTES)
        throw new Error("Box binary file exceeds limits.");
      const loaded = await readBatchFiles(
        [file],
        () => id === operation.current,
      );
      if (!loaded || id !== operation.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ ...options, data: loaded[0].data }),
        "boxBinaryPreview",
      );
      if (id === operation.current) response = result;
    });
    return response;
  };
  const previewBoxImport = async (
    files: File[],
    options: import("./boxImport").BoxImportOptions,
  ) => {
    let response: import("./domain").SaveEditorResult | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const loaded = files.length
        ? await readBatchFiles(files, () => id === operation.current)
        : [];
      if (!loaded || id !== operation.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ ...options, files: loaded }),
        "boxImportPreview",
      );
      if (id === operation.current) response = result;
    });
    return response;
  };
  const previewFileBatch = async (files: File[], text: string) => {
    let response: import("./domain").SaveEditorResult | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const loaded = await readBatchFiles(
        files,
        () => id === operation.current,
      );
      if (!loaded || id !== operation.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ files: loaded, text, language: batchLang }),
        "filePreview",
      );
      if (id === operation.current) response = result;
    });
    return response;
  };
  const downloadArchive = async (
    payload: string,
    kind: "fileExport" | "boxArchive" | "boxBinaryExport",
    filename: string,
  ) => {
    let downloaded = false;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(working.current, payload, kind);
      if (id !== operation.current) return;
      const bytes =
        kind === "boxBinaryExport" ? result.boxBinary : result.archive;
      if (!bytes)
        throw new Error(
          kind === "boxBinaryExport"
            ? "Box binary export is missing."
            : "File batch archive is missing.",
        );
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type:
            kind === "boxBinaryExport"
              ? "application/octet-stream"
              : "application/zip",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      downloaded = true;
    });
    return downloaded;
  };
  const downloadFileBatch = (confirmation: FileBatchConfirmation) =>
    downloadArchive(
      JSON.stringify(confirmation),
      "fileExport",
      "PokeRNGKit-Pokemon.zip",
    );
  const downloadBoxes = (request: import("./boxArchive").BoxArchiveRequest) =>
    downloadArchive(
      JSON.stringify(request),
      "boxArchive",
      "PokeRNGKit-Boxes.zip",
    );
  const downloadBoxBinary = (request: { box: number; all: boolean }) =>
    downloadArchive(
      JSON.stringify(request),
      "boxBinaryExport",
      request.all
        ? "PokeRNGKit-PC.bin"
        : `PokeRNGKit-Box-${request.box + 1}.bin`,
    );
  const readInventory = async () => {
    let inventory: import("./domain").BagReport | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "inventory",
      );
      if (id !== operation.current) return;
      if (!result.inventory) throw new Error("No inventory was returned.");
      inventory = result.inventory;
    });
    return inventory;
  };

  const readPokedex9a = async () => {
    let catalog: import("./zaPokedex").Dex9aCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex9a",
      );
      if (id !== operation.current) return;
      if (!result.pokedex9a)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex9a;
    });
    return catalog;
  };
  const readPokedex9 = async () => {
    let catalog: import("./svPokedex").Dex9Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex9",
      );
      if (id !== operation.current) return;
      if (!result.pokedex9)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex9;
    });
    return catalog;
  };
  const readPokedex8a = async () => {
    let catalog: import("./legendsPokedex").Dex8aCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex8a",
      );
      if (id !== operation.current) return;
      if (!result.pokedex8a)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex8a;
    });
    return catalog;
  };
  const readPokedex8 = async () => {
    let catalog: import("./swshPokedex").Dex8Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex8",
      );
      if (id !== operation.current) return;
      if (!result.pokedex8)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex8;
    });
    return catalog;
  };
  const readPokedex8b = async () => {
    let catalog: import("./bdspPokedex").Dex8bCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex8b",
      );
      if (id !== operation.current) return;
      if (!result.pokedex8b)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex8b;
    });
    return catalog;
  };
  const readPokedex7 = async () => {
    let catalog: import("./gen7Pokedex").Dex7Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex7",
      );
      if (id !== operation.current) return;
      if (!result.pokedex7)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex7;
    });
    return catalog;
  };
  const readPokedex6 = async () => {
    let catalog: import("./gen5Pokedex").Dex5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex6",
      );
      if (id !== operation.current) return;
      if (!result.pokedex6)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex6;
    });
    return catalog;
  };
  const readPokedex5 = async () => {
    let catalog: import("./gen5Pokedex").Dex5Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex5",
      );
      if (id !== operation.current) return;
      if (!result.pokedex5)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex5;
    });
    return catalog;
  };
  const readPokedex4 = async () => {
    let catalog: import("./gen4Pokedex").Dex4Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "pokedex4",
      );
      if (id !== operation.current) return;
      if (!result.pokedex4)
        throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex4;
    });
    return catalog;
  };
  const readPokedex = async () => {
    let catalog: import("./simplePokedex").SimpleDexCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ fileName: name }),
        "pokedex",
      );
      if (id !== operation.current) return;
      if (!result.pokedex) throw new Error("Pokedex catalog was not returned.");
      catalog = result.pokedex;
    });
    return catalog;
  };

  const readEvents = async () => {
    let catalog: import("./events").EventCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ language: batchLang }),
        "events",
      );
      if (id !== operation.current) return;
      if (!result.events) throw new Error("No event catalog was returned.");
      catalog = result.events;
    });
    return catalog;
  };
  const compareEvents = async (old: File, newer: File) => {
    let diff: import("./events").EventDiff | undefined;
    await perform(async (id) => {
      validateEventFiles([old, newer]);
      const files = await readBatchFiles(
        [newer],
        () => id === operation.current,
      );
      if (!files || id !== operation.current) return;
      const bytes = new Uint8Array(await old.arrayBuffer());
      if (id !== operation.current) return;
      const result = await client.current.run(
        bytes,
        JSON.stringify({ newData: files[0].data }),
        "eventsCompare",
      );
      if (id !== operation.current) return;
      if (!result.eventDiff)
        throw new Error("No event comparison was returned.");
      diff = result.eventDiff;
    });
    return diff;
  };
  const readGsBall2 = async () => {
    let catalog: import("./gsBall2").GsBall2Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "gsBall2",
      );
      if (id !== operation.current) return;
      if (!result.gsBall2) throw new Error("No GS Ball catalog was returned.");
      catalog = result.gsBall2;
    });
    return catalog;
  };
  const readHall3 = async (version?: number) => {
    let catalog: import("./hall3").Hall3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ version }),
        "hall3",
      );
      if (id !== operation.current) return;
      if (!result.hall3)
        throw new Error("No Hall of Fame catalog was returned.");
      catalog = result.hall3;
    });
    return catalog;
  };
  const readHall1 = async () => {
    let catalog: import("./hall1").Hall1Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "hall1",
      );
      if (id !== operation.current) return;
      if (!result.hall1)
        throw new Error("No Hall of Fame catalog was returned.");
      catalog = result.hall1;
    });
    return catalog;
  };
  const readEventReset = async () => {
    let catalog: import("./eventReset").EventResetCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ language: batchLang }),
        "eventReset",
      );
      if (id !== operation.current) return;
      if (!result.eventReset)
        throw new Error("No event reset catalog was returned.");
      catalog = result.eventReset;
    });
    return catalog;
  };
  const readFerry3 = async () => {
    let catalog: import("./ferry3").Ferry3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "ferry3",
      );
      if (id !== operation.current) return;
      if (!result.ferry3) throw new Error("No ferry3 catalog was returned.");
      catalog = result.ferry3;
    });
    return catalog;
  };

  const readJoyful3 = async () => {
    let catalog: import("./joyful3").Joyful3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "joyful3",
      );
      if (id !== operation.current) return;
      if (!result.joyful3) throw new Error("No joyful3 catalog was returned.");
      catalog = result.joyful3;
    });
    return catalog;
  };

  const readFrontier3 = async () => {
    let catalog: import("./frontier3").Frontier3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "frontier3",
      );
      if (id !== operation.current) return;
      if (!result.frontier3)
        throw new Error("No frontier3 catalog was returned.");
      catalog = result.frontier3;
    });
    return catalog;
  };

  const readGameRecords3 = async () => {
    let catalog: import("./gameRecords3").GameRecord3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "gameRecords3",
      );
      if (id !== operation.current) return;
      if (!result.gameRecords3)
        throw new Error("No gameRecords3 catalog was returned.");
      catalog = result.gameRecords3;
    });
    return catalog;
  };

  const readPaintings3 = async () => {
    let catalog: import("./paintings3").Painting3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "paintings3",
      );
      if (id !== operation.current) return;
      if (!result.paintings3)
        throw new Error("No paintings3 catalog was returned.");
      catalog = result.paintings3;
    });
    return catalog;
  };

  const readDecorations3 = async () => {
    let catalog: import("./decorations3").Decoration3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "decorations3",
      );
      if (id !== operation.current) return;
      if (!result.decorations3)
        throw new Error("No decorations3 catalog was returned.");
      catalog = result.decorations3;
    });
    return catalog;
  };

  const readRoamer3 = async () => {
    let catalog: import("./roamer3").Roamer3Catalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "roamer3",
      );
      if (id !== operation.current) return;
      if (!result.roamer3) throw new Error("No roamer3 catalog was returned.");
      catalog = result.roamer3;
    });
    return catalog;
  };

  const readRoamer = async () => {
    let catalog: import("./roamer").RoamerCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "roamer",
      );
      if (id !== operation.current) return;
      if (!result.roamer) throw new Error("No roamer catalog was returned.");
      catalog = result.roamer;
    });
    return catalog;
  };

  const readRtc = async () => {
    let catalog: import("./rtc").RtcCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "rtc",
      );
      if (id !== operation.current) return;
      if (!result.rtc) throw new Error("No clock catalog was returned.");
      catalog = result.rtc;
    });
    return catalog;
  };

  const readOPowers = async () => {
    let catalog: import("./opowers").OPowerCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "opowers",
      );
      if (id !== operation.current) return;
      if (!result.opowers) throw new Error("No O-Power catalog was returned.");
      catalog = result.opowers;
    });
    return catalog;
  };

  const readFood = async () => {
    let catalog: import("./saveFood").SaveFoodCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "food",
      );
      if (id !== operation.current) return;
      if (!result.food) throw new Error("No food catalog was returned.");
      catalog = result.food;
    });
    return catalog;
  };

  const readRecords = async () => {
    let catalog: import("./domain").SaveRecordCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        undefined,
        "records",
      );
      if (id !== operation.current) return;
      if (!result.records) throw new Error("No game records were returned.");
      catalog = result.records;
    });
    return catalog;
  };

  const readHistory = async (query: import("./domain").PokemonPosition) => {
    let catalog: import("./domain").HistoryCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(query),
        "historyCatalog",
      );
      if (id !== operation.current) return;
      if (!result.historyCatalog)
        throw new Error("No history catalog was returned.");
      catalog = result.historyCatalog;
    });
    return catalog;
  };

  const readMemory = async (query: import("./domain").MemoryQuery) => {
    let catalog: import("./domain").MemoryCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(query),
        "memoryCatalog",
      );
      if (id !== operation.current) return;
      if (!result.memoryCatalog)
        throw new Error("No memory catalog was returned.");
      catalog = result.memoryCatalog;
    });
    return catalog;
  };

  const readRibbons = async (position: PokemonPosition) => {
    let ribbons: import("./domain").RibbonCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(position),
        "ribbons",
      );
      if (id !== operation.current) return;
      if (!result.ribbons) throw new Error("No ribbon catalog was returned.");
      ribbons = result.ribbons;
    });
    return ribbons;
  };

  const suggestRelearn = async (
    position: PokemonPosition,
  ): Promise<number[] | undefined> => {
    let moves: number[] | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(position),
        "relearnSuggestion",
      );
      if (id !== operation.current) return;
      if (!result.relearnSuggestion)
        throw new Error("No relearn suggestion was returned.");
      moves = result.relearnSuggestion;
    });
    return moves;
  };

  const readOrigin = async (
    position: PokemonPosition,
    version?: number,
  ): Promise<OriginCatalog | undefined> => {
    let catalog: OriginCatalog | undefined;
    await perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify({ ...position, version }),
        "originCatalog",
      );
      if (id !== operation.current) return;
      if (!result.originCatalog)
        throw new Error("No origin catalog was returned.");
      catalog = result.originCatalog;
    });
    return catalog;
  };

  const analyzePokemon = (position: PokemonPosition) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(position),
        "legality",
      );
      if (id !== operation.current) return;
      if (!result.legality) throw new Error("No legality report was returned.");
      setLegality(result.legality);
    });

  const applyWorkingEdit = (
    edit:
      | PokemonEdit
      | PokemonRawEdit
      | BoxEdit
      | import("./propertyBatch").PropertyBatchConfirmation
      | import("./boxImport").BoxImportConfirmation
      | import("./domain").BagEdit
      | import("./domain").BagOperation
      | import("./zaPokedex").Dex9aEdit
      | import("./svPokedex").Dex9Edit
      | import("./legendsPokedex").Dex8aEdit
      | import("./swshPokedex").Dex8Edit
      | import("./bdspPokedex").Dex8bEdit
      | import("./gen7Pokedex").Dex7Edit
      | import("./gen5Pokedex").Dex5Edit
      | import("./gen4Pokedex").Dex4Edit
      | import("./simplePokedex").SimpleDexEdit
      | import("./events").EventEdit
      | import("./gsBall2").GsBall2Edit
      | import("./hall3").Hall3Edit
      | import("./hall1").Hall1Edit
      | import("./eventReset").EventResetEdit
      | import("./ferry3").Ferry3Edit
      | import("./joyful3").Joyful3Edit
      | import("./frontier3").Frontier3Edit
      | import("./gameRecords3").GameRecord3Edit
      | import("./paintings3").Painting3Edit
      | import("./decorations3").Decoration3Edit
      | import("./roamer3").Roamer3Edit
      | import("./roamer").RoamerEdit
      | import("./rtc").RtcEdit
      | import("./opowers").OPowerEdit
      | import("./saveFood").SaveFoodEdit
      | import("./domain").SaveRecordEdit
      | ReturnType<typeof validateTrainer>
      | StorageEdit
      | (() => Promise<PokemonImport | ReturnType<typeof validateTrainer>>),
    kind:
      | "boxBinaryCommit"
      | "boxImportCommit"
      | "propertyCommit"
      | "pokemon"
      | "pokemonRaw"
      | "box"
      | "storage"
      | "pokemonImport"
      | "inventoryEdit"
      | "inventoryBatch"
      | "pokedex9aEdit"
      | "pokedex9Edit"
      | "pokedex8aEdit"
      | "pokedex8Edit"
      | "pokedex8bEdit"
      | "pokedex7Edit"
      | "pokedex6Edit"
      | "pokedex5Edit"
      | "pokedex4Edit"
      | "pokedexEdit"
      | "eventsEdit"
      | "gsBall2Edit"
      | "hall3Edit"
      | "hall1Edit"
      | "eventResetEdit"
      | "ferry3Edit"
      | "joyful3Edit"
      | "frontier3Edit"
      | "gameRecords3Edit"
      | "paintings3Edit"
      | "decorations3Edit"
      | "roamer3Edit"
      | "roamerEdit"
      | "rtcEdit"
      | "opowersEdit"
      | "foodEdit"
      | "recordEdit"
      | "trainer",
  ) =>
    perform(async (id) => {
      if (!working.current) return;
      const before = working.current;
      const values = typeof edit === "function" ? await edit() : edit;
      if (id !== operation.current) return;
      const result = await client.current.run(
        before,
        JSON.stringify(values),
        kind,
      );
      if (id !== operation.current) return;
      if (!result.output) throw new Error("No output was returned.");
      setHistory((previous) => {
        const next = [...previous, before];
        while (
          next.length > 1 &&
          (next.length > 20 ||
            next.reduce((size, bytes) => size + bytes.byteLength, 0) >
              64 * 1024 * 1024)
        )
          next.shift();
        return next;
      });
      working.current = result.output;
      setReport(result.report);
      setVersion((previous) => reconcileSaveGame(previous, result.report));
      if (report && report.version !== result.report.version) {
        setTarget("new");
        setReviewDefaults(false);
      }
      setDraft((previous) =>
        kind === "trainer" || !report
          ? trainerDraft(result.report)
          : rebaseTrainerDraft(previous, report, result.report),
      );
      setWorkingRevision((previous) => previous + 1);
      setLegality(undefined);
      setStatus("pokemonSaved");
    });
  const importPokemon = (position: PokemonPosition, file: File) =>
    applyWorkingEdit(async () => {
      if (!file.size || file.size > 1024 * 1024)
        throw new Error("Entity file size is invalid.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return { ...position, fileName: file.name, data: btoa(binary) };
    }, "pokemonImport");

  const exportPokemon = (position: PokemonPosition) =>
    perform(async (id) => {
      if (!working.current) return;
      const result = await client.current.run(
        working.current,
        JSON.stringify(position),
        "pokemonExport",
      );
      if (id !== operation.current) return;
      if (!result.pokemonFile) throw new Error("Entity file export failed.");
      const bytes = Uint8Array.from(atob(result.pokemonFile.data), (char) =>
        char.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/octet-stream" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.pokemonFile.fileName;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    });

  const restoreWorking = (originalSave = false) =>
    perform(async (id) => {
      const bytes = originalSave ? original.current : history.at(-1);
      if (!bytes) return;
      const result = await client.current.run(bytes);
      if (id !== operation.current) return;
      working.current = bytes;
      setReport(result.report);
      setVersion((previous) => reconcileSaveGame(previous, result.report));
      if (report && report.version !== result.report.version) {
        setTarget("new");
        setReviewDefaults(false);
      }
      setWorkingRevision((previous) => previous + 1);
      setLegality(undefined);
      setHistory((previous) => (originalSave ? [] : previous.slice(0, -1)));
      setDraft((previous) =>
        originalSave || !report
          ? trainerDraft(result.report)
          : rebaseTrainerDraft(previous, report, result.report),
      );
    });

  return (
    <div className="save-editor-panel" aria-busy={busy}>
      <p>{words.intro}</p>
      <div className="save-editor-toolbar">
        {report && (
          <button
            type="button"
            className="primary"
            disabled={busy || !(report.canEdit || report.pokedex?.canEdit)}
            onClick={() => void exportFile()}
          >
            <Download size={18} aria-hidden="true" /> {words.export}
          </button>
        )}
        {report && (
          <>
            <button
              type="button"
              disabled={busy || history.length === 0}
              onClick={() => void restoreWorking()}
            >
              {words.undo}
            </button>
            <button
              type="button"
              disabled={busy || history.length === 0}
              onClick={() => void restoreWorking(true)}
            >
              {words.restoreSave}
            </button>
          </>
        )}
        <label className="save-editor-file">
          <FileUp size={18} aria-hidden="true" /> {words.open}
          <input
            type="file"
            aria-label={words.open}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void openFile(file);
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy || !report}
          onClick={() => {
            original.current = undefined;
            working.current = undefined;
            setHistory([]);
            setReport(undefined);
            setLegality(undefined);
            setName("");
            setError("");
            setStatus("");
            client.current.dispose();
          }}
        >
          <Unplug size={18} aria-hidden="true" /> {words.close}
        </button>
        {busy && cancellable && (
          <button
            type="button"
            onClick={() => {
              operation.current++;
              client.current.dispose();
              running.current = false;
              setBusy(false);
            }}
          >
            {t("cancel")}
          </button>
        )}
      </div>
      <p className="save-editor-note">{words.choose}</p>
      {busy && <p role="status">{words.loading}</p>}
      {error && (
        <p role="alert" className="save-editor-error">
          {localizeSaveError(error, words)}
        </p>
      )}
      {status && (
        <p role="status">
          {words[status as "exported" | "linked" | "pokemonSaved"]}
        </p>
      )}
      {report && (
        <>
          <h3>{name}</h3>
          {!report.checksumsValid && (
            <p role="alert" className="save-editor-error">
              {words.invalid}
            </p>
          )}
          <div
            className="save-editor-toolbar"
            role="group"
            aria-label={words.title}
          >
            <button
              type="button"
              aria-pressed={section === "pokemon"}
              onClick={() => setSection("pokemon")}
            >
              {words.pokemon}
            </button>
            <button
              type="button"
              aria-pressed={section === "trainer"}
              onClick={() => setSection("trainer")}
            >
              {words.trainer}
            </button>
            <button
              type="button"
              aria-pressed={section === "inventory"}
              onClick={() => setSection("inventory")}
            >
              {words.inventory}
            </button>
            {report.canEdit && (
              <button
                type="button"
                aria-pressed={section === "batch"}
                onClick={() => setSection("batch")}
              >
                {propertyBatchWords[batchLang].title}
              </button>
            )}
            <button
              type="button"
              aria-pressed={section === "files"}
              onClick={() => setSection("files")}
            >
              {fileBatchWords[batchLang].title}
            </button>
            {report.pokedex && (
              <button
                type="button"
                aria-pressed={section === "pokedex"}
                onClick={() => setSection("pokedex")}
              >
                {words.pokedexTitle}
              </button>
            )}
            {supportsEvents(report.format) && (
              <button
                type="button"
                disabled={busy}
                aria-pressed={section === "events"}
                onClick={() => setSection("events")}
              >
                {eventWords[batchLang].title}
              </button>
            )}
            {supportsGsBall2(report.format, report.version) && (
              <button
                type="button"
                disabled={busy}
                aria-pressed={section === "gsBall2"}
                onClick={() => setSection("gsBall2")}
              >
                {gsBall2Words[batchLang].title}
              </button>
            )}
            {supportsHall3(report.format) && (
              <button
                type="button"
                disabled={busy}
                aria-pressed={section === "hall3"}
                onClick={() => setSection("hall3")}
              >
                {hall3Words[batchLang].title}
              </button>
            )}
            {supportsHall1(report.format) && (
              <button
                type="button"
                disabled={busy}
                aria-pressed={section === "hall1"}
                onClick={() => setSection("hall1")}
              >
                {hall1Words[batchLang].title}
              </button>
            )}
            {supportsEventReset(report.format) && (
              <button
                type="button"
                disabled={busy}
                aria-pressed={section === "eventReset"}
                onClick={() => setSection("eventReset")}
              >
                {eventResetWords[batchLang].title}
              </button>
            )}
            {supportsFerry3(report.format) && (
              <button
                type="button"
                aria-pressed={section === "ferry3"}
                onClick={() => setSection("ferry3")}
              >
                {ferry3Words[batchLang].title}
              </button>
            )}
            {supportsJoyful3(report.format) && (
              <button
                type="button"
                aria-pressed={section === "joyful3"}
                onClick={() => setSection("joyful3")}
              >
                {joyful3Words[batchLang].title}
              </button>
            )}
            {supportsFrontier3(report.format) && (
              <button
                type="button"
                aria-pressed={section === "frontier3"}
                onClick={() => setSection("frontier3")}
              >
                {frontier3Words[batchLang].title}
              </button>
            )}
            {supportsGameRecords3(report.format) && (
              <button
                type="button"
                aria-pressed={section === "gameRecords3"}
                onClick={() => setSection("gameRecords3")}
              >
                {gameRecords3Words[batchLang].title}
              </button>
            )}
            {supportsPaintings3(report.format) && (
              <button
                type="button"
                aria-pressed={section === "paintings3"}
                onClick={() => setSection("paintings3")}
              >
                {paintings3Words[batchLang].title}
              </button>
            )}
            {supportsDecorations3(report.format) && (
              <button
                type="button"
                aria-pressed={section === "decorations3"}
                onClick={() => setSection("decorations3")}
              >
                {decorations3Words[batchLang].title}
              </button>
            )}
            {supportsRoamer3(report.format) && (
              <button
                type="button"
                aria-pressed={section === "roamer3"}
                onClick={() => setSection("roamer3")}
              >
                {roamer3Words[batchLang].title}
              </button>
            )}
            {supportsRoamer(report.format) && (
              <button
                type="button"
                aria-pressed={section === "roamer"}
                onClick={() => setSection("roamer")}
              >
                {roamerWords[batchLang].title}
              </button>
            )}
            {supportsRtc(report.format) && (
              <button
                type="button"
                aria-pressed={section === "rtc"}
                onClick={() => setSection("rtc")}
              >
                {rtcWords[batchLang].title}
              </button>
            )}
            {supportsOPowers(report.format) && (
              <button
                type="button"
                aria-pressed={section === "opowers"}
                onClick={() => setSection("opowers")}
              >
                {opowerWords[batchLang].title}
              </button>
            )}
            {supportsFood(report.format) && (
              <button
                type="button"
                aria-pressed={section === "food"}
                onClick={() => setSection("food")}
              >
                {foodWords[batchLang].title}
              </button>
            )}
            {report.trainer.canRecords && (
              <button
                type="button"
                aria-pressed={section === "records"}
                onClick={() => setSection("records")}
              >
                {words.recordsTitle}
              </button>
            )}
          </div>
          {section === "files" ? (
            <FileBatchEditor
              key={
                name +
                ":" +
                fileRevision +
                ":" +
                workingRevision +
                ":" +
                batchLang
              }
              busy={busy}
              lang={batchLang}
              onCatalog={() => readPropertyBatch("fileCatalog")}
              onPreview={previewFileBatch}
              onDownload={downloadFileBatch}
              onDiscard={discardFilePreview}
            />
          ) : section === "batch" && report.canEdit ? (
            <PropertyBatchEditor
              key={
                name +
                ":" +
                fileRevision +
                ":" +
                workingRevision +
                ":" +
                batchLang
              }
              report={report}
              busy={busy}
              lang={batchLang}
              onRead={readPropertyBatch}
              onDiscard={discardPropertyPreview}
              onApply={(edit) => applyWorkingEdit(edit, "propertyCommit")}
            />
          ) : section === "pokedex" && report.pokedex?.kind === "za" ? (
            <ZaPokedexEditor
              key={name + ":" + fileRevision}
              revision={workingRevision}
              busy={busy}
              onRead={readPokedex9a}
              onApply={(edit) => applyWorkingEdit(edit, "pokedex9aEdit")}
            />
          ) : section === "pokedex" && report.pokedex?.kind === "sv" ? (
            <SvPokedexEditor
              key={name + ":" + fileRevision}
              revision={workingRevision}
              busy={busy}
              onRead={readPokedex9}
              onApply={(edit) => applyWorkingEdit(edit, "pokedex9Edit")}
            />
          ) : section === "pokedex" && report.pokedex?.kind === "legends" ? (
            <LegendsPokedexEditor
              key={name + ":" + fileRevision}
              revision={workingRevision}
              busy={busy}
              onRead={readPokedex8a}
              onApply={(edit) => applyWorkingEdit(edit, "pokedex8aEdit")}
            />
          ) : section === "pokedex" && report.pokedex?.kind === "swsh" ? (
            <SwshPokedexEditor
              key={name + ":" + fileRevision}
              revision={workingRevision}
              busy={busy}
              onRead={readPokedex8}
              onApply={(edit) => applyWorkingEdit(edit, "pokedex8Edit")}
            />
          ) : section === "pokedex" && report.pokedex?.kind === "bdsp" ? (
            <BdspPokedexEditor
              key={`${name}:${fileRevision}`}
              revision={workingRevision}
              busy={busy}
              onRead={readPokedex8b}
              onApply={(edit) => applyWorkingEdit(edit, "pokedex8bEdit")}
            />
          ) : section === "pokedex" && report.pokedex?.kind === "gen7" ? (
            <Gen7PokedexEditor
              key={`${name}:${fileRevision}`}
              revision={workingRevision}
              busy={busy}
              onRead={readPokedex7}
              onApply={(edit) => applyWorkingEdit(edit, "pokedex7Edit")}
            />
          ) : section === "pokedex" && report.pokedex?.kind === "gen6" ? (
            <FlagPokedexEditor
              key={`${name}:${fileRevision}`}
              kind={report.format === "SAV6AO" ? "oras" : "xy"}
              revision={workingRevision}
              busy={busy}
              saveLanguage={report.language}
              onRead={readPokedex6}
              onApply={(edit) => applyWorkingEdit(edit, "pokedex6Edit")}
            />
          ) : section === "pokedex" && report.pokedex?.kind === "gen5" ? (
            <FlagPokedexEditor
              key={`${name}:${fileRevision}`}
              revision={workingRevision}
              busy={busy}
              saveLanguage={report.language}
              onRead={readPokedex5}
              onApply={(edit) => applyWorkingEdit(edit, "pokedex5Edit")}
            />
          ) : section === "pokedex" && report.pokedex?.kind === "gen4" ? (
            <Gen4PokedexEditor
              key={`${name}:${fileRevision}`}
              revision={workingRevision}
              busy={busy}
              onRead={readPokedex4}
              onApply={(edit) => applyWorkingEdit(edit, "pokedex4Edit")}
            />
          ) : section === "pokedex" && report.pokedex ? (
            <SimplePokedexEditor
              key={`${name}:${fileRevision}`}
              revision={workingRevision}
              fileName={name}
              busy={busy}
              onRead={readPokedex}
              onApply={(edit) => applyWorkingEdit(edit, "pokedexEdit")}
            />
          ) : section === "events" && supportsEvents(report.format) ? (
            <EventEditor
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readEvents}
              onApply={(edit) => applyWorkingEdit(edit, "eventsEdit")}
              onCompare={compareEvents}
            />
          ) : section === "gsBall2" &&
            supportsGsBall2(report.format, report.version) ? (
            <GsBall2Editor
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readGsBall2}
              onEnable={() =>
                applyWorkingEdit({ action: "enableGsBall" }, "gsBall2Edit")
              }
            />
          ) : section === "hall3" && supportsHall3(report.format) ? (
            <Hall3Editor
              key={report.format}
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readHall3}
              onApply={(edit) => applyWorkingEdit(edit, "hall3Edit")}
            />
          ) : section === "hall1" && supportsHall1(report.format) ? (
            <Hall1Editor
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readHall1}
              onApply={(edit) => applyWorkingEdit(edit, "hall1Edit")}
            />
          ) : section === "eventReset" && supportsEventReset(report.format) ? (
            <EventResetEditor
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readEventReset}
              onApply={(edit) => applyWorkingEdit(edit, "eventResetEdit")}
            />
          ) : section === "ferry3" && supportsFerry3(report.format) ? (
            <Ferry3Editor
              key={report.format}
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readFerry3}
              onApply={(edit) => applyWorkingEdit(edit, "ferry3Edit")}
            />
          ) : section === "joyful3" && supportsJoyful3(report.format) ? (
            <Joyful3Editor
              key={report.format}
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readJoyful3}
              onApply={(edit) => applyWorkingEdit(edit, "joyful3Edit")}
            />
          ) : section === "frontier3" && supportsFrontier3(report.format) ? (
            <Frontier3Editor
              key={report.format}
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readFrontier3}
              onApply={(edit) => applyWorkingEdit(edit, "frontier3Edit")}
            />
          ) : section === "gameRecords3" &&
            supportsGameRecords3(report.format) ? (
            <GameRecords3Editor
              key={report.format}
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readGameRecords3}
              onApply={(edit) => applyWorkingEdit(edit, "gameRecords3Edit")}
            />
          ) : section === "paintings3" && supportsPaintings3(report.format) ? (
            <Paintings3Editor
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readPaintings3}
              onApply={(edit) => applyWorkingEdit(edit, "paintings3Edit")}
            />
          ) : section === "decorations3" &&
            supportsDecorations3(report.format) ? (
            <Decorations3Editor
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readDecorations3}
              onApply={(edit) => applyWorkingEdit(edit, "decorations3Edit")}
            />
          ) : section === "roamer3" && supportsRoamer3(report.format) ? (
            <Roamer3Editor
              revision={workingRevision}
              busy={busy}
              lang={batchLang}
              onRead={readRoamer3}
              onApply={(edit) => applyWorkingEdit(edit, "roamer3Edit")}
            />
          ) : section === "roamer" && supportsRoamer(report.format) ? (
            <RoamerEditor
              revision={workingRevision}
              busy={busy}
              canEdit={report.canEdit}
              lang={batchLang}
              onRead={readRoamer}
              onApply={(edit) => applyWorkingEdit(edit, "roamerEdit")}
            />
          ) : section === "rtc" && supportsRtc(report.format) ? (
            <RtcEditor
              revision={workingRevision}
              busy={busy}
              canEdit={report.canEdit}
              lang={batchLang}
              onRead={readRtc}
              onApply={(edit) => applyWorkingEdit(edit, "rtcEdit")}
            />
          ) : section === "opowers" && supportsOPowers(report.format) ? (
            <OPowerEditor
              revision={workingRevision}
              busy={busy}
              canEdit={report.canEdit}
              lang={batchLang}
              onRead={readOPowers}
              onApply={(edit) => applyWorkingEdit(edit, "opowersEdit")}
            />
          ) : section === "food" && supportsFood(report.format) ? (
            <SaveFoodEditor
              key={`${name}:${fileRevision}`}
              revision={workingRevision}
              busy={busy}
              canEdit={report.canEdit}
              lang={batchLang}
              onRead={readFood}
              onApply={(edit) => applyWorkingEdit(edit, "foodEdit")}
            />
          ) : section === "records" && report.trainer.canRecords ? (
            <SaveRecordEditor
              key={`${name}:${fileRevision}`}
              revision={workingRevision}
              busy={busy}
              canEdit={report.canEdit}
              onRead={readRecords}
              onApply={(edit) => applyWorkingEdit(edit, "recordEdit")}
            />
          ) : section === "inventory" ? (
            <SaveInventoryBrowser
              key={workingRevision}
              busy={busy}
              onRead={readInventory}
              onBatch={(edit) => applyWorkingEdit(edit, "inventoryBatch")}
              canEdit={report.canEdit}
              onApply={(edit) => applyWorkingEdit(edit, "inventoryEdit")}
            />
          ) : section === "pokemon" ? (
            <SavePokemonBrowser
              key={`${name}:${fileRevision}`}
              report={report}
              revision={workingRevision}
              busy={busy}
              onApply={(edit) => applyWorkingEdit(edit, "pokemon")}
              onApplyRaw={(edit) => applyWorkingEdit(edit, "pokemonRaw")}
              onApplyBox={(edit) => applyWorkingEdit(edit, "box")}
              onStorage={(edit) => applyWorkingEdit(edit, "storage")}
              onImport={importPokemon}
              onExport={exportPokemon}
              onExportBoxes={downloadBoxes}
              onPreviewBoxImport={previewBoxImport}
              onApplyBoxImport={(confirmation) =>
                applyWorkingEdit(confirmation, "boxImportCommit")
              }
              onDiscardBoxImport={discardBoxImport}
              onPreviewBoxBinary={previewBoxBinary}
              onApplyBoxBinary={(confirmation) =>
                applyWorkingEdit(confirmation, "boxBinaryCommit")
              }
              onDiscardBoxBinary={discardBoxBinary}
              onExportBoxBinary={downloadBoxBinary}
              legality={legality}
              onReadOrigin={readOrigin}
              onSuggestRelearn={suggestRelearn}
              onReadRibbons={readRibbons}
              onReadHistory={readHistory}
              onReadMemory={readMemory}
              onAnalyze={analyzePokemon}
            />
          ) : (
            <>
              <dl className="save-editor-summary">
                <div>
                  <dt>{t("game")}</dt>
                  <dd>
                    {choices
                      .map(
                        (game) =>
                          words.games[game as keyof typeof words.games] ?? game,
                      )
                      .join(" / ") || report.version}{" "}
                    · {words.generation} {report.generation}
                  </dd>
                </div>
                <div>
                  <dt>{words.checksums}</dt>
                  <dd>{report.checksumsValid ? words.valid : words.invalid}</dd>
                </div>
                <div>
                  <dt>{words.displayIds}</dt>
                  <dd>
                    {report.displayTid} / {report.displaySid}
                  </dd>
                </div>
                <div>
                  <dt>{words.playTime}</dt>
                  <dd>{report.playTime}</dd>
                </div>
                <div>
                  <dt>{words.partyBoxes}</dt>
                  <dd>
                    {report.partyCount} / {report.boxCount}
                  </dd>
                </div>
              </dl>
              {report.checksumsValid && !report.canEdit && (
                <p>
                  {report.format === "SAV1"
                    ? words.pokedexResetOnly
                    : ["SAV2", "SAV7b"].includes(report.format)
                      ? words.pokedexEventsOnly
                      : report.pokedex?.canEdit
                        ? words.pokedexOnly
                        : words.readonly}
                </p>
              )}
              <fieldset
                disabled={busy || !report.canEdit}
                className="save-editor-fields"
              >
                <legend>{words.trainer}</legend>
                <label className="field">
                  <span>{words.trainerName}</span>
                  <input
                    value={draft.ot}
                    maxLength={report.maxNameLength}
                    onChange={(e) => setDraft({ ...draft, ot: e.target.value })}
                  />
                </label>
                {(
                  [
                    ["tid", words.tid, 65535],
                    ["sid", words.sid, 65535],
                    ["money", words.money, report.maxMoney],
                  ] as const
                ).map(([key, label, max]) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <input
                      inputMode="numeric"
                      value={draft[key]}
                      maxLength={String(max).length}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                {report.trainer.gameVersion.choices.length > 0 && (
                  <label className="field">
                    <span>{words.trainerGameVersion}</span>
                    <Select
                      value={draft.gameVersion}
                      onChange={(e) =>
                        setDraft({ ...draft, gameVersion: e.target.value })
                      }
                    >
                      {!report.trainer.gameVersion.choices.some(
                        (c) => String(c.id) === draft.gameVersion,
                      ) && (
                        <option value={draft.gameVersion}>
                          #{draft.gameVersion}
                        </option>
                      )}
                      {report.trainer.gameVersion.choices.map((c) => (
                        <option key={c.id} value={c.id}>
                          {
                            c.name[
                              i18n.language.startsWith("zh")
                                ? "zh"
                                : i18n.language.startsWith("ja")
                                  ? "ja"
                                  : "en"
                            ]
                          }
                        </option>
                      ))}
                    </Select>
                    <span className="save-editor-note">
                      {words.trainerGameVersionNote}
                    </span>
                  </label>
                )}
                {report.trainer.languages.length > 0 && (
                  <label className="field">
                    <span>{words.trainerLanguage}</span>
                    <Select
                      value={draft.language}
                      onChange={(e) =>
                        setDraft({ ...draft, language: e.target.value })
                      }
                    >
                      {!report.trainer.languages.some(
                        (choice) => String(choice.id) === draft.language,
                      ) && (
                        <option value={draft.language}>
                          #{draft.language}
                        </option>
                      )}
                      {report.trainer.languages.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {
                            choice.name[
                              i18n.language.startsWith("zh")
                                ? "zh"
                                : i18n.language.startsWith("ja")
                                  ? "ja"
                                  : "en"
                            ]
                          }
                        </option>
                      ))}
                    </Select>
                  </label>
                )}
                {report.trainer.currencies.map((field) => (
                  <label className="field" key={field.key}>
                    <span>
                      {words.trainerCurrencyNames[field.key]} · 0–{field.max}
                    </span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={String(field.max).length}
                      value={draft[field.key]}
                      onChange={(e) =>
                        setDraft({ ...draft, [field.key]: e.target.value })
                      }
                    />
                    {words.trainerCurrencyNotes[field.key] && (
                      <span className="save-editor-note">
                        {words.trainerCurrencyNotes[field.key]}
                      </span>
                    )}
                  </label>
                ))}
                <TrainerGeographyFields
                  report={report}
                  draft={draft}
                  onChange={setDraft}
                />
                {report.trainer.canGender && (
                  <label className="field">
                    <span>{words.gender}</span>
                    <Select
                      value={draft.gender}
                      onChange={(e) =>
                        setDraft({ ...draft, gender: e.target.value })
                      }
                    >
                      {!["0", "1"].includes(draft.gender) && (
                        <option value={draft.gender}>#{draft.gender}</option>
                      )}
                      <option value="0">{words.trainerMale}</option>
                      <option value="1">{words.trainerFemale}</option>
                    </Select>
                  </label>
                )}
                {report.trainer.canPlayTime &&
                  (
                    [
                      ["hours", words.trainerHours, 65535],
                      ["minutes", words.trainerMinutes, 99],
                      ["seconds", words.trainerSeconds, 99],
                    ] as const
                  ).map(([key, label, max]) => (
                    <label className="field" key={key}>
                      <span>
                        {label} · 0–{max}
                      </span>
                      <input
                        inputMode="numeric"
                        maxLength={String(max).length}
                        value={draft[key]}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
              </fieldset>
              {report.trainer.badges && (
                <fieldset
                  className="save-editor-fields save-trainer-badges"
                  disabled={busy || !report.canEdit}
                >
                  <legend>{words.trainerBadges}</legend>
                  {Array.from(
                    { length: report.trainer.badges.count },
                    (_, index) => (
                      <label className="save-editor-checkbox" key={index}>
                        <input
                          type="checkbox"
                          checked={(Number(draft.badges) & (1 << index)) !== 0}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              badges: String(
                                e.target.checked
                                  ? Number(draft.badges) | (1 << index)
                                  : Number(draft.badges) & ~(1 << index),
                              ),
                            })
                          }
                        />
                        <span>
                          {words.trainerBadge.replace("{n}", String(index + 1))}
                        </span>
                      </label>
                    ),
                  )}
                  <p className="save-editor-note">{words.trainerBadgesNote}</p>
                </fieldset>
              )}
              <TrainerGameOptionFields
                report={report}
                draft={draft}
                disabled={busy || !report.canEdit}
                onChange={setDraft}
              />
              <TrainerAppearance6Fields
                report={report}
                draft={draft}
                disabled={busy || !report.canEdit}
                onChange={setDraft}
              />
              <TrainerDateFields
                report={report}
                draft={draft}
                disabled={busy || !report.canEdit}
                onChange={setDraft}
              />
              <TrainerPositionFields
                report={report}
                draft={draft}
                disabled={busy || !report.canEdit}
                onChange={setDraft}
              />
              <p className="save-editor-note">{words.ids}</p>
              {report.trainer.languages.length > 0 && (
                <p className="save-editor-note">{words.trainerLanguageNote}</p>
              )}
              {report.trainer.canPlayTime && (
                <p className="save-editor-note">{words.trainerTimeNote}</p>
              )}
              {report.format === "SAV8SWSH" && (
                <p className="save-editor-note">
                  {words.trainerAppearanceNote}
                </p>
              )}
              <div className="save-editor-toolbar">
                <button
                  type="button"
                  className="primary"
                  disabled={
                    busy ||
                    !report.canEdit ||
                    trainerDraftMatches(draft, report)
                  }
                  onClick={() =>
                    void applyWorkingEdit(
                      async () => validateTrainer(draft, report),
                      "trainer",
                    )
                  }
                >
                  {words.applyTrainer}
                </button>
                <button
                  type="button"
                  disabled={busy || !report.canEdit}
                  onClick={() => {
                    setDraft(trainerDraft(report));
                    setError("");
                  }}
                >
                  <RotateCcw size={18} aria-hidden="true" /> {words.reset}
                </button>
              </div>
              <section
                className="save-editor-profile"
                aria-label={t("profile")}
              >
                <h3>{t("profile")}</h3>
                <p className="save-editor-note">{words.link}</p>
                {choices.length === 0 ? (
                  <p>{words.unsupported}</p>
                ) : (
                  <>
                    {choices.length > 1 && <p>{words.ambiguous}</p>}
                    <div className="save-editor-fields">
                      <label className="field">
                        <span>{t("game")}</span>
                        <Select
                          value={version}
                          disabled={busy}
                          onChange={(e) => {
                            setVersion(e.target.value);
                            setTarget("new");
                          }}
                        >
                          <option value="">—</option>
                          {choices.map((game) => (
                            <option key={game} value={game}>
                              {words.games[game as keyof typeof words.games] ??
                                game}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <label className="field">
                        <span>{t("profile")}</span>
                        <Select
                          value={target}
                          disabled={busy || !link || link.loading}
                          onChange={(e) => setTarget(e.target.value)}
                        >
                          <option value="new">{t("newProfile")}</option>
                          {link?.profiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.name}
                            </option>
                          ))}
                        </Select>
                      </label>
                      {target === "new" && (
                        <label className="field">
                          <span>{words.profileName}</span>
                          <input
                            value={profileName}
                            disabled={busy}
                            onChange={(e) => setProfileName(e.target.value)}
                          />
                        </label>
                      )}
                    </div>
                    {target === "new" && (
                      <>
                        <p className="save-editor-note">{words.defaults}</p>
                        <label className="save-editor-review">
                          <input
                            type="checkbox"
                            checked={reviewDefaults}
                            disabled={busy}
                            onChange={(e) =>
                              setReviewDefaults(e.target.checked)
                            }
                          />
                          {words.acknowledge}
                        </label>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={
                        busy ||
                        !link ||
                        link.loading ||
                        (target === "new" &&
                          (!reviewDefaults || !profileName.trim()))
                      }
                      onClick={() =>
                        void perform(async (id) => {
                          await link!.save(target, profileName);
                          if (id === operation.current) setStatus("linked");
                        }, false)
                      }
                    >
                      {words.apply}
                    </button>
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}
      <p className="save-editor-note">
        <a
          href="https://github.com/kwsch/PKHeX"
          target="_blank"
          rel="noreferrer"
        >
          PKHeX
        </a>{" "}
        · GPL-3.0-or-later
      </p>
    </div>
  );
}
