import { Select } from "../shared/Select";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Play, Square, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeDecimalInput, normalizeHexInput } from "../../input";
import type { ThreeDsProfile } from "../3dsprofiles/domain";
import {
  gen6DexNavProfile,
  validateGen6DexNavRequest,
  type Gen6DexNavEncounterType,
  type Gen6DexNavFlute,
  type Gen6DexNavResult,
  type Gen6DexNavSlot,
} from "./domain";
import { Gen6DexNavUiPreviewEngine } from "./preview/Gen6DexNavUiPreviewEngine";
import type {
  Gen6DexNavEngine,
  Gen6DexNavProgress,
  Gen6DexNavSummary,
} from "./search";
import { Gen6DexNavWorker } from "./worker/Gen6DexNavWorker";
import "./Gen6DexNavPanel.css";

type Status = "ready" | "calculating" | "completed" | "cancelled" | "failed";
const EMPTY_SLOTS = Array.from({ length: 13 }, () => ({
  species: 261,
  level: 5,
}));
const RESULT_FIELDS = [
  "frame",
  "x",
  "y",
  "slot",
  "slotType",
  "boost",
  "lead",
  "synchronize",
  "levelBoost",
  "potential",
  "hiddenAbility",
  "eggMove",
  "forcedShiny",
] as const;
function parseDecimal(value: string) {
  return value.trim() === "" || !/^\d+$/.test(value.trim()) ? 0 : Number(value);
}
function parseHex(value: string) {
  return value.trim() === "" || !/^[\da-f]+$/i.test(value.trim())
    ? 0
    : Number.parseInt(value, 16) >>> 0;
}
function csvCell(value: unknown) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function Gen6DexNavPanel({
  profile,
  uiPreviewMode,
}: {
  profile?: ThreeDsProfile;
  uiPreviewMode: boolean;
}) {
  const { t } = useTranslation();
  const engine = useMemo<Gen6DexNavEngine>(
    () =>
      uiPreviewMode ? new Gen6DexNavUiPreviewEngine() : new Gen6DexNavWorker(),
    [uiPreviewMode],
  );
  const defaults = gen6DexNavProfile(profile);
  const [tinySeed, setTinySeed] = useState("00000000");
  const [minFrame, setMinFrame] = useState("0");
  const [maxFrame, setMaxFrame] = useState("10000");
  const [tinyFrame, setTinyFrame] = useState("0");
  const [encounterType, setEncounterType] =
    useState<Gen6DexNavEncounterType>("grass");
  const [activeSearch, setActiveSearch] = useState(true);
  const [hasDexNav, setHasDexNav] = useState(true);
  const [searchLevel, setSearchLevel] = useState("0");
  const [chainLength, setChainLength] = useState("0");
  const [shinyCharm, setShinyCharm] = useState(defaults.shinyCharm);
  const [compoundEyes, setCompoundEyes] = useState(false);
  const [forcedShiny, setForcedShiny] = useState(false);
  const [navHa, setNavHa] = useState(false);
  const [navUnown, setNavUnown] = useState(false);
  const [potential, setPotential] = useState("0");
  const [flute, setFlute] = useState<Gen6DexNavFlute>(0);
  const [tsv, setTsv] = useState(String(defaults.tsv));
  const [trv, setTrv] = useState(defaults.trv.toString(16).toUpperCase());
  const [resultLimit, setResultLimit] = useState("100000");
  const [slots, setSlots] = useState<Gen6DexNavSlot[]>(EMPTY_SLOTS);
  const [results, setResults] = useState<Gen6DexNavResult[]>([]);
  const [status, setStatus] = useState<Status>("ready");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Gen6DexNavSummary>();
  const [progress, setProgress] = useState<Gen6DexNavProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const abortRef = useRef<AbortController | undefined>(undefined);
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setTsv(String(defaults.tsv));
    setTrv(defaults.trv.toString(16).toUpperCase());
    setShinyCharm(defaults.shinyCharm);
  }, [defaults.shinyCharm, defaults.trv, defaults.tsv]);
  useEffect(() => () => engine.dispose(), [engine]);
  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 38,
    overscan: 12,
  });
  function updateSlot(index: number, key: keyof Gen6DexNavSlot, value: string) {
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [key]: parseDecimal(value) } : slot,
      ),
    );
  }
  function buildRequest() {
    return validateGen6DexNavRequest({
      tinySeed: parseHex(tinySeed),
      minFrame: parseDecimal(minFrame),
      maxFrame: parseDecimal(maxFrame),
      tinyFrame: parseDecimal(tinyFrame),
      encounterType,
      activeSearch,
      hasDexNav,
      searchLevel: parseDecimal(searchLevel),
      chainLength: parseDecimal(chainLength),
      shinyCharm,
      compoundEyes,
      forcedShiny,
      navHa,
      navUnown,
      potential: parseDecimal(potential),
      flute,
      tsv: parseDecimal(tsv),
      trv: parseHex(trv),
      slots,
      resultLimit: parseDecimal(resultLimit),
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
      setSummary(undefined);
      setError("");
      setStatus("calculating");
      setProgress({
        processedStates: 0,
        totalStates: request.maxFrame - request.minFrame + 1,
        resultCount: 0,
        percent: 0,
      });
      const next = await engine.search(request, {
        signal: controller.signal,
        onBatch: (batch) => setResults(batch),
        onProgress: setProgress,
      });
      setSummary(next);
      setStatus(next.cancelled ? "cancelled" : "completed");
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
    const rows = [
      RESULT_FIELDS.join(","),
      ...results.map((result) =>
        RESULT_FIELDS.map((field) => csvCell(result[field])).join(","),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", rows.join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "gen6-dexnav.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  function resultValue(
    result: Gen6DexNavResult,
    field: (typeof RESULT_FIELDS)[number],
  ) {
    if (
      field === "boost" ||
      field === "synchronize" ||
      field === "hiddenAbility" ||
      field === "eggMove" ||
      field === "forcedShiny"
    )
      return result[field] ? t("yes") : t("no");
    return result[field];
  }
  return (
    <form className="module-shell" onSubmit={submit}>
      <header className="module-heading">
        <div>
          <span className="eyebrow">{t("gen6DexNavEngine")}</span>
          <h1>{t("gen6DexNavModule")}</h1>
        </div>
        <div className="status-cluster">
          <span className={`status-dot ${status}`} />
          {t(status)}
        </div>
      </header>
      <div className="gen6dexnav-workspace">
        <section className="panel gen6dexnav-controls">
          <div className="gen6dexnav-heading">
            <h2>{t("gen6DexNavSetup")}</h2>
            <small>{progress.percent.toFixed(1)}%</small>
          </div>
          <div className="gen6dexnav-section">
            <h3>TinyMT</h3>
            <div className="gen6dexnav-grid">
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
                    setTsv(normalizeDecimalInput(event.target.value, 4))
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
                <span>{t("gen6DexNavResultLimit")}</span>
                <input
                  inputMode="numeric"
                  value={resultLimit}
                  onChange={(event) =>
                    setResultLimit(normalizeDecimalInput(event.target.value, 6))
                  }
                />
              </label>
            </div>
          </div>
          <div className="gen6dexnav-section">
            <h3>{t("gen6DexNavSettings")}</h3>
            <div className="gen6dexnav-grid">
              <label className="field">
                <span>{t("gen6WildEncounterType")}</span>
                <Select
                  value={encounterType}
                  onChange={(event) =>
                    setEncounterType(
                      event.target.value as Gen6DexNavEncounterType,
                    )
                  }
                >
                  <option value="grass">Grass</option>
                  <option value="tall-grass">Tall Grass</option>
                  <option value="surf">Surf</option>
                </Select>
              </label>
              <label className="field">
                <span>{t("gen6DexNavSearchLevel")}</span>
                <input
                  inputMode="numeric"
                  value={searchLevel}
                  onChange={(event) =>
                    setSearchLevel(normalizeDecimalInput(event.target.value, 3))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6DexNavChainLength")}</span>
                <input
                  inputMode="numeric"
                  value={chainLength}
                  onChange={(event) =>
                    setChainLength(normalizeDecimalInput(event.target.value, 3))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6DexNavPotential")}</span>
                <input
                  inputMode="numeric"
                  value={potential}
                  onChange={(event) =>
                    setPotential(normalizeDecimalInput(event.target.value, 1))
                  }
                />
              </label>
              <label className="field">
                <span>{t("gen6WildFlute")}</span>
                <Select
                  value={flute}
                  onChange={(event) =>
                    setFlute(Number(event.target.value) as Gen6DexNavFlute)
                  }
                >
                  <option value="0">-</option>
                  <option value="1">+</option>
                  <option value="-1">−</option>
                </Select>
              </label>
            </div>
            <div className="gen6dexnav-checks">
              {(
                [
                  ["activeSearch", activeSearch, setActiveSearch],
                  ["hasDexNav", hasDexNav, setHasDexNav],
                  ["gen6WildShinyCharm", shinyCharm, setShinyCharm],
                  ["gen6WildCompoundEyes", compoundEyes, setCompoundEyes],
                  ["gen6DexNavForcedShiny", forcedShiny, setForcedShiny],
                  ["gen6DexNavHiddenAbility", navHa, setNavHa],
                  ["gen6DexNavUnown", navUnown, setNavUnown],
                ] as const
              ).map(([key, checked, setter]) => (
                <label key={key}>
                  <input
                    checked={checked}
                    onChange={(event) => setter(event.target.checked)}
                    type="checkbox"
                  />
                  {t(key)}
                </label>
              ))}
            </div>
          </div>
          <div className="gen6dexnav-section">
            <h3>{t("gen6WildCustomSlots")}</h3>
            <div className="gen6dexnav-slots">
              {slots
                .slice(0, encounterType === "surf" ? 5 : 12)
                .map((slot, index) => (
                  <label className="gen6dexnav-slot" key={index}>
                    <span>{index + 1}</span>
                    <input
                      aria-label={`${t("species")} ${index + 1}`}
                      inputMode="numeric"
                      value={slot.species}
                      onChange={(event) =>
                        updateSlot(index, "species", event.target.value)
                      }
                    />
                    <input
                      aria-label={`${t("level")} ${index + 1}`}
                      inputMode="numeric"
                      value={slot.level}
                      onChange={(event) =>
                        updateSlot(index, "level", event.target.value)
                      }
                    />
                  </label>
                ))}
            </div>
          </div>
          <div className="gen6dexnav-actions">
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
              disabled={!results.length}
              onClick={exportCsv}
              type="button"
            >
              <Download aria-hidden="true" size={16} />
              CSV
            </button>
            <button
              disabled={!results.length}
              onClick={() => setResults([])}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
              {t("clear")}
            </button>
            {status === "calculating" && (
              <progress max={100} value={progress.percent} />
            )}
          </div>
          {(error || summary) && (
            <p className={error ? "gen6dexnav-error" : "gen6dexnav-summary"}>
              {error ||
                `${summary?.resultCount ?? 0} / ${summary?.processedStates ?? 0}`}
            </p>
          )}
        </section>
        <section className="panel gen6dexnav-results-panel">
          <div className="gen6dexnav-heading">
            <h2>{t("gen6DexNavModule")}</h2>
            <span>{results.length.toLocaleString()}</span>
          </div>
          <div className="gen6dexnav-results" ref={tableRef}>
            <div
              className="gen6dexnav-table"
              style={{ height: virtualizer.getTotalSize() + 42 }}
            >
              <div className="gen6dexnav-table-head">
                {RESULT_FIELDS.map((field) => (
                  <span key={field}>
                    {t(
                      `gen6DexNavResult${field.charAt(0).toUpperCase()}${field.slice(1)}`,
                    )}
                  </span>
                ))}
              </div>
              {virtualizer.getVirtualItems().map((item) => {
                const result = results[item.index];
                return (
                  <div
                    className="gen6dexnav-table-row"
                    key={`${result.frame}-${item.index}`}
                    style={{ transform: `translateY(${item.start + 42}px)` }}
                  >
                    {RESULT_FIELDS.map((field) => (
                      <span key={field}>{resultValue(result, field)}</span>
                    ))}
                  </div>
                );
              })}
            </div>
            {results.length === 0 && (
              <div className="gen6dexnav-empty">
                {error ? t("invalidGen6DexNavInput") : t("emptyGen6DexNav")}
              </div>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}
