import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  isThreeDsGen7Profile,
  type ThreeDsProfile,
} from "../3dsprofiles/domain";
import {
  formatHex64,
  GEN7_ID_MAX_ADVANCES,
  gen7IdStartingFrame,
  parseDecimal,
  parseHex,
  validateGen7IdRequest,
  type Gen7GameVersion,
  type Gen7IdFilterMode,
  type Gen7IdRequest,
  type Gen7IdState,
} from "./domain";
import { Gen7IdUiPreviewEngine } from "./preview/Gen7IdUiPreviewEngine";
import type {
  Gen7IdSearchEngine,
  Gen7IdProgress,
  Gen7IdSummary,
} from "./search";
import { Gen7IdWorkerPool } from "./worker/Gen7IdWorkerPool";

function filterLabel(mode: Gen7IdFilterMode) {
  return mode === "tid"
    ? "TID"
    : mode === "sid"
      ? "SID"
      : mode === "full"
        ? "TID/SID"
        : mode === "g7tid"
          ? "Gen7TID"
          : "";
}

export function Gen7IdPanel({
  profile,
  uiPreviewMode,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen7IdSearchEngine>(
    () =>
      uiPreviewMode ? new Gen7IdUiPreviewEngine() : new Gen7IdWorkerPool(),
    [uiPreviewMode],
  );
  const [version, setVersion] = useState<Gen7GameVersion>("sun");
  const [seed, setSeed] = useState("0");
  const [minAdvances, setMinAdvances] = useState("1012");
  const [maxAdvances, setMaxAdvances] = useState("50000");
  const [correction, setCorrection] = useState("0");
  const [filterMode, setFilterMode] = useState<Gen7IdFilterMode>("g7tid");
  const [idText, setIdText] = useState("");
  const [tsvText, setTsvText] = useState("");
  const [randText, setRandText] = useState("");
  const [regularExpression, setRegularExpression] = useState(false);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [results, setResults] = useState<Gen7IdState[]>([]);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen7IdProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen7IdSummary>();
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
  useEffect(() => {
    if (!isThreeDsGen7Profile(profile)) return;
    setVersion(profile.version);
    setMinAdvances(String(gen7IdStartingFrame(profile.version)));
  }, [profile]);
  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request: Gen7IdRequest = {
      version,
      seed: parseHex(seed) ?? Number.NaN,
      minAdvances: parseDecimal(minAdvances) ?? Number.NaN,
      maxAdvances: parseDecimal(maxAdvances) ?? Number.NaN,
      correction: parseDecimal(correction) ?? Number.NaN,
      filters: {
        mode: filterMode,
        disabled: filtersDisabled,
        regularExpression,
        idText,
        tsvText,
        randText,
      },
    };
    const errors = validateGen7IdRequest(request);
    if (errors.length) {
      setError(t("invalidGen7IdInput"));
      setStatus("failed");
      return;
    }
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: request.maxAdvances - request.minAdvances + 1,
      resultCount: 0,
      percent: 0,
    });
    setError("");
    setStatus("calculating");
    try {
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
        "Advance",
        t("gen7RandomNumber"),
        "Gen7TID",
        "TID",
        "SID",
        "TSV",
        "TRV",
        t("gen7Clock"),
      ],
      ...results.map((state) => [
        state.advances,
        formatHex64(state.rand64),
        state.g7tid.toString().padStart(6, "0"),
        state.tid.toString().padStart(5, "0"),
        state.sid.toString().padStart(5, "0"),
        state.tsv.toString().padStart(4, "0"),
        state.trv.toString(16).toUpperCase(),
        state.clock,
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen7id.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <form className="control-grid gen7id-control-grid" onSubmit={run}>
        <section className="panel input-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("input")}</h2>
            </div>
            <span className="panel-note">SFMT / Gen7</span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("gen7GameVersion")}</span>
              <Select
                value={version}
                onChange={(event) => {
                  const next = event.target.value as Gen7GameVersion;
                  setVersion(next);
                  setMinAdvances(String(gen7IdStartingFrame(next)));
                }}
              >
                <option value="sun">{t("gen7Sun")}</option>
                <option value="moon">{t("gen7Moon")}</option>
                <option value="ultra-sun">{t("gen7UltraSun")}</option>
                <option value="ultra-moon">{t("gen7UltraMoon")}</option>
              </Select>
            </label>
            <label className="field">
              <span>{t("seed")}</span>
              <div className="prefixed-input">
                <span>0x</span>
                <input
                  maxLength={8}
                  value={seed}
                  onChange={(event) =>
                    setSeed(normalizeHexInput(event.target.value, 8))
                  }
                />
              </div>
              <small>HEX / 00000000 - FFFFFFFF</small>
            </label>
            <div className="compact-field-row">
              <label className="field">
                <span>{t("initialAdvances")}</span>
                <input
                  inputMode="numeric"
                  value={minAdvances}
                  max={GEN7_ID_MAX_ADVANCES}
                  onChange={(event) =>
                    setMinAdvances(
                      normalizeDecimalInput(
                        event.target.value,
                        GEN7_ID_MAX_ADVANCES,
                        10,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{t("maxAdvances")}</span>
                <input
                  inputMode="numeric"
                  value={maxAdvances}
                  max={GEN7_ID_MAX_ADVANCES}
                  onChange={(event) =>
                    setMaxAdvances(
                      normalizeDecimalInput(
                        event.target.value,
                        GEN7_ID_MAX_ADVANCES,
                        10,
                      ),
                    )
                  }
                />
              </label>
            </div>
            <label className="field">
              <span>{t("gen7ClockCorrection")}</span>
              <input
                inputMode="numeric"
                value={correction}
                onChange={(event) =>
                  setCorrection(
                    normalizeDecimalInput(event.target.value, 16, 2),
                  )
                }
              />
              <small>0 - 16</small>
            </label>
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {t("run")}
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
        <section className="panel filter-panel gen7id-filter-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("filters")}</h2>
            </div>
            <span className="panel-note">ID7</span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("gen7IdFilter")}</span>
              <Select
                value={filterMode}
                onChange={(event) =>
                  setFilterMode(event.target.value as Gen7IdFilterMode)
                }
              >
                <option value="tid">TID</option>
                <option value="sid">SID</option>
                <option value="full">TID/SID</option>
                <option value="g7tid">Gen7TID</option>
              </Select>
            </label>
            <div className="gen7id-filter-lists">
              <label className="field gen7id-filter-list gen7id-id-list">
                <span>{filterLabel(filterMode)}</span>
                <textarea
                  aria-label={`${filterLabel(filterMode)} list`}
                  onChange={(event) => setIdText(event.target.value)}
                  rows={7}
                  spellCheck={false}
                  value={idText}
                />
              </label>
              <label className="field gen7id-filter-list gen7id-tsv-list">
                <span>TSV</span>
                <textarea
                  aria-label="TSV list"
                  inputMode="numeric"
                  onChange={(event) => setTsvText(event.target.value)}
                  rows={7}
                  spellCheck={false}
                  value={tsvText}
                />
              </label>
              <label className="field gen7id-filter-list gen7id-rand-list">
                <span>{t("gen7RandomNumber")}</span>
                <textarea
                  aria-label={`${t("gen7RandomNumber")} list`}
                  onChange={(event) => setRandText(event.target.value)}
                  rows={7}
                  spellCheck={false}
                  value={randText}
                />
              </label>
            </div>
            <div className="gen7id-filter-options">
              <label className="toggle-field">
                <input
                  checked={regularExpression}
                  onChange={(event) =>
                    setRegularExpression(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>Regular Expression</span>
              </label>
              <label className="toggle-field disable-filters">
                <input
                  checked={filtersDisabled}
                  onChange={(event) => setFiltersDisabled(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("disableFilters")}</span>
              </label>
            </div>
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
        {error && <div className="alert error">{error}</div>}
        {summary?.resultLimitReached && (
          <div className="alert warning">{t("limitReached")}</div>
        )}
        <div className="table-shell gen7id-table-shell" ref={tableRef}>
          {results.length === 0 ? (
            <div className="empty-state compact">
              <span>{t("emptyGen7Id")}</span>
            </div>
          ) : (
            <div
              className="virtual-table gen7id-virtual-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 38}px` }}
            >
              <div className="table-header">
                {[
                  t("rowAdvance"),
                  t("gen7RandomNumber"),
                  "Gen7TID",
                  "TID",
                  "SID",
                  "TSV",
                  "TRV",
                  t("gen7Clock"),
                ].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const state = results[virtualRow.index];
                return (
                  <div
                    className="table-row"
                    key={`${state.advances}-${state.rand64.toString()}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 38}px)`,
                    }}
                  >
                    <span>{state.advances}</span>
                    <span>{formatHex64(state.rand64)}</span>
                    <span>{state.g7tid.toString().padStart(6, "0")}</span>
                    <span>{state.tid.toString().padStart(5, "0")}</span>
                    <span>{state.sid.toString().padStart(5, "0")}</span>
                    <span>{state.tsv.toString().padStart(4, "0")}</span>
                    <span>{state.trv.toString(16).toUpperCase()}</span>
                    <span>{state.clock}</span>
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
