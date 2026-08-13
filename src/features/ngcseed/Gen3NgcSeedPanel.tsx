import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { parseDecimal } from "../id/domain";
import { getGen3SpeciesName } from "../shared/gen3Species";
import {
  formatGen3NgcSeed,
  validateGen3NgcSeedRequest,
  type Gen3NgcSeedMode,
  type Gen3NgcSeedState,
} from "./domain";
import { Gen3NgcSeedUiPreviewEngine } from "./preview/Gen3NgcSeedUiPreviewEngine";
import {
  inspectGen3NgcPrecalcFile,
  readGen3NgcPrecalcSeedChunks,
  type Gen3NgcPrecalcFile,
  type Gen3NgcPrecalcMode,
} from "./precalc";
import type {
  Gen3NgcSeedSearchEngine,
  Gen3NgcSeedSearchSummary,
} from "./search";
import { Gen3NgcSeedWorkerPool } from "./worker/Gen3NgcSeedWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
const galesPlayer = [150, 151, 386, 384, 385];
const galesEnemy = [144, 145, 146, 115, 380];
const coloLeads = [257, 244, 260, 243, 154, 245, 376, 214];
const trainers = ["Wes", "Seth", "Thomas"];
const channelPatterns = [
  ["S->N->O->C", 11],
  ["N->S->O->C", 22],
  ["O->N->S->C", 12],
  ["N->O->S->C", 24],
  ["S->N->C->O", 13],
  ["N->S->C->O", 26],
  ["C->N->S->O", 15],
  ["N->C->S->O", 30],
  ["O->N->C->S", 16],
  ["N->O->C->S", 32],
  ["C->N->O->S", 17],
  ["N->C->O->S", 34],
] as const;

interface PrecalcSelection {
  source: Gen3NgcPrecalcFile;
  partitionIndex: number;
  seedCount: number;
}

type PrecalcChoice = "skip" | Gen3NgcPrecalcFile;
type SearchProgress = {
  processed: number;
  total: number;
  resultCount: number;
  percent: number;
};
interface ModeViewState {
  status: RunStatus;
  error: string;
  results: Gen3NgcSeedState[];
  summary?: Gen3NgcSeedSearchSummary;
  round: number;
  precalcSelection?: PrecalcSelection;
  progress: SearchProgress;
}

function createModeViewState(): ModeViewState {
  return {
    status: "ready",
    error: "",
    results: [],
    round: 1,
    progress: { processed: 0, total: 0, resultCount: 0, percent: 0 },
  };
}

function normalizeNgcHpInput(value: string) {
  if (value === "") return "";
  const filtered = value.replace(/\D/g, "").slice(0, 3);
  if (filtered === "") return "1";
  const normalized = filtered.replace(/^0+(?=.)/, "");
  return String(Math.min(714, Math.max(1, Number(normalized))));
}

function parseNgcHp(value: string) {
  return value === "" ? 0 : (parseDecimal(value) ?? Number.NaN);
}

export function Gen3NgcSeedPanel({
  uiPreviewMode,
}: {
  uiPreviewMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const engine = useMemo<Gen3NgcSeedSearchEngine>(
    () =>
      uiPreviewMode
        ? new Gen3NgcSeedUiPreviewEngine()
        : new Gen3NgcSeedWorkerPool(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Gen3NgcSeedMode>("gales");
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [results, setResults] = useState<Gen3NgcSeedState[]>([]);
  const [summary, setSummary] = useState<Gen3NgcSeedSearchSummary>();
  const [round, setRound] = useState(1);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [enemyHp, setEnemyHp] = useState<[string, string]>(["", ""]);
  const [playerHp, setPlayerHp] = useState<[string, string]>(["", ""]);
  const [partyLead, setPartyLead] = useState(0);
  const [trainer, setTrainer] = useState(0);
  const [patterns, setPatterns] = useState<number[]>([]);
  const [precalcChoices, setPrecalcChoices] = useState<
    Partial<Record<Gen3NgcPrecalcMode, PrecalcChoice>>
  >({});
  const [precalcPromptMode, setPrecalcPromptMode] =
    useState<Gen3NgcPrecalcMode>();
  const [precalcSelection, setPrecalcSelection] = useState<PrecalcSelection>();
  const activeAbort = useRef<AbortController | undefined>(undefined);
  const pendingPrecalcMode = useRef<Gen3NgcPrecalcMode | undefined>(undefined);
  const precalcFileInput = useRef<HTMLInputElement | null>(null);
  const modeViews = useRef<Record<Gen3NgcSeedMode, ModeViewState>>({
    gales: createModeViewState(),
    colo: createModeViewState(),
    channel: createModeViewState(),
  });
  const [progress, setProgress] = useState<SearchProgress>(
    createModeViewState().progress,
  );
  useEffect(
    () => () => {
      activeAbort.current?.abort();
      engine.dispose();
    },
    [engine],
  );
  useEffect(() => {
    if (!precalcPromptMode) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPrecalcPromptMode(undefined);
    };
    globalThis.addEventListener("keydown", closeOnEscape);
    return () => globalThis.removeEventListener("keydown", closeOnEscape);
  }, [precalcPromptMode]);
  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];
  const clearSearchState = () => {
    setResults([]);
    setPrecalcSelection(undefined);
    setSummary(undefined);
    setRound(1);
    setError("");
    setStatus("ready");
    setProgress({ processed: 0, total: 0, resultCount: 0, percent: 0 });
  };
  const reset = () => {
    if (status === "calculating") return;
    clearSearchState();
  };
  const changeMode = (next: Gen3NgcSeedMode) => {
    if (status === "calculating") return;
    modeViews.current[mode] = {
      status,
      error,
      results,
      summary,
      round,
      precalcSelection,
      progress,
    };
    const nextView = modeViews.current[next];
    setMode(next);
    setStatus(nextView.status);
    setError(nextView.error);
    setResults(nextView.results);
    setSummary(nextView.summary);
    setRound(nextView.round);
    setPrecalcSelection(nextView.precalcSelection);
    setProgress(nextView.progress);
  };
  const cancel = () => {
    activeAbort.current?.abort();
    engine.cancel();
  };
  const selectPrecalc = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const precalcMode = pendingPrecalcMode.current;
    pendingPrecalcMode.current = undefined;
    if (!file || !precalcMode) return;
    activeAbort.current?.abort();
    const controller = new AbortController();
    activeAbort.current = controller;
    setError("");
    setSummary(undefined);
    setStatus("calculating");
    setProgress({ processed: 0, total: file.size, resultCount: 0, percent: 0 });
    let source: Gen3NgcPrecalcFile | undefined;
    try {
      source = await inspectGen3NgcPrecalcFile(file, precalcMode, {
        signal: controller.signal,
        onProgress: (processed, total) =>
          setProgress({
            processed,
            total,
            resultCount: 0,
            percent: total === 0 ? 100 : (processed / total) * 100,
          }),
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setStatus("cancelled");
      } else {
        setError(t("ngcInvalidPrecalc"));
        setStatus("failed");
      }
    } finally {
      if (activeAbort.current === controller) activeAbort.current = undefined;
      event.target.value = "";
    }
    if (controller.signal.aborted || !source) return;
    setPrecalcChoices((current) => ({ ...current, [precalcMode]: source }));
    await runSearch(source);
  };
  const runSearch = async (precalcOverride?: PrecalcChoice) => {
    const request =
      mode === "gales"
        ? {
            mode,
            playerIndex,
            enemyIndex,
            enemyHp: [parseNgcHp(enemyHp[0]), parseNgcHp(enemyHp[1])] as [
              number,
              number,
            ],
            playerHp: [parseNgcHp(playerHp[0]), parseNgcHp(playerHp[1])] as [
              number,
              number,
            ],
            seeds:
              round > 1 && !precalcSelection
                ? results.map((state) => state.seed)
                : undefined,
          }
        : mode === "colo"
          ? {
              mode,
              partyLead,
              trainer,
              seeds:
                round > 1 && !precalcSelection
                  ? results.map((state) => state.seed)
                  : undefined,
            }
          : { mode, patterns };
    if (validateGen3NgcSeedRequest(request).length) {
      setError(t("invalidNgcSeedInput"));
      setStatus("failed");
      return;
    }
    setError("");
    setSummary(undefined);
    setProgress({ processed: 0, total: 0, resultCount: 0, percent: 0 });
    setStatus("calculating");
    const controller = new AbortController();
    activeAbort.current = controller;
    try {
      const nextStates: Gen3NgcSeedState[] = [];
      const precalcChoice =
        mode === "channel"
          ? undefined
          : (precalcOverride ?? precalcChoices[mode]);
      const source =
        typeof precalcChoice === "object" ? precalcChoice : undefined;
      if (round === 1 && source) {
        const partitionIndex =
          mode === "gales"
            ? playerIndex * 5 + enemyIndex
            : partyLead + 8 * trainer;
        const seedCount = source.counts[partitionIndex];
        let singleResult: Gen3NgcSeedState[] = [];
        if (seedCount === 1) {
          for await (const seeds of readGen3NgcPrecalcSeedChunks(
            source,
            partitionIndex,
            1,
            { signal: controller.signal },
          )) {
            singleResult = [{ seed: seeds[0] }];
          }
        }
        setPrecalcSelection({ source, partitionIndex, seedCount });
        setResults(singleResult);
        setRound(2);
        setProgress({
          processed: seedCount,
          total: seedCount,
          resultCount: seedCount,
          percent: 100,
        });
        setSummary({
          processed: seedCount,
          total: seedCount,
          resultCount: seedCount,
          percent: 100,
          elapsedMs: 0,
          workerCount: 0,
          cancelled: false,
        });
        setStatus("completed");
        return;
      }
      let nextSummary: Gen3NgcSeedSearchSummary;
      if (precalcSelection) {
        let processed = 0;
        let elapsedMs = 0;
        let workerCount = 0;
        for await (const seeds of readGen3NgcPrecalcSeedChunks(
          precalcSelection.source,
          precalcSelection.partitionIndex,
          200_000,
          { signal: controller.signal },
        )) {
          const processedBefore = processed;
          const summary = await engine.search(
            { ...request, seeds },
            {
              signal: controller.signal,
              onBatch: (states) => nextStates.push(...states),
              onProgress: (batch) =>
                setProgress({
                  processed: processedBefore + batch.processed,
                  total: precalcSelection.seedCount,
                  resultCount: nextStates.length,
                  percent:
                    ((processedBefore + batch.processed) /
                      precalcSelection.seedCount) *
                    100,
                }),
            },
          );
          processed += summary.processed;
          elapsedMs += summary.elapsedMs;
          workerCount = Math.max(workerCount, summary.workerCount);
          if (summary.cancelled) break;
        }
        nextSummary = {
          processed,
          total: precalcSelection.seedCount,
          resultCount: nextStates.length,
          percent:
            precalcSelection.seedCount === 0
              ? 100
              : (processed / precalcSelection.seedCount) * 100,
          elapsedMs,
          workerCount,
          cancelled: controller.signal.aborted,
        };
      } else {
        nextSummary = await engine.search(request, {
          signal: controller.signal,
          onBatch: (states) => nextStates.push(...states),
          onProgress: setProgress,
        });
      }
      nextStates.sort((left, right) => left.seed - right.seed);
      setResults(
        nextStates.filter(
          (state, index) =>
            index === 0 || state.seed !== nextStates[index - 1].seed,
        ),
      );
      setSummary(nextSummary);
      setPrecalcSelection(undefined);
      if (!nextSummary.cancelled && mode !== "channel")
        setRound((value) => value + 1);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setStatus("cancelled");
      } else {
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("failed");
      }
    } finally {
      if (activeAbort.current === controller) activeAbort.current = undefined;
    }
  };
  const search = (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    if (mode === "channel" && patterns.length < 10) {
      setError(t("ngcMinimumChannelInputs"));
      setStatus("failed");
      return;
    }
    if (
      mode !== "channel" &&
      round === 1 &&
      precalcChoices[mode] === undefined
    ) {
      setPrecalcPromptMode(mode);
      return;
    }
    void runSearch();
  };
  const setHp = (side: "enemy" | "player", index: 0 | 1, value: string) => {
    const next = normalizeNgcHpInput(value);
    if (side === "enemy")
      setEnemyHp((current) =>
        index === 0 ? [next, current[1]] : [current[0], next],
      );
    else
      setPlayerHp((current) =>
        index === 0 ? [next, current[1]] : [current[0], next],
      );
  };
  return (
    <>
      <div
        className="operation-tabs ngc-seed-tabs"
        role="tablist"
        aria-label={t("ngcSeedModule")}
      >
        {(["gales", "colo", "channel"] as const).map((entry) => (
          <button
            aria-selected={mode === entry}
            aria-controls={`ngc-${entry}-panel`}
            className={mode === entry ? "active" : ""}
            disabled={status === "calculating" || Boolean(precalcPromptMode)}
            key={entry}
            id={`ngc-${entry}-tab`}
            onClick={() => changeMode(entry)}
            role="tab"
            tabIndex={mode === entry ? 0 : -1}
            type="button"
          >
            {t(
              entry === "gales"
                ? "ngcGales"
                : entry === "colo"
                  ? "ngcColo"
                  : "ngcChannel",
            )}
          </button>
        ))}
      </div>
      <form className="ngc-seed-control-grid" onSubmit={search}>
        <section
          aria-labelledby={`ngc-${mode}-tab`}
          className="panel compact-module-panel"
          id={`ngc-${mode}-panel`}
          role="tabpanel"
        >
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("settings")}</h2>
            </div>
          </div>
          {mode === "gales" && (
            <div className="ngc-seed-form-grid">
              <label className="field">
                <span>{t("ngcYourLead")}</span>
                <select
                  value={playerIndex}
                  onChange={(event) =>
                    setPlayerIndex(Number(event.target.value))
                  }
                >
                  {galesPlayer.map((species, index) => (
                    <option key={species} value={index}>
                      {getGen3SpeciesName(i18n.language, species)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("ngcTopLeftHp")}</span>
                <input
                  inputMode="numeric"
                  max={714}
                  min={1}
                  maxLength={3}
                  value={playerHp[0]}
                  onChange={(event) => setHp("player", 0, event.target.value)}
                />
              </label>
              <label className="field">
                <span>{t("ngcTopRightHp")}</span>
                <input
                  inputMode="numeric"
                  max={714}
                  min={1}
                  maxLength={3}
                  value={enemyHp[0]}
                  onChange={(event) => setHp("enemy", 0, event.target.value)}
                />
              </label>
              <label className="field">
                <span>{t("ngcEnemyLead")}</span>
                <select
                  value={enemyIndex}
                  onChange={(event) =>
                    setEnemyIndex(Number(event.target.value))
                  }
                >
                  {galesEnemy.map((species, index) => (
                    <option key={species} value={index}>
                      {getGen3SpeciesName(i18n.language, species)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("ngcBottomLeftHp")}</span>
                <input
                  inputMode="numeric"
                  max={714}
                  min={1}
                  maxLength={3}
                  value={playerHp[1]}
                  onChange={(event) => setHp("player", 1, event.target.value)}
                />
              </label>
              <label className="field">
                <span>{t("ngcBottomRightHp")}</span>
                <input
                  inputMode="numeric"
                  max={714}
                  min={1}
                  maxLength={3}
                  value={enemyHp[1]}
                  onChange={(event) => setHp("enemy", 1, event.target.value)}
                />
              </label>
            </div>
          )}
          {mode === "colo" && (
            <div className="ngc-seed-form-grid compact">
              <label className="field">
                <span>{t("ngcTrainer")}</span>
                <select
                  value={trainer}
                  onChange={(event) => setTrainer(Number(event.target.value))}
                >
                  {trainers.map((name, index) => (
                    <option key={name} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("ngcPartyLead")}</span>
                <select
                  value={partyLead}
                  onChange={(event) => setPartyLead(Number(event.target.value))}
                >
                  {coloLeads.map((species, index) => (
                    <option key={species} value={index}>
                      {getGen3SpeciesName(i18n.language, species)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {mode === "channel" && (
            <div className="channel-pattern-layout">
              <div className="channel-pattern-buttons">
                {channelPatterns.map(([label, value]) => (
                  <button
                    className="secondary-action"
                    key={value}
                    onClick={() =>
                      setPatterns((current) => current.concat(value))
                    }
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="channel-inputs">
                <strong>{t("ngcInputs")}</strong>
                <ol>
                  {patterns.map((value, index) => (
                    <li key={`${index}-${value}`}>
                      {channelPatterns.find((entry) => entry[1] === value)?.[0]}
                    </li>
                  ))}
                </ol>
                <div className="panel-actions">
                  <button
                    className="secondary-action"
                    disabled={!patterns.length}
                    onClick={() =>
                      setPatterns((current) => current.slice(0, -1))
                    }
                    type="button"
                  >
                    {t("ngcRemove")}
                  </button>
                  <button
                    className="secondary-action"
                    disabled={!patterns.length}
                    onClick={() => setPatterns([])}
                    type="button"
                  >
                    {t("ngcClear")}
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="ngc-search-footer">
            <div>
              {mode !== "channel" && (
                <span>{t("ngcRound", { count: round })}</span>
              )}
              <strong>
                {t("ngcPossibleResults", {
                  count: precalcSelection?.seedCount ?? results.length,
                })}
              </strong>
            </div>
            <div className="panel-actions">
              <button
                className="primary-action"
                disabled={status === "calculating"}
                type="submit"
              >
                {t("search")}
              </button>
              {status === "calculating" && (
                <button
                  className="secondary-action"
                  onClick={cancel}
                  type="button"
                >
                  {t("cancel")}
                </button>
              )}
              {mode !== "channel" && (
                <button
                  className="secondary-action"
                  disabled={status === "calculating"}
                  onClick={reset}
                  type="button"
                >
                  {t("ngcReset")}
                </button>
              )}
            </div>
          </div>
        </section>
      </form>
      <div
        aria-label={`${progress.percent.toFixed(1)}%`}
        className="progress-track ngc-seed-progress"
      >
        <span style={{ width: `${Math.min(100, progress.percent)}%` }} />
      </div>
      <section className="panel results-panel ngc-seed-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{statusLabel}</span>
          </div>
          <span className="result-count">
            {String(precalcSelection?.seedCount ?? results.length)}
          </span>
        </div>
        {error && (
          <div className="alert error">
            {error.includes("Wasm") || error.includes("wasm")
              ? t("ngcSeedWasmMissing")
              : error}
          </div>
        )}
        {summary && (
          <div className="metrics-row">
            <span>
              {t("workers")} <strong>{summary.workerCount}</strong>
            </span>
            <span>
              {t("elapsed")} <strong>{summary.elapsedMs.toFixed(0)} ms</strong>
            </span>
          </div>
        )}
        <div className="table-shell ngc-seed-table-shell">
          {results.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>
                {precalcSelection
                  ? t("ngcPossibleResults", {
                      count: precalcSelection.seedCount,
                    })
                  : t("emptyNgcSeed")}
              </span>
            </div>
          ) : (
            <table className="seed-to-time-table">
              <thead>
                <tr>
                  <th>{t("seed")}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((state) => (
                  <tr key={state.seed}>
                    <td>
                      <span>{formatGen3NgcSeed(state.seed)}</span>
                      {results.length === 1 && (
                        <button
                          className="secondary-action ngc-copy-seed"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                formatGen3NgcSeed(state.seed),
                              );
                              setError("");
                            } catch (cause) {
                              setError(
                                cause instanceof Error
                                  ? cause.message
                                  : String(cause),
                              );
                            }
                          }}
                          aria-label={`Copy ${formatGen3NgcSeed(state.seed)}`}
                          type="button"
                        >
                          Copy
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <input
        accept=".precalc"
        hidden
        onChange={selectPrecalc}
        ref={precalcFileInput}
        type="file"
      />
      {precalcPromptMode && (
        <div className="modal-backdrop">
          <section
            aria-labelledby="ngc-precalc-title"
            aria-modal="true"
            className="profile-modal ngc-precalc-modal"
            role="dialog"
          >
            <div className="modal-heading">
              <h2 id="ngc-precalc-title">
                {t(
                  precalcPromptMode === "gales"
                    ? "ngcGalesPrecalc"
                    : "ngcColoPrecalc",
                )}
              </h2>
            </div>
            <p>
              {t(
                precalcPromptMode === "gales"
                  ? "ngcUseGalesPrecalc"
                  : "ngcUseColoPrecalc",
              )}
            </p>
            <div className="modal-actions">
              <button
                className="secondary-action"
                onClick={() => {
                  const promptMode = precalcPromptMode;
                  setPrecalcChoices((current) => ({
                    ...current,
                    [promptMode]: "skip",
                  }));
                  setPrecalcPromptMode(undefined);
                  void runSearch("skip");
                }}
                type="button"
              >
                {t("no")}
              </button>
              <button
                autoFocus
                className="primary-action"
                onClick={() => {
                  pendingPrecalcMode.current = precalcPromptMode;
                  setPrecalcPromptMode(undefined);
                  precalcFileInput.current?.click();
                }}
                type="button"
              >
                {t("yes")}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
