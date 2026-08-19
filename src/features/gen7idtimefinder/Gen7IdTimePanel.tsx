import { useVirtualizer } from "@tanstack/react-virtual";
import { Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  isThreeDsGen7Profile,
  type ThreeDsProfile,
} from "../3dsprofiles/domain";
import {
  AutoCompleteComboBox,
  type AutoCompleteOption,
} from "../shared/AutoCompleteComboBox";
import {
  formatGen7IdTimeEpoch,
  gen7IdTimeEpochFromInput,
  GEN7_ID_TIME_MAX_FRAME,
  type Gen7IdTimeRequest,
  type Gen7IdTimeResult,
  validateGen7IdTimeRequest,
} from "./timeDomain";
import { Gen7IdTimeUiPreviewEngine } from "./preview/Gen7IdTimeUiPreviewEngine";
import type {
  Gen7IdTimeProgress,
  Gen7IdTimeSearchEngine,
  Gen7IdTimeSummary,
} from "./timeSearch";
import { Gen7IdTimeWorker } from "./worker/Gen7IdTimeWorker";
import "./Gen7IdTimePanel.css";
import "../gen7wildtimefinder/Gen7WildTimePanel.css";

function CandidateSelect<T extends string | number>({
  disabled,
  label,
  onValueChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onValueChange(value: T): void;
  options: readonly AutoCompleteOption<T>[];
  value: T;
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "";
  const [inputValue, setInputValue] = useState(selectedLabel);
  return (
    <AutoCompleteComboBox
      disabled={disabled}
      inputValue={inputValue}
      label={label}
      onInputChange={setInputValue}
      onValueChange={(nextValue) => {
        onValueChange(nextValue);
        setInputValue(
          options.find((option) => option.value === nextValue)?.label ?? "",
        );
      }}
      options={options}
      value={value}
    />
  );
}

const VERSION_OPTIONS: readonly AutoCompleteOption<
  Gen7IdTimeRequest["version"]
>[] = [
  { value: "sun", label: "Sun" },
  { value: "moon", label: "Moon" },
  { value: "ultra-sun", label: "Ultra Sun" },
  { value: "ultra-moon", label: "Ultra Moon" },
];
const FILTER_OPTIONS: readonly AutoCompleteOption<
  "none" | "tid" | "sid" | "full" | "g7tid"
>[] = [
  { value: "none", label: "None" },
  { value: "tid", label: "TID" },
  { value: "sid", label: "SID" },
  { value: "full", label: "TID/SID" },
  { value: "g7tid", label: "Gen7TID" },
];

export function Gen7IdTimePanel({
  profile,
  uiPreviewMode,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen7IdTimeSearchEngine>(
    () =>
      uiPreviewMode ? new Gen7IdTimeUiPreviewEngine() : new Gen7IdTimeWorker(),
    [uiPreviewMode],
  );
  const [version, setVersion] = useState<Gen7IdTimeRequest["version"]>(() =>
    isThreeDsGen7Profile(profile) ? profile.version : "ultra-sun",
  );
  const [start, setStart] = useState("2024-01-01T00:00:00");
  const [end, setEnd] = useState("2024-01-01T00:00:01");
  const [tick, setTick] = useState("041D9CB9");
  const [offset, setOffset] = useState("55");
  const [minFrame, setMinFrame] = useState("1132");
  const [maxFrame, setMaxFrame] = useState("5000");
  const [correction, setCorrection] = useState("0");
  const [filterMode, setFilterMode] = useState<
    "none" | "tid" | "sid" | "full" | "g7tid"
  >("g7tid");
  const [idText, setIdText] = useState("");
  const [tsvText, setTsvText] = useState("");
  const [randText, setRandText] = useState("");
  const [regularExpression, setRegularExpression] = useState(false);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [results, setResults] = useState<Gen7IdTimeResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen7IdTimeProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen7IdTimeSummary>();
  const abortRef = useRef<AbortController | undefined>(undefined);
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });
  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    if (!isThreeDsGen7Profile(profile)) return;
    setVersion(profile.version);
    setMinFrame(
      profile.version === "sun" || profile.version === "moon" ? "1012" : "1132",
    );
  }, [profile]);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (running) return;
    const parsedOffset = Number(offset || 0);
    const startEpoch = gen7IdTimeEpochFromInput(start, parsedOffset);
    const endEpoch = gen7IdTimeEpochFromInput(end, parsedOffset);
    if (typeof startEpoch !== "bigint" || typeof endEpoch !== "bigint") {
      setError("Invalid date.");
      return;
    }
    const request: Gen7IdTimeRequest = {
      version,
      startEpoch,
      endEpoch,
      tick: Number.parseInt(tick || "0", 16),
      offset: parsedOffset,
      minFrame: Number(minFrame),
      maxFrame: Number(maxFrame),
      correction: Number(correction),
      filters: {
        mode: filterMode,
        disabled: filtersDisabled,
        regularExpression,
        idText,
        tsvText,
        randText,
      },
      resultLimit: 100_000,
    };
    try {
      validateGen7IdTimeRequest(request);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return;
    }
    setError("");
    setResults([]);
    setSummary(undefined);
    setRunning(true);
    abortRef.current = new AbortController();
    try {
      const next = await engine.search(request, {
        signal: abortRef.current?.signal,
        onBatch: (batch) => setResults((current) => [...current, ...batch]),
        onProgress: setProgress,
      });
      setSummary(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(false);
      abortRef.current = undefined;
    }
  };

  return (
    <section className="panel gen7-wild-time-panel gen7-id-time-panel">
      <form onSubmit={run}>
        <div className="form-grid">
          <label className="field">
            <span>{t("gen7GameVersion")}</span>
            <CandidateSelect
              disabled={running}
              label={t("gen7GameVersion")}
              onValueChange={(value) => {
                setVersion(value);
                setMinFrame(
                  value === "sun" || value === "moon" ? "1012" : "1132",
                );
              }}
              options={VERSION_OPTIONS}
              value={version}
            />
          </label>
          <label className="field">
            <span>{t("gen7TimeStart")}</span>
            <input
              disabled={running}
              type="datetime-local"
              step="1"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("gen7TimeEnd")}</span>
            <input
              disabled={running}
              type="datetime-local"
              step="1"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("gen7TimeTick")}</span>
            <input
              disabled={running}
              value={tick}
              onChange={(event) =>
                setTick(normalizeHexInput(event.target.value, 8))
              }
            />
          </label>
          <label className="field">
            <span>{t("gen7TimeOffset")}</span>
            <input
              disabled={running}
              value={offset}
              onChange={(event) =>
                setOffset(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                )
              }
            />
          </label>
          <label className="field">
            <span>{t("gen7StationaryMinFrame")}</span>
            <input
              disabled={running}
              max={GEN7_ID_TIME_MAX_FRAME}
              value={minFrame}
              onChange={(event) =>
                setMinFrame(
                  normalizeDecimalInput(
                    event.target.value,
                    GEN7_ID_TIME_MAX_FRAME,
                    10,
                  ),
                )
              }
            />
          </label>
          <label className="field">
            <span>{t("gen7StationaryMaxFrame")}</span>
            <input
              disabled={running}
              max={GEN7_ID_TIME_MAX_FRAME}
              value={maxFrame}
              onChange={(event) =>
                setMaxFrame(
                  normalizeDecimalInput(
                    event.target.value,
                    GEN7_ID_TIME_MAX_FRAME,
                    10,
                  ),
                )
              }
            />
          </label>
          <label className="field">
            <span>{t("gen7ClockCorrection")}</span>
            <input
              disabled={running}
              max="16"
              value={correction}
              onChange={(event) =>
                setCorrection(normalizeDecimalInput(event.target.value, 16, 2))
              }
            />
          </label>
        </div>
        <fieldset disabled={running || filtersDisabled}>
          <legend>{t("filters")}</legend>
          <div className="form-grid">
            <label className="field">
              <span>{t("gen7IdFilter")}</span>
              <CandidateSelect
                label={t("gen7IdFilter")}
                onValueChange={(value) => setFilterMode(value)}
                options={FILTER_OPTIONS}
                value={filterMode}
              />
            </label>
            <label className="field">
              <span>
                {filterMode === "none" ? "ID" : filterMode.toUpperCase()}
              </span>
              <textarea
                rows={3}
                spellCheck={false}
                value={idText}
                onChange={(event) => setIdText(event.target.value)}
              />
            </label>
            <label className="field">
              <span>TSV</span>
              <textarea
                rows={3}
                spellCheck={false}
                value={tsvText}
                onChange={(event) => setTsvText(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("gen7RandomNumber")}</span>
              <textarea
                rows={3}
                spellCheck={false}
                value={randText}
                onChange={(event) => setRandText(event.target.value)}
              />
            </label>
          </div>
        </fieldset>
        <div className="checkbox-field gen7-id-time-options">
          <label>
            <input
              checked={regularExpression}
              disabled={running || filtersDisabled}
              type="checkbox"
              onChange={(event) => setRegularExpression(event.target.checked)}
            />
            <span>Regular Expression</span>
          </label>
          <label>
            <input
              checked={filtersDisabled}
              disabled={running}
              type="checkbox"
              onChange={(event) => setFiltersDisabled(event.target.checked)}
            />
            <span>{t("disableFilters")}</span>
          </label>
        </div>
        <div className="button-row">
          <button className="primary-button" disabled={running} type="submit">
            <Play size={17} />
            {t("search")}
          </button>
          <button
            className="secondary-button"
            disabled={!running}
            type="button"
            onClick={() => abortRef.current?.abort()}
          >
            <Square size={16} />
            {t("cancel")}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setResults([])}
          >
            <Trash2 size={16} />
            {t("clear")}
          </button>
        </div>
      </form>
      {error && <p className="error-text">{error}</p>}
      <div className="metrics-row">
        <span>
          {t("results")} <strong>{progress.resultCount}</strong>
        </span>
        <span>
          {t("elapsed")}{" "}
          <strong>
            {summary ? `${summary.elapsedMs.toFixed(0)} ms` : "-"}
          </strong>
        </span>
        <span>{Math.round(progress.percent)}%</span>
      </div>
      <div className="results-table-wrap gen7-id-time-results" ref={tableRef}>
        {results.length === 0 ? (
          <div className="empty-state compact">
            <span>{t("emptyGen7Id")}</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("gen7TimeDate")}</th>
                <th>{t("gen7TimeInitialSeed")}</th>
                <th>{t("rowAdvance")}</th>
                <th>Gen7TID</th>
                <th>TID</th>
                <th>SID</th>
                <th>TSV</th>
                <th>{t("gen7Clock")}</th>
              </tr>
            </thead>
            <tbody
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((item) => {
                const result = results[item.index];
                return (
                  <tr
                    key={`${result.epoch}-${result.advances}-${result.rand64.toString()}`}
                    style={{
                      height: `${item.size}px`,
                      position: "absolute",
                      top: 0,
                      transform: `translateY(${item.start}px)`,
                      width: "100%",
                    }}
                  >
                    <td>
                      {formatGen7IdTimeEpoch(result.epoch, Number(offset || 0))}
                    </td>
                    <td>
                      {result.initialSeed
                        .toString(16)
                        .toUpperCase()
                        .padStart(8, "0")}
                    </td>
                    <td>{result.advances}</td>
                    <td>{result.g7tid.toString().padStart(6, "0")}</td>
                    <td>{result.tid.toString().padStart(5, "0")}</td>
                    <td>{result.sid.toString().padStart(5, "0")}</td>
                    <td>{result.tsv.toString().padStart(4, "0")}</td>
                    <td>{result.clock}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
