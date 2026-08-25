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
import {
  getGen4AbilityName,
  getIvCharacteristics,
  getIvSpeciesName,
} from "../gen4ivcalculator/gen4IvData";
import { Gen4AdvancePanel } from "../gen4advance/Gen4AdvancePanel";
import { getGen4WildItemName } from "../gen4wild/domain";
import type { Gen5AdjacentSeedsInitialContext } from "../gen5adjacentseeds/domain";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { PerfectIvFilterFields } from "../shared/PerfectIvFilterFields";
import {
  gen5WildFastSearchEligible,
  parseGen5WildIvCache,
  parseGen5WildShaCache,
  prepareGen5WildCache,
  withGen5WildCache,
  type Gen5WildIvCache,
  type Gen5WildShaCache,
} from "./cache";
import {
  formatGen5WildButtons,
  gen5WildProfile,
  normalizeGen5WildSeed,
  validateGen5WildRequest,
  type Gen5WildFilters,
  type Gen5WildLead,
  type Gen5WildLuckyPower,
  type Gen5WildRequest,
  type Gen5WildResult,
} from "./domain";
import {
  getGen5WildAreas,
  getGen5WildSpeciesLevelRange,
  getGen5WildSpeciesSlots,
  getGen5WildUniqueSpecies,
  type Gen5WildArea,
  type Gen5WildEncounter,
  type Gen5WildSeason,
} from "./encounters";
import { getGen5WildLocationName } from "./locationNames";
import { Gen5WildUiPreviewEngine } from "./preview/Gen5WildUiPreviewEngine";
import type { Gen5WildEngine, Gen5WildSummary } from "./search";
import { Gen5WildWorkerPool } from "./worker/Gen5WildWorkerPool";
import "./Gen5WildPanel.css";

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
  | "item"
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

const MODES = ["generator", "searcher"] as const;
const IV_KEYS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const IV_SORT_KEYS = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
] as const;
const IV_COLUMNS: readonly ResultColumn[] = IV_SORT_KEYS.map((key, index) => ({
  key,
  label: IV_KEYS[index],
}));
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
const ENCOUNTERS: readonly Gen5WildEncounter[] = [
  "grass",
  "dark-grass",
  "rustling-grass",
  "surfing",
  "rippling-surfing",
  "super-rod",
  "rippling-fishing",
];
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const DATE_KEY = "pokerngkit-gen5-wild-dates-v1";

function today() {
  const now = new Date();
  const year = Math.min(2099, Math.max(2000, now.getFullYear()));
  return `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function storedDates() {
  const fallback = today();
  try {
    const value = JSON.parse(localStorage.getItem(DATE_KEY) ?? "null") as {
      start?: unknown;
      end?: unknown;
    } | null;
    if (typeof value?.start === "string" && typeof value.end === "string")
      return { start: value.start, end: value.end };
  } catch {
    // Optional settings use today's date when storage is unavailable.
  }
  return { start: fallback, end: fallback };
}

function versionLabel(version: string) {
  if (version === "black") return "Black";
  if (version === "white") return "White";
  if (version === "black2") return "Black 2";
  return "White 2";
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
  return ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][value] ?? "";
}

function genderLabel(translate: (key: string) => string, gender: number) {
  return translate(
    gender === 0 ? "male" : gender === 1 ? "female" : "genderless",
  );
}

function shinyLabel(chinese: boolean, shiny: number) {
  if (shiny === 1) return chinese ? "星星" : "Star";
  if (shiny === 2) return chinese ? "方块" : "Square";
  return chinese ? "否" : "No";
}

function leadFromValue(value: string): Gen5WildLead {
  if (value.startsWith("sync-"))
    return { type: "synchronize", nature: Number(value.slice(5)) };
  return { type: value } as Gen5WildLead;
}

function leadValue(lead: Gen5WildLead) {
  return lead.type === "synchronize" ? `sync-${lead.nature}` : lead.type;
}

function encounterLabel(chinese: boolean, encounter: Gen5WildEncounter) {
  const labels: Record<Gen5WildEncounter, readonly [string, string]> = {
    grass: ["Grass", "草丛"],
    "dark-grass": ["Dark Grass", "深色草丛"],
    "rustling-grass": ["Rustling Grass", "摇动草丛"],
    surfing: ["Surfing", "冲浪"],
    "rippling-surfing": ["Rippling Surfing", "水纹冲浪"],
    "super-rod": ["Fishing", "钓鱼"],
    "rippling-fishing": ["Rippling Fishing", "水纹钓鱼"],
  };
  return labels[encounter][chinese ? 1 : 0];
}

function leadOptions(chinese: boolean, fishing: boolean) {
  const options: { value: string; label: string; group?: string }[] = [
    { value: "none", label: chinese ? "无" : "None" },
    { value: "compoundEyes", label: chinese ? "复眼" : "Compound Eyes" },
    {
      value: "cuteCharmMale",
      label: chinese ? "♂ 队首" : "♂ Lead",
      group: chinese ? "迷人身躯" : "Cute Charm",
    },
    {
      value: "cuteCharmFemale",
      label: chinese ? "♀ 队首" : "♀ Lead",
      group: chinese ? "迷人身躯" : "Cute Charm",
    },
    {
      value: "hustle",
      label: chinese ? "活力" : "Hustle",
      group: chinese ? "遭遇等级机率修正" : "Level Modifier",
    },
    {
      value: "pressure",
      label: chinese ? "压迫感" : "Pressure",
      group: chinese ? "遭遇等级机率修正" : "Level Modifier",
    },
    {
      value: "vitalSpirit",
      label: chinese ? "干劲" : "Vital Spirit",
      group: chinese ? "遭遇等级机率修正" : "Level Modifier",
    },
    {
      value: "magnetPull",
      label: chinese ? "磁力" : "Magnet Pull",
      group: chinese ? "遭遇种类修正" : "Slot Modifier",
    },
    {
      value: "static",
      label: chinese ? "静电" : "Static",
      group: chinese ? "遭遇种类修正" : "Slot Modifier",
    },
  ];
  if (fishing)
    options.splice(
      4,
      0,
      {
        value: "stickyHold",
        label: chinese ? "黏着" : "Sticky Hold",
        group: chinese ? "遭遇率修正" : "Encounter Modifier",
      },
      {
        value: "suctionCups",
        label: chinese ? "吸盘" : "Suction Cups",
        group: chinese ? "遭遇率修正" : "Encounter Modifier",
      },
    );
  return options;
}

export interface Gen5WildPanelProps {
  uiPreviewMode: boolean;
  onOpenProfileManager(): void;
  onOpenAdjacentSeeds(
    context: Omit<Gen5AdjacentSeedsInitialContext, "requestId">,
  ): void;
}

export function Gen5WildPanel({
  uiPreviewMode,
  onOpenProfileManager,
  onOpenAdjacentSeeds,
}: Gen5WildPanelProps) {
  const { i18n, t } = useTranslation();
  const chinese = i18n.language.startsWith("zh");
  const profiles = useGen5Profiles();
  const dates = useMemo(storedDates, []);
  const engine = useMemo<Gen5WildEngine>(
    () =>
      uiPreviewMode ? new Gen5WildUiPreviewEngine() : new Gen5WildWorkerPool(),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Mode>("generator");
  const [seed, setSeed] = useState("");
  const [generatorIvAdvances, setGeneratorIvAdvances] = useState("0");
  const [generatorInitial, setGeneratorInitial] = useState("0");
  const [generatorMax, setGeneratorMax] = useState("1000");
  const [generatorOffset, setGeneratorOffset] = useState("");
  const [searcherInitialIv, setSearcherInitialIv] = useState("0");
  const [searcherMaxIv, setSearcherMaxIv] = useState("0");
  const [searcherInitial, setSearcherInitial] = useState("0");
  const [searcherMax, setSearcherMax] = useState("100");
  const [startDate, setStartDate] = useState(dates.start);
  const [endDate, setEndDate] = useState(dates.end);
  const [encounter, setEncounter] = useState<Gen5WildEncounter>("grass");
  const [season, setSeason] = useState<Gen5WildSeason>(0);
  const [location, setLocation] = useState(0);
  const [selectedSpecies, setSelectedSpecies] = useState("all");
  const [lead, setLead] = useState<Gen5WildLead>({ type: "none" });
  const [luckyPower, setLuckyPower] = useState<Gen5WildLuckyPower>("none");
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
  const [natureMask, setNatureMask] = useState(ALL_NATURES);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(ALL_HIDDEN_POWERS);
  const [ability, setAbility] = useState<0 | 1 | 255>(255);
  const [gender, setGender] = useState<0 | 1 | 255>(255);
  const [shiny, setShiny] = useState<1 | 2 | 3 | 255>(255);
  const [slotMask, setSlotMask] = useState(0xfff);
  const [levelMin, setLevelMin] = useState("1");
  const [levelMax, setLevelMax] = useState("100");
  const [ivCache, setIvCache] = useState<Gen5WildIvCache>();
  const [shaCache, setShaCache] = useState<Gen5WildShaCache>();
  const [results, setResults] = useState<Gen5WildResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<Gen5WildResult>();
  const [advanceFinderExpanded, setAdvanceFinderExpanded] = useState(false);
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({ key: "advances", direction: "asc" });
  const [summary, setSummary] = useState<Gen5WildSummary>();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const busy = status === "calculating";
  const profile = profiles.selectedProfile;
  const areas = useMemo(
    () =>
      profile
        ? getGen5WildAreas(profile.version, encounter, season)
        : ([] as readonly Gen5WildArea[]),
    [encounter, profile, season],
  );
  const area = areas.find((entry) => entry.location === location) ?? areas[0];
  const allowedSlotMask = area ? (1 << area.slots.length) - 1 : 0;
  const effectiveSlotMask = slotMask & allowedSlotMask || allowedSlotMask;
  const species = area ? getGen5WildUniqueSpecies(area) : [];

  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    try {
      localStorage.setItem(
        DATE_KEY,
        JSON.stringify({ start: startDate, end: endDate }),
      );
    } catch {
      // Date persistence is optional.
    }
  }, [endDate, startDate]);

  const labels = {
    profile: "Profile",
    manager: "Manager",
    generator: chinese ? "生成器" : "Generator",
    searcher: chinese ? "检索器" : "Searcher",
    rngInfo: chinese ? "乱数信息" : "RNG Info",
    settings: chinese ? "设置" : "Settings",
    filters: chinese ? "筛选项" : "Filters",
    seed: "Seed",
    ivAdvances: "IV Advances",
    initialIvAdvances: "Initial IV Advances",
    maxIvAdvances: "Max IV Advances",
    initialAdvances: chinese ? "初始帧" : "Initial Advances",
    maxAdvances: chinese ? "最大帧数" : "Max Advances",
    offset: "Offset",
    lead: chinese ? "队首" : "Lead",
    luckyPower: "Lucky Power",
    encounter: chinese ? "遭遇类型" : "Encounter",
    season: chinese ? "季节" : "Season",
    location: chinese ? "地点" : "Location",
    pokemon: chinese ? "宝可梦" : "Pokémon",
    levels: "Levels",
    slots: "Slot",
    generate: chinese ? "生成" : "Generate",
    search: chinese ? "检索" : "Search",
    cancel: chinese ? "取消" : "Cancel",
    results: t("results"),
    any: chinese ? "任意" : "Any",
    nature: chinese ? "性格" : "Nature",
    hidden: chinese ? "觉醒属性" : "Hidden Power",
    ability: chinese ? "特性" : "Ability",
    gender: chinese ? "性别" : "Gender",
    shiny: chinese ? "异色" : "Shiny",
    disableFilters: chinese ? "取消筛选" : "Disable Filters",
    showStats: chinese ? "显示能力值" : "Show Stats",
    ivCache: "IV Cache",
    shaCache: "SHA Cache",
    noProfile: chinese ? "请选择第五世代配置。" : "Select a Gen 5 profile.",
    ready: chinese ? "就绪" : "Ready",
    calculating: chinese ? "计算中" : "Calculating",
    completed: chinese ? "已完成" : "Completed",
    cancelled: chinese ? "已取消" : "Cancelled",
    failed: chinese ? "失败" : "Failed",
  };

  const natureOptions = NATURE_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const powerOptions = POWER_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));

  const resetAreaFilters = (nextArea?: Gen5WildArea) => {
    setSelectedSpecies("all");
    setSlotMask(nextArea ? (1 << nextArea.slots.length) - 1 : 0);
    setLevelMin("1");
    setLevelMax("100");
  };

  const changeEncounter = (next: Gen5WildEncounter) => {
    setEncounter(next);
    if (
      (lead.type === "suctionCups" || lead.type === "stickyHold") &&
      next !== "super-rod"
    )
      setLead({ type: "none" });
    const nextAreas = profile
      ? getGen5WildAreas(profile.version, next, season)
      : [];
    setLocation(nextAreas[0]?.location ?? 0);
    resetAreaFilters(nextAreas[0]);
  };

  const changeSeason = (next: Gen5WildSeason) => {
    setSeason(next);
    const nextAreas = profile
      ? getGen5WildAreas(profile.version, encounter, next)
      : [];
    setLocation(nextAreas[0]?.location ?? 0);
    resetAreaFilters(nextAreas[0]);
  };

  const changeLocation = (next: number) => {
    setLocation(next);
    resetAreaFilters(areas.find((entry) => entry.location === next));
  };

  const changeSpecies = (value: string) => {
    setSelectedSpecies(value);
    if (!area || value === "all") {
      resetAreaFilters(area);
      return;
    }
    const [speciesValue, formValue] = value.split(":").map(Number);
    setSlotMask(
      getGen5WildSpeciesSlots(area, speciesValue, formValue) || allowedSlotMask,
    );
    const range = getGen5WildSpeciesLevelRange(area, speciesValue, formValue);
    setLevelMin(String(range?.minimum ?? 1));
    setLevelMax(String(range?.maximum ?? 100));
  };

  const selectProfile = (id: string) => {
    void profiles.selectProfile(id || null);
    const nextProfile = profiles.profiles.find((entry) => entry.id === id);
    if (nextProfile) {
      const nextAreas = getGen5WildAreas(
        nextProfile.version,
        encounter,
        season,
      );
      setLocation(nextAreas[0]?.location ?? 0);
      resetAreaFilters(nextAreas[0]);
      setLuckyPower("none");
    }
    setIvCache(undefined);
    setShaCache(undefined);
  };

  const updateIv = (kind: "min" | "max", index: number, value: string) => {
    const update = (current: IvText) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ) as IvText;
    if (kind === "min") setIvMin(update);
    else setIvMax(update);
  };

  const buildFilters = (): Gen5WildFilters => ({
    disabled: mode === "generator" && filtersDisabled,
    ivMin: ivMin.map((value) =>
      Number(value || "0"),
    ) as Gen5WildFilters["ivMin"],
    ivMax: ivMax.map((value) =>
      Number(value || "0"),
    ) as Gen5WildFilters["ivMax"],
    natureMask,
    hiddenPowerMask,
    ability,
    gender,
    shiny,
    slotMask: effectiveSlotMask,
    levelMin: Number(levelMin || "0"),
    levelMax: Number(levelMax || "0"),
    perfectIvValue: Number(perfectIvValue || "0"),
    perfectIvCount: Number(perfectIvCount || "0"),
  });

  const buildRequest = (): Gen5WildRequest => {
    if (!profile) throw new TypeError(labels.noProfile);
    if (!area) throw new TypeError("No encounter area is available.");
    const gameProfile = gen5WildProfile(profile);
    const selectedLuckyPower =
      profile.version === "black2" || profile.version === "white2"
        ? luckyPower
        : "none";
    if (mode === "generator") {
      return {
        mode,
        profile: gameProfile,
        area,
        seed,
        initialAdvances: Number(generatorInitial || "0"),
        maxAdvances: Number(generatorMax || "0"),
        offset: Number(generatorOffset || "0"),
        initialIvAdvances: Number(generatorIvAdvances || "0"),
        maxIvAdvances: 0,
        lead,
        luckyPower: selectedLuckyPower,
        filters: buildFilters(),
        resultLimit: 100_000,
        cache: null,
      };
    }
    return {
      mode,
      profile: gameProfile,
      area,
      startDate,
      endDate,
      initialAdvances: Number(searcherInitial || "0"),
      maxAdvances: Number(searcherMax || "0"),
      offset: 0,
      initialIvAdvances: Number(searcherInitialIv || "0"),
      maxIvAdvances: Number(searcherMaxIv || "0"),
      lead,
      luckyPower: selectedLuckyPower,
      filters: { ...buildFilters(), disabled: false },
      resultLimit: 100_000,
      cache: null,
    };
  };

  const fastStatus = (() => {
    if (mode !== "searcher" || !profile) return "";
    try {
      const request = buildRequest();
      if (request.mode !== "searcher") return "";
      if (!ivCache) return "Profile does not have a IV cache file configured";
      if (!gen5WildFastSearchEligible(request, ivCache))
        return "Settings are not configured for fast searching";
      const prepared = prepareGen5WildCache(request, ivCache, shaCache);
      return prepared?.descriptor.mode === "iv-sha"
        ? "Settings are configured for fast IV/SHA searching"
        : "Settings are configured for fast IV searching.\nProfile is missing or has an incompatible SHA cache.";
    } catch {
      return "Settings are not configured for fast searching";
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
      if (type === "iv") setIvCache(parseGen5WildIvCache(buffer, file.name));
      else setShaCache(parseGen5WildShaCache(buffer, file.name));
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
      const baseRequest = buildRequest();
      const prepared =
        baseRequest.mode === "searcher"
          ? prepareGen5WildCache(baseRequest, ivCache, shaCache)
          : undefined;
      const request = withGen5WildCache(baseRequest, prepared);
      validateGen5WildRequest(request);
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

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setSort({
      key: nextMode === "generator" ? "advances" : "seed",
      direction: "asc",
    });
    setResults([]);
    setSelectedResult(undefined);
    setSummary(undefined);
    setError("");
    setStatus("ready");
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
    changeMode(MODES[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  };

  const columns: readonly ResultColumn[] =
    mode === "generator"
      ? [
          { key: "advances", label: "Advances" },
          { key: "chatot", label: "Chatot" },
          { key: "needle", label: "Needle" },
          { key: "item", label: "Item" },
          { key: "slot", label: "Slot" },
          { key: "level", label: "Level" },
          { key: "pid", label: "PID" },
          { key: "shiny", label: "Shiny" },
          { key: "nature", label: "Nature" },
          { key: "ability", label: "Ability" },
          ...IV_COLUMNS,
          { key: "hiddenPower", label: "Hidden" },
          { key: "hiddenPowerStrength", label: "Power" },
          { key: "gender", label: "Gender" },
          { key: "characteristic", label: "Characteristic" },
        ]
      : [
          { key: "seed", label: "Seed" },
          { key: "advances", label: "Advances" },
          { key: "ivAdvances", label: "IV Advances" },
          { key: "item", label: "Item" },
          { key: "slot", label: "Slot" },
          { key: "level", label: "Level" },
          { key: "pid", label: "PID" },
          { key: "shiny", label: "Shiny" },
          { key: "nature", label: "Nature" },
          { key: "ability", label: "Ability" },
          ...IV_COLUMNS,
          { key: "hiddenPower", label: "Hidden" },
          { key: "hiddenPowerStrength", label: "Power" },
          { key: "gender", label: "Gender" },
          { key: "characteristic", label: "Characteristic" },
          { key: "dateTime", label: "Date/Time" },
          { key: "timer0", label: "Timer0" },
          { key: "buttonMask", label: "Buttons" },
        ];
  const translatedColumns: Record<string, string> = chinese
    ? {
        Advances: "帧数",
        Chatot: "音高",
        Item: "道具",
        Level: "等级",
        Shiny: "异色",
        Nature: "性格",
        Ability: "特性",
        Hidden: "觉醒属性",
        Power: "觉醒威力",
        Gender: "性别",
        Characteristic: "个性",
        "Date/Time": "日期/时间",
      }
    : {};
  const characteristics = getIvCharacteristics(i18n.language, "bw2");

  const rowValues = (result: Gen5WildResult) => {
    const values = showStats ? result.stats : result.ivs;
    const abilityName = getGen4AbilityName(i18n.language, result.abilityIndex);
    const abilityText =
      result.ability === 2
        ? `H (${abilityName})`
        : `${result.ability}: ${abilityName}`;
    const slotText = `${result.slot}: ${getIvSpeciesName(
      i18n.language,
      result.species,
      result.form,
    )}`;
    const common = [
      getGen4WildItemName(i18n.language, result.item),
      slotText,
      String(result.level),
      result.pid,
      shinyLabel(chinese, result.shiny),
      t(NATURE_KEYS[result.nature]),
      abilityText,
      ...values.map(String),
      t(POWER_KEYS[result.hiddenPower]),
      String(result.hiddenPowerStrength),
      genderLabel(t, result.gender),
      characteristics[result.characteristic],
    ];
    if (mode === "generator")
      return [
        String(result.advances),
        chatotLabel(result.chatot),
        needleLabel(result.needle),
        ...common,
      ];
    return [
      result.seed,
      String(result.advances),
      String(result.ivAdvances),
      ...common,
      result.dateTime ?? "",
      result.timer0 === undefined
        ? ""
        : result.timer0.toString(16).toUpperCase(),
      result.buttonMask === undefined
        ? ""
        : formatGen5WildButtons(result.buttonMask),
    ];
  };

  const resultValue = (result: Gen5WildResult, key: SortKey) => {
    const ivIndex = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
    if (ivIndex >= 0)
      return showStats ? result.stats[ivIndex] : result.ivs[ivIndex];
    if (key === "seed" || key === "pid" || key === "dateTime")
      return result[key] ?? "";
    if (key === "timer0" || key === "buttonMask") return result[key] ?? -1;
    return result[key as keyof Gen5WildResult] as string | number;
  };

  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort((left, right) => {
      const leftValue = resultValue(left, sort.key);
      const rightValue = resultValue(right, sort.key);
      const comparison =
        typeof leftValue === "string" && typeof rightValue === "string"
          ? leftValue.localeCompare(rightValue)
          : Number(leftValue) - Number(rightValue);
      return comparison * multiplier;
    });
    // Display mode affects the six sortable stat columns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, showStats, sort]);
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

  // TanStack Virtual exposes mutable imperative functions by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
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

  const selectedLeadOptions = leadOptions(chinese, encounter === "super-rod");
  const groupedLeadOptions = selectedLeadOptions.reduce<
    Array<[string, typeof selectedLeadOptions]>
  >((groups, option) => {
    if (!option.group) return groups;
    const existing = groups.find(([group]) => group === option.group);
    if (existing) existing[1].push(option);
    else groups.push([option.group, [option]]);
    return groups;
  }, []);

  return (
    <div className="gen5wild-panel">
      <section className="gen5wild-profile panel">
        <div className="gen5wild-profile-heading">
          <h2>{labels.profile}</h2>
          <div className="gen5wild-profile-actions">
            <label className="field">
              <span>{labels.profile}</span>
              <Select
                disabled={busy || profiles.loading || profiles.busy}
                onChange={(event) => selectProfile(event.target.value)}
                value={profiles.selectedProfileId ?? ""}
              >
                <option value="" />
                {profiles.profiles.map((entry) => (
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
          <dl className="gen5wild-profile-values">
            <div>
              <dt>Game</dt>
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

      <div
        aria-label="Gen 5 Wild operation"
        className="gen5wild-mode-tabs"
        role="tablist"
      >
        {MODES.map((entry, index) => (
          <button
            aria-selected={mode === entry}
            className={mode === entry ? "active" : ""}
            disabled={busy}
            key={entry}
            onClick={() => changeMode(entry)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={mode === entry ? 0 : -1}
            type="button"
          >
            {labels[entry]}
          </button>
        ))}
      </div>

      <form className="gen5wild-workspace" onSubmit={run}>
        <div className="gen5wild-controls">
          <section className="gen5wild-settings panel">
            <div className="panel-heading compact">
              <h2>{labels.rngInfo}</h2>
            </div>
            <div className="gen5wild-form-grid">
              {mode === "generator" ? (
                <>
                  <label className="field gen5wild-wide-field">
                    <span>{labels.seed}</span>
                    <input
                      disabled={busy}
                      inputMode="text"
                      maxLength={16}
                      onChange={(event) =>
                        setSeed(normalizeGen5WildSeed(event.target.value))
                      }
                      value={seed}
                    />
                  </label>
                  <AdvanceField
                    disabled={busy}
                    label={labels.ivAdvances}
                    onChange={setGeneratorIvAdvances}
                    value={generatorIvAdvances}
                  />
                  <AdvanceField
                    disabled={busy}
                    label={labels.initialAdvances}
                    onChange={setGeneratorInitial}
                    value={generatorInitial}
                  />
                  <AdvanceField
                    disabled={busy}
                    label={labels.maxAdvances}
                    onChange={setGeneratorMax}
                    value={generatorMax}
                  />
                  <AdvanceField
                    disabled={busy}
                    label={labels.offset}
                    onChange={setGeneratorOffset}
                    value={generatorOffset}
                  />
                </>
              ) : (
                <>
                  <AdvanceField
                    disabled={busy}
                    label={labels.initialIvAdvances}
                    onChange={setSearcherInitialIv}
                    value={searcherInitialIv}
                  />
                  <AdvanceField
                    disabled={busy}
                    label={labels.maxIvAdvances}
                    onChange={setSearcherMaxIv}
                    value={searcherMaxIv}
                  />
                  <AdvanceField
                    disabled={busy}
                    label={labels.initialAdvances}
                    onChange={setSearcherInitial}
                    value={searcherInitial}
                  />
                  <AdvanceField
                    disabled={busy}
                    label={labels.maxAdvances}
                    onChange={setSearcherMax}
                    value={searcherMax}
                  />
                  <label className="field">
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
                  <label className="field">
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
            </div>

            <div className="panel-heading compact gen5wild-settings-heading">
              <h2>{labels.settings}</h2>
            </div>
            <div className="gen5wild-form-grid">
              <label className="field">
                <span>{labels.encounter}</span>
                <Select
                  disabled={busy || !profile}
                  onChange={(event) =>
                    changeEncounter(event.target.value as Gen5WildEncounter)
                  }
                  value={encounter}
                >
                  {ENCOUNTERS.map((entry) => (
                    <option key={entry} value={entry}>
                      {encounterLabel(chinese, entry)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{labels.season}</span>
                <Select
                  disabled={busy || !profile}
                  onChange={(event) =>
                    changeSeason(Number(event.target.value) as Gen5WildSeason)
                  }
                  value={season}
                >
                  {["Spring", "Summer", "Autumn", "Winter"].map(
                    (entry, index) => (
                      <option key={entry} value={index}>
                        {chinese
                          ? ["春天", "夏天", "秋天", "冬天"][index]
                          : entry}
                      </option>
                    ),
                  )}
                </Select>
              </label>
              <label className="field gen5wild-wide-field">
                <span>{labels.location}</span>
                <Select
                  disabled={busy || !area}
                  onChange={(event) =>
                    changeLocation(Number(event.target.value))
                  }
                  value={area?.location ?? ""}
                >
                  {areas.map((entry) => (
                    <option key={entry.location} value={entry.location}>
                      {getGen5WildLocationName(
                        i18n.language,
                        entry.version,
                        entry.location,
                      )}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field gen5wild-wide-field">
                <span>{labels.pokemon}</span>
                <Select
                  disabled={busy || !area}
                  onChange={(event) => changeSpecies(event.target.value)}
                  value={
                    selectedSpecies === "all" ||
                    species.some(
                      (entry) =>
                        `${entry.species}:${entry.form}` === selectedSpecies,
                    )
                      ? selectedSpecies
                      : "all"
                  }
                >
                  <option value="all">-</option>
                  {species.map((entry) => (
                    <option
                      key={`${entry.species}:${entry.form}`}
                      value={`${entry.species}:${entry.form}`}
                    >
                      {getIvSpeciesName(
                        i18n.language,
                        entry.species,
                        entry.form,
                      )}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field gen5wild-wide-field">
                <span>{labels.lead}</span>
                <Select
                  disabled={busy}
                  onChange={(event) =>
                    setLead(leadFromValue(event.target.value))
                  }
                  value={leadValue(lead)}
                >
                  {selectedLeadOptions
                    .filter((option) => !option.group)
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  {groupedLeadOptions.map(([group, options]) => (
                    <optgroup key={group} label={group}>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label={chinese ? "同步" : "Synchronize"}>
                    {natureOptions.map((option) => (
                      <option key={option.value} value={`sync-${option.value}`}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              </label>
              {(profile?.version === "black2" ||
                profile?.version === "white2") && (
                <label className="field">
                  <span>{labels.luckyPower}</span>
                  <Select
                    disabled={busy}
                    onChange={(event) =>
                      setLuckyPower(event.target.value as Gen5WildLuckyPower)
                    }
                    value={luckyPower}
                  >
                    <option value="none">{chinese ? "无" : "None"}</option>
                    <option value="level1">1</option>
                    <option value="level2">2</option>
                    <option value="level3">3/S</option>
                  </Select>
                </label>
              )}
            </div>

            {mode === "searcher" && (
              <div className="gen5wild-cache-section">
                <label className="gen5wild-file-field">
                  <span>{labels.ivCache}</span>
                  <input
                    accept=".ivcache,application/octet-stream"
                    disabled={busy}
                    onChange={(event) => void loadCacheFile(event, "iv")}
                    type="file"
                  />
                  <output>{ivCache?.name ?? profile?.ivCacheName ?? ""}</output>
                </label>
                <label className="gen5wild-file-field">
                  <span>{labels.shaCache}</span>
                  <input
                    accept=".sha1cache,.shacache,application/octet-stream"
                    disabled={busy}
                    onChange={(event) => void loadCacheFile(event, "sha")}
                    type="file"
                  />
                  <output>
                    {shaCache?.name ?? profile?.shaCacheName ?? ""}
                  </output>
                </label>
                <p className="gen5wild-cache-status">{fastStatus}</p>
              </div>
            )}
          </section>

          <section className="gen5wild-filters panel">
            <div className="panel-heading compact">
              <h2>{labels.filters}</h2>
            </div>
            {mode === "generator" && (
              <label className="gen5wild-toggle">
                <input
                  checked={filtersDisabled}
                  disabled={busy}
                  onChange={(event) => setFiltersDisabled(event.target.checked)}
                  type="checkbox"
                />
                <span>{labels.disableFilters}</span>
              </label>
            )}
            <label className="gen5wild-toggle">
              <input
                checked={showStats}
                disabled={busy}
                onChange={(event) => setShowStats(event.target.checked)}
                type="checkbox"
              />
              <span>{labels.showStats}</span>
            </label>
            <div className="gen5wild-iv-grid">
              {IV_KEYS.map((key, index) => (
                <div className="gen5wild-iv-range" key={key}>
                  <span>{key}</span>
                  <input
                    aria-label={`${key} Min`}
                    disabled={busy || (mode === "generator" && filtersDisabled)}
                    inputMode="numeric"
                    max={31}
                    min={0}
                    onChange={(event) =>
                      updateIv(
                        "min",
                        index,
                        normalizeDecimalInput(event.target.value, 31, 2),
                      )
                    }
                    value={ivMin[index]}
                  />
                  <span>–</span>
                  <input
                    aria-label={`${key} Max`}
                    disabled={busy || (mode === "generator" && filtersDisabled)}
                    inputMode="numeric"
                    max={31}
                    min={0}
                    onChange={(event) =>
                      updateIv(
                        "max",
                        index,
                        normalizeDecimalInput(event.target.value, 31, 2),
                      )
                    }
                    value={ivMax[index]}
                  />
                </div>
              ))}
            </div>
            <PerfectIvFilterFields
              count={perfectIvCount}
              disabled={busy || (mode === "generator" && filtersDisabled)}
              onCountChange={setPerfectIvCount}
              onValueChange={setPerfectIvValue}
              value={perfectIvValue}
            />
            <div className="gen5wild-filter-grid">
              <MultiCheckSelect
                anyLabel={labels.any}
                disabled={busy || (mode === "generator" && filtersDisabled)}
                label={labels.nature}
                mask={natureMask}
                onChange={(value) => setNatureMask(value || ALL_NATURES)}
                options={natureOptions}
              />
              <MultiCheckSelect
                anyLabel={labels.any}
                disabled={busy || (mode === "generator" && filtersDisabled)}
                label={labels.hidden}
                mask={hiddenPowerMask}
                onChange={(value) =>
                  setHiddenPowerMask(value || ALL_HIDDEN_POWERS)
                }
                options={powerOptions}
              />
              <label className="field">
                <span>{labels.ability}</span>
                <Select
                  disabled={busy || (mode === "generator" && filtersDisabled)}
                  onChange={(event) =>
                    setAbility(Number(event.target.value) as 0 | 1 | 255)
                  }
                  value={ability}
                >
                  <option value={255}>{labels.any}</option>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                </Select>
              </label>
              <label className="field">
                <span>{labels.gender}</span>
                <Select
                  disabled={busy || (mode === "generator" && filtersDisabled)}
                  onChange={(event) =>
                    setGender(Number(event.target.value) as 0 | 1 | 255)
                  }
                  value={gender}
                >
                  <option value={255}>{labels.any}</option>
                  <option value={0}>♂</option>
                  <option value={1}>♀</option>
                </Select>
              </label>
              <label className="field">
                <span>{labels.shiny}</span>
                <Select
                  disabled={busy || (mode === "generator" && filtersDisabled)}
                  onChange={(event) =>
                    setShiny(Number(event.target.value) as 1 | 2 | 3 | 255)
                  }
                  value={shiny}
                >
                  <option value={255}>{labels.any}</option>
                  <option value={1}>{chinese ? "星星" : "Star"}</option>
                  <option value={2}>{chinese ? "方块" : "Square"}</option>
                  <option value={3}>
                    {chinese ? "星星/方块" : "Star/Square"}
                  </option>
                </Select>
              </label>
              <div className="gen5wild-level-range">
                <span>{labels.levels}</span>
                <input
                  aria-label="Level Min"
                  disabled={busy || (mode === "generator" && filtersDisabled)}
                  inputMode="numeric"
                  max={100}
                  min={1}
                  onChange={(event) =>
                    setLevelMin(
                      normalizeDecimalInput(event.target.value, 100, 3),
                    )
                  }
                  value={levelMin}
                />
                <span>–</span>
                <input
                  aria-label="Level Max"
                  disabled={busy || (mode === "generator" && filtersDisabled)}
                  inputMode="numeric"
                  max={100}
                  min={1}
                  onChange={(event) =>
                    setLevelMax(
                      normalizeDecimalInput(event.target.value, 100, 3),
                    )
                  }
                  value={levelMax}
                />
              </div>
            </div>
            <fieldset
              className="gen5wild-slot-filter"
              disabled={busy || (mode === "generator" && filtersDisabled)}
            >
              <legend>{labels.slots}</legend>
              <div>
                {area?.slots.map((slot, index) => (
                  <label key={`${slot.species}-${slot.form}-${index}`}>
                    <input
                      checked={(effectiveSlotMask & (1 << index)) !== 0}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? effectiveSlotMask | (1 << index)
                          : effectiveSlotMask & ~(1 << index);
                        if (next !== 0) {
                          setSelectedSpecies("all");
                          setSlotMask(next);
                        }
                      }}
                      type="checkbox"
                    />
                    <span>{index}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <div className="gen5wild-actions">
            <button
              className="primary-action"
              disabled={busy || !profile || !area}
              type="submit"
            >
              {mode === "generator" ? labels.generate : labels.search}
            </button>
            <button
              className="secondary-action"
              disabled={!busy}
              onClick={() => {
                engine.cancel();
                setStatus("cancelled");
              }}
              type="button"
            >
              {labels.cancel}
            </button>
          </div>
        </div>

        <section aria-busy={busy} className="gen5wild-results panel">
          <div className="gen5wild-results-heading">
            <div>
              <h2>{labels.results}</h2>
              <span aria-live="polite" role="status">
                {labels[status]}
              </span>
            </div>
            <div className="gen5wild-results-actions">
              {mode === "generator" && (
                <button
                  aria-controls="gen5wild-advance-finder-panel"
                  aria-expanded={advanceFinderExpanded}
                  aria-haspopup="dialog"
                  className="secondary-action"
                  disabled={results.length === 0}
                  id="gen5wild-advance-finder-trigger"
                  onClick={() => setAdvanceFinderExpanded(true)}
                  type="button"
                >
                  Advance Finder
                </button>
              )}
              {mode === "searcher" && (
                <button
                  className="secondary-action"
                  disabled={
                    !selectedResult ||
                    selectedResult.dateTime === undefined ||
                    selectedResult.buttonMask === undefined
                  }
                  onClick={() => {
                    if (
                      !selectedResult?.dateTime ||
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
          <div className="gen5wild-progress">
            <span style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
          {(error || profiles.error) && (
            <div className="alert" role="alert">
              {error || profiles.error}
            </div>
          )}
          {summary?.resultLimitReached && (
            <div className="alert warning" role="status">
              Result limit reached.
            </div>
          )}
          <div className="gen5wild-table-shell" ref={tableRef}>
            <div
              aria-colcount={columns.length}
              aria-label={labels.results}
              aria-rowcount={
                sortedResults.length === 0 ? 2 : sortedResults.length + 1
              }
              className={`gen5wild-table ${mode}`}
              role="grid"
              style={{
                height: `${rowVirtualizer.getTotalSize() + (sortedResults.length === 0 ? 86 : 44)}px`,
              }}
            >
              <div
                aria-rowindex={1}
                className="gen5wild-table-header"
                role="row"
              >
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
                                  current.direction === "asc" ? "desc" : "asc",
                              }
                            : { key: column.key, direction: "asc" },
                        )
                      }
                      type="button"
                    >
                      {translatedColumns[column.label] ?? column.label}
                      {sort.key === column.key
                        ? sort.direction === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </button>
                  </span>
                ))}
              </div>
              {sortedResults.length === 0 && (
                <div
                  aria-rowindex={2}
                  className="gen5wild-empty-state"
                  role="row"
                >
                  <span role="gridcell">
                    {busy
                      ? mode === "generator"
                        ? chinese
                          ? "生成中"
                          : "Generating"
                        : chinese
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
                    className={`gen5wild-table-row${
                      selectedResult === result ? " selected" : ""
                    }`}
                    data-row-index={row.index}
                    key={`${result.seed}-${result.ivAdvances}-${result.advances}-${row.index}`}
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
                    {rowValues(result).map((value, index) => (
                      <span
                        key={`${columns[index].key}-${index}`}
                        role="gridcell"
                        title={value}
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </form>

      <FloatingToolPanel
        className="gen5wild-advance-finder"
        closeLabel="Close Advance Finder"
        expanded={advanceFinderExpanded}
        id="gen5wild-advance-finder-panel"
        label="Advance Finder"
        onExpandedChange={setAdvanceFinderExpanded}
        tone="brand"
        triggerId="gen5wild-advance-finder-trigger"
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
        maxLength={10}
        onChange={(event) =>
          onChange(normalizeDecimalInput(event.target.value, 0xffff_ffff, 10))
        }
        value={value}
      />
    </label>
  );
}
