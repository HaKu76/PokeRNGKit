import { useVirtualizer } from "@tanstack/react-virtual";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatHex, parseDecimal, parseHex } from "../id/domain";
import type { Gen3Profile } from "../profiles/domain";
import { getGen3SpeciesName } from "../shared/gen3Species";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  GEN3_WILD_MAX_RESULTS,
  isGen3WildTanobyChamber,
  validateGen3WildRequest,
  type Gen3WildArea,
  type Gen3WildEncounter,
  type Gen3WildItem,
  type Gen3WildLead,
  type Gen3WildMethod,
  type Gen3WildRequest,
  type Gen3WildState,
} from "./domain";
import { GEN3_ENCOUNTERS, GEN3_PERSONAL } from "./gen3Data";
import type { Gen3WildSearchEngine, Gen3WildSearchProgress } from "./search";
import { Gen3WildWorkerPool } from "./worker/Gen3WildWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type DataGame = "ruby" | "sapphire" | "emerald" | "fire-red" | "leaf-green";
type SortKey =
  "advances" | "slot" | "species" | "level" | "pid" | "nature" | "shiny";
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
}

const NATURE_MASK_ALL = 0x1ff_ffff;
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
const encounterLabels: Record<Gen3WildEncounter, string> = {
  land: "wildGrass",
  surf: "wildSurfing",
  "rock-smash": "wildRockSmash",
  "old-rod": "wildOldRod",
  "good-rod": "wildGoodRod",
  "super-rod": "wildSuperRod",
};
const gameData = GEN3_ENCOUNTERS as unknown as Record<
  DataGame,
  readonly RawLocation[]
>;

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

export function Gen3WildPanel({ profile }: Gen3WildPanelProps) {
  const { t, i18n } = useTranslation();
  const engine = useMemo<Gen3WildSearchEngine>(
    () => new Gen3WildWorkerPool(),
    [],
  );
  const tableRef = useRef<HTMLDivElement>(null);
  const [encounter, setEncounter] = useState<Gen3WildEncounter>("land");
  const [locationIndex, setLocationIndex] = useState(0);
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
  const [natureMask, setNatureMask] = useState(0);
  const [results, setResults] = useState<Gen3WildState[]>([]);
  const [progress, setProgress] = useState<Gen3WildSearchProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
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
  const feebasAvailable = area?.feebasLocation ?? false;
  const rockOptions =
    encounter === "rock-smash" &&
    (profile.version === "ruby" ||
      profile.version === "sapphire" ||
      profile.version === "emerald");
  const leadAvailable = profile.version === "emerald";

  const sortedResults = useMemo(() => {
    const value = (state: Gen3WildState, key: SortKey) => {
      if (key === "slot") return state.encounterSlot;
      if (key === "species") return state.species;
      return state[key];
    };
    return [...results].sort((left, right) => {
      const difference = value(left, sort.key) - value(right, sort.key);
      return sort.direction === "asc" ? difference : -difference;
    });
  }, [results, sort]);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 10,
  });

  useEffect(() => () => engine.dispose(), [engine]);
  useEffect(() => {
    setLocationIndex(0);
    setFeebasTile(false);
    setBike(false);
    setItem("none");
  }, [encounter, profile.version]);
  useEffect(() => {
    if (!leadAvailable) setLead("none");
    if (profile.deadBattery) setSeed("5A0");
  }, [leadAvailable, profile]);
  useEffect(() => {
    if (lead === "magnet-pull" && encounter !== "land") setLead("none");
    if (lead === "static" && encounter !== "land" && encounter !== "surf")
      setLead("none");
  }, [encounter, lead]);

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (!area) return;
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
      filters: { natureMask: natureMask || NATURE_MASK_ALL },
    };
    if (validateGen3WildRequest(request).length > 0) {
      setError(t("invalidWildInput"));
      setStatus("failed");
      return;
    }
    setError("");
    setResults([]);
    setProgress({
      processedStates: 0,
      totalStates: request.maxAdvances + 1,
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");
    try {
      const summary = await engine.search(request, {
        maxResults: GEN3_WILD_MAX_RESULTS,
        onBatch: (batch) => setResults((current) => current.concat(batch)),
        onProgress: setProgress,
      });
      setStatus(summary.cancelled ? "cancelled" : "completed");
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

  const toggleSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const sortLabel = (key: SortKey) =>
    sort.key === key ? (sort.direction === "asc" ? " ▲" : " ▼") : "";
  const clearResults = () => {
    setResults([]);
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
      [
        "Advance",
        "Slot",
        "Pokemon",
        "Level",
        "PID",
        "HP",
        "Atk",
        "Def",
        "SpA",
        "SpD",
        "Spe",
        "Nature",
        "Shiny",
      ],
      ...sortedResults.map((state) => [
        state.advances,
        state.encounterSlot + 1,
        getGen3SpeciesName(i18n.language, state.species, state.form),
        state.level,
        formatHex(state.pid, 8),
        ...state.ivs,
        t(natureKeys[state.nature]),
        state.shiny === 0
          ? t("shinyNone")
          : state.shiny === 1
            ? t("shinyStar")
            : t("shinySquare"),
      ]),
    ];
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`],
      {
        type: "text/csv;charset=utf-8",
      },
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
  const leadOptions: { value: Gen3WildLead; label: string }[] = [
    { value: "none", label: t("wildNone") },
    { value: "synchronize", label: t("wildSynchronize") },
    { value: "cute-charm-f", label: t("wildCuteCharmFemale") },
    { value: "cute-charm-m", label: t("wildCuteCharmMale") },
    { value: "pressure", label: t("wildPressure") },
    { value: "hustle", label: t("wildHustle") },
    { value: "vital-spirit", label: t("wildVitalSpirit") },
    ...(encounter === "land"
      ? [{ value: "magnet-pull" as const, label: t("wildMagnetPull") }]
      : []),
    ...(encounter === "land" || encounter === "surf"
      ? [{ value: "static" as const, label: t("wildStatic") }]
      : []),
  ];

  return (
    <>
      <form className="static-control-grid" onSubmit={run}>
        <section className="panel static-panel static-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">Gen III / Wild API 1</span>
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
                <option value="method1">{t("method1")}</option>
                <option value="method2">Method 2</option>
                <option value="method4">{t("method4")}</option>
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
            <div className="compact-field-row">
              <label className="field">
                <span>{t("initialAdvances")}</span>
                <input
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
              <h2>{t("wildEncounterType")}</h2>
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
              <span>{t("wildLead")}</span>
              <select
                disabled={!leadAvailable}
                value={lead}
                onChange={(event) =>
                  setLead(event.target.value as Gen3WildLead)
                }
              >
                {leadOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {leadAvailable && lead === "synchronize" && (
              <label className="field">
                <span>{t("nature")}</span>
                <select
                  value={synchronizeNature}
                  onChange={(event) =>
                    setSynchronizeNature(Number(event.target.value))
                  }
                >
                  {natureKeys.map((key, index) => (
                    <option key={key} value={index}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </label>
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
                    <option value="black-flute">{t("wildBlackFlute")}</option>
                    <option value="cleanse-tag">{t("wildCleanseTag")}</option>
                    <option value="white-flute">{t("wildWhiteFlute")}</option>
                  </select>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={bike}
                    onChange={(event) => setBike(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("wildBike")}</span>
                </label>
              </>
            )}
          </div>
        </section>

        <section className="panel static-panel static-filter-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">03</span>
              <h2>{t("filters")}</h2>
            </div>
          </div>
          <div className="nature-check-grid">
            {natureKeys.map((key, index) => (
              <label key={key}>
                <input
                  checked={(natureMask & (1 << index)) !== 0}
                  onChange={(event) =>
                    setNatureMask((current) =>
                      event.target.checked
                        ? current | (1 << index)
                        : current & ~(1 << index),
                    )
                  }
                  type="checkbox"
                />
                <span>{t(key)}</span>
              </label>
            ))}
          </div>
          <div className="panel-actions">
            <button
              className="secondary-action"
              onClick={() => setNatureMask(0)}
              type="button"
            >
              {t("disableFilters")}
            </button>
          </div>
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
              {String(results.length)} / {String(progress.processedStates)}
            </span>
            <button
              className="secondary-action"
              disabled={!results.length}
              onClick={exportCsv}
              type="button"
            >
              {t("exportCsv")}
            </button>
            <button
              className="secondary-action"
              disabled={!results.length}
              onClick={clearResults}
              type="button"
            >
              {t("clear")}
            </button>
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="table-shell static-table-shell" ref={tableRef}>
          {sortedResults.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyStatic")}</span>
            </div>
          ) : (
            <div
              className="static-virtual-table"
              style={{ height: `${rowVirtualizer.getTotalSize() + 38}px` }}
            >
              <div className="static-table-header wild-table-header">
                {(
                  [
                    ["advances", "rowAdvance"],
                    ["slot", "wildSlot"],
                    ["species", "pokemon"],
                    ["level", "level"],
                    ["pid", "rowPid"],
                  ] as [SortKey, string][]
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
                <span>IVs</span>
                <button onClick={() => toggleSort("nature")} type="button">
                  {t("nature")}
                  {sortLabel("nature")}
                </button>
                <button onClick={() => toggleSort("shiny")} type="button">
                  {t("shiny")}
                  {sortLabel("shiny")}
                </button>
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
                    <span>{String(state.advances)}</span>
                    <span>{String(state.encounterSlot + 1)}</span>
                    <span>
                      {getGen3SpeciesName(
                        i18n.language,
                        state.species,
                        state.form,
                      )}
                    </span>
                    <span>{String(state.level)}</span>
                    <span>{formatHex(state.pid, 8)}</span>
                    <span>{state.ivs.join("/")}</span>
                    <span>{t(natureKeys[state.nature])}</span>
                    <span>
                      {state.shiny === 0
                        ? t("shinyNone")
                        : state.shiny === 1
                          ? t("shinyStar")
                          : t("shinySquare")}
                    </span>
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
