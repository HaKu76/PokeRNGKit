import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  Download,
  Play,
  Square,
  Trash2,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  formatGen7FestivalPlazaBlinkMark,
  formatGen7FestivalPlazaHex64,
  formatGen7FestivalPlazaNpcStatus,
  GEN7_FESTIVAL_PLAZA_FACILITIES,
  GEN7_FESTIVAL_PLAZA_MAX_RESULTS,
  GEN7_FESTIVAL_PLAZA_NPC_TYPES,
  gen7FestivalPlazaFacilityOptions,
  validateGen7FestivalPlazaRequest,
  type Gen7FestivalPlazaRequest,
  type Gen7FestivalPlazaResult,
  type Gen7FestivalPlazaVersion,
} from "./domain";
import "./Gen7FestivalPlazaPanel.css";
import { Gen7FestivalPlazaUiPreviewEngine } from "./preview/Gen7FestivalPlazaUiPreviewEngine";
import type {
  Gen7FestivalPlazaEngine,
  Gen7FestivalPlazaProgress,
  Gen7FestivalPlazaSummary,
} from "./search";
import { Gen7FestivalPlazaWorker } from "./worker/Gen7FestivalPlazaWorker";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type SortKey = keyof Gen7FestivalPlazaResult;

const VERSION_OPTIONS: {
  value: Gen7FestivalPlazaVersion;
  label: string;
}[] = [
  { value: "sun", label: "gen7Sun" },
  { value: "moon", label: "gen7Moon" },
  { value: "ultra-sun", label: "gen7UltraSun" },
  { value: "ultra-moon", label: "gen7UltraMoon" },
];

const RANK_OPTIONS = [
  "<=2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11-20",
  "21-30",
  "31-40",
  "41-50",
  "51-60",
  "61-70",
  "71-80",
  "81-90",
  "91-99",
  "100+",
] as const;

function parseDecimal(value: string) {
  return value.trim() === "" ? 0 : Number(value);
}

function parseHex(value: string) {
  return value.trim() === "" ? 0 : Number.parseInt(value, 16);
}

function formatRealTime(frames: number) {
  let seconds = frames / 60;
  if (seconds < 60) return `${seconds.toFixed(3)}s`;
  let minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  if (minutes < 60)
    return `${minutes}m ${seconds.toFixed(3).padStart(6, "0")}s`;
  const hours = Math.floor(minutes / 60);
  minutes -= hours * 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${seconds
    .toFixed(1)
    .padStart(4, "0")}s`;
}

function facilityLabel(result: Gen7FestivalPlazaResult) {
  return `${GEN7_FESTIVAL_PLAZA_FACILITIES[result.facility]} ★${result.star} - N${result.npcType} - C${result.color}`;
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen7FestivalPlazaPanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen7FestivalPlazaEngine>(
    () =>
      uiPreviewMode
        ? new Gen7FestivalPlazaUiPreviewEngine()
        : new Gen7FestivalPlazaWorker(),
    [uiPreviewMode],
  );
  const [version, setVersion] = useState<Gen7FestivalPlazaVersion>("sun");
  const [seed, setSeed] = useState("00000000");
  const [startingFrame, setStartingFrame] = useState("0");
  const [maxResults, setMaxResults] = useState("5000");
  const [npc, setNpc] = useState("0");
  const [delay, setDelay] = useState("0");
  const [rank, setRank] = useState(18);
  const [starFilter, setStarFilter] = useState(0);
  const [facilityFilter, setFacilityFilter] = useState(-1);
  const [npcTypeFilter, setNpcTypeFilter] = useState(-1);
  const [colorFilter, setColorFilter] = useState(-1);
  const [includeNpcStatus, setIncludeNpcStatus] = useState(false);
  const [results, setResults] = useState<Gen7FestivalPlazaResult[]>([]);
  const [progress, setProgress] = useState<Gen7FestivalPlazaProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen7FestivalPlazaSummary>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "frame", direction: "asc" });
  const tableRef = useRef<HTMLDivElement>(null);

  const facilityOptions = useMemo(
    () => gen7FestivalPlazaFacilityOptions(version, starFilter),
    [starFilter, version],
  );

  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    if (facilityFilter !== -1 && !facilityOptions.includes(facilityFilter))
      setFacilityFilter(-1);
  }, [facilityFilter, facilityOptions]);

  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort((left, right) => {
      const leftValue =
        sort.key === "facility"
          ? facilityLabel(left)
          : sort.key === "npcStatus"
            ? formatGen7FestivalPlazaNpcStatus(left.npcStatus)
            : left[sort.key];
      const rightValue =
        sort.key === "facility"
          ? facilityLabel(right)
          : sort.key === "npcStatus"
            ? formatGen7FestivalPlazaNpcStatus(right.npcStatus)
            : right[sort.key];
      if (typeof leftValue === "bigint" && typeof rightValue === "bigint")
        return (
          (leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0) *
          multiplier
        );
      if (typeof leftValue === "string" && typeof rightValue === "string")
        return leftValue.localeCompare(rightValue) * multiplier;
      return (Number(leftValue) - Number(rightValue)) * multiplier;
    });
  }, [results, sort]);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const readRequest = () => {
    const minFrame = parseDecimal(startingFrame);
    const maximumOffset = parseDecimal(maxResults);
    const request: Gen7FestivalPlazaRequest = {
      version,
      seed: parseHex(seed),
      minFrame,
      maxFrame: minFrame + maximumOffset,
      npc: parseDecimal(npc),
      delay: parseDecimal(delay),
      rank,
      starFilter,
      facilityFilter,
      npcTypeFilter,
      colorFilter,
      includeNpcStatus,
      resultLimit: GEN7_FESTIVAL_PLAZA_MAX_RESULTS,
    };
    return validateGen7FestivalPlazaRequest(request);
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    let request: Gen7FestivalPlazaRequest;
    try {
      request = readRequest();
    } catch {
      setError(t("invalidGen7FestivalPlazaInput"));
      setStatus("failed");
      return;
    }
    setResults([]);
    setSummary(undefined);
    setError("");
    setProgress({
      processedStates: 0,
      totalStates: request.maxFrame - request.minFrame + 1,
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");
    try {
      const nextSummary = await engine.search(request, {
        onBatch: (batch) => setResults((current) => current.concat(batch)),
        onProgress: setProgress,
      });
      setSummary(nextSummary);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
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
    setError("");
    setStatus("ready");
  };

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      [
        t("gen7FestivalPlazaIndex"),
        t("gen7FestivalPlazaActualHit"),
        t("gen7FestivalPlazaMark"),
        t("gen7Clock"),
        t("gen7FestivalPlazaFacilityResult"),
        t("gen7RandomNumber"),
        t("gen7FestivalPlazaTime"),
        t("gen7FestivalPlazaNpcStatus"),
      ],
      ...sortedResults.map((result) => [
        result.frame,
        result.actualFrame,
        formatGen7FestivalPlazaBlinkMark(result.blink),
        result.clock,
        facilityLabel(result),
        formatGen7FestivalPlazaHex64(result.random),
        formatRealTime(result.realTimeFrames),
        formatGen7FestivalPlazaNpcStatus(result.npcStatus),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => csvCell(value)).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen7-festival-plaza.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const columns: { key: SortKey; label: string }[] = [
    { key: "frame", label: t("gen7FestivalPlazaIndex") },
    { key: "actualFrame", label: t("gen7FestivalPlazaActualHit") },
    { key: "blink", label: t("gen7FestivalPlazaMark") },
    { key: "clock", label: t("gen7Clock") },
    { key: "facility", label: t("gen7FestivalPlazaFacilityResult") },
    { key: "random", label: t("gen7RandomNumber") },
    { key: "realTimeFrames", label: t("gen7FestivalPlazaTime") },
    { key: "npcStatus", label: t("gen7FestivalPlazaNpcStatus") },
  ];

  return (
    <div className="gen7festivalplaza-panel">
      <div className="gen7festivalplaza-workspace">
        <form className="panel gen7festivalplaza-controls" onSubmit={generate}>
          <div className="gen7festivalplaza-heading">
            <span className="panel-index">01</span>
            <h2>{t("gen7FestivalPlazaSetup")}</h2>
          </div>
          <div className="gen7festivalplaza-control-section">
            <div className="gen7festivalplaza-field-grid">
              <label className="field">
                <span>Game</span>
                <Select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    setVersion(event.target.value as Gen7FestivalPlazaVersion)
                  }
                  value={version}
                >
                  {VERSION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{t("seed")}</span>
                <div className="prefixed-input">
                  <span>0x</span>
                  <input
                    disabled={status === "calculating"}
                    inputMode="text"
                    maxLength={8}
                    onChange={(event) =>
                      setSeed(normalizeHexInput(event.target.value, 8))
                    }
                    value={seed}
                  />
                </div>
              </label>
              <label className="field">
                <span>{t("gen7FestivalPlazaStartingFrame")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={1_000_000_000}
                  onChange={(event) =>
                    setStartingFrame(
                      normalizeDecimalInput(
                        event.target.value,
                        1_000_000_000,
                        10,
                      ),
                    )
                  }
                  value={startingFrame}
                />
              </label>
              <label className="field">
                <span>{t("maxResults")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={1_000_000_000}
                  onChange={(event) =>
                    setMaxResults(
                      normalizeDecimalInput(
                        event.target.value,
                        1_000_000_000,
                        10,
                      ),
                    )
                  }
                  value={maxResults}
                />
              </label>
              <label className="field">
                <span>NPC</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={100}
                  onChange={(event) =>
                    setNpc(normalizeDecimalInput(event.target.value, 100, 3))
                  }
                  value={npc}
                />
              </label>
              <label className="field">
                <span>{t("gen7FestivalPlazaDelay")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={10_000}
                  onChange={(event) =>
                    setDelay(
                      normalizeDecimalInput(event.target.value, 10_000, 5),
                    )
                  }
                  value={delay}
                />
              </label>
              <label className="field">
                <span>{t("gen7FestivalPlazaRank")}</span>
                <Select
                  disabled={status === "calculating"}
                  onChange={(event) => setRank(Number(event.target.value))}
                  value={rank}
                >
                  {RANK_OPTIONS.map((option, index) => (
                    <option key={option} value={index}>
                      {option}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>★</span>
                <Select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    setStarFilter(Number(event.target.value))
                  }
                  value={starFilter}
                >
                  <option value={0}>-</option>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <option key={star} value={star}>
                      {star}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{t("gen7FestivalPlazaFacility")}</span>
                <Select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    setFacilityFilter(Number(event.target.value))
                  }
                  value={facilityFilter}
                >
                  <option value={-1}>-</option>
                  {facilityOptions.map((facility) => (
                    <option key={facility} value={facility}>
                      {GEN7_FESTIVAL_PLAZA_FACILITIES[facility]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>NPC</span>
                <Select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    setNpcTypeFilter(Number(event.target.value))
                  }
                  value={npcTypeFilter}
                >
                  <option value={-1}>-</option>
                  {GEN7_FESTIVAL_PLAZA_NPC_TYPES.map((npcType, index) => (
                    <option key={npcType} value={index}>
                      {npcType}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{t("gen7FestivalPlazaColor")}</span>
                <Select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    setColorFilter(Number(event.target.value))
                  }
                  value={colorFilter}
                >
                  <option value={-1}>-</option>
                  {[0, 1, 2, 3].map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="gen7festivalplaza-checkbox-row">
                <input
                  checked={includeNpcStatus}
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    setIncludeNpcStatus(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>{t("gen7FestivalPlazaNpcStatus")}</span>
              </label>
            </div>
          </div>
          <div className="gen7festivalplaza-run-actions">
            <button
              className="gen7festivalplaza-primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={17} />
              {t("gen7FestivalPlazaCalculate")}
            </button>
            <button
              aria-label={t("cancel")}
              className="gen7festivalplaza-icon-button"
              disabled={status !== "calculating"}
              onClick={() => engine.cancel()}
              title={t("cancel")}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
            </button>
          </div>
        </form>

        <section className="panel gen7festivalplaza-results">
          <div className="gen7festivalplaza-results-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
              <span className={`run-status ${status}`}>{t(status)}</span>
            </div>
            <div className="gen7festivalplaza-result-actions">
              <output>{results.length.toLocaleString()}</output>
              <button
                aria-label={t("exportCsv")}
                className="gen7festivalplaza-icon-button"
                disabled={results.length === 0}
                onClick={exportCsv}
                title={t("exportCsv")}
                type="button"
              >
                <Download aria-hidden="true" size={17} />
              </button>
              <button
                aria-label={t("clear")}
                className="gen7festivalplaza-icon-button"
                disabled={results.length === 0}
                onClick={clearResults}
                title={t("clear")}
                type="button"
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
          </div>
          <div
            aria-label={`${progress.percent}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress.percent}
            className="progress-track"
            role="progressbar"
          >
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="metrics-row gen7festivalplaza-metrics">
            <span>
              {t("gen7FestivalPlazaFrames")}{" "}
              <strong>{progress.processedStates.toLocaleString()}</strong>
            </span>
            <span>
              {t("results")}{" "}
              <strong>{progress.resultCount.toLocaleString()}</strong>
            </span>
            <span>
              {t("workers")} <strong>{summary?.workerCount ?? 1}</strong>
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
          <div
            className="table-shell gen7festivalplaza-table-shell"
            ref={tableRef}
          >
            {sortedResults.length === 0 ? (
              <div className="empty-state compact">
                <span>{t("emptyGen7FestivalPlaza")}</span>
              </div>
            ) : (
              <div
                className="gen7festivalplaza-virtual-table"
                style={{ height: `${virtualizer.getTotalSize() + 40}px` }}
              >
                <div className="gen7festivalplaza-table-header">
                  <span aria-hidden="true" />
                  {columns.map((column, index) => (
                    <button
                      aria-label={`${column.label} ${
                        sort.key === column.key
                          ? t(
                              sort.direction === "asc"
                                ? "sortedAscending"
                                : "sortedDescending",
                            )
                          : ""
                      }`}
                      key={`${column.key}-${index}`}
                      onClick={() => toggleSort(column.key)}
                      type="button"
                    >
                      {column.label}
                      {sort.key === column.key &&
                        (sort.direction === "asc" ? (
                          <ArrowUp aria-hidden="true" size={13} />
                        ) : (
                          <ArrowDown aria-hidden="true" size={13} />
                        ))}
                    </button>
                  ))}
                </div>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const result = sortedResults[virtualRow.index];
                  return (
                    <div
                      className="gen7festivalplaza-table-row"
                      key={`${result.frame}-${result.random}-${virtualRow.index}`}
                      style={{
                        transform: `translateY(${virtualRow.start + 40}px)`,
                      }}
                    >
                      <button
                        aria-label={t("gen7FestivalPlazaSetStartingFrame", {
                          frame: result.frame,
                        })}
                        onClick={() => setStartingFrame(String(result.frame))}
                        title={t("gen7FestivalPlazaSetStartingFrame", {
                          frame: result.frame,
                        })}
                        type="button"
                      >
                        <CornerDownLeft aria-hidden="true" size={15} />
                      </button>
                      <span>{result.frame}</span>
                      <span>{result.actualFrame}</span>
                      <span>
                        {formatGen7FestivalPlazaBlinkMark(result.blink)}
                      </span>
                      <span>{result.clock}</span>
                      <span>{facilityLabel(result)}</span>
                      <span>{formatGen7FestivalPlazaHex64(result.random)}</span>
                      <span>{formatRealTime(result.realTimeFrames)}</span>
                      <span>
                        {formatGen7FestivalPlazaNpcStatus(result.npcStatus)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
