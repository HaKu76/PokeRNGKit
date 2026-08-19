import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  formatGen6TinyRockSmashHex,
  gen6TinyRockSmashAreas,
  gen6TinyRockSmashLocationName,
  gen6TinyRockSmashTaskCount,
  GEN6_TINY_ROCKSMASH_MAX_INDEX,
  GEN6_TINY_ROCKSMASH_MAX_MIN_INDEX,
  GEN6_TINY_ROCKSMASH_MAX_RESULTS,
  type Gen6TinyRockSmashInputMode,
  type Gen6TinyRockSmashRequest,
  type Gen6TinyRockSmashResult,
  type Gen6TinyRockSmashVersion,
} from "./domain";
import { Gen6TinyRockSmashUiPreviewEngine } from "./preview/Gen6TinyRockSmashUiPreviewEngine";
import type {
  Gen6TinyRockSmashEngine,
  Gen6TinyRockSmashProgress,
  Gen6TinyRockSmashSummary,
} from "./search";
import { Gen6TinyRockSmashWorker } from "./worker/Gen6TinyRockSmashWorker";
import "./Gen6TinyRockSmashPanel.css";

const INITIAL_STATE = ["00000000", "00000000", "00000000", "00000000"];

function initialProgress(): Gen6TinyRockSmashProgress {
  return { processedStates: 0, totalStates: 0, resultCount: 0, percent: 0 };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen6TinyRockSmashPanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const language =
    i18n.resolvedLanguage === "zh"
      ? "zh"
      : i18n.resolvedLanguage === "ja"
        ? "ja"
        : "en";
  const engine = useMemo<Gen6TinyRockSmashEngine>(
    () =>
      uiPreviewMode
        ? new Gen6TinyRockSmashUiPreviewEngine()
        : new Gen6TinyRockSmashWorker(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Gen6TinyRockSmashInputMode>("state");
  const [version, setVersion] =
    useState<Gen6TinyRockSmashVersion>("omega-ruby");
  const [stateWords, setStateWords] = useState(INITIAL_STATE);
  const [seed, setSeed] = useState("00000000");
  const [minIndex, setMinIndex] = useState("0");
  const [maxIndex, setMaxIndex] = useState("50000");
  const [blinkRand, setBlinkRand] = useState("60");
  const [interactFrame, setInteractFrame] = useState("300");
  const [oras, setOras] = useState(true);
  const [areaId, setAreaId] = useState("");
  const [areaText, setAreaText] = useState("");
  const [triggerOnly, setTriggerOnly] = useState(true);
  const [synchronize, setSynchronize] = useState(false);
  const [safeOnly, setSafeOnly] = useState(false);
  const [flute, setFlute] = useState("0");
  const [slotMask, setSlotMask] = useState(0);
  const [resultLimit, setResultLimit] = useState("100000");
  const [results, setResults] = useState<Gen6TinyRockSmashResult[]>([]);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(initialProgress);
  const [summary, setSummary] = useState<Gen6TinyRockSmashSummary>();
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });
  const areas = useMemo(() => gen6TinyRockSmashAreas(version), [version]);
  const selectedArea = areas.find((area) => area.id === areaId) ?? areas[0];
  const slots =
    selectedArea?.species.map((species, index) => ({
      species,
      level: selectedArea.levels[index] ?? selectedArea.levels[0] ?? 1,
    })) ?? Array.from({ length: 5 }, () => ({ species: 75, level: 20 }));

  useEffect(() => {
    if (selectedArea && selectedArea.id !== areaId) {
      setAreaId(selectedArea.id);
      setAreaText(gen6TinyRockSmashLocationName(selectedArea, language));
    }
  }, [areaId, language, selectedArea]);
  useEffect(() => () => engine.dispose(), [engine]);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request: Gen6TinyRockSmashRequest = {
      inputMode: mode,
      seed: Number.parseInt(seed || "0", 16) >>> 0,
      state: stateWords.map(
        (value) => Number.parseInt(value || "0", 16) >>> 0,
      ) as [number, number, number, number],
      minIndex: Number.parseInt(minIndex || "0", 10),
      maxIndex: Number.parseInt(maxIndex || "0", 10),
      longBlinkRand: Number.parseInt(blinkRand || "0", 10),
      interactFrame: Number.parseInt(interactFrame || "0", 10),
      oras,
      filters: {
        disabled: false,
        triggerOnly,
        synchronize,
        safeOnly,
        flute: Number.parseInt(flute, 10),
        slotMask,
      },
      slots,
      resultLimit: Number.parseInt(resultLimit || "0", 10),
    };
    try {
      setResults([]);
      setError("");
      setSummary(undefined);
      setProgress({
        processedStates: 0,
        totalStates: gen6TinyRockSmashTaskCount(request),
        resultCount: 0,
        percent: 0,
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
        t("gen6TinyRockSmashIndex"),
        "Rand#",
        t("gen6TinyRockSmashTrigger"),
        t("gen6TinyRockSmashSync"),
        t("gen6TinyRockSmashSlot"),
        t("gen6TinyRockSmashDelay"),
        t("gen6TinyRockSmashTimeline"),
      ],
      ...results.map((result) => [
        result.index,
        formatGen6TinyRockSmashHex(result.random),
        result.trigger ? "1" : "0",
        result.synchronize ? "1" : "0",
        result.slot,
        result.actualDelay,
        result.timeline.join(" /"),
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen6tinyrocksmash.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gen6tinyrocksmash-workspace">
      <form className="gen6tinyrocksmash-controls" onSubmit={run}>
        <section className="panel gen6tinyrocksmash-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6TinyRockSmashInput")}</h2>
            </div>
            <span className="panel-note">TinyFinder / TinyMT</span>
          </div>
          <div
            className="gen6tinyrocksmash-mode"
            role="radiogroup"
            aria-label={t("gen6TinyRockSmashInputMode")}
          >
            {(["state", "seed"] as const).map((value) => (
              <label className={mode === value ? "active" : ""} key={value}>
                <input
                  checked={mode === value}
                  name="tiny-rock-mode"
                  onChange={() => setMode(value)}
                  type="radio"
                />
                <span>
                  {t(
                    value === "state"
                      ? "gen6TinyRockSmashStateMode"
                      : "gen6TinyRockSmashSeedMode",
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="gen6tinyrocksmash-grid">
            <label className="field">
              <span>{t("gen6TinyRockSmashVersion")}</span>
              <select
                value={version}
                onChange={(event) =>
                  setVersion(event.target.value as Gen6TinyRockSmashVersion)
                }
              >
                <option value="x">X</option>
                <option value="y">Y</option>
                <option value="omega-ruby">Omega Ruby</option>
                <option value="alpha-sapphire">Alpha Sapphire</option>
              </select>
            </label>
            <label className="field">
              <span>{t("gen6TinyRockSmashLocation")}</span>
              <AutoCompleteComboBox
                inputValue={areaText}
                label={t("gen6TinyRockSmashLocation")}
                onInputChange={setAreaText}
                onValueChange={(value) => setAreaId(String(value))}
                options={areas.map((area) => ({
                  label: gen6TinyRockSmashLocationName(area, language),
                  value: area.id,
                }))}
                value={selectedArea?.id ?? ""}
              />
            </label>
          </div>
          {mode === "seed" ? (
            <label className="field">
              <span>{t("gen6TinyRockSmashSeed")}</span>
              <input
                maxLength={8}
                onChange={(event) =>
                  setSeed(normalizeHexInput(event.target.value, 8))
                }
                spellCheck={false}
                value={seed}
              />
            </label>
          ) : (
            <div className="gen6tinyrocksmash-state-grid">
              {[3, 2, 1, 0].map((index) => (
                <label className="field" key={index}>
                  <span>[{index}]</span>
                  <input
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
          )}
          <div className="gen6tinyrocksmash-grid">
            <label className="field">
              <span>{t("gen6TinyRockSmashMinIndex")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINY_ROCKSMASH_MAX_MIN_INDEX}
                onChange={(event) =>
                  setMinIndex(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINY_ROCKSMASH_MAX_MIN_INDEX,
                      6,
                    ),
                  )
                }
                value={minIndex}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyRockSmashMaxIndex")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINY_ROCKSMASH_MAX_INDEX}
                onChange={(event) =>
                  setMaxIndex(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINY_ROCKSMASH_MAX_INDEX,
                      8,
                    ),
                  )
                }
                value={maxIndex}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyRockSmashResultLimit")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINY_ROCKSMASH_MAX_RESULTS}
                min={1}
                onChange={(event) =>
                  setResultLimit(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINY_ROCKSMASH_MAX_RESULTS,
                      6,
                    ),
                  )
                }
                value={resultLimit}
              />
            </label>
          </div>
        </section>
        <section className="panel gen6tinyrocksmash-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6TinyRockSmashTiming")}</h2>
            </div>
            <span className="panel-note">BlinkSystem</span>
          </div>
          <div className="gen6tinyrocksmash-grid">
            <label className="field">
              <span>{t("gen6TinyRockSmashLongBlink")}</span>
              <input
                inputMode="numeric"
                max={1000}
                min={0}
                onChange={(event) =>
                  setBlinkRand(
                    normalizeDecimalInput(event.target.value, 1000, 4),
                  )
                }
                value={blinkRand}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyRockSmashInteract")}</span>
              <input
                inputMode="numeric"
                max={1000}
                min={0}
                onChange={(event) =>
                  setInteractFrame(
                    normalizeDecimalInput(event.target.value, 1000, 4),
                  )
                }
                value={interactFrame}
              />
            </label>
          </div>
          <label className="toggle-field">
            <input
              checked={oras}
              onChange={(event) => setOras(event.target.checked)}
              type="checkbox"
            />
            <span>{t("gen6TinyRockSmashOras")}</span>
          </label>
          <div className="gen6tinyrocksmash-filter-grid">
            <label className="toggle-field">
              <input
                checked={triggerOnly}
                onChange={(event) => setTriggerOnly(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6TinyRockSmashTriggerOnly")}</span>
            </label>
            <label className="toggle-field">
              <input
                checked={synchronize}
                onChange={(event) => setSynchronize(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6TinyRockSmashSyncOnly")}</span>
            </label>
            <label className="toggle-field">
              <input
                checked={safeOnly}
                onChange={(event) => setSafeOnly(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6TinyRockSmashSafeOnly")}</span>
            </label>
          </div>
          <div className="gen6tinyrocksmash-grid">
            <label className="field">
              <span>{t("gen6TinyRockSmashFlute")}</span>
              <select
                value={flute}
                onChange={(event) => setFlute(event.target.value)}
              >
                <option value="0">{t("any")}</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </label>
            <label className="field">
              <span>{t("gen6TinyRockSmashSlot")}</span>
              <input
                inputMode="numeric"
                max={31}
                min={0}
                onChange={(event) =>
                  setSlotMask(Number(event.target.value) || 0)
                }
                value={slotMask}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={16} />
              {t("gen6TinyRockSmashSearch")}
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
      <section className="panel results-panel gen6tinyrocksmash-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{t(status)}</span>
          </div>
          <div className="result-actions">
            <span className="result-count">
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
          className="progress-track"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.min(100, progress.percent)}
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
          className="table-shell gen6tinyrocksmash-table-shell"
          ref={tableRef}
        >
          {results.length === 0 ? (
            <div className="empty-state compact">
              <span>
                {error
                  ? t("invalidGen6TinyRockSmashInput")
                  : t("emptyGen6TinyRockSmash")}
              </span>
            </div>
          ) : (
            <div
              className="virtual-table gen6tinyrocksmash-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="table-header">
                <span>{t("gen6TinyRockSmashIndex")}</span>
                <span>Rand#</span>
                <span>{t("gen6TinyRockSmashTrigger")}</span>
                <span>{t("gen6TinyRockSmashSync")}</span>
                <span>{t("gen6TinyRockSmashSlot")}</span>
                <span>{t("gen6TinyRockSmashDelay")}</span>
                <span>{t("gen6TinyRockSmashTimeline")}</span>
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = results[virtualRow.index];
                return (
                  <div
                    className="table-row"
                    key={`${result.index}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 40}px)`,
                    }}
                  >
                    <span>{result.index}</span>
                    <span>{formatGen6TinyRockSmashHex(result.random)}</span>
                    <span>{result.trigger ? "Yes" : "No"}</span>
                    <span>{result.synchronize ? "Yes" : "No"}</span>
                    <span>{result.slot}</span>
                    <span>{result.actualDelay}</span>
                    <span>{result.timeline.join(" / ")}</span>
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
