import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  formatHex,
  parseDecimal,
  parseHex,
  validateId3SearcherRequest,
  type Id3SearcherMode,
  type Id3SearcherRequest,
  type Id3SearcherState,
} from "./domain";
import { Gen3IdSearcherUiPreviewEngine } from "./preview/Gen3IdSearcherUiPreviewEngine";
import type {
  Id3SearcherEngine,
  Id3SearcherProgress,
  Id3SearcherSummary,
} from "./searcher";
import { Gen3IdSearcherWorkerPool } from "./worker/Gen3IdSearcherWorkerPool";

function formatDate(state: Id3SearcherState): string {
  const part = (value: number) => value.toString().padStart(2, "0");
  return `${state.year}-${part(state.month)}-${part(state.day)} ${part(state.hour)}:${part(state.minute)}`;
}

const searcherText = {
  en: {
    sid: "SID:",
    pid: "PID:",
    calculate: "Calculate",
    date: "Date",
    star: "Star",
    square: "Square",
    empty: "No search results",
    invalid: "Check the TID and SID/PID values.",
  },
  ja: {
    sid: "SID：",
    pid: "PID：",
    calculate: "計算",
    date: "日付",
    star: "星形",
    square: "四角形",
    empty: "検索結果なし",
    invalid: "TID と SID/PID の値を確認してください。",
  },
  zh: {
    sid: "SID：",
    pid: "PID：",
    calculate: "计算",
    date: "日期",
    star: "星闪",
    square: "方块闪",
    empty: "暂无检索结果",
    invalid: "请检查 TID 和 SID/PID 输入。",
  },
} as const;

export function Gen3IdSearcherPanel({
  onRunningChange,
  uiPreviewMode,
}: {
  onRunningChange?(running: boolean): void;
  uiPreviewMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const language =
    i18n.resolvedLanguage === "ja" || i18n.resolvedLanguage === "en"
      ? i18n.resolvedLanguage
      : "zh";
  const copy = searcherText[language];
  const engine = useMemo<Id3SearcherEngine>(
    () =>
      uiPreviewMode
        ? new Gen3IdSearcherUiPreviewEngine()
        : new Gen3IdSearcherWorkerPool(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Id3SearcherMode>("sid");
  const [tid, setTid] = useState("0");
  const [sid, setSid] = useState("0");
  const [pid, setPid] = useState("FFFFFFFF");
  const [results, setResults] = useState<Id3SearcherState[]>([]);
  const [progress, setProgress] = useState<Id3SearcherProgress>({
    processedTasks: 0,
    totalTasks: 1,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Id3SearcherSummary>();
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "cancelled" | "failed"
  >("ready");
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      engine.dispose();
      onRunningChange?.(false);
    },
    [engine, onRunningChange],
  );

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request: Id3SearcherRequest = {
      mode,
      tid: parseDecimal(tid) ?? Number.NaN,
      input:
        mode === "sid"
          ? (parseDecimal(sid) ?? Number.NaN)
          : (parseHex(pid) ?? Number.NaN),
    };
    if (validateId3SearcherRequest(request).length > 0) {
      setError(copy.invalid);
      setStatus("failed");
      return;
    }
    setResults([]);
    setSummary(undefined);
    setError("");
    setProgress({
      processedTasks: 0,
      totalTasks: 1,
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");
    onRunningChange?.(true);
    try {
      const next = await engine.search(request, {
        onBatch: setResults,
        onProgress: setProgress,
      });
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    } finally {
      onRunningChange?.(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      [t("seed"), t("rowAdvance"), "TID", "SID", "TSV", t("shiny"), copy.date],
      ...results.map((state) => [
        formatHex(state.seed, 4),
        state.frame,
        state.tid,
        state.sid,
        state.tsv,
        state.shiny === 0 ? "" : state.shiny === 2 ? copy.square : copy.star,
        formatDate(state),
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen3id-searcher-${mode}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <form className="id-searcher-form" onSubmit={run}>
        <section className="panel input-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("input")}</h2>
            </div>
            <span className="panel-note">RS / C ABI</span>
          </div>
          <div className="advance-row">
            <label className="field">
              <span>{t("tid")}</span>
              <input
                inputMode="numeric"
                maxLength={5}
                value={tid}
                onChange={(event) =>
                  setTid(normalizeDecimalInput(event.target.value, 0xffff))
                }
              />
              <small>DEC / 0 - 65535</small>
            </label>
            <div className="radio-row id-searcher-mode">
              {(["sid", "pid"] as const).map((entry) => (
                <label key={entry}>
                  <input
                    checked={mode === entry}
                    disabled={status === "calculating"}
                    onChange={() => setMode(entry)}
                    type="radio"
                  />
                  {entry === "sid" ? copy.sid : copy.pid}
                </label>
              ))}
            </div>
          </div>
          {mode === "sid" ? (
            <label className="field">
              <span>{t("sid")}</span>
              <input
                inputMode="numeric"
                maxLength={5}
                value={sid}
                onChange={(event) =>
                  setSid(normalizeDecimalInput(event.target.value, 0xffff))
                }
              />
              <small>DEC / 0 - 65535</small>
            </label>
          ) : (
            <label className="field">
              <span>PID</span>
              <div className="prefixed-input">
                <span>0x</span>
                <input
                  maxLength={8}
                  value={pid}
                  onChange={(event) =>
                    setPid(normalizeHexInput(event.target.value, 8))
                  }
                />
              </div>
              <small>HEX / 00000000 - FFFFFFFF</small>
            </label>
          )}
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {copy.calculate}
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
      </form>
      <section className="panel results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{t(status)}</span>
          </div>
          <div className="result-actions">
            <span className="result-count">{String(results.length)}</span>
            <button
              className="secondary-action"
              disabled={results.length === 0}
              onClick={exportCsv}
              type="button"
            >
              {t("exportCsv")}
            </button>
            <button
              className="icon-action"
              disabled={results.length === 0}
              onClick={() => setResults([])}
              title={t("clear")}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
        <div className="metrics-row">
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
              ? t("wasmMissing")
              : error}
          </div>
        )}
        <div className="id-searcher-table-wrap">
          {results.length === 0 ? (
            <div className="empty-state compact">
              <span>{copy.empty}</span>
            </div>
          ) : (
            <table className="id-searcher-table">
              <thead>
                <tr>
                  {[
                    "Seed",
                    t("rowAdvance"),
                    "TID",
                    "SID",
                    "TSV",
                    t("shiny"),
                    copy.date,
                  ].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((state) => (
                  <tr key={`${state.seed}-${state.frame}-${state.sid}`}>
                    <td>{formatHex(state.seed, 4)}</td>
                    <td>{String(state.frame)}</td>
                    <td>{state.tid.toString().padStart(5, "0")}</td>
                    <td>{state.sid.toString().padStart(5, "0")}</td>
                    <td>{state.tsv.toString().padStart(4, "0")}</td>
                    <td>
                      {state.shiny === 0
                        ? ""
                        : state.shiny === 2
                          ? copy.square
                          : copy.star}
                    </td>
                    <td>{formatDate(state)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
