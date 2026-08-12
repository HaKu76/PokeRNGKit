import { useVirtualizer } from "@tanstack/react-virtual";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { formatHex, parseDecimal, parseHex } from "../id/domain";
import type { Gen3Profile } from "../profiles/domain";
import { getGen3AbilityName } from "../shared/gen3Abilities";
import { getGen3Personal } from "../shared/gen3Personal";
import { getGen3Species, getGen3SpeciesName } from "../shared/gen3Species";
import { computeGen3Stats } from "../shared/gen3Stats";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import {
  gen3EggCombinedStateCount,
  GEN3_EGG_ALLOWED_SPECIES,
  GEN3_EGG_MAX_COMBINED_STATES,
  validateGen3EggRequest,
  type Gen3EggAbilityFilter,
  type Gen3EggFilters,
  type Gen3EggGame,
  type Gen3EggGenderFilter,
  type Gen3EggMethod,
  type Gen3EggParent,
  type Gen3EggParentGender,
  type Gen3EggParentItem,
  type Gen3EggRequest,
  type Gen3EggShinyFilter,
  type Gen3EggState,
} from "./domain";
import { Gen3EggUiPreviewEngine } from "./preview/Gen3EggUiPreviewEngine";
import type {
  Gen3EggSearchEngine,
  Gen3EggSearchProgress,
  Gen3EggSearchSummary,
} from "./search";
import { Gen3EggWorkerPool } from "./worker/Gen3EggWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type IvTextValues = [string, string, string, string, string, string];
type EggSortKey =
  | "advances"
  | "pickupAdvances"
  | "redraws"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | "gender"
  | IvKey
  | "hiddenPower"
  | "hiddenPowerStrength";

interface Gen3EggPanelProps {
  profile: Gen3Profile;
  uiPreviewMode: boolean;
  onOpenIvCalculator(): void;
}

const NATURE_MASK_ALL = 0x1ff_ffff;
const HIDDEN_POWER_MASK_ALL = 0xffff;
const ivKeys: IvKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];
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
const hiddenPowerKeys = [
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

function emptyParent(): Gen3EggParent {
  return {
    ivs: [31, 31, 31, 31, 31, 31],
    gender: "male",
    item: "none",
    nature: 0,
  };
}

function ivLabel(key: IvKey) {
  return `iv${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function eggColumns(
  game: Gen3EggGame,
): Array<{ key: EggSortKey; label: string }> {
  return [
    { key: "advances", label: "eggHeldAdvances" },
    { key: "pickupAdvances", label: "eggPickupAdvances" },
    ...(game === "emerald"
      ? [{ key: "redraws" as const, label: "eggRedraws" }]
      : []),
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
}

export function Gen3EggPanel({
  profile,
  uiPreviewMode,
  onOpenIvCalculator,
}: Gen3EggPanelProps) {
  const { t, i18n } = useTranslation();
  const engine = useMemo<Gen3EggSearchEngine>(
    () =>
      uiPreviewMode ? new Gen3EggUiPreviewEngine() : new Gen3EggWorkerPool(),
    [uiPreviewMode],
  );
  const tableRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Gen3EggGame>(
    profile.version === "emerald" ? "emerald" : "rsfrlg",
  );
  const [method, setMethod] = useState<Gen3EggMethod>("normal");
  const [seedHeld, setSeedHeld] = useState("");
  const [seedPickup, setSeedPickup] = useState("");
  const [initialHeld, setInitialHeld] = useState("1000");
  const [maxHeld, setMaxHeld] = useState("5000");
  const [offsetHeld, setOffsetHeld] = useState("0");
  const [initialPickup, setInitialPickup] = useState("1000");
  const [maxPickup, setMaxPickup] = useState("5000");
  const [offsetPickup, setOffsetPickup] = useState("0");
  const [calibration, setCalibration] = useState("18");
  const [minRedraws, setMinRedraws] = useState("0");
  const [maxRedraws, setMaxRedraws] = useState("5");
  const [compatibility, setCompatibility] = useState<20 | 50 | 70>(70);
  const [species, setSpecies] = useState(1);
  const [parentA, setParentA] = useState<Gen3EggParent>(emptyParent);
  const [parentB, setParentB] = useState<Gen3EggParent>({
    ...emptyParent(),
    gender: "female",
  });
  const [shiny, setShiny] = useState<Gen3EggShinyFilter>("any");
  const [gender, setGender] = useState<Gen3EggGenderFilter>("any");
  const [ability, setAbility] = useState<Gen3EggAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(0);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0);
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
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [results, setResults] = useState<Gen3EggState[]>([]);
  const [progress, setProgress] = useState<Gen3EggSearchProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen3EggSearchSummary>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{
    key: EggSortKey;
    direction: "asc" | "desc";
  }>({ key: "advances", direction: "asc" });

  const personal = getGen3Personal(species);
  const alternateGenderRatio =
    species === 29
      ? getGen3Personal(32).genderRatio
      : species === 314
        ? getGen3Personal(313).genderRatio
        : personal.genderRatio;
  const columns = useMemo(() => eggColumns(game), [game]);
  const natureOptions = natureKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const hiddenPowerOptions = hiddenPowerKeys.map((key, value) => ({
    label: t(key),
    value,
  }));

  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    setGame(profile.version === "emerald" ? "emerald" : "rsfrlg");
    if (profile.deadBattery) {
      setSeedHeld("5A0");
      setSeedPickup("5A0");
    }
  }, [profile]);
  useEffect(() => {
    if (game === "emerald" && method === "mixed") setMethod("normal");
  }, [game, method]);

  const resultPersonal = (state: Gen3EggState) => {
    if (species === 29 && (state.pid & 0x8000) !== 0) {
      return getGen3Personal(32);
    }
    if (species === 314 && (state.pid & 0x8000) !== 0) {
      return getGen3Personal(313);
    }
    return personal;
  };
  const stateValue = (state: Gen3EggState, key: EggSortKey) => {
    const ivIndex = ivKeys.indexOf(key as IvKey);
    if (ivIndex >= 0) {
      return showStats
        ? computeGen3Stats(
            resultPersonal(state).stats,
            state.ivs,
            state.nature,
            5,
          )[ivIndex]
        : state.ivs[ivIndex];
    }
    if (key === "hiddenPower") return state.hiddenPower;
    if (key === "hiddenPowerStrength") return state.hiddenPowerStrength;
    return state[
      key as Exclude<EggSortKey, IvKey | "hiddenPower" | "hiddenPowerStrength">
    ];
  };
  const sortedResults = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        (stateValue(left, sort.key) - stateValue(right, sort.key)) * direction,
    );
    // Result values derive from the selected species and display mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personal, results, showStats, sort, species]);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const resetRunState = () => {
    engine.cancel();
    setResults([]);
    setProgress({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
    setSummary(undefined);
    setStatus("ready");
    setError("");
  };
  const updateParent = (parent: "a" | "b", update: Partial<Gen3EggParent>) => {
    const setter = parent === "a" ? setParentA : setParentB;
    setter((current) => ({ ...current, ...update }));
  };
  const updateParentIv = (parent: "a" | "b", index: number, value: string) => {
    const setter = parent === "a" ? setParentA : setParentB;
    setter((current) => ({
      ...current,
      ivs: current.ivs.map((entry, currentIndex) =>
        currentIndex === index ? Number(value || 0) : entry,
      ) as Gen3EggParent["ivs"],
    }));
  };
  const applyIvShortcut = (index: number, event: MouseEvent) => {
    const [minimum, maximum] =
      event.ctrlKey && event.altKey
        ? ["0", "0"]
        : event.ctrlKey
          ? ["31", "31"]
          : event.altKey
            ? ["30", "31"]
            : ["0", "31"];
    setIvMin(
      (current) =>
        current.map((entry, currentIndex) =>
          currentIndex === index ? minimum : entry,
        ) as IvTextValues,
    );
    setIvMax(
      (current) =>
        current.map((entry, currentIndex) =>
          currentIndex === index ? maximum : entry,
        ) as IvTextValues,
    );
  };
  const filters = (): Gen3EggFilters =>
    filtersDisabled
      ? {
          shiny: "any",
          gender: "any",
          ability: "any",
          natureMask: NATURE_MASK_ALL,
          hiddenPowerMask: HIDDEN_POWER_MASK_ALL,
          ivMin: [0, 0, 0, 0, 0, 0],
          ivMax: [31, 31, 31, 31, 31, 31],
        }
      : {
          shiny,
          gender,
          ability,
          natureMask: natureMask || NATURE_MASK_ALL,
          hiddenPowerMask: hiddenPowerMask || HIDDEN_POWER_MASK_ALL,
          ivMin: ivMin.map(
            (value) => parseDecimal(value) ?? Number.NaN,
          ) as Gen3EggFilters["ivMin"],
          ivMax: ivMax.map(
            (value) => parseDecimal(value) ?? Number.NaN,
          ) as Gen3EggFilters["ivMax"],
        };
  const request = (): Gen3EggRequest => ({
    game,
    method,
    seedHeld: parseHex(seedHeld) ?? 0,
    seedPickup: parseHex(seedPickup) ?? 0,
    initialAdvancesHeld: parseDecimal(initialHeld) ?? Number.NaN,
    maxAdvancesHeld: parseDecimal(maxHeld) ?? Number.NaN,
    offsetHeld: parseDecimal(offsetHeld) ?? Number.NaN,
    initialAdvancesPickup: parseDecimal(initialPickup) ?? Number.NaN,
    maxAdvancesPickup: parseDecimal(maxPickup) ?? Number.NaN,
    offsetPickup: parseDecimal(offsetPickup) ?? Number.NaN,
    calibration: parseDecimal(calibration) ?? Number.NaN,
    minRedraws: parseDecimal(minRedraws) ?? Number.NaN,
    maxRedraws: parseDecimal(maxRedraws) ?? Number.NaN,
    compatibility,
    species,
    genderRatio: personal.genderRatio,
    alternateGenderRatio,
    tid: profile.tid,
    sid: profile.sid,
    parentA,
    parentB,
    filters: filters(),
  });
  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const nextRequest = request();
    const errors = validateGen3EggRequest(nextRequest);
    if (errors.length > 0) {
      setError(
        errors.includes("parents")
          ? t("eggIncompatibleParents")
          : errors.includes("combinedRange")
            ? t("eggRangeTooLarge", {
                count: String(gen3EggCombinedStateCount(nextRequest)),
                limit: String(GEN3_EGG_MAX_COMBINED_STATES),
              })
            : t("invalidEggInput"),
      );
      setStatus("failed");
      return;
    }
    setError("");
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: gen3EggCombinedStateCount(nextRequest),
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");
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
  const displayValue = (state: Gen3EggState, key: EggSortKey) => {
    if (key === "pid") return formatHex(state.pid, 8);
    if (ivKeys.includes(key as IvKey)) {
      const index = ivKeys.indexOf(key as IvKey);
      if (showInheritance && state.inheritance[index] !== 0) {
        return state.inheritance[index] === 1 ? "A" : "B";
      }
      return String(stateValue(state, key));
    }
    if (key === "shiny") {
      return t(
        state.shiny === 0
          ? "no"
          : state.shiny === 1
            ? "shinyStar"
            : "shinySquare",
      );
    }
    if (key === "nature") return t(natureKeys[state.nature]);
    if (key === "ability") {
      const abilityId = resultPersonal(state).abilities[state.ability];
      return `${state.ability}: ${getGen3AbilityName(i18n.language, abilityId)}`;
    }
    if (key === "gender") {
      return t(
        state.gender === 0
          ? "male"
          : state.gender === 1
            ? "female"
            : "genderless",
      );
    }
    if (key === "hiddenPower") return t(hiddenPowerKeys[state.hiddenPower]);
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
    const csv = rows.map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen3egg-${game}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];
  const parentPanel = (id: "a" | "b", parent: Gen3EggParent) => (
    <fieldset className="egg-parent-fields" key={id}>
      <legend>{t(id === "a" ? "eggParentA" : "eggParentB")}</legend>
      <div className="egg-parent-meta">
        <label className="field">
          <span>{t("gender")}</span>
          <select
            onChange={(event) =>
              updateParent(id, {
                gender: event.target.value as Gen3EggParentGender,
              })
            }
            value={parent.gender}
          >
            <option value="male">{t("male")}</option>
            <option value="female">{t("female")}</option>
            <option value="genderless">{t("genderless")}</option>
            <option value="ditto">
              {getGen3SpeciesName(i18n.language, 132)}
            </option>
          </select>
        </label>
        {game === "emerald" && (
          <>
            <label className="field">
              <span>{t("eggItem")}</span>
              <select
                onChange={(event) =>
                  updateParent(id, {
                    item: event.target.value as Gen3EggParentItem,
                  })
                }
                value={parent.item}
              >
                <option value="none">{t("none")}</option>
                <option value="everstone">{t("eggEverstone")}</option>
              </select>
            </label>
            <label className="field">
              <span>{t("nature")}</span>
              <select
                onChange={(event) =>
                  updateParent(id, { nature: Number(event.target.value) })
                }
                value={parent.nature}
              >
                {natureKeys.map((key, index) => (
                  <option key={key} value={index}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      <div className="egg-parent-ivs">
        {ivKeys.map((key, index) => (
          <label className="field" key={key}>
            <span>{t(ivLabel(key))}</span>
            <input
              inputMode="numeric"
              max="31"
              maxLength={2}
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

  return (
    <>
      <div
        aria-label={t("eggModule")}
        className="operation-tabs"
        role="tablist"
      >
        {(["emerald", "rsfrlg"] as const).map((entry) => (
          <button
            aria-selected={game === entry}
            className={game === entry ? "active" : ""}
            disabled={status === "calculating"}
            key={entry}
            onClick={() => {
              if (game !== entry) {
                resetRunState();
                setGame(entry);
              }
            }}
            role="tab"
            type="button"
          >
            {t(entry === "emerald" ? "gameEmerald" : "eggRsFrlg")}
          </button>
        ))}
      </div>

      <form className="gen3egg-control-grid" onSubmit={generate}>
        <section className="panel static-panel egg-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">PokeFinder / Eggs3</span>
          </div>
          <div className="static-form-stack">
            {game === "rsfrlg" && (
              <fieldset className="egg-dual-field">
                <legend>{t("eggSeed")}</legend>
                <input
                  aria-label={t("eggSeed")}
                  maxLength={4}
                  onChange={(event) =>
                    setSeedHeld(normalizeHexInput(event.target.value, 4))
                  }
                  value={seedHeld}
                />
                <input
                  aria-label={t("eggSeed")}
                  maxLength={4}
                  onChange={(event) =>
                    setSeedPickup(normalizeHexInput(event.target.value, 4))
                  }
                  value={seedPickup}
                />
                <small>HEX / 16-bit</small>
              </fieldset>
            )}
            <div className="compact-field-row">
              <label className="field">
                <span>{t("eggHeldAdvances")}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setInitialHeld(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={initialHeld}
                />
              </label>
              <label className="field">
                <span>{t("maxAdvances")}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setMaxHeld(
                      normalizeDecimalInput(event.target.value, 999_999, 10),
                    )
                  }
                  value={maxHeld}
                />
              </label>
            </div>
            <div className="compact-field-row">
              <label className="field">
                <span>{t("eggPickupAdvances")}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setInitialPickup(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={initialPickup}
                />
              </label>
              <label className="field">
                <span>{t("maxAdvances")}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) =>
                    setMaxPickup(
                      normalizeDecimalInput(event.target.value, 999_999, 10),
                    )
                  }
                  value={maxPickup}
                />
              </label>
            </div>
            <fieldset className="egg-dual-field">
              <legend>{t("eggOffset")}</legend>
              <input
                aria-label={t("eggOffset")}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setOffsetHeld(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={offsetHeld}
              />
              <input
                aria-label={t("eggOffset")}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setOffsetPickup(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={offsetPickup}
              />
            </fieldset>
            {game === "emerald" && (
              <div className="compact-field-row">
                <label className="field">
                  <span>{t("eggCalibration")}</span>
                  <input
                    inputMode="numeric"
                    maxLength={3}
                    onChange={(event) =>
                      setCalibration(
                        normalizeDecimalInput(event.target.value, 255, 3),
                      )
                    }
                    value={calibration}
                  />
                </label>
                <fieldset className="egg-redraw-field">
                  <legend>{t("eggRedraws")}</legend>
                  <input
                    aria-label={t("minimum")}
                    inputMode="numeric"
                    maxLength={3}
                    onChange={(event) =>
                      setMinRedraws(
                        normalizeDecimalInput(event.target.value, 255, 3),
                      )
                    }
                    value={minRedraws}
                  />
                  <input
                    aria-label={t("maximum")}
                    inputMode="numeric"
                    maxLength={3}
                    onChange={(event) =>
                      setMaxRedraws(
                        normalizeDecimalInput(event.target.value, 255, 3),
                      )
                    }
                    value={maxRedraws}
                  />
                </fieldset>
              </div>
            )}
            <label className="field">
              <span>{t("method")}</span>
              <select
                onChange={(event) =>
                  setMethod(event.target.value as Gen3EggMethod)
                }
                value={method}
              >
                <option value="normal">{t("eggNormal")}</option>
                <option value="split">Split</option>
                <option value="alternate">Alternate</option>
                {game === "rsfrlg" && <option value="mixed">Mixed</option>}
              </select>
            </label>
            <label className="field">
              <span>{t("eggCompatibility")}</span>
              <select
                onChange={(event) =>
                  setCompatibility(Number(event.target.value) as 20 | 50 | 70)
                }
                value={compatibility}
              >
                <option value={20}>{t("eggCompatibility20")}</option>
                <option value={50}>{t("eggCompatibility50")}</option>
                <option value={70}>{t("eggCompatibility70")}</option>
              </select>
            </label>
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {t("generate")}
            </button>
            {status === "calculating" && (
              <button
                className="secondary-action"
                onClick={() => engine.cancel()}
                type="button"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </section>

        <section className="panel static-panel egg-settings-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("settings")}</h2>
            </div>
            <span className="panel-note">
              {profile.name} / {profile.version}
            </span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("eggSpecies")}</span>
              <select
                onChange={(event) => setSpecies(Number(event.target.value))}
                value={species}
              >
                {getGen3Species(i18n.language)
                  .filter((entry) => GEN3_EGG_ALLOWED_SPECIES.has(entry.id))
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
              </select>
            </label>
            {parentPanel("a", parentA)}
            {parentPanel("b", parentB)}
          </div>
        </section>

        <section className="panel static-panel static-filter-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">03</span>
              <h2>{t("filters")}</h2>
            </div>
            <span className="panel-note">PokeFinder / Filter</span>
          </div>
          <fieldset className="filter-controls" disabled={filtersDisabled}>
            <div className="gen3-filter-selects">
              <label className="field">
                <span>{t("ability")}</span>
                <select
                  onChange={(event) =>
                    setAbility(event.target.value as Gen3EggAbilityFilter)
                  }
                  value={ability}
                >
                  <option value="any">{t("any")}</option>
                  <option value="first">0</option>
                  <option value="second">1</option>
                </select>
              </label>
              <label className="field">
                <span>{t("gender")}</span>
                <select
                  onChange={(event) =>
                    setGender(event.target.value as Gen3EggGenderFilter)
                  }
                  value={gender}
                >
                  <option value="any">{t("any")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                </select>
              </label>
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("hiddenPower")}
                mask={hiddenPowerMask}
                onChange={setHiddenPowerMask}
                options={hiddenPowerOptions}
                resetHint={t("checkListResetHint")}
              />
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("nature")}
                mask={natureMask}
                onChange={setNatureMask}
                options={natureOptions}
                resetHint={t("checkListResetHint")}
              />
              <label className="field">
                <span>{t("shiny")}</span>
                <select
                  onChange={(event) =>
                    setShiny(event.target.value as Gen3EggShinyFilter)
                  }
                  value={shiny}
                >
                  <option value="any">{t("any")}</option>
                  <option value="star">{t("shinyStar")}</option>
                  <option value="square">{t("shinySquare")}</option>
                  <option value="star-square">{t("shinyStarSquare")}</option>
                </select>
              </label>
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
                    {t(ivLabel(key))}
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
          <label className="toggle-field disable-filters">
            <input
              checked={filtersDisabled}
              onChange={(event) => setFiltersDisabled(event.target.checked)}
              type="checkbox"
            />
            <span>{t("disableFilters")}</span>
          </label>
        </section>
      </form>

      <section className="panel results-panel static-results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">04</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{statusLabel}</span>
          </div>
          <div className="result-actions">
            <span className="result-count">
              {String(results.length)} / {String(progress.totalStates)}
            </span>
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
        <div
          aria-label={`${progress.percent.toFixed(1)}%`}
          className="progress-track"
        >
          <span style={{ width: `${Math.min(100, progress.percent)}%` }} />
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
              className={`static-virtual-table egg-virtual-table egg-table-layout-${game}`}
              style={{ height: `${rowVirtualizer.getTotalSize() + 38}px` }}
            >
              <div className="static-table-header egg-table-header">
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
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const state = sortedResults[virtualRow.index];
                return (
                  <div
                    className="static-table-row egg-table-row"
                    key={`${state.advances}-${state.pickupAdvances}-${state.pid}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 38}px)`,
                    }}
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
    </>
  );
}
