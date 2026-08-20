import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  RESEARCHER_MAX_ADVANCES,
  RESEARCHER_MAX_WEB_STATES,
  createResearcherSeedWords,
  formatResearcherValue,
  isResearcher64Bit,
  normalizeResearcherLiteralInput,
  parseResearcherLiteral,
  researcherCurrentOperands,
  researcherDefaultCustom,
  researcherOperandLabels,
  researcherOperands,
  researcherOperators,
  researcherRngGroups,
  researcherRngLabels,
  researcherRngSeedCount,
  validateResearcherRequest,
  type ResearcherCustomSpec,
  type ResearcherRequest,
  type ResearcherRng,
  type ResearcherRow,
} from "./domain";
import { researcherLabels, researcherLocale } from "./labels";
import { ResearcherUiPreviewEngine } from "./preview/ResearcherUiPreviewEngine";
import {
  searchResearcherRows,
  type ResearcherEngine,
  type ResearcherSummary,
} from "./search";
import { ResearcherWorker } from "./worker/ResearcherWorker";
import "./ResearcherPanel.css";

type ResearcherGroup = (typeof researcherRngGroups)[number]["key"];
type ResearcherStatus =
  "ready" | "calculating" | "completed" | "cancelled" | "failed";

const defaultRngs: Record<ResearcherGroup, ResearcherRng> = {
  "32": "lcrng",
  "64": "bwrng",
  tiny: "tinymt",
  xorshift: "xorshift",
};

const defaultSeeds: Record<ResearcherGroup, string[]> = {
  "32": [""],
  "64": [""],
  tiny: ["", "", "", ""],
  xorshift: ["", ""],
};

function searchOperands(rng: ResearcherRng) {
  return [
    ...researcherCurrentOperands(rng),
    ...Array.from({ length: 10 }, (_, index) => index + 13),
  ];
}

function sanitizeCustoms(customs: ResearcherCustomSpec[], rng: ResearcherRng) {
  return customs.map((spec, index) => {
    const operands = researcherOperands(rng, index);
    const left = operands.includes(spec.left) ? spec.left : operands[0];
    const right =
      spec.right !== null && operands.includes(spec.right) ? spec.right : null;
    return {
      ...spec,
      left,
      right,
      enabled: spec.literalText.trim() !== "" || right !== null,
    };
  });
}

function parseSearchValue(text: string, hex: boolean) {
  const normalized = text.trim();
  if (normalized === "") return 0n;
  if (
    hex ? !/^[0-9a-f]{1,16}$/i.test(normalized) : !/^\d{1,16}$/.test(normalized)
  )
    return undefined;
  const value = BigInt(hex ? `0x${normalized}` : normalized);
  return value <= 0xffff_ffff_ffff_ffffn ? value : undefined;
}

function statusKey(status: ResearcherStatus) {
  return status;
}

export function ResearcherPanel({ uiPreviewMode }: { uiPreviewMode: boolean }) {
  const { i18n } = useTranslation();
  const locale = researcherLocale(i18n.language);
  const labels = researcherLabels(i18n.language);
  const engine = useMemo<ResearcherEngine>(
    () =>
      uiPreviewMode ? new ResearcherUiPreviewEngine() : new ResearcherWorker(),
    [uiPreviewMode],
  );
  const [group, setGroup] = useState<ResearcherGroup>("32");
  const [rngs, setRngs] = useState(defaultRngs);
  const [seeds, setSeeds] = useState(defaultSeeds);
  const rng = rngs[group];
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("1000");
  const [customs, setCustoms] = useState<ResearcherCustomSpec[]>(() =>
    Array.from({ length: 10 }, () => researcherDefaultCustom("lcrng")),
  );
  const [results, setResults] = useState<ResearcherRow[]>([]);
  const [resultRequest, setResultRequest] = useState<ResearcherRequest>();
  const [summary, setSummary] = useState<ResearcherSummary>();
  const [status, setStatus] = useState<ResearcherStatus>("ready");
  const [error, setError] = useState("");
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchHex, setSearchHex] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchOperand, setSearchOperand] = useState(2);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [searchNotice, setSearchNotice] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 40,
    overscan: 14,
  });

  useEffect(() => () => engine.dispose(), [engine]);

  const operandLabel = (operand: number) =>
    researcherOperandLabels[operand]?.[locale === "zh" ? "zh" : "en"] ??
    String(operand);

  const resetResults = () => {
    setResults([]);
    setResultRequest(undefined);
    setSummary(undefined);
    setProcessed(0);
    setTotal(0);
    setSelectedIndex(undefined);
    setSearchNotice("");
    setError("");
    setStatus("ready");
  };

  const chooseRng = (nextGroup: ResearcherGroup, nextRng: ResearcherRng) => {
    if (status === "calculating") return;
    setGroup(nextGroup);
    setRngs((current) => ({ ...current, [nextGroup]: nextRng }));
    setCustoms((current) => sanitizeCustoms(current, nextRng));
    setSearchOperand(searchOperands(nextRng)[0]);
    resetResults();
  };

  const moveRngTab = (index: number, key: string, container: HTMLElement) => {
    const tabs = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    let nextIndex: number;
    if (key === "ArrowLeft")
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (key === "Home") nextIndex = 0;
    else if (key === "End") nextIndex = tabs.length - 1;
    else return false;
    const nextGroup = researcherRngGroups[nextIndex].key;
    tabs[nextIndex]?.focus();
    chooseRng(nextGroup, rngs[nextGroup]);
    return true;
  };

  const selectResult = (index: number, focus = false) => {
    const nextIndex = Math.max(0, Math.min(results.length - 1, index));
    setSelectedIndex(nextIndex);
    rowVirtualizer.scrollToIndex(nextIndex, { align: "auto" });
    if (focus)
      requestAnimationFrame(() =>
        tableRef.current
          ?.querySelector<HTMLElement>(`[data-researcher-row="${nextIndex}"]`)
          ?.focus(),
      );
  };

  const updateSeed = (index: number, value: string) => {
    const digits = group === "64" || group === "xorshift" ? 16 : 8;
    setSeeds((current) => {
      const next = { ...current, [group]: [...current[group]] };
      next[group][index] = normalizeHexInput(value, digits);
      return next;
    });
  };

  const updateCustom = (
    index: number,
    patch: Partial<ResearcherCustomSpec>,
  ) => {
    setCustoms((current) => {
      const next = [...current];
      const spec = { ...next[index], ...patch };
      spec.literal = parseResearcherLiteral(spec.literalText, spec.hex) ?? 0n;
      spec.enabled = spec.literalText.trim() !== "" || spec.right !== null;
      next[index] = spec;
      return next;
    });
  };

  const readRequest = () => {
    const seedWords = createResearcherSeedWords(rng, seeds[group]);
    const initial = initialAdvances === "" ? 0 : Number(initialAdvances);
    const maximum = maxAdvances === "" ? 0 : Number(maxAdvances);
    if (!seedWords) return { error: labels.invalidInput };
    const nextCustoms: ResearcherCustomSpec[] = [];
    for (const spec of customs) {
      const literal = parseResearcherLiteral(spec.literalText, spec.hex);
      if (literal === undefined && spec.right === null)
        return { error: labels.invalidInput };
      nextCustoms.push({
        ...spec,
        literal: literal ?? 0n,
        enabled: spec.literalText.trim() !== "" || spec.right !== null,
      });
    }
    const request: ResearcherRequest = {
      rng,
      seedWords,
      initialAdvances: initial,
      maxAdvances: maximum,
      customs: nextCustoms,
    };
    const errors = validateResearcherRequest(request);
    if (errors.includes("maxAdvances") && maximum > RESEARCHER_MAX_WEB_STATES)
      return { error: labels.webLimit };
    if (errors.length > 0) return { error: labels.invalidInput };
    return { request };
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const parsed = readRequest();
    if (!parsed.request) {
      setError(parsed.error ?? labels.invalidInput);
      setStatus("failed");
      return;
    }
    const request = parsed.request;
    setResults([]);
    setResultRequest(request);
    setSummary(undefined);
    setSelectedIndex(undefined);
    setSearchNotice("");
    setError("");
    setProcessed(0);
    setTotal(request.maxAdvances);
    setStatus("calculating");
    try {
      const next = await engine.generate(request, {
        onBatch: (batch) => setResults((current) => current.concat(batch)),
        onProgress: (nextProcessed, nextTotal) => {
          setProcessed(nextProcessed);
          setTotal(nextTotal);
        },
      });
      setResults(next.rows);
      setProcessed(next.processedStates);
      setTotal(next.totalStates);
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const findResult = (next: boolean) => {
    if (!resultRequest || results.length === 0) return;
    const value = parseSearchValue(searchText, searchHex);
    if (value === undefined) {
      setSearchNotice(labels.invalidInput);
      return;
    }
    const start = next && selectedIndex !== undefined ? selectedIndex + 1 : 0;
    const result = searchResearcherRows(
      results,
      resultRequest,
      searchOperand,
      value,
      start,
    );
    if (!result) {
      setSearchNotice(labels.unableToFind);
      return;
    }
    setSelectedIndex(result.index);
    setSearchNotice("");
    rowVirtualizer.scrollToIndex(result.index, { align: "center" });
    requestAnimationFrame(() =>
      tableRef.current
        ?.querySelector<HTMLElement>(`[data-researcher-row="${result.index}"]`)
        ?.focus(),
    );
  };

  const progress = total === 0 ? 0 : Math.min(100, (processed / total) * 100);
  const rng64 = isResearcher64Bit(resultRequest?.rng ?? rng);
  const customFormats = resultRequest?.customs ?? customs;
  const tableColumns = rng64
    ? "88px 176px repeat(4, 116px) repeat(10, 116px)"
    : "88px 132px repeat(2, 108px) repeat(10, 116px)";
  const tableStyle = { gridTemplateColumns: tableColumns } as CSSProperties;
  const statusLabel = labels[statusKey(status)];

  return (
    <form className="researcher-layout" onSubmit={generate}>
      <div className="researcher-top-grid">
        <section className="panel researcher-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{labels.researcher}</h2>
            </div>
            <span className="panel-note">PRNG</span>
          </div>
          <div
            aria-orientation="horizontal"
            className="researcher-rng-tabs"
            role="tablist"
          >
            {researcherRngGroups.map((entry, index) => (
              <button
                aria-controls="researcher-rng-options"
                aria-selected={group === entry.key}
                className={group === entry.key ? "active" : ""}
                disabled={status === "calculating"}
                id={`researcher-rng-tab-${entry.key}`}
                key={entry.key}
                onClick={() => chooseRng(entry.key, rngs[entry.key])}
                onKeyDown={(event) => {
                  if (
                    moveRngTab(
                      index,
                      event.key,
                      event.currentTarget.parentElement!,
                    )
                  )
                    event.preventDefault();
                }}
                role="tab"
                tabIndex={group === entry.key ? 0 : -1}
                type="button"
              >
                {entry.label}
              </button>
            ))}
          </div>
          <div
            aria-labelledby={`researcher-rng-tab-${group}`}
            className="researcher-rng-fields"
            id="researcher-rng-options"
            role="tabpanel"
          >
            {researcherRngGroups.find((entry) => entry.key === group)!.values
              .length > 1 && (
              <label className="field researcher-rng-select">
                <span>{labels.rng}</span>
                <Select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    chooseRng(group, event.target.value as ResearcherRng)
                  }
                  value={rng}
                >
                  {researcherRngGroups
                    .find((entry) => entry.key === group)!
                    .values.map((value) => (
                      <option key={value} value={value}>
                        {researcherRngLabels[value]}
                      </option>
                    ))}
                </Select>
              </label>
            )}
            <div className="researcher-seed-grid">
              {Array.from(
                { length: researcherRngSeedCount(rng) },
                (_, index) => (
                  <label className="field" key={index}>
                    <span>
                      {researcherRngSeedCount(rng) === 1
                        ? labels.seed
                        : `${labels.seed} ${index}`}
                    </span>
                    <input
                      autoComplete="off"
                      disabled={status === "calculating"}
                      inputMode="text"
                      maxLength={
                        group === "64" || group === "xorshift" ? 16 : 8
                      }
                      onChange={(event) =>
                        updateSeed(index, event.target.value)
                      }
                      spellCheck={false}
                      value={seeds[group][index] ?? ""}
                    />
                  </label>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="panel researcher-parameters-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{labels.parameters}</h2>
            </div>
            <span
              aria-atomic="true"
              aria-live="polite"
              className={`run-status ${status}`}
              role="status"
            >
              {statusLabel}
            </span>
          </div>
          <div className="researcher-advance-grid">
            <label className="field">
              <span>{labels.initialAdvances}</span>
              <input
                disabled={status === "calculating"}
                inputMode="numeric"
                max={RESEARCHER_MAX_ADVANCES}
                maxLength={10}
                min="0"
                onChange={(event) =>
                  setInitialAdvances(
                    normalizeDecimalInput(
                      event.target.value,
                      RESEARCHER_MAX_ADVANCES,
                      10,
                    ),
                  )
                }
                value={initialAdvances}
              />
            </label>
            <label className="field">
              <span>{labels.maxAdvances}</span>
              <input
                disabled={status === "calculating"}
                inputMode="numeric"
                max={RESEARCHER_MAX_ADVANCES}
                maxLength={10}
                min="0"
                onChange={(event) =>
                  setMaxAdvances(
                    normalizeDecimalInput(
                      event.target.value,
                      RESEARCHER_MAX_ADVANCES,
                      10,
                    ),
                  )
                }
                value={maxAdvances}
              />
            </label>
          </div>
          <div className="panel-actions researcher-generate-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {labels.generate}
            </button>
            {status === "calculating" && (
              <button
                className="secondary-action"
                onClick={() => engine.cancel()}
                type="button"
              >
                {labels.cancel}
              </button>
            )}
          </div>
          <div className="researcher-search-section">
            <div className="researcher-section-title">{labels.search}</div>
            <div className="researcher-search-grid">
              <label className="field researcher-search-value">
                <span>{labels.searchValue}</span>
                <input
                  autoComplete="off"
                  inputMode="text"
                  maxLength={16}
                  onChange={(event) =>
                    setSearchText(normalizeHexInput(event.target.value, 16))
                  }
                  spellCheck={false}
                  value={searchText}
                />
              </label>
              <label className="field">
                <span>{labels.searchColumn}</span>
                <Select
                  onChange={(event) =>
                    setSearchOperand(Number(event.target.value))
                  }
                  value={searchOperand}
                >
                  {searchOperands(resultRequest?.rng ?? rng).map((operand) => (
                    <option key={operand} value={operand}>
                      {operandLabel(operand)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="researcher-hex-toggle">
                <input
                  checked={searchHex}
                  onChange={(event) => setSearchHex(event.target.checked)}
                  type="checkbox"
                />
                <span>{labels.valueHex}</span>
              </label>
            </div>
            <div className="researcher-search-actions">
              <button
                className="secondary-action"
                disabled={status === "calculating" || results.length === 0}
                onClick={() => findResult(false)}
                type="button"
              >
                {labels.search}
              </button>
              <button
                className="secondary-action"
                disabled={status === "calculating" || results.length === 0}
                onClick={() => findResult(true)}
                type="button"
              >
                {labels.next}
              </button>
              {searchNotice && (
                <span className="researcher-search-notice" role="status">
                  {searchNotice}
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="panel researcher-custom-panel">
        <div className="panel-heading researcher-custom-heading">
          <div>
            <span className="panel-index">03</span>
            <h2>{labels.customs}</h2>
          </div>
          <span className="panel-note">64Bit</span>
        </div>
        <div className="researcher-custom-scroll">
          <div className="researcher-custom-table">
            {customs.map((spec, index) => {
              const operands = researcherOperands(rng, index);
              return (
                <div
                  className={`researcher-custom-row ${spec.enabled ? "enabled" : ""}`}
                  key={index}
                >
                  <strong>{operandLabel(index + 13)}</strong>
                  <Select
                    aria-label={`${operandLabel(index + 13)} left`}
                    disabled={status === "calculating"}
                    onChange={(event) =>
                      updateCustom(index, { left: Number(event.target.value) })
                    }
                    value={spec.left}
                  >
                    {operands.map((operand) => (
                      <option key={operand} value={operand}>
                        {operandLabel(operand)}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label={`${operandLabel(index + 13)} operator`}
                    disabled={status === "calculating"}
                    onChange={(event) =>
                      updateCustom(index, {
                        operator: event.target
                          .value as ResearcherCustomSpec["operator"],
                      })
                    }
                    value={spec.operator}
                  >
                    {researcherOperators.map((operator) => (
                      <option key={operator} value={operator}>
                        {operator}
                      </option>
                    ))}
                  </Select>
                  <input
                    aria-label={`${operandLabel(index + 13)} ${labels.rightValue}`}
                    autoComplete="off"
                    disabled={status === "calculating"}
                    inputMode="text"
                    maxLength={10}
                    onChange={(event) =>
                      updateCustom(index, {
                        literalText: normalizeResearcherLiteralInput(
                          event.target.value,
                        ),
                      })
                    }
                    placeholder={labels.rightValue}
                    spellCheck={false}
                    value={spec.literalText}
                  />
                  <label className="researcher-custom-hex">
                    <input
                      checked={spec.hex}
                      disabled={status === "calculating"}
                      onChange={(event) =>
                        updateCustom(index, { hex: event.target.checked })
                      }
                      type="checkbox"
                    />
                    <span>{labels.hex}</span>
                  </label>
                  {index === 0 ? (
                    <span
                      className="researcher-custom-empty"
                      aria-hidden="true"
                    />
                  ) : (
                    <Select
                      aria-label={`${operandLabel(index + 13)} ${labels.rightOperand}`}
                      disabled={status === "calculating"}
                      onChange={(event) =>
                        updateCustom(index, {
                          right:
                            event.target.value === "0"
                              ? null
                              : Number(event.target.value),
                        })
                      }
                      value={spec.right ?? 0}
                    >
                      <option value="0">{operandLabel(0)}</option>
                      {operands.map((operand) => (
                        <option key={operand} value={operand}>
                          {operandLabel(operand)}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel results-panel researcher-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">04</span>
              <h2>{labels.results}</h2>
            </div>
          </div>
          <div className="result-actions">
            <span aria-live="polite" className="result-count" role="status">
              {results.length}
            </span>
            <button
              aria-label={labels.clear}
              className="icon-action"
              disabled={status === "calculating" || results.length === 0}
              onClick={resetResults}
              title={labels.clear}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
        <div
          aria-label={`${progress.toFixed(0)}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progress)}
          className="progress-track"
          role="progressbar"
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="metrics-row">
          <span>
            {labels.processed} <strong>{processed}</strong>
          </span>
          <span>
            {labels.workers} <strong>{summary?.workerCount ?? "-"}</strong>
          </span>
          <span>
            {labels.elapsed}{" "}
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
        <div className="table-shell researcher-table-shell" ref={tableRef}>
          {results.length === 0 ? (
            <div className="empty-state compact" role="status">
              <span>{labels.emptyResults}</span>
            </div>
          ) : (
            <div
              className="researcher-virtual-table"
              aria-colcount={rng64 ? 16 : 14}
              aria-rowcount={results.length}
              role="grid"
              style={{
                height: `${rowVirtualizer.getTotalSize() + 40}px`,
                minWidth: rng64 ? "1910px" : "1600px",
              }}
            >
              <div
                className="researcher-table-header"
                role="row"
                style={tableStyle}
              >
                <span role="columnheader">{labels.advances}</span>
                {rng64 ? (
                  <>
                    <span role="columnheader">{operandLabel(1)}</span>
                    <span role="columnheader">{operandLabel(3)}</span>
                    <span role="columnheader">{operandLabel(4)}</span>
                    <span role="columnheader">{operandLabel(5)}</span>
                    <span role="columnheader">{operandLabel(6)}</span>
                  </>
                ) : (
                  <>
                    <span role="columnheader">{operandLabel(2)}</span>
                    <span role="columnheader">{operandLabel(5)}</span>
                    <span role="columnheader">{operandLabel(6)}</span>
                  </>
                )}
                {Array.from({ length: 10 }, (_, index) => (
                  <span key={index} role="columnheader">
                    {operandLabel(index + 13)}
                  </span>
                ))}
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = results[virtualRow.index];
                const high32 = row.prng >> 32n;
                const low32 = row.prng & 0xffff_ffffn;
                const high16 = rng64 ? row.prng >> 48n : row.prng >> 16n;
                const low16 = rng64
                  ? (row.prng >> 32n) & 0xffffn
                  : row.prng & 0xffffn;
                return (
                  <div
                    aria-selected={selectedIndex === virtualRow.index}
                    className={`researcher-table-row ${
                      selectedIndex === virtualRow.index ? "selected" : ""
                    }`}
                    data-researcher-row={virtualRow.index}
                    key={`${row.advances}-${virtualRow.index}`}
                    onClick={() => selectResult(virtualRow.index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedIndex(virtualRow.index);
                      } else if (event.key === "ArrowDown") {
                        event.preventDefault();
                        selectResult(virtualRow.index + 1, true);
                      } else if (event.key === "ArrowUp") {
                        event.preventDefault();
                        selectResult(virtualRow.index - 1, true);
                      } else if (event.key === "Home") {
                        event.preventDefault();
                        selectResult(0, true);
                      } else if (event.key === "End") {
                        event.preventDefault();
                        selectResult(results.length - 1, true);
                      }
                    }}
                    role="row"
                    style={{
                      ...tableStyle,
                      transform: `translateY(${virtualRow.start + 40}px)`,
                    }}
                    tabIndex={
                      selectedIndex === virtualRow.index ||
                      (selectedIndex === undefined && virtualRow.index === 0)
                        ? 0
                        : -1
                    }
                  >
                    <span role="cell">{row.advances}</span>
                    {rng64 ? (
                      <>
                        <span role="cell">
                          {formatResearcherValue(row.prng, true, 16)}
                        </span>
                        <span role="cell">
                          {formatResearcherValue(high32, true, 8)}
                        </span>
                        <span role="cell">
                          {formatResearcherValue(low32, true, 8)}
                        </span>
                        <span role="cell">
                          {formatResearcherValue(high16, true, 4)}
                        </span>
                        <span role="cell">
                          {formatResearcherValue(low16, true, 4)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span role="cell">
                          {formatResearcherValue(row.prng, true, 8)}
                        </span>
                        <span role="cell">
                          {formatResearcherValue(high16, true, 4)}
                        </span>
                        <span role="cell">
                          {formatResearcherValue(low16, true, 4)}
                        </span>
                      </>
                    )}
                    {row.customs.map((value, index) => (
                      <span key={index} role="cell">
                        {formatResearcherValue(
                          value,
                          customFormats[index]?.hex ?? false,
                        )}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </form>
  );
}
