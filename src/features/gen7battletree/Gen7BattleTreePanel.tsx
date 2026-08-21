import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CornerDownLeft, Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  formatGen7BattleTreeHex64,
  GEN7_BATTLETREE_MAX_RESULTS,
  GEN7_BATTLETREE_SPECIAL_TRAINERS,
  gen7BattleTreeTrainerLabel,
  validateGen7BattleTreeRequest,
  type Gen7BattleTreeRequest,
  type Gen7BattleTreeResult,
  type Gen7BattleTreeVersion,
} from "./domain";
import "./Gen7BattleTreePanel.css";
import { Gen7BattleTreeUiPreviewEngine } from "./preview/Gen7BattleTreeUiPreviewEngine";
import type {
  Gen7BattleTreeEngine,
  Gen7BattleTreeProgress,
  Gen7BattleTreeSummary,
} from "./search";
import { Gen7BattleTreeWorker } from "./worker/Gen7BattleTreeWorker";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type SortKey = keyof Gen7BattleTreeResult;

const VERSION_OPTIONS: { value: Gen7BattleTreeVersion; label: string }[] = [
  { value: "sun", label: "gen7Sun" },
  { value: "moon", label: "gen7Moon" },
  { value: "ultra-sun", label: "gen7UltraSun" },
  { value: "ultra-moon", label: "gen7UltraMoon" },
];

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

export function Gen7BattleTreePanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen7BattleTreeEngine>(
    () =>
      uiPreviewMode
        ? new Gen7BattleTreeUiPreviewEngine()
        : new Gen7BattleTreeWorker(),
    [uiPreviewMode],
  );
  const [version, setVersion] = useState<Gen7BattleTreeVersion>("sun");
  const [seed, setSeed] = useState("00000000");
  const [startingFrame, setStartingFrame] = useState("0");
  const [maxResults, setMaxResults] = useState("5000");
  const [npc, setNpc] = useState("0");
  const [delay, setDelay] = useState("0");
  const [streak, setStreak] = useState("1");
  const [trainerFilter, setTrainerFilter] = useState("254");
  const [results, setResults] = useState<Gen7BattleTreeResult[]>([]);
  const [progress, setProgress] = useState<Gen7BattleTreeProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen7BattleTreeSummary>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "frame", direction: "asc" });
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => engine.dispose(), [engine]);

  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort((left, right) => {
      const leftValue = left[sort.key];
      const rightValue = right[sort.key];
      if (typeof leftValue === "bigint" && typeof rightValue === "bigint")
        return (
          (leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0) *
          multiplier
        );
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

  const trainerFilterValue = parseDecimal(trainerFilter);
  const trainerFilterHint =
    trainerFilterValue >= 209
      ? t("any")
      : trainerFilterValue >= 192 && trainerFilterValue <= 205
        ? GEN7_BATTLETREE_SPECIAL_TRAINERS[trainerFilterValue - 192]
        : "";

  const readRequest = () => {
    const minFrame = parseDecimal(startingFrame);
    const maximumOffset = parseDecimal(maxResults);
    const request: Gen7BattleTreeRequest = {
      version,
      seed: parseHex(seed),
      minFrame,
      maxFrame: minFrame + maximumOffset,
      npc: parseDecimal(npc),
      delay: parseDecimal(delay),
      streak: parseDecimal(streak),
      trainerFilter: trainerFilterValue,
      resultLimit: GEN7_BATTLETREE_MAX_RESULTS,
    };
    return validateGen7BattleTreeRequest(request);
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    let request: Gen7BattleTreeRequest;
    try {
      request = readRequest();
    } catch {
      setError(t("invalidGen7BattleTreeInput"));
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
        t("gen7BattleTreeIndex"),
        t("gen7BattleTreeActualHit"),
        t("gen7BattleTreeMark"),
        t("gen7Clock"),
        t("gen7BattleTreeTrainerResult"),
        t("gen7RandomNumber"),
        t("gen7BattleTreeTime"),
      ],
      ...sortedResults.map((result) => [
        result.frame,
        result.actualFrame,
        result.blink,
        result.clock,
        gen7BattleTreeTrainerLabel(result.trainerId),
        formatGen7BattleTreeHex64(result.random),
        formatRealTime(result.realTimeFrames),
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen7-battle-tree.csv";
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
    { key: "frame", label: t("gen7BattleTreeIndex") },
    { key: "actualFrame", label: t("gen7BattleTreeActualHit") },
    { key: "blink", label: t("gen7BattleTreeMark") },
    { key: "clock", label: t("gen7Clock") },
    { key: "trainerId", label: t("gen7BattleTreeTrainerResult") },
    { key: "random", label: t("gen7RandomNumber") },
    { key: "realTimeFrames", label: t("gen7BattleTreeTime") },
  ];

  return (
    <div className="gen7battletree-panel">
      <div className="gen7battletree-workspace">
        <form className="panel gen7battletree-controls" onSubmit={generate}>
          <div className="gen7battletree-heading">
            <span className="panel-index">01</span>
            <h2>{t("gen7BattleTreeSetup")}</h2>
          </div>
          <div className="gen7battletree-control-section">
            <div className="gen7battletree-field-grid">
              <label className="field">
                <span>{t("gen7GameVersion")}</span>
                <Select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    setVersion(event.target.value as Gen7BattleTreeVersion)
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
                <span>{t("gen7BattleTreeStartingFrame")}</span>
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
                <span>{t("gen7BattleTreeNpc")}</span>
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
                <span>{t("gen7BattleTreeDelay")}</span>
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
                <span>{t("gen7BattleTreeStreak")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={10_000}
                  min={1}
                  onChange={(event) =>
                    setStreak(
                      normalizeDecimalInput(event.target.value, 10_000, 5),
                    )
                  }
                  value={streak}
                />
              </label>
              <label className="field gen7battletree-trainer-filter">
                <span>{t("gen7BattleTreeTrainer")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={254}
                  onChange={(event) =>
                    setTrainerFilter(
                      normalizeDecimalInput(event.target.value, 254, 3),
                    )
                  }
                  value={trainerFilter}
                />
                <small>{trainerFilterHint}</small>
              </label>
            </div>
          </div>
          <div className="gen7battletree-run-actions">
            <button
              className="gen7battletree-primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={17} />
              {t("gen7BattleTreeCalculate")}
            </button>
            <button
              aria-label={t("cancel")}
              className="gen7battletree-icon-button"
              disabled={status !== "calculating"}
              onClick={() => engine.cancel()}
              title={t("cancel")}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
            </button>
          </div>
        </form>

        <section className="panel gen7battletree-results">
          <div className="gen7battletree-results-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
              <span className={`run-status ${status}`}>{t(status)}</span>
            </div>
            <div className="gen7battletree-result-actions">
              <output>{results.length.toLocaleString()}</output>
              <button
                aria-label={t("exportCsv")}
                className="gen7battletree-icon-button"
                disabled={results.length === 0}
                onClick={exportCsv}
                title={t("exportCsv")}
                type="button"
              >
                <Download aria-hidden="true" size={17} />
              </button>
              <button
                aria-label={t("clear")}
                className="gen7battletree-icon-button"
                disabled={results.length === 0}
                onClick={clearResults}
                title={t("clear")}
                type="button"
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
          </div>
          <div className="metrics-row gen7battletree-metrics">
            <span>
              {t("gen7BattleTreeFrames")}{" "}
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
            className="table-shell gen7battletree-table-shell"
            ref={tableRef}
          >
            {sortedResults.length === 0 ? (
              <div className="empty-state compact">
                <span>{t("emptyGen7BattleTree")}</span>
              </div>
            ) : (
              <div
                className="gen7battletree-virtual-table"
                style={{ height: `${virtualizer.getTotalSize() + 40}px` }}
              >
                <div className="gen7battletree-table-header">
                  <span aria-hidden="true" />
                  {columns.map((column) => (
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
                      key={column.key}
                      onClick={() => toggleSort(column.key)}
                      type="button"
                    >
                      {column.label}
                      {sort.key === column.key
                        ? sort.direction === "asc"
                          ? " +"
                          : " -"
                        : ""}
                    </button>
                  ))}
                </div>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const result = sortedResults[virtualRow.index];
                  return (
                    <div
                      className="gen7battletree-table-row"
                      key={`${result.frame}-${result.random}-${virtualRow.index}`}
                      style={{
                        transform: `translateY(${virtualRow.start + 40}px)`,
                      }}
                    >
                      <button
                        aria-label={t("gen7BattleTreeSetStartingFrame", {
                          frame: result.frame,
                        })}
                        onClick={() => setStartingFrame(String(result.frame))}
                        title={t("gen7BattleTreeSetStartingFrame", {
                          frame: result.frame,
                        })}
                        type="button"
                      >
                        <CornerDownLeft aria-hidden="true" size={15} />
                      </button>
                      <span>{result.frame}</span>
                      <span>{result.actualFrame}</span>
                      <span>{result.blink}</span>
                      <span>{result.clock}</span>
                      <span>
                        {gen7BattleTreeTrainerLabel(result.trainerId)}
                      </span>
                      <span>{formatGen7BattleTreeHex64(result.random)}</span>
                      <span>{formatRealTime(result.realTimeFrames)}</span>
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
