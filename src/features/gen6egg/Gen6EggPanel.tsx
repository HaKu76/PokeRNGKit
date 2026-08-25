import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import {
  formatThreeDsProfileSeed,
  type ThreeDsProfile,
} from "../3dsprofiles/domain";
import { GEN7_WILD_NATURES } from "../gen7wild/data";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import { PerfectIvFilterFields } from "../shared/PerfectIvFilterFields";
import { useTsvListText } from "../tsvlist/domain";
import { subscribeIvToolsChanges } from "../ivtools/domain";
import {
  formatGen6EggHex,
  GEN6_EGG_BROWSER_MAX_FRAME,
  GEN6_EGG_MAX_RESULTS,
  gen6EggHiddenPower,
  validateGen6EggRequest,
  type Gen6EggAbilityFilter,
  type Gen6EggGenderFilter,
  type Gen6EggGenderRatio,
  type Gen6EggItem,
  type Gen6EggIvTuple,
  type Gen6EggParentFilter,
  type Gen6EggRequest,
  type Gen6EggResult,
  type Gen6EggShinyFilter,
} from "./domain";
import { Gen6EggUiPreviewEngine } from "./preview/Gen6EggUiPreviewEngine";
import type { Gen6EggEngine, Gen6EggProgress, Gen6EggSummary } from "./search";
import { Gen6EggWorker } from "./worker/Gen6EggWorker";
import "./Gen6EggPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type IvText = [string, string, string, string, string, string];
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
const ITEM_OPTIONS: readonly { value: Gen6EggItem; key: string }[] = [
  { value: "none", key: "gen6EggItemNone" },
  { value: "everstone", key: "gen6EggItemEverstone" },
  { value: "destiny-knot", key: "gen6EggItemDestinyKnot" },
  { value: "power-hp", key: "gen6EggItemPowerHp" },
  { value: "power-attack", key: "gen6EggItemPowerAttack" },
  { value: "power-defense", key: "gen6EggItemPowerDefense" },
  { value: "power-special-attack", key: "gen6EggItemPowerSpecialAttack" },
  { value: "power-special-defense", key: "gen6EggItemPowerSpecialDefense" },
  { value: "power-speed", key: "gen6EggItemPowerSpeed" },
];
const RATIOS: readonly { value: Gen6EggGenderRatio; key: string }[] = [
  { value: "genderless", key: "gen6EggRatioGenderless" },
  { value: "one-to-one", key: "gen6EggRatioOneOne" },
  { value: "seven-to-one", key: "gen6EggRatioSevenOne" },
  { value: "three-to-one", key: "gen6EggRatioThreeOne" },
  { value: "one-to-three", key: "gen6EggRatioOneThree" },
  { value: "one-to-seven", key: "gen6EggRatioOneSeven" },
  { value: "male-only", key: "gen6EggRatioMaleOnly" },
  { value: "female-only", key: "gen6EggRatioFemaleOnly" },
];
const EMPTY_PROGRESS: Gen6EggProgress = {
  processedStates: 0,
  totalStates: 0,
  resultCount: 0,
  percent: 0,
};

function decimal(value: string) {
  return value.trim() === "" || !/^\d+$/.test(value) ? 0 : Number(value);
}
function hex(value: string) {
  return value.trim() === "" ? 0 : Number.parseInt(value, 16) >>> 0;
}
function tuple(values: IvText): Gen6EggIvTuple {
  return values.map(decimal) as Gen6EggIvTuple;
}
function parseTsvList(value: string) {
  return [
    ...new Set(
      value
        .split(/[^0-9]+/)
        .filter(Boolean)
        .map(Number),
    ),
  ].filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 4095);
}
function csvCell(value: string | number | boolean) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen6EggPanel({
  profile,
  uiPreviewMode,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
}) {
  const { t, i18n } = useTranslation();
  const storedTsvList = useTsvListText();
  const language =
    i18n.resolvedLanguage === "ja"
      ? "ja"
      : i18n.resolvedLanguage === "zh"
        ? "zh"
        : "en";
  const engine = useMemo<Gen6EggEngine>(
    () => (uiPreviewMode ? new Gen6EggUiPreviewEngine() : new Gen6EggWorker()),
    [uiPreviewMode],
  );
  const [mainSeed, setMainSeed] = useState("00000000");
  const [minFrame, setMinFrame] = useState("0");
  const [maxFrame, setMaxFrame] = useState("100000");
  const [key0, setKey0] = useState("00000000");
  const [key1, setKey1] = useState("00000000");
  const [tsv, setTsv] = useState("0");
  const [trv, setTrv] = useState("0");
  const [genderRatio, setGenderRatio] =
    useState<Gen6EggGenderRatio>("one-to-one");
  const [maleIvs, setMaleIvs] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [femaleIvs, setFemaleIvs] = useState<IvText>([
    "31",
    "31",
    "31",
    "31",
    "31",
    "31",
  ]);
  const [maleItem, setMaleItem] = useState<Gen6EggItem>("none");
  const [femaleItem, setFemaleItem] = useState<Gen6EggItem>("none");
  const [maleAbility, setMaleAbility] = useState<0 | 1 | 2>(0);
  const [femaleAbility, setFemaleAbility] = useState<0 | 1 | 2>(0);
  const [maleDitto, setMaleDitto] = useState(false);
  const [femaleDitto, setFemaleDitto] = useState(false);
  const [nidoType, setNidoType] = useState(false);
  const [shinyCharm, setShinyCharm] = useState(false);
  const [masudaMethod, setMasudaMethod] = useState(false);
  const [considerOtherTsv, setConsiderOtherTsv] = useState(false);
  const [otherTsvs, setOtherTsvs] = useState(storedTsvList);
  const [acceptEgg, setAcceptEgg] = useState(true);
  const [filtersDisabled, setFiltersDisabled] = useState(false);
  const [shinyFilter, setShinyFilter] = useState<Gen6EggShinyFilter>("any");
  const [genderFilter, setGenderFilter] = useState<Gen6EggGenderFilter>("any");
  const [abilityFilter, setAbilityFilter] =
    useState<Gen6EggAbilityFilter>("any");
  const [natureParent, setNatureParent] = useState<Gen6EggParentFilter>("any");
  const [natureMask, setNatureMask] = useState(0x1ff_ffff);
  const [hiddenPowerMask, setHiddenPowerMask] = useState(0xffff);
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
  const [resultLimit, setResultLimit] = useState("100000");
  const [results, setResults] = useState<Gen6EggResult[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<Gen6EggProgress>(EMPTY_PROGRESS);
  const [summary, setSummary] = useState<Gen6EggSummary>();
  const abortRef = useRef<AbortController | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !profile ||
      !["x", "y", "omega-ruby", "alpha-sapphire"].includes(profile.version)
    )
      return;
    setKey0(formatThreeDsProfileSeed(profile.seeds[0]));
    setKey1(formatThreeDsProfileSeed(profile.seeds[1]));
    setTsv(String(profile.tsv));
    setTrv(profile.trv.toString(16).toUpperCase());
    setShinyCharm(profile.shinyCharm);
  }, [profile]);

  useEffect(() => {
    setOtherTsvs(storedTsvList);
  }, [storedTsvList]);

  useEffect(
    () =>
      subscribeIvToolsChanges((change) => {
        if (change.type === "range") {
          setIvMin(change.bounds.min.map(String) as IvText);
          setIvMax(change.bounds.max.map(String) as IvText);
        } else if (change.parent === "male") {
          setMaleIvs(change.values.map(String) as IvText);
        } else {
          setFemaleIvs(change.values.map(String) as IvText);
        }
      }),
    [],
  );

  function changeGenderRatio(next: Gen6EggGenderRatio) {
    setGenderRatio(next);
    setNidoType(false);
    if (next === "genderless" || next === "male-only") {
      setMaleDitto(false);
      setFemaleDitto(true);
    } else if (next === "female-only") {
      setFemaleDitto(false);
    } else {
      setMaleDitto(false);
      setFemaleDitto(false);
    }
  }

  function changeDitto(parent: "male" | "female", checked: boolean) {
    if (parent === "male") {
      setMaleDitto(checked);
      if (checked) setFemaleDitto(false);
    } else {
      setFemaleDitto(checked);
      if (checked) setMaleDitto(false);
    }
  }
  useEffect(() => () => engine.dispose(), [engine]);

  const natureOptions = useMemo(
    () => GEN7_WILD_NATURES[language].map((label, value) => ({ label, value })),
    [language],
  );
  const hiddenPowerOptions = useMemo(
    () => POWER_KEYS.map((key, value) => ({ label: t(key), value })),
    [t],
  );
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 38,
    overscan: 12,
  });

  function buildRequest(): Gen6EggRequest {
    return validateGen6EggRequest({
      mainSeed: hex(mainSeed),
      minFrame: decimal(minFrame),
      maxFrame: decimal(maxFrame),
      key0: hex(key0),
      key1: hex(key1),
      tsv: decimal(tsv),
      trv: hex(trv),
      genderRatio,
      maleIvs: tuple(maleIvs),
      femaleIvs: tuple(femaleIvs),
      maleAbility,
      femaleAbility,
      maleDitto,
      femaleDitto,
      maleItem,
      femaleItem,
      nidoType,
      shinyCharm,
      masudaMethod,
      considerOtherTsv:
        considerOtherTsv && (acceptEgg || shinyCharm || masudaMethod),
      acceptEgg,
      otherTsvs: parseTsvList(otherTsvs),
      filters: {
        disabled: filtersDisabled,
        shiny: shinyFilter,
        gender: genderFilter,
        ability: abilityFilter,
        natureMask: natureMask || 0x1ff_ffff,
        hiddenPowerMask: hiddenPowerMask || 0xffff,
        ivMin: tuple(ivMin),
        ivMax: tuple(ivMax),
        perfectIvValue: decimal(perfectIvValue),
        perfectIvCount: decimal(perfectIvCount),
        natureInheritance: natureParent,
      },
      resultLimit: decimal(resultLimit),
    });
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
      setError("");
      setProgress(EMPTY_PROGRESS);
      setSummary(undefined);
      setStatus("calculating");
      const nextSummary = await engine.search(request, {
        signal: controller.signal,
        onBatch: (batch) => setResults((current) => [...current, ...batch]),
        onProgress: setProgress,
      });
      setSummary(nextSummary);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  }

  function cancel() {
    abortRef.current?.abort();
    engine.cancel();
    setStatus("cancelled");
  }

  function exportCsv() {
    if (!results.length) return;
    const rows = results.map((result) =>
      [
        result.frame,
        result.eggSeed.toString(16).toUpperCase().padStart(16, "0"),
        formatGen6EggHex(result.random),
        formatGen6EggHex(result.ec),
        formatGen6EggHex(result.pid),
        ...result.ivs,
        GEN7_WILD_NATURES[language][result.nature],
        result.ability,
        result.gender,
        gen6EggHiddenPower(result.ivs).type,
        result.shiny,
        result.psv,
        result.prv,
      ]
        .map(csvCell)
        .join(","),
    );
    const header =
      "Frame,Egg Seed,Random,EC,PID,HP,Atk,Def,SpA,SpD,Spe,Nature,Ability,Gender,Hidden Power,Shiny,PSV,PRV";
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", header, "\r\n", rows.join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "gen6-egg.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function ivEditor(values: IvText, setter: (value: IvText) => void) {
    return IV_LABELS.map((label, index) => (
      <label className="field" key={label}>
        <span>{t(label)}</span>
        <input
          inputMode="numeric"
          max={31}
          min={0}
          value={values[index]}
          onChange={(event) => {
            const next = [...values] as IvText;
            next[index] = normalizeDecimalInput(event.target.value, 31, 2);
            setter(next);
          }}
        />
      </label>
    ));
  }

  return (
    <form className="module-shell" onSubmit={submit}>
      <header className="module-heading">
        <div>
          <span className="eyebrow">{t("gen6EggEngine")}</span>
          <h1>{t("gen6EggModule")}</h1>
        </div>
        <div className="status-cluster">
          <span className={`status-dot ${status}`} />
          {t(status)}
        </div>
      </header>
      <div className="gen6egg-workspace">
        <section className="panel gen6egg-controls">
          <div className="gen6egg-heading">
            <h2>{t("gen6EggSetup")}</h2>
            <span>{progress.percent.toFixed(1)}%</span>
          </div>
          <div className="gen6egg-section gen6egg-main-grid">
            <label className="field">
              <span>{t("gen6EggMainSeed")}</span>
              <input
                maxLength={8}
                value={mainSeed}
                onChange={(event) =>
                  setMainSeed(normalizeHexInput(event.target.value, 8))
                }
              />
            </label>
            <label className="field">
              <span>{t("gen6StationaryFrameRange")}</span>
              <input
                inputMode="numeric"
                max={GEN6_EGG_BROWSER_MAX_FRAME}
                min={0}
                value={minFrame}
                onChange={(event) =>
                  setMinFrame(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_EGG_BROWSER_MAX_FRAME,
                    ),
                  )
                }
              />
            </label>
            <label className="field">
              <span>{t("gen6WildMaxFrame")}</span>
              <input
                inputMode="numeric"
                max={GEN6_EGG_BROWSER_MAX_FRAME}
                min={0}
                value={maxFrame}
                onChange={(event) =>
                  setMaxFrame(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_EGG_BROWSER_MAX_FRAME,
                    ),
                  )
                }
              />
            </label>
            <label className="field">
              <span>{t("gen6EggKey0")}</span>
              <input
                maxLength={8}
                value={key0}
                onChange={(event) =>
                  setKey0(normalizeHexInput(event.target.value, 8))
                }
              />
            </label>
            <label className="field">
              <span>{t("gen6EggKey1")}</span>
              <input
                maxLength={8}
                value={key1}
                onChange={(event) =>
                  setKey1(normalizeHexInput(event.target.value, 8))
                }
              />
            </label>
            <label className="field">
              <span>TSV</span>
              <input
                inputMode="numeric"
                max={4095}
                min={0}
                value={tsv}
                onChange={(event) =>
                  setTsv(normalizeDecimalInput(event.target.value, 4095, 4))
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
              <span>{t("gen6EggGenderRatio")}</span>
              <Select
                value={genderRatio}
                onChange={(event) =>
                  changeGenderRatio(event.target.value as Gen6EggGenderRatio)
                }
              >
                {RATIOS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.key)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div
            className="gen6egg-mode"
            role="group"
            aria-label={t("gen6EggAcceptMode")}
          >
            <button
              className={acceptEgg ? "active" : ""}
              onClick={() => setAcceptEgg(true)}
              type="button"
            >
              {t("gen6EggAccept")}
            </button>
            <button
              className={!acceptEgg ? "active" : ""}
              onClick={() => setAcceptEgg(false)}
              type="button"
            >
              {t("gen6EggReject")}
            </button>
          </div>
          <details className="gen6egg-disclosure" open>
            <summary>{t("gen6EggParents")}</summary>
            <div className="gen6egg-parent-grid">
              <fieldset>
                <legend>{t("gen6EggMaleParent")}</legend>
                <label className="field">
                  <span>{t("gen6EggAbility")}</span>
                  <Select
                    value={maleAbility}
                    onChange={(event) =>
                      setMaleAbility(Number(event.target.value) as 0 | 1 | 2)
                    }
                  >
                    <option value={0}>1</option>
                    <option value={1}>2</option>
                    <option value={2}>H</option>
                  </Select>
                </label>
                <label className="field">
                  <span>{t("gen6EggItem")}</span>
                  <Select
                    value={maleItem}
                    onChange={(event) =>
                      setMaleItem(event.target.value as Gen6EggItem)
                    }
                  >
                    {ITEM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.key)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={maleDitto}
                    disabled={
                      genderRatio === "genderless" ||
                      genderRatio === "male-only" ||
                      femaleDitto
                    }
                    onChange={(event) =>
                      changeDitto("male", event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{t("gen6EggDitto")}</span>
                </label>
                <div className="gen6egg-iv-grid">
                  {ivEditor(maleIvs, setMaleIvs)}
                </div>
              </fieldset>
              <fieldset>
                <legend>{t("gen6EggFemaleParent")}</legend>
                <label className="field">
                  <span>{t("gen6EggAbility")}</span>
                  <Select
                    value={femaleAbility}
                    onChange={(event) =>
                      setFemaleAbility(Number(event.target.value) as 0 | 1 | 2)
                    }
                  >
                    <option value={0}>1</option>
                    <option value={1}>2</option>
                    <option value={2}>H</option>
                  </Select>
                </label>
                <label className="field">
                  <span>{t("gen6EggItem")}</span>
                  <Select
                    value={femaleItem}
                    onChange={(event) =>
                      setFemaleItem(event.target.value as Gen6EggItem)
                    }
                  >
                    {ITEM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.key)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="checkbox-field">
                  <input
                    checked={femaleDitto}
                    disabled={genderRatio === "female-only" || maleDitto}
                    onChange={(event) =>
                      changeDitto("female", event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>{t("gen6EggDitto")}</span>
                </label>
                <div className="gen6egg-iv-grid">
                  {ivEditor(femaleIvs, setFemaleIvs)}
                </div>
              </fieldset>
            </div>
            <div className="gen6egg-setting-grid">
              <label className="checkbox-field">
                <input
                  checked={nidoType}
                  disabled={genderRatio !== "one-to-one"}
                  onChange={(event) => setNidoType(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen6EggNidoType")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={shinyCharm}
                  onChange={(event) => setShinyCharm(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen6EggShinyCharm")}</span>
              </label>
              <label className="checkbox-field">
                <input
                  checked={masudaMethod}
                  onChange={(event) => setMasudaMethod(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen6EggMasuda")}</span>
              </label>
            </div>
            <label className="checkbox-field">
              <input
                checked={considerOtherTsv}
                disabled={!acceptEgg && !shinyCharm && !masudaMethod}
                onChange={(event) => setConsiderOtherTsv(event.target.checked)}
                type="checkbox"
              />
              <span>{t("gen6EggOtherTsvShiny")}</span>
            </label>
            {considerOtherTsv && (
              <label className="field">
                <span>{t("gen6EggOtherTsvList")}</span>
                <input
                  value={otherTsvs}
                  onChange={(event) => setOtherTsvs(event.target.value)}
                />
              </label>
            )}
          </details>
          <details className="gen6egg-disclosure">
            <summary>{t("filters")}</summary>
            <div className="gen6egg-filter-grid">
              <label className="checkbox-field">
                <input
                  checked={filtersDisabled}
                  onChange={(event) => setFiltersDisabled(event.target.checked)}
                  type="checkbox"
                />
                <span>{t("gen6EggDisableFilters")}</span>
              </label>
              <label className="field">
                <span>{t("shiny")}</span>
                <Select
                  disabled={filtersDisabled}
                  value={shinyFilter}
                  onChange={(event) =>
                    setShinyFilter(event.target.value as Gen6EggShinyFilter)
                  }
                >
                  <option value="any">{t("any")}</option>
                  <option value="shiny">{t("shinyAny")}</option>
                  <option value="square">{t("shinySquare")}</option>
                </Select>
              </label>
              <label className="field">
                <span>{t("gender")}</span>
                <Select
                  disabled={filtersDisabled}
                  value={genderFilter}
                  onChange={(event) =>
                    setGenderFilter(event.target.value as Gen6EggGenderFilter)
                  }
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
                  disabled={filtersDisabled}
                  value={abilityFilter}
                  onChange={(event) =>
                    setAbilityFilter(event.target.value as Gen6EggAbilityFilter)
                  }
                >
                  <option value="any">{t("any")}</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="hidden">H</option>
                </Select>
              </label>
              <MultiCheckSelect
                anyLabel={t("any")}
                disabled={filtersDisabled}
                label={t("nature")}
                mask={natureMask}
                onChange={setNatureMask}
                options={natureOptions}
                resetHint={t("checkListResetHint")}
              />
              <MultiCheckSelect
                anyLabel={t("any")}
                disabled={filtersDisabled}
                label={t("hiddenPower")}
                mask={hiddenPowerMask}
                onChange={setHiddenPowerMask}
                options={hiddenPowerOptions}
                resetHint={t("checkListResetHint")}
              />
              {(maleItem === "everstone" || femaleItem === "everstone") && (
                <label className="field">
                  <span>{t("gen6EggNatureParent")}</span>
                  <Select
                    disabled={filtersDisabled}
                    value={natureParent}
                    onChange={(event) =>
                      setNatureParent(event.target.value as Gen6EggParentFilter)
                    }
                  >
                    <option value="any">{t("any")}</option>
                    <option value="male">{t("gen6EggMaleParent")}</option>
                    <option value="female">{t("gen6EggFemaleParent")}</option>
                  </Select>
                </label>
              )}
            </div>
            <div className="gen6egg-iv-filter">
              <div>{ivEditor(ivMin, setIvMin)}</div>
              <div>{ivEditor(ivMax, setIvMax)}</div>
            </div>
            <PerfectIvFilterFields
              count={perfectIvCount}
              disabled={filtersDisabled}
              onCountChange={setPerfectIvCount}
              onValueChange={setPerfectIvValue}
              value={perfectIvValue}
            />
          </details>
          <div className="gen6egg-actions">
            <label className="field">
              <span>{t("gen6EggResultLimit")}</span>
              <input
                inputMode="numeric"
                max={GEN6_EGG_MAX_RESULTS}
                min={1}
                value={resultLimit}
                onChange={(event) =>
                  setResultLimit(
                    normalizeDecimalInput(
                      event.target.value,
                      GEN6_EGG_MAX_RESULTS,
                    ),
                  )
                }
              />
            </label>
            <button
              className="primary-action"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play size={16} />
              {t("generate")}
            </button>
            <button
              disabled={status !== "calculating"}
              onClick={cancel}
              type="button"
            >
              <Square size={16} />
              {t("cancel")}
            </button>
            <button
              disabled={!results.length}
              onClick={exportCsv}
              type="button"
            >
              <Download size={16} />
              CSV
            </button>
            <button
              disabled={!results.length}
              onClick={() => setResults([])}
              type="button"
            >
              <Trash2 size={16} />
              {t("clear")}
            </button>
          </div>
          {(error || summary) && (
            <p className={error ? "gen6egg-error" : "gen6egg-summary"}>
              {error ||
                `${summary?.resultCount ?? 0} / ${summary?.processedStates ?? 0}`}
            </p>
          )}
        </section>
        <section className="panel gen6egg-results">
          <div className="gen6egg-heading">
            <h2>{t("gen6EggResults")}</h2>
            <span>{results.length.toLocaleString()}</span>
          </div>
          <div className="gen6egg-table-shell" ref={scrollRef}>
            <div
              className="gen6egg-table"
              style={{ height: virtualizer.getTotalSize() + 42 }}
            >
              <div className="gen6egg-head">
                {[
                  "Frame",
                  "Egg Seed",
                  "Random",
                  "EC",
                  "PID",
                  "IVs",
                  "Nature",
                  "Ability",
                  "Gender",
                  "Hidden Power",
                  "Shiny",
                  "PSV",
                  "PRV",
                ].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              {virtualizer.getVirtualItems().map((item) => {
                const result = results[item.index];
                const power = gen6EggHiddenPower(result.ivs);
                return (
                  <div
                    className="gen6egg-row"
                    key={`${result.frame}-${item.index}`}
                    style={{ transform: `translateY(${item.start + 42}px)` }}
                  >
                    <span>
                      {result.current ? t("gen6EggCurrent") : result.frame}
                    </span>
                    <span>
                      {result.eggSeed
                        .toString(16)
                        .toUpperCase()
                        .padStart(16, "0")}
                    </span>
                    <span>{formatGen6EggHex(result.random)}</span>
                    <span>{formatGen6EggHex(result.ec)}</span>
                    <span>{formatGen6EggHex(result.pid)}</span>
                    <span>{result.ivs.join("/")}</span>
                    <span>{GEN7_WILD_NATURES[language][result.nature]}</span>
                    <span>{result.ability}</span>
                    <span>
                      {result.gender === 1
                        ? t("male")
                        : result.gender === 2
                          ? t("female")
                          : t("genderless")}
                    </span>
                    <span>{`${POWER_KEYS[power.type] ? t(POWER_KEYS[power.type]) : power.type} ${power.power}`}</span>
                    <span>
                      {result.squareShiny
                        ? t("shinySquare")
                        : result.shiny
                          ? t("shinyAny")
                          : "-"}
                    </span>
                    <span>{result.psv}</span>
                    <span>{result.prv.toString(16).toUpperCase()}</span>
                  </div>
                );
              })}
            </div>
            {!results.length && (
              <div className="gen6egg-empty">
                {error ? t("invalidGen6EggInput") : t("emptyGen6Egg")}
              </div>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}
