import { Select } from "../shared/Select";
import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { formatHex, parseDecimal, parseHex } from "../id/domain";
import type { Gen3Profile } from "../profiles/domain";
import { getGen3AbilityName } from "../shared/gen3Abilities";
import { gen3HiddenPower } from "../shared/gen3HiddenPower";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { getGen3Personal } from "../shared/gen3Personal";
import { getGen3SpeciesName } from "../shared/gen3Species";
import { computeGen3Stats } from "../shared/gen3Stats";
import { POKE_SPOT_LOCATIONS } from "./encounters";
import {
  validateGen3PokeSpotRequest,
  type Gen3PokeSpotFilters,
  type Gen3PokeSpotState,
  type PokeSpotAbilityFilter,
  type PokeSpotGenderFilter,
  type PokeSpotShinyFilter,
} from "./domain";
import { Gen3PokeSpotUiPreviewEngine } from "./preview/Gen3PokeSpotUiPreviewEngine";
import type {
  Gen3PokeSpotEngine,
  Gen3PokeSpotProgress,
  Gen3PokeSpotSummary,
} from "./search";
import { Gen3PokeSpotWorkerPool } from "./worker/Gen3PokeSpotWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
const NATURE_MASK_ALL = 0x1ff_ffff;
const HIDDEN_POWER_MASK_ALL = 0xffff;
const SLOT_MASK_ALL = 7;
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
const ivKeys = [
  "ivHp",
  "ivAttack",
  "ivDefense",
  "ivSpecialAttack",
  "ivSpecialDefense",
  "ivSpeed",
] as const;

export function Gen3PokeSpotPanel({
  onOpenIvCalculator,
  profile,
  uiPreviewMode,
}: {
  onOpenIvCalculator(): void;
  profile: Gen3Profile;
  uiPreviewMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const engine = useMemo<Gen3PokeSpotEngine>(
    () =>
      uiPreviewMode
        ? new Gen3PokeSpotUiPreviewEngine()
        : new Gen3PokeSpotWorkerPool(),
    [uiPreviewMode],
  );
  const [location, setLocation] = useState<0 | 1 | 2>(0);
  const [selectedSpecies, setSelectedSpecies] = useState(0);
  const [foodSeed, setFoodSeed] = useState("");
  const [encounterSeed, setEncounterSeed] = useState("");
  const [foodInitialAdvances, setFoodInitialAdvances] = useState("0");
  const [foodMaxAdvances, setFoodMaxAdvances] = useState("10000");
  const [encounterInitialAdvances, setEncounterInitialAdvances] = useState("0");
  const [encounterMaxAdvances, setEncounterMaxAdvances] = useState("10000");
  const [foodOffset, setFoodOffset] = useState("0");
  const [encounterOffset, setEncounterOffset] = useState("0");
  const [shiny, setShiny] = useState<PokeSpotShinyFilter>("any");
  const [gender, setGender] = useState<PokeSpotGenderFilter>("any");
  const [ability, setAbility] = useState<PokeSpotAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(0);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0);
  const [slotMask, setSlotMask] = useState(0);
  const [ivMin, setIvMin] = useState<IvText>(["0", "0", "0", "0", "0", "0"]);
  const [ivMax, setIvMax] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [showStats, setShowStats] = useState(false);
  const [states, setStates] = useState<Gen3PokeSpotState[]>([]);
  const [progress, setProgress] = useState<Gen3PokeSpotProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Gen3PokeSpotSummary>();
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");

  const activeLocation = POKE_SPOT_LOCATIONS[location];
  const natureOptions = natureKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const hiddenPowerOptions = hiddenPowerKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const slotOptions = activeLocation.slots.map((slot, value) => ({
    label: `${value}: ${getGen3SpeciesName(i18n.language, slot.species)}`,
    value,
  }));
  const parseIvs = (values: IvText) =>
    values.map(
      (value) => parseDecimal(value) ?? Number.NaN,
    ) as Gen3PokeSpotFilters["ivMin"];

  useEffect(() => () => engine.dispose(), [engine]);

  const selectSpecies = (species: number) => {
    setSelectedSpecies(species);
    setSlotMask(
      species === 0
        ? 0
        : activeLocation.slots.reduce(
            (mask, slot, index) =>
              slot.species === species ? mask | (1 << index) : mask,
            0,
          ),
    );
  };
  const updateIv = (kind: "min" | "max", index: number, value: string) => {
    const setter = kind === "min" ? setIvMin : setIvMax;
    setter(
      (current) =>
        current.map((entry, position) =>
          position === index ? value : entry,
        ) as IvText,
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
        current.map((entry, position) =>
          position === index ? minimum : entry,
        ) as IvText,
    );
    setIvMax(
      (current) =>
        current.map((entry, position) =>
          position === index ? maximum : entry,
        ) as IvText,
    );
  };
  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;
    const request = {
      foodSeed: parseHex(foodSeed) ?? 0,
      encounterSeed: parseHex(encounterSeed) ?? 0,
      foodInitialAdvances: parseDecimal(foodInitialAdvances) ?? 0,
      foodMaxAdvances: parseDecimal(foodMaxAdvances) ?? 0,
      encounterInitialAdvances: parseDecimal(encounterInitialAdvances) ?? 0,
      encounterMaxAdvances: parseDecimal(encounterMaxAdvances) ?? 0,
      foodOffset: parseDecimal(foodOffset) ?? 0,
      encounterOffset: parseDecimal(encounterOffset) ?? 0,
      location,
      tid: profile.tid,
      sid: profile.sid,
      filters: {
        shiny,
        gender,
        ability,
        natureMask: natureMask || NATURE_MASK_ALL,
        hiddenPowerMask: hiddenPowerMask || HIDDEN_POWER_MASK_ALL,
        slotMask: slotMask || SLOT_MASK_ALL,
        ivMin: parseIvs(ivMin),
        ivMax: parseIvs(ivMax),
      },
    };
    if (validateGen3PokeSpotRequest(request).length) {
      setError(t("invalidPokeSpotInput"));
      setStatus("failed");
      return;
    }
    setError("");
    setStates([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates:
        (request.foodMaxAdvances + 1) * (request.encounterMaxAdvances + 1),
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");
    try {
      const next = await engine.search(request, {
        onBatch: (batch) => setStates((current) => current.concat(batch)),
        onProgress: setProgress,
      });
      setSummary(next);
      setProgress(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };
  const displayIv = (state: Gen3PokeSpotState, index: number) =>
    showStats
      ? computeGen3Stats(
          getGen3Personal(state.species).stats,
          state.ivs,
          state.nature,
          state.level,
        )[index]
      : state.ivs[index];
  const displayAbility = (state: Gen3PokeSpotState) => {
    const abilityId = getGen3Personal(state.species).abilities[state.ability];
    return `${state.ability}: ${getGen3AbilityName(i18n.language, abilityId)}`;
  };
  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];

  return (
    <>
      <form
        className="static-control-grid gen3static-control-grid pokespot-control-grid"
        onSubmit={run}
      >
        <section className="panel static-panel static-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">XDRNG / XD</span>
          </div>
          <div className="static-form-stack">
            <div className="pokespot-paired-field">
              <span>{t("pokeSpotSeed")}</span>
              <input
                aria-label={`${t("pokeSpotSeed")} / Food`}
                inputMode="text"
                maxLength={8}
                onChange={(event) =>
                  setFoodSeed(normalizeHexInput(event.target.value, 8))
                }
                value={foodSeed}
              />
              <input
                aria-label={`${t("pokeSpotSeed")} / Encounter`}
                inputMode="text"
                maxLength={8}
                onChange={(event) =>
                  setEncounterSeed(normalizeHexInput(event.target.value, 8))
                }
                value={encounterSeed}
              />
            </div>
            {[
              {
                label: t("foodAdvances"),
                initial: foodInitialAdvances,
                maximum: foodMaxAdvances,
                setInitial: setFoodInitialAdvances,
                setMaximum: setFoodMaxAdvances,
              },
              {
                label: t("encounterAdvances"),
                initial: encounterInitialAdvances,
                maximum: encounterMaxAdvances,
                setInitial: setEncounterInitialAdvances,
                setMaximum: setEncounterMaxAdvances,
              },
            ].map(({ label, initial, maximum, setInitial, setMaximum }) => (
              <div className="pokespot-paired-field" key={label}>
                <span>{label}</span>
                <input
                  aria-label={`${label} / ${t("initialAdvances")}`}
                  inputMode="numeric"
                  max={0xffff_ffff}
                  maxLength={10}
                  min={0}
                  onChange={(event) =>
                    setInitial(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={initial}
                />
                <input
                  aria-label={`${label} / ${t("maxAdvances")}`}
                  inputMode="numeric"
                  max={0xffff_ffff}
                  maxLength={10}
                  min={0}
                  onChange={(event) =>
                    setMaximum(
                      normalizeDecimalInput(
                        event.target.value,
                        0xffff_ffff,
                        10,
                      ),
                    )
                  }
                  value={maximum}
                />
              </div>
            ))}
            <div className="pokespot-paired-field">
              <span>{t("pokeSpotOffset")}</span>
              <input
                aria-label={`${t("pokeSpotOffset")} / Food`}
                inputMode="numeric"
                max={0xffff_ffff}
                maxLength={10}
                min={0}
                onChange={(event) =>
                  setFoodOffset(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={foodOffset}
              />
              <input
                aria-label={`${t("pokeSpotOffset")} / Encounter`}
                inputMode="numeric"
                max={0xffff_ffff}
                maxLength={10}
                min={0}
                onChange={(event) =>
                  setEncounterOffset(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={encounterOffset}
              />
            </div>
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
            <span className="panel-note">{profile.name} / XD</span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("location")}</span>
              <Select
                onChange={(event) => {
                  setLocation(Number(event.target.value) as 0 | 1 | 2);
                  setSelectedSpecies(0);
                  setSlotMask(0);
                }}
                value={location}
              >
                {POKE_SPOT_LOCATIONS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {t(entry.nameKey)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>{t("pokemon")}</span>
              <Select
                onChange={(event) => selectSpecies(Number(event.target.value))}
                value={selectedSpecies}
              >
                <option value={0}>-</option>
                {activeLocation.slots.map((slot) => (
                  <option key={slot.species} value={slot.species}>
                    {getGen3SpeciesName(i18n.language, slot.species)}
                  </option>
                ))}
              </Select>
            </label>
            <div className="pokespot-slot-note">
              {activeLocation.slots
                .map(
                  (slot, index) =>
                    `${index}: ${getGen3SpeciesName(i18n.language, slot.species)} Lv.${slot.minLevel}-${slot.maxLevel}`,
                )
                .join(" / ")}
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
          <fieldset className="filter-controls">
            <div className="gen3-filter-selects">
              <label className="field">
                <span>{t("ability")}</span>
                <Select
                  onChange={(event) =>
                    setAbility(event.target.value as PokeSpotAbilityFilter)
                  }
                  value={ability}
                >
                  <option value="any">{t("any")}</option>
                  <option value="first">0</option>
                  <option value="second">1</option>
                </Select>
              </label>
              <MultiCheckSelect
                anyLabel={t("any")}
                label={t("wildEncounterSlot")}
                mask={slotMask}
                onChange={(mask) => {
                  setSlotMask(mask);
                  setSelectedSpecies(0);
                }}
                options={slotOptions}
                resetHint={t("checkListResetHint")}
              />
              <label className="field">
                <span>{t("gender")}</span>
                <Select
                  onChange={(event) =>
                    setGender(event.target.value as PokeSpotGenderFilter)
                  }
                  value={gender}
                >
                  <option value="any">{t("any")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                </Select>
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
                <Select
                  onChange={(event) =>
                    setShiny(event.target.value as PokeSpotShinyFilter)
                  }
                  value={shiny}
                >
                  <option value="any">{t("any")}</option>
                  <option value="star">{t("shinyStar")}</option>
                  <option value="square">{t("shinySquare")}</option>
                  <option value="star-square">{t("shinyStarSquare")}</option>
                </Select>
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
                    {t(key)}
                  </button>
                  <input
                    aria-label={`${t(key)} ${t("minimum")}`}
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
                    aria-label={`${t(key)} ${t("maximum")}`}
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
          <span className="result-count">{states.length}</span>
        </div>
        <div
          className="progress-track"
          aria-label={`${progress.percent.toFixed(1)}%`}
        >
          <span style={{ width: `${Math.min(100, progress.percent)}%` }} />
        </div>
        <div className="metrics-row">
          <span>
            {t("processed")} <strong>{progress.processedStates}</strong>
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
            {error.includes("Wasm") ? t("pokeSpotWasmMissing") : error}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="alert warning">{t("limitReached")}</div>
        )}
        <div className="table-shell pokespot-table-shell">
          {states.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyPokeSpot")}</span>
            </div>
          ) : (
            <table className="pokespot-result-table">
              <thead>
                <tr>
                  <th>{t("foodAdvances")}</th>
                  <th>{t("encounterAdvances")}</th>
                  <th>{t("slot")}</th>
                  <th>{t("level")}</th>
                  <th>{t("pid")}</th>
                  <th>{t("shiny")}</th>
                  <th>{t("nature")}</th>
                  <th>{t("ability")}</th>
                  {ivKeys.map((key) => (
                    <th key={key}>{t(key)}</th>
                  ))}
                  <th>{t("hiddenPowerType")}</th>
                  <th>{t("hiddenPowerStrength")}</th>
                  <th>{t("gender")}</th>
                </tr>
              </thead>
              <tbody>
                {states.map((state, index) => {
                  const hiddenPower = gen3HiddenPower(state.ivs);
                  return (
                    <tr
                      key={`${state.foodAdvances}-${state.encounterAdvances}-${index}`}
                    >
                      <td>{state.foodAdvances}</td>
                      <td>{state.encounterAdvances}</td>
                      <td>{`${state.slot}: ${getGen3SpeciesName(i18n.language, state.species)}`}</td>
                      <td>{state.level}</td>
                      <td>{formatHex(state.pid, 8)}</td>
                      <td>
                        {t(
                          state.shiny === 0
                            ? "no"
                            : state.shiny === 1
                              ? "shinyStar"
                              : "shinySquare",
                        )}
                      </td>
                      <td>{t(natureKeys[state.nature])}</td>
                      <td>{displayAbility(state)}</td>
                      {ivKeys.map((key, ivIndex) => (
                        <td key={key}>{displayIv(state, ivIndex)}</td>
                      ))}
                      <td>{t(hiddenPowerKeys[hiddenPower.type])}</td>
                      <td>{hiddenPower.power}</td>
                      <td>
                        {t(
                          state.gender === 0
                            ? "male"
                            : state.gender === 1
                              ? "female"
                              : "genderless",
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
