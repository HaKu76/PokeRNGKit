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
import { Gen3ProfileControls } from "./features/profiles/Gen3ProfileControls";
import {
  initialGen3ProfilePanelExpanded,
  persistGen3ProfilePanelExpanded,
} from "./features/profiles/profilePanelState";
import {
  gen3EggProfileOrDefault,
  gen3GameCubeProfileOrDefault,
  gen3PokeSpotProfileOrDefault,
  gen3StaticProfileOrDefault,
} from "./features/profiles/domain";
import { useGen3Profiles } from "./features/profiles/useGen3Profiles";
import { Gen3InitialSeedPanel } from "./features/initialseed/Gen3InitialSeedPanel";
import { Gen3NgcSeedPanel } from "./features/ngcseed/Gen3NgcSeedPanel";
import { Gen3SeedToTimePanel } from "./features/seedtotime/Gen3SeedToTimePanel";
import { Gen3SpindaPainterPanel } from "./features/spindapainter/Gen3SpindaPainterPanel";
import { Gen3IvToPidPanel } from "./features/ivtopid/Gen3IvToPidPanel";
import { Gen3PidToIvPanel } from "./features/pidtoiv/Gen3PidToIvPanel";
import { Gen3JirachiAdvancerPanel } from "./features/jirachiadvancer/Gen3JirachiAdvancerPanel";
import { Gen3PokeSpotPanel } from "./features/pokespot/Gen3PokeSpotPanel";
import { Gen3GameCubePanel } from "./features/gamecube/Gen3GameCubePanel";
import { Gen3StaticPanel } from "./features/static/Gen3StaticPanel";
import { Gen3WildPanel } from "./features/wild/Gen3WildPanel";
import { Gen7IdPanel } from "./features/gen7id/Gen7IdPanel";
import { PokerusFinderPanel } from "./features/pokerusfinder/PokerusFinderPanel";
import { ContributionsPanel } from "./features/contributions/ContributionsPanel";
import { IvCalculator } from "./features/gen4ivcalculator/Gen4IvCalculator";
import { Gen4ProfileControls } from "./features/gen4profiles/Gen4ProfileControls";
import { DEFAULT_GEN4_PROFILE } from "./features/gen4profiles/domain";
import {
  initialGen4ProfilePanelExpanded,
  persistGen4ProfilePanelExpanded,
} from "./features/gen4profiles/profilePanelState";
import { useGen4Profiles } from "./features/gen4profiles/useGen4Profiles";
import { Gen4StaticPanel } from "./features/gen4static/Gen4StaticPanel";
import { Gen4WildPanel } from "./features/gen4wild/Gen4WildPanel";
import { Gen4EggPanel } from "./features/gen4egg/Gen4EggPanel";
import { Gen4AdvancePanel } from "./features/gen4advance/Gen4AdvancePanel";
import { Gen4EventPanel } from "./features/gen4event/Gen4EventPanel";
import { Gen4IdPanel } from "./features/gen4id/Gen4IdPanel";
import { Gen4SeedToTimePanel } from "./features/gen4seedtotime/Gen4SeedToTimePanel";
import { Gen4ChainedSidPanel } from "./features/gen4chainedsid/Gen4ChainedSidPanel";
import { Gen5ProfilesPanel } from "./features/gen5profiles/Gen5ProfilesPanel";
import { Gen5IdPanel } from "./features/gen5id/Gen5IdPanel";
import { ResearcherPanel } from "./features/researcher/ResearcherPanel";
import { normalizeDecimalInput, normalizeHexInput } from "./input";
import { useTheme } from "./theme";

type SortKey = keyof Id3State;
type SupportedLanguage = "zh" | "en" | "ja";
type ActiveModule =
  | "id"
  | "initialseed"
  | "ngcseed"
  | "seedtotime"
  | "static"
  | "wild"
  | "ivtopid"
  | "pidtoiv"
  | "egg"
  | "pokespot"
  | "gamecube"
  | "jirachiadvancer"
  | "spindapainter"
  | "gen4id"
  | "gen4seedtotime"
  | "gen4static"
  | "gen4egg"
  | "gen4event"
  | "gen4chainedsid"
  | "gen4advance"
  | "gen5profiles"
  | "gen5id"
  | "gen7id"
  | "researcher"
  | "pokerusfinder"
  | "gen4wild";

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
  const gen4Profiles = useGen4Profiles();
  const [activeModule, setActiveModule] = useState<ActiveModule>("id");
  const [pokerusInitialMode, setPokerusInitialMode] = useState<
    "gen3" | "pthgss"
  >("gen3");
  const [moduleRailOpen, setModuleRailOpen] = useState(false);
  const [moduleRailCollapsed, setModuleRailCollapsed] = useState(false);
  const [ivCalculatorExpanded, setIvCalculatorExpanded] = useState(false);
  const [encounterLookupExpanded, setEncounterLookupExpanded] = useState(false);
  const [contributionsExpanded, setContributionsExpanded] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(
    initialGen3ProfilePanelExpanded,
  );
  const [gen4ProfileExpanded, setGen4ProfileExpanded] = useState(
    initialGen4ProfilePanelExpanded,
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
  const [wideViewport, setWideViewport] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 901px)").matches,
  );
  const moduleMenuButtonRef = useRef<HTMLButtonElement>(null);
  const moduleRailRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => searchEngine.dispose(), [searchEngine]);
  useEffect(() => {
    document.documentElement.lang =
      language === "zh" ? "zh-CN" : language === "ja" ? "ja" : "en";
  }, [language]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 901px)");
    const updateViewport = () => {
      setWideViewport(media.matches);
      if (media.matches) setModuleRailOpen(false);
    };
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);
  useEffect(() => {
    if (!moduleRailOpen || wideViewport) return;

    const rail = moduleRailRef.current;
    const menuButton = moduleMenuButtonRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    const getFocusableElements = () =>
      rail
        ? Array.from(
            rail.querySelectorAll<HTMLElement>(
              'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((element) => element.offsetParent !== null)
        : [];

    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      const activeEntry = rail?.querySelector<HTMLElement>(
        ".module-entry.active",
      );
      (activeEntry ?? getFocusableElements()[0])?.focus();
    });
    const handleDrawerKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setModuleRailOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!rail?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleDrawerKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleDrawerKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (!window.matchMedia("(min-width: 901px)").matches) {
        menuButton?.focus();
      }
    };
  }, [moduleRailOpen, wideViewport]);

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
    setModuleRailOpen(false);
    setIvCalculatorExpanded(true);
    setEncounterLookupExpanded(false);
    setContributionsExpanded(false);
    setProfileExpanded(false);
    persistGen3ProfilePanelExpanded(false);
    setGen4ProfileExpanded(false);
    persistGen4ProfilePanelExpanded(false);
  };

  const changeProfileExpanded = (expanded: boolean) => {
    setProfileExpanded(expanded);
    persistGen3ProfilePanelExpanded(expanded);
    if (expanded) {
      setModuleRailOpen(false);
      setIvCalculatorExpanded(false);
      setEncounterLookupExpanded(false);
      setContributionsExpanded(false);
    }
  };

  const changeGen4ProfileExpanded = (expanded: boolean) => {
    setGen4ProfileExpanded(expanded);
    persistGen4ProfilePanelExpanded(expanded);
    if (expanded) {
      setModuleRailOpen(false);
      setIvCalculatorExpanded(false);
      setEncounterLookupExpanded(false);
      setContributionsExpanded(false);
    }
  };

  const openGen4IvCalculator = openIvCalculator;

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
  const gen4Tools =
    activeModule === "gen4id" ||
    activeModule === "gen4seedtotime" ||
    activeModule === "gen4static" ||
    activeModule === "gen4wild" ||
    activeModule === "gen4egg" ||
    activeModule === "gen4event" ||
    activeModule === "gen4advance";
  const gen4Module = gen4Tools || activeModule === "gen4chainedsid";
  const gen5Module =
    activeModule === "gen5profiles" || activeModule === "gen5id";
  const gen7Module = activeModule === "gen7id";
  const researcherModule = activeModule === "researcher";
  const pokerusModule = activeModule === "pokerusfinder";
  const profileTools =
    activeModule !== "gen4chainedsid" &&
    activeModule !== "gen4advance" &&
    activeModule !== "gen5profiles" &&
    activeModule !== "gen5id" &&
    activeModule !== "researcher";
  const activeFloatingTool = contributionsExpanded
    ? "contributions"
    : ivCalculatorExpanded
      ? "iv"
      : encounterLookupExpanded
        ? "encounter"
        : profileTools && gen4Tools
          ? gen4ProfileExpanded
            ? "profile"
            : undefined
          : profileTools && profileExpanded
            ? "profile"
            : undefined;

  const closeFloatingTools = () => {
    setEncounterLookupExpanded(false);
    setIvCalculatorExpanded(false);
    setContributionsExpanded(false);
    if (gen4Tools) {
      changeGen4ProfileExpanded(false);
    } else {
      changeProfileExpanded(false);
    }
  };

  const toggleFloatingTool = (
    tool: "contributions" | "encounter" | "iv" | "profile",
  ) => {
    const expanded = activeFloatingTool !== tool;
    setModuleRailOpen(false);
    closeFloatingTools();
    if (!expanded) return;
    if (tool === "contributions") setContributionsExpanded(true);
    else if (tool === "encounter") setEncounterLookupExpanded(true);
    else if (tool === "iv") setIvCalculatorExpanded(true);
    else if (gen4Tools) changeGen4ProfileExpanded(true);
    else changeProfileExpanded(true);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-leading">
          <button
            aria-controls="module-rail"
            aria-expanded={wideViewport ? !moduleRailCollapsed : moduleRailOpen}
            aria-label={t(
              wideViewport
                ? moduleRailCollapsed
                  ? "openModules"
                  : "closeModules"
                : moduleRailOpen
                  ? "closeModules"
                  : "openModules",
            )}
            className="module-menu-button"
            onClick={() => {
              if (wideViewport) {
                setModuleRailCollapsed((current) => !current);
              } else {
                if (!moduleRailOpen) closeFloatingTools();
                setModuleRailOpen((current) => !current);
              }
            }}
            title={t(
              wideViewport
                ? moduleRailCollapsed
                  ? "openModules"
                  : "closeModules"
                : moduleRailOpen
                  ? "closeModules"
                  : "openModules",
            )}
            ref={moduleMenuButtonRef}
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
              <div className="brand-subtitle">
                {t(
                  gen4Module
                    ? "subtitleGen4"
                    : gen7Module
                      ? "subtitleGen7"
                      : "subtitle",
                )}
              </div>
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
            onClick={(event) =>
              changeTheme(theme === "dark" ? "light" : "dark", {
                x: event.clientX,
                y: event.clientY,
              })
            }
            title={t(theme === "dark" ? "themeLight" : "themeDark")}
            type="button"
          >
            <span aria-hidden="true" className="theme-toggle-icon">
              {theme === "dark" ? "☀" : "☾"}
            </span>
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
        {moduleRailOpen && !wideViewport && (
          <button
            aria-label={t("closeModules")}
            className="module-rail-backdrop"
            onClick={() => setModuleRailOpen(false)}
            type="button"
          />
        )}
        <aside
          aria-label={!wideViewport ? t("modules") : undefined}
          aria-modal={!wideViewport ? true : undefined}
          aria-hidden={
            (!wideViewport && !moduleRailOpen) ||
            (wideViewport && moduleRailCollapsed)
          }
          className={`module-rail${moduleRailOpen ? " open" : ""}${
            moduleRailCollapsed ? " collapsed" : ""
          }`}
          id="module-rail"
          inert={
            (!wideViewport && !moduleRailOpen) ||
            (wideViewport && moduleRailCollapsed)
              ? true
              : undefined
          }
          ref={moduleRailRef}
          role={!wideViewport ? "dialog" : undefined}
        >
          {!wideViewport && (
            <div className="module-drawer-heading">
              <button
                aria-label={t("closeModules")}
                className="module-drawer-close"
                onClick={() => setModuleRailOpen(false)}
                title={t("closeModules")}
                type="button"
              >
                <span aria-hidden="true">&larr;</span>
              </button>
            </div>
          )}
          <nav aria-label={t("modules")} className="module-navigation">
            <div className="rail-section-label">GEN III</div>
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
                activeModule === "ngcseed"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("ngcseed");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">03</span>
              <span>
                <strong>{t("ngcSeedModule")}</strong>
                <small>{t("ngcSeedVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "seedtotime"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("seedtotime");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">04</span>
              <span>
                <strong>{t("seedToTimeModule")}</strong>
                <small>{t("seedToTimeVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "static"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("static");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">05</span>
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
              <span className="module-index">06</span>
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
              <span className="module-index">07</span>
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
              <span className="module-index">08</span>
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
              <span className="module-index">09</span>
              <span>
                <strong>{t("spindaPainterModule")}</strong>
                <small>{t("spindaPainterVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "pokerusfinder" &&
                pokerusInitialMode === "gen3"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setPokerusInitialMode("gen3");
                setActiveModule("pokerusfinder");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">10</span>
              <span>
                <strong>{t("pokerusFinderModule")}</strong>
                <small>{t("pokerusGen3Version")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gamecube"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gamecube");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">11</span>
              <span>
                <strong>{t("gameCubeModule")}</strong>
                <small>{t("gameCubeVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "pidtoiv"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("pidtoiv");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">12</span>
              <span>
                <strong>{t("pidToIvModule")}</strong>
                <small>{t("pidToIvVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "pokespot"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("pokespot");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">13</span>
              <span>
                <strong>{t("pokeSpotModule")}</strong>
                <small>{t("pokeSpotVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "jirachiadvancer"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("jirachiadvancer");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">14</span>
              <span>
                <strong>{t("jirachiAdvancerModule")}</strong>
                <small>{t("jirachiAdvancerVersion")}</small>
              </span>
            </button>
            <div className="rail-section-label">GEN IV</div>
            <button
              className={
                activeModule === "gen4id"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen4id");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">15</span>
              <span>
                <strong>{t("gen4IdModule")}</strong>
                <small>{t("gen4IdVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen4seedtotime"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen4seedtotime");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">16</span>
              <span>
                <strong>{t("gen4SeedToTimeModule")}</strong>
                <small>{t("gen4SeedToTimeVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen4static"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen4static");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">17</span>
              <span>
                <strong>{t("gen4StaticModule")}</strong>
                <small>{t("gen4StaticVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen4wild"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen4wild");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">18</span>
              <span>
                <strong>{t("gen4WildModule")}</strong>
                <small>{t("gen4WildVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen4egg"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen4egg");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">19</span>
              <span>
                <strong>{t("gen4EggModule")}</strong>
                <small>{t("gen4EggVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen4event"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen4event");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">20</span>
              <span>
                <strong>{t("gen4EventModule")}</strong>
                <small>{t("gen4EventVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen4chainedsid"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen4chainedsid");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">21</span>
              <span>
                <strong>{t("gen4ChainedSidModule")}</strong>
                <small>{t("gen4ChainedSidVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen4advance"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen4advance");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">22</span>
              <span>
                <strong>{t("gen4AdvanceModule")}</strong>
                <small>{t("gen4AdvanceVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "pokerusfinder" &&
                pokerusInitialMode === "pthgss"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("pokerusfinder");
                setPokerusInitialMode("pthgss");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">23</span>
              <span>
                <strong>{t("pokerusFinderModule")}</strong>
                <small>{t("pokerusGen4Version")}</small>
              </span>
            </button>
            <div className="rail-section-label">GEN V</div>
            <button
              className={
                activeModule === "gen5profiles"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5profiles");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">24</span>
              <span>
                <strong>{t("gen5ProfilesModule")}</strong>
                <small>{t("gen5ProfilesVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen5id"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5id");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">25</span>
              <span>
                <strong>{t("gen5IdModule")}</strong>
                <small>{t("gen5IdVersion")}</small>
              </span>
            </button>
            <div className="rail-section-label">GEN VII</div>
            <button
              className={
                activeModule === "gen7id"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7id");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">26</span>
              <span>
                <strong>{t("gen7IdModule")}</strong>
                <small>{t("gen7IdVersion")}</small>
              </span>
            </button>
            <div className="rail-section-label">RNG TOOLS</div>
            <button
              className={
                activeModule === "researcher"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("researcher");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">27</span>
              <span>
                <strong>{t("researcherModule")}</strong>
                <small>{t("researcherVersion")}</small>
              </span>
            </button>
          </nav>
          <div className="rail-footer">
            <span className="rail-dot" />
            {t("localOnly")}
          </div>
        </aside>

        <main
          className="main-content"
          key={`${activeModule}-${pokerusInitialMode}`}
        >
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {activeModule === "gen4id" ||
                activeModule === "gen4seedtotime" ||
                activeModule === "gen4static" ||
                activeModule === "gen4wild" ||
                activeModule === "gen4egg" ||
                activeModule === "gen4event" ||
                activeModule === "gen4chainedsid" ||
                activeModule === "gen4advance"
                  ? "GEN IV / RNG LAB"
                  : gen5Module
                    ? "GEN V / RNG LAB"
                    : gen7Module
                      ? "GEN VII / RNG LAB"
                      : researcherModule || pokerusModule
                        ? "RNG TOOLS"
                        : "GEN III / RNG LAB"}
              </div>
              <h1>
                {t(
                  activeModule === "id"
                    ? "engine"
                    : activeModule === "initialseed"
                      ? "initialSeedEngine"
                      : activeModule === "ngcseed"
                        ? "ngcSeedEngine"
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
                                  : activeModule === "gamecube"
                                    ? "gameCubeEngine"
                                    : activeModule === "pidtoiv"
                                      ? "pidToIvEngine"
                                      : activeModule === "pokespot"
                                        ? "pokeSpotEngine"
                                        : activeModule === "jirachiadvancer"
                                          ? "jirachiAdvancerEngine"
                                          : activeModule === "spindapainter"
                                            ? "spindaPainterEngine"
                                            : activeModule === "gen4id"
                                              ? "gen4IdEngine"
                                              : activeModule ===
                                                  "gen4seedtotime"
                                                ? "gen4SeedToTimeModule"
                                                : activeModule ===
                                                    "gen5profiles"
                                                  ? "gen5ProfilesEngine"
                                                  : activeModule === "gen5id"
                                                    ? "gen5IdEngine"
                                                    : activeModule ===
                                                        "researcher"
                                                      ? "researcherEngine"
                                                      : activeModule ===
                                                          "gen7id"
                                                        ? "gen7IdEngine"
                                                        : activeModule ===
                                                            "pokerusfinder"
                                                          ? "pokerusFinderEngine"
                                                          : activeModule ===
                                                              "gen4static"
                                                            ? "gen4StaticEngine"
                                                            : activeModule ===
                                                                "gen4egg"
                                                              ? "gen4EggEngine"
                                                              : activeModule ===
                                                                  "gen4event"
                                                                ? "gen4EventEngine"
                                                                : activeModule ===
                                                                    "gen4chainedsid"
                                                                  ? "gen4ChainedSidEngine"
                                                                  : activeModule ===
                                                                      "gen4advance"
                                                                    ? "gen4AdvanceEngine"
                                                                    : "gen4WildEngine",
                )}
              </h1>
            </div>
            <div className="heading-version">
              {t(
                activeModule === "id"
                  ? "version"
                  : activeModule === "initialseed"
                    ? "initialSeedVersion"
                    : activeModule === "ngcseed"
                      ? "ngcSeedVersion"
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
                                : activeModule === "gamecube"
                                  ? "gameCubeVersion"
                                  : activeModule === "pidtoiv"
                                    ? "pidToIvVersion"
                                    : activeModule === "pokespot"
                                      ? "pokeSpotVersion"
                                      : activeModule === "jirachiadvancer"
                                        ? "jirachiAdvancerVersion"
                                        : activeModule === "spindapainter"
                                          ? "spindaPainterVersion"
                                          : activeModule === "gen4id"
                                            ? "gen4IdVersion"
                                            : activeModule === "gen4seedtotime"
                                              ? "gen4SeedToTimeVersion"
                                              : activeModule === "gen5profiles"
                                                ? "gen5ProfilesVersion"
                                                : activeModule === "gen5id"
                                                  ? "gen5IdVersion"
                                                  : activeModule ===
                                                      "researcher"
                                                    ? "researcherVersion"
                                                    : activeModule === "gen7id"
                                                      ? "gen7IdVersion"
                                                      : activeModule ===
                                                          "pokerusfinder"
                                                        ? "pokerusFinderVersion"
                                                        : activeModule ===
                                                            "gen4static"
                                                          ? "gen4StaticVersion"
                                                          : activeModule ===
                                                              "gen4egg"
                                                            ? "gen4EggVersion"
                                                            : activeModule ===
                                                                "gen4event"
                                                              ? "gen4EventVersion"
                                                              : activeModule ===
                                                                  "gen4chainedsid"
                                                                ? "gen4ChainedSidVersion"
                                                                : activeModule ===
                                                                    "gen4advance"
                                                                  ? "gen4AdvanceVersion"
                                                                  : "gen4WildVersion",
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
          ) : activeModule === "ngcseed" ? (
            <Gen3NgcSeedPanel uiPreviewMode={uiPreviewMode} />
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
          ) : activeModule === "gamecube" ? (
            <Gen3GameCubePanel
              onOpenIvCalculator={openIvCalculator}
              profile={gen3GameCubeProfileOrDefault(profiles.selectedProfile)}
              uiPreviewMode={uiPreviewMode}
            />
          ) : activeModule === "pidtoiv" ? (
            <Gen3PidToIvPanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "pokespot" ? (
            <Gen3PokeSpotPanel
              onOpenIvCalculator={openIvCalculator}
              profile={gen3PokeSpotProfileOrDefault(profiles.selectedProfile)}
              uiPreviewMode={uiPreviewMode}
            />
          ) : activeModule === "jirachiadvancer" ? (
            <Gen3JirachiAdvancerPanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "spindapainter" ? (
            <Gen3SpindaPainterPanel />
          ) : activeModule === "gen4id" ? (
            <Gen4IdPanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "gen4seedtotime" ? (
            <Gen4SeedToTimePanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "gen4static" ? (
            <Gen4StaticPanel
              onOpenIvCalculator={openGen4IvCalculator}
              profile={gen4Profiles.selectedProfile ?? DEFAULT_GEN4_PROFILE}
              uiPreviewMode={uiPreviewMode}
            />
          ) : activeModule === "gen4egg" ? (
            <Gen4EggPanel
              onOpenIvCalculator={openGen4IvCalculator}
              profile={gen4Profiles.selectedProfile ?? DEFAULT_GEN4_PROFILE}
              uiPreviewMode={uiPreviewMode}
            />
          ) : activeModule === "gen4event" ? (
            <Gen4EventPanel
              onOpenIvCalculator={openGen4IvCalculator}
              profile={gen4Profiles.selectedProfile ?? DEFAULT_GEN4_PROFILE}
              uiPreviewMode={uiPreviewMode}
            />
          ) : activeModule === "gen4chainedsid" ? (
            <Gen4ChainedSidPanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "gen4advance" ? (
            <Gen4AdvancePanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "gen5profiles" ? (
            <Gen5ProfilesPanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "gen5id" ? (
            <Gen5IdPanel
              onOpenProfileManager={() => setActiveModule("gen5profiles")}
              uiPreviewMode={uiPreviewMode}
            />
          ) : activeModule === "researcher" ? (
            <ResearcherPanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "gen7id" ? (
            <Gen7IdPanel uiPreviewMode={uiPreviewMode} />
          ) : activeModule === "pokerusfinder" ? (
            <PokerusFinderPanel
              initialMode={pokerusInitialMode}
              uiPreviewMode={uiPreviewMode}
            />
          ) : activeModule === "gen4wild" ? (
            <Gen4WildPanel
              onOpenIvCalculator={openGen4IvCalculator}
              profile={gen4Profiles.selectedProfile ?? DEFAULT_GEN4_PROFILE}
              uiPreviewMode={uiPreviewMode}
            />
          ) : (
            <Gen3IvToPidPanel uiPreviewMode={uiPreviewMode} />
          )}
        </main>
      </div>
      <div className="floating-tools">
        <ContributionsPanel
          expanded={activeFloatingTool === "contributions"}
          onExpandedChange={(expanded) => {
            setContributionsExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setIvCalculatorExpanded(false);
              setEncounterLookupExpanded(false);
              if (gen4Tools) changeGen4ProfileExpanded(false);
              else changeProfileExpanded(false);
            }
          }}
        />
        <IvCalculator
          expanded={activeFloatingTool === "iv"}
          onExpandedChange={(expanded) => {
            setIvCalculatorExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setEncounterLookupExpanded(false);
              setContributionsExpanded(false);
              if (gen4Tools) changeGen4ProfileExpanded(false);
              else changeProfileExpanded(false);
            }
          }}
        />
        <EncounterLookupPanel
          expanded={activeFloatingTool === "encounter"}
          onExpandedChange={(expanded) => {
            setEncounterLookupExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setIvCalculatorExpanded(false);
              setContributionsExpanded(false);
              if (gen4Tools) changeGen4ProfileExpanded(false);
              else changeProfileExpanded(false);
            }
          }}
        />
        {profileTools && gen4Tools ? (
          <Gen4ProfileControls
            controller={gen4Profiles}
            expanded={activeFloatingTool === "profile"}
            onExpandedChange={changeGen4ProfileExpanded}
          />
        ) : profileTools ? (
          <Gen3ProfileControls
            compatibleVersions={
              activeModule === "static" ||
              activeModule === "wild" ||
              activeModule === "egg"
                ? "handheld"
                : activeModule === "pokespot"
                  ? "xd"
                  : activeModule === "gamecube"
                    ? "gamecube"
                    : "all"
            }
            controller={profiles}
            expanded={activeFloatingTool === "profile"}
            onExpandedChange={changeProfileExpanded}
          />
        ) : null}
        <nav aria-label={t("tools")} className="floating-tool-rail">
          <button
            aria-controls="iv-calculator-panel"
            aria-expanded={activeFloatingTool === "iv"}
            aria-haspopup="dialog"
            aria-label={t("ivCalculator")}
            className={activeFloatingTool === "iv" ? "active" : undefined}
            data-tone="teal"
            id="iv-calculator-trigger"
            onClick={() => toggleFloatingTool("iv")}
            title={t("ivCalculator")}
            type="button"
          >
            <span aria-hidden="true" className="floating-tool-rail-icon">
              IV
            </span>
            <span>{t("ivCalculator")}</span>
          </button>
          <button
            aria-controls="encounter-lookup-panel"
            aria-expanded={activeFloatingTool === "encounter"}
            aria-haspopup="dialog"
            aria-label={t("encounterLookupModule")}
            className={
              activeFloatingTool === "encounter" ? "active" : undefined
            }
            data-tone="amber"
            id="encounter-lookup-trigger"
            onClick={() => toggleFloatingTool("encounter")}
            title={t("encounterLookupModule")}
            type="button"
          >
            <span aria-hidden="true" className="floating-tool-rail-icon">
              ◉
            </span>
            <span>{t("encounterLookupModule")}</span>
          </button>
          {profileTools && (
            <button
              aria-controls={
                gen4Tools ? "gen4-profile-panel" : "gen3-profile-panel"
              }
              aria-expanded={activeFloatingTool === "profile"}
              aria-haspopup="dialog"
              aria-label={t("profile")}
              className={
                activeFloatingTool === "profile" ? "active" : undefined
              }
              data-tone="brand"
              id={gen4Tools ? "gen4-profile-trigger" : "gen3-profile-trigger"}
              onClick={() => toggleFloatingTool("profile")}
              title={t("profile")}
              type="button"
            >
              <span aria-hidden="true" className="floating-tool-rail-icon">
                ID
              </span>
              <span>{t("profile")}</span>
            </button>
          )}
        </nav>
      </div>
      <footer className="legal-footer">
        <button
          aria-controls="contributions-panel"
          aria-expanded={activeFloatingTool === "contributions"}
          className="legal-footer-action"
          id="contributions-trigger"
          onClick={() => toggleFloatingTool("contributions")}
          type="button"
        >
          {t("contributions")}
        </button>
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
        <a href="./legal/3DSRNGTool-UPSTREAM.md">3DSRNGTool</a>
        <a href="./legal/Pokerus-Finder-UPSTREAM.md">
          {t("pokerusFinderModule")}
        </a>
      </footer>
    </div>
  );
}

export default App;
