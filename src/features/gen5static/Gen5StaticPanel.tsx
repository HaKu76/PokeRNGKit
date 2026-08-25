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
  getIvBaseStats,
  getIvCharacteristics,
  getIvSpeciesName,
} from "../gen4ivcalculator/gen4IvData";
import { Gen4AdvancePanel } from "../gen4advance/Gen4AdvancePanel";
import { useGen5Profiles } from "../gen5profiles/useGen5Profiles";
import type { Gen5AdjacentSeedsInitialContext } from "../gen5adjacentseeds/domain";
import { FloatingToolPanel } from "../shared/FloatingToolPanel";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { PerfectIvFilterFields } from "../shared/PerfectIvFilterFields";
import {
  gen5StaticFastSearchEligible,
  parseGen5StaticIvCache,
  parseGen5StaticShaCache,
  prepareGen5StaticCache,
  withGen5StaticCache,
  type Gen5StaticIvCache,
  type Gen5StaticShaCache,
} from "./cache";
import {
  formatGen5StaticButtons,
  gen5StaticCategoriesForVersion,
  gen5StaticProfile,
  normalizeGen5StaticSeed,
  validateGen5StaticRequest,
  type Gen5StaticCategory,
  type Gen5StaticFilters,
  type Gen5StaticLead,
  type Gen5StaticRequest,
  type Gen5StaticResult,
} from "./domain";
import { gen5StaticTemplatesForVersion } from "./encounters";
import { Gen5StaticUiPreviewEngine } from "./preview/Gen5StaticUiPreviewEngine";
import type { Gen5StaticEngine, Gen5StaticSummary } from "./search";
import { Gen5StaticWorkerPool } from "./worker/Gen5StaticWorkerPool";
import "./Gen5StaticPanel.css";

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
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const DATE_KEY = "pokerngkit-gen5-static-dates-v1";
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
const NEUTRAL_NATURES = new Set([0, 6, 12, 18, 24]);

const CATEGORY_NAMES: Record<Gen5StaticCategory, readonly [string, string]> = {
  starters: ["Starters", "御三家"],
  fossils: ["Fossils", "化石"],
  gifts: ["Gifts", "礼物"],
  stationary: ["Stationary", "定点"],
  legends: ["Legends", "传说"],
  events: ["Events", "配信"],
  roamers: ["Roamers", "游走"],
  curtis: ["Curtis", "阿铁"],
  yancy: ["Yancy", "琉璃"],
};

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

function leadFromValue(value: string): Gen5StaticLead {
  if (value === "cute-female") return { type: "cuteCharmFemale" };
  if (value === "cute-male") return { type: "cuteCharmMale" };
  if (value.startsWith("sync-"))
    return { type: "synchronize", nature: Number(value.slice(5)) };
  return { type: "none" };
}

function leadValue(lead: Gen5StaticLead) {
  if (lead.type === "cuteCharmFemale") return "cute-female";
  if (lead.type === "cuteCharmMale") return "cute-male";
  if (lead.type === "synchronize") return `sync-${lead.nature}`;
  return "none";
}

function isCuteCharmLead(lead: Gen5StaticLead) {
  return lead.type === "cuteCharmFemale" || lead.type === "cuteCharmMale";
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

function templateShinyLabel(chinese: boolean, shiny: string) {
  if (shiny === "never") return chinese ? "不能" : "Never";
  if (shiny === "always") return chinese ? "必定" : "Always";
  return chinese ? "随机" : "Random";
}

function versionLabel(version: string) {
  if (version === "black") return "Black";
  if (version === "white") return "White";
  if (version === "black2") return "Black 2";
  return "White 2";
}

function computeStats(
  result: Gen5StaticResult,
  species: number,
  form: number,
  level: number,
) {
  const base = getIvBaseStats("bw2", species, form);
  const natureBoost = Math.floor(result.nature / 5);
  const natureDrop = result.nature % 5;
  const statMap = [1, 2, 5, 3, 4];
  return base.map((value, index) => {
    if (index === 0)
      return (
        Math.floor(((2 * value + result.ivs[index]) * level) / 100) + level + 10
      );
    const raw = Math.floor(((2 * value + result.ivs[index]) * level) / 100) + 5;
    const modifier = NEUTRAL_NATURES.has(result.nature)
      ? 100
      : statMap[natureBoost] === index
        ? 110
        : statMap[natureDrop] === index
          ? 90
          : 100;
    return Math.floor((raw * modifier) / 100);
  });
}

function encounterLabel(language: string, species: number, form: number) {
  return getIvSpeciesName(language, species, form);
}

export interface Gen5StaticPanelProps {
  uiPreviewMode: boolean;
  onOpenProfileManager(): void;
  onOpenAdjacentSeeds(
    context: Omit<Gen5AdjacentSeedsInitialContext, "requestId">,
  ): void;
}

export function Gen5StaticPanel({
  uiPreviewMode,
  onOpenProfileManager,
  onOpenAdjacentSeeds,
}: Gen5StaticPanelProps) {
  const { i18n, t } = useTranslation();
  const profiles = useGen5Profiles();
  const dates = useMemo(storedDates, []);
  const engine = useMemo<Gen5StaticEngine>(
    () =>
      uiPreviewMode
        ? new Gen5StaticUiPreviewEngine()
        : new Gen5StaticWorkerPool(),
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
  const [category, setCategory] = useState<Gen5StaticCategory>("starters");
  const [templateId, setTemplateId] = useState("starters-0");
  const [lead, setLead] = useState<Gen5StaticLead>({ type: "none" });
  const [luckyPower, setLuckyPower] = useState<"none" | "level3">("none");
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
  const [ivCache, setIvCache] = useState<Gen5StaticIvCache>();
  const [shaCache, setShaCache] = useState<Gen5StaticShaCache>();
  const [results, setResults] = useState<Gen5StaticResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<Gen5StaticResult>();
  const [advanceFinderExpanded, setAdvanceFinderExpanded] = useState(false);
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({ key: "advances", direction: "asc" });
  const [summary, setSummary] = useState<Gen5StaticSummary>();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const busy = status === "calculating";
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

  const chinese = i18n.language.startsWith("zh");
  const profile = profiles.selectedProfile;
  const version = profile?.version ?? "black2";
  const categories = gen5StaticCategoriesForVersion(version);
  const activeCategory = categories.includes(category)
    ? category
    : categories[0];
  const templates = gen5StaticTemplatesForVersion(activeCategory, version);
  const template =
    templates.find((entry) => entry.id === templateId) ?? templates[0];
  const leadVisible = ["stationary", "legends", "events"].includes(
    activeCategory,
  );
  const fixedGender = [0, 254, 255].includes(template.personal.gender);
  const luckyPowerVisible =
    (version === "black2" || version === "white2") && template.wild;
  const natureOptions = useMemo(
    () => NATURE_KEYS.map((key, value) => ({ label: t(key), value })),
    [t],
  );
  const powerOptions = useMemo(
    () => POWER_KEYS.map((key, value) => ({ label: t(key), value })),
    [t],
  );
  const labels = {
    profile: chinese ? "存档信息" : "Profile",
    manager: chinese ? "存档信息管理" : "Manager",
    game: chinese ? "游戏" : "Game",
    dsType: chinese ? "机型" : "DS Type",
    generator: chinese ? "生成器" : "Generator",
    searcher: chinese ? "检索器" : "Searcher",
    rngInfo: chinese ? "乱数信息" : "RNG Info",
    settings: chinese ? "设置" : "Settings",
    filters: chinese ? "筛选项" : "Filters",
    category: chinese ? "分类" : "Category",
    pokemon: chinese ? "宝可梦" : "Pokemon",
    level: chinese ? "等级" : "Level",
    shiny: chinese ? "异色" : "Shiny",
    seed: "Seed",
    ivAdvances: "IV Advances",
    initialIvAdvances: "Initial IV Advances",
    maxIvAdvances: "Max IV Advances",
    initialAdvances: chinese ? "初始帧" : "Initial Advances",
    maxAdvances: chinese ? "最大帧数" : "Max Advances",
    offset: "Offset",
    lead: chinese ? "队首" : "Lead",
    cuteCharm: chinese ? "迷人身躯" : "Cute Charm",
    luckyPower: "Lucky Power",
    startDate: chinese ? "起始日期" : "Start Date",
    endDate: chinese ? "最后日期" : "End Date",
    generate: chinese ? "生成" : "Generate",
    search: chinese ? "检索" : "Search",
    cancel: chinese ? "取消" : "Cancel",
    disableFilters: chinese ? "取消筛选" : "Disable Filters",
    showStats: chinese ? "显示能力值" : "Show Stats",
    ability: chinese ? "特性" : "Ability",
    gender: chinese ? "性别" : "Gender",
    nature: chinese ? "性格" : "Nature",
    hidden: chinese ? "觉醒属性" : "Hidden",
    any: chinese ? "任意" : "Any",
    none: chinese ? "无" : "None",
    results: chinese ? "计算结果" : "Results",
    ivCache: "IV Cache",
    shaCache: "SHA1 Cache",
    noProfile: chinese ? "请选择一个存档信息" : "Please select a profile",
    ready: chinese ? "就绪" : "Ready",
    calculating: chinese ? "计算中" : "Calculating",
    completed: chinese ? "已完成" : "Completed",
    cancelled: chinese ? "已取消" : "Cancelled",
    failed: chinese ? "失败" : "Failed",
  };

  const profileSummary = profile
    ? [
        [labels.game, versionLabel(profile.version)],
        ["TID", String(profile.tid)],
        ["SID", String(profile.sid)],
        [
          "Timer0",
          `${profile.timer0Min.toString(16).toUpperCase()}-${profile.timer0Max.toString(16).toUpperCase()}`,
        ],
        [labels.dsType, profile.dsType.toUpperCase()],
      ]
    : [];

  const normalizeLead = (nextTemplate = template) => {
    if (
      isCuteCharmLead(lead) &&
      [0, 254, 255].includes(nextTemplate.personal.gender)
    ) {
      setLead({ type: "none" });
    }
  };

  const changeCategory = (nextCategory: Gen5StaticCategory) => {
    const nextTemplates = gen5StaticTemplatesForVersion(nextCategory, version);
    setCategory(nextCategory);
    setTemplateId(nextTemplates[0].id);
    normalizeLead(nextTemplates[0]);
    setResults([]);
    setSelectedResult(undefined);
  };

  const changeTemplate = (nextId: string) => {
    const nextTemplate =
      templates.find((entry) => entry.id === nextId) ?? templates[0];
    setTemplateId(nextTemplate.id);
    normalizeLead(nextTemplate);
    setResults([]);
    setSelectedResult(undefined);
  };

  const selectProfile = (id: string) => {
    const nextProfile = profiles.profiles.find((entry) => entry.id === id);
    if (nextProfile) {
      const nextCategories = gen5StaticCategoriesForVersion(
        nextProfile.version,
      );
      const nextCategory = nextCategories.includes(activeCategory)
        ? activeCategory
        : nextCategories[0];
      const nextTemplates = gen5StaticTemplatesForVersion(
        nextCategory,
        nextProfile.version,
      );
      setCategory(nextCategory);
      setTemplateId(nextTemplates[0].id);
      normalizeLead(nextTemplates[0]);
    }
    setIvCache(undefined);
    setShaCache(undefined);
    setResults([]);
    setSelectedResult(undefined);
    void profiles.selectProfile(id || null);
  };

  const buildFilters = (): Gen5StaticFilters => ({
    disabled: mode === "generator" && filtersDisabled,
    ivMin: ivMin.map((value) =>
      Number(value || "0"),
    ) as Gen5StaticFilters["ivMin"],
    ivMax: ivMax.map((value) =>
      Number(value || "0"),
    ) as Gen5StaticFilters["ivMax"],
    natureMask,
    hiddenPowerMask,
    ability,
    gender,
    shiny,
    perfectIvValue: Number(perfectIvValue || "0"),
    perfectIvCount: Number(perfectIvCount || "0"),
  });

  const buildRequest = (): Gen5StaticRequest => {
    const staticProfile = gen5StaticProfile(profile!);
    const selectedLead =
      leadVisible && !(fixedGender && isCuteCharmLead(lead))
        ? lead
        : ({ type: "none" } as const);
    const selectedLuckyPower = luckyPowerVisible ? luckyPower : "none";
    if (mode === "generator") {
      return {
        mode,
        profile: staticProfile,
        template,
        seed,
        initialAdvances: Number(generatorInitial || "0"),
        maxAdvances: Number(generatorMax || "0"),
        offset: Number(generatorOffset || "0"),
        initialIvAdvances: Number(generatorIvAdvances || "0"),
        maxIvAdvances: 0,
        lead: selectedLead,
        luckyPower: selectedLuckyPower,
        filters: buildFilters(),
        resultLimit: 100_000,
        cache: null,
      };
    }
    return {
      mode,
      profile: staticProfile,
      template,
      startDate,
      endDate,
      initialAdvances: Number(searcherInitial || "0"),
      maxAdvances: Number(searcherMax || "0"),
      offset: 0,
      initialIvAdvances: Number(searcherInitialIv || "0"),
      maxIvAdvances: Number(searcherMaxIv || "0"),
      lead: selectedLead,
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
      if (!gen5StaticFastSearchEligible(request, ivCache))
        return [
          "Settings are not configured for fast searching",
          `Keep initial/max advances below ${ivCache.initialAdvances}/${ivCache.maxAdvances}`,
          "Ensure IV filters are set to common spreads",
        ].join("\n");
      const prepared = prepareGen5StaticCache(request, ivCache, shaCache);
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
      if (type === "iv") setIvCache(parseGen5StaticIvCache(buffer, file.name));
      else setShaCache(parseGen5StaticShaCache(buffer, file.name));
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
    if (!profile) {
      setError(labels.noProfile);
      setStatus("failed");
      return;
    }
    try {
      const baseRequest = buildRequest();
      const prepared =
        baseRequest.mode === "searcher"
          ? prepareGen5StaticCache(baseRequest, ivCache, shaCache)
          : undefined;
      const request = withGen5StaticCache(baseRequest, prepared);
      validateGen5StaticRequest(request);
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

  const updateIv = (kind: "min" | "max", index: number, value: string) => {
    const update = (current: IvText) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ) as IvText;
    if (kind === "min") setIvMin(update);
    else setIvMax(update);
  };

  const columns: readonly ResultColumn[] =
    mode === "generator"
      ? [
          { key: "advances", label: "Advances" },
          { key: "chatot", label: "Chatot" },
          { key: "needle", label: "Needle" },
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

  const rowValues = (result: Gen5StaticResult) => {
    const stats = showStats
      ? computeStats(result, template.species, template.form, template.level)
      : result.ivs;
    const abilityName = getGen4AbilityName(i18n.language, result.abilityIndex);
    const abilityText =
      result.ability === 2
        ? `H (${abilityName})`
        : `${result.ability}: ${abilityName}`;
    const common = [
      result.pid,
      shinyLabel(chinese, result.shiny),
      t(NATURE_KEYS[result.nature]),
      abilityText,
      ...stats.map(String),
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
        : formatGen5StaticButtons(result.buttonMask),
    ];
  };

  const resultValue = (result: Gen5StaticResult, key: SortKey) => {
    const ivIndex = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
    if (ivIndex >= 0) {
      return showStats
        ? computeStats(result, template.species, template.form, template.level)[
            ivIndex
          ]
        : result.ivs[ivIndex];
    }
    if (key === "seed" || key === "pid" || key === "dateTime")
      return result[key] ?? "";
    if (key === "timer0" || key === "buttonMask") return result[key] ?? -1;
    return result[
      key as
        | "advances"
        | "ivAdvances"
        | "chatot"
        | "needle"
        | "shiny"
        | "nature"
        | "ability"
        | "hiddenPower"
        | "hiddenPowerStrength"
        | "gender"
        | "characteristic"
    ];
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
    // Encounter data and display mode affect derived stat values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    results,
    showStats,
    sort,
    template.form,
    template.level,
    template.species,
  ]);
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

  return (
    <div className="gen5static-panel">
      <section className="gen5static-profile panel">
        <div className="gen5static-profile-heading">
          <h2>{labels.profile}</h2>
          <div className="gen5static-profile-actions">
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
          <dl className="gen5static-profile-values">
            {profileSummary.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <div
        aria-label="Static operation"
        className="gen5static-mode-tabs"
        role="tablist"
      >
        {MODES.map((value, index) => (
          <button
            aria-controls="gen5static-workspace"
            aria-selected={mode === value}
            className={mode === value ? "active" : ""}
            disabled={busy}
            id={`gen5static-${value}-tab`}
            key={value}
            onClick={() => changeMode(value)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={mode === value ? 0 : -1}
            type="button"
          >
            {labels[value]}
          </button>
        ))}
      </div>

      <form
        aria-labelledby={`gen5static-${mode}-tab`}
        className="gen5static-workspace"
        id="gen5static-workspace"
        onSubmit={run}
      >
        <div className="gen5static-controls">
          <section className="gen5static-settings panel">
            <div className="panel-heading compact">
              <h2>{labels.rngInfo}</h2>
            </div>
            <div className="gen5static-form-grid">
              {mode === "generator" ? (
                <>
                  <label className="field gen5static-wide-field">
                    <span>{labels.seed}</span>
                    <input
                      disabled={busy}
                      inputMode="text"
                      maxLength={16}
                      onChange={(event) =>
                        setSeed(normalizeGen5StaticSeed(event.target.value))
                      }
                      spellCheck={false}
                      value={seed}
                    />
                  </label>
                  <AdvanceField
                    label={labels.ivAdvances}
                    onChange={setGeneratorIvAdvances}
                    value={generatorIvAdvances}
                    disabled={busy}
                  />
                  <AdvanceField
                    label={labels.offset}
                    onChange={setGeneratorOffset}
                    value={generatorOffset}
                    disabled={busy}
                  />
                  <AdvanceField
                    label={labels.initialAdvances}
                    onChange={setGeneratorInitial}
                    value={generatorInitial}
                    disabled={busy}
                  />
                  <AdvanceField
                    label={labels.maxAdvances}
                    onChange={setGeneratorMax}
                    value={generatorMax}
                    disabled={busy}
                  />
                </>
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
                  <AdvanceField
                    label={labels.initialIvAdvances}
                    onChange={setSearcherInitialIv}
                    value={searcherInitialIv}
                    disabled={busy}
                  />
                  <AdvanceField
                    label={labels.maxIvAdvances}
                    onChange={setSearcherMaxIv}
                    value={searcherMaxIv}
                    disabled={busy}
                  />
                  <AdvanceField
                    label={labels.initialAdvances}
                    onChange={setSearcherInitial}
                    value={searcherInitial}
                    disabled={busy}
                  />
                  <AdvanceField
                    label={labels.maxAdvances}
                    onChange={setSearcherMax}
                    value={searcherMax}
                    disabled={busy}
                  />
                </>
              )}
            </div>

            <div className="panel-heading compact gen5static-settings-heading">
              <h2>{labels.settings}</h2>
            </div>
            <div className="gen5static-form-grid">
              <label className="field">
                <span>{labels.category}</span>
                <Select
                  disabled={busy || !profile}
                  onChange={(event) =>
                    changeCategory(event.target.value as Gen5StaticCategory)
                  }
                  value={activeCategory}
                >
                  {categories.map((entry) => (
                    <option key={entry} value={entry}>
                      {CATEGORY_NAMES[entry][chinese ? 1 : 0]}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field gen5static-wide-field">
                <span>{labels.pokemon}</span>
                <Select
                  disabled={busy || !profile}
                  onChange={(event) => changeTemplate(event.target.value)}
                  value={template.id}
                >
                  {templates.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {encounterLabel(i18n.language, entry.species, entry.form)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{labels.level}</span>
                <input readOnly value={template.level} />
              </label>
              <label className="field">
                <span>{labels.shiny}</span>
                <input
                  readOnly
                  value={templateShinyLabel(chinese, template.shiny)}
                />
              </label>
              {leadVisible && (
                <label className="field gen5static-wide-field">
                  <span>{labels.lead}</span>
                  <Select
                    disabled={busy}
                    onChange={(event) =>
                      setLead(leadFromValue(event.target.value))
                    }
                    value={leadValue(
                      fixedGender && isCuteCharmLead(lead)
                        ? { type: "none" }
                        : lead,
                    )}
                  >
                    <option value="none">{labels.none}</option>
                    {!fixedGender && (
                      <optgroup label={labels.cuteCharm}>
                        <option value="cute-male">♂ {labels.lead}</option>
                        <option value="cute-female">♀ {labels.lead}</option>
                      </optgroup>
                    )}
                    <optgroup label={chinese ? "同步" : "Synchronize"}>
                      {natureOptions.map((option) => (
                        <option
                          key={option.value}
                          value={`sync-${option.value}`}
                        >
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  </Select>
                </label>
              )}
              {luckyPowerVisible && (
                <label className="field">
                  <span>{labels.luckyPower}</span>
                  <Select
                    disabled={busy}
                    onChange={(event) =>
                      setLuckyPower(event.target.value as "none" | "level3")
                    }
                    value={luckyPower}
                  >
                    <option value="none">{labels.none}</option>
                    <option value="level3">3/S</option>
                  </Select>
                </label>
              )}
            </div>

            {mode === "searcher" && (
              <div className="gen5static-cache-section">
                <label className="gen5static-file-field">
                  <span>{labels.ivCache}</span>
                  <input
                    accept=".ivcache,application/octet-stream"
                    disabled={busy}
                    onChange={(event) => void loadCacheFile(event, "iv")}
                    type="file"
                  />
                  <output>{ivCache?.name ?? profile?.ivCacheName ?? ""}</output>
                </label>
                <label className="gen5static-file-field">
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
                <p className="gen5static-cache-status">{fastStatus}</p>
              </div>
            )}
          </section>

          <section className="gen5static-filters panel">
            <div className="panel-heading compact">
              <h2>{labels.filters}</h2>
            </div>
            {mode === "generator" && (
              <label className="gen5static-toggle">
                <input
                  checked={filtersDisabled}
                  disabled={busy}
                  onChange={(event) => setFiltersDisabled(event.target.checked)}
                  type="checkbox"
                />
                <span>{labels.disableFilters}</span>
              </label>
            )}
            <label className="gen5static-toggle">
              <input
                checked={showStats}
                disabled={busy}
                onChange={(event) => setShowStats(event.target.checked)}
                type="checkbox"
              />
              <span>{labels.showStats}</span>
            </label>
            <div className="gen5static-iv-grid">
              {IV_KEYS.map((key, index) => (
                <div className="gen5static-iv-range" key={key}>
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
            <div className="gen5static-filter-grid">
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
            </div>
          </section>

          <div className="gen5static-actions">
            <button
              className="primary-action"
              disabled={busy || !profile}
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

        <section aria-busy={busy} className="gen5static-results panel">
          <div className="gen5static-results-heading">
            <div>
              <h2>{labels.results}</h2>
              <span aria-live="polite" role="status">
                {labels[status]}
              </span>
            </div>
            <div className="gen5static-results-actions">
              {mode === "generator" && (
                <button
                  aria-controls="gen5static-advance-finder-panel"
                  aria-expanded={advanceFinderExpanded}
                  aria-haspopup="dialog"
                  className="secondary-action"
                  disabled={results.length === 0}
                  id="gen5static-advance-finder-trigger"
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
                    !profile ||
                    selectedResult.dateTime === undefined ||
                    selectedResult.buttonMask === undefined
                  }
                  onClick={() => {
                    if (
                      !selectedResult ||
                      !profile ||
                      selectedResult.dateTime === undefined ||
                      selectedResult.buttonMask === undefined
                    ) {
                      return;
                    }
                    onOpenAdjacentSeeds({
                      dateTime: selectedResult.dateTime,
                      buttonMask: selectedResult.buttonMask,
                      encounter: template.roamer ? "roamer" : "standard",
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
          <div className="gen5static-progress">
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
          <div className="gen5static-table-shell" ref={tableRef}>
            <div
              aria-colcount={columns.length}
              aria-rowcount={results.length + 1}
              className={`gen5static-table ${mode}`}
              role="table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 44}px` }}
            >
              <div className="gen5static-table-header" role="row">
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
              {rowVirtualizer.getVirtualItems().map((row) => {
                const result = sortedResults[row.index];
                return (
                  <div
                    aria-selected={selectedResult === result}
                    className={`gen5static-table-row${
                      selectedResult === result ? " selected" : ""
                    }`}
                    key={`${result.seed}-${result.ivAdvances}-${result.advances}-${row.index}`}
                    onClick={() => setSelectedResult(result)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedResult(result);
                      }
                    }}
                    role="row"
                    style={{ transform: `translateY(${row.start + 44}px)` }}
                    tabIndex={0}
                  >
                    {rowValues(result).map((value, index) => (
                      <span
                        key={`${columns[index].key}-${index}`}
                        role="cell"
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
        className="gen5static-advance-finder"
        closeLabel="Close Advance Finder"
        expanded={advanceFinderExpanded}
        id="gen5static-advance-finder-panel"
        label="Advance Finder"
        onExpandedChange={setAdvanceFinderExpanded}
        tone="brand"
        triggerId="gen5static-advance-finder-trigger"
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
