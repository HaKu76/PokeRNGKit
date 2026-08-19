import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import {
  formatGen6TinyTimelineHex,
  formatGen6TinyTimelinePacked,
  formatGen6TinyTimelineRealTime,
  formatGen6TinyTimelineState,
  GEN6_TINYTIMELINE_BROWSER_MAX_FRAME,
  GEN6_TINYTIMELINE_EVENT_TYPES,
  GEN6_TINYTIMELINE_MAX_FRAME,
  GEN6_TINYTIMELINE_MAX_RESULTS,
  GEN6_TINYTIMELINE_METHODS,
  parseGen6TinyTimelineDecimal,
  parseGen6TinyTimelineHex,
  type Gen6TinyTimelineEvent,
  type Gen6TinyTimelineRequest,
  type Gen6TinyTimelineResult,
} from "./domain";
import { Gen6TinyTimelineUiPreviewEngine } from "./preview/Gen6TinyTimelineUiPreviewEngine";
import type {
  Gen6TinyTimelineEngine,
  Gen6TinyTimelineProgress,
  Gen6TinyTimelineSummary,
} from "./search";
import { Gen6TinyTimelineWorker } from "./worker/Gen6TinyTimelineWorker";
import "./Gen6TinyTimelinePanel.css";

const EVENT_TYPES: Gen6TinyTimelineEvent["type"][] = [0, 1, 3, 4, 5, 6, 7];
const METHOD_EVENT_TYPES: Record<number, Gen6TinyTimelineEvent["type"][]> = {
  0: [0, 1, 3],
  1: [0, 1, 3, 4],
  2: [0, 1, 3],
  3: [0, 1, 3],
  4: [0, 1, 3],
  5: [0, 1],
  6: [0, 1],
  7: [0, 1, 3],
  8: [0, 1, 3, 6],
  9: [5],
  10: [0, 1, 7],
};
const METHOD_EVENT_COUNTS: Record<number, number> = { 7: 2, 9: 4, 10: 3 };

function eventCount(method: number) {
  return METHOD_EVENT_COUNTS[method] ?? 1;
}
function initialEvents(method: number): Gen6TinyTimelineEvent[] {
  return Array.from({ length: eventCount(method) }, (_, index) => ({
    frame: 500 + index * 500,
    type: (METHOD_EVENT_TYPES[method]?.[0] ??
      0) as Gen6TinyTimelineEvent["type"],
  }));
}
function progressInitial(): Gen6TinyTimelineProgress {
  return { processedStates: 0, totalStates: 0, resultCount: 0, percent: 0 };
}
function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen6TinyTimelinePanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen6TinyTimelineEngine>(
    () =>
      uiPreviewMode
        ? new Gen6TinyTimelineUiPreviewEngine()
        : new Gen6TinyTimelineWorker(),
    [uiPreviewMode],
  );
  const [stateWords, setStateWords] = useState([
    "00000000",
    "00000000",
    "00000000",
    "00000000",
  ]);
  const [startingFrame, setStartingFrame] = useState("0");
  const [targetFrame, setTargetFrame] = useState("5000");
  const [resultLimit, setResultLimit] = useState("100000");
  const [method, setMethod] = useState(0);
  const [methodText, setMethodText] = useState<string>(
    GEN6_TINYTIMELINE_METHODS[0],
  );
  const [events, setEvents] = useState<Gen6TinyTimelineEvent[]>(
    initialEvents(0),
  );
  const [parameter1, setParameter1] = useState("6");
  const [parameter2, setParameter2] = useState("1");
  const [boost, setBoost] = useState(false);
  const [isOras, setIsOras] = useState(false);
  const [delay, setDelay] = useState("0");
  const [cryEnabled, setCryEnabled] = useState(false);
  const [cryFrame, setCryFrame] = useState("0");
  const [considerDelay, setConsiderDelay] = useState(false);
  const [results, setResults] = useState<Gen6TinyTimelineResult[]>([]);
  const [resultStartingFrame, setResultStartingFrame] = useState(0);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(progressInitial);
  const [summary, setSummary] = useState<Gen6TinyTimelineSummary>();
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

  const configureMethod = (next: number) => {
    setMethod(next);
    setMethodText(GEN6_TINYTIMELINE_METHODS[next] ?? "");
    setEvents(initialEvents(next));
    setParameter1(
      next === 3
        ? "3"
        : next === 2 || next === 1 || next === 4 || next === 5 || next === 10
          ? "6"
          : "1",
    );
    setParameter2(
      next === 3
        ? "13"
        : next === 5
          ? "98"
          : next === 4
            ? "0"
            : next === 8
              ? "1"
              : "0",
    );
    setDelay(
      next === 3
        ? "6"
        : next === 4
          ? "14"
          : next === 5
            ? "14"
            : next === 7
              ? "78"
              : next === 8
                ? "6"
                : next === 9
                  ? "724"
                  : next === 10
                    ? "324"
                    : "0",
    );
    setConsiderDelay(next === 5 || next === 6 || next === 10);
    setCryEnabled(next === 7);
    setCryFrame(next === 7 ? "32" : "0");
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request: Gen6TinyTimelineRequest = {
      state: stateWords.map(
        (value) => parseGen6TinyTimelineHex(value) ?? Number.NaN,
      ) as [number, number, number, number],
      startingFrame: parseGen6TinyTimelineDecimal(startingFrame) ?? Number.NaN,
      targetFrame: parseGen6TinyTimelineDecimal(targetFrame) ?? Number.NaN,
      method,
      events,
      parameter1: parseGen6TinyTimelineDecimal(parameter1) ?? Number.NaN,
      parameter2: parseGen6TinyTimelineDecimal(parameter2) ?? Number.NaN,
      boost,
      isOras,
      delay: parseGen6TinyTimelineDecimal(delay) ?? Number.NaN,
      cryFrame: cryEnabled
        ? (parseGen6TinyTimelineDecimal(cryFrame) ?? Number.NaN)
        : -1,
      considerDelay,
      resultLimit: parseGen6TinyTimelineDecimal(resultLimit) ?? Number.NaN,
    };
    try {
      setResults([]);
      setResultStartingFrame(request.startingFrame);
      setSummary(undefined);
      setError("");
      setProgress({
        ...progressInitial(),
        totalStates: request.targetFrame - request.startingFrame + 1,
      });
      setStatus("calculating");
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
        "Index",
        "Main RNG Frame",
        "Hit",
        "Rand#",
        "Sync",
        "Encounter",
        "Slot",
        "Flute",
        "Item",
        "HA",
        "BGM",
        "Tiny State",
        "Real Time",
      ],
      ...results.map((result) => [
        result.index,
        `${result.frameMin}~${result.frameMax}`,
        result.hitIndex,
        formatGen6TinyTimelineHex(result.rand),
        result.sync === undefined ? "-" : result.sync ? "O" : "X",
        result.encounter,
        result.slot,
        result.method === 2
          ? formatGen6TinyTimelinePacked(result.flute, 5, 3)
          : result.flute,
        result.method === 2
          ? formatGen6TinyTimelinePacked(result.item, 5, 2)
          : result.item,
        result.hordeHa,
        result.music,
        formatGen6TinyTimelineState(result.state),
        formatGen6TinyTimelineRealTime(result, resultStartingFrame),
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen6tinytimeline.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const allowedTypes = METHOD_EVENT_TYPES[method] ?? EVENT_TYPES;
  const methodOptions = GEN6_TINYTIMELINE_METHODS.map((label, value) => ({
    label,
    value,
  }));
  const parameter1Label =
    method === 3
      ? t("gen6TinyTimelineSlotNumber")
      : t("gen6TinyTimelinePartySize");
  const parameter2Label =
    method === 4
      ? t("gen6TinyTimelineChainLength")
      : t("gen6TinyTimelineEncounterRate");
  return (
    <div className="gen6tinytimeline-workspace">
      <form className="gen6tinytimeline-controls" onSubmit={run}>
        <section className="panel gen6tinytimeline-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6TinyTimelineInput")}</h2>
            </div>
            <span className="panel-note">TinyMT / Timeline</span>
          </div>
          <div className="gen6tinytimeline-state-grid">
            {[3, 2, 1, 0].map((index) => (
              <label className="field" key={index}>
                <span>[{index}]</span>
                <input
                  autoComplete="off"
                  maxLength={8}
                  onChange={(event) => {
                    const next = [...stateWords];
                    next[index] = normalizeHexInput(event.target.value, 8);
                    setStateWords(next);
                  }}
                  spellCheck={false}
                  value={stateWords[index]}
                />
              </label>
            ))}
          </div>
          <div className="gen6tinytimeline-frame-grid">
            <label className="field">
              <span>{t("gen6TinyTimelineStartingFrame")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINYTIMELINE_MAX_FRAME}
                onChange={(event) =>
                  setStartingFrame(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINYTIMELINE_MAX_FRAME,
                      10,
                    ),
                  )
                }
                value={startingFrame}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyTimelineTargetFrame")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINYTIMELINE_MAX_FRAME}
                onChange={(event) =>
                  setTargetFrame(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINYTIMELINE_MAX_FRAME,
                      10,
                    ),
                  )
                }
                value={targetFrame}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyTimelineResultLimit")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINYTIMELINE_MAX_RESULTS}
                onChange={(event) =>
                  setResultLimit(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINYTIMELINE_MAX_RESULTS,
                      6,
                    ),
                  )
                }
                value={resultLimit}
              />
            </label>
          </div>
          <small className="gen6tinytimeline-limit-note">
            {t("gen6TinyTimelineBrowserLimit", {
              limit: GEN6_TINYTIMELINE_BROWSER_MAX_FRAME.toLocaleString(),
            })}
          </small>
          <label className="field">
            <span>{t("gen6TinyTimelineMethod")}</span>
            <AutoCompleteComboBox
              inputValue={methodText}
              label={t("gen6TinyTimelineMethod")}
              onInputChange={setMethodText}
              onValueChange={configureMethod}
              options={methodOptions}
              value={method}
            />
          </label>
          <div className="gen6tinytimeline-event-heading">
            <strong>{t("gen6TinyTimelineEvents")}</strong>
            <span>{events.length}/4</span>
          </div>
          <div className="gen6tinytimeline-events">
            {events.map((event, index) => (
              <div className="gen6tinytimeline-event" key={index}>
                <label className="field">
                  <span>
                    {t("gen6TinyTimelineFrame")} {index + 1}
                  </span>
                  <input
                    inputMode="numeric"
                    max={GEN6_TINYTIMELINE_MAX_FRAME}
                    onChange={(change) =>
                      setEvents((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                frame:
                                  parseGen6TinyTimelineDecimal(
                                    change.target.value,
                                  ) ?? 0,
                              }
                            : item,
                        ),
                      )
                    }
                    value={event.frame}
                  />
                </label>
                <label className="field">
                  <span>{t("gen6TinyTimelineType")}</span>
                  <select
                    value={event.type}
                    onChange={(change) =>
                      setEvents((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                type: Number(
                                  change.target.value,
                                ) as Gen6TinyTimelineEvent["type"],
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    {allowedTypes.map((type) => (
                      <option key={type} value={type}>
                        {
                          GEN6_TINYTIMELINE_EVENT_TYPES[
                            type === 0
                              ? 1
                              : type === 1
                                ? 2
                                : type === 3
                                  ? 3
                                  : type === 4
                                    ? 4
                                    : type === 5
                                      ? 5
                                      : type === 6
                                        ? 6
                                        : 7
                          ]
                        }
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
          <div className="gen6tinytimeline-option-grid">
            {[1, 2, 3, 4, 5, 10].includes(method) && (
              <label className="field">
                <span>{parameter1Label}</span>
                <input
                  inputMode="numeric"
                  max={method === 3 ? 3 : 6}
                  min={method === 3 ? 2 : 1}
                  onChange={(event) =>
                    setParameter1(
                      normalizeDecimalInput(
                        event.target.value,
                        method === 3 ? 3 : 6,
                        2,
                      ),
                    )
                  }
                  value={parameter1}
                />
              </label>
            )}
            {[3, 4, 5, 8].includes(method) && (
              <label className="field">
                <span>{parameter2Label}</span>
                <input
                  inputMode="numeric"
                  max={method === 4 ? 255 : 99}
                  min={0}
                  onChange={(event) =>
                    setParameter2(
                      normalizeDecimalInput(
                        event.target.value,
                        method === 4 ? 255 : 99,
                        3,
                      ),
                    )
                  }
                  value={parameter2}
                />
              </label>
            )}
            <label className="field">
              <span>{t("gen6TinyTimelineDelay")}</span>
              <input
                disabled={[2, 5, 7].includes(method)}
                inputMode="numeric"
                max={GEN6_TINYTIMELINE_MAX_FRAME}
                onChange={(event) =>
                  setDelay(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINYTIMELINE_MAX_FRAME,
                      10,
                    ),
                  )
                }
                value={delay}
              />
            </label>
          </div>
          <div className="gen6tinytimeline-checks">
            <label className="toggle-field">
              <input
                checked={isOras}
                disabled={![2, 5, 6, 8].includes(method)}
                onChange={(event) => setIsOras(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6TinyTimelineOras")}</span>
            </label>
            {method === 4 && (
              <label className="toggle-field">
                <input
                  checked={boost}
                  onChange={(event) => setBoost(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen6TinyTimelineBoost")}</span>
              </label>
            )}
            <label className="toggle-field">
              <input
                checked={considerDelay}
                disabled={method === 2}
                onChange={(event) => setConsiderDelay(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6TinyTimelineConsiderDelay")}</span>
            </label>
            <label className="toggle-field">
              <input
                checked={cryEnabled}
                disabled={![0, 1, 7].includes(method)}
                onChange={(event) => setCryEnabled(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6TinyTimelineCry")}</span>
            </label>
          </div>
          {cryEnabled && (
            <label className="field gen6tinytimeline-cry-field">
              <span>{t("gen6TinyTimelineCryFrame")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINYTIMELINE_MAX_FRAME}
                onChange={(event) =>
                  setCryFrame(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINYTIMELINE_MAX_FRAME,
                      10,
                    ),
                  )
                }
                value={cryFrame}
              />
            </label>
          )}
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={16} />
              {t("gen6TinyTimelineGenerate")}
            </button>
            <button
              className="secondary-action"
              disabled={status !== "calculating"}
              onClick={() => engine.cancel()}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
              {t("cancel")}
            </button>
          </div>
        </section>
      </form>
      <section className="panel results-panel gen6tinytimeline-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
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
              className="secondary-action"
              disabled={!results.length}
              onClick={exportCsv}
              type="button"
            >
              <Download aria-hidden="true" size={16} />
              CSV
            </button>
            <button
              aria-label={t("clear")}
              className="icon-action"
              disabled={!results.length}
              onClick={() => setResults([])}
              title={t("clear")}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
        <div
          aria-label={`${progress.percent.toFixed(1)}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.min(100, progress.percent)}
          className="progress-track"
          role="progressbar"
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
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div
          className="table-shell gen6tinytimeline-table-shell"
          ref={tableRef}
        >
          {results.length === 0 ? (
            <div className="empty-state compact" role="status">
              <span>
                {error
                  ? t("invalidGen6TinyTimelineInput")
                  : t("emptyGen6TinyTimeline")}
              </span>
            </div>
          ) : (
            <div
              className="virtual-table gen6tinytimeline-virtual-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="table-header">
                <span>Frame</span>
                <span>Index</span>
                <span>Hit</span>
                <span>Rand#</span>
                <span>Sync</span>
                <span>Enctr?</span>
                <span>Slot</span>
                <span>Flute</span>
                <span>Item</span>
                <span>HA</span>
                <span>BGM</span>
                <span>Tiny State</span>
                <span>Real Time</span>
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = results[virtualRow.index];
                return (
                  <div
                    className="table-row"
                    key={`${result.index}-${result.frameMin}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 40}px)`,
                    }}
                  >
                    <span>
                      {result.frameMin === result.frameMax
                        ? result.frameMin
                        : `${result.frameMin}~${result.frameMax}`}
                    </span>
                    <span>{result.index}</span>
                    <span>{result.hitIndex}</span>
                    <span>{formatGen6TinyTimelineHex(result.rand)}</span>
                    <span>
                      {result.sync === undefined
                        ? "-"
                        : result.sync
                          ? "O"
                          : "X"}
                    </span>
                    <span>{result.encounter}</span>
                    <span>{result.slot || "-"}</span>
                    <span>
                      {result.method === 2
                        ? formatGen6TinyTimelinePacked(result.flute, 5, 3)
                        : result.flute || "-"}
                    </span>
                    <span>
                      {result.method === 2
                        ? formatGen6TinyTimelinePacked(result.item, 5, 2)
                        : result.item}
                    </span>
                    <span>{result.hordeHa || "-"}</span>
                    <span>{result.music}</span>
                    <span title={result.radarOverview}>
                      {formatGen6TinyTimelineState(result.state)}
                    </span>
                    <span>
                      {formatGen6TinyTimelineRealTime(
                        result,
                        resultStartingFrame,
                      )}
                    </span>
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
