import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { GEN6_STATIONARY_NATURES } from "../gen6stationary/data";
import { normalizeDecimalInput } from "../../input";
import {
  formatGen6MainSeedHex,
  gen6MainSeedTaskCount,
  normalizeGen6MainSeedHex,
  parseGen6MainSeedDecimal,
  parseGen6MainSeedHex,
  type Gen6MainSeedIvTuple,
  type Gen6MainSeedOneWildRequest,
  type Gen6MainSeedRequest,
  type Gen6MainSeedResult,
  type Gen6MainSeedTwoWildRequest,
} from "./domain";
import { Gen6MainSeedUiPreviewEngine } from "./preview/Gen6MainSeedUiPreviewEngine";
import type {
  Gen6MainSeedEngine,
  Gen6MainSeedProgress,
  Gen6MainSeedSummary,
} from "./search";
import { Gen6MainSeedWorkerPool } from "./worker/Gen6MainSeedWorkerPool";
import "./Gen6MainSeedPanel.css";

type SearchMode = Gen6MainSeedRequest["mode"];

const DEFAULT_TWO_WILD_IVS = ["29 14 5 24 8 13", "0 14 26 17 3 26"] as const;
const DEFAULT_ONE_WILD_IVS = ["29 14 4 24 7 13", "29 14 5 24 8 13"] as const;
const INVALID_IVS = [
  Number.NaN,
  Number.NaN,
  Number.NaN,
  Number.NaN,
  Number.NaN,
  Number.NaN,
] as Gen6MainSeedIvTuple;

function parseIvText(value: string): Gen6MainSeedIvTuple | undefined {
  const parts = value
    .trim()
    .split(/[\s,/-]+/)
    .filter(Boolean);
  if (parts.length !== 6) return undefined;
  const ivs = parts.map((part) => Number(part));
  if (ivs.some((iv) => !Number.isInteger(iv) || iv < 0 || iv > 31))
    return undefined;
  return ivs as Gen6MainSeedIvTuple;
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function languageKey(language: string): "en" | "ja" | "zh" {
  if (language.startsWith("ja")) return "ja";
  if (language.startsWith("zh")) return "zh";
  return "en";
}

function initialProgress(): Gen6MainSeedProgress {
  return { processedStates: 0, totalStates: 0, resultCount: 0, percent: 0 };
}

export function Gen6MainSeedPanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { i18n, t } = useTranslation();
  const engine = useMemo<Gen6MainSeedEngine>(
    () =>
      uiPreviewMode
        ? new Gen6MainSeedUiPreviewEngine()
        : new Gen6MainSeedWorkerPool(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<SearchMode>("two-wilds");
  const [seedMin, setSeedMin] = useState("00000000");
  const [seedMax, setSeedMax] = useState("FFFFFFFF");
  const [twoWildIvs, setTwoWildIvs] = useState<string[]>([
    ...DEFAULT_TWO_WILD_IVS,
  ]);
  const [twoWildFrames, setTwoWildFrames] = useState([
    "250",
    "600",
    "2000",
    "5000",
  ]);
  const [oneWildIvs, setOneWildIvs] = useState<string[]>([
    ...DEFAULT_ONE_WILD_IVS,
  ]);
  const [oneWildFrames, setOneWildFrames] = useState(["250", "600"]);
  const [nature, setNature] = useState(0);
  const [natureText, setNatureText] = useState("");
  const [results, setResults] = useState<Gen6MainSeedResult[]>([]);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(initialProgress);
  const [summary, setSummary] = useState<Gen6MainSeedSummary>();
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });
  const currentLanguage = languageKey(i18n.language);
  const natureOptions = useMemo(
    () =>
      GEN6_STATIONARY_NATURES[currentLanguage].map((label, value) => ({
        label,
        value,
      })),
    [currentLanguage],
  );

  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    setNatureText(natureOptions[nature]?.label ?? "");
  }, [nature, natureOptions]);

  const updateAt = (
    setter: Dispatch<SetStateAction<string[]>>,
    index: number,
    value: string,
  ) => {
    setter((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ),
    );
  };

  const requestFromForm = (): Gen6MainSeedRequest => {
    const startSeed = parseGen6MainSeedHex(seedMin);
    const endSeed = parseGen6MainSeedHex(seedMax);
    if (mode === "two-wilds") {
      const request: Gen6MainSeedTwoWildRequest = {
        mode,
        startSeed,
        endSeed,
        firstIvs: parseIvText(twoWildIvs[0] ?? "") ?? INVALID_IVS,
        firstMinFrame: parseGen6MainSeedDecimal(twoWildFrames[0] ?? ""),
        firstMaxFrame: parseGen6MainSeedDecimal(twoWildFrames[1] ?? ""),
        secondIvs: parseIvText(twoWildIvs[1] ?? "") ?? INVALID_IVS,
        secondMinFrame: parseGen6MainSeedDecimal(twoWildFrames[2] ?? ""),
        secondMaxFrame: parseGen6MainSeedDecimal(twoWildFrames[3] ?? ""),
      };
      return request;
    }
    const request: Gen6MainSeedOneWildRequest = {
      mode,
      startSeed,
      endSeed,
      lowerIvs: parseIvText(oneWildIvs[0] ?? "") ?? INVALID_IVS,
      upperIvs: parseIvText(oneWildIvs[1] ?? "") ?? INVALID_IVS,
      minFrame: parseGen6MainSeedDecimal(oneWildFrames[0] ?? ""),
      maxFrame: parseGen6MainSeedDecimal(oneWildFrames[1] ?? ""),
      nature,
    };
    return request;
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request = requestFromForm();
    try {
      setResults([]);
      setSummary(undefined);
      setError("");
      setProgress({
        ...initialProgress(),
        totalStates:
          Number.isFinite(request.startSeed) && Number.isFinite(request.endSeed)
            ? gen6MainSeedTaskCount(request)
            : 0,
      });
      setStatus("calculating");
      const next = await engine.search(request, {
        onBatch: (batch) => setResults((current) => [...current, ...batch]),
        onProgress: setProgress,
      });
      setSummary(next);
      setStatus(next.cancelled ? "ready" : "completed");
    } catch {
      setError(t("invalidGen6MainSeedInput"));
      setStatus("failed");
    }
  };

  const exportCsv = () => {
    const headers =
      mode === "two-wilds"
        ? [
            "Seed",
            t("gen6MainSeedFrame1"),
            t("gen6MainSeedNature1"),
            t("gen6MainSeedFrame2"),
            t("gen6MainSeedNature2"),
          ]
        : [
            "Seed",
            t("gen6MainSeedFrame1"),
            t("gen6MainSeedNature1"),
            t("gender"),
          ];
    const rows = [
      headers,
      ...results.map((result) =>
        mode === "two-wilds"
          ? [
              formatGen6MainSeedHex(result.seed),
              result.frame1,
              result.nature1,
              result.frame2,
              result.nature2,
            ]
          : [
              formatGen6MainSeedHex(result.seed),
              result.frame1,
              result.nature1,
              result.gender,
            ],
      ),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen6mainseed.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const frameFields: readonly [string, string, number, number][] =
    mode === "two-wilds"
      ? [
          [t("gen6MainSeedFrame1"), twoWildFrames[0], 0, 4000],
          [t("gen6MainSeedFrame1"), twoWildFrames[1], 0, 4000],
          [t("gen6MainSeedFrame2"), twoWildFrames[2], 0, 10000],
          [t("gen6MainSeedFrame2"), twoWildFrames[3], 0, 10000],
        ]
      : [
          [t("gen6MainSeedFrameRange"), oneWildFrames[0], 0, 4000],
          [t("gen6MainSeedFrameRange"), oneWildFrames[1], 0, 4000],
        ];

  return (
    <div className="gen6mainseed-workspace">
      <form className="gen6mainseed-controls" onSubmit={run}>
        <section className="panel gen6mainseed-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6MainSeedInput")}</h2>
            </div>
            <span className="panel-note">MT19937 / uint32</span>
          </div>
          <div
            className="gen6mainseed-mode"
            role="radiogroup"
            aria-label={t("gen6MainSeedMode")}
          >
            {(
              [
                ["two-wilds", t("gen6MainSeedByTwoWilds")],
                ["one-wild-range", t("gen6MainSeedByOneWildRange")],
              ] as const
            ).map(([value, label]) => (
              <label className={mode === value ? "active" : ""} key={value}>
                <input
                  checked={mode === value}
                  name="gen6-mainseed-mode"
                  onChange={() => setMode(value)}
                  type="radio"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="gen6mainseed-seed-grid">
            <label className="field">
              <span>{t("gen6MainSeedSeedRange")}</span>
              <input
                autoComplete="off"
                maxLength={8}
                onChange={(event) =>
                  setSeedMin(normalizeGen6MainSeedHex(event.target.value))
                }
                spellCheck={false}
                value={seedMin}
              />
            </label>
            <span className="range-separator" aria-hidden="true">
              ~
            </span>
            <label className="field">
              <span aria-hidden="true">&nbsp;</span>
              <input
                autoComplete="off"
                maxLength={8}
                onChange={(event) =>
                  setSeedMax(normalizeGen6MainSeedHex(event.target.value))
                }
                spellCheck={false}
                value={seedMax}
              />
            </label>
          </div>
          {mode === "two-wilds" ? (
            <div className="gen6mainseed-observation-grid">
              {[0, 1].map((index) => (
                <fieldset className="gen6mainseed-observation" key={index}>
                  <legend>
                    {index === 0
                      ? t("gen6MainSeedPokemon1")
                      : t("gen6MainSeedPokemon2")}
                  </legend>
                  <label className="field">
                    <span>{t("gen6MainSeedIvs")}</span>
                    <input
                      autoComplete="off"
                      onChange={(event) =>
                        updateAt(setTwoWildIvs, index, event.target.value)
                      }
                      spellCheck={false}
                      value={twoWildIvs[index] ?? ""}
                    />
                  </label>
                  <div className="gen6mainseed-frame-grid">
                    {[index * 2, index * 2 + 1].map((frameIndex) => (
                      <label className="field" key={frameIndex}>
                        <span>{frameFields[frameIndex]?.[0]}</span>
                        <input
                          inputMode="numeric"
                          max={frameFields[frameIndex]?.[3]}
                          min={frameFields[frameIndex]?.[2]}
                          onChange={(event) =>
                            setTwoWildFrames((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === frameIndex
                                  ? normalizeDecimalInput(
                                      event.target.value,
                                      frameFields[frameIndex]?.[3] ?? 10000,
                                      5,
                                    )
                                  : entry,
                              ),
                            )
                          }
                          value={twoWildFrames[frameIndex] ?? ""}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : (
            <fieldset className="gen6mainseed-observation gen6mainseed-single-observation">
              <legend>{t("gen6MainSeedPokemon1")}</legend>
              <div className="gen6mainseed-single-grid">
                <label className="field">
                  <span>{t("gen6MainSeedLower")}</span>
                  <input
                    autoComplete="off"
                    onChange={(event) =>
                      updateAt(setOneWildIvs, 0, event.target.value)
                    }
                    spellCheck={false}
                    value={oneWildIvs[0] ?? ""}
                  />
                </label>
                <label className="field">
                  <span>{t("gen6MainSeedUpper")}</span>
                  <input
                    autoComplete="off"
                    onChange={(event) =>
                      updateAt(setOneWildIvs, 1, event.target.value)
                    }
                    spellCheck={false}
                    value={oneWildIvs[1] ?? ""}
                  />
                </label>
                {frameFields.map(([label, value, minimum, maximum], index) => (
                  <label className="field" key={`${label}-${index}`}>
                    <span>{label}</span>
                    <input
                      inputMode="numeric"
                      max={maximum}
                      min={minimum}
                      onChange={(event) =>
                        setOneWildFrames((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? normalizeDecimalInput(
                                  event.target.value,
                                  maximum,
                                  5,
                                )
                              : entry,
                          ),
                        )
                      }
                      value={value}
                    />
                  </label>
                ))}
                <label className="field gen6mainseed-nature-field">
                  <span>Nature</span>
                  <AutoCompleteComboBox
                    inputValue={natureText}
                    label="Nature"
                    onInputChange={setNatureText}
                    onValueChange={setNature}
                    options={natureOptions}
                    value={nature}
                  />
                </label>
              </div>
            </fieldset>
          )}
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={16} />
              {t("gen6MainSeedSearch")}
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

      <section className="panel results-panel gen6mainseed-results-panel">
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
              <Download aria-hidden="true" size={16} /> CSV
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
        <div className="table-shell gen6mainseed-table-shell" ref={tableRef}>
          {results.length === 0 ? (
            <div className="empty-state compact" role="status">
              <span>
                {error ? t("invalidGen6MainSeedInput") : t("emptyGen6MainSeed")}
              </span>
            </div>
          ) : (
            <div
              className={`virtual-table gen6mainseed-virtual-table ${mode}`}
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="table-header">
                <span>Seed</span>
                <span>{t("gen6MainSeedFrame1")}</span>
                <span>{t("gen6MainSeedNature1")}</span>
                {mode === "two-wilds" && (
                  <>
                    <span>{t("gen6MainSeedFrame2")}</span>
                    <span>{t("gen6MainSeedNature2")}</span>
                  </>
                )}
                {mode === "one-wild-range" && <span>{t("gender")}</span>}
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = results[virtualRow.index];
                return (
                  <div
                    className="table-row"
                    key={`${result.seed}-${result.frame1}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 40}px)`,
                    }}
                  >
                    <span>{formatGen6MainSeedHex(result.seed)}</span>
                    <span>{result.frame1}</span>
                    <span>{result.nature1}</span>
                    {mode === "two-wilds" && (
                      <>
                        <span>{result.frame2}</span>
                        <span>{result.nature2}</span>
                      </>
                    )}
                    {mode === "one-wild-range" && <span>{result.gender}</span>}
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
