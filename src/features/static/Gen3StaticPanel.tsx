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
import { getGen3AbilityName } from "../shared/gen3Abilities";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { getGen3Personal } from "../shared/gen3Personal";
import { getGen3SpeciesName } from "../shared/gen3Species";
import { computeGen3Stats } from "../shared/gen3Stats";
import {
  gen3HiddenPower,
  gen3StaticSearcherCombinationCount,
  GEN3_STATIC_MAX_TOTAL_STATES,
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
import {
  gen3StaticCategoriesForVersion,
  gen3StaticTemplatesForVersion,
  type Gen3StaticCategory,
} from "./encounters";
import { Gen3StaticSearcherUiPreviewEngine } from "./preview/Gen3StaticSearcherUiPreviewEngine";
import { Gen3StaticUiPreviewEngine } from "./preview/Gen3StaticUiPreviewEngine";
import type {
  Gen3StaticSearchEngine,
  Gen3StaticSearchProgress,
  Gen3StaticSearchSummary,
} from "./search";
import type { Gen3StaticSearcherEngine } from "./searcher";
import { Gen3StaticSearcherWorkerPool } from "./worker/Gen3StaticSearcherWorkerPool";
import { Gen3StaticWorkerPool } from "./worker/Gen3StaticWorkerPool";

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
type IvTextValues = [string, string, string, string, string, string];

interface IvRanges {
  min: IvTextValues;
  max: IvTextValues;
}

interface Gen3StaticPanelProps {
  profile: Gen3Profile;
  uiPreviewMode: boolean;
  onOpenIvCalculator(): void;
}

const NATURE_MASK_ALL = 0x1ff_ffff;
const HIDDEN_POWER_MASK_ALL = 0xffff;
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
const commonStaticColumns: Array<{ key: StaticSortKey; label: string }> = [
  { key: "pid", label: "rowPid" },
  { key: "shiny", label: "shiny" },
  { key: "nature", label: "nature" },
  { key: "ability", label: "ability" },
  { key: "hp", label: "ivHp" },
  { key: "attack", label: "ivAttack" },
  { key: "defense", label: "ivDefense" },
  { key: "specialAttack", label: "ivSpecialAttack" },
  { key: "specialDefense", label: "ivSpecialDefense" },
  { key: "speed", label: "ivSpeed" },
  { key: "hiddenPower", label: "hiddenPowerType" },
  { key: "hiddenPowerStrength", label: "hiddenPowerStrength" },
  { key: "gender", label: "gender" },
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

function ivLabelKey(key: IvKey) {
  return `iv${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

export function Gen3StaticPanel({
  onOpenIvCalculator,
  profile,
  uiPreviewMode,
}: Gen3StaticPanelProps) {
  const { t, i18n } = useTranslation();
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
  const [category, setCategory] = useState<Gen3StaticCategory>("starters");
  const [templateId, setTemplateId] = useState("");
  const [method, setMethod] = useState<Gen3StaticMethod>("method1");
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("0");
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen3StaticShinyFilter>("any");
  const [gender, setGender] = useState<Gen3StaticGenderFilter>("any");
  const [ability, setAbility] = useState<Gen3StaticAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(0);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [ivRanges, setIvRanges] = useState<Record<StaticOperation, IvRanges>>({
    generator: {
      min: ["0", "0", "0", "0", "0", "0"],
      max: ["31", "31", "31", "31", "31", "31"],
    },
    searcher: {
      min: ["31", "31", "31", "31", "31", "31"],
      max: ["31", "31", "31", "31", "31", "31"],
    },
  });
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

  const categories = useMemo(
    () => gen3StaticCategoriesForVersion(profile.version),
    [profile.version],
  );
  const activeCategory = categories.includes(category)
    ? category
    : categories[0];
  const templates = useMemo(
    () => gen3StaticTemplatesForVersion(profile.version, activeCategory),
    [activeCategory, profile.version],
  );
  const template =
    templates.find((entry) => entry.id === templateId) ?? templates[0];
  const columns = useMemo(() => staticColumns(operation), [operation]);
  const natureOptions = natureKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const hiddenPowerOptions = hiddenPowerKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const activeIvRanges = ivRanges[operation];
  const personal = getGen3Personal(template.species, template.form);
  const resultPersonal = useRef(personal);

  useEffect(
    () => () => {
      generatorEngine.dispose();
      searcherEngine.dispose();
    },
    [generatorEngine, searcherEngine],
  );
  useEffect(() => {
    if (profile.deadBattery) setSeed("5A0");
  }, [profile]);
  useEffect(() => {
    if (category !== activeCategory) setCategory(activeCategory);
  }, [activeCategory, category]);
  useEffect(() => {
    if (template.id !== templateId) setTemplateId(template.id);
    if (template.buggedRoamer) setMethod("method1");
  }, [template, templateId]);

  const stateValue = (state: StaticResultState, key: StaticSortKey): number => {
    const ivIndex = ivKeys.indexOf(key as IvKey);
    if (ivIndex >= 0) {
      return showStats
        ? computeGen3Stats(
            resultPersonal.current.stats,
            state.ivs,
            state.nature,
            state.level,
          )[ivIndex]
        : state.ivs[ivIndex];
    }
    if (key === "advances") return "advances" in state ? state.advances : 0;
    if (key === "seed") return "seed" in state ? state.seed : 0;
    if (key === "hiddenPower") return gen3HiddenPower(state.ivs).type;
    if (key === "hiddenPowerStrength") return gen3HiddenPower(state.ivs).power;
    return state[
      key as keyof Omit<Gen3StaticState, "advances" | "ivs">
    ] as number;
  };

  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        (stateValue(left, sort.key) - stateValue(right, sort.key)) * multiplier,
    );
    // The selected encounter and display mode change the derived stat columns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personal, results, showStats, sort]);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const resetRunState = (nextOperation: StaticOperation) => {
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

  const updateIv = (kind: "min" | "max", index: number, value: string) => {
    setIvRanges((current) => ({
      ...current,
      [operation]: {
        ...current[operation],
        [kind]: current[operation][kind].map((entry, currentIndex) =>
          currentIndex === index ? value : entry,
        ) as IvTextValues,
      },
    }));
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
    setIvRanges((current) => ({
      ...current,
      [operation]: {
        min: current[operation].min.map((entry, currentIndex) =>
          currentIndex === index ? minimum : entry,
        ) as IvTextValues,
        max: current[operation].max.map((entry, currentIndex) =>
          currentIndex === index ? maximum : entry,
        ) as IvTextValues,
      },
    }));
  };

  const readFilters = (disabled = false): Gen3StaticFilters => ({
    shiny: disabled ? "any" : shiny,
    gender: disabled ? "any" : gender,
    ability: disabled ? "any" : ability,
    natureMask: disabled ? NATURE_MASK_ALL : natureMask || NATURE_MASK_ALL,
    hiddenPowerMask: disabled
      ? HIDDEN_POWER_MASK_ALL
      : hiddenPowerMask || HIDDEN_POWER_MASK_ALL,
    ivMin: (disabled
      ? [0, 0, 0, 0, 0, 0]
      : activeIvRanges.min.map(
          (value) => parseDecimal(value) ?? Number.NaN,
        )) as Gen3StaticFilters["ivMin"],
    ivMax: (disabled
      ? [31, 31, 31, 31, 31, 31]
      : activeIvRanges.max.map(
          (value) => parseDecimal(value) ?? Number.NaN,
        )) as Gen3StaticFilters["ivMax"],
  });

  const readRequest = (): Gen3StaticRequest => ({
    seed: parseHex(seed) ?? Number.NaN,
    initialAdvances: parseDecimal(initialAdvances) ?? Number.NaN,
    maxAdvances: parseDecimal(maxAdvances) ?? Number.NaN,
    offset: parseDecimal(offset) ?? Number.NaN,
    method,
    template,
    tid: profile.tid,
    sid: profile.sid,
    filters: readFilters(filtersDisabled),
  });

  const readSearcherRequest = (): Gen3StaticSearcherRequest => ({
    method,
    template,
    tid: profile.tid,
    sid: profile.sid,
    filters: readFilters(),
  });

  const runCalculation = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const generatorRequest =
      operation === "generator" ? readRequest() : undefined;
    const searcherRequest =
      operation === "searcher" ? readSearcherRequest() : undefined;
    const validationErrors = generatorRequest
      ? validateGen3StaticRequest(generatorRequest)
      : validateGen3StaticSearcherRequest(searcherRequest!);
    if (validationErrors.length > 0) {
      setError(
        validationErrors.includes("searchRange")
          ? t("staticSearchRangeTooLarge", {
              count: String(
                gen3StaticSearcherCombinationCount(searcherRequest!),
              ),
              limit: String(GEN3_STATIC_MAX_TOTAL_STATES),
            })
          : t("invalidStaticInput"),
      );
      setStatus("failed");
      return;
    }

    setError("");
    resultPersonal.current = personal;
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

  const displayStateValue = (state: StaticResultState, key: StaticSortKey) => {
    if (key === "pid" || key === "seed") {
      return formatHex(stateValue(state, key), 8);
    }
    if (key === "gender") {
      return t(
        state.gender === 0
          ? "male"
          : state.gender === 1
            ? "female"
            : "genderless",
      );
    }
    if (key === "ability") {
      const abilityId = resultPersonal.current.abilities[state.ability];
      return `${state.ability}: ${getGen3AbilityName(i18n.language, abilityId)}`;
    }
    if (key === "nature") return t(natureKeys[state.nature]);
    if (key === "shiny") {
      return t(
        state.shiny === 0
          ? "no"
          : state.shiny === 1
            ? "shinyStar"
            : "shinySquare",
      );
    }
    if (key === "hiddenPower") {
      return t(hiddenPowerKeys[gen3HiddenPower(state.ivs).type]);
    }
    return String(stateValue(state, key));
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
        {(["generator", "searcher"] as const).map((entry) => (
          <button
            aria-selected={operation === entry}
            className={operation === entry ? "active" : ""}
            disabled={status === "calculating"}
            key={entry}
            onClick={() => {
              if (operation !== entry) resetRunState(entry);
            }}
            role="tab"
            type="button"
          >
            {t(entry)}
          </button>
        ))}
      </div>

      <form
        className="static-control-grid gen3static-control-grid"
        onSubmit={runCalculation}
      >
        <section className="panel static-panel static-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">PokeFinder / Static3</span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("method")}</span>
              <select
                onChange={(event) =>
                  setMethod(event.target.value as Gen3StaticMethod)
                }
                value={method}
              >
                <option value="method1">{t("method1")}</option>
                {!template.buggedRoamer && (
                  <option value="method4">{t("method4")}</option>
                )}
              </select>
            </label>
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
            <span className="panel-note">
              {t("game")} / {t("pokemon")}
            </span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("category")}</span>
              <select
                onChange={(event) =>
                  setCategory(event.target.value as Gen3StaticCategory)
                }
                value={activeCategory}
              >
                {categories.map((entry) => (
                  <option key={entry} value={entry}>
                    {t(entry)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("pokemon")}</span>
              <select
                onChange={(event) => setTemplateId(event.target.value)}
                value={template.id}
              >
                {templates.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {getGen3SpeciesName(
                      i18n.language,
                      entry.species,
                      entry.form,
                    )}
                  </option>
                ))}
              </select>
            </label>
            <div className="static-encounter-meta">
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
            <span className="panel-note">PokeFinder / Filter</span>
          </div>
          <fieldset
            className="filter-controls"
            disabled={operation === "generator" && filtersDisabled}
          >
            <div className="gen3-filter-selects">
              <label className="field">
                <span>{t("ability")}</span>
                <select
                  onChange={(event) =>
                    setAbility(event.target.value as Gen3StaticAbilityFilter)
                  }
                  value={ability}
                >
                  <option value="any">{t("any")}</option>
                  <option value="first">0</option>
                  <option value="second">1</option>
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
                </select>
              </label>
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("hiddenPower")}
                mask={hiddenPowerMask}
                onChange={setHiddenPowerMask}
                options={hiddenPowerOptions}
                resetHint={t("checkListResetHint")}
              />
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("nature")}
                mask={natureMask}
                onChange={setNatureMask}
                options={natureOptions}
                resetHint={t("checkListResetHint")}
              />
              <label className="field">
                <span>{t("shiny")}</span>
                <select
                  onChange={(event) =>
                    setShiny(event.target.value as Gen3StaticShinyFilter)
                  }
                  value={shiny}
                >
                  <option value="any">{t("any")}</option>
                  <option value="star">{t("shinyStar")}</option>
                  <option value="square">{t("shinySquare")}</option>
                  <option value="star-square">{t("shinyStarSquare")}</option>
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
                    {t(ivLabelKey(key))}
                  </button>
                  {(["min", "max"] as const).map((kind) => (
                    <input
                      aria-label={`${t(ivLabelKey(key))} ${t(kind === "min" ? "minimum" : "maximum")}`}
                      inputMode="numeric"
                      key={kind}
                      max="31"
                      min="0"
                      onChange={(event) =>
                        updateIv(
                          kind,
                          index,
                          normalizeDecimalInput(event.target.value, 31, 2),
                        )
                      }
                      type="number"
                      value={activeIvRanges[kind][index]}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="filter-tool-row">
              <label className="toggle-field">
                <input
                  checked={showStats}
                  onChange={(event) => setShowStats(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("showStats")}</span>
              </label>
              <button onClick={onOpenIvCalculator} type="button">
                {t("ivCalculator")}
              </button>
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
              {String(results.length)} / {String(progress.totalStates)}
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
            {t("processed")} <strong>{String(progress.processedStates)}</strong>
          </span>
          <span>
            {t("results")} <strong>{String(progress.resultCount)}</strong>
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
                    onClick={() =>
                      setSort((current) =>
                        current.key === column.key
                          ? {
                              key: column.key,
                              direction:
                                current.direction === "asc" ? "desc" : "asc",
                            }
                          : { key: column.key, direction: "asc" },
                      )
                    }
                    type="button"
                  >
                    {t(column.label)}
                    {sort.key === column.key
                      ? sort.direction === "asc"
                        ? " ↑"
                        : " ↓"
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
