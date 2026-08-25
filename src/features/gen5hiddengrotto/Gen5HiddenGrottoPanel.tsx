import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput } from "../../input";
import { Gen4AdvancePanel } from "../gen4advance/Gen4AdvancePanel";
import {
  getGen4AbilityName,
  getIvCharacteristics,
} from "../gen4ivcalculator/gen4IvData";
import type { Gen5AdjacentSeedsInitialContext } from "../gen5adjacentseeds/domain";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { PerfectIvFilterFields } from "../shared/PerfectIvFilterFields";
import {
  parseGen5HiddenGrottoIvCache,
  parseGen5HiddenGrottoShaCache,
  prepareGen5HiddenGrottoCache,
  withGen5HiddenGrottoCache,
  type Gen5HiddenGrottoIvCache,
  type Gen5HiddenGrottoShaCache,
} from "./cache";
import {
  formatGen5HiddenGrottoButtons,
  gen5HiddenGrottoProfile,
  normalizeGen5HiddenGrottoSeed,
  validateGen5HiddenGrottoRequest,
  type Gen5HiddenGrottoIvTuple,
  type Gen5HiddenGrottoLead,
  type Gen5HiddenGrottoOperation,
  type Gen5HiddenGrottoPower,
  type Gen5HiddenGrottoRequest,
  type Gen5HiddenGrottoResult,
} from "./domain";
import {
  GEN5_HIDDEN_GROTTO_AREAS,
  getGen5HiddenGrottoAllowedGenders,
  getGen5HiddenGrottoItemName,
  getGen5HiddenGrottoLocationName,
  getGen5HiddenGrottoMatchMasks,
  getGen5HiddenGrottoSpeciesName,
  getGen5HiddenGrottoUniqueItems,
  getGen5HiddenGrottoUniqueSpecies,
} from "./encounters";
import { Gen5HiddenGrottoUiPreviewEngine } from "./preview/Gen5HiddenGrottoUiPreviewEngine";
import type { Gen5HiddenGrottoEngine, Gen5HiddenGrottoSummary } from "./search";
import { Gen5HiddenGrottoWorkerPool } from "./worker/Gen5HiddenGrottoWorkerPool";
import "./Gen5HiddenGrottoPanel.css";

type Workflow = "slot" | "pokemon";
type Mode = "generator" | "searcher";
type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
type SortDirection = "asc" | "desc";
type SortKey =
  | "seed"
  | "advances"
  | "ivAdvances"
  | "chatot"
  | "needle"
  | "group"
  | "slot"
  | "level"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | "hp"
  | "attack"
  | "defense"
  | "specialAttack"
  | "specialDefense"
  | "speed"
  | "hiddenPower"
  | "hiddenPowerStrength"
  | "gender"
  | "characteristic"
  | "dateTime"
  | "timer0"
  | "buttonMask";

interface ResultColumn {
  key: SortKey;
  label: string;
}

export interface Gen5HiddenGrottoPanelProps {
  uiPreviewMode: boolean;
  onOpenProfileManager(): void;
  onOpenAdjacentSeeds(
    context: Omit<Gen5AdjacentSeedsInitialContext, "requestId">,
  ): void;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const WORKFLOWS = ["slot", "pokemon"] as const;
const MODES = ["generator", "searcher"] as const;
const IV_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const IV_SORT_KEYS = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
] as const;
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

function today() {
  const now = new Date();
  const year = Math.min(2099, Math.max(2000, now.getFullYear()));
  const part = (value: number) => String(value).padStart(2, "0");
  return `${year}-${part(now.getMonth() + 1)}-${part(now.getDate())}`;
}

function versionLabel(version: string) {
  return version === "black2" ? "Black 2" : "White 2";
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

function needleLabel(value: number) {
  return ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][value] ?? String(value);
}

function updateIvTuple(tuple: IvText, index: number, value: string) {
  const next = [...tuple] as IvText;
  next[index] = normalizeDecimalInput(value, 31, 2);
  return next;
}

function numberValue(value: string) {
  return Number(value || "0");
}

function compareValues(left: string | number, right: string | number) {
  if (typeof left === "number" && typeof right === "number")
    return left - right;
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function Gen5HiddenGrottoPanel({
  uiPreviewMode,
  onOpenProfileManager,
  onOpenAdjacentSeeds,
}: Gen5HiddenGrottoPanelProps) {
  const { i18n, t } = useTranslation();
  const profiles = useGen5Profiles();
  const engine = useMemo<Gen5HiddenGrottoEngine>(
    () =>
      uiPreviewMode
        ? new Gen5HiddenGrottoUiPreviewEngine()
        : new Gen5HiddenGrottoWorkerPool(),
    [uiPreviewMode],
  );
  const language = i18n.resolvedLanguage ?? i18n.language;
  const chinese = language.startsWith("zh");
  const labels = {
    hiddenGrotto: chinese ? "隐藏洞穴" : "Hidden Grotto",
    grotto: chinese ? "隐藏洞穴" : "Grotto",
    settings: chinese ? "设置" : "Settings",
    rngInfo: chinese ? "乱数信息" : "RNG Info",
    startDate: chinese ? "起始日期" : "Start Date",
    endDate: chinese ? "最后日期" : "End Date",
    location: chinese ? "地点" : "Location",
    items: chinese ? "道具" : "Items",
    group: "Group",
    slot: "Slot",
    needle: "Needle",
    buttons: "Buttons",
    ivAdvances: "IV Advances",
    initialIvAdvances: "Initial IV Advances",
    maxIvAdvances: "Max IV Advances",
    levels: "Levels",
    grottoPower: chinese ? "释出之力等级" : "Grotto Power",
    lead: chinese ? "队首" : "Lead",
    synchronize: chinese ? "同步" : "Synchronize",
    profile: "Profile",
    manager: "Manager",
    advances: chinese ? "帧数" : "Advances",
    chatot: chinese ? "音高" : "Chatot",
    level: chinese ? "等级" : "Level",
    shiny: chinese ? "异色" : "Shiny",
    nature: chinese ? "性格" : "Nature",
    ability: chinese ? "特性" : "Ability",
    hidden: chinese ? "觉醒属性" : "Hidden",
    power: chinese ? "觉醒威力" : "Power",
    gender: chinese ? "性别" : "Gender",
    characteristic: chinese ? "个性" : "Characteristic",
    dateTime: chinese ? "日期/时间" : "Date/Time",
    pokemon: chinese ? "宝可梦" : "Pokemon",
    seed: "Seed",
    initialAdvances: chinese ? "初始帧" : "Initial Advances",
    maxAdvances: chinese ? "最大帧数" : "Max Advances",
    offset: "Offset",
    generator: chinese ? "生成器" : "Generator",
    searcher: chinese ? "检索器" : "Searcher",
    generate: chinese ? "生成" : "Generate",
    search: chinese ? "检索" : "Search",
    cancel: chinese ? "取消" : "Cancel",
    any: chinese ? "任意" : "Any",
    none: chinese ? "无" : "None",
    noProfile: chinese
      ? "请选择 Black 2 或 White 2 存档。"
      : "Select a Black 2 or White 2 profile.",
    emptyResults: chinese ? "暂无结果" : "No results",
    resultLimit: chinese ? "已达到结果上限。" : "Result limit reached.",
    cacheFast: "Settings are configured for fast IV/SHA searching",
    cacheIv:
      "Settings are configured for fast IV searching.\nProfile is missing or has an incompatible SHA cache.",
    cacheMissing: "Profile does not have a IV cache file configured",
    cacheSlow: "Settings are not configured for fast searching",
  };
  const supportedProfiles = profiles.profiles.filter(
    (entry) => entry.version === "black2" || entry.version === "white2",
  );
  const selectedProfile = profiles.selectedProfile;
  const profile =
    selectedProfile?.version === "black2" ||
    selectedProfile?.version === "white2"
      ? selectedProfile
      : undefined;

  const [workflow, setWorkflow] = useState<Workflow>("slot");
  const [mode, setMode] = useState<Mode>("generator");
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("1000");
  const [offset, setOffset] = useState("");
  const [initialIvAdvances, setInitialIvAdvances] = useState("0");
  const [maxIvAdvances, setMaxIvAdvances] = useState("0");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [areaIndex, setAreaIndex] = useState(0);
  const [grottoPower, setGrottoPower] = useState<Gen5HiddenGrottoPower>("none");
  const [selectedSpecies, setSelectedSpecies] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [slotMask, setSlotMask] = useState(0);
  const [groupMask, setGroupMask] = useState(0);
  const [slotGenderMask, setSlotGenderMask] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [pokemonGender, setPokemonGender] = useState<0 | 1 | 2>(0);
  const [leadType, setLeadType] = useState<"none" | "synchronize">("none");
  const [leadNature, setLeadNature] = useState(0);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [ivMin, setIvMin] = useState<IvText>(["0", "0", "0", "0", "0", "0"]);
  const [ivMax, setIvMax] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [perfectIvValue, setPerfectIvValue] = useState("31");
  const [perfectIvCount, setPerfectIvCount] = useState("0");
  const firstSlot = GEN5_HIDDEN_GROTTO_AREAS[0].pokemon[0];
  const [levelMin, setLevelMin] = useState(String(firstSlot.minLevel));
  const [levelMax, setLevelMax] = useState(String(firstSlot.maxLevel));
  const [natureMask, setNatureMask] = useState(ALL_NATURES);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(ALL_HIDDEN_POWERS);
  const [ivCache, setIvCache] = useState<Gen5HiddenGrottoIvCache>();
  const [shaCache, setShaCache] = useState<Gen5HiddenGrottoShaCache>();
  const [results, setResults] = useState<Gen5HiddenGrottoResult[]>([]);
  const [selectedResult, setSelectedResult] =
    useState<Gen5HiddenGrottoResult>();
  const [advanceFinderExpanded, setAdvanceFinderExpanded] = useState(false);
  const [summary, setSummary] = useState<Gen5HiddenGrottoSummary>();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "advances",
    direction: "asc",
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const workflowTabs = useRef<Array<HTMLButtonElement | null>>([]);
  const modeTabs = useRef<Array<HTMLButtonElement | null>>([]);

  const operation = `${workflow}-${mode}` as Gen5HiddenGrottoOperation;
  const area = GEN5_HIDDEN_GROTTO_AREAS[areaIndex];
  const pokemonSlot = area.pokemon[selectedGroup * 3 + selectedSlot];
  const allowedGenders = getGen5HiddenGrottoAllowedGenders(pokemonSlot);
  const busy = status === "calculating";
  const filtersAreDisabled = mode === "generator" && filtersDisabled;

  useEffect(() => () => engine.dispose(), [engine]);

  const resetRunState = (nextSort: SortKey = "advances") => {
    setResults([]);
    setSelectedResult(undefined);
    setSummary(undefined);
    setProgress(0);
    setStatus("ready");
    setError("");
    setSort({ key: nextSort, direction: "asc" });
  };

  const selectProfile = (id: string) => {
    void profiles.selectProfile(id || null);
    setIvCache(undefined);
    setShaCache(undefined);
    resetRunState(mode === "searcher" ? "seed" : "advances");
  };

  const changeWorkflow = (next: Workflow) => {
    setWorkflow(next);
    resetRunState(mode === "searcher" ? "seed" : "advances");
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setMaxAdvances(next === "generator" ? "1000" : "100");
    resetRunState(next === "searcher" ? "seed" : "advances");
  };

  const tabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    values: readonly string[],
    current: number,
    change: (value: string) => void,
    refs: React.MutableRefObject<Array<HTMLButtonElement | null>>,
  ) => {
    let next: number | undefined;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (current - 1 + values.length) % values.length;
    else if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (current + 1) % values.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = values.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    change(values[next]);
    refs.current[next]?.focus();
  };

  const updateArea = (index: number) => {
    const nextArea = GEN5_HIDDEN_GROTTO_AREAS[index];
    const nextSlot = nextArea.pokemon[0];
    const nextGender = getGen5HiddenGrottoAllowedGenders(nextSlot)[0];
    setAreaIndex(index);
    setSelectedSpecies(null);
    setSelectedItem(null);
    setSlotMask(0);
    setGroupMask(0);
    setSelectedGroup(0);
    setSelectedSlot(0);
    setPokemonGender(nextGender);
    setLevelMin(String(nextSlot.minLevel));
    setLevelMax(String(nextSlot.maxLevel));
  };

  const updatePokemonSelection = (group: number, slot: number) => {
    const next = area.pokemon[group * 3 + slot];
    setSelectedGroup(group);
    setSelectedSlot(slot);
    setPokemonGender(getGen5HiddenGrottoAllowedGenders(next)[0]);
    setLevelMin(String(next.minLevel));
    setLevelMax(String(next.maxLevel));
  };

  const updateQuickMasks = (species: number | null, item: number | null) => {
    const masks = getGen5HiddenGrottoMatchMasks(area, species, item);
    setSelectedSpecies(species);
    setSelectedItem(item);
    setGroupMask(masks.groupMask);
    setSlotMask(masks.slotMask);
  };

  const buildPokemonFilters = () => ({
    disabled: workflow === "pokemon" && filtersAreDisabled,
    ivMin: ivMin.map(numberValue) as Gen5HiddenGrottoIvTuple,
    ivMax: ivMax.map(numberValue) as Gen5HiddenGrottoIvTuple,
    perfectIvValue: numberValue(perfectIvValue),
    perfectIvCount: numberValue(perfectIvCount),
    natureMask,
    hiddenPowerMask,
    levelMin: numberValue(levelMin),
    levelMax: numberValue(levelMax),
  });

  const buildRequest = (): Gen5HiddenGrottoRequest => {
    if (!profile) throw new TypeError(labels.noProfile);
    const common = {
      profile: gen5HiddenGrottoProfile(profile),
      area,
      initialAdvances: numberValue(initialAdvances),
      maxAdvances: numberValue(maxAdvances),
      offset: mode === "generator" ? numberValue(offset) : 0,
      initialIvAdvances:
        workflow === "pokemon" ? numberValue(initialIvAdvances) : 0,
      maxIvAdvances:
        workflow === "pokemon" && mode === "searcher"
          ? numberValue(maxIvAdvances)
          : 0,
      lead:
        leadType === "synchronize"
          ? ({
              type: "synchronize",
              nature: leadNature,
            } as Gen5HiddenGrottoLead)
          : ({ type: "none" } as Gen5HiddenGrottoLead),
      grottoPower,
      selectedGroup,
      selectedSlot,
      gender: pokemonGender,
      slotFilters: {
        slotMask,
        genderMask: slotGenderMask,
        groupMask,
      },
      pokemonFilters: buildPokemonFilters(),
      resultLimit: 100_000,
      cache: null,
    };
    if (mode === "generator")
      return {
        ...common,
        operation: workflow === "slot" ? "slot-generator" : "pokemon-generator",
        seed,
      };
    return {
      ...common,
      operation: workflow === "slot" ? "slot-searcher" : "pokemon-searcher",
      startDate,
      endDate,
    };
  };

  const fastStatus = (() => {
    if (workflow !== "pokemon" || mode !== "searcher" || !profile) return "";
    try {
      const request = buildRequest();
      if (!("startDate" in request)) return "";
      if (!ivCache) return labels.cacheMissing;
      const prepared = prepareGen5HiddenGrottoCache(request, ivCache, shaCache);
      if (!prepared) return labels.cacheSlow;
      return prepared.descriptor.mode === "iv-sha"
        ? labels.cacheFast
        : labels.cacheIv;
    } catch {
      return labels.cacheSlow;
    }
  })();

  const loadCacheFile = async (
    event: ChangeEvent<HTMLInputElement>,
    type: "iv" | "sha",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      if (type === "iv")
        setIvCache(parseGen5HiddenGrottoIvCache(buffer, file.name));
      else setShaCache(parseGen5HiddenGrottoShaCache(buffer, file.name));
      setError("");
    } catch (cause) {
      if (type === "iv") setIvCache(undefined);
      else setShaCache(undefined);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      event.target.value = "";
    }
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    try {
      const base = buildRequest();
      const prepared =
        operation === "pokemon-searcher" && "startDate" in base
          ? prepareGen5HiddenGrottoCache(base, ivCache, shaCache)
          : undefined;
      const request =
        "startDate" in base ? withGen5HiddenGrottoCache(base, prepared) : base;
      validateGen5HiddenGrottoRequest(request);
      setError("");
      setResults([]);
      setSelectedResult(undefined);
      setSummary(undefined);
      setProgress(0);
      setStatus("calculating");
      const next = await engine.search(request, {
        cache: prepared,
        onBatch: setResults,
        onProgress: (value) => setProgress(value.percent),
      });
      setSummary(next);
      setProgress(next.percent);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const speciesOptions = getGen5HiddenGrottoUniqueSpecies(area);
  const itemOptions = getGen5HiddenGrottoUniqueItems(area);
  const groupOptions = Array.from({ length: 4 }, (_, value) => ({
    value,
    label: String(value),
  }));
  const slotOptions = Array.from({ length: 11 }, (_, value) => ({
    value,
    label: String(value),
  }));
  const genderOptions = [
    { value: 0, label: t("male") },
    { value: 1, label: t("female") },
  ];
  const natureOptions = NATURE_KEYS.map((key, value) => ({
    value,
    label: t(key),
  }));
  const powerOptions = POWER_KEYS.map((key, value) => ({
    value,
    label: t(key),
  }));

  const columns = useMemo<readonly ResultColumn[]>(() => {
    if (operation === "slot-generator")
      return [
        { key: "advances", label: labels.advances },
        { key: "chatot", label: labels.chatot },
        { key: "needle", label: labels.needle },
        { key: "group", label: labels.group },
        { key: "slot", label: labels.slot },
      ];
    if (operation === "slot-searcher")
      return [
        { key: "seed", label: "Seed" },
        { key: "advances", label: labels.advances },
        { key: "group", label: labels.group },
        { key: "slot", label: labels.slot },
        { key: "dateTime", label: labels.dateTime },
        { key: "timer0", label: "Timer0" },
        { key: "buttonMask", label: labels.buttons },
      ];
    const pokemonColumns: ResultColumn[] = [
      { key: "advances", label: labels.advances },
      { key: "chatot", label: labels.chatot },
      { key: "needle", label: labels.needle },
      { key: "level", label: labels.level },
      { key: "pid", label: "PID" },
      { key: "shiny", label: labels.shiny },
      { key: "nature", label: labels.nature },
      { key: "ability", label: labels.ability },
      ...IV_LABELS.map((label, index) => ({ key: IV_SORT_KEYS[index], label })),
      { key: "hiddenPower", label: labels.hidden },
      { key: "hiddenPowerStrength", label: labels.power },
      { key: "gender", label: labels.gender },
      { key: "characteristic", label: labels.characteristic },
    ];
    if (operation === "pokemon-generator") return pokemonColumns;
    return [
      { key: "seed", label: "Seed" },
      { key: "advances", label: "Advances" },
      { key: "ivAdvances", label: labels.ivAdvances },
      ...pokemonColumns.slice(3),
      { key: "dateTime", label: labels.dateTime },
      { key: "timer0", label: "Timer0" },
      { key: "buttonMask", label: labels.buttons },
    ];
  }, [
    labels.ability,
    labels.advances,
    labels.buttons,
    labels.characteristic,
    labels.chatot,
    labels.dateTime,
    labels.gender,
    labels.group,
    labels.hidden,
    labels.ivAdvances,
    labels.level,
    labels.nature,
    labels.needle,
    labels.power,
    labels.shiny,
    labels.slot,
    operation,
  ]);

  const rowValue = (result: Gen5HiddenGrottoResult, key: SortKey) => {
    if (key === "seed") return result.seed;
    if (key === "advances") return result.advances;
    if (key === "dateTime") return result.dateTime ?? "";
    if (key === "timer0") return result.timer0 ?? -1;
    if (key === "buttonMask") return result.buttonMask ?? -1;
    if (result.kind === "slot") {
      if (key === "chatot") return result.chatot;
      if (key === "needle") return result.needle;
      if (key === "group") return result.group;
      if (key === "slot") return result.slot;
      return "";
    }
    if (key === "ivAdvances") return result.ivAdvances;
    if (key === "chatot") return result.chatot;
    if (key === "needle") return result.needle;
    if (key === "level") return result.level;
    if (key === "pid") return result.pid;
    if (key === "shiny") return result.shiny;
    if (key === "nature") return result.nature;
    if (key === "ability") return result.ability;
    if (key === "hiddenPower") return result.hiddenPower;
    if (key === "hiddenPowerStrength") return result.hiddenPowerStrength;
    if (key === "gender") return result.gender;
    if (key === "characteristic") return result.characteristic;
    const ivIndex = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
    return ivIndex >= 0
      ? showStats
        ? result.stats[ivIndex]
        : result.ivs[ivIndex]
      : "";
  };

  const sortedResults = useMemo(
    () =>
      results
        .map((result, index) => ({ result, index }))
        .sort((left, right) => {
          const compared = compareValues(
            rowValue(left.result, sort.key),
            rowValue(right.result, sort.key),
          );
          return (
            (sort.direction === "asc" ? compared : -compared) ||
            left.index - right.index
          );
        })
        .map(({ result }) => result),
    // rowValue intentionally reflects showStats and translated value-independent sort fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results, showStats, sort],
  );

  const displayValue = (result: Gen5HiddenGrottoResult, key: SortKey) => {
    if (key === "seed") return result.seed;
    if (key === "advances") return result.advances.toLocaleString();
    if (key === "dateTime") return result.dateTime ?? "";
    if (key === "timer0")
      return result.timer0 === undefined
        ? ""
        : result.timer0.toString(16).toUpperCase();
    if (key === "buttonMask")
      return result.buttonMask === undefined
        ? ""
        : formatGen5HiddenGrottoButtons(result.buttonMask);
    if (result.kind === "slot") {
      if (key === "chatot") return chatotLabel(result.chatot);
      if (key === "needle") return needleLabel(result.needle);
      if (key === "group") return String(result.group);
      if (key === "slot") {
        const name = result.item
          ? getGen5HiddenGrottoItemName(language, result.data)
          : `${getGen5HiddenGrottoSpeciesName(language, result.data)} ${
              result.gender === 0 ? t("male") : t("female")
            }`;
        return result.item
          ? `${result.slot}: ${name}`
          : `${result.slot} (${name})`;
      }
      return "";
    }
    if (key === "ivAdvances") return result.ivAdvances.toLocaleString();
    if (key === "chatot") return chatotLabel(result.chatot);
    if (key === "needle") return needleLabel(result.needle);
    if (key === "level") return String(result.level);
    if (key === "pid") return result.pid;
    if (key === "shiny") return t("no");
    if (key === "nature") return t(NATURE_KEYS[result.nature]);
    if (key === "ability") {
      const ability = getGen4AbilityName(language, result.abilityIndex);
      return result.ability === 2
        ? `H (${ability})`
        : `${result.ability}: ${ability}`;
    }
    if (key === "hiddenPower") return t(POWER_KEYS[result.hiddenPower]);
    if (key === "hiddenPowerStrength")
      return String(result.hiddenPowerStrength);
    if (key === "gender")
      return result.gender === 0
        ? t("male")
        : result.gender === 1
          ? t("female")
          : t("genderless");
    if (key === "characteristic")
      return (
        getIvCharacteristics(language, "bw2")[result.characteristic] ??
        String(result.characteristic)
      );
    const ivIndex = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
    return ivIndex >= 0
      ? String(showStats ? result.stats[ivIndex] : result.ivs[ivIndex])
      : "";
  };

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 10,
  });

  const moveRowFocus = (
    index: number,
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    let next: number | undefined;
    if (event.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (event.key === "ArrowDown")
      next = Math.min(sortedResults.length - 1, index + 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = sortedResults.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedResult(sortedResults[index]);
      return;
    }
    if (next === undefined || next < 0) return;
    event.preventDefault();
    setSelectedResult(sortedResults[next]);
    rowVirtualizer.scrollToIndex(next, { align: "auto" });
    requestAnimationFrame(() =>
      tableRef.current
        ?.querySelector<HTMLElement>(`[data-row-index="${next}"]`)
        ?.focus(),
    );
  };

  const advanceRows = useMemo(
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

  return (
    <div className="gen5hiddengrotto-panel">
      <section className="gen5hiddengrotto-profile panel">
        <div className="gen5hiddengrotto-profile-heading">
          <h2>{labels.profile}</h2>
          <div className="gen5hiddengrotto-profile-actions">
            <label className="field">
              <span>{labels.profile}</span>
              <Select
                disabled={busy || profiles.loading || profiles.busy}
                onChange={(event) => selectProfile(event.target.value)}
                value={profile?.id ?? ""}
              >
                <option value="">-</option>
                {supportedProfiles.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </Select>
            </label>
            <button
              className="secondary-action"
              disabled={busy}
              onClick={onOpenProfileManager}
              type="button"
            >
              {labels.manager}
            </button>
          </div>
        </div>
        {profile && (
          <dl className="gen5hiddengrotto-profile-values">
            <div>
              <dt>Version</dt>
              <dd>{versionLabel(profile.version)}</dd>
            </div>
            <div>
              <dt>TID / SID</dt>
              <dd>
                {profile.tid} / {profile.sid}
              </dd>
            </div>
            <div>
              <dt>Timer0</dt>
              <dd>
                {profile.timer0Min.toString(16).toUpperCase()} -{" "}
                {profile.timer0Max.toString(16).toUpperCase()}
              </dd>
            </div>
            <div>
              <dt>VCount</dt>
              <dd>{profile.vcount.toString(16).toUpperCase()}</dd>
            </div>
            <div>
              <dt>MAC</dt>
              <dd>{profile.mac}</dd>
            </div>
          </dl>
        )}
      </section>

      <div className="gen5hiddengrotto-tab-row">
        <div
          aria-label={labels.hiddenGrotto}
          className="gen5hiddengrotto-tabs"
          role="tablist"
        >
          {WORKFLOWS.map((value, index) => (
            <button
              aria-selected={workflow === value}
              className={workflow === value ? "active" : ""}
              disabled={busy}
              key={value}
              onClick={() => changeWorkflow(value)}
              onKeyDown={(event) =>
                tabKeyDown(
                  event,
                  WORKFLOWS,
                  index,
                  (next) => changeWorkflow(next as Workflow),
                  workflowTabs,
                )
              }
              ref={(node) => {
                workflowTabs.current[index] = node;
              }}
              role="tab"
              tabIndex={workflow === value ? 0 : -1}
              type="button"
            >
              {value === "slot" ? labels.grotto : labels.pokemon}
            </button>
          ))}
        </div>
        <div
          aria-label="Operation"
          className="gen5hiddengrotto-tabs secondary"
          role="tablist"
        >
          {MODES.map((value, index) => (
            <button
              aria-selected={mode === value}
              className={mode === value ? "active" : ""}
              disabled={busy}
              key={value}
              onClick={() => changeMode(value)}
              onKeyDown={(event) =>
                tabKeyDown(
                  event,
                  MODES,
                  index,
                  (next) => changeMode(next as Mode),
                  modeTabs,
                )
              }
              ref={(node) => {
                modeTabs.current[index] = node;
              }}
              role="tab"
              tabIndex={mode === value ? 0 : -1}
              type="button"
            >
              {value === "generator" ? labels.generator : labels.searcher}
            </button>
          ))}
        </div>
      </div>

      <form className="gen5hiddengrotto-workspace" onSubmit={run}>
        <div className="gen5hiddengrotto-controls">
          <section className="gen5hiddengrotto-settings panel">
            <h2>{labels.rngInfo}</h2>
            <div className="gen5hiddengrotto-form-grid">
              {mode === "generator" ? (
                <label className="field gen5hiddengrotto-wide-field">
                  <span>{labels.seed}</span>
                  <input
                    disabled={busy}
                    inputMode="text"
                    maxLength={16}
                    onChange={(event) =>
                      setSeed(normalizeGen5HiddenGrottoSeed(event.target.value))
                    }
                    value={seed}
                  />
                </label>
              ) : (
                <>
                  <label className="field">
                    <span>{labels.startDate}</span>
                    <input
                      disabled={busy}
                      max="2099-12-31"
                      min="2000-01-01"
                      onChange={(event) => setStartDate(event.target.value)}
                      type="date"
                      value={startDate}
                    />
                  </label>
                  <label className="field">
                    <span>{labels.endDate}</span>
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
              <AdvanceField
                disabled={busy}
                label={labels.initialAdvances}
                onChange={setInitialAdvances}
                value={initialAdvances}
              />
              <AdvanceField
                disabled={busy}
                label={labels.maxAdvances}
                onChange={setMaxAdvances}
                value={maxAdvances}
              />
              {mode === "generator" && (
                <AdvanceField
                  disabled={busy}
                  label={labels.offset}
                  onChange={setOffset}
                  value={offset}
                />
              )}
              {workflow === "pokemon" && (
                <AdvanceField
                  disabled={busy}
                  label={
                    mode === "generator"
                      ? labels.ivAdvances
                      : labels.initialIvAdvances
                  }
                  onChange={setInitialIvAdvances}
                  value={initialIvAdvances}
                />
              )}
              {workflow === "pokemon" && mode === "searcher" && (
                <AdvanceField
                  disabled={busy}
                  label={labels.maxIvAdvances}
                  onChange={setMaxIvAdvances}
                  value={maxIvAdvances}
                />
              )}
            </div>

            <h2 className="gen5hiddengrotto-section-heading">
              {labels.settings}
            </h2>
            <div className="gen5hiddengrotto-form-grid">
              <label className="field gen5hiddengrotto-wide-field">
                <span>{labels.location}</span>
                <Select
                  disabled={busy}
                  onChange={(event) => updateArea(Number(event.target.value))}
                  value={areaIndex}
                >
                  {GEN5_HIDDEN_GROTTO_AREAS.map((entry, index) => (
                    <option key={entry.location} value={index}>
                      {getGen5HiddenGrottoLocationName(
                        language,
                        entry.location,
                      )}
                    </option>
                  ))}
                </Select>
              </label>
              {workflow === "slot" ? (
                <>
                  <label className="field">
                    <span>{labels.grottoPower}</span>
                    <Select
                      disabled={busy}
                      onChange={(event) =>
                        setGrottoPower(
                          event.target.value as Gen5HiddenGrottoPower,
                        )
                      }
                      value={grottoPower}
                    >
                      <option value="none">{labels.none}</option>
                      <option value="level1">Level 1</option>
                      <option value="level2">Level 2</option>
                      <option value="level3">Level 3</option>
                      <option value="levelS">Level S</option>
                    </Select>
                  </label>
                  <label className="field">
                    <span>{labels.pokemon}</span>
                    <Select
                      disabled={busy}
                      onChange={(event) =>
                        updateQuickMasks(
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                          selectedItem,
                        )
                      }
                      value={selectedSpecies ?? ""}
                    >
                      <option value="">-</option>
                      {speciesOptions.map((species) => (
                        <option key={species} value={species}>
                          {getGen5HiddenGrottoSpeciesName(language, species)}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="field">
                    <span>{labels.items}</span>
                    <Select
                      disabled={busy}
                      onChange={(event) =>
                        updateQuickMasks(
                          selectedSpecies,
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                      value={selectedItem ?? ""}
                    >
                      <option value="">-</option>
                      {itemOptions.map((item) => (
                        <option key={item} value={item}>
                          {getGen5HiddenGrottoItemName(language, item)}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <MultiCheckSelect
                    anyLabel={labels.any}
                    disabled={busy}
                    label={labels.group}
                    mask={groupMask}
                    onChange={setGroupMask}
                    options={groupOptions}
                  />
                  <MultiCheckSelect
                    anyLabel={labels.any}
                    disabled={busy}
                    label={labels.slot}
                    mask={slotMask}
                    onChange={setSlotMask}
                    options={slotOptions}
                  />
                  <MultiCheckSelect
                    anyLabel={labels.any}
                    disabled={busy}
                    label={labels.gender}
                    mask={slotGenderMask}
                    onChange={setSlotGenderMask}
                    options={genderOptions}
                  />
                </>
              ) : (
                <>
                  <label className="field">
                    <span>{labels.group}</span>
                    <Select
                      disabled={busy}
                      onChange={(event) =>
                        updatePokemonSelection(
                          Number(event.target.value),
                          selectedSlot,
                        )
                      }
                      value={selectedGroup}
                    >
                      {groupOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="field">
                    <span>{labels.pokemon}</span>
                    <Select
                      disabled={busy}
                      onChange={(event) =>
                        updatePokemonSelection(
                          selectedGroup,
                          Number(event.target.value),
                        )
                      }
                      value={selectedSlot}
                    >
                      {[0, 1, 2].map((slot) => {
                        const entry = area.pokemon[selectedGroup * 3 + slot];
                        return (
                          <option key={slot} value={slot}>
                            {slot}:{" "}
                            {getGen5HiddenGrottoSpeciesName(
                              language,
                              entry.species,
                              entry.form,
                            )}
                          </option>
                        );
                      })}
                    </Select>
                  </label>
                  <label className="field">
                    <span>{labels.gender}</span>
                    <Select
                      disabled={busy}
                      onChange={(event) =>
                        setPokemonGender(
                          Number(event.target.value) as 0 | 1 | 2,
                        )
                      }
                      value={pokemonGender}
                    >
                      {allowedGenders.map((gender) => (
                        <option key={gender} value={gender}>
                          {gender === 0
                            ? t("male")
                            : gender === 1
                              ? t("female")
                              : t("genderless")}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="field">
                    <span>{labels.lead}</span>
                    <Select
                      disabled={busy}
                      onChange={(event) =>
                        setLeadType(
                          event.target.value as "none" | "synchronize",
                        )
                      }
                      value={leadType}
                    >
                      <option value="none">{labels.none}</option>
                      <option value="synchronize">{labels.synchronize}</option>
                    </Select>
                  </label>
                  {leadType === "synchronize" && (
                    <label className="field gen5hiddengrotto-wide-field">
                      <span>{t("nature")}</span>
                      <Select
                        disabled={busy}
                        onChange={(event) =>
                          setLeadNature(Number(event.target.value))
                        }
                        value={leadNature}
                      >
                        {natureOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                  )}
                </>
              )}
            </div>

            {workflow === "pokemon" && mode === "searcher" && (
              <div className="gen5hiddengrotto-cache-section">
                <label className="gen5hiddengrotto-file-field">
                  <span>IV Cache</span>
                  <input
                    accept=".ivcache"
                    disabled={busy}
                    onChange={(event) => void loadCacheFile(event, "iv")}
                    type="file"
                  />
                  <output>{ivCache?.name ?? profile?.ivCacheName ?? ""}</output>
                </label>
                <label className="gen5hiddengrotto-file-field">
                  <span>SHA1 Cache</span>
                  <input
                    accept=".sha1cache"
                    disabled={busy}
                    onChange={(event) => void loadCacheFile(event, "sha")}
                    type="file"
                  />
                  <output>
                    {shaCache?.name ?? profile?.shaCacheName ?? ""}
                  </output>
                </label>
                <p className="gen5hiddengrotto-cache-status">{fastStatus}</p>
              </div>
            )}
          </section>

          {workflow === "pokemon" && (
            <section className="gen5hiddengrotto-filters panel">
              <div className="gen5hiddengrotto-filter-heading">
                <h2>{t("filters")}</h2>
                {mode === "generator" && (
                  <label className="gen5hiddengrotto-toggle">
                    <input
                      checked={filtersDisabled}
                      disabled={busy}
                      onChange={(event) =>
                        setFiltersDisabled(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>{chinese ? "取消筛选" : "Disable Filters"}</span>
                  </label>
                )}
              </div>
              <label className="gen5hiddengrotto-toggle">
                <input
                  checked={showStats}
                  disabled={busy}
                  onChange={(event) => setShowStats(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("showStats")}</span>
              </label>
              <div className="gen5hiddengrotto-iv-range">
                {IV_LABELS.map((label, index) => (
                  <div key={label}>
                    <span>{label}</span>
                    <input
                      aria-label={`${label} Min`}
                      disabled={busy || filtersAreDisabled}
                      inputMode="numeric"
                      max="31"
                      min="0"
                      onChange={(event) =>
                        setIvMin((current) =>
                          updateIvTuple(current, index, event.target.value),
                        )
                      }
                      value={ivMin[index]}
                    />
                    <span>–</span>
                    <input
                      aria-label={`${label} Max`}
                      disabled={busy || filtersAreDisabled}
                      inputMode="numeric"
                      max="31"
                      min="0"
                      onChange={(event) =>
                        setIvMax((current) =>
                          updateIvTuple(current, index, event.target.value),
                        )
                      }
                      value={ivMax[index]}
                    />
                  </div>
                ))}
              </div>
              <PerfectIvFilterFields
                count={perfectIvCount}
                disabled={busy || filtersAreDisabled}
                onCountChange={setPerfectIvCount}
                onValueChange={setPerfectIvValue}
                value={perfectIvValue}
              />
              <div className="gen5hiddengrotto-filter-grid">
                <MultiCheckSelect
                  anyLabel={labels.any}
                  disabled={busy || filtersAreDisabled}
                  label={t("nature")}
                  mask={natureMask}
                  onChange={setNatureMask}
                  options={natureOptions}
                />
                <MultiCheckSelect
                  anyLabel={labels.any}
                  disabled={busy || filtersAreDisabled}
                  label={t("hiddenPower")}
                  mask={hiddenPowerMask}
                  onChange={setHiddenPowerMask}
                  options={powerOptions}
                />
                <label className="field">
                  <span>{labels.levels}</span>
                  <div className="gen5hiddengrotto-level-range">
                    <input
                      aria-label="Level Min"
                      disabled={busy || filtersAreDisabled}
                      inputMode="numeric"
                      max={pokemonSlot.maxLevel}
                      min={pokemonSlot.minLevel}
                      onChange={(event) =>
                        setLevelMin(
                          normalizeDecimalInput(
                            event.target.value,
                            pokemonSlot.maxLevel,
                            3,
                          ),
                        )
                      }
                      value={levelMin}
                    />
                    <span>–</span>
                    <input
                      aria-label="Level Max"
                      disabled={busy || filtersAreDisabled}
                      inputMode="numeric"
                      max={pokemonSlot.maxLevel}
                      min={pokemonSlot.minLevel}
                      onChange={(event) =>
                        setLevelMax(
                          normalizeDecimalInput(
                            event.target.value,
                            pokemonSlot.maxLevel,
                            3,
                          ),
                        )
                      }
                      value={levelMax}
                    />
                  </div>
                </label>
              </div>
            </section>
          )}

          <div className="gen5hiddengrotto-run-actions">
            <button
              className="primary-action"
              disabled={busy || !profile}
              type="submit"
            >
              {mode === "generator" ? labels.generate : labels.search}
            </button>
            {busy && (
              <button
                className="secondary-action"
                onClick={() => {
                  engine.cancel();
                  setStatus("cancelled");
                }}
                type="button"
              >
                {labels.cancel}
              </button>
            )}
          </div>
        </div>

        <section aria-busy={busy} className="gen5hiddengrotto-results panel">
          <div className="gen5hiddengrotto-results-heading">
            <div>
              <h2>{t("results")}</h2>
              <span aria-live="polite" role="status">
                {t(status)}
              </span>
            </div>
            <div className="gen5hiddengrotto-results-actions">
              {mode === "generator" && (
                <button
                  aria-controls="gen5hiddengrotto-advance-finder-panel"
                  aria-expanded={advanceFinderExpanded}
                  aria-haspopup="dialog"
                  className="secondary-action"
                  disabled={results.length === 0}
                  id="gen5hiddengrotto-advance-finder-trigger"
                  onClick={() => setAdvanceFinderExpanded(true)}
                  type="button"
                >
                  Advance Finder
                </button>
              )}
              {operation === "pokemon-searcher" && (
                <button
                  className="secondary-action"
                  disabled={
                    !selectedResult ||
                    selectedResult.kind !== "pokemon" ||
                    !selectedResult.dateTime ||
                    selectedResult.buttonMask === undefined
                  }
                  onClick={() => {
                    if (
                      !selectedResult ||
                      selectedResult.kind !== "pokemon" ||
                      !selectedResult.dateTime ||
                      selectedResult.buttonMask === undefined
                    )
                      return;
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
              <strong>{results.length.toLocaleString()}</strong>
            </div>
          </div>
          <div className="gen5hiddengrotto-progress">
            <span style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
          {(error || profiles.error) && (
            <div className="alert" role="alert">
              {error || profiles.error}
            </div>
          )}
          {summary?.resultLimitReached && (
            <div className="alert warning" role="status">
              {labels.resultLimit}
            </div>
          )}
          {results.length === 0 && !busy && !error ? (
            <div className="gen5hiddengrotto-empty">{labels.emptyResults}</div>
          ) : (
            <div className="gen5hiddengrotto-table-shell" ref={tableRef}>
              <div
                aria-colcount={columns.length}
                aria-rowcount={sortedResults.length + 1}
                className={`gen5hiddengrotto-table ${operation}`}
                role="grid"
                style={{ height: `${rowVirtualizer.getTotalSize() + 44}px` }}
              >
                <div className="gen5hiddengrotto-table-header" role="row">
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
                          setSort((current) =>
                            current.key === column.key
                              ? {
                                  key: column.key,
                                  direction:
                                    current.direction === "asc"
                                      ? "desc"
                                      : "asc",
                                }
                              : { key: column.key, direction: "asc" },
                          )
                        }
                        type="button"
                      >
                        {column.label}
                        {sort.key === column.key
                          ? sort.direction === "asc"
                            ? " ↑"
                            : " ↓"
                          : ""}
                      </button>
                    </span>
                  ))}
                </div>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const result = sortedResults[virtualRow.index];
                  return (
                    <div
                      aria-rowindex={virtualRow.index + 2}
                      aria-selected={selectedResult === result}
                      className={`gen5hiddengrotto-table-row${selectedResult === result ? " selected" : ""}`}
                      data-row-index={virtualRow.index}
                      key={`${result.seed}-${result.advances}-${virtualRow.index}`}
                      onClick={() => setSelectedResult(result)}
                      onFocus={() => setSelectedResult(result)}
                      onKeyDown={(event) =>
                        moveRowFocus(virtualRow.index, event)
                      }
                      role="row"
                      style={{
                        transform: `translateY(${virtualRow.start + 44}px)`,
                      }}
                      tabIndex={
                        selectedResult === result ||
                        (!selectedResult && virtualRow.index === 0)
                          ? 0
                          : -1
                      }
                    >
                      {columns.map((column) => {
                        const value = displayValue(result, column.key);
                        return (
                          <span key={column.key} role="gridcell" title={value}>
                            {value}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </form>

      <FloatingToolPanel
        className="gen5hiddengrotto-advance-finder"
        closeLabel="Close Advance Finder"
        expanded={advanceFinderExpanded}
        id="gen5hiddengrotto-advance-finder-panel"
        label="Advance Finder"
        onExpandedChange={setAdvanceFinderExpanded}
        tone="brand"
        triggerId="gen5hiddengrotto-advance-finder-trigger"
      >
        <Gen4AdvancePanel
          initialMode="chatot"
          onJump={(match) => {
            const result = results[match.row];
            if (!result) return;
            const sortedIndex = sortedResults.indexOf(result);
            setSelectedResult(result);
            setAdvanceFinderExpanded(false);
            if (sortedIndex >= 0)
              requestAnimationFrame(() =>
                rowVirtualizer.scrollToIndex(sortedIndex, { align: "center" }),
              );
          }}
          showHeading={false}
          sourceRows={advanceRows}
          supportsCalls={false}
          supportsNeedles
          uiPreviewMode={uiPreviewMode}
        />
      </FloatingToolPanel>
    </div>
  );
}

interface AdvanceFieldProps {
  disabled: boolean;
  label: string;
  value: string;
  onChange(value: string): void;
}

function AdvanceField({ disabled, label, onChange, value }: AdvanceFieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        disabled={disabled}
        inputMode="numeric"
        max={UINT32_MAX}
        min="0"
        onChange={(event) =>
          onChange(normalizeDecimalInput(event.target.value, UINT32_MAX, 10))
        }
        value={value}
      />
    </label>
  );
}
