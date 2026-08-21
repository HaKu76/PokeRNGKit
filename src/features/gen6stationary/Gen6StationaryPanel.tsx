import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ThreeDsProfile } from "../3dsprofiles/domain";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import {
  GEN6_STATIONARY_GENDER_RATIOS,
  gen6StationaryDefaultFilters,
  gen6StationaryProfile,
  formatGen6StationaryHex,
  type Gen6StationaryRequest,
  type Gen6StationaryResult,
} from "./domain";
import {
  GEN6_STATIONARY_NATURES,
  GEN6_STATIONARY_TEMPLATES,
  gen6StationaryCategoriesForVersion,
  gen6StationaryTemplateName,
  gen6StationaryTemplatesForVersion,
  type Gen6StationaryLanguage,
  type Gen6StationaryTemplate,
} from "./data";
import type { Gen6StationaryEngine } from "./search";
import {
  gen6StationaryTimeEpochFromInput,
  gen6StationaryTimeTaskCount,
  formatGen6StationaryTimeEpoch,
  validateGen6StationaryTimeRequest,
  type Gen6StationaryTimeRequest,
  type Gen6StationaryTimeResult,
} from "./timeDomain";
import type { Gen6StationaryTimeEngine } from "./timeSearch";
import { Gen6StationaryTimeWorker } from "./worker/Gen6StationaryTimeWorker";
import { Gen6StationaryUiPreviewEngine } from "./preview/Gen6StationaryUiPreviewEngine";
import { Gen6StationaryTimePreviewEngine } from "./preview/Gen6StationaryTimePreviewEngine";
import { Gen6StationaryWorker } from "./worker/Gen6StationaryWorker";
import "./Gen6StationaryPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvKey = "ivMin" | "ivMax";
type MutableIvTuple = [number, number, number, number, number, number];

const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const NATURE_KEYS = [
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
const IV_LABELS = [
  "ivHp",
  "ivAttack",
  "ivDefense",
  "ivSpecialAttack",
  "ivSpecialDefense",
  "ivSpeed",
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
const CUSTOM_TEMPLATE_ID = "gen6-stationary-custom";

function parseDecimal(value: string) {
  return value.trim() === "" || !/^\d+$/.test(value.trim()) ? 0 : Number(value);
}

function csvCell(value: string | number | boolean) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function abilityLabel(value: number, t: (key: string) => string) {
  return value === 1
    ? t("abilityFirst")
    : value === 2
      ? t("abilitySecond")
      : value === 3
        ? t("gen6StationaryHiddenAbility")
        : t("any");
}

function genderLabel(value: number, t: (key: string) => string) {
  return value === 1 ? t("male") : value === 2 ? t("female") : t("genderless");
}

function categoryLabel(category: string, t: (key: string) => string) {
  if (category === "-") return t("gen6StationaryCustom");
  if (category === "Starters") return t("starters");
  if (category === "Fossils") return t("fossils");
  return category;
}

function languageFor(value: string | undefined): Gen6StationaryLanguage {
  return value === "ja" || value === "zh" ? value : "en";
}

function customTemplate(
  template: Gen6StationaryTemplate,
  species: number,
  level: number,
  genderSetting: number,
  ability: number,
  fixedThreeIv: boolean,
  alwaysSync: boolean,
  shinyLocked: boolean,
): Gen6StationaryTemplate {
  const ratio =
    GEN6_STATIONARY_GENDER_RATIOS.find(
      (entry) => entry.setting === genderSetting,
    ) ?? GEN6_STATIONARY_GENDER_RATIOS[0];
  return {
    ...template,
    id: CUSTOM_TEMPLATE_ID,
    category: "-",
    species,
    level,
    genderRatio: ratio.value,
    genderSetting: ratio.setting,
    randomGender: ratio.random,
    ability,
    nature: 255,
    ivs: [-1, -1, -1, -1, -1, -1],
    conceptual: true,
    gift: false,
    egg: false,
    syncable: !template.bank,
    shinyLocked: template.bank || shinyLocked,
    perfectIvCount: fixedThreeIv ? 3 : 0,
    alwaysSync: template.bank || alwaysSync,
    instantSync: false,
    otTsv: null,
  };
}

export function Gen6StationaryPanel({
  profile,
  uiPreviewMode,
  bankOnly = false,
  timeFinderMode = false,
  engineOverride,
}: {
  profile: ThreeDsProfile | undefined;
  uiPreviewMode: boolean;
  bankOnly?: boolean;
  timeFinderMode?: boolean;
  engineOverride?: Gen6StationaryEngine;
}) {
  const { t, i18n } = useTranslation();
  const language = languageFor(i18n.resolvedLanguage);
  const engine = useMemo<Gen6StationaryEngine>(
    () =>
      engineOverride ??
      (uiPreviewMode
        ? new Gen6StationaryUiPreviewEngine()
        : new Gen6StationaryWorker()),
    [engineOverride, uiPreviewMode],
  );
  const timeEngine = useMemo<Gen6StationaryTimeEngine>(
    () =>
      uiPreviewMode
        ? new Gen6StationaryTimePreviewEngine()
        : new Gen6StationaryTimeWorker(),
    [uiPreviewMode],
  );
  const profileInfo = gen6StationaryProfile(profile);
  const categories: readonly string[] = useMemo(
    () => gen6StationaryCategoriesForVersion(profileInfo.version, bankOnly),
    [bankOnly, profileInfo.version],
  );
  const [category, setCategory] = useState("-");
  const activeCategory = categories.includes(category)
    ? category
    : (categories[0] ?? "-");
  const templates = useMemo(
    () =>
      gen6StationaryTemplatesForVersion(
        profileInfo.version,
        activeCategory,
        bankOnly,
      ),
    [activeCategory, bankOnly, profileInfo.version],
  );
  const [templateId, setTemplateId] = useState("");
  const selectedTemplate =
    templates.find((entry) => entry.id === templateId) ??
    templates[0] ??
    GEN6_STATIONARY_TEMPLATES[0];
  const [seed, setSeed] = useState("00000000");
  const [startDate, setStartDate] = useState("2000-01-01T00:00:00");
  const [endDate, setEndDate] = useState("2000-01-01T00:01:00");
  const [minFrame, setMinFrame] = useState("0");
  const [maxFrame, setMaxFrame] = useState("1000");
  const [delay, setDelay] = useState("0");
  const [considerDelay, setConsiderDelay] = useState(true);
  const [syncNature, setSyncNature] = useState("255");
  const [assumeSync, setAssumeSync] = useState(false);
  const [bankTarget, setBankTarget] = useState("1");
  const [bankGenderList, setBankGenderList] = useState("");
  const [customSpecies, setCustomSpecies] = useState("0");
  const [customLevel, setCustomLevel] = useState("50");
  const [customGender, setCustomGender] = useState("126");
  const [customAbility, setCustomAbility] = useState("0");
  const [customFixedThreeIv, setCustomFixedThreeIv] = useState(false);
  const [customAlwaysSync, setCustomAlwaysSync] = useState(false);
  const [customShinyLocked, setCustomShinyLocked] = useState(false);
  const [filters, setFilters] = useState(gen6StationaryDefaultFilters());
  const [results, setResults] = useState<
    (Gen6StationaryResult | Gen6StationaryTimeResult)[]
  >([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [resultLimit, setResultLimit] = useState("1000");
  const tableRef = useRef<HTMLDivElement>(null);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 8,
  });
  const template = selectedTemplate.conceptual
    ? customTemplate(
        selectedTemplate,
        parseDecimal(customSpecies),
        parseDecimal(customLevel),
        parseDecimal(customGender),
        parseDecimal(customAbility),
        customFixedThreeIv,
        customAlwaysSync,
        customShinyLocked,
      )
    : selectedTemplate;
  const customDisabled =
    status === "calculating" ||
    (profileInfo.version === "transporter" && selectedTemplate.bank);
  const syncDisabled =
    status === "calculating" || !template.syncable || template.nature < 25;
  const natureOptions = NATURE_KEYS.map((key, index) => ({
    label: GEN6_STATIONARY_NATURES[language][index] ?? t(key),
    value: index,
  }));
  const powerOptions = POWER_KEYS.map((key, index) => ({
    label: t(key),
    value: index,
  }));

  useEffect(() => {
    if (!categories.includes(category)) setCategory(categories[0] ?? "-");
  }, [categories, category]);
  useEffect(() => {
    if (selectedTemplate.id !== templateId) setTemplateId(selectedTemplate.id);
  }, [selectedTemplate.id, templateId]);
  useEffect(() => {
    setDelay(String(selectedTemplate.delay));
    setBankTarget("1");
    setSyncNature(
      selectedTemplate.nature < 25 ? String(selectedTemplate.nature) : "255",
    );
    setCustomSpecies(String(selectedTemplate.species));
    setCustomLevel(String(selectedTemplate.level || 50));
    setCustomGender(String(selectedTemplate.genderSetting));
    setCustomAbility(String(selectedTemplate.ability));
    setCustomFixedThreeIv(selectedTemplate.perfectIvCount > 0);
    setCustomAlwaysSync(selectedTemplate.alwaysSync);
    setCustomShinyLocked(selectedTemplate.shinyLocked);
  }, [
    selectedTemplate.ability,
    selectedTemplate.alwaysSync,
    selectedTemplate.delay,
    selectedTemplate.genderSetting,
    selectedTemplate.id,
    selectedTemplate.level,
    selectedTemplate.nature,
    selectedTemplate.perfectIvCount,
    selectedTemplate.shinyLocked,
    selectedTemplate.species,
  ]);
  useEffect(
    () => () => {
      engine.dispose();
      timeEngine.dispose();
    },
    [engine, timeEngine],
  );

  const request = (): Gen6StationaryRequest => ({
    version: profileInfo.version,
    seed: Number.parseInt(seed || "0", 16),
    minFrame: parseDecimal(minFrame),
    maxFrame: parseDecimal(maxFrame),
    delay: parseDecimal(delay),
    considerDelay,
    tsv: profileInfo.tsv,
    trv: profileInfo.trv,
    shinyCharm: profileInfo.shinyCharm,
    syncNature: Number(syncNature) === 255 ? null : Number(syncNature),
    assumeSync,
    template,
    bankTarget: parseDecimal(bankTarget),
    bankGenderList,
    filters,
    resultLimit: parseDecimal(resultLimit),
  });
  const timeRequest = (): Gen6StationaryTimeRequest => {
    const startEpoch = gen6StationaryTimeEpochFromInput(startDate);
    const endEpoch = gen6StationaryTimeEpochFromInput(endDate);
    if (typeof startEpoch !== "bigint" || typeof endEpoch !== "bigint")
      throw new TypeError("Invalid Gen VI Time Finder date range.");
    return validateGen6StationaryTimeRequest({
      ...request(),
      startEpoch,
      endEpoch,
      saveVariable: profileInfo.saveVariable,
      timeVariable: profileInfo.timeVariable,
    });
  };
  const run = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setResults([]);
    let searchRequest: Gen6StationaryRequest | Gen6StationaryTimeRequest;
    try {
      searchRequest = timeFinderMode ? timeRequest() : request();
    } catch (caught) {
      setStatus("failed");
      setError(caught instanceof Error ? caught.message : String(caught));
      return;
    }
    setProgress({
      processedStates: 0,
      totalStates: timeFinderMode
        ? gen6StationaryTimeTaskCount(
            searchRequest as Gen6StationaryTimeRequest,
          )
        : searchRequest.maxFrame - searchRequest.minFrame + 1,
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");
    try {
      const summary = timeFinderMode
        ? await timeEngine.search(searchRequest as Gen6StationaryTimeRequest, {
            onBatch: (batch) => setResults((current) => current.concat(batch)),
            onProgress: setProgress,
          })
        : await engine.search(searchRequest as Gen6StationaryRequest, {
            onBatch: (batch) => setResults(batch),
            onProgress: setProgress,
          });
      setStatus(summary.cancelled ? "cancelled" : "completed");
    } catch (caught) {
      setStatus("failed");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };
  const updateIv = (index: number, key: IvKey, value: string) => {
    const next = [...filters[key]] as MutableIvTuple;
    next[index] = Math.max(0, Math.min(31, parseDecimal(value)));
    setFilters((current) => ({ ...current, [key]: next }));
  };
  const setFilter = <K extends keyof typeof filters>(
    key: K,
    value: (typeof filters)[K],
  ) => setFilters((current) => ({ ...current, [key]: value }));
  const exportCsv = () => {
    if (!results.length) return;
    const rows: (string | number | boolean)[][] = [
      [
        ...(timeFinderMode ? ["Date/Time", "Initial Seed"] : []),
        "Frame",
        "Random",
        "EC",
        "PID",
        ...IV_LABELS,
        "Nature",
        "Ability",
        "Gender",
        "Shiny",
        "Hidden Power",
        "Synchronize",
        "Frame Used",
        "PSV",
        "PRV",
      ],
      ...results.map((result) => [
        ...(timeFinderMode && "epoch" in result
          ? [
              formatGen6StationaryTimeEpoch(result.epoch),
              formatGen6StationaryHex(result.initialSeed),
            ]
          : []),
        result.frame,
        formatGen6StationaryHex(result.random),
        formatGen6StationaryHex(result.ec),
        formatGen6StationaryHex(result.pid),
        ...result.ivs,
        GEN6_STATIONARY_NATURES[language][result.nature] ?? result.nature,
        abilityLabel(result.ability, t),
        genderLabel(result.gender, t),
        result.shiny === 2
          ? t("shinySquare")
          : result.shiny
            ? t("shinyAny")
            : t("shinyNone"),
        t(POWER_KEYS[result.hiddenPower]),
        result.synchronize ? t("yes") : t("no"),
        result.frameUsed,
        result.psv,
        result.prv.toString(16).toUpperCase(),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen6stationary.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const disabled = status === "calculating";

  return (
    <div
      className={`gen6stationary-panel${timeFinderMode ? " gen6stationary-time-mode" : ""}`}
    >
      <div className="gen6stationary-workspace">
        <form className="panel gen6stationary-controls" onSubmit={run}>
          <div className="gen6stationary-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>
                {t(
                  timeFinderMode
                    ? "gen6StationaryTimeModule"
                    : bankOnly
                      ? "gen6BankModule"
                      : "gen6StationaryModule",
                )}
              </h2>
            </div>
            <span className={`run-status ${status}`}>{t(status)}</span>
          </div>
          <section className="gen6stationary-section">
            <h3>
              {t(
                timeFinderMode
                  ? "gen6StationaryTimeSetup"
                  : "gen6StationarySetup",
              )}
            </h3>
            <div className="gen6stationary-grid">
              {timeFinderMode && (
                <>
                  <label className="field">
                    <span>{t("gen7TimeStart")}</span>
                    <input
                      disabled={disabled}
                      max="2000-02-19T17:02:48"
                      min="2000-01-01T00:00:00"
                      onChange={(event) => setStartDate(event.target.value)}
                      step="1"
                      type="datetime-local"
                      value={startDate}
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7TimeEnd")}</span>
                    <input
                      disabled={disabled}
                      max="2000-02-19T17:02:48"
                      min="2000-01-01T00:00:00"
                      onChange={(event) => setEndDate(event.target.value)}
                      step="1"
                      type="datetime-local"
                      value={endDate}
                    />
                  </label>
                  <label className="field">
                    <span>{t("threeDsProfilesSaveVariable")}</span>
                    <input
                      disabled
                      value={formatGen6StationaryHex(profileInfo.saveVariable)}
                    />
                  </label>
                  <label className="field">
                    <span>{t("threeDsProfilesTimeVariable")}</span>
                    <input
                      disabled
                      value={formatGen6StationaryHex(profileInfo.timeVariable)}
                    />
                  </label>
                </>
              )}
              <label className="field">
                <span>{t("category")}</span>
                <Select
                  disabled={disabled}
                  onChange={(event) => setCategory(event.target.value)}
                  value={activeCategory}
                >
                  {categories.map((entry) => (
                    <option key={entry} value={entry}>
                      {categoryLabel(entry, t)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{t("pokemon")}</span>
                <Select
                  disabled={disabled}
                  onChange={(event) => setTemplateId(event.target.value)}
                  value={selectedTemplate.id}
                >
                  {templates.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {gen6StationaryTemplateName(entry, language)}
                    </option>
                  ))}
                </Select>
              </label>
              {!timeFinderMode && (
                <label className="field">
                  <span>Seed</span>
                  <input
                    disabled={disabled}
                    inputMode="text"
                    maxLength={8}
                    onChange={(event) =>
                      setSeed(normalizeHexInput(event.target.value, 8))
                    }
                    value={seed}
                  />
                </label>
              )}
              <label className="field">
                <span>{t("gen6StationaryFrameRange")}</span>
                <input
                  disabled={disabled}
                  inputMode="numeric"
                  max={5_000_000}
                  maxLength={7}
                  onChange={(event) =>
                    setMinFrame(
                      normalizeDecimalInput(event.target.value, 5_000_000, 7),
                    )
                  }
                  value={minFrame}
                />
              </label>
              <label className="field">
                <span>{t("maxAdvance")}</span>
                <input
                  disabled={disabled}
                  inputMode="numeric"
                  max={5_000_000}
                  maxLength={7}
                  onChange={(event) =>
                    setMaxFrame(
                      normalizeDecimalInput(event.target.value, 5_000_000, 7),
                    )
                  }
                  value={maxFrame}
                />
              </label>
              <label className="field">
                <span>{t("delay")}</span>
                <input
                  disabled={disabled}
                  inputMode="numeric"
                  max={4000}
                  maxLength={4}
                  onChange={(event) =>
                    setDelay(normalizeDecimalInput(event.target.value, 4000, 4))
                  }
                  value={delay}
                />
              </label>
              <label className="field">
                <span>{t("gen6StationarySynchronize")}</span>
                <Select
                  disabled={syncDisabled}
                  onChange={(event) => setSyncNature(event.target.value)}
                  value={syncNature}
                >
                  <option value="255">{t("none")}</option>
                  {NATURE_KEYS.map((key, index) => (
                    <option key={key} value={index}>
                      {GEN6_STATIONARY_NATURES[language][index] ?? t(key)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{t("gen6StationaryBankTarget")}</span>
                <input
                  disabled={disabled || !template.bank}
                  inputMode="numeric"
                  max={template.numOfPokemon}
                  maxLength={2}
                  onChange={(event) =>
                    setBankTarget(
                      normalizeDecimalInput(
                        event.target.value,
                        template.numOfPokemon,
                        2,
                      ),
                    )
                  }
                  value={bankTarget}
                />
              </label>
            </div>
            <div className="gen6stationary-meta">
              <span>
                {t("level")} <strong>{template.level || "-"}</strong>
              </span>
              <span>
                {t("ability")}{" "}
                <strong>{abilityLabel(template.ability, t)}</strong>
              </span>
              <span>
                {t("gen6StationaryPerfectIvs")}{" "}
                <strong>{template.perfectIvCount}</strong>
              </span>
              <span>
                {t("gen6StationaryShinyLock")}{" "}
                <strong>{template.shinyLocked ? t("yes") : t("no")}</strong>
              </span>
            </div>
            <div className="gen6stationary-toggle-grid">
              <label className="checkbox-field">
                <input
                  checked={considerDelay}
                  disabled={disabled}
                  onChange={(event) => setConsiderDelay(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen6StationaryConsiderDelay")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={profileInfo.shinyCharm}
                  disabled
                  type="checkbox"
                />
                <span>{t("gen7StationaryShinyCharm")}</span>
              </label>
              {!template.alwaysSync && (
                <label className="checkbox-field">
                  <input
                    checked={assumeSync}
                    disabled={disabled}
                    onChange={(event) => setAssumeSync(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen6StationaryAssumeSync")}</span>
                </label>
              )}
            </div>
          </section>

          {selectedTemplate.conceptual && (
            <details className="gen6stationary-disclosure" open>
              <summary>{t("gen6StationaryCustomEncounter")}</summary>
              <div className="gen6stationary-grid disclosure-content">
                <label className="field">
                  <span>{t("species")}</span>
                  <input
                    disabled={customDisabled}
                    inputMode="numeric"
                    max={721}
                    maxLength={3}
                    onChange={(event) =>
                      setCustomSpecies(
                        normalizeDecimalInput(event.target.value, 721, 3),
                      )
                    }
                    value={customSpecies}
                  />
                </label>
                <label className="field">
                  <span>{t("level")}</span>
                  <input
                    disabled={customDisabled}
                    inputMode="numeric"
                    max={100}
                    maxLength={3}
                    onChange={(event) =>
                      setCustomLevel(
                        normalizeDecimalInput(event.target.value, 100, 3),
                      )
                    }
                    value={customLevel}
                  />
                </label>
                <label className="field">
                  <span>{t("gender")}</span>
                  <Select
                    disabled={customDisabled}
                    onChange={(event) => setCustomGender(event.target.value)}
                    value={customGender}
                  >
                    {GEN6_STATIONARY_GENDER_RATIOS.map((entry) => (
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
                  </Select>
                </label>
                <label className="field">
                  <span>{t("ability")}</span>
                  <Select
                    disabled={customDisabled}
                    onChange={(event) => setCustomAbility(event.target.value)}
                    value={customAbility}
                  >
                    <option value="0">{t("any")}</option>
                    <option value="1">{t("abilityFirst")}</option>
                    <option value="2">{t("abilitySecond")}</option>
                    <option value="3">
                      {t("gen6StationaryHiddenAbility")}
                    </option>
                  </Select>
                </label>
              </div>
              <div className="gen6stationary-toggle-grid disclosure-content">
                <label className="checkbox-field">
                  <input
                    checked={customFixedThreeIv}
                    disabled={customDisabled}
                    onChange={(event) =>
                      setCustomFixedThreeIv(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{t("gen6StationaryFixedThreeIv")}</span>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={customAlwaysSync}
                    disabled={customDisabled}
                    onChange={(event) =>
                      setCustomAlwaysSync(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{t("gen6StationaryAlwaysSync")}</span>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={customShinyLocked}
                    disabled={customDisabled}
                    onChange={(event) =>
                      setCustomShinyLocked(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{t("gen6StationaryShinyLock")}</span>
                </label>
              </div>
            </details>
          )}

          {template.bank && profileInfo.version === "transporter" && (
            <section className="gen6stationary-section gen6stationary-bank-list">
              <label className="field">
                <span>{t("gen6StationaryGenderList")}</span>
                <input
                  disabled={disabled}
                  inputMode="numeric"
                  maxLength={20}
                  onChange={(event) =>
                    setBankGenderList(
                      event.target.value.replace(/[^012]/g, "").slice(0, 20),
                    )
                  }
                  value={bankGenderList}
                />
              </label>
            </section>
          )}

          <details className="gen6stationary-disclosure" open>
            <summary>{t("filters")}</summary>
            <fieldset
              className="gen6stationary-filter-controls"
              disabled={filters.disabled || disabled}
            >
              <div className="gen6stationary-grid disclosure-content">
                <label className="field">
                  <span>{t("shiny")}</span>
                  <Select
                    onChange={(event) =>
                      setFilter(
                        "shiny",
                        event.target.value as typeof filters.shiny,
                      )
                    }
                    value={filters.shiny}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="shiny">{t("shinyAny")}</option>
                    <option value="square">{t("shinySquare")}</option>
                  </Select>
                </label>
                <label className="field">
                  <span>{t("gender")}</span>
                  <Select
                    onChange={(event) =>
                      setFilter(
                        "gender",
                        event.target.value as typeof filters.gender,
                      )
                    }
                    value={filters.gender}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="male">{t("male")}</option>
                    <option value="female">{t("female")}</option>
                    <option value="genderless">{t("genderless")}</option>
                  </Select>
                </label>
                <label className="field">
                  <span>{t("ability")}</span>
                  <Select
                    onChange={(event) =>
                      setFilter(
                        "ability",
                        event.target.value as typeof filters.ability,
                      )
                    }
                    value={filters.ability}
                  >
                    <option value="any">{t("any")}</option>
                    <option value="first">{t("abilityFirst")}</option>
                    <option value="second">{t("abilitySecond")}</option>
                    <option value="hidden">
                      {t("gen6StationaryHiddenAbility")}
                    </option>
                  </Select>
                </label>
                <MultiCheckSelect
                  anyLabel={t("any")}
                  label={t("nature")}
                  mask={filters.natureMask}
                  onChange={(value) =>
                    setFilter("natureMask", value || ALL_NATURES)
                  }
                  options={natureOptions}
                  resetHint={t("checkListResetHint")}
                />
                <MultiCheckSelect
                  anyLabel={t("any")}
                  label={t("hiddenPower")}
                  mask={filters.hiddenPowerMask}
                  onChange={(value) =>
                    setFilter("hiddenPowerMask", value || ALL_HIDDEN_POWERS)
                  }
                  options={powerOptions}
                  resetHint={t("checkListResetHint")}
                />
                <label className="field">
                  <span>{t("gen6StationaryPerfectIvValue")}</span>
                  <input
                    inputMode="numeric"
                    max={31}
                    onChange={(event) =>
                      setFilter(
                        "perfectIvValue",
                        parseDecimal(
                          normalizeDecimalInput(event.target.value, 31, 2),
                        ),
                      )
                    }
                    value={filters.perfectIvValue}
                  />
                </label>
                <label className="field">
                  <span>{t("gen6StationaryPerfectIvCount")}</span>
                  <input
                    inputMode="numeric"
                    max={6}
                    onChange={(event) =>
                      setFilter(
                        "perfectIvCount",
                        parseDecimal(
                          normalizeDecimalInput(event.target.value, 6, 1),
                        ),
                      )
                    }
                    value={filters.perfectIvCount}
                  />
                </label>
                <label className="field">
                  <span>{t("gen6StationaryResultLimit")}</span>
                  <input
                    inputMode="numeric"
                    max={100000}
                    onChange={(event) =>
                      setResultLimit(
                        normalizeDecimalInput(event.target.value, 100000, 6),
                      )
                    }
                    value={resultLimit}
                  />
                </label>
              </div>
              <div className="gen6stationary-iv-filter">
                <div className="gen6stationary-iv-header">
                  <span>{t("ivs")}</span>
                  <span>{t("minimum")}</span>
                  <span>{t("maximum")}</span>
                </div>
                {IV_LABELS.map((key, index) => (
                  <div className="gen6stationary-iv-row" key={key}>
                    <span>{t(key)}</span>
                    <input
                      aria-label={`${t(key)} ${t("minimum")}`}
                      inputMode="numeric"
                      max={31}
                      onChange={(event) =>
                        updateIv(index, "ivMin", event.target.value)
                      }
                      value={filters.ivMin[index]}
                    />
                    <input
                      aria-label={`${t(key)} ${t("maximum")}`}
                      inputMode="numeric"
                      max={31}
                      onChange={(event) =>
                        updateIv(index, "ivMax", event.target.value)
                      }
                      value={filters.ivMax[index]}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
            <label className="checkbox-field gen6stationary-disable-filter">
              <input
                checked={filters.disabled}
                disabled={disabled}
                onChange={(event) =>
                  setFilter("disabled", event.target.checked)
                }
                type="checkbox"
              />
              <span>{t("disableFilters")}</span>
            </label>
          </details>

          <div className="gen6stationary-actions">
            <button
              className="gen6stationary-primary"
              disabled={disabled}
              type="submit"
            >
              <Play aria-hidden="true" size={17} />
              {t(timeFinderMode ? "search" : "generate")}
            </button>
            <button
              aria-label={t("cancel")}
              className="gen6stationary-icon"
              disabled={!disabled}
              onClick={() => (timeFinderMode ? timeEngine : engine).cancel()}
              title={t("cancel")}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
            </button>
          </div>
        </form>

        <section className="panel gen6stationary-results">
          <div className="gen6stationary-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
              <span className={`run-status ${status}`}>{t(status)}</span>
            </div>
            <div className="gen6stationary-result-actions">
              <output>
                {results.length.toLocaleString()} /{" "}
                {progress.processedStates.toLocaleString()}
              </output>
              <button
                aria-label={t("exportCsv")}
                className="gen6stationary-icon"
                disabled={!results.length}
                onClick={exportCsv}
                title={t("exportCsv")}
                type="button"
              >
                <Download aria-hidden="true" size={17} />
              </button>
              <button
                aria-label={t("clear")}
                className="gen6stationary-icon"
                disabled={!results.length}
                onClick={() => setResults([])}
                title={t("clear")}
                type="button"
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
          </div>
          {error && <div className="alert error">{error}</div>}
          <div
            className="table-shell gen6stationary-table-shell"
            ref={tableRef}
          >
            {!results.length ? (
              <div className="empty-state">
                <strong>{t("emptyGen6Stationary")}</strong>
              </div>
            ) : (
              <div
                className="gen6stationary-table"
                style={{ height: `${virtualizer.getTotalSize() + 40}px` }}
              >
                <div className="gen6stationary-table-header">
                  {timeFinderMode && (
                    <>
                      <span>{t("gen7TimeDate")}</span>
                      <span>{t("gen7TimeInitialSeed")}</span>
                    </>
                  )}
                  <span>Frame</span>
                  <span>Random</span>
                  <span>EC</span>
                  <span>PID</span>
                  {IV_LABELS.map((key) => (
                    <span key={key}>{t(key)}</span>
                  ))}
                  <span>{t("nature")}</span>
                  <span>{t("ability")}</span>
                  <span>{t("gender")}</span>
                  <span>{t("shiny")}</span>
                  <span>{t("hiddenPower")}</span>
                  <span>{t("gen6StationarySynchronize")}</span>
                  <span>{t("gen6StationaryFrameUsed")}</span>
                  <span>PSV</span>
                  <span>PRV</span>
                </div>
                {virtualizer.getVirtualItems().map((item) => {
                  const result = results[item.index];
                  return (
                    <div
                      className="gen6stationary-table-row"
                      key={`${result.frame}-${item.index}`}
                      style={{ transform: `translateY(${item.start + 40}px)` }}
                    >
                      {timeFinderMode && "epoch" in result && (
                        <>
                          <span>
                            {formatGen6StationaryTimeEpoch(result.epoch)}
                          </span>
                          <span>
                            {formatGen6StationaryHex(result.initialSeed)}
                          </span>
                        </>
                      )}
                      <span>{result.frame}</span>
                      <span>{formatGen6StationaryHex(result.random)}</span>
                      <span>{formatGen6StationaryHex(result.ec)}</span>
                      <span>{formatGen6StationaryHex(result.pid)}</span>
                      {result.ivs.map((value, index) => (
                        <span key={IV_LABELS[index]}>{value}</span>
                      ))}
                      <span>
                        {GEN6_STATIONARY_NATURES[language][result.nature] ??
                          result.nature}
                      </span>
                      <span>{abilityLabel(result.ability, t)}</span>
                      <span>{genderLabel(result.gender, t)}</span>
                      <span>
                        {result.shiny === 2
                          ? t("shinySquare")
                          : result.shiny
                            ? t("shinyAny")
                            : t("shinyNone")}
                      </span>
                      <span>{t(POWER_KEYS[result.hiddenPower])}</span>
                      <span>{result.synchronize ? t("yes") : t("no")}</span>
                      <span>+{String(result.frameUsed).padStart(2, "0")}</span>
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
