import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type FormEvent,
  type MouseEvent,
  useCallback,
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
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { computeGen3Stats } from "../shared/gen3Stats";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { GEN4_EGG_SPECIES, getGen4EggGenderRatios } from "./data";
import {
  calculateGen4EggPoketch,
  gen4EggGeneratorCombinationCount,
  gen4EggSearcherSeedCount,
  GEN4_EGG_MAX_SEARCH_SEEDS,
  isGen4EggParentCombinationValid,
  validateGen4EggGeneratorRequest,
  validateGen4EggSearcherRequest,
  type Gen4EggAbilityFilter,
  type Gen4EggGenderFilter,
  type Gen4EggGame,
  type Gen4EggGeneratorRequest,
  type Gen4EggIvTuple,
  type Gen4EggParentGender,
  type Gen4EggSearcherRequest,
  type Gen4EggSearcherState,
  type Gen4EggShinyFilter,
  type Gen4EggState,
} from "./domain";
import { Gen4EggSearcherUiPreviewEngine } from "./preview/Gen4EggSearcherUiPreviewEngine";
import { Gen4EggUiPreviewEngine } from "./preview/Gen4EggUiPreviewEngine";
import type { Gen4EggProgress, Gen4EggSummary } from "./search";
import { Gen4EggWorkerPool } from "./worker/Gen4EggWorkerPool";

type Operation = "generator" | "searcher";
type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type Result = Gen4EggState | Gen4EggSearcherState;
type IvTextValues = [string, string, string, string, string, string];
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type SortKey =
  | "seed"
  | "delay"
  | "advances"
  | "pickupAdvances"
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

interface Column {
  key: SortKey;
  label: string;
}

interface Gen4EggPanelProps {
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
];

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

function generatorColumns(hgss: boolean): Column[] {
  return [
    { key: "advances", label: "eggHeldAdvances" },
    { key: "pickupAdvances", label: "eggPickupAdvances" },
    ...(hgss ? [{ key: "call", label: "call" } satisfies Column] : []),
    { key: "chatot", label: "chatot" },
    ...commonColumns,
    { key: "characteristic", label: "characteristic" },
  ];
}

function searcherColumns(): Column[] {
  return [
    { key: "seed", label: "seed" },
    { key: "delay", label: "delay" },
    { key: "advances", label: "eggHeldAdvances" },
    { key: "pickupAdvances", label: "eggPickupAdvances" },
    ...commonColumns,
  ];
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

export function Gen4EggPanel({
  onOpenIvCalculator,
  profile,
  uiPreviewMode,
}: Gen4EggPanelProps) {
  const { t, i18n } = useTranslation();
  const generator = useMemo(
    () =>
      uiPreviewMode ? new Gen4EggUiPreviewEngine() : new Gen4EggWorkerPool(),
    [uiPreviewMode],
  );
  const searcher = useMemo(
    () =>
      uiPreviewMode
        ? new Gen4EggSearcherUiPreviewEngine()
        : new Gen4EggWorkerPool(),
    [uiPreviewMode],
  );
  const [operation, setOperation] = useState<Operation>("generator");
  const [seedHeld, setSeedHeld] = useState("");
  const [seedPickup, setSeedPickup] = useState("");
  const [initialHeld, setInitialHeld] = useState("0");
  const [maxHeld, setMaxHeld] = useState("100");
  const [offsetHeld, setOffsetHeld] = useState("");
  const [initialPickup, setInitialPickup] = useState("0");
  const [maxPickup, setMaxPickup] = useState("1000");
  const [offsetPickup, setOffsetPickup] = useState("");
  const [minDelay, setMinDelay] = useState("600");
  const [maxDelay, setMaxDelay] = useState("2000");
  const [species, setSpecies] = useState<number>(GEN4_EGG_SPECIES[0] ?? 1);
  const [speciesInput, setSpeciesInput] = useState("");
  const [parentA, setParentA] = useState<{
    gender: Gen4EggParentGender;
    ivs: IvTextValues;
  }>({ gender: "male", ivs: ["31", "31", "31", "31", "31", "31"] });
  const [parentB, setParentB] = useState<{
    gender: Gen4EggParentGender;
    ivs: IvTextValues;
  }>({ gender: "female", ivs: ["31", "31", "31", "31", "31", "31"] });
  const [masuda, setMasuda] = useState(false);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [natureMask, setNatureMask] = useState(0);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0);
  const [shiny, setShiny] = useState<Gen4EggShinyFilter>("any");
  const [gender, setGender] = useState<Gen4EggGenderFilter>("any");
  const [ability, setAbility] = useState<Gen4EggAbilityFilter>("any");
  const [ivMin, setIvMin] = useState<IvTextValues>([
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
  ]);
  const [ivMax, setIvMax] = useState<IvTextValues>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [showInheritance, setShowInheritance] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [progress, setProgress] = useState<Gen4EggProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen4EggSummary>();
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    {
      key: "advances",
      direction: "asc",
    },
  );
  const [selectedPoketchState, setSelectedPoketchState] =
    useState<Gen4EggState>();
  const [poketchOpen, setPoketchOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const hgss =
    profile.version === "heartgold" || profile.version === "soulsilver";
  const game: Gen4EggGame = hgss ? "hgss" : "dppt";
  const personalVersion = (
    hgss ? "hgss" : profile.version
  ) as Gen4PersonalVersion;

  useEffect(
    () => () => {
      generator.dispose();
      searcher.dispose();
    },
    [generator, searcher],
  );
  useEffect(() => {
    if (!poketchOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPoketchOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [poketchOpen]);

  const speciesOptions = useMemo(
    () =>
      GEN4_EGG_SPECIES.map((entry) => ({
        label: getGen4SpeciesName(i18n.language, entry),
        value: entry,
      })),
    [i18n.language],
  );
  const selectedSpeciesName = getGen4SpeciesName(i18n.language, species);
  const baseStats = getGen4BaseStats(personalVersion, species);
  const abilities = getGen4Abilities(personalVersion, species);
  const characteristics = getGen4Characteristics(i18n.language);
  const displayedSpecies = speciesInput || selectedSpeciesName;
  const natureOptions = natureKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const hiddenPowerOptions = powerKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const columns = useMemo(
    () =>
      operation === "generator" ? generatorColumns(hgss) : searcherColumns(),
    [hgss, operation],
  );

  const stateValue = useCallback(
    (state: Result, key: SortKey) => {
      const ivIndex = ivKeys.indexOf(key as IvKey);
      if (ivIndex >= 0) {
        return showStats
          ? computeGen3Stats(baseStats, state.ivs, state.nature, 1)[ivIndex]
          : state.ivs[ivIndex];
      }
      if (key === "characteristic") return characteristic(state);
      if (key === "seed") return "seed" in state ? state.seed : 0;
      if (key === "delay") return "delay" in state ? state.delay : 0;
      return state[key as keyof Gen4EggState] as number;
    },
    [baseStats, showStats],
  );

  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        (stateValue(left, sort.key) - stateValue(right, sort.key)) * multiplier,
    );
  }, [results, sort, stateValue]);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const resetRunState = (nextOperation: Operation) => {
    generator.cancel();
    searcher.cancel();
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
    setSelectedPoketchState(undefined);
    setPoketchOpen(false);
    setMaxHeld(nextOperation === "generator" ? "100" : "30");
    setSort({
      key: nextOperation === "generator" ? "advances" : "seed",
      direction: "asc",
    });
  };

  const updateParentIv = (parent: "a" | "b", index: number, value: string) => {
    const setter = parent === "a" ? setParentA : setParentB;
    setter((current) => ({
      ...current,
      ivs: current.ivs.map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ) as IvTextValues,
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
    setIvMin(
      (current) =>
        current.map((value, entry) =>
          entry === index ? range[0] : value,
        ) as IvTextValues,
    );
    setIvMax(
      (current) =>
        current.map((value, entry) =>
          entry === index ? range[1] : value,
        ) as IvTextValues,
    );
  };

  const commonRequest = () => {
    const ratios = getGen4EggGenderRatios(game, species);
    const disableFilters = filtersDisabled && operation === "generator";
    return {
      game,
      species,
      ...ratios,
      tid: profile.tid,
      sid: profile.sid,
      masuda,
      parentA: {
        gender: parentA.gender,
        ivs: parentA.ivs.map(parseDecimal) as Gen4EggIvTuple,
      },
      parentB: {
        gender: parentB.gender,
        ivs: parentB.ivs.map(parseDecimal) as Gen4EggIvTuple,
      },
      filters: {
        shiny: disableFilters ? ("any" as const) : shiny,
        gender: disableFilters ? ("any" as const) : gender,
        ability: disableFilters ? ("any" as const) : ability,
        natureMask: disableFilters
          ? NATURE_MASK_ALL
          : natureMask || NATURE_MASK_ALL,
        hiddenPowerMask: disableFilters
          ? HIDDEN_POWER_MASK_ALL
          : hiddenPowerMask || HIDDEN_POWER_MASK_ALL,
        ivMin: (disableFilters
          ? [0, 0, 0, 0, 0, 0]
          : ivMin.map(parseDecimal)) as Gen4EggIvTuple,
        ivMax: (disableFilters
          ? [31, 31, 31, 31, 31, 31]
          : ivMax.map(parseDecimal)) as Gen4EggIvTuple,
      },
    };
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const base = commonRequest();
    const request =
      operation === "generator"
        ? ({
            ...base,
            seedHeld: parseHex(seedHeld),
            seedPickup: parseHex(seedPickup),
            initialAdvancesHeld: parseDecimal(initialHeld),
            maxAdvancesHeld: parseDecimal(maxHeld),
            offsetHeld: parseDecimal(offsetHeld || "0"),
            initialAdvancesPickup: parseDecimal(initialPickup),
            maxAdvancesPickup: parseDecimal(maxPickup),
            offsetPickup: parseDecimal(offsetPickup || "0"),
          } satisfies Gen4EggGeneratorRequest)
        : ({
            ...base,
            initialAdvancesHeld: parseDecimal(initialHeld),
            maxAdvancesHeld: parseDecimal(maxHeld),
            initialAdvancesPickup: parseDecimal(initialPickup),
            maxAdvancesPickup: parseDecimal(maxPickup),
            minDelay: parseDecimal(minDelay),
            maxDelay: parseDecimal(maxDelay),
          } satisfies Gen4EggSearcherRequest);
    const validationErrors =
      operation === "generator"
        ? validateGen4EggGeneratorRequest(request as Gen4EggGeneratorRequest)
        : validateGen4EggSearcherRequest(request as Gen4EggSearcherRequest);
    if (validationErrors.length > 0) {
      setError(
        validationErrors.includes("parents")
          ? t("eggIncompatibleParents")
          : validationErrors.includes("searchRange")
            ? `${t("invalidEggInput")} (${gen4EggSearcherSeedCount(request as Gen4EggSearcherRequest).toLocaleString()} / ${GEN4_EGG_MAX_SEARCH_SEEDS.toLocaleString()})`
            : t("invalidEggInput"),
      );
      setStatus("failed");
      return;
    }

    setResults([]);
    setError("");
    setSummary(undefined);
    setStatus("calculating");
    const totalStates =
      operation === "generator"
        ? gen4EggGeneratorCombinationCount(request as Gen4EggGeneratorRequest)
        : gen4EggSearcherSeedCount(request as Gen4EggSearcherRequest);
    setProgress({
      processedStates: 0,
      totalStates,
      resultCount: 0,
      percent: 0,
    });
    try {
      const done =
        operation === "generator"
          ? await generator.search(request as Gen4EggGeneratorRequest, {
              onBatch: (states) =>
                setResults((current) => current.concat(states)),
              onProgress: setProgress,
            })
          : await searcher.search(request as Gen4EggSearcherRequest, {
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

  const displayValue = (state: Result, key: SortKey) => {
    const ivIndex = ivKeys.indexOf(key as IvKey);
    if (ivIndex >= 0) {
      const inherited = state.inheritance[ivIndex];
      return showInheritance && inherited !== 0
        ? inherited === 1
          ? "A"
          : "B"
        : String(stateValue(state, key));
    }
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
    if (key === "gender")
      return t(
        state.gender === 0
          ? "male"
          : state.gender === 1
            ? "female"
            : "genderless",
      );
    if (key === "call") return ["E", "K", "P"][state.call] ?? "-";
    if (key === "chatot") return chatot(state.chatot);
    if (key === "characteristic") {
      return characteristics[characteristic(state)] ?? "-";
    }
    return String(stateValue(state, key));
  };

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      columns.map((column) => t(column.label)),
      ...sortedResults.map((state) =>
        columns.map((column) => displayValue(state, column.key)),
      ),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen4egg-${operation}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const parentFields = (
    id: "a" | "b",
    parent: typeof parentA,
    setParent: typeof setParentA,
  ) => (
    <fieldset className="egg-parent-fields">
      <legend>{t(id === "a" ? "eggParentA" : "eggParentB")}</legend>
      <label className="field">
        <span>{t("gender")}</span>
        <Select
          onChange={(event) =>
            setParent((current) => ({
              ...current,
              gender: event.target.value as Gen4EggParentGender,
            }))
          }
          value={parent.gender}
        >
          <option value="male">{t("male")}</option>
          <option value="female">{t("female")}</option>
          <option value="genderless">{t("genderless")}</option>
          <option value="ditto">{t("gen4EggDitto")}</option>
        </Select>
      </label>
      <div className="egg-parent-ivs">
        {ivKeys.map((key, index) => (
          <label className="field" key={key}>
            <span>{t(ivLabelKey(key))}</span>
            <input
              aria-label={`${t(id === "a" ? "eggParentA" : "eggParentB")} ${t(ivLabelKey(key))}`}
              inputMode="numeric"
              max="31"
              min="0"
              onChange={(event) =>
                updateParentIv(
                  id,
                  index,
                  normalizeDecimalInput(event.target.value, 31, 2),
                )
              }
              value={parent.ivs[index]}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );

  const poketch = selectedPoketchState
    ? calculateGen4EggPoketch(selectedPoketchState.advances)
    : undefined;

  return (
    <>
      <div
        aria-label={t("gen4EggEngine")}
        className="operation-tabs"
        role="tablist"
      >
        {(["generator", "searcher"] as const).map((entry) => (
          <button
            aria-selected={operation === entry}
            className={operation === entry ? "active" : ""}
            disabled={status === "calculating"}
            key={entry}
            onClick={() => operation !== entry && resetRunState(entry)}
            role="tab"
            type="button"
          >
            {t(entry)}
          </button>
        ))}
      </div>

      <form
        className="static-control-grid gen3static-control-grid"
        onSubmit={run}
      >
        <section className="panel static-panel static-rng-panel egg-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">{t("gen4EggUpstream")}</span>
          </div>
          <div className="static-form-stack">
            {operation === "generator" && (
              <fieldset className="egg-dual-field">
                <legend>{t("eggSeed")}</legend>
                <input
                  aria-label={t("gen4EggSeedHeld")}
                  maxLength={8}
                  onChange={(event) =>
                    setSeedHeld(normalizeHexInput(event.target.value, 8))
                  }
                  value={seedHeld}
                />
                <input
                  aria-label={t("gen4EggSeedPickup")}
                  maxLength={8}
                  onChange={(event) =>
                    setSeedPickup(normalizeHexInput(event.target.value, 8))
                  }
                  value={seedPickup}
                />
              </fieldset>
            )}
            <fieldset className="egg-dual-field">
              <legend>{t("eggHeldAdvances")}</legend>
              <input
                aria-label={t("gen4EggHeldInitial")}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setInitialHeld(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={initialHeld}
              />
              <input
                aria-label={t("gen4EggHeldMaximum")}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setMaxHeld(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={maxHeld}
              />
            </fieldset>
            <fieldset className="egg-dual-field">
              <legend>{t("eggPickupAdvances")}</legend>
              <input
                aria-label={t("gen4EggPickupInitial")}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setInitialPickup(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={initialPickup}
              />
              <input
                aria-label={t("gen4EggPickupMaximum")}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setMaxPickup(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={maxPickup}
              />
            </fieldset>
            {operation === "generator" ? (
              <fieldset className="egg-dual-field">
                <legend>{t("eggOffset")}</legend>
                <input
                  aria-label={t("gen4EggOffsetHeld")}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setOffsetHeld(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={offsetHeld}
                />
                <input
                  aria-label={t("gen4EggOffsetPickup")}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setOffsetPickup(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={offsetPickup}
                />
              </fieldset>
            ) : (
              <fieldset className="egg-dual-field">
                <legend>{t("delay")}</legend>
                <input
                  aria-label={t("gen4EggDelayMinimum")}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setMinDelay(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={minDelay}
                />
                <input
                  aria-label={t("gen4EggDelayMaximum")}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setMaxDelay(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={maxDelay}
                />
              </fieldset>
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
                  (operation === "generator" ? generator : searcher).cancel()
                }
                type="button"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </section>

        <section className="panel static-panel static-settings-panel egg-settings-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("settings")}</h2>
            </div>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("eggSpecies")}</span>
              <AutoCompleteComboBox
                inputValue={displayedSpecies}
                label={t("eggSpecies")}
                onInputChange={setSpeciesInput}
                onValueChange={(value) => {
                  setSpecies(value);
                  setSpeciesInput("");
                }}
                options={speciesOptions}
                value={species}
              />
            </label>
            {parentFields("a", parentA, setParentA)}
            {parentFields("b", parentB, setParentB)}
            <label className="toggle-field">
              <input
                checked={masuda}
                onChange={(event) => setMasuda(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen4EggMasuda")}</span>
            </label>
            {!isGen4EggParentCombinationValid(
              {
                gender: parentA.gender,
                ivs: parentA.ivs.map(parseDecimal) as Gen4EggIvTuple,
              },
              {
                gender: parentB.gender,
                ivs: parentB.ivs.map(parseDecimal) as Gen4EggIvTuple,
              },
            ) && (
              <div className="inline-notice">{t("eggIncompatibleParents")}</div>
            )}
          </div>
        </section>

        <section className="panel static-panel static-filter-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">03</span>
              <h2>{t("filters")}</h2>
            </div>
            <span className="panel-note">{t("gen4EggFilterUpstream")}</span>
          </div>
          <fieldset className="filter-controls" disabled={filtersDisabled}>
            <div className="gen3-filter-selects">
              <label className="field">
                <span>{t("shiny")}</span>
                <Select
                  onChange={(event) =>
                    setShiny(event.target.value as Gen4EggShinyFilter)
                  }
                  value={shiny}
                >
                  <option value="any">{t("any")}</option>
                  <option value="notShiny">{t("shinyNone")}</option>
                  <option value="star">{t("shinyStar")}</option>
                  <option value="square">{t("shinySquare")}</option>
                  <option value="starSquare">{t("shinyStarSquare")}</option>
                </Select>
              </label>
              <label className="field">
                <span>{t("gender")}</span>
                <Select
                  onChange={(event) =>
                    setGender(event.target.value as Gen4EggGenderFilter)
                  }
                  value={gender}
                >
                  <option value="any">{t("any")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                  <option value="genderless">{t("genderless")}</option>
                </Select>
              </label>
              <label className="field">
                <span>{t("ability")}</span>
                <Select
                  onChange={(event) =>
                    setAbility(event.target.value as Gen4EggAbilityFilter)
                  }
                  value={ability}
                >
                  <option value="any">{t("any")}</option>
                  <option value="first">0</option>
                  <option value="second">1</option>
                </Select>
              </label>
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("nature")}
                mask={natureMask}
                onChange={setNatureMask}
                options={natureOptions}
                resetHint={t("checkListResetHint")}
              />
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("hiddenPower")}
                mask={hiddenPowerMask}
                onChange={setHiddenPowerMask}
                options={hiddenPowerOptions}
                resetHint={t("checkListResetHint")}
              />
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
                  <input
                    inputMode="numeric"
                    max="31"
                    min="0"
                    onChange={(event) =>
                      setIvMin(
                        (current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index
                              ? normalizeDecimalInput(event.target.value, 31, 2)
                              : entry,
                          ) as IvTextValues,
                      )
                    }
                    value={ivMin[index]}
                  />
                  <input
                    inputMode="numeric"
                    max="31"
                    min="0"
                    onChange={(event) =>
                      setIvMax(
                        (current) =>
                          current.map((entry, currentIndex) =>
                            currentIndex === index
                              ? normalizeDecimalInput(event.target.value, 31, 2)
                              : entry,
                          ) as IvTextValues,
                      )
                    }
                    value={ivMax[index]}
                  />
                </div>
              ))}
            </div>
            <div className="filter-tool-row">
              <label className="toggle-field">
                <input
                  checked={showInheritance}
                  onChange={(event) => setShowInheritance(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("eggShowInheritance")}</span>
              </label>
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
            <span className={`run-status ${status}`}>{t(status)}</span>
          </div>
          <div className="result-actions">
            <span className="result-count">
              {String(results.length)} / {String(progress.totalStates)}
            </span>
            {!hgss && operation === "generator" && (
              <button
                className="secondary-action"
                disabled={!selectedPoketchState}
                onClick={() => setPoketchOpen(true)}
                type="button"
              >
                {t("gen4EggCalculatePoketch")}
              </button>
            )}
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
            {error.includes("Wasm") || error.includes("wasm")
              ? t("eggWasmMissing")
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
              <span>{t("emptyEgg")}</span>
            </div>
          ) : (
            <div
              className="static-virtual-table"
              style={{
                height: `${virtualizer.getTotalSize() + 40}px`,
                minWidth: `${columns.length * 96}px`,
              }}
            >
              <div
                className="static-table-header"
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, minmax(88px, 1fr))`,
                  minWidth: `${columns.length * 96}px`,
                }}
              >
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
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const state = sortedResults[virtualRow.index];
                return (
                  <div
                    aria-pressed={
                      !hgss && operation === "generator"
                        ? selectedPoketchState === state
                        : undefined
                    }
                    className="static-table-row"
                    key={`${state.advances}-${state.pickupAdvances}-${state.pid}-${virtualRow.index}`}
                    onClick={() => {
                      if (!hgss && operation === "generator") {
                        setSelectedPoketchState(state);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        !hgss &&
                        operation === "generator" &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        setSelectedPoketchState(state);
                      }
                    }}
                    role={
                      !hgss && operation === "generator" ? "button" : undefined
                    }
                    style={{
                      background:
                        selectedPoketchState === state
                          ? "var(--surface-2)"
                          : "transparent",
                      gridTemplateColumns: `repeat(${columns.length}, minmax(88px, 1fr))`,
                      minWidth: `${columns.length * 96}px`,
                      transform: `translateY(${virtualRow.start + 40}px)`,
                    }}
                    tabIndex={
                      !hgss && operation === "generator" ? 0 : undefined
                    }
                  >
                    {columns.map((column) => (
                      <span key={column.key}>
                        {displayValue(state, column.key)}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {poketchOpen && selectedPoketchState && poketch && (
        <div
          className="modal-backdrop"
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            event.preventDefault();
            (
              event.currentTarget.querySelector("button") as HTMLButtonElement
            )?.focus();
          }}
          onMouseDown={(event) =>
            event.target === event.currentTarget && setPoketchOpen(false)
          }
        >
          <div
            aria-labelledby="gen4-egg-poketch-title"
            className="profile-modal"
            role="dialog"
          >
            <div className="modal-heading">
              <h2 id="gen4-egg-poketch-title">{t("gen4EggPoketchTaps")}</h2>
            </div>
            <p>
              {t("gen4EggHappinessDoubleTaps", {
                count: poketch.happinessDoubleTaps,
              })}
            </p>
            <p>
              {t("gen4EggCoinFlipTaps", {
                count: poketch.coinFlipTaps,
              })}
            </p>
            {poketch.note === "doNotSwitchToHappiness" && (
              <p>{t("gen4EggPoketchDoNotSwitch")}</p>
            )}
            {poketch.note === "switchOnceWithoutClicking" && (
              <p>{t("gen4EggPoketchSwitchOnce")}</p>
            )}
            <div className="panel-actions">
              <button
                autoFocus
                className="primary-action"
                onClick={() => setPoketchOpen(false)}
                type="button"
              >
                {t("gen4EggPoketchOk")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
