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
import { gen3HiddenPower } from "../shared/gen3HiddenPower";
import { getGen3Personal } from "../shared/gen3Personal";
import { getGen3SpeciesName } from "../shared/gen3Species";
import { computeGen3Stats } from "../shared/gen3Stats";
import {
  GEN3_WILD_MAX_RESULTS,
  isGen3WildTanobyChamber,
  validateGen3WildRequest,
  type Gen3WildAbilityFilter,
  type Gen3WildArea,
  type Gen3WildEncounter,
  type Gen3WildFilters,
  type Gen3WildGenderFilter,
  type Gen3WildItem,
  type Gen3WildLead,
  type Gen3WildMethod,
  type Gen3WildRequest,
  type Gen3WildShinyFilter,
  type Gen3WildState,
} from "./domain";
import { GEN3_ENCOUNTERS, GEN3_PERSONAL } from "./gen3Data";
import { Gen3WildUiPreviewEngine } from "./preview/Gen3WildUiPreviewEngine";
import type {
  Gen3WildSearchEngine,
  Gen3WildSearchProgress,
  Gen3WildSearchSummary,
} from "./search";
import { Gen3WildWorkerPool } from "./worker/Gen3WildWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type DataGame = "ruby" | "sapphire" | "emerald" | "fire-red" | "leaf-green";
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type SortKey =
  | "advances"
  | "slot"
  | "level"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | IvKey
  | "hiddenPower"
  | "power"
  | "gender";
type IvTextValues = [string, string, string, string, string, string];
type RawLocation = {
  readonly name: string;
  readonly encounters: readonly {
    readonly kind: Gen3WildEncounter;
    readonly rate: number;
    readonly slots: readonly (readonly [number, number, number])[];
  }[];
};

interface Gen3WildPanelProps {
  profile: Gen3Profile;
  uiPreviewMode: boolean;
  onOpenIvCalculator(): void;
}

interface MultiCheckSelectProps {
  disabled?: boolean;
  label: string;
  anyLabel: string;
  mask: number;
  onChange(mask: number): void;
  options: readonly { label: string; value: number }[];
  resetHint: string;
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
const encounterLabels: Record<Gen3WildEncounter, string> = {
  land: "wildGrass",
  "rock-smash": "wildRockSmash",
  surf: "wildSurfing",
  "old-rod": "wildOldRod",
  "good-rod": "wildGoodRod",
  "super-rod": "wildSuperRod",
};
const columns: Array<{ key: SortKey; label: string }> = [
  { key: "advances", label: "rowAdvance" },
  { key: "slot", label: "wildResultSlot" },
  { key: "level", label: "level" },
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
  { key: "power", label: "hiddenPowerStrength" },
  { key: "gender", label: "gender" },
];
const gameData = GEN3_ENCOUNTERS as unknown as Record<
  DataGame,
  readonly RawLocation[]
>;

function MultiCheckSelect({
  anyLabel,
  disabled,
  label,
  mask,
  onChange,
  options,
  resetHint,
}: MultiCheckSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fullMask = options.reduce(
    (value, option) => value | (1 << option.value),
    0,
  );
  const selected = options.filter(
    (option) => (mask & (1 << option.value)) !== 0,
  );
  const summary =
    mask === 0 || mask === fullMask
      ? anyLabel
      : selected.map((option) => option.label).join(", ");

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return (
    <div className="field multi-check-field" ref={rootRef}>
      <span>{label}</span>
      <button
        aria-expanded={open}
        className="multi-check-trigger"
        disabled={disabled}
        onClick={(event) => {
          if (event.ctrlKey) {
            onChange(0);
            setOpen(false);
          } else {
            setOpen((current) => !current);
          }
        }}
        title={resetHint}
        type="button"
      >
        <span>{summary}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="multi-check-menu">
          {options.map((option) => (
            <label key={option.value}>
              <input
                checked={(mask & (1 << option.value)) !== 0}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? mask | (1 << option.value)
                      : mask & ~(1 << option.value),
                  )
                }
                type="checkbox"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function dataGame(version: Gen3Profile["version"]): DataGame {
  if (version === "firered") return "fire-red";
  if (version === "leafgreen") return "leaf-green";
  if (version === "ruby" || version === "sapphire") return version;
  return "emerald";
}

function personal(species: number) {
  const value = GEN3_PERSONAL[species] ?? [255, 0, 0];
  return { genderRatio: value[0], type1: value[1], type2: value[2] };
}

function buildArea(
  version: Gen3Profile["version"],
  location: RawLocation,
  encounter: Gen3WildEncounter,
  feebasTile: boolean,
): Gen3WildArea | undefined {
  const source = location.encounters.find((entry) => entry.kind === encounter);
  if (!source) return undefined;
  const feebasLocation =
    location.name === "Route 119" &&
    (version === "ruby" || version === "sapphire" || version === "emerald") &&
    (encounter === "old-rod" ||
      encounter === "good-rod" ||
      encounter === "super-rod");
  const slots = source.slots.map(([species, minLevel, maxLevel]) => ({
    species,
    form: 0,
    minLevel,
    maxLevel,
    ...personal(species),
  }));
  if (feebasLocation && feebasTile) {
    slots.push({
      species: 349,
      form: 0,
      minLevel: 20,
      maxLevel: 25,
      ...personal(349),
    });
  }
  return {
    name: location.name,
    encounter,
    rate: source.rate,
    slots,
    feebasLocation,
    safariZone:
      (version === "ruby" || version === "sapphire" || version === "emerald") &&
      location.name.includes("Safari Zone"),
  };
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function ivLabelKey(key: IvKey) {
  return `iv${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

export function Gen3WildPanel({
  onOpenIvCalculator,
  profile,
  uiPreviewMode,
}: Gen3WildPanelProps) {
  const { t, i18n } = useTranslation();
  const engine = useMemo<Gen3WildSearchEngine>(
    () =>
      uiPreviewMode ? new Gen3WildUiPreviewEngine() : new Gen3WildWorkerPool(),
    [uiPreviewMode],
  );
  const tableRef = useRef<HTMLDivElement>(null);
  const [encounter, setEncounter] = useState<Gen3WildEncounter>("land");
  const [locationIndex, setLocationIndex] = useState(0);
  const [selectedSpecies, setSelectedSpecies] = useState(0);
  const [method, setMethod] = useState<Gen3WildMethod>("method1");
  const [lead, setLead] = useState<Gen3WildLead>("none");
  const [synchronizeNature, setSynchronizeNature] = useState(0);
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("0");
  const [feebasTile, setFeebasTile] = useState(false);
  const [bike, setBike] = useState(false);
  const [item, setItem] = useState<Gen3WildItem>("none");
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen3WildShinyFilter>("any");
  const [gender, setGender] = useState<Gen3WildGenderFilter>("any");
  const [ability, setAbility] = useState<Gen3WildAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(0);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0);
  const [encounterSlotMask, setEncounterSlotMask] = useState(0);
  const [levelMin, setLevelMin] = useState("1");
  const [levelMax, setLevelMax] = useState("100");
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
  const [showStats, setShowStats] = useState(false);
  const [results, setResults] = useState<Gen3WildState[]>([]);
  const [progress, setProgress] = useState<Gen3WildSearchProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen3WildSearchSummary>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    {
      key: "advances",
      direction: "asc",
    },
  );

  const locations = useMemo(
    () =>
      gameData[dataGame(profile.version)].filter(
        (location) =>
          !isGen3WildTanobyChamber(location.name) &&
          location.encounters.some((entry) => entry.kind === encounter),
      ),
    [encounter, profile.version],
  );
  const location = locations[locationIndex] ?? locations[0];
  const area = location
    ? buildArea(profile.version, location, encounter, feebasTile)
    : undefined;
  const speciesOptions = useMemo(() => {
    const unique = new Map<number, number>();
    for (const slot of area?.slots ?? []) {
      const key = (slot.form << 11) | slot.species;
      if (!unique.has(key)) unique.set(key, slot.species);
    }
    return [...unique.entries()].map(([value, species]) => ({
      value,
      species,
      form: value >> 11,
    }));
  }, [area]);
  const selectedSlots = area?.slots.filter(
    (slot) => ((slot.form << 11) | slot.species) === selectedSpecies,
  );
  const selectedLevelRange = selectedSlots?.length
    ? [
        Math.min(...selectedSlots.map((slot) => slot.minLevel)),
        Math.max(...selectedSlots.map((slot) => slot.maxLevel)),
      ]
    : [0, 0];
  const feebasAvailable = area?.feebasLocation ?? false;
  const rockOptions =
    encounter === "rock-smash" &&
    (profile.version === "ruby" ||
      profile.version === "sapphire" ||
      profile.version === "emerald");
  const leadAvailable = profile.version === "emerald";
  const fullEncounterSlotMask = area ? (1 << area.slots.length) - 1 : 0;
  const natureOptions = natureKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const hiddenPowerOptions = hiddenPowerKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const encounterSlotOptions = (area?.slots ?? []).map((_, value) => ({
    label: String(value),
    value,
  }));

  const stateValue = (state: Gen3WildState, key: SortKey): number => {
    const ivIndex = ivKeys.indexOf(key as IvKey);
    if (ivIndex >= 0) {
      return showStats
        ? computeGen3Stats(
            getGen3Personal(state.species, state.form).stats,
            state.ivs,
            state.nature,
            state.level,
          )[ivIndex]
        : state.ivs[ivIndex];
    }
    if (key === "slot") return state.encounterSlot;
    if (key === "hiddenPower") return gen3HiddenPower(state.ivs).type;
    if (key === "power") return gen3HiddenPower(state.ivs).power;
    return state[key as keyof Gen3WildState] as number;
  };
  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        (stateValue(left, sort.key) - stateValue(right, sort.key)) * multiplier,
    );
    // Result values can be derived from the active stat display mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, showStats, sort]);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    setLocationIndex(0);
    setFeebasTile(false);
    setBike(false);
    setItem("none");
  }, [encounter, profile.version]);
  useEffect(() => {
    setSelectedSpecies(0);
    setEncounterSlotMask(0);
    setLevelMin("1");
    setLevelMax("100");
  }, [area?.name, area?.encounter, area?.slots.length, profile.version]);
  useEffect(() => {
    if (!leadAvailable) setLead("none");
    if (profile.deadBattery) setSeed("5A0");
  }, [leadAvailable, profile]);
  useEffect(() => {
    if (lead === "magnet-pull" && encounter !== "land") setLead("none");
    if (lead === "static" && encounter !== "land" && encounter !== "surf")
      setLead("none");
  }, [encounter, lead]);

  const selectSpecies = (value: number) => {
    setSelectedSpecies(value);
    if (!area || value === 0) {
      setEncounterSlotMask(0);
      setLevelMin("1");
      setLevelMax("100");
      return;
    }
    let mask = 0;
    let minimum = 100;
    let maximum = 0;
    area.slots.forEach((slot, index) => {
      if (((slot.form << 11) | slot.species) !== value) return;
      mask |= 1 << index;
      minimum = Math.min(minimum, slot.minLevel);
      maximum = Math.max(maximum, slot.maxLevel);
    });
    setEncounterSlotMask(mask);
    setLevelMin(String(minimum));
    setLevelMax(String(maximum));
  };

  const updateIv = (kind: "min" | "max", index: number, value: string) => {
    const setter = kind === "min" ? setIvMin : setIvMax;
    setter(
      (current) =>
        current.map((entry, currentIndex) =>
          currentIndex === index ? value : entry,
        ) as IvTextValues,
    );
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

  const readFilters = (): Gen3WildFilters =>
    filtersDisabled
      ? {
          shiny: "any",
          gender: "any",
          ability: "any",
          natureMask: NATURE_MASK_ALL,
          hiddenPowerMask: HIDDEN_POWER_MASK_ALL,
          encounterSlotMask: fullEncounterSlotMask,
          levelMin: 1,
          levelMax: 100,
          ivMin: [0, 0, 0, 0, 0, 0],
          ivMax: [31, 31, 31, 31, 31, 31],
        }
      : {
          shiny,
          gender,
          ability,
          natureMask: natureMask || NATURE_MASK_ALL,
          hiddenPowerMask: hiddenPowerMask || HIDDEN_POWER_MASK_ALL,
          encounterSlotMask: encounterSlotMask || fullEncounterSlotMask,
          levelMin: parseDecimal(levelMin) ?? Number.NaN,
          levelMax: parseDecimal(levelMax) ?? Number.NaN,
          ivMin: ivMin.map(
            (value) => parseDecimal(value) ?? Number.NaN,
          ) as Gen3WildFilters["ivMin"],
          ivMax: ivMax.map(
            (value) => parseDecimal(value) ?? Number.NaN,
          ) as Gen3WildFilters["ivMax"],
        };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (!area || status === "calculating") return;
    const request: Gen3WildRequest = {
      seed: parseHex(seed) ?? Number.NaN,
      initialAdvances: parseDecimal(initialAdvances) ?? Number.NaN,
      maxAdvances: parseDecimal(maxAdvances) ?? Number.NaN,
      offset: parseDecimal(offset) ?? Number.NaN,
      method,
      lead: leadAvailable ? lead : "none",
      synchronizeNature,
      feebasTile: feebasAvailable && feebasTile,
      bike: rockOptions && bike,
      item: rockOptions ? item : "none",
      version: profile.version,
      tid: profile.tid,
      sid: profile.sid,
      area,
      filters: readFilters(),
    };
    if (validateGen3WildRequest(request).length > 0) {
      setError(t("invalidWildInput"));
      setStatus("failed");
      return;
    }
    setError("");
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: request.maxAdvances + 1,
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");
    try {
      const nextSummary = await engine.search(request, {
        maxResults: GEN3_WILD_MAX_RESULTS,
        onBatch: (batch) => setResults((current) => current.concat(batch)),
        onProgress: setProgress,
      });
      setSummary(nextSummary);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(
        /initial|module|fetch|wasm/i.test(message)
          ? t("wildWasmMissing")
          : message,
      );
      setStatus("failed");
    }
  };

  const displayStateValue = (state: Gen3WildState, key: SortKey) => {
    if (key === "advances") return String(state.advances);
    if (key === "slot")
      return `${state.encounterSlot}: ${getGen3SpeciesName(i18n.language, state.species, state.form)}`;
    if (key === "pid") return formatHex(state.pid, 8);
    if (key === "shiny")
      return state.shiny === 0
        ? t("wildShinyNo")
        : state.shiny === 1
          ? t("shinyStar")
          : t("shinySquare");
    if (key === "nature") return t(natureKeys[state.nature]);
    if (key === "ability") {
      const abilityId = getGen3Personal(state.species, state.form).abilities[
        state.ability
      ];
      return `${state.ability}: ${getGen3AbilityName(i18n.language, abilityId)}`;
    }
    if (key === "hiddenPower")
      return t(hiddenPowerKeys[gen3HiddenPower(state.ivs).type]);
    if (key === "power") return String(gen3HiddenPower(state.ivs).power);
    if (key === "gender")
      return state.gender === 0
        ? t("male")
        : state.gender === 1
          ? t("female")
          : t("genderless");
    return String(stateValue(state, key));
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
    setStatus("ready");
  };
  const exportCsv = () => {
    const rows = [
      columns.map((column) => t(column.label)),
      ...sortedResults.map((state) =>
        columns.map((column) => displayStateValue(state, column.key)),
      ),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen3wild.csv";
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
  const leadValue =
    lead === "synchronize" ? `synchronize-${synchronizeNature}` : lead;

  return (
    <>
      <form className="static-control-grid" onSubmit={run}>
        <section className="panel static-panel static-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">Gen III / Wild API 2</span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("method")}</span>
              <select
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as Gen3WildMethod)
                }
              >
                <option value="method1">Wild 1</option>
                <option value="method2">Wild 2</option>
                <option value="method4">Wild 4</option>
              </select>
            </label>
            {leadAvailable && (
              <label className="field">
                <span>{t("wildLead")}</span>
                <select
                  value={leadValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value.startsWith("synchronize-")) {
                      setLead("synchronize");
                      setSynchronizeNature(Number(value.slice(12)));
                    } else {
                      setLead(value as Gen3WildLead);
                    }
                  }}
                >
                  <option value="none">{t("wildNone")}</option>
                  <optgroup label={t("wildCuteCharm")}>
                    <option value="cute-charm-m">{t("wildMaleLead")}</option>
                    <option value="cute-charm-f">{t("wildFemaleLead")}</option>
                  </optgroup>
                  <optgroup label={t("wildLevelModifier")}>
                    <option value="hustle">{t("wildHustle")}</option>
                    <option value="pressure">{t("wildPressure")}</option>
                    <option value="vital-spirit">{t("wildVitalSpirit")}</option>
                  </optgroup>
                  <optgroup label={t("wildSlotModifier")}>
                    {encounter === "land" && (
                      <option value="magnet-pull">{t("wildMagnetPull")}</option>
                    )}
                    {(encounter === "land" || encounter === "surf") && (
                      <option value="static">{t("wildStatic")}</option>
                    )}
                  </optgroup>
                  <optgroup label={t("wildSynchronize")}>
                    {natureKeys.map((key, index) => (
                      <option key={key} value={`synchronize-${index}`}>
                        {t(key)}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
            )}
            <label className="field">
              <span>{t("seed")}</span>
              <input
                maxLength={8}
                value={seed}
                onChange={(event) =>
                  setSeed(normalizeHexInput(event.target.value, 8))
                }
              />
            </label>
            <div className="compact-field-row">
              <label className="field">
                <span>{t("initialAdvances")}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  value={initialAdvances}
                  onChange={(event) =>
                    setInitialAdvances(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{t("maxAdvances")}</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  value={maxAdvances}
                  onChange={(event) =>
                    setMaxAdvances(
                      normalizeDecimalInput(event.target.value, 49_999_999, 10),
                    )
                  }
                />
              </label>
            </div>
            <label className="field">
              <span>{t("offset")}</span>
              <input
                inputMode="numeric"
                maxLength={10}
                value={offset}
                onChange={(event) =>
                  setOffset(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
              />
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

        <section className="panel static-panel static-settings-panel">
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
              <span>{t("wildEncounterType")}</span>
              <select
                value={encounter}
                onChange={(event) =>
                  setEncounter(event.target.value as Gen3WildEncounter)
                }
              >
                {(Object.keys(encounterLabels) as Gen3WildEncounter[]).map(
                  (value) => (
                    <option key={value} value={value}>
                      {t(encounterLabels[value])}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="field">
              <span>{t("wildLocation")}</span>
              <select
                value={locationIndex}
                onChange={(event) =>
                  setLocationIndex(Number(event.target.value))
                }
              >
                {locations.map((entry, index) => (
                  <option key={`${entry.name}-${index}`} value={index}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("wildPokemon")}</span>
              <select
                value={selectedSpecies}
                onChange={(event) => selectSpecies(Number(event.target.value))}
              >
                <option value={0}>-</option>
                {speciesOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {getGen3SpeciesName(
                      i18n.language,
                      option.species,
                      option.form,
                    )}
                  </option>
                ))}
              </select>
            </label>
            {rockOptions && (
              <>
                <label className="field">
                  <span>{t("wildItem")}</span>
                  <select
                    value={item}
                    onChange={(event) =>
                      setItem(event.target.value as Gen3WildItem)
                    }
                  >
                    <option value="none">{t("wildNone")}</option>
                    <option value="black-flute">Black Flute</option>
                    <option value="cleanse-tag">Cleanse Tag</option>
                    <option value="white-flute">White Flute</option>
                  </select>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={bike}
                    onChange={(event) => setBike(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Bike</span>
                </label>
              </>
            )}
            {feebasAvailable && (
              <label className="checkbox-field">
                <input
                  checked={feebasTile}
                  onChange={(event) => setFeebasTile(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("wildFeebasTile")}</span>
              </label>
            )}
            <div className="wild-level-display">
              <span>Levels</span>
              <input disabled value={selectedLevelRange[0]} />
              <input disabled value={selectedLevelRange[1]} />
            </div>
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
            <div className="static-filter-selects wild-filter-selects">
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
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("wildEncounterSlot")}
                mask={encounterSlotMask}
                onChange={setEncounterSlotMask}
                options={encounterSlotOptions}
                resetHint={t("checkListResetHint")}
              />
              <label className="field">
                <span>{t("shiny")}</span>
                <select
                  value={shiny}
                  onChange={(event) =>
                    setShiny(event.target.value as Gen3WildShinyFilter)
                  }
                >
                  <option value="any">{t("any")}</option>
                  <option value="star">{t("shinyStar")}</option>
                  <option value="square">{t("shinySquare")}</option>
                  <option value="star-square">{t("shinyStarSquare")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("gender")}</span>
                <select
                  value={gender}
                  onChange={(event) =>
                    setGender(event.target.value as Gen3WildGenderFilter)
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
                  value={ability}
                  onChange={(event) =>
                    setAbility(event.target.value as Gen3WildAbilityFilter)
                  }
                >
                  <option value="any">{t("any")}</option>
                  <option value="first">0</option>
                  <option value="second">1</option>
                </select>
              </label>
            </div>
            <div className="wild-level-filter">
              <span>{t("level")}</span>
              <input
                aria-label={`${t("level")} ${t("minimum")}`}
                inputMode="numeric"
                max="100"
                min="1"
                onChange={(event) =>
                  setLevelMin(normalizeDecimalInput(event.target.value, 100, 3))
                }
                type="number"
                value={levelMin}
              />
              <input
                aria-label={`${t("level")} ${t("maximum")}`}
                inputMode="numeric"
                max="100"
                min="1"
                onChange={(event) =>
                  setLevelMax(normalizeDecimalInput(event.target.value, 100, 3))
                }
                type="number"
                value={levelMax}
              />
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
                    {t(ivLabelKey(key))}
                  </button>
                  <input
                    aria-label={`${t(ivLabelKey(key))} ${t("minimum")}`}
                    inputMode="numeric"
                    max="31"
                    min="0"
                    onChange={(event) =>
                      updateIv(
                        "min",
                        index,
                        normalizeDecimalInput(event.target.value, 31, 2),
                      )
                    }
                    type="number"
                    value={ivMin[index]}
                  />
                  <input
                    aria-label={`${t(ivLabelKey(key))} ${t("maximum")}`}
                    inputMode="numeric"
                    max="31"
                    min="0"
                    onChange={(event) =>
                      updateIv(
                        "max",
                        index,
                        normalizeDecimalInput(event.target.value, 31, 2),
                      )
                    }
                    type="number"
                    value={ivMax[index]}
                  />
                </div>
              ))}
            </div>
            <div className="filter-tool-row">
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
              onClick={clearResults}
              title={t("clear")}
              type="button"
            >
              &times;
            </button>
          </div>
        </div>
        <div
          className="progress-track"
          aria-label={`${progress.percent.toFixed(1)}%`}
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
        {error && <div className="alert error">{error}</div>}
        {summary?.resultLimitReached && (
          <div className="alert warning">{t("limitReached")}</div>
        )}
        <div className="table-shell static-table-shell" ref={tableRef}>
          {sortedResults.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyStatic")}</span>
            </div>
          ) : (
            <div
              className="static-virtual-table wild-virtual-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 38}px` }}
            >
              <div className="static-table-header wild-table-header">
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
                    className="static-table-row wild-table-row"
                    key={`${state.advances}-${state.pid}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 38}px)`,
                    }}
                  >
                    {columns.map((column) => (
                      <span key={column.key}>
                        {displayStateValue(state, column.key)}
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
