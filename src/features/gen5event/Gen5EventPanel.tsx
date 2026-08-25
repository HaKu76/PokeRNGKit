import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import {
  getGen4AbilityName,
  getIvBaseStats,
  getIvCharacteristics,
  getIvSpeciesName,
} from "../gen4ivcalculator/gen4IvData";
import { Gen4AdvancePanel } from "../gen4advance/Gen4AdvancePanel";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { PerfectIvFilterFields } from "../shared/PerfectIvFilterFields";
import { loadGen5EventDates, saveGen5EventDates } from "./dateSettings";
import {
  formatGen5EventButtons,
  gen5EventProfile,
  normalizeGen5EventSeed,
  validateGen5EventRequest,
  type Gen5EventFilters,
  type Gen5EventIvTuple,
  type Gen5EventMode,
  type Gen5EventRequest,
  type Gen5EventResult,
  type Gen5EventTemplate,
} from "./domain";
import { parseGen5EventPgf } from "./pgf";
import { Gen5EventUiPreviewEngine } from "./preview/Gen5EventUiPreviewEngine";
import type { Gen5EventEngine, Gen5EventSummary } from "./search";
import { Gen5EventWorkerPool } from "./worker/Gen5EventWorkerPool";
import "./Gen5EventPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvTextTuple = [string, string, string, string, string, string];
type SortDirection = "asc" | "desc";
type SortKey =
  | "seed"
  | "advances"
  | "chatot"
  | "needle"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | "hp"
  | "attack"
  | "defense"
  | "specialAttack"
  | "specialDefense"
  | "speed"
  | "hiddenPower"
  | "hiddenPowerStrength"
  | "gender"
  | "characteristic"
  | "dateTime"
  | "timer0"
  | "buttonMask";

interface ResultColumn {
  key: SortKey;
  label: string;
}

export interface Gen5EventPanelProps {
  uiPreviewMode: boolean;
  onOpenProfileManager(): void;
}

const MODES = ["generator", "searcher"] as const;
const IV_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const IV_SORT_KEYS = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
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
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const DEFAULT_EVENT: Gen5EventTemplate = {
  tid: 0,
  sid: 0,
  species: 1,
  nature: 255,
  gender: 2,
  ability: 3,
  shiny: 0,
  level: 1,
  egg: false,
  ivs: [null, null, null, null, null, null],
};

function versionLabel(version: string) {
  return {
    black: "Black",
    white: "White",
    black2: "Black 2",
    white2: "White 2",
  }[version];
}

function chatotLabel(value: number) {
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

function needleLabel(value: number) {
  return ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][value] ?? String(value);
}

function computeStats(
  result: Gen5EventResult,
  species: number,
  nature: number,
  level: number,
) {
  const base = getIvBaseStats("bw2", species);
  const statMap = [1, 2, 5, 3, 4];
  const raised = statMap[Math.floor(nature / 5)];
  const lowered = statMap[nature % 5];
  return base.map((value, index) => {
    if (index === 0)
      return (
        Math.floor(((2 * value + result.ivs[index]) * level) / 100) + level + 10
      );
    const raw = Math.floor(((2 * value + result.ivs[index]) * level) / 100) + 5;
    const modifier =
      raised === lowered
        ? 100
        : raised === index
          ? 110
          : lowered === index
            ? 90
            : 100;
    return Math.floor((raw * modifier) / 100);
  });
}

function updateTuple(
  tuple: IvTextTuple,
  index: number,
  value: string,
): IvTextTuple {
  const next = [...tuple] as IvTextTuple;
  next[index] = normalizeDecimalInput(value, 31, 2);
  return next;
}

export function Gen5EventPanel({
  uiPreviewMode,
  onOpenProfileManager,
}: Gen5EventPanelProps) {
  const { i18n, t } = useTranslation();
  const profiles = useGen5Profiles();
  const engine = useMemo<Gen5EventEngine>(
    () =>
      uiPreviewMode
        ? new Gen5EventUiPreviewEngine()
        : new Gen5EventWorkerPool(),
    [uiPreviewMode],
  );
  const dates = useMemo(
    () =>
      loadGen5EventDates(
        typeof localStorage === "undefined" ? undefined : localStorage,
      ),
    [],
  );
  const [mode, setMode] = useState<Gen5EventMode>("generator");
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [generatorMaxAdvances, setGeneratorMaxAdvances] = useState("1000");
  const [searcherMaxAdvances, setSearcherMaxAdvances] = useState("100");
  const [offset, setOffset] = useState("");
  const [startDate, setStartDate] = useState(dates.startDate);
  const [endDate, setEndDate] = useState(dates.endDate);
  const [eventSettings, setEventSettings] =
    useState<Gen5EventTemplate>(DEFAULT_EVENT);
  const [resultSpecies, setResultSpecies] = useState(DEFAULT_EVENT.species);
  const [speciesInput, setSpeciesInput] = useState("");
  const [eventTid, setEventTid] = useState("");
  const [eventSid, setEventSid] = useState("");
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [ivMin, setIvMin] = useState<IvTextTuple>([
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
  ]);
  const [ivMax, setIvMax] = useState<IvTextTuple>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [perfectIvValue, setPerfectIvValue] = useState("31");
  const [perfectIvCount, setPerfectIvCount] = useState("0");
  const [natureMask, setNatureMask] = useState(ALL_NATURES);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(ALL_HIDDEN_POWERS);
  const [abilityFilter, setAbilityFilter] = useState<0 | 1 | 2 | 255>(255);
  const [genderFilter, setGenderFilter] = useState<0 | 1 | 2 | 255>(255);
  const [shinyFilter, setShinyFilter] = useState<1 | 2 | 3 | 255>(255);
  const [results, setResults] = useState<Gen5EventResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<Gen5EventResult>();
  const [advanceFinderExpanded, setAdvanceFinderExpanded] = useState(false);
  const [summary, setSummary] = useState<Gen5EventSummary>();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "advances",
    direction: "asc",
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const busy = status === "calculating";
  const chinese = i18n.language.startsWith("zh");
  const profile = profiles.selectedProfile;

  useEffect(() => () => engine.dispose(), [engine]);

  const labels = {
    profile: t("profile"),
    manager: t("gen5ProfilesModule"),
    game: chinese ? "游戏" : "Game",
    dsType: chinese ? "机型" : "DS Type",
    generator: chinese ? "生成器" : "Generator",
    searcher: chinese ? "检索器" : "Searcher",
    rngInfo: chinese ? "乱数信息" : "RNG Info",
    initialAdvances: chinese ? "初始帧" : "Initial Advances",
    maxAdvances: chinese ? "最大帧数" : "Max Advances",
    seed: "Seed",
    offset: "Offset",
    startDate: chinese ? "起始日期" : "Start Date",
    endDate: chinese ? "最后日期" : "End Date",
    settings: chinese ? "设置" : "Settings",
    species: chinese ? "种类" : "Species",
    ability: chinese ? "特性" : "Ability",
    gender: chinese ? "性别" : "Gender",
    maleOnly: chinese ? "仅 ♂" : "♂ Only",
    femaleOnly: chinese ? "仅 ♀" : "♀ Only",
    random: chinese ? "随机" : "Random",
    nature: chinese ? "性格" : "Nature",
    shiny: chinese ? "异色" : "Shiny",
    eventTid: chinese ? "配信TID" : "Event TID",
    eventSid: chinese ? "配信SID" : "Event SID",
    egg: chinese ? "孵化乱数" : "Egg",
    import: chinese ? "导入" : "Import",
    filters: chinese ? "筛选项" : "Filters",
    level: chinese ? "等级" : "Level",
    never: chinese ? "不能" : "Never",
    always: chinese ? "必定" : "Always",
    generate: chinese ? "生成" : "Generate",
    search: chinese ? "检索" : "Search",
    cancel: chinese ? "取消" : "Cancel",
    disableFilters: t("disableFilters"),
    showStats: t("showStats"),
    any: chinese ? "任意" : "Any",
    results: t("results"),
    ready: chinese ? "就绪" : "Ready",
    calculating: chinese ? "计算中" : "Calculating",
    completed: chinese ? "已完成" : "Completed",
    cancelled: chinese ? "已取消" : "Cancelled",
    failed: chinese ? "失败" : "Failed",
    noProfile: chinese ? "请选择一个存档信息" : "Please select a profile",
  };

  const speciesOptions = useMemo(
    () =>
      Array.from({ length: 649 }, (_, index) => ({
        value: index + 1,
        label: getIvSpeciesName(i18n.language, index + 1),
      })),
    [i18n.language],
  );
  const natureOptions = useMemo(
    () => NATURE_KEYS.map((key, value) => ({ label: t(key), value })),
    [t],
  );
  const powerOptions = useMemo(
    () => POWER_KEYS.map((key, value) => ({ label: t(key), value })),
    [t],
  );
  const displayedSpecies =
    speciesInput || getIvSpeciesName(i18n.language, eventSettings.species);
  const characteristics = getIvCharacteristics(i18n.language, "bw2");
  const profileSummary = profile
    ? [
        [labels.game, versionLabel(profile.version)],
        ["TID", String(profile.tid)],
        ["SID", String(profile.sid)],
        [
          "Timer0",
          `${profile.timer0Min.toString(16).toUpperCase()}-${profile.timer0Max
            .toString(16)
            .toUpperCase()}`,
        ],
        [labels.dsType, profile.dsType.toUpperCase()],
      ]
    : [];

  const columns: ResultColumn[] =
    mode === "generator"
      ? [
          { key: "advances", label: chinese ? "帧数" : "Advances" },
          { key: "chatot", label: chinese ? "音高" : "Chatot" },
          { key: "needle", label: "Needle" },
          { key: "pid", label: "PID" },
          { key: "shiny", label: labels.shiny },
          { key: "nature", label: labels.nature },
          { key: "ability", label: labels.ability },
          ...IV_SORT_KEYS.map((key, index) => ({
            key,
            label: IV_LABELS[index],
          })),
          { key: "hiddenPower", label: chinese ? "觉醒属性" : "Hidden" },
          { key: "hiddenPowerStrength", label: chinese ? "觉醒威力" : "Power" },
          { key: "gender", label: labels.gender },
          { key: "characteristic", label: t("characteristic") },
        ]
      : [
          { key: "seed", label: "Seed" },
          { key: "advances", label: chinese ? "帧数" : "Advances" },
          { key: "pid", label: "PID" },
          { key: "shiny", label: labels.shiny },
          { key: "nature", label: labels.nature },
          { key: "ability", label: labels.ability },
          ...IV_SORT_KEYS.map((key, index) => ({
            key,
            label: IV_LABELS[index],
          })),
          { key: "hiddenPower", label: chinese ? "觉醒属性" : "Hidden" },
          { key: "hiddenPowerStrength", label: chinese ? "觉醒威力" : "Power" },
          { key: "gender", label: labels.gender },
          { key: "characteristic", label: t("characteristic") },
          { key: "dateTime", label: "Date/Time" },
          { key: "timer0", label: "Timer0" },
          { key: "buttonMask", label: "Buttons" },
        ];

  const resultValue = (result: Gen5EventResult, key: SortKey) => {
    const ivIndex = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
    if (ivIndex >= 0)
      return showStats
        ? computeStats(result, resultSpecies, result.nature, result.level)[
            ivIndex
          ]
        : result.ivs[ivIndex];
    if (key === "seed" || key === "pid" || key === "dateTime")
      return result[key] ?? "";
    if (key === "timer0" || key === "buttonMask") return result[key] ?? -1;
    return result[key as Exclude<SortKey, (typeof IV_SORT_KEYS)[number]>];
  };

  const rowValues = (result: Gen5EventResult) => {
    const stats = showStats
      ? computeStats(result, resultSpecies, result.nature, result.level)
      : result.ivs;
    const common = [
      result.pid,
      result.shiny === 0
        ? chinese
          ? "否"
          : "No"
        : result.shiny === 1
          ? chinese
            ? "星星"
            : "Star"
          : chinese
            ? "方块"
            : "Square",
      t(NATURE_KEYS[result.nature]),
      `${result.ability === 2 ? "H" : result.ability}: ${getGen4AbilityName(
        i18n.language,
        result.abilityIndex,
      )}`,
      ...stats.map(String),
      t(POWER_KEYS[result.hiddenPower]),
      String(result.hiddenPowerStrength),
      t(
        result.gender === 0
          ? "male"
          : result.gender === 1
            ? "female"
            : "genderless",
      ),
      characteristics[result.characteristic],
    ];
    if (mode === "generator")
      return [
        String(result.advances),
        chatotLabel(result.chatot),
        needleLabel(result.needle),
        ...common,
      ];
    return [
      result.seed,
      String(result.advances),
      ...common,
      result.dateTime ?? "",
      result.timer0 === undefined
        ? ""
        : result.timer0.toString(16).toUpperCase(),
      result.buttonMask === undefined
        ? ""
        : formatGen5EventButtons(result.buttonMask),
    ];
  };

  const sortedResults = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...results].sort((left, right) => {
      const leftValue = resultValue(left, sort.key);
      const rightValue = resultValue(right, sort.key);
      const comparison =
        typeof leftValue === "string" && typeof rightValue === "string"
          ? leftValue.localeCompare(rightValue)
          : Number(leftValue) - Number(rightValue);
      return comparison * direction;
    });
    // Displayed stats depend on the imported wondercard and view mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultSpecies, results, showStats, sort]);
  const advanceFinderRows = useMemo(
    () => ({
      chatot: results.map((result) => ({
        advances: result.advances,
        value: result.chatot,
      })),
      needles: results.map((result) => ({
        advances: result.advances,
        value: result.needle,
      })),
    }),
    [results],
  );

  // TanStack Virtual exposes mutable imperative functions by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const focusResultAtIndex = (index: number, align: "auto" | "center") => {
    const result = sortedResults[index];
    if (!result) return;
    setSelectedResult(result);
    rowVirtualizer.scrollToIndex(index, { align });
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        tableRef.current
          ?.querySelector<HTMLElement>(`[data-row-index="${index}"]`)
          ?.focus(),
      ),
    );
  };

  const buildFilters = (): Gen5EventFilters => ({
    disabled: mode === "generator" && filtersDisabled,
    ability: abilityFilter,
    gender: genderFilter,
    shiny: shinyFilter,
    natureMask,
    hiddenPowerMask,
    ivMin: ivMin.map((value) => Number(value || "0")) as Gen5EventIvTuple,
    ivMax: ivMax.map((value) => Number(value || "0")) as Gen5EventIvTuple,
    perfectIvValue: Number(perfectIvValue || "0"),
    perfectIvCount: Number(perfectIvCount || "0"),
  });

  const buildRequest = (): Gen5EventRequest => {
    const selectedSpeciesLabel = getIvSpeciesName(
      i18n.language,
      eventSettings.species,
    );
    if (displayedSpecies !== selectedSpeciesLabel)
      throw new TypeError("Please select a Species from the list.");
    const common = {
      profile: gen5EventProfile(profile!),
      initialAdvances: Number(initialAdvances || "0"),
      maxAdvances: Number(
        (mode === "generator" ? generatorMaxAdvances : searcherMaxAdvances) ||
          "0",
      ),
      offset: mode === "generator" ? Number(offset || "0") : 0,
      event: {
        ...eventSettings,
        tid: Number(eventTid || "0"),
        sid: Number(eventSid || "0"),
      },
      filters: {
        ...buildFilters(),
        disabled: mode === "generator" && filtersDisabled,
      },
      resultLimit: 100_000,
    };
    return mode === "generator"
      ? { ...common, mode, seed }
      : { ...common, mode, startDate, endDate };
  };

  const run = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    if (busy) return;
    if (!profile) {
      setError(labels.noProfile);
      setStatus("failed");
      return;
    }
    try {
      const request = buildRequest();
      validateGen5EventRequest(request);
      if (request.mode === "searcher")
        saveGen5EventDates(
          typeof localStorage === "undefined" ? undefined : localStorage,
          { startDate, endDate },
        );
      setError("");
      setResultSpecies(request.event.species);
      setResults([]);
      setSelectedResult(undefined);
      setAdvanceFinderExpanded(false);
      setSummary(undefined);
      setProgress(0);
      setStatus("calculating");
      const next = await engine.search(request, {
        onBatch: setResults,
        onProgress: (value) => setProgress(value.percent),
      });
      setSummary(next);
      setProgress(next.percent);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const changeMode = (next: Gen5EventMode) => {
    setMode(next);
    setResults([]);
    setSelectedResult(undefined);
    setAdvanceFinderExpanded(false);
    setSummary(undefined);
    setProgress(0);
    setStatus("ready");
    setError("");
    setSort({
      key: next === "generator" ? "advances" : "seed",
      direction: "asc",
    });
  };

  const handleTabKeyDown = (
    keyboardEvent: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (keyboardEvent.key === "ArrowLeft" || keyboardEvent.key === "ArrowUp")
      nextIndex = (index - 1 + MODES.length) % MODES.length;
    else if (
      keyboardEvent.key === "ArrowRight" ||
      keyboardEvent.key === "ArrowDown"
    )
      nextIndex = (index + 1) % MODES.length;
    else if (keyboardEvent.key === "Home") nextIndex = 0;
    else if (keyboardEvent.key === "End") nextIndex = MODES.length - 1;
    if (nextIndex === undefined) return;
    keyboardEvent.preventDefault();
    changeMode(MODES[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  };

  const importPgf = async (changeEvent: ChangeEvent<HTMLInputElement>) => {
    const file = changeEvent.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseGen5EventPgf(await file.arrayBuffer());
      setEventSettings(parsed);
      setSpeciesInput("");
      setEventTid(String(parsed.tid));
      setEventSid(String(parsed.sid));
      setError("");
      setResults([]);
      setSelectedResult(undefined);
      setAdvanceFinderExpanded(false);
      setSummary(undefined);
      setStatus("ready");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(
        message === "Wondercard is not the correct size"
          ? `Invalid format: ${message}`
          : message === "Invalid format"
            ? message
            : "File error: There was a problem opening the wondercard",
      );
      setStatus("failed");
    } finally {
      changeEvent.target.value = "";
    }
  };

  return (
    <div className="gen5event-panel">
      <section className="gen5event-profile panel">
        <div className="gen5event-profile-heading">
          <h2>{labels.profile}</h2>
          <div className="gen5event-profile-actions">
            <label className="field">
              <span>{labels.profile}</span>
              <Select
                disabled={busy || profiles.loading || profiles.busy}
                onChange={(profileEvent) =>
                  void profiles.selectProfile(profileEvent.target.value || null)
                }
                value={profiles.selectedProfileId ?? ""}
              >
                <option value="" />
                {profiles.profiles.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </Select>
            </label>
            <button
              className="secondary-action"
              disabled={busy}
              onClick={onOpenProfileManager}
              type="button"
            >
              {labels.manager}
            </button>
          </div>
        </div>
        {profile && (
          <dl className="gen5event-profile-values">
            {profileSummary.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <div
        className="gen5event-mode-tabs"
        role="tablist"
        aria-label="Event operation"
      >
        {MODES.map((value, index) => (
          <button
            aria-controls="gen5event-workspace"
            aria-selected={mode === value}
            className={mode === value ? "active" : ""}
            disabled={busy}
            id={`gen5event-${value}-tab`}
            key={value}
            onClick={() => changeMode(value)}
            onKeyDown={(keyboardEvent) =>
              handleTabKeyDown(keyboardEvent, index)
            }
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={mode === value ? 0 : -1}
            type="button"
          >
            {labels[value]}
          </button>
        ))}
      </div>

      <form
        aria-labelledby={`gen5event-${mode}-tab`}
        className="gen5event-workspace"
        id="gen5event-workspace"
        onSubmit={run}
      >
        <section className="gen5event-section gen5event-rng panel">
          <div className="panel-heading compact">
            <h2>{labels.rngInfo}</h2>
          </div>
          <div className="gen5event-form-grid">
            {mode === "generator" ? (
              <label className="field gen5event-wide">
                <span>{labels.seed}</span>
                <input
                  disabled={busy}
                  maxLength={16}
                  onChange={(inputEvent) =>
                    setSeed(normalizeGen5EventSeed(inputEvent.target.value))
                  }
                  spellCheck={false}
                  value={seed}
                />
              </label>
            ) : (
              <>
                <label className="field">
                  <span>{labels.startDate}</span>
                  <input
                    disabled={busy}
                    max="2099-12-31"
                    min="2000-01-01"
                    onChange={(inputEvent) =>
                      setStartDate(inputEvent.target.value)
                    }
                    type="date"
                    value={startDate}
                  />
                </label>
                <label className="field">
                  <span>{labels.endDate}</span>
                  <input
                    disabled={busy}
                    max="2099-12-31"
                    min="2000-01-01"
                    onChange={(inputEvent) =>
                      setEndDate(inputEvent.target.value)
                    }
                    type="date"
                    value={endDate}
                  />
                </label>
              </>
            )}
            <label className="field">
              <span>{labels.initialAdvances}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(inputEvent) =>
                  setInitialAdvances(
                    normalizeDecimalInput(
                      inputEvent.target.value,
                      0xffff_ffff,
                      10,
                    ),
                  )
                }
                value={initialAdvances}
              />
            </label>
            <label className="field">
              <span>{labels.maxAdvances}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(inputEvent) => {
                  const value = normalizeDecimalInput(
                    inputEvent.target.value,
                    0xffff_ffff,
                    10,
                  );
                  if (mode === "generator") setGeneratorMaxAdvances(value);
                  else setSearcherMaxAdvances(value);
                }}
                value={
                  mode === "generator"
                    ? generatorMaxAdvances
                    : searcherMaxAdvances
                }
              />
            </label>
            {mode === "generator" && (
              <label className="field">
                <span>{labels.offset}</span>
                <input
                  disabled={busy}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(inputEvent) =>
                    setOffset(
                      normalizeDecimalInput(
                        inputEvent.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={offset}
                />
              </label>
            )}
          </div>
        </section>

        <section className="gen5event-section gen5event-settings panel">
          <div className="gen5event-section-heading">
            <div className="panel-heading compact">
              <h2>{labels.settings}</h2>
            </div>
            <div className="gen5event-import">
              <input
                accept=".pgf"
                hidden
                onChange={importPgf}
                ref={importRef}
                type="file"
              />
              <button
                className="secondary-action"
                disabled={busy}
                onClick={() => importRef.current?.click()}
                type="button"
              >
                {labels.import}
              </button>
            </div>
          </div>
          <div className="gen5event-settings-grid">
            <label className="field gen5event-species">
              <span>{labels.species}</span>
              <AutoCompleteComboBox
                disabled={busy}
                inputValue={displayedSpecies}
                label={labels.species}
                onInputChange={setSpeciesInput}
                onValueChange={(value) => {
                  setEventSettings((current) => ({
                    ...current,
                    species: value,
                  }));
                  setSpeciesInput("");
                }}
                options={speciesOptions}
                value={eventSettings.species}
              />
            </label>
            <label className="field">
              <span>{labels.ability}</span>
              <Select
                disabled={busy}
                onChange={(inputEvent) =>
                  setEventSettings((current) => ({
                    ...current,
                    ability: Number(
                      inputEvent.target.value,
                    ) as Gen5EventTemplate["ability"],
                  }))
                }
                value={eventSettings.ability}
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>H</option>
                <option value={3}>0/1</option>
              </Select>
            </label>
            <label className="field">
              <span>{labels.gender}</span>
              <Select
                disabled={busy}
                onChange={(inputEvent) =>
                  setEventSettings((current) => ({
                    ...current,
                    gender: Number(
                      inputEvent.target.value,
                    ) as Gen5EventTemplate["gender"],
                  }))
                }
                value={eventSettings.gender}
              >
                <option value={0}>{labels.maleOnly}</option>
                <option value={1}>{labels.femaleOnly}</option>
                <option value={2}>{labels.random}</option>
              </Select>
            </label>
            <label className="field">
              <span>{labels.shiny}</span>
              <Select
                disabled={busy}
                onChange={(inputEvent) =>
                  setEventSettings((current) => ({
                    ...current,
                    shiny: Number(
                      inputEvent.target.value,
                    ) as Gen5EventTemplate["shiny"],
                  }))
                }
                value={eventSettings.shiny}
              >
                <option value={0}>{labels.random}</option>
                <option value={1}>{labels.never}</option>
                <option value={2}>{labels.always}</option>
              </Select>
            </label>
            <label className="field">
              <span>{labels.eventTid}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={5}
                onChange={(inputEvent) =>
                  setEventTid(
                    normalizeDecimalInput(inputEvent.target.value, 65535, 5),
                  )
                }
                value={eventTid}
              />
            </label>
            <label className="field">
              <span>{labels.eventSid}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={5}
                onChange={(inputEvent) =>
                  setEventSid(
                    normalizeDecimalInput(inputEvent.target.value, 65535, 5),
                  )
                }
                value={eventSid}
              />
            </label>
            <label className="field">
              <span>{labels.level}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                max={100}
                min={1}
                onChange={(inputEvent) =>
                  setEventSettings((current) => ({
                    ...current,
                    level: Math.max(
                      1,
                      Number(
                        normalizeDecimalInput(
                          inputEvent.target.value,
                          100,
                          3,
                        ) || "1",
                      ),
                    ),
                  }))
                }
                type="number"
                value={eventSettings.level}
              />
            </label>
            <label className="field gen5event-nature-field">
              <span>{labels.nature}</span>
              <span className="gen5event-fixed-control">
                <input
                  checked={eventSettings.nature !== 255}
                  disabled={busy}
                  onChange={(inputEvent) =>
                    setEventSettings((current) => ({
                      ...current,
                      nature: inputEvent.target.checked ? 0 : 255,
                    }))
                  }
                  type="checkbox"
                />
                <Select
                  disabled={busy || eventSettings.nature === 255}
                  onChange={(inputEvent) =>
                    setEventSettings((current) => ({
                      ...current,
                      nature: Number(inputEvent.target.value),
                    }))
                  }
                  value={
                    eventSettings.nature === 255 ? 0 : eventSettings.nature
                  }
                >
                  {natureOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </span>
            </label>
          </div>
          <div className="gen5event-event-ivs">
            {IV_LABELS.map((label, index) => {
              const fixed = eventSettings.ivs[index] !== null;
              return (
                <label className="field" key={label}>
                  <span>{label}</span>
                  <span className="gen5event-fixed-control">
                    <input
                      checked={fixed}
                      disabled={busy}
                      onChange={(inputEvent) =>
                        setEventSettings((current) => {
                          const ivs = [
                            ...current.ivs,
                          ] as Gen5EventTemplate["ivs"];
                          ivs[index] = inputEvent.target.checked ? 0 : null;
                          return { ...current, ivs };
                        })
                      }
                      type="checkbox"
                    />
                    <input
                      disabled={busy || !fixed}
                      inputMode="numeric"
                      max={31}
                      min={0}
                      onChange={(inputEvent) =>
                        setEventSettings((current) => {
                          const ivs = [
                            ...current.ivs,
                          ] as Gen5EventTemplate["ivs"];
                          ivs[index] = Number(
                            normalizeDecimalInput(
                              inputEvent.target.value,
                              31,
                              2,
                            ) || "0",
                          );
                          return { ...current, ivs };
                        })
                      }
                      type="number"
                      value={eventSettings.ivs[index] ?? 0}
                    />
                  </span>
                </label>
              );
            })}
          </div>
          <label className="gen5event-toggle">
            <input
              checked={eventSettings.egg}
              disabled={busy}
              onChange={(inputEvent) =>
                setEventSettings((current) => ({
                  ...current,
                  egg: inputEvent.target.checked,
                }))
              }
              type="checkbox"
            />
            <span>{labels.egg}</span>
          </label>
        </section>

        <section className="gen5event-section gen5event-filters panel">
          <div className="gen5event-section-heading">
            <div className="panel-heading compact">
              <h2>{labels.filters}</h2>
            </div>
            <div className="gen5event-filter-toggles">
              {mode === "generator" && (
                <label className="gen5event-toggle">
                  <input
                    checked={filtersDisabled}
                    disabled={busy}
                    onChange={(inputEvent) =>
                      setFiltersDisabled(inputEvent.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{labels.disableFilters}</span>
                </label>
              )}
              <label className="gen5event-toggle">
                <input
                  checked={showStats}
                  onChange={(inputEvent) =>
                    setShowStats(inputEvent.target.checked)
                  }
                  type="checkbox"
                />
                <span>{labels.showStats}</span>
              </label>
            </div>
          </div>
          <fieldset
            disabled={busy || (mode === "generator" && filtersDisabled)}
          >
            <div className="gen5event-filter-selects">
              <label className="field">
                <span>{labels.ability}</span>
                <Select
                  onChange={(inputEvent) =>
                    setAbilityFilter(
                      Number(inputEvent.target.value) as typeof abilityFilter,
                    )
                  }
                  value={abilityFilter}
                >
                  <option value={255}>{labels.any}</option>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>H</option>
                </Select>
              </label>
              <label className="field">
                <span>{labels.gender}</span>
                <Select
                  onChange={(inputEvent) =>
                    setGenderFilter(
                      Number(inputEvent.target.value) as typeof genderFilter,
                    )
                  }
                  value={genderFilter}
                >
                  <option value={255}>{labels.any}</option>
                  <option value={0}>{t("male")}</option>
                  <option value={1}>{t("female")}</option>
                  <option value={2}>{t("genderless")}</option>
                </Select>
              </label>
              <label className="field">
                <span>{labels.shiny}</span>
                <Select
                  onChange={(inputEvent) =>
                    setShinyFilter(
                      Number(inputEvent.target.value) as typeof shinyFilter,
                    )
                  }
                  value={shinyFilter}
                >
                  <option value={255}>{labels.any}</option>
                  <option value={1}>{chinese ? "星星" : "Star"}</option>
                  <option value={2}>{chinese ? "方块" : "Square"}</option>
                  <option value={3}>
                    {chinese ? "星星 + 方块" : "Star + Square"}
                  </option>
                </Select>
              </label>
              <MultiCheckSelect
                anyLabel={labels.any}
                label={labels.nature}
                mask={natureMask}
                onChange={(value) => setNatureMask(value || ALL_NATURES)}
                options={natureOptions}
              />
              <MultiCheckSelect
                anyLabel={labels.any}
                label={chinese ? "觉醒属性" : "Hidden"}
                mask={hiddenPowerMask}
                onChange={(value) =>
                  setHiddenPowerMask(value || ALL_HIDDEN_POWERS)
                }
                options={powerOptions}
              />
            </div>
            <div className="gen5event-iv-filter">
              <div className="gen5event-iv-header" aria-hidden="true">
                <span />
                <span>Min</span>
                <span>Max</span>
              </div>
              {IV_LABELS.map((label, index) => (
                <div className="gen5event-iv-row" key={label}>
                  <span>{label}</span>
                  <input
                    aria-label={`${label} Min`}
                    inputMode="numeric"
                    max={31}
                    min={0}
                    onChange={(inputEvent) =>
                      setIvMin((current) =>
                        updateTuple(current, index, inputEvent.target.value),
                      )
                    }
                    type="number"
                    value={ivMin[index]}
                  />
                  <input
                    aria-label={`${label} Max`}
                    inputMode="numeric"
                    max={31}
                    min={0}
                    onChange={(inputEvent) =>
                      setIvMax((current) =>
                        updateTuple(current, index, inputEvent.target.value),
                      )
                    }
                    type="number"
                    value={ivMax[index]}
                  />
                </div>
              ))}
            </div>
            <PerfectIvFilterFields
              count={perfectIvCount}
              onCountChange={setPerfectIvCount}
              onValueChange={setPerfectIvValue}
              value={perfectIvValue}
            />
          </fieldset>
          <div className="gen5event-actions">
            <button
              className="primary-action"
              disabled={busy || !profile}
              type="submit"
            >
              {mode === "generator" ? labels.generate : labels.search}
            </button>
            <button
              className="secondary-action"
              disabled={!busy}
              onClick={() => engine.cancel()}
              type="button"
            >
              {labels.cancel}
            </button>
          </div>
        </section>
      </form>

      <section aria-busy={busy} className="gen5event-results panel">
        <div className="gen5event-results-heading">
          <div>
            <h2>{labels.results}</h2>
            <span className={`gen5event-status ${status}`}>
              {labels[status]}
            </span>
          </div>
          <div className="gen5event-results-actions">
            {mode === "generator" && (
              <button
                aria-controls="gen5event-advance-finder-panel"
                aria-expanded={advanceFinderExpanded}
                aria-haspopup="dialog"
                className="secondary-action"
                disabled={results.length === 0}
                id="gen5event-advance-finder-trigger"
                onClick={() => setAdvanceFinderExpanded(true)}
                type="button"
              >
                Advance Finder
              </button>
            )}
            <strong>{summary?.resultCount ?? results.length}</strong>
          </div>
        </div>
        <div className="gen5event-progress" aria-hidden="true">
          <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="alert warning" role="status">
            {chinese ? "结果已达到上限" : "Result limit reached"}
          </div>
        )}
        <div
          aria-colcount={columns.length}
          aria-label={labels.results}
          aria-rowcount={
            sortedResults.length === 0 ? 2 : sortedResults.length + 1
          }
          className="gen5event-table-shell"
          onKeyDown={(keyboardEvent) => {
            if (keyboardEvent.currentTarget !== keyboardEvent.target) return;
            if (
              keyboardEvent.key === "ArrowDown" ||
              keyboardEvent.key === "Enter" ||
              keyboardEvent.key === " "
            ) {
              keyboardEvent.preventDefault();
              const selectedIndex = selectedResult
                ? sortedResults.indexOf(selectedResult)
                : -1;
              focusResultAtIndex(Math.max(0, selectedIndex), "auto");
            }
          }}
          ref={tableRef}
          role="grid"
          tabIndex={0}
        >
          <div className={`gen5event-table ${mode}`} role="presentation">
            <div
              aria-rowindex={1}
              className="gen5event-table-header"
              role="row"
            >
              {columns.map((column) => (
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
                    {column.label}
                    {sort.key === column.key && (
                      <span aria-hidden="true">
                        {sort.direction === "asc" ? " ↑" : " ↓"}
                      </span>
                    )}
                  </button>
                </span>
              ))}
            </div>
            {results.length === 0 && !busy && (
              <div aria-rowindex={2} className="gen5event-empty" role="row">
                <span role="gridcell">{labels.ready}</span>
              </div>
            )}
            <div
              role="rowgroup"
              style={{
                height: rowVirtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = sortedResults[virtualRow.index];
                return (
                  <div
                    aria-rowindex={virtualRow.index + 2}
                    aria-selected={selectedResult === result}
                    className={`gen5event-table-row${
                      selectedResult === result ? " selected" : ""
                    }`}
                    data-row-index={virtualRow.index}
                    key={`${result.seed}-${result.advances}-${virtualRow.index}`}
                    onClick={() => focusResultAtIndex(virtualRow.index, "auto")}
                    onKeyDown={(keyboardEvent) => {
                      if (
                        keyboardEvent.key === "Enter" ||
                        keyboardEvent.key === " "
                      ) {
                        keyboardEvent.preventDefault();
                        setSelectedResult(result);
                      } else if (keyboardEvent.key === "ArrowUp") {
                        keyboardEvent.preventDefault();
                        focusResultAtIndex(
                          Math.max(0, virtualRow.index - 1),
                          "auto",
                        );
                      } else if (keyboardEvent.key === "ArrowDown") {
                        keyboardEvent.preventDefault();
                        focusResultAtIndex(
                          Math.min(
                            sortedResults.length - 1,
                            virtualRow.index + 1,
                          ),
                          "auto",
                        );
                      } else if (keyboardEvent.key === "Home") {
                        keyboardEvent.preventDefault();
                        focusResultAtIndex(0, "auto");
                      } else if (keyboardEvent.key === "End") {
                        keyboardEvent.preventDefault();
                        focusResultAtIndex(sortedResults.length - 1, "auto");
                      }
                    }}
                    role="row"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                    tabIndex={-1}
                  >
                    {rowValues(result).map((value, index) => (
                      <span
                        key={`${columns[index].key}-${value}`}
                        role="gridcell"
                        title={value}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      <FloatingToolPanel
        className="gen5event-advance-finder"
        closeLabel="Close Advance Finder"
        expanded={advanceFinderExpanded}
        id="gen5event-advance-finder-panel"
        label="Advance Finder"
        onExpandedChange={setAdvanceFinderExpanded}
        tone="brand"
        triggerId="gen5event-advance-finder-trigger"
      >
        <Gen4AdvancePanel
          initialMode="chatot"
          onJump={(match) => {
            const result = results[match.row];
            if (!result) return;
            const sortedIndex = sortedResults.indexOf(result);
            setAdvanceFinderExpanded(false);
            if (sortedIndex >= 0) focusResultAtIndex(sortedIndex, "center");
          }}
          sourceRows={advanceFinderRows}
          showHeading={false}
          supportsCalls={false}
          supportsNeedles
          uiPreviewMode={uiPreviewMode}
        />
      </FloatingToolPanel>
    </div>
  );
}
