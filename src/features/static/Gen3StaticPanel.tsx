import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import type { Gen3Profile } from "../profiles/domain";
import {
  GEN3_STATIC_TEMPLATES,
  gen3HiddenPower,
  gen3StaticSearcherCombinationCount,
  validateGen3StaticRequest,
  validateGen3StaticSearcherRequest,
  type Gen3StaticAbilityFilter,
  type Gen3StaticGenderFilter,
  type Gen3StaticFilters,
  type Gen3StaticMethod,
  type Gen3StaticRequest,
  type Gen3StaticSearcherRequest,
  type Gen3StaticSearcherState,
  type Gen3StaticShinyFilter,
  type Gen3StaticState,
} from "./domain";
import { Gen3StaticUiPreviewEngine } from "./preview/Gen3StaticUiPreviewEngine";
import { Gen3StaticSearcherUiPreviewEngine } from "./preview/Gen3StaticSearcherUiPreviewEngine";
import type {
  Gen3StaticSearchEngine,
  Gen3StaticSearchProgress,
  Gen3StaticSearchSummary,
} from "./search";
import type { Gen3StaticSearcherEngine } from "./searcher";
import { Gen3StaticWorkerPool } from "./worker/Gen3StaticWorkerPool";
import { Gen3StaticSearcherWorkerPool } from "./worker/Gen3StaticSearcherWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type StaticOperation = "generator" | "searcher";
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type StaticSortKey =
  | "advances"
  | "seed"
  | "pid"
  | IvKey
  | "ability"
  | "gender"
  | "nature"
  | "shiny"
  | "hiddenPower"
  | "hiddenPowerStrength";
type StaticResultState = Gen3StaticState | Gen3StaticSearcherState;

interface Gen3StaticPanelProps {
  profile: Gen3Profile;
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
const hiddenPowerKeys = [
  "powerFighting",
  "powerFlying",
  "powerPoison",
  "powerGround",
  "powerRock",
  "powerBug",
  "powerGhost",
  "powerSteel",
  "powerFire",
  "powerWater",
  "powerGrass",
  "powerElectric",
  "powerPsychic",
  "powerIce",
  "powerDragon",
  "powerDark",
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
const commonStaticColumns: Array<{ key: StaticSortKey; label: string }> = [
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
  { key: "hiddenPower", label: "hiddenPower" },
  { key: "hiddenPowerStrength", label: "hiddenPowerStrength" },
];

function staticColumns(operation: StaticOperation) {
  return [
    operation === "generator"
      ? { key: "advances" as const, label: "rowAdvance" }
      : { key: "seed" as const, label: "seed" },
    ...commonStaticColumns,
  ];
}

function parseHex(value: string): number | undefined {
  const normalized = value.trim().replace(/^0x/i, "");
  if (normalized === "") return 0;
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

function stateValue(state: StaticResultState, key: StaticSortKey): number {
  const ivIndex = ivKeys.indexOf(key as IvKey);
  if (ivIndex >= 0) return state.ivs[ivIndex];
  if (key === "advances") return "advances" in state ? state.advances : 0;
  if (key === "seed") return "seed" in state ? state.seed : 0;
  if (key === "hiddenPower") return gen3HiddenPower(state.ivs).type;
  if (key === "hiddenPowerStrength") return gen3HiddenPower(state.ivs).power;
  return state[
    key as keyof Omit<Gen3StaticState, "advances" | "ivs">
  ] as number;
}

export function Gen3StaticPanel({
  profile,
  uiPreviewMode,
}: Gen3StaticPanelProps) {
  const { t } = useTranslation();
  const generatorEngine = useMemo<Gen3StaticSearchEngine>(
    () =>
      uiPreviewMode
        ? new Gen3StaticUiPreviewEngine()
        : new Gen3StaticWorkerPool(),
    [uiPreviewMode],
  );
  const searcherEngine = useMemo<Gen3StaticSearcherEngine>(
    () =>
      uiPreviewMode
        ? new Gen3StaticSearcherUiPreviewEngine()
        : new Gen3StaticSearcherWorkerPool(),
    [uiPreviewMode],
  );
  const [operation, setOperation] = useState<StaticOperation>("generator");
  const [template, setTemplate] = useState(GEN3_STATIC_TEMPLATES[0]);
  const [method, setMethod] = useState<Gen3StaticMethod>("method1");
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("0");
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen3StaticShinyFilter>("any");
  const [gender, setGender] = useState<Gen3StaticGenderFilter>("any");
  const [ability, setAbility] = useState<Gen3StaticAbilityFilter>("any");
  const [nature, setNature] = useState("-1");
  const [ivMin, setIvMin] = useState(["0", "0", "0", "0", "0", "0"]);
  const [ivMax, setIvMax] = useState(["31", "31", "31", "31", "31", "31"]);
  const [results, setResults] = useState<StaticResultState[]>([]);
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

  useEffect(
    () => () => {
      generatorEngine.dispose();
      searcherEngine.dispose();
    },
    [generatorEngine, searcherEngine],
  );
  useEffect(() => {
    if (profile.deadBattery) setSeed("5a0");
  }, [profile]);

  const columns = useMemo(() => staticColumns(operation), [operation]);

  const changeOperation = (nextOperation: StaticOperation) => {
    if (status === "calculating" || operation === nextOperation) return;
    setOperation(nextOperation);
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
    setStatus("ready");
    setError("");
    setSort({
      key: nextOperation === "generator" ? "advances" : "seed",
      direction: "asc",
    });
  };

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

  const applyIvShortcut = (index: number, event: MouseEvent) => {
    const [minimum, maximum] =
      event.ctrlKey && event.altKey
        ? ["0", "0"]
        : event.ctrlKey
          ? ["31", "31"]
          : event.altKey
            ? ["30", "31"]
            : ["0", "31"];
    updateIv("min", index, minimum);
    updateIv("max", index, maximum);
  };

  const readFilters = (disabled = false): Gen3StaticFilters =>
    disabled
      ? {
          shiny: "any",
          gender: "any",
          ability: "any",
          nature: -1,
          ivMin: [0, 0, 0, 0, 0, 0],
          ivMax: [31, 31, 31, 31, 31, 31],
        }
      : {
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
        };

  const readRequest = (): Gen3StaticRequest | undefined => {
    const request: Gen3StaticRequest = {
      seed: parseHex(seed) ?? Number.NaN,
      initialAdvances: parseDecimal(initialAdvances) ?? Number.NaN,
      maxAdvances: parseDecimal(maxAdvances) ?? Number.NaN,
      offset: parseDecimal(offset) ?? Number.NaN,
      method,
      template,
      tid: profile.tid,
      sid: profile.sid,
      filters: readFilters(filtersDisabled),
    };
    return validateGen3StaticRequest(request).length === 0
      ? request
      : undefined;
  };

  const readSearcherRequest = (): Gen3StaticSearcherRequest | undefined => {
    const request: Gen3StaticSearcherRequest = {
      method,
      template,
      tid: profile.tid,
      sid: profile.sid,
      filters: readFilters(),
    };
    return validateGen3StaticSearcherRequest(request).length === 0
      ? request
      : undefined;
  };

  const runCalculation = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const generatorRequest =
      operation === "generator" ? readRequest() : undefined;
    const searcherRequest =
      operation === "searcher" ? readSearcherRequest() : undefined;
    if (!generatorRequest && !searcherRequest) {
      setError(t("invalidStaticInput"));
      setStatus("failed");
      return;
    }

    setError("");
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: generatorRequest
        ? generatorRequest.maxAdvances + 1
        : gen3StaticSearcherCombinationCount(searcherRequest!),
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");

    try {
      const nextSummary = generatorRequest
        ? await generatorEngine.search(generatorRequest, {
            onBatch: (batch) => setResults((current) => current.concat(batch)),
            onProgress: setProgress,
          })
        : await searcherEngine.search(searcherRequest!, {
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

  const displayStateValue = (state: StaticResultState, key: StaticSortKey) => {
    if (key === "pid" || key === "seed")
      return formatHex(stateValue(state, key), 8);
    if (key === "gender") return displayGender(state.gender);
    if (key === "ability") return displayAbility(state.ability);
    if (key === "nature") return t(natureKeys[state.nature]);
    if (key === "shiny") return displayShiny(state.shiny);
    if (key === "hiddenPower")
      return t(hiddenPowerKeys[gen3HiddenPower(state.ivs).type]);
    return stateValue(state, key).toLocaleString();
  };

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      columns.map((column) => t(column.label)),
      ...sortedResults.map((state) =>
        columns.map((column) => displayStateValue(state, column.key)),
      ),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen3static-${operation}-${template.id}.csv`;
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
      <div
        aria-label={t("staticEngine")}
        className="operation-tabs"
        role="tablist"
      >
        <button
          aria-selected={operation === "generator"}
          className={operation === "generator" ? "active" : ""}
          disabled={status === "calculating"}
          onClick={() => changeOperation("generator")}
          role="tab"
          type="button"
        >
          {t("generator")}
        </button>
        <button
          aria-selected={operation === "searcher"}
          className={operation === "searcher" ? "active" : ""}
          disabled={status === "calculating"}
          onClick={() => changeOperation("searcher")}
          role="tab"
          type="button"
        >
          {t("searcher")}
        </button>
      </div>
      <form className="static-control-grid" onSubmit={runCalculation}>
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
            {operation === "generator" && (
              <>
                <label className="field">
                  <span>{t("seed")}</span>
                  <input
                    maxLength={8}
                    onChange={(event) =>
                      setSeed(normalizeHexInput(event.target.value, 8))
                    }
                    value={seed}
                  />
                  <small>HEX / 32-bit</small>
                </label>
                <div className="compact-field-row">
                  <label className="field">
                    <span>{t("initialAdvances")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) =>
                        setInitialAdvances(
                          normalizeDecimalInput(
                            event.target.value,
                            0xffff_ffff,
                            10,
                          ),
                        )
                      }
                      value={initialAdvances}
                    />
                  </label>
                  <label className="field">
                    <span>{t("maxAdvances")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) =>
                        setMaxAdvances(
                          normalizeDecimalInput(
                            event.target.value,
                            0xffff_ffff,
                            10,
                          ),
                        )
                      }
                      value={maxAdvances}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>{t("offset")}</span>
                  <input
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(event) =>
                      setOffset(
                        normalizeDecimalInput(
                          event.target.value,
                          0xffff_ffff,
                          10,
                        ),
                      )
                    }
                    value={offset}
                  />
                </label>
              </>
            )}
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {t(operation === "generator" ? "generate" : "search")}
            </button>
            {status === "calculating" && (
              <button
                className="secondary-action"
                onClick={() =>
                  operation === "generator"
                    ? generatorEngine.cancel()
                    : searcherEngine.cancel()
                }
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
          <fieldset
            className="filter-controls"
            disabled={operation === "generator" && filtersDisabled}
          >
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
                  <button
                    className="iv-shortcut"
                    onClick={(event) => applyIvShortcut(index, event)}
                    title={t("ivShortcutHint")}
                    type="button"
                  >
                    {t(`iv${key.charAt(0).toUpperCase()}${key.slice(1)}`)}
                  </button>
                  <input
                    aria-label={`${t(`iv${key.charAt(0).toUpperCase()}${key.slice(1)}`)} ${t("minimum")}`}
                    inputMode="numeric"
                    max="31"
                    min="0"
                    onChange={(event) =>
                      updateIv(
                        "min",
                        index,
                        normalizeDecimalInput(event.target.value, 31, 2),
                      )
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
                      updateIv(
                        "max",
                        index,
                        normalizeDecimalInput(event.target.value, 31, 2),
                      )
                    }
                    type="number"
                    value={ivMax[index]}
                  />
                </div>
              ))}
            </div>
          </fieldset>
          {operation === "generator" && (
            <label className="toggle-field disable-filters">
              <input
                checked={filtersDisabled}
                onChange={(event) => setFiltersDisabled(event.target.checked)}
                type="checkbox"
              />
              <span>{t("disableFilters")}</span>
            </label>
          )}
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
                {columns.map((column) => (
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
                    key={`${stateValue(state, operation === "generator" ? "advances" : "seed")}-${state.pid}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 38}px)`,
                    }}
                  >
                    {columns.map((column) => (
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
