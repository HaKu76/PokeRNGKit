import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  formatGen6TinyHoneyHex,
  gen6TinyHoneyAreas,
  gen6TinyHoneyLocationName,
  gen6TinyHoneyTaskCount,
  GEN6_TINY_HONEY_MAX_INDEX,
  GEN6_TINY_HONEY_MAX_MIN_INDEX,
  GEN6_TINY_HONEY_MAX_RESULTS,
  type Gen6TinyHoneyInputMode,
  type Gen6TinyHoneyRequest,
  type Gen6TinyHoneyResult,
  type Gen6TinyHoneyGame,
} from "./domain";
import { Gen6TinyHoneyUiPreviewEngine } from "./preview/Gen6TinyHoneyUiPreviewEngine";
import type {
  Gen6TinyHoneyEngine,
  Gen6TinyHoneyProgress,
  Gen6TinyHoneySummary,
} from "./search";
import { Gen6TinyHoneyWorker } from "./worker/Gen6TinyHoneyWorker";
import "./Gen6TinyHoneyPanel.css";

const INITIAL_STATE = ["00000000", "00000000", "00000000", "00000000"];

function initialProgress(): Gen6TinyHoneyProgress {
  return { processedStates: 0, totalStates: 0, resultCount: 0, percent: 0 };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function defaultHoneyDelay(
  area: { game: Gen6TinyHoneyGame; bagAdvances: number },
  emulator: boolean,
) {
  if (emulator) return area.game === "x" || area.game === "y" ? 114 : 118;
  if (area.bagAdvances === 3)
    return area.game === "x" || area.game === "y" ? 110 : 120;
  return area.game === "x" || area.game === "y" ? 112 : 126;
}

export function Gen6TinyHoneyPanel({
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
  const engine = useMemo<Gen6TinyHoneyEngine>(
    () =>
      uiPreviewMode
        ? new Gen6TinyHoneyUiPreviewEngine()
        : new Gen6TinyHoneyWorker(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Gen6TinyHoneyInputMode>("state");
  const [version, setVersion] = useState<Gen6TinyHoneyGame>("omega-ruby");
  const [stateWords, setStateWords] = useState(INITIAL_STATE);
  const [seed, setSeed] = useState("00000000");
  const [minIndex, setMinIndex] = useState("0");
  const [maxIndex, setMaxIndex] = useState("50000");
  const [blinkRand, setBlinkRand] = useState("60");
  const [honeyDelay, setHoneyDelay] = useState("120");
  const [party, setParty] = useState("6");
  const [bagAdvances, setBagAdvances] = useState("0");
  const [emulator, setEmulator] = useState(false);
  const [areaId, setAreaId] = useState("");
  const [areaText, setAreaText] = useState("");
  const [synchronize, setSynchronize] = useState(false);
  const [safeOnly, setSafeOnly] = useState(false);
  const [flute, setFlute] = useState("0");
  const [slotMask, setSlotMask] = useState(0);
  const [resultLimit, setResultLimit] = useState("100000");
  const [results, setResults] = useState<Gen6TinyHoneyResult[]>([]);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(initialProgress);
  const [summary, setSummary] = useState<Gen6TinyHoneySummary>();
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });
  const areas = useMemo(() => gen6TinyHoneyAreas(version), [version]);
  const selectedArea = areas.find((area) => area.id === areaId) ?? areas[0];
  const slots =
    selectedArea?.species.map((species, index) => ({
      species,
      level: selectedArea.levels[index] ?? selectedArea.levels[0] ?? 1,
    })) ?? Array.from({ length: 5 }, () => ({ species: 75, level: 20 }));

  useEffect(() => {
    if (!selectedArea) return;
    setAreaText(gen6TinyHoneyLocationName(selectedArea, language));
    if (selectedArea.id !== areaId) {
      setAreaId(selectedArea.id);
      setBagAdvances(String(selectedArea.bagAdvances));
    }
  }, [areaId, language, selectedArea]);
  useEffect(() => {
    if (selectedArea)
      setHoneyDelay(String(defaultHoneyDelay(selectedArea, emulator)));
  }, [emulator, selectedArea]);
  useEffect(() => {
    if (selectedArea)
      setBlinkRand(
        String(
          emulator
            ? selectedArea.firstLongBlinkRandEmu
            : selectedArea.firstLongBlinkRand,
        ),
      );
  }, [emulator, selectedArea]);
  useEffect(() => () => engine.dispose(), [engine]);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request: Gen6TinyHoneyRequest = {
      inputMode: mode,
      seed: Number.parseInt(seed || "0", 16) >>> 0,
      state: stateWords.map(
        (value) => Number.parseInt(value || "0", 16) >>> 0,
      ) as [number, number, number, number],
      minIndex: Number.parseInt(minIndex || "0", 10),
      maxIndex: Number.parseInt(maxIndex || "0", 10),
      longBlinkRand: Number.parseInt(blinkRand || "0", 10),
      honeyDelay: Number.parseInt(honeyDelay || "0", 10),
      party: Number.parseInt(party || "0", 10),
      bagAdvances: Number.parseInt(bagAdvances || "0", 10),
      oras: version === "omega-ruby" || version === "alpha-sapphire",
      emulator,
      slotType: selectedArea?.slotType ?? 0,
      filters: {
        disabled: false,
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
        totalStates: gen6TinyHoneyTaskCount(request),
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
        t("gen6TinyHoneyIndex"),
        "Rand#",
        t("gen6TinyHoneySync"),
        t("species"),
        t("level"),
        "Item Slot",
        "Flute",
        t("gen6TinyHoneySlot"),
        t("gen6TinyHoneyDelay"),
        t("gen6TinyHoneyTimeline"),
      ],
      ...results.map((result) => [
        result.index,
        formatGen6TinyHoneyHex(result.random),
        result.synchronize ? "1" : "0",
        result.species,
        result.level,
        result.itemSlot,
        result.flute,
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
    anchor.download = "pokerngkit-gen6tinyhoney.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="gen6tinyhoney-workspace">
      <form className="gen6tinyhoney-controls" onSubmit={run}>
        <section className="panel gen6tinyhoney-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6TinyHoneyInput")}</h2>
            </div>
            <span className="panel-note">TinyFinder / TinyMT</span>
          </div>
          <div
            className="gen6tinyhoney-mode"
            role="radiogroup"
            aria-label={t("gen6TinyHoneyInputMode")}
          >
            {(["state", "seed"] as const).map((value) => (
              <label className={mode === value ? "active" : ""} key={value}>
                <input
                  checked={mode === value}
                  name="tiny-honey-mode"
                  onChange={() => setMode(value)}
                  type="radio"
                />
                <span>
                  {t(
                    value === "state"
                      ? "gen6TinyHoneyStateMode"
                      : "gen6TinyHoneySeedMode",
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="gen6tinyhoney-grid">
            <label className="field">
              <span>{t("gen6TinyHoneyVersion")}</span>
              <Select
                value={version}
                onChange={(event) =>
                  setVersion(event.target.value as Gen6TinyHoneyGame)
                }
              >
                <option value="x">X</option>
                <option value="y">Y</option>
                <option value="omega-ruby">Omega Ruby</option>
                <option value="alpha-sapphire">Alpha Sapphire</option>
              </Select>
            </label>
            <label className="field">
              <span>{t("gen6TinyHoneyLocation")}</span>
              <AutoCompleteComboBox
                inputValue={areaText}
                label={t("gen6TinyHoneyLocation")}
                onInputChange={setAreaText}
                onValueChange={(value) => {
                  const nextArea = areas.find((area) => area.id === value);
                  if (!nextArea) return;
                  setAreaId(nextArea.id);
                  setAreaText(gen6TinyHoneyLocationName(nextArea, language));
                  setBagAdvances(String(nextArea.bagAdvances));
                }}
                options={areas.map((area) => ({
                  label: gen6TinyHoneyLocationName(area, language),
                  value: area.id,
                }))}
                value={selectedArea?.id ?? ""}
              />
            </label>
          </div>
          {mode === "seed" ? (
            <label className="field">
              <span>{t("gen6TinyHoneySeed")}</span>
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
            <div className="gen6tinyhoney-state-grid">
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
          <div className="gen6tinyhoney-grid">
            <label className="field">
              <span>{t("gen6TinyHoneyMinIndex")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINY_HONEY_MAX_MIN_INDEX}
                onChange={(event) =>
                  setMinIndex(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINY_HONEY_MAX_MIN_INDEX,
                      6,
                    ),
                  )
                }
                value={minIndex}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyHoneyMaxIndex")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINY_HONEY_MAX_INDEX}
                onChange={(event) =>
                  setMaxIndex(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINY_HONEY_MAX_INDEX,
                      8,
                    ),
                  )
                }
                value={maxIndex}
              />
            </label>
            <label className="field">
              <span>{t("gen6TinyHoneyResultLimit")}</span>
              <input
                inputMode="numeric"
                max={GEN6_TINY_HONEY_MAX_RESULTS}
                min={1}
                onChange={(event) =>
                  setResultLimit(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_TINY_HONEY_MAX_RESULTS,
                      6,
                    ),
                  )
                }
                value={resultLimit}
              />
            </label>
          </div>
        </section>
        <section className="panel gen6tinyhoney-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6TinyHoneyTiming")}</h2>
            </div>
            <span className="panel-note">BlinkSystem</span>
          </div>
          <div className="gen6tinyhoney-grid">
            <label className="field">
              <span>{t("gen6TinyHoneyLongBlink")}</span>
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
              <span>{t("gen6TinyHoneyDelay")}</span>
              <input
                inputMode="numeric"
                max={1000}
                min={0}
                onChange={(event) =>
                  setHoneyDelay(
                    normalizeDecimalInput(event.target.value, 1000, 4),
                  )
                }
                value={honeyDelay}
              />
            </label>
          </div>
          <label className="toggle-field">
            <input
              checked={emulator}
              onChange={(event) => setEmulator(event.target.checked)}
              type="checkbox"
            />
            <span>Emulator</span>
          </label>
          <div className="gen6tinyhoney-grid">
            <label className="field">
              <span>Party</span>
              <input
                inputMode="numeric"
                max={6}
                min={1}
                onChange={(event) =>
                  setParty(normalizeDecimalInput(event.target.value, 6, 1))
                }
                value={party}
              />
            </label>
            <label className="field">
              <span>Bag Advances</span>
              <input
                inputMode="numeric"
                max={100}
                min={0}
                onChange={(event) =>
                  setBagAdvances(
                    normalizeDecimalInput(event.target.value, 100, 3),
                  )
                }
                value={bagAdvances}
              />
            </label>
          </div>
          <div className="gen6tinyhoney-filter-grid">
            <label className="toggle-field">
              <input
                checked={synchronize}
                onChange={(event) => setSynchronize(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6TinyHoneySyncOnly")}</span>
            </label>
            <label className="toggle-field">
              <input
                checked={safeOnly}
                onChange={(event) => setSafeOnly(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6TinyHoneySafeOnly")}</span>
            </label>
          </div>
          <div className="gen6tinyhoney-grid">
            <label className="field">
              <span>{t("gen6TinyHoneyFlute")}</span>
              <Select
                value={flute}
                onChange={(event) => setFlute(event.target.value)}
              >
                <option value="0">{t("any")}</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </Select>
            </label>
            <label className="field">
              <span>{t("gen6TinyHoneySlot")}</span>
              <input
                inputMode="numeric"
                max={4095}
                min={0}
                onChange={(event) =>
                  setSlotMask(
                    Math.min(
                      4095,
                      Math.max(0, Number(event.target.value) || 0),
                    ),
                  )
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
              {t("gen6TinyHoneySearch")}
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
      <section className="panel results-panel gen6tinyhoney-results-panel">
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
        <div className="table-shell gen6tinyhoney-table-shell" ref={tableRef}>
          {results.length === 0 ? (
            <div className="empty-state compact">
              <span>
                {error
                  ? t("invalidGen6TinyHoneyInput")
                  : t("emptyGen6TinyHoney")}
              </span>
            </div>
          ) : (
            <div
              className="virtual-table gen6tinyhoney-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="table-header">
                <span>{t("gen6TinyHoneyIndex")}</span>
                <span>Rand#</span>
                <span>{t("gen6TinyHoneySync")}</span>
                <span>{t("species")}</span>
                <span>{t("level")}</span>
                <span>Item</span>
                <span>{t("gen6TinyHoneyFlute")}</span>
                <span>{t("gen6TinyHoneySlot")}</span>
                <span>{t("gen6TinyHoneyDelay")}</span>
                <span>{t("gen6TinyHoneyTimeline")}</span>
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
                    <span>{formatGen6TinyHoneyHex(result.random)}</span>
                    <span>{result.synchronize ? "Yes" : "No"}</span>
                    <span>{result.species}</span>
                    <span>{result.level}</span>
                    <span>{result.itemSlot}</span>
                    <span>{result.flute || "-"}</span>
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
