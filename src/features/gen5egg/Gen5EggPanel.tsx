import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { Gen4AdvancePanel } from "../gen4advance/Gen4AdvancePanel";
import {
  getGen4AbilityName,
  getIvCharacteristics,
} from "../gen4ivcalculator/gen4IvData";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import type { Gen5AdjacentSeedsInitialContext } from "../gen5adjacentseeds/domain";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { GEN5_EGG_SPECIES, getGen5EggSpeciesName } from "./data";
import {
  formatGen5EggButtons,
  GEN5_EGG_MAX_RESULTS,
  gen5EggProfile,
  gen5EggTaskCount,
  isGen5EggParentCombinationValid,
  mapGen5EggInheritanceSource,
  parseGen5EggDecimal,
  shouldReorderGen5EggParents,
  validateGen5EggRequest,
  type Gen5EggAbilityFilter,
  type Gen5EggGenderFilter,
  type Gen5EggIvTuple,
  type Gen5EggMode,
  type Gen5EggParent,
  type Gen5EggParentAbility,
  type Gen5EggParentGender,
  type Gen5EggParentItem,
  type Gen5EggRequest,
  type Gen5EggResult,
  type Gen5EggShinyFilter,
} from "./domain";
import { Gen5EggUiPreviewEngine } from "./preview/Gen5EggUiPreviewEngine";
import type { Gen5EggEngine, Gen5EggProgress, Gen5EggSummary } from "./search";
import { Gen5EggWorkerPool } from "./worker/Gen5EggWorkerPool";
import "./Gen5EggPanel.css";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type SortKey =
  | "seed"
  | "advances"
  | "chatot"
  | "needle"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | IvKey
  | "hiddenPower"
  | "hiddenPowerStrength"
  | "gender"
  | "characteristic"
  | "dateTime"
  | "timer0"
  | "buttons";

interface Column {
  key: SortKey;
  label: string;
}

interface ParentDraft {
  ivs: IvText;
  ability: Gen5EggParentAbility;
  gender: Gen5EggParentGender;
  item: Gen5EggParentItem;
  nature: number;
}

export interface Gen5EggPanelProps {
  onOpenAdjacentSeeds(
    context: Omit<Gen5AdjacentSeedsInitialContext, "requestId">,
  ): void;
  onOpenIvCalculator(): void;
  onOpenProfileManager(): void;
  uiPreviewMode: boolean;
}

const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const DATE_STORAGE_KEY = "pokerngkit-gen5egg-dates-v1";
const MODES = ["generator", "searcher"] as const;
const IV_KEYS: readonly IvKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];
const NATURE_KEYS = [
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
const POWER_KEYS = [
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
const GENERATOR_COLUMNS: readonly Column[] = [
  { key: "advances", label: "Advances" },
  { key: "chatot", label: "Chatot" },
  { key: "needle", label: "Needle" },
  { key: "pid", label: "PID" },
  { key: "shiny", label: "Shiny" },
  { key: "nature", label: "Nature" },
  { key: "ability", label: "Ability" },
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "specialAttack", label: "SpA" },
  { key: "specialDefense", label: "SpD" },
  { key: "speed", label: "Spe" },
  { key: "hiddenPower", label: "Hidden" },
  { key: "hiddenPowerStrength", label: "Power" },
  { key: "gender", label: "Gender" },
  { key: "characteristic", label: "Characteristic" },
];
const SEARCHER_COLUMNS: readonly Column[] = [
  { key: "seed", label: "Seed" },
  { key: "advances", label: "Advances" },
  { key: "pid", label: "PID" },
  { key: "shiny", label: "Shiny" },
  { key: "nature", label: "Nature" },
  { key: "ability", label: "Ability" },
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "specialAttack", label: "SpA" },
  { key: "specialDefense", label: "SpD" },
  { key: "speed", label: "Spe" },
  { key: "hiddenPower", label: "Hidden" },
  { key: "hiddenPowerStrength", label: "Power" },
  { key: "gender", label: "Gender" },
  { key: "characteristic", label: "Characteristic" },
  { key: "dateTime", label: "Date/Time" },
  { key: "timer0", label: "Timer0" },
  { key: "buttons", label: "Buttons" },
];

function today() {
  const now = new Date();
  const year = Math.min(2099, Math.max(2000, now.getFullYear()));
  const part = (value: number) => String(value).padStart(2, "0");
  return `${year}-${part(now.getMonth() + 1)}-${part(now.getDate())}`;
}

function storedDates() {
  const fallback = today();
  try {
    const stored = JSON.parse(
      localStorage.getItem(DATE_STORAGE_KEY) ?? "null",
    ) as {
      startDate?: unknown;
      endDate?: unknown;
    } | null;
    if (
      typeof stored?.startDate === "string" &&
      typeof stored.endDate === "string"
    ) {
      return { startDate: stored.startDate, endDate: stored.endDate };
    }
  } catch {
    // Optional date persistence falls back to the current date.
  }
  return { startDate: fallback, endDate: fallback };
}

function saveDates(startDate: string, endDate: string) {
  try {
    localStorage.setItem(
      DATE_STORAGE_KEY,
      JSON.stringify({ startDate, endDate }),
    );
  } catch {
    // Search remains available when local settings cannot be written.
  }
}

function gameLabel(version: string) {
  if (version === "black") return "Black";
  if (version === "white") return "White";
  if (version === "black2") return "Black 2";
  return "White 2";
}

function ivLabel(key: IvKey) {
  return {
    hp: "HP",
    attack: "Atk",
    defense: "Def",
    specialAttack: "SpA",
    specialDefense: "SpD",
    speed: "Spe",
  }[key];
}

function itemLabels(chinese: boolean) {
  return chinese
    ? [
        "无",
        "不变之石",
        "力量负重",
        "力量护腕",
        "力量腰带",
        "力量镜",
        "力量束带",
        "力量护踝",
      ]
    : [
        "None",
        "Everstone",
        "Power Weight",
        "Power Bracer",
        "Power Belt",
        "Power Lens",
        "Power Band",
        "Power Anklet",
      ];
}

function columnLabel(
  column: Column,
  chinese: boolean,
  translate: (key: string) => string,
) {
  const map: Record<string, string> = {
    Advances: chinese ? "帧数" : "Advances",
    Chatot: chinese ? "音高" : "Chatot",
    Needle: "Needle",
    Shiny: chinese ? "异色" : "Shiny",
    Nature: chinese ? "性格" : "Nature",
    Ability: chinese ? "特性" : "Ability",
    Hidden: chinese ? "觉醒属性" : "Hidden",
    Power: chinese ? "觉醒威力" : "Power",
    Gender: chinese ? "性别" : "Gender",
    Characteristic: chinese ? "个性" : "Characteristic",
    "Date/Time": chinese ? "日期/时间" : "Date/Time",
  };
  return map[column.label] ?? translate(column.label);
}

function chatotLabel(value: number) {
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

function compareValues(left: number | string, right: number | string) {
  if (typeof left === "number" && typeof right === "number")
    return left - right;
  return String(left).localeCompare(String(right));
}

export function Gen5EggPanel({
  onOpenAdjacentSeeds,
  onOpenIvCalculator,
  onOpenProfileManager,
  uiPreviewMode,
}: Gen5EggPanelProps) {
  const { i18n, t } = useTranslation();
  const chinese = i18n.language.startsWith("zh");
  const profiles = useGen5Profiles();
  const engine = useMemo<Gen5EggEngine>(
    () =>
      uiPreviewMode ? new Gen5EggUiPreviewEngine() : new Gen5EggWorkerPool(),
    [uiPreviewMode],
  );
  const dates = useMemo(storedDates, []);
  const [mode, setMode] = useState<Gen5EggMode>("generator");
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("1000");
  const [offset, setOffset] = useState("");
  const [startDate, setStartDate] = useState(dates.startDate);
  const [endDate, setEndDate] = useState(dates.endDate);
  const [species, setSpecies] = useState<number>(GEN5_EGG_SPECIES[0] ?? 1);
  const [speciesInput, setSpeciesInput] = useState({
    language: "",
    species: 0,
    text: "",
  });
  const [parentA, setParentA] = useState<ParentDraft>({
    ivs: ["31", "31", "31", "31", "31", "31"],
    ability: 0,
    gender: "male",
    item: 0,
    nature: 0,
  });
  const [parentB, setParentB] = useState<ParentDraft>({
    ivs: ["31", "31", "31", "31", "31", "31"],
    ability: 0,
    gender: "female",
    item: 0,
    nature: 0,
  });
  const [masuda, setMasuda] = useState(false);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen5EggShinyFilter>("any");
  const [gender, setGender] = useState<Gen5EggGenderFilter>("any");
  const [ability, setAbility] = useState<Gen5EggAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(0);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0);
  const [ivMin, setIvMin] = useState<IvText>(["0", "0", "0", "0", "0", "0"]);
  const [ivMax, setIvMax] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [showInheritance, setShowInheritance] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [results, setResults] = useState<Gen5EggResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<Gen5EggResult>();
  const [resultParentsReordered, setResultParentsReordered] = useState(false);
  const [advanceFinderExpanded, setAdvanceFinderExpanded] = useState(false);
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Gen5EggSummary>();
  const [progress, setProgress] = useState<Gen5EggProgress>({
    processedUnits: 0,
    totalUnits: 0,
    resultCount: 0,
    percent: 0,
  });
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "advances", direction: "asc" });
  const tableRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => () => engine.dispose(), [engine]);

  const selectedProfile = profiles.selectedProfile;
  const busy = status === "calculating";
  const disableFilters = mode === "generator" && filtersDisabled;
  const columns = mode === "generator" ? GENERATOR_COLUMNS : SEARCHER_COLUMNS;
  const characteristics = getIvCharacteristics(i18n.language, "bw2");
  const items = itemLabels(chinese);
  const natureOptions = NATURE_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const hiddenPowerOptions = POWER_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const speciesOptions = useMemo(
    () =>
      GEN5_EGG_SPECIES.map((value) => ({
        label: getGen5EggSpeciesName(i18n.language, value),
        value,
      })),
    [i18n.language],
  );
  const selectedSpeciesLabel = getGen5EggSpeciesName(i18n.language, species);
  const displayedSpecies =
    speciesInput.language === i18n.language &&
    speciesInput.species === species &&
    speciesInput.text
      ? speciesInput.text
      : selectedSpeciesLabel;

  const resultValue = useCallback(
    (result: Gen5EggResult, key: SortKey): number | string => {
      const ivIndex = IV_KEYS.indexOf(key as IvKey);
      if (ivIndex >= 0)
        return showStats ? result.stats[ivIndex] : result.ivs[ivIndex];
      if (key === "buttons") return result.buttonMask ?? 0;
      if (key === "dateTime") return result.dateTime ?? "";
      if (key === "timer0") return result.timer0 ?? 0;
      return result[key as keyof Gen5EggResult] as number | string;
    },
    [showStats],
  );

  const sortedResults = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        compareValues(
          resultValue(left, sort.key),
          resultValue(right, sort.key),
        ) * direction,
    );
  }, [resultValue, results, sort]);
  const advanceFinderRows = useMemo(
    () => ({
      chatot: results.map((result) => ({
        advances: result.advances,
        value: result.chatot,
      })),
      needles: results.map((result) => ({
        advances: result.advances,
        value: result.needle,
      })),
    }),
    [results],
  );

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const focusResultAtIndex = (index: number, align: "auto" | "center") => {
    const result = sortedResults[index];
    if (!result) return;
    setSelectedResult(result);
    rowVirtualizer.scrollToIndex(index, { align });
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        tableRef.current
          ?.querySelector<HTMLElement>(`[data-row-index="${index}"]`)
          ?.focus(),
      ),
    );
  };

  const setOperation = (nextMode: Gen5EggMode) => {
    if (nextMode === mode || busy) return;
    engine.cancel();
    setMode(nextMode);
    setMaxAdvances(nextMode === "generator" ? "1000" : "100");
    setResults([]);
    setSelectedResult(undefined);
    setAdvanceFinderExpanded(false);
    setError("");
    setSummary(undefined);
    setStatus("ready");
    setProgress({
      processedUnits: 0,
      totalUnits: 0,
      resultCount: 0,
      percent: 0,
    });
    setSort({
      key: nextMode === "generator" ? "advances" : "seed",
      direction: "asc",
    });
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      nextIndex = (index - 1 + MODES.length) % MODES.length;
    else if (event.key === "ArrowRight" || event.key === "ArrowDown")
      nextIndex = (index + 1) % MODES.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = MODES.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    setOperation(MODES[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  };

  const updateParentIv = (parent: "a" | "b", index: number, value: string) => {
    const setter = parent === "a" ? setParentA : setParentB;
    setter((current) => ({
      ...current,
      ivs: current.ivs.map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ) as IvText,
    }));
  };

  const applyIvShortcut = (index: number, event: MouseEvent) => {
    const range: readonly [string, string] = event.ctrlKey
      ? event.altKey
        ? ["0", "0"]
        : ["31", "31"]
      : event.altKey
        ? ["30", "31"]
        : ["0", "31"];
    setIvMin(
      (current) =>
        current.map((value, currentIndex) =>
          currentIndex === index ? range[0] : value,
        ) as IvText,
    );
    setIvMax(
      (current) =>
        current.map((value, currentIndex) =>
          currentIndex === index ? range[1] : value,
        ) as IvText,
    );
  };

  const parentRequest = (parent: ParentDraft): Gen5EggParent => ({
    ...parent,
    ivs: parent.ivs.map(parseGen5EggDecimal) as Gen5EggIvTuple,
  });

  const request = (): Gen5EggRequest => {
    if (!selectedProfile) throw new TypeError("Please select a profile");
    if (displayedSpecies !== selectedSpeciesLabel)
      throw new TypeError("Please select an Egg Specie from the list.");
    const filtersOff = mode === "generator" && filtersDisabled;
    const common = {
      profile: gen5EggProfile(selectedProfile),
      initialAdvances: parseGen5EggDecimal(initialAdvances),
      maxAdvances: parseGen5EggDecimal(maxAdvances),
      species,
      masuda,
      parentA: parentRequest(parentA),
      parentB: parentRequest(parentB),
      filters: {
        disabled: filtersOff,
        shiny: filtersOff ? ("any" as const) : shiny,
        gender: filtersOff ? ("any" as const) : gender,
        ability: filtersOff ? ("any" as const) : ability,
        natureMask: filtersOff ? ALL_NATURES : natureMask || ALL_NATURES,
        hiddenPowerMask: filtersOff
          ? ALL_HIDDEN_POWERS
          : hiddenPowerMask || ALL_HIDDEN_POWERS,
        ivMin: (filtersOff
          ? [0, 0, 0, 0, 0, 0]
          : ivMin.map(parseGen5EggDecimal)) as Gen5EggIvTuple,
        ivMax: (filtersOff
          ? [31, 31, 31, 31, 31, 31]
          : ivMax.map(parseGen5EggDecimal)) as Gen5EggIvTuple,
      },
      resultLimit: GEN5_EGG_MAX_RESULTS,
    };
    return mode === "generator"
      ? {
          ...common,
          mode,
          seed,
          offset: parseGen5EggDecimal(offset),
        }
      : {
          ...common,
          mode,
          startDate,
          endDate,
        };
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    let nextRequest: Gen5EggRequest;
    try {
      nextRequest = validateGen5EggRequest(request());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
      return;
    }
    if (nextRequest.mode === "searcher") saveDates(startDate, endDate);
    setResultParentsReordered(
      shouldReorderGen5EggParents(nextRequest.parentA, nextRequest.parentB),
    );
    const totalUnits = Number(gen5EggTaskCount(nextRequest));
    setResults([]);
    setSelectedResult(undefined);
    setAdvanceFinderExpanded(false);
    setError("");
    setSummary(undefined);
    setStatus("calculating");
    setProgress({
      processedUnits: 0,
      totalUnits,
      resultCount: 0,
      percent: 0,
    });
    try {
      const nextSummary = await engine.search(nextRequest, {
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

  const displayValue = (result: Gen5EggResult, key: SortKey) => {
    const ivIndex = IV_KEYS.indexOf(key as IvKey);
    if (ivIndex >= 0) {
      const inherited = result.inheritance[ivIndex];
      if (showInheritance && inherited !== 0)
        return mapGen5EggInheritanceSource(
          inherited,
          resultParentsReordered,
        ) === 1
          ? "A"
          : "B";
      return String(showStats ? result.stats[ivIndex] : result.ivs[ivIndex]);
    }
    if (key === "chatot") return chatotLabel(result.chatot);
    if (key === "needle")
      return ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][result.needle];
    if (key === "shiny")
      return t(
        result.shiny === 2
          ? "shinySquare"
          : result.shiny === 1
            ? "shinyStar"
            : "shinyNone",
      );
    if (key === "nature") return t(NATURE_KEYS[result.nature]);
    if (key === "ability") {
      const name = getGen4AbilityName(i18n.language, result.abilityIndex);
      return result.ability === 2
        ? `H (${name})`
        : `${result.ability}: ${name}`;
    }
    if (key === "hiddenPower") return t(POWER_KEYS[result.hiddenPower]);
    if (key === "gender")
      return t(
        result.gender === 0
          ? "male"
          : result.gender === 1
            ? "female"
            : "genderless",
      );
    if (key === "characteristic")
      return characteristics[result.characteristic] ?? "-";
    if (key === "timer0")
      return result.timer0?.toString(16).toUpperCase() ?? "-";
    if (key === "buttons")
      return result.buttonMask === undefined
        ? "-"
        : formatGen5EggButtons(result.buttonMask);
    if (key === "dateTime") return result.dateTime ?? "-";
    return String(resultValue(result, key));
  };

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      columns.map((column) => columnLabel(column, chinese, t)),
      ...sortedResults.map((result) =>
        columns.map((column) => displayValue(result, column.key)),
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
    anchor.download = `pokerngkit-gen5egg-${mode}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const parentFields = (
    id: "a" | "b",
    parent: ParentDraft,
    setParent: typeof setParentA,
  ) => (
    <fieldset className="gen5egg-parent-block" disabled={busy}>
      <legend>{t(id === "a" ? "eggParentA" : "eggParentB")}</legend>
      <div className="gen5egg-parent-ivs">
        {IV_KEYS.map((key, index) => (
          <label className="gen5egg-field compact" key={key}>
            <span>{ivLabel(key)}</span>
            <input
              aria-label={`${t(id === "a" ? "eggParentA" : "eggParentB")} ${ivLabel(key)}`}
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
      <div className="gen5egg-parent-options">
        <label className="gen5egg-field">
          <span>{t("ability")}</span>
          <Select
            onChange={(event) =>
              setParent((current) => ({
                ...current,
                ability: Number(event.target.value) as Gen5EggParentAbility,
              }))
            }
            value={parent.ability}
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>H</option>
          </Select>
        </label>
        <label className="gen5egg-field">
          <span>{t("gender")}</span>
          <Select
            onChange={(event) =>
              setParent((current) => ({
                ...current,
                gender: event.target.value as Gen5EggParentGender,
              }))
            }
            value={parent.gender}
          >
            <option value="male">{t("male")}</option>
            <option value="female">{t("female")}</option>
            <option value="genderless">{t("genderless")}</option>
            <option value="ditto">
              {getGen5EggSpeciesName(i18n.language, 132)}
            </option>
          </Select>
        </label>
        <label className="gen5egg-field">
          <span>{chinese ? "道具" : "Item"}</span>
          <Select
            onChange={(event) =>
              setParent((current) => ({
                ...current,
                item: Number(event.target.value) as Gen5EggParentItem,
              }))
            }
            value={parent.item}
          >
            {items.map((label, value) => (
              <option key={label} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <label className="gen5egg-field">
          <span>{t("nature")}</span>
          <Select
            onChange={(event) =>
              setParent((current) => ({
                ...current,
                nature: Number(event.target.value),
              }))
            }
            value={parent.nature}
          >
            {NATURE_KEYS.map((key, value) => (
              <option key={key} value={value}>
                {t(key)}
              </option>
            ))}
          </Select>
        </label>
      </div>
    </fieldset>
  );

  const parentCombinationValid = isGen5EggParentCombinationValid(
    parentRequest(parentA),
    parentRequest(parentB),
  );

  return (
    <div className="gen5egg-panel">
      <section className="gen5egg-profile-bar">
        <label className="gen5egg-field gen5egg-profile-select">
          <span>{t("profile")}</span>
          <div className="gen5egg-profile-control">
            <Select
              disabled={busy || profiles.loading || profiles.busy}
              onChange={(event) =>
                void profiles.selectProfile(event.target.value || null)
              }
              value={profiles.selectedProfileId ?? ""}
            >
              <option value="">
                {profiles.loading ? "Loading..." : t("none")}
              </option>
              {profiles.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </Select>
            <button
              className="gen5egg-secondary"
              disabled={busy}
              onClick={onOpenProfileManager}
              type="button"
            >
              {t("manager")}
            </button>
          </div>
        </label>
        {selectedProfile ? (
          <dl className="gen5egg-profile-values">
            <div>
              <dt>{t("game")}</dt>
              <dd>{gameLabel(selectedProfile.version)}</dd>
            </div>
            <div>
              <dt>TID / SID</dt>
              <dd>
                {selectedProfile.tid} / {selectedProfile.sid}
              </dd>
            </div>
            <div>
              <dt>Timer0</dt>
              <dd>
                {selectedProfile.timer0Min.toString(16).toUpperCase()} -{" "}
                {selectedProfile.timer0Max.toString(16).toUpperCase()}
              </dd>
            </div>
            <div>
              <dt>{t("keypresses")}</dt>
              <dd
                title={
                  selectedProfile.keypresses
                    .map((enabled, index) => (enabled ? index : -1))
                    .filter((value) => value >= 0)
                    .join(", ") || t("none")
                }
              >
                {selectedProfile.keypresses
                  .map((enabled, index) => (enabled ? index : -1))
                  .filter((value) => value >= 0)
                  .join(", ") || t("none")}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="gen5egg-profile-empty">
            {t("pleaseSelectProfile")}
          </div>
        )}
      </section>

      <div
        aria-label="Gen 5 Eggs operation"
        className="gen5egg-mode-tabs"
        role="tablist"
      >
        {MODES.map((entry, index) => (
          <button
            aria-controls="gen5egg-workspace"
            aria-selected={mode === entry}
            className={mode === entry ? "active" : ""}
            disabled={busy}
            id={`gen5egg-${entry}-tab`}
            key={entry}
            onClick={() => setOperation(entry)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={mode === entry ? 0 : -1}
            type="button"
          >
            {t(entry)}
          </button>
        ))}
      </div>

      <form
        aria-labelledby={`gen5egg-${mode}-tab`}
        className="gen5egg-workspace"
        id="gen5egg-workspace"
        onSubmit={run}
        role="tabpanel"
      >
        <section className="gen5egg-section gen5egg-rng-section">
          <h2>{t("rngInfo")}</h2>
          <div className="gen5egg-form-stack">
            {mode === "generator" ? (
              <label className="gen5egg-field">
                <span>Seed</span>
                <input
                  disabled={busy}
                  inputMode="text"
                  maxLength={16}
                  onChange={(event) =>
                    setSeed(normalizeHexInput(event.target.value, 16))
                  }
                  value={seed}
                />
              </label>
            ) : (
              <>
                <label className="gen5egg-field">
                  <span>{chinese ? "起始日期" : "Start Date"}</span>
                  <input
                    disabled={busy}
                    max="2099-12-31"
                    min="2000-01-01"
                    onChange={(event) => setStartDate(event.target.value)}
                    type="date"
                    value={startDate}
                  />
                </label>
                <label className="gen5egg-field">
                  <span>{chinese ? "最后日期" : "End Date"}</span>
                  <input
                    disabled={busy}
                    max="2099-12-31"
                    min="2000-01-01"
                    onChange={(event) => setEndDate(event.target.value)}
                    type="date"
                    value={endDate}
                  />
                </label>
              </>
            )}
            <label className="gen5egg-field">
              <span>{t("initialAdvances")}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setInitialAdvances(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={initialAdvances}
              />
            </label>
            <label className="gen5egg-field">
              <span>{t("maxAdvances")}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setMaxAdvances(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={maxAdvances}
              />
            </label>
            {mode === "generator" && (
              <label className="gen5egg-field">
                <span>Offset</span>
                <input
                  disabled={busy}
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
            )}
          </div>
          <div className="gen5egg-run-actions">
            <button
              className="gen5egg-primary"
              disabled={busy || !selectedProfile}
              type="submit"
            >
              {t(mode === "generator" ? "generate" : "search")}
            </button>
            <button
              className="gen5egg-secondary"
              disabled={!busy}
              onClick={() => engine.cancel()}
              type="button"
            >
              {t("cancel")}
            </button>
          </div>
        </section>

        <section className="gen5egg-section gen5egg-settings-section">
          <h2>{t("settings")}</h2>
          <label className="gen5egg-field gen5egg-species-field">
            <span>{t("eggSpecies")}</span>
            <AutoCompleteComboBox
              disabled={busy}
              inputValue={displayedSpecies}
              label={t("eggSpecies")}
              onInputChange={(text) =>
                setSpeciesInput({
                  language: i18n.language,
                  species,
                  text,
                })
              }
              onValueChange={(value) => {
                setSpecies(value);
                setSpeciesInput({
                  language: i18n.language,
                  species: value,
                  text: "",
                });
              }}
              options={speciesOptions}
              value={species}
            />
          </label>
          <div className="gen5egg-parent-grid">
            {parentFields("a", parentA, setParentA)}
            {parentFields("b", parentB, setParentB)}
          </div>
          <div className="gen5egg-settings-toggles">
            <label className="gen5egg-toggle">
              <input
                checked={masuda}
                disabled={busy}
                onChange={(event) => setMasuda(event.target.checked)}
                type="checkbox"
              />
              <span>{chinese ? "异国" : "Masuda"}</span>
            </label>
            <label className="gen5egg-toggle">
              <input
                checked={showInheritance}
                onChange={(event) => setShowInheritance(event.target.checked)}
                type="checkbox"
              />
              <span>{t("eggShowInheritance")}</span>
            </label>
          </div>
          {!parentCombinationValid && (
            <div className="gen5egg-inline-alert" role="alert">
              Gender of selected parents are not compatible for breeding
            </div>
          )}
        </section>

        <section className="gen5egg-section gen5egg-filter-section">
          <div className="gen5egg-section-heading">
            <h2>{t("filters")}</h2>
            {mode === "generator" && (
              <label className="gen5egg-toggle">
                <input
                  checked={filtersDisabled}
                  disabled={busy}
                  onChange={(event) => setFiltersDisabled(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("disableFilters")}</span>
              </label>
            )}
          </div>
          <fieldset
            className="gen5egg-filter-fields"
            disabled={disableFilters || busy}
          >
            <div className="gen5egg-filter-selects">
              <label className="gen5egg-field">
                <span>{t("shiny")}</span>
                <Select
                  onChange={(event) =>
                    setShiny(event.target.value as Gen5EggShinyFilter)
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
              <label className="gen5egg-field">
                <span>{t("gender")}</span>
                <Select
                  onChange={(event) =>
                    setGender(event.target.value as Gen5EggGenderFilter)
                  }
                  value={gender}
                >
                  <option value="any">{t("any")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                  <option value="genderless">{t("genderless")}</option>
                </Select>
              </label>
              <label className="gen5egg-field">
                <span>{t("ability")}</span>
                <Select
                  onChange={(event) =>
                    setAbility(event.target.value as Gen5EggAbilityFilter)
                  }
                  value={ability}
                >
                  <option value="any">{t("any")}</option>
                  <option value="first">0</option>
                  <option value="second">1</option>
                  <option value="hidden">H</option>
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
            <div className="gen5egg-iv-filter">
              <div className="gen5egg-iv-header">
                <span>{t("ivs")}</span>
                <span>{t("minimum")}</span>
                <span>{t("maximum")}</span>
              </div>
              {IV_KEYS.map((key, index) => (
                <div className="gen5egg-iv-row" key={key}>
                  <button
                    className="gen5egg-iv-shortcut"
                    onClick={(event) => applyIvShortcut(index, event)}
                    title={t("ivShortcutHint")}
                    type="button"
                  >
                    {ivLabel(key)}
                  </button>
                  <input
                    aria-label={`${ivLabel(key)} ${t("minimum")}`}
                    inputMode="numeric"
                    max="31"
                    min="0"
                    onChange={(event) =>
                      setIvMin(
                        (current) =>
                          current.map((value, currentIndex) =>
                            currentIndex === index
                              ? normalizeDecimalInput(event.target.value, 31, 2)
                              : value,
                          ) as IvText,
                      )
                    }
                    value={ivMin[index]}
                  />
                  <input
                    aria-label={`${ivLabel(key)} ${t("maximum")}`}
                    inputMode="numeric"
                    max="31"
                    min="0"
                    onChange={(event) =>
                      setIvMax(
                        (current) =>
                          current.map((value, currentIndex) =>
                            currentIndex === index
                              ? normalizeDecimalInput(event.target.value, 31, 2)
                              : value,
                          ) as IvText,
                      )
                    }
                    value={ivMax[index]}
                  />
                </div>
              ))}
            </div>
            <div className="gen5egg-filter-tools">
              <label className="gen5egg-toggle">
                <input
                  checked={showStats}
                  onChange={(event) => setShowStats(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("showStats")}</span>
              </label>
              <button
                className="gen5egg-secondary"
                onClick={onOpenIvCalculator}
                type="button"
              >
                {t("ivCalculator")}
              </button>
            </div>
          </fieldset>
        </section>
      </form>

      <section aria-busy={busy} className="gen5egg-results">
        <div className="gen5egg-results-toolbar">
          <div className="gen5egg-status-group">
            <strong>{t("results")}</strong>
            <span className={`gen5egg-run-status ${status}`}>{t(status)}</span>
          </div>
          <div className="gen5egg-result-actions">
            {mode === "generator" && (
              <button
                aria-controls="gen5egg-advance-finder-panel"
                aria-expanded={advanceFinderExpanded}
                aria-haspopup="dialog"
                className="gen5egg-secondary"
                disabled={results.length === 0}
                id="gen5egg-advance-finder-trigger"
                onClick={() => setAdvanceFinderExpanded(true)}
                type="button"
              >
                Advance Finder
              </button>
            )}
            {mode === "searcher" && (
              <button
                className="gen5egg-secondary"
                disabled={
                  !selectedResult ||
                  !selectedProfile ||
                  selectedResult.dateTime === undefined ||
                  selectedResult.buttonMask === undefined
                }
                onClick={() => {
                  if (
                    !selectedResult ||
                    !selectedProfile ||
                    selectedResult.dateTime === undefined ||
                    selectedResult.buttonMask === undefined
                  ) {
                    return;
                  }
                  onOpenAdjacentSeeds({
                    dateTime: selectedResult.dateTime,
                    buttonMask: selectedResult.buttonMask,
                    encounter: "standard",
                  });
                }}
                type="button"
              >
                Adjacent Seeds
              </button>
            )}
            <output>
              {results.length.toLocaleString()} /{" "}
              {progress.totalUnits.toLocaleString()}
            </output>
            <button
              className="gen5egg-secondary"
              disabled={results.length === 0}
              onClick={exportCsv}
              type="button"
            >
              {t("exportCsv")}
            </button>
            <button
              className="gen5egg-secondary"
              disabled={results.length === 0}
              onClick={() => {
                setResults([]);
                setSelectedResult(undefined);
                setAdvanceFinderExpanded(false);
              }}
              type="button"
            >
              {t("clear")}
            </button>
          </div>
        </div>
        <div className="gen5egg-progress-row">
          <progress
            aria-label={`${progress.percent.toFixed(1)}%`}
            max={100}
            value={Math.min(100, progress.percent)}
          />
          <span>
            {t("processed")} {progress.processedUnits.toLocaleString()}
          </span>
          <span>{progress.percent.toFixed(1)}%</span>
        </div>
        {(error || profiles.error) && (
          <div className="gen5egg-alert" role="alert">
            {error || profiles.error}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="gen5egg-alert warning" role="status">
            {chinese ? "已达到结果上限" : "Result limit reached"}
          </div>
        )}
        <div className="gen5egg-table-shell" ref={tableRef}>
          <div
            aria-colcount={columns.length}
            aria-label={t("results")}
            aria-rowcount={sortedResults.length + 1}
            className="gen5egg-virtual-table"
            data-mode={mode}
            role="grid"
            style={{ height: `${rowVirtualizer.getTotalSize() + 44}px` }}
          >
            <div aria-rowindex={1} className="gen5egg-table-header" role="row">
              {columns.map((column) => (
                <span
                  aria-sort={
                    sort.key === column.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  key={column.key}
                  role="columnheader"
                >
                  <button
                    onClick={() =>
                      setSort((current) => ({
                        key: column.key,
                        direction:
                          current.key === column.key &&
                          current.direction === "asc"
                            ? "desc"
                            : "asc",
                      }))
                    }
                    type="button"
                  >
                    {columnLabel(column, chinese, t)}
                    {sort.key === column.key && (
                      <span aria-hidden="true">
                        {sort.direction === "asc" ? " ↑" : " ↓"}
                      </span>
                    )}
                  </button>
                </span>
              ))}
            </div>
            {sortedResults.length === 0 && (
              <div aria-rowindex={2} className="gen5egg-empty-state" role="row">
                <span role="gridcell">
                  {busy
                    ? chinese
                      ? "检索中"
                      : "Searching"
                    : chinese
                      ? "无结果"
                      : "No results"}
                </span>
              </div>
            )}
            {rowVirtualizer.getVirtualItems().map((row) => {
              const result = sortedResults[row.index];
              return (
                <div
                  aria-rowindex={row.index + 2}
                  aria-selected={selectedResult === result}
                  className={`gen5egg-table-row${
                    selectedResult === result ? " selected" : ""
                  }`}
                  data-row-index={row.index}
                  key={`${result.seed}-${result.advances}-${result.pid}-${row.index}`}
                  onClick={() => focusResultAtIndex(row.index, "auto")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedResult(result);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      focusResultAtIndex(Math.max(0, row.index - 1), "auto");
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusResultAtIndex(
                        Math.min(sortedResults.length - 1, row.index + 1),
                        "auto",
                      );
                    } else if (event.key === "Home") {
                      event.preventDefault();
                      focusResultAtIndex(0, "auto");
                    } else if (event.key === "End") {
                      event.preventDefault();
                      focusResultAtIndex(sortedResults.length - 1, "auto");
                    }
                  }}
                  role="row"
                  style={{ transform: `translateY(${row.start + 44}px)` }}
                  tabIndex={
                    selectedResult === result ||
                    (selectedResult === undefined && row.index === 0)
                      ? 0
                      : -1
                  }
                >
                  {columns.map((column) => (
                    <span
                      key={column.key}
                      role="gridcell"
                      title={displayValue(result, column.key)}
                    >
                      {displayValue(result, column.key)}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        <span aria-live="polite" className="gen5egg-sr-only" role="status">
          {status}: {results.length}
        </span>
      </section>
      <FloatingToolPanel
        className="gen5egg-advance-finder"
        closeLabel="Close Advance Finder"
        expanded={advanceFinderExpanded}
        id="gen5egg-advance-finder-panel"
        label="Advance Finder"
        onExpandedChange={setAdvanceFinderExpanded}
        tone="brand"
        triggerId="gen5egg-advance-finder-trigger"
      >
        <Gen4AdvancePanel
          initialMode="chatot"
          onJump={(match) => {
            const result = results[match.row];
            if (!result) return;
            const sortedIndex = sortedResults.indexOf(result);
            setAdvanceFinderExpanded(false);
            if (sortedIndex >= 0)
              requestAnimationFrame(() =>
                focusResultAtIndex(sortedIndex, "center"),
              );
          }}
          sourceRows={advanceFinderRows}
          showHeading={false}
          supportsCalls={false}
          supportsNeedles
          uiPreviewMode={uiPreviewMode}
        />
      </FloatingToolPanel>
    </div>
  );
}
