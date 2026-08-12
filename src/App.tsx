import { useVirtualizer } from "@tanstack/react-virtual";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  calculateRsSeed,
  formatHex,
  parseDecimal,
  parseHex,
  validateId3Request,
  type Id3Mode,
  type Id3Request,
  type Id3State,
} from "./features/id/domain";
import { Gen3IdSearcherPanel } from "./features/id/Gen3IdSearcherPanel";
import { Gen3IdUiPreviewEngine } from "./features/id/preview/Gen3IdUiPreviewEngine";
import type {
  Id3SearchEngine,
  Id3SearchProgress,
  Id3SearchSummary,
} from "./features/id/search";
import { Gen3IdWorkerPool } from "./features/id/worker/Gen3IdWorkerPool";
import { Gen3EggPanel } from "./features/egg/Gen3EggPanel";
import { EncounterLookupPanel } from "./features/encounterlookup/EncounterLookupPanel";
import { Gen3IvCalculator } from "./features/ivcalculator/Gen3IvCalculator";
import { Gen3ProfileControls } from "./features/profiles/Gen3ProfileControls";
import {
  initialGen3ProfilePanelExpanded,
  persistGen3ProfilePanelExpanded,
} from "./features/profiles/profilePanelState";
import {
  gen3EggProfileOrDefault,
  gen3StaticProfileOrDefault,
} from "./features/profiles/domain";
import { useGen3Profiles } from "./features/profiles/useGen3Profiles";
import { Gen3InitialSeedPanel } from "./features/initialseed/Gen3InitialSeedPanel";
import { Gen3SeedToTimePanel } from "./features/seedtotime/Gen3SeedToTimePanel";
import { Gen3SpindaPainterPanel } from "./features/spindapainter/Gen3SpindaPainterPanel";
import { Gen3IvToPidPanel } from "./features/ivtopid/Gen3IvToPidPanel";
import { Gen3StaticPanel } from "./features/static/Gen3StaticPanel";
import { Gen3WildPanel } from "./features/wild/Gen3WildPanel";
import { normalizeDecimalInput, normalizeHexInput } from "./input";
import { useTheme } from "./theme";

type SortKey = keyof Id3State;
type SupportedLanguage = "zh" | "en" | "ja";
type ActiveModule =
  | "id"
  | "initialseed"
  | "seedtotime"
  | "static"
  | "wild"
  | "ivtopid"
  | "egg"
  | "spindapainter";

const modes: { id: Id3Mode; label: "xdColo" | "frlg" | "rs" }[] = [
  { id: "xd-colo", label: "xdColo" },
  { id: "fr-lg", label: "frlg" },
  { id: "rs", label: "rs" },
];
const uiPreviewMode = import.meta.env.MODE === "ui";

function initialDateTime() {
  const now = new Date();
  now.setSeconds(0, 0);
  return `${now.getFullYear().toString().padStart(4, "0")}-${(
    now.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}T${now
    .getHours()
    .toString()
    .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

function App() {
  const { t, i18n } = useTranslation();
  const { theme, changeTheme } = useTheme();
  const profiles = useGen3Profiles();
  const [activeModule, setActiveModule] = useState<ActiveModule>("id");
  const [moduleRailOpen, setModuleRailOpen] = useState(false);
  const [ivCalculatorExpanded, setIvCalculatorExpanded] = useState(false);
  const [encounterLookupExpanded, setEncounterLookupExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(
    initialGen3ProfilePanelExpanded,
  );
  const searchEngine = useMemo<Id3SearchEngine>(
    () =>
      uiPreviewMode ? new Gen3IdUiPreviewEngine() : new Gen3IdWorkerPool(),
    [],
  );
  const [mode, setMode] = useState<Id3Mode>("xd-colo");
  const [idOperation, setIdOperation] = useState<"generator" | "searcher">(
    "generator",
  );
  const [idSearcherRunning, setIdSearcherRunning] = useState(false);
  const [xdSeed, setXdSeed] = useState("");
  const [frlgTid, setFrlgTid] = useState("0");
  const [rsSeed, setRsSeed] = useState("");
  const [rsDateTime, setRsDateTime] = useState(initialDateTime);
  const [rsSource, setRsSource] = useState<"date" | "seed">("date");
  const [deadBattery, setDeadBattery] = useState(false);
  const [initialAdvances, setInitialAdvances] = useState("0");
  const [maxAdvances, setMaxAdvances] = useState("100000");
  const [filterTid, setFilterTid] = useState("");
  const [filterSid, setFilterSid] = useState("");
  const [filterTsv, setFilterTsv] = useState("");
  const [results, setResults] = useState<Id3State[]>([]);
  const [progress, setProgress] = useState<Id3SearchProgress>({
    processedStates: 0,
    totalStates: 0,
    resultCount: 0,
    percent: 0,
  });
  const [summary, setSummary] = useState<Id3SearchSummary>();
  const [status, setStatus] = useState<
    "ready" | "calculating" | "completed" | "cancelled" | "failed"
  >("ready");
  const [error, setError] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>(
    { key: "advances", direction: "asc" },
  );
  const [language, setLanguage] = useState<SupportedLanguage>(
    i18n.language === "en" || i18n.language === "ja" ? i18n.language : "zh",
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => searchEngine.dispose(), [searchEngine]);
  useEffect(() => {
    document.documentElement.lang =
      language === "zh" ? "zh-CN" : language === "ja" ? "ja" : "en";
  }, [language]);
  useEffect(() => {
    if (!moduleRailOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModuleRailOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [moduleRailOpen]);

  const calculatedRsSeed = useMemo(() => {
    if (deadBattery) return 0x05a0;
    if (rsSource === "seed") return parseHex(rsSeed);
    try {
      return calculateRsSeed(new Date(rsDateTime));
    } catch {
      return undefined;
    }
  }, [deadBattery, rsDateTime, rsSeed, rsSource]);

  const sortedResults = useMemo(() => {
    const multiplier = sort.direction === "asc" ? 1 : -1;
    return [...results].sort(
      (left, right) => (left[sort.key] - right[sort.key]) * multiplier,
    );
  }, [results, sort]);

  // TanStack Virtual exposes an imperative virtualizer object by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sortedResults.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 42,
    overscan: 12,
  });

  const changeLanguage = (nextLanguage: SupportedLanguage) => {
    void i18n.changeLanguage(nextLanguage);
    localStorage.setItem("pokerngkit-language", nextLanguage);
    setLanguage(nextLanguage);
  };

  const openIvCalculator = () => {
    setIvCalculatorExpanded(true);
    setEncounterLookupExpanded(false);
    setProfileExpanded(false);
    persistGen3ProfilePanelExpanded(false);
  };

  const changeProfileExpanded = (expanded: boolean) => {
    setProfileExpanded(expanded);
    persistGen3ProfilePanelExpanded(expanded);
    if (expanded) {
      setIvCalculatorExpanded(false);
      setEncounterLookupExpanded(false);
    }
  };

  const readRequest = (): Id3Request | undefined => {
    const input =
      mode === "xd-colo"
        ? parseHex(xdSeed)
        : mode === "fr-lg"
          ? parseDecimal(frlgTid)
          : calculatedRsSeed;
    const request: Id3Request = {
      mode,
      input: input ?? Number.NaN,
      initialAdvances: parseDecimal(initialAdvances) ?? Number.NaN,
      maxAdvances: parseDecimal(maxAdvances) ?? Number.NaN,
      filters: {
        tid: filterTid.trim()
          ? (parseDecimal(filterTid) ?? Number.NaN)
          : undefined,
        sid: filterSid.trim()
          ? (parseDecimal(filterSid) ?? Number.NaN)
          : undefined,
        tsv: filterTsv.trim()
          ? (parseDecimal(filterTsv) ?? Number.NaN)
          : undefined,
      },
    };
    return validateId3Request(request).length === 0 ? request : undefined;
  };

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "calculating") return;

    const request = readRequest();
    if (!request) {
      setError(t("invalidInput"));
      setStatus("failed");
      return;
    }

    setError("");
    setResults([]);
    setSummary(undefined);
    setProgress({
      processedStates: 0,
      totalStates: request.maxAdvances + 1,
      resultCount: 0,
      percent: 0,
    });
    setStatus("calculating");

    try {
      const nextSummary = await searchEngine.search(request, {
        onBatch: (batch) => setResults((current) => current.concat(batch)),
        onProgress: setProgress,
      });
      setSummary(nextSummary);
      setStatus(nextSummary.cancelled ? "cancelled" : "completed");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("failed");
    }
  };

  const exportCsv = () => {
    if (sortedResults.length === 0) return;
    const rows = [
      [t("rowAdvance"), t("rowTid"), t("rowSid"), t("rowTsv")],
      ...sortedResults.map((state) => [
        state.advances,
        state.tid,
        state.sid,
        state.tsv,
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pokerngkit-gen3id-${mode}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const sortLabel = (key: SortKey) => {
    if (sort.key !== key) return "";
    return sort.direction === "asc" ? " ↑" : " ↓";
  };

  const statusLabel = {
    ready: t("ready"),
    calculating: t("calculating"),
    completed: t("completed"),
    cancelled: t("cancelled"),
    failed: t("failed"),
  }[status];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-leading">
          <button
            aria-controls="module-rail"
            aria-expanded={moduleRailOpen}
            aria-label={t(moduleRailOpen ? "closeModules" : "openModules")}
            className="module-menu-button"
            onClick={() => setModuleRailOpen((current) => !current)}
            title={t(moduleRailOpen ? "closeModules" : "openModules")}
            type="button"
          >
            <span aria-hidden="true">☰</span>
          </button>
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              <img
                alt=""
                height="32"
                src={`${import.meta.env.BASE_URL}favicon.ico`}
                width="32"
              />
            </div>
            <div>
              <div className="brand-name">{t("brand")}</div>
              <div className="brand-subtitle">{t("subtitle")}</div>
            </div>
          </div>
        </div>
        <div className="topbar-meta">
          <span className={`status-chip ${uiPreviewMode ? "amber" : "teal"}`}>
            {t(uiPreviewMode ? "uiPreview" : "wasmCore")}
          </span>
          <span className="status-chip red">{t("workerPool")}</span>
          <button
            aria-label={t(theme === "dark" ? "themeLight" : "themeDark")}
            className="theme-toggle"
            onClick={() => changeTheme(theme === "dark" ? "light" : "dark")}
            title={t(theme === "dark" ? "themeLight" : "themeDark")}
            type="button"
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          </button>
          <div className="language-switch" aria-label={t("language")}>
            <button
              className={language === "zh" ? "selected" : ""}
              onClick={() => changeLanguage("zh")}
              type="button"
            >
              中
            </button>
            <button
              className={language === "en" ? "selected" : ""}
              onClick={() => changeLanguage("en")}
              type="button"
            >
              EN
            </button>
            <button
              className={language === "ja" ? "selected" : ""}
              onClick={() => changeLanguage("ja")}
              type="button"
            >
              日
            </button>
          </div>
        </div>
      </header>

      <div className="workspace">
        {moduleRailOpen && (
          <button
            aria-label={t("closeModules")}
            className="module-rail-backdrop"
            onClick={() => setModuleRailOpen(false)}
            type="button"
          />
        )}
        <aside
          aria-hidden={!moduleRailOpen}
          className={`module-rail${moduleRailOpen ? " open" : ""}`}
          id="module-rail"
          inert={moduleRailOpen ? undefined : true}
        >
          <div className="rail-heading">
            <div className="rail-label">{t("modules")}</div>
            <button
              aria-label={t("closeModules")}
              className="rail-close-button"
              onClick={() => setModuleRailOpen(false)}
              title={t("closeModules")}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <button
            className={
              activeModule === "id" ? "module-entry active" : "module-entry"
            }
            onClick={() => {
              setActiveModule("id");
              setModuleRailOpen(false);
            }}
            type="button"
          >
            <span className="module-index">01</span>
            <span>
              <strong>{t("idModule")}</strong>
              <small>{t("version")}</small>
            </span>
          </button>
          <button
            className={
              activeModule === "initialseed"
                ? "module-entry active"
                : "module-entry"
            }
            onClick={() => {
              setActiveModule("initialseed");
              setModuleRailOpen(false);
            }}
            type="button"
          >
            <span className="module-index">02</span>
            <span>
              <strong>{t("initialSeedModule")}</strong>
              <small>{t("initialSeedVersion")}</small>
            </span>
          </button>
          <button
            className={
              activeModule === "seedtotime" ? "module-entry active" : "module-entry"
            }
            onClick={() => {
              setActiveModule("seedtotime");
              setModuleRailOpen(false);
            }}
            type="button"
          >
            <span className="module-index">03</span>
            <span>
              <strong>{t("seedToTimeModule")}</strong>
              <small>{t("seedToTimeVersion")}</small>
            </span>
          </button>
          <button
            className={
              activeModule === "static" ? "module-entry active" : "module-entry"
            }
            onClick={() => {
              setActiveModule("static");
              setModuleRailOpen(false);
            }}
            type="button"
          >
            <span className="module-index">04</span>
            <span>
              <strong>{t("staticModule")}</strong>
              <small>{t("staticVersion")}</small>
            </span>
          </button>
          <button
            className={
              activeModule === "wild" ? "module-entry active" : "module-entry"
            }
            onClick={() => {
              setActiveModule("wild");
              setModuleRailOpen(false);
            }}
            type="button"
          >
            <span className="module-index">05</span>
            <span>
              <strong>{t("wildModule")}</strong>
              <small>{t("wildVersion")}</small>
            </span>
          </button>
          <button
            className={
              activeModule === "ivtopid"
                ? "module-entry active"
                : "module-entry"
            }
            onClick={() => {
              setActiveModule("ivtopid");
              setModuleRailOpen(false);
            }}
            type="button"
          >
            <span className="module-index">06</span>
            <span>
              <strong>{t("ivToPidModule")}</strong>
              <small>{t("ivToPidVersion")}</small>
            </span>
          </button>
          <button
            className={
              activeModule === "egg" ? "module-entry active" : "module-entry"
            }
            onClick={() => {
              setActiveModule("egg");
              setModuleRailOpen(false);
            }}
            type="button"
          >
            <span className="module-index">07</span>
            <span>
              <strong>{t("eggModule")}</strong>
              <small>{t("eggVersion")}</small>
            </span>
          </button>
          <button
            className={
              activeModule === "spindapainter"
                ? "module-entry active"
                : "module-entry"
            }
            onClick={() => {
              setActiveModule("spindapainter");
              setModuleRailOpen(false);
            }}
            type="button"
          >
            <span className="module-index">08</span>
            <span>
              <strong>{t("spindaPainterModule")}</strong>
              <small>{t("spindaPainterVersion")}</small>
            </span>
          </button>
          <div className="rail-footer">
            <span className="rail-dot" />
            {t("localOnly")}
          </div>
        </aside>

        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">GEN III / RNG LAB</div>
              <h1>
                {t(
                  activeModule === "id"
                    ? "engine"
                    : activeModule === "initialseed"
                      ? "initialSeedEngine"
                      : activeModule === "seedtotime"
                        ? "seedToTimeEngine"
                      : activeModule === "static"
                        ? "staticEngine"
                        : activeModule === "wild"
                          ? "wildEngine"
                          : activeModule === "ivtopid"
                            ? "ivToPidEngine"
                            : activeModule === "egg"
                              ? "eggEngine"
                              : "spindaPainterEngine",
                )}
              </h1>
            </div>
            <div className="heading-version">
              {t(
                activeModule === "id"
                  ? "version"
                  : activeModule === "initialseed"
                    ? "initialSeedVersion"
                    : activeModule === "seedtotime"
                      ? "seedToTimeVersion"
                    : activeModule === "static"
                      ? "staticVersion"
                      : activeModule === "wild"
                        ? "wildVersion"
                        : activeModule === "ivtopid"
                          ? "ivToPidVersion"
                          : activeModule === "egg"
                            ? "eggVersion"
                            : "spindaPainterVersion",
              )}
            </div>
          </div>
          {uiPreviewMode && (
            <div className="preview-banner">{t("uiPreviewNotice")}</div>
          )}

          {activeModule === "id" ? (
            <>
              <div className="operation-tabs" role="tablist">
                {(["generator", "searcher"] as const).map((entry) => (
                  <button
                    aria-selected={idOperation === entry}
                    className={idOperation === entry ? "active" : ""}
                    disabled={status === "calculating" || idSearcherRunning}
                    key={entry}
                    onClick={() => setIdOperation(entry)}
                    role="tab"
                    type="button"
                  >
                    {t(entry)}
                  </button>
                ))}
              </div>
              {idOperation === "searcher" && (
                <Gen3IdSearcherPanel
                  onRunningChange={setIdSearcherRunning}
                  uiPreviewMode={uiPreviewMode}
                />
              )}
              <form
                className="control-grid"
                hidden={idOperation !== "generator"}
                onSubmit={generate}
              >
                <section className="panel input-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-index">01</span>
                      <h2>{t("input")}</h2>
                    </div>
                    <span className="panel-note">C ABI / uint32</span>
                  </div>
                  <div
                    className="mode-tabs"
                    role="tablist"
                    aria-label={t("mode")}
                  >
                    {modes.map((entry) => (
                      <button
                        className={
                          mode === entry.id ? "mode-tab active" : "mode-tab"
                        }
                        key={entry.id}
                        onClick={() => setMode(entry.id)}
                        role="tab"
                        type="button"
                      >
                        {t(entry.label)}
                      </button>
                    ))}
                  </div>

                  {mode === "xd-colo" && (
                    <label className="field">
                      <span>{t("seed")}</span>
                      <input
                        maxLength={8}
                        onChange={(event) =>
                          setXdSeed(normalizeHexInput(event.target.value, 8))
                        }
                        value={xdSeed}
                      />
                      <small>HEX / 32-bit</small>
                    </label>
                  )}

                  {mode === "fr-lg" && (
                    <label className="field">
                      <span>{t("tid")}</span>
                      <input
                        inputMode="numeric"
                        maxLength={5}
                        onChange={(event) =>
                          setFrlgTid(
                            normalizeDecimalInput(event.target.value, 0xffff),
                          )
                        }
                        value={frlgTid}
                      />
                      <small>DEC / 0 - 65535</small>
                    </label>
                  )}

                  {mode === "rs" && (
                    <div className="rs-inputs">
                      <label className="toggle-field">
                        <input
                          checked={deadBattery}
                          onChange={(event) =>
                            setDeadBattery(event.target.checked)
                          }
                          type="checkbox"
                        />
                        <span>{t("deadBattery")}</span>
                      </label>
                      <div className="radio-row">
                        <label>
                          <input
                            max="2099-12-31T23:59"
                            min="2000-01-01T00:00"
                            checked={rsSource === "date"}
                            disabled={deadBattery}
                            onChange={() => setRsSource("date")}
                            type="radio"
                          />
                          {t("dateTime")}
                        </label>
                        <label>
                          <input
                            checked={rsSource === "seed"}
                            disabled={deadBattery}
                            onChange={() => setRsSource("seed")}
                            type="radio"
                          />
                          {t("manualSeed")}
                        </label>
                      </div>
                      {rsSource === "date" && !deadBattery ? (
                        <label className="field">
                          <span>{t("dateTime")}</span>
                          <input
                            onChange={(event) =>
                              setRsDateTime(event.target.value)
                            }
                            type="datetime-local"
                            value={rsDateTime}
                          />
                        </label>
                      ) : (
                        <label className="field">
                          <span>{t("seed")}</span>
                          <input
                            maxLength={4}
                            onChange={(event) =>
                              setRsSeed(
                                normalizeHexInput(event.target.value, 4),
                              )
                            }
                            value={rsSeed}
                          />
                          <small>HEX / 16-bit</small>
                        </label>
                      )}
                      <div className="computed-value">
                        <span>{t("calculatedSeed")}</span>
                        <code>
                          {calculatedRsSeed === undefined
                            ? "----"
                            : formatHex(calculatedRsSeed, 4)}
                        </code>
                      </div>
                    </div>
                  )}

                  <div className="advance-row">
                    <label className="field">
                      <span>{t("initialAdvances")}</span>
                      <input
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(event) =>
                          setInitialAdvances(
                            normalizeDecimalInput(
                              event.target.value,
                              0xffff_ffff,
                              10,
                            ),
                          )
                        }
                        value={initialAdvances}
                      />
                    </label>
                    <label className="field">
                      <span>{t("maxAdvances")}</span>
                      <input
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(event) =>
                          setMaxAdvances(
                            normalizeDecimalInput(
                              event.target.value,
                              0xffff_ffff,
                              10,
                            ),
                          )
                        }
                        value={maxAdvances}
                      />
                    </label>
                  </div>
                  <div className="panel-actions">
                    <button
                      className="primary-action"
                      disabled={status === "calculating"}
                      type="submit"
                    >
                      <span className="action-glyph">▶</span>
                      {t("run")}
                    </button>
                    {status === "calculating" && (
                      <button
                        className="secondary-action"
                        onClick={() => searchEngine.cancel()}
                        type="button"
                      >
                        {t("cancel")}
                      </button>
                    )}
                  </div>
                </section>

                <section className="panel filter-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="panel-index">02</span>
                      <h2>{t("filters")}</h2>
                    </div>
                    <span className="panel-note">AND / exact</span>
                  </div>
                  <p className="panel-description">{t("exactFilterHint")}</p>
                  <div className="filter-stack">
                    <label className="field">
                      <span>{t("tid")}</span>
                      <input
                        inputMode="numeric"
                        maxLength={5}
                        onChange={(event) =>
                          setFilterTid(
                            normalizeDecimalInput(event.target.value, 0xffff),
                          )
                        }
                        placeholder={t("noFilter")}
                        value={filterTid}
                      />
                      <small>DEC / 0 - 65535</small>
                    </label>
                    <label className="field">
                      <span>{t("sid")}</span>
                      <input
                        inputMode="numeric"
                        maxLength={5}
                        onChange={(event) =>
                          setFilterSid(
                            normalizeDecimalInput(event.target.value, 0xffff),
                          )
                        }
                        placeholder={t("noFilter")}
                        value={filterSid}
                      />
                      <small>DEC / 0 - 65535</small>
                    </label>
                    <label className="field">
                      <span>{t("tsv")}</span>
                      <input
                        inputMode="numeric"
                        maxLength={4}
                        onChange={(event) =>
                          setFilterTsv(
                            normalizeDecimalInput(event.target.value, 8191, 4),
                          )
                        }
                        placeholder={t("noFilter")}
                        value={filterTsv}
                      />
                      <small>DEC / 0 - 8191</small>
                    </label>
                  </div>
                </section>
              </form>

              <section
                className="panel results-panel"
                hidden={idOperation !== "generator"}
              >
                <div className="results-heading">
                  <div className="panel-heading compact">
                    <div>
                      <span className="panel-index">03</span>
                      <h2>{t("results")}</h2>
                    </div>
                    <span className={`run-status ${status}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="result-actions">
                    <span className="result-count">
                      {String(results.length)} / {String(progress.totalStates)}
                    </span>
                    <button
                      className="secondary-action"
                      disabled={results.length === 0}
                      onClick={exportCsv}
                      type="button"
                    >
                      {t("exportCsv")}
                    </button>
                    <button
                      className="icon-action"
                      disabled={results.length === 0}
                      onClick={() => setResults([])}
                      title={t("clear")}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div
                  className="progress-track"
                  aria-label={`${progress.percent.toFixed(1)}%`}
                >
                  <span
                    style={{ width: `${Math.min(100, progress.percent)}%` }}
                  />
                </div>
                <div className="metrics-row">
                  <span>
                    {t("processed")}{" "}
                    <strong>{String(progress.processedStates)}</strong>
                  </span>
                  <span>
                    {t("results")}{" "}
                    <strong>{String(progress.resultCount)}</strong>
                  </span>
                  <span>
                    {t("workers")}{" "}
                    <strong>{summary?.workerCount ?? "-"}</strong>
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
                    {error.includes("Wasm") || error.includes("wasm")
                      ? t("wasmMissing")
                      : error}
                  </div>
                )}
                {summary?.resultLimitReached && (
                  <div className="alert warning">{t("limitReached")}</div>
                )}
                <div className="table-shell" ref={scrollRef}>
                  {sortedResults.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-cross">＋</span>
                      <span>{t("empty")}</span>
                    </div>
                  ) : (
                    <div
                      className="virtual-table"
                      style={{
                        height: `${rowVirtualizer.getTotalSize() + 38}px`,
                      }}
                    >
                      <div className="table-header">
                        {(["advances", "tid", "sid", "tsv"] as SortKey[]).map(
                          (key) => (
                            <button
                              key={key}
                              onClick={() => toggleSort(key)}
                              type="button"
                            >
                              {t(
                                key === "advances"
                                  ? "rowAdvance"
                                  : `row${key.charAt(0).toUpperCase()}${key.slice(1)}`,
                              )}
                              {sortLabel(key)}
                            </button>
                          ),
                        )}
                      </div>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const state = sortedResults[virtualRow.index];
                        return (
                          <div
                            className="table-row"
                            key={`${state.advances}-${virtualRow.index}`}
                            style={{
                              transform: `translateY(${virtualRow.start + 38}px)`,
                            }}
                          >
                            <span>{String(state.advances)}</span>
                            <span>{state.tid.toString().padStart(5, "0")}</span>
                            <span>{state.sid.toString().padStart(5, "0")}</span>
                            <span>{state.tsv.toString().padStart(4, "0")}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : activeModule === "initialseed" ? (
            <Gen3InitialSeedPanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "seedtotime" ? (
            <Gen3SeedToTimePanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "static" ? (
            <Gen3StaticPanel
              onOpenIvCalculator={openIvCalculator}
              profile={gen3StaticProfileOrDefault(profiles.selectedProfile)}
              uiPreviewMode={uiPreviewMode}
            />
          ) : activeModule === "wild" ? (
            <Gen3WildPanel
              onOpenIvCalculator={openIvCalculator}
              profile={gen3StaticProfileOrDefault(profiles.selectedProfile)}
              uiPreviewMode={uiPreviewMode}
            />
          ) : activeModule === "egg" ? (
            <Gen3EggPanel
              onOpenIvCalculator={openIvCalculator}
              profile={gen3EggProfileOrDefault(profiles.selectedProfile)}
              uiPreviewMode={uiPreviewMode}
            />
          ) : activeModule === "spindapainter" ? (
            <Gen3SpindaPainterPanel />
          ) : (
            <Gen3IvToPidPanel uiPreviewMode={uiPreviewMode} />
          )}
        </main>
      </div>
      <div className="floating-tools">
        <Gen3IvCalculator
          expanded={ivCalculatorExpanded}
          onExpandedChange={(expanded) => {
            setIvCalculatorExpanded(expanded);
            if (expanded) {
              setEncounterLookupExpanded(false);
              changeProfileExpanded(false);
            }
          }}
        />
        <EncounterLookupPanel
          expanded={encounterLookupExpanded}
          onExpandedChange={(expanded) => {
            setEncounterLookupExpanded(expanded);
            if (expanded) {
              setIvCalculatorExpanded(false);
              changeProfileExpanded(false);
            }
          }}
        />
        <Gen3ProfileControls
          compatibleVersions={
            activeModule === "static" ||
            activeModule === "wild" ||
            activeModule === "egg"
              ? "handheld"
              : "all"
          }
          controller={profiles}
          expanded={profileExpanded}
          onExpandedChange={changeProfileExpanded}
        />
      </div>
      <footer className="legal-footer">
        <span>{t("upstream")}</span>
        <a
          href="https://github.com/HaKu76/PokeRNGKit"
          rel="noreferrer"
          target="_blank"
        >
          {t("source")}
        </a>
        <a href="./legal/LICENSE.txt">{t("license")}</a>
        <a href="./legal/UPSTREAM.md">PokeFinder</a>
      </footer>
    </div>
  );
}

export default App;
