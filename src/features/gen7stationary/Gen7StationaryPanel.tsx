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
  GEN7_STATIONARY_NATURES,
  GEN7_STATIONARY_TEMPLATES,
  type Gen7StationaryGameVersion,
  type Gen7StationaryTemplate,
} from "./data";
import {
  formatGen7StationaryHex32,
  formatGen7StationaryHex64,
  GEN7_STATIONARY_GENDER_RATIOS,
  GEN7_STATIONARY_MAX_FRAME,
  GEN7_STATIONARY_PELAGO_MAX_SHIFT,
  gen7StationaryEncounterFromTemplate,
  gen7StationaryStartingFrame,
  gen7StationaryTemplateName,
  gen7StationaryTimeTaskCount,
  gen7StationaryTimeEpochFromInput,
  validateGen7StationaryTimeRequest,
  parseGen7StationaryDecimal,
  parseGen7StationaryHex,
  parseGen7StationarySignedDecimal,
  validateGen7StationaryRequest,
  type Gen7StationaryAbilityFilter,
  type Gen7StationaryBlinkFilter,
  type Gen7StationaryEncounter,
  type Gen7StationaryGenderFilter,
  type Gen7StationaryIvTuple,
  type Gen7StationaryLanguage,
  type Gen7StationaryRequest,
  type Gen7StationaryResult,
  type Gen7StationaryShinyFilter,
  type Gen7StationaryTimeRequest,
} from "./domain";
import { Gen7StationaryUiPreviewEngine } from "./preview/Gen7StationaryUiPreviewEngine";
import { Gen7StationaryTimeUiPreviewEngine } from "./preview/Gen7StationaryTimeUiPreviewEngine";
import type {
  Gen7StationaryEngine,
  Gen7StationaryProgress,
  Gen7StationarySummary,
  Gen7StationaryTimeEngine,
  Gen7StationaryTimeProgress,
} from "./search";
import { Gen7StationaryWorker } from "./worker/Gen7StationaryWorker";
import { Gen7StationaryTimeWorker } from "./worker/Gen7StationaryTimeWorker";
import "./Gen7StationaryPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
type SortDirection = "asc" | "desc";
type SortKey =
  | "frame"
  | "realTimeFrames"
  | "random"
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
  | "shiny"
  | "synchronize"
  | "blink"
  | "delay"
  | "psv"
  | "prv";

type TimeSortKey = "epoch" | "initialSeed";

interface ResultColumn {
  key: SortKey | TimeSortKey;
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
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const DEFAULT_TEMPLATE = GEN7_STATIONARY_TEMPLATES.find(
  (entry) => entry.family === "usum" && entry.conceptual,
)!;

function categoryLabel(category: string, translate: (key: string) => string) {
  if (category === "-") return translate("gen7StationaryCustom");
  if (category === "Starters") return translate("starters");
  if (category === "Fossils") return translate("fossils");
  return category;
}

function supportsVersion(
  template: Gen7StationaryTemplate,
  version: Gen7StationaryGameVersion,
) {
  return template.versions.includes(version);
}

function tupleFromText(values: IvText): Gen7StationaryIvTuple {
  return values.map(parseGen7StationaryDecimal) as Gen7StationaryIvTuple;
}

function resultSortValue(
  result: Gen7StationaryResult,
  key: SortKey | TimeSortKey,
) {
  if (key === "epoch") return result.epoch ?? 0n;
  if (key === "initialSeed") return result.initialSeed ?? 0;
  const ivIndex = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
  if (ivIndex !== -1) return result.ivs[ivIndex];
  return result[key as keyof Gen7StationaryResult];
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === "bigint" && typeof right === "bigint")
    return left < right ? -1 : left > right ? 1 : 0;
  if (typeof left === "boolean" && typeof right === "boolean")
    return Number(left) - Number(right);
  return Number(left) - Number(right);
}

function csvCell(value: string | number | bigint | boolean) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function displayTimeEpoch(result: Gen7StationaryResult, offsetText: string) {
  if (result.epoch === undefined) return "";
  const parsedOffset = parseGen7StationaryDecimal(offsetText);
  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) return "";
  return new Date(
    Number(result.epoch + 946_684_800_000n - BigInt(parsedOffset)),
  )
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
}

export function Gen7StationaryPanel({
  profile,
  uiPreviewMode,
  timeFinderMode = false,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
  timeFinderMode?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const language: Gen7StationaryLanguage =
    i18n.resolvedLanguage === "ja"
      ? "ja"
      : i18n.resolvedLanguage === "zh"
        ? "zh"
        : "en";
  const engine = useMemo<Gen7StationaryEngine>(
    () =>
      uiPreviewMode
        ? new Gen7StationaryUiPreviewEngine()
        : new Gen7StationaryWorker(),
    [uiPreviewMode],
  );
  const timeEngine = useMemo<Gen7StationaryTimeEngine>(
    () =>
      uiPreviewMode
        ? new Gen7StationaryTimeUiPreviewEngine()
        : new Gen7StationaryTimeWorker(),
    [uiPreviewMode],
  );
  const [version, setVersion] =
    useState<Gen7StationaryGameVersion>("ultra-sun");
  const [seed, setSeed] = useState("0");
  const [minFrame, setMinFrame] = useState("478");
  const [maxFrame, setMaxFrame] = useState(timeFinderMode ? "500" : "50000");
  const [startDate, setStartDate] = useState("2024-01-01T00:00");
  const [endDate, setEndDate] = useState("2024-01-01T00:01");
  const [tick, setTick] = useState("041D9CB9");
  const [offset, setOffset] = useState("55");
  const [tsv, setTsv] = useState("0");
  const [trv, setTrv] = useState("0");
  const [shinyCharm, setShinyCharm] = useState(false);
  const [forcedShiny, setForcedShiny] = useState(false);
  const [syncNature, setSyncNature] = useState<string>("");
  const [considerDelay, setConsiderDelay] = useState(true);
  const [pelagoShift, setPelagoShift] = useState("0");
  const [category, setCategory] = useState<string>(DEFAULT_TEMPLATE.category);
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE.id);
  const [encounter, setEncounter] = useState<Gen7StationaryEncounter>(() =>
    gen7StationaryEncounterFromTemplate(DEFAULT_TEMPLATE),
  );
  const [delayText, setDelayText] = useState(String(DEFAULT_TEMPLATE.delay));
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shinyFilter, setShinyFilter] =
    useState<Gen7StationaryShinyFilter>("any");
  const [genderFilter, setGenderFilter] =
    useState<Gen7StationaryGenderFilter>("any");
  const [abilityFilter, setAbilityFilter] =
    useState<Gen7StationaryAbilityFilter>("any");
  const [blinkFilter, setBlinkFilter] =
    useState<Gen7StationaryBlinkFilter>("any");
  const [natureMask, setNatureMask] = useState(ALL_NATURES);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(ALL_HIDDEN_POWERS);
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
  const [results, setResults] = useState<Gen7StationaryResult[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen7StationaryProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen7StationarySummary>();
  const [sort, setSort] = useState<{
    key: SortKey | TimeSortKey;
    direction: SortDirection;
  }>({ key: "frame", direction: "asc" });
  const tableRef = useRef<HTMLDivElement>(null);

  const versionTemplates = useMemo(
    () =>
      GEN7_STATIONARY_TEMPLATES.filter((entry) =>
        supportsVersion(entry, version),
      ),
    [version],
  );
  const categories = useMemo(
    () => [...new Set(versionTemplates.map((entry) => entry.category))],
    [versionTemplates],
  );
  const categoryTemplates = useMemo(
    () => versionTemplates.filter((entry) => entry.category === category),
    [category, versionTemplates],
  );
  const selectedTemplate: Gen7StationaryTemplate =
    versionTemplates.find((entry) => entry.id === templateId) ??
    DEFAULT_TEMPLATE;
  const minimumDelay = Math.min(selectedTemplate.delay, 0);
  const natureOptions = useMemo(
    () =>
      GEN7_STATIONARY_NATURES[language].map((label, value) => ({
        label,
        value,
      })),
    [language],
  );
  const powerOptions = POWER_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const columns: readonly ResultColumn[] = [
    ...(timeFinderMode
      ? [
          { key: "epoch" as const, label: t("gen7TimeDate") },
          { key: "initialSeed" as const, label: t("gen7TimeInitialSeed") },
        ]
      : []),
    { key: "frame", label: t("gen7StationaryFrame") },
    { key: "realTimeFrames", label: t("gen7StationaryRealtime") },
    { key: "random", label: t("gen7RandomNumber") },
    { key: "ec", label: "EC" },
    { key: "pid", label: "PID" },
    ...IV_SORT_KEYS.map((key, index) => ({ key, label: IV_KEYS[index] })),
    { key: "nature", label: t("nature") },
    { key: "ability", label: t("ability") },
    { key: "gender", label: t("gender") },
    { key: "hiddenPower", label: t("hiddenPower") },
    { key: "shiny", label: t("shiny") },
    { key: "synchronize", label: t("gen7StationarySync") },
    { key: "blink", label: "Blink" },
    { key: "delay", label: t("delay") },
    { key: "psv", label: "PSV" },
    { key: "prv", label: "PRV" },
  ];
  const sortedResults = useMemo(
    () =>
      [...results].sort((left, right) => {
        const compared = compareValues(
          resultSortValue(left, sort.key),
          resultSortValue(right, sort.key),
        );
        return sort.direction === "asc" ? compared : -compared;
      }),
    [results, sort],
  );
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 14,
  });

  useEffect(
    () => () => {
      engine.dispose();
      timeEngine.dispose();
    },
    [engine, timeEngine],
  );

  const applyTemplate = (template: Gen7StationaryTemplate) => {
    setTemplateId(template.id);
    setEncounter(gen7StationaryEncounterFromTemplate(template));
    setDelayText(String(template.delay));
    if (!template.ultraWormhole) setForcedShiny(false);
    if (!template.pelago) setPelagoShift("0");
    if (!template.syncable || template.nature < 25) setSyncNature("");
    if (template.npc === 0 && blinkFilter === "safe") setBlinkFilter("any");
    if (template.npc !== 0 && blinkFilter === "blink") setBlinkFilter("any");
  };

  const changeVersion = (next: Gen7StationaryGameVersion) => {
    const template = GEN7_STATIONARY_TEMPLATES.find(
      (entry) => supportsVersion(entry, next) && entry.conceptual,
    )!;
    setVersion(next);
    setMinFrame(String(gen7StationaryStartingFrame(next)));
    setCategory(template.category);
    applyTemplate(template);
    if (next === "sun" || next === "moon") {
      setTick("036EC43B");
      setOffset("55");
    } else {
      setTick("041D9CB9");
      setOffset("55");
    }
  };

  useEffect(() => {
    if (!isThreeDsGen7Profile(profile)) return;
    changeVersion(profile.version);
    setTick(
      (profile.timeTick ?? 0x041d_9cb9)
        .toString(16)
        .toUpperCase()
        .padStart(8, "0"),
    );
    setOffset(String(profile.timeOffset ?? 55));
    setTsv(String(profile.tsv));
    setTrv(profile.trv.toString(16).toUpperCase());
    setShinyCharm(profile.shinyCharm);
    // Only a profile identity/update change may replace manually edited fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.updatedAt]);

  const changeCategory = (next: string) => {
    const template = versionTemplates.find((entry) => entry.category === next)!;
    setCategory(next);
    applyTemplate(template);
  };

  const changeNpc = (value: string) => {
    const npc = parseGen7StationaryDecimal(value);
    setEncounter((current) => ({ ...current, npc }));
    if (npc === 0 && blinkFilter === "safe") setBlinkFilter("any");
    if (npc !== 0 && blinkFilter === "blink") setBlinkFilter("any");
  };

  const updateIvText = (
    setter: Dispatch<SetStateAction<IvText>>,
    index: number,
    value: string,
  ) => {
    setter(
      (current) =>
        current.map((entry, itemIndex) =>
          itemIndex === index ? value : entry,
        ) as IvText,
    );
  };

  const readRequest = () => {
    const request: Gen7StationaryRequest = {
      version,
      seed: parseGen7StationaryHex(seed),
      minFrame: parseGen7StationaryDecimal(minFrame),
      maxFrame: parseGen7StationaryDecimal(maxFrame),
      tsv: parseGen7StationaryDecimal(tsv),
      trv: parseGen7StationaryHex(trv),
      shinyCharm,
      forcedShiny,
      syncNature:
        syncNature === "" ? null : parseGen7StationaryDecimal(syncNature),
      considerDelay,
      pelagoShift: parseGen7StationaryDecimal(pelagoShift),
      encounter: {
        ...encounter,
        delay: parseGen7StationarySignedDecimal(delayText),
      },
      filters: {
        disabled: filtersDisabled,
        shiny: shinyFilter,
        gender: genderFilter,
        ability: abilityFilter,
        natureMask,
        hiddenPowerMask,
        ivMin: tupleFromText(ivMin),
        ivMax: tupleFromText(ivMax),
        perfectIvValue: parseGen7StationaryDecimal(perfectIvValue),
        perfectIvCount: parseGen7StationaryDecimal(perfectIvCount),
        blink: blinkFilter,
      },
      resultLimit: 100_000,
    };
    return validateGen7StationaryRequest(request);
  };

  const readTimeRequest = (): Gen7StationaryTimeRequest => {
    const base = readRequest();
    const startEpoch = gen7StationaryTimeEpochFromInput(
      startDate,
      parseGen7StationaryDecimal(offset),
    );
    const endEpoch = gen7StationaryTimeEpochFromInput(
      endDate,
      parseGen7StationaryDecimal(offset),
    );
    if (typeof startEpoch !== "bigint" || typeof endEpoch !== "bigint")
      throw new TypeError("Invalid Time Finder date range.");
    const request: Gen7StationaryTimeRequest = {
      ...base,
      startEpoch,
      endEpoch,
      tick: parseGen7StationaryHex(tick),
      offset: parseGen7StationaryDecimal(offset),
    };
    return validateGen7StationaryTimeRequest(request);
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    let request: Gen7StationaryRequest | Gen7StationaryTimeRequest;
    try {
      request = timeFinderMode ? readTimeRequest() : readRequest();
    } catch {
      setError(t("invalidGen7StationaryInput"));
      setStatus("failed");
      return;
    }
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: timeFinderMode
        ? gen7StationaryTimeTaskCount(request as Gen7StationaryTimeRequest)
        : request.maxFrame - request.minFrame + 1,
      resultCount: 0,
      percent: 0,
    });
    setError("");
    setStatus("calculating");
    try {
      const next = timeFinderMode
        ? await timeEngine.search(request as Gen7StationaryTimeRequest, {
            onBatch: (batch) => setResults((current) => current.concat(batch)),
            onProgress: (value: Gen7StationaryTimeProgress) =>
              setProgress(value),
          })
        : await engine.search(request as Gen7StationaryRequest, {
            onBatch: (batch) => setResults((current) => current.concat(batch)),
            onProgress: setProgress,
          });
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const toggleSort = (key: SortKey | TimeSortKey) => {
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
  };

  const genderLabel = (gender: number) =>
    gender === 1 ? t("male") : gender === 2 ? t("female") : t("genderless");
  const abilityLabel = (ability: number) =>
    ability === 1
      ? t("abilityFirst")
      : ability === 2
        ? t("abilitySecond")
        : t("gen7StationaryHiddenAbility");
  const shinyLabel = (shiny: number) =>
    shiny === 2 ? t("shinySquare") : shiny === 1 ? t("shinyStar") : t("no");

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      columns.map((column) => column.label),
      ...sortedResults.map((result) => [
        ...(timeFinderMode
          ? [
              displayTimeEpoch(result, offset),
              result.initialSeed === undefined
                ? ""
                : formatGen7StationaryHex32(result.initialSeed),
            ]
          : []),
        result.frame,
        result.realTimeFrames,
        formatGen7StationaryHex64(result.random),
        formatGen7StationaryHex32(result.ec),
        formatGen7StationaryHex32(result.pid),
        ...result.ivs,
        GEN7_STATIONARY_NATURES[language][result.nature],
        abilityLabel(result.ability),
        genderLabel(result.gender),
        t(POWER_KEYS[result.hiddenPower]),
        shinyLabel(result.shiny),
        result.synchronize ? t("yes") : t("no"),
        result.blink,
        result.delay,
        result.psv,
        result.prv.toString(16).toUpperCase(),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => csvCell(value)).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen7stationary-${version}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
    setError("");
    setStatus("ready");
  };

  return (
    <div className="gen7stationary-panel">
      <div className="gen7stationary-workspace">
        <form className="panel gen7stationary-controls" onSubmit={run}>
          <div className="gen7stationary-control-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>
                {t(timeFinderMode ? "gen7TimeSetup" : "gen7StationarySetup")}
              </h2>
            </div>
            <span className="panel-note">
              {timeFinderMode ? "3DSTimeFinder / TF3" : "SFMT / Stationary7"}
            </span>
          </div>

          <section className="gen7stationary-control-section gen7stationary-rng-section">
            <h3>{t("rngInfo")}</h3>
            <div className="gen7stationary-field-grid">
              <label className="field">
                <span>{t("gen7GameVersion")}</span>
                <select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    changeVersion(
                      event.target.value as Gen7StationaryGameVersion,
                    )
                  }
                  value={version}
                >
                  <option value="sun">{t("gen7Sun")}</option>
                  <option value="moon">{t("gen7Moon")}</option>
                  <option value="ultra-sun">{t("gen7UltraSun")}</option>
                  <option value="ultra-moon">{t("gen7UltraMoon")}</option>
                </select>
              </label>
              {timeFinderMode ? (
                <>
                  <label className="field">
                    <span>{t("gen7TimeStart")}</span>
                    <input
                      disabled={status === "calculating"}
                      onChange={(event) => setStartDate(event.target.value)}
                      step={1}
                      type="datetime-local"
                      value={startDate}
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7TimeEnd")}</span>
                    <input
                      disabled={status === "calculating"}
                      onChange={(event) => setEndDate(event.target.value)}
                      step={1}
                      type="datetime-local"
                      value={endDate}
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7TimeTick")}</span>
                    <div className="prefixed-input">
                      <span>0x</span>
                      <input
                        disabled={status === "calculating"}
                        inputMode="text"
                        maxLength={8}
                        onChange={(event) =>
                          setTick(normalizeHexInput(event.target.value, 8))
                        }
                        value={tick}
                      />
                    </div>
                  </label>
                  <label className="field">
                    <span>{t("gen7TimeOffset")}</span>
                    <input
                      disabled={status === "calculating"}
                      inputMode="numeric"
                      max={0xffff_ffff}
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
                <label className="field">
                  <span>{t("seed")}</span>
                  <div className="prefixed-input">
                    <span>0x</span>
                    <input
                      disabled={status === "calculating"}
                      inputMode="text"
                      maxLength={8}
                      onChange={(event) =>
                        setSeed(normalizeHexInput(event.target.value, 8))
                      }
                      value={seed}
                    />
                  </div>
                </label>
              )}
              <label className="field">
                <span>{t("gen7StationaryMinFrame")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={GEN7_STATIONARY_MAX_FRAME}
                  onChange={(event) =>
                    setMinFrame(
                      normalizeDecimalInput(
                        event.target.value,
                        GEN7_STATIONARY_MAX_FRAME,
                        10,
                      ),
                    )
                  }
                  value={minFrame}
                />
              </label>
              <label className="field">
                <span>{t("gen7StationaryMaxFrame")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={GEN7_STATIONARY_MAX_FRAME}
                  onChange={(event) =>
                    setMaxFrame(
                      normalizeDecimalInput(
                        event.target.value,
                        GEN7_STATIONARY_MAX_FRAME,
                        10,
                      ),
                    )
                  }
                  value={maxFrame}
                />
              </label>
              <label className="field">
                <span>TSV</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={4095}
                  onChange={(event) =>
                    setTsv(normalizeDecimalInput(event.target.value, 4095, 4))
                  }
                  value={tsv}
                />
              </label>
              <label className="field">
                <span>TRV</span>
                <div className="prefixed-input">
                  <span>0x</span>
                  <input
                    disabled={status === "calculating"}
                    inputMode="text"
                    maxLength={1}
                    onChange={(event) =>
                      setTrv(normalizeHexInput(event.target.value, 1))
                    }
                    value={trv}
                  />
                </div>
              </label>
            </div>
          </section>

          <div className="gen7stationary-settings-column">
            <section className="gen7stationary-control-section">
              <h3>{t("pokemon")}</h3>
              <div className="gen7stationary-field-grid">
                <label className="field">
                  <span>{t("category")}</span>
                  <select
                    disabled={status === "calculating"}
                    onChange={(event) => changeCategory(event.target.value)}
                    value={category}
                  >
                    {categories.map((entry) => (
                      <option key={entry} value={entry}>
                        {categoryLabel(entry, t)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>{t("pokemon")}</span>
                  <select
                    disabled={status === "calculating"}
                    onChange={(event) => {
                      const template = categoryTemplates.find(
                        (entry) => entry.id === event.target.value,
                      );
                      if (template) applyTemplate(template);
                    }}
                    value={templateId}
                  >
                    {categoryTemplates.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {gen7StationaryTemplateName(entry, language)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="gen7stationary-encounter-meta">
                <span>
                  {t("species")} <strong>{encounter.species}</strong>
                </span>
                <span>
                  {t("level")} <strong>{encounter.level}</strong>
                </span>
                <span>
                  NPC <strong>{encounter.npc}</strong>
                </span>
                <span>
                  {t("delay")} <strong>{delayText || "-"}</strong>
                </span>
              </div>
              <div className="gen7stationary-field-grid compact">
                <label className="field">
                  <span>{t("gen7StationarySyncNature")}</span>
                  <select
                    disabled={
                      status === "calculating" ||
                      !encounter.syncable ||
                      encounter.nature < 25
                    }
                    onChange={(event) => setSyncNature(event.target.value)}
                    value={syncNature}
                  >
                    <option value="">{t("none")}</option>
                    {natureOptions.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>NPC</span>
                  <input
                    disabled={status === "calculating"}
                    inputMode="numeric"
                    max={100}
                    onChange={(event) =>
                      changeNpc(
                        normalizeDecimalInput(event.target.value, 100, 3),
                      )
                    }
                    value={encounter.npc}
                  />
                </label>
                <label className="field">
                  <span>{t("delay")}</span>
                  <input
                    disabled={status === "calculating"}
                    inputMode="numeric"
                    max={4000}
                    min={minimumDelay}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (/^-?\d*$/.test(value)) setDelayText(value);
                    }}
                    value={delayText}
                  />
                </label>
                {encounter.pelago && (
                  <label className="field">
                    <span>Poke Pelago Shift</span>
                    <input
                      disabled={status === "calculating"}
                      inputMode="numeric"
                      max={GEN7_STATIONARY_PELAGO_MAX_SHIFT}
                      onChange={(event) =>
                        setPelagoShift(
                          normalizeDecimalInput(
                            event.target.value,
                            GEN7_STATIONARY_PELAGO_MAX_SHIFT,
                            3,
                          ),
                        )
                      }
                      value={pelagoShift}
                    />
                  </label>
                )}
              </div>
              <div className="gen7stationary-toggle-grid">
                <label className="checkbox-field">
                  <input
                    checked={shinyCharm}
                    disabled={status === "calculating"}
                    onChange={(event) => setShinyCharm(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen7StationaryShinyCharm")}</span>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={considerDelay}
                    disabled={status === "calculating"}
                    onChange={(event) => setConsiderDelay(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Consider Delay</span>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={encounter.raining}
                    disabled={
                      status === "calculating" ||
                      (!encounter.conceptual && !selectedTemplate.raining)
                    }
                    onChange={(event) =>
                      setEncounter((current) => ({
                        ...current,
                        raining: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>Raining</span>
                </label>
                {encounter.ultraWormhole && (
                  <label className="checkbox-field">
                    <input
                      checked={forcedShiny}
                      disabled={status === "calculating"}
                      onChange={(event) => setForcedShiny(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Forced Shiny</span>
                  </label>
                )}
              </div>
            </section>

            {encounter.conceptual && (
              <details className="gen7stationary-disclosure">
                <summary>{t("gen7StationaryCustomEncounter")}</summary>
                <div className="gen7stationary-field-grid disclosure-content">
                  <label className="field">
                    <span>{t("species")}</span>
                    <input
                      disabled={status === "calculating"}
                      inputMode="numeric"
                      max={807}
                      onChange={(event) =>
                        setEncounter((current) => ({
                          ...current,
                          species: parseGen7StationaryDecimal(
                            normalizeDecimalInput(event.target.value, 807, 3),
                          ),
                        }))
                      }
                      value={encounter.species}
                    />
                  </label>
                  <label className="field">
                    <span>{t("level")}</span>
                    <input
                      disabled={status === "calculating"}
                      inputMode="numeric"
                      max={100}
                      onChange={(event) =>
                        setEncounter((current) => ({
                          ...current,
                          level: parseGen7StationaryDecimal(
                            normalizeDecimalInput(event.target.value, 100, 3),
                          ),
                        }))
                      }
                      value={encounter.level}
                    />
                  </label>
                  <label className="field">
                    <span>{t("gender")}</span>
                    <select
                      disabled={status === "calculating"}
                      onChange={(event) => {
                        const setting = Number(event.target.value);
                        setEncounter((current) => ({
                          ...current,
                          gender: setting,
                          randomGender: setting > 2,
                        }));
                      }}
                      value={encounter.gender}
                    >
                      {GEN7_STATIONARY_GENDER_RATIOS.map((entry) => (
                        <option key={entry.setting} value={entry.setting}>
                          {entry.setting === 0
                            ? t("genderless")
                            : entry.setting === 1
                              ? t("male")
                              : entry.setting === 2
                                ? t("female")
                                : entry.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("ability")}</span>
                    <select
                      disabled={status === "calculating"}
                      onChange={(event) =>
                        setEncounter((current) => ({
                          ...current,
                          ability: Number(event.target.value),
                        }))
                      }
                      value={encounter.ability}
                    >
                      <option value={0}>{t("any")}</option>
                      <option value={1}>{t("abilityFirst")}</option>
                      <option value={2}>{t("abilitySecond")}</option>
                      <option value={3}>
                        {t("gen7StationaryHiddenAbility")}
                      </option>
                    </select>
                  </label>
                </div>
                <div className="gen7stationary-toggle-grid disclosure-content">
                  <label className="checkbox-field">
                    <input
                      checked={encounter.fixedThreeIv}
                      disabled={status === "calculating"}
                      onChange={(event) =>
                        setEncounter((current) => ({
                          ...current,
                          fixedThreeIv: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>3 Perfect IVs</span>
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={encounter.alwaysSync}
                      disabled={status === "calculating"}
                      onChange={(event) =>
                        setEncounter((current) => ({
                          ...current,
                          alwaysSync: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>Always Synchronize</span>
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={encounter.shinyLocked}
                      disabled={status === "calculating"}
                      onChange={(event) =>
                        setEncounter((current) => ({
                          ...current,
                          shinyLocked: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>Shiny Lock</span>
                  </label>
                </div>
              </details>
            )}
          </div>

          <details
            className="gen7stationary-disclosure gen7stationary-filter-section"
            open
          >
            <summary>{t("filters")}</summary>
            <fieldset
              className="gen7stationary-filter-controls"
              disabled={filtersDisabled || status === "calculating"}
            >
              <div className="gen7stationary-field-grid disclosure-content">
                <label className="field">
                  <span>{t("shiny")}</span>
                  <select
                    onChange={(event) =>
                      setShinyFilter(
                        event.target.value as Gen7StationaryShinyFilter,
                      )
                    }
                    value={shinyFilter}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="shiny">{t("shinyAny")}</option>
                    <option value="square">{t("shinySquare")}</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("gender")}</span>
                  <select
                    onChange={(event) =>
                      setGenderFilter(
                        event.target.value as Gen7StationaryGenderFilter,
                      )
                    }
                    value={genderFilter}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="male">{t("male")}</option>
                    <option value="female">{t("female")}</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("ability")}</span>
                  <select
                    onChange={(event) =>
                      setAbilityFilter(
                        event.target.value as Gen7StationaryAbilityFilter,
                      )
                    }
                    value={abilityFilter}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="first">{t("abilityFirst")}</option>
                    <option value="second">{t("abilitySecond")}</option>
                    <option value="hidden">
                      {t("gen7StationaryHiddenAbility")}
                    </option>
                  </select>
                </label>
                <label className="field">
                  <span>Blink</span>
                  <select
                    onChange={(event) =>
                      setBlinkFilter(
                        event.target.value as Gen7StationaryBlinkFilter,
                      )
                    }
                    value={blinkFilter}
                  >
                    <option value="any">{t("any")}</option>
                    {encounter.npc === 0 && (
                      <option value="blink">Blink Frame</option>
                    )}
                    {encounter.npc !== 0 && (
                      <option value="safe">Safe Frame</option>
                    )}
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
                <label className="field">
                  <span>Perfect IV Value</span>
                  <input
                    inputMode="numeric"
                    max={31}
                    onChange={(event) =>
                      setPerfectIvValue(
                        normalizeDecimalInput(event.target.value, 31, 2),
                      )
                    }
                    value={perfectIvValue}
                  />
                </label>
                <label className="field">
                  <span>Perfect IV Count</span>
                  <input
                    inputMode="numeric"
                    max={6}
                    onChange={(event) =>
                      setPerfectIvCount(
                        normalizeDecimalInput(event.target.value, 6, 1),
                      )
                    }
                    value={perfectIvCount}
                  />
                </label>
              </div>
              <div className="gen7stationary-iv-filter">
                <div className="gen7stationary-iv-header">
                  <span>{t("ivs")}</span>
                  <span>{t("minimum")}</span>
                  <span>{t("maximum")}</span>
                </div>
                {IV_KEYS.map((key, index) => (
                  <div className="gen7stationary-iv-row" key={key}>
                    <span>{key}</span>
                    <input
                      aria-label={`${key} ${t("minimum")}`}
                      inputMode="numeric"
                      max={31}
                      onChange={(event) =>
                        updateIvText(
                          setIvMin,
                          index,
                          normalizeDecimalInput(event.target.value, 31, 2),
                        )
                      }
                      value={ivMin[index]}
                    />
                    <input
                      aria-label={`${key} ${t("maximum")}`}
                      inputMode="numeric"
                      max={31}
                      onChange={(event) =>
                        updateIvText(
                          setIvMax,
                          index,
                          normalizeDecimalInput(event.target.value, 31, 2),
                        )
                      }
                      value={ivMax[index]}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
            <label className="checkbox-field gen7stationary-disable-filter">
              <input
                checked={filtersDisabled}
                disabled={status === "calculating"}
                onChange={(event) => setFiltersDisabled(event.target.checked)}
                type="checkbox"
              />
              <span>{t("disableFilters")}</span>
            </label>
          </details>

          <div className="gen7stationary-run-actions">
            <button
              className="gen7stationary-primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={17} />
              {t(timeFinderMode ? "search" : "generate")}
            </button>
            <button
              aria-label={t("cancel")}
              className="gen7stationary-icon-button"
              disabled={status !== "calculating"}
              onClick={() => (timeFinderMode ? timeEngine : engine).cancel()}
              title={t("cancel")}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
            </button>
          </div>
        </form>

        <section className="panel gen7stationary-results">
          <div className="gen7stationary-results-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
              <span className={`run-status ${status}`}>{t(status)}</span>
            </div>
            <div className="gen7stationary-result-actions">
              <output>{results.length.toLocaleString()}</output>
              <button
                aria-label={t("exportCsv")}
                className="gen7stationary-icon-button"
                disabled={results.length === 0}
                onClick={exportCsv}
                title={t("exportCsv")}
                type="button"
              >
                <Download aria-hidden="true" size={17} />
              </button>
              <button
                aria-label={t("clear")}
                className="gen7stationary-icon-button"
                disabled={results.length === 0}
                onClick={clearResults}
                title={t("clear")}
                type="button"
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
          </div>
          <div className="progress-track" aria-label={`${progress.percent}%`}>
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <div className="metrics-row gen7stationary-metrics">
            <span>
              {t("gen7StationaryFrames")}{" "}
              <strong>{progress.processedStates.toLocaleString()}</strong>
            </span>
            <span>
              {t("results")}{" "}
              <strong>{progress.resultCount.toLocaleString()}</strong>
            </span>
            <span>
              {t("workers")} <strong>{summary?.workerCount ?? 1}</strong>
            </span>
            <span>
              {t("elapsed")}{" "}
              <strong>
                {summary ? `${summary.elapsedMs.toFixed(0)} ms` : "-"}
              </strong>
            </span>
          </div>
          {error && <div className="alert error">{error}</div>}
          {summary?.resultLimitReached && (
            <div className="alert warning">{t("limitReached")}</div>
          )}
          <div
            className="table-shell gen7stationary-table-shell"
            ref={tableRef}
          >
            {sortedResults.length === 0 ? (
              <div className="empty-state compact">
                <span>{t("emptyGen7Stationary")}</span>
              </div>
            ) : (
              <div
                className={`gen7stationary-virtual-table${
                  timeFinderMode ? " time-mode" : ""
                }`}
                style={{ height: `${virtualizer.getTotalSize() + 40}px` }}
              >
                <div className="gen7stationary-table-header">
                  {columns.map((column) => (
                    <button
                      aria-label={`${column.label} ${
                        sort.key === column.key
                          ? t(
                              sort.direction === "asc"
                                ? "sortedAscending"
                                : "sortedDescending",
                            )
                          : ""
                      }`}
                      key={column.key}
                      onClick={() => toggleSort(column.key)}
                      type="button"
                    >
                      {column.label}
                      {sort.key === column.key
                        ? sort.direction === "asc"
                          ? " +"
                          : " -"
                        : ""}
                    </button>
                  ))}
                </div>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const result = sortedResults[virtualRow.index];
                  return (
                    <div
                      className="gen7stationary-table-row"
                      key={`${result.frame}-${result.pid}-${virtualRow.index}`}
                      style={{
                        transform: `translateY(${virtualRow.start + 40}px)`,
                      }}
                    >
                      {timeFinderMode && (
                        <>
                          <span>{displayTimeEpoch(result, offset)}</span>
                          <span>
                            {result.initialSeed === undefined
                              ? ""
                              : formatGen7StationaryHex32(result.initialSeed)}
                          </span>
                        </>
                      )}
                      <span>{result.frame}</span>
                      <span>{result.realTimeFrames}</span>
                      <span>{formatGen7StationaryHex64(result.random)}</span>
                      <span>{formatGen7StationaryHex32(result.ec)}</span>
                      <span>{formatGen7StationaryHex32(result.pid)}</span>
                      {result.ivs.map((iv, index) => (
                        <span key={IV_KEYS[index]}>{iv}</span>
                      ))}
                      <span>
                        {GEN7_STATIONARY_NATURES[language][result.nature]}
                      </span>
                      <span>{abilityLabel(result.ability)}</span>
                      <span>{genderLabel(result.gender)}</span>
                      <span>{t(POWER_KEYS[result.hiddenPower])}</span>
                      <span>{shinyLabel(result.shiny)}</span>
                      <span>{result.synchronize ? t("yes") : t("no")}</span>
                      <span>{result.blink}</span>
                      <span>{result.delay}</span>
                      <span>{result.psv}</span>
                      <span>{result.prv.toString(16).toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
