import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { Gen6MtSeedUiPreviewEngine } from "./preview/Gen6MtSeedUiPreviewEngine";
import {
  formatGen6MtSeedHex,
  GEN6_MT_SEED_ALL_NATURES,
  GEN6_MT_SEED_MAX_FRAME,
  GEN6_MT_SEED_MIN_FRAME_MAX,
  GEN6_MT_SEED_MAX_RESULTS,
  type Gen6MtSeedMode,
  type Gen6MtSeedRequest,
  type Gen6MtSeedResult,
} from "./domain";
import type { Gen6MtSeedEngine, Gen6MtSeedSummary } from "./search";
import { Gen6MtSeedWorker } from "./worker/Gen6MtSeedWorker";
import "./Gen6MtSeedPanel.css";

const NATURE_KEYS = [
  "natureHardy",
  "natureLonely",
  "natureAdamant",
  "natureNaughty",
  "natureBrave",
  "natureBold",
  "natureDocile",
  "natureImpish",
  "natureLax",
  "natureRelaxed",
  "natureModest",
  "natureMild",
  "natureBashful",
  "natureRash",
  "natureQuiet",
  "natureCalm",
  "natureGentle",
  "natureCareful",
  "natureQuirky",
  "natureJolly",
  "natureTimid",
  "natureHasty",
  "natureSerious",
  "natureNaive",
  "natureSassy",
] as const;
const MODES: readonly Gen6MtSeedMode[] = [
  "ivs",
  "pid",
  "ec",
  "pid-reroll",
  "ec-pid",
  "horde",
];
const IV_NAMES = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
const emptyIvs = () => ["0", "0", "0", "0", "0", "0"];

export function Gen6MtSeedPanel({ uiPreviewMode }: { uiPreviewMode: boolean }) {
  const { t } = useTranslation();
  const engine = useMemo<Gen6MtSeedEngine>(
    () =>
      uiPreviewMode ? new Gen6MtSeedUiPreviewEngine() : new Gen6MtSeedWorker(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Gen6MtSeedMode>("ivs");
  const [startSeed, setStartSeed] = useState("00000000");
  const [endSeed, setEndSeed] = useState("00000000");
  const [minFrame, setMinFrame] = useState("0");
  const [maxFrame, setMaxFrame] = useState("1000");
  const [desiredPid, setDesiredPid] = useState("00000000");
  const [tsv, setTsv] = useState("0");
  const [trv, setTrv] = useState("0");
  const [shinyType, setShinyType] = useState("0");
  const [perfectIvs, setPerfectIvs] = useState("3");
  const [ivMode, setIvMode] = useState<"perfect" | "specific">("perfect");
  const [specificIvMask, setSpecificIvMask] = useState(0);
  const [minIvs, setMinIvs] = useState(emptyIvs);
  const [maxIvs, setMaxIvs] = useState(() => [
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [natureMask, setNatureMask] = useState(GEN6_MT_SEED_ALL_NATURES);
  const [abilityLocked, setAbilityLocked] = useState(false);
  const [possibleHa, setPossibleHa] = useState(false);
  const [niceEc, setNiceEc] = useState(false);
  const [hordeShinies, setHordeShinies] = useState("4");
  const [anyTsv, setAnyTsv] = useState(true);
  const [fast, setFast] = useState(true);
  const [showUnown, setShowUnown] = useState(false);
  const [resultLimit, setResultLimit] = useState("100000");
  const [results, setResults] = useState<Gen6MtSeedResult[]>([]);
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen6MtSeedSummary>();
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });
  useEffect(() => () => engine.dispose(), [engine]);
  const selectedNatureValues = useMemo(
    () => NATURE_KEYS.map((key, index) => ({ label: t(key), value: index })),
    [t],
  );
  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request: Gen6MtSeedRequest = {
      mode,
      startSeed: Number.parseInt(startSeed || "0", 16) >>> 0,
      endSeed: Number.parseInt(endSeed || "0", 16) >>> 0,
      minFrame: Number.parseInt(minFrame || "0", 10),
      maxFrame: Number.parseInt(maxFrame || "0", 10),
      desiredPid: Number.parseInt(desiredPid || "0", 16) >>> 0,
      tsv: Number.parseInt(tsv || "0", 10),
      trv: Number.parseInt(trv || "0", 10),
      shinyType: Number.parseInt(shinyType || "0", 10),
      perfectIvs: Number.parseInt(perfectIvs || "0", 10),
      ivMode,
      specificIvMask,
      natureMask,
      minIvs: minIvs.map((value) =>
        Number.parseInt(value || "0", 10),
      ) as Gen6MtSeedRequest["minIvs"],
      maxIvs: maxIvs.map((value) =>
        Number.parseInt(value || "0", 10),
      ) as Gen6MtSeedRequest["maxIvs"],
      abilityLocked,
      possibleHa,
      niceEc,
      hordeShinies: Number.parseInt(hordeShinies || "0", 10),
      anyTsv,
      fast,
      showUnown,
      resultLimit: Number.parseInt(resultLimit || "0", 10),
    };
    try {
      setResults([]);
      setSummary(undefined);
      setError("");
      setStatus("calculating");
      setProgress({
        processedStates: 0,
        totalStates: request.endSeed - request.startSeed + 1,
        resultCount: 0,
        percent: 0,
      });
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
      ["Seed", "Frame", "PID", "PSV", "PRV", ...IV_NAMES, "Nature", "Ability"],
      ...results.map((result) => [
        formatGen6MtSeedHex(result.seed),
        result.frame,
        formatGen6MtSeedHex(result.pid),
        result.psv,
        result.prv.toString(16).toUpperCase(),
        ...result.ivs,
        result.nature,
        result.ability,
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const anchor = document.createElement("a");
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = "pokerngkit-gen6mtseed.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const busy = status === "calculating";
  const tableMode =
    mode === "horde"
      ? "horde"
      : mode === "ec"
        ? "ec"
        : mode === "ec-pid"
          ? "ec-pid"
          : "standard";
  const cancel = () => engine.cancel();
  return (
    <div className="gen6mtseed-workspace">
      <form className="gen6mtseed-controls" onSubmit={run}>
        <section className="panel gen6mtseed-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6MtSeedInput")}</h2>
            </div>
            <span className="panel-note">TinyFinder / MT19937</span>
          </div>
          <div
            className="gen6mtseed-mode"
            role="radiogroup"
            aria-label={t("gen6MtSeedMode")}
          >
            {MODES.map((value) => (
              <label className={mode === value ? "active" : ""} key={value}>
                <input
                  checked={mode === value}
                  name="gen6mtseed-mode"
                  onChange={() => setMode(value)}
                  type="radio"
                />
                <span>
                  {t(
                    `gen6MtSeed${value === "pid-reroll" ? "PidReroll" : value === "ec-pid" ? "EcPid" : value[0].toUpperCase() + value.slice(1)}`,
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="gen6mtseed-grid">
            <label className="field">
              <span>{t("gen6MtSeedStart")}</span>
              <input
                maxLength={8}
                onChange={(event) =>
                  setStartSeed(normalizeHexInput(event.target.value, 8))
                }
                value={startSeed}
              />
            </label>
            <label className="field">
              <span>{t("gen6MtSeedEnd")}</span>
              <input
                maxLength={8}
                onChange={(event) =>
                  setEndSeed(normalizeHexInput(event.target.value, 8))
                }
                value={endSeed}
              />
            </label>
            <label className="field">
              <span>{t("gen6MtSeedFrameMin")}</span>
              <input
                inputMode="numeric"
                max={GEN6_MT_SEED_MIN_FRAME_MAX}
                onChange={(event) =>
                  setMinFrame(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_MT_SEED_MIN_FRAME_MAX,
                      8,
                    ),
                  )
                }
                value={minFrame}
              />
            </label>
            <label className="field">
              <span>{t("gen6MtSeedFrameMax")}</span>
              <input
                inputMode="numeric"
                max={GEN6_MT_SEED_MAX_FRAME}
                onChange={(event) =>
                  setMaxFrame(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_MT_SEED_MAX_FRAME,
                      8,
                    ),
                  )
                }
                value={maxFrame}
              />
            </label>
            {(mode === "pid" || mode === "ec" || mode === "pid-reroll") && (
              <label className="field">
                <span>{t("gen6MtSeedDesiredPid")}</span>
                <input
                  maxLength={8}
                  onChange={(event) =>
                    setDesiredPid(normalizeHexInput(event.target.value, 8))
                  }
                  value={desiredPid}
                />
              </label>
            )}
            {(mode === "ivs" || mode === "horde") && (
              <>
                <label className="field">
                  <span>{t("gen6MtSeedTsv")}</span>
                  <input
                    inputMode="numeric"
                    max={4095}
                    onChange={(event) =>
                      setTsv(normalizeDecimalInput(event.target.value, 4095, 4))
                    }
                    value={tsv}
                  />
                </label>
                <label className="field">
                  <span>{t("gen6MtSeedTrv")}</span>
                  <input
                    inputMode="numeric"
                    max={15}
                    onChange={(event) =>
                      setTrv(normalizeDecimalInput(event.target.value, 15, 2))
                    }
                    value={trv}
                  />
                </label>
              </>
            )}
          </div>
          {mode === "ivs" && (
            <div className="gen6mtseed-grid">
              <label className="field">
                <span>{t("gen6MtSeedShiny")}</span>
                <Select
                  value={shinyType}
                  onChange={(event) => setShinyType(event.target.value)}
                >
                  <option value="0">{t("gen6MtSeedShinyAny")}</option>
                  <option value="1">{t("gen6MtSeedShinyStar")}</option>
                  <option value="2">{t("gen6MtSeedShinySquare")}</option>
                  <option value="3">{t("gen6MtSeedShinyBoth")}</option>
                </Select>
              </label>
              <label className="field">
                <span>{t("gen6MtSeedPerfectIvs")}</span>
                <input
                  inputMode="numeric"
                  max={3}
                  onChange={(event) =>
                    setPerfectIvs(
                      normalizeDecimalInput(event.target.value, 3, 1),
                    )
                  }
                  value={perfectIvs}
                />
              </label>
            </div>
          )}
          {mode === "horde" && (
            <div className="gen6mtseed-grid">
              <label className="field">
                <span>{t("gen6MtSeedHordeShinies")}</span>
                <input
                  inputMode="numeric"
                  max={5}
                  min={2}
                  onChange={(event) =>
                    setHordeShinies(
                      normalizeDecimalInput(event.target.value, 5, 1),
                    )
                  }
                  value={hordeShinies}
                />
              </label>
              <label className="field">
                <span>{t("gen6MtSeedResultLimit")}</span>
                <input
                  inputMode="numeric"
                  max={GEN6_MT_SEED_MAX_RESULTS}
                  onChange={(event) =>
                    setResultLimit(
                      normalizeDecimalInput(
                        event.target.value,
                        GEN6_MT_SEED_MAX_RESULTS,
                        6,
                      ),
                    )
                  }
                  value={resultLimit}
                />
              </label>
            </div>
          )}
          {(mode === "ivs" ||
            mode === "pid" ||
            mode === "ec" ||
            mode === "pid-reroll" ||
            mode === "ec-pid") && (
            <>
              <div className="gen6mtseed-iv-grid">
                {IV_NAMES.map((name, index) => (
                  <label className="field" key={name}>
                    <span>
                      {name} {t("gen6MtSeedIvMin")}
                    </span>
                    <input
                      inputMode="numeric"
                      max={31}
                      onChange={(event) =>
                        setMinIvs((current) =>
                          current.map((value, item) =>
                            item === index
                              ? normalizeDecimalInput(event.target.value, 31, 2)
                              : value,
                          ),
                        )
                      }
                      value={minIvs[index]}
                    />
                  </label>
                ))}
                {IV_NAMES.map((name, index) => (
                  <label className="field" key={`${name}-max`}>
                    <span>
                      {name} {t("gen6MtSeedIvMax")}
                    </span>
                    <input
                      inputMode="numeric"
                      max={31}
                      onChange={(event) =>
                        setMaxIvs((current) =>
                          current.map((value, item) =>
                            item === index
                              ? normalizeDecimalInput(event.target.value, 31, 2)
                              : value,
                          ),
                        )
                      }
                      value={maxIvs[index]}
                    />
                  </label>
                ))}
              </div>
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("gen6MtSeedNature")}
                mask={natureMask}
                onChange={(value) =>
                  setNatureMask(value || GEN6_MT_SEED_ALL_NATURES)
                }
                options={selectedNatureValues}
              />
            </>
          )}
          {mode !== "horde" && (
            <div className="gen6mtseed-checks">
              <label>
                <input
                  checked={abilityLocked}
                  onChange={(event) => setAbilityLocked(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6MtSeedAbilityLocked")}
              </label>
              <label>
                <input
                  checked={possibleHa}
                  onChange={(event) => setPossibleHa(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6MtSeedHaPossible")}
              </label>
              {mode === "ec-pid" && (
                <label>
                  <input
                    checked={niceEc}
                    onChange={(event) => setNiceEc(event.target.checked)}
                    type="checkbox"
                  />
                  {t("gen6MtSeedNiceEc")}
                </label>
              )}
              <label>
                <input
                  checked={anyTsv}
                  onChange={(event) => setAnyTsv(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6MtSeedAnyTsv")}
              </label>
              <label>
                <input
                  checked={fast}
                  onChange={(event) => setFast(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6MtSeedFastHorde")}
              </label>
              <label>
                <input
                  checked={showUnown}
                  onChange={(event) => setShowUnown(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6MtSeedShowUnown")}
              </label>
            </div>
          )}
          {mode === "horde" && (
            <div className="gen6mtseed-checks">
              <label>
                <input
                  checked={anyTsv}
                  onChange={(event) => setAnyTsv(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6MtSeedAnyTsv")}
              </label>
              <label>
                <input
                  checked={fast}
                  onChange={(event) => setFast(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6MtSeedFastHorde")}
              </label>
            </div>
          )}
          <div className="gen6mtseed-actions">
            <button
              className="secondary-action"
              disabled={!results.length}
              onClick={exportCsv}
              type="button"
            >
              <Download size={16} />
              CSV
            </button>
            <button
              className="primary-action"
              onClick={busy ? cancel : undefined}
              type={busy ? "button" : "submit"}
            >
              {busy ? <Square size={16} /> : <Play size={16} />}
              {busy ? t("calculating") : t("gen6MtSeedSearch")}
            </button>
          </div>
        </section>
        <section className="panel gen6mtseed-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("gen6MtSeedFilters")}</h2>
            </div>
            <span className="panel-note">{t("gen6MtSeedFilterNote")}</span>
          </div>
          <p className="panel-note">{t("gen6MtSeedHelp")}</p>
          <label className="field">
            <span>{t("gen6MtSeedResultLimit")}</span>
            <input
              inputMode="numeric"
              max={GEN6_MT_SEED_MAX_RESULTS}
              onChange={(event) =>
                setResultLimit(
                  normalizeDecimalInput(
                    event.target.value,
                    GEN6_MT_SEED_MAX_RESULTS,
                    6,
                  ),
                )
              }
              value={resultLimit}
            />
          </label>
          <label className="field">
            <span>{t("gen6MtSeedIvMode")}</span>
            <Select
              value={ivMode}
              onChange={(event) =>
                setIvMode(event.target.value as typeof ivMode)
              }
            >
              <option value="perfect">{t("gen6MtSeedPerfectMode")}</option>
              <option value="specific">{t("gen6MtSeedSpecificMode")}</option>
            </Select>
          </label>
          {ivMode === "specific" && (
            <div className="gen6mtseed-checks">
              {IV_NAMES.map((name, index) => (
                <label key={name}>
                  <input
                    checked={(specificIvMask & (1 << index)) !== 0}
                    onChange={(event) =>
                      setSpecificIvMask((current) =>
                        event.target.checked
                          ? current | (1 << index)
                          : current & ~(1 << index),
                      )
                    }
                    type="checkbox"
                  />
                  {name} 31
                </label>
              ))}
            </div>
          )}
        </section>
      </form>
      <section className="panel results-panel gen6mtseed-results-panel">
        <div className="panel-heading">
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
            aria-label={t("clear")}
            className="icon-action"
            disabled={!results.length}
            onClick={() => setResults([])}
            title={t("clear")}
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, progress.percent)}
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
        <div className="table-shell gen6mtseed-table-shell" ref={tableRef}>
          {results.length === 0 ? (
            <div className="empty-state compact" role="status">
              {error || t("emptyGen6MtSeed")}
            </div>
          ) : (
            <div
              className={`virtual-table gen6mtseed-table ${tableMode}`}
              style={{ height: `${rowVirtualizer.getTotalSize() + 40}px` }}
            >
              <div className="table-header">
                {mode === "horde" ? (
                  <>
                    <span>Seed</span>
                    <span>Frame</span>
                    <span>PSV</span>
                    <span>Charm</span>
                    <span>Sync</span>
                    <span>HA</span>
                    <span>Species</span>
                    {[1, 2, 3, 4, 5].map((jump) => (
                      <span key={jump}>J{jump}</span>
                    ))}
                  </>
                ) : mode === "ec" ? (
                  <>
                    <span>Seed</span>
                    <span>Frame</span>
                    <span>EC</span>
                    {[...IV_NAMES, ...IV_NAMES].map((name, index) => (
                      <span key={`${name}-${index}`}>
                        {name}
                        {index > 5 ? " 2" : " 1"}
                      </span>
                    ))}
                  </>
                ) : (
                  <>
                    <span>Seed</span>
                    <span>Frame</span>
                    <span>PID</span>
                    <span>PSV</span>
                    <span>PRV</span>
                    {IV_NAMES.map((name) => (
                      <span key={name}>{name}</span>
                    ))}
                    <span>Nature</span>
                    <span>Ability</span>
                    {mode === "ec-pid" && (
                      <>
                        <span>EC</span>
                        <span>8s</span>
                      </>
                    )}
                  </>
                )}
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = results[virtualRow.index];
                return (
                  <div
                    className="table-row"
                    key={`${result.seed}-${result.frame}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 40}px)`,
                    }}
                  >
                    <span>{formatGen6MtSeedHex(result.seed)}</span>
                    <span>{result.frame}</span>
                    {mode === "horde" ? (
                      <>
                        <span>{result.psv}</span>
                        <span>{result.flags}</span>
                        <span>{result.aux}</span>
                        <span>{result.hordeHa}</span>
                        <span>{result.hordeSpecies}</span>
                        {result.hordeJumps.map((jump, index) => (
                          <span key={index}>{jump}</span>
                        ))}
                      </>
                    ) : mode === "ec" ? (
                      <>
                        <span>{formatGen6MtSeedHex(result.pid)}</span>
                        {result.ivs.map((iv, index) => (
                          <span key={`a-${index}`}>{iv}</span>
                        ))}
                        {result.ivs2.map((iv, index) => (
                          <span key={`b-${index}`}>{iv}</span>
                        ))}
                      </>
                    ) : (
                      <>
                        <span>{formatGen6MtSeedHex(result.pid)}</span>
                        <span>{result.psv}</span>
                        <span>{result.prv.toString(16).toUpperCase()}</span>
                        {result.ivs.map((iv, index) => (
                          <span key={index}>{iv}</span>
                        ))}
                        <span>
                          {NATURE_KEYS[result.nature]
                            ? t(NATURE_KEYS[result.nature])
                            : result.nature}
                        </span>
                        <span>
                          {result.ability === 3 ? "HA" : result.ability || "-"}
                        </span>
                        {mode === "ec-pid" && (
                          <>
                            <span>{formatGen6MtSeedHex(result.secondary)}</span>
                            <span>{result.aux}</span>
                          </>
                        )}
                      </>
                    )}
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
