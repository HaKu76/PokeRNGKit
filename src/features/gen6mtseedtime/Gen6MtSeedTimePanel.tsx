import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { Gen6MtSeedTimeUiPreviewEngine } from "./preview/Gen6MtSeedTimeUiPreviewEngine";
import {
  formatGen6MtSeedTimeEpoch,
  formatGen6MtSeedTimeHex,
  gen6MtSeedTimeEpochFromInput,
  GEN6_MT_SEED_TIME_MAX_RESULTS,
  GEN6_MT_SEED_TIME_MAX_SECONDS,
  type Gen6MtSeedTimeGame,
  type Gen6MtSeedTimeMode,
  type Gen6MtSeedTimeRequest,
  type Gen6MtSeedTimeResult,
} from "./domain";
import type { Gen6MtSeedTimeEngine, Gen6MtSeedTimeSummary } from "./search";
import { Gen6MtSeedTimeWorker } from "./worker/Gen6MtSeedTimeWorker";
import "./Gen6MtSeedTimePanel.css";

export function Gen6MtSeedTimePanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen6MtSeedTimeEngine>(
    () =>
      uiPreviewMode
        ? new Gen6MtSeedTimeUiPreviewEngine()
        : new Gen6MtSeedTimeWorker(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Gen6MtSeedTimeMode>("time");
  const [game, setGame] = useState<Gen6MtSeedTimeGame>("xy");
  const [date, setDate] = useState("2022-01-01");
  const [time, setTime] = useState("00:00:00");
  const [specificDate, setSpecificDate] = useState(true);
  const [frame300Seed, setFrame300Seed] = useState("00000000");
  const [currentSavePar, setCurrentSavePar] = useState("00000000");
  const [targetSeed, setTargetSeed] = useState("00000000");
  const [maxSeconds, setMaxSeconds] = useState("86400");
  const [resultLimit, setResultLimit] = useState("100000");
  const [results, setResults] = useState<Gen6MtSeedTimeResult[]>([]);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen6MtSeedTimeSummary>();
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer by design.
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
    const epoch = gen6MtSeedTimeEpochFromInput(
      date,
      mode === "time" ? time : "00:00:00",
    );
    if (typeof epoch !== "bigint") {
      setError(t("invalidGen6MtSeedTime"));
      setStatus("failed");
      return;
    }
    const request: Gen6MtSeedTimeRequest = {
      mode,
      game,
      frame300Seed: Number.parseInt(frame300Seed || "0", 16) >>> 0,
      currentSavePar: Number.parseInt(currentSavePar || "0", 16) >>> 0,
      targetSeed: Number.parseInt(targetSeed || "0", 16) >>> 0,
      epoch,
      maxSeconds: Number.parseInt(maxSeconds || "0", 10),
      specificDate,
      resultLimit: Number.parseInt(resultLimit || "0", 10),
    };
    try {
      setResults([]);
      setError("");
      setSummary(undefined);
      setStatus("calculating");
      setProgress({
        processedStates: 0,
        totalStates: mode === "time" ? request.maxSeconds + 1 : 200000,
        resultCount: 0,
        percent: 0,
      });
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
      ["Date", "Frame 300 Seed", "Save Frame", "Save Parameter", "Offset"],
      ...results.map((result) => [
        formatGen6MtSeedTimeEpoch(result.epoch),
        formatGen6MtSeedTimeHex(result.frame300Seed),
        result.saveFrame,
        formatGen6MtSeedTimeHex(result.savePar),
        result.offsetSeconds,
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen6mtseedtime.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const busy = status === "calculating";
  return (
    <div className="gen6mtseedtime-workspace">
      <form className="gen6mtseedtime-controls" onSubmit={run}>
        <section className="panel gen6mtseedtime-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6MtSeedTimeInput")}</h2>
            </div>
            <span className="panel-note">TinyFinder / MT19937</span>
          </div>
          <div
            className="gen6mtseedtime-mode"
            role="radiogroup"
            aria-label={t("gen6MtSeedTimeMode")}
          >
            {(["time", "date"] as const).map((value) => (
              <label className={mode === value ? "active" : ""} key={value}>
                <input
                  checked={mode === value}
                  name="gen6mtseedtime-mode"
                  onChange={() => setMode(value)}
                  type="radio"
                />
                <span>
                  {t(
                    value === "time"
                      ? "gen6MtSeedTimeSpecific"
                      : "gen6MtSeedDateSearch",
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="gen6mtseedtime-grid">
            <label className="field">
              <span>{t("gen6MtSeedTimeGame")}</span>
              <Select
                value={game}
                onChange={(event) =>
                  setGame(event.target.value as Gen6MtSeedTimeGame)
                }
              >
                <option value="xy">XY</option>
                <option value="oras">ORAS</option>
              </Select>
            </label>
            <label className="field">
              <span>{t("gen6MtSeedTimeDate")}</span>
              <input
                maxLength={10}
                onChange={(event) => setDate(event.target.value)}
                value={date}
              />
            </label>
            {mode === "time" && (
              <label className="field">
                <span>{t("gen6MtSeedTimeClock")}</span>
                <input
                  maxLength={8}
                  onChange={(event) => setTime(event.target.value)}
                  value={time}
                />
              </label>
            )}
            {mode === "time" && (
              <label className="field">
                <span>{t("gen6MtSeedTimeSeconds")}</span>
                <input
                  inputMode="numeric"
                  max={GEN6_MT_SEED_TIME_MAX_SECONDS}
                  onChange={(event) =>
                    setMaxSeconds(
                      normalizeDecimalInput(
                        event.target.value,
                        GEN6_MT_SEED_TIME_MAX_SECONDS,
                        7,
                      ),
                    )
                  }
                  value={maxSeconds}
                />
              </label>
            )}
          </div>
          <div className="gen6mtseedtime-checks">
            <label>
              <input
                checked={specificDate}
                onChange={(event) => setSpecificDate(event.target.checked)}
                type="checkbox"
              />
              {t("gen6MtSeedTimeDateFilter")}
            </label>
          </div>
        </section>
        <section className="panel gen6mtseedtime-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6MtSeedTimeSettings")}</h2>
            </div>
          </div>
          <div className="gen6mtseedtime-grid">
            <label className="field">
              <span>{t("gen6MtSeedTimeFrame300")}</span>
              <input
                maxLength={8}
                onChange={(event) =>
                  setFrame300Seed(normalizeHexInput(event.target.value, 8))
                }
                value={frame300Seed}
              />
            </label>
            <label className="field">
              <span>{t("gen6MtSeedTimeCurrentSave")}</span>
              <input
                maxLength={8}
                onChange={(event) =>
                  setCurrentSavePar(normalizeHexInput(event.target.value, 8))
                }
                value={currentSavePar}
              />
            </label>
            <label className="field">
              <span>{t("gen6MtSeedTimeTargetSeed")}</span>
              <input
                maxLength={8}
                onChange={(event) =>
                  setTargetSeed(normalizeHexInput(event.target.value, 8))
                }
                value={targetSeed}
              />
            </label>
            <label className="field">
              <span>{t("gen6MtSeedTimeResultLimit")}</span>
              <input
                inputMode="numeric"
                max={GEN6_MT_SEED_TIME_MAX_RESULTS}
                onChange={(event) =>
                  setResultLimit(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_MT_SEED_TIME_MAX_RESULTS,
                      6,
                    ),
                  )
                }
                value={resultLimit}
              />
            </label>
          </div>
          <div className="gen6mtseedtime-actions">
            <button
              className="secondary-action"
              disabled={!results.length}
              onClick={exportCsv}
              type="button"
            >
              <Download size={16} />
              CSV
            </button>
            <button
              className="primary-action"
              onClick={busy ? () => engine.cancel() : undefined}
              type={busy ? "button" : "submit"}
            >
              {busy ? <Square size={16} /> : <Play size={16} />}
              {busy ? t("calculating") : t("gen6MtSeedTimeSearch")}
            </button>
          </div>
        </section>
      </form>
      <section className="panel results-panel">
        <div className="panel-heading">
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
            aria-label={t("clear")}
            className="icon-action"
            disabled={!results.length}
            onClick={() => setResults([])}
            title={t("clear")}
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, progress.percent)}
        >
          <span style={{ width: `${Math.min(100, progress.percent)}%` }} />
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
        <div className="table-shell gen6mtseedtime-table-shell" ref={tableRef}>
          {results.length === 0 ? (
            <div className="empty-state compact" role="status">
              {error || t("emptyGen6MtSeedTime")}
            </div>
          ) : (
            <div
              className="virtual-table gen6mtseedtime-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="table-header">
                <span>{t("gen6MtSeedTimeDate")}</span>
                <span>{t("gen6MtSeedTimeFrame300")}</span>
                <span>{t("gen6MtSeedTimeSaveFrame")}</span>
                <span>{t("gen6MtSeedTimeSavePar")}</span>
                <span>{t("gen6MtSeedTimeOffset")}</span>
                <span>{t("gen6MtSeedTimeGame")}</span>
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = results[virtualRow.index];
                return (
                  <div
                    className="table-row"
                    key={`${result.epoch}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 40}px)`,
                    }}
                  >
                    <span>{formatGen6MtSeedTimeEpoch(result.epoch)}</span>
                    <span>{formatGen6MtSeedTimeHex(result.frame300Seed)}</span>
                    <span>{result.saveFrame}</span>
                    <span>{formatGen6MtSeedTimeHex(result.savePar)}</span>
                    <span>{result.offsetSeconds}</span>
                    <span>{result.game.toUpperCase()}</span>
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
