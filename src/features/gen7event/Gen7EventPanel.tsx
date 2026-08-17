import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, FileUp, Play, Square, Trash2 } from "lucide-react";
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
import { GEN7_EVENT_NATURES, GEN7_EVENT_SPECIES } from "./data";
import {
  formatGen7EventHex32,
  formatGen7EventHex64,
  GEN7_EVENT_MAX_FRAME,
  gen7EventDefaultDelay,
  gen7EventDefaultSettings,
  gen7EventFormCount,
  gen7EventMaximumSpecies,
  gen7EventNoDexEligible,
  gen7EventStartingFrame,
  parseGen7EventDecimal,
  parseGen7EventHex,
  parseGen7WonderCard,
  validateGen7EventRequest,
  validateGen7WonderCardForVersion,
  type Gen7EventAbilityFilter,
  type Gen7EventBlinkFilter,
  type Gen7EventGameVersion,
  type Gen7EventGenderFilter,
  type Gen7EventIvTuple,
  type Gen7EventLanguage,
  type Gen7EventPidType,
  type Gen7EventRequest,
  type Gen7EventResult,
  type Gen7EventSettings,
  type Gen7EventShinyFilter,
} from "./domain";
import { Gen7EventUiPreviewEngine } from "./preview/Gen7EventUiPreviewEngine";
import type {
  Gen7EventEngine,
  Gen7EventProgress,
  Gen7EventSummary,
} from "./search";
import { Gen7EventWorker } from "./worker/Gen7EventWorker";
import "./Gen7EventPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
type IvLocked = [boolean, boolean, boolean, boolean, boolean, boolean];
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
  | "blink"
  | "delay"
  | "psv"
  | "prv";

interface ResultColumn {
  key: SortKey;
  label: string;
}

const TABLE_HEADER_HEIGHT = 44;
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

function tupleFromText(values: IvText): Gen7EventIvTuple {
  return values.map(parseGen7EventDecimal) as Gen7EventIvTuple;
}

function fixedTuple(values: IvText, locked: IvLocked): Gen7EventIvTuple {
  return values.map((value, index) =>
    locked[index] ? parseGen7EventDecimal(value) : -1,
  ) as Gen7EventIvTuple;
}

function resultSortValue(result: Gen7EventResult, key: SortKey) {
  const ivIndex = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
  if (ivIndex !== -1) return result.ivs[ivIndex];
  return result[key as keyof Gen7EventResult];
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === "bigint" && typeof right === "bigint")
    return left < right ? -1 : left > right ? 1 : 0;
  return Number(left) - Number(right);
}

function csvCell(value: string | number | bigint) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen7EventPanel({
  profile,
  uiPreviewMode,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const language: Gen7EventLanguage =
    i18n.resolvedLanguage === "ja"
      ? "ja"
      : i18n.resolvedLanguage === "zh"
        ? "zh"
        : "en";
  const engine = useMemo<Gen7EventEngine>(
    () =>
      uiPreviewMode ? new Gen7EventUiPreviewEngine() : new Gen7EventWorker(),
    [uiPreviewMode],
  );
  const [version, setVersion] = useState<Gen7EventGameVersion>("ultra-sun");
  const [seed, setSeed] = useState("0");
  const [minFrame, setMinFrame] = useState("478");
  const [maxFrame, setMaxFrame] = useState("50000");
  const [tsv, setTsv] = useState("0");
  const [trv, setTrv] = useState("0");
  const [npc, setNpc] = useState("0");
  const [delay, setDelay] = useState("0");
  const [considerDelay, setConsiderDelay] = useState(true);
  const [settings, setSettings] = useState<Gen7EventSettings>(() =>
    gen7EventDefaultSettings("ultra-sun"),
  );
  const [level, setLevel] = useState("0");
  const [randomPerfectIvCount, setRandomPerfectIvCount] = useState("0");
  const [fixedIvLocked, setFixedIvLocked] = useState<IvLocked>([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  const [fixedIvs, setFixedIvs] = useState<IvText>([
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
  ]);
  const [tid, setTid] = useState("0");
  const [sid, setSid] = useState("0");
  const [ec, setEc] = useState("0");
  const [pid, setPid] = useState("0");
  const [cardName, setCardName] = useState("");
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shinyFilter, setShinyFilter] = useState<Gen7EventShinyFilter>("any");
  const [genderFilter, setGenderFilter] =
    useState<Gen7EventGenderFilter>("any");
  const [abilityFilter, setAbilityFilter] =
    useState<Gen7EventAbilityFilter>("any");
  const [blinkFilter, setBlinkFilter] = useState<Gen7EventBlinkFilter>("any");
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
  const [results, setResults] = useState<Gen7EventResult[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen7EventProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen7EventSummary>();
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "frame",
    direction: "asc",
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const maximumSpecies = gen7EventMaximumSpecies(version);
  const formCount = gen7EventFormCount(settings.species);
  const noDexAvailable = gen7EventNoDexEligible(version, settings.species);
  const natureOptions = useMemo(
    () =>
      GEN7_EVENT_NATURES[language].map((label, value) => ({ label, value })),
    [language],
  );
  const powerOptions = POWER_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const columns: readonly ResultColumn[] = [
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

  useEffect(() => () => engine.dispose(), [engine]);

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

  const updateDefaultDelay = (
    nextVersion: Gen7EventGameVersion,
    nextSettings: Gen7EventSettings,
  ) => {
    setDelay(String(gen7EventDefaultDelay(nextVersion, nextSettings)));
  };

  const changeVersion = (next: Gen7EventGameVersion) => {
    let nextSettings = settings;
    if (settings.species > gen7EventMaximumSpecies(next)) {
      nextSettings = gen7EventDefaultSettings(next);
      setSettings(nextSettings);
      setLevel("0");
      setRandomPerfectIvCount("0");
      setFixedIvLocked([false, false, false, false, false, false]);
    } else if (!gen7EventNoDexEligible(next, settings.species)) {
      nextSettings = { ...settings, noDexEntry: false };
      setSettings(nextSettings);
    }
    setVersion(next);
    setMinFrame(String(gen7EventStartingFrame(next)));
    updateDefaultDelay(next, nextSettings);
  };

  useEffect(() => {
    if (!isThreeDsGen7Profile(profile)) return;
    changeVersion(profile.version);
    setTsv(String(profile.tsv));
    setTrv(profile.trv.toString(16).toUpperCase());
    // Only a profile identity/update change may replace manually edited fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.updatedAt]);

  const changeSpecies = (species: number) => {
    const defaults = gen7EventDefaultSettings(version, species);
    const next = {
      ...settings,
      species,
      form: 0,
      noDexEntry: false,
      randomPerfectIvCount: defaults.randomPerfectIvCount,
    };
    setSettings(next);
    setRandomPerfectIvCount(String(defaults.randomPerfectIvCount));
    updateDefaultDelay(version, next);
  };

  const changeEventFlag = (
    key: "yourId" | "isEgg" | "noDexEntry",
    value: boolean,
  ) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    updateDefaultDelay(version, next);
  };

  const applyWonderCard = (event: Gen7EventSettings, name: string) => {
    setSettings(event);
    setLevel(String(event.level));
    setRandomPerfectIvCount(String(event.randomPerfectIvCount));
    setFixedIvLocked(event.fixedIvs.map((value) => value >= 0) as IvLocked);
    setFixedIvs(
      event.fixedIvs.map((value) => String(Math.max(0, value))) as IvText,
    );
    setTid(String(event.tid));
    setSid(String(event.sid));
    setEc(formatGen7EventHex32(event.ec));
    setPid(formatGen7EventHex32(event.pid));
    setCardName(name);
    updateDefaultDelay(version, event);
  };

  const importWonderCard = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = parseGen7WonderCard(
        file.name,
        new Uint8Array(await file.arrayBuffer()),
      );
      applyWonderCard(
        validateGen7WonderCardForVersion(version, parsed),
        file.name,
      );
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const readRequest = () => {
    const event: Gen7EventSettings = {
      ...settings,
      level: parseGen7EventDecimal(level),
      fixedIvs: fixedTuple(fixedIvs, fixedIvLocked),
      randomPerfectIvCount: parseGen7EventDecimal(randomPerfectIvCount),
      tid: parseGen7EventDecimal(tid),
      sid: parseGen7EventDecimal(sid),
      ec: parseGen7EventHex(ec),
      pid: parseGen7EventHex(pid),
    };
    const request: Gen7EventRequest = {
      version,
      seed: parseGen7EventHex(seed),
      minFrame: parseGen7EventDecimal(minFrame),
      maxFrame: parseGen7EventDecimal(maxFrame),
      tsv: parseGen7EventDecimal(tsv),
      trv: parseGen7EventHex(trv),
      npc: parseGen7EventDecimal(npc),
      delay: parseGen7EventDecimal(delay),
      considerDelay,
      event,
      filters: {
        disabled: filtersDisabled,
        shiny: shinyFilter,
        gender: genderFilter,
        ability: abilityFilter,
        natureMask,
        hiddenPowerMask,
        ivMin: tupleFromText(ivMin),
        ivMax: tupleFromText(ivMax),
        perfectIvValue: parseGen7EventDecimal(perfectIvValue),
        perfectIvCount: parseGen7EventDecimal(perfectIvCount),
        blink: blinkFilter,
      },
      resultLimit: 100_000,
    };
    return validateGen7EventRequest(request);
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    let request: Gen7EventRequest;
    try {
      request = readRequest();
    } catch {
      setError(t("invalidGen7EventInput"));
      setStatus("failed");
      return;
    }
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: request.maxFrame - request.minFrame + 1,
      resultCount: 0,
      percent: 0,
    });
    setError("");
    setStatus("calculating");
    try {
      const next = await engine.search(request, {
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

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
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
        result.frame,
        result.realTimeFrames,
        formatGen7EventHex64(result.random),
        formatGen7EventHex32(result.ec),
        formatGen7EventHex32(result.pid),
        ...result.ivs,
        GEN7_EVENT_NATURES[language][result.nature],
        abilityLabel(result.ability),
        genderLabel(result.gender),
        t(POWER_KEYS[result.hiddenPower]),
        shinyLabel(result.shiny),
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
    anchor.download = `pokerngkit-gen7event-${version}.csv`;
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
    <div className="gen7event-panel">
      <div className="gen7event-workspace">
        <form className="panel gen7event-controls" onSubmit={run}>
          <div className="gen7event-control-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("gen7EventSetup")}</h2>
            </div>
            <span className="panel-note">SFMT / Event7</span>
          </div>

          <section className="gen7event-control-section">
            <h3>{t("rngInfo")}</h3>
            <div className="gen7event-field-grid">
              <label className="field">
                <span>{t("gen7GameVersion")}</span>
                <select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    changeVersion(event.target.value as Gen7EventGameVersion)
                  }
                  value={version}
                >
                  <option value="sun">{t("gen7Sun")}</option>
                  <option value="moon">{t("gen7Moon")}</option>
                  <option value="ultra-sun">{t("gen7UltraSun")}</option>
                  <option value="ultra-moon">{t("gen7UltraMoon")}</option>
                </select>
              </label>
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
              <label className="field">
                <span>{t("gen7StationaryMinFrame")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={GEN7_EVENT_MAX_FRAME}
                  min={gen7EventStartingFrame(version)}
                  onChange={(event) =>
                    setMinFrame(
                      normalizeDecimalInput(
                        event.target.value,
                        GEN7_EVENT_MAX_FRAME,
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
                  max={GEN7_EVENT_MAX_FRAME}
                  onChange={(event) =>
                    setMaxFrame(
                      normalizeDecimalInput(
                        event.target.value,
                        GEN7_EVENT_MAX_FRAME,
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
                  disabled={status === "calculating" || !settings.yourId}
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
                    disabled={status === "calculating" || !settings.yourId}
                    inputMode="text"
                    maxLength={1}
                    onChange={(event) =>
                      setTrv(normalizeHexInput(event.target.value, 1))
                    }
                    value={trv}
                  />
                </div>
              </label>
              <label className="field">
                <span>NPC</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={100}
                  onChange={(event) => {
                    const value = normalizeDecimalInput(
                      event.target.value,
                      100,
                      3,
                    );
                    setNpc(value);
                    if (
                      parseGen7EventDecimal(value) === 0 &&
                      blinkFilter === "safe"
                    )
                      setBlinkFilter("any");
                    if (
                      parseGen7EventDecimal(value) !== 0 &&
                      blinkFilter === "blink"
                    )
                      setBlinkFilter("any");
                  }}
                  value={npc}
                />
              </label>
              <label className="field">
                <span>{t("delay")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={4000}
                  onChange={(event) =>
                    setDelay(normalizeDecimalInput(event.target.value, 4000, 4))
                  }
                  value={delay}
                />
              </label>
            </div>
            <label className="checkbox-field gen7event-inline-toggle">
              <input
                checked={considerDelay}
                disabled={status === "calculating"}
                onChange={(event) => setConsiderDelay(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen7EventConsiderDelay")}</span>
            </label>
          </section>

          <section className="gen7event-control-section">
            <div className="gen7event-section-title">
              <h3>{t("gen7EventSetup")}</h3>
              <input
                accept=".wc7,.wc7full"
                hidden
                onChange={(event) =>
                  void importWonderCard(event.target.files?.[0])
                }
                ref={fileRef}
                type="file"
              />
              <button
                className="gen7event-import-button"
                disabled={status === "calculating"}
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                <FileUp aria-hidden="true" size={16} />
                {t("gen7EventImport")}
              </button>
            </div>
            {cardName && <div className="gen7event-card-name">{cardName}</div>}
            <div className="gen7event-field-grid">
              <label className="field gen7event-span-two">
                <span>{t("species")}</span>
                <select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    changeSpecies(Number(event.target.value))
                  }
                  value={settings.species}
                >
                  {GEN7_EVENT_SPECIES[language]
                    .slice(0, maximumSpecies + 1)
                    .map((label, species) => (
                      <option key={species} value={species}>
                        {species === 0
                          ? "-"
                          : `${species.toString().padStart(3, "0")} ${label}`}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                <span>{t("form")}</span>
                <select
                  disabled={status === "calculating" || formCount <= 1}
                  onChange={(event) => {
                    const next = {
                      ...settings,
                      form: Number(event.target.value),
                    };
                    setSettings(next);
                    setRandomPerfectIvCount(
                      String(
                        gen7EventDefaultSettings(
                          version,
                          next.species,
                          next.form,
                        ).randomPerfectIvCount,
                      ),
                    );
                  }}
                  value={settings.form}
                >
                  {Array.from({ length: formCount }, (_, index) => (
                    <option key={index} value={index}>
                      {index}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("level")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={100}
                  onChange={(event) =>
                    setLevel(normalizeDecimalInput(event.target.value, 100, 3))
                  }
                  value={level}
                />
              </label>
              <label className="field">
                <span>{t("gen7EventPidType")}</span>
                <select
                  disabled={status === "calculating"}
                  onChange={(event) => {
                    const pidType = event.target.value as Gen7EventPidType;
                    setSettings((current) => ({
                      ...current,
                      pidType,
                    }));
                    if (!settings.otherInfo)
                      setEc(pidType === "specified" ? "12" : "0");
                  }}
                  value={settings.pidType}
                >
                  <option value="random">{t("gen7EventPidRandom")}</option>
                  <option value="nonshiny">{t("gen7EventPidNonshiny")}</option>
                  <option value="shiny">{t("gen7EventPidShiny")}</option>
                  <option value="specified">
                    {t("gen7EventPidSpecified")}
                  </option>
                </select>
              </label>
              <label className="field">
                <span>{t("gen7EventRandomPerfectIvs")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={5}
                  onChange={(event) =>
                    setRandomPerfectIvCount(
                      normalizeDecimalInput(event.target.value, 5, 1),
                    )
                  }
                  value={randomPerfectIvCount}
                />
              </label>
            </div>

            <div className="gen7event-lock-grid">
              <label className="gen7event-lock-field">
                <span className="checkbox-field">
                  <input
                    checked={settings.abilityLocked}
                    disabled={status === "calculating"}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        abilityLocked: event.target.checked,
                        ability: 0,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{t("gen7EventAbilityLocked")}</span>
                </span>
                <select
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      ability: Number(event.target.value),
                    }))
                  }
                  value={settings.ability}
                >
                  {settings.abilityLocked ? (
                    <>
                      <option value={0}>-</option>
                      <option value={1}>{t("abilityFirst")}</option>
                      <option value={2}>{t("abilitySecond")}</option>
                      <option value={3}>
                        {t("gen7StationaryHiddenAbility")}
                      </option>
                    </>
                  ) : (
                    <>
                      <option value={0}>1/2</option>
                      <option value={1}>1/2/H</option>
                    </>
                  )}
                </select>
              </label>
              <label className="gen7event-lock-field">
                <span className="checkbox-field">
                  <input
                    checked={settings.natureLocked}
                    disabled={status === "calculating"}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        natureLocked: event.target.checked,
                        nature: event.target.checked ? current.nature : 0,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{t("gen7EventNatureLocked")}</span>
                </span>
                <select
                  disabled={status === "calculating" || !settings.natureLocked}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      nature: Number(event.target.value),
                    }))
                  }
                  value={settings.nature}
                >
                  {natureOptions.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="gen7event-lock-field">
                <span className="checkbox-field">
                  <input
                    checked={settings.genderLocked}
                    disabled={status === "calculating"}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        genderLocked: event.target.checked,
                        gender: event.target.checked ? current.gender : 0,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>{t("gen7EventGenderLocked")}</span>
                </span>
                <select
                  disabled={status === "calculating" || !settings.genderLocked}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      gender: Number(event.target.value),
                    }))
                  }
                  value={settings.gender}
                >
                  <option value={0}>{t("genderless")}</option>
                  <option value={1}>{t("male")}</option>
                  <option value={2}>{t("female")}</option>
                </select>
              </label>
            </div>

            <div className="gen7event-toggle-grid">
              <label className="checkbox-field">
                <input
                  checked={settings.yourId}
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    changeEventFlag("yourId", event.target.checked)
                  }
                  type="checkbox"
                />
                <span>{t("gen7EventYourId")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={settings.isEgg}
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    changeEventFlag("isEgg", event.target.checked)
                  }
                  type="checkbox"
                />
                <span>{t("gen7EventEgg")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={settings.noDexEntry}
                  disabled={status === "calculating" || !noDexAvailable}
                  onChange={(event) =>
                    changeEventFlag("noDexEntry", event.target.checked)
                  }
                  type="checkbox"
                />
                <span>{t("gen7EventNoDex")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={settings.otherInfo}
                  disabled={status === "calculating"}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      otherInfo: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>{t("gen7EventOtherInfo")}</span>
              </label>
            </div>
          </section>

          <details className="gen7event-disclosure" open>
            <summary>{t("gen7EventFixedIvs")}</summary>
            <div className="gen7event-fixed-iv-grid">
              {IV_KEYS.map((key, index) => (
                <label key={key}>
                  <span className="checkbox-field">
                    <input
                      checked={fixedIvLocked[index]}
                      disabled={status === "calculating"}
                      onChange={(event) =>
                        setFixedIvLocked(
                          (current) =>
                            current.map((entry, itemIndex) =>
                              itemIndex === index
                                ? event.target.checked
                                : entry,
                            ) as IvLocked,
                        )
                      }
                      type="checkbox"
                    />
                    <span>{key}</span>
                  </span>
                  <input
                    aria-label={`${key} ${t("gen7EventFixedIvs")}`}
                    disabled={status === "calculating" || !fixedIvLocked[index]}
                    inputMode="numeric"
                    max={31}
                    onChange={(event) =>
                      updateIvText(
                        setFixedIvs,
                        index,
                        normalizeDecimalInput(event.target.value, 31, 2),
                      )
                    }
                    value={fixedIvs[index]}
                  />
                </label>
              ))}
            </div>
          </details>

          <details className="gen7event-disclosure">
            <summary>{t("gen7EventOtherInfo")}</summary>
            <fieldset
              disabled={!settings.otherInfo || status === "calculating"}
            >
              <div className="gen7event-field-grid disclosure-content">
                <label className="field">
                  <span>TID</span>
                  <input
                    disabled={settings.yourId}
                    inputMode="numeric"
                    max={65535}
                    onChange={(event) =>
                      setTid(
                        normalizeDecimalInput(event.target.value, 65535, 5),
                      )
                    }
                    value={tid}
                  />
                </label>
                <label className="field">
                  <span>SID</span>
                  <input
                    disabled={settings.yourId}
                    inputMode="numeric"
                    max={65535}
                    onChange={(event) =>
                      setSid(
                        normalizeDecimalInput(event.target.value, 65535, 5),
                      )
                    }
                    value={sid}
                  />
                </label>
                <label className="field">
                  <span>EC</span>
                  <div className="prefixed-input">
                    <span>0x</span>
                    <input
                      inputMode="text"
                      maxLength={8}
                      onChange={(event) =>
                        setEc(normalizeHexInput(event.target.value, 8))
                      }
                      value={ec}
                    />
                  </div>
                </label>
                <label className="field">
                  <span>PID</span>
                  <div className="prefixed-input">
                    <span>0x</span>
                    <input
                      disabled={
                        settings.yourId || settings.pidType !== "specified"
                      }
                      inputMode="text"
                      maxLength={8}
                      onChange={(event) =>
                        setPid(normalizeHexInput(event.target.value, 8))
                      }
                      value={pid}
                    />
                  </div>
                </label>
              </div>
            </fieldset>
          </details>

          <details className="gen7event-disclosure" open>
            <summary>{t("filters")}</summary>
            <fieldset
              className="gen7event-filter-controls"
              disabled={filtersDisabled || status === "calculating"}
            >
              <div className="gen7event-field-grid disclosure-content">
                <label className="field">
                  <span>{t("shiny")}</span>
                  <select
                    onChange={(event) =>
                      setShinyFilter(event.target.value as Gen7EventShinyFilter)
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
                        event.target.value as Gen7EventGenderFilter,
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
                        event.target.value as Gen7EventAbilityFilter,
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
                      setBlinkFilter(event.target.value as Gen7EventBlinkFilter)
                    }
                    value={blinkFilter}
                  >
                    <option value="any">{t("any")}</option>
                    {parseGen7EventDecimal(npc) === 0 && (
                      <option value="blink">Blink Frame</option>
                    )}
                    {parseGen7EventDecimal(npc) !== 0 && (
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
              <div className="gen7event-iv-filter">
                <div className="gen7event-iv-header">
                  <span>{t("ivs")}</span>
                  <span>{t("minimum")}</span>
                  <span>{t("maximum")}</span>
                </div>
                {IV_KEYS.map((key, index) => (
                  <div className="gen7event-iv-row" key={key}>
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
            <label className="checkbox-field gen7event-disable-filter">
              <input
                checked={filtersDisabled}
                disabled={status === "calculating"}
                onChange={(event) => setFiltersDisabled(event.target.checked)}
                type="checkbox"
              />
              <span>{t("disableFilters")}</span>
            </label>
          </details>

          <div className="gen7event-run-actions">
            <button
              className="gen7event-primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={17} />
              {t("generate")}
            </button>
            <button
              aria-label={t("cancel")}
              className="gen7event-icon-button"
              disabled={status !== "calculating"}
              onClick={() => engine.cancel()}
              title={t("cancel")}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
            </button>
          </div>
        </form>

        <section className="panel gen7event-results">
          <div className="gen7event-results-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
              <span className={`run-status ${status}`}>{t(status)}</span>
            </div>
            <div className="gen7event-result-actions">
              <output>{results.length.toLocaleString()}</output>
              <button
                aria-label={t("exportCsv")}
                className="gen7event-icon-button"
                disabled={results.length === 0}
                onClick={exportCsv}
                title={t("exportCsv")}
                type="button"
              >
                <Download aria-hidden="true" size={17} />
              </button>
              <button
                aria-label={t("clear")}
                className="gen7event-icon-button"
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
          <div className="metrics-row gen7event-metrics">
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
          <div className="table-shell gen7event-table-shell" ref={tableRef}>
            {sortedResults.length === 0 ? (
              <div className="empty-state">
                <strong>{t("emptyGen7Event")}</strong>
              </div>
            ) : (
              <div
                className="gen7event-virtual-table"
                style={{
                  height: `${virtualizer.getTotalSize() + TABLE_HEADER_HEIGHT}px`,
                }}
              >
                <div className="gen7event-table-header">
                  {columns.map((column) => (
                    <button
                      aria-label={`${column.label} ${sort.key === column.key ? sort.direction : ""}`}
                      key={column.key}
                      onClick={() => toggleSort(column.key)}
                      type="button"
                    >
                      {column.label}
                      {sort.key === column.key
                        ? sort.direction === "asc"
                          ? " ^"
                          : " v"
                        : ""}
                    </button>
                  ))}
                </div>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const result = sortedResults[virtualRow.index];
                  const cells = [
                    result.frame,
                    result.realTimeFrames,
                    formatGen7EventHex64(result.random),
                    formatGen7EventHex32(result.ec),
                    formatGen7EventHex32(result.pid),
                    ...result.ivs,
                    GEN7_EVENT_NATURES[language][result.nature],
                    abilityLabel(result.ability),
                    genderLabel(result.gender),
                    t(POWER_KEYS[result.hiddenPower]),
                    shinyLabel(result.shiny),
                    result.blink,
                    result.delay,
                    result.psv,
                    result.prv.toString(16).toUpperCase(),
                  ];
                  return (
                    <div
                      className="gen7event-table-row"
                      key={`${result.frame}-${virtualRow.index}`}
                      style={{
                        transform: `translateY(${virtualRow.start + TABLE_HEADER_HEIGHT}px)`,
                      }}
                    >
                      {cells.map((cell, index) => (
                        <span key={columns[index].key}>{cell}</span>
                      ))}
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
