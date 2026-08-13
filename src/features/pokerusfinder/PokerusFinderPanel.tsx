import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { parseDecimal, parseHex } from "../id/domain";
import {
  formatPokerusSeed,
  POKERUS_DP_MAX_FRAMES,
  POKERUS_GEN3_MAX_FRAMES,
  validatePokerusGen3Request,
  validatePokerusPtHgssRequest,
  type PokerusFinderMode,
  type PokerusFinderState,
} from "./domain";
import { PokerusFinderUiPreviewEngine } from "./preview/PokerusFinderUiPreviewEngine";
import type {
  PokerusFinderSearchEngine,
  PokerusFinderSearchSummary,
} from "./search";
import { PokerusFinderWorkerPool } from "./worker/PokerusFinderWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";

export function PokerusFinderPanel({
  uiPreviewMode,
  initialMode = "gen3",
}: {
  uiPreviewMode: boolean;
  initialMode?: PokerusFinderMode;
}) {
  const { t } = useTranslation();
  const engine = useMemo<PokerusFinderSearchEngine>(
    () =>
      uiPreviewMode
        ? new PokerusFinderUiPreviewEngine()
        : new PokerusFinderWorkerPool(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<PokerusFinderMode>(initialMode);
  const [handheldInputs, setHandheldInputs] = useState({
    gen3: { seed: "", frame: "1", delay: "300" },
    dp: { seed: "", frame: "1", delay: "300" },
  });
  const initialDate = new Date();
  const [year, setYear] = useState(String(initialDate.getFullYear()));
  const [month, setMonth] = useState(String(initialDate.getMonth() + 1));
  const [day, setDay] = useState(String(initialDate.getDate()));
  const [hour, setHour] = useState("00");
  const [minute, setMinute] = useState("00");
  const [results, setResults] = useState<PokerusFinderState[]>([]);
  const [summary, setSummary] = useState<PokerusFinderSearchSummary>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const handheldMode = mode === "dp" ? "dp" : "gen3";
  const handheldInput = handheldInputs[handheldMode];
  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];

  useEffect(() => () => engine.dispose(), [engine]);

  const selectMode = (next: PokerusFinderMode) => {
    if (status === "calculating") return;
    setMode(next);
    setResults([]);
    setSummary(undefined);
    setError("");
    setStatus("ready");
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const gen3Request = {
      seed: parseHex(handheldInput.seed) ?? Number.NaN,
      frame: parseDecimal(handheldInput.frame) ?? Number.NaN,
      delay: parseDecimal(handheldInput.delay) ?? Number.NaN,
      maxFrames:
        mode === "dp" ? POKERUS_DP_MAX_FRAMES : POKERUS_GEN3_MAX_FRAMES,
    };
    const dateRequest = {
      year: parseDecimal(year) ?? Number.NaN,
      month: parseDecimal(month) ?? Number.NaN,
      day: parseDecimal(day) ?? Number.NaN,
      hour: parseDecimal(hour) ?? Number.NaN,
      minute: parseDecimal(minute) ?? Number.NaN,
    };
    const invalid =
      mode === "pthgss"
        ? validatePokerusPtHgssRequest(dateRequest)
        : validatePokerusGen3Request(gen3Request);
    if (invalid.length > 0) {
      setError(t("invalidPokerusFinderInput"));
      setStatus("failed");
      return;
    }
    setResults([]);
    setSummary(undefined);
    setError("");
    setStatus("calculating");
    try {
      const next =
        mode === "pthgss"
          ? await engine.searchPtHgss(dateRequest)
          : await engine.searchGen3(gen3Request);
      setResults(next.states);
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const isDateMode = mode === "pthgss";
  return (
    <>
      <div
        aria-label={t("pokerusFinderEngine")}
        className="operation-tabs pokerus-operation-tabs"
        role="tablist"
      >
        {(["gen3", "dp", "pthgss"] as const).map((entry) => (
          <button
            aria-selected={mode === entry}
            className={mode === entry ? "active" : ""}
            disabled={status === "calculating"}
            key={entry}
            onClick={() => selectMode(entry)}
            role="tab"
            type="button"
          >
            {t(
              entry === "gen3"
                ? "pokerusGen3"
                : entry === "dp"
                  ? "pokerusDp"
                  : "pokerusPtHgss",
            )}
          </button>
        ))}
      </div>
      <form
        className="initial-seed-control-grid pokerus-finder-control-grid"
        onSubmit={run}
      >
        <section className="panel static-panel initial-seed-input-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("pokerusFinderConfig")}</h2>
            </div>
            <span className="panel-note">{t("pokerusFinderModule")}</span>
          </div>
          <div className="static-form-stack">
            {isDateMode ? (
              <>
                <label className="field">
                  <span>{t("pokerusDate")}</span>
                  <input
                    type="date"
                    max="2099-12-31"
                    min="2000-01-01"
                    onChange={(event) => {
                      const [nextYear, nextMonth, nextDay] =
                        event.target.value.split("-");
                      setYear(nextYear);
                      setMonth(nextMonth);
                      setDay(nextDay);
                    }}
                    value={`${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`}
                  />
                </label>
                <div className="advance-row">
                  <label className="field">
                    <span>{t("pokerusHour")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={2}
                      onChange={(event) =>
                        setHour(
                          normalizeDecimalInput(event.target.value, 23, 2),
                        )
                      }
                      value={hour}
                    />
                  </label>
                  <label className="field">
                    <span>{t("pokerusMinute")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={2}
                      onChange={(event) =>
                        setMinute(
                          normalizeDecimalInput(event.target.value, 59, 2),
                        )
                      }
                      value={minute}
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <label className="field">
                  <span>{t("pokerusInitialSeed")}</span>
                  <input
                    maxLength={mode === "dp" ? 8 : 4}
                    onChange={(event) => {
                      const seed = normalizeHexInput(
                        event.target.value,
                        mode === "dp" ? 8 : 4,
                      );
                      setHandheldInputs((current) => ({
                        ...current,
                        [handheldMode]: {
                          ...current[handheldMode],
                          seed,
                        },
                      }));
                    }}
                    value={handheldInput.seed}
                  />
                  <small>
                    {mode === "dp" ? "HEX / 32-bit" : "HEX / 16-bit"}
                  </small>
                </label>
                <label className="field">
                  <span>{t("pokerusFrame")}</span>
                  <input
                    disabled={mode === "dp"}
                    inputMode="numeric"
                    maxLength={7}
                    onChange={(event) => {
                      const frame = normalizeDecimalInput(
                        event.target.value,
                        9_999_999,
                        7,
                      );
                      setHandheldInputs((current) => ({
                        ...current,
                        [handheldMode]: {
                          ...current[handheldMode],
                          frame,
                        },
                      }));
                    }}
                    value={handheldInput.frame}
                  />
                </label>
                <label className="field">
                  <span>{t("pokerusDelay")}</span>
                  <input
                    inputMode="numeric"
                    maxLength={3}
                    onChange={(event) => {
                      const delay = normalizeDecimalInput(
                        event.target.value,
                        999,
                        3,
                      );
                      setHandheldInputs((current) => ({
                        ...current,
                        [handheldMode]: {
                          ...current[handheldMode],
                          delay,
                        },
                      }));
                    }}
                    value={handheldInput.delay}
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
              {t("pokerusFind")}
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
            <span className="panel-note">GPL-3.0</span>
          </div>
          <div className="initial-seed-details">
            <div>
              <span>{t("pokerusGameScope")}</span>
              <strong>
                {isDateMode
                  ? "Platinum / HeartGold / SoulSilver"
                  : mode === "dp"
                    ? "Diamond / Pearl"
                    : "Ruby / Sapphire / Emerald / FRLG"}
              </strong>
            </div>
            <div>
              <span>{t("pokerusRule")}</span>
              <strong>0x4000 / 0x8000 / 0xC000</strong>
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
            <span className="result-count">{String(results.length)}</span>
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
        <div className="metrics-row">
          <span>
            {t("processed")} <strong>{summary?.processed ?? 0}</strong>
          </span>
          <span>
            {t("results")} <strong>{results.length}</strong>
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
              ? t("pokerusFinderWasmMissing")
              : error}
          </div>
        )}
        <div className="table-shell initial-seed-table-shell">
          {results.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyPokerusFinder")}</span>
            </div>
          ) : (
            <table className="seed-to-time-table">
              <thead>
                <tr>
                  <th>{t("pokerusFrame")}</th>
                  <th>{t("pokerusSeed")}</th>
                  {isDateMode && (
                    <>
                      <th>{t("pokerusDelay")}</th>
                      <th>{t("pokerusSecond")}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {results.map((state, index) => (
                  <tr
                    key={`${state.frame}-${state.seed}-${state.second ?? index}`}
                  >
                    <td>{state.frame}</td>
                    <td>
                      {formatPokerusSeed(
                        state.seed,
                        isDateMode ? 8 : undefined,
                      )}
                    </td>
                    {isDateMode && (
                      <>
                        <td>{state.delay}</td>
                        <td>{state.second}</td>
                      </>
                    )}
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
