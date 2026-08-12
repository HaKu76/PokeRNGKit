import { useVirtualizer } from "@tanstack/react-virtual";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { formatHex, parseDecimal, parseHex } from "../id/domain";
import {
  GEN3_INITIAL_SEED_DEFAULT_MAX_RESULTS,
  GEN3_INITIAL_SEED_MAX_RESULTS,
  GEN3_INITIAL_SEED_MAX_TOTAL_STATES,
  validateGen3RsInitialSeedRequest,
  validateGen3TargetInitialSeedRequest,
  type Gen3InitialSeedOperation,
  type Gen3InitialSeedState,
} from "./domain";
import { Gen3InitialSeedUiPreviewEngine } from "./preview/Gen3InitialSeedUiPreviewEngine";
import type {
  Gen3InitialSeedSearchOptions,
  Gen3InitialSeedSearchSummary,
} from "./search";
import { Gen3InitialSeedWorkerPool } from "./worker/Gen3InitialSeedWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type SortKey = "initialSeed" | "advances";

interface InitialSeedEngine {
  findRsIds(
    request: { tid: number; sid: number },
    options?: Gen3InitialSeedSearchOptions,
  ): Promise<Gen3InitialSeedSearchSummary>;
  findTarget(
    request: { targetSeed: number; maxResults: number },
    options?: Gen3InitialSeedSearchOptions,
  ): Promise<Gen3InitialSeedSearchSummary>;
  cancel(): void;
  dispose(): void;
}

export function Gen3InitialSeedPanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<InitialSeedEngine>(
    () =>
      uiPreviewMode
        ? new Gen3InitialSeedUiPreviewEngine()
        : new Gen3InitialSeedWorkerPool(),
    [uiPreviewMode],
  );
  const [operation, setOperation] =
    useState<Gen3InitialSeedOperation>("rs-ids");
  const [tid, setTid] = useState("0");
  const [sid, setSid] = useState("0");
  const [targetSeed, setTargetSeed] = useState("");
  const [maxResults, setMaxResults] = useState(
    String(GEN3_INITIAL_SEED_DEFAULT_MAX_RESULTS),
  );
  const [results, setResults] = useState<Gen3InitialSeedState[]>([]);
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Gen3InitialSeedSearchSummary>();
  const [progress, setProgress] = useState({
    processedStates: 0,
    totalStates: 0x1_0000,
    resultCount: 0,
    percent: 0,
  });
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "advances", direction: "asc" },
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => engine.dispose(), [engine]);

  const sortedResults = useMemo(
    () =>
      [...results].sort((left, right) => {
        const difference = left[sort.key] - right[sort.key];
        return sort.direction === "asc" ? difference : -difference;
      }),
    [results, sort],
  );
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    estimateSize: () => 42,
    getScrollElement: () => scrollRef.current,
    overscan: 8,
  });
  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];

  const clearRunState = (nextOperation: Gen3InitialSeedOperation) => {
    if (status === "calculating") return;
    setOperation(nextOperation);
    setResults([]);
    setSummary(undefined);
    setError("");
    setStatus("ready");
    setProgress({
      processedStates: 0,
      totalStates:
        nextOperation === "rs-ids"
          ? 0x1_0000
          : GEN3_INITIAL_SEED_MAX_TOTAL_STATES,
      resultCount: 0,
      percent: 0,
    });
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;

    const rsRequest = {
      tid: parseDecimal(tid) ?? Number.NaN,
      sid: parseDecimal(sid) ?? Number.NaN,
    };
    const targetRequest = {
      targetSeed: parseHex(targetSeed) ?? 0,
      maxResults: parseDecimal(maxResults) ?? Number.NaN,
    };
    const errors =
      operation === "rs-ids"
        ? validateGen3RsInitialSeedRequest(rsRequest)
        : validateGen3TargetInitialSeedRequest(targetRequest);
    if (errors.length > 0) {
      setError(t("invalidInitialSeedInput"));
      setStatus("failed");
      return;
    }

    setResults([]);
    setSummary(undefined);
    setError("");
    setProgress({
      processedStates: 0,
      totalStates:
        operation === "rs-ids" ? 0x1_0000 : GEN3_INITIAL_SEED_MAX_TOTAL_STATES,
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");
    try {
      const options: Gen3InitialSeedSearchOptions = {
        onBatch: (batch) => setResults((current) => current.concat(batch)),
        onProgress: setProgress,
      };
      const nextSummary =
        operation === "rs-ids"
          ? await engine.findRsIds(rsRequest, options)
          : await engine.findTarget(targetRequest, options);
      setSummary(nextSummary);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      [t("initialSeed"), t("rowAdvance")],
      ...sortedResults.map((state) => [
        formatHex(state.initialSeed, 4),
        state.advances,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${rows.map((row) => row.join(",")).join("\n")}`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen3initialseed-${operation}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
  };

  const sortLabel = (key: SortKey) => {
    if (sort.key !== key) return "";
    return sort.direction === "asc" ? " ↑" : " ↓";
  };

  return (
    <>
      <div
        aria-label={t("initialSeedEngine")}
        className="operation-tabs"
        role="tablist"
      >
        {(["rs-ids", "frlg-rse"] as const).map((entry) => (
          <button
            aria-selected={operation === entry}
            className={operation === entry ? "active" : ""}
            disabled={status === "calculating"}
            key={entry}
            onClick={() => clearRunState(entry)}
            role="tab"
            type="button"
          >
            {t(entry === "rs-ids" ? "rsIds" : "frlgRse")}
          </button>
        ))}
      </div>
      <form className="initial-seed-control-grid" onSubmit={run}>
        <section className="panel static-panel initial-seed-input-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("input")}</h2>
            </div>
            <span className="panel-note">PokeRNG / PokeRNGR</span>
          </div>
          <div className="static-form-stack">
            {operation === "rs-ids" ? (
              <>
                <label className="field">
                  <span>{t("tid")}</span>
                  <input
                    inputMode="numeric"
                    maxLength={5}
                    onChange={(event) =>
                      setTid(
                        normalizeDecimalInput(event.target.value, 0xffff, 5),
                      )
                    }
                    value={tid}
                  />
                </label>
                <label className="field">
                  <span>{t("sid")}</span>
                  <input
                    inputMode="numeric"
                    maxLength={5}
                    onChange={(event) =>
                      setSid(
                        normalizeDecimalInput(event.target.value, 0xffff, 5),
                      )
                    }
                    value={sid}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  <span>{t("targetSeed")}</span>
                  <input
                    maxLength={8}
                    onChange={(event) =>
                      setTargetSeed(normalizeHexInput(event.target.value, 8))
                    }
                    value={targetSeed}
                  />
                </label>
                <label className="field">
                  <span>{t("maxResults")}</span>
                  <input
                    inputMode="numeric"
                    maxLength={5}
                    onChange={(event) =>
                      setMaxResults(
                        normalizeDecimalInput(
                          event.target.value,
                          GEN3_INITIAL_SEED_MAX_RESULTS,
                          5,
                        ),
                      )
                    }
                    value={maxResults}
                  />
                </label>
              </>
            )}
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {t("search")}
            </button>
            {status === "calculating" && (
              <button
                className="secondary-action"
                onClick={() => engine.cancel()}
                type="button"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </section>

        <section className="panel static-panel initial-seed-notes-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("information")}</h2>
            </div>
            <span className="panel-note">Gen III / API 1</span>
          </div>
          <div className="initial-seed-details">
            <div>
              <span>{t("initialSeed")}</span>
              <strong>0x0000 - 0xFFFF</strong>
            </div>
            <div>
              <span>{t("rowAdvance")}</span>
              <strong>
                {operation === "rs-ids" ? "TID frame" : "Reverse PokeRNG"}
              </strong>
            </div>
          </div>
        </section>
      </form>

      <section className="panel results-panel initial-seed-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">03</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{statusLabel}</span>
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
        {error && (
          <div className="alert error">
            {error.includes("Wasm") || error.includes("wasm")
              ? t("initialSeedWasmMissing")
              : error}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="alert warning">{t("limitReached")}</div>
        )}
        <div className="table-shell initial-seed-table-shell" ref={scrollRef}>
          {sortedResults.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyInitialSeed")}</span>
            </div>
          ) : (
            <div
              className="initial-seed-virtual-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 38}px` }}
            >
              <div className="initial-seed-table-header">
                {(["initialSeed", "advances"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => toggleSort(key)}
                    type="button"
                  >
                    {t(key === "initialSeed" ? "initialSeed" : "rowAdvance")}
                    {sortLabel(key)}
                  </button>
                ))}
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const state = sortedResults[virtualRow.index];
                return (
                  <div
                    className="initial-seed-table-row"
                    key={`${state.initialSeed}-${state.advances}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 38}px)`,
                    }}
                  >
                    <span>{formatHex(state.initialSeed, 4)}</span>
                    <span>{String(state.advances)}</span>
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
