import { useVirtualizer } from "@tanstack/react-virtual";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GEN3_STATIC_TEMPLATES,
  validateGen3StaticRequest,
  type Gen3StaticAbilityFilter,
  type Gen3StaticGenderFilter,
  type Gen3StaticMethod,
  type Gen3StaticRequest,
  type Gen3StaticShinyFilter,
  type Gen3StaticState,
} from "./domain";
import { Gen3StaticUiPreviewEngine } from "./preview/Gen3StaticUiPreviewEngine";
import type {
  Gen3StaticSearchEngine,
  Gen3StaticSearchProgress,
  Gen3StaticSearchSummary,
} from "./search";
import { Gen3StaticWorkerPool } from "./worker/Gen3StaticWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type StaticSortKey =
  | "advances"
  | "pid"
  | IvKey
  | "ability"
  | "gender"
  | "nature"
  | "shiny"
  | "level";

interface Gen3StaticPanelProps {
  uiPreviewMode: boolean;
}

const ivKeys: IvKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];
const natureKeys = [
  "natureHardy",
  "natureLonely",
  "natureBrave",
  "natureAdamant",
  "natureNaughty",
  "natureBold",
  "natureDocile",
  "natureRelaxed",
  "natureImpish",
  "natureLax",
  "natureTimid",
  "natureHasty",
  "natureSerious",
  "natureJolly",
  "natureNaive",
  "natureModest",
  "natureMild",
  "natureQuiet",
  "natureBashful",
  "natureRash",
  "natureCalm",
  "natureGentle",
  "natureSassy",
  "natureCareful",
  "natureQuirky",
] as const;
const templateNameKeys: Record<string, string> = {
  mewtwo: "pokemonMewtwo",
  rayquaza: "pokemonRayquaza",
  regirock: "pokemonRegirock",
  regice: "pokemonRegice",
  registeel: "pokemonRegisteel",
  deoxys: "pokemonDeoxys",
  latios: "pokemonLatios",
  latias: "pokemonLatias",
};
const staticColumns: Array<{ key: StaticSortKey; label: string }> = [
  { key: "advances", label: "rowAdvance" },
  { key: "pid", label: "rowPid" },
  { key: "hp", label: "ivHp" },
  { key: "attack", label: "ivAttack" },
  { key: "defense", label: "ivDefense" },
  { key: "specialAttack", label: "ivSpecialAttack" },
  { key: "specialDefense", label: "ivSpecialDefense" },
  { key: "speed", label: "ivSpeed" },
  { key: "ability", label: "ability" },
  { key: "gender", label: "gender" },
  { key: "nature", label: "nature" },
  { key: "shiny", label: "shiny" },
  { key: "level", label: "level" },
];

function parseHex(value: string): number | undefined {
  const normalized = value.trim().replace(/^0x/i, "");
  if (!/^[0-9a-f]{1,8}$/i.test(normalized)) return undefined;
  return Number.parseInt(normalized, 16);
}

function parseDecimal(value: string): number | undefined {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return undefined;
  return Number.parseInt(normalized, 10);
}

function formatHex(value: number, width: number): string {
  return value.toString(16).toUpperCase().padStart(width, "0");
}

function stateValue(state: Gen3StaticState, key: StaticSortKey): number {
  const ivIndex = ivKeys.indexOf(key as IvKey);
  return ivIndex >= 0
    ? state.ivs[ivIndex]
    : (state[key as keyof Gen3StaticState] as number);
}

export function Gen3StaticPanel({ uiPreviewMode }: Gen3StaticPanelProps) {
  const { t } = useTranslation();
  const searchEngine = useMemo<Gen3StaticSearchEngine>(
    () =>
      uiPreviewMode
        ? new Gen3StaticUiPreviewEngine()
        : new Gen3StaticWorkerPool(),
    [uiPreviewMode],
  );
  const [template, setTemplate] = useState(GEN3_STATIC_TEMPLATES[0]);
  const [method, setMethod] = useState<Gen3StaticMethod>("method1");
  const [seed, setSeed] = useState("12345678");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("0");
  const [tid, setTid] = useState("0");
  const [sid, setSid] = useState("0");
  const [shiny, setShiny] = useState<Gen3StaticShinyFilter>("any");
  const [gender, setGender] = useState<Gen3StaticGenderFilter>("any");
  const [ability, setAbility] = useState<Gen3StaticAbilityFilter>("any");
  const [nature, setNature] = useState("-1");
  const [ivMin, setIvMin] = useState(["0", "0", "0", "0", "0", "0"]);
  const [ivMax, setIvMax] = useState(["31", "31", "31", "31", "31", "31"]);
  const [results, setResults] = useState<Gen3StaticState[]>([]);
  const [progress, setProgress] = useState<Gen3StaticSearchProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen3StaticSearchSummary>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{
    key: StaticSortKey;
    direction: "asc" | "desc";
  }>({ key: "advances", direction: "asc" });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => searchEngine.dispose(), [searchEngine]);

  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        (stateValue(left, sort.key) - stateValue(right, sort.key)) * multiplier,
    );
  }, [results, sort]);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const selectTemplate = (templateId: string) => {
    const nextTemplate = GEN3_STATIC_TEMPLATES.find(
      (entry) => entry.id === templateId,
    );
    if (!nextTemplate) return;
    setTemplate(nextTemplate);
    if (nextTemplate.buggedRoamer) setMethod("method1");
  };

  const updateIv = (kind: "min" | "max", index: number, value: string) => {
    const setter = kind === "min" ? setIvMin : setIvMax;
    setter((current) =>
      current.map((entry, currentIndex) =>
        currentIndex === index ? value : entry,
      ),
    );
  };

  const readRequest = (): Gen3StaticRequest | undefined => {
    const request: Gen3StaticRequest = {
      seed: parseHex(seed) ?? Number.NaN,
      initialAdvances: parseDecimal(initialAdvances) ?? Number.NaN,
      maxAdvances: parseDecimal(maxAdvances) ?? Number.NaN,
      offset: parseDecimal(offset) ?? Number.NaN,
      method,
      template,
      tid: parseDecimal(tid) ?? Number.NaN,
      sid: parseDecimal(sid) ?? Number.NaN,
      filters: {
        shiny,
        gender,
        ability,
        nature: Number.parseInt(nature, 10),
        ivMin: ivMin.map((value) => parseDecimal(value) ?? Number.NaN) as [
          number,
          number,
          number,
          number,
          number,
          number,
        ],
        ivMax: ivMax.map((value) => parseDecimal(value) ?? Number.NaN) as [
          number,
          number,
          number,
          number,
          number,
          number,
        ],
      },
    };
    return validateGen3StaticRequest(request).length === 0
      ? request
      : undefined;
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request = readRequest();
    if (!request) {
      setError(t("invalidStaticInput"));
      setStatus("failed");
      return;
    }

    setError("");
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: request.maxAdvances + 1,
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");

    try {
      const nextSummary = await searchEngine.search(request, {
        onBatch: (batch) => setResults((current) => current.concat(batch)),
        onProgress: setProgress,
      });
      setSummary(nextSummary);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const displayGender = (value: number) =>
    t(value === 0 ? "male" : value === 1 ? "female" : "genderless");
  const displayAbility = (value: number) =>
    t(value === 0 ? "abilityFirst" : "abilitySecond");
  const displayShiny = (value: number) =>
    t(value === 0 ? "shinyNone" : value === 1 ? "shinyStar" : "shinySquare");

  const displayStateValue = (state: Gen3StaticState, key: StaticSortKey) => {
    if (key === "pid") return formatHex(state.pid, 8);
    if (key === "gender") return displayGender(state.gender);
    if (key === "ability") return displayAbility(state.ability);
    if (key === "nature") return t(natureKeys[state.nature]);
    if (key === "shiny") return displayShiny(state.shiny);
    return stateValue(state, key).toLocaleString();
  };

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      staticColumns.map((column) => t(column.label)),
      ...sortedResults.map((state) =>
        staticColumns.map((column) => displayStateValue(state, column.key)),
      ),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen3static-${template.id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: StaticSortKey) => {
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
  };

  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];

  return (
    <>
      <form className="static-control-grid" onSubmit={generate}>
        <section className="panel static-panel static-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">PokeFinder / Static3</span>
          </div>
          <div className="static-form-stack">
            <div className="mode-tabs static-method-tabs" role="tablist">
              <button
                className={
                  method === "method1" ? "mode-tab active" : "mode-tab"
                }
                onClick={() => setMethod("method1")}
                role="tab"
                type="button"
              >
                {t("method1")}
              </button>
              <button
                className={
                  method === "method4" ? "mode-tab active" : "mode-tab"
                }
                disabled={template.buggedRoamer}
                onClick={() => setMethod("method4")}
                role="tab"
                type="button"
              >
                {t("method4")}
              </button>
            </div>
            <label className="field">
              <span>{t("seed")}</span>
              <input
                maxLength={10}
                onChange={(event) => setSeed(event.target.value)}
                value={seed}
              />
              <small>HEX / 32-bit</small>
            </label>
            <div className="compact-field-row">
              <label className="field">
                <span>{t("initialAdvances")}</span>
                <input
                  inputMode="numeric"
                  onChange={(event) => setInitialAdvances(event.target.value)}
                  value={initialAdvances}
                />
              </label>
              <label className="field">
                <span>{t("maxAdvances")}</span>
                <input
                  inputMode="numeric"
                  onChange={(event) => setMaxAdvances(event.target.value)}
                  value={maxAdvances}
                />
              </label>
            </div>
            <label className="field">
              <span>{t("offset")}</span>
              <input
                inputMode="numeric"
                onChange={(event) => setOffset(event.target.value)}
                value={offset}
              />
            </label>
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {t("generate")}
            </button>
            {status === "calculating" && (
              <button
                className="secondary-action"
                onClick={() => searchEngine.cancel()}
                type="button"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </section>

        <section className="panel static-panel static-settings-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("settings")}</h2>
            </div>
            <span className="panel-note">Profile / Encounter</span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("pokemon")}</span>
              <select
                onChange={(event) => selectTemplate(event.target.value)}
                value={template.id}
              >
                {(["legends", "events", "roamers"] as const).map((category) => (
                  <optgroup key={category} label={t(category)}>
                    {GEN3_STATIC_TEMPLATES.filter(
                      (entry) => entry.category === category,
                    ).map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {t(templateNameKeys[entry.id])}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="static-encounter-meta">
              <div>
                <span>{t("category")}</span>
                <strong>{t(template.category)}</strong>
              </div>
              <div>
                <span>{t("level")}</span>
                <strong>{template.level}</strong>
              </div>
              <div>
                <span>{t("species")}</span>
                <strong>#{template.species}</strong>
              </div>
            </div>
            {template.buggedRoamer && (
              <div className="inline-notice">{t("roamerNotice")}</div>
            )}
            <div className="compact-field-row">
              <label className="field">
                <span>{t("tid")}</span>
                <input
                  inputMode="numeric"
                  onChange={(event) => setTid(event.target.value)}
                  value={tid}
                />
                <small>DEC / 0 - 65535</small>
              </label>
              <label className="field">
                <span>{t("sid")}</span>
                <input
                  inputMode="numeric"
                  onChange={(event) => setSid(event.target.value)}
                  value={sid}
                />
                <small>DEC / 0 - 65535</small>
              </label>
            </div>
          </div>
        </section>

        <section className="panel static-panel static-filter-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">03</span>
              <h2>{t("filters")}</h2>
            </div>
            <span className="panel-note">AND / range</span>
          </div>
          <div className="static-filter-selects">
            <label className="field">
              <span>{t("nature")}</span>
              <select
                onChange={(event) => setNature(event.target.value)}
                value={nature}
              >
                <option value="-1">{t("any")}</option>
                {natureKeys.map((key, index) => (
                  <option key={key} value={index}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("shiny")}</span>
              <select
                onChange={(event) =>
                  setShiny(event.target.value as Gen3StaticShinyFilter)
                }
                value={shiny}
              >
                <option value="any">{t("any")}</option>
                <option value="none">{t("shinyNone")}</option>
                <option value="shiny">{t("shinyAny")}</option>
                <option value="star">{t("shinyStar")}</option>
                <option value="square">{t("shinySquare")}</option>
              </select>
            </label>
            <label className="field">
              <span>{t("gender")}</span>
              <select
                onChange={(event) =>
                  setGender(event.target.value as Gen3StaticGenderFilter)
                }
                value={gender}
              >
                <option value="any">{t("any")}</option>
                <option value="male">{t("male")}</option>
                <option value="female">{t("female")}</option>
                <option value="genderless">{t("genderless")}</option>
              </select>
            </label>
            <label className="field">
              <span>{t("ability")}</span>
              <select
                onChange={(event) =>
                  setAbility(event.target.value as Gen3StaticAbilityFilter)
                }
                value={ability}
              >
                <option value="any">{t("any")}</option>
                <option value="first">{t("abilityFirst")}</option>
                <option value="second">{t("abilitySecond")}</option>
              </select>
            </label>
          </div>
          <div className="iv-filter">
            <div className="iv-filter-header">
              <span>{t("ivs")}</span>
              <span>{t("minimum")}</span>
              <span>{t("maximum")}</span>
            </div>
            {ivKeys.map((key, index) => (
              <div className="iv-filter-row" key={key}>
                <span>
                  {t(`iv${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                </span>
                <input
                  aria-label={`${t(`iv${key.charAt(0).toUpperCase()}${key.slice(1)}`)} ${t("minimum")}`}
                  inputMode="numeric"
                  max="31"
                  min="0"
                  onChange={(event) =>
                    updateIv("min", index, event.target.value)
                  }
                  type="number"
                  value={ivMin[index]}
                />
                <input
                  aria-label={`${t(`iv${key.charAt(0).toUpperCase()}${key.slice(1)}`)} ${t("maximum")}`}
                  inputMode="numeric"
                  max="31"
                  min="0"
                  onChange={(event) =>
                    updateIv("max", index, event.target.value)
                  }
                  type="number"
                  value={ivMax[index]}
                />
              </div>
            ))}
          </div>
        </section>
      </form>

      <section className="panel results-panel static-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">04</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{statusLabel}</span>
          </div>
          <div className="result-actions">
            <span className="result-count">
              {results.length.toLocaleString()} /{" "}
              {progress.totalStates.toLocaleString()}
            </span>
            <button
              className="secondary-action"
              disabled={results.length === 0}
              onClick={exportCsv}
              type="button"
            >
              {t("exportCsv")}
            </button>
            <button
              aria-label={t("clear")}
              className="icon-action"
              disabled={results.length === 0}
              onClick={() => setResults([])}
              title={t("clear")}
              type="button"
            >
              &times;
            </button>
          </div>
        </div>
        <div
          className="progress-track"
          aria-label={`${progress.percent.toFixed(1)}%`}
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
          <div className="alert error">
            {error.includes("Wasm") || error.includes("wasm")
              ? t("staticWasmMissing")
              : error}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="alert warning">{t("limitReached")}</div>
        )}
        <div className="table-shell static-table-shell" ref={scrollRef}>
          {sortedResults.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyStatic")}</span>
            </div>
          ) : (
            <div
              className="static-virtual-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 38}px` }}
            >
              <div className="static-table-header">
                {staticColumns.map((column) => (
                  <button
                    key={column.key}
                    onClick={() => toggleSort(column.key)}
                    type="button"
                  >
                    {t(column.label)}
                    {sort.key === column.key
                      ? sort.direction === "asc"
                        ? " +"
                        : " -"
                      : ""}
                  </button>
                ))}
              </div>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const state = sortedResults[virtualRow.index];
                return (
                  <div
                    className="static-table-row"
                    key={`${state.advances}-${state.pid}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 38}px)`,
                    }}
                  >
                    {staticColumns.map((column) => (
                      <span key={column.key}>
                        {displayStateValue(state, column.key)}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
