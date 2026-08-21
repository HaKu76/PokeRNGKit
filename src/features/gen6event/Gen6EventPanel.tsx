import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, FolderOpen, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ThreeDsProfile } from "../3dsprofiles/domain";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import { MultiCheckSelect } from "../shared/MultiCheckSelect";
import {
  formatGen6EventHex,
  gen6EventDefaultSettings,
  gen6EventProfile,
  parseGen6EventDecimal,
  parseGen6EventHex,
  parseGen6WonderCard,
  validateGen6EventRequest,
  type Gen6EventFilters,
  type Gen6EventIvTuple,
  type Gen6EventPidType,
  type Gen6EventRequest,
  type Gen6EventResult,
  type Gen6EventSettings,
  type Gen6EventVersion,
} from "./domain";
import {
  GEN6_EVENT_NATURES,
  GEN6_EVENT_SPECIES,
  gen6EventFormCount,
} from "./data";
import type { Gen6EventEngine } from "./search";
import { Gen6EventUiPreviewEngine } from "./preview/Gen6EventUiPreviewEngine";
import { Gen6EventWorker } from "./worker/Gen6EventWorker";
import { Gen6EventTimeWorker } from "./worker/Gen6EventTimeWorker";
import { Gen6EventTimePreviewEngine } from "./preview/Gen6EventTimePreviewEngine";
import {
  formatGen6EventTimeEpoch,
  gen6EventTimeEpochFromInput,
  validateGen6EventTimeRequest,
  type Gen6EventTimeRequest,
  type Gen6EventTimeResult,
} from "./timeDomain";
import type { Gen6EventTimeEngine } from "./timeSearch";
import "./Gen6EventPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
type MutableIvTuple = [number, number, number, number, number, number];

const IV_LABELS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
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
const TABLE_HEADER_HEIGHT = 44;
const ROW_HEIGHT = 42;

function languageFor(value: string | undefined) {
  return value === "ja" || value === "zh" ? value : "en";
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function mutableIvs(values: Gen6EventIvTuple): MutableIvTuple {
  return [...values] as MutableIvTuple;
}

function baseFilters(): Gen6EventFilters {
  return {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: ALL_NATURES,
    hiddenPowerMask: ALL_HIDDEN_POWERS,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  };
}

function shinyLabel(value: number, t: (key: string) => string) {
  return value === 2
    ? t("shinySquare")
    : value === 1
      ? t("shinyStar")
      : t("no");
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

export function Gen6EventPanel({
  profile,
  uiPreviewMode = false,
  timeFinderMode = false,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode?: boolean;
  timeFinderMode?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const language = languageFor(i18n.language);
  const profileInfo = gen6EventProfile(profile);
  const [version, setVersion] = useState<Gen6EventVersion>(profileInfo.version);
  const [seed, setSeed] = useState("00000000");
  const [startDate, setStartDate] = useState("2000-01-01T00:00:00");
  const [endDate, setEndDate] = useState("2000-01-01T00:01:00");
  const [minFrame, setMinFrame] = useState("0");
  const [maxFrame, setMaxFrame] = useState("1000");
  const [tsv, setTsv] = useState(String(profileInfo.tsv));
  const [trv, setTrv] = useState(profileInfo.trv.toString(16).toUpperCase());
  const [delay, setDelay] = useState("0");
  const [considerDelay, setConsiderDelay] = useState(false);
  const [settings, setSettings] = useState<Gen6EventSettings>(() =>
    gen6EventDefaultSettings(25, 0),
  );
  const [filters, setFilters] = useState<Gen6EventFilters>(baseFilters);
  const [resultLimit, setResultLimit] = useState("100000");
  const [results, setResults] = useState<
    (Gen6EventResult | Gen6EventTimeResult)[]
  >([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] =
    useState<Awaited<ReturnType<Gen6EventEngine["search"]>>>();
  const tableRef = useRef<HTMLDivElement>(null);
  const engine = useMemo<Gen6EventEngine>(
    () =>
      uiPreviewMode ? new Gen6EventUiPreviewEngine() : new Gen6EventWorker(),
    [uiPreviewMode],
  );
  const timeEngine = useMemo<Gen6EventTimeEngine>(
    () =>
      uiPreviewMode
        ? new Gen6EventTimePreviewEngine()
        : new Gen6EventTimeWorker(),
    [uiPreviewMode],
  );
  const species = GEN6_EVENT_SPECIES[language];
  const natureOptions = NATURE_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const powerOptions = POWER_KEYS.map((key, value) => ({
    label: t(key),
    value,
  }));
  const formCount = gen6EventFormCount(settings.species);
  const formOptions = useMemo(
    () => Array.from({ length: formCount }, (_, value) => value),
    [formCount],
  );
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  useEffect(() => {
    setVersion(profileInfo.version);
    setTsv(String(profileInfo.tsv));
    setTrv(profileInfo.trv.toString(16).toUpperCase());
  }, [profileInfo.trv, profileInfo.tsv, profileInfo.version]);
  useEffect(() => {
    if (settings.form >= formCount)
      setSettings((current) => ({ ...current, form: 0 }));
  }, [formCount, settings.form]);
  useEffect(
    () => () => {
      engine.dispose();
      timeEngine.dispose();
    },
    [engine, timeEngine],
  );

  const request = (): Gen6EventRequest => ({
    version,
    seed: parseGen6EventHex(seed),
    minFrame: parseGen6EventDecimal(minFrame),
    maxFrame: parseGen6EventDecimal(maxFrame),
    tsv: parseGen6EventDecimal(tsv),
    trv: parseGen6EventHex(trv),
    delay: parseGen6EventDecimal(delay),
    considerDelay,
    event: settings,
    filters,
    resultLimit: parseGen6EventDecimal(resultLimit),
  });
  const timeRequest = (): Gen6EventTimeRequest => {
    const startEpoch = gen6EventTimeEpochFromInput(startDate);
    const endEpoch = gen6EventTimeEpochFromInput(endDate);
    if (typeof startEpoch !== "bigint" || typeof endEpoch !== "bigint")
      throw new TypeError("Invalid Gen VI Event Time Finder date range.");
    return validateGen6EventTimeRequest({
      ...request(),
      startEpoch,
      endEpoch,
      saveVariable: profile?.saveVariable ?? 0,
      timeVariable: profile?.timeVariable ?? 0,
    });
  };

  const run = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setResults([]);
    setSummary(undefined);
    setStatus("calculating");
    try {
      const nextRequest = timeFinderMode ? timeRequest() : request();
      validateGen6EventRequest(nextRequest);
      const next = timeFinderMode
        ? await timeEngine.search(nextRequest as Gen6EventTimeRequest, {
            onBatch: (batch) =>
              setResults((current) =>
                current.concat(batch as Gen6EventResult[]),
              ),
            onProgress: setProgress,
          })
        : await engine.search(nextRequest as Gen6EventRequest, {
            onBatch: (batch) => setResults(batch),
            onProgress: setProgress,
          });
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const updateSetting = <K extends keyof Gen6EventSettings>(
    key: K,
    value: Gen6EventSettings[K],
  ) => setSettings((current) => ({ ...current, [key]: value }));

  const importWonderCard = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = parseGen6WonderCard(
        file.name,
        new Uint8Array(await file.arrayBuffer()),
      );
      setSettings(parsed);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const exportCsv = () => {
    if (!results.length) return;
    const headers = [
      ...(timeFinderMode ? [t("gen7TimeDate"), t("gen7TimeInitialSeed")] : []),
      "Frame",
      "Random",
      "EC",
      "PID",
      ...IV_LABELS,
      t("nature"),
      t("ability"),
      t("gender"),
      t("hiddenPower"),
      t("shiny"),
      "Delay",
      "Frame Used",
      "PSV",
      "PRV",
    ];
    const rows = results.map((result) => [
      ...(timeFinderMode && "epoch" in result
        ? [
            formatGen6EventTimeEpoch(result.epoch),
            formatGen6EventHex(result.initialSeed),
          ]
        : []),
      result.frame,
      formatGen6EventHex(result.random),
      formatGen6EventHex(result.ec),
      formatGen6EventHex(result.pid),
      ...result.ivs,
      GEN6_EVENT_NATURES[language][result.nature],
      abilityLabel(result.ability, t),
      genderLabel(result.gender, t),
      t(POWER_KEYS[result.hiddenPower]),
      shinyLabel(result.shiny, t),
      result.delay,
      result.frameUsed,
      result.psv,
      result.prv.toString(16).toUpperCase(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen6event-${version}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const clearResults = () => {
    setResults([]);
    setSummary(undefined);
    setError("");
    setStatus("ready");
    setProgress({
      processedStates: 0,
      totalStates: 0,
      resultCount: 0,
      percent: 0,
    });
  };

  const setFixedIv = (index: number, value: number) => {
    const next = mutableIvs(settings.fixedIvs);
    next[index] = value;
    updateSetting("fixedIvs", next);
  };
  const setFilterIv = (
    key: "ivMin" | "ivMax",
    index: number,
    value: number,
  ) => {
    const next = mutableIvs(filters[key]);
    next[index] = value;
    setFilters((current) => ({ ...current, [key]: next }));
  };

  return (
    <div className="gen6event-panel">
      <div className="gen6event-workspace">
        <form className="panel gen6event-controls" onSubmit={run}>
          <div className="gen6event-heading">
            <div>
              <span className="panel-index">01</span>
              <h2>
                {t(timeFinderMode ? "gen6EventTimeModule" : "gen6EventSetup")}
              </h2>
            </div>
            <span className="panel-note">MT / Event6</span>
          </div>

          <section className="gen6event-section">
            <h3>{t("rngInfo")}</h3>
            <div className="gen6event-grid">
              {timeFinderMode && (
                <>
                  <label className="field">
                    <span>{t("gen7TimeStart")}</span>
                    <input
                      disabled={status === "calculating"}
                      type="datetime-local"
                      step="1"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{t("gen7TimeEnd")}</span>
                    <input
                      disabled={status === "calculating"}
                      type="datetime-local"
                      step="1"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </label>
                </>
              )}
              {!timeFinderMode && (
                <label className="field">
                  <span>{t("version")}</span>
                  <Select
                    disabled={status === "calculating"}
                    value={version}
                    onChange={(event) =>
                      setVersion(event.target.value as Gen6EventVersion)
                    }
                  >
                    <option value="x">X</option>
                    <option value="y">Y</option>
                    <option value="omega-ruby">Omega Ruby</option>
                    <option value="alpha-sapphire">Alpha Sapphire</option>
                  </Select>
                </label>
              )}
              {!timeFinderMode && (
                <label className="field">
                  <span>{t("seed")}</span>
                  <div className="prefixed-input">
                    <span>0x</span>
                    <input
                      disabled={status === "calculating"}
                      inputMode="text"
                      maxLength={8}
                      value={seed}
                      onChange={(event) =>
                        setSeed(normalizeHexInput(event.target.value, 8))
                      }
                    />
                  </div>
                </label>
              )}
              <label className="field">
                <span>{t("gen6StationaryFrameRange")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={5_000_000}
                  value={minFrame}
                  onChange={(event) =>
                    setMinFrame(
                      normalizeDecimalInput(event.target.value, 5_000_000, 10),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen7StationaryMaxFrame")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={5_000_000}
                  value={maxFrame}
                  onChange={(event) =>
                    setMaxFrame(
                      normalizeDecimalInput(event.target.value, 5_000_000, 10),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>TSV</span>
                <input
                  disabled={status === "calculating" || !settings.yourId}
                  inputMode="numeric"
                  max={4095}
                  value={tsv}
                  onChange={(event) =>
                    setTsv(normalizeDecimalInput(event.target.value, 4095, 4))
                  }
                />
              </label>
              <label className="field">
                <span>TRV</span>
                <div className="prefixed-input">
                  <span>0x</span>
                  <input
                    disabled={status === "calculating" || !settings.yourId}
                    inputMode="text"
                    maxLength={1}
                    value={trv}
                    onChange={(event) =>
                      setTrv(normalizeHexInput(event.target.value, 1))
                    }
                  />
                </div>
              </label>
              <label className="field">
                <span>{t("delay")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={4000}
                  value={delay}
                  onChange={(event) =>
                    setDelay(normalizeDecimalInput(event.target.value, 4000, 4))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6StationaryResultLimit")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={100000}
                  min={1}
                  value={resultLimit}
                  onChange={(event) =>
                    setResultLimit(
                      normalizeDecimalInput(event.target.value, 100000, 6),
                    )
                  }
                />
              </label>
              <label className="checkbox-field gen6event-inline-toggle">
                <input
                  checked={considerDelay}
                  disabled={status === "calculating"}
                  type="checkbox"
                  onChange={(event) => setConsiderDelay(event.target.checked)}
                />
                <span>{t("gen6EventConsiderDelay")}</span>
              </label>
            </div>
          </section>

          <section className="gen6event-section">
            <div className="gen6event-section-title">
              <h3>{t("gen6EventSetup")}</h3>
              <label className="gen6event-import-button">
                <FolderOpen aria-hidden="true" size={16} />
                <span>{t("gen6EventImport")}</span>
                <input
                  accept=".wc6,.wc6full"
                  hidden
                  type="file"
                  onChange={(event) =>
                    void importWonderCard(event.target.files?.[0])
                  }
                />
              </label>
            </div>
            <div className="gen6event-grid">
              <label className="field">
                <span>{t("species")}</span>
                <Select
                  disabled={status === "calculating"}
                  value={settings.species}
                  onChange={(event) =>
                    updateSetting("species", Number(event.target.value))
                  }
                >
                  {species.map((name, value) => (
                    <option key={value} value={value}>
                      {value}: {name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{t("form")}</span>
                <Select
                  disabled={status === "calculating"}
                  value={settings.form}
                  onChange={(event) =>
                    updateSetting("form", Number(event.target.value))
                  }
                >
                  {formOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="field">
                <span>{t("level")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={100}
                  value={settings.level}
                  onChange={(event) =>
                    updateSetting(
                      "level",
                      parseGen6EventDecimal(event.target.value),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6EventRandomPerfectIvs")}</span>
                <input
                  disabled={status === "calculating"}
                  inputMode="numeric"
                  max={5}
                  value={settings.randomPerfectIvCount}
                  onChange={(event) =>
                    updateSetting(
                      "randomPerfectIvCount",
                      parseGen6EventDecimal(event.target.value),
                    )
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6EventPidType")}</span>
                <Select
                  disabled={status === "calculating"}
                  value={settings.pidType}
                  onChange={(event) =>
                    updateSetting(
                      "pidType",
                      event.target.value as Gen6EventPidType,
                    )
                  }
                >
                  <option value="random">{t("gen6EventPidRandom")}</option>
                  <option value="nonshiny">{t("gen6EventPidNonshiny")}</option>
                  <option value="shiny">{t("gen6EventPidShiny")}</option>
                  <option value="specified">
                    {t("gen6EventPidSpecified")}
                  </option>
                </Select>
              </label>
              <label className="checkbox-field gen6event-checkbox">
                <input
                  checked={settings.yourId}
                  disabled={status === "calculating"}
                  type="checkbox"
                  onChange={(event) =>
                    updateSetting("yourId", event.target.checked)
                  }
                />
                <span>{t("gen6EventYourId")}</span>
              </label>
              <label className="checkbox-field gen6event-checkbox">
                <input
                  checked={settings.isEgg}
                  disabled={status === "calculating"}
                  type="checkbox"
                  onChange={(event) =>
                    updateSetting("isEgg", event.target.checked)
                  }
                />
                <span>{t("gen6EventEgg")}</span>
              </label>
              <label className="checkbox-field gen6event-checkbox">
                <input
                  checked={settings.otherInfo}
                  disabled={status === "calculating"}
                  type="checkbox"
                  onChange={(event) =>
                    updateSetting("otherInfo", event.target.checked)
                  }
                />
                <span>{t("gen6EventOtherInfo")}</span>
              </label>
            </div>
            <div className="gen6event-lock-grid">
              <label className="gen6event-lock-field">
                <span className="checkbox-field">
                  <input
                    checked={settings.abilityLocked}
                    disabled={status === "calculating"}
                    type="checkbox"
                    onChange={(event) =>
                      updateSetting("abilityLocked", event.target.checked)
                    }
                  />
                  <span>{t("gen6EventAbilityLocked")}</span>
                </span>
                <Select
                  disabled={!settings.abilityLocked || status === "calculating"}
                  value={settings.ability}
                  onChange={(event) =>
                    updateSetting("ability", Number(event.target.value))
                  }
                >
                  <option value={0}>{t("any")}</option>
                  <option value={1}>{t("abilityFirst")}</option>
                  <option value={2}>{t("abilitySecond")}</option>
                  <option value={3}>{t("gen6StationaryHiddenAbility")}</option>
                </Select>
              </label>
              <label className="gen6event-lock-field">
                <span className="checkbox-field">
                  <input
                    checked={settings.natureLocked}
                    disabled={status === "calculating"}
                    type="checkbox"
                    onChange={(event) =>
                      updateSetting("natureLocked", event.target.checked)
                    }
                  />
                  <span>{t("gen6EventNatureLocked")}</span>
                </span>
                <Select
                  disabled={!settings.natureLocked || status === "calculating"}
                  value={settings.nature}
                  onChange={(event) =>
                    updateSetting("nature", Number(event.target.value))
                  }
                >
                  {natureOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="gen6event-lock-field">
                <span className="checkbox-field">
                  <input
                    checked={settings.genderLocked}
                    disabled={status === "calculating"}
                    type="checkbox"
                    onChange={(event) =>
                      updateSetting("genderLocked", event.target.checked)
                    }
                  />
                  <span>{t("gen6EventGenderLocked")}</span>
                </span>
                <Select
                  disabled={!settings.genderLocked || status === "calculating"}
                  value={settings.gender}
                  onChange={(event) =>
                    updateSetting("gender", Number(event.target.value))
                  }
                >
                  <option value={0}>{t("genderless")}</option>
                  <option value={1}>{t("male")}</option>
                  <option value={2}>{t("female")}</option>
                </Select>
              </label>
            </div>
          </section>

          <details className="gen6event-disclosure" open>
            <summary>{t("gen6EventFixedIvs")}</summary>
            <div className="gen6event-fixed-grid">
              {IV_LABELS.map((label, index) => (
                <label key={label}>
                  <span className="checkbox-field">
                    <input
                      checked={settings.fixedIvs[index] >= 0}
                      disabled={status === "calculating"}
                      type="checkbox"
                      onChange={(event) =>
                        setFixedIv(index, event.target.checked ? 0 : -1)
                      }
                    />
                    <span>{label}</span>
                  </span>
                  <input
                    disabled={
                      settings.fixedIvs[index] < 0 || status === "calculating"
                    }
                    inputMode="numeric"
                    max={31}
                    value={
                      settings.fixedIvs[index] < 0
                        ? ""
                        : settings.fixedIvs[index]
                    }
                    onChange={(event) =>
                      setFixedIv(
                        index,
                        parseGen6EventDecimal(event.target.value),
                      )
                    }
                  />
                </label>
              ))}
            </div>
          </details>

          <details className="gen6event-disclosure" open>
            <summary>{t("filters")}</summary>
            <fieldset
              className="gen6event-filter-controls"
              disabled={filters.disabled || status === "calculating"}
            >
              <div className="gen6event-grid disclosure-content">
                <label className="field">
                  <span>{t("shiny")}</span>
                  <Select
                    value={filters.shiny}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        shiny: event.target.value as Gen6EventFilters["shiny"],
                      }))
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
                    value={filters.gender}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        gender: event.target
                          .value as Gen6EventFilters["gender"],
                      }))
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
                    value={filters.ability}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        ability: event.target
                          .value as Gen6EventFilters["ability"],
                      }))
                    }
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
                    setFilters((current) => ({ ...current, natureMask: value }))
                  }
                  options={natureOptions}
                  resetHint={t("checkListResetHint")}
                />
                <MultiCheckSelect
                  anyLabel={t("any")}
                  label={t("hiddenPower")}
                  mask={filters.hiddenPowerMask}
                  onChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      hiddenPowerMask: value,
                    }))
                  }
                  options={powerOptions}
                  resetHint={t("checkListResetHint")}
                />
                <label className="field">
                  <span>{t("gen6StationaryPerfectIvValue")}</span>
                  <input
                    inputMode="numeric"
                    max={31}
                    value={filters.perfectIvValue}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        perfectIvValue: parseGen6EventDecimal(
                          event.target.value,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("gen6StationaryPerfectIvCount")}</span>
                  <input
                    inputMode="numeric"
                    max={6}
                    value={filters.perfectIvCount}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        perfectIvCount: parseGen6EventDecimal(
                          event.target.value,
                        ),
                      }))
                    }
                  />
                </label>
              </div>
              <div className="gen6event-iv-filter">
                <div className="gen6event-iv-header">
                  <span>{t("ivs")}</span>
                  <span>{t("minimum")}</span>
                  <span>{t("maximum")}</span>
                </div>
                {IV_LABELS.map((label, index) => (
                  <div className="gen6event-iv-row" key={label}>
                    <span>{label}</span>
                    <input
                      inputMode="numeric"
                      max={31}
                      value={filters.ivMin[index]}
                      onChange={(event) =>
                        setFilterIv(
                          "ivMin",
                          index,
                          parseGen6EventDecimal(event.target.value),
                        )
                      }
                    />
                    <input
                      inputMode="numeric"
                      max={31}
                      value={filters.ivMax[index]}
                      onChange={(event) =>
                        setFilterIv(
                          "ivMax",
                          index,
                          parseGen6EventDecimal(event.target.value),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </fieldset>
            <label className="checkbox-field gen6event-disable-filter">
              <input
                checked={filters.disabled}
                disabled={status === "calculating"}
                type="checkbox"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    disabled: event.target.checked,
                  }))
                }
              />
              <span>{t("disableFilters")}</span>
            </label>
          </details>

          <details className="gen6event-disclosure">
            <summary>{t("gen6EventOtherInfo")}</summary>
            <fieldset
              disabled={!settings.otherInfo || status === "calculating"}
            >
              <div className="gen6event-grid disclosure-content">
                <label className="field">
                  <span>TID</span>
                  <input
                    inputMode="numeric"
                    max={65535}
                    value={settings.tid}
                    onChange={(event) =>
                      updateSetting(
                        "tid",
                        parseGen6EventDecimal(event.target.value),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>SID</span>
                  <input
                    inputMode="numeric"
                    max={65535}
                    value={settings.sid}
                    onChange={(event) =>
                      updateSetting(
                        "sid",
                        parseGen6EventDecimal(event.target.value),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>EC</span>
                  <div className="prefixed-input">
                    <span>0x</span>
                    <input
                      inputMode="text"
                      maxLength={8}
                      value={formatGen6EventHex(settings.ec)}
                      onChange={(event) =>
                        updateSetting(
                          "ec",
                          parseGen6EventHex(event.target.value),
                        )
                      }
                    />
                  </div>
                </label>
                <label className="field">
                  <span>PID</span>
                  <div className="prefixed-input">
                    <span>0x</span>
                    <input
                      disabled={settings.pidType !== "specified"}
                      inputMode="text"
                      maxLength={8}
                      value={formatGen6EventHex(settings.pid)}
                      onChange={(event) =>
                        updateSetting(
                          "pid",
                          parseGen6EventHex(event.target.value),
                        )
                      }
                    />
                  </div>
                </label>
              </div>
            </fieldset>
          </details>

          <div className="gen6event-actions">
            <button
              className="gen6event-primary"
              disabled={status === "calculating"}
              type="submit"
            >
              <Play aria-hidden="true" size={17} />
              {t(timeFinderMode ? "search" : "generate")}
            </button>
            <button
              aria-label={t("cancel")}
              className="gen6event-icon"
              disabled={status !== "calculating"}
              title={t("cancel")}
              type="button"
              onClick={() => (timeFinderMode ? timeEngine : engine).cancel()}
            >
              <Square aria-hidden="true" size={16} />
            </button>
          </div>
        </form>

        <section className="panel gen6event-results">
          <div className="gen6event-heading">
            <div>
              <span className="panel-index">02</span>
              <h2>{t("results")}</h2>
              <span className={`run-status ${status}`}>{t(status)}</span>
            </div>
            <div className="gen6event-result-actions">
              <output>{results.length.toLocaleString()}</output>
              <button
                aria-label={t("exportCsv")}
                className="gen6event-icon"
                disabled={!results.length}
                title={t("exportCsv")}
                type="button"
                onClick={exportCsv}
              >
                <Download aria-hidden="true" size={17} />
              </button>
              <button
                aria-label={t("clear")}
                className="gen6event-icon"
                disabled={!results.length}
                title={t("clear")}
                type="button"
                onClick={clearResults}
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
          </div>
          <div className="metrics-row gen6event-metrics">
            <span>
              {t("gen6StationaryFrames")}{" "}
              <strong>{progress.processedStates.toLocaleString()}</strong>
            </span>
            <span>
              {t("results")}{" "}
              <strong>{progress.resultCount.toLocaleString()}</strong>
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
          <div className="table-shell gen6event-table-shell" ref={tableRef}>
            {!results.length ? (
              <div className="empty-state">
                <strong>{t("emptyGen6Event")}</strong>
              </div>
            ) : (
              <div
                className="gen6event-table"
                style={{
                  height: `${virtualizer.getTotalSize() + TABLE_HEADER_HEIGHT}px`,
                }}
              >
                <div className="gen6event-table-header">
                  {[
                    ...(timeFinderMode
                      ? [t("gen7TimeDate"), t("gen7TimeInitialSeed")]
                      : []),
                    "Frame",
                    "Random",
                    "EC",
                    "PID",
                    ...IV_LABELS,
                    t("nature"),
                    t("ability"),
                    t("gender"),
                    t("hiddenPower"),
                    t("shiny"),
                    "Delay",
                    "Adv.",
                    "PSV",
                    "PRV",
                  ].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const result = results[virtualRow.index];
                  return (
                    <div
                      className="gen6event-table-row"
                      key={`${result.frame}-${virtualRow.index}`}
                      style={{
                        transform: `translateY(${virtualRow.start + TABLE_HEADER_HEIGHT}px)`,
                      }}
                    >
                      {timeFinderMode && "epoch" in result && (
                        <>
                          <span>{formatGen6EventTimeEpoch(result.epoch)}</span>
                          <span>{formatGen6EventHex(result.initialSeed)}</span>
                        </>
                      )}
                      <span>{result.frame}</span>
                      <span>{formatGen6EventHex(result.random)}</span>
                      <span>{formatGen6EventHex(result.ec)}</span>
                      <span>{formatGen6EventHex(result.pid)}</span>
                      {result.ivs.map((iv, index) => (
                        <span key={IV_LABELS[index]}>{iv}</span>
                      ))}
                      <span>{GEN6_EVENT_NATURES[language][result.nature]}</span>
                      <span>{abilityLabel(result.ability, t)}</span>
                      <span>{genderLabel(result.gender, t)}</span>
                      <span>{t(POWER_KEYS[result.hiddenPower])}</span>
                      <span>{shinyLabel(result.shiny, t)}</span>
                      <span>{result.delay}</span>
                      <span>{result.frameUsed}</span>
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
