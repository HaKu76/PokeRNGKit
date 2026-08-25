import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
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
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { PerfectIvFilterFields } from "../shared/PerfectIvFilterFields";
import {
  GEN5_DREAM_RADAR_ENCOUNTERS,
  formatGen5DreamRadarButtons,
  gen5DreamRadarProfile,
  normalizeGen5DreamRadarSeed,
  validateGen5DreamRadarRequest,
  allowedGen5DreamRadarGenders,
  type Gen5DreamRadarFilters,
  type Gen5DreamRadarGender,
  type Gen5DreamRadarRequest,
  type Gen5DreamRadarResult,
  type Gen5DreamRadarSlot,
} from "./domain";
import { Gen5DreamRadarUiPreviewEngine } from "./preview/Gen5DreamRadarUiPreviewEngine";
import type { Gen5DreamRadarEngine, Gen5DreamRadarSummary } from "./search";
import { Gen5DreamRadarWorkerPool } from "./worker/Gen5DreamRadarWorkerPool";
import "./Gen5DreamRadarPanel.css";

type Mode = "generator" | "searcher";
type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
const DREAM_RADAR_MODES = ["generator", "searcher"] as const;
const ZH_RESULT_COLUMNS: Partial<Record<string, string>> = {
  Advances: "帧数",
  Shiny: "异色",
  Nature: "性格",
  Ability: "特性",
  Hidden: "觉醒属性",
  Power: "觉醒威力",
  Gender: "性别",
  Characteristic: "个性",
  "Date/Time": "日期/时间",
};

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
const IV_KEYS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const DATE_KEY = "pokerngkit-gen5-dreamradar-dates-v1";

function dateToday() {
  const now = new Date();
  const year = Math.min(2099, Math.max(2000, now.getFullYear()));
  return `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function storedDates() {
  const fallback = dateToday();
  try {
    const value = JSON.parse(localStorage.getItem(DATE_KEY) ?? "null") as {
      start?: unknown;
      end?: unknown;
    } | null;
    if (typeof value?.start === "string" && typeof value.end === "string")
      return { start: value.start, end: value.end };
  } catch {
    // Optional settings fall back to today's date.
  }
  return { start: fallback, end: fallback };
}

function genderLabel(t: (key: string) => string, gender: number) {
  return t(gender === 0 ? "male" : gender === 1 ? "female" : "genderless");
}

function natureOptions(t: (key: string) => string) {
  return NATURE_KEYS.map((key, value) => ({ label: t(key), value }));
}

function powerOptions(t: (key: string) => string) {
  return POWER_KEYS.map((key, value) => ({ label: t(key), value }));
}

function computeStats(
  result: Gen5DreamRadarResult,
  species: number,
  form: number,
) {
  const base = getIvBaseStats("bw2", species, form);
  const natureBoost = Math.floor(result.nature / 5);
  const natureDrop = result.nature % 5;
  const statMap = [1, 2, 5, 3, 4];
  return base.map((value, index) => {
    const level = result.level;
    if (index === 0)
      return (
        Math.floor(((2 * value + result.ivs[index]) * level) / 100) + level + 10
      );
    const raw = Math.floor(((2 * value + result.ivs[index]) * level) / 100) + 5;
    const modifier =
      statMap[natureBoost] === index
        ? 110
        : statMap[natureDrop] === index
          ? 90
          : 100;
    return Math.floor((raw * modifier) / 100);
  });
}

function defaultSlots(): Gen5DreamRadarSlot[] {
  return Array.from({ length: 6 }, (_, index) => ({
    encounter: index === 0 ? 0 : -1,
    gender: index === 0 ? 0 : 2,
  })) as Gen5DreamRadarSlot[];
}

function resultRows(
  mode: Mode,
  result: Gen5DreamRadarResult,
  showStats: boolean,
  slots: Gen5DreamRadarSlot[],
  language: string,
  translate: (key: string) => string,
) {
  const target = slots.at(-1)!.encounter;
  const encounter = GEN5_DREAM_RADAR_ENCOUNTERS[target];
  const values = showStats
    ? computeStats(result, encounter.species, encounter.form)
    : result.ivs;
  const ability =
    result.ability < 2
      ? `${result.ability}: ${getGen4AbilityName(language, result.abilityIndex)}`
      : `H (${getGen4AbilityName(language, result.abilityIndex)})`;
  const common = [
    result.pid,
    translate("no"),
    translate(NATURE_KEYS[result.nature]),
    ability,
    ...values.map(String),
    translate(POWER_KEYS[result.hiddenPower]),
    String(result.hiddenPowerStrength),
    genderLabel(translate, result.gender),
    getIvCharacteristics(language, "bw2")[result.characteristic],
  ];
  if (mode === "generator")
    return [String(result.advances), String(result.needle), ...common];
  return [
    result.seed,
    String(result.advances),
    ...common,
    result.dateTime ?? "",
    result.timer0 === undefined ? "" : result.timer0.toString(16).toUpperCase(),
    result.buttonMask === undefined
      ? ""
      : formatGen5DreamRadarButtons(result.buttonMask),
  ];
}

export interface Gen5DreamRadarPanelProps {
  uiPreviewMode: boolean;
  onOpenProfileManager(): void;
}

export function Gen5DreamRadarPanel({
  uiPreviewMode,
  onOpenProfileManager,
}: Gen5DreamRadarPanelProps) {
  const { i18n, t } = useTranslation();
  const profiles = useGen5Profiles();
  const dates = useMemo(storedDates, []);
  const engine = useMemo<Gen5DreamRadarEngine>(
    () =>
      uiPreviewMode
        ? new Gen5DreamRadarUiPreviewEngine()
        : new Gen5DreamRadarWorkerPool(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Mode>("generator");
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100");
  const [badges, setBadges] = useState("0");
  const [startDate, setStartDate] = useState(dates.start);
  const [endDate, setEndDate] = useState(dates.end);
  const [slots, setSlots] = useState(defaultSlots);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [ivMin, setIvMin] = useState<IvText>(["0", "0", "0", "0", "0", "0"]);
  const [ivMax, setIvMax] = useState<IvText>([
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
  const [results, setResults] = useState<Gen5DreamRadarResult[]>([]);
  const [summary, setSummary] = useState<Gen5DreamRadarSummary>();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);
  const modeTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const busy = status === "calculating";
  // TanStack Virtual exposes mutable imperative functions by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    try {
      localStorage.setItem(
        DATE_KEY,
        JSON.stringify({ start: startDate, end: endDate }),
      );
    } catch {
      // Date persistence is optional.
    }
  }, [endDate, startDate]);

  const profile = profiles.selectedProfile;
  const chinese = i18n.language.startsWith("zh");
  const natureList = useMemo(() => natureOptions(t), [t]);
  const powerList = useMemo(() => powerOptions(t), [t]);
  const selectedSlots = useMemo(() => {
    const index = slots.findIndex((slot) => slot.encounter < 0);
    return (index < 0 ? slots : slots.slice(0, index)) as Gen5DreamRadarSlot[];
  }, [slots]);
  const labels = {
    profile: "Profile",
    manager: "Manager",
    generator: chinese ? "生成器" : "Generator",
    searcher: chinese ? "检索器" : "Searcher",
    rngInfo: chinese ? "乱数信息" : "RNG Info",
    settings: chinese ? "设置" : "Settings",
    filters: chinese ? "筛选项" : "Filters",
    seed: "Seed",
    initial: chinese ? "初始帧" : "Initial Advances",
    maximum: chinese ? "最大帧数" : "Max Advances",
    badges: chinese ? "徽章" : "Badges",
    startDate: chinese ? "起始日期" : "Start Date",
    endDate: chinese ? "最后日期" : "End Date",
    generate: chinese ? "生成" : "Generate",
    search: chinese ? "检索" : "Search",
    cancel: chinese ? "取消" : "Cancel",
    disableFilters: chinese ? "禁用筛选项" : "Disable Filters",
    stats: chinese ? "显示能力值" : "Show Stats",
    noProfile: chinese ? "请选择一个存档信息" : "Please select a profile",
    ready: chinese ? "就绪" : "Ready",
    calculating: chinese ? "计算中" : "Calculating",
    completed: chinese ? "已完成" : "Completed",
    cancelled: chinese ? "已取消" : "Cancelled",
    failed: chinese ? "失败" : "Failed",
    resultCount: chinese ? "结果" : "Results",
    none: "None",
  };

  const profileSummary = profile
    ? [
        ["Game", profile.version === "black2" ? "Black 2" : "White 2"],
        ["TID", String(profile.tid)],
        ["SID", String(profile.sid)],
        [
          "Timer0",
          `${profile.timer0Min.toString(16).toUpperCase()}-${profile.timer0Max.toString(16).toUpperCase()}`,
        ],
        ["DS Type", profile.dsType.toUpperCase()],
      ]
    : [];

  const setSlot = (index: number, patch: Partial<Gen5DreamRadarSlot>) => {
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot,
      ),
    );
    setResults([]);
  };

  const updateEncounter = (index: number, value: number) => {
    const genders =
      value < 0
        ? ([2] as Gen5DreamRadarGender[])
        : allowedGen5DreamRadarGenders(value);
    setSlot(index, { encounter: value, gender: genders[0] ?? 2 });
  };

  const buildRequest = (): Gen5DreamRadarRequest => {
    const filters: Gen5DreamRadarFilters = {
      disabled: mode === "generator" && filtersDisabled,
      ivMin: ivMin.map((value) =>
        Number(value || "0"),
      ) as Gen5DreamRadarFilters["ivMin"],
      ivMax: ivMax.map((value) =>
        Number(value || "0"),
      ) as Gen5DreamRadarFilters["ivMax"],
      natureMask,
      hiddenPowerMask,
      perfectIvValue: Number(perfectIvValue || "0"),
      perfectIvCount: Number(perfectIvCount || "0"),
    };
    const radarProfile = gen5DreamRadarProfile(profile!);
    return mode === "generator"
      ? {
          mode: "generator",
          profile: radarProfile,
          initialAdvances: Number(initialAdvances || "0"),
          maxAdvances: Number(maxAdvances || "0"),
          badges: Number(badges || "0"),
          slots: selectedSlots,
          filters,
          resultLimit: 100_000,
          seed,
        }
      : {
          mode: "searcher",
          profile: radarProfile,
          initialAdvances: Number(initialAdvances || "0"),
          maxAdvances: Number(maxAdvances || "0"),
          badges: Number(badges || "0"),
          slots: selectedSlots,
          filters,
          resultLimit: 100_000,
          startDate,
          endDate,
        };
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!profile) {
      setError(labels.noProfile);
      setStatus("failed");
      return;
    }
    try {
      const request = buildRequest();
      validateGen5DreamRadarRequest(request);
      setError("");
      setResults([]);
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

  const cancel = () => {
    engine.cancel();
    setStatus("cancelled");
  };

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setResults([]);
    setError("");
  };

  const handleModeKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      nextIndex =
        (index - 1 + DREAM_RADAR_MODES.length) % DREAM_RADAR_MODES.length;
    else if (event.key === "ArrowRight" || event.key === "ArrowDown")
      nextIndex = (index + 1) % DREAM_RADAR_MODES.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = DREAM_RADAR_MODES.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    changeMode(DREAM_RADAR_MODES[nextIndex]);
    modeTabRefs.current[nextIndex]?.focus();
  };

  const columns =
    mode === "generator"
      ? [
          "Advances",
          "Needle",
          "PID",
          "Shiny",
          "Nature",
          "Ability",
          ...IV_KEYS,
          "Hidden",
          "Power",
          "Gender",
          "Characteristic",
        ]
      : [
          "Seed",
          "Advances",
          "PID",
          "Shiny",
          "Nature",
          "Ability",
          ...IV_KEYS,
          "Hidden",
          "Power",
          "Gender",
          "Characteristic",
          "Date/Time",
          "Timer0",
          "Buttons",
        ];
  const visibleColumns = columns.map((column) =>
    chinese ? (ZH_RESULT_COLUMNS[column] ?? column) : column,
  );

  return (
    <div className="gen5dreamradar-panel">
      <section className="gen5dreamradar-profile panel">
        <div className="gen5dreamradar-profile-heading">
          <h2>{labels.profile}</h2>
          <div className="gen5dreamradar-profile-actions">
            <label className="field">
              <span>{labels.profile}</span>
              <Select
                disabled={busy || profiles.loading || profiles.busy}
                onChange={(event) =>
                  void profiles.selectProfile(event.target.value || null)
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
          <dl className="gen5dreamradar-profile-values">
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
        aria-label="Dream Radar operation"
        className="gen5dreamradar-mode-tabs"
        role="tablist"
      >
        {DREAM_RADAR_MODES.map((value, index) => (
          <button
            aria-controls="gen5dreamradar-workspace"
            aria-selected={mode === value}
            className={mode === value ? "active" : ""}
            disabled={busy}
            id={`gen5dreamradar-${value}-tab`}
            key={value}
            onClick={() => changeMode(value)}
            onKeyDown={(event) => handleModeKeyDown(event, index)}
            ref={(element) => {
              modeTabRefs.current[index] = element;
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
        aria-labelledby={`gen5dreamradar-${mode}-tab`}
        className="gen5dreamradar-workspace"
        id="gen5dreamradar-workspace"
        onSubmit={run}
      >
        <div className="gen5dreamradar-settings-column">
          <section className="panel gen5dreamradar-settings">
            <div className="panel-heading compact">
              <h2>{labels.settings}</h2>
            </div>
            <div className="gen5dreamradar-form-grid">
              {mode === "generator" ? (
                <label className="field gen5dreamradar-seed-field">
                  <span>{labels.seed}</span>
                  <input
                    inputMode="text"
                    maxLength={16}
                    onChange={(event) =>
                      setSeed(normalizeGen5DreamRadarSeed(event.target.value))
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
                      max="2099-12-31"
                      min="2000-01-01"
                      onChange={(event) => setStartDate(event.target.value)}
                      type="date"
                      value={startDate}
                    />
                  </label>
                  <label className="field">
                    <span>{labels.endDate}</span>
                    <input
                      max="2099-12-31"
                      min="2000-01-01"
                      onChange={(event) => setEndDate(event.target.value)}
                      type="date"
                      value={endDate}
                    />
                  </label>
                </>
              )}
              <label className="field">
                <span>{labels.initial}</span>
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
                <span>{labels.maximum}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setMaxAdvances(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={maxAdvances}
                />
              </label>
              <label className="field">
                <span>{labels.badges}</span>
                <input
                  inputMode="numeric"
                  maxLength={1}
                  onChange={(event) =>
                    setBadges(normalizeDecimalInput(event.target.value, 8, 1))
                  }
                  value={badges}
                />
              </label>
            </div>
          </section>

          <section className="panel gen5dreamradar-slots">
            <div className="panel-heading compact">
              <h2>{labels.rngInfo}</h2>
            </div>
            <div className="gen5dreamradar-slot-list">
              {slots.map((slot, index) => {
                const active = index === 0 || slots[index - 1].encounter >= 0;
                const available = GEN5_DREAM_RADAR_ENCOUNTERS.filter(
                  (entry) => index === 0 || !entry.genie,
                );
                const genders =
                  slot.encounter >= 0
                    ? allowedGen5DreamRadarGenders(slot.encounter)
                    : [];
                return (
                  <div className="gen5dreamradar-slot" key={index}>
                    <span className="gen5dreamradar-slot-number">
                      Slot {index + 1}
                    </span>
                    <Select
                      aria-label={`Slot ${index + 1} Pokemon`}
                      disabled={busy || !active}
                      onChange={(event) =>
                        updateEncounter(index, Number(event.target.value))
                      }
                      value={slot.encounter}
                    >
                      <option value={-1}>{labels.none}</option>
                      {available.map((entry) => {
                        const actual =
                          GEN5_DREAM_RADAR_ENCOUNTERS.indexOf(entry);
                        return (
                          <option key={actual} value={actual}>
                            {getIvSpeciesName(
                              i18n.language,
                              entry.species,
                              entry.form,
                            )}
                          </option>
                        );
                      })}
                    </Select>
                    <Select
                      aria-label={`Slot ${index + 1} Gender`}
                      disabled={busy || !active || slot.encounter < 0}
                      onChange={(event) =>
                        setSlot(index, {
                          gender: Number(
                            event.target.value,
                          ) as Gen5DreamRadarGender,
                        })
                      }
                      value={slot.gender}
                    >
                      {genders.map((gender) => (
                        <option key={gender} value={gender}>
                          {genderLabel(t, gender)}
                        </option>
                      ))}
                    </Select>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel gen5dreamradar-filters">
            <div className="panel-heading compact">
              <h2>{labels.filters}</h2>
            </div>
            {mode === "generator" && (
              <label className="gen5dreamradar-toggle">
                <input
                  checked={filtersDisabled}
                  disabled={busy}
                  onChange={(event) => setFiltersDisabled(event.target.checked)}
                  type="checkbox"
                />
                <span>{labels.disableFilters}</span>
              </label>
            )}
            <label className="gen5dreamradar-toggle">
              <input
                checked={showStats}
                disabled={busy}
                onChange={(event) => setShowStats(event.target.checked)}
                type="checkbox"
              />
              <span>{labels.stats}</span>
            </label>
            <div className="gen5dreamradar-iv-grid">
              {IV_KEYS.map((key, index) => (
                <div className="gen5dreamradar-iv-range" key={key}>
                  <span>{key}</span>
                  <input
                    aria-label={`${key} minimum`}
                    disabled={busy || (mode === "generator" && filtersDisabled)}
                    inputMode="numeric"
                    maxLength={2}
                    onChange={(event) =>
                      setIvMin(
                        (current) =>
                          current.map((value, valueIndex) =>
                            valueIndex === index
                              ? normalizeDecimalInput(event.target.value, 31, 2)
                              : value,
                          ) as IvText,
                      )
                    }
                    value={ivMin[index]}
                  />
                  <span>-</span>
                  <input
                    aria-label={`${key} maximum`}
                    disabled={busy || (mode === "generator" && filtersDisabled)}
                    inputMode="numeric"
                    maxLength={2}
                    onChange={(event) =>
                      setIvMax(
                        (current) =>
                          current.map((value, valueIndex) =>
                            valueIndex === index
                              ? normalizeDecimalInput(event.target.value, 31, 2)
                              : value,
                          ) as IvText,
                      )
                    }
                    value={ivMax[index]}
                  />
                </div>
              ))}
            </div>
            <PerfectIvFilterFields
              count={perfectIvCount}
              disabled={busy || (mode === "generator" && filtersDisabled)}
              onCountChange={setPerfectIvCount}
              onValueChange={setPerfectIvValue}
              value={perfectIvValue}
            />
            <div className="gen5dreamradar-filter-selects">
              <MultiCheckSelect
                anyLabel={t("any")}
                disabled={busy || (mode === "generator" && filtersDisabled)}
                label={t("nature")}
                mask={natureMask}
                onChange={setNatureMask}
                options={natureList}
                resetHint={t("checkListResetHint")}
              />
              <MultiCheckSelect
                anyLabel={t("any")}
                disabled={busy || (mode === "generator" && filtersDisabled)}
                label={t("hiddenPower")}
                mask={hiddenPowerMask}
                onChange={setHiddenPowerMask}
                options={powerList}
                resetHint={t("checkListResetHint")}
              />
            </div>
          </section>
          <div className="panel-actions gen5dreamradar-actions">
            {busy ? (
              <button
                className="secondary-action"
                onClick={cancel}
                type="button"
              >
                {labels.cancel}
              </button>
            ) : (
              <button
                className="primary-action"
                disabled={!profile || selectedSlots.length === 0}
                type="submit"
              >
                {mode === "generator" ? labels.generate : labels.search}
              </button>
            )}
          </div>
        </div>

        <section className="panel gen5dreamradar-results">
          <div className="gen5dreamradar-results-heading">
            <div>
              <h2>{labels.resultCount}</h2>
              <span aria-live="polite" className={`run-status ${status}`}>
                {labels[status]}
              </span>
            </div>
            <strong>{results.length}</strong>
          </div>
          <div
            aria-busy={busy}
            aria-label={labels.resultCount}
            aria-rowcount={results.length + 1}
            className="gen5dreamradar-table-shell"
            ref={tableRef}
            role="table"
          >
            {results.length === 0 ? (
              <div className="empty-state compact" />
            ) : (
              <div
                className={`gen5dreamradar-table ${mode}`}
                style={{ height: `${rowVirtualizer.getTotalSize() + 44}px` }}
              >
                <div
                  aria-rowindex={1}
                  className="gen5dreamradar-table-header"
                  role="row"
                >
                  {columns.map((column, index) => (
                    <span key={column} role="columnheader">
                      {visibleColumns[index]}
                    </span>
                  ))}
                </div>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = results[virtualRow.index];
                  const values = resultRows(
                    mode,
                    row,
                    showStats,
                    selectedSlots,
                    i18n.language,
                    t,
                  );
                  return (
                    <div
                      aria-rowindex={virtualRow.index + 2}
                      className="gen5dreamradar-table-row"
                      key={`${row.seed}-${row.advances}-${virtualRow.index}`}
                      role="row"
                      style={{
                        transform: `translateY(${virtualRow.start + 44}px)`,
                      }}
                    >
                      {values.map((value, index) => (
                        <span key={`${index}-${value}`} role="cell">
                          {index === values.length - 1 && mode === "searcher"
                            ? formatGen5DreamRadarButtons(row.buttonMask ?? 0)
                            : value}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div
            aria-label="Progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progress)}
            className="gen5dreamradar-progress"
            role="progressbar"
          >
            <span style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          {summary && (
            <div className="metrics-row">
              <span>
                {t("processed")} <strong>{summary.processedUnits}</strong>
              </span>
              <span>
                {t("workers")} <strong>{summary.workerCount}</strong>
              </span>
              <span>
                {t("elapsed")}{" "}
                <strong>{summary.elapsedMs.toFixed(1)} ms</strong>
              </span>
            </div>
          )}
          {summary?.resultLimitReached && (
            <div className="alert info">{t("limitReached")}</div>
          )}
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
        </section>
      </form>
    </div>
  );
}
