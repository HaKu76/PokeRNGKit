import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { parseDecimal, parseHex } from "../id/domain";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import {
  formatGen4Roamers,
  formatGen4SeedToTime,
  formatGen4Sequence,
  normalizeGen4Sequence,
  validateGen4SeedToTimeCalibrationRequest,
  validateGen4SeedToTimeRequest,
  type Gen4RoamerInput,
  type Gen4SeedToTimeCalibrationState,
  type Gen4SeedToTimeMode,
  type Gen4SeedToTimeState,
  type Gen4SeedToTimeStatus,
} from "./domain";
import { Gen4SeedToTimeUiPreviewEngine } from "./preview/Gen4SeedToTimeUiPreviewEngine";
import type { Gen4SeedToTimeSearchEngine } from "./search";
import { Gen4SeedToTimeWorkerPool } from "./worker/Gen4SeedToTimeWorkerPool";
import roamerMap from "./assets/roamers.png";
import enteiImage from "./assets/entei.png";
import latiImage from "./assets/latias.png";
import latiosImage from "./assets/latios.png";
import raikouImage from "./assets/raikou.png";

type RunStatus = "ready" | "calculating" | "completed" | "failed";
const emptyRoamer = (): Gen4RoamerInput => ({ enabled: false, route: 0 });
const PAGE_SIZE = 250;

export function Gen4SeedToTimePanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen4SeedToTimeSearchEngine>(
    () =>
      uiPreviewMode
        ? new Gen4SeedToTimeUiPreviewEngine()
        : new Gen4SeedToTimeWorkerPool(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Gen4SeedToTimeMode>("dppt");
  const [seed, setSeed] = useState("");
  const [year, setYear] = useState("2000");
  const [forceSecond, setForceSecond] = useState(false);
  const [second, setSecond] = useState("0");
  const [raikou, setRaikou] = useState(emptyRoamer);
  const [entei, setEntei] = useState(emptyRoamer);
  const [lati, setLati] = useState(emptyRoamer);
  const [states, setStates] = useState<Gen4SeedToTimeState[]>([]);
  const [selected, setSelected] = useState<number>();
  const [statusSummary, setStatusSummary] = useState<Gen4SeedToTimeStatus>();
  const [delayCalibration, setDelayCalibration] = useState("10");
  const [secondCalibration, setSecondCalibration] = useState("1");
  const [calibrations, setCalibrations] = useState<
    Gen4SeedToTimeCalibrationState[]
  >([]);
  const [sequenceQuery, setSequenceQuery] = useState("");
  const [page, setPage] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [elapsedMs, setElapsedMs] = useState<number>();

  useEffect(() => () => engine.dispose(), [engine]);

  const modeRoamers =
    mode === "hgss"
      ? { raikou, entei, lati }
      : {
          raikou: emptyRoamer(),
          entei: emptyRoamer(),
          lati: emptyRoamer(),
        };
  const normalizedQuery = normalizeGen4Sequence(sequenceQuery);
  const filteredCalibrations = useMemo(
    () =>
      normalizedQuery
        ? calibrations.filter((state) => {
            const sequence = formatGen4Sequence(
              state.sequenceLow,
              state.sequenceHigh,
              mode === "hgss" ? 20 + state.skips : 20,
              mode,
              state.skips,
            );
            const searchable =
              mode === "hgss" && sequence.includes(")")
                ? sequence.slice(sequence.indexOf(")") + 1)
                : sequence;
            return normalizeGen4Sequence(searchable).includes(normalizedQuery);
          })
        : calibrations,
    [calibrations, mode, normalizedQuery],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredCalibrations.length / PAGE_SIZE),
  );
  const pageStates = filteredCalibrations.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    failed: t("failed"),
  }[status];

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request = {
      seed: parseHex(seed) ?? 0,
      year: parseDecimal(year) ?? Number.NaN,
      forceSecond,
      second: parseDecimal(second) ?? 0,
      mode,
      ...modeRoamers,
    };
    if (validateGen4SeedToTimeRequest(request).length) {
      setError(t("gen4SeedToTimeInvalid"));
      setStatus("failed");
      return;
    }
    setStatus("calculating");
    setError("");
    setStates([]);
    setSelected(undefined);
    setCalibrations([]);
    setSequenceQuery("");
    try {
      const summary = await engine.search(request);
      setStates(summary.states);
      setStatusSummary(summary.status);
      setElapsedMs(summary.elapsedMs);
      setStatus("completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const calibrate = async () => {
    if (selected === undefined || !states[selected]) {
      setError(`${t("gen4InvalidSelection")}: ${t("gen4SelectValidRow")}`);
      setStatus("failed");
      return;
    }
    const request = {
      target: states[selected],
      delayCalibration: parseDecimal(delayCalibration) ?? Number.NaN,
      secondCalibration: parseDecimal(secondCalibration) ?? Number.NaN,
      mode,
      ...modeRoamers,
    };
    const validation = validateGen4SeedToTimeCalibrationRequest(request);
    if (validation.length) {
      setError(
        validation.includes("resultCount")
          ? t("gen4CalibrationTooLarge")
          : t("gen4SeedToTimeInvalid"),
      );
      setStatus("failed");
      return;
    }
    setStatus("calculating");
    setError("");
    setSequenceQuery("");
    setPage(0);
    try {
      const summary = await engine.calibrate(request);
      setCalibrations(summary.states);
      setElapsedMs(summary.elapsedMs);
      setStatus("completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const setRoamer = (
    setter: (value: Gen4RoamerInput) => void,
    current: Gen4RoamerInput,
    enabled: boolean,
  ) => setter({ ...current, enabled });

  return (
    <>
      <div className="operation-tabs gen4-seed-to-time-tabs" role="tablist">
        {(["dppt", "hgss"] as const).map((entry) => (
          <button
            aria-selected={mode === entry}
            className={mode === entry ? "active" : ""}
            key={entry}
            onClick={() => {
              setMode(entry);
              setStates([]);
              setSelected(undefined);
              setCalibrations([]);
              setStatusSummary(undefined);
              setError("");
            }}
            role="tab"
            type="button"
          >
            {entry === "dppt" ? "DPPt" : "HGSS"}
          </button>
        ))}
      </div>

      <form className="gen4-seed-to-time-workspace" onSubmit={generate}>
        <section className="panel compact-module-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("gen4SeedToTimeSearch")}</h2>
            </div>
            <span className="panel-note">
              {mode === "dppt" ? "DPPt" : "HGSS"}
            </span>
          </div>
          <div className="gen4-seed-to-time-fields">
            <label className="field">
              <span>{t("seed")}</span>
              <input
                inputMode="text"
                maxLength={8}
                onChange={(event) =>
                  setSeed(normalizeHexInput(event.target.value, 8))
                }
                value={seed}
              />
            </label>
            <label className="field">
              <span>{t("year")}</span>
              <input
                inputMode="numeric"
                max={2099}
                min={2000}
                maxLength={4}
                onChange={(event) =>
                  setYear(normalizeDecimalInput(event.target.value, 2099, 4))
                }
                value={year}
              />
            </label>
            <label className="field gen4-second-field">
              <span>{t("second")}</span>
              <span className="paired-toggle-control">
                <input
                  aria-label={t("second")}
                  checked={forceSecond}
                  onChange={(event) => setForceSecond(event.target.checked)}
                  type="checkbox"
                />
                <input
                  disabled={!forceSecond}
                  inputMode="numeric"
                  max={59}
                  min={0}
                  maxLength={2}
                  onChange={(event) =>
                    setSecond(normalizeDecimalInput(event.target.value, 59, 2))
                  }
                  value={second}
                />
              </span>
            </label>
          </div>
          {mode === "hgss" && (
            <div className="gen4-roamer-row">
              <button
                className="secondary-action"
                id="gen4-roamer-map-trigger"
                onClick={() => setMapOpen(true)}
                type="button"
              >
                {t("map")}
              </button>
              {[
                ["R", raikou, setRaikou, 46],
                ["E", entei, setEntei, 46],
                ["L", lati, setLati, 28],
              ].map(([label, current, setter, maximum]) => {
                const roamer = current as Gen4RoamerInput;
                const update = setter as (value: Gen4RoamerInput) => void;
                return (
                  <label className="roamer-route-control" key={String(label)}>
                    <input
                      checked={roamer.enabled}
                      onChange={(event) =>
                        setRoamer(update, roamer, event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>{String(label)}</span>
                    <input
                      aria-label={String(label)}
                      disabled={!roamer.enabled}
                      inputMode="numeric"
                      max={Number(maximum)}
                      min={0}
                      maxLength={2}
                      onChange={(event) =>
                        update({
                          ...roamer,
                          route:
                            parseDecimal(
                              normalizeDecimalInput(
                                event.target.value,
                                Number(maximum),
                                2,
                              ),
                            ) ?? 0,
                        })
                      }
                      value={String(roamer.route)}
                    />
                  </label>
                );
              })}
            </div>
          )}
          <div className="sequence-status">
            <span>{mode === "dppt" ? t("coinFlips") : t("elmCalls")}</span>
            <strong>
              {statusSummary
                ? formatGen4Sequence(
                    statusSummary.sequenceLow,
                    statusSummary.sequenceHigh,
                    mode === "hgss" ? 20 + statusSummary.skips : 20,
                    mode,
                    statusSummary.skips,
                  )
                : "-"}
            </strong>
          </div>
          {mode === "hgss" && (
            <div className="sequence-status">
              <span>{t("roamers")}</span>
              <strong>
                {statusSummary
                  ? formatGen4Roamers(statusSummary) || t("noRoamers")
                  : "-"}
              </strong>
            </div>
          )}
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {t("generate")}
            </button>
          </div>
        </section>

        <section className="panel compact-module-panel">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("calibration")}</h2>
            </div>
            <span className={`run-status ${status}`}>{statusLabel}</span>
          </div>
          <div className="gen4-calibration-fields">
            <label className="field">
              <span>{t("delay")}</span>
              <input
                inputMode="numeric"
                max={0xffff_ffff}
                min={0}
                maxLength={10}
                onChange={(event) =>
                  setDelayCalibration(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={delayCalibration}
              />
            </label>
            <label className="field">
              <span>{t("second")}</span>
              <input
                inputMode="numeric"
                max={500}
                min={0}
                maxLength={3}
                onChange={(event) =>
                  setSecondCalibration(
                    normalizeDecimalInput(event.target.value, 500, 3),
                  )
                }
                value={secondCalibration}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button
              className="secondary-action"
              disabled={calibrations.length === 0}
              onClick={() => {
                const sequence = window.prompt(
                  mode === "dppt" ? t("coinFlips") : t("elmCalls"),
                  sequenceQuery,
                );
                if (sequence !== null) {
                  setSequenceQuery(sequence);
                  setPage(0);
                }
              }}
              type="button"
            >
              {mode === "dppt" ? t("searchFlips") : t("searchCalls")}
            </button>
            <button
              className="primary-action"
              disabled={status === "calculating"}
              onClick={calibrate}
              type="button"
            >
              {t("generate")}
            </button>
          </div>
          {sequenceQuery && (
            <button
              className="sequence-filter-chip"
              onClick={() => {
                setSequenceQuery("");
                setPage(0);
              }}
              type="button"
            >
              {sequenceQuery} ×
            </button>
          )}
          {error && <div className="alert error">{error}</div>}
          <div className="metrics-row">
            <span>
              {t("elapsed")} <strong>{elapsedMs?.toFixed(0) ?? "-"} ms</strong>
            </span>
            <span>
              {t("results")} <strong>{filteredCalibrations.length}</strong>
            </span>
          </div>
        </section>
      </form>

      <section className="panel results-panel gen4-seed-time-results">
        <div className="panel-heading compact">
          <div>
            <span className="panel-index">03</span>
            <h2>{t("results")}</h2>
          </div>
          <span className="result-count">{states.length}</span>
        </div>
        <div className="table-shell gen4-seed-time-table-shell">
          {states.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyGen4SeedToTime")}</span>
            </div>
          ) : (
            <table className="gen4-seed-time-table search-table">
              <thead>
                <tr>
                  <th>{t("dateTime")}</th>
                  <th>{t("delay")}</th>
                </tr>
              </thead>
              <tbody>
                {states.map((state, index) => (
                  <tr
                    aria-selected={selected === index}
                    className={selected === index ? "selected" : ""}
                    key={`${formatGen4SeedToTime(state)}-${state.delay}`}
                    onClick={() => setSelected(index)}
                  >
                    <td>{formatGen4SeedToTime(state)}</td>
                    <td>{state.delay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="panel results-panel gen4-calibration-results">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">04</span>
              <h2>{t("calibration")}</h2>
            </div>
          </div>
          {pageCount > 1 && (
            <div className="pagination-controls">
              <button
                aria-label={t("previous")}
                disabled={page === 0}
                onClick={() => setPage((current) => current - 1)}
                type="button"
              >
                ‹
              </button>
              <span>
                {page + 1} / {pageCount}
              </span>
              <button
                aria-label={t("next")}
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                ›
              </button>
            </div>
          )}
        </div>
        <div className="table-shell gen4-calibration-table-shell">
          {calibrations.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyCalibration")}</span>
            </div>
          ) : (
            <table className="gen4-calibration-table">
              <thead>
                <tr>
                  <th>{t("seed")}</th>
                  <th>{t("dateTime")}</th>
                  <th>{t("delay")}</th>
                  <th>{mode === "dppt" ? t("coinFlips") : t("calls")}</th>
                  {mode === "hgss" && <th>{t("roamers")}</th>}
                </tr>
              </thead>
              <tbody>
                {pageStates.map((state) => (
                  <tr
                    key={`${state.seed}-${formatGen4SeedToTime(state)}-${state.delay}`}
                  >
                    <td>
                      {state.seed.toString(16).toUpperCase().padStart(8, "0")}
                    </td>
                    <td>{formatGen4SeedToTime(state)}</td>
                    <td>{state.delay}</td>
                    <td>
                      {formatGen4Sequence(
                        state.sequenceLow,
                        state.sequenceHigh,
                        mode === "hgss" ? 20 + state.skips : 20,
                        mode,
                        state.skips,
                      )}
                    </td>
                    {mode === "hgss" && (
                      <td>{formatGen4Roamers(state) || t("noRoamers")}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <FloatingToolPanel
        closeLabel={t("close")}
        expanded={mapOpen}
        id="gen4-roamer-map"
        label={t("roamerMap")}
        onExpandedChange={setMapOpen}
        tone="brand"
        triggerId="gen4-roamer-map-trigger"
      >
        <div className="roamer-map-content">
          <img
            alt={t("roamerMap")}
            className="roamer-map-image"
            src={roamerMap}
          />
          <div className="roamer-map-species">
            <span>
              <img alt="" src={enteiImage} />
              {t("entei")}
            </span>
            <span>
              <img alt="" src={raikouImage} />
              {t("raikou")}
            </span>
            <span>
              <img alt="" src={latiImage} />
              <img alt="" src={latiosImage} />
              {t("latias")}/{t("latios")}
            </span>
          </div>
        </div>
      </FloatingToolPanel>
    </>
  );
}
