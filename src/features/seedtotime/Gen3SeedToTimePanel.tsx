import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { parseDecimal, parseHex } from "../id/domain";
import {
  formatGen3SeedToTime,
  validateGen3SeedToTimeRequest,
  type Gen3SeedToTimeState,
} from "./domain";
import { Gen3SeedToTimeUiPreviewEngine } from "./preview/Gen3SeedToTimeUiPreviewEngine";
import type {
  Gen3SeedToTimeSearchEngine,
  Gen3SeedToTimeSearchSummary,
} from "./search";
import { Gen3SeedToTimeWorkerPool } from "./worker/Gen3SeedToTimeWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";

export function Gen3SeedToTimePanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen3SeedToTimeSearchEngine>(
    () =>
      uiPreviewMode
        ? new Gen3SeedToTimeUiPreviewEngine()
        : new Gen3SeedToTimeWorkerPool(),
    [uiPreviewMode],
  );
  const [seed, setSeed] = useState("");
  const [year, setYear] = useState("2000");
  const [states, setStates] = useState<Gen3SeedToTimeState[]>([]);
  const [summary, setSummary] = useState<Gen3SeedToTimeSearchSummary>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");

  useEffect(() => () => engine.dispose(), [engine]);

  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];

  const find = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request = {
      seed: parseHex(seed) ?? Number.NaN,
      year: parseDecimal(year) ?? Number.NaN,
    };
    if (validateGen3SeedToTimeRequest(request).length > 0) {
      setError(t("invalidSeedToTimeInput"));
      setStatus("failed");
      return;
    }

    setStates([]);
    setSummary(undefined);
    setError("");
    setStatus("calculating");
    try {
      const nextSummary = await engine.search(request);
      setSummary(nextSummary);
      setStates(nextSummary.states);
      if (!nextSummary.cancelled && request.seed > 0xffff) {
        setSeed(nextSummary.originSeed.toString(16).toUpperCase());
      }
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  return (
    <>
      <form className="seed-to-time-control-grid" onSubmit={find}>
        <section className="panel compact-module-panel seed-to-time-input-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("seedToTimeModule")}</h2>
            </div>
            <span className="panel-note">PokeRNGR</span>
          </div>
          <div className="seed-to-time-form-grid">
            <label className="field">
              <span>{t("seedToTimeSeed")}</span>
              <input
                inputMode="text"
                maxLength={10}
                onChange={(event) =>
                  setSeed(normalizeHexInput(event.target.value, 8))
                }
                value={seed}
              />
              <small>HEX / 00000000 - FFFFFFFF</small>
            </label>
            <label className="field">
              <span>{t("seedToTimeYear")}</span>
              <input
                inputMode="numeric"
                max={2037}
                min={2000}
                maxLength={4}
                onChange={(event) => {
                  const nextYear = normalizeDecimalInput(
                    event.target.value,
                    2037,
                    4,
                  );
                  setYear(nextYear);
                }}
                value={year}
              />
              <small>DEC / 2000 - 2037</small>
            </label>
            <label className="field seed-to-time-readonly">
              <span>{t("seedToTimeAdvances")}</span>
              <input readOnly value={summary ? String(summary.advances) : ""} />
            </label>
            <div className="panel-actions seed-to-time-actions">
              <button
                className="primary-action"
                disabled={status === "calculating"}
                type="submit"
              >
                {t("seedToTimeFind")}
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
          </div>
        </section>
      </form>

      <section className="panel results-panel seed-to-time-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{statusLabel}</span>
          </div>
          <div className="result-actions">
            <span className="result-count">{String(states.length)}</span>
            <button
              aria-label={t("clear")}
              className="icon-action"
              disabled={states.length === 0}
              onClick={() => setStates([])}
              title={t("clear")}
              type="button"
            >
              &times;
            </button>
          </div>
        </div>
        <div className="metrics-row">
          <span>
            {t("seedToTimeSeed")}{" "}
            <strong>
              {summary ? summary.originSeed.toString(16).toUpperCase() : "-"}
            </strong>
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
              ? t("seedToTimeWasmMissing")
              : error}
          </div>
        )}
        <div className="table-shell seed-to-time-table-shell">
          {states.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptySeedToTime")}</span>
            </div>
          ) : (
            <table className="seed-to-time-table">
              <thead>
                <tr>
                  <th>{t("seedToTimeTime")}</th>
                </tr>
              </thead>
              <tbody>
                {states.map((state) => (
                  <tr key={formatGen3SeedToTime(state)}>
                    <td>{formatGen3SeedToTime(state)}</td>
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
