import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  isThreeDsGen7Profile,
  type ThreeDsProfile,
} from "../3dsprofiles/domain";
import {
  appendGen7MainNeedle,
  formatGen7MainHex,
  gen7MainNeedleMinimum,
  gen7MainStartingFrame,
  loadGen7MainContext,
  loadGen7MainStartup,
  saveGen7MainContext,
  saveGen7MainStartup,
  validateGen7MainQrRequest,
  validateGen7MainSeedRequest,
  validateGen7MainTimeRequest,
  type Gen7MainQrResult,
  type Gen7MainSeedMode,
  type Gen7MainSeedResult,
  type Gen7MainTimeResult,
  type Gen7MainVersion,
} from "./domain";
import { Gen7MainUiPreviewEngine } from "./preview/Gen7MainUiPreviewEngine";
import "./Gen7MainPanel.css";
import type {
  Gen7MainEngine,
  Gen7MainSeedProgress,
  Gen7MainSeedSummary,
  Gen7MainTimeSummary,
} from "./search";
import { Gen7MainWorkerPool } from "./worker/Gen7MainWorkerPool";

type MainMode = Gen7MainSeedMode | "qr";
type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";

const VERSION_OPTIONS: { value: Gen7MainVersion; label: string }[] = [
  { value: "sun", label: "gen7Sun" },
  { value: "moon", label: "gen7Moon" },
  { value: "ultra-sun", label: "gen7UltraSun" },
  { value: "ultra-moon", label: "gen7UltraMoon" },
];

const CLOCK_IMAGES = import.meta.glob("./assets/Clock_*.jpg", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

function clockImage(index: number) {
  return CLOCK_IMAGES[`./assets/Clock_${String(index).padStart(2, "0")}.jpg`];
}

function parseDecimal(value: string) {
  return value.trim() === "" ? 0 : Number(value);
}

function parseHex(value: string) {
  return value.trim() === "" ? 0 : Number.parseInt(value, 16);
}

function formatClockList(needles: number[]) {
  return needles.join(",");
}

function parseClockList(value: string) {
  if (value.trim() === "") return [];
  return value.split(",").map((part) => Number(part.trim()));
}

function formatTimeFrames(result: Gen7MainTimeResult) {
  const seconds = result.primaryFrames / 30;
  const base = `${result.primaryFrames * 2}F (${seconds.toFixed(3)}s)`;
  return result.secondaryFrames > 0
    ? `${base} <${result.secondaryFrames * 2}F>`
    : base;
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen7MainPanel({
  profile,
  uiPreviewMode,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen7MainEngine>(
    () =>
      uiPreviewMode ? new Gen7MainUiPreviewEngine() : new Gen7MainWorkerPool(),
    [uiPreviewMode],
  );
  const storedContext = useMemo(() => loadGen7MainContext(), []);
  const [mode, setMode] = useState<MainMode>("initial");
  const [version, setVersion] = useState<Gen7MainVersion>(
    storedContext?.version ?? "sun",
  );
  const [needles, setNeedles] = useState<number[]>([]);
  const [clockPosition, setClockPosition] = useState<"start" | "end">("end");
  const [offset, setOffset] = useState("4");
  const [seed, setSeed] = useState(
    storedContext ? formatGen7MainHex(storedContext.seed) : "00000000",
  );
  const [minFrame, setMinFrame] = useState("418");
  const [maxFrame, setMaxFrame] = useState("50000");
  const [results, setResults] = useState<Gen7MainSeedResult[]>([]);
  const [qrResults, setQrResults] = useState<Gen7MainQrResult[]>([]);
  const [progress, setProgress] = useState<Gen7MainSeedProgress>({
    processedSeeds: 0,
    totalSeeds: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen7MainSeedSummary>();
  const [qrElapsedMs, setQrElapsedMs] = useState<number>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [startup, setStartup] = useState(() => loadGen7MainStartup());
  const [timeSeed, setTimeSeed] = useState(
    storedContext ? formatGen7MainHex(storedContext.seed) : "00000000",
  );
  const [timeStartingFrame, setTimeStartingFrame] = useState(
    storedContext ? String(storedContext.normalFrame) : "425",
  );
  const [timeTargetFrame, setTimeTargetFrame] = useState("500");
  const [timeNpc, setTimeNpc] = useState("0");
  const [timeFidget, setTimeFidget] = useState(false);
  const [timeRaining, setTimeRaining] = useState(false);
  const [timeSummary, setTimeSummary] = useState<Gen7MainTimeSummary>();
  const [timeError, setTimeError] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      engine.dispose();
    },
    [engine],
  );

  useEffect(() => {
    const frame = gen7MainStartingFrame(
      version,
      mode === "id" ? "id" : "normal",
    );
    setMinFrame(String(frame));
    setTimeStartingFrame(String(frame));
  }, [mode, version]);

  useEffect(() => {
    if (isThreeDsGen7Profile(profile)) setVersion(profile.version);
  }, [profile]);

  const minimumNeedles = mode === "qr" ? 2 : gen7MainNeedleMinimum(mode);
  const isCalculating = status === "calculating";

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: mode === "qr" ? qrResults.length : results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 10,
  });

  const updateNeedles = (next: number[]) => {
    setNeedles(next);
    setError("");
  };

  const addNeedle = (value: number) => {
    try {
      updateNeedles(
        appendGen7MainNeedle(
          needles,
          value,
          parseDecimal(offset),
          mode !== "qr" && clockPosition === "end",
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const backNeedle = () => updateNeedles(needles.slice(0, -1));

  const clearResults = () => {
    setResults([]);
    setQrResults([]);
    setSummary(undefined);
    setQrElapsedMs(undefined);
    setProgress({
      processedSeeds: 0,
      totalSeeds: 0,
      resultCount: 0,
      percent: 0,
    });
    setTimeSummary(undefined);
    setError("");
    setStatus("ready");
  };

  const exportCsv = () => {
    const rows =
      mode === "qr"
        ? [
            [t("gen7MainQrLastFrame"), t("gen7MainQrAfterFrame")],
            ...qrResults.map((result) => [
              result.lastClockFrame,
              result.afterQrFrame,
            ]),
          ]
        : [
            [t("gen7MainSeed"), t("gen7MainCorrection")],
            ...results.map((result) => [
              formatGen7MainHex(result.seed),
              result.correction,
            ]),
          ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gen7-main-${mode}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (isCalculating) return;
    const parsedNeedles = needles;
    setError("");
    try {
      if (mode === "qr") {
        const request = validateGen7MainQrRequest({
          operation: "qr-search",
          seed: parseHex(seed),
          minFrame: parseDecimal(minFrame),
          maxFrame: parseDecimal(maxFrame),
          needles: parsedNeedles,
        });
        setResults([]);
        setQrResults([]);
        setSummary(undefined);
        setProgress({
          processedSeeds: 0,
          totalSeeds: 0,
          resultCount: 0,
          percent: 0,
        });
        setStatus("calculating");
        const controller = new AbortController();
        abortRef.current = controller;
        const nextSummary = await engine.searchQr(request, controller.signal);
        setQrResults(nextSummary.results);
        setQrElapsedMs(nextSummary.elapsedMs);
        setStatus(nextSummary.cancelled ? "cancelled" : "completed");
        return;
      }
      const request = validateGen7MainSeedRequest({
        operation: "seed-search",
        version,
        mode,
        needles: parsedNeedles,
      });
      setResults([]);
      setQrResults([]);
      setSummary(undefined);
      setProgress({
        processedSeeds: 0,
        totalSeeds: 0x1_0000_0000,
        resultCount: 0,
        percent: 0,
      });
      setStatus("calculating");
      const controller = new AbortController();
      abortRef.current = controller;
      let foundSeed: Gen7MainSeedResult | undefined;
      const nextSummary = await engine.searchSeeds(request, {
        signal: controller.signal,
        onBatch: (batch) => {
          foundSeed ??= batch[0];
          setResults((current) => current.concat(batch));
        },
        onProgress: setProgress,
      });
      setSummary(nextSummary);
      if (nextSummary.resultCount === 1 && foundSeed) {
        saveGen7MainContext({
          version,
          seed: foundSeed.seed,
          normalFrame: gen7MainStartingFrame(version),
          idCorrection: foundSeed.correction,
        });
      }
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    } finally {
      abortRef.current = undefined;
    }
  };

  const calculateTime = async (event: FormEvent) => {
    event.preventDefault();
    if (isCalculating) return;
    setTimeError("");
    try {
      const request = validateGen7MainTimeRequest({
        operation: "time-calculator",
        seed: parseHex(timeSeed),
        startingFrame: parseDecimal(timeStartingFrame),
        targetFrame: parseDecimal(timeTargetFrame),
        npc: parseDecimal(timeNpc),
        fidget: timeFidget,
        raining: timeRaining,
      });
      const controller = new AbortController();
      abortRef.current = controller;
      const nextSummary = await engine.calculateTime(
        request,
        controller.signal,
      );
      setTimeSummary(nextSummary);
    } catch (cause) {
      setTimeError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      abortRef.current = undefined;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    engine.cancel();
  };

  const modeLabel =
    mode === "initial"
      ? t("gen7MainSaveScreen")
      : mode === "id"
        ? t("gen7MainIdMode")
        : t("gen7MainQrMode");
  const currentResultCount = mode === "qr" ? qrResults.length : results.length;
  const progressPercent =
    mode === "qr" ? (qrResults.length > 0 ? 100 : 0) : progress.percent;

  return (
    <div className="gen7main-panel">
      <div className="gen7main-workspace">
        <section className="panel gen7main-controls">
          <div className="gen7main-heading">
            <span className="panel-index">01</span>
            <h2>{t("gen7MainInputTool")}</h2>
            <label className="gen7main-startup-toggle">
              <input
                checked={startup}
                onChange={(event) => {
                  setStartup(event.target.checked);
                  saveGen7MainStartup(event.target.checked);
                }}
                type="checkbox"
              />
              <span>{t("gen7MainStartup")}</span>
            </label>
          </div>
          <div className="gen7main-control-scroll">
            <div
              className="gen7main-mode-tabs"
              role="tablist"
              aria-label={t("gen7MainSearchMode")}
            >
              {(["initial", "qr", "id"] as MainMode[]).map((value) => (
                <button
                  aria-selected={mode === value}
                  className={mode === value ? "active" : ""}
                  key={value}
                  onClick={() => setMode(value)}
                  role="tab"
                  type="button"
                >
                  {value === "initial"
                    ? t("gen7MainSaveScreen")
                    : value === "qr"
                      ? t("gen7MainQrMode")
                      : t("gen7MainIdMode")}
                </button>
              ))}
            </div>
            <div className="gen7main-field-grid">
              <label className="field">
                <span>{t("gen7GameVersion")}</span>
                <select
                  disabled={isCalculating}
                  onChange={(event) =>
                    setVersion(event.target.value as Gen7MainVersion)
                  }
                  value={version}
                >
                  {VERSION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("gen7MainOffset")}</span>
                <input
                  disabled={isCalculating || mode === "qr"}
                  inputMode="numeric"
                  max={16}
                  min={0}
                  onChange={(event) =>
                    setOffset(normalizeDecimalInput(event.target.value, 16, 2))
                  }
                  value={offset}
                />
              </label>
              {mode === "qr" ? (
                <label className="field gen7main-seed-field">
                  <span>{t("seed")}</span>
                  <div className="prefixed-input">
                    <span>0x</span>
                    <input
                      disabled={isCalculating}
                      maxLength={8}
                      onChange={(event) =>
                        setSeed(normalizeHexInput(event.target.value, 8))
                      }
                      value={seed}
                    />
                  </div>
                </label>
              ) : null}
            </div>
            <div className="gen7main-clock-panel">
              <div className="gen7main-clock-heading">
                <div>
                  <span className="panel-kicker">{t("gen7MainClockList")}</span>
                  <strong>
                    {needles.length}/{16}
                  </strong>
                </div>
                <div className="gen7main-position-tabs">
                  <label>
                    <input
                      checked={clockPosition === "start"}
                      disabled={mode === "qr" || isCalculating}
                      onChange={() => setClockPosition("start")}
                      type="radio"
                    />
                    {t("gen7MainStartPosition")}
                  </label>
                  <label>
                    <input
                      checked={clockPosition === "end"}
                      disabled={mode === "qr" || isCalculating}
                      onChange={() => setClockPosition("end")}
                      type="radio"
                    />
                    {t("gen7MainEndPosition")}
                  </label>
                </div>
              </div>
              <div className="gen7main-clock-grid">
                {Array.from({ length: 17 }, (_, value) => (
                  <button
                    aria-label={`${t("gen7MainClock")} ${value}`}
                    className="gen7main-clock-button"
                    disabled={isCalculating || needles.length >= 16}
                    key={value}
                    onClick={() => addNeedle(value)}
                    title={`${t("gen7MainClock")} ${value}`}
                    type="button"
                  >
                    <img alt="" src={clockImage(value)} />
                    <span>{value}</span>
                  </button>
                ))}
              </div>
              <div className="gen7main-clock-entry">
                <input
                  aria-label={t("gen7MainClockList")}
                  disabled={isCalculating}
                  onChange={(event) => {
                    try {
                      const next = parseClockList(event.target.value);
                      if (
                        next.length > 16 ||
                        next.some(
                          (value) =>
                            !Number.isInteger(value) || value < 0 || value > 16,
                        )
                      )
                        throw new RangeError(t("invalidGen7MainInput"));
                      updateNeedles(next);
                    } catch (cause) {
                      setError(
                        cause instanceof Error ? cause.message : String(cause),
                      );
                    }
                  }}
                  value={formatClockList(needles)}
                />
                <button
                  aria-label={t("back")}
                  className="gen7main-icon-button"
                  disabled={isCalculating || needles.length === 0}
                  onClick={backNeedle}
                  title={t("back")}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={16} />
                </button>
                <button
                  aria-label={t("clear")}
                  className="gen7main-icon-button"
                  disabled={isCalculating || needles.length === 0}
                  onClick={() => updateNeedles([])}
                  title={t("clear")}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </div>
            </div>
            <form className="gen7main-search-form" onSubmit={generate}>
              <div className="gen7main-field-grid">
                {mode === "qr" ? (
                  <>
                    <label className="field">
                      <span>{t("gen7MainFrameMinimum")}</span>
                      <input
                        disabled={isCalculating}
                        inputMode="numeric"
                        max={100_000_000}
                        onChange={(event) =>
                          setMinFrame(
                            normalizeDecimalInput(
                              event.target.value,
                              100_000_000,
                              9,
                            ),
                          )
                        }
                        value={minFrame}
                      />
                    </label>
                    <label className="field">
                      <span>{t("gen7MainFrameMaximum")}</span>
                      <input
                        disabled={isCalculating}
                        inputMode="numeric"
                        max={100_000_000}
                        onChange={(event) =>
                          setMaxFrame(
                            normalizeDecimalInput(
                              event.target.value,
                              100_000_000,
                              9,
                            ),
                          )
                        }
                        value={maxFrame}
                      />
                    </label>
                  </>
                ) : null}
              </div>
              <div className="gen7main-actions">
                <button
                  className="gen7main-primary-action"
                  disabled={isCalculating}
                  type="submit"
                >
                  <Play aria-hidden="true" size={17} />
                  {t("gen7MainSearch")}
                </button>
                <button
                  aria-label={t("cancel")}
                  className="gen7main-icon-button"
                  disabled={!isCalculating}
                  onClick={stop}
                  title={t("cancel")}
                  type="button"
                >
                  <Square aria-hidden="true" size={16} />
                </button>
                <span className="gen7main-needle-hint">
                  {t("gen7MainNeedleMinimum", { count: minimumNeedles })}
                </span>
              </div>
            </form>
            <form className="gen7main-time-form" onSubmit={calculateTime}>
              <div className="gen7main-subheading">
                <span className="panel-kicker">02</span>
                <h3>{t("gen7MainTimeCalculator")}</h3>
              </div>
              <div className="gen7main-field-grid">
                <label className="field">
                  <span>{t("seed")}</span>
                  <div className="prefixed-input">
                    <span>0x</span>
                    <input
                      disabled={isCalculating}
                      maxLength={8}
                      onChange={(event) =>
                        setTimeSeed(normalizeHexInput(event.target.value, 8))
                      }
                      value={timeSeed}
                    />
                  </div>
                </label>
                <label className="field">
                  <span>{t("gen7MainStartingFrame")}</span>
                  <input
                    disabled={isCalculating}
                    inputMode="numeric"
                    max={100_000_000}
                    onChange={(event) =>
                      setTimeStartingFrame(
                        normalizeDecimalInput(
                          event.target.value,
                          100_000_000,
                          9,
                        ),
                      )
                    }
                    value={timeStartingFrame}
                  />
                </label>
                <label className="field">
                  <span>{t("gen7MainTargetFrame")}</span>
                  <input
                    disabled={isCalculating}
                    inputMode="numeric"
                    max={100_000_000}
                    onChange={(event) =>
                      setTimeTargetFrame(
                        normalizeDecimalInput(
                          event.target.value,
                          100_000_000,
                          9,
                        ),
                      )
                    }
                    value={timeTargetFrame}
                  />
                </label>
                <label className="field">
                  <span>{t("gen7MainNpc")}</span>
                  <input
                    disabled={isCalculating}
                    inputMode="numeric"
                    max={50}
                    onChange={(event) =>
                      setTimeNpc(
                        normalizeDecimalInput(event.target.value, 50, 2),
                      )
                    }
                    value={timeNpc}
                  />
                </label>
              </div>
              <div className="gen7main-checks">
                <label>
                  <input
                    checked={timeFidget}
                    disabled={isCalculating}
                    onChange={(event) => setTimeFidget(event.target.checked)}
                    type="checkbox"
                  />
                  {t("gen7MainFidget")}
                </label>
                <label>
                  <input
                    checked={timeRaining}
                    disabled={isCalculating}
                    onChange={(event) => setTimeRaining(event.target.checked)}
                    type="checkbox"
                  />
                  {t("gen7MainRaining")}
                </label>
                <button
                  className="gen7main-secondary-action"
                  disabled={isCalculating}
                  type="submit"
                >
                  <Play aria-hidden="true" size={15} />
                  {t("calculate")}
                </button>
              </div>
              {timeError && <div className="alert error">{timeError}</div>}
              {timeSummary && !timeSummary.cancelled && (
                <output className="gen7main-time-result">
                  {formatTimeFrames(timeSummary.result)}
                </output>
              )}
            </form>
          </div>
        </section>

        <section className="panel gen7main-results">
          <div className="gen7main-results-heading">
            <div>
              <span className="panel-index">03</span>
              <h2>{modeLabel}</h2>
              <span className={`run-status ${status}`}>{t(status)}</span>
            </div>
            <div className="gen7main-result-actions">
              <output>{currentResultCount.toLocaleString()}</output>
              <button
                aria-label={t("exportCsv")}
                className="gen7main-icon-button"
                disabled={currentResultCount === 0}
                onClick={exportCsv}
                title={t("exportCsv")}
                type="button"
              >
                <Download aria-hidden="true" size={17} />
              </button>
              <button
                aria-label={t("clear")}
                className="gen7main-icon-button"
                disabled={currentResultCount === 0 && !timeSummary}
                onClick={clearResults}
                title={t("clear")}
                type="button"
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
          </div>
          <div className="progress-track" aria-label={`${progressPercent}%`}>
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="metrics-row gen7main-metrics">
            <span>
              {t("gen7MainProcessed")}{" "}
              <strong>
                {mode === "qr" ? "-" : progress.processedSeeds.toLocaleString()}
              </strong>
            </span>
            <span>
              {t("results")}{" "}
              <strong>{currentResultCount.toLocaleString()}</strong>
            </span>
            <span>
              {t("elapsed")}{" "}
              <strong>
                {summary
                  ? `${summary.elapsedMs.toFixed(0)} ms`
                  : qrElapsedMs === undefined
                    ? "-"
                    : `${qrElapsedMs.toFixed(0)} ms`}
              </strong>
            </span>
          </div>
          {error && <div className="alert error">{error}</div>}
          {mode !== "qr" && summary?.cancelled && (
            <div className="alert warning">{t("cancelled")}</div>
          )}
          <div className="table-shell gen7main-table-shell" ref={tableRef}>
            {currentResultCount === 0 ? (
              <div className="empty-state compact">
                <span>{t("emptyGen7Main")}</span>
              </div>
            ) : (
              <div
                className="gen7main-virtual-table"
                style={{ height: `${virtualizer.getTotalSize() + 40}px` }}
              >
                <div
                  className={`gen7main-table-header ${mode === "qr" ? "qr" : "seed"}`}
                >
                  <span />
                  {mode === "qr" ? (
                    <>
                      <span>{t("gen7MainQrLastFrame")}</span>
                      <span>{t("gen7MainQrAfterFrame")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("gen7MainSeed")}</span>
                      <span>{t("gen7MainCorrection")}</span>
                      <span>{t("gen7MainUseSeed")}</span>
                    </>
                  )}
                </div>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  if (mode === "qr") {
                    const result = qrResults[virtualRow.index];
                    return (
                      <div
                        className="gen7main-table-row qr"
                        key={`${result.lastClockFrame}-${virtualRow.index}`}
                        style={{
                          transform: `translateY(${virtualRow.start + 40}px)`,
                        }}
                      >
                        <span>{virtualRow.index + 1}</span>
                        <span>{result.lastClockFrame}</span>
                        <span>{result.afterQrFrame}</span>
                      </div>
                    );
                  }
                  const result = results[virtualRow.index];
                  return (
                    <div
                      className="gen7main-table-row seed"
                      key={`${result.seed}-${virtualRow.index}`}
                      style={{
                        transform: `translateY(${virtualRow.start + 40}px)`,
                      }}
                    >
                      <span>{virtualRow.index + 1}</span>
                      <span>{formatGen7MainHex(result.seed)}</span>
                      <span>{result.correction}</span>
                      <button
                        aria-label={t("gen7MainUseSeed")}
                        onClick={() => {
                          setTimeSeed(formatGen7MainHex(result.seed));
                          setSeed(formatGen7MainHex(result.seed));
                          saveGen7MainContext({
                            version,
                            seed: result.seed,
                            normalFrame: gen7MainStartingFrame(version),
                            idCorrection: result.correction,
                          });
                        }}
                        title={t("gen7MainUseSeed")}
                        type="button"
                      >
                        <ArrowLeft aria-hidden="true" size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
