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
  DEFAULT_GEN8_SWSH_PROFILE,
  type Gen8Profile,
} from "../gen8profiles/domain";
import type { Gen8ProfilesController } from "../gen8profiles/useGen8Profiles";
import {
  GEN8_DEN_INFO,
  GEN8_RAID_EVENTS,
  getGen8RaidDen,
  getGen8RaidPersonal,
  type Gen8RaidTemplate,
} from "./data";
import {
  gen8RaidProfile,
  gen8RaidTaskCount,
  parseGen8RaidDecimal,
  validateGen8RaidRequest,
  type Gen8RaidAbilityFilter,
  type Gen8RaidGenderFilter,
  type Gen8RaidIvTuple,
  type Gen8RaidRequest,
  type Gen8RaidResult,
  type Gen8RaidShinyFilter,
} from "./domain";
import { Gen8RaidsUiPreviewEngine } from "./preview/Gen8RaidsUiPreviewEngine";
import type {
  Gen8RaidEngine,
  Gen8RaidProgress,
  Gen8RaidSummary,
} from "./search";
import { Gen8RaidWorkerPool } from "./worker/Gen8RaidWorkerPool";
import "./Gen8RaidsPanel.css";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type LocationMode = 0 | 1 | 2 | 3;
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
const ALL_HIDDEN_POWERS = 0xffff;
const FILTER_IV_LABEL_KEYS = [
  "gen8RaidsFilterHp",
  "gen8RaidsFilterAttack",
  "gen8RaidsFilterDefense",
  "gen8RaidsFilterSpecialAttack",
  "gen8RaidsFilterSpecialDefense",
  "gen8RaidsFilterSpeed",
] as const;
const IV_KEYS: readonly IvKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];
const COLUMNS: readonly Column[] = [
  { key: "advances", labelKey: "gen8RaidsAdvances", label: "Advances" },
  { key: "ec", label: "EC" },
  { key: "pid", label: "PID" },
  { key: "shiny", labelKey: "gen8RaidsShiny", label: "Shiny" },
  { key: "nature", labelKey: "gen8RaidsNature", label: "Nature" },
  { key: "ability", labelKey: "gen8RaidsAbility", label: "Ability" },
  { key: "hp", label: "HP" },
  { key: "attack", labelKey: "gen8RaidsFilterAttack", label: "Atk" },
  { key: "defense", labelKey: "gen8RaidsFilterDefense", label: "Def" },
  {
    key: "specialAttack",
    labelKey: "gen8RaidsFilterSpecialAttack",
    label: "SpA",
  },
  {
    key: "specialDefense",
    labelKey: "gen8RaidsFilterSpecialDefense",
    label: "SpD",
  },
  { key: "speed", labelKey: "gen8RaidsFilterSpeed", label: "Spe" },
  { key: "gender", labelKey: "gen8RaidsGender", label: "Gender" },
  { key: "height", labelKey: "gen8RaidsHeight", label: "Height" },
  { key: "weight", labelKey: "gen8RaidsWeight", label: "Weight" },
  {
    key: "characteristic",
    labelKey: "gen8RaidsCharacteristic",
    label: "Characteristic",
  },
];

export interface Gen8RaidsPanelProps {
  onOpenProfileManager(): void;
  profiles: Gen8ProfilesController;
  uiPreviewMode: boolean;
}

function gameLabel(profile: Gen8Profile, language: string) {
  if (language.startsWith("zh"))
    return profile.version === "shield" ? "盾" : "剑";
  if (language.startsWith("ja"))
    return profile.version === "shield" ? "シールド" : "ソード";
  return profile.version === "shield" ? "Shield" : "Sword";
}
function compare(left: number | string, right: number | string) {
  return typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right));
}
function locationRange(location: LocationMode) {
  if (location === 0) return [0, 100] as const;
  if (location === 1) return [100, 190] as const;
  return [190, 276] as const;
}

export function Gen8RaidsPanel({
  onOpenProfileManager,
  profiles,
  uiPreviewMode,
}: Gen8RaidsPanelProps) {
  const { i18n, t } = useTranslation();
  const engine = useMemo<Gen8RaidEngine>(
    () =>
      uiPreviewMode ? new Gen8RaidsUiPreviewEngine() : new Gen8RaidWorkerPool(),
    [uiPreviewMode],
  );
  const [location, setLocation] = useState<LocationMode>(0);
  const [denIndex, setDenIndex] = useState(0);
  const [rarity, setRarity] = useState<0 | 1>(0);
  const [speciesIndex, setSpeciesIndex] = useState(0);
  const [seed, setSeed] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100");
  const [offset, setOffset] = useState("");
  const [level, setLevel] = useState("1");
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen8RaidShinyFilter>("any");
  const [gender, setGender] = useState<Gen8RaidGenderFilter>("any");
  const [ability, setAbility] = useState<Gen8RaidAbilityFilter>("any");
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
  const [results, setResults] = useState<Gen8RaidResult[]>([]);
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Gen8RaidSummary>();
  const [progress, setProgress] = useState<Gen8RaidProgress>({
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

  const swshProfiles = profiles.profiles.filter(
    (profile) => profile.version === "sword" || profile.version === "shield",
  );
  const selectedProfile =
    profiles.selectedProfile &&
    (profiles.selectedProfile.version === "sword" ||
      profiles.selectedProfile.version === "shield")
      ? profiles.selectedProfile
      : (swshProfiles[0] ?? DEFAULT_GEN8_SWSH_PROFILE);
  const version = selectedProfile.version === "shield" ? "shield" : "sword";
  const denOptions = useMemo(() => {
    if (location === 3)
      return Array.from({ length: 69 }, (_, index) => ({
        value: index,
        label: `${t("gen8RaidsEvent")} ${index + 1}`,
      }));
    const [start, end] = locationRange(location);
    return GEN8_DEN_INFO.slice(start, end)
      .filter((info) => info.index !== 16)
      .map((info) => ({
        value: info.index,
        label: `${info.index + 1 - start}: ${info.location}`,
      }));
  }, [location, t]);
  useEffect(() => {
    if (!denOptions.some((entry) => entry.value === denIndex))
      setDenIndex(denOptions[0]?.value ?? 0);
  }, [denIndex, denOptions]);
  const templates = useMemo<readonly Gen8RaidTemplate[]>(() => {
    if (location === 3) return GEN8_RAID_EVENTS[denIndex]?.[version] ?? [];
    const den = getGen8RaidDen(denIndex, rarity);
    return den[version];
  }, [denIndex, location, rarity, version]);
  useEffect(() => {
    if (speciesIndex >= templates.length) setSpeciesIndex(0);
  }, [speciesIndex, templates.length]);
  const template = templates[speciesIndex] ?? templates[0];
  const personal = template
    ? getGen8RaidPersonal(template.species, template.form)
    : undefined;
  const busy = status === "calculating";
  const speciesLabel = template
    ? getIvSpeciesName(i18n.language, template.species)
    : "-";
  const natureOptions = NATURE_KEYS.map((key, index) => ({
    key,
    index,
    label: t(key),
  }));
  const templateAbilityLabel = template
    ? ((["1", "2", "H", "1/2", "1/2/H"] as const)[template.ability] ?? "-")
    : "-";
  const templateGenderLabel =
    template?.gender === 0
      ? t("gen8RaidsRandom")
      : template?.gender === 1
        ? "♂"
        : template?.gender === 2
          ? "♀"
          : template?.gender === 3
            ? t("gen8RaidsGenderless")
            : "-";
  const templateShinyLabel =
    template?.shiny === 0
      ? t("gen8RaidsRandom")
      : template?.shiny === 1
        ? t("gen8RaidsForceNonshiny")
        : template?.shiny === 2
          ? t("gen8RaidsForceShiny")
          : "-";
  const genderRatioLabel =
    new Map<number, string>([
      [255, t("gen8RaidsGenderless")],
      [0, t("gen8RaidsOnlyMale")],
      [254, t("gen8RaidsOnlyFemale")],
      [31, "12.5% ♀"],
      [63, "25% ♀"],
      [127, "50% ♀"],
      [191, "75% ♀"],
    ]).get(personal?.gender ?? -1) ?? String(personal?.gender ?? "-");
  const resultShinyLabel = (value: number) =>
    value === 2
      ? t("gen8RaidsSquare")
      : value === 1
        ? t("gen8RaidsStar")
        : t("no");
  const resultGenderLabel = (value: number) =>
    value === 0 ? "♂" : value === 1 ? "♀" : value === 2 ? "-" : String(value);
  const characteristics = getIvCharacteristics(i18n.language, "swsh");
  const columnLabel = (column: Column) =>
    column.labelKey ? t(column.labelKey as never) : column.label;

  const request = (): Gen8RaidRequest => {
    if (!template) throw new TypeError("Please select a raid template.");
    const disabled = filtersDisabled;
    return {
      profile: gen8RaidProfile(selectedProfile),
      seed,
      initialAdvances: parseGen8RaidDecimal(initialAdvances),
      maxAdvances: parseGen8RaidDecimal(maxAdvances),
      offset: parseGen8RaidDecimal(offset),
      template,
      level:
        location === 3 && template.level > 0
          ? template.level
          : parseGen8RaidDecimal(level),
      genderRatio: personal?.gender ?? 255,
      filters: {
        disabled,
        shiny: disabled ? "any" : shiny,
        gender: disabled ? "any" : gender,
        ability: disabled ? "any" : ability,
        natureMask: disabled ? ALL_NATURES : natureMask || ALL_NATURES,
        hiddenPowerMask: ALL_HIDDEN_POWERS,
        heightMin: disabled ? 0 : parseGen8RaidDecimal(heightMin),
        heightMax: disabled ? 255 : parseGen8RaidDecimal(heightMax),
        weightMin: disabled ? 0 : parseGen8RaidDecimal(weightMin),
        weightMax: disabled ? 255 : parseGen8RaidDecimal(weightMax),
        ivMin: (disabled
          ? [0, 0, 0, 0, 0, 0]
          : ivMin.map(parseGen8RaidDecimal)) as Gen8RaidIvTuple,
        ivMax: (disabled
          ? [31, 31, 31, 31, 31, 31]
          : ivMax.map(parseGen8RaidDecimal)) as Gen8RaidIvTuple,
      },
      resultLimit: 100_000,
    };
  };
  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    let nextRequest: Gen8RaidRequest;
    try {
      nextRequest = validateGen8RaidRequest(request());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
      return;
    }
    const totalStates = gen8RaidTaskCount(nextRequest);
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
  const resultValue = useCallback(
    (result: Gen8RaidResult, key: SortKey): number | string => {
      const ivIndex = IV_KEYS.indexOf(key as IvKey);
      if (ivIndex >= 0)
        return showStats ? result.stats[ivIndex] : result.ivs[ivIndex];
      const value = result[key as keyof Gen8RaidResult];
      if (typeof value === "number" || typeof value === "string") return value;
      throw new TypeError(`Unsupported Gen 8 Raids sort key: ${key}`);
    },
    [showStats],
  );
  const displayValue = (result: Gen8RaidResult, key: SortKey) => {
    const ivIndex = IV_KEYS.indexOf(key as IvKey);
    if (ivIndex >= 0) return String(resultValue(result, key));
    if (key === "shiny") return resultShinyLabel(result.shiny);
    if (key === "nature") return t(NATURE_KEYS[result.nature]);
    if (key === "ability") {
      const name = getGen4AbilityName(i18n.language, result.abilityIndex);
      return result.ability === 2
        ? `H (${name})`
        : `${result.ability}: ${name}`;
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
    anchor.download = "pokerngkit-gen8raids.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <form className="gen8raids-panel" onSubmit={run}>
      <section className="gen8raids-profile-bar">
        <div>
          <span className="gen8raids-eyebrow">{t("gen8RaidsModule")}</span>
          <h1>{t("gen8RaidsEngine")}</h1>
        </div>
        <label>
          <span>{t("profile")}</span>
          <select
            value={selectedProfile.id}
            onChange={(event) =>
              void profiles.selectProfile(event.target.value)
            }
          >
            {swshProfiles.length ? (
              swshProfiles.map((profile) => (
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
          className="gen8raids-icon-button"
          onClick={onOpenProfileManager}
          title={t("gen8RaidsProfileManager")}
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
      <section className="gen8raids-control-grid">
        <fieldset>
          <legend>{t("gen8RaidsRngInfo")}</legend>
          <label className="wide">
            <span>Seed</span>
            <input
              value={seed}
              onChange={(event) =>
                setSeed(normalizeHexInput(event.target.value, 16))
              }
              maxLength={16}
              placeholder="0000000000000000"
              inputMode="text"
              spellCheck={false}
            />
          </label>
          <label>
            <span>{t("gen8RaidsInitialAdvances")}</span>
            <input
              value={initialAdvances}
              onChange={(event) =>
                setInitialAdvances(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff),
                )
              }
              inputMode="numeric"
              maxLength={10}
            />
          </label>
          <label>
            <span>{t("gen8RaidsMaxAdvances")}</span>
            <input
              value={maxAdvances}
              onChange={(event) =>
                setMaxAdvances(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff),
                )
              }
              inputMode="numeric"
              maxLength={10}
            />
          </label>
          <label className="wide">
            <span>{t("gen8RaidsOffset")}</span>
            <input
              value={offset}
              onChange={(event) =>
                setOffset(
                  normalizeDecimalInput(event.target.value, 0xffff_ffff),
                )
              }
              inputMode="numeric"
              maxLength={10}
            />
          </label>
          <div className="gen8raids-actions">
            <button
              className="primary"
              disabled={busy || !template}
              type="submit"
            >
              <Play size={16} />
              {t("gen8RaidsGenerate")}
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
        <fieldset>
          <legend>{t("gen8RaidsLocation")}</legend>
          <div className="gen8raids-location-tabs">
            {([0, 1, 2, 3] as LocationMode[]).map((value) => (
              <button
                className={location === value ? "active" : ""}
                key={value}
                onClick={() => {
                  setLocation(value);
                  setDenIndex(0);
                  setSpeciesIndex(0);
                }}
                type="button"
              >
                {
                  [
                    t("gen8RaidsWildArea"),
                    t("gen8RaidsIsleOfArmor"),
                    t("gen8RaidsCrownTundra"),
                    t("gen8RaidsEvent"),
                  ][value]
                }
              </button>
            ))}
          </div>
          <div className="gen8raids-two-col">
            <label>
              <span>{t("gen8RaidsDen")}</span>
              <select
                value={denIndex}
                onChange={(event) => {
                  setDenIndex(Number(event.target.value));
                  setSpeciesIndex(0);
                }}
              >
                {denOptions.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("gen8RaidsRarity")}</span>
              <select
                disabled={location === 3}
                value={rarity}
                onChange={(event) => {
                  setRarity(Number(event.target.value) as 0 | 1);
                  setSpeciesIndex(0);
                }}
              >
                <option value={0}>{t("gen8RaidsNormal")}</option>
                <option value={1}>{t("gen8RaidsRare")}</option>
              </select>
            </label>
          </div>
          <label>
            <span>{t("gen8RaidsSpecies")}</span>
            <select
              value={speciesIndex}
              onChange={(event) => setSpeciesIndex(Number(event.target.value))}
            >
              {templates.map((entry, index) => (
                <option
                  key={`${entry.species}-${entry.form}-${index}`}
                  value={index}
                >
                  {getIvSpeciesName(i18n.language, entry.species)} ·{" "}
                  {entry.starMask.toString(2).split("1").length - 1}★
                  {entry.gigantamax ? " G-Max" : ""}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>{t("gen8RaidsSettings")}</legend>
          <div className="gen8raids-two-col">
            <label>
              <span>{t("gen8RaidsLevel")}</span>
              <input
                disabled={location === 3 && Boolean(template?.level)}
                min="1"
                max="100"
                value={
                  location === 3 && template?.level ? template.level : level
                }
                onChange={(event) =>
                  setLevel(normalizeDecimalInput(event.target.value, 3))
                }
                inputMode="numeric"
                maxLength={3}
              />
            </label>
            <label>
              <span>{t("gen8RaidsIvCount")}</span>
              <output>{template?.ivCount ?? "-"}</output>
            </label>
            <label>
              <span>{t("gen8RaidsAbility")}</span>
              <output>{templateAbilityLabel}</output>
            </label>
            <label>
              <span>{t("gen8RaidsGender")}</span>
              <output>{templateGenderLabel}</output>
            </label>
            <label>
              <span>{t("gen8RaidsGenderRatio")}</span>
              <output>{genderRatioLabel}</output>
            </label>
            <label>
              <span>{t("gen8RaidsShinyType")}</span>
              <output>{templateShinyLabel}</output>
            </label>
            <label>
              <span>{t("gen8RaidsGigantamax")}</span>
              <output>{template?.gigantamax ? t("yes") : t("no")}</output>
            </label>
          </div>
        </fieldset>
        <fieldset className="gen8raids-filter-fieldset">
          <legend>{t("gen8RaidsFilters")}</legend>
          <label className="check">
            <input
              checked={filtersDisabled}
              onChange={(event) => setFiltersDisabled(event.target.checked)}
              type="checkbox"
            />
            <span>{t("gen8RaidsDisableFilters")}</span>
          </label>
          <div className="gen8raids-filter-grid">
            <label>
              <span>{t("gen8RaidsShiny")}</span>
              <select
                disabled={filtersDisabled}
                value={shiny}
                onChange={(event) =>
                  setShiny(event.target.value as Gen8RaidShinyFilter)
                }
              >
                <option value="any">{t("gen8RaidsAny")}</option>
                <option value="star">{t("gen8RaidsStar")}</option>
                <option value="square">{t("gen8RaidsSquare")}</option>
                <option value="starSquare">{t("gen8RaidsStarSquare")}</option>
              </select>
            </label>
            <label>
              <span>{t("gen8RaidsGender")}</span>
              <select
                disabled={filtersDisabled}
                value={gender}
                onChange={(event) =>
                  setGender(event.target.value as Gen8RaidGenderFilter)
                }
              >
                <option value="any">{t("gen8RaidsAny")}</option>
                <option value="male">♂</option>
                <option value="female">♀</option>
              </select>
            </label>
            <label>
              <span>{t("gen8RaidsAbility")}</span>
              <select
                disabled={filtersDisabled}
                value={ability}
                onChange={(event) =>
                  setAbility(event.target.value as Gen8RaidAbilityFilter)
                }
              >
                <option value="any">{t("gen8RaidsAny")}</option>
                <option value="first">0</option>
                <option value="second">1</option>
                <option value="hidden">H</option>
              </select>
            </label>
          </div>
          <div className="gen8raids-natures">
            {natureOptions.map((option) => (
              <label key={option.key}>
                <input
                  checked={(natureMask & (1 << option.index)) !== 0}
                  disabled={filtersDisabled}
                  onChange={() => toggleNature(option.index)}
                  type="checkbox"
                />
                {option.label}
              </label>
            ))}
          </div>
          <div className="gen8raids-ranges">
            <label>
              <span>Height</span>
              <input
                disabled={filtersDisabled}
                value={heightMin}
                onChange={(event) =>
                  setHeightMin(normalizeDecimalInput(event.target.value, 3))
                }
                inputMode="numeric"
                maxLength={3}
              />
              <input
                disabled={filtersDisabled}
                value={heightMax}
                onChange={(event) =>
                  setHeightMax(normalizeDecimalInput(event.target.value, 3))
                }
                inputMode="numeric"
                maxLength={3}
              />
            </label>
            <label>
              <span>Weight</span>
              <input
                disabled={filtersDisabled}
                value={weightMin}
                onChange={(event) =>
                  setWeightMin(normalizeDecimalInput(event.target.value, 3))
                }
                inputMode="numeric"
                maxLength={3}
              />
              <input
                disabled={filtersDisabled}
                value={weightMax}
                onChange={(event) =>
                  setWeightMax(normalizeDecimalInput(event.target.value, 3))
                }
                inputMode="numeric"
                maxLength={3}
              />
            </label>
          </div>
          <div className="gen8raids-iv-ranges">
            {FILTER_IV_LABEL_KEYS.map((labelKey, index) => (
              <label key={labelKey}>
                <span>{t(labelKey)}</span>
                <input
                  disabled={filtersDisabled}
                  value={ivMin[index]}
                  onChange={(event) =>
                    setIvMin(
                      (current) =>
                        current.map((value, currentIndex) =>
                          currentIndex === index
                            ? normalizeDecimalInput(event.target.value, 2)
                            : value,
                        ) as IvText,
                    )
                  }
                  inputMode="numeric"
                  maxLength={2}
                />
                <input
                  disabled={filtersDisabled}
                  value={ivMax[index]}
                  onChange={(event) =>
                    setIvMax(
                      (current) =>
                        current.map((value, currentIndex) =>
                          currentIndex === index
                            ? normalizeDecimalInput(event.target.value, 2)
                            : value,
                        ) as IvText,
                    )
                  }
                  inputMode="numeric"
                  maxLength={2}
                />
              </label>
            ))}
          </div>
        </fieldset>
      </section>
      {error && (
        <div className="gen8raids-alert" role="alert">
          {error}
        </div>
      )}
      <section className="gen8raids-results">
        <header>
          <div>
            <strong>{speciesLabel}</strong>
            <span className={`gen8raids-status ${status}`}>
              {t(
                `gen8RaidsStatus${status[0].toUpperCase()}${status.slice(1)}` as never,
              )}
            </span>
          </div>
          <div className="result-actions">
            <span>
              {progress.resultCount} / {progress.processedStates}
            </span>
            <button
              title={t("gen8RaidsShowStats")}
              className={showStats ? "active icon" : "icon"}
              onClick={() => setShowStats((value) => !value)}
              type="button"
            >
              {showStats ? "IV" : "ST"}
            </button>
            <button
              className="icon"
              disabled={!results.length}
              onClick={exportCsv}
              title={t("exportCsv")}
              type="button"
            >
              <Download size={16} />
            </button>
            <button
              className="icon"
              onClick={clear}
              title={t("clearResults")}
              type="button"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>
        <div className="progress-row">
          <progress max={100} value={progress.percent} />
          <span>{progress.percent.toFixed(1)}%</span>
        </div>
        {summary?.resultLimitReached && (
          <div className="gen8raids-alert warning" role="status">
            {t("limitReached")}
          </div>
        )}
        <div className="gen8raids-table" ref={tableRef}>
          <div
            className="table-inner"
            style={{ height: `${rowVirtualizer.getTotalSize() + 42}px` }}
          >
            <div className="table-header">
              {COLUMNS.map((column) => (
                <button
                  key={column.key}
                  onClick={() => toggleSort(column.key)}
                  type="button"
                >
                  {columnLabel(column)}
                  {sortLabel(column.key)}
                </button>
              ))}
            </div>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const result = sortedResults[virtualRow.index];
              return (
                <div
                  className="table-row"
                  key={`${result.advances}-${result.pid}`}
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
            })}
            {!sortedResults.length && (
              <div className="empty">
                {busy ? t("calculating") : t("emptyGen8Raids")}
              </div>
            )}
          </div>
        </div>
      </section>
    </form>
  );
}
