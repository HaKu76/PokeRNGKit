import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import {
  gen6TinyAmbushAreas,
  gen6TinyAmbushLocationName,
  gen6TinyAmbushTaskCount,
  GEN6_TINY_AMBUSH_MAX_INDEX,
  GEN6_TINY_AMBUSH_MAX_MIN_INDEX,
  GEN6_TINY_AMBUSH_MAX_RESULTS,
  type Gen6TinyAmbushInputMode,
  type Gen6TinyAmbushRequest,
  type Gen6TinyAmbushResult,
  type Gen6TinyAmbushVersion,
} from "./domain";
import { Gen6TinyAmbushUiPreviewEngine } from "./preview/Gen6TinyAmbushUiPreviewEngine";
import type {
  Gen6TinyAmbushEngine,
  Gen6TinyAmbushProgress,
  Gen6TinyAmbushSummary,
} from "./search";
import { Gen6TinyAmbushWorker } from "./worker/Gen6TinyAmbushWorker";
import "./Gen6TinyAmbushPanel.css";

const INITIAL_STATE = ["00000000", "00000000", "00000000", "00000000"];

function initialProgress(): Gen6TinyAmbushProgress {
  return { processedStates: 0, totalStates: 0, resultCount: 0, percent: 0 };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen6TinyAmbushPanel({
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
  const engine = useMemo<Gen6TinyAmbushEngine>(
    () =>
      uiPreviewMode
        ? new Gen6TinyAmbushUiPreviewEngine()
        : new Gen6TinyAmbushWorker(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Gen6TinyAmbushInputMode>("state");
  const [version, setVersion] = useState<Gen6TinyAmbushVersion>("x");
  const [stateWords, setStateWords] = useState(INITIAL_STATE);
  const [seed, setSeed] = useState("00000000");
  const [minIndex, setMinIndex] = useState("27");
  const [maxIndex, setMaxIndex] = useState("50000");
  const [areaId, setAreaId] = useState("");
  const [areaText, setAreaText] = useState("");
  const [synchronize, setSynchronize] = useState(false);
  const [slotMask, setSlotMask] = useState("0");
  const [resultLimit, setResultLimit] = useState("100000");
  const [results, setResults] = useState<Gen6TinyAmbushResult[]>([]);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(initialProgress);
  const [summary, setSummary] = useState<Gen6TinyAmbushSummary>();
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });
  const areas = useMemo(() => gen6TinyAmbushAreas(version), [version]);
  const selectedArea = areas.find((area) => area.id === areaId) ?? areas[0];
  const slots =
    selectedArea?.species.map((species, index) => ({
      species,
      level: selectedArea.levels[index] ?? selectedArea.levels[0] ?? 1,
    })) ?? Array.from({ length: 12 }, () => ({ species: 0, level: 1 }));

  useEffect(() => {
    if (!selectedArea) return;
    if (selectedArea.id !== areaId) {
      setAreaId(selectedArea.id);
      setAreaText(gen6TinyAmbushLocationName(selectedArea, language));
      setMinIndex(String(selectedArea.bagAdvances));
    }
  }, [areaId, language, selectedArea]);
  useEffect(() => () => engine.dispose(), [engine]);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request: Gen6TinyAmbushRequest = {
      inputMode: mode,
      seed: Number.parseInt(seed || "0", 16) >>> 0,
      state: stateWords.map(
        (value) => Number.parseInt(value || "0", 16) >>> 0,
      ) as [number, number, number, number],
      minIndex: Number.parseInt(minIndex || "0", 10),
      maxIndex: Number.parseInt(maxIndex || "0", 10),
      filters: {
        disabled: false,
        synchronize,
        slotMask: Number.parseInt(slotMask || "0", 10),
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
        totalStates: gen6TinyAmbushTaskCount(request),
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
        t("gen6TinyAmbushIndex"),
        t("gen6TinyAmbushRand100"),
        t("gen6TinyAmbushSync"),
        t("gen6TinyAmbushSlot"),
        t("gen6TinyAmbushItem"),
        t("gen6TinyAmbushSpecies"),
        t("gen6TinyAmbushLevel"),
      ],
      ...results.map((result) => [
        result.index,
        result.rand100,
        result.synchronize ? "1" : "0",
        result.slot,
        result.itemSlot,
        result.species,
        result.level,
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen6tinyambush.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gen6tinyambush-workspace">
      <form className="gen6tinyambush-controls" onSubmit={run}>
        <section className="panel gen6tinyambush-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6TinyAmbushInput")}</h2>
            </div>
            <span className="panel-note">TinyFinder / TinyMT</span>
          </div>
          <div
            className="gen6tinyambush-mode"
            role="radiogroup"
            aria-label={t("gen6TinyAmbushInputMode")}
          >
            {(["state", "seed"] as const).map((value) => (
              <label className={mode === value ? "active" : ""} key={value}>
                <input
                  checked={mode === value}
                  name="tiny-ambush-mode"
                  onChange={() => setMode(value)}
                  type="radio"
                />
                <span>
                  {t(
                    value === "state"
                      ? "gen6TinyAmbushStateMode"
                      : "gen6TinyAmbushSeedMode",
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="gen6tinyambush-grid">
            <label className="field">
              <span>{t("gen6TinyAmbushVersion")}</span>
              <Select
                value={version}
                onChange={(event) =>
                  setVersion(event.target.value as Gen6TinyAmbushVersion)
                }
              >
                <option value="x">X</option>
                <option value="y">Y</option>
              </Select>
            </label>
            <label className="field">
              <span>{t("gen6TinyAmbushLocation")}</span>
              <AutoCompleteComboBox
                inputValue={areaText}
                label={t("gen6TinyAmbushLocation")}
                onInputChange={setAreaText}
                onValueChange={(value) => setAreaId(String(value))}
                options={areas.map((area) => ({
                  label: gen6TinyAmbushLocationName(area, language),
                  value: area.id,
                }))}
                value={selectedArea?.id ?? ""}
              />
            </label>
          </div>
          {mode === "seed" ? (
            <label className="field">
              <span>{t("gen6TinyAmbushSeed")}</span>
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
            <div className="gen6tinyambush-state-grid">
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
          <div className="gen6tinyambush-grid gen6tinyambush-range-grid">
            <label className="field">
              <span>{t("gen6TinyAmbushMinIndex")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINY_AMBUSH_MAX_MIN_INDEX}
                onChange={(event) =>
                  setMinIndex(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINY_AMBUSH_MAX_MIN_INDEX,
                      6,
                    ),
                  )
                }
                value={minIndex}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyAmbushMaxIndex")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINY_AMBUSH_MAX_INDEX}
                onChange={(event) =>
                  setMaxIndex(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINY_AMBUSH_MAX_INDEX,
                      8,
                    ),
                  )
                }
                value={maxIndex}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyAmbushResultLimit")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINY_AMBUSH_MAX_RESULTS}
                min={1}
                onChange={(event) =>
                  setResultLimit(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINY_AMBUSH_MAX_RESULTS,
                      6,
                    ),
                  )
                }
                value={resultLimit}
              />
            </label>
          </div>
        </section>
        <section className="panel gen6tinyambush-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6TinyAmbushSettings")}</h2>
            </div>
            <span className="panel-note">Victory Road</span>
          </div>
          <label className="toggle-field">
            <input
              checked={synchronize}
              onChange={(event) => setSynchronize(event.target.checked)}
              type="checkbox"
            />
            <span>{t("gen6TinyAmbushSyncOnly")}</span>
          </label>
          <label className="field">
            <span>{t("gen6TinyAmbushSlotMask")}</span>
            <input
              inputMode="numeric"
              max={0xfff}
              min={0}
              onChange={(event) =>
                setSlotMask(normalizeDecimalInput(event.target.value, 0xfff, 4))
              }
              value={slotMask}
            />
            <small>{t("gen6TinyAmbushSlotMaskHint")}</small>
          </label>
          <div
            className="gen6tinyambush-slot-list"
            aria-label={t("gen6TinyAmbushSlots")}
          >
            {slots.map((slot, index) => (
              <span key={index}>
                {index + 1}: {slot.species} Lv.{slot.level}
              </span>
            ))}
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={16} />
              {t("gen6TinyAmbushSearch")}
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
      <section className="panel results-panel gen6tinyambush-results-panel">
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
        <div className="table-shell gen6tinyambush-table-shell" ref={tableRef}>
          {results.length === 0 ? (
            <div className="empty-state compact">
              <span>
                {error
                  ? t("invalidGen6TinyAmbushInput")
                  : t("emptyGen6TinyAmbush")}
              </span>
            </div>
          ) : (
            <div
              className="virtual-table gen6tinyambush-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="table-header">
                <span>{t("gen6TinyAmbushIndex")}</span>
                <span>{t("gen6TinyAmbushRand100")}</span>
                <span>{t("gen6TinyAmbushSync")}</span>
                <span>{t("gen6TinyAmbushSlot")}</span>
                <span>{t("gen6TinyAmbushItem")}</span>
                <span>{t("gen6TinyAmbushSpecies")}</span>
                <span>{t("gen6TinyAmbushLevel")}</span>
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
                    <span>{result.rand100}</span>
                    <span>{result.synchronize ? "Yes" : "No"}</span>
                    <span>{result.slot}</span>
                    <span>{result.itemSlot}</span>
                    <span>{result.species}</span>
                    <span>{result.level}</span>
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
