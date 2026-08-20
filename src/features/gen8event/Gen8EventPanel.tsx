import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Download,
  FileUp,
  Play,
  Settings2,
  Square,
  Trash2,
} from "lucide-react";
import {
  type FormEvent,
  type MouseEvent,
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
import { DEFAULT_GEN8_BDSP_PROFILE } from "../gen8profiles/domain";
import type { Gen8ProfilesController } from "../gen8profiles/useGen8Profiles";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import {
  formatGen8EventHex32,
  GEN8_EVENT_MAX_RESULTS,
  gen8EventProfile,
  gen8EventTaskCount,
  parseGen8EventDecimal,
  parseGen8EventHex,
  parseGen8EventWondercard,
  validateGen8EventRequest,
  type Gen8EventAbilityFilter,
  type Gen8EventGenderFilter,
  type Gen8EventIvTuple,
  type Gen8EventPidType,
  type Gen8EventRequest,
  type Gen8EventResult,
  type Gen8EventShinyFilter,
} from "./domain";
import { Gen8EventUiPreviewEngine } from "./preview/Gen8EventUiPreviewEngine";
import type {
  Gen8EventEngine,
  Gen8EventProgress,
  Gen8EventSummary,
} from "./search";
import { Gen8EventWorkerPool } from "./worker/Gen8EventWorkerPool";
import "./Gen8EventPanel.css";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type ConfigTab = "settings" | "filters";
type IvText = [string, string, string, string, string, string];
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type SortKey =
  | "advances"
  | "ec"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
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

export interface Gen8EventPanelProps {
  onOpenIvCalculator(): void;
  onOpenProfileManager(): void;
  profiles: Gen8ProfilesController;
  uiPreviewMode: boolean;
}

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
const FILTER_IV_LABEL_KEYS = [
  "gen8EventHp",
  "gen8EventFilterAttack",
  "gen8EventFilterDefense",
  "gen8EventFilterSpecialAttack",
  "gen8EventFilterSpecialDefense",
  "gen8EventFilterSpeed",
] as const;
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
const COLUMNS: readonly Column[] = [
  { key: "advances", labelKey: "gen8EventAdvances", label: "Advances" },
  { key: "ec", label: "EC" },
  { key: "pid", label: "PID" },
  { key: "shiny", labelKey: "gen8EventShiny", label: "Shiny" },
  { key: "nature", labelKey: "gen8EventNature", label: "Nature" },
  { key: "ability", labelKey: "gen8EventAbility", label: "Ability" },
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "specialAttack", label: "SpA" },
  { key: "specialDefense", label: "SpD" },
  { key: "speed", label: "Spe" },
  { key: "gender", labelKey: "gen8EventGender", label: "Gender" },
  { key: "height", labelKey: "gen8EventHeight", label: "Height" },
  { key: "weight", labelKey: "gen8EventWeight", label: "Weight" },
  {
    key: "characteristic",
    labelKey: "gen8EventCharacteristic",
    label: "Characteristic",
  },
];

function compareValues(left: number | string, right: number | string) {
  return typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right));
}

function gameLabel(version: string, language: string) {
  if (language.startsWith("zh"))
    return version === "shiningpearl" ? "明亮珍珠" : "晶灿钻石";
  if (language.startsWith("ja"))
    return version === "shiningpearl"
      ? "シャイニングパール"
      : "ブリリアントダイヤモンド";
  return version === "shiningpearl" ? "Shining Pearl" : "Brilliant Diamond";
}

export function Gen8EventPanel({
  onOpenIvCalculator,
  onOpenProfileManager,
  profiles,
  uiPreviewMode,
}: Gen8EventPanelProps) {
  const { i18n, t } = useTranslation();
  const engine = useMemo<Gen8EventEngine>(
    () =>
      uiPreviewMode
        ? new Gen8EventUiPreviewEngine()
        : new Gen8EventWorkerPool(),
    [uiPreviewMode],
  );
  const [configTab, setConfigTab] = useState<ConfigTab>("settings");
  const [seed0, setSeed0] = useState("");
  const [seed1, setSeed1] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("");
  const [species, setSpecies] = useState(1);
  const [speciesInput, setSpeciesInput] = useState({
    language: i18n.language,
    species: 0,
    text: "",
  });
  const [ivCount, setIvCount] = useState(0);
  const [level, setLevel] = useState("1");
  const [pidType, setPidType] = useState<Gen8EventPidType>("nonshiny");
  const [eventAbility, setEventAbility] = useState(0);
  const [eventGender, setEventGender] = useState(0);
  const [natureLocked, setNatureLocked] = useState(false);
  const [eventNature, setEventNature] = useState(0);
  const [eventTid, setEventTid] = useState("");
  const [eventSid, setEventSid] = useState("");
  const [ec, setEc] = useState("");
  const [pid, setPid] = useState("");
  const [egg, setEgg] = useState(false);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen8EventShinyFilter>("any");
  const [gender, setGender] = useState<Gen8EventGenderFilter>("any");
  const [ability, setAbility] = useState<Gen8EventAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(0);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0);
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
  const [results, setResults] = useState<Gen8EventResult[]>([]);
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Gen8EventSummary>();
  const [progress, setProgress] = useState<Gen8EventProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "advances", direction: "asc" });
  const tableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const usingDefaultProfile =
    selectedProfile.id === DEFAULT_GEN8_BDSP_PROFILE.id;
  const busy = status === "calculating";
  const characteristics = getIvCharacteristics(i18n.language, "bdsp");
  const natureOptions = NATURE_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const hiddenPowerOptions = POWER_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const speciesOptions = useMemo(
    () =>
      Array.from({ length: 493 }, (_, index) => ({
        label: getIvSpeciesName(i18n.language, index + 1),
        value: index + 1,
      })),
    [i18n.language],
  );
  const selectedSpeciesLabel = getIvSpeciesName(i18n.language, species);
  const displayedSpecies =
    speciesInput.language === i18n.language &&
    speciesInput.species === species &&
    speciesInput.text
      ? speciesInput.text
      : selectedSpeciesLabel;

  const columnLabel = (column: Column) =>
    column.labelKey ? t(column.labelKey) : column.label;

  const resultValue = useCallback(
    (result: Gen8EventResult, key: SortKey): number | string => {
      const ivIndex = IV_KEYS.indexOf(key as IvKey);
      if (ivIndex >= 0)
        return showStats ? result.stats[ivIndex] : result.ivs[ivIndex];
      return result[key as keyof Gen8EventResult] as number | string;
    },
    [showStats],
  );

  const sortedResults = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        compareValues(
          resultValue(left, sort.key),
          resultValue(right, sort.key),
        ) * direction,
    );
  }, [resultValue, results, sort]);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const applyIvShortcut = (index: number, event: MouseEvent) => {
    const range: readonly [string, string] = event.ctrlKey
      ? event.altKey
        ? ["0", "0"]
        : ["31", "31"]
      : event.altKey
        ? ["30", "31"]
        : ["0", "31"];
    setIvMin(
      (current) =>
        current.map((value, currentIndex) =>
          currentIndex === index ? range[0] : value,
        ) as IvText,
    );
    setIvMax(
      (current) =>
        current.map((value, currentIndex) =>
          currentIndex === index ? range[1] : value,
        ) as IvText,
    );
  };

  const request = (): Gen8EventRequest => {
    if (displayedSpecies !== selectedSpeciesLabel)
      throw new TypeError("Please select a Species from the list.");
    const filtersOff = filtersDisabled;
    return {
      profile: gen8EventProfile(selectedProfile),
      seed0,
      seed1,
      initialAdvances: parseGen8EventDecimal(initialAdvances),
      maxAdvances: parseGen8EventDecimal(maxAdvances),
      offset: parseGen8EventDecimal(offset),
      event: {
        species,
        ivCount,
        level: parseGen8EventDecimal(level),
        pidType,
        ability: eventAbility,
        gender: eventGender,
        nature: natureLocked ? eventNature : null,
        tid: parseGen8EventDecimal(eventTid),
        sid: parseGen8EventDecimal(eventSid),
        ec: parseGen8EventHex(ec),
        pid: parseGen8EventHex(pid),
        egg,
      },
      filters: {
        disabled: filtersOff,
        shiny: filtersOff ? "any" : shiny,
        gender: filtersOff ? "any" : gender,
        ability: filtersOff ? "any" : ability,
        natureMask: filtersOff ? ALL_NATURES : natureMask || ALL_NATURES,
        hiddenPowerMask: filtersOff
          ? ALL_HIDDEN_POWERS
          : hiddenPowerMask || ALL_HIDDEN_POWERS,
        heightMin: filtersOff ? 0 : parseGen8EventDecimal(heightMin),
        heightMax: filtersOff ? 255 : parseGen8EventDecimal(heightMax),
        weightMin: filtersOff ? 0 : parseGen8EventDecimal(weightMin),
        weightMax: filtersOff ? 255 : parseGen8EventDecimal(weightMax),
        ivMin: (filtersOff
          ? [0, 0, 0, 0, 0, 0]
          : ivMin.map(parseGen8EventDecimal)) as Gen8EventIvTuple,
        ivMax: (filtersOff
          ? [31, 31, 31, 31, 31, 31]
          : ivMax.map(parseGen8EventDecimal)) as Gen8EventIvTuple,
      },
      resultLimit: GEN8_EVENT_MAX_RESULTS,
    };
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    let nextRequest: Gen8EventRequest;
    try {
      nextRequest = validateGen8EventRequest(request());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
      return;
    }
    const totalStates = gen8EventTaskCount(nextRequest);
    setResults([]);
    setError("");
    setSummary(undefined);
    setStatus("calculating");
    setProgress({
      processedStates: 0,
      totalStates,
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

  const importWondercard = async (file?: File) => {
    if (!file) return;
    try {
      let buffer: ArrayBuffer;
      try {
        buffer = await file.arrayBuffer();
      } catch {
        throw new Error("There was a problem opening the wondercard");
      }
      const card = parseGen8EventWondercard(buffer);
      setSpecies(card.species);
      setSpeciesInput({
        language: i18n.language,
        species: card.species,
        text: "",
      });
      setIvCount(card.ivCount);
      setLevel(String(card.level));
      setPidType(card.pidType);
      setEventAbility(card.ability);
      setEventGender(card.gender);
      setNatureLocked(card.nature !== null);
      if (card.nature !== null) setEventNature(card.nature);
      setEventTid(String(card.tid));
      setEventSid(String(card.sid));
      setEc(formatGen8EventHex32(card.ec));
      setPid(formatGen8EventHex32(card.pid));
      setEgg(card.egg);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const displayValue = (result: Gen8EventResult, key: SortKey) => {
    const ivIndex = IV_KEYS.indexOf(key as IvKey);
    if (ivIndex >= 0)
      return String(showStats ? result.stats[ivIndex] : result.ivs[ivIndex]);
    if (key === "shiny")
      return t(
        result.shiny === 2
          ? "gen8EventSquare"
          : result.shiny === 1
            ? "gen8EventStar"
            : "gen8EventNo",
      );
    if (key === "nature") return t(NATURE_KEYS[result.nature]);
    if (key === "ability") {
      const name = getGen4AbilityName(i18n.language, result.abilityIndex);
      return result.ability === 2
        ? `H (${name})`
        : `${result.ability}: ${name}`;
    }
    if (key === "gender")
      return t(
        result.gender === 0
          ? "male"
          : result.gender === 1
            ? "female"
            : "genderless",
      );
    if (key === "characteristic")
      return characteristics[result.characteristic] ?? "-";
    return String(resultValue(result, key));
  };

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      COLUMNS.map(columnLabel),
      ...sortedResults.map((result) =>
        COLUMNS.map((column) => displayValue(result, column.key)),
      ),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen8event.csv";
    anchor.click();
    URL.revokeObjectURL(url);
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

  return (
    <form className="gen8event-panel" onSubmit={run}>
      <section className="gen8event-profile-bar">
        <label className="gen8event-field">
          <span>{t("profile")}</span>
          <span className="gen8event-profile-control">
            <Select
              disabled={busy || profiles.loading}
              onChange={(event) => {
                const id = event.target.value;
                if (id !== DEFAULT_GEN8_BDSP_PROFILE.id)
                  void profiles.selectProfile(id);
              }}
              value={selectedProfile.id}
            >
              {usingDefaultProfile && (
                <option value={DEFAULT_GEN8_BDSP_PROFILE.id}>-</option>
              )}
              {bdspProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </Select>
            <button
              aria-label={t("manager")}
              className="gen8event-icon-button"
              disabled={busy}
              onClick={onOpenProfileManager}
              title={t("manager")}
              type="button"
            >
              <Settings2 aria-hidden="true" size={18} />
            </button>
          </span>
        </label>
        <dl className="gen8event-profile-values">
          <div>
            <dt>{t("game")}</dt>
            <dd>{gameLabel(selectedProfile.version, i18n.language)}</dd>
          </div>
          <div>
            <dt>TID / SID</dt>
            <dd>
              {selectedProfile.tid} / {selectedProfile.sid}
            </dd>
          </div>
        </dl>
      </section>

      <div className="gen8event-control-row">
        <section className="gen8event-rng-section">
          <div className="gen8event-section-heading">
            <h2>{t("gen8EventRngInfo")}</h2>
          </div>
          <div className="gen8event-rng-grid">
            <label className="gen8event-field gen8event-seed-field">
              <span>{t("gen8EventSeed0")}</span>
              <input
                disabled={busy}
                inputMode="text"
                maxLength={16}
                onChange={(event) =>
                  setSeed0(normalizeHexInput(event.target.value, 16))
                }
                value={seed0}
              />
            </label>
            <label className="gen8event-field gen8event-seed-field">
              <span>{t("gen8EventSeed1")}</span>
              <input
                disabled={busy}
                inputMode="text"
                maxLength={16}
                onChange={(event) =>
                  setSeed1(normalizeHexInput(event.target.value, 16))
                }
                value={seed1}
              />
            </label>
            <label className="gen8event-field">
              <span>{t("gen8EventInitialAdvances")}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setInitialAdvances(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={initialAdvances}
              />
            </label>
            <label className="gen8event-field">
              <span>{t("gen8EventMaxAdvances")}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setMaxAdvances(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={maxAdvances}
              />
            </label>
            <label className="gen8event-field gen8event-offset-field">
              <span>{t("gen8EventOffset")}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setOffset(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={offset}
              />
            </label>
          </div>
          <div className="gen8event-run-actions">
            <button className="gen8event-primary" disabled={busy} type="submit">
              <Play aria-hidden="true" size={17} />
              {t("gen8EventGenerate")}
            </button>
            <button
              aria-label={t("cancel")}
              className="gen8event-icon-button"
              disabled={!busy}
              onClick={() => engine.cancel()}
              title={t("cancel")}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
            </button>
          </div>
        </section>

        <section className="gen8event-config-section">
          <div className="gen8event-config-tabs" role="tablist">
            <button
              aria-controls="gen8event-settings-panel"
              aria-selected={configTab === "settings"}
              className={configTab === "settings" ? "active" : undefined}
              onClick={() => setConfigTab("settings")}
              role="tab"
              type="button"
            >
              {t("gen8EventSettings")}
            </button>
            <button
              aria-controls="gen8event-filters-panel"
              aria-selected={configTab === "filters"}
              className={configTab === "filters" ? "active" : undefined}
              onClick={() => setConfigTab("filters")}
              role="tab"
              type="button"
            >
              {t("gen8EventFilters")}
            </button>
          </div>

          {configTab === "settings" ? (
            <div
              className="gen8event-config-panel"
              id="gen8event-settings-panel"
              role="tabpanel"
            >
              <div className="gen8event-settings-toolbar">
                <input
                  accept=".wb8,application/octet-stream"
                  aria-label={t("gen8EventImport")}
                  className="gen8event-file-input"
                  disabled={busy}
                  onChange={(event) =>
                    void importWondercard(event.target.files?.[0])
                  }
                  ref={fileInputRef}
                  type="file"
                />
                <button
                  className="gen8event-secondary"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <FileUp aria-hidden="true" size={17} />
                  {t("gen8EventImport")}
                </button>
              </div>
              <fieldset className="gen8event-settings-grid" disabled={busy}>
                <label className="gen8event-field gen8event-species-field">
                  <span>{t("gen8EventSpecies")}</span>
                  <AutoCompleteComboBox
                    disabled={busy}
                    inputValue={displayedSpecies}
                    label={t("gen8EventSpecies")}
                    onInputChange={(text) =>
                      setSpeciesInput({
                        language: i18n.language,
                        species,
                        text,
                      })
                    }
                    onValueChange={(value) => {
                      setSpecies(value);
                      setSpeciesInput({
                        language: i18n.language,
                        species: value,
                        text: "",
                      });
                    }}
                    options={speciesOptions}
                    value={species}
                  />
                </label>
                <label className="gen8event-field">
                  <span>{t("gen8EventIvCount")}</span>
                  <input
                    inputMode="numeric"
                    max="3"
                    min="0"
                    onChange={(event) =>
                      setIvCount(
                        parseGen8EventDecimal(
                          normalizeDecimalInput(event.target.value, 3, 1),
                        ),
                      )
                    }
                    value={ivCount}
                  />
                </label>
                <label className="gen8event-field">
                  <span>{t("gen8EventLevel")}</span>
                  <input
                    inputMode="numeric"
                    max="100"
                    min="1"
                    onChange={(event) =>
                      setLevel(
                        normalizeDecimalInput(event.target.value, 100, 3),
                      )
                    }
                    value={level}
                  />
                </label>
                <label className="gen8event-field">
                  <span>{t("gen8EventPidType")}</span>
                  <Select
                    onChange={(event) =>
                      setPidType(event.target.value as Gen8EventPidType)
                    }
                    value={pidType}
                  >
                    <option value="nonshiny">{t("gen8EventNonshiny")}</option>
                    <option value="random">{t("gen8EventRandom")}</option>
                    <option value="star">{t("gen8EventStar")}</option>
                    <option value="square">{t("gen8EventSquare")}</option>
                    <option value="static">{t("gen8EventStatic")}</option>
                  </Select>
                </label>
                <label className="gen8event-field">
                  <span>{t("gen8EventAbility")}</span>
                  <Select
                    onChange={(event) =>
                      setEventAbility(Number(event.target.value))
                    }
                    value={eventAbility}
                  >
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>H</option>
                    <option value={3}>1/2</option>
                    <option value={4}>1/2/H</option>
                  </Select>
                </label>
                <label className="gen8event-field">
                  <span>{t("gen8EventGender")}</span>
                  <Select
                    onChange={(event) =>
                      setEventGender(Number(event.target.value))
                    }
                    value={eventGender}
                  >
                    <option value={0}>♂</option>
                    <option value={1}>♀</option>
                    <option value={2}>-</option>
                  </Select>
                </label>
                <label className="gen8event-toggle gen8event-nature-lock">
                  <input
                    checked={natureLocked}
                    onChange={(event) => setNatureLocked(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen8EventNatureLocked")}</span>
                </label>
                <label className="gen8event-field">
                  <span>{t("gen8EventNature")}</span>
                  <Select
                    disabled={!natureLocked}
                    onChange={(event) =>
                      setEventNature(Number(event.target.value))
                    }
                    value={eventNature}
                  >
                    {NATURE_KEYS.map((key, value) => (
                      <option key={key} value={value}>
                        {t(key)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="gen8event-field">
                  <span>TID</span>
                  <input
                    inputMode="numeric"
                    maxLength={5}
                    onChange={(event) =>
                      setEventTid(
                        normalizeDecimalInput(event.target.value, 0xffff, 5),
                      )
                    }
                    value={eventTid}
                  />
                </label>
                <label className="gen8event-field">
                  <span>SID</span>
                  <input
                    inputMode="numeric"
                    maxLength={5}
                    onChange={(event) =>
                      setEventSid(
                        normalizeDecimalInput(event.target.value, 0xffff, 5),
                      )
                    }
                    value={eventSid}
                  />
                </label>
                <label className="gen8event-field">
                  <span>EC</span>
                  <input
                    inputMode="text"
                    maxLength={8}
                    onChange={(event) =>
                      setEc(normalizeHexInput(event.target.value, 8))
                    }
                    value={ec}
                  />
                </label>
                <label className="gen8event-field">
                  <span>PID</span>
                  <input
                    inputMode="text"
                    maxLength={8}
                    onChange={(event) =>
                      setPid(normalizeHexInput(event.target.value, 8))
                    }
                    value={pid}
                  />
                </label>
                <label className="gen8event-toggle gen8event-egg-toggle">
                  <input
                    checked={egg}
                    onChange={(event) => setEgg(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen8EventEgg")}</span>
                </label>
              </fieldset>
            </div>
          ) : (
            <div
              className="gen8event-config-panel gen8event-filter-panel"
              id="gen8event-filters-panel"
              role="tabpanel"
            >
              <div className="gen8event-filter-toolbar">
                <label className="gen8event-toggle">
                  <input
                    checked={filtersDisabled}
                    disabled={busy}
                    onChange={(event) =>
                      setFiltersDisabled(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{t("gen8EventDisableFilters")}</span>
                </label>
                <label className="gen8event-toggle">
                  <input
                    checked={showStats}
                    onChange={(event) => setShowStats(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen8EventShowStats")}</span>
                </label>
                <button
                  className="gen8event-secondary"
                  onClick={onOpenIvCalculator}
                  type="button"
                >
                  {t("ivCalculator")}
                </button>
              </div>
              <fieldset
                className="gen8event-filter-fields"
                disabled={filtersDisabled || busy}
              >
                <div className="gen8event-filter-selects">
                  <label className="gen8event-field">
                    <span>{t("gen8EventShiny")}</span>
                    <Select
                      onChange={(event) =>
                        setShiny(event.target.value as Gen8EventShinyFilter)
                      }
                      value={shiny}
                    >
                      <option value="any">{t("gen8EventAny")}</option>
                      <option value="star">{t("gen8EventStar")}</option>
                      <option value="square">{t("gen8EventSquare")}</option>
                      <option value="starSquare">
                        {t("gen8EventStarSquare")}
                      </option>
                    </Select>
                  </label>
                  <label className="gen8event-field">
                    <span>{t("gen8EventGender")}</span>
                    <Select
                      onChange={(event) =>
                        setGender(event.target.value as Gen8EventGenderFilter)
                      }
                      value={gender}
                    >
                      <option value="any">{t("gen8EventAny")}</option>
                      <option value="male">♂</option>
                      <option value="female">♀</option>
                    </Select>
                  </label>
                  <label className="gen8event-field">
                    <span>{t("gen8EventAbility")}</span>
                    <Select
                      onChange={(event) =>
                        setAbility(event.target.value as Gen8EventAbilityFilter)
                      }
                      value={ability}
                    >
                      <option value="any">{t("gen8EventAny")}</option>
                      <option value="first">0</option>
                      <option value="second">1</option>
                      <option value="hidden">H</option>
                    </Select>
                  </label>
                  <MultiCheckSelect
                    anyLabel={t("gen8EventAny")}
                    label={t("gen8EventNature")}
                    mask={natureMask}
                    onChange={setNatureMask}
                    options={natureOptions}
                    resetHint={t("checkListResetHint")}
                  />
                  <MultiCheckSelect
                    anyLabel={t("gen8EventAny")}
                    label={t("gen8EventHiddenPower")}
                    mask={hiddenPowerMask}
                    onChange={setHiddenPowerMask}
                    options={hiddenPowerOptions}
                    resetHint={t("checkListResetHint")}
                  />
                </div>
                <div className="gen8event-measure-filters">
                  <div className="gen8event-measure-range">
                    <span>{t("gen8EventHeight")}</span>
                    <input
                      aria-label={`${t("gen8EventHeight")} ${t("minimum")}`}
                      inputMode="numeric"
                      max="255"
                      min="0"
                      onChange={(event) =>
                        setHeightMin(
                          normalizeDecimalInput(event.target.value, 255, 3),
                        )
                      }
                      value={heightMin}
                    />
                    <input
                      aria-label={`${t("gen8EventHeight")} ${t("maximum")}`}
                      inputMode="numeric"
                      max="255"
                      min="0"
                      onChange={(event) =>
                        setHeightMax(
                          normalizeDecimalInput(event.target.value, 255, 3),
                        )
                      }
                      value={heightMax}
                    />
                  </div>
                  <div className="gen8event-measure-range">
                    <span>{t("gen8EventWeight")}</span>
                    <input
                      aria-label={`${t("gen8EventWeight")} ${t("minimum")}`}
                      inputMode="numeric"
                      max="255"
                      min="0"
                      onChange={(event) =>
                        setWeightMin(
                          normalizeDecimalInput(event.target.value, 255, 3),
                        )
                      }
                      value={weightMin}
                    />
                    <input
                      aria-label={`${t("gen8EventWeight")} ${t("maximum")}`}
                      inputMode="numeric"
                      max="255"
                      min="0"
                      onChange={(event) =>
                        setWeightMax(
                          normalizeDecimalInput(event.target.value, 255, 3),
                        )
                      }
                      value={weightMax}
                    />
                  </div>
                </div>
                <div className="gen8event-iv-filter">
                  {IV_KEYS.map((key, index) => (
                    <div className="gen8event-iv-range" key={key}>
                      <button
                        onClick={(event) => applyIvShortcut(index, event)}
                        title={t("ivShortcutHint")}
                        type="button"
                      >
                        {t(FILTER_IV_LABEL_KEYS[index])}
                      </button>
                      <input
                        aria-label={`${t(FILTER_IV_LABEL_KEYS[index])} ${t("minimum")}`}
                        inputMode="numeric"
                        max="31"
                        min="0"
                        onChange={(event) =>
                          setIvMin(
                            (current) =>
                              current.map((value, currentIndex) =>
                                currentIndex === index
                                  ? normalizeDecimalInput(
                                      event.target.value,
                                      31,
                                      2,
                                    )
                                  : value,
                              ) as IvText,
                          )
                        }
                        value={ivMin[index]}
                      />
                      <input
                        aria-label={`${t(FILTER_IV_LABEL_KEYS[index])} ${t("maximum")}`}
                        inputMode="numeric"
                        max="31"
                        min="0"
                        onChange={(event) =>
                          setIvMax(
                            (current) =>
                              current.map((value, currentIndex) =>
                                currentIndex === index
                                  ? normalizeDecimalInput(
                                      event.target.value,
                                      31,
                                      2,
                                    )
                                  : value,
                              ) as IvText,
                          )
                        }
                        value={ivMax[index]}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </section>
      </div>

      <section aria-busy={busy} className="gen8event-results">
        <div className="gen8event-results-toolbar">
          <div className="gen8event-status-group">
            <strong>{t("results")}</strong>
            <span className={`gen8event-run-status ${status}`}>
              {t(status)}
            </span>
          </div>
          <div className="gen8event-result-actions">
            <output>
              {results.length.toLocaleString()} /{" "}
              {progress.totalStates.toLocaleString()}
            </output>
            <button
              aria-label={t("exportCsv")}
              className="gen8event-icon-button"
              disabled={results.length === 0}
              onClick={exportCsv}
              title={t("exportCsv")}
              type="button"
            >
              <Download aria-hidden="true" size={17} />
            </button>
            <button
              aria-label={t("clear")}
              className="gen8event-icon-button"
              disabled={results.length === 0 || busy}
              onClick={clearResults}
              title={t("clear")}
              type="button"
            >
              <Trash2 aria-hidden="true" size={17} />
            </button>
          </div>
        </div>
        <div className="gen8event-progress-row">
          <progress
            aria-label={`${progress.percent.toFixed(1)}%`}
            max={100}
            value={Math.min(100, progress.percent)}
          />
          <span>{progress.percent.toFixed(1)}%</span>
        </div>
        {(error || profiles.error) && (
          <div className="gen8event-alert" role="alert">
            {error || profiles.error}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="gen8event-alert warning" role="status">
            {t("limitReached")}
          </div>
        )}
        <div className="gen8event-table-shell" ref={tableRef}>
          <div
            aria-colcount={COLUMNS.length}
            aria-label={t("results")}
            aria-rowcount={sortedResults.length + 1}
            className="gen8event-virtual-table"
            role="grid"
            style={{ height: `${rowVirtualizer.getTotalSize() + 42}px` }}
          >
            <div
              aria-rowindex={1}
              className="gen8event-table-header"
              role="row"
            >
              {COLUMNS.map((column) => (
                <span
                  aria-sort={
                    sort.key === column.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  key={column.key}
                  role="columnheader"
                >
                  <button
                    onClick={() =>
                      setSort((current) => ({
                        key: column.key,
                        direction:
                          current.key === column.key &&
                          current.direction === "asc"
                            ? "desc"
                            : "asc",
                      }))
                    }
                    type="button"
                  >
                    {columnLabel(column)}
                    {sort.key === column.key &&
                      (sort.direction === "asc" ? " ↑" : " ↓")}
                  </button>
                </span>
              ))}
            </div>
            {sortedResults.length === 0 && (
              <div
                aria-rowindex={2}
                className="gen8event-empty-state"
                role="row"
              >
                <span role="gridcell">
                  {busy ? t("calculating") : t("emptyGen8Event")}
                </span>
              </div>
            )}
            {rowVirtualizer.getVirtualItems().map((row) => {
              const result = sortedResults[row.index];
              return (
                <div
                  aria-rowindex={row.index + 2}
                  className="gen8event-table-row"
                  key={`${result.advances}-${result.ec}-${result.pid}-${row.index}`}
                  role="row"
                  style={{ transform: `translateY(${row.start + 42}px)` }}
                >
                  {COLUMNS.map((column) => (
                    <span
                      key={column.key}
                      role="gridcell"
                      title={displayValue(result, column.key)}
                    >
                      {displayValue(result, column.key)}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </form>
  );
}
