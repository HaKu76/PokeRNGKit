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
import {
  getGen8UndergroundItemName,
  getGen8UndergroundLocationName,
  getGen8UndergroundMoveName,
  getGen8UndergroundSpecies,
} from "./data";
import {
  GEN8_UNDERGROUND_LEVEL_RANGES,
  gen8UndergroundProfile,
  gen8UndergroundTaskCount,
  parseGen8UndergroundDecimal,
  validateGen8UndergroundRequest,
  type Gen8UndergroundAbilityFilter,
  type Gen8UndergroundGenderFilter,
  type Gen8UndergroundIvTuple,
  type Gen8UndergroundRequest,
  type Gen8UndergroundResult,
  type Gen8UndergroundShinyFilter,
} from "./domain";
import { Gen8UndergroundUiPreviewEngine } from "./preview/Gen8UndergroundUiPreviewEngine";
import type {
  Gen8UndergroundEngine,
  Gen8UndergroundProgress,
  Gen8UndergroundSummary,
} from "./search";
import { Gen8UndergroundWorkerPool } from "./worker/Gen8UndergroundWorkerPool";
import "./Gen8UndergroundPanel.css";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type ConfigTab = "settings" | "filters";
type IvText = [string, string, string, string, string, string];
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type SortKey =
  | "advances"
  | "eggMove"
  | "item"
  | "species"
  | "level"
  | "ec"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | IvKey
  | "gender"
  | "characteristic"
  | "height"
  | "weight";

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
const STORY_KEYS = [
  "gen8UndergroundUnlocked",
  "gen8UndergroundStrength",
  "gen8UndergroundDefog",
  "gen8UndergroundSevenBadges",
  "gen8UndergroundWaterfall",
  "gen8UndergroundNationalDex",
] as const;
const LEVEL_KEYS = [
  "gen8UndergroundZeroOneBadges",
  "gen8UndergroundTwoBadges",
  "gen8UndergroundThreeBadges",
  "gen8UndergroundFourBadges",
  "gen8UndergroundFiveBadges",
  "gen8UndergroundSixBadges",
  "gen8UndergroundSevenBadges",
  "gen8UndergroundEightBadges",
  "gen8UndergroundNationalDex",
] as const;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const IV_KEYS: readonly IvKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];
const IV_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const IV_FILTER_LABEL_KEYS = [
  "gen8UndergroundFilterHp",
  "gen8UndergroundFilterAttack",
  "gen8UndergroundFilterDefense",
  "gen8UndergroundFilterSpecialAttack",
  "gen8UndergroundFilterSpecialDefense",
  "gen8UndergroundFilterSpeed",
] as const;
const LEAD_VALUES: Record<string, number> = {
  none: 255,
  cuteCharmFemale: 25,
  cuteCharmMale: 26,
  compoundEyes: 34,
  superLuck: 34,
  hustle: 32,
  pressure: 32,
  vitalSpirit: 32,
};
const COLUMNS: readonly Column[] = [
  { key: "advances", labelKey: "gen8UndergroundAdvances", label: "Advances" },
  { key: "eggMove", labelKey: "gen8UndergroundEggMove", label: "Egg Move" },
  { key: "item", labelKey: "gen8UndergroundItem", label: "Item" },
  { key: "species", labelKey: "gen8UndergroundSpecies", label: "Species" },
  { key: "level", labelKey: "gen8UndergroundLevel", label: "Level" },
  { key: "ec", label: "EC" },
  { key: "pid", label: "PID" },
  { key: "shiny", labelKey: "gen8UndergroundShiny", label: "Shiny" },
  { key: "nature", labelKey: "gen8UndergroundNature", label: "Nature" },
  { key: "ability", labelKey: "gen8UndergroundAbility", label: "Ability" },
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "specialAttack", label: "SpA" },
  { key: "specialDefense", label: "SpD" },
  { key: "speed", label: "Spe" },
  { key: "gender", labelKey: "gen8UndergroundGender", label: "Gender" },
  {
    key: "characteristic",
    labelKey: "gen8UndergroundCharacteristic",
    label: "Characteristic",
  },
  { key: "height", labelKey: "gen8UndergroundHeight", label: "Height" },
  { key: "weight", labelKey: "gen8UndergroundWeight", label: "Weight" },
];

export interface Gen8UndergroundPanelProps {
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

export function Gen8UndergroundPanel({
  onOpenProfileManager,
  profiles,
  uiPreviewMode,
}: Gen8UndergroundPanelProps) {
  const { i18n, t } = useTranslation();
  const engine = useMemo<Gen8UndergroundEngine>(
    () =>
      uiPreviewMode
        ? new Gen8UndergroundUiPreviewEngine()
        : new Gen8UndergroundWorkerPool(),
    [uiPreviewMode],
  );
  const [configTab, setConfigTab] = useState<ConfigTab>("settings");
  const [seed0, setSeed0] = useState("");
  const [seed1, setSeed1] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("");
  const [leadChoice, setLeadChoice] = useState("none");
  const [storyFlag, setStoryFlag] = useState(1);
  const [levelFlag, setLevelFlag] = useState(0);
  const [location, setLocation] = useState(2);
  const [diglett, setDiglett] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<readonly number[]>([]);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen8UndergroundShinyFilter>("any");
  const [gender, setGender] = useState<Gen8UndergroundGenderFilter>("any");
  const [ability, setAbility] = useState<Gen8UndergroundAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(ALL_NATURES);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(ALL_HIDDEN_POWERS);
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
  const [results, setResults] = useState<Gen8UndergroundResult[]>([]);
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Gen8UndergroundSummary>();
  const [progress, setProgress] = useState<Gen8UndergroundProgress>({
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
  const availableSpecies = useMemo(
    () =>
      getGen8UndergroundSpecies(
        selectedProfile.version as "brilliantdiamond" | "shiningpearl",
        location,
        storyFlag,
      ),
    [location, selectedProfile.version, storyFlag],
  );
  useEffect(() => setSelectedSpecies(availableSpecies), [availableSpecies]);

  const busy = status === "calculating";
  const natureOptions = NATURE_KEYS.map((key, index) => ({
    key,
    index,
    label: t(key),
  }));
  const characteristics = getIvCharacteristics(i18n.language, "bdsp");
  const levels = GEN8_UNDERGROUND_LEVEL_RANGES[levelFlag];
  const columnLabel = (column: Column) =>
    column.labelKey ? t(column.labelKey as never) : column.label;
  const resultShinyLabel = (value: number) =>
    value === 2
      ? t("gen8UndergroundSquare")
      : value === 1
        ? t("gen8UndergroundStar")
        : t("gen8UndergroundNo");
  const resultGenderLabel = (value: number) =>
    value === 0 ? "♂" : value === 1 ? "♀" : "-";

  const request = (): Gen8UndergroundRequest => {
    const disabled = filtersDisabled;
    return {
      profile: gen8UndergroundProfile(selectedProfile),
      seed0,
      seed1,
      initialAdvances: parseGen8UndergroundDecimal(initialAdvances),
      maxAdvances: parseGen8UndergroundDecimal(maxAdvances),
      offset: parseGen8UndergroundDecimal(offset),
      lead: resolveLead(leadChoice),
      diglett,
      storyFlag,
      levelFlag,
      location,
      filters: {
        disabled,
        shiny: disabled ? "any" : shiny,
        gender: disabled ? "any" : gender,
        ability: disabled ? "any" : ability,
        natureMask: disabled ? ALL_NATURES : natureMask || ALL_NATURES,
        hiddenPowerMask: disabled
          ? ALL_HIDDEN_POWERS
          : hiddenPowerMask || ALL_HIDDEN_POWERS,
        heightMin: disabled ? 0 : parseGen8UndergroundDecimal(heightMin),
        heightMax: disabled ? 255 : parseGen8UndergroundDecimal(heightMax),
        weightMin: disabled ? 0 : parseGen8UndergroundDecimal(weightMin),
        weightMax: disabled ? 255 : parseGen8UndergroundDecimal(weightMax),
        ivMin: (disabled
          ? [0, 0, 0, 0, 0, 0]
          : ivMin.map(parseGen8UndergroundDecimal)) as Gen8UndergroundIvTuple,
        ivMax: (disabled
          ? [31, 31, 31, 31, 31, 31]
          : ivMax.map(parseGen8UndergroundDecimal)) as Gen8UndergroundIvTuple,
        species: selectedSpecies,
      },
      resultLimit: 100_000,
    };
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    let nextRequest: Gen8UndergroundRequest;
    try {
      nextRequest = validateGen8UndergroundRequest(request());
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
      totalStates: gen8UndergroundTaskCount(nextRequest),
      resultCount: 0,
      percent: 0,
    });
    try {
      const nextSummary = await engine.search(nextRequest, {
        onBatch: setResults,
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
  const toggleNature = (index: number) =>
    setNatureMask((mask) =>
      mask & (1 << index) ? mask & ~(1 << index) : mask | (1 << index),
    );
  const toggleHiddenPower = (index: number) =>
    setHiddenPowerMask((mask) =>
      mask & (1 << index) ? mask & ~(1 << index) : mask | (1 << index),
    );
  const toggleSpecies = (species: number) =>
    setSelectedSpecies((current) =>
      current.includes(species)
        ? current.filter((value) => value !== species)
        : [...current, species],
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
  const resultValue = useCallback(
    (result: Gen8UndergroundResult, key: SortKey): number | string => {
      const ivIndex = IV_KEYS.indexOf(key as IvKey);
      if (ivIndex >= 0)
        return showStats ? result.stats[ivIndex] : result.ivs[ivIndex];
      const value = result[key as keyof Gen8UndergroundResult];
      if (typeof value === "number" || typeof value === "string") return value;
      throw new TypeError(`Unsupported Gen 8 Underground sort key: ${key}`);
    },
    [showStats],
  );
  const displayValue = (result: Gen8UndergroundResult, key: SortKey) => {
    const ivIndex = IV_KEYS.indexOf(key as IvKey);
    if (ivIndex >= 0) return String(resultValue(result, key));
    if (key === "eggMove")
      return getGen8UndergroundMoveName(i18n.language, result.eggMove);
    if (key === "item")
      return getGen8UndergroundItemName(i18n.language, result.item);
    if (key === "species")
      return getIvSpeciesName(i18n.language, result.species);
    if (key === "shiny") return resultShinyLabel(result.shiny);
    if (key === "nature") return t(NATURE_KEYS[result.nature]);
    if (key === "ability")
      return `${result.ability + 1} (${getGen4AbilityName(i18n.language, result.abilityIndex)})`;
    if (key === "gender") return resultGenderLabel(result.gender);
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
    [results, resultValue, sort],
  );
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });
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
    anchor.download = "pokerngkit-gen8underground.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const errorText =
    error === "Please insert missing seed information"
      ? t("gen8UndergroundMissingSeedsMessage")
      : error.includes("Wasm") || error.includes("wasm")
        ? t("wasmMissing")
        : error;

  return (
    <form className="gen8underground-panel" onSubmit={run}>
      <section className="gen8underground-profile-bar">
        <div>
          <span className="gen8underground-eyebrow">
            {t("gen8UndergroundModule")}
          </span>
          <h1>{t("gen8UndergroundEngine")}</h1>
        </div>
        <label>
          <span>{t("profile")}</span>
          <select
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
          </select>
        </label>
        <button
          className="gen8underground-icon-button"
          onClick={onOpenProfileManager}
          title={t("gen8UndergroundProfileManager")}
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

      <section className="gen8underground-control-grid">
        <fieldset className="gen8underground-rng-fieldset">
          <legend>{t("gen8UndergroundRngInfo")}</legend>
          <label className="wide">
            <span>{t("gen8UndergroundSeed0")}</span>
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
            <span>{t("gen8UndergroundSeed1")}</span>
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
            <span>{t("gen8UndergroundInitialAdvances")}</span>
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
            <span>{t("gen8UndergroundMaxAdvances")}</span>
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
            <span>{t("gen8UndergroundOffset")}</span>
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
            <span>{t("gen8UndergroundLead")}</span>
            <select
              onChange={(event) => setLeadChoice(event.target.value)}
              value={leadChoice}
            >
              <option value="none">{t("gen8UndergroundNone")}</option>
              <optgroup label={t("gen8UndergroundCuteCharm")}>
                <option value="cuteCharmMale">
                  {t("gen8UndergroundMaleLead")}
                </option>
                <option value="cuteCharmFemale">
                  {t("gen8UndergroundFemaleLead")}
                </option>
              </optgroup>
              <optgroup label={t("gen8UndergroundItemModifier")}>
                <option value="compoundEyes">
                  {t("gen8UndergroundCompoundEyes")}
                </option>
                <option value="superLuck">
                  {t("gen8UndergroundSuperLuck")}
                </option>
              </optgroup>
              <optgroup label={t("gen8UndergroundLevelModifier")}>
                <option value="hustle">{t("gen8UndergroundHustle")}</option>
                <option value="pressure">{t("gen8UndergroundPressure")}</option>
                <option value="vitalSpirit">
                  {t("gen8UndergroundVitalSpirit")}
                </option>
              </optgroup>
              <optgroup label={t("gen8UndergroundSynchronize")}>
                {natureOptions.map((nature) => (
                  <option
                    key={nature.key}
                    value={`synchronize:${nature.index}`}
                  >
                    {nature.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <div className="gen8underground-actions">
            <button className="primary" disabled={busy} type="submit">
              <Play size={16} />
              {t("gen8UndergroundGenerate")}
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

        <fieldset className="gen8underground-config-fieldset">
          <legend>{t("gen8UndergroundSettings")}</legend>
          <div className="gen8underground-tabs" role="tablist">
            <button
              aria-selected={configTab === "settings"}
              className={configTab === "settings" ? "active" : ""}
              onClick={() => setConfigTab("settings")}
              role="tab"
              type="button"
            >
              {t("gen8UndergroundSettings")}
            </button>
            <button
              aria-selected={configTab === "filters"}
              className={configTab === "filters" ? "active" : ""}
              onClick={() => setConfigTab("filters")}
              role="tab"
              type="button"
            >
              {t("gen8UndergroundFilters")}
            </button>
          </div>
          {configTab === "settings" ? (
            <div className="gen8underground-settings-pane" role="tabpanel">
              <div className="gen8underground-setting-grid">
                <label>
                  <span>{t("gen8UndergroundStoryFlag")}</span>
                  <select
                    onChange={(event) =>
                      setStoryFlag(Number(event.target.value))
                    }
                    value={storyFlag}
                  >
                    {STORY_KEYS.map((key, index) => (
                      <option key={key} value={index + 1}>
                        {t(key)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("gen8UndergroundLevelFlag")}</span>
                  <select
                    onChange={(event) =>
                      setLevelFlag(Number(event.target.value))
                    }
                    value={levelFlag}
                  >
                    {LEVEL_KEYS.map((key, index) => (
                      <option key={`${key}-${index}`} value={index}>
                        {t(key)} ·{" "}
                        {GEN8_UNDERGROUND_LEVEL_RANGES[index].join("-")}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("gen8UndergroundLocation")}</span>
                  <select
                    onChange={(event) =>
                      setLocation(Number(event.target.value))
                    }
                    value={location}
                  >
                    {Array.from({ length: 18 }, (_, index) => index + 2).map(
                      (value) => (
                        <option key={value} value={value}>
                          {getGen8UndergroundLocationName(i18n.language, value)}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  <span>{t("gen8UndergroundLevel")}</span>
                  <output>{levels.join("-")}</output>
                </label>
              </div>
              <label className="gen8underground-check">
                <input
                  checked={diglett}
                  onChange={(event) => setDiglett(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen8UndergroundDiglettBonus")}</span>
              </label>
              <div className="gen8underground-species-heading">
                <strong>{t("gen8UndergroundPokemon")}</strong>
                <span>
                  {selectedSpecies.length} / {availableSpecies.length}
                </span>
                <button
                  onClick={() => setSelectedSpecies(availableSpecies)}
                  type="button"
                >
                  {t("gen8UndergroundSelectAll")}
                </button>
                <button onClick={() => setSelectedSpecies([])} type="button">
                  {t("gen8UndergroundSelectNone")}
                </button>
              </div>
              <div className="gen8underground-species-list">
                {availableSpecies.map((species) => (
                  <label key={species}>
                    <input
                      checked={selectedSpecies.includes(species)}
                      onChange={() => toggleSpecies(species)}
                      type="checkbox"
                    />
                    <span>{getIvSpeciesName(i18n.language, species)}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="gen8underground-filter-pane" role="tabpanel">
              <label className="gen8underground-check gen8underground-disable-filter">
                <input
                  checked={filtersDisabled}
                  onChange={(event) => setFiltersDisabled(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen8UndergroundDisableFilters")}</span>
              </label>
              <div className="gen8underground-filter-grid">
                <label>
                  <span>{t("gen8UndergroundShiny")}</span>
                  <select
                    disabled={filtersDisabled}
                    onChange={(event) =>
                      setShiny(event.target.value as Gen8UndergroundShinyFilter)
                    }
                    value={shiny}
                  >
                    <option value="any">{t("gen8UndergroundAny")}</option>
                    <option value="star">{t("gen8UndergroundStar")}</option>
                    <option value="square">{t("gen8UndergroundSquare")}</option>
                    <option value="starSquare">
                      {t("gen8UndergroundStarSquare")}
                    </option>
                  </select>
                </label>
                <label>
                  <span>{t("gen8UndergroundGender")}</span>
                  <select
                    disabled={filtersDisabled}
                    onChange={(event) =>
                      setGender(
                        event.target.value as Gen8UndergroundGenderFilter,
                      )
                    }
                    value={gender}
                  >
                    <option value="any">{t("gen8UndergroundAny")}</option>
                    <option value="male">♂</option>
                    <option value="female">♀</option>
                  </select>
                </label>
                <label>
                  <span>{t("gen8UndergroundAbility")}</span>
                  <select
                    disabled={filtersDisabled}
                    onChange={(event) =>
                      setAbility(
                        event.target.value as Gen8UndergroundAbilityFilter,
                      )
                    }
                    value={ability}
                  >
                    <option value="any">{t("gen8UndergroundAny")}</option>
                    <option value="first">0</option>
                    <option value="second">1</option>
                  </select>
                </label>
              </div>
              <div className="gen8underground-filter-lists">
                <div>
                  <strong>{t("gen8UndergroundNature")}</strong>
                  <div className="gen8underground-check-grid nature">
                    {natureOptions.map((nature) => (
                      <label key={nature.key}>
                        <input
                          checked={(natureMask & (1 << nature.index)) !== 0}
                          disabled={filtersDisabled}
                          onChange={() => toggleNature(nature.index)}
                          type="checkbox"
                        />
                        <span>{nature.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <strong>{t("gen8UndergroundHiddenPower")}</strong>
                  <div className="gen8underground-check-grid power">
                    {POWER_KEYS.map((key, index) => (
                      <label key={key}>
                        <input
                          checked={(hiddenPowerMask & (1 << index)) !== 0}
                          disabled={filtersDisabled}
                          onChange={() => toggleHiddenPower(index)}
                          type="checkbox"
                        />
                        <span>{t(key)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="gen8underground-ranges">
                {[
                  [
                    t("gen8UndergroundHeight"),
                    heightMin,
                    heightMax,
                    setHeightMin,
                    setHeightMax,
                  ],
                  [
                    t("gen8UndergroundWeight"),
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
              <div className="gen8underground-iv-ranges">
                {IV_FILTER_LABEL_KEYS.map((key, index) => (
                  <label key={key}>
                    <span>{t(key)}</span>
                    <input
                      aria-label={`${t(key)} ${t("minimum")}`}
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
                      aria-label={`${t(key)} ${t("maximum")}`}
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

      {errorText && <div className="gen8underground-alert">{errorText}</div>}
      {summary?.resultLimitReached && (
        <div className="gen8underground-alert warning">{t("limitReached")}</div>
      )}
      <section className="gen8underground-results">
        <header>
          <div>
            <strong>{t("results")}</strong>
            <span className="gen8underground-status">{t(status)}</span>
          </div>
          <div className="gen8underground-result-actions">
            <span>
              {progress.resultCount} / {progress.totalStates}
            </span>
            <button
              className={showStats ? "active icon" : "icon"}
              onClick={() => setShowStats((value) => !value)}
              title={t("gen8UndergroundShowStats")}
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
        <div className="gen8underground-progress-row">
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
        <div className="gen8underground-table" ref={tableRef}>
          <div
            className="gen8underground-table-inner"
            style={{
              height: `${Math.max(122, rowVirtualizer.getTotalSize() + 42)}px`,
            }}
          >
            <div className="gen8underground-table-header">
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
              <div className="gen8underground-empty">{t("empty")}</div>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = sortedResults[virtualRow.index];
                return (
                  <div
                    className="gen8underground-table-row"
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
