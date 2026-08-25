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
import { PerfectIvFilterFields } from "../shared/PerfectIvFilterFields";
import { getGen3Personal } from "../shared/gen3Personal";
import { getGen3SpeciesName } from "../shared/gen3Species";
import { computeGen3Stats } from "../shared/gen3Stats";
import { GAMECUBE_TEMPLATES, gameCubeTemplatesFor } from "./encounters";
import {
  GEN3_GAMECUBE_MAX_TOTAL_STATES,
  validateGameCubeRequest,
  type GameCubeAbilityFilter,
  type GameCubeCategory,
  type GameCubeGenderFilter,
  type GameCubeOperation,
  type GameCubeShinyFilter,
  type GameCubeState,
} from "./domain";
import { Gen3GameCubeUiPreviewEngine } from "./preview/Gen3GameCubeUiPreviewEngine";
import type {
  GameCubeEngine,
  GameCubeProgress,
  GameCubeSummary,
} from "./search";
import { Gen3GameCubeWorkerPool } from "./worker/GameCubeWorkerPool";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
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
const powerKeys = [
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

export function Gen3GameCubePanel({
  onOpenIvCalculator,
  profile,
  uiPreviewMode,
}: {
  onOpenIvCalculator(): void;
  profile: Gen3Profile;
  uiPreviewMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const engine = useMemo<GameCubeEngine>(
    () =>
      uiPreviewMode
        ? new Gen3GameCubeUiPreviewEngine()
        : new Gen3GameCubeWorkerPool(),
    [uiPreviewMode],
  );
  const [operation, setOperation] = useState<GameCubeOperation>("generator");
  const [category, setCategory] = useState<GameCubeCategory>("non-shadow");
  const [templateId, setTemplateId] = useState("");
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("0");
  const [firstShadowUnset, setFirstShadowUnset] = useState(false);
  const [shiny, setShiny] = useState<GameCubeShinyFilter>("any");
  const [gender, setGender] = useState<GameCubeGenderFilter>("any");
  const [ability, setAbility] = useState<GameCubeAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(0);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [showStats, setShowStats] = useState(false);
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
  const [states, setStates] = useState<GameCubeState[]>([]);
  const [summary, setSummary] = useState<GameCubeSummary>();
  const [progress, setProgress] = useState<GameCubeProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  useEffect(() => () => engine.dispose(), [engine]);

  const game = profile.version === "colosseum" ? "colosseum" : "xd";
  const categories: GameCubeCategory[] =
    game === "colosseum"
      ? ["non-shadow", "shadow", "channel"]
      : ["non-shadow", "channel", "shadow"];
  const activeCategory = categories.includes(category)
    ? category
    : categories[0];
  const templates = gameCubeTemplatesFor(activeCategory, game);
  const template =
    templates.find((entry) => entry.id === templateId) ??
    templates[0] ??
    GAMECUBE_TEMPLATES.channel[0];
  const showUnset =
    activeCategory === "shadow" &&
    (template.shadowType === 2 || template.shadowType === 3);
  const natureOptions = natureKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const powerOptions = powerKeys.map((key, value) => ({
    label: t(key),
    value,
  }));
  const parseIvs = (values: IvText) =>
    values.map((value) => parseDecimal(value) ?? -1) as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];

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
      operation,
      category: activeCategory,
      version: profile.version,
      template,
      seed: parseHex(seed) ?? 0,
      initialAdvances: parseDecimal(initialAdvances) ?? 0,
      maxAdvances: parseDecimal(maxAdvances) ?? 0,
      offset: parseDecimal(offset) ?? 0,
      firstShadowUnset: showUnset && firstShadowUnset,
      tid: profile.tid,
      sid: profile.sid,
      filters: {
        shiny: operation === "generator" && filtersDisabled ? "any" : shiny,
        gender: operation === "generator" && filtersDisabled ? "any" : gender,
        ability: operation === "generator" && filtersDisabled ? "any" : ability,
        natureMask:
          operation === "generator" && filtersDisabled
            ? 0x1ff_ffff
            : natureMask || 0x1ff_ffff,
        hiddenPowerMask:
          operation === "generator" && filtersDisabled
            ? 0xffff
            : hiddenPowerMask || 0xffff,
        ivMin:
          operation === "generator" && filtersDisabled
            ? ([0, 0, 0, 0, 0, 0] as [
                number,
                number,
                number,
                number,
                number,
                number,
              ])
            : parseIvs(ivMin),
        ivMax:
          operation === "generator" && filtersDisabled
            ? ([31, 31, 31, 31, 31, 31] as [
                number,
                number,
                number,
                number,
                number,
                number,
              ])
            : parseIvs(ivMax),
        perfectIvValue:
          operation === "generator" && filtersDisabled
            ? 31
            : (parseDecimal(perfectIvValue) ?? Number.NaN),
        perfectIvCount:
          operation === "generator" && filtersDisabled
            ? 0
            : (parseDecimal(perfectIvCount) ?? Number.NaN),
      },
    };
    if (validateGameCubeRequest(request).length) {
      setError(t("invalidGameCubeInput"));
      setStatus("failed");
      return;
    }
    setStates([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
    setError("");
    setStatus("calculating");
    try {
      const next = await engine.search(request, {
        onBatch: (batch) => setStates((current) => [...current, ...batch]),
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

  return (
    <>
      <div className="operation-switch" role="tablist">
        <button
          className={operation === "generator" ? "active" : ""}
          onClick={() => setOperation("generator")}
          role="tab"
          type="button"
        >
          {t("generator")}
        </button>
        <button
          className={operation === "searcher" ? "active" : ""}
          onClick={() => setOperation("searcher")}
          role="tab"
          type="button"
        >
          {t("searcher")}
        </button>
      </div>
      <form className="gen3static-control-grid" onSubmit={run}>
        <section className="panel static-panel static-rng-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>{t("rngInfo")}</h2>
            </div>
            <span className="panel-note">XDRNG</span>
          </div>
          <div className="static-form-stack">
            {operation === "generator" && (
              <>
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
                          normalizeDecimalInput(
                            event.target.value,
                            GEN3_GAMECUBE_MAX_TOTAL_STATES - 1,
                            10,
                          ),
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
                        normalizeDecimalInput(
                          event.target.value,
                          0xffff_ffff,
                          10,
                        ),
                      )
                    }
                  />
                </label>
              </>
            )}
            {showUnset && (
              <label className="toggle-field">
                <input
                  checked={firstShadowUnset}
                  onChange={(event) =>
                    setFirstShadowUnset(event.target.checked)
                  }
                  type="checkbox"
                />
                <span>{t("firstShadowUnset")}</span>
              </label>
            )}
          </div>
          <div className="panel-actions">
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              {t(operation === "generator" ? "generate" : "search")}
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
              {game === "xd" ? "XD" : "Colosseum"}
            </span>
          </div>
          <div className="static-form-stack">
            <label className="field">
              <span>{t("category")}</span>
              <Select
                value={activeCategory}
                onChange={(event) => {
                  setCategory(event.target.value as GameCubeCategory);
                  setTemplateId("");
                }}
              >
                <option value="non-shadow">{t("nonShadowLocks")}</option>
                <option value="channel">{t("channel")}</option>
                <option value="shadow">{t("shadowLocks")}</option>
              </Select>
            </label>
            <label className="field">
              <span>{t("pokemon")}</span>
              <Select
                value={template.id}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                {templates.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.description ||
                      getGen3SpeciesName(i18n.language, entry.species)}
                  </option>
                ))}
              </Select>
            </label>
            <div className="static-encounter-meta">
              <div>
                <span>{t("level")}</span>
                <strong>{template.level}</strong>
              </div>
              <div>
                <span>{t("species")}</span>
                <strong>
                  {getGen3SpeciesName(i18n.language, template.species)}
                </strong>
              </div>
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
          <fieldset
            className="filter-controls"
            disabled={operation === "generator" && filtersDisabled}
          >
            <div className="gen3-filter-selects">
              <label className="field">
                <span>{t("ability")}</span>
                <Select
                  value={ability}
                  onChange={(event) =>
                    setAbility(event.target.value as GameCubeAbilityFilter)
                  }
                >
                  <option value="any">{t("any")}</option>
                  <option value="first">0</option>
                  <option value="second">1</option>
                </Select>
              </label>
              <label className="field">
                <span>{t("gender")}</span>
                <Select
                  value={gender}
                  onChange={(event) =>
                    setGender(event.target.value as GameCubeGenderFilter)
                  }
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
                options={powerOptions}
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
                  value={shiny}
                  onChange={(event) =>
                    setShiny(event.target.value as GameCubeShinyFilter)
                  }
                >
                  <option value="any">{t("any")}</option>
                  <option value="star">{t("shinyStar")}</option>
                  <option value="square">{t("shinySquare")}</option>
                  <option value="star-square">{t("shinyStarSquare")}</option>
                </Select>
              </label>
            </div>
            <PerfectIvFilterFields
              count={perfectIvCount}
              onCountChange={setPerfectIvCount}
              onValueChange={setPerfectIvValue}
              value={perfectIvValue}
            />
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
          {operation === "generator" && (
            <label className="toggle-field disable-filters">
              <input
                checked={filtersDisabled}
                onChange={(event) => setFiltersDisabled(event.target.checked)}
                type="checkbox"
              />
              <span>{t("disableFilters")}</span>
            </label>
          )}
        </section>
      </form>
      <section className="panel results-panel">
        <div className="results-heading">
          <div className="panel-heading compact">
            <div>
              <span className="panel-index">04</span>
              <h2>{t("results")}</h2>
            </div>
            <span className={`run-status ${status}`}>{t(status)}</span>
          </div>
          <span className="result-count">{states.length}</span>
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
            {error.includes("Wasm") ? t("gameCubeWasmMissing") : error}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="alert warning">{t("limitReached")}</div>
        )}
        <div className="table-shell static-table-shell">
          {states.length === 0 ? (
            <div className="empty-state">
              <span className="empty-cross">+</span>
              <span>{t("emptyGameCube")}</span>
            </div>
          ) : (
            <table className="gamecube-result-table">
              <thead>
                <tr>
                  <th>
                    {t(operation === "generator" ? "rowAdvance" : "seed")}
                  </th>
                  <th>{t("rowPid")}</th>
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
                  const personal = getGen3Personal(template.species);
                  const values = showStats
                    ? computeGen3Stats(
                        personal.stats,
                        state.ivs,
                        state.nature,
                        state.level,
                      )
                    : state.ivs;
                  return (
                    <tr key={`${state.advancesOrSeed}-${state.pid}-${index}`}>
                      <td>
                        {operation === "generator"
                          ? state.advancesOrSeed
                          : formatHex(state.advancesOrSeed, 8)}
                      </td>
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
                      <td>{`${state.ability}: ${getGen3AbilityName(
                        i18n.language,
                        personal.abilities[state.ability],
                      )}`}</td>
                      {values.map((value, ivIndex) => (
                        <td key={ivKeys[ivIndex]}>{value}</td>
                      ))}
                      <td>{t(powerKeys[hiddenPower.type])}</td>
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
