import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  formatGen6PokeRadarPatch,
  gen6PokeRadarOverview,
  validateGen6PokeRadarRequest,
  type Gen6PokeRadarResult,
} from "./domain";
import { Gen6PokeRadarUiPreviewEngine } from "./preview/Gen6PokeRadarUiPreviewEngine";
import type {
  Gen6PokeRadarEngine,
  Gen6PokeRadarProgress,
  Gen6PokeRadarSummary,
} from "./search";
import { Gen6PokeRadarWorker } from "./worker/Gen6PokeRadarWorker";
import "./Gen6PokeRadarPanel.css";
type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
function decimal(value: string) {
  return value.trim() === "" || !/^\d+$/.test(value) ? 0 : Number(value);
}
function hex(value: string) {
  return value.trim() === "" ? 0 : Number.parseInt(value, 16) >>> 0;
}
export function Gen6PokeRadarPanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen6PokeRadarEngine>(
    () =>
      uiPreviewMode
        ? new Gen6PokeRadarUiPreviewEngine()
        : new Gen6PokeRadarWorker(),
    [uiPreviewMode],
  );
  const [tinySeed, setTinySeed] = useState("00000000"),
    [tinyFrame, setTinyFrame] = useState("0"),
    [minFrame, setMinFrame] = useState("0"),
    [maxFrame, setMaxFrame] = useState("10000"),
    [partySize, setPartySize] = useState("6"),
    [chainLength, setChainLength] = useState("0"),
    [resultLimit, setResultLimit] = useState("100000");
  const [boost, setBoost] = useState(false),
    [results, setResults] = useState<Gen6PokeRadarResult[]>([]),
    [selected, setSelected] = useState(0),
    [status, setStatus] = useState<Status>("ready"),
    [error, setError] = useState(""),
    [summary, setSummary] = useState<Gen6PokeRadarSummary>(),
    [progress, setProgress] = useState<Gen6PokeRadarProgress>({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
  const abortRef = useRef<AbortController | undefined>(undefined),
    scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => engine.dispose(), [engine]);
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 38,
    overscan: 12,
  });
  const overview = results[selected]
    ? gen6PokeRadarOverview(results[selected]).join("\n")
    : "#########\n#########\n#########\n#########\n####C####\n#########\n#########\n#########\n#########";
  function request() {
    return validateGen6PokeRadarRequest({
      tinySeed: hex(tinySeed),
      tinyFrame: decimal(tinyFrame),
      minFrame: decimal(minFrame),
      maxFrame: decimal(maxFrame),
      partySize: decimal(partySize),
      chainLength: decimal(chainLength),
      boost,
      resultLimit: decimal(resultLimit),
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (status === "calculating") return;
    try {
      const next = request();
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setResults([]);
      setSelected(0);
      setError("");
      setSummary(undefined);
      setStatus("calculating");
      const result = await engine.search(next, {
        signal: controller.signal,
        onBatch: setResults,
        onProgress: setProgress,
      });
      setSummary(result);
      setStatus(result.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  }
  function cancel() {
    abortRef.current?.abort();
    engine.cancel();
    setStatus("cancelled");
  }
  function csv() {
    if (!results.length) return;
    const header =
        "Frame,Music,Type,Boost,Shiny,Patch1,Patch2,Patch3,Patch4,Empty",
      rows = results.map((result) =>
        [
          result.frame,
          result.music,
          result.musicType,
          result.boost,
          result.shiny,
          ...result.patches.map(formatGen6PokeRadarPatch),
        ].join(","),
      );
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", header, "\r\n", rows.join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "gen6-poke-radar.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <form className="module-shell" onSubmit={submit}>
      <header className="module-heading">
        <div>
          <span className="eyebrow">{t("gen6PokeRadarEngine")}</span>
          <h1>{t("gen6PokeRadarModule")}</h1>
        </div>
        <div className="status-cluster">
          <span className={`status-dot ${status}`} />
          {t(status)}
        </div>
      </header>
      <div className="gen6pokeradar-workspace">
        <section className="panel gen6pokeradar-controls">
          <div className="gen6pokeradar-heading">
            <h2>{t("gen6PokeRadarSetup")}</h2>
            <span>{progress.percent.toFixed(1)}%</span>
          </div>
          <div className="gen6pokeradar-grid">
            <label className="field">
              <span>{t("gen6WildTinySeed")}</span>
              <input
                maxLength={8}
                value={tinySeed}
                onChange={(event) =>
                  setTinySeed(normalizeHexInput(event.target.value, 8))
                }
              />
            </label>
            <label className="field">
              <span>{t("gen6WildTinyFrame")}</span>
              <input
                inputMode="numeric"
                value={tinyFrame}
                onChange={(event) =>
                  setTinyFrame(normalizeDecimalInput(event.target.value, 10))
                }
              />
            </label>
            <label className="field">
              <span>{t("gen6StationaryFrameRange")}</span>
              <input
                inputMode="numeric"
                value={minFrame}
                onChange={(event) =>
                  setMinFrame(normalizeDecimalInput(event.target.value, 10))
                }
              />
            </label>
            <label className="field">
              <span>{t("gen6WildMaxFrame")}</span>
              <input
                inputMode="numeric"
                value={maxFrame}
                onChange={(event) =>
                  setMaxFrame(normalizeDecimalInput(event.target.value, 10))
                }
              />
            </label>
            <label className="field">
              <span>{t("gen6PokeRadarPartySize")}</span>
              <input
                inputMode="numeric"
                value={partySize}
                onChange={(event) =>
                  setPartySize(normalizeDecimalInput(event.target.value, 1))
                }
              />
            </label>
            <label className="field">
              <span>{t("gen6PokeRadarChainLength")}</span>
              <input
                inputMode="numeric"
                value={chainLength}
                onChange={(event) =>
                  setChainLength(normalizeDecimalInput(event.target.value, 3))
                }
              />
            </label>
            <label className="field">
              <span>{t("gen6PokeRadarResultLimit")}</span>
              <input
                inputMode="numeric"
                value={resultLimit}
                onChange={(event) =>
                  setResultLimit(normalizeDecimalInput(event.target.value, 6))
                }
              />
            </label>
          </div>
          <label className="gen6pokeradar-check">
            <input
              checked={boost}
              onChange={(event) => setBoost(event.target.checked)}
              type="checkbox"
            />
            {t("gen6PokeRadarBoost")}
          </label>
          <pre
            aria-label={t("gen6PokeRadarOverview")}
            className="gen6pokeradar-overview"
          >
            {overview}
          </pre>
          <div className="gen6pokeradar-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play size={16} />
              {t("generate")}
            </button>
            <button
              disabled={status !== "calculating"}
              onClick={cancel}
              type="button"
            >
              <Square size={16} />
              {t("cancel")}
            </button>
            <button disabled={!results.length} onClick={csv} type="button">
              <Download size={16} />
              CSV
            </button>
            <button
              disabled={!results.length}
              onClick={() => setResults([])}
              type="button"
            >
              <Trash2 size={16} />
              {t("clear")}
            </button>
            {status === "calculating" && (
              <progress max={100} value={progress.percent} />
            )}
          </div>
          {(error || summary) && (
            <p
              className={
                error ? "gen6pokeradar-error" : "gen6pokeradar-summary"
              }
            >
              {error ||
                `${summary?.resultCount ?? 0} / ${summary?.processedStates ?? 0}`}
            </p>
          )}
        </section>
        <section className="panel gen6pokeradar-results">
          <div className="gen6pokeradar-heading">
            <h2>{t("gen6PokeRadarResults")}</h2>
            <span>{results.length.toLocaleString()}</span>
          </div>
          <div className="gen6pokeradar-scroll" ref={scrollRef}>
            <div
              className="gen6pokeradar-table"
              style={{ height: virtualizer.getTotalSize() + 42 }}
            >
              <div className="gen6pokeradar-head">
                {[
                  "Frame",
                  "Music",
                  "Type",
                  "Boost",
                  "Patch 1",
                  "Patch 2",
                  "Patch 3",
                  "Patch 4",
                  "Empty",
                ].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              {virtualizer.getVirtualItems().map((item) => {
                const result = results[item.index];
                return (
                  <button
                    className={`gen6pokeradar-row ${selected === item.index ? "selected" : ""}`}
                    key={result.frame}
                    onClick={() => setSelected(item.index)}
                    style={{ transform: `translateY(${item.start + 42}px)` }}
                    type="button"
                  >
                    <span>{result.frame}</span>
                    <span>{result.music}</span>
                    <span>{result.musicType}</span>
                    <span>{result.boost ? t("yes") : t("no")}</span>
                    {result.patches.map((patch, index) => (
                      <span key={index}>{formatGen6PokeRadarPatch(patch)}</span>
                    ))}
                  </button>
                );
              })}
            </div>
            {!results.length && (
              <div className="gen6pokeradar-empty">
                {error
                  ? t("invalidGen6PokeRadarInput")
                  : t("emptyGen6PokeRadar")}
              </div>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}
