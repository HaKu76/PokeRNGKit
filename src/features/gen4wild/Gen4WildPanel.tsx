import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  getGen4Abilities,
  getGen4AbilityName,
  getGen4BaseStats,
  getGen4Characteristics,
  getGen4SpeciesName,
  type Gen4PersonalVersion,
} from "../gen4ivcalculator/gen4IvData";
import type { Gen4Profile } from "../gen4profiles/domain";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { computeGen3Stats } from "../shared/gen3Stats";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { PerfectIvFilterFields } from "../shared/PerfectIvFilterFields";
import {
  DEFAULT_GEN4_WILD_SETTINGS,
  GEN4_WILD_ENCOUNTERS,
  GEN4_WILD_HIDDEN_POWER_MASK_ALL,
  GEN4_WILD_MAX_RESULTS,
  GEN4_WILD_MAX_TOTAL_STATES,
  GEN4_WILD_NATURE_MASK_ALL,
  gen4WildAreasFor,
  gen4WildMethodFor,
  gen4WildReplacementOptions,
  gen4WildSearcherCombinationCount,
  getGen4WildItemName,
  getGen4WildLocationName,
  validateGen4WildGeneratorRequest,
  validateGen4WildSearcherRequest,
  type Gen4GameProfile,
  type Gen4IvTuple,
  type Gen4WildAbility,
  type Gen4WildDualSlot,
  type Gen4WildEncounter,
  type Gen4WildFilters,
  type Gen4WildGender,
  type Gen4WildGeneratorRequest,
  type Gen4WildLead,
  type Gen4WildRadio,
  type Gen4WildSearcherRequest,
  type Gen4WildSearcherState,
  type Gen4WildSettings,
  type Gen4WildShiny,
  type Gen4WildState,
  type Gen4WildTime,
} from "./domain";
import { Gen4WildSearcherUiPreviewEngine } from "./preview/Gen4WildSearcherUiPreviewEngine";
import { Gen4WildUiPreviewEngine } from "./preview/Gen4WildUiPreviewEngine";
import "./Gen4WildPanel.css";
import {
  Gen4WildSearcherWorkerPool,
  Gen4WildWorkerPool,
  type Gen4WildEngine,
  type Gen4WildProgress,
  type Gen4WildSearcherEngine,
  type Gen4WildSummary,
} from "./worker/Gen4WildWorkerPool";

type Operation = "generator" | "searcher";
type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type Result = Gen4WildState | Gen4WildSearcherState;
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type SortKey =
  | "seed"
  | "advances"
  | "battleAdvances"
  | "call"
  | "chatot"
  | "item"
  | "slot"
  | "level"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | IvKey
  | "hiddenPower"
  | "hiddenPowerStrength"
  | "gender"
  | "characteristic";
type IvTextValues = [string, string, string, string, string, string];

interface IvRanges {
  min: IvTextValues;
  max: IvTextValues;
}

interface Column {
  key: SortKey;
  label: string;
}

interface Gen4WildPanelProps {
  profile: Gen4Profile;
  onOpenIvCalculator(): void;
  uiPreviewMode: boolean;
}

const natureKeys = [
  "natureHardy",
  "natureLonely",
  "natureBrave",
  "natureAdamant",
  "natureNaughty",
  "natureBold",
  "natureDocile",
  "natureRelaxed",
  "natureImpish",
  "natureLax",
  "natureTimid",
  "natureHasty",
  "natureSerious",
  "natureJolly",
  "natureNaive",
  "natureModest",
  "natureMild",
  "natureQuiet",
  "natureBashful",
  "natureRash",
  "natureCalm",
  "natureGentle",
  "natureSassy",
  "natureCareful",
  "natureQuirky",
] as const;
const powerKeys = [
  "powerFighting",
  "powerFlying",
  "powerPoison",
  "powerGround",
  "powerRock",
  "powerBug",
  "powerGhost",
  "powerSteel",
  "powerFire",
  "powerWater",
  "powerGrass",
  "powerElectric",
  "powerPsychic",
  "powerIce",
  "powerDragon",
  "powerDark",
] as const;
const ivKeys: IvKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];
const encounterKeys: Record<Gen4WildEncounter, string> = {
  grass: "wildGrass",
  surfing: "wildSurfing",
  "rock-smash": "wildRockSmash",
  "old-rod": "wildOldRod",
  "good-rod": "wildGoodRod",
  "super-rod": "wildSuperRod",
  "honey-tree": "gen4WildHoneyTree",
  "bug-catching-contest": "gen4WildBugContest",
  headbutt: "gen4WildHeadbutt",
  "headbutt-alt": "gen4WildHeadbuttAlt",
  "headbutt-special": "gen4WildHeadbuttSpecial",
};
const gameKeys: Record<Gen4Profile["version"], string> = {
  diamond: "gameDiamond",
  pearl: "gamePearl",
  platinum: "gamePlatinum",
  heartgold: "gameHeartGold",
  soulsilver: "gameSoulSilver",
};
const commonColumns: Column[] = [
  { key: "item", label: "gen4WildItem" },
  { key: "slot", label: "wildResultSlot" },
  { key: "level", label: "level" },
  { key: "pid", label: "rowPid" },
  { key: "shiny", label: "shiny" },
  { key: "nature", label: "nature" },
  { key: "ability", label: "ability" },
  { key: "hp", label: "ivHp" },
  { key: "attack", label: "ivAttack" },
  { key: "defense", label: "ivDefense" },
  { key: "specialAttack", label: "ivSpecialAttack" },
  { key: "specialDefense", label: "ivSpecialDefense" },
  { key: "speed", label: "ivSpeed" },
  { key: "hiddenPower", label: "hiddenPowerType" },
  { key: "hiddenPowerStrength", label: "hiddenPowerStrength" },
  { key: "gender", label: "gender" },
  { key: "characteristic", label: "characteristic" },
];

function wildColumns(operation: Operation, hgss: boolean) {
  if (operation === "searcher") {
    return [
      { key: "seed", label: "seed" },
      { key: "advances", label: "rowAdvance" },
      ...commonColumns,
    ] satisfies Column[];
  }
  const rngColumns: Column[] = [
    { key: "advances", label: "rowAdvance" },
    { key: "battleAdvances", label: "gen4WildBattleAdvances" },
  ];
  if (hgss) rngColumns.push({ key: "call", label: "call" });
  rngColumns.push({ key: "chatot", label: "chatot" });
  return [...rngColumns, ...commonColumns];
}

function parseDecimal(value: string) {
  const normalized = value.trim();
  return /^\d+$/.test(normalized)
    ? Number.parseInt(normalized, 10)
    : Number.NaN;
}

function parseHex(value: string) {
  const normalized = value.trim().replace(/^0x/i, "");
  if (normalized === "") return 0;
  return /^[0-9a-f]{1,8}$/i.test(normalized)
    ? Number.parseInt(normalized, 16)
    : Number.NaN;
}

function formatHex(value: number) {
  return value.toString(16).toUpperCase().padStart(8, "0");
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function ivLabelKey(key: IvKey) {
  return `iv${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function characteristic(state: Result) {
  const order = [0, 1, 2, 5, 3, 4];
  const start = state.pid % 6;
  let selected = start;
  let maximum = 0;
  for (let offset = 0; offset < 6; offset++) {
    const index = (start + offset) % 6;
    if (state.ivs[order[index]] > maximum) {
      selected = index;
      maximum = state.ivs[order[index]];
    }
  }
  return selected * 5 + (maximum % 5);
}

function chatot(value: number) {
  const pitch =
    value < 20
      ? "L"
      : value < 40
        ? "ML"
        : value < 60
          ? "M"
          : value < 80
            ? "MH"
            : "H";
  return `${pitch} ${value}`;
}

function isHgss(version: Gen4Profile["version"]) {
  return version === "heartgold" || version === "soulsilver";
}

function isFishing(encounter: Gen4WildEncounter) {
  return (
    encounter === "old-rod" ||
    encounter === "good-rod" ||
    encounter === "super-rod"
  );
}

function singleSlot(mask: number) {
  return mask > 0 && (mask & (mask - 1)) === 0
    ? Math.trunc(Math.log2(mask))
    : 0;
}

export function Gen4WildPanel({
  onOpenIvCalculator,
  profile,
  uiPreviewMode,
}: Gen4WildPanelProps) {
  const { t, i18n } = useTranslation();
  const generator = useMemo<Gen4WildEngine>(
    () =>
      uiPreviewMode ? new Gen4WildUiPreviewEngine() : new Gen4WildWorkerPool(),
    [uiPreviewMode],
  );
  const searcher = useMemo<Gen4WildSearcherEngine>(
    () =>
      uiPreviewMode
        ? new Gen4WildSearcherUiPreviewEngine()
        : new Gen4WildSearcherWorkerPool(),
    [uiPreviewMode],
  );
  const tableRef = useRef<HTMLDivElement>(null);
  const [operation, setOperation] = useState<Operation>("generator");
  const [encounter, setEncounter] = useState<Gen4WildEncounter>("grass");
  const [locationIndex, setLocationIndex] = useState(0);
  const [locationInput, setLocationInput] = useState({
    index: 0,
    language: i18n.language,
    text: "",
  });
  const [selectedSpecies, setSelectedSpecies] = useState(0);
  const [settings, setSettings] = useState<Gen4WildSettings>({
    ...DEFAULT_GEN4_WILD_SETTINGS,
  });
  const [lead, setLead] = useState<Gen4WildLead>("none");
  const [synchronizeNature, setSynchronizeNature] = useState(0);
  const [happiness, setHappiness] = useState("0");
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("");
  const [minDelay, setMinDelay] = useState("600");
  const [maxDelay, setMaxDelay] = useState("2000");
  const [minAdvance, setMinAdvance] = useState("1");
  const [maxAdvance, setMaxAdvance] = useState("1000");
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen4WildShiny>("any");
  const [gender, setGender] = useState<Gen4WildGender>("any");
  const [ability, setAbility] = useState<Gen4WildAbility>("any");
  const [natureMask, setNatureMask] = useState(0);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0);
  const [encounterSlotMask, setEncounterSlotMask] = useState(0);
  const [levelMin, setLevelMin] = useState("1");
  const [levelMax, setLevelMax] = useState("100");
  const [ivRanges, setIvRanges] = useState<Record<Operation, IvRanges>>({
    generator: {
      min: ["0", "0", "0", "0", "0", "0"],
      max: ["31", "31", "31", "31", "31", "31"],
    },
    searcher: {
      min: ["0", "0", "0", "0", "0", "0"],
      max: ["31", "31", "31", "31", "31", "31"],
    },
  });
  const [perfectIvValue, setPerfectIvValue] = useState("31");
  const [perfectIvCount, setPerfectIvCount] = useState("0");
  const [showStats, setShowStats] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState<Gen4WildProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen4WildSummary>();
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "advances", direction: "asc" });

  const hgss = isHgss(profile.version);
  const gameProfile = useMemo<Gen4GameProfile>(
    () => ({
      version: profile.version,
      tid: profile.tid,
      sid: profile.sid,
      nationalDex: profile.nationalDex,
      unownDiscovered: profile.unownDiscovered,
      unownPuzzles: profile.unownPuzzles,
    }),
    [profile],
  );
  const encounters = useMemo(
    () =>
      GEN4_WILD_ENCOUNTERS.filter(
        (entry) =>
          gen4WildAreasFor(gameProfile, entry, DEFAULT_GEN4_WILD_SETTINGS)
            .length > 0,
      ),
    [gameProfile],
  );
  const activeEncounter: Gen4WildEncounter = encounters.includes(encounter)
    ? encounter
    : (encounters[0] ?? "grass");
  const areas = useMemo(
    () => gen4WildAreasFor(gameProfile, activeEncounter, settings),
    [activeEncounter, gameProfile, settings],
  );
  const area = areas[locationIndex] ?? areas[0];
  const method = gen4WildMethodFor(gameProfile, activeEncounter, settings);
  const fullEncounterSlotMask = area ? (1 << area.slots.length) - 1 : 0;
  const activeIvRanges = ivRanges[operation];
  const locationOptions = useMemo(
    () =>
      areas.map((entry, index) => ({
        label: getGen4WildLocationName(i18n.language, entry),
        value: index,
      })),
    [areas, i18n.language],
  );
  const displayedLocation =
    locationInput.language === i18n.language &&
    locationInput.index === locationIndex
      ? locationInput.text
      : (locationOptions[locationIndex]?.label ??
        locationOptions[0]?.label ??
        "");
  const speciesOptions = useMemo(() => {
    const unique = new Map<number, { species: number; form: number }>();
    for (const slot of area?.slots ?? []) {
      const value = (slot.form << 11) | slot.species;
      if (!unique.has(value)) {
        unique.set(value, { species: slot.species, form: slot.form });
      }
    }
    return [...unique.entries()].map(([value, entry]) => ({ value, ...entry }));
  }, [area]);
  const selectedSlots = area?.slots.filter(
    (slot) => ((slot.form << 11) | slot.species) === selectedSpecies,
  );
  const selectedLevelRange = selectedSlots?.length
    ? [
        Math.min(...selectedSlots.map((slot) => slot.minLevel)),
        Math.max(...selectedSlots.map((slot) => slot.maxLevel)),
      ]
    : [0, 0];
  const replacementOptions = area
    ? gen4WildReplacementOptions(gameProfile, area.location)
    : [];
  const safari = Boolean(
    area && hgss && area.location >= 148 && area.location <= 160,
  );
  const feebasAvailable = Boolean(
    area &&
    isFishing(activeEncounter) &&
    (area.variants as { feebas?: unknown } | undefined)?.feebas,
  );
  const timeAvailable =
    (!hgss && activeEncounter === "grass") ||
    (hgss &&
      (activeEncounter === "grass" ||
        activeEncounter === "good-rod" ||
        activeEncounter === "super-rod" ||
        safari));
  const happinessAvailable = hgss && isFishing(activeEncounter);
  const radarAvailable = !hgss && activeEncounter === "grass";
  const dualSlotAvailable = !hgss && activeEncounter === "grass";
  const radioAvailable = hgss && activeEncounter === "grass";
  const swarmAvailable =
    (!hgss && activeEncounter === "grass") ||
    (hgss &&
      ["grass", "surfing", "old-rod", "good-rod", "super-rod"].includes(
        activeEncounter,
      ));
  const hideSlotModifiers =
    activeEncounter === "bug-catching-contest" ||
    activeEncounter === "honey-tree" ||
    settings.pokeRadar;
  const hideLevelModifiers =
    activeEncounter === "bug-catching-contest" || settings.pokeRadar;
  const natureOptions = natureKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const hiddenPowerOptions = powerKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const encounterSlotOptions = (area?.slots ?? []).map((_, value) => ({
    label: String(value),
    value,
  }));
  const columns = useMemo(
    () => wildColumns(operation, hgss),
    [hgss, operation],
  );
  const characteristics = getGen4Characteristics(i18n.language);
  const personalVersion = (
    hgss ? "hgss" : profile.version
  ) as Gen4PersonalVersion;

  useEffect(
    () => () => {
      generator.dispose();
      searcher.dispose();
    },
    [generator, searcher],
  );
  useEffect(() => {
    if (encounter !== activeEncounter) setEncounter(activeEncounter);
  }, [activeEncounter, encounter]);
  useEffect(() => {
    setLocationIndex(0);
    setSelectedSpecies(0);
    setEncounterSlotMask(0);
    setLevelMin("1");
    setLevelMax("100");
    setSettings({ ...DEFAULT_GEN4_WILD_SETTINGS });
    setLead("none");
  }, [activeEncounter, profile.version]);
  useEffect(() => {
    if (locationIndex >= areas.length) setLocationIndex(0);
  }, [areas.length, locationIndex]);
  useEffect(() => {
    setSelectedSpecies(0);
    setEncounterSlotMask(0);
    setLevelMin("1");
    setLevelMax("100");
    setSettings((current) => ({ ...current, replacement: [0, 0] }));
  }, [area?.id]);
  useEffect(() => {
    if (
      (hideSlotModifiers && (lead === "magnet-pull" || lead === "static")) ||
      (hideLevelModifiers &&
        (lead === "hustle" ||
          lead === "pressure" ||
          lead === "vital-spirit")) ||
      (!hgss &&
        (lead === "arena-trap" ||
          lead === "illuminate" ||
          lead === "no-guard" ||
          lead === "sticky-hold" ||
          lead === "suction-cups"))
    ) {
      setLead("none");
    }
  }, [hgss, hideLevelModifiers, hideSlotModifiers, lead]);

  const updateSettings = (patch: Partial<Gen4WildSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const clearExclusiveSettings = () => ({
    dualSlot: "none" as Gen4WildDualSlot,
    pokeRadar: false,
    pokeRadarShiny: false,
    radio: "none" as Gen4WildRadio,
    swarm: false,
    replacement: [0, 0] as const,
  });

  const setExclusive = (patch: Partial<Gen4WildSettings>) => {
    setSettings((current) => ({
      ...current,
      ...clearExclusiveSettings(),
      ...patch,
    }));
  };

  const selectSpecies = (value: number) => {
    setSelectedSpecies(value);
    if (!area || value === 0) {
      setEncounterSlotMask(0);
      setLevelMin("1");
      setLevelMax("100");
      return;
    }
    let mask = 0;
    let minimum = 100;
    let maximum = 0;
    area.slots.forEach((slot, index) => {
      if (((slot.form << 11) | slot.species) !== value) return;
      mask |= 1 << index;
      minimum = Math.min(minimum, slot.minLevel);
      maximum = Math.max(maximum, slot.maxLevel);
    });
    setEncounterSlotMask(mask);
    setLevelMin(String(minimum));
    setLevelMax(String(maximum));
  };

  const updateIv = (kind: "min" | "max", index: number, value: string) => {
    setIvRanges((current) => ({
      ...current,
      [operation]: {
        ...current[operation],
        [kind]: current[operation][kind].map((entry, entryIndex) =>
          entryIndex === index ? value : entry,
        ) as IvTextValues,
      },
    }));
  };

  const applyIvShortcut = (index: number, event: MouseEvent) => {
    const range: [string, string] = event.ctrlKey
      ? event.altKey
        ? ["0", "0"]
        : ["31", "31"]
      : event.altKey
        ? ["30", "31"]
        : ["0", "31"];
    setIvRanges((current) => {
      const min = [...current[operation].min] as IvTextValues;
      const max = [...current[operation].max] as IvTextValues;
      min[index] = range[0];
      max[index] = range[1];
      return { ...current, [operation]: { min, max } };
    });
  };

  const readFilters = (disabled = false): Gen4WildFilters =>
    disabled
      ? {
          shiny: "any",
          gender: "any",
          ability: "any",
          natureMask: GEN4_WILD_NATURE_MASK_ALL,
          hiddenPowerMask: GEN4_WILD_HIDDEN_POWER_MASK_ALL,
          encounterSlotMask:
            method === "honeyTree" || method === "pokeRadar"
              ? encounterSlotMask || fullEncounterSlotMask
              : fullEncounterSlotMask,
          levelMin: 1,
          levelMax: 100,
          ivMin: [0, 0, 0, 0, 0, 0],
          ivMax: [31, 31, 31, 31, 31, 31],
          perfectIvValue: 31,
          perfectIvCount: 0,
        }
      : {
          shiny,
          gender,
          ability,
          natureMask: natureMask || GEN4_WILD_NATURE_MASK_ALL,
          hiddenPowerMask: hiddenPowerMask || GEN4_WILD_HIDDEN_POWER_MASK_ALL,
          encounterSlotMask: encounterSlotMask || fullEncounterSlotMask,
          levelMin: parseDecimal(levelMin),
          levelMax: parseDecimal(levelMax),
          ivMin: activeIvRanges.min.map(parseDecimal) as Gen4IvTuple,
          ivMax: activeIvRanges.max.map(parseDecimal) as Gen4IvTuple,
          perfectIvValue: parseDecimal(perfectIvValue),
          perfectIvCount: parseDecimal(perfectIvCount),
        };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (!area || status === "calculating") return;
    const filters = readFilters(operation === "generator" && filtersDisabled);
    const common = {
      method,
      lead,
      synchronizeNature,
      feebasTile: settings.feebasTile,
      pokeRadarShiny: settings.pokeRadarShiny,
      unownRadio: settings.radio === "mysterious",
      happiness: parseDecimal(happiness),
      fixedSlot: singleSlot(filters.encounterSlotMask),
      profile: gameProfile,
      area,
      filters,
    };
    const request =
      operation === "generator"
        ? ({
            ...common,
            seed: parseHex(seed),
            initialAdvances: parseDecimal(initialAdvances),
            maxAdvances: parseDecimal(maxAdvances),
            offset: parseDecimal(offset || "0"),
          } satisfies Gen4WildGeneratorRequest)
        : ({
            ...common,
            minAdvance: parseDecimal(minAdvance),
            maxAdvance: parseDecimal(maxAdvance),
            minDelay: parseDecimal(minDelay),
            maxDelay: parseDecimal(maxDelay),
          } satisfies Gen4WildSearcherRequest);
    const validationErrors =
      operation === "generator"
        ? validateGen4WildGeneratorRequest(request as Gen4WildGeneratorRequest)
        : validateGen4WildSearcherRequest(request as Gen4WildSearcherRequest);
    if (validationErrors.length > 0) {
      const count =
        operation === "searcher"
          ? gen4WildSearcherCombinationCount(request as Gen4WildSearcherRequest)
          : 0;
      setError(
        validationErrors.includes("searchRange")
          ? t("gen4WildSearchRangeTooLarge", {
              count: String(count),
              limit: String(GEN4_WILD_MAX_TOTAL_STATES),
            })
          : validationErrors.includes("fixedSlot")
            ? t(
                method === "pokeRadar"
                  ? "gen4WildPokeRadarSingleSlot"
                  : "gen4WildHoneyTreeSingleSlot",
              )
            : validationErrors.includes("flawlessIv")
              ? t("gen4WildFlawlessIvRequired")
              : t("invalidGen4WildInput"),
      );
      setStatus("failed");
      return;
    }
    setResults([]);
    setError("");
    setSummary(undefined);
    setStatus("calculating");
    setProgress({
      processedStates: 0,
      totalStates:
        operation === "generator"
          ? (request as Gen4WildGeneratorRequest).maxAdvances + 1
          : gen4WildSearcherCombinationCount(
              request as Gen4WildSearcherRequest,
            ),
      resultCount: 0,
      percent: 0,
    });
    try {
      const done =
        operation === "generator"
          ? await generator.search(request as Gen4WildGeneratorRequest, {
              maxResults: GEN4_WILD_MAX_RESULTS,
              onBatch: (states) =>
                setResults((current) => current.concat(states)),
              onProgress: setProgress,
            })
          : await searcher.search(request as Gen4WildSearcherRequest, {
              maxResults: GEN4_WILD_MAX_RESULTS,
              onBatch: (states) =>
                setResults((current) => current.concat(states)),
              onProgress: setProgress,
            });
      setSummary(done);
      setStatus(done.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(
        /initial|module|fetch|wasm/i.test(message)
          ? t("gen4WildWasmMissing")
          : message,
      );
      setStatus("failed");
    }
  };

  const stateValue = (state: Result, key: SortKey): number => {
    const ivIndex = {
      hp: 0,
      attack: 1,
      defense: 2,
      specialAttack: 3,
      specialDefense: 4,
      speed: 5,
    }[key as IvKey];
    if (ivIndex !== undefined) {
      if (!showStats) return state.ivs[ivIndex];
      const stats = getGen4BaseStats(
        personalVersion,
        state.species,
        state.form,
      );
      return computeGen3Stats(stats, state.ivs, state.nature, state.level)[
        ivIndex
      ];
    }
    switch (key) {
      case "seed":
        return "seed" in state ? state.seed : 0;
      case "slot":
        return state.encounterSlot;
      case "characteristic":
        return characteristic(state);
      case "advances":
      case "battleAdvances":
      case "call":
      case "chatot":
      case "item":
      case "level":
      case "pid":
      case "shiny":
      case "nature":
      case "ability":
      case "hiddenPower":
      case "hiddenPowerStrength":
      case "gender":
        return state[key];
      default:
        return 0;
    }
  };

  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        (stateValue(left, sort.key) - stateValue(right, sort.key)) * multiplier,
    );
    // Displaying calculated stats changes six sortable column values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalVersion, results, showStats, sort]);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const displayStateValue = (state: Result, key: SortKey) => {
    const ivIndex = ivKeys.indexOf(key as IvKey);
    if (ivIndex >= 0) return String(stateValue(state, key));
    if (key === "seed") return "seed" in state ? formatHex(state.seed) : "-";
    if (key === "pid") return formatHex(state.pid);
    if (key === "slot") {
      return `${state.encounterSlot}: ${getGen4SpeciesName(
        i18n.language,
        state.species,
        state.form,
      )}`;
    }
    if (key === "item") return getGen4WildItemName(i18n.language, state.item);
    if (key === "shiny") {
      return t(
        state.shiny === 2
          ? "shinySquare"
          : state.shiny === 1
            ? "shinyStar"
            : "shinyNone",
      );
    }
    if (key === "nature") return t(natureKeys[state.nature]);
    if (key === "ability") {
      const abilities = getGen4Abilities(
        personalVersion,
        state.species,
        state.form,
      );
      const abilityId = abilities[state.ability] ?? abilities[0];
      return `${state.ability}: ${getGen4AbilityName(i18n.language, abilityId)}`;
    }
    if (key === "hiddenPower") return t(powerKeys[state.hiddenPower]);
    if (key === "hiddenPowerStrength") return String(state.hiddenPowerStrength);
    if (key === "gender") {
      return t(
        state.gender === 0
          ? "male"
          : state.gender === 1
            ? "female"
            : "genderless",
      );
    }
    if (key === "characteristic") {
      return characteristics[characteristic(state)] ?? "-";
    }
    if (key === "call") return ["E", "K", "P"][state.call] ?? "-";
    if (key === "chatot") return chatot(state.chatot);
    return String(stateValue(state, key));
  };

  const resetRunState = (nextOperation: Operation) => {
    setOperation(nextOperation);
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
    setStatus("ready");
    setError("");
    setSort({
      key: nextOperation === "generator" ? "advances" : "seed",
      direction: "asc",
    });
  };

  const clearResults = () => {
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
    setStatus("ready");
  };

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      columns.map((column) => t(column.label)),
      ...sortedResults.map((state) =>
        columns.map((column) => displayStateValue(state, column.key)),
      ),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen4wild-${operation}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const statusLabel = t(status);
  const leadValue =
    lead === "synchronize" && operation === "generator"
      ? `synchronize-${synchronizeNature}`
      : lead;
  const operationTabs = (
    <div
      aria-label={t("gen4WildEngine")}
      className="operation-tabs"
      role="tablist"
    >
      {(["generator", "searcher"] as Operation[]).map((entry) => (
        <button
          aria-selected={operation === entry}
          className={operation === entry ? "active" : ""}
          disabled={status === "calculating"}
          key={entry}
          onClick={() => {
            if (operation !== entry) resetRunState(entry);
          }}
          role="tab"
          type="button"
        >
          {t(entry)}
        </button>
      ))}
    </div>
  );
  const operationTabsTarget =
    typeof document === "undefined"
      ? null
      : document.getElementById("gen4-wild-operation-tabs");

  return (
    <>
      {operationTabsTarget
        ? createPortal(operationTabs, operationTabsTarget)
        : operationTabs}

      <form
        className="static-control-grid gen4wild-control-grid"
        onSubmit={run}
      >
        <section className="panel static-panel static-rng-panel gen4wild-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
          </div>
          <div className="static-form-stack">
            <div className="static-encounter-meta compact">
              <div>
                <span>{t("method")}</span>
                <strong>{t(method)}</strong>
              </div>
            </div>
            <label className="field">
              <span>{t("wildLead")}</span>
              <Select
                onChange={(event) => {
                  const value = event.target.value;
                  if (value.startsWith("synchronize-")) {
                    setLead("synchronize");
                    setSynchronizeNature(Number(value.slice(12)));
                  } else {
                    setLead(value as Gen4WildLead);
                  }
                }}
                value={leadValue}
              >
                <option value="none">{t("wildNone")}</option>
                <option value="compound-eyes">
                  {t("gen4WildCompoundEyes")}
                </option>
                <optgroup label={t("wildCuteCharm")}>
                  <option value="cute-charm-m">{t("wildMaleLead")}</option>
                  <option value="cute-charm-f">{t("wildFemaleLead")}</option>
                </optgroup>
                {hgss && (
                  <optgroup label={t("gen4WildEncounterModifier")}>
                    <option value="arena-trap">{t("gen4WildArenaTrap")}</option>
                    <option value="illuminate">
                      {t("gen4WildIlluminate")}
                    </option>
                    <option value="no-guard">{t("gen4WildNoGuard")}</option>
                    <option value="sticky-hold">
                      {t("gen4WildStickyHold")}
                    </option>
                    <option value="suction-cups">
                      {t("gen4WildSuctionCups")}
                    </option>
                  </optgroup>
                )}
                {!hideLevelModifiers && (
                  <optgroup label={t("wildLevelModifier")}>
                    <option value="hustle">{t("wildHustle")}</option>
                    <option value="pressure">{t("wildPressure")}</option>
                    <option value="vital-spirit">{t("wildVitalSpirit")}</option>
                  </optgroup>
                )}
                {!hideSlotModifiers && (
                  <optgroup label={t("wildSlotModifier")}>
                    <option value="magnet-pull">{t("wildMagnetPull")}</option>
                    <option value="static">{t("wildStatic")}</option>
                  </optgroup>
                )}
                {operation === "generator" ? (
                  <optgroup label={t("wildSynchronize")}>
                    {natureKeys.map((key, index) => (
                      <option key={key} value={`synchronize-${index}`}>
                        {t(key)}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option value="synchronize">{t("wildSynchronize")}</option>
                )}
              </Select>
            </label>
            {operation === "generator" ? (
              <>
                <label className="field">
                  <span>{t("seed")}</span>
                  <input
                    maxLength={8}
                    onChange={(event) =>
                      setSeed(normalizeHexInput(event.target.value, 8))
                    }
                    value={seed}
                  />
                </label>
                <div className="compact-field-row">
                  <label className="field">
                    <span>{t("initialAdvances")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) =>
                        setInitialAdvances(
                          normalizeDecimalInput(
                            event.target.value,
                            0xffff_ffff,
                            10,
                          ),
                        )
                      }
                      value={initialAdvances}
                    />
                  </label>
                  <label className="field">
                    <span>{t("maxAdvances")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) =>
                        setMaxAdvances(
                          normalizeDecimalInput(
                            event.target.value,
                            GEN4_WILD_MAX_TOTAL_STATES - 1,
                            10,
                          ),
                        )
                      }
                      value={maxAdvances}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>{t("offset")}</span>
                  <input
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(event) =>
                      setOffset(
                        normalizeDecimalInput(
                          event.target.value,
                          0xffff_ffff,
                          10,
                        ),
                      )
                    }
                    value={offset}
                  />
                </label>
              </>
            ) : (
              <>
                <div className="compact-field-row">
                  <label className="field">
                    <span>{t("minDelay")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={5}
                      onChange={(event) =>
                        setMinDelay(
                          normalizeDecimalInput(event.target.value, 0xffff, 5),
                        )
                      }
                      value={minDelay}
                    />
                  </label>
                  <label className="field">
                    <span>{t("maxDelay")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={5}
                      onChange={(event) =>
                        setMaxDelay(
                          normalizeDecimalInput(event.target.value, 0xffff, 5),
                        )
                      }
                      value={maxDelay}
                    />
                  </label>
                </div>
                <div className="compact-field-row">
                  <label className="field">
                    <span>{t("minAdvance")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) =>
                        setMinAdvance(
                          normalizeDecimalInput(
                            event.target.value,
                            0xffff_ffff,
                            10,
                          ),
                        )
                      }
                      value={minAdvance}
                    />
                  </label>
                  <label className="field">
                    <span>{t("maxAdvance")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) =>
                        setMaxAdvance(
                          normalizeDecimalInput(
                            event.target.value,
                            0xffff_ffff,
                            10,
                          ),
                        )
                      }
                      value={maxAdvance}
                    />
                  </label>
                </div>
              </>
            )}
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {t(operation === "generator" ? "generate" : "search")}
            </button>
            {status === "calculating" && (
              <button
                className="secondary-action"
                onClick={() =>
                  operation === "generator"
                    ? generator.cancel()
                    : searcher.cancel()
                }
                type="button"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </section>

        <section className="panel static-panel static-settings-panel gen4wild-settings-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("settings")}</h2>
            </div>
            <span className="panel-note">
              {profile.name} / {t(gameKeys[profile.version])}
            </span>
          </div>
          <div className="static-form-stack gen4wild-settings-stack">
            <label className="field">
              <span>{t("wildEncounterType")}</span>
              <Select
                onChange={(event) =>
                  setEncounter(event.target.value as Gen4WildEncounter)
                }
                value={activeEncounter}
              >
                {encounters.map((entry) => (
                  <option key={entry} value={entry}>
                    {t(encounterKeys[entry])}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{t("wildLocation")}</span>
              <AutoCompleteComboBox
                inputValue={displayedLocation}
                label={t("wildLocation")}
                onInputChange={(text) =>
                  setLocationInput({
                    index: locationIndex,
                    language: i18n.language,
                    text,
                  })
                }
                onValueChange={setLocationIndex}
                options={locationOptions}
                value={locationIndex}
              />
            </label>
            <label className="field">
              <span>{t("wildPokemon")}</span>
              <Select
                onChange={(event) => selectSpecies(Number(event.target.value))}
                value={selectedSpecies}
              >
                <option value={0}>-</option>
                {speciesOptions.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {getGen4SpeciesName(
                      i18n.language,
                      entry.species,
                      entry.form,
                    )}
                  </option>
                ))}
              </Select>
            </label>
            {timeAvailable && (
              <label className="field">
                <span>{t("gen4WildTime")}</span>
                <Select
                  onChange={(event) =>
                    updateSettings({ time: event.target.value as Gen4WildTime })
                  }
                  value={settings.time}
                >
                  <option value="morning">{t("gen4WildMorning")}</option>
                  <option value="day">{t("gen4WildDay")}</option>
                  <option value="night">{t("gen4WildNight")}</option>
                </Select>
              </label>
            )}
            {happinessAvailable && (
              <label className="field">
                <span>{t("gen4WildHappiness")}</span>
                <Select
                  onChange={(event) => setHappiness(event.target.value)}
                  value={happiness}
                >
                  {[0, 20, 30, 40, 50].map((value) => (
                    <option key={value} value={value}>
                      +{value}%
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {dualSlotAvailable && (
              <label className="field gen4wild-option-field">
                <span>{t("gen4WildDualSlot")}</span>
                <Select
                  onChange={(event) => {
                    const value = event.target.value as Gen4WildDualSlot;
                    if (value === "none") {
                      updateSettings({ dualSlot: "none" });
                    } else {
                      setExclusive({ dualSlot: value });
                    }
                  }}
                  value={settings.dualSlot}
                >
                  <option value="none">{t("wildNone")}</option>
                  <option value="ruby">{t("gameRuby")}</option>
                  <option value="sapphire">{t("gameSapphire")}</option>
                  <option value="firered">{t("gameFireRed")}</option>
                  <option value="leafgreen">{t("gameLeafGreen")}</option>
                  <option value="emerald">{t("gameEmerald")}</option>
                </Select>
              </label>
            )}
            {radarAvailable && (
              <>
                <label className="checkbox-field">
                  <input
                    checked={settings.pokeRadar}
                    onChange={(event) =>
                      event.target.checked
                        ? setExclusive({ pokeRadar: true })
                        : updateSettings({
                            pokeRadar: false,
                            pokeRadarShiny: false,
                          })
                    }
                    type="checkbox"
                  />
                  <span>{t("gen4WildPokeRadar")}</span>
                </label>
                {settings.pokeRadar && (
                  <label className="checkbox-field gen4wild-sub-option">
                    <input
                      checked={settings.pokeRadarShiny}
                      onChange={(event) =>
                        updateSettings({
                          pokeRadarShiny: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    <span>{t("gen4WildPokeRadarShiny")}</span>
                  </label>
                )}
              </>
            )}
            {radioAvailable && (
              <label className="field gen4wild-option-field">
                <span>{t("gen4WildRadio")}</span>
                <Select
                  onChange={(event) => {
                    const value = event.target.value as Gen4WildRadio;
                    if (value === "none") updateSettings({ radio: "none" });
                    else setExclusive({ radio: value });
                  }}
                  value={settings.radio}
                >
                  <option value="none">{t("wildNone")}</option>
                  <option value="hoenn">{t("gen4WildHoennSound")}</option>
                  <option value="sinnoh">{t("gen4WildSinnohSound")}</option>
                  <option value="mysterious">
                    {t("gen4WildMysteriousTransmission")}
                  </option>
                </Select>
              </label>
            )}
            {swarmAvailable && (
              <label className="checkbox-field">
                <input
                  checked={settings.swarm}
                  onChange={(event) =>
                    event.target.checked
                      ? setExclusive({ swarm: true })
                      : updateSettings({ swarm: false })
                  }
                  type="checkbox"
                />
                <span>{t("gen4WildSwarm")}</span>
              </label>
            )}
            {replacementOptions.length > 0 && (
              <div className="gen4wild-replacement-row">
                <label className="checkbox-field">
                  <input
                    checked={settings.replacement[0] !== 0}
                    onChange={(event) =>
                      event.target.checked
                        ? setExclusive({
                            replacement: [
                              replacementOptions[0] ?? 0,
                              replacementOptions[1] ??
                                replacementOptions[0] ??
                                0,
                            ],
                          })
                        : updateSettings({ replacement: [0, 0] })
                    }
                    type="checkbox"
                  />
                  <span>{t("gen4WildReplacement")}</span>
                </label>
                {settings.replacement[0] !== 0 && (
                  <div className="compact-field-row">
                    {[0, 1].map((index) =>
                      index === 1 && area?.location !== 117 ? null : (
                        <label className="field" key={index}>
                          <span className="visually-hidden">
                            {t("gen4WildReplacement")} {index + 1}
                          </span>
                          <Select
                            aria-label={`${t("gen4WildReplacement")} ${index + 1}`}
                            onChange={(event) => {
                              const replacement = [...settings.replacement] as [
                                number,
                                number,
                              ];
                              replacement[index] = Number(event.target.value);
                              updateSettings({ replacement });
                            }}
                            value={settings.replacement[index]}
                          >
                            {replacementOptions.map((species) => (
                              <option key={species} value={species}>
                                {getGen4SpeciesName(i18n.language, species, 0)}
                              </option>
                            ))}
                          </Select>
                        </label>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}
            {safari && (
              <div className="gen4wild-block-grid">
                {[
                  "gen4WildPlainsBlock",
                  "gen4WildForestBlock",
                  "gen4WildPeakBlock",
                  "gen4WildWaterBlock",
                ].map((key, index) => (
                  <label className="field" key={key}>
                    <span>{t(key)}</span>
                    <input
                      inputMode="numeric"
                      max="99"
                      min="0"
                      onChange={(event) => {
                        const blocks = [...settings.safariBlocks] as [
                          number,
                          number,
                          number,
                          number,
                        ];
                        blocks[index] = Number(event.target.value);
                        updateSettings({ safariBlocks: blocks });
                      }}
                      type="number"
                      value={settings.safariBlocks[index]}
                    />
                  </label>
                ))}
              </div>
            )}
            {feebasAvailable && (
              <label className="checkbox-field">
                <input
                  checked={settings.feebasTile}
                  onChange={(event) =>
                    updateSettings({ feebasTile: event.target.checked })
                  }
                  type="checkbox"
                />
                <span>{t("wildFeebasTile")}</span>
              </label>
            )}
            <div className="wild-level-display">
              <span>{t("level")}</span>
              <input disabled value={selectedLevelRange[0]} />
              <input disabled value={selectedLevelRange[1]} />
            </div>
          </div>
        </section>

        <section className="panel static-panel static-filter-panel gen4wild-filter-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">03</span>
              <h2>{t("filters")}</h2>
            </div>
          </div>
          <fieldset
            className="filter-controls"
            disabled={operation === "generator" && filtersDisabled}
          >
            <div className="gen4wild-filter-selects">
              <label className="field">
                <span>{t("ability")}</span>
                <Select
                  onChange={(event) =>
                    setAbility(event.target.value as Gen4WildAbility)
                  }
                  value={ability}
                >
                  <option value="any">{t("any")}</option>
                  <option value="first">0</option>
                  <option value="second">1</option>
                </Select>
              </label>
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("wildEncounterSlot")}
                mask={encounterSlotMask}
                onChange={setEncounterSlotMask}
                options={encounterSlotOptions}
                resetHint={t("checkListResetHint")}
              />
              <label className="field">
                <span>{t("gender")}</span>
                <Select
                  onChange={(event) =>
                    setGender(event.target.value as Gen4WildGender)
                  }
                  value={gender}
                >
                  <option value="any">{t("any")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                  <option value="genderless">{t("genderless")}</option>
                </Select>
              </label>
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("hiddenPower")}
                mask={hiddenPowerMask}
                onChange={setHiddenPowerMask}
                options={hiddenPowerOptions}
                resetHint={t("checkListResetHint")}
              />
              <div className="wild-level-filter">
                <span>{t("level")}</span>
                <input
                  aria-label={`${t("level")} ${t("minimum")}`}
                  inputMode="numeric"
                  max="100"
                  min="1"
                  onChange={(event) =>
                    setLevelMin(
                      normalizeDecimalInput(event.target.value, 100, 3),
                    )
                  }
                  type="number"
                  value={levelMin}
                />
                <input
                  aria-label={`${t("level")} ${t("maximum")}`}
                  inputMode="numeric"
                  max="100"
                  min="1"
                  onChange={(event) =>
                    setLevelMax(
                      normalizeDecimalInput(event.target.value, 100, 3),
                    )
                  }
                  type="number"
                  value={levelMax}
                />
              </div>
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("nature")}
                mask={natureMask}
                onChange={setNatureMask}
                options={natureOptions}
                resetHint={t("checkListResetHint")}
              />
              <label className="field">
                <span>{t("shiny")}</span>
                <Select
                  onChange={(event) =>
                    setShiny(event.target.value as Gen4WildShiny)
                  }
                  value={shiny}
                >
                  <option value="any">{t("any")}</option>
                  <option value="notShiny">{t("shinyNone")}</option>
                  <option value="shiny">{t("shinyAny")}</option>
                </Select>
              </label>
            </div>
            <PerfectIvFilterFields
              count={perfectIvCount}
              onCountChange={setPerfectIvCount}
              onValueChange={setPerfectIvValue}
              value={perfectIvValue}
            />
            <div className="iv-filter">
              <div className="iv-filter-header">
                <span>{t("ivs")}</span>
                <span>{t("minimum")}</span>
                <span>{t("maximum")}</span>
              </div>
              {ivKeys.map((key, index) => (
                <div className="iv-filter-row" key={key}>
                  <button
                    className="iv-shortcut"
                    onClick={(event) => applyIvShortcut(index, event)}
                    title={t("ivShortcutHint")}
                    type="button"
                  >
                    {t(ivLabelKey(key))}
                  </button>
                  {(["min", "max"] as const).map((kind) => (
                    <input
                      aria-label={`${t(ivLabelKey(key))} ${t(
                        kind === "min" ? "minimum" : "maximum",
                      )}`}
                      inputMode="numeric"
                      key={kind}
                      max="31"
                      min="0"
                      onChange={(event) =>
                        updateIv(
                          kind,
                          index,
                          normalizeDecimalInput(event.target.value, 31, 2),
                        )
                      }
                      type="number"
                      value={activeIvRanges[kind][index]}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="filter-bottom-row gen4wild-filter-bottom-row">
              <div className="filter-tool-row">
                <label className="toggle-field">
                  <input
                    checked={showStats}
                    onChange={(event) => setShowStats(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("showStats")}</span>
                </label>
                {operation === "generator" && (
                  <label className="toggle-field">
                    <input
                      checked={filtersDisabled}
                      onChange={(event) =>
                        setFiltersDisabled(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>{t("disableFilters")}</span>
                  </label>
                )}
              </div>
              <button
                className="iv-calculator-action"
                onClick={onOpenIvCalculator}
                type="button"
              >
                {t("ivCalculator")}
              </button>
            </div>
          </fieldset>
        </section>
      </form>

      <section className="panel results-panel static-results-panel gen4wild-results-panel">
        <div className="results-heading gen4wild-results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">04</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{statusLabel}</span>
          </div>
          <div className="gen4wild-result-alerts">
            {error && <div className="alert error">{error}</div>}
            {summary?.resultLimitReached && (
              <div className="alert warning">{t("limitReached")}</div>
            )}
          </div>
          <div className="result-actions">
            <span className="result-count">
              {String(results.length)} / {String(progress.totalStates)}
            </span>
            <button
              className="secondary-action"
              disabled={results.length === 0}
              onClick={exportCsv}
              type="button"
            >
              {t("exportCsv")}
            </button>
            <button
              aria-label={t("clear")}
              className="icon-action"
              disabled={results.length === 0}
              onClick={clearResults}
              title={t("clear")}
              type="button"
            >
              &times;
            </button>
          </div>
        </div>
        <div className="metrics-row">
          <span>
            {t("processed")} <strong>{String(progress.processedStates)}</strong>
          </span>
          <span>
            {t("results")} <strong>{String(progress.resultCount)}</strong>
          </span>
          <span>
            {t("workers")} <strong>{summary?.workerCount ?? "-"}</strong>
          </span>
          <span>
            {t("elapsed")}{" "}
            <strong>
              {summary ? `${summary.elapsedMs.toFixed(0)} ms` : "-"}
            </strong>
          </span>
        </div>
        <div className="table-shell static-table-shell" ref={tableRef}>
          {sortedResults.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyGen4Wild")}</span>
            </div>
          ) : (
            <div
              className={`static-virtual-table gen4wild-table ${operation} ${hgss ? "hgss" : "dppt"}`}
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="static-table-header">
                {columns.map((column) => (
                  <button
                    key={column.key}
                    onClick={() =>
                      setSort((current) =>
                        current.key === column.key
                          ? {
                              key: column.key,
                              direction:
                                current.direction === "asc" ? "desc" : "asc",
                            }
                          : { key: column.key, direction: "asc" },
                      )
                    }
                    type="button"
                  >
                    {t(column.label)}
                    {sort.key === column.key
                      ? sort.direction === "asc"
                        ? " \u2191"
                        : " \u2193"
                      : ""}
                  </button>
                ))}
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const state = sortedResults[virtualRow.index];
                return (
                  <div
                    className="static-table-row"
                    key={`${"seed" in state ? state.seed : state.advances}-${state.pid}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 40}px)`,
                    }}
                  >
                    {columns.map((column) => (
                      <span key={column.key}>
                        {displayStateValue(state, column.key)}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
