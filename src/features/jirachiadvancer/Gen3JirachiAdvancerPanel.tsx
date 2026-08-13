import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { parseDecimal, parseHex } from "../id/domain";
import { validateGen3JirachiRequest, type Gen3JirachiAction } from "./domain";
import { Gen3JirachiUiPreviewEngine } from "./preview/Gen3JirachiUiPreviewEngine";
import type {
  Gen3JirachiSearchEngine,
  Gen3JirachiSearchSummary,
} from "./search";
import { Gen3JirachiWorkerPool } from "./worker/Gen3JirachiWorkerPool";

const actionKey: Record<Gen3JirachiAction, string> = {
  0: "jirachiReloadMenu",
  1: "jirachiReject",
  2: "jirachiSpecialCutscene",
  3: "jirachiAccept",
};

export function Gen3JirachiAdvancerPanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen3JirachiSearchEngine>(
    () =>
      uiPreviewMode
        ? new Gen3JirachiUiPreviewEngine()
        : new Gen3JirachiWorkerPool(),
    [uiPreviewMode],
  );
  const [startingSeed, setStartingSeed] = useState("");
  const [targetSeed, setTargetSeed] = useState("");
  const [maxAdvances, setMaxAdvances] = useState("");
  const [bruteForceRange, setBruteForceRange] = useState("");
  const [summary, setSummary] = useState<Gen3JirachiSearchSummary>();
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "cancelled" | "failed"
  >("ready");
  const [error, setError] = useState("");

  useEffect(() => () => engine.dispose(), [engine]);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request = {
      startingSeed: parseHex(startingSeed) ?? 0,
      targetSeed: parseHex(targetSeed) ?? 0,
      maxAdvances: parseDecimal(maxAdvances) ?? 0,
      bruteForceRange: parseDecimal(bruteForceRange) ?? 0,
    };
    if (validateGen3JirachiRequest(request).length > 0) {
      setError(t("invalidJirachiInput"));
      setStatus("failed");
      return;
    }
    setSummary(undefined);
    setError("");
    setStatus("calculating");
    try {
      const nextSummary = await engine.search(request);
      setSummary(nextSummary);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(
        message === "jirachi_outside_range"
          ? t("jirachiOutsideRange")
          : message === "jirachi_unobtainable"
            ? t("jirachiUnobtainable")
            : message,
      );
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
      <form className="jirachi-control-grid" onSubmit={run}>
        <section className="panel compact-module-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("jirachiAdvancerModule")}</h2>
            </div>
            <span className="panel-note">XDRNG</span>
          </div>
          <div className="jirachi-form-grid">
            <label className="field">
              <span>{t("jirachiStartingSeed")}</span>
              <input
                inputMode="text"
                maxLength={8}
                onChange={(event) =>
                  setStartingSeed(normalizeHexInput(event.target.value, 8))
                }
                value={startingSeed}
              />
            </label>
            <label className="field">
              <span>{t("jirachiTargetSeed")}</span>
              <input
                inputMode="text"
                maxLength={8}
                onChange={(event) =>
                  setTargetSeed(normalizeHexInput(event.target.value, 8))
                }
                value={targetSeed}
              />
            </label>
            <label className="field">
              <span>{t("maxAdvances")}</span>
              <input
                inputMode="numeric"
                max={0xffff_ffff}
                min={0}
                maxLength={10}
                onChange={(event) =>
                  setMaxAdvances(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={maxAdvances}
              />
            </label>
            <label className="field">
              <span>{t("jirachiBruteForceRange")}</span>
              <input
                inputMode="numeric"
                max={0xffff_ffff}
                min={0}
                maxLength={10}
                onChange={(event) =>
                  setBruteForceRange(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={bruteForceRange}
              />
            </label>
            <div className="panel-actions jirachi-actions">
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

      <section className="panel results-panel jirachi-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{statusLabel}</span>
          </div>
        </div>
        <div className="metrics-row">
          <span>
            {t("rowAdvance")} <strong>{summary?.targetAdvances ?? "-"}</strong>
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
            {error.includes("Wasm") ? t("jirachiWasmMissing") : error}
          </div>
        )}
        {!summary || summary.actions.length === 0 ? (
          <div className="empty-state jirachi-empty-state">
            <span className="empty-cross">+</span>
            <span>{t("emptyJirachi")}</span>
          </div>
        ) : (
          <ol className="jirachi-action-list">
            {summary.actions.map((action, index) => (
              <li key={`${index}-${action}`}>
                {t(actionKey[action]).replace("%1", String(index + 1))}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
