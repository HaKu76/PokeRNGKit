import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Download,
  LocateFixed,
  Play,
  RotateCcw,
  SkipForward,
  Square,
  Trash2,
  Zap,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  formatThreeDsProfileSeed,
  isThreeDsGen7Profile,
  type ThreeDsProfile,
} from "../3dsprofiles/domain";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { GEN7_WILD_NATURES } from "../gen7wild/data";
import {
  formatGen7EggHex32,
  formatGen7EggState,
  getGen7EggResultStateUpdate,
  GEN7_EGG_MAX_EGGS,
  GEN7_EGG_MAX_FRAME,
  GEN7_EGG_MAX_RESULTS,
  GEN7_EGG_MAX_SHORTEST_PATH_FRAME,
  parseGen7EggDecimal,
  parseGen7EggHex,
  parseGen7EggTsvList,
  validateGen7EggExecutionRequest,
  type Gen7EggAbilityFilter,
  type Gen7EggGenderFilter,
  type Gen7EggGenderRatio,
  type Gen7EggItem,
  type Gen7EggIvTuple,
  type Gen7EggMode,
  type Gen7EggParent,
  type Gen7EggParentFilter,
  type Gen7EggRequest,
  type Gen7EggResult,
  type Gen7EggShinyFilter,
  type Gen7EggState,
} from "./domain";
import { Gen7EggUiPreviewEngine } from "./preview/Gen7EggUiPreviewEngine";
import type { Gen7EggEngine, Gen7EggProgress, Gen7EggSummary } from "./search";
import { Gen7EggWorker } from "./worker/Gen7EggWorker";
import "./Gen7EggPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
type StateText = [string, string, string, string];
type SortKey =
  | "frame"
  | "eggNumber"
  | "random"
  | "ec"
  | "pid"
  | "nature"
  | "ability"
  | "gender"
  | "hiddenPower"
  | "framesUsed"
  | "psv"
  | "prv";

const IV_KEYS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
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
const EMPTY_PROGRESS: Gen7EggProgress = {
  processedStates: 0,
  totalStates: 0,
  resultCount: 0,
  percent: 0,
};

const ITEM_OPTIONS: readonly { value: Gen7EggItem; key: string }[] = [
  { value: "none", key: "gen7EggItemNone" },
  { value: "everstone", key: "gen7EggItemEverstone" },
  { value: "destiny-knot", key: "gen7EggItemDestinyKnot" },
  { value: "power-hp", key: "gen7EggItemPowerHp" },
  { value: "power-attack", key: "gen7EggItemPowerAttack" },
  { value: "power-defense", key: "gen7EggItemPowerDefense" },
  { value: "power-special-attack", key: "gen7EggItemPowerSpecialAttack" },
  { value: "power-special-defense", key: "gen7EggItemPowerSpecialDefense" },
  { value: "power-speed", key: "gen7EggItemPowerSpeed" },
];
const GENDER_RATIOS: readonly { value: Gen7EggGenderRatio; key: string }[] = [
  { value: "genderless", key: "gen7EggRatioGenderless" },
  { value: "one-to-one", key: "gen7EggRatioOneOne" },
  { value: "seven-to-one", key: "gen7EggRatioSevenOne" },
  { value: "three-to-one", key: "gen7EggRatioThreeOne" },
  { value: "one-to-three", key: "gen7EggRatioOneThree" },
  { value: "one-to-seven", key: "gen7EggRatioOneSeven" },
  { value: "male-only", key: "gen7EggRatioMaleOnly" },
  { value: "female-only", key: "gen7EggRatioFemaleOnly" },
];

function defaultParent(): Gen7EggParent {
  return {
    ivs: [31, 31, 31, 31, 31, 31],
    item: "none",
    ability: 0,
    ditto: false,
  };
}

function tuple(values: IvText): Gen7EggIvTuple {
  return values.map(parseGen7EggDecimal) as Gen7EggIvTuple;
}

function parentWithIvs(parent: Gen7EggParent, ivs: IvText): Gen7EggParent {
  return { ...parent, ivs: tuple(ivs) };
}

function compare(left: number, right: number) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function csvCell(value: string | number | boolean) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen7EggPanel({
  profile,
  uiPreviewMode,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const language =
    i18n.resolvedLanguage === "ja"
      ? "ja"
      : i18n.resolvedLanguage === "zh"
        ? "zh"
        : "en";
  const engine = useMemo<Gen7EggEngine>(
    () => (uiPreviewMode ? new Gen7EggUiPreviewEngine() : new Gen7EggWorker()),
    [uiPreviewMode],
  );
  const [mode, setMode] = useState<Gen7EggMode>("frames");
  const [stateText, setStateText] = useState<StateText>([
    "00000000",
    "00000000",
    "00000000",
    "00000000",
  ]);
  const [minFrame, setMinFrame] = useState("0");
  const [maxFrame, setMaxFrame] = useState("50000");
  const [minEgg, setMinEgg] = useState("1");
  const [maxEgg, setMaxEgg] = useState("500");
  const [targetFrame, setTargetFrame] = useState("5000");
  const [tsv, setTsv] = useState("0");
  const [trv, setTrv] = useState("0");
  const [male, setMale] = useState<Gen7EggParent>(defaultParent);
  const [female, setFemale] = useState<Gen7EggParent>(defaultParent);
  const [maleIvs, setMaleIvs] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [femaleIvs, setFemaleIvs] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [genderRatio, setGenderRatio] =
    useState<Gen7EggGenderRatio>("one-to-one");
  const [shinyCharm, setShinyCharm] = useState(false);
  const [masudaMethod, setMasudaMethod] = useState(false);
  const [nidoType, setNidoType] = useState(false);
  const [homogeneous, setHomogeneous] = useState(false);
  const [considerOtherTsv, setConsiderOtherTsv] = useState(false);
  const [otherTsvs, setOtherTsvs] = useState("");
  const [shinyReminder, setShinyReminder] = useState(false);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shinyFilter, setShinyFilter] = useState<Gen7EggShinyFilter>("any");
  const [genderFilter, setGenderFilter] = useState<Gen7EggGenderFilter>("any");
  const [abilityFilter, setAbilityFilter] =
    useState<Gen7EggAbilityFilter>("any");
  const [ballFilter, setBallFilter] = useState<Gen7EggParentFilter>("any");
  const [natureInheritanceFilter, setNatureInheritanceFilter] =
    useState<Gen7EggParentFilter>("any");
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
  const [results, setResults] = useState<Gen7EggResult[]>([]);
  const [progress, setProgress] = useState<Gen7EggProgress>(EMPTY_PROGRESS);
  const [summary, setSummary] = useState<Gen7EggSummary>();
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    {
      key: "frame",
      direction: "asc",
    },
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasPidRerolls = shinyCharm || masudaMethod;
  const hasEverstone = male.item === "everstone" || female.item === "everstone";

  useEffect(() => {
    if (!isThreeDsGen7Profile(profile)) return;
    setStateText(profile.seeds.map(formatThreeDsProfileSeed) as StateText);
    setTsv(String(profile.tsv));
    setTrv(profile.trv.toString(16).toUpperCase());
    setShinyCharm(profile.shinyCharm);
  }, [profile]);

  useEffect(() => () => engine.dispose(), [engine]);

  const natureOptions = useMemo(
    () => GEN7_WILD_NATURES[language].map((label, value) => ({ label, value })),
    [language],
  );
  const hiddenPowerOptions = useMemo(
    () => POWER_KEYS.map((key, value) => ({ label: t(key), value })),
    [t],
  );
  const sortedResults = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...results].sort((left, right) => {
      const leftValue = left[sort.key];
      const rightValue = right[sort.key];
      return compare(Number(leftValue), Number(rightValue)) * direction;
    });
  }, [results, sort]);
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const updateStateWord = (index: number, value: string) => {
    setStateText((current) => {
      const next = [...current] as StateText;
      next[index] = normalizeHexInput(value, 8).padStart(8, "0");
      return next;
    });
  };

  const changeMode = (next: Gen7EggMode) => {
    setMode(next);
    if (next !== "frames") setShinyReminder(false);
  };

  const changeGenderRatio = (next: Gen7EggGenderRatio) => {
    setGenderRatio(next);
    setNidoType(false);
    if (next === "genderless" || next === "male-only") {
      setMale((current) => ({ ...current, ditto: false }));
      setFemale((current) => ({ ...current, ditto: true }));
      setHomogeneous(false);
    } else if (next === "female-only") {
      setMale((current) => ({ ...current, ditto: false }));
      setFemale((current) => ({ ...current, ditto: false }));
      setHomogeneous(false);
    } else {
      setMale((current) => ({ ...current, ditto: false }));
      setFemale((current) => ({ ...current, ditto: false }));
    }
  };

  const changeDitto = (parent: "male" | "female", checked: boolean) => {
    if (parent === "male") {
      setMale((current) => ({ ...current, ditto: checked }));
      if (checked) setFemale((current) => ({ ...current, ditto: false }));
    } else {
      setFemale((current) => ({ ...current, ditto: checked }));
      if (checked) setMale((current) => ({ ...current, ditto: false }));
    }
    if (checked) setHomogeneous(false);
  };

  const resetParents = () => {
    setMale(defaultParent());
    setFemale(defaultParent());
    setMaleIvs(["31", "31", "31", "31", "31", "31"]);
    setFemaleIvs(["31", "31", "31", "31", "31", "31"]);
    setGenderRatio("one-to-one");
    setMasudaMethod(false);
    setNidoType(false);
    setHomogeneous(false);
  };

  const applyFastMode = () => {
    resetParents();
    setFemaleIvs(["0", "0", "0", "0", "0", "0"]);
    setMale((current) => ({ ...current, item: "destiny-knot" }));
    setMasudaMethod(true);
    setHomogeneous(true);
  };

  const readRequest = (): Gen7EggRequest => {
    const state = stateText.map(parseGen7EggHex) as Gen7EggState;
    const effectiveOtherTsv = hasPidRerolls && considerOtherTsv;
    const base = {
      state,
      tsv: parseGen7EggDecimal(tsv),
      trv: parseGen7EggHex(trv),
      male: parentWithIvs(male, maleIvs),
      female: parentWithIvs(female, femaleIvs),
      genderRatio,
      shinyCharm,
      masudaMethod,
      nidoType,
      homogeneous,
      considerOtherTsv: effectiveOtherTsv,
      otherTsvs: effectiveOtherTsv ? parseGen7EggTsvList(otherTsvs) : [],
      shinyReminder: mode === "frames" && hasPidRerolls && shinyReminder,
      filters: {
        disabled: mode === "shortest-path" ? false : filtersDisabled,
        shiny:
          effectiveOtherTsv && shinyFilter === "any" ? "shiny" : shinyFilter,
        gender: genderFilter,
        ability: abilityFilter,
        natureMask: hasEverstone ? ALL_NATURES : natureMask,
        hiddenPowerMask,
        ivMin: tuple(ivMin),
        ivMax: tuple(ivMax),
        perfectIvValue: parseGen7EggDecimal(perfectIvValue),
        perfectIvCount: parseGen7EggDecimal(perfectIvCount),
        ball: ballFilter,
        natureInheritance: hasEverstone ? natureInheritanceFilter : "any",
      },
      resultLimit: GEN7_EGG_MAX_RESULTS,
    } as const;
    const request: Gen7EggRequest =
      mode === "frames"
        ? {
            ...base,
            mode,
            minFrame: parseGen7EggDecimal(minFrame),
            maxFrame: parseGen7EggDecimal(maxFrame),
          }
        : mode === "egg-list"
          ? {
              ...base,
              mode,
              minEgg: parseGen7EggDecimal(minEgg),
              maxEgg: parseGen7EggDecimal(maxEgg),
              targetFrame: parseGen7EggDecimal(targetFrame),
            }
          : {
              ...base,
              mode,
              targetFrame: parseGen7EggDecimal(targetFrame),
            };
    return validateGen7EggExecutionRequest(request);
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    let request: Gen7EggRequest;
    try {
      request = readRequest();
    } catch {
      setStatus("failed");
      setError(
        mode === "shortest-path" &&
          parseGen7EggDecimal(targetFrame) > GEN7_EGG_MAX_SHORTEST_PATH_FRAME
          ? t("gen7EggShortestPathLimit", {
              max: GEN7_EGG_MAX_SHORTEST_PATH_FRAME.toLocaleString(language),
            })
          : t("invalidGen7EggInput"),
      );
      return;
    }
    setResults([]);
    setSummary(undefined);
    setError("");
    setStatus("calculating");
    setProgress({
      processedStates: 0,
      totalStates:
        request.mode === "frames"
          ? request.maxFrame - request.minFrame + 1
          : request.mode === "egg-list"
            ? request.maxEgg
            : request.targetFrame + 1,
      resultCount: 0,
      percent: 0,
    });
    try {
      const nextSummary = await engine.search(request, {
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

  const stop = () => engine.cancel();
  const clearResults = () => {
    setResults([]);
    setSummary(undefined);
    setProgress(EMPTY_PROGRESS);
    setStatus("ready");
    setError("");
  };

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const sortLabel = (key: SortKey) =>
    sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "";

  const setStateFromResult = (result: Gen7EggResult, after: boolean) => {
    const next = getGen7EggResultStateUpdate(
      result,
      parseGen7EggDecimal(targetFrame),
      after,
    );
    setStateText(next.state.map(formatGen7EggHex32) as StateText);
    setTargetFrame(String(next.targetFrame));
  };

  const parentLabel = (parent: Gen7EggParentFilter) =>
    parent === "male"
      ? t("gen7EggMaleParent")
      : parent === "female"
        ? t("gen7EggFemaleParent")
        : "-";

  const actionLabel = (result: Gen7EggResult) =>
    result.action === "accept"
      ? t("gen7EggAccept")
      : result.action === "reject"
        ? t("gen7EggReject")
        : "-";

  const instruction = useMemo(() => {
    if (!summary || mode === "frames") return "";
    if (!summary.targetFound) return t("gen7EggRangeTooSmall");
    const accept = t("gen7EggAcceptCount", { count: summary.acceptedEggs });
    if (summary.rejectedEggs === 0) return accept;
    return `${accept}${t(
      mode === "shortest-path"
        ? "gen7EggRejectCountPath"
        : "gen7EggRejectCountThen",
      { count: summary.rejectedEggs },
    )}`;
  }, [mode, summary, t]);

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      [
        t("gen7EggState"),
        t("gen7EggFrame"),
        t("gen7EggEggNumber"),
        t("gen7EggAction"),
        t("gen7EggRandom"),
        "EC",
        "PID",
        ...IV_KEYS,
        t("gen7EggNature"),
        t("gen7EggAbility"),
        t("gen7EggGender"),
        t("gen7EggHiddenPower"),
        t("gen7EggShiny"),
        t("gen7EggBall"),
        t("gen7EggAdvance"),
        "PSV",
        "PRV",
      ],
      ...sortedResults.map((result) => [
        formatGen7EggState(result.state),
        result.frame,
        result.eggNumber || "",
        actionLabel(result),
        formatGen7EggHex32(result.random),
        formatGen7EggHex32(result.ec),
        formatGen7EggHex32(result.pid),
        ...result.ivs,
        result.natureParent === "any"
          ? GEN7_WILD_NATURES[language][result.nature]
          : parentLabel(result.natureParent),
        result.ability === 3 ? "H" : result.ability,
        ["-", "♂", "♀"][result.gender],
        t(POWER_KEYS[result.hiddenPower]),
        result.squareShiny ? "◆" : result.shiny ? "★" : "",
        parentLabel(result.ball),
        result.framesUsed,
        result.psv,
        result.prv,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen7egg-${mode}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderParent = (
    key: "male" | "female",
    parent: Gen7EggParent,
    setParent: typeof setMale,
    ivs: IvText,
    setIvs: typeof setMaleIvs,
  ) => (
    <div className={`gen7egg-parent ${key}`}>
      <div className="gen7egg-parent-heading">
        <strong>
          {t(key === "male" ? "gen7EggMaleParent" : "gen7EggFemaleParent")}
        </strong>
        <label className="checkbox-field">
          <input
            checked={parent.ditto}
            disabled={
              (key === "male" &&
                (genderRatio === "genderless" ||
                  genderRatio === "male-only")) ||
              (key === "female" && genderRatio === "female-only")
            }
            onChange={(event) => changeDitto(key, event.target.checked)}
            type="checkbox"
          />
          <span>{t("gen7EggDitto")}</span>
        </label>
      </div>
      <div className="gen7egg-parent-controls">
        <label className="field">
          <span>{t("gen7EggAbility")}</span>
          <select
            onChange={(event) =>
              setParent((current) => ({
                ...current,
                ability: Number(event.target.value) as 0 | 1 | 2,
              }))
            }
            value={parent.ability}
          >
            <option value={0}>1</option>
            <option value={1}>2</option>
            <option value={2}>H</option>
          </select>
        </label>
        <label className="field">
          <span>{t("gen7EggItem")}</span>
          <select
            onChange={(event) =>
              setParent((current) => ({
                ...current,
                item: event.target.value as Gen7EggItem,
              }))
            }
            value={parent.item}
          >
            {ITEM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.key)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="gen7egg-parent-ivs">
        {IV_KEYS.map((label, index) => (
          <label key={label}>
            <span>{label}</span>
            <input
              inputMode="numeric"
              max={31}
              min={0}
              onChange={(event) =>
                setIvs((current) => {
                  const next = [...current] as IvText;
                  next[index] = normalizeDecimalInput(
                    event.target.value,
                    31,
                    2,
                  );
                  return next;
                })
              }
              value={ivs[index]}
            />
          </label>
        ))}
      </div>
    </div>
  );

  const statusLabel = t(status);

  return (
    <div className="gen7egg-panel">
      <div className="gen7egg-mode-tabs" role="tablist">
        {(
          [
            ["frames", "gen7EggFrameRange"],
            ["egg-list", "gen7EggEggList"],
            ["shortest-path", "gen7EggShortestPath"],
          ] as const
        ).map(([value, label]) => (
          <button
            aria-selected={mode === value}
            className={mode === value ? "active" : ""}
            key={value}
            onClick={() => changeMode(value)}
            role="tab"
            type="button"
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div className="gen7egg-workspace">
        <form className="panel gen7egg-controls" onSubmit={run}>
          <div className="gen7egg-heading">
            <h2>{t("gen7EggEngine")}</h2>
            <strong>EGG API 1</strong>
          </div>

          <section className="gen7egg-section">
            <h3>{t("gen7EggCurrentState")}</h3>
            <div className="gen7egg-state-grid">
              {[3, 2, 1, 0].map((index) => (
                <label className="field" key={index}>
                  <span>[{index}]</span>
                  <input
                    inputMode="text"
                    maxLength={8}
                    onChange={(event) =>
                      updateStateWord(index, event.target.value)
                    }
                    value={stateText[index]}
                  />
                </label>
              ))}
            </div>
            <div className="gen7egg-range-grid">
              {mode === "frames" ? (
                <>
                  <label className="field">
                    <span>{t("gen7EggInitialFrame")}</span>
                    <input
                      inputMode="numeric"
                      max={GEN7_EGG_MAX_FRAME}
                      min={0}
                      onChange={(event) =>
                        setMinFrame(
                          normalizeDecimalInput(
                            event.target.value,
                            GEN7_EGG_MAX_FRAME,
                          ),
                        )
                      }
                      value={minFrame}
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7EggMaxFrame")}</span>
                    <input
                      inputMode="numeric"
                      max={GEN7_EGG_MAX_FRAME}
                      min={0}
                      onChange={(event) =>
                        setMaxFrame(
                          normalizeDecimalInput(
                            event.target.value,
                            GEN7_EGG_MAX_FRAME,
                          ),
                        )
                      }
                      value={maxFrame}
                    />
                  </label>
                </>
              ) : mode === "egg-list" ? (
                <>
                  <label className="field">
                    <span>{t("gen7EggMinimumEgg")}</span>
                    <input
                      inputMode="numeric"
                      max={GEN7_EGG_MAX_EGGS}
                      min={1}
                      onChange={(event) =>
                        setMinEgg(
                          normalizeDecimalInput(
                            event.target.value,
                            GEN7_EGG_MAX_EGGS,
                          ),
                        )
                      }
                      value={minEgg}
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7EggMaximumEgg")}</span>
                    <input
                      inputMode="numeric"
                      max={GEN7_EGG_MAX_EGGS}
                      min={1}
                      onChange={(event) =>
                        setMaxEgg(
                          normalizeDecimalInput(
                            event.target.value,
                            GEN7_EGG_MAX_EGGS,
                          ),
                        )
                      }
                      value={maxEgg}
                    />
                  </label>
                </>
              ) : null}
              {mode !== "frames" && (
                <label className="field">
                  <span>{t("gen7EggTargetFrame")}</span>
                  <input
                    inputMode="numeric"
                    max={GEN7_EGG_MAX_FRAME}
                    min={0}
                    onChange={(event) =>
                      setTargetFrame(
                        normalizeDecimalInput(
                          event.target.value,
                          GEN7_EGG_MAX_FRAME,
                        ),
                      )
                    }
                    value={targetFrame}
                  />
                </label>
              )}
            </div>
          </section>

          <section className="gen7egg-section">
            <h3>{t("gen7EggIdentity")}</h3>
            <div className="gen7egg-range-grid">
              <label className="field">
                <span>TSV</span>
                <input
                  inputMode="numeric"
                  max={4095}
                  min={0}
                  onChange={(event) =>
                    setTsv(normalizeDecimalInput(event.target.value, 4095, 4))
                  }
                  value={tsv}
                />
              </label>
              <label className="field">
                <span>TRV</span>
                <input
                  inputMode="text"
                  maxLength={1}
                  onChange={(event) =>
                    setTrv(normalizeHexInput(event.target.value, 1))
                  }
                  value={trv}
                />
              </label>
            </div>
            <div className="gen7egg-toggle-grid">
              <label className="checkbox-field">
                <input
                  checked={shinyCharm}
                  onChange={(event) => {
                    setShinyCharm(event.target.checked);
                    if (!event.target.checked && !masudaMethod) {
                      setConsiderOtherTsv(false);
                      setShinyReminder(false);
                    }
                  }}
                  type="checkbox"
                />
                <span>{t("gen7EggShinyCharm")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={masudaMethod}
                  onChange={(event) => {
                    setMasudaMethod(event.target.checked);
                    if (!event.target.checked && !shinyCharm) {
                      setConsiderOtherTsv(false);
                      setShinyReminder(false);
                    }
                  }}
                  type="checkbox"
                />
                <span>{t("gen7EggMasudaMethod")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={considerOtherTsv}
                  disabled={!hasPidRerolls}
                  onChange={(event) => {
                    setConsiderOtherTsv(event.target.checked);
                    if (event.target.checked) setShinyFilter("shiny");
                  }}
                  type="checkbox"
                />
                <span>{t("gen7EggOtherTsvShiny")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={shinyReminder}
                  disabled={mode !== "frames" || !hasPidRerolls}
                  onChange={(event) => setShinyReminder(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen7EggShinyReminder")}</span>
              </label>
            </div>
            <label className="field gen7egg-other-tsv">
              <span>{t("gen7EggTsvList")}</span>
              <input
                disabled={!considerOtherTsv}
                inputMode="numeric"
                onChange={(event) => setOtherTsvs(event.target.value)}
                value={otherTsvs}
              />
            </label>
          </section>

          <section className="gen7egg-section">
            <div className="gen7egg-section-heading">
              <h3>{t("gen7EggParents")}</h3>
              <div>
                <button
                  onClick={resetParents}
                  title={t("gen7EggReset")}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" size={15} />
                </button>
                <button
                  onClick={applyFastMode}
                  title={t("gen7EggFastMode")}
                  type="button"
                >
                  <Zap aria-hidden="true" size={15} />
                </button>
              </div>
            </div>
            <div className="gen7egg-parent-grid">
              {renderParent("male", male, setMale, maleIvs, setMaleIvs)}
              {renderParent(
                "female",
                female,
                setFemale,
                femaleIvs,
                setFemaleIvs,
              )}
            </div>
            <div className="gen7egg-range-grid gen7egg-parent-options">
              <label className="field">
                <span>{t("gen7EggGenderRatio")}</span>
                <select
                  onChange={(event) =>
                    changeGenderRatio(event.target.value as Gen7EggGenderRatio)
                  }
                  value={genderRatio}
                >
                  {GENDER_RATIOS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.key)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-field">
                <input
                  checked={homogeneous}
                  disabled={
                    nidoType ||
                    male.ditto ||
                    female.ditto ||
                    genderRatio === "female-only"
                  }
                  onChange={(event) => setHomogeneous(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen7EggHomogeneous")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={nidoType}
                  disabled={genderRatio !== "one-to-one"}
                  onChange={(event) => {
                    setNidoType(event.target.checked);
                    if (event.target.checked) setHomogeneous(false);
                  }}
                  type="checkbox"
                />
                <span>{t("gen7EggNidoType")}</span>
              </label>
            </div>
          </section>

          <details className="gen7egg-disclosure" open>
            <summary>{t("gen7EggFilters")}</summary>
            <fieldset
              className="gen7egg-filter-content"
              disabled={filtersDisabled}
            >
              <div className="gen7egg-filter-grid">
                <label className="field">
                  <span>{t("gen7EggShiny")}</span>
                  <select
                    onChange={(event) =>
                      setShinyFilter(event.target.value as Gen7EggShinyFilter)
                    }
                    value={shinyFilter}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="shiny">{t("gen7EggShinyOnly")}</option>
                    <option value="square">◆</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("gen7EggGender")}</span>
                  <select
                    onChange={(event) =>
                      setGenderFilter(event.target.value as Gen7EggGenderFilter)
                    }
                    value={genderFilter}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="male">♂</option>
                    <option value="female">♀</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("gen7EggAbility")}</span>
                  <select
                    onChange={(event) =>
                      setAbilityFilter(
                        event.target.value as Gen7EggAbilityFilter,
                      )
                    }
                    value={abilityFilter}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="hidden">H</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("gen7EggBall")}</span>
                  <select
                    onChange={(event) =>
                      setBallFilter(event.target.value as Gen7EggParentFilter)
                    }
                    value={ballFilter}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="male">{t("gen7EggMaleParent")}</option>
                    <option value="female">{t("gen7EggFemaleParent")}</option>
                  </select>
                </label>
                {hasEverstone ? (
                  <label className="field">
                    <span>{t("gen7EggNature")}</span>
                    <select
                      onChange={(event) =>
                        setNatureInheritanceFilter(
                          event.target.value as Gen7EggParentFilter,
                        )
                      }
                      value={natureInheritanceFilter}
                    >
                      <option value="any">{t("any")}</option>
                      <option value="male">{t("gen7EggMaleParent")}</option>
                      <option value="female">{t("gen7EggFemaleParent")}</option>
                    </select>
                  </label>
                ) : (
                  <MultiCheckSelect
                    anyLabel={t("any")}
                    label={t("gen7EggNature")}
                    mask={natureMask}
                    onChange={(value) => setNatureMask(value || ALL_NATURES)}
                    options={natureOptions}
                  />
                )}
                <MultiCheckSelect
                  anyLabel={t("any")}
                  label={t("gen7EggHiddenPower")}
                  mask={hiddenPowerMask}
                  onChange={(value) =>
                    setHiddenPowerMask(value || ALL_HIDDEN_POWERS)
                  }
                  options={hiddenPowerOptions}
                />
                <label className="field">
                  <span>{t("gen7EggPerfectValue")}</span>
                  <input
                    inputMode="numeric"
                    max={31}
                    min={0}
                    onChange={(event) =>
                      setPerfectIvValue(
                        normalizeDecimalInput(event.target.value, 31, 2),
                      )
                    }
                    value={perfectIvValue}
                  />
                </label>
                <label className="field">
                  <span>{t("gen7EggPerfectCount")}</span>
                  <input
                    inputMode="numeric"
                    max={6}
                    min={0}
                    onChange={(event) =>
                      setPerfectIvCount(
                        normalizeDecimalInput(event.target.value, 6, 1),
                      )
                    }
                    value={perfectIvCount}
                  />
                </label>
              </div>
              <div className="gen7egg-iv-filter">
                <div>
                  <span>{t("gen7EggIvRange")}</span>
                  <span>Min</span>
                  <span>Max</span>
                </div>
                {IV_KEYS.map((key, index) => (
                  <label key={key}>
                    <span>{key}</span>
                    <input
                      inputMode="numeric"
                      max={31}
                      min={0}
                      onChange={(event) =>
                        setIvMin((current) => {
                          const next = [...current] as IvText;
                          next[index] = normalizeDecimalInput(
                            event.target.value,
                            31,
                            2,
                          );
                          return next;
                        })
                      }
                      value={ivMin[index]}
                    />
                    <input
                      inputMode="numeric"
                      max={31}
                      min={0}
                      onChange={(event) =>
                        setIvMax((current) => {
                          const next = [...current] as IvText;
                          next[index] = normalizeDecimalInput(
                            event.target.value,
                            31,
                            2,
                          );
                          return next;
                        })
                      }
                      value={ivMax[index]}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </details>
          <label className="checkbox-field gen7egg-disable-filter">
            <input
              checked={filtersDisabled}
              disabled={mode === "shortest-path"}
              onChange={(event) => setFiltersDisabled(event.target.checked)}
              type="checkbox"
            />
            <span>{t("gen7EggDisableFilters")}</span>
          </label>
          <div className="gen7egg-run-actions">
            <button
              className="gen7egg-primary"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={17} />
              <span>{t("search")}</span>
            </button>
            <button
              className="gen7egg-icon-button"
              disabled={status !== "calculating"}
              onClick={stop}
              title={t("cancel")}
              type="button"
            >
              <Square aria-hidden="true" size={17} />
            </button>
          </div>
        </form>

        <section className="panel gen7egg-results">
          <div className="gen7egg-results-heading">
            <div>
              <h2>{t("results")}</h2>
              {instruction && <p>{instruction}</p>}
            </div>
            <div className="gen7egg-result-actions">
              <button
                className="gen7egg-icon-button"
                disabled={results.length === 0}
                onClick={exportCsv}
                title={t("exportCsv")}
                type="button"
              >
                <Download aria-hidden="true" size={17} />
              </button>
              <button
                className="gen7egg-icon-button"
                disabled={results.length === 0 && status === "ready"}
                onClick={clearResults}
                title={t("clearResults")}
                type="button"
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
          </div>
          <div className="metrics-row gen7egg-metrics">
            <span>
              {t("status")}: <strong>{statusLabel}</strong>
            </span>
            <span>
              {t("processed")}: <strong>{progress.processedStates}</strong> /{" "}
              {progress.totalStates}
            </span>
            <span>
              {t("matches")}: <strong>{progress.resultCount}</strong>
            </span>
            <span>
              {t("elapsed")}:{" "}
              <strong>
                {summary ? summary.elapsedMs.toFixed(1) : "0.0"} ms
              </strong>
            </span>
          </div>
          {error && <p className="error-message gen7egg-error">{error}</p>}
          <div className="gen7egg-table-shell" ref={scrollRef}>
            {sortedResults.length === 0 ? (
              <div className="empty-state">{t("emptyGen7Egg")}</div>
            ) : (
              <div
                className="gen7egg-table"
                style={{ height: rowVirtualizer.getTotalSize() + 42 }}
              >
                <div className="gen7egg-table-head">
                  <span>{t("gen7EggState")}</span>
                  {(
                    [
                      ["frame", "gen7EggFrame"],
                      ["eggNumber", "gen7EggEggNumber"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleSort(key)}
                      type="button"
                    >
                      {t(label)}
                      {sortLabel(key)}
                    </button>
                  ))}
                  <span>{t("gen7EggAction")}</span>
                  {(
                    [
                      ["random", "gen7EggRandom"],
                      ["ec", "EC"],
                      ["pid", "PID"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleSort(key)}
                      type="button"
                    >
                      {label.startsWith("gen7") ? t(label) : label}
                      {sortLabel(key)}
                    </button>
                  ))}
                  <span>{t("gen7EggIvs")}</span>
                  {(
                    [
                      ["nature", "gen7EggNature"],
                      ["ability", "gen7EggAbility"],
                      ["gender", "gen7EggGender"],
                      ["hiddenPower", "gen7EggHiddenPower"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleSort(key)}
                      type="button"
                    >
                      {t(label)}
                      {sortLabel(key)}
                    </button>
                  ))}
                  <span>{t("gen7EggShiny")}</span>
                  <span>{t("gen7EggBall")}</span>
                  <button
                    onClick={() => toggleSort("framesUsed")}
                    type="button"
                  >
                    {t("gen7EggAdvance")}
                    {sortLabel("framesUsed")}
                  </button>
                  <button onClick={() => toggleSort("psv")} type="button">
                    PSV{sortLabel("psv")}
                  </button>
                  <button onClick={() => toggleSort("prv")} type="button">
                    PRV{sortLabel("prv")}
                  </button>
                  <span>{t("gen7EggRowActions")}</span>
                </div>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const result = sortedResults[virtualRow.index];
                  return (
                    <div
                      className={`gen7egg-table-row ${result.action}`}
                      key={`${result.frame}-${result.eggNumber}-${virtualRow.index}`}
                      style={{
                        transform: `translateY(${virtualRow.start + 42}px)`,
                      }}
                    >
                      <span className="mono">
                        {formatGen7EggState(result.state)}
                      </span>
                      <span>{result.frame}</span>
                      <span>{result.eggNumber || "-"}</span>
                      <span>{actionLabel(result)}</span>
                      <span className="mono">
                        {formatGen7EggHex32(result.random)}
                      </span>
                      <span className="mono">
                        {formatGen7EggHex32(result.ec)}
                      </span>
                      <span className="mono">
                        {formatGen7EggHex32(result.pid)}
                      </span>
                      <span className="gen7egg-iv-result">
                        {result.ivs.map((iv, index) => (
                          <b
                            className={
                              (result.inheritedMaleMask & (1 << index)) !== 0
                                ? "male"
                                : (result.inheritedFemaleMask &
                                      (1 << index)) !==
                                    0
                                  ? "female"
                                  : ""
                            }
                            key={index}
                          >
                            {iv}
                          </b>
                        ))}
                      </span>
                      <span>
                        {result.natureParent === "any"
                          ? GEN7_WILD_NATURES[language][result.nature]
                          : parentLabel(result.natureParent)}
                      </span>
                      <span>{result.ability === 3 ? "H" : result.ability}</span>
                      <span>{["-", "♂", "♀"][result.gender]}</span>
                      <span>{t(POWER_KEYS[result.hiddenPower])}</span>
                      <span className={result.shiny ? "shiny" : ""}>
                        {result.squareShiny ? "◆" : result.shiny ? "★" : "-"}
                      </span>
                      <span>{parentLabel(result.ball)}</span>
                      <span>+{result.framesUsed}</span>
                      <span>{result.psv.toString().padStart(4, "0")}</span>
                      <span>{result.prv.toString(16).toUpperCase()}</span>
                      <span className="gen7egg-row-actions">
                        <button
                          onClick={() => setStateFromResult(result, false)}
                          title={t("gen7EggSetCurrent")}
                          type="button"
                        >
                          <LocateFixed aria-hidden="true" size={15} />
                        </button>
                        <button
                          onClick={() => setStateFromResult(result, true)}
                          title={t("gen7EggSetAfter")}
                          type="button"
                        >
                          <SkipForward aria-hidden="true" size={15} />
                        </button>
                      </span>
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
