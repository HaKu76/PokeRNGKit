import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import {
  formatGen4IdSeed,
  gen4IdTotalStates,
  parseGen4IdDateTime,
  parseGen4IdFilters,
  validateGen4IdRequest,
  type Gen4IdFilterMode,
  type Gen4IdOperation,
  type Gen4IdRequest,
  type Gen4IdState,
} from "./domain";
import { Gen4IdUiPreviewEngine } from "./preview/Gen4IdUiPreviewEngine";
import type { Gen4IdEngine, Gen4IdProgress, Gen4IdSummary } from "./search";
import { Gen4IdWorkerPool } from "./worker/Gen4IdWorkerPool";

type SortKey = keyof Pick<
  Gen4IdState,
  "seed" | "delay" | "tid" | "sid" | "tsv" | "seconds"
>;

function currentDateTime() {
  const now = new Date();
  const year = Math.min(2099, Math.max(2000, now.getFullYear()));
  const part = (value: number) => value.toString().padStart(2, "0");
  return `${year}-${part(now.getMonth() + 1)}-${part(now.getDate())}T${part(now.getHours())}:${part(now.getMinutes())}`;
}

export function Gen4IdPanel({ uiPreviewMode }: { uiPreviewMode: boolean }) {
  const { t } = useTranslation();
  const engine = useMemo<Gen4IdEngine>(
    () =>
      uiPreviewMode ? new Gen4IdUiPreviewEngine() : new Gen4IdWorkerPool(),
    [uiPreviewMode],
  );
  const [operation, setOperation] = useState<Gen4IdOperation>("generator");
  const [year, setYear] = useState("2000");
  const [dateTime, setDateTime] = useState(currentDateTime);
  const [minDelay, setMinDelay] = useState("5000");
  const [maxDelay, setMaxDelay] = useState("6000");
  const [infinite, setInfinite] = useState(false);
  const [filterMode, setFilterMode] = useState<Gen4IdFilterMode>("tid");
  const [filterText, setFilterText] = useState("12345");
  const [results, setResults] = useState<Gen4IdState[]>([]);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "cancelled" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen4IdProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen4IdSummary>();
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "seed", direction: "asc" },
  );
  const tableRef = useRef<HTMLDivElement>(null);
  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort((left, right) => {
      const a = left[sort.key] ?? -1;
      const b = right[sort.key] ?? -1;
      return (a - b) * multiplier;
    });
  }, [results, sort]);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  useEffect(() => () => engine.dispose(), [engine]);

  const readRequest = (): Gen4IdRequest | undefined => {
    const filters = parseGen4IdFilters(filterMode, filterText);
    if (!filters) return undefined;
    const minimum = Number(minDelay);
    const maximum = Number(maxDelay);
    let request: Gen4IdRequest;
    if (operation === "generator") {
      const parts = parseGen4IdDateTime(dateTime);
      if (!parts) return undefined;
      request = {
        operation,
        ...parts,
        minDelay: minimum,
        maxDelay: maximum,
        filters,
      };
    } else {
      request = {
        operation,
        year: Number(year),
        minDelay: minimum,
        maxDelay: maximum,
        infinite,
        filters,
      };
    }
    return validateGen4IdRequest(request).length === 0 ? request : undefined;
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request = readRequest();
    if (!request) {
      setError(t("invalidGen4IdInput"));
      setStatus("failed");
      return;
    }
    setResults([]);
    setSummary(undefined);
    setError("");
    setProgress({
      processedStates: 0,
      totalStates: gen4IdTotalStates(request),
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");
    try {
      const next = await engine.search(request, {
        onBatch: (batch) => setResults((current) => current.concat(batch)),
        onProgress: setProgress,
      });
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const exportCsv = () => {
    const headers = ["Seed", "TID", "SID", "TSV", "Delay"];
    if (operation === "generator") headers.push(t("gen4IdSeconds"));
    const rows = [
      headers,
      ...sortedResults.map((state) => {
        const row: (string | number)[] = [
          formatGen4IdSeed(state.seed),
          state.tid,
          state.sid,
          state.tsv,
          state.delay,
        ];
        if (operation === "generator") row.push(state.seconds ?? "");
        return row;
      }),
    ];
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${rows.map((row) => row.join(",")).join("\n")}`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen4id-${operation}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  const sortLabel = (key: SortKey) =>
    sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "";
  const columns: { key: SortKey; label: string }[] = [
    { key: "seed", label: "Seed" },
    { key: "tid", label: "TID" },
    { key: "sid", label: "SID" },
    { key: "tsv", label: "TSV" },
    { key: "delay", label: "Delay" },
    ...(operation === "generator"
      ? ([{ key: "seconds", label: t("gen4IdSeconds") }] as const)
      : []),
  ];

  return (
    <>
      <div className="operation-tabs gen4id-operation-tabs" role="tablist">
        {(["generator", "searcher"] as const).map((entry) => (
          <button
            aria-selected={operation === entry}
            className={operation === entry ? "active" : ""}
            disabled={status === "calculating"}
            key={entry}
            onClick={() => {
              setOperation(entry);
              setResults([]);
              setStatus("ready");
            }}
            role="tab"
            type="button"
          >
            {t(entry === "generator" ? "gen4IdSeedFinder" : "searcher")}
          </button>
        ))}
      </div>
      <form className="gen4id-control-grid" onSubmit={run}>
        <section className="panel static-panel gen4id-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">ID4 / MT</span>
          </div>
          <div className="static-form-stack">
            {operation === "generator" ? (
              <label className="field">
                <span>{t("dateTime")}</span>
                <input
                  max="2099-12-31T23:59"
                  min="2000-01-01T00:00"
                  onChange={(event) => setDateTime(event.target.value)}
                  type="datetime-local"
                  value={dateTime}
                />
              </label>
            ) : (
              <label className="field">
                <span>{t("gen4IdYear")}</span>
                <input
                  inputMode="numeric"
                  max="2099"
                  maxLength={4}
                  min="2000"
                  onChange={(event) =>
                    setYear(normalizeDecimalInput(event.target.value, 2099, 4))
                  }
                  value={year}
                />
              </label>
            )}
            <div className="compact-field-row">
              <label className="field">
                <span>{t("minDelay")}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setMinDelay(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={minDelay}
                />
              </label>
              <label className="field">
                <span>{t("maxDelay")}</span>
                <input
                  disabled={operation === "searcher" && infinite}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setMaxDelay(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={maxDelay}
                />
              </label>
            </div>
            {operation === "searcher" && (
              <label className="toggle-field">
                <input
                  checked={infinite}
                  onChange={(event) => setInfinite(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen4IdInfiniteSearch")}</span>
              </label>
            )}
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {t(operation === "generator" ? "find" : "search")}
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
        <section className="panel static-panel gen4id-filter-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("filters")}</h2>
            </div>
            <span className="panel-note">ID Filter</span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("mode")}</span>
              <Select
                onChange={(event) => {
                  setFilterMode(event.target.value as Gen4IdFilterMode);
                  setFilterText("");
                }}
                value={filterMode}
              >
                <option value="none">{t("noFilter")}</option>
                <option value="tid">TID</option>
                <option value="sid">SID</option>
                <option value="tidSid">TID/SID</option>
                <option value="pid">PID</option>
                <option value="tidPid">TID/PID</option>
                <option value="tsv">TSV</option>
              </Select>
            </label>
            {filterMode !== "none" && (
              <label className="field gen4id-filter-values">
                <span>{t("filters")}</span>
                <textarea
                  onChange={(event) => setFilterText(event.target.value)}
                  rows={7}
                  spellCheck={false}
                  value={filterText}
                />
              </label>
            )}
          </div>
        </section>
      </form>
      <section className="panel results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">03</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{t(status)}</span>
          </div>
          <div className="result-actions">
            <span className="result-count">{results.length}</span>
            <button
              className="secondary-action"
              disabled={!results.length}
              onClick={exportCsv}
              type="button"
            >
              {t("exportCsv")}
            </button>
            <button
              className="icon-action"
              disabled={!results.length}
              onClick={() => setResults([])}
              title={t("clear")}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
        <div className="progress-track" aria-label={`${progress.percent}%`}>
          <span style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="metrics-row">
          <span>
            {t("processed")} <strong>{progress.processedStates}</strong>
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
        <div className="table-shell gen4id-table-shell" ref={tableRef}>
          {sortedResults.length === 0 ? (
            <div className="empty-state compact">
              <span>{t("emptyGen4Id")}</span>
            </div>
          ) : (
            <div
              className={`static-virtual-table gen4id-table ${operation}`}
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="static-table-header">
                {columns.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => toggleSort(key)}
                    type="button"
                  >
                    {label}
                    {sortLabel(key)}
                  </button>
                ))}
              </div>
              {rowVirtualizer.getVirtualItems().map((row) => {
                const item = sortedResults[row.index];
                return (
                  <div
                    className="static-table-row"
                    key={`${item.seed}-${item.delay}-${item.tid}-${row.index}`}
                    style={{ transform: `translateY(${row.start + 40}px)` }}
                  >
                    <span>{formatGen4IdSeed(item.seed)}</span>
                    <span>{item.tid}</span>
                    <span>{item.sid}</span>
                    <span>{item.tsv}</span>
                    <span>{item.delay}</span>
                    {operation === "generator" && <span>{item.seconds}</span>}
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
