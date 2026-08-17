import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Settings2, Square, Trash2 } from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  getGen4AbilityName,
  getIvCharacteristics,
  getIvSpeciesName,
} from "../gen4ivcalculator/gen4IvData";
import {
  DEFAULT_GEN8_BDSP_PROFILE,
  type Gen8Profile,
} from "../gen8profiles/domain";
import type { Gen8ProfilesController } from "../gen8profiles/useGen8Profiles";
import { GEN8_STATIC_CATEGORIES } from "./data";
import {
  gen8StaticProfile,
  gen8StaticTaskCount,
  parseGen8StaticDecimal,
  validateGen8StaticRequest,
  type Gen8StaticAbilityFilter,
  type Gen8StaticGenderFilter,
  type Gen8StaticIvTuple,
  type Gen8StaticRequest,
  type Gen8StaticResult,
  type Gen8StaticShinyFilter,
} from "./domain";
import { Gen8StaticUiPreviewEngine } from "./preview/Gen8StaticUiPreviewEngine";
import type {
  Gen8StaticEngine,
  Gen8StaticProgress,
  Gen8StaticSummary,
} from "./search";
import { Gen8StaticWorkerPool } from "./worker/Gen8StaticWorkerPool";
import "./Gen8StaticPanel.css";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type SortKey =
  | "advances"
  | "ec"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | IvKey
  | "gender"
  | "height"
  | "weight"
  | "characteristic";

interface Column {
  key: SortKey;
  labelKey?: string;
  label: string;
}

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
const ALL_NATURES = 0x1ff_ffff;
const IV_KEYS: readonly IvKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];
const IV_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
const IV_FILTER_LABEL_KEYS = [
  "gen8StaticFilterHp",
  "gen8StaticFilterAttack",
  "gen8StaticFilterDefense",
  "gen8StaticFilterSpecialAttack",
  "gen8StaticFilterSpecialDefense",
  "gen8StaticFilterSpeed",
] as const;
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  starters: "gen8StaticStarters",
  gifts: "gen8StaticGifts",
  fossils: "gen8StaticFossils",
  stationary: "gen8StaticStationary",
  roamers: "gen8StaticRoamers",
  legends: "gen8StaticLegends",
  ramanasParkPureSpace: "gen8StaticRamanasPure",
  ramanasParkStrangeSpace: "gen8StaticRamanasStrange",
  mythics: "gen8StaticMythics",
};
const COLUMNS: readonly Column[] = [
  { key: "advances", labelKey: "gen8StaticAdvances", label: "Advances" },
  { key: "ec", label: "EC" },
  { key: "pid", label: "PID" },
  { key: "shiny", labelKey: "gen8StaticShiny", label: "Shiny" },
  { key: "nature", labelKey: "gen8StaticNature", label: "Nature" },
  { key: "ability", labelKey: "gen8StaticAbility", label: "Ability" },
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "specialAttack", label: "SpA" },
  { key: "specialDefense", label: "SpD" },
  { key: "speed", label: "Spe" },
  { key: "gender", labelKey: "gen8StaticGender", label: "Gender" },
  { key: "height", labelKey: "gen8StaticHeight", label: "Height" },
  { key: "weight", labelKey: "gen8StaticWeight", label: "Weight" },
  {
    key: "characteristic",
    labelKey: "gen8StaticCharacteristic",
    label: "Characteristic",
  },
];

export interface Gen8StaticPanelProps {
  onOpenProfileManager(): void;
  profiles: Gen8ProfilesController;
  uiPreviewMode: boolean;
}

function gameLabel(profile: Gen8Profile, language: string) {
  if (language.startsWith("zh"))
    return profile.version === "shiningpearl" ? "明亮珍珠" : "晶灿钻石";
  return profile.version === "shiningpearl"
    ? "Shining Pearl"
    : "Brilliant Diamond";
}

function compare(left: number | string, right: number | string) {
  return typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right));
}

function fixedGender(genderRatio: number) {
  return genderRatio === 0 || genderRatio === 254 || genderRatio === 255;
}

export function Gen8StaticPanel({
  onOpenProfileManager,
  profiles,
  uiPreviewMode,
}: Gen8StaticPanelProps) {
  const { i18n, t } = useTranslation();
  const engine = useMemo<Gen8StaticEngine>(
    () =>
      uiPreviewMode
        ? new Gen8StaticUiPreviewEngine()
        : new Gen8StaticWorkerPool(),
    [uiPreviewMode],
  );
  const [seed0, setSeed0] = useState("");
  const [seed1, setSeed1] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("");
  const [lead, setLead] = useState(255);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [encounterIndex, setEncounterIndex] = useState(0);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen8StaticShinyFilter>("any");
  const [gender, setGender] = useState<Gen8StaticGenderFilter>("any");
  const [ability, setAbility] = useState<Gen8StaticAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(ALL_NATURES);
  const [heightMin, setHeightMin] = useState("0");
  const [heightMax, setHeightMax] = useState("255");
  const [weightMin, setWeightMin] = useState("0");
  const [weightMax, setWeightMax] = useState("255");
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
  const [results, setResults] = useState<Gen8StaticResult[]>([]);
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Gen8StaticSummary>();
  const [progress, setProgress] = useState<Gen8StaticProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "advances", direction: "asc" },
  );
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => engine.dispose(), [engine]);

  const bdspProfiles = profiles.profiles.filter(
    (profile) =>
      profile.version === "brilliantdiamond" ||
      profile.version === "shiningpearl",
  );
  const selectedProfile =
    profiles.selectedProfile &&
    (profiles.selectedProfile.version === "brilliantdiamond" ||
      profiles.selectedProfile.version === "shiningpearl")
      ? profiles.selectedProfile
      : (bdspProfiles[0] ?? DEFAULT_GEN8_BDSP_PROFILE);
  const category =
    GEN8_STATIC_CATEGORIES[categoryIndex] ?? GEN8_STATIC_CATEGORIES[0];
  const templates = useMemo(
    () =>
      category.templates.filter((template) =>
        template.versions.includes(selectedProfile.version as never),
      ),
    [category, selectedProfile.version],
  );
  useEffect(() => {
    if (encounterIndex >= templates.length) setEncounterIndex(0);
  }, [encounterIndex, templates.length]);
  const template = templates[encounterIndex] ?? templates[0];
  useEffect(() => {
    if (template && fixedGender(template.genderRatio) && lead !== 255)
      setLead(255);
  }, [lead, template]);

  const busy = status === "calculating";
  const natureOptions = NATURE_KEYS.map((key, index) => ({
    key,
    index,
    label: t(key),
  }));
  const characteristics = getIvCharacteristics(i18n.language, "bdsp");
  const templateAbility = template
    ? template.ability === 255
      ? "1/2"
      : template.ability === 2
        ? "H"
        : String(template.ability + 1)
    : "-";
  const templateShiny = template
    ? template.shiny === 1
      ? t("gen8StaticNever")
      : t("gen8StaticRandom")
    : "-";
  const columnLabel = (column: Column) =>
    column.labelKey ? t(column.labelKey as never) : column.label;
  const resultShinyLabel = (value: number) =>
    value === 2
      ? t("gen8StaticSquare")
      : value === 1
        ? t("gen8StaticStar")
        : t("gen8StaticNo");
  const resultGenderLabel = (value: number) =>
    value === 0 ? "♂" : value === 1 ? "♀" : "-";

  const request = (): Gen8StaticRequest => {
    if (!template) throw new TypeError("Please select a static encounter.");
    const disabled = filtersDisabled;
    return {
      profile: gen8StaticProfile(selectedProfile),
      seed0,
      seed1,
      initialAdvances: parseGen8StaticDecimal(initialAdvances),
      maxAdvances: parseGen8StaticDecimal(maxAdvances),
      offset: parseGen8StaticDecimal(offset),
      lead,
      template,
      filters: {
        disabled,
        shiny: disabled ? "any" : shiny,
        gender: disabled ? "any" : gender,
        ability: disabled ? "any" : ability,
        natureMask: disabled ? ALL_NATURES : natureMask || ALL_NATURES,
        heightMin: disabled ? 0 : parseGen8StaticDecimal(heightMin),
        heightMax: disabled ? 255 : parseGen8StaticDecimal(heightMax),
        weightMin: disabled ? 0 : parseGen8StaticDecimal(weightMin),
        weightMax: disabled ? 255 : parseGen8StaticDecimal(weightMax),
        ivMin: (disabled
          ? [0, 0, 0, 0, 0, 0]
          : ivMin.map(parseGen8StaticDecimal)) as Gen8StaticIvTuple,
        ivMax: (disabled
          ? [31, 31, 31, 31, 31, 31]
          : ivMax.map(parseGen8StaticDecimal)) as Gen8StaticIvTuple,
      },
      resultLimit: 100_000,
    };
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    let nextRequest: Gen8StaticRequest;
    try {
      nextRequest = validateGen8StaticRequest(request());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
      return;
    }
    const totalStates = gen8StaticTaskCount(nextRequest);
    setResults([]);
    setError("");
    setSummary(undefined);
    setStatus("calculating");
    setProgress({
      processedStates: 0,
      totalStates,
      resultCount: 0,
      percent: 0,
    });
    try {
      const nextSummary = await engine.search(nextRequest, {
        onBatch: setResults,
        onProgress: setProgress,
      });
      setSummary(nextSummary);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const clear = () => {
    engine.cancel();
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
    setStatus("ready");
    setError("");
  };
  const toggleNature = (index: number) =>
    setNatureMask((mask) =>
      mask & (1 << index) ? mask & ~(1 << index) : mask | (1 << index),
    );
  const updateIv = (
    setter: typeof setIvMin | typeof setIvMax,
    index: number,
    value: string,
  ) =>
    setter(
      (current) =>
        current.map((entry, currentIndex) =>
          currentIndex === index ? value : entry,
        ) as IvText,
    );
  const resultValue = useCallback(
    (result: Gen8StaticResult, key: SortKey): number | string => {
      const ivIndex = IV_KEYS.indexOf(key as IvKey);
      if (ivIndex >= 0)
        return showStats ? result.stats[ivIndex] : result.ivs[ivIndex];
      const value = result[key as keyof Gen8StaticResult];
      if (typeof value === "number" || typeof value === "string") return value;
      throw new TypeError(`Unsupported Gen 8 Static sort key: ${key}`);
    },
    [showStats],
  );
  const displayValue = (result: Gen8StaticResult, key: SortKey) => {
    const ivIndex = IV_KEYS.indexOf(key as IvKey);
    if (ivIndex >= 0) return String(resultValue(result, key));
    if (key === "shiny") return resultShinyLabel(result.shiny);
    if (key === "nature") return t(NATURE_KEYS[result.nature]);
    if (key === "ability") {
      const name = getGen4AbilityName(i18n.language, result.abilityIndex);
      return result.ability === 2
        ? `H (${name})`
        : `${result.ability + 1} (${name})`;
    }
    if (key === "gender") return resultGenderLabel(result.gender);
    if (key === "characteristic")
      return characteristics[result.characteristic] ?? "-";
    return String(resultValue(result, key));
  };
  const sortedResults = useMemo(
    () =>
      [...results].sort(
        (left, right) =>
          compare(resultValue(left, sort.key), resultValue(right, sort.key)) *
          (sort.direction === "asc" ? 1 : -1),
      ),
    [results, resultValue, sort],
  );
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });
  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  const sortLabel = (key: SortKey) =>
    sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "";
  const exportCsv = () => {
    if (!sortedResults.length) return;
    const rows = [
      COLUMNS.map(columnLabel),
      ...sortedResults.map((result) =>
        COLUMNS.map((column) => displayValue(result, column.key)),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${rows.map((row) => row.join(",")).join("\n")}`], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen8static.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const errorText =
    error === "Please insert missing seed information"
      ? t("gen8StaticMissingSeedsMessage")
      : error.includes("Wasm") || error.includes("wasm")
        ? t("wasmMissing")
        : error;

  return (
    <form className="gen8static-panel" onSubmit={run}>
      <section className="gen8static-profile-bar">
        <div>
          <span className="gen8static-eyebrow">{t("gen8StaticModule")}</span>
          <h1>{t("gen8StaticEngine")}</h1>
        </div>
        <label>
          <span>{t("profile")}</span>
          <select
            value={selectedProfile.id}
            onChange={(event) =>
              void profiles.selectProfile(event.target.value)
            }
          >
            {bdspProfiles.length ? (
              bdspProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name || "-"} · {gameLabel(profile, i18n.language)}
                </option>
              ))
            ) : (
              <option value={selectedProfile.id}>{selectedProfile.name}</option>
            )}
          </select>
        </label>
        <button
          className="gen8static-icon-button"
          onClick={onOpenProfileManager}
          title={t("gen8StaticProfileManager")}
          type="button"
        >
          <Settings2 size={17} />
        </button>
        <dl>
          <div>
            <dt>TID</dt>
            <dd>{selectedProfile.tid}</dd>
          </div>
          <div>
            <dt>SID</dt>
            <dd>{selectedProfile.sid}</dd>
          </div>
        </dl>
      </section>

      <section className="gen8static-control-grid">
        <fieldset className="gen8static-rng-fieldset">
          <legend>{t("gen8StaticRngInfo")}</legend>
          <label className="wide">
            <span>{t("gen8StaticSeed0")}</span>
            <input
              inputMode="text"
              maxLength={16}
              onChange={(event) =>
                setSeed0(normalizeHexInput(event.target.value, 16))
              }
              placeholder="0000000000000000"
              spellCheck={false}
              value={seed0}
            />
          </label>
          <label className="wide">
            <span>{t("gen8StaticSeed1")}</span>
            <input
              inputMode="text"
              maxLength={16}
              onChange={(event) =>
                setSeed1(normalizeHexInput(event.target.value, 16))
              }
              placeholder="0000000000000000"
              spellCheck={false}
              value={seed1}
            />
          </label>
          <label>
            <span>{t("gen8StaticInitialAdvances")}</span>
            <input
              inputMode="numeric"
              max="4294967295"
              maxLength={10}
              min="0"
              onChange={(event) =>
                setInitialAdvances(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff),
                )
              }
              value={initialAdvances}
            />
          </label>
          <label>
            <span>{t("gen8StaticMaxAdvances")}</span>
            <input
              inputMode="numeric"
              max="4294967295"
              maxLength={10}
              min="0"
              onChange={(event) =>
                setMaxAdvances(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff),
                )
              }
              value={maxAdvances}
            />
          </label>
          <label>
            <span>{t("gen8StaticOffset")}</span>
            <input
              inputMode="numeric"
              max="4294967295"
              maxLength={10}
              min="0"
              onChange={(event) =>
                setOffset(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff),
                )
              }
              value={offset}
            />
          </label>
          <label>
            <span>{t("gen8StaticLead")}</span>
            <select
              onChange={(event) => setLead(Number(event.target.value))}
              value={lead}
            >
              <option value={255}>{t("gen8StaticNone")}</option>
              {template && !fixedGender(template.genderRatio) && (
                <optgroup label={t("gen8StaticCuteCharm")}>
                  <option value={26}>{t("gen8StaticMaleLead")}</option>
                  <option value={25}>{t("gen8StaticFemaleLead")}</option>
                </optgroup>
              )}
              <optgroup label={t("gen8StaticSynchronize")}>
                {natureOptions.map((nature) => (
                  <option key={nature.key} value={nature.index}>
                    {nature.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <div className="gen8static-actions">
            <button
              className="primary"
              disabled={busy || !template}
              type="submit"
            >
              <Play size={16} />
              {t("gen8StaticGenerate")}
            </button>
            <button
              className="secondary"
              disabled={!busy}
              onClick={() => engine.cancel()}
              type="button"
            >
              <Square size={15} />
              {t("cancel")}
            </button>
          </div>
        </fieldset>

        <fieldset className="gen8static-settings-fieldset">
          <legend>{t("gen8StaticSettings")}</legend>
          <label>
            <span>{t("gen8StaticCategory")}</span>
            <select
              onChange={(event) => {
                setCategoryIndex(Number(event.target.value));
                setEncounterIndex(0);
              }}
              value={categoryIndex}
            >
              {GEN8_STATIC_CATEGORIES.map((entry, index) => (
                <option key={entry.id} value={index}>
                  {t(CATEGORY_LABEL_KEYS[entry.id] as never)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("gen8StaticPokemon")}</span>
            <select
              onChange={(event) =>
                setEncounterIndex(Number(event.target.value))
              }
              value={encounterIndex}
            >
              {templates.map((entry, index) => (
                <option key={`${entry.index}-${entry.species}`} value={index}>
                  {getIvSpeciesName(i18n.language, entry.species, entry.form)}
                </option>
              ))}
            </select>
          </label>
          <div className="gen8static-template-grid">
            <label>
              <span>{t("gen8StaticLevel")}</span>
              <output>{template?.level ?? "-"}</output>
            </label>
            <label>
              <span>{t("gen8StaticAbility")}</span>
              <output>{templateAbility}</output>
            </label>
            <label>
              <span>{t("gen8StaticShiny")}</span>
              <output>{templateShiny}</output>
            </label>
            <label>
              <span>{t("gen8StaticIvCount")}</span>
              <output>{template?.ivCount ?? "-"}</output>
            </label>
          </div>
        </fieldset>

        <fieldset className="gen8static-filter-fieldset">
          <legend>{t("gen8StaticFilters")}</legend>
          <label className="gen8static-check gen8static-disable-filter">
            <input
              checked={filtersDisabled}
              onChange={(event) => setFiltersDisabled(event.target.checked)}
              type="checkbox"
            />
            <span>{t("gen8StaticDisableFilters")}</span>
          </label>
          <div className="gen8static-filter-grid">
            <label>
              <span>{t("gen8StaticShiny")}</span>
              <select
                disabled={filtersDisabled}
                onChange={(event) =>
                  setShiny(event.target.value as Gen8StaticShinyFilter)
                }
                value={shiny}
              >
                <option value="any">{t("gen8StaticAny")}</option>
                <option value="star">{t("gen8StaticStar")}</option>
                <option value="square">{t("gen8StaticSquare")}</option>
                <option value="starSquare">{t("gen8StaticStarSquare")}</option>
              </select>
            </label>
            <label>
              <span>{t("gen8StaticGender")}</span>
              <select
                disabled={filtersDisabled}
                onChange={(event) =>
                  setGender(event.target.value as Gen8StaticGenderFilter)
                }
                value={gender}
              >
                <option value="any">{t("gen8StaticAny")}</option>
                <option value="male">♂</option>
                <option value="female">♀</option>
              </select>
            </label>
            <label>
              <span>{t("gen8StaticAbility")}</span>
              <select
                disabled={filtersDisabled}
                onChange={(event) =>
                  setAbility(event.target.value as Gen8StaticAbilityFilter)
                }
                value={ability}
              >
                <option value="any">{t("gen8StaticAny")}</option>
                <option value="first">1</option>
                <option value="second">2</option>
                <option value="hidden">H</option>
              </select>
            </label>
          </div>
          <div className="gen8static-nature-heading">
            {t("gen8StaticNature")}
          </div>
          <div className="gen8static-natures">
            {natureOptions.map((nature) => (
              <label key={nature.key}>
                <input
                  checked={(natureMask & (1 << nature.index)) !== 0}
                  disabled={filtersDisabled}
                  onChange={() => toggleNature(nature.index)}
                  type="checkbox"
                />
                <span>{nature.label}</span>
              </label>
            ))}
          </div>
          <div className="gen8static-ranges">
            {[
              [
                t("gen8StaticHeight"),
                heightMin,
                heightMax,
                setHeightMin,
                setHeightMax,
              ],
              [
                t("gen8StaticWeight"),
                weightMin,
                weightMax,
                setWeightMin,
                setWeightMax,
              ],
            ].map(([label, minimum, maximum, setMinimum, setMaximum]) => (
              <label key={String(label)}>
                <span>{String(label)}</span>
                <input
                  disabled={filtersDisabled}
                  inputMode="numeric"
                  max="255"
                  min="0"
                  onChange={(event) =>
                    (setMinimum as typeof setHeightMin)(
                      normalizeDecimalInput(event.target.value, 255),
                    )
                  }
                  value={String(minimum)}
                />
                <input
                  disabled={filtersDisabled}
                  inputMode="numeric"
                  max="255"
                  min="0"
                  onChange={(event) =>
                    (setMaximum as typeof setHeightMax)(
                      normalizeDecimalInput(event.target.value, 255),
                    )
                  }
                  value={String(maximum)}
                />
              </label>
            ))}
          </div>
          <div className="gen8static-iv-ranges">
            {IV_FILTER_LABEL_KEYS.map((key, index) => (
              <label key={key}>
                <span>{t(key)}</span>
                <input
                  disabled={filtersDisabled}
                  inputMode="numeric"
                  max="31"
                  min="0"
                  onChange={(event) =>
                    updateIv(
                      setIvMin,
                      index,
                      normalizeDecimalInput(event.target.value, 31),
                    )
                  }
                  value={ivMin[index]}
                />
                <input
                  disabled={filtersDisabled}
                  inputMode="numeric"
                  max="31"
                  min="0"
                  onChange={(event) =>
                    updateIv(
                      setIvMax,
                      index,
                      normalizeDecimalInput(event.target.value, 31),
                    )
                  }
                  value={ivMax[index]}
                />
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {errorText && <div className="gen8static-alert">{errorText}</div>}
      {summary?.resultLimitReached && (
        <div className="gen8static-alert warning">{t("limitReached")}</div>
      )}

      <section className="gen8static-results">
        <header>
          <div>
            <strong>{t("results")}</strong>
            <span className="gen8static-status">{t(status)}</span>
          </div>
          <div className="gen8static-result-actions">
            <span>
              {progress.resultCount} / {progress.totalStates}
            </span>
            <button
              className={showStats ? "active icon" : "icon"}
              onClick={() => setShowStats((value) => !value)}
              title={t("gen8StaticShowStats")}
              type="button"
            >
              {showStats ? "IV" : "ST"}
            </button>
            <button
              className="icon"
              disabled={!sortedResults.length}
              onClick={exportCsv}
              title={t("exportCsv")}
              type="button"
            >
              <Download size={16} />
            </button>
            <button
              className="icon"
              disabled={!results.length && !busy}
              onClick={clear}
              title={t("clear")}
              type="button"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>
        <div className="gen8static-progress-row">
          <progress max={100} value={Math.min(100, progress.percent)} />
          <span>{progress.percent.toFixed(1)}%</span>
          <span>
            {t("processed")} {progress.processedStates}
          </span>
          <span>
            {t("workers")} {summary?.workerCount ?? "-"}
          </span>
          <span>
            {t("elapsed")}{" "}
            {summary ? `${summary.elapsedMs.toFixed(0)} ms` : "-"}
          </span>
        </div>
        <div className="gen8static-table" ref={tableRef}>
          <div
            className="gen8static-table-inner"
            style={{
              height: `${Math.max(122, rowVirtualizer.getTotalSize() + 42)}px`,
            }}
          >
            <div className="gen8static-table-header">
              {COLUMNS.map((column) => (
                <button
                  key={column.key}
                  onClick={() => toggleSort(column.key)}
                  type="button"
                >
                  {column.key in
                  Object.fromEntries(IV_KEYS.map((key, index) => [key, index]))
                    ? IV_LABELS[IV_KEYS.indexOf(column.key as IvKey)]
                    : columnLabel(column)}
                  {sortLabel(column.key)}
                </button>
              ))}
            </div>
            {sortedResults.length === 0 ? (
              <div className="gen8static-empty">{t("empty")}</div>
            ) : (
              rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const result = sortedResults[virtualRow.index];
                return (
                  <div
                    className="gen8static-table-row"
                    key={`${result.advances}-${result.ec}-${virtualRow.index}`}
                    style={{
                      transform: `translateY(${virtualRow.start + 42}px)`,
                    }}
                  >
                    {COLUMNS.map((column) => (
                      <span
                        key={column.key}
                        title={displayValue(result, column.key)}
                      >
                        {displayValue(result, column.key)}
                      </span>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </form>
  );
}
