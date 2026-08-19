import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, FileUp, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  isThreeDsGen7Profile,
  type ThreeDsProfile,
} from "../3dsprofiles/domain";
import {
  AutoCompleteComboBox,
  type AutoCompleteOption,
} from "../shared/AutoCompleteComboBox";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { GEN7_EVENT_NATURES } from "./data";
import {
  formatGen7EventHex32,
  gen7EventDefaultSettings,
  parseGen7EventDecimal,
  parseGen7EventHex,
  parseGen7WonderCard,
  validateGen7WonderCardForVersion,
  type Gen7EventGameVersion,
  type Gen7EventIvTuple,
  type Gen7EventLanguage,
  type Gen7EventPidType,
  type Gen7EventSettings,
} from "./domain";
import {
  formatGen7EventTimeEpoch,
  gen7EventTimeEpochFromInput,
  validateGen7EventTimeRequest,
  type Gen7EventTimeRequest,
  type Gen7EventTimeResult,
} from "./timeDomain";
import { Gen7EventTimeUiPreviewEngine } from "./preview/Gen7EventTimeUiPreviewEngine";
import type {
  Gen7EventTimeEngine,
  Gen7EventTimeProgress,
  Gen7EventTimeSummary,
} from "./timeSearch";
import { Gen7EventTimeWorker } from "./worker/Gen7EventTimeWorker";
import "./Gen7EventTimePanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
type SortKey =
  | "epoch"
  | "initialSeed"
  | "frame"
  | "pid"
  | "ec"
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
  | "shiny";

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

function CandidateSelect<T extends string | number>({
  disabled,
  label,
  onValueChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onValueChange: (value: T) => void;
  options: readonly AutoCompleteOption<T>[];
  value: T;
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "";
  const [inputValue, setInputValue] = useState(selectedLabel);
  return (
    <AutoCompleteComboBox
      disabled={disabled}
      inputValue={inputValue}
      label={label}
      onInputChange={setInputValue}
      onValueChange={(nextValue) => {
        onValueChange(nextValue);
        setInputValue(
          options.find((option) => option.value === nextValue)?.label ?? "",
        );
      }}
      options={options}
      value={value}
    />
  );
}

function tupleFromText(values: IvText): Gen7EventIvTuple {
  return values.map(parseGen7EventDecimal) as Gen7EventIvTuple;
}

function compareValues(left: unknown, right: unknown) {
  if (typeof left === "bigint" && typeof right === "bigint")
    return left < right ? -1 : left > right ? 1 : 0;
  return Number(left) - Number(right);
}

function resultSortValue(result: Gen7EventTimeResult, key: SortKey) {
  const ivIndex = IV_SORT_KEYS.indexOf(key as (typeof IV_SORT_KEYS)[number]);
  if (ivIndex !== -1) return result.ivs[ivIndex];
  return result[key as keyof Gen7EventTimeResult];
}

function csvCell(value: string | number | bigint) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen7EventTimePanel({
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
  const engine = useMemo<Gen7EventTimeEngine>(
    () =>
      uiPreviewMode
        ? new Gen7EventTimeUiPreviewEngine()
        : new Gen7EventTimeWorker(),
    [uiPreviewMode],
  );
  const [version, setVersion] = useState<Gen7EventGameVersion>("ultra-sun");
  const [startDate, setStartDate] = useState("2024-01-01T00:00:00");
  const [endDate, setEndDate] = useState("2024-01-01T00:01:00");
  const [tick, setTick] = useState("041D9CB9");
  const [offset, setOffset] = useState("55");
  const [minFrame, setMinFrame] = useState("478");
  const [maxFrame, setMaxFrame] = useState("10000");
  const [profileTid, setProfileTid] = useState("0");
  const [profileSid, setProfileSid] = useState("0");
  const [event, setEvent] = useState<Gen7EventSettings>(() => ({
    ...gen7EventDefaultSettings("ultra-sun"),
    abilityLocked: false,
  }));
  const [fixedIvs, setFixedIvs] = useState<IvText>([
    "0",
    "0",
    "0",
    "0",
    "0",
    "0",
  ]);
  const [fixedLocked, setFixedLocked] = useState([
    false,
    false,
    false,
    false,
    false,
    false,
  ]);
  const [pidType, setPidType] = useState<Gen7EventPidType>("random");
  const [tidText, setTidText] = useState("");
  const [sidText, setSidText] = useState("");
  const [ecText, setEcText] = useState("");
  const [pidText, setPidText] = useState("");
  const [randomPerfectIvCount, setRandomPerfectIvCount] = useState("0");
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shinyFilter, setShinyFilter] = useState<"any" | "shiny" | "square">(
    "any",
  );
  const [genderFilter, setGenderFilter] = useState<"any" | "male" | "female">(
    "any",
  );
  const [abilityFilter, setAbilityFilter] = useState<
    "any" | "first" | "second" | "hidden"
  >("any");
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
  const [results, setResults] = useState<Gen7EventTimeResult[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen7EventTimeProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen7EventTimeSummary>();
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "epoch", direction: "asc" },
  );
  const tableRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const natureOptions = useMemo(
    () =>
      GEN7_EVENT_NATURES[language].map((label, value) => ({ label, value })),
    [language],
  );
  const powerOptions = POWER_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const versionValues: readonly Gen7EventGameVersion[] = [
    "sun",
    "moon",
    "ultra-sun",
    "ultra-moon",
  ];
  const versionOptions = versionValues.map((value) => ({
    value,
    label: t(
      value === "sun"
        ? "gen7Sun"
        : value === "moon"
          ? "gen7Moon"
          : value === "ultra-sun"
            ? "gen7UltraSun"
            : "gen7UltraMoon",
    ),
  }));
  const pidValues: readonly Gen7EventPidType[] = [
    "random",
    "nonshiny",
    "shiny",
    "specified",
  ];
  const pidOptions = pidValues.map((value) => ({
    value,
    label: t(
      value === "random"
        ? "gen7EventPidRandom"
        : value === "nonshiny"
          ? "gen7EventPidNonshiny"
          : value === "shiny"
            ? "gen7EventPidShiny"
            : "gen7EventPidSpecified",
    ),
  }));
  const lockedAbilityOptions = [
    { value: 0, label: t("abilityFirst") },
    { value: 1, label: t("abilitySecond") },
    { value: 2, label: t("gen7StationaryHiddenAbility") },
  ];
  const randomAbilityOptions = [
    { value: 0, label: "1/2" },
    { value: 1, label: "1/2/H" },
  ];
  const genderOptions = [
    { value: 0, label: t("male") },
    { value: 1, label: t("female") },
    { value: 2, label: t("genderless") },
  ];
  const shinyFilterOptions = [
    { value: "any", label: t("any") },
    { value: "shiny", label: t("shinyAny") },
    { value: "square", label: t("shinySquare") },
  ] as const;
  const genderFilterOptions = [
    { value: "any", label: t("any") },
    { value: "male", label: t("male") },
    { value: "female", label: t("female") },
  ] as const;
  const abilityFilterOptions = [
    { value: "any", label: t("any") },
    { value: "first", label: t("abilityFirst") },
    { value: "second", label: t("abilitySecond") },
    { value: "hidden", label: t("gen7StationaryHiddenAbility") },
  ] as const;
  const columns = [
    { key: "epoch" as const, label: t("gen7TimeDate") },
    { key: "initialSeed" as const, label: t("gen7TimeInitialSeed") },
    { key: "frame" as const, label: t("gen7StationaryFrame") },
    { key: "pid" as const, label: "PID" },
    { key: "ec" as const, label: "EC" },
    { key: "shiny" as const, label: t("shiny") },
    ...IV_SORT_KEYS.map((key, index) => ({ key, label: IV_KEYS[index] })),
    { key: "nature" as const, label: t("nature") },
    { key: "hiddenPower" as const, label: t("hiddenPower") },
    { key: "gender" as const, label: t("gender") },
    { key: "ability" as const, label: t("ability") },
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
  useEffect(() => {
    if (!isThreeDsGen7Profile(profile)) return;
    setVersion(profile.version);
    setProfileTid(String((profile.tsv << 4) | profile.trv));
    setProfileSid("0");
  }, [profile]);

  const setIv = (setter: typeof setFixedIvs, index: number, value: string) =>
    setter(
      (current) =>
        current.map((entry, itemIndex) =>
          itemIndex === index ? value : entry,
        ) as IvText,
    );
  const readRequest = (): Gen7EventTimeRequest => {
    const parsedOffset = parseGen7EventDecimal(offset);
    const startEpoch = gen7EventTimeEpochFromInput(startDate, parsedOffset);
    const endEpoch = gen7EventTimeEpochFromInput(endDate, parsedOffset);
    if (typeof startEpoch !== "bigint" || typeof endEpoch !== "bigint")
      throw new TypeError("Invalid date.");
    const request: Gen7EventTimeRequest = {
      version,
      startEpoch,
      endEpoch,
      tick: parseGen7EventHex(tick),
      offset: parseGen7EventDecimal(offset),
      minFrame: parseGen7EventDecimal(minFrame),
      maxFrame: parseGen7EventDecimal(maxFrame),
      profileTid: parseGen7EventDecimal(profileTid),
      profileSid: parseGen7EventDecimal(profileSid),
      event: {
        ...event,
        pidType,
        fixedIvs: fixedIvs.map((value, index) =>
          fixedLocked[index] ? parseGen7EventDecimal(value) : -1,
        ) as Gen7EventIvTuple,
        randomPerfectIvCount: parseGen7EventDecimal(randomPerfectIvCount),
        tid: parseGen7EventDecimal(tidText),
        sid: parseGen7EventDecimal(sidText),
        ec: parseGen7EventHex(ecText),
        pid: parseGen7EventHex(pidText),
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
      },
      resultLimit: 100_000,
    };
    return validateGen7EventTimeRequest(request);
  };

  const run = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (status === "calculating") return;
    let request: Gen7EventTimeRequest;
    try {
      request = readRequest();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("invalidGen7EventInput"),
      );
      setStatus("failed");
      return;
    }
    setResults([]);
    setSummary(undefined);
    setError("");
    setStatus("calculating");
    setProgress({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
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

  const importWonderCard = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = validateGen7WonderCardForVersion(
        version,
        parseGen7WonderCard(
          file.name,
          new Uint8Array(await file.arrayBuffer()),
        ),
      );
      setEvent((current) => ({
        ...current,
        ...parsed,
        ability: parsed.abilityLocked
          ? Math.max(0, parsed.ability - 1)
          : parsed.ability,
        gender: parsed.genderLocked ? (parsed.gender + 2) % 3 : parsed.gender,
      }));
      setPidType(parsed.pidType);
      setTidText(parsed.tid ? String(parsed.tid) : "");
      setSidText(parsed.sid ? String(parsed.sid) : "");
      setEcText(parsed.ec ? formatGen7EventHex32(parsed.ec) : "");
      setPidText(parsed.pid ? formatGen7EventHex32(parsed.pid) : "");
      setRandomPerfectIvCount(String(parsed.randomPerfectIvCount));
      setFixedLocked(parsed.fixedIvs.map((value) => value >= 0));
      setFixedIvs(
        parsed.fixedIvs.map((value) => String(Math.max(0, value))) as IvText,
      );
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
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
  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
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
    if (!sortedResults.length) return;
    const rows = [
      columns.map((column) => column.label),
      ...sortedResults.map((result) => [
        formatGen7EventTimeEpoch(result.epoch, parseGen7EventDecimal(offset)),
        formatGen7EventHex32(result.initialSeed),
        result.frame,
        formatGen7EventHex32(result.pid),
        formatGen7EventHex32(result.ec),
        shinyLabel(result.shiny),
        ...result.ivs,
        GEN7_EVENT_NATURES[language][result.nature],
        t(POWER_KEYS[result.hiddenPower]),
        genderLabel(result.gender),
        abilityLabel(result.ability),
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
    anchor.download = `pokerngkit-gen7event-time-${version}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const eventDisabled = status === "calculating";
  return (
    <div className="gen7event-time-panel">
      <div className="gen7event-time-workspace">
        <form className="gen7event-time-controls" onSubmit={run}>
          <div className="gen7event-time-parameter-grid">
            <section className="panel gen7event-time-column">
              <div className="gen7event-time-column-heading">
                <h2>{t("rngInfo")}</h2>
              </div>
              <div className="gen7event-time-section">
                <div className="gen7event-time-grid">
                  <label className="field">
                    <span>{t("gen7GameVersion")}</span>
                    <CandidateSelect<Gen7EventGameVersion>
                      key={`${language}-${version}`}
                      disabled={eventDisabled}
                      label={t("gen7GameVersion")}
                      onValueChange={setVersion}
                      options={versionOptions}
                      value={version}
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7TimeStart")}</span>
                    <input
                      disabled={eventDisabled}
                      onChange={(event) => setStartDate(event.target.value)}
                      step={1}
                      type="datetime-local"
                      value={startDate}
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7TimeEnd")}</span>
                    <input
                      disabled={eventDisabled}
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
                        disabled={eventDisabled}
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
                      disabled={eventDisabled}
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
                  <label className="field">
                    <span>{t("gen7StationaryMinFrame")}</span>
                    <input
                      disabled={eventDisabled}
                      max={5_000_000}
                      min={1}
                      onChange={(event) =>
                        setMinFrame(
                          normalizeDecimalInput(
                            event.target.value,
                            5_000_000,
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
                      disabled={eventDisabled}
                      max={5_000_000}
                      onChange={(event) =>
                        setMaxFrame(
                          normalizeDecimalInput(
                            event.target.value,
                            5_000_000,
                            10,
                          ),
                        )
                      }
                      value={maxFrame}
                    />
                  </label>
                </div>
              </div>
            </section>
            <section className="panel gen7event-time-column">
              <div className="gen7event-time-column-heading">
                <h2>{t("gen7EventSetup")}</h2>
                <button
                  className="gen7event-time-import"
                  onClick={() => fileRef.current?.click()}
                  type="button"
                >
                  <FileUp aria-hidden="true" size={16} />
                  {t("gen7EventImport")}
                </button>
                <input
                  accept=".wc7,.wc7full"
                  hidden
                  onChange={(event) =>
                    void importWonderCard(event.target.files?.[0])
                  }
                  ref={fileRef}
                  type="file"
                />
              </div>
              <div className="gen7event-time-section">
                <div className="gen7event-time-grid">
                  <label className="field">
                    <span>{t("gen7EventPidType")}</span>
                    <CandidateSelect<Gen7EventPidType>
                      key={`${language}-${pidType}`}
                      disabled={eventDisabled}
                      label={t("gen7EventPidType")}
                      onValueChange={setPidType}
                      options={pidOptions}
                      value={pidType}
                    />
                  </label>
                  <label className="field">
                    <span>TID</span>
                    <input
                      disabled={eventDisabled || event.yourId}
                      max={65535}
                      onChange={(e) =>
                        setTidText(
                          normalizeDecimalInput(e.target.value, 65535, 5),
                        )
                      }
                      value={tidText}
                    />
                  </label>
                  <label className="field">
                    <span>SID</span>
                    <input
                      disabled={eventDisabled || event.yourId}
                      max={65535}
                      onChange={(e) =>
                        setSidText(
                          normalizeDecimalInput(e.target.value, 65535, 5),
                        )
                      }
                      value={sidText}
                    />
                  </label>
                  <label className="field">
                    <span>Profile TID</span>
                    <input
                      disabled={eventDisabled}
                      max={65535}
                      onChange={(e) =>
                        setProfileTid(
                          normalizeDecimalInput(e.target.value, 65535, 5),
                        )
                      }
                      value={profileTid}
                    />
                  </label>
                  <label className="field">
                    <span>Profile SID</span>
                    <input
                      disabled={eventDisabled}
                      max={65535}
                      onChange={(e) =>
                        setProfileSid(
                          normalizeDecimalInput(e.target.value, 65535, 5),
                        )
                      }
                      value={profileSid}
                    />
                  </label>
                  <label className="field">
                    <span>EC</span>
                    <div className="prefixed-input">
                      <span>0x</span>
                      <input
                        disabled={eventDisabled}
                        maxLength={8}
                        onChange={(e) =>
                          setEcText(normalizeHexInput(e.target.value, 8))
                        }
                        value={ecText}
                      />
                    </div>
                  </label>
                  <label className="field">
                    <span>PID</span>
                    <div className="prefixed-input">
                      <span>0x</span>
                      <input
                        disabled={eventDisabled || pidType !== "specified"}
                        maxLength={8}
                        onChange={(e) =>
                          setPidText(normalizeHexInput(e.target.value, 8))
                        }
                        value={pidText}
                      />
                    </div>
                  </label>
                </div>
                <div className="gen7event-time-toggle-grid">
                  <label className="checkbox-field">
                    <input
                      checked={event.yourId}
                      disabled={eventDisabled}
                      onChange={(e) =>
                        setEvent((current) => ({
                          ...current,
                          yourId: e.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{t("gen7EventYourId")}</span>
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={event.isEgg}
                      disabled={eventDisabled}
                      onChange={(e) =>
                        setEvent((current) => ({
                          ...current,
                          isEgg: e.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{t("gen7EventEgg")}</span>
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={event.otherInfo}
                      disabled={eventDisabled}
                      onChange={(e) =>
                        setEvent((current) => ({
                          ...current,
                          otherInfo: e.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{t("gen7EventOtherInfo")}</span>
                  </label>
                </div>
              </div>
              <div className="gen7event-time-section gen7event-time-settings">
                <h3>{t("gen7EventFixedIvs")}</h3>
                <div className="gen7event-time-fixed-grid">
                  {IV_KEYS.map((key, index) => (
                    <label className="checkbox-field" key={key}>
                      <input
                        checked={fixedLocked[index]}
                        disabled={eventDisabled}
                        onChange={(e) =>
                          setFixedLocked((current) =>
                            current.map((value, itemIndex) =>
                              itemIndex === index ? e.target.checked : value,
                            ),
                          )
                        }
                        type="checkbox"
                      />
                      <span>{key}</span>
                      <input
                        disabled={eventDisabled || !fixedLocked[index]}
                        max={31}
                        onChange={(e) =>
                          setIv(
                            setFixedIvs,
                            index,
                            normalizeDecimalInput(e.target.value, 31, 2),
                          )
                        }
                        value={fixedIvs[index]}
                      />
                    </label>
                  ))}
                </div>
                <label className="field compact-field">
                  <span>{t("gen7EventRandomPerfectIvs")}</span>
                  <input
                    disabled={eventDisabled}
                    max={6}
                    onChange={(e) =>
                      setRandomPerfectIvCount(
                        normalizeDecimalInput(e.target.value, 99, 2),
                      )
                    }
                    value={randomPerfectIvCount}
                  />
                </label>
                <div className="gen7event-time-lock-grid">
                  <label className="checkbox-field">
                    <input
                      checked={event.abilityLocked}
                      disabled={eventDisabled}
                      onChange={(e) =>
                        setEvent((current) => ({
                          ...current,
                          abilityLocked: e.target.checked,
                          ability: e.target.checked
                            ? current.ability
                            : Math.min(current.ability, 1),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{t("gen7EventAbilityLocked")}</span>
                    <CandidateSelect
                      disabled={eventDisabled}
                      label={t("gen7EventAbilityLocked")}
                      onValueChange={(value) =>
                        setEvent((current) => ({ ...current, ability: value }))
                      }
                      options={
                        event.abilityLocked
                          ? lockedAbilityOptions
                          : randomAbilityOptions
                      }
                      value={event.ability}
                    />
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={event.natureLocked}
                      disabled={eventDisabled}
                      onChange={(e) =>
                        setEvent((current) => ({
                          ...current,
                          natureLocked: e.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{t("gen7EventNatureLocked")}</span>
                    <CandidateSelect
                      disabled={eventDisabled || !event.natureLocked}
                      label={t("gen7EventNatureLocked")}
                      onValueChange={(value) =>
                        setEvent((current) => ({ ...current, nature: value }))
                      }
                      options={natureOptions}
                      value={event.nature}
                    />
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={event.genderLocked}
                      disabled={eventDisabled}
                      onChange={(e) =>
                        setEvent((current) => ({
                          ...current,
                          genderLocked: e.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{t("gen7EventGenderLocked")}</span>
                    <CandidateSelect
                      disabled={eventDisabled || !event.genderLocked}
                      label={t("gen7EventGenderLocked")}
                      onValueChange={(value) =>
                        setEvent((current) => ({ ...current, gender: value }))
                      }
                      options={genderOptions}
                      value={event.gender}
                    />
                  </label>
                </div>
              </div>
            </section>
            <section className="panel gen7event-time-column gen7event-time-filter-column">
              <div className="gen7event-time-column-heading">
                <h2>{t("filters")}</h2>
              </div>
              <div className="gen7event-time-section">
                <fieldset disabled={filtersDisabled || eventDisabled}>
                  <div className="gen7event-time-grid">
                    <label className="field">
                      <span>{t("shiny")}</span>
                      <CandidateSelect
                        label={t("shiny")}
                        onValueChange={setShinyFilter}
                        options={shinyFilterOptions}
                        value={shinyFilter}
                      />
                    </label>
                    <label className="field">
                      <span>{t("gender")}</span>
                      <CandidateSelect
                        label={t("gender")}
                        onValueChange={setGenderFilter}
                        options={genderFilterOptions}
                        value={genderFilter}
                      />
                    </label>
                    <label className="field">
                      <span>{t("ability")}</span>
                      <CandidateSelect
                        label={t("ability")}
                        onValueChange={setAbilityFilter}
                        options={abilityFilterOptions}
                        value={abilityFilter}
                      />
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
                  </div>
                  <div className="gen7event-time-iv-filter">
                    <div>
                      <span>{t("ivs")}</span>
                      <span>{t("minimum")}</span>
                      <span>{t("maximum")}</span>
                    </div>
                    {IV_KEYS.map((key, index) => (
                      <div key={key}>
                        <span>{key}</span>
                        <input
                          max={31}
                          onChange={(e) =>
                            setIv(
                              setIvMin,
                              index,
                              normalizeDecimalInput(e.target.value, 31, 2),
                            )
                          }
                          value={ivMin[index]}
                        />
                        <input
                          max={31}
                          onChange={(e) =>
                            setIv(
                              setIvMax,
                              index,
                              normalizeDecimalInput(e.target.value, 31, 2),
                            )
                          }
                          value={ivMax[index]}
                        />
                      </div>
                    ))}
                  </div>
                  <label className="checkbox-field gen7event-time-disable-filter">
                    <input
                      checked={filtersDisabled}
                      disabled={eventDisabled}
                      onChange={(e) => setFiltersDisabled(e.target.checked)}
                      type="checkbox"
                    />
                    <span>{t("disableFilters")}</span>
                  </label>
                </fieldset>
              </div>
            </section>
          </div>
          <div className="gen7event-time-actions">
            <button
              className="gen7event-time-primary"
              disabled={eventDisabled}
              type="submit"
            >
              <Play aria-hidden="true" size={17} />
              {t("search")}
            </button>
            <button
              aria-label={t("cancel")}
              className="gen7event-time-icon"
              disabled={!eventDisabled}
              onClick={() => engine.cancel()}
              title={t("cancel")}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
            </button>
          </div>
        </form>
        <section className="panel gen7event-time-results">
          <div className="gen7event-time-results-heading">
            <div>
              <h2>{t("results")}</h2>
              <span className={`run-status ${status}`}>{t(status)}</span>
            </div>
            <div className="gen7event-time-result-actions">
              <output>{results.length.toLocaleString()}</output>
              <button
                aria-label={t("exportCsv")}
                className="gen7event-time-icon"
                disabled={!results.length}
                onClick={exportCsv}
                title={t("exportCsv")}
                type="button"
              >
                <Download aria-hidden="true" size={17} />
              </button>
              <button
                aria-label={t("clear")}
                className="gen7event-time-icon"
                disabled={!results.length}
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
          <div className="metrics-row gen7event-time-metrics">
            <span>
              {t("gen7StationaryFrames")}{" "}
              <strong>{progress.processedStates.toLocaleString()}</strong>
            </span>
            <span>
              {t("results")}{" "}
              <strong>{progress.resultCount.toLocaleString()}</strong>
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
            className="table-shell gen7event-time-table-shell"
            ref={tableRef}
          >
            {!sortedResults.length ? (
              <div className="empty-state">
                <strong>{t("emptyGen7Event")}</strong>
              </div>
            ) : (
              <div
                className="gen7event-time-table"
                style={{ height: `${virtualizer.getTotalSize() + 44}px` }}
              >
                <div className="gen7event-time-table-header">
                  {columns.map((column) => (
                    <button
                      aria-label={column.label}
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
                    formatGen7EventTimeEpoch(
                      result.epoch,
                      parseGen7EventDecimal(offset),
                    ),
                    formatGen7EventHex32(result.initialSeed),
                    result.frame,
                    formatGen7EventHex32(result.pid),
                    formatGen7EventHex32(result.ec),
                    shinyLabel(result.shiny),
                    ...result.ivs,
                    GEN7_EVENT_NATURES[language][result.nature],
                    t(POWER_KEYS[result.hiddenPower]),
                    genderLabel(result.gender),
                    abilityLabel(result.ability),
                  ];
                  return (
                    <div
                      className="gen7event-time-table-row"
                      key={`${result.epoch}-${result.frame}-${virtualRow.index}`}
                      style={{
                        transform: `translateY(${virtualRow.start + 44}px)`,
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
