import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  isThreeDsGen7Profile,
  type ThreeDsProfile,
} from "../3dsprofiles/domain";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import {
  GEN7_WILD_NATURES,
  type Gen7WildCategory,
  type Gen7WildGameVersion,
} from "./data";
import {
  formatGen7WildHex32,
  formatGen7WildHex64,
  GEN7_WILD_MAX_RESULTS,
  gen7WildAreas,
  gen7WildAreasForSpecial,
  gen7WildEncounterFromArea,
  gen7WildLocationName,
  gen7WildSlotChances,
  gen7WildSpeciesName,
  gen7WildSpecials,
  gen7WildStartingFrame,
  parseGen7WildDecimal,
  parseGen7WildHex,
  validateGen7WildRequest,
  type Gen7WildAbilityFilter,
  type Gen7WildBlinkFilter,
  type Gen7WildGenderFilter,
  type Gen7WildIvTuple,
  type Gen7WildLanguage,
  type Gen7WildLead,
  type Gen7WildResult,
  type Gen7WildShinyFilter,
  type Gen7WildTrigger,
} from "./domain";
import { Gen7WildUiPreviewEngine } from "./preview/Gen7WildUiPreviewEngine";
import type {
  Gen7WildEngine,
  Gen7WildProgress,
  Gen7WildSummary,
} from "./search";
import { Gen7WildWorker } from "./worker/Gen7WildWorker";
import "./Gen7WildPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
type SortDirection = "asc" | "desc";
type SortKey =
  | "frame"
  | "realTimeFrames"
  | "random"
  | "species"
  | "level"
  | "slot"
  | "ec"
  | "pid"
  | "hp"
  | "attack"
  | "defense"
  | "specialAttack"
  | "specialDefense"
  | "speed"
  | "nature"
  | "ability"
  | "gender"
  | "hiddenPower"
  | "item"
  | "special"
  | "shiny"
  | "synchronize"
  | "blink"
  | "delay";

interface ResultColumn {
  key: SortKey;
  label: string;
}

const IV_KEYS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const IV_SORT_KEYS = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
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
const CATEGORIES: readonly Gen7WildCategory[] = [
  "normal",
  "ub",
  "island-scan",
  "fishing",
  "misc",
  "berry",
];
const CATEGORY_LABELS: Record<
  Gen7WildLanguage,
  Record<Gen7WildCategory, string>
> = {
  en: {
    normal: "Normal Wild",
    ub: "UB",
    "island-scan": "Island Scan",
    fishing: "Fishing",
    misc: "Ambush Encounters",
    berry: "Berry Tree",
  },
  ja: {
    normal: "Normal Wild",
    ub: "UB",
    "island-scan": "Island Scan",
    fishing: "Fishing",
    misc: "Ambush Encounters",
    berry: "Berry Tree",
  },
  zh: {
    normal: "普通野外",
    ub: "UB",
    "island-scan": "岛屿扫描",
    fishing: "钓鱼",
    misc: "摇草/摇树/阴影/沙尘",
    berry: "果树",
  },
};
const LEAD_LABELS: Record<Gen7WildLanguage, Record<Gen7WildLead, string>> = {
  en: {
    none: "-",
    synchronize: "Synchronize",
    "cute-charm-male": "Cute Charm ♂",
    "cute-charm-female": "Cute Charm ♀",
    static: "Static",
    "magnet-pull": "Magnet Pull",
    "compound-eyes": "Compound Eyes",
    "suction-cups": "Suction Cups | Sticky Hold",
    "level-modifier": "Pressure | Hustle | Vital Spirit",
    "black-flute": "黑色玻璃哨",
    "white-flute": "白色玻璃哨",
  },
  ja: {
    none: "-",
    synchronize: "Synchronize",
    "cute-charm-male": "Cute Charm ♂",
    "cute-charm-female": "Cute Charm ♀",
    static: "Static",
    "magnet-pull": "Magnet Pull",
    "compound-eyes": "Compound Eyes",
    "suction-cups": "Suction Cups | Sticky Hold",
    "level-modifier": "Pressure | Hustle | Vital Spirit",
    "black-flute": "黑色玻璃哨",
    "white-flute": "白色玻璃哨",
  },
  zh: {
    none: "-",
    synchronize: "同步",
    "cute-charm-male": "迷人之躯♂",
    "cute-charm-female": "迷人之躯♀",
    static: "静电",
    "magnet-pull": "磁力",
    "compound-eyes": "复眼",
    "suction-cups": "吸盘 | 黏着",
    "level-modifier": "压迫感 | 活力 | 干劲",
    "black-flute": "黑色玻璃哨",
    "white-flute": "白色玻璃哨",
  },
};

function leadOptions(language: Gen7WildLanguage) {
  return (Object.keys(LEAD_LABELS[language]) as Gen7WildLead[]).map(
    (value) => ({ value, label: LEAD_LABELS[language][value] }),
  );
}
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;

function tuple(values: IvText): Gen7WildIvTuple {
  return values.map(parseGen7WildDecimal) as Gen7WildIvTuple;
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === "bigint" && typeof right === "bigint") {
    return left < right ? -1 : left > right ? 1 : 0;
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  return Number(left) - Number(right);
}

function sortValue(result: Gen7WildResult, key: SortKey) {
  const ivIndex = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
  if (ivIndex >= 0) return result.ivs[ivIndex];
  return result[key as keyof Gen7WildResult];
}

function csvCell(value: string | number | bigint | boolean) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen7WildPanel({
  profile,
  uiPreviewMode,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const language: Gen7WildLanguage =
    i18n.resolvedLanguage === "ja"
      ? "ja"
      : i18n.resolvedLanguage === "zh"
        ? "zh"
        : "en";
  const engine = useMemo<Gen7WildEngine>(
    () =>
      uiPreviewMode ? new Gen7WildUiPreviewEngine() : new Gen7WildWorker(),
    [uiPreviewMode],
  );
  const [version, setVersion] = useState<Gen7WildGameVersion>("ultra-sun");
  const [category, setCategory] = useState<Gen7WildCategory>("normal");
  const [specialId, setSpecialId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [night, setNight] = useState(false);
  const [bubbling, setBubbling] = useState(false);
  const [fishingOverview, setFishingOverview] = useState(false);
  const [trigger, setTrigger] = useState<Gen7WildTrigger>("default");
  const [seed, setSeed] = useState("0");
  const [minFrame, setMinFrame] = useState("478");
  const [maxFrame, setMaxFrame] = useState("50000");
  const [tsv, setTsv] = useState("0");
  const [trv, setTrv] = useState("0");
  const [shinyCharm, setShinyCharm] = useState(false);
  const [lead, setLead] = useState<Gen7WildLead>("none");
  const [syncNature, setSyncNature] = useState("");
  const [considerDelay, setConsiderDelay] = useState(true);
  const [npc, setNpc] = useState("0");
  const [correction, setCorrection] = useState("1");
  const [raining, setRaining] = useState(false);
  const [levelMin, setLevelMin] = useState("1");
  const [levelMax, setLevelMax] = useState("4");
  const [specialRate, setSpecialRate] = useState("0");
  const [biteDelay, setBiteDelay] = useState("78");
  const [delay2, setDelay2] = useState("0");
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shinyFilter, setShinyFilter] = useState<Gen7WildShinyFilter>("any");
  const [genderFilter, setGenderFilter] = useState<Gen7WildGenderFilter>("any");
  const [abilityFilter, setAbilityFilter] =
    useState<Gen7WildAbilityFilter>("any");
  const [blinkFilter, setBlinkFilter] = useState<Gen7WildBlinkFilter>("any");
  const [natureMask, setNatureMask] = useState(ALL_NATURES);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(ALL_HIDDEN_POWERS);
  const [slotMask, setSlotMask] = useState(0);
  const [specialOnly, setSpecialOnly] = useState(false);
  const [levelFilter, setLevelFilter] = useState("0");
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
  const [results, setResults] = useState<Gen7WildResult[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen7WildProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen7WildSummary>();
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "frame",
    direction: "asc",
  });
  const abortRef = useRef<AbortController | undefined>(undefined);
  const tableRef = useRef<HTMLDivElement>(null);

  const specials = useMemo(
    () => gen7WildSpecials(version, category),
    [version, category],
  );
  const selectedSpecial =
    specials.find((entry) => entry.id === specialId) ?? specials[0];
  const areas = useMemo(
    () =>
      selectedSpecial
        ? gen7WildAreasForSpecial(version, selectedSpecial)
        : gen7WildAreas(version, category),
    [category, selectedSpecial, version],
  );
  const selectedArea = areas.find((entry) => entry.id === areaId) ?? areas[0];
  const baseEncounter = useMemo(
    () =>
      selectedArea
        ? gen7WildEncounterFromArea({
            version,
            category,
            area: selectedArea,
            special: selectedSpecial,
            night,
            bubbling,
            fishingOverview,
            trigger,
          })
        : undefined,
    [
      bubbling,
      category,
      fishingOverview,
      night,
      selectedArea,
      selectedSpecial,
      trigger,
      version,
    ],
  );
  const natureOptions = useMemo(
    () => GEN7_WILD_NATURES[language].map((label, value) => ({ label, value })),
    [language],
  );
  const powerOptions = POWER_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const slotOptions = baseEncounter
    ? baseEncounter.slots.map((slot, index) => ({
        label: `${index + 1}: ${gen7WildSpeciesName(slot.species, slot.form, language)} (${gen7WildSlotChances(baseEncounter)[index] ?? 0}%)`,
        value: index + 1,
      }))
    : [];

  useEffect(() => {
    if (selectedSpecial && selectedSpecial.id !== specialId)
      setSpecialId(selectedSpecial.id);
    if (!selectedSpecial && specialId) setSpecialId("");
  }, [selectedSpecial, specialId]);

  useEffect(() => {
    if (selectedArea && selectedArea.id !== areaId) setAreaId(selectedArea.id);
  }, [areaId, selectedArea]);

  useEffect(() => {
    setMinFrame(String(gen7WildStartingFrame(version)));
  }, [version]);

  useEffect(() => {
    if (!isThreeDsGen7Profile(profile)) return;
    setVersion(profile.version);
    setTsv(String(profile.tsv));
    setTrv(profile.trv.toString(16).toUpperCase());
    setShinyCharm(profile.shinyCharm);
  }, [profile]);

  useEffect(() => {
    if (!baseEncounter) return;
    setNpc(String(baseEncounter.npc));
    setCorrection(String(baseEncounter.correction));
    setRaining(baseEncounter.raining);
    setLevelMin(String(baseEncounter.levelMin));
    setLevelMax(String(baseEncounter.levelMax));
    setSpecialRate(String(baseEncounter.specialRate));
    setBiteDelay(String(baseEncounter.biteDelay));
    setDelay2(String(baseEncounter.inlineDelayTime * 2));
    setSlotMask(0);
  }, [baseEncounter]);

  useEffect(() => () => engine.dispose(), [engine]);

  const sortedResults = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        compareValues(sortValue(left, sort.key), sortValue(right, sort.key)) *
        direction,
    );
  }, [results, sort]);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 38,
    overscan: 12,
  });
  const columns: readonly ResultColumn[] = [
    { key: "frame", label: t("gen7StationaryFrame") },
    { key: "realTimeFrames", label: t("gen7StationaryRealtime") },
    { key: "random", label: t("gen7RandomNumber") },
    { key: "species", label: t("species") },
    { key: "level", label: t("level") },
    { key: "slot", label: t("gen7WildEncounterSlot") },
    { key: "ec", label: "EC" },
    { key: "pid", label: "PID" },
    ...IV_KEYS.map((label, index) => ({ key: IV_SORT_KEYS[index], label })),
    { key: "nature", label: t("nature") },
    { key: "ability", label: t("ability") },
    { key: "gender", label: t("gender") },
    { key: "hiddenPower", label: t("hiddenPower") },
    { key: "item", label: t("gen7WildItem") },
    { key: "special", label: t("gen7WildSpecial") },
    { key: "shiny", label: t("shiny") },
    { key: "synchronize", label: t("gen7StationarySync") },
    { key: "blink", label: t("gen7WildMark") },
    { key: "delay", label: t("delay") },
  ];

  function updateIv(
    setter: Dispatch<SetStateAction<IvText>>,
    index: number,
    value: string,
  ) {
    setter((current) => {
      const next = [...current] as IvText;
      next[index] = normalizeDecimalInput(value, 2);
      return next;
    });
  }

  function buildRequest() {
    if (!baseEncounter) throw new Error(t("invalidGen7WildInput"));
    const encounter = {
      ...baseEncounter,
      npc: parseGen7WildDecimal(npc),
      correction: parseGen7WildDecimal(correction),
      raining,
      levelMin: parseGen7WildDecimal(levelMin),
      levelMax: parseGen7WildDecimal(levelMax),
      specialRate: parseGen7WildDecimal(specialRate),
      biteDelay: parseGen7WildDecimal(biteDelay),
      inlineDelayTime: Math.trunc(parseGen7WildDecimal(delay2) / 2),
    };
    return validateGen7WildRequest({
      version,
      seed: parseGen7WildHex(seed),
      minFrame: parseGen7WildDecimal(minFrame),
      maxFrame: parseGen7WildDecimal(maxFrame),
      tsv: parseGen7WildDecimal(tsv),
      trv: parseGen7WildHex(trv),
      shinyCharm,
      syncNature:
        lead === "synchronize" ? parseGen7WildDecimal(syncNature) : null,
      lead,
      considerDelay,
      encounter,
      filters: {
        disabled: filtersDisabled,
        shiny: shinyFilter,
        gender: genderFilter,
        ability: abilityFilter,
        natureMask,
        hiddenPowerMask,
        ivMin: tuple(ivMin),
        ivMax: tuple(ivMax),
        perfectIvValue: parseGen7WildDecimal(perfectIvValue),
        perfectIvCount: parseGen7WildDecimal(perfectIvCount),
        blink: blinkFilter,
        slotMask,
        specialOnly,
        level: parseGen7WildDecimal(levelFilter),
      },
      resultLimit: GEN7_WILD_MAX_RESULTS,
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (status === "calculating") return;
    try {
      const request = buildRequest();
      const controller = new AbortController();
      abortRef.current = controller;
      setResults([]);
      setSummary(undefined);
      setError("");
      setStatus("calculating");
      setProgress({
        processedStates: 0,
        totalStates: request.maxFrame - request.minFrame + 1,
        resultCount: 0,
        percent: 0,
      });
      const completed = await engine.search(request, {
        signal: controller.signal,
        onBatch: (batch) => setResults((current) => [...current, ...batch]),
        onProgress: setProgress,
      });
      setSummary(completed);
      setStatus(completed.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("invalidGen7WildInput"),
      );
      setStatus("failed");
    } finally {
      abortRef.current = undefined;
    }
  }

  function exportCsv() {
    if (sortedResults.length === 0) return;
    const headers = columns.map((column) => column.label);
    const rows = sortedResults.map((result) => [
      result.frame,
      result.realTimeFrames,
      formatGen7WildHex64(result.random),
      gen7WildSpeciesName(result.species, result.form, language),
      result.level,
      result.slot,
      formatGen7WildHex32(result.ec),
      formatGen7WildHex32(result.pid),
      ...result.ivs,
      GEN7_WILD_NATURES[language][result.nature],
      result.ability,
      result.gender === 1
        ? t("male")
        : result.gender === 2
          ? t("female")
          : t("genderless"),
      t(POWER_KEYS[result.hiddenPower]),
      result.item === 0
        ? t("gen7WildItemCommon")
        : result.item === 1
          ? t("gen7WildItemRare")
          : t("none"),
      result.special,
      result.shiny,
      result.synchronize,
      result.blink,
      result.delay,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "gen7-wild-results.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function resultCell(result: Gen7WildResult, key: SortKey) {
    const ivIndex = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
    if (ivIndex >= 0) return result.ivs[ivIndex];
    switch (key) {
      case "random":
        return formatGen7WildHex64(result.random);
      case "ec":
      case "pid":
        return formatGen7WildHex32(result[key]);
      case "species":
        return gen7WildSpeciesName(result.species, result.form, language);
      case "nature":
        return GEN7_WILD_NATURES[language][result.nature];
      case "gender":
        return result.gender === 1 ? "♂" : result.gender === 2 ? "♀" : "-";
      case "hiddenPower":
        return t(POWER_KEYS[result.hiddenPower]);
      case "item":
        return result.item === 0
          ? t("gen7WildItemCommon")
          : result.item === 1
            ? t("gen7WildItemRare")
            : "-";
      case "special":
      case "synchronize":
        return result[key] ? t("yes") : t("no");
      case "shiny":
        return result.shiny === 2
          ? t("shinySquare")
          : result.shiny === 1
            ? t("shinyStar")
            : "-";
      default:
        return String(result[key as keyof Gen7WildResult]);
    }
  }

  const statusText =
    status === "calculating"
      ? `${progress.percent.toFixed(1)}%`
      : status === "completed"
        ? `${results.length}`
        : status === "cancelled"
          ? t("cancel")
          : status === "failed"
            ? t("invalidGen7WildInput")
            : t("ready");

  return (
    <form className="gen7wild-panel" onSubmit={submit}>
      <div className="gen7wild-workspace">
        <section className="panel gen7wild-controls">
          <header className="gen7wild-heading">
            <div>
              <Play aria-hidden="true" size={18} />
              <h2>{t("gen7WildSetup")}</h2>
            </div>
            <strong>{statusText}</strong>
          </header>

          <div className="gen7wild-section">
            <h3>{t("rngInfo")}</h3>
            <div className="gen7wild-grid">
              <label className="field">
                <span>{t("gen7GameVersion")}</span>
                <select
                  value={version}
                  onChange={(event) =>
                    setVersion(event.target.value as Gen7WildGameVersion)
                  }
                >
                  <option value="sun">{t("gen7Sun")}</option>
                  <option value="moon">{t("gen7Moon")}</option>
                  <option value="ultra-sun">{t("gen7UltraSun")}</option>
                  <option value="ultra-moon">{t("gen7UltraMoon")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("seed")}</span>
                <input
                  inputMode="text"
                  maxLength={8}
                  value={seed}
                  onChange={(event) =>
                    setSeed(normalizeHexInput(event.target.value, 8))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen7StationaryMinFrame")}</span>
                <input
                  inputMode="numeric"
                  value={minFrame}
                  onChange={(event) =>
                    setMinFrame(normalizeDecimalInput(event.target.value, 8))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen7StationaryMaxFrame")}</span>
                <input
                  inputMode="numeric"
                  value={maxFrame}
                  onChange={(event) =>
                    setMaxFrame(normalizeDecimalInput(event.target.value, 8))
                  }
                />
              </label>
              <label className="field">
                <span>TSV</span>
                <input
                  inputMode="numeric"
                  value={tsv}
                  onChange={(event) =>
                    setTsv(normalizeDecimalInput(event.target.value, 4))
                  }
                />
              </label>
              <label className="field">
                <span>TRV</span>
                <input
                  inputMode="text"
                  maxLength={1}
                  value={trv}
                  onChange={(event) =>
                    setTrv(normalizeHexInput(event.target.value, 1))
                  }
                />
              </label>
            </div>
          </div>

          <div className="gen7wild-section">
            <h3>{t("gen7WildEncounter")}</h3>
            <div className="gen7wild-grid">
              <label className="field">
                <span>{t("category")}</span>
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as Gen7WildCategory)
                  }
                >
                  {CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {CATEGORY_LABELS[language][value]}
                    </option>
                  ))}
                </select>
              </label>
              {selectedSpecial && (
                <label className="field">
                  <span>{t("pokemon")}</span>
                  <select
                    value={selectedSpecial.id}
                    onChange={(event) => setSpecialId(event.target.value)}
                  >
                    {specials.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {gen7WildSpeciesName(
                          entry.species,
                          entry.form,
                          language,
                        )}{" "}
                        Lv.{entry.level}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field gen7wild-location-field">
                <span>{t("gen7WildLocation")}</span>
                <select
                  value={selectedArea?.id ?? ""}
                  onChange={(event) => setAreaId(event.target.value)}
                >
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {gen7WildLocationName(area, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("gen7WildTime")}</span>
                <select
                  value={night ? "night" : "day"}
                  onChange={(event) => setNight(event.target.value === "night")}
                >
                  <option value="day">{t("gen7WildDay")}</option>
                  <option value="night">{t("gen7WildNight")}</option>
                </select>
              </label>
              {category === "misc" && (
                <label className="field">
                  <span>{t("gen7WildTrigger")}</span>
                  <select
                    value={trigger}
                    onChange={(event) =>
                      setTrigger(event.target.value as Gen7WildTrigger)
                    }
                  >
                    <option value="default">
                      {t("gen7WildTriggerDefault")}
                    </option>
                    <option value="step">{t("gen7WildTriggerStep")}</option>
                    <option value="menu">{t("gen7WildTriggerMenu")}</option>
                  </select>
                </label>
              )}
            </div>
            <div className="gen7wild-toggle-grid">
              {category === "fishing" && (
                <>
                  <label className="check-row">
                    <input
                      checked={bubbling}
                      onChange={(event) => setBubbling(event.target.checked)}
                      type="checkbox"
                    />
                    <span>{t("gen7WildBubbling")}</span>
                  </label>
                  <label className="check-row">
                    <input
                      checked={fishingOverview}
                      onChange={(event) =>
                        setFishingOverview(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>{t("gen7WildOverview")}</span>
                  </label>
                </>
              )}
              <label className="check-row">
                <input
                  checked={raining}
                  onChange={(event) => setRaining(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen7WildRaining")}</span>
              </label>
              <label className="check-row">
                <input
                  checked={considerDelay}
                  onChange={(event) => setConsiderDelay(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen7WildConsiderDelay")}</span>
              </label>
              <label className="check-row">
                <input
                  checked={shinyCharm}
                  onChange={(event) => setShinyCharm(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen7StationaryShinyCharm")}</span>
              </label>
            </div>
            <div className="gen7wild-grid compact">
              <label className="field">
                <span>{t("gen7WildNpc")}</span>
                <input
                  inputMode="numeric"
                  value={npc}
                  onChange={(event) =>
                    setNpc(normalizeDecimalInput(event.target.value, 3))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen7WildCorrection")}</span>
                <input
                  disabled={
                    category === "fishing" ||
                    category === "misc" ||
                    category === "berry"
                  }
                  inputMode="numeric"
                  value={correction}
                  onChange={(event) =>
                    setCorrection(normalizeDecimalInput(event.target.value, 2))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen7WildLevelMin")}</span>
                <input
                  inputMode="numeric"
                  value={levelMin}
                  onChange={(event) =>
                    setLevelMin(normalizeDecimalInput(event.target.value, 3))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen7WildLevelMax")}</span>
                <input
                  inputMode="numeric"
                  value={levelMax}
                  onChange={(event) =>
                    setLevelMax(normalizeDecimalInput(event.target.value, 3))
                  }
                />
              </label>
              {(selectedSpecial || category === "fishing") && (
                <label className="field">
                  <span>{t("gen7WildRate")}</span>
                  <input
                    inputMode="numeric"
                    value={specialRate}
                    onChange={(event) =>
                      setSpecialRate(
                        normalizeDecimalInput(event.target.value, 3),
                      )
                    }
                  />
                </label>
              )}
              {category === "fishing" && (
                <label className="field">
                  <span>{t("gen7WildBiteDelay")}</span>
                  <input
                    inputMode="numeric"
                    value={biteDelay}
                    onChange={(event) =>
                      setBiteDelay(normalizeDecimalInput(event.target.value, 3))
                    }
                  />
                </label>
              )}
              {category === "misc" && (
                <label className="field">
                  <span>{t("gen7WildDelay2")}</span>
                  <input
                    inputMode="numeric"
                    value={delay2}
                    onChange={(event) =>
                      setDelay2(normalizeDecimalInput(event.target.value, 5))
                    }
                  />
                </label>
              )}
            </div>
          </div>

          <div className="gen7wild-section">
            <h3>{t("gen7WildLead")}</h3>
            <div className="gen7wild-grid">
              <label className="field">
                <span>{t("gen7WildLead")}</span>
                <select
                  value={lead}
                  onChange={(event) => {
                    const next = event.target.value as Gen7WildLead;
                    setLead(next);
                    if (next !== "synchronize") setSyncNature("");
                  }}
                >
                  {leadOptions(language).map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("gen7StationarySyncNature")}</span>
                <select
                  disabled={lead !== "synchronize"}
                  value={syncNature}
                  onChange={(event) => setSyncNature(event.target.value)}
                >
                  <option value="">-</option>
                  {natureOptions.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <details className="gen7wild-disclosure" open>
            <summary>{t("filters")}</summary>
            <fieldset
              className="gen7wild-filter-content"
              disabled={filtersDisabled}
            >
              <div className="gen7wild-grid">
                <label className="field">
                  <span>{t("shiny")}</span>
                  <select
                    value={shinyFilter}
                    onChange={(event) =>
                      setShinyFilter(event.target.value as Gen7WildShinyFilter)
                    }
                  >
                    <option value="any">{t("any")}</option>
                    <option value="shiny">{t("shinyStar")}</option>
                    <option value="square">{t("shinySquare")}</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("gender")}</span>
                  <select
                    value={genderFilter}
                    onChange={(event) =>
                      setGenderFilter(
                        event.target.value as Gen7WildGenderFilter,
                      )
                    }
                  >
                    <option value="any">{t("any")}</option>
                    <option value="male">{t("male")}</option>
                    <option value="female">{t("female")}</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("ability")}</span>
                  <select
                    value={abilityFilter}
                    onChange={(event) =>
                      setAbilityFilter(
                        event.target.value as Gen7WildAbilityFilter,
                      )
                    }
                  >
                    <option value="any">{t("any")}</option>
                    <option value="1">{t("abilityFirst")}</option>
                    <option value="2">{t("abilitySecond")}</option>
                    <option value="hidden">
                      {t("gen7StationaryHiddenAbility")}
                    </option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("gen7WildMark")}</span>
                  <select
                    value={blinkFilter}
                    onChange={(event) =>
                      setBlinkFilter(event.target.value as Gen7WildBlinkFilter)
                    }
                  >
                    <option value="any">{t("any")}</option>
                    <option value="blink">{t("gen7WildBlinkOnly")}</option>
                    <option value="safe">{t("gen7WildSafeOnly")}</option>
                  </select>
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
                  options={powerOptions}
                  resetHint={t("checkListResetHint")}
                />
                <MultiCheckSelect
                  anyLabel={t("any")}
                  label={t("gen7WildEncounterSlot")}
                  mask={slotMask}
                  onChange={setSlotMask}
                  options={slotOptions}
                  resetHint={t("checkListResetHint")}
                />
                <label className="field">
                  <span>{t("level")}</span>
                  <input
                    inputMode="numeric"
                    value={levelFilter}
                    onChange={(event) =>
                      setLevelFilter(
                        normalizeDecimalInput(event.target.value, 3),
                      )
                    }
                  />
                </label>
              </div>
              <div className="gen7wild-toggle-grid">
                <label className="check-row">
                  <input
                    checked={specialOnly}
                    onChange={(event) => setSpecialOnly(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen7WildSpecialOnly")}</span>
                </label>
              </div>
              <div className="gen7wild-iv-table">
                <div className="gen7wild-iv-row header">
                  <span>{t("ivs")}</span>
                  <span>{t("minimum")}</span>
                  <span>{t("maximum")}</span>
                </div>
                {IV_KEYS.map((label, index) => (
                  <label className="gen7wild-iv-row" key={label}>
                    <span>{label}</span>
                    <input
                      inputMode="numeric"
                      value={ivMin[index]}
                      onChange={(event) =>
                        updateIv(setIvMin, index, event.target.value)
                      }
                    />
                    <input
                      inputMode="numeric"
                      value={ivMax[index]}
                      onChange={(event) =>
                        updateIv(setIvMax, index, event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="gen7wild-grid">
                <label className="field">
                  <span>{t("gen7WildPerfectValue")}</span>
                  <input
                    inputMode="numeric"
                    value={perfectIvValue}
                    onChange={(event) =>
                      setPerfectIvValue(
                        normalizeDecimalInput(event.target.value, 2),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("gen7WildPerfectCount")}</span>
                  <input
                    inputMode="numeric"
                    value={perfectIvCount}
                    onChange={(event) =>
                      setPerfectIvCount(
                        normalizeDecimalInput(event.target.value, 1),
                      )
                    }
                  />
                </label>
              </div>
            </fieldset>
            <label className="check-row gen7wild-disable-filter">
              <input
                checked={filtersDisabled}
                onChange={(event) => setFiltersDisabled(event.target.checked)}
                type="checkbox"
              />
              <span>{t("disableFilters")}</span>
            </label>
          </details>

          <div className="gen7wild-run-actions">
            {status === "calculating" ? (
              <button
                className="gen7wild-primary"
                onClick={() => abortRef.current?.abort()}
                type="button"
              >
                <Square aria-hidden="true" size={17} />
                {t("cancel")}
              </button>
            ) : (
              <button className="gen7wild-primary" type="submit">
                <Play aria-hidden="true" size={17} />
                {t("generate")}
              </button>
            )}
          </div>
        </section>

        <section className="panel gen7wild-results">
          <header className="gen7wild-heading">
            <div>
              <h2>{t("results")}</h2>
              <span>{results.length}</span>
            </div>
            <div className="gen7wild-result-actions">
              <button
                aria-label={t("exportCsv")}
                className="gen7wild-icon-button"
                disabled={results.length === 0}
                onClick={exportCsv}
                title={t("exportCsv")}
                type="button"
              >
                <Download aria-hidden="true" size={18} />
              </button>
              <button
                aria-label={t("clear")}
                className="gen7wild-icon-button"
                disabled={results.length === 0 || status === "calculating"}
                onClick={() => setResults([])}
                title={t("clear")}
                type="button"
              >
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </div>
          </header>
          <div className="gen7wild-summary">
            <span>
              {progress.processedStates.toLocaleString()} /{" "}
              {progress.totalStates.toLocaleString()}
            </span>
            <span>
              {summary
                ? `${t("elapsed")}: ${summary.elapsedMs.toFixed(0)} ms`
                : ""}
            </span>
            {summary?.resultLimitReached && (
              <strong>{t("limitReached")}</strong>
            )}
          </div>
          {error && (
            <p className="gen7wild-error" role="alert">
              {error}
            </p>
          )}
          <div className="gen7wild-table" ref={tableRef}>
            <div
              className="gen7wild-table-head"
              style={{ width: `${columns.length * 104}px` }}
            >
              {columns.map((column) => (
                <button
                  key={column.key}
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
                  {column.label}
                  {sort.key === column.key
                    ? sort.direction === "asc"
                      ? " ↑"
                      : " ↓"
                    : ""}
                </button>
              ))}
            </div>
            {sortedResults.length === 0 ? (
              <div className="gen7wild-empty">{t("emptyGen7Wild")}</div>
            ) : (
              <div
                className="gen7wild-table-body"
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: `${columns.length * 104}px`,
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const result = sortedResults[virtualRow.index];
                  return (
                    <div
                      className="gen7wild-table-row"
                      key={`${result.frame}-${virtualRow.index}`}
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                    >
                      {columns.map((column) => (
                        <span
                          key={column.key}
                          title={String(resultCell(result, column.key))}
                        >
                          {resultCell(result, column.key)}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}
