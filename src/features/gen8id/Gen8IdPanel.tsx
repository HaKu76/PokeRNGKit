import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  GEN8_ID_MAX_ADVANCES,
  normalizeGen8IdFilterText,
  parseGen8IdFilters,
  parseGen8IdSeed,
  validateGen8IdRequest,
  type Gen8IdFilterMode,
  type Gen8IdRequest,
  type Gen8IdState,
} from "./domain";
import { Gen8IdUiPreviewEngine } from "./preview/Gen8IdUiPreviewEngine";
import type { Gen8IdEngine, Gen8IdProgress, Gen8IdSummary } from "./search";
import { Gen8IdWorkerPool } from "./worker/Gen8IdWorkerPool";

type VisibleFilterMode = Exclude<Gen8IdFilterMode, "none">;
type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";

const FILTER_MODES: readonly VisibleFilterMode[] = [
  "tid",
  "sid",
  "tidSid",
  "pid",
  "tsv",
  "displayTid",
];

function filterLabel(mode: VisibleFilterMode) {
  return mode === "tid"
    ? "TID"
    : mode === "sid"
      ? "SID"
      : mode === "tidSid"
        ? "TID/SID"
        : mode === "pid"
          ? "PID"
          : mode === "tsv"
            ? "TSV"
            : "Display TID";
}

function parseAdvance(value: string) {
  if (value === "") return 0;
  if (!/^\d{1,10}$/.test(value)) return Number.NaN;
  const parsed = Number(value);
  return parsed <= GEN8_ID_MAX_ADVANCES ? parsed : Number.NaN;
}

export function Gen8IdPanel({ uiPreviewMode }: { uiPreviewMode: boolean }) {
  const { t } = useTranslation();
  const engine = useMemo<Gen8IdEngine>(
    () =>
      uiPreviewMode ? new Gen8IdUiPreviewEngine() : new Gen8IdWorkerPool(),
    [uiPreviewMode],
  );
  const [seed0, setSeed0] = useState("");
  const [seed1, setSeed1] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [filterMode, setFilterMode] = useState<VisibleFilterMode>("tid");
  const [filterText, setFilterText] = useState("");
  const [results, setResults] = useState<Gen8IdState[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState<{ title?: string; message: string }>();
  const [progress, setProgress] = useState<Gen8IdProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen8IdSummary>();
  const tableRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const calculating = status === "calculating";
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 44,
    overscan: 14,
  });

  useEffect(() => () => engine.dispose(), [engine]);

  const selectResult = (index: number, focus = false) => {
    if (results.length === 0) return;
    const nextIndex = Math.max(0, Math.min(results.length - 1, index));
    setSelectedIndex(nextIndex);
    rowVirtualizer.scrollToIndex(nextIndex, { align: "auto" });
    if (focus) requestAnimationFrame(() => gridRef.current?.focus());
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;

    const parsedSeed0 = parseGen8IdSeed(seed0);
    const parsedSeed1 = parseGen8IdSeed(seed1);
    if (parsedSeed0 === 0n && parsedSeed1 === 0n) {
      setError({
        title: t("gen8IdMissingSeeds"),
        message: t("gen8IdMissingSeedsMessage"),
      });
      setStatus("failed");
      return;
    }
    const filters = parseGen8IdFilters(filterMode, filterText);
    const request: Gen8IdRequest = {
      seed0: parsedSeed0 ?? -1n,
      seed1: parsedSeed1 ?? -1n,
      initialAdvances: parseAdvance(initialAdvances),
      maxAdvances: parseAdvance(maxAdvances),
      filters: filters ?? { mode: "none", values: [Number.NaN] },
    };
    if (validateGen8IdRequest(request).length > 0) {
      setError({ message: t("gen8IdInvalidInput") });
      setStatus("failed");
      return;
    }

    setResults([]);
    setSelectedIndex(undefined);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: request.maxAdvances,
      resultCount: 0,
      percent: request.maxAdvances === 0 ? 100 : 0,
    });
    setError(undefined);
    setStatus("calculating");
    try {
      const next = await engine.search(request, {
        onBatch: (batch) => setResults((current) => [...current, ...batch]),
        onProgress: setProgress,
      });
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError({
        message: cause instanceof Error ? cause.message : String(cause),
      });
      setStatus("failed");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Advances", "Display TID", "TID", "SID", "TSV"],
      ...results.map((state) => [
        state.advances,
        state.displayTid,
        state.tid,
        state.sid,
        state.tsv,
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen8id.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    setResults([]);
    setSelectedIndex(undefined);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
    setStatus("ready");
    setError(undefined);
  };

  return (
    <>
      <form className="gen8id-control-grid" onSubmit={run}>
        <section className="panel gen8id-rng-panel">
          <div className="panel-heading gen8id-panel-heading">
            <h2>{t("gen8IdRngInfo")}</h2>
          </div>
          <div className="static-form-stack">
            <div className="compact-field-row gen8id-advance-fields">
              <label className="field">
                <span>{t("gen8IdInitialAdvances")}</span>
                <input
                  inputMode="numeric"
                  disabled={calculating}
                  maxLength={10}
                  onChange={(event) =>
                    setInitialAdvances(
                      normalizeDecimalInput(
                        event.target.value,
                        GEN8_ID_MAX_ADVANCES,
                        10,
                      ),
                    )
                  }
                  value={initialAdvances}
                />
              </label>
              <label className="field">
                <span>{t("gen8IdMaxAdvances")}</span>
                <input
                  inputMode="numeric"
                  disabled={calculating}
                  maxLength={10}
                  onChange={(event) =>
                    setMaxAdvances(
                      normalizeDecimalInput(
                        event.target.value,
                        GEN8_ID_MAX_ADVANCES,
                        10,
                      ),
                    )
                  }
                  value={maxAdvances}
                />
              </label>
            </div>
            <label className="field gen8id-seed-field">
              <span>Seed 0</span>
              <input
                autoComplete="off"
                disabled={calculating}
                inputMode="text"
                maxLength={18}
                onChange={(event) =>
                  setSeed0(normalizeHexInput(event.target.value, 16))
                }
                spellCheck={false}
                value={seed0}
              />
            </label>
            <label className="field gen8id-seed-field">
              <span>Seed 1</span>
              <input
                autoComplete="off"
                disabled={calculating}
                inputMode="text"
                maxLength={18}
                onChange={(event) =>
                  setSeed1(normalizeHexInput(event.target.value, 16))
                }
                spellCheck={false}
                value={seed1}
              />
            </label>
          </div>
          <div className="panel-actions gen8id-panel-actions">
            <button
              className="primary-action"
              disabled={calculating}
              type="submit"
            >
              {t("gen8IdGenerate")}
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

        <section className="panel gen8id-filter-panel">
          <div className="panel-heading gen8id-panel-heading">
            <h2>{t("gen8IdFilters")}</h2>
          </div>
          <div className="gen8id-filter-layout">
            <fieldset className="gen8id-filter-modes">
              <legend className="visually-hidden">{t("gen8IdFilters")}</legend>
              {FILTER_MODES.map((mode) => (
                <label key={mode}>
                  <input
                    checked={filterMode === mode}
                    disabled={calculating}
                    name="gen8id-filter-mode"
                    onChange={() => {
                      setFilterMode(mode);
                      setFilterText("");
                    }}
                    type="radio"
                  />
                  <span>{filterLabel(mode)}</span>
                </label>
              ))}
            </fieldset>
            <label className="field gen8id-filter-values">
              <span className="visually-hidden">{filterLabel(filterMode)}</span>
              <textarea
                aria-label={filterLabel(filterMode)}
                disabled={calculating}
                inputMode={
                  filterMode === "pid" || filterMode === "tidSid"
                    ? "text"
                    : "numeric"
                }
                onChange={(event) =>
                  setFilterText(
                    normalizeGen8IdFilterText(filterMode, event.target.value),
                  )
                }
                rows={10}
                spellCheck={false}
                value={filterText}
              />
            </label>
          </div>
        </section>
      </form>

      <section
        aria-label={t("results")}
        aria-busy={calculating}
        className="panel results-panel gen8id-results-panel"
      >
        <div className="results-heading gen8id-results-heading">
          <span aria-live="polite" className={`run-status ${status}`}>
            {t(status)}
          </span>
          <div className="result-actions">
            <span className="result-count">{results.length}</span>
            <button
              aria-label={t("exportCsv")}
              className="icon-action"
              disabled={!results.length || calculating}
              onClick={exportCsv}
              title={t("exportCsv")}
              type="button"
            >
              <Download aria-hidden="true" size={18} />
            </button>
            <button
              aria-label={t("clear")}
              className="icon-action"
              disabled={calculating || (!results.length && status === "ready")}
              onClick={clearResults}
              title={t("clear")}
              type="button"
            >
              <Trash2 aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
        <div className="metrics-row">
          <span>
            {t("results")} <strong>{progress.resultCount}</strong>
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
          <div className="alert error gen8id-alert" role="alert">
            {error.title && <strong>{error.title}</strong>}
            <span>{error.message}</span>
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="alert warning">{t("limitReached")}</div>
        )}
        <div className="table-shell gen8id-table-shell" ref={tableRef}>
          {results.length === 0 ? (
            <div className="empty-state compact">
              <span>{t("emptyGen8Id")}</span>
            </div>
          ) : (
            <div
              aria-colcount={5}
              aria-label={t("results")}
              aria-rowcount={results.length + 1}
              className="virtual-table gen8id-virtual-table"
              onFocus={() => {
                if (selectedIndex === undefined) setSelectedIndex(0);
              }}
              onKeyDown={(event) => {
                const current = selectedIndex ?? 0;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedIndex(current);
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  selectResult(current + 1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  selectResult(current - 1);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  selectResult(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  selectResult(results.length - 1);
                }
              }}
              ref={gridRef}
              role="grid"
              style={{ height: `${rowVirtualizer.getTotalSize() + 44}px` }}
              tabIndex={0}
            >
              <div aria-rowindex={1} className="table-header" role="row">
                <span role="columnheader">{t("gen8IdAdvances")}</span>
                <span role="columnheader">Display TID</span>
                <span role="columnheader">TID</span>
                <span role="columnheader">SID</span>
                <span role="columnheader">TSV</span>
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const state = results[virtualRow.index];
                return (
                  <div
                    aria-rowindex={virtualRow.index + 2}
                    aria-selected={selectedIndex === virtualRow.index}
                    className={`table-row${
                      selectedIndex === virtualRow.index ? " selected" : ""
                    }`}
                    data-gen8id-row={virtualRow.index}
                    key={`${virtualRow.index}-${state.advances}-${state.tid}-${state.sid}`}
                    onClick={() => selectResult(virtualRow.index, true)}
                    role="row"
                    style={{
                      transform: `translateY(${virtualRow.start + 44}px)`,
                    }}
                  >
                    <span role="gridcell">{state.advances}</span>
                    <span role="gridcell">{state.displayTid}</span>
                    <span role="gridcell">{state.tid}</span>
                    <span role="gridcell">{state.sid}</span>
                    <span role="gridcell">{state.tsv}</span>
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
