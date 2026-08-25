import { Select } from "../shared/Select";
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
import {
  getGen4Abilities,
  getGen4AbilityName,
  getGen4BaseStats,
  getGen4Characteristics,
  getGen4SpeciesName,
  type Gen4PersonalVersion,
} from "../gen4ivcalculator/gen4IvData";
import type { Gen4Profile } from "../gen4profiles/domain";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { PerfectIvFilterFields } from "../shared/PerfectIvFilterFields";
import { computeGen3Stats } from "../shared/gen3Stats";
import {
  GEN4_STATIC_MAX_TOTAL_STATES,
  GEN4_STATIC_TEMPLATES,
  gen4StaticCategoriesForVersion,
  gen4StaticSearcherCombinationCount,
  gen4StaticTemplatesForVersion,
  validateGen4StaticGeneratorRequest,
  validateGen4StaticSearcherRequest,
  type Gen4IvTuple,
  type Gen4StaticAbility,
  type Gen4StaticCategory,
  type Gen4StaticGender,
  type Gen4StaticGeneratorRequest,
  type Gen4StaticLead,
  type Gen4StaticSearcherRequest,
  type Gen4StaticSearcherState,
  type Gen4StaticShiny,
  type Gen4StaticState,
} from "./domain";
import type { Gen4StaticProgress, Gen4StaticSummary } from "./search";
import { Gen4StaticSearcherUiPreviewEngine } from "./preview/Gen4StaticSearcherUiPreviewEngine";
import { Gen4StaticUiPreviewEngine } from "./preview/Gen4StaticUiPreviewEngine";
import { Gen4StaticSearcherWorkerPool } from "./worker/Gen4StaticSearcherWorkerPool";
import { Gen4StaticWorkerPool } from "./worker/Gen4StaticWorkerPool";

type Operation = "generator" | "searcher";
type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type Result = Gen4StaticState | Gen4StaticSearcherState;
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type SortKey =
  | "seed"
  | "delay"
  | "hour"
  | "advances"
  | "call"
  | "chatot"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | IvKey
  | "hiddenPower"
  | "hiddenPowerStrength"
  | "gender"
  | "characteristic";
type IvTextValues = [string, string, string, string, string, string];

interface IvRanges {
  min: IvTextValues;
  max: IvTextValues;
}

interface Column {
  key: SortKey;
  label: string;
}

interface Gen4StaticPanelProps {
  profile: Gen4Profile;
  onOpenIvCalculator(): void;
  uiPreviewMode: boolean;
}

const NATURE_MASK_ALL = 0x1ff_ffff;
const HIDDEN_POWER_MASK_ALL = 0xffff;
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
const powerKeys = [
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
const ivKeys: IvKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];
const categoryKeys: Record<Gen4StaticCategory, string> = {
  starters: "starters",
  fossils: "fossils",
  gifts: "gifts",
  gameCorner: "gameCorner",
  stationary: "stationary",
  legends: "legends",
  events: "events",
  roamers: "roamers",
};
const gameKeys: Record<Gen4Profile["version"], string> = {
  diamond: "gameDiamond",
  pearl: "gamePearl",
  platinum: "gamePlatinum",
  heartgold: "gameHeartGold",
  soulsilver: "gameSoulSilver",
};
const commonColumns: Column[] = [
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
  { key: "characteristic", label: "characteristic" },
];

function staticColumns(operation: Operation, version: Gen4Profile["version"]) {
  if (operation === "searcher") {
    return [
      { key: "seed", label: "seed" },
      { key: "delay", label: "delay" },
      { key: "hour", label: "hour" },
      { key: "advances", label: "rowAdvance" },
      ...commonColumns,
    ] satisfies Column[];
  }
  const rngColumns: Column[] = [{ key: "advances", label: "rowAdvance" }];
  if (version === "heartgold" || version === "soulsilver") {
    rngColumns.push({ key: "call", label: "call" });
  }
  rngColumns.push({ key: "chatot", label: "chatot" });
  return [...rngColumns, ...commonColumns];
}

function parseDecimal(value: string) {
  const normalized = value.trim();
  return /^\d+$/.test(normalized)
    ? Number.parseInt(normalized, 10)
    : Number.NaN;
}

function parseHex(value: string) {
  const normalized = value.trim().replace(/^0x/i, "");
  if (normalized === "") return 0;
  return /^[0-9a-f]{1,8}$/i.test(normalized)
    ? Number.parseInt(normalized, 16)
    : Number.NaN;
}

function formatHex(value: number) {
  return value.toString(16).toUpperCase().padStart(8, "0");
}

function ivLabelKey(key: IvKey) {
  return `iv${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function characteristic(state: Result) {
  const order = [0, 1, 2, 5, 3, 4];
  const start = state.pid % 6;
  let selected = start;
  let maximum = 0;
  for (let offset = 0; offset < 6; offset++) {
    const index = (start + offset) % 6;
    if (state.ivs[order[index]] > maximum) {
      selected = index;
      maximum = state.ivs[order[index]];
    }
  }
  return selected * 5 + (maximum % 5);
}

function chatot(value: number) {
  const pitch =
    value < 20
      ? "L"
      : value < 40
        ? "ML"
        : value < 60
          ? "M"
          : value < 80
            ? "MH"
            : "H";
  return `${pitch} ${value}`;
}

export function Gen4StaticPanel({
  onOpenIvCalculator,
  profile,
  uiPreviewMode,
}: Gen4StaticPanelProps) {
  const { t, i18n } = useTranslation();
  const generator = useMemo(
    () =>
      uiPreviewMode
        ? new Gen4StaticUiPreviewEngine()
        : new Gen4StaticWorkerPool(),
    [uiPreviewMode],
  );
  const searcher = useMemo(
    () =>
      uiPreviewMode
        ? new Gen4StaticSearcherUiPreviewEngine()
        : new Gen4StaticSearcherWorkerPool(),
    [uiPreviewMode],
  );
  const [operation, setOperation] = useState<Operation>("generator");
  const [category, setCategory] = useState<Gen4StaticCategory>("starters");
  const [templateId, setTemplateId] = useState("");
  const [lead, setLead] = useState<Gen4StaticLead>("none");
  const [syncNature, setSyncNature] = useState("0");
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("1000");
  const [offset, setOffset] = useState("");
  const [minDelay, setMinDelay] = useState("600");
  const [maxDelay, setMaxDelay] = useState("2000");
  const [minAdvance, setMinAdvance] = useState("0");
  const [maxAdvance, setMaxAdvance] = useState("1000");
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [natureMask, setNatureMask] = useState(0);
  const [powerMask, setPowerMask] = useState(0);
  const [shiny, setShiny] = useState<Gen4StaticShiny>("any");
  const [gender, setGender] = useState<Gen4StaticGender>("any");
  const [ability, setAbility] = useState<Gen4StaticAbility>("any");
  const [showStats, setShowStats] = useState(false);
  const [ivRanges, setIvRanges] = useState<Record<Operation, IvRanges>>({
    generator: {
      min: ["0", "0", "0", "0", "0", "0"],
      max: ["31", "31", "31", "31", "31", "31"],
    },
    searcher: {
      min: ["0", "0", "0", "0", "0", "0"],
      max: ["31", "31", "31", "31", "31", "31"],
    },
  });
  const [perfectIvValue, setPerfectIvValue] = useState("31");
  const [perfectIvCount, setPerfectIvCount] = useState("0");
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState<Gen4StaticProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen4StaticSummary>();
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "advances", direction: "asc" });
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => () => {
      generator.dispose();
      searcher.dispose();
    },
    [generator, searcher],
  );

  const categories = gen4StaticCategoriesForVersion(profile.version);
  const activeCategory = categories.includes(category)
    ? category
    : categories[0];
  const templates = gen4StaticTemplatesForVersion(
    profile.version,
    activeCategory,
  );
  const template =
    templates.find((entry) => entry.id === templateId) ??
    templates[0] ??
    GEN4_STATIC_TEMPLATES[0];
  const activeIv = ivRanges[operation];
  const natureOptions = natureKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const powerOptions = powerKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const columns = useMemo(
    () => staticColumns(operation, profile.version),
    [operation, profile.version],
  );
  const personalVersion = (
    profile.version === "heartgold" || profile.version === "soulsilver"
      ? "hgss"
      : profile.version
  ) as Gen4PersonalVersion;
  const baseStats = getGen4BaseStats(
    personalVersion,
    template.species,
    template.form,
  );
  const abilities = getGen4Abilities(
    personalVersion,
    template.species,
    template.form,
  );
  const characteristics = getGen4Characteristics(i18n.language);

  useEffect(() => {
    if (category !== activeCategory) setCategory(activeCategory);
  }, [activeCategory, category]);
  useEffect(() => {
    if (template.id !== templateId) setTemplateId(template.id);
    if (template.method === "method1") setLead("none");
  }, [template, templateId]);

  const stateValue = (state: Result, key: SortKey): number => {
    const ivIndex = ivKeys.indexOf(key as IvKey);
    if (ivIndex >= 0) {
      return showStats
        ? computeGen3Stats(baseStats, state.ivs, state.nature, state.level)[
            ivIndex
          ]
        : state.ivs[ivIndex];
    }
    if (key === "characteristic") return characteristic(state);
    if (key === "seed")
      return "seed" in state ? state.seed : Number.POSITIVE_INFINITY;
    if (key === "delay") return "delay" in state ? state.delay : 0;
    if (key === "hour") return "hour" in state ? state.hour : 0;
    return state[key as keyof Gen4StaticState] as number;
  };

  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        (stateValue(left, sort.key) - stateValue(right, sort.key)) * multiplier,
    );
    // Encounter data and display mode change derived stat values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseStats, results, showStats, sort]);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const resetRunState = (nextOperation: Operation) => {
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
        [kind]: current[operation][kind].map((entry, entryIndex) =>
          entryIndex === index ? value : entry,
        ) as IvTextValues,
      },
    }));
  };

  const applyIvShortcut = (index: number, event: MouseEvent) => {
    const range: [string, string] = event.ctrlKey
      ? event.altKey
        ? ["0", "0"]
        : ["31", "31"]
      : event.altKey
        ? ["30", "31"]
        : ["0", "31"];
    setIvRanges((current) => {
      const min = [...current[operation].min] as IvTextValues;
      const max = [...current[operation].max] as IvTextValues;
      min[index] = range[0];
      max[index] = range[1];
      return { ...current, [operation]: { min, max } };
    });
  };

  const commonRequest = () => ({
    method: template.method,
    lead: template.method === "method1" ? ("none" as const) : lead,
    syncNature: parseDecimal(syncNature),
    tid: profile.tid,
    sid: profile.sid,
    template,
    filters: {
      natureMask:
        filtersDisabled && operation === "generator"
          ? NATURE_MASK_ALL
          : natureMask || NATURE_MASK_ALL,
      hiddenPowerMask:
        filtersDisabled && operation === "generator"
          ? HIDDEN_POWER_MASK_ALL
          : powerMask || HIDDEN_POWER_MASK_ALL,
      ivMin: (filtersDisabled && operation === "generator"
        ? [0, 0, 0, 0, 0, 0]
        : activeIv.min.map(parseDecimal)) as Gen4IvTuple,
      ivMax: (filtersDisabled && operation === "generator"
        ? [31, 31, 31, 31, 31, 31]
        : activeIv.max.map(parseDecimal)) as Gen4IvTuple,
      shiny: filtersDisabled && operation === "generator" ? "any" : shiny,
      gender: filtersDisabled && operation === "generator" ? "any" : gender,
      ability: filtersDisabled && operation === "generator" ? "any" : ability,
      perfectIvValue:
        filtersDisabled && operation === "generator"
          ? 31
          : parseDecimal(perfectIvValue),
      perfectIvCount:
        filtersDisabled && operation === "generator"
          ? 0
          : parseDecimal(perfectIvCount),
    },
  });

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const base = commonRequest();
    const request =
      operation === "generator"
        ? ({
            ...base,
            seed: parseHex(seed),
            initialAdvances: parseDecimal(initialAdvances),
            maxAdvances: parseDecimal(maxAdvances),
            offset: parseDecimal(offset || "0"),
          } satisfies Gen4StaticGeneratorRequest)
        : ({
            ...base,
            minAdvance: parseDecimal(minAdvance),
            maxAdvance: parseDecimal(maxAdvance),
            minDelay: parseDecimal(minDelay),
            maxDelay: parseDecimal(maxDelay),
          } satisfies Gen4StaticSearcherRequest);
    const validationErrors =
      operation === "generator"
        ? validateGen4StaticGeneratorRequest(
            request as Gen4StaticGeneratorRequest,
          )
        : validateGen4StaticSearcherRequest(
            request as Gen4StaticSearcherRequest,
          );
    if (validationErrors.length > 0) {
      const count =
        operation === "searcher"
          ? gen4StaticSearcherCombinationCount(
              request as Gen4StaticSearcherRequest,
            )
          : 0;
      setError(
        validationErrors.includes("searchRange")
          ? t("staticSearchRangeTooLarge", {
              count,
              limit: GEN4_STATIC_MAX_TOTAL_STATES,
            })
          : t("invalidGen4StaticInput"),
      );
      setStatus("failed");
      return;
    }

    setResults([]);
    setError("");
    setSummary(undefined);
    setStatus("calculating");
    setProgress({
      processedStates: 0,
      totalStates:
        operation === "generator"
          ? (request as Gen4StaticGeneratorRequest).maxAdvances + 1
          : gen4StaticSearcherCombinationCount(
              request as Gen4StaticSearcherRequest,
            ),
      resultCount: 0,
      percent: 0,
    });
    try {
      const done =
        operation === "generator"
          ? await generator.search(request as Gen4StaticGeneratorRequest, {
              onBatch: (states) =>
                setResults((current) => current.concat(states)),
              onProgress: setProgress,
            })
          : await searcher.search(request as Gen4StaticSearcherRequest, {
              onBatch: (states) =>
                setResults((current) => current.concat(states)),
              onProgress: setProgress,
            });
      setSummary(done);
      setStatus(done.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const displayStateValue = (state: Result, key: SortKey) => {
    const ivIndex = ivKeys.indexOf(key as IvKey);
    if (ivIndex >= 0) return String(stateValue(state, key));
    if (key === "seed") return "seed" in state ? formatHex(state.seed) : "-";
    if (key === "pid") return formatHex(state.pid);
    if (key === "shiny")
      return t(
        state.shiny === 2
          ? "shinySquare"
          : state.shiny === 1
            ? "shinyStar"
            : "shinyNone",
      );
    if (key === "nature") return t(natureKeys[state.nature]);
    if (key === "ability") {
      const abilityId = abilities[state.ability] ?? abilities[0];
      return `${state.ability}: ${getGen4AbilityName(i18n.language, abilityId)}`;
    }
    if (key === "hiddenPower") return t(powerKeys[state.hiddenPower]);
    if (key === "hiddenPowerStrength") return String(state.hiddenPowerStrength);
    if (key === "gender")
      return t(
        state.gender === 0
          ? "male"
          : state.gender === 1
            ? "female"
            : "genderless",
      );
    if (key === "characteristic")
      return characteristics[characteristic(state)] ?? "-";
    if (key === "call") return ["E", "K", "P"][state.call] ?? "-";
    if (key === "chatot") return chatot(state.chatot);
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
    anchor.download = `pokerngkit-gen4static-${operation}-${template.id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const statusLabel = t(status);

  return (
    <>
      <div
        aria-label={t("gen4StaticEngine")}
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
        className="static-control-grid gen3static-control-grid gen4static-control-grid"
        onSubmit={run}
      >
        <section className="panel static-panel static-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">PokeFinder / Static4</span>
          </div>
          <div className="static-form-stack">
            {template.method !== "method1" && (
              <>
                <label className="field">
                  <span>{t("lead")}</span>
                  <Select
                    onChange={(event) =>
                      setLead(event.target.value as Gen4StaticLead)
                    }
                    value={lead}
                  >
                    <option value="none">{t("none")}</option>
                    <option value="synchronize">{t("wildSynchronize")}</option>
                    {![0, 254, 255].includes(template.genderRatio) && (
                      <>
                        <option value="cuteCharmM">
                          {t("wildCuteCharmMale")}
                        </option>
                        <option value="cuteCharmF">
                          {t("wildCuteCharmFemale")}
                        </option>
                      </>
                    )}
                  </Select>
                </label>
                {lead === "synchronize" && operation === "generator" && (
                  <label className="field">
                    <span>{t("nature")}</span>
                    <Select
                      onChange={(event) => setSyncNature(event.target.value)}
                      value={syncNature}
                    >
                      {natureKeys.map((key, index) => (
                        <option key={key} value={index}>
                          {t(key)}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}
              </>
            )}
            {operation === "generator" ? (
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
            ) : (
              <>
                <div className="compact-field-row">
                  <label className="field">
                    <span>{t("minDelay")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={5}
                      onChange={(event) =>
                        setMinDelay(
                          normalizeDecimalInput(event.target.value, 0xffff, 5),
                        )
                      }
                      value={minDelay}
                    />
                  </label>
                  <label className="field">
                    <span>{t("maxDelay")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={5}
                      onChange={(event) =>
                        setMaxDelay(
                          normalizeDecimalInput(event.target.value, 0xffff, 5),
                        )
                      }
                      value={maxDelay}
                    />
                  </label>
                </div>
                <div className="compact-field-row">
                  <label className="field">
                    <span>{t("minAdvance")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) =>
                        setMinAdvance(
                          normalizeDecimalInput(
                            event.target.value,
                            0xffff_ffff,
                            10,
                          ),
                        )
                      }
                      value={minAdvance}
                    />
                  </label>
                  <label className="field">
                    <span>{t("maxAdvance")}</span>
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(event) =>
                        setMaxAdvance(
                          normalizeDecimalInput(
                            event.target.value,
                            0xffff_ffff,
                            10,
                          ),
                        )
                      }
                      value={maxAdvance}
                    />
                  </label>
                </div>
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
                    ? generator.cancel()
                    : searcher.cancel()
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
              <Select
                onChange={(event) =>
                  setCategory(event.target.value as Gen4StaticCategory)
                }
                value={activeCategory}
              >
                {categories.map((entry) => (
                  <option key={entry} value={entry}>
                    {t(categoryKeys[entry])}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{t("pokemon")}</span>
              <Select
                onChange={(event) => setTemplateId(event.target.value)}
                value={template.id}
              >
                {templates.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {getGen4SpeciesName(
                      i18n.language,
                      entry.species,
                      entry.form,
                    )}
                  </option>
                ))}
              </Select>
            </label>
            <div className="static-encounter-meta">
              <div>
                <span>{t("level")}</span>
                <strong>{template.level}</strong>
              </div>
              <div>
                <span>{t("method")}</span>
                <strong>{t(template.method)}</strong>
              </div>
            </div>
            <div className="inline-notice">
              {profile.name} / {t(gameKeys[profile.version])}
            </div>
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
                <Select
                  onChange={(event) =>
                    setAbility(event.target.value as Gen4StaticAbility)
                  }
                  value={ability}
                >
                  <option value="any">{t("any")}</option>
                  <option value="first">0</option>
                  <option value="second">1</option>
                </Select>
              </label>
              <label className="field">
                <span>{t("gender")}</span>
                <Select
                  onChange={(event) =>
                    setGender(event.target.value as Gen4StaticGender)
                  }
                  value={gender}
                >
                  <option value="any">{t("any")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                  <option value="genderless">{t("genderless")}</option>
                </Select>
              </label>
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("hiddenPower")}
                mask={powerMask}
                onChange={setPowerMask}
                options={powerOptions}
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
                <Select
                  onChange={(event) =>
                    setShiny(event.target.value as Gen4StaticShiny)
                  }
                  value={shiny}
                >
                  <option value="any">{t("any")}</option>
                  <option value="notShiny">{t("shinyNone")}</option>
                  <option value="shiny">{t("shinyAny")}</option>
                </Select>
              </label>
            </div>
            <PerfectIvFilterFields
              count={perfectIvCount}
              onCountChange={setPerfectIvCount}
              onValueChange={setPerfectIvValue}
              value={perfectIvValue}
            />
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
                      value={activeIv[kind][index]}
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
            {/wasm|module|fetch/i.test(error)
              ? t("gen4StaticWasmMissing")
              : error}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="alert warning">{t("limitReached")}</div>
        )}
        <div className="table-shell static-table-shell" ref={tableRef}>
          {sortedResults.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyStatic")}</span>
            </div>
          ) : (
            <div
              className={`static-virtual-table gen4static-table ${operation} ${
                profile.version === "heartgold" ||
                profile.version === "soulsilver"
                  ? "hgss"
                  : "dppt"
              }`}
              style={{ height: `${virtualizer.getTotalSize() + 38}px` }}
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
              {virtualizer.getVirtualItems().map((row) => {
                const state = sortedResults[row.index];
                return (
                  <div
                    className="static-table-row"
                    key={`${state.pid}-${stateValue(state, operation === "generator" ? "advances" : "seed")}-${row.index}`}
                    style={{ transform: `translateY(${row.start + 38}px)` }}
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
