import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Settings2, Square, Trash2 } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  getGen4AbilityName,
  getIvCharacteristics,
  getIvSpeciesName,
} from "../gen4ivcalculator/gen4IvData";
import {
  DEFAULT_GEN8_BDSP_PROFILE,
  type Gen8Profile,
} from "../gen8profiles/domain";
import type { Gen8ProfilesController } from "../gen8profiles/useGen8Profiles";
import { ENCOUNTER_LOOKUP_LOCATIONS } from "../encounterlookup/data";
import { getGen8UndergroundItemName } from "../gen8underground/data";
import {
  getGen8WildLocations,
  getGen8WildReplacementOptions,
  getGen8WildSlots,
} from "./encounters";
import {
  gen8WildProfile,
  gen8WildTaskCount,
  parseGen8WildDecimal,
  validateGen8WildRequest,
  type Gen8WildAbilityFilter,
  type Gen8WildGenderFilter,
  type Gen8WildIvTuple,
  type Gen8WildRequest,
  type Gen8WildResult,
  type Gen8WildShinyFilter,
} from "./domain";
import { Gen8WildUiPreviewEngine } from "./preview/Gen8WildUiPreviewEngine";
import type {
  Gen8WildEngine,
  Gen8WildProgress,
  Gen8WildSummary,
} from "./search";
import { Gen8WildWorkerPool } from "./worker/Gen8WildWorkerPool";
import "./Gen8WildPanel.css";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type ConfigTab = "settings" | "filters";
type IvText = [string, string, string, string, string, string];
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type SortKey =
  | "advances"
  | "item"
  | "slot"
  | "species"
  | "level"
  | "ec"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | "hiddenPower"
  | IvKey
  | "gender"
  | "height"
  | "weight"
  | "characteristic";

interface Column {
  key: SortKey;
  labelKey?: string;
  label: string;
}

const NATURE_KEYS = [
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
const POWER_KEYS = [
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
const IV_KEYS: readonly IvKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];
const IV_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const LEAD_VALUES: Record<string, number> = {
  none: 255,
  cuteCharmFemale: 25,
  cuteCharmMale: 26,
  magnetPull: 27,
  static: 28,
  harvest: 29,
  flashFire: 30,
  stormDrain: 31,
  pressure: 32,
  compoundEyes: 34,
  hustle: 32,
  vitalSpirit: 32,
  superLuck: 34,
};
const COLUMNS: readonly Column[] = [
  { key: "advances", labelKey: "gen8WildAdvances", label: "Advances" },
  { key: "item", labelKey: "gen8WildItem", label: "Item" },
  { key: "slot", labelKey: "gen8WildSlot", label: "Slot" },
  { key: "species", labelKey: "gen8WildPokemon", label: "Pokémon" },
  { key: "level", labelKey: "gen8WildLevel", label: "Level" },
  { key: "ec", label: "EC" },
  { key: "pid", label: "PID" },
  { key: "shiny", labelKey: "gen8WildShiny", label: "Shiny" },
  { key: "nature", labelKey: "gen8WildNature", label: "Nature" },
  { key: "ability", labelKey: "gen8WildAbility", label: "Ability" },
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "specialAttack", label: "SpA" },
  { key: "specialDefense", label: "SpD" },
  { key: "speed", label: "Spe" },
  { key: "hiddenPower", labelKey: "gen8WildHiddenPower", label: "Hidden" },
  { key: "gender", labelKey: "gen8WildGender", label: "Gender" },
  { key: "height", labelKey: "gen8WildHeight", label: "Height" },
  { key: "weight", labelKey: "gen8WildWeight", label: "Weight" },
  {
    key: "characteristic",
    labelKey: "gen8WildCharacteristic",
    label: "Characteristic",
  },
];

export interface Gen8WildPanelProps {
  onOpenProfileManager(): void;
  profiles: Gen8ProfilesController;
  uiPreviewMode: boolean;
}

function gameLabel(profile: Gen8Profile, language: string) {
  if (language.startsWith("zh"))
    return profile.version === "shiningpearl" ? "明亮珍珠" : "晶灿钻石";
  if (language.startsWith("ja"))
    return profile.version === "shiningpearl"
      ? "シャイニングパール"
      : "ブリリアントダイヤモンド";
  return profile.version === "shiningpearl"
    ? "Shining Pearl"
    : "Brilliant Diamond";
}

function languageKey(language: string) {
  return language.startsWith("zh")
    ? "zh"
    : language.startsWith("ja")
      ? "ja"
      : "en";
}

function locationName(language: string, location: number) {
  return (
    ENCOUNTER_LOOKUP_LOCATIONS.bdsp[languageKey(language)][String(location)] ??
    String(location)
  );
}

function compare(left: number | string, right: number | string) {
  return typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right));
}

function resolveLead(choice: string) {
  if (choice.startsWith("synchronize:"))
    return Number(choice.slice("synchronize:".length));
  return LEAD_VALUES[choice] ?? 255;
}

export function Gen8WildPanel({
  onOpenProfileManager,
  profiles,
  uiPreviewMode,
}: Gen8WildPanelProps) {
  const { i18n, t } = useTranslation();
  const engine = useMemo<Gen8WildEngine>(
    () =>
      uiPreviewMode ? new Gen8WildUiPreviewEngine() : new Gen8WildWorkerPool(),
    [uiPreviewMode],
  );
  const [configTab, setConfigTab] = useState<ConfigTab>("settings");
  const [seed0, setSeed0] = useState("");
  const [seed1, setSeed1] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("");
  const [encounter, setEncounter] =
    useState<Gen8WildRequest["encounter"]>("grass");
  const [location, setLocation] = useState(170);
  const [time, setTime] = useState<0 | 1 | 2>(0);
  const [radar, setRadar] = useState(false);
  const [swarm, setSwarm] = useState(false);
  const [feebasTile, setFeebasTile] = useState(false);
  const [replacement0, setReplacement0] = useState(0);
  const [replacement1, setReplacement1] = useState(0);
  const [leadChoice, setLeadChoice] = useState("none");
  const [honeyIndex, setHoneyIndex] = useState(0);
  const [slotMask, setSlotMask] = useState(0xfff);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen8WildShinyFilter>("any");
  const [gender, setGender] = useState<Gen8WildGenderFilter>("any");
  const [ability, setAbility] = useState<Gen8WildAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(ALL_NATURES);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(ALL_HIDDEN_POWERS);
  const [levelMin, setLevelMin] = useState("1");
  const [levelMax, setLevelMax] = useState("100");
  const [heightMin, setHeightMin] = useState("0");
  const [heightMax, setHeightMax] = useState("255");
  const [weightMin, setWeightMin] = useState("0");
  const [weightMax, setWeightMax] = useState("255");
  const [ivMin, setIvMin] = useState<IvText>(["0", "0", "0", "0", "0", "0"]);
  const [ivMax, setIvMax] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [showStats, setShowStats] = useState(false);
  const [results, setResults] = useState<Gen8WildResult[]>([]);
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Gen8WildSummary>();
  const [progress, setProgress] = useState<Gen8WildProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "advances", direction: "asc" },
  );
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => engine.dispose(), [engine]);
  const bdspProfiles = profiles.profiles.filter(
    (profile) =>
      profile.version === "brilliantdiamond" ||
      profile.version === "shiningpearl",
  );
  const selectedProfile =
    profiles.selectedProfile &&
    (profiles.selectedProfile.version === "brilliantdiamond" ||
      profiles.selectedProfile.version === "shiningpearl")
      ? profiles.selectedProfile
      : (bdspProfiles[0] ?? DEFAULT_GEN8_BDSP_PROFILE);
  const version = selectedProfile.version as
    "brilliantdiamond" | "shiningpearl";
  const locationOptions = useMemo(
    () => getGen8WildLocations(version, encounter),
    [encounter, version],
  );
  useEffect(() => {
    if (!locationOptions.includes(location))
      setLocation(locationOptions[0] ?? 0);
  }, [location, locationOptions]);
  const settings = useMemo(
    () => ({
      version,
      tid: selectedProfile.tid,
      sid: selectedProfile.sid,
      nationalDex: selectedProfile.nationalDex,
      encounter,
      location,
      time,
      radar,
      swarm,
      replacement: [replacement0, replacement1] as const,
      feebasTile,
    }),
    [
      encounter,
      feebasTile,
      location,
      radar,
      replacement0,
      replacement1,
      selectedProfile.nationalDex,
      selectedProfile.sid,
      selectedProfile.tid,
      swarm,
      time,
      version,
    ],
  );
  const slots = useMemo(() => getGen8WildSlots(settings), [settings]);
  useEffect(() => {
    if (encounter === "honeyTree") {
      setHoneyIndex(0);
      setSlotMask(1);
    } else setSlotMask(slots.length ? (1 << slots.length) - 1 : 0);
  }, [encounter, location, slots.length]);
  const replacementOptions = useMemo(
    () => getGen8WildReplacementOptions(selectedProfile.nationalDex, location),
    [location, selectedProfile.nationalDex],
  );
  const busy = status === "calculating";
  const natureOptions = NATURE_KEYS.map((key, index) => ({
    key,
    index,
    label: t(key),
  }));
  const characteristics = getIvCharacteristics(i18n.language, "bdsp");
  const columnLabel = (column: Column) =>
    column.labelKey ? t(column.labelKey as never) : column.label;
  const resultValue = useCallback(
    (result: Gen8WildResult, key: SortKey): number | string => {
      const ivIndex = IV_KEYS.indexOf(key as IvKey);
      if (ivIndex >= 0)
        return showStats ? result.stats[ivIndex] : result.ivs[ivIndex];
      const value = result[key as keyof Gen8WildResult];
      if (typeof value === "number" || typeof value === "string") return value;
      throw new TypeError(`Unsupported Gen 8 Wild sort key: ${key}`);
    },
    [showStats],
  );
  const displayValue = (result: Gen8WildResult, key: SortKey) => {
    const ivIndex = IV_KEYS.indexOf(key as IvKey);
    if (ivIndex >= 0) return String(resultValue(result, key));
    if (key === "item")
      return getGen8UndergroundItemName(i18n.language, result.item);
    if (key === "slot")
      return `${result.slot}: ${getIvSpeciesName(i18n.language, result.species, result.form)}`;
    if (key === "species")
      return getIvSpeciesName(i18n.language, result.species, result.form);
    if (key === "shiny")
      return result.shiny === 2
        ? t("gen8WildSquare")
        : result.shiny === 1
          ? t("gen8WildStar")
          : t("gen8WildNo");
    if (key === "nature") return t(NATURE_KEYS[result.nature]);
    if (key === "ability")
      return `${result.ability + 1} (${getGen4AbilityName(i18n.language, result.abilityIndex)})`;
    if (key === "gender")
      return result.gender === 0 ? "♂" : result.gender === 1 ? "♀" : "-";
    if (key === "characteristic")
      return characteristics[result.characteristic] ?? "-";
    return String(resultValue(result, key));
  };
  const sortedResults = useMemo(
    () =>
      [...results].sort(
        (left, right) =>
          compare(resultValue(left, sort.key), resultValue(right, sort.key)) *
          (sort.direction === "asc" ? 1 : -1),
      ),
    [resultValue, results, sort],
  );
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });
  const request = (): Gen8WildRequest => ({
    profile: gen8WildProfile(selectedProfile),
    seed0,
    seed1,
    initialAdvances: parseGen8WildDecimal(initialAdvances),
    maxAdvances: parseGen8WildDecimal(maxAdvances),
    offset: parseGen8WildDecimal(offset),
    encounter,
    location,
    time,
    radar,
    swarm,
    replacement: [replacement0, replacement1],
    feebasTile,
    lead: resolveLead(leadChoice),
    honeyIndex,
    filters: {
      disabled: filtersDisabled,
      shiny: filtersDisabled ? "any" : shiny,
      gender: filtersDisabled ? "any" : gender,
      ability: filtersDisabled ? "any" : ability,
      natureMask: filtersDisabled ? ALL_NATURES : natureMask || ALL_NATURES,
      hiddenPowerMask: filtersDisabled
        ? ALL_HIDDEN_POWERS
        : hiddenPowerMask || ALL_HIDDEN_POWERS,
      // Honey Tree remains a single-slot encounter even when other filters are disabled.
      slotMask,
      levelMin: filtersDisabled ? 1 : parseGen8WildDecimal(levelMin),
      levelMax: filtersDisabled ? 100 : parseGen8WildDecimal(levelMax),
      heightMin: filtersDisabled ? 0 : parseGen8WildDecimal(heightMin),
      heightMax: filtersDisabled ? 255 : parseGen8WildDecimal(heightMax),
      weightMin: filtersDisabled ? 0 : parseGen8WildDecimal(weightMin),
      weightMax: filtersDisabled ? 255 : parseGen8WildDecimal(weightMax),
      ivMin: (filtersDisabled
        ? [0, 0, 0, 0, 0, 0]
        : ivMin.map(parseGen8WildDecimal)) as Gen8WildIvTuple,
      ivMax: (filtersDisabled
        ? [31, 31, 31, 31, 31, 31]
        : ivMax.map(parseGen8WildDecimal)) as Gen8WildIvTuple,
    },
    resultLimit: 100_000,
  });
  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    let nextRequest: Gen8WildRequest;
    try {
      nextRequest = validateGen8WildRequest(request());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
      return;
    }
    setResults([]);
    setError("");
    setSummary(undefined);
    setStatus("calculating");
    setProgress({
      processedStates: 0,
      totalStates: gen8WildTaskCount(nextRequest),
      resultCount: 0,
      percent: 0,
    });
    try {
      const nextSummary = await engine.search(nextRequest, {
        onBatch: (batch) => setResults((current) => [...current, ...batch]),
        onProgress: setProgress,
      });
      setSummary(nextSummary);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };
  const clear = () => {
    engine.cancel();
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
  };
  const toggleMask = (
    setter: (value: number | ((current: number) => number)) => void,
    index: number,
  ) =>
    setter((mask) =>
      mask & (1 << index) ? mask & ~(1 << index) : mask | (1 << index),
    );
  const updateIv = (
    setter: typeof setIvMin | typeof setIvMax,
    index: number,
    value: string,
  ) =>
    setter(
      (current) =>
        current.map((entry, currentIndex) =>
          currentIndex === index ? value : entry,
        ) as IvText,
    );
  const toggleSlot = (index: number) =>
    setSlotMask((mask) =>
      encounter === "honeyTree"
        ? mask & (1 << index)
          ? 0
          : 1 << index
        : mask & (1 << index)
          ? mask & ~(1 << index)
          : mask | (1 << index),
    );
  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  const sortLabel = (key: SortKey) =>
    sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "";
  const exportCsv = () => {
    if (!sortedResults.length) return;
    const rows = [
      COLUMNS.map(columnLabel),
      ...sortedResults.map((result) =>
        COLUMNS.map((column) => displayValue(result, column.key)),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${rows.map((row) => row.join(",")).join("\n")}`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen8wild.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const errorText =
    error === "Please insert missing seed information"
      ? t("gen8WildMissingSeedsMessage")
      : error.includes("Wasm") || error.includes("wasm")
        ? t("wasmMissing")
        : error;
  const leadOption = (value: string, label: string) => (
    <option value={value}>{label}</option>
  );

  return (
    <form className="gen8wild-panel" onSubmit={run}>
      <section className="gen8wild-profile-bar">
        <div>
          <span className="gen8wild-eyebrow">{t("gen8WildModule")}</span>
          <h1>{t("gen8WildEngine")}</h1>
        </div>
        <label>
          <span>{t("profile")}</span>
          <Select
            value={selectedProfile.id}
            onChange={(event) =>
              void profiles.selectProfile(event.target.value)
            }
          >
            {bdspProfiles.length ? (
              bdspProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name || "-"} · {gameLabel(profile, i18n.language)}
                </option>
              ))
            ) : (
              <option value={selectedProfile.id}>{selectedProfile.name}</option>
            )}
          </Select>
        </label>
        <button
          className="gen8wild-icon-button"
          onClick={onOpenProfileManager}
          title={t("gen8WildProfileManager")}
          type="button"
        >
          <Settings2 size={17} />
        </button>
        <dl>
          <div>
            <dt>TID</dt>
            <dd>{selectedProfile.tid}</dd>
          </div>
          <div>
            <dt>SID</dt>
            <dd>{selectedProfile.sid}</dd>
          </div>
        </dl>
      </section>
      <section className="gen8wild-control-grid">
        <fieldset className="gen8wild-rng-fieldset">
          <legend>{t("gen8WildRngInfo")}</legend>
          <label className="wide">
            <span>{t("gen8WildSeed0")}</span>
            <input
              inputMode="text"
              maxLength={16}
              onChange={(event) =>
                setSeed0(normalizeHexInput(event.target.value, 16))
              }
              placeholder="0000000000000000"
              spellCheck={false}
              value={seed0}
            />
          </label>
          <label className="wide">
            <span>{t("gen8WildSeed1")}</span>
            <input
              inputMode="text"
              maxLength={16}
              onChange={(event) =>
                setSeed1(normalizeHexInput(event.target.value, 16))
              }
              placeholder="0000000000000000"
              spellCheck={false}
              value={seed1}
            />
          </label>
          <label>
            <span>{t("gen8WildInitialAdvances")}</span>
            <input
              inputMode="numeric"
              max="4294967295"
              maxLength={10}
              min="0"
              onChange={(event) =>
                setInitialAdvances(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff),
                )
              }
              value={initialAdvances}
            />
          </label>
          <label>
            <span>{t("gen8WildMaxAdvances")}</span>
            <input
              inputMode="numeric"
              max="4294967295"
              maxLength={10}
              min="0"
              onChange={(event) =>
                setMaxAdvances(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff),
                )
              }
              value={maxAdvances}
            />
          </label>
          <label>
            <span>{t("gen8WildOffset")}</span>
            <input
              inputMode="numeric"
              max="4294967295"
              maxLength={10}
              min="0"
              onChange={(event) =>
                setOffset(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff),
                )
              }
              value={offset}
            />
          </label>
          <label>
            <span>{t("gen8WildLead")}</span>
            <Select
              onChange={(event) => setLeadChoice(event.target.value)}
              value={leadChoice}
            >
              <option value="none">{t("gen8WildNone")}</option>
              <optgroup label={t("gen8WildCuteCharm")}>
                {leadOption("cuteCharmMale", t("gen8WildMaleLead"))}
                {leadOption("cuteCharmFemale", t("gen8WildFemaleLead"))}
              </optgroup>
              <optgroup label={t("gen8WildSlotModifier")}>
                {leadOption("harvest", t("gen8WildHarvest"))}
                {leadOption("flashFire", t("gen8WildFlashFire"))}
                {leadOption("magnetPull", t("gen8WildMagnetPull"))}
                {leadOption("static", t("gen8WildStatic"))}
                {leadOption("stormDrain", t("gen8WildStormDrain"))}
              </optgroup>
              <optgroup label={t("gen8WildItemModifier")}>
                {leadOption("compoundEyes", t("gen8WildCompoundEyes"))}
                {leadOption("superLuck", t("gen8WildSuperLuck"))}
              </optgroup>
              <optgroup label={t("gen8WildLevelModifier")}>
                {leadOption("hustle", t("gen8WildHustle"))}
                {leadOption("pressure", t("gen8WildPressure"))}
                {leadOption("vitalSpirit", t("gen8WildVitalSpirit"))}
              </optgroup>
              <optgroup label={t("gen8WildSynchronize")}>
                {natureOptions.map((nature) => (
                  <option
                    key={nature.key}
                    value={`synchronize:${nature.index}`}
                  >
                    {nature.label}
                  </option>
                ))}
              </optgroup>
            </Select>
          </label>
          <div className="gen8wild-actions">
            <button
              className="primary"
              disabled={busy || !locationOptions.length}
              type="submit"
            >
              <Play size={16} />
              {t("gen8WildGenerate")}
            </button>
            <button
              className="secondary"
              disabled={!busy}
              onClick={() => engine.cancel()}
              type="button"
            >
              <Square size={15} />
              {t("cancel")}
            </button>
          </div>
        </fieldset>
        <fieldset className="gen8wild-config-fieldset">
          <legend>{t("gen8WildSettings")}</legend>
          <div className="gen8wild-tabs" role="tablist">
            <button
              aria-selected={configTab === "settings"}
              className={configTab === "settings" ? "active" : ""}
              onClick={() => setConfigTab("settings")}
              role="tab"
              type="button"
            >
              {t("gen8WildSettings")}
            </button>
            <button
              aria-selected={configTab === "filters"}
              className={configTab === "filters" ? "active" : ""}
              onClick={() => setConfigTab("filters")}
              role="tab"
              type="button"
            >
              {t("gen8WildFilters")}
            </button>
          </div>
          {configTab === "settings" ? (
            <div className="gen8wild-settings-pane" role="tabpanel">
              <div className="gen8wild-setting-grid">
                <label>
                  <span>{t("gen8WildEncounter")}</span>
                  <Select
                    value={encounter}
                    onChange={(event) =>
                      setEncounter(
                        event.target.value as Gen8WildRequest["encounter"],
                      )
                    }
                  >
                    <option value="grass">{t("gen8WildGrass")}</option>
                    <option value="honeyTree">{t("gen8WildHoneyTree")}</option>
                    <option value="rockSmash">{t("gen8WildRockSmash")}</option>
                    <option value="surfing">{t("gen8WildSurfing")}</option>
                    <option value="oldRod">{t("gen8WildOldRod")}</option>
                    <option value="goodRod">{t("gen8WildGoodRod")}</option>
                    <option value="superRod">{t("gen8WildSuperRod")}</option>
                  </Select>
                </label>
                <label>
                  <span>{t("gen8WildLocation")}</span>
                  <Select
                    value={location}
                    onChange={(event) =>
                      setLocation(Number(event.target.value))
                    }
                  >
                    {locationOptions.map((value) => (
                      <option key={value} value={value}>
                        {locationName(i18n.language, value)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label>
                  <span>{t("gen8WildTime")}</span>
                  <Select
                    value={time}
                    onChange={(event) =>
                      setTime(Number(event.target.value) as 0 | 1 | 2)
                    }
                  >
                    <option value={0}>{t("gen8WildMorning")}</option>
                    <option value={1}>{t("gen8WildDay")}</option>
                    <option value={2}>{t("gen8WildNight")}</option>
                  </Select>
                </label>
                <label>
                  <span>{t("gen8WildLevels")}</span>
                  <output>
                    {slots.length
                      ? `${slots[0].minLevel}-${Math.max(...slots.map((slot) => slot.maxLevel))}`
                      : "-"}
                  </output>
                </label>
              </div>
              <div className="gen8wild-check-grid">
                <label className="gen8wild-check">
                  <input
                    checked={radar}
                    disabled={encounter !== "grass"}
                    onChange={(event) => setRadar(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen8WildRadar")}</span>
                </label>
                <label className="gen8wild-check">
                  <input
                    checked={swarm}
                    disabled={encounter !== "grass"}
                    onChange={(event) => setSwarm(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen8WildSwarm")}</span>
                </label>
                <label className="gen8wild-check">
                  <input
                    checked={feebasTile}
                    disabled={
                      location !== 22 ||
                      !["oldRod", "goodRod", "superRod"].includes(encounter)
                    }
                    onChange={(event) => setFeebasTile(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen8WildFeebasTile")}</span>
                </label>
              </div>
              {replacementOptions.length ? (
                <div className="gen8wild-replacement-grid">
                  <label>
                    <span>{t("gen8WildReplacement")}</span>
                    <Select
                      value={replacement0}
                      onChange={(event) =>
                        setReplacement0(Number(event.target.value))
                      }
                    >
                      <option value={0}>-</option>
                      {replacementOptions.map((species) => (
                        <option key={species} value={species}>
                          {getIvSpeciesName(i18n.language, species)}
                        </option>
                      ))}
                    </Select>
                  </label>
                  {location === 117 && (
                    <label>
                      <span>{t("gen8WildReplacement")}</span>
                      <Select
                        value={replacement1}
                        onChange={(event) =>
                          setReplacement1(Number(event.target.value))
                        }
                      >
                        <option value={0}>-</option>
                        {replacementOptions.map((species) => (
                          <option key={species} value={species}>
                            {getIvSpeciesName(i18n.language, species)}
                          </option>
                        ))}
                      </Select>
                    </label>
                  )}
                </div>
              ) : null}
              <div className="gen8wild-slot-heading">
                <strong>{t("gen8WildSlot")}</strong>
                <span>
                  {slots.length
                    ? `${slots.filter((_, index) => slotMask & (1 << index)).length} / ${slots.length}`
                    : "-"}
                </span>
                <button
                  onClick={() =>
                    setSlotMask(slots.length ? (1 << slots.length) - 1 : 0)
                  }
                  type="button"
                >
                  {t("gen8WildSelectAll")}
                </button>
                <button onClick={() => setSlotMask(0)} type="button">
                  {t("gen8WildSelectNone")}
                </button>
              </div>
              <div className="gen8wild-slot-list">
                {slots.map((slot, index) => (
                  <label key={`${slot.species}-${index}`}>
                    <input
                      checked={(slotMask & (1 << index)) !== 0}
                      onChange={() => toggleSlot(index)}
                      type="checkbox"
                    />
                    <span>
                      {index}: {getIvSpeciesName(i18n.language, slot.species)}
                    </span>
                    <small>
                      {slot.minLevel === slot.maxLevel
                        ? slot.maxLevel
                        : `${slot.minLevel}-${slot.maxLevel}`}
                    </small>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="gen8wild-filter-pane" role="tabpanel">
              <label className="gen8wild-check gen8wild-disable-filter">
                <input
                  checked={filtersDisabled}
                  onChange={(event) => setFiltersDisabled(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen8WildDisableFilters")}</span>
              </label>
              <div className="gen8wild-filter-grid">
                <label>
                  <span>{t("gen8WildShiny")}</span>
                  <Select
                    disabled={filtersDisabled}
                    value={shiny}
                    onChange={(event) =>
                      setShiny(event.target.value as Gen8WildShinyFilter)
                    }
                  >
                    <option value="any">{t("gen8WildAny")}</option>
                    <option value="star">{t("gen8WildStar")}</option>
                    <option value="square">{t("gen8WildSquare")}</option>
                    <option value="starSquare">
                      {t("gen8WildStarSquare")}
                    </option>
                  </Select>
                </label>
                <label>
                  <span>{t("gen8WildGender")}</span>
                  <Select
                    disabled={filtersDisabled}
                    value={gender}
                    onChange={(event) =>
                      setGender(event.target.value as Gen8WildGenderFilter)
                    }
                  >
                    <option value="any">{t("gen8WildAny")}</option>
                    <option value="male">♂</option>
                    <option value="female">♀</option>
                  </Select>
                </label>
                <label>
                  <span>{t("gen8WildAbility")}</span>
                  <Select
                    disabled={filtersDisabled}
                    value={ability}
                    onChange={(event) =>
                      setAbility(event.target.value as Gen8WildAbilityFilter)
                    }
                  >
                    <option value="any">{t("gen8WildAny")}</option>
                    <option value="first">0</option>
                    <option value="second">1</option>
                  </Select>
                </label>
                <label>
                  <span>{t("gen8WildLevel")}</span>
                  <input
                    disabled={filtersDisabled}
                    max="100"
                    min="1"
                    onChange={(event) =>
                      setLevelMin(
                        normalizeDecimalInput(event.target.value, 100),
                      )
                    }
                    value={levelMin}
                  />
                  <input
                    aria-label={t("maximum")}
                    disabled={filtersDisabled}
                    max="100"
                    min="1"
                    onChange={(event) =>
                      setLevelMax(
                        normalizeDecimalInput(event.target.value, 100),
                      )
                    }
                    value={levelMax}
                  />
                </label>
              </div>
              <div className="gen8wild-filter-lists">
                <div>
                  <strong>{t("gen8WildNature")}</strong>
                  <div className="gen8wild-check-grid nature">
                    {natureOptions.map((nature) => (
                      <label key={nature.key}>
                        <input
                          checked={(natureMask & (1 << nature.index)) !== 0}
                          disabled={filtersDisabled}
                          onChange={() =>
                            toggleMask(setNatureMask, nature.index)
                          }
                          type="checkbox"
                        />
                        <span>{nature.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <strong>{t("gen8WildHiddenPower")}</strong>
                  <div className="gen8wild-check-grid power">
                    {POWER_KEYS.map((key, index) => (
                      <label key={key}>
                        <input
                          checked={(hiddenPowerMask & (1 << index)) !== 0}
                          disabled={filtersDisabled}
                          onChange={() => toggleMask(setHiddenPowerMask, index)}
                          type="checkbox"
                        />
                        <span>{t(key)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="gen8wild-ranges">
                {[
                  [
                    t("gen8WildHeight"),
                    heightMin,
                    heightMax,
                    setHeightMin,
                    setHeightMax,
                  ],
                  [
                    t("gen8WildWeight"),
                    weightMin,
                    weightMax,
                    setWeightMin,
                    setWeightMax,
                  ],
                ].map(([label, minimum, maximum, setMinimum, setMaximum]) => (
                  <label key={String(label)}>
                    <span>{String(label)}</span>
                    <input
                      aria-label={`${String(label)} ${t("minimum")}`}
                      disabled={filtersDisabled}
                      inputMode="numeric"
                      max="255"
                      min="0"
                      onChange={(event) =>
                        (setMinimum as typeof setHeightMin)(
                          normalizeDecimalInput(event.target.value, 255),
                        )
                      }
                      value={String(minimum)}
                    />
                    <input
                      aria-label={`${String(label)} ${t("maximum")}`}
                      disabled={filtersDisabled}
                      inputMode="numeric"
                      max="255"
                      min="0"
                      onChange={(event) =>
                        (setMaximum as typeof setHeightMax)(
                          normalizeDecimalInput(event.target.value, 255),
                        )
                      }
                      value={String(maximum)}
                    />
                  </label>
                ))}
              </div>
              <div className="gen8wild-iv-ranges">
                {IV_KEYS.map((key, index) => (
                  <label key={key}>
                    <span>{IV_LABELS[index]}</span>
                    <input
                      aria-label={`${IV_LABELS[index]} ${t("minimum")}`}
                      disabled={filtersDisabled}
                      inputMode="numeric"
                      max="31"
                      min="0"
                      onChange={(event) =>
                        updateIv(
                          setIvMin,
                          index,
                          normalizeDecimalInput(event.target.value, 31),
                        )
                      }
                      value={ivMin[index]}
                    />
                    <input
                      aria-label={`${IV_LABELS[index]} ${t("maximum")}`}
                      disabled={filtersDisabled}
                      inputMode="numeric"
                      max="31"
                      min="0"
                      onChange={(event) =>
                        updateIv(
                          setIvMax,
                          index,
                          normalizeDecimalInput(event.target.value, 31),
                        )
                      }
                      value={ivMax[index]}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </fieldset>
      </section>
      {errorText && <div className="gen8wild-alert">{errorText}</div>}
      {summary?.resultLimitReached && (
        <div className="gen8wild-alert warning">{t("limitReached")}</div>
      )}
      <section className="gen8wild-results">
        <header>
          <div>
            <strong>{t("results")}</strong>
            <span className="gen8wild-status">{t(status)}</span>
          </div>
          <div className="gen8wild-result-actions">
            <span>
              {progress.resultCount} / {progress.totalStates}
            </span>
            <button
              className={showStats ? "active icon" : "icon"}
              onClick={() => setShowStats((value) => !value)}
              title={t("gen8WildShowStats")}
              type="button"
            >
              {showStats ? "IV" : "ST"}
            </button>
            <button
              className="icon"
              disabled={!sortedResults.length}
              onClick={exportCsv}
              title={t("exportCsv")}
              type="button"
            >
              <Download size={16} />
            </button>
            <button
              className="icon"
              disabled={!results.length && !busy}
              onClick={clear}
              title={t("clear")}
              type="button"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>
        <div className="gen8wild-progress-row">
          <progress max={100} value={Math.min(100, progress.percent)} />
          <span>{progress.percent.toFixed(1)}%</span>
          <span>
            {t("processed")} {progress.processedStates}
          </span>
          <span>
            {t("workers")} {summary?.workerCount ?? "-"}
          </span>
          <span>
            {t("elapsed")}{" "}
            {summary ? `${summary.elapsedMs.toFixed(0)} ms` : "-"}
          </span>
        </div>
        <div className="gen8wild-table" ref={tableRef}>
          <div
            className="gen8wild-table-inner"
            style={{
              height: `${Math.max(122, rowVirtualizer.getTotalSize() + 42)}px`,
            }}
          >
            <div className="gen8wild-table-header">
              {COLUMNS.map((column) => (
                <button
                  key={column.key}
                  onClick={() => toggleSort(column.key)}
                  type="button"
                >
                  {IV_KEYS.includes(column.key as IvKey)
                    ? IV_LABELS[IV_KEYS.indexOf(column.key as IvKey)]
                    : columnLabel(column)}
                  {sortLabel(column.key)}
                </button>
              ))}
            </div>
            {sortedResults.length === 0 ? (
              <div className="gen8wild-empty">{t("empty")}</div>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = sortedResults[virtualRow.index];
                return (
                  <div
                    className="gen8wild-table-row"
                    key={`${result.advances}-${result.species}-${result.ec}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 42}px)`,
                    }}
                  >
                    {COLUMNS.map((column) => (
                      <span
                        key={column.key}
                        title={displayValue(result, column.key)}
                      >
                        {displayValue(result, column.key)}
                      </span>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </form>
  );
}
