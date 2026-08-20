import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Settings2, Square, Trash2 } from "lucide-react";
import {
  type FormEvent,
  type MouseEvent,
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
} from "../gen4ivcalculator/gen4IvData";
import { DEFAULT_GEN8_BDSP_PROFILE } from "../gen8profiles/domain";
import type { Gen8ProfilesController } from "../gen8profiles/useGen8Profiles";
import { AutoCompleteComboBox } from "../shared/AutoCompleteComboBox";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { GEN8_EGG_SPECIES, getGen8EggSpeciesName } from "./data";
import {
  GEN8_EGG_MAX_RESULTS,
  gen8EggProfile,
  gen8EggTaskCount,
  isGen8EggParentCombinationValid,
  mapGen8EggInheritanceSource,
  parseGen8EggDecimal,
  shouldReorderGen8EggParents,
  validateGen8EggRequest,
  type Gen8EggAbilityFilter,
  type Gen8EggCompatibility,
  type Gen8EggGenderFilter,
  type Gen8EggIvTuple,
  type Gen8EggParent,
  type Gen8EggParentAbility,
  type Gen8EggParentGender,
  type Gen8EggParentItem,
  type Gen8EggRequest,
  type Gen8EggResult,
  type Gen8EggShinyFilter,
} from "./domain";
import { Gen8EggUiPreviewEngine } from "./preview/Gen8EggUiPreviewEngine";
import type { Gen8EggEngine, Gen8EggProgress, Gen8EggSummary } from "./search";
import { Gen8EggWorkerPool } from "./worker/Gen8EggWorkerPool";
import "./Gen8EggPanel.css";

type RunStatus = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type ConfigTab = "parents" | "filters";
type IvText = [string, string, string, string, string, string];
type IvKey =
  "hp" | "attack" | "defense" | "specialAttack" | "specialDefense" | "speed";
type SortKey =
  | "advances"
  | "seed"
  | "ec"
  | "pid"
  | "shiny"
  | "nature"
  | "ability"
  | IvKey
  | "gender"
  | "characteristic";

interface Column {
  key: SortKey;
  label: string;
}

interface ParentDraft {
  ivs: IvText;
  ability: Gen8EggParentAbility;
  gender: Gen8EggParentGender;
  item: Gen8EggParentItem;
  nature: number;
}

export interface Gen8EggPanelProps {
  onOpenIvCalculator(): void;
  onOpenProfileManager(): void;
  profiles: Gen8ProfilesController;
  uiPreviewMode: boolean;
}

const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const IV_KEYS: readonly IvKey[] = [
  "hp",
  "attack",
  "defense",
  "specialAttack",
  "specialDefense",
  "speed",
];
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
const COLUMNS: readonly Column[] = [
  { key: "advances", label: "Advances" },
  { key: "seed", label: "Seed" },
  { key: "ec", label: "EC" },
  { key: "pid", label: "PID" },
  { key: "shiny", label: "Shiny" },
  { key: "nature", label: "Nature" },
  { key: "ability", label: "Ability" },
  { key: "hp", label: "HP" },
  { key: "attack", label: "Atk" },
  { key: "defense", label: "Def" },
  { key: "specialAttack", label: "SpA" },
  { key: "specialDefense", label: "SpD" },
  { key: "speed", label: "Spe" },
  { key: "gender", label: "Gender" },
  { key: "characteristic", label: "Characteristic" },
];

function ivLabel(key: IvKey) {
  return {
    hp: "HP",
    attack: "Atk",
    defense: "Def",
    specialAttack: "SpA",
    specialDefense: "SpD",
    speed: "Spe",
  }[key];
}

function compareValues(left: number | string, right: number | string) {
  return typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right));
}

function gameLabel(version: string, language: string) {
  if (language.startsWith("zh"))
    return version === "shiningpearl" ? "明亮珍珠" : "晶灿钻石";
  if (language.startsWith("ja"))
    return version === "shiningpearl"
      ? "シャイニングパール"
      : "ブリリアントダイヤモンド";
  return version === "shiningpearl" ? "Shining Pearl" : "Brilliant Diamond";
}

function columnLabel(
  column: Column,
  chinese: boolean,
  t: ReturnType<typeof useTranslation>["t"],
) {
  const labels: Partial<Record<SortKey, string>> = {
    advances: t("gen8EggAdvances"),
    shiny: t("shiny"),
    nature: t("nature"),
    ability: t("ability"),
    gender: t("gender"),
    characteristic: t("characteristic"),
  };
  if (labels[column.key]) return labels[column.key];
  if (!chinese) return column.label;
  const ivIndex = IV_KEYS.indexOf(column.key as IvKey);
  return ivIndex >= 0
    ? ["HP", "攻击", "防御", "特攻", "特防", "速度"][ivIndex]
    : column.label;
}

export function Gen8EggPanel({
  onOpenIvCalculator,
  onOpenProfileManager,
  profiles,
  uiPreviewMode,
}: Gen8EggPanelProps) {
  const { i18n, t } = useTranslation();
  const chinese = i18n.language.startsWith("zh");
  const engine = useMemo<Gen8EggEngine>(
    () =>
      uiPreviewMode ? new Gen8EggUiPreviewEngine() : new Gen8EggWorkerPool(),
    [uiPreviewMode],
  );
  const [configTab, setConfigTab] = useState<ConfigTab>("parents");
  const [seed0, setSeed0] = useState("");
  const [seed1, setSeed1] = useState("");
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [offset, setOffset] = useState("");
  const [compatibility, setCompatibility] = useState<Gen8EggCompatibility>(20);
  const [species, setSpecies] = useState<number>(GEN8_EGG_SPECIES[0]);
  const [speciesInput, setSpeciesInput] = useState({
    language: i18n.language,
    species: 0,
    text: "",
  });
  const [parentA, setParentA] = useState<ParentDraft>({
    ivs: ["31", "31", "31", "31", "31", "31"],
    ability: 0,
    gender: "male",
    item: 0,
    nature: 0,
  });
  const [parentB, setParentB] = useState<ParentDraft>({
    ivs: ["31", "31", "31", "31", "31", "31"],
    ability: 0,
    gender: "female",
    item: 0,
    nature: 0,
  });
  const [masuda, setMasuda] = useState(false);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shiny, setShiny] = useState<Gen8EggShinyFilter>("any");
  const [gender, setGender] = useState<Gen8EggGenderFilter>("any");
  const [ability, setAbility] = useState<Gen8EggAbilityFilter>("any");
  const [natureMask, setNatureMask] = useState(0);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0);
  const [ivMin, setIvMin] = useState<IvText>(["0", "0", "0", "0", "0", "0"]);
  const [ivMax, setIvMax] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [showInheritance, setShowInheritance] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [results, setResults] = useState<Gen8EggResult[]>([]);
  const [resultParentsReordered, setResultParentsReordered] = useState(false);
  const [status, setStatus] = useState<RunStatus>("ready");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [summary, setSummary] = useState<Gen8EggSummary>();
  const [progress, setProgress] = useState<Gen8EggProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>({ key: "advances", direction: "asc" });
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
  const usingDefaultProfile =
    selectedProfile.id === DEFAULT_GEN8_BDSP_PROFILE.id;
  const busy = status === "calculating";
  const characteristics = getIvCharacteristics(i18n.language, "bdsp");
  const natureOptions = NATURE_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const hiddenPowerOptions = POWER_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const speciesOptions = useMemo(
    () =>
      GEN8_EGG_SPECIES.map((value) => ({
        label: getGen8EggSpeciesName(i18n.language, value),
        value,
      })),
    [i18n.language],
  );
  const selectedSpeciesLabel = getGen8EggSpeciesName(i18n.language, species);
  const displayedSpecies =
    speciesInput.language === i18n.language &&
    speciesInput.species === species &&
    speciesInput.text
      ? speciesInput.text
      : selectedSpeciesLabel;
  const parentCombinationValid = isGen8EggParentCombinationValid(
    {
      ...parentA,
      ivs: parentA.ivs.map(parseGen8EggDecimal) as Gen8EggIvTuple,
    },
    {
      ...parentB,
      ivs: parentB.ivs.map(parseGen8EggDecimal) as Gen8EggIvTuple,
    },
  );

  const resultValue = useCallback(
    (result: Gen8EggResult, key: SortKey): number | string => {
      const ivIndex = IV_KEYS.indexOf(key as IvKey);
      if (ivIndex >= 0)
        return showStats ? result.stats[ivIndex] : result.ivs[ivIndex];
      return result[key as keyof Gen8EggResult] as number | string;
    },
    [showStats],
  );

  const sortedResults = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) =>
        compareValues(
          resultValue(left, sort.key),
          resultValue(right, sort.key),
        ) * direction,
    );
  }, [resultValue, results, sort]);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const updateParentIv = (parent: "a" | "b", index: number, value: string) => {
    const setter = parent === "a" ? setParentA : setParentB;
    setter((current) => ({
      ...current,
      ivs: current.ivs.map((entry, entryIndex) =>
        entryIndex === index ? value : entry,
      ) as IvText,
    }));
  };

  const applyIvShortcut = (index: number, event: MouseEvent) => {
    const range: readonly [string, string] = event.ctrlKey
      ? event.altKey
        ? ["0", "0"]
        : ["31", "31"]
      : event.altKey
        ? ["30", "31"]
        : ["0", "31"];
    setIvMin(
      (current) =>
        current.map((value, currentIndex) =>
          currentIndex === index ? range[0] : value,
        ) as IvText,
    );
    setIvMax(
      (current) =>
        current.map((value, currentIndex) =>
          currentIndex === index ? range[1] : value,
        ) as IvText,
    );
  };

  const parentRequest = (parent: ParentDraft): Gen8EggParent => ({
    ...parent,
    ivs: parent.ivs.map(parseGen8EggDecimal) as Gen8EggIvTuple,
  });

  const request = (): Gen8EggRequest => {
    if (displayedSpecies !== selectedSpeciesLabel)
      throw new TypeError("Please select an Egg Specie from the list.");
    const filtersOff = filtersDisabled;
    return {
      profile: gen8EggProfile(selectedProfile),
      seed0,
      seed1,
      initialAdvances: parseGen8EggDecimal(initialAdvances),
      maxAdvances: parseGen8EggDecimal(maxAdvances),
      offset: parseGen8EggDecimal(offset),
      compatibility,
      species,
      masuda,
      parentA: parentRequest(parentA),
      parentB: parentRequest(parentB),
      filters: {
        disabled: filtersOff,
        shiny: filtersOff ? "any" : shiny,
        gender: filtersOff ? "any" : gender,
        ability: filtersOff ? "any" : ability,
        natureMask: filtersOff ? ALL_NATURES : natureMask || ALL_NATURES,
        hiddenPowerMask: filtersOff
          ? ALL_HIDDEN_POWERS
          : hiddenPowerMask || ALL_HIDDEN_POWERS,
        ivMin: (filtersOff
          ? [0, 0, 0, 0, 0, 0]
          : ivMin.map(parseGen8EggDecimal)) as Gen8EggIvTuple,
        ivMax: (filtersOff
          ? [31, 31, 31, 31, 31, 31]
          : ivMax.map(parseGen8EggDecimal)) as Gen8EggIvTuple,
      },
      resultLimit: GEN8_EGG_MAX_RESULTS,
    };
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    let nextRequest: Gen8EggRequest;
    try {
      nextRequest = validateGen8EggRequest(request());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
      return;
    }
    const parentsReordered = shouldReorderGen8EggParents(
      nextRequest.parentA,
      nextRequest.parentB,
    );
    setResultParentsReordered(parentsReordered);
    setNotice(parentsReordered ? t("gen8EggParentsReorderedMessage") : "");
    const totalStates = gen8EggTaskCount(nextRequest);
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

  const displayValue = (result: Gen8EggResult, key: SortKey) => {
    const ivIndex = IV_KEYS.indexOf(key as IvKey);
    if (ivIndex >= 0) {
      const inherited = result.inheritance[ivIndex];
      if (showInheritance && inherited !== 0)
        return mapGen8EggInheritanceSource(
          inherited,
          resultParentsReordered,
        ) === 1
          ? "A"
          : "B";
      return String(showStats ? result.stats[ivIndex] : result.ivs[ivIndex]);
    }
    if (key === "shiny")
      return t(
        result.shiny === 2
          ? "shinySquare"
          : result.shiny === 1
            ? "shinyStar"
            : "shinyNone",
      );
    if (key === "nature") return t(NATURE_KEYS[result.nature]);
    if (key === "ability") {
      const name = getGen4AbilityName(i18n.language, result.abilityIndex);
      return result.ability === 2
        ? `H (${name})`
        : `${result.ability}: ${name}`;
    }
    if (key === "gender")
      return t(
        result.gender === 0
          ? "male"
          : result.gender === 1
            ? "female"
            : "genderless",
      );
    if (key === "characteristic")
      return characteristics[result.characteristic] ?? "-";
    return String(resultValue(result, key));
  };

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      COLUMNS.map((column) => columnLabel(column, chinese, t)),
      ...sortedResults.map((result) =>
        COLUMNS.map((column) => displayValue(result, column.key)),
      ),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pokerngkit-gen8egg.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const parentBlock = (
    id: "a" | "b",
    parent: ParentDraft,
    setter: typeof setParentA,
  ) => (
    <fieldset className="gen8egg-parent-block">
      <legend>{t(id === "a" ? "eggParentA" : "eggParentB")}</legend>
      <div className="gen8egg-parent-ivs">
        {IV_KEYS.map((key, index) => (
          <label key={key}>
            <span>{ivLabel(key)}</span>
            <input
              aria-label={`${t(id === "a" ? "eggParentA" : "eggParentB")} ${ivLabel(key)}`}
              disabled={busy}
              inputMode="numeric"
              max="31"
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
      <div className="gen8egg-parent-attributes">
        <label className="gen8egg-field">
          <span>{t("ability")}</span>
          <Select
            disabled={busy}
            onChange={(event) =>
              setter((current) => ({
                ...current,
                ability: Number(event.target.value) as Gen8EggParentAbility,
              }))
            }
            value={parent.ability}
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>H</option>
          </Select>
        </label>
        <label className="gen8egg-field">
          <span>{t("gender")}</span>
          <Select
            disabled={busy}
            onChange={(event) =>
              setter((current) => ({
                ...current,
                gender: event.target.value as Gen8EggParentGender,
              }))
            }
            value={parent.gender}
          >
            <option value="male">{t("male")}</option>
            <option value="female">{t("female")}</option>
            <option value="genderless">{t("genderless")}</option>
            <option value="ditto">{t("gen4EggDitto")}</option>
          </Select>
        </label>
        <label className="gen8egg-field">
          <span>{t("eggItem")}</span>
          <Select
            disabled={busy}
            onChange={(event) =>
              setter((current) => ({
                ...current,
                item: Number(event.target.value) as Gen8EggParentItem,
              }))
            }
            value={parent.item}
          >
            <option value={0}>{t("none")}</option>
            <option value={1}>{t("eggEverstone")}</option>
            <option value={8}>{t("gen8EggDestinyKnot")}</option>
          </Select>
        </label>
        <label className="gen8egg-field">
          <span>{t("nature")}</span>
          <Select
            disabled={busy}
            onChange={(event) =>
              setter((current) => ({
                ...current,
                nature: Number(event.target.value),
              }))
            }
            value={parent.nature}
          >
            {NATURE_KEYS.map((key, value) => (
              <option key={key} value={value}>
                {t(key)}
              </option>
            ))}
          </Select>
        </label>
      </div>
    </fieldset>
  );

  return (
    <form className="gen8egg-panel" onSubmit={run}>
      <section className="gen8egg-profile-bar">
        <label className="gen8egg-field">
          <span>{t("profile")}</span>
          <span className="gen8egg-profile-control">
            <Select
              disabled={busy || profiles.loading}
              onChange={(event) => {
                const id = event.target.value;
                if (id !== DEFAULT_GEN8_BDSP_PROFILE.id)
                  void profiles.selectProfile(id);
              }}
              value={selectedProfile.id}
            >
              {usingDefaultProfile && (
                <option value={DEFAULT_GEN8_BDSP_PROFILE.id}>-</option>
              )}
              {bdspProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </Select>
            <button
              aria-label={t("manager")}
              className="gen8egg-icon-button"
              disabled={busy}
              onClick={onOpenProfileManager}
              title={t("manager")}
              type="button"
            >
              <Settings2 aria-hidden="true" size={18} />
            </button>
          </span>
        </label>
        <dl className="gen8egg-profile-values">
          <div>
            <dt>{t("game")}</dt>
            <dd>{gameLabel(selectedProfile.version, i18n.language)}</dd>
          </div>
          <div>
            <dt>TID / SID</dt>
            <dd>
              {selectedProfile.tid} / {selectedProfile.sid}
            </dd>
          </div>
          <div>
            <dt>{t("gen8EggShinyCharm")}</dt>
            <dd>{selectedProfile.shinyCharm ? t("yes") : t("no")}</dd>
          </div>
          <div>
            <dt>{t("gen8EggOvalCharm")}</dt>
            <dd>{selectedProfile.ovalCharm ? t("yes") : t("no")}</dd>
          </div>
        </dl>
      </section>

      <div className="gen8egg-control-row">
        <section className="gen8egg-rng-section">
          <div className="gen8egg-section-heading">
            <h2>{t("rngInfo")}</h2>
          </div>
          <div className="gen8egg-rng-grid">
            <label className="gen8egg-field gen8egg-seed-field">
              <span>Seed 0</span>
              <input
                disabled={busy}
                inputMode="text"
                maxLength={16}
                onChange={(event) =>
                  setSeed0(normalizeHexInput(event.target.value, 16))
                }
                value={seed0}
              />
            </label>
            <label className="gen8egg-field gen8egg-seed-field">
              <span>Seed 1</span>
              <input
                disabled={busy}
                inputMode="text"
                maxLength={16}
                onChange={(event) =>
                  setSeed1(normalizeHexInput(event.target.value, 16))
                }
                value={seed1}
              />
            </label>
            <label className="gen8egg-field">
              <span>{t("gen8EggInitialAdvances")}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setInitialAdvances(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={initialAdvances}
              />
            </label>
            <label className="gen8egg-field">
              <span>{t("gen8EggMaxAdvances")}</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setMaxAdvances(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={maxAdvances}
              />
            </label>
            <label className="gen8egg-field">
              <span>Offset</span>
              <input
                disabled={busy}
                inputMode="numeric"
                maxLength={10}
                onChange={(event) =>
                  setOffset(
                    normalizeDecimalInput(event.target.value, 0xffff_ffff, 10),
                  )
                }
                value={offset}
              />
            </label>
            <label className="gen8egg-field">
              <span>{t("eggCompatibility")}</span>
              <Select
                disabled={busy}
                onChange={(event) =>
                  setCompatibility(
                    Number(event.target.value) as Gen8EggCompatibility,
                  )
                }
                value={compatibility}
              >
                <option value={20}>{t("eggCompatibility20")}</option>
                <option value={50}>{t("eggCompatibility50")}</option>
                <option value={70}>{t("eggCompatibility70")}</option>
              </Select>
            </label>
          </div>
          <div className="gen8egg-run-actions">
            <button className="gen8egg-primary" disabled={busy} type="submit">
              <Play aria-hidden="true" size={17} />
              {t("generate")}
            </button>
            <button
              aria-label={t("cancel")}
              className="gen8egg-icon-button"
              disabled={!busy}
              onClick={() => engine.cancel()}
              title={t("cancel")}
              type="button"
            >
              <Square aria-hidden="true" size={16} />
            </button>
          </div>
        </section>

        <section className="gen8egg-config-section">
          <div className="gen8egg-config-tabs" role="tablist">
            <button
              aria-controls="gen8egg-parents-panel"
              aria-selected={configTab === "parents"}
              className={configTab === "parents" ? "active" : undefined}
              onClick={() => setConfigTab("parents")}
              role="tab"
              type="button"
            >
              {t("settings")}
            </button>
            <button
              aria-controls="gen8egg-filters-panel"
              aria-selected={configTab === "filters"}
              className={configTab === "filters" ? "active" : undefined}
              onClick={() => setConfigTab("filters")}
              role="tab"
              type="button"
            >
              {t("filters")}
            </button>
          </div>

          {configTab === "parents" ? (
            <div
              className="gen8egg-config-panel"
              id="gen8egg-parents-panel"
              role="tabpanel"
            >
              <div className="gen8egg-species-row">
                <label className="gen8egg-field gen8egg-species-field">
                  <span>{t("eggSpecies")}</span>
                  <AutoCompleteComboBox
                    disabled={busy}
                    inputValue={displayedSpecies}
                    label={t("eggSpecies")}
                    onInputChange={(text) =>
                      setSpeciesInput({
                        language: i18n.language,
                        species,
                        text,
                      })
                    }
                    onValueChange={(value) => {
                      setSpecies(value);
                      setSpeciesInput({
                        language: i18n.language,
                        species: value,
                        text: "",
                      });
                    }}
                    options={speciesOptions}
                    value={species}
                  />
                </label>
                <label className="gen8egg-toggle">
                  <input
                    checked={masuda}
                    disabled={busy}
                    onChange={(event) => setMasuda(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("gen4EggMasuda")}</span>
                </label>
                <label className="gen8egg-toggle">
                  <input
                    checked={showInheritance}
                    onChange={(event) =>
                      setShowInheritance(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{t("eggShowInheritance")}</span>
                </label>
              </div>
              <div className="gen8egg-parent-grid">
                {parentBlock("a", parentA, setParentA)}
                {parentBlock("b", parentB, setParentB)}
              </div>
              {!parentCombinationValid && (
                <div className="gen8egg-inline-alert" role="alert">
                  {t("eggIncompatibleParents")}
                </div>
              )}
            </div>
          ) : (
            <div
              className="gen8egg-config-panel gen8egg-filter-panel"
              id="gen8egg-filters-panel"
              role="tabpanel"
            >
              <div className="gen8egg-filter-toolbar">
                <label className="gen8egg-toggle">
                  <input
                    checked={filtersDisabled}
                    disabled={busy}
                    onChange={(event) =>
                      setFiltersDisabled(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{t("disableFilters")}</span>
                </label>
                <label className="gen8egg-toggle">
                  <input
                    checked={showStats}
                    onChange={(event) => setShowStats(event.target.checked)}
                    type="checkbox"
                  />
                  <span>{t("showStats")}</span>
                </label>
                <button
                  className="gen8egg-secondary"
                  onClick={onOpenIvCalculator}
                  type="button"
                >
                  {t("ivCalculator")}
                </button>
              </div>
              <fieldset
                className="gen8egg-filter-fields"
                disabled={filtersDisabled || busy}
              >
                <div className="gen8egg-filter-selects">
                  <label className="gen8egg-field">
                    <span>{t("shiny")}</span>
                    <Select
                      onChange={(event) =>
                        setShiny(event.target.value as Gen8EggShinyFilter)
                      }
                      value={shiny}
                    >
                      <option value="any">{t("any")}</option>
                      <option value="notShiny">{t("shinyNone")}</option>
                      <option value="star">{t("shinyStar")}</option>
                      <option value="square">{t("shinySquare")}</option>
                      <option value="starSquare">{t("shinyStarSquare")}</option>
                    </Select>
                  </label>
                  <label className="gen8egg-field">
                    <span>{t("gender")}</span>
                    <Select
                      onChange={(event) =>
                        setGender(event.target.value as Gen8EggGenderFilter)
                      }
                      value={gender}
                    >
                      <option value="any">{t("any")}</option>
                      <option value="male">{t("male")}</option>
                      <option value="female">{t("female")}</option>
                      <option value="genderless">{t("genderless")}</option>
                    </Select>
                  </label>
                  <label className="gen8egg-field">
                    <span>{t("ability")}</span>
                    <Select
                      onChange={(event) =>
                        setAbility(event.target.value as Gen8EggAbilityFilter)
                      }
                      value={ability}
                    >
                      <option value="any">{t("any")}</option>
                      <option value="first">0</option>
                      <option value="second">1</option>
                      <option value="hidden">H</option>
                    </Select>
                  </label>
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
                </div>
                <div className="gen8egg-iv-filter">
                  {IV_KEYS.map((key, index) => (
                    <div className="gen8egg-iv-range" key={key}>
                      <button
                        onClick={(event) => applyIvShortcut(index, event)}
                        title={t("ivShortcutHint")}
                        type="button"
                      >
                        {ivLabel(key)}
                      </button>
                      <input
                        aria-label={`${ivLabel(key)} ${t("minimum")}`}
                        inputMode="numeric"
                        max="31"
                        min="0"
                        onChange={(event) =>
                          setIvMin(
                            (current) =>
                              current.map((value, currentIndex) =>
                                currentIndex === index
                                  ? normalizeDecimalInput(
                                      event.target.value,
                                      31,
                                      2,
                                    )
                                  : value,
                              ) as IvText,
                          )
                        }
                        value={ivMin[index]}
                      />
                      <input
                        aria-label={`${ivLabel(key)} ${t("maximum")}`}
                        inputMode="numeric"
                        max="31"
                        min="0"
                        onChange={(event) =>
                          setIvMax(
                            (current) =>
                              current.map((value, currentIndex) =>
                                currentIndex === index
                                  ? normalizeDecimalInput(
                                      event.target.value,
                                      31,
                                      2,
                                    )
                                  : value,
                              ) as IvText,
                          )
                        }
                        value={ivMax[index]}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
        </section>
      </div>

      <section aria-busy={busy} className="gen8egg-results">
        <div className="gen8egg-results-toolbar">
          <div className="gen8egg-status-group">
            <strong>{t("results")}</strong>
            <span className={`gen8egg-run-status ${status}`}>{t(status)}</span>
          </div>
          <div className="gen8egg-result-actions">
            <output>
              {results.length.toLocaleString()} /{" "}
              {progress.totalStates.toLocaleString()}
            </output>
            <button
              aria-label={t("exportCsv")}
              className="gen8egg-icon-button"
              disabled={results.length === 0}
              onClick={exportCsv}
              title={t("exportCsv")}
              type="button"
            >
              <Download aria-hidden="true" size={17} />
            </button>
            <button
              aria-label={t("clear")}
              className="gen8egg-icon-button"
              disabled={results.length === 0}
              onClick={() => setResults([])}
              title={t("clear")}
              type="button"
            >
              <Trash2 aria-hidden="true" size={17} />
            </button>
          </div>
        </div>
        <div className="gen8egg-progress-row">
          <progress
            aria-label={`${progress.percent.toFixed(1)}%`}
            max={100}
            value={Math.min(100, progress.percent)}
          />
          <span>{progress.percent.toFixed(1)}%</span>
        </div>
        {(error || profiles.error) && (
          <div className="gen8egg-alert" role="alert">
            {error || profiles.error}
          </div>
        )}
        {notice && !error && (
          <div className="gen8egg-alert info" role="status">
            {notice}
          </div>
        )}
        {summary?.resultLimitReached && (
          <div className="gen8egg-alert warning" role="status">
            {t("limitReached")}
          </div>
        )}
        <div className="gen8egg-table-shell" ref={tableRef}>
          <div
            aria-colcount={COLUMNS.length}
            aria-label={t("results")}
            aria-rowcount={sortedResults.length + 1}
            className="gen8egg-virtual-table"
            role="grid"
            style={{ height: `${rowVirtualizer.getTotalSize() + 42}px` }}
          >
            <div aria-rowindex={1} className="gen8egg-table-header" role="row">
              {COLUMNS.map((column) => (
                <span
                  aria-sort={
                    sort.key === column.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  key={column.key}
                  role="columnheader"
                >
                  <button
                    onClick={() =>
                      setSort((current) => ({
                        key: column.key,
                        direction:
                          current.key === column.key &&
                          current.direction === "asc"
                            ? "desc"
                            : "asc",
                      }))
                    }
                    type="button"
                  >
                    {columnLabel(column, chinese, t)}
                    {sort.key === column.key &&
                      (sort.direction === "asc" ? " ↑" : " ↓")}
                  </button>
                </span>
              ))}
            </div>
            {sortedResults.length === 0 && (
              <div aria-rowindex={2} className="gen8egg-empty-state" role="row">
                <span role="gridcell">
                  {busy ? t("calculating") : t("emptyGen8Egg")}
                </span>
              </div>
            )}
            {rowVirtualizer.getVirtualItems().map((row) => {
              const result = sortedResults[row.index];
              return (
                <div
                  aria-rowindex={row.index + 2}
                  className="gen8egg-table-row"
                  key={`${result.advances}-${result.seed}-${result.pid}-${row.index}`}
                  role="row"
                  style={{ transform: `translateY(${row.start + 42}px)` }}
                >
                  {COLUMNS.map((column) => (
                    <span
                      key={column.key}
                      role="gridcell"
                      title={displayValue(result, column.key)}
                    >
                      {displayValue(result, column.key)}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </form>
  );
}
