import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import type { ThreeDsProfile } from "../3dsprofiles/domain";
import { GEN6_STATIONARY_NATURES } from "../gen6stationary/data";
import {
  GEN6_WILD_SLOT_COUNT,
  gen6WildAreas,
  gen6WildDefaultFilters,
  gen6WildLocationName,
  gen6WildProfile,
  gen6WildSlots,
  validateGen6WildRequest,
  type Gen6WildFilters,
  type Gen6WildIvTuple,
  type Gen6WildLead,
  type Gen6WildResult,
} from "./domain";
import {
  GEN6_WILD_SLOT_DISTRIBUTIONS,
  type Gen6WildType,
  type Gen6WildVersion,
} from "./data";
import { Gen6WildUiPreviewEngine } from "./preview/Gen6WildUiPreviewEngine";
import type {
  Gen6WildEngine,
  Gen6WildProgress,
  Gen6WildSummary,
} from "./search";
import { Gen6WildWorker } from "./worker/Gen6WildWorker";
import "./Gen6WildPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type SortDirection = "asc" | "desc";
type SortKey =
  | "frame"
  | "random"
  | "ec"
  | "pid"
  | "species"
  | "level"
  | "slot"
  | "nature"
  | "ability"
  | "gender"
  | "shiny"
  | "item"
  | "frameUsed";

const TYPES: readonly Gen6WildType[] = [
  "normal",
  "horde",
  "rock-smash",
  "fishing",
];
const LEADS: readonly { value: Gen6WildLead; label: string }[] = [
  { value: "none", label: "-" },
  { value: "synchronize", label: "Synchronize" },
  { value: "cute-charm-male", label: "Cute Charm ♂" },
  { value: "cute-charm-female", label: "Cute Charm ♀" },
  { value: "static", label: "Static" },
  { value: "magnet-pull", label: "Magnet Pull" },
  { value: "compound-eyes", label: "Compound Eyes" },
  { value: "pressure", label: "Pressure | Hustle | Vital Spirit" },
  { value: "black-flute", label: "Black Flute" },
  { value: "white-flute", label: "White Flute" },
];
const IV_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const EMPTY_SLOTS = Array.from({ length: GEN6_WILD_SLOT_COUNT }, () => ({
  species: 1,
  level: 1,
  genderRatio: 127,
  randomGender: true,
  fixedThreeIv: false,
}));

function parseDecimal(value: string) {
  return value.trim() === "" ? 0 : Number.parseInt(value, 10);
}

function parseHex(value: string) {
  const normalized = value.trim().replace(/^0x/i, "");
  return normalized === "" ? 0 : Number.parseInt(normalized, 16);
}

function formatHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function csvCell(value: unknown) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function compare(left: unknown, right: unknown) {
  return left === right ? 0 : Number(left) < Number(right) ? -1 : 1;
}

export function Gen6WildPanel({
  profile,
  uiPreviewMode,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const language =
    i18n.resolvedLanguage === "zh"
      ? "zh"
      : i18n.resolvedLanguage === "ja"
        ? "ja"
        : "en";
  const profileDefaults = gen6WildProfile(profile);
  const engine = useMemo<Gen6WildEngine>(
    () =>
      uiPreviewMode ? new Gen6WildUiPreviewEngine() : new Gen6WildWorker(),
    [uiPreviewMode],
  );
  const [version, setVersion] = useState<Gen6WildVersion>(
    profileDefaults.version,
  );
  const [encounterType, setEncounterType] = useState<Gen6WildType>("normal");
  const [areaId, setAreaId] = useState("");
  const [hordeSlot, setHordeSlot] = useState("1");
  const [rod, setRod] = useState("0");
  const [seed, setSeed] = useState("0");
  const [minFrame, setMinFrame] = useState("0");
  const [maxFrame, setMaxFrame] = useState("50000");
  const [delay, setDelay] = useState("0");
  const [tinySeed, setTinySeed] = useState("0");
  const [tinyFrame, setTinyFrame] = useState("0");
  const [tinySynced, setTinySynced] = useState(false);
  const [tsv, setTsv] = useState(String(profileDefaults.tsv));
  const [trv, setTrv] = useState(
    profileDefaults.trv.toString(16).toUpperCase(),
  );
  const [shinyCharm, setShinyCharm] = useState(profileDefaults.shinyCharm);
  const [considerDelay, setConsiderDelay] = useState(true);
  const [lead, setLead] = useState<Gen6WildLead>("none");
  const [syncNature, setSyncNature] = useState("0");
  const [encounterRate, setEncounterRate] = useState("100");
  const [partyPokemon, setPartyPokemon] = useState("0");
  const [pidRolls, setPidRolls] = useState("1");
  const [compoundEyes, setCompoundEyes] = useState(false);
  const [hiddenAbility, setHiddenAbility] = useState(false);
  const [flute, setFlute] = useState<-1 | 0 | 1>(0);
  const [filters, setFilters] = useState<Gen6WildFilters>(
    gen6WildDefaultFilters(),
  );
  const [resultLimit, setResultLimit] = useState("100000");
  const [customSlots, setCustomSlots] = useState(EMPTY_SLOTS);
  const [results, setResults] = useState<Gen6WildResult[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen6WildProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen6WildSummary>();
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "frame",
    direction: "asc",
  });
  const abortRef = useRef<AbortController | undefined>(undefined);
  const tableRef = useRef<HTMLDivElement>(null);

  const areas = useMemo(
    () => gen6WildAreas(version, encounterType),
    [encounterType, version],
  );
  const selectedArea = areas.find((area) => area.id === areaId) ?? areas[0];
  const generatedSlots = useMemo(
    () =>
      gen6WildSlots(
        selectedArea,
        encounterType,
        parseDecimal(hordeSlot),
        parseDecimal(rod),
        version,
      ),
    [encounterType, hordeSlot, rod, selectedArea, version],
  );
  const slots =
    generatedSlots.length > 0
      ? generatedSlots
      : customSlots.slice(
          0,
          encounterType === "normal"
            ? 12
            : encounterType === "horde"
              ? 5
              : encounterType === "rock-smash"
                ? 5
                : 3,
        );
  const distribution = GEN6_WILD_SLOT_DISTRIBUTIONS[encounterType].slice(
    0,
    slots.length,
  );
  const natureNames = GEN6_STATIONARY_NATURES[language];
  const selectedAreaLabel = selectedArea
    ? gen6WildLocationName(selectedArea, language)
    : t("gen6WildCustomSlots");

  useEffect(() => {
    if (selectedArea && selectedArea.id !== areaId) setAreaId(selectedArea.id);
    if (!selectedArea && areaId) setAreaId("");
  }, [areaId, selectedArea]);
  useEffect(() => {
    setAreaId("");
    setHordeSlot("1");
    setRod("0");
  }, [encounterType, version]);
  useEffect(() => {
    setTsv(String(profileDefaults.tsv));
    setTrv(profileDefaults.trv.toString(16).toUpperCase());
    setShinyCharm(profileDefaults.shinyCharm);
    setVersion(profileDefaults.version);
  }, [
    profileDefaults.shinyCharm,
    profileDefaults.trv,
    profileDefaults.tsv,
    profileDefaults.version,
  ]);
  useEffect(() => () => engine.dispose(), [engine]);

  const sortedResults = useMemo(() => {
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) => compare(left[sort.key], right[sort.key]) * factor,
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

  function updateFilter<K extends keyof Gen6WildFilters>(
    key: K,
    value: Gen6WildFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function updateIv(key: "ivMin" | "ivMax", index: number, value: string) {
    setFilters((current) => {
      const next = [...current[key]] as Gen6WildIvTuple;
      next[index] = parseDecimal(value);
      return { ...current, [key]: next };
    });
  }

  function updateCustomSlot(
    index: number,
    key: "species" | "level",
    value: string,
  ) {
    setCustomSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [key]: parseDecimal(value) } : slot,
      ),
    );
  }

  function buildRequest() {
    const request = {
      version,
      encounterType,
      seed: parseHex(seed),
      minFrame: parseDecimal(minFrame),
      maxFrame: parseDecimal(maxFrame),
      delay: parseDecimal(delay),
      considerDelay,
      tsv: parseDecimal(tsv),
      trv: parseHex(trv),
      shinyCharm,
      syncNature: lead === "synchronize" ? parseDecimal(syncNature) : null,
      lead,
      tinySeed: parseHex(tinySeed),
      tinyFrame: parseDecimal(tinyFrame),
      tinySynced,
      encounterRate: parseDecimal(encounterRate),
      partyPokemon: parseDecimal(partyPokemon),
      pidRolls: parseDecimal(pidRolls),
      compoundEyes,
      hiddenAbility,
      flute,
      hordeSlot: parseDecimal(hordeSlot),
      slots,
      slotDistribution: distribution,
      filters: {
        ...filters,
        ivMin: [...filters.ivMin] as Gen6WildIvTuple,
        ivMax: [...filters.ivMax] as Gen6WildIvTuple,
      },
      resultLimit: parseDecimal(resultLimit),
    };
    return validateGen6WildRequest(request);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (status === "calculating") return;
    try {
      const request = buildRequest();
      abortRef.current?.abort();
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
        cause instanceof Error ? cause.message : t("invalidGen6WildInput"),
      );
      setStatus("failed");
    } finally {
      abortRef.current = undefined;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    engine.cancel();
  }

  function exportCsv() {
    if (sortedResults.length === 0) return;
    const headers = [
      "Frame",
      "Random",
      "EC",
      "PID",
      ...IV_LABELS,
      "Nature",
      "Ability",
      "Gender",
      "Shiny",
      "Species",
      "Level",
      "Slot",
      "Item",
      "Adv.",
    ];
    const rows = sortedResults.map((result) => [
      result.frame,
      formatHex(result.random),
      formatHex(result.ec),
      formatHex(result.pid),
      ...result.ivs,
      natureNames[result.nature],
      result.ability,
      result.gender === 1
        ? t("male")
        : result.gender === 2
          ? t("female")
          : t("genderless"),
      result.shiny,
      result.species,
      result.level,
      result.slot,
      result.item,
      result.frameUsed,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "gen6-wild-results.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }

  function cell(result: Gen6WildResult, key: SortKey) {
    if (key === "random" || key === "ec" || key === "pid")
      return formatHex(result[key]);
    if (key === "nature") return natureNames[result.nature] ?? result.nature;
    if (key === "gender")
      return result.gender === 1 ? "♂" : result.gender === 2 ? "♀" : "-";
    if (key === "shiny")
      return result.shiny === 2
        ? t("shinySquare")
        : result.shiny === 1
          ? t("shinyStar")
          : "-";
    return String(result[key]);
  }

  const statusText =
    status === "calculating"
      ? `${progress.percent.toFixed(1)}%`
      : status === "completed"
        ? `${results.length}`
        : status === "cancelled"
          ? t("cancel")
          : status === "failed"
            ? t("invalidGen6WildInput")
            : t("ready");
  const fields = [
    ["frame", t("gen6StationaryFrame")],
    ["random", "Random"],
    ["ec", "EC"],
    ["pid", "PID"],
    ["species", t("species")],
    ["level", t("level")],
    ["slot", t("gen6WildSlot")],
    ["nature", t("nature")],
    ["ability", t("ability")],
    ["gender", t("gender")],
    ["shiny", t("shiny")],
    ["item", t("gen6WildItem")],
    ["frameUsed", t("gen6StationaryFrameUsed")],
  ] as const;

  return (
    <form className="gen6wild-panel" onSubmit={submit}>
      <div className="gen6wild-workspace">
        <section className="panel gen6wild-controls">
          <header className="gen6wild-heading">
            <div>
              <Play aria-hidden="true" size={18} />
              <h2>{t("gen6WildSetup")}</h2>
            </div>
            <strong>{statusText}</strong>
          </header>
          <div className="gen6wild-section">
            <h3>{t("rngInfo")}</h3>
            <div className="gen6wild-grid">
              <label className="field">
                <span>{t("gen6GameVersion")}</span>
                <select
                  value={version}
                  onChange={(event) =>
                    setVersion(event.target.value as Gen6WildVersion)
                  }
                >
                  <option value="x">X</option>
                  <option value="y">Y</option>
                  <option value="omega-ruby">Omega Ruby</option>
                  <option value="alpha-sapphire">Alpha Sapphire</option>
                </select>
              </label>
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
              <label className="field">
                <span>{t("gen6StationaryFrameRange")}</span>
                <input
                  inputMode="numeric"
                  value={minFrame}
                  onChange={(event) =>
                    setMinFrame(normalizeDecimalInput(event.target.value, 10))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6WildMaxFrame")}</span>
                <input
                  inputMode="numeric"
                  value={maxFrame}
                  onChange={(event) =>
                    setMaxFrame(normalizeDecimalInput(event.target.value, 10))
                  }
                />
              </label>
              <label className="field">
                <span>TSV</span>
                <input
                  inputMode="numeric"
                  value={tsv}
                  onChange={(event) =>
                    setTsv(normalizeDecimalInput(event.target.value, 5))
                  }
                />
              </label>
              <label className="field">
                <span>TRV</span>
                <input
                  maxLength={1}
                  value={trv}
                  onChange={(event) =>
                    setTrv(normalizeHexInput(event.target.value, 1))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6WildDelay")}</span>
                <input
                  inputMode="numeric"
                  value={delay}
                  onChange={(event) =>
                    setDelay(normalizeDecimalInput(event.target.value, 4))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6WildResultLimit")}</span>
                <input
                  inputMode="numeric"
                  value={resultLimit}
                  onChange={(event) =>
                    setResultLimit(normalizeDecimalInput(event.target.value, 6))
                  }
                />
              </label>
            </div>
            <div className="gen6wild-checks">
              <label>
                <input
                  checked={shinyCharm}
                  onChange={(event) => setShinyCharm(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6WildShinyCharm")}
              </label>
              <label>
                <input
                  checked={considerDelay}
                  onChange={(event) => setConsiderDelay(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6WildConsiderDelay")}
              </label>
            </div>
          </div>
          <div className="gen6wild-section">
            <h3>{t("gen6WildEncounter")}</h3>
            <div className="gen6wild-grid">
              <label className="field">
                <span>{t("gen6WildEncounterType")}</span>
                <select
                  value={encounterType}
                  onChange={(event) =>
                    setEncounterType(event.target.value as Gen6WildType)
                  }
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(
                        `gen6WildType${type === "rock-smash" ? "RockSmash" : type.charAt(0).toUpperCase() + type.slice(1)}`,
                      )}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("gen6WildLocation")}</span>
                <select
                  value={selectedArea?.id ?? ""}
                  onChange={(event) => setAreaId(event.target.value)}
                >
                  <option value="">{t("gen6WildCustomSlots")}</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {gen6WildLocationName(area, language)}
                    </option>
                  ))}
                </select>
              </label>
              {encounterType === "horde" && (
                <label className="field">
                  <span>{t("gen6WildHordeSlot")}</span>
                  <select
                    value={hordeSlot}
                    onChange={(event) => setHordeSlot(event.target.value)}
                  >
                    {[1, 2, 3].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {encounterType === "fishing" && (
                <label className="field">
                  <span>{t("gen6WildRod")}</span>
                  <select
                    value={rod}
                    onChange={(event) => setRod(event.target.value)}
                  >
                    <option value="0">{t("gen6WildOldRod")}</option>
                    <option value="1">{t("gen6WildGoodRod")}</option>
                    <option value="2">{t("gen6WildSuperRod")}</option>
                  </select>
                </label>
              )}
              <label className="field">
                <span>{t("gen6WildEncounterRate")}</span>
                <input
                  inputMode="numeric"
                  value={encounterRate}
                  onChange={(event) =>
                    setEncounterRate(
                      normalizeDecimalInput(event.target.value, 3),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6WildPartyPokemon")}</span>
                <input
                  inputMode="numeric"
                  value={partyPokemon}
                  onChange={(event) =>
                    setPartyPokemon(
                      normalizeDecimalInput(event.target.value, 1),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6WildPidRolls")}</span>
                <input
                  inputMode="numeric"
                  value={pidRolls}
                  onChange={(event) =>
                    setPidRolls(normalizeDecimalInput(event.target.value, 2))
                  }
                />
              </label>
            </div>
            {!selectedArea && (
              <div className="gen6wild-custom-slots">
                <strong>{t("gen6WildCustomSlots")}</strong>
                {slots.map((slot, index) => (
                  <label className="gen6wild-slot-editor" key={index}>
                    <span>{index + 1}</span>
                    <input
                      aria-label={`${t("species")} ${index + 1}`}
                      inputMode="numeric"
                      value={slot.species}
                      onChange={(event) =>
                        updateCustomSlot(index, "species", event.target.value)
                      }
                    />
                    <input
                      aria-label={`${t("level")} ${index + 1}`}
                      inputMode="numeric"
                      value={slot.level}
                      onChange={(event) =>
                        updateCustomSlot(index, "level", event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="gen6wild-section">
            <h3>{t("gen6WildTiny")}</h3>
            <div className="gen6wild-grid">
              <label className="field">
                <span>{t("gen6WildTinySeed")}</span>
                <input
                  maxLength={8}
                  value={tinySeed}
                  onChange={(event) =>
                    setTinySeed(normalizeHexInput(event.target.value, 8))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6WildTinyFrame")}</span>
                <input
                  inputMode="numeric"
                  value={tinyFrame}
                  onChange={(event) =>
                    setTinyFrame(normalizeDecimalInput(event.target.value, 10))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6WildLead")}</span>
                <select
                  value={lead}
                  onChange={(event) =>
                    setLead(event.target.value as Gen6WildLead)
                  }
                >
                  {LEADS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              {lead === "synchronize" && (
                <label className="field">
                  <span>{t("gen6WildSyncNature")}</span>
                  <select
                    value={syncNature}
                    onChange={(event) => setSyncNature(event.target.value)}
                  >
                    {natureNames.map((name, index) => (
                      <option key={index} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="gen6wild-checks">
              <label>
                <input
                  checked={tinySynced}
                  onChange={(event) => setTinySynced(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6WildTinySynced")}
              </label>
              <label>
                <input
                  checked={compoundEyes}
                  onChange={(event) => setCompoundEyes(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6WildCompoundEyes")}
              </label>
              <label>
                <input
                  checked={hiddenAbility}
                  onChange={(event) => setHiddenAbility(event.target.checked)}
                  type="checkbox"
                />
                {t("gen6WildHiddenAbility")}
              </label>
              <label>
                <span>{t("gen6WildFlute")}</span>
                <select
                  value={flute}
                  onChange={(event) =>
                    setFlute(Number(event.target.value) as -1 | 0 | 1)
                  }
                >
                  <option value="0">-</option>
                  <option value="1">+</option>
                  <option value="-1">−</option>
                </select>
              </label>
            </div>
          </div>
          <div className="gen6wild-section">
            <h3>{t("filters")}</h3>
            <div className="gen6wild-grid">
              <label className="field">
                <span>{t("shiny")}</span>
                <select
                  value={filters.shiny}
                  onChange={(event) =>
                    updateFilter(
                      "shiny",
                      event.target.value as Gen6WildFilters["shiny"],
                    )
                  }
                >
                  <option value="any">{t("any")}</option>
                  <option value="shiny">{t("shiny")}</option>
                  <option value="square">{t("shinySquare")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("gender")}</span>
                <select
                  value={filters.gender}
                  onChange={(event) =>
                    updateFilter(
                      "gender",
                      event.target.value as Gen6WildFilters["gender"],
                    )
                  }
                >
                  <option value="any">{t("any")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                  <option value="genderless">{t("genderless")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("ability")}</span>
                <select
                  value={filters.ability}
                  onChange={(event) =>
                    updateFilter(
                      "ability",
                      event.target.value as Gen6WildFilters["ability"],
                    )
                  }
                >
                  <option value="any">{t("any")}</option>
                  <option value="first">1</option>
                  <option value="second">2</option>
                  <option value="hidden">H</option>
                </select>
              </label>
              <label className="field">
                <span>{t("gen6WildItem")}</span>
                <select
                  value={filters.item}
                  onChange={(event) =>
                    updateFilter(
                      "item",
                      event.target.value as Gen6WildFilters["item"],
                    )
                  }
                >
                  <option value="any">{t("any")}</option>
                  <option value="common">{t("gen6WildItemCommon")}</option>
                  <option value="rare">{t("gen6WildItemRare")}</option>
                  <option value="very-rare">{t("gen6WildItemVeryRare")}</option>
                  <option value="none">{t("none")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("gen6WildPerfectValue")}</span>
                <input
                  inputMode="numeric"
                  value={filters.perfectIvValue}
                  onChange={(event) =>
                    updateFilter(
                      "perfectIvValue",
                      parseDecimal(event.target.value),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6WildPerfectCount")}</span>
                <input
                  inputMode="numeric"
                  value={filters.perfectIvCount}
                  onChange={(event) =>
                    updateFilter(
                      "perfectIvCount",
                      parseDecimal(event.target.value),
                    )
                  }
                />
              </label>
            </div>
            <div className="gen6wild-iv-grid">
              {IV_LABELS.map((label, index) => (
                <label className="field" key={label}>
                  <span>{label}</span>
                  <div>
                    <input
                      inputMode="numeric"
                      value={filters.ivMin[index]}
                      onChange={(event) =>
                        updateIv("ivMin", index, event.target.value)
                      }
                    />
                    <span>–</span>
                    <input
                      inputMode="numeric"
                      value={filters.ivMax[index]}
                      onChange={(event) =>
                        updateIv("ivMax", index, event.target.value)
                      }
                    />
                  </div>
                </label>
              ))}
            </div>
            <label className="gen6wild-ignore">
              <input
                checked={filters.disabled}
                onChange={(event) =>
                  updateFilter("disabled", event.target.checked)
                }
                type="checkbox"
              />
              {t("ignoreFilters")}
            </label>
          </div>
          <div className="gen6wild-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={16} />
              {t("generate")}
            </button>
            <button
              disabled={status !== "calculating"}
              onClick={cancel}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
              {t("cancel")}
            </button>
            <button
              disabled={results.length === 0}
              onClick={exportCsv}
              type="button"
            >
              <Download aria-hidden="true" size={16} />
              CSV
            </button>
            <button
              disabled={results.length === 0}
              onClick={() => setResults([])}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
              {t("clear")}
            </button>
          </div>
          {status === "calculating" && (
            <progress max={100} value={progress.percent} />
          )}
          {(error || summary) && (
            <p className={error ? "gen6wild-error" : "gen6wild-summary"}>
              {error ||
                `${summary?.resultCount ?? 0} / ${summary?.processedStates ?? 0}`}
            </p>
          )}
        </section>
        <section className="panel gen6wild-results-panel">
          <header className="gen6wild-heading">
            <div>
              <h2>{t("gen6WildModule")}</h2>
              <small>{selectedAreaLabel}</small>
            </div>
            <span>{results.length.toLocaleString()}</span>
          </header>
          <div className="gen6wild-results" ref={tableRef}>
            <div
              className="gen6wild-table"
              style={{ height: rowVirtualizer.getTotalSize() + 42 }}
            >
              <div className="gen6wild-table-head">
                {fields.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => toggleSort(key)}
                    type="button"
                  >
                    {label}
                    {sort.key === key
                      ? sort.direction === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                ))}
              </div>
              {rowVirtualizer.getVirtualItems().map((item) => {
                const result = sortedResults[item.index];
                return (
                  <div
                    className="gen6wild-table-row"
                    key={`${result.frame}-${result.slot}-${item.index}`}
                    style={{ transform: `translateY(${item.start + 42}px)` }}
                  >
                    {fields.map(([key]) => (
                      <span key={key}>
                        {key === "species"
                          ? result.species
                          : key === "level"
                            ? result.level
                            : key === "slot"
                              ? result.slot
                              : cell(result, key)}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
            {results.length === 0 && (
              <div className="gen6wild-empty">
                {status === "failed"
                  ? t("invalidGen6WildInput")
                  : t("emptyGen6Wild")}
              </div>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}
