import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  getGen4BaseStats,
  getGen4SpeciesName,
  type Gen4PersonalVersion,
} from "../gen4ivcalculator/gen4IvData";
import type { Gen4Profile } from "../gen4profiles/domain";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { computeGen3Stats } from "../shared/gen3Stats";
import {
  gen4EventSearcherCombinationCount,
  validateGen4EventGeneratorRequest,
  validateGen4EventSearcherRequest,
  type Gen4EventGeneratorRequest,
  type Gen4EventIvTuple,
  type Gen4EventSearcherRequest,
  type Gen4EventSearcherState,
  type Gen4EventState,
} from "./domain";
import "./Gen4EventPanel.css";
import { Gen4EventSearcherUiPreviewEngine } from "./preview/Gen4EventSearcherUiPreviewEngine";
import { Gen4EventUiPreviewEngine } from "./preview/Gen4EventUiPreviewEngine";
import type { Gen4EventProgress, Gen4EventSummary } from "./search";
import { Gen4EventSearcherWorkerPool } from "./worker/Gen4EventSearcherWorkerPool";
import { Gen4EventWorkerPool } from "./worker/Gen4EventWorkerPool";

type Operation = "generator" | "searcher";
type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type Result = Gen4EventState | Gen4EventSearcherState;
type IvTextTuple = [string, string, string, string, string, string];
type SortKey =
  | "seed"
  | "delay"
  | "advances"
  | "call"
  | "chatot"
  | "hp"
  | "attack"
  | "defense"
  | "specialAttack"
  | "specialDefense"
  | "speed"
  | "hiddenPower"
  | "hiddenPowerStrength";

interface ResultColumn {
  key: SortKey;
  label: string;
}

interface Gen4EventPanelProps {
  profile: Gen4Profile;
  onOpenIvCalculator(): void;
  uiPreviewMode: boolean;
}

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
const ivKeys = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
] as const;
const ivLabelKeys = [
  "ivHp",
  "ivAttack",
  "ivDefense",
  "ivSpecialAttack",
  "ivSpecialDefense",
  "ivSpeed",
] as const;
const allPowers = 0xffff;

function parseDecimal(value: string) {
  return /^\d+$/.test(value.trim()) ? Number.parseInt(value, 10) : Number.NaN;
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

export function Gen4EventPanel({
  onOpenIvCalculator,
  profile,
  uiPreviewMode,
}: Gen4EventPanelProps) {
  const { t, i18n } = useTranslation();
  const generator = useMemo(
    () =>
      uiPreviewMode
        ? new Gen4EventUiPreviewEngine()
        : new Gen4EventWorkerPool(),
    [uiPreviewMode],
  );
  const searcher = useMemo(
    () =>
      uiPreviewMode
        ? new Gen4EventSearcherUiPreviewEngine()
        : new Gen4EventSearcherWorkerPool(),
    [uiPreviewMode],
  );
  const [operation, setOperation] = useState<Operation>("generator");
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("1000");
  const [offset, setOffset] = useState("");
  const [minDelay, setMinDelay] = useState("600");
  const [maxDelay, setMaxDelay] = useState("2000");
  const [minAdvance, setMinAdvance] = useState("0");
  const [maxAdvance, setMaxAdvance] = useState("1000");
  const [species, setSpecies] = useState("1");
  const [level, setLevel] = useState("1");
  const [nature, setNature] = useState("0");
  const [powerMask, setPowerMask] = useState(allPowers);
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
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState<Gen4EventProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen4EventSummary>();
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    {
      key: "advances",
      direction: "asc",
    },
  );
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      generator.dispose();
      searcher.dispose();
    },
    [generator, searcher],
  );

  const speciesValue = parseDecimal(species);
  const natureValue = parseDecimal(nature);
  const levelValue = parseDecimal(level);
  const personalVersion = (
    profile.version === "heartgold" || profile.version === "soulsilver"
      ? "hgss"
      : profile.version
  ) as Gen4PersonalVersion;
  const baseStats = getGen4BaseStats(
    personalVersion,
    Number.isInteger(speciesValue) && speciesValue >= 1 && speciesValue <= 493
      ? speciesValue
      : 1,
  );
  const powerOptions = powerKeys.map((key, value) => ({
    label: t(key),
    value,
  }));

  const columns = useMemo(() => {
    const stats: ResultColumn[] = ivKeys.map((key, index) => ({
      key,
      label: ivLabelKeys[index],
    }));
    if (operation === "searcher")
      return [
        { key: "seed" as const, label: "seed" },
        { key: "delay" as const, label: "delay" },
        { key: "advances" as const, label: "rowAdvance" },
        ...stats,
        { key: "hiddenPower" as const, label: "hiddenPowerType" },
        { key: "hiddenPowerStrength" as const, label: "hiddenPowerStrength" },
      ];
    const rngColumns: ResultColumn[] = [
      { key: "advances", label: "rowAdvance" },
    ];
    if (profile.version === "heartgold" || profile.version === "soulsilver")
      rngColumns.push({ key: "call", label: "call" });
    return [
      ...rngColumns,
      { key: "chatot" as const, label: "chatot" },
      ...stats,
      { key: "hiddenPower" as const, label: "hiddenPowerType" },
      { key: "hiddenPowerStrength" as const, label: "hiddenPowerStrength" },
    ];
  }, [operation, profile.version]);

  const stateValue = (state: Result, key: SortKey) => {
    const ivIndex = ivKeys.indexOf(key as (typeof ivKeys)[number]);
    if (ivIndex >= 0) {
      return showStats
        ? computeGen3Stats(baseStats, state.ivs, natureValue, levelValue)[
            ivIndex
          ]
        : state.ivs[ivIndex];
    }
    if (key === "seed") return "seed" in state ? state.seed : 0;
    if (key === "delay") return "delay" in state ? state.delay : 0;
    if (key === "call") return "call" in state ? state.call : 0;
    if (key === "chatot") return "chatot" in state ? state.chatot : 0;
    if (key === "hiddenPower") return state.hiddenPower;
    return state.hiddenPowerStrength;
  };
  const displayValue = (state: Result, key: SortKey) => {
    if (key === "seed") return "seed" in state ? formatHex(state.seed) : "-";
    if (key === "call") {
      if (!("call" in state)) return "-";
      return ["E", "K", "P"][state.call] ?? String(state.call);
    }
    if (key === "chatot") return "chatot" in state ? chatot(state.chatot) : "-";
    if (key === "hiddenPower") return t(powerKeys[state.hiddenPower]);
    return String(stateValue(state, key));
  };
  const sortedResults = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        (stateValue(left, sort.key) - stateValue(right, sort.key)) * direction,
    );
    // Derived stats depend on the selected Wonder Card settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseStats, levelValue, natureValue, results, showStats, sort]);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const setOperationAndReset = (next: Operation) => {
    setOperation(next);
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
      key: next === "generator" ? "advances" : "seed",
      direction: "asc",
    });
  };

  const commonRequest = () => ({
    species: speciesValue,
    nature: natureValue,
    level: levelValue,
    filters: {
      hiddenPowerMask: powerMask || allPowers,
      ivMin: ivMin.map(parseDecimal) as Gen4EventIvTuple,
      ivMax: ivMax.map(parseDecimal) as Gen4EventIvTuple,
    },
  });

  const run = async (event: FormEvent) => {
    event.preventDefault();
    setResults([]);
    setSummary(undefined);
    setError("");
    const common = commonRequest();
    const request =
      operation === "generator"
        ? ({
            ...common,
            seed: parseHex(seed),
            initialAdvances: parseDecimal(initialAdvances),
            maxAdvances: parseDecimal(maxAdvances),
            offset: parseDecimal(offset || "0"),
          } satisfies Gen4EventGeneratorRequest)
        : ({
            ...common,
            minAdvance: parseDecimal(minAdvance),
            maxAdvance: parseDecimal(maxAdvance),
            minDelay: parseDecimal(minDelay),
            maxDelay: parseDecimal(maxDelay),
          } satisfies Gen4EventSearcherRequest);
    const errors =
      operation === "generator"
        ? validateGen4EventGeneratorRequest(
            request as Gen4EventGeneratorRequest,
          )
        : validateGen4EventSearcherRequest(request as Gen4EventSearcherRequest);
    if (errors.length > 0) {
      setStatus("failed");
      setError(t("invalidInput"));
      return;
    }
    const totalStates =
      operation === "generator"
        ? (request as Gen4EventGeneratorRequest).maxAdvances + 1
        : gen4EventSearcherCombinationCount(
            request as Gen4EventSearcherRequest,
          );
    setProgress({
      processedStates: 0,
      totalStates,
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");
    try {
      const result =
        operation === "generator"
          ? await generator.search(request as Gen4EventGeneratorRequest, {
              onBatch: (batch) =>
                setResults((current) => [...current, ...batch]),
              onProgress: setProgress,
            })
          : await searcher.search(request as Gen4EventSearcherRequest, {
              onBatch: (batch) =>
                setResults((current) => [...current, ...batch]),
              onProgress: setProgress,
            });
      setSummary(result);
      setProgress(result);
      setStatus(result.cancelled ? "cancelled" : "completed");
    } catch (reason) {
      setStatus("failed");
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const updateIv = (target: "min" | "max", index: number, value: string) => {
    const next = [...(target === "min" ? ivMin : ivMax)] as IvTextTuple;
    next[index] = normalizeDecimalInput(value, 31, 2);
    if (target === "min") setIvMin(next);
    else setIvMax(next);
  };
  const isRunning = status === "calculating";

  return (
    <div className="gen4event-panel">
      <div className="operation-tabs gen4event-tabs" role="tablist">
        {(["generator", "searcher"] as const).map((item) => (
          <button
            aria-selected={operation === item}
            className={operation === item ? "active" : ""}
            disabled={isRunning}
            key={item}
            onClick={() => setOperationAndReset(item)}
            role="tab"
            type="button"
          >
            {t(item)}
          </button>
        ))}
      </div>

      <form className="gen4event-controls" onSubmit={run}>
        <section className="panel static-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
          </div>
          <div className="gen4event-control-stack">
            {operation === "generator" ? (
              <>
                <label className="field">
                  <span>{t("seed")}</span>
                  <input
                    inputMode="text"
                    maxLength={8}
                    onChange={(event) =>
                      setSeed(normalizeHexInput(event.target.value, 8))
                    }
                    value={seed}
                  />
                </label>
                {[
                  ["initialAdvances", initialAdvances, setInitialAdvances],
                  ["maxAdvances", maxAdvances, setMaxAdvances],
                  ["offset", offset, setOffset],
                ].map(([key, value, setter]) => (
                  <label className="field" key={key as string}>
                    <span>{t(key as string)}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) =>
                        (setter as (next: string) => void)(
                          normalizeDecimalInput(
                            event.target.value,
                            0xffff_ffff,
                            10,
                          ),
                        )
                      }
                      value={value as string}
                    />
                  </label>
                ))}
              </>
            ) : (
              [
                ["minDelay", minDelay, setMinDelay],
                ["maxDelay", maxDelay, setMaxDelay],
                ["minAdvance", minAdvance, setMinAdvance],
                ["maxAdvance", maxAdvance, setMaxAdvance],
              ].map(([key, value, setter]) => (
                <label className="field" key={key as string}>
                  <span>{t(key as string)}</span>
                  <input
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(event) =>
                      (setter as (next: string) => void)(
                        normalizeDecimalInput(
                          event.target.value,
                          0xffff_ffff,
                          10,
                        ),
                      )
                    }
                    value={value as string}
                  />
                </label>
              ))
            )}
            <div className="panel-actions">
              <button
                className="primary-action"
                disabled={isRunning}
                type="submit"
              >
                {operation === "generator" ? t("generate") : t("search")}
              </button>
              {operation === "searcher" && (
                <button
                  className="secondary-action"
                  disabled={!isRunning}
                  onClick={() => searcher.cancel()}
                  type="button"
                >
                  {t("cancel")}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="panel static-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("settings")}</h2>
            </div>
          </div>
          <div className="gen4event-control-stack">
            <label className="field">
              <span>{t("species")}</span>
              <Select
                onChange={(event) => setSpecies(event.target.value)}
                value={species}
              >
                {Array.from({ length: 493 }, (_, index) => index + 1).map(
                  (value) => (
                    <option key={value} value={value}>
                      {getGen4SpeciesName(i18n.language, value)}
                    </option>
                  ),
                )}
              </Select>
            </label>
            <label className="field">
              <span>{t("level")}</span>
              <input
                inputMode="numeric"
                max={100}
                min={1}
                onChange={(event) =>
                  setLevel(normalizeDecimalInput(event.target.value, 100, 3))
                }
                type="number"
                value={level}
              />
            </label>
            <label className="field">
              <span>{t("nature")}</span>
              <Select
                onChange={(event) => setNature(event.target.value)}
                value={nature}
              >
                {natureKeys.map((key, value) => (
                  <option key={key} value={value}>
                    {t(key)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </section>

        <section className="panel static-panel gen4event-filter-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">03</span>
              <h2>{t("filters")}</h2>
            </div>
          </div>
          <div className="gen4event-control-stack">
            <div className="gen4event-filter-grid">
              {ivLabelKeys.map((key, index) => (
                <label className="field" key={key}>
                  <span>{t(key)}</span>
                  <div className="gen4event-iv-field">
                    <input
                      aria-label={`${t(key)} min`}
                      inputMode="numeric"
                      max={31}
                      min={0}
                      onChange={(event) =>
                        updateIv("min", index, event.target.value)
                      }
                      value={ivMin[index]}
                    />
                    <span>-</span>
                    <input
                      aria-label={`${t(key)} max`}
                      inputMode="numeric"
                      max={31}
                      min={0}
                      onChange={(event) =>
                        updateIv("max", index, event.target.value)
                      }
                      value={ivMax[index]}
                    />
                  </div>
                </label>
              ))}
            </div>
            <MultiCheckSelect
              anyLabel={t("any")}
              label={t("hiddenPower")}
              mask={powerMask}
              onChange={setPowerMask}
              options={powerOptions}
            />
            <div className="panel-actions">
              <button
                className="secondary-action"
                onClick={onOpenIvCalculator}
                type="button"
              >
                {t("ivCalculator")}
              </button>
              <label className="toggle-field">
                <input
                  checked={showStats}
                  onChange={(event) => setShowStats(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("showStats")}</span>
              </label>
            </div>
          </div>
        </section>
      </form>

      <section className="panel results-panel gen4event-results">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">04</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{t(status)}</span>
          </div>
          <div className="result-actions">
            <span className="result-count">
              {String(results.length)} / {String(progress.totalStates)}
            </span>
            <button
              aria-label={t("clear")}
              className="icon-action"
              disabled={results.length === 0}
              onClick={() => setResults([])}
              title={t("clear")}
              type="button"
            >
              &times;
            </button>
          </div>
        </div>
        <div
          aria-label={`${progress.percent.toFixed(1)}%`}
          className="progress-track"
        >
          <span style={{ width: `${Math.min(100, progress.percent)}%` }} />
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
        {error && <div className="alert error">{error}</div>}
        {summary?.resultLimitReached && (
          <div className="alert warning">{t("limitReached")}</div>
        )}
        <div className="table-shell gen4event-table-shell" ref={tableRef}>
          {sortedResults.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("empty")}</span>
            </div>
          ) : (
            <div
              className={`gen4event-table ${operation} ${
                profile.version === "heartgold" ||
                profile.version === "soulsilver"
                  ? "hgss"
                  : "dppt"
              }`}
              style={{ height: `${virtualizer.getTotalSize() + 40}px` }}
            >
              <div className="gen4event-table-header">
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
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                ))}
              </div>
              {virtualizer.getVirtualItems().map((row) => {
                const state = sortedResults[row.index];
                return (
                  <div
                    className="gen4event-table-row"
                    key={`${state.advances}-${"seed" in state ? state.seed : row.index}-${row.index}`}
                    style={{ transform: `translateY(${row.start + 40}px)` }}
                  >
                    {columns.map((column) => (
                      <span key={column.key}>
                        {displayValue(state, column.key)}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
