import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeHexInput } from "../../input";
import { formatHex, parseHex } from "../id/domain";
import { validateGen3PidToIvRequest, type Gen3PidToIvState } from "./domain";
import { Gen3PidToIvUiPreviewEngine } from "./preview/Gen3PidToIvUiPreviewEngine";
import type {
  Gen3PidToIvSearchEngine,
  Gen3PidToIvSearchSummary,
} from "./search";
import { Gen3PidToIvWorkerPool } from "./worker/Gen3PidToIvWorkerPool";

const methodKey = {
  "method-1": "method1",
  "method-2": "pidToIvMethod2",
  "method-4": "method4",
  "xd-colo": "ivToPidXdColo",
  channel: "ivToPidChannel",
} as const;

export function Gen3PidToIvPanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen3PidToIvSearchEngine>(
    () =>
      uiPreviewMode
        ? new Gen3PidToIvUiPreviewEngine()
        : new Gen3PidToIvWorkerPool(),
    [uiPreviewMode],
  );
  const [pid, setPid] = useState("");
  const [states, setStates] = useState<Gen3PidToIvState[]>([]);
  const [summary, setSummary] = useState<Gen3PidToIvSearchSummary>();
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "cancelled" | "failed"
  >("ready");
  const [error, setError] = useState("");

  useEffect(() => () => engine.dispose(), [engine]);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request = {
      pid: pid.trim() === "" ? 0 : (parseHex(pid) ?? Number.NaN),
    };
    if (validateGen3PidToIvRequest(request).length > 0) {
      setError(t("invalidPidToIvInput"));
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
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];

  return (
    <>
      <form className="seed-to-time-control-grid" onSubmit={run}>
        <section className="panel compact-module-panel seed-to-time-input-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("pidToIvModule")}</h2>
            </div>
            <span className="panel-note">PokeRNG / XDRNG</span>
          </div>
          <div className="pid-to-iv-form-grid">
            <label className="field">
              <span>PID</span>
              <input
                inputMode="text"
                maxLength={8}
                onChange={(event) =>
                  setPid(normalizeHexInput(event.target.value, 8))
                }
                value={pid}
              />
            </label>
            <div className="panel-actions seed-to-time-actions">
              <button
                className="primary-action"
                disabled={status === "calculating"}
                type="submit"
              >
                {t("generate")}
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

      <section className="panel results-panel">
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
            {error.includes("Wasm") ? t("pidToIvWasmMissing") : error}
          </div>
        )}
        <div className="table-shell pid-to-iv-table-shell">
          {states.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyPidToIv")}</span>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t("seed")}</th>
                  <th>{t("method")}</th>
                  <th>HP</th>
                  <th>Atk</th>
                  <th>Def</th>
                  <th>SpA</th>
                  <th>SpD</th>
                  <th>Spe</th>
                </tr>
              </thead>
              <tbody>
                {states.map((state, index) => (
                  <tr key={`${state.seed}-${state.method}-${index}`}>
                    <td>{formatHex(state.seed, 8)}</td>
                    <td>{t(methodKey[state.method])}</td>
                    <td>{state.hp}</td>
                    <td>{state.atk}</td>
                    <td>{state.def}</td>
                    <td>{state.spa}</td>
                    <td>{state.spd}</td>
                    <td>{state.spe}</td>
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
