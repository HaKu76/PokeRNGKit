import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  formatGen6IdRandom,
  formatGen6IdState,
  GEN6_ID_BROWSER_MAX_FRAME,
  GEN6_ID_MAX_FRAME,
  GEN6_ID_MAX_RESULTS,
  parseGen6IdDecimal,
  parseGen6IdHex,
  type Gen6IdFilterMode,
  type Gen6IdRequest,
  type Gen6IdResult,
} from "./domain";
import { Gen6IdUiPreviewEngine } from "./preview/Gen6IdUiPreviewEngine";
import type { Gen6IdProgress, Gen6IdEngine, Gen6IdSummary } from "./search";
import { Gen6IdWorker } from "./worker/Gen6IdWorker";
import "./Gen6IdPanel.css";

function filterLabel(mode: Gen6IdFilterMode) {
  return mode === "tid" ? "TID" : mode === "sid" ? "SID" : "TID/SID";
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen6IdPanel({ uiPreviewMode }: { uiPreviewMode: boolean }) {
  const { t } = useTranslation();
  const engine = useMemo<Gen6IdEngine>(
    () => (uiPreviewMode ? new Gen6IdUiPreviewEngine() : new Gen6IdWorker()),
    [uiPreviewMode],
  );
  const [stateWords, setStateWords] = useState([
    "00000000",
    "00000000",
    "00000000",
    "00000000",
  ]);
  const [minFrame, setMinFrame] = useState("0");
  const [maxFrame, setMaxFrame] = useState("50000");
  const [resultLimit, setResultLimit] = useState("100000");
  const [filterMode, setFilterMode] = useState<Gen6IdFilterMode>("tid");
  const [idText, setIdText] = useState("");
  const [tsvText, setTsvText] = useState("");
  const [stateText, setStateText] = useState("");
  const [regularExpression, setRegularExpression] = useState(false);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [results, setResults] = useState<Gen6IdResult[]>([]);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen6IdProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen6IdSummary>();
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });
  useEffect(() => () => engine.dispose(), [engine]);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request: Gen6IdRequest = {
      state: stateWords.map((value) => parseGen6IdHex(value) ?? Number.NaN) as [
        number,
        number,
        number,
        number,
      ],
      minFrame: parseGen6IdDecimal(minFrame) ?? Number.NaN,
      maxFrame: parseGen6IdDecimal(maxFrame) ?? Number.NaN,
      resultLimit: parseGen6IdDecimal(resultLimit) ?? Number.NaN,
      filters: {
        mode: filterMode,
        disabled: filtersDisabled,
        regularExpression,
        idText,
        tsvText,
        stateText,
      },
    };
    try {
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
      const next = await engine.search(request, {
        onBatch: (batch) => setResults((current) => [...current, ...batch]),
        onProgress: setProgress,
      });
      setSummary(next);
      setStatus(next.cancelled ? "ready" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const exportCsv = () => {
    const rows = [
      [
        t("gen6IdFrame"),
        t("gen6IdRandom"),
        "TID",
        "SID",
        "TSV",
        "TRV",
        t("gen6IdState"),
      ],
      ...results.map((result) => [
        result.frame,
        formatGen6IdRandom(result.random),
        result.tid.toString().padStart(5, "0"),
        result.sid.toString().padStart(5, "0"),
        result.tsv.toString().padStart(4, "0"),
        result.trv.toString(16).toUpperCase(),
        formatGen6IdState(result.state),
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen6id.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gen6id-workspace">
      <form className="gen6id-controls" onSubmit={run}>
        <section className="panel gen6id-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6IdInput")}</h2>
            </div>
            <span className="panel-note">TinyMT / uint32</span>
          </div>
          <div className="gen6id-state-grid">
            {[3, 2, 1, 0].map((index) => (
              <label className="field" key={index}>
                <span>[{index}]</span>
                <input
                  autoComplete="off"
                  maxLength={8}
                  onChange={(event) => {
                    const next = [...stateWords];
                    next[index] = normalizeHexInput(event.target.value, 8);
                    setStateWords(next);
                  }}
                  spellCheck={false}
                  value={stateWords[index]}
                />
              </label>
            ))}
          </div>
          <div className="gen6id-frame-grid">
            <label className="field">
              <span>{t("gen6IdMinFrame")}</span>
              <input
                inputMode="numeric"
                max={GEN6_ID_MAX_FRAME}
                maxLength={10}
                min={0}
                onChange={(event) =>
                  setMinFrame(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_ID_MAX_FRAME,
                      10,
                    ),
                  )
                }
                value={minFrame}
              />
            </label>
            <label className="field">
              <span>{t("gen6IdMaxFrame")}</span>
              <input
                inputMode="numeric"
                max={GEN6_ID_MAX_FRAME}
                maxLength={10}
                min={0}
                onChange={(event) =>
                  setMaxFrame(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_ID_MAX_FRAME,
                      10,
                    ),
                  )
                }
                value={maxFrame}
              />
            </label>
            <label className="field">
              <span>{t("gen6IdResultLimit")}</span>
              <input
                inputMode="numeric"
                max={GEN6_ID_MAX_RESULTS}
                maxLength={6}
                min={1}
                onChange={(event) =>
                  setResultLimit(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_ID_MAX_RESULTS,
                      6,
                    ),
                  )
                }
                value={resultLimit}
              />
            </label>
          </div>
          <small className="gen6id-limit-note">
            {t("gen6IdBrowserLimit", {
              limit: GEN6_ID_BROWSER_MAX_FRAME.toLocaleString(),
            })}
          </small>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={16} />
              {t("gen6IdSearch")}
            </button>
            <button
              className="secondary-action"
              disabled={status !== "calculating"}
              onClick={() => engine.cancel()}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
              {t("cancel")}
            </button>
          </div>
        </section>
        <section className="panel gen6id-panel gen6id-filter-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("filters")}</h2>
            </div>
            <span className="panel-note">IDFilters</span>
          </div>
          <div
            className="gen6id-filter-mode"
            role="radiogroup"
            aria-label={t("gen6IdFilterMode")}
          >
            {(["tid", "sid", "full"] as const).map((mode) => (
              <label className={filterMode === mode ? "active" : ""} key={mode}>
                <input
                  checked={filterMode === mode}
                  name="gen6id-filter-mode"
                  onChange={() => setFilterMode(mode)}
                  type="radio"
                />
                <span>{filterLabel(mode)}</span>
              </label>
            ))}
          </div>
          <div className="gen6id-filter-grid">
            <label className="field">
              <span>{filterLabel(filterMode)}</span>
              <textarea
                aria-label={`${filterLabel(filterMode)} list`}
                onChange={(event) => setIdText(event.target.value)}
                rows={6}
                spellCheck={false}
                value={idText}
              />
            </label>
            <label className="field">
              <span>TSV</span>
              <textarea
                aria-label="TSV list"
                onChange={(event) => setTsvText(event.target.value)}
                rows={6}
                spellCheck={false}
                value={tsvText}
              />
            </label>
            <label className="field">
              <span>{t("gen6IdCurrentSeed")}</span>
              <textarea
                aria-label={`${t("gen6IdCurrentSeed")} list`}
                onChange={(event) => setStateText(event.target.value)}
                rows={6}
                spellCheck={false}
                value={stateText}
              />
            </label>
          </div>
          <div className="gen6id-filter-options">
            <label className="toggle-field">
              <input
                checked={regularExpression}
                onChange={(event) => setRegularExpression(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6IdRegularExpression")}</span>
            </label>
            <label className="toggle-field">
              <input
                checked={filtersDisabled}
                onChange={(event) => setFiltersDisabled(event.target.checked)}
                type="checkbox"
              />
              <span>{t("disableFilters")}</span>
            </label>
          </div>
        </section>
      </form>
      <section className="panel results-panel gen6id-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{t(status)}</span>
          </div>
          <div className="result-actions">
            <span className="result-count" aria-live="polite">
              {results.length.toLocaleString()}
            </span>
            <button
              className="secondary-action"
              disabled={!results.length}
              onClick={exportCsv}
              type="button"
            >
              <Download aria-hidden="true" size={16} />
              CSV
            </button>
            <button
              aria-label={t("clear")}
              className="icon-action"
              disabled={!results.length}
              onClick={() => setResults([])}
              title={t("clear")}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
        <div className="metrics-row">
          <span>
            {t("processed")}{" "}
            <strong>{progress.processedStates.toLocaleString()}</strong>
          </span>
          <span>
            {t("results")}{" "}
            <strong>{progress.resultCount.toLocaleString()}</strong>
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
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="alert warning">{t("limitReached")}</div>
        )}
        <div className="table-shell gen6id-table-shell" ref={tableRef}>
          {results.length === 0 ? (
            <div className="empty-state compact" role="status">
              <span>{error ? t("invalidGen6IdInput") : t("emptyGen6Id")}</span>
            </div>
          ) : (
            <div
              className="virtual-table gen6id-virtual-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="table-header">
                <span>{t("gen6IdFrame")}</span>
                <span>{t("gen6IdRandom")}</span>
                <span>TID</span>
                <span>SID</span>
                <span>TSV</span>
                <span>TRV</span>
                <span>{t("gen6IdState")}</span>
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = results[virtualRow.index];
                return (
                  <div
                    className="table-row"
                    key={`${result.frame}-${result.random}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 40}px)`,
                    }}
                  >
                    <span>{result.frame}</span>
                    <span>{formatGen6IdRandom(result.random)}</span>
                    <span>{result.tid.toString().padStart(5, "0")}</span>
                    <span>{result.sid.toString().padStart(5, "0")}</span>
                    <span>{result.tsv.toString().padStart(4, "0")}</span>
                    <span>{result.trv.toString(16).toUpperCase()}</span>
                    <span>{formatGen6IdState(result.state)}</span>
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
