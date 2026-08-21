import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  formatGen6TinyIndexDate,
  formatGen6TinyIndexHex,
  formatGen6TinyIndexState,
  gen6TinyIndexTaskCount,
  GEN6_TINYINDEX_MAX_INDEX,
  GEN6_TINYINDEX_MAX_MIN_INDEX,
  GEN6_TINYINDEX_MAX_RESULTS,
  GEN6_TINYINDEX_MAX_TASKS,
  parseGen6TinyIndexDecimal,
  parseGen6TinyIndexHex,
  tinyFinderMonthOffsetSeconds,
  type Gen6TinyIndexMode,
  type Gen6TinyIndexRequest,
  type Gen6TinyIndexResult,
} from "./domain";
import { Gen6TinyIndexUiPreviewEngine } from "./preview/Gen6TinyIndexUiPreviewEngine";
import type {
  Gen6TinyIndexEngine,
  Gen6TinyIndexProgress,
  Gen6TinyIndexSummary,
} from "./search";
import { Gen6TinyIndexWorker } from "./worker/Gen6TinyIndexWorker";
import "./Gen6TinyIndexPanel.css";

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function initialProgress(): Gen6TinyIndexProgress {
  return { processedStates: 0, totalStates: 0, resultCount: 0, percent: 0 };
}

const months = Array.from({ length: 12 }, (_, index) => ({
  label: String(index + 1).padStart(2, "0"),
  value: index + 1,
}));

export function Gen6TinyIndexPanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen6TinyIndexEngine>(
    () =>
      uiPreviewMode
        ? new Gen6TinyIndexUiPreviewEngine()
        : new Gen6TinyIndexWorker(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Gen6TinyIndexMode>("date");
  const [stateWords, setStateWords] = useState([
    "00000000",
    "00000000",
    "00000000",
    "00000000",
  ]);
  const [baseSeed, setBaseSeed] = useState("0000006F");
  const [year, setYear] = useState("2026");
  const [month, setMonth] = useState(1);
  const [monthText, setMonthText] = useState("01");
  const [minIndex, setMinIndex] = useState("0");
  const [maxIndex, setMaxIndex] = useState("50000");
  const [resultLimit, setResultLimit] = useState("100000");
  const [indexText, setIndexText] = useState("");
  const [stateText, setStateText] = useState("");
  const [regularExpression, setRegularExpression] = useState(false);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [results, setResults] = useState<Gen6TinyIndexResult[]>([]);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(initialProgress);
  const [summary, setSummary] = useState<Gen6TinyIndexSummary>();
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
    const parsedYear = parseGen6TinyIndexDecimal(year) ?? Number.NaN;
    const parsedMonth = month;
    const parsedMin = parseGen6TinyIndexDecimal(minIndex) ?? Number.NaN;
    const parsedMax = parseGen6TinyIndexDecimal(maxIndex) ?? Number.NaN;
    const yearSeconds =
      (parsedYear % 4 === 0 &&
      (parsedYear % 100 !== 0 || parsedYear % 400 === 0)
        ? 366
        : 365) * 86_400;
    const startSecond = mode === "date" ? 0 : 0;
    const indexCount = parsedMax - parsedMin + 1;
    const secondCount =
      mode === "date"
        ? Math.min(
            yearSeconds - tinyFinderMonthOffsetSeconds(parsedYear, parsedMonth),
            Math.max(1, Math.floor(GEN6_TINYINDEX_MAX_TASKS / indexCount)),
          )
        : 1;
    const request: Gen6TinyIndexRequest = {
      mode,
      state: stateWords.map(
        (value) => parseGen6TinyIndexHex(value) ?? Number.NaN,
      ) as [number, number, number, number],
      baseSeed: parseGen6TinyIndexHex(baseSeed) ?? Number.NaN,
      minIndex: parsedMin,
      maxIndex: parsedMax,
      year: parsedYear,
      month: parsedMonth,
      startSecond,
      secondCount,
      resultLimit: parseGen6TinyIndexDecimal(resultLimit) ?? Number.NaN,
      filters: {
        disabled: filtersDisabled,
        regularExpression,
        indexText,
        stateText,
      },
    };
    try {
      setResults([]);
      setSummary(undefined);
      setError("");
      setProgress({
        processedStates: 0,
        totalStates: gen6TinyIndexTaskCount(request),
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
        t("gen6TinyIndexDate"),
        "Seed",
        "Index",
        "Rand#",
        t("gen6TinyIndexState"),
      ],
      ...results.map((result) => [
        mode === "date"
          ? formatGen6TinyIndexDate(
              { year: Number(year) },
              result.elapsedSecond,
            )
          : "-",
        formatGen6TinyIndexHex(result.initialSeed),
        result.index,
        formatGen6TinyIndexHex(result.random),
        formatGen6TinyIndexState(result.state),
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen6tinyindex.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gen6tinyindex-workspace">
      <form className="gen6tinyindex-controls" onSubmit={run}>
        <section className="panel gen6tinyindex-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6TinyIndexInput")}</h2>
            </div>
            <span className="panel-note">TinyMT / uint32</span>
          </div>
          <div
            className="gen6tinyindex-mode"
            role="radiogroup"
            aria-label={t("gen6TinyIndexMode")}
          >
            {(["date", "generator"] as const).map((value) => (
              <label className={mode === value ? "active" : ""} key={value}>
                <input
                  checked={mode === value}
                  name="gen6tinyindex-mode"
                  onChange={() => setMode(value)}
                  type="radio"
                />
                <span>
                  {t(
                    value === "date"
                      ? "gen6TinyIndexDateSearcher"
                      : "gen6TinyIndexGenerator",
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="gen6tinyindex-state-grid">
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
          <div className="gen6tinyindex-input-grid">
            <label className="field">
              <span>{t("gen6TinyIndexSeed")}</span>
              <input
                autoComplete="off"
                maxLength={8}
                onChange={(event) =>
                  setBaseSeed(normalizeHexInput(event.target.value, 8))
                }
                spellCheck={false}
                value={baseSeed}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyIndexYear")}</span>
              <input
                inputMode="numeric"
                max={2080}
                min={2000}
                onChange={(event) =>
                  setYear(normalizeDecimalInput(event.target.value, 2080, 4))
                }
                value={year}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyIndexMonth")}</span>
              <AutoCompleteComboBox
                inputValue={monthText}
                label={t("gen6TinyIndexMonth")}
                onInputChange={setMonthText}
                onValueChange={(value) => {
                  setMonth(value);
                  setMonthText(String(value).padStart(2, "0"));
                }}
                options={months}
                value={month}
              />
            </label>
          </div>
          <div className="gen6tinyindex-range-grid">
            <label className="field">
              <span>{t("gen6TinyIndexMinIndex")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINYINDEX_MAX_MIN_INDEX}
                onChange={(event) =>
                  setMinIndex(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINYINDEX_MAX_MIN_INDEX,
                      6,
                    ),
                  )
                }
                value={minIndex}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyIndexMaxIndex")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINYINDEX_MAX_INDEX}
                onChange={(event) =>
                  setMaxIndex(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINYINDEX_MAX_INDEX,
                      8,
                    ),
                  )
                }
                value={maxIndex}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyIndexResultLimit")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINYINDEX_MAX_RESULTS}
                min={1}
                onChange={(event) =>
                  setResultLimit(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINYINDEX_MAX_RESULTS,
                      6,
                    ),
                  )
                }
                value={resultLimit}
              />
            </label>
          </div>
          <small className="gen6tinyindex-limit-note">
            {t("gen6TinyIndexMonthNote")}
          </small>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={16} />
              {t("gen6TinyIndexSearch")}
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
        <section className="panel gen6tinyindex-panel gen6tinyindex-filter-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("filters")}</h2>
            </div>
            <span className="panel-note">Index / Tiny State</span>
          </div>
          <div className="gen6tinyindex-filter-grid">
            <label className="field">
              <span>{t("gen6TinyIndexIndexFilter")}</span>
              <textarea
                aria-label={t("gen6TinyIndexIndexFilter")}
                onChange={(event) => setIndexText(event.target.value)}
                rows={7}
                spellCheck={false}
                value={indexText}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyIndexStateFilter")}</span>
              <textarea
                aria-label={t("gen6TinyIndexStateFilter")}
                onChange={(event) => setStateText(event.target.value)}
                rows={7}
                spellCheck={false}
                value={stateText}
              />
            </label>
          </div>
          <div className="gen6tinyindex-filter-options">
            <label className="toggle-field">
              <input
                checked={regularExpression}
                onChange={(event) => setRegularExpression(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6TinyIndexRegularExpression")}</span>
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
      <section className="panel results-panel gen6tinyindex-results-panel">
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
        <div className="table-shell gen6tinyindex-table-shell" ref={tableRef}>
          {results.length === 0 ? (
            <div className="empty-state compact" role="status">
              <span>
                {error
                  ? t("invalidGen6TinyIndexInput")
                  : t("emptyGen6TinyIndex")}
              </span>
            </div>
          ) : (
            <div
              className="virtual-table gen6tinyindex-virtual-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="table-header">
                <span>{t("gen6TinyIndexDate")}</span>
                <span>Seed</span>
                <span>Index</span>
                <span>Rand#</span>
                <span>{t("gen6TinyIndexState")}</span>
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = results[virtualRow.index];
                return (
                  <div
                    className="table-row"
                    key={`${result.index}-${result.initialSeed}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 40}px)`,
                    }}
                  >
                    <span>
                      {mode === "date"
                        ? formatGen6TinyIndexDate(
                            { year: Number(year) },
                            result.elapsedSecond,
                          )
                        : "-"}
                    </span>
                    <span>{formatGen6TinyIndexHex(result.initialSeed)}</span>
                    <span>{result.index}</span>
                    <span>{formatGen6TinyIndexHex(result.random)}</span>
                    <span>{formatGen6TinyIndexState(result.state)}</span>
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
