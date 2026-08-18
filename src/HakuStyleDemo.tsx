import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Calculator,
  Check,
  ChevronDown,
  Download,
  Menu,
  MapPin,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useTheme } from "./theme";
import type { ThemePreference } from "./theme";
import "./hakuStyleDemo.css";

type DemoModule = {
  id: string;
  label: string;
  detail: string;
};

type DemoResultState = "ready" | "loading" | "empty" | "error" | "warning";
type DemoTool = "profile" | "iv" | "encounter";
type DemoOption = { value: string; label: string };
type FloatingOffset = { x: number; y: number };
type FloatingDragState = FloatingOffset & {
  pointerId: number;
  startX: number;
  startY: number;
  rect: DOMRect;
};

const FLOATING_EDGE_PADDING = 16;

function GroupIcon({ group }: { group: string }) {
  const generation = {
    "GEN III": "3",
    "GEN IV": "4",
    "GEN V": "5",
    "GEN VIII": "8",
  }[group];
  if (generation) {
    return (
      <span aria-hidden="true" className="hs-demo-generation-icon">
        {generation}
      </span>
    );
  }
  return <SlidersHorizontal aria-hidden="true" size={16} />;
}

const demoRows = [
  { advance: 0, tid: "18427", sid: "50211", tsv: "0834", nature: "Timid" },
  { advance: 7, tid: "18427", sid: "50211", tsv: "0834", nature: "Modest" },
  { advance: 18, tid: "18427", sid: "50211", tsv: "0834", nature: "Jolly" },
  { advance: 31, tid: "18427", sid: "50211", tsv: "0834", nature: "Calm" },
  { advance: 44, tid: "18427", sid: "50211", tsv: "0834", nature: "Bold" },
];

const demoVersionOptions = [
  { value: "emerald", label: "Emerald" },
  { value: "ruby", label: "Ruby" },
  { value: "sapphire", label: "Sapphire / Long Form Label" },
];

const demoPokemonOptions = [
  { value: "pikachu", label: "Pikachu" },
  { value: "bulbasaur", label: "Bulbasaur" },
  { value: "mr-mime", label: "Mr. Mime / Regional Form" },
];

const demoProfileOptions = [
  { value: "emerald", label: "Emerald / Main profile" },
  { value: "ruby", label: "Ruby / Test profile" },
];

const demoNatureOptions = [
  { value: "timid", label: "Timid" },
  { value: "modest", label: "Modest" },
];

const demoEncounterVersionOptions = [
  { value: "emerald", label: "Emerald" },
  { value: "diamond", label: "Diamond" },
  { value: "black", label: "Black" },
];

function DemoCombobox({
  ariaLabel,
  defaultValue,
  options,
}: {
  ariaLabel: string;
  defaultValue: string;
  options: readonly DemoOption[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const defaultIndex = Math.max(
    options.findIndex((option) => option.value === defaultValue),
    0,
  );
  const [value, setValue] = useState(options[defaultIndex]?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  const selectOption = (index: number) => {
    const option = options[index];
    if (!option) return;
    setValue(option.label);
    setActiveIndex(index);
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      selectOption(activeIndex);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    setOpen(true);
    setActiveIndex((current) => {
      const direction = event.key === "ArrowDown" ? 1 : -1;
      return Math.min(Math.max(current + direction, 0), options.length - 1);
    });
  };

  return (
    <div className="hs-demo-select-combo">
      <div className="hs-demo-select-combo-control">
        <input
          aria-activedescendant={
            open ? `${listboxId}-option-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-label={ariaLabel}
          onChange={(event) => {
            setValue(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          ref={inputRef}
          role="combobox"
          spellCheck="false"
          value={value}
        />
        <button
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`打开${ariaLabel}候选`}
          onClick={() => {
            setActiveIndex(
              Math.max(
                options.findIndex((option) => option.label === value),
                0,
              ),
            );
            setOpen((current) => !current);
          }}
          title={`打开${ariaLabel}候选`}
          type="button"
        >
          <ChevronDown
            aria-hidden="true"
            className={open ? "rotated" : undefined}
            size={17}
          />
        </button>
      </div>
      {open && (
        <div
          aria-label={`${ariaLabel}候选`}
          className="hs-demo-open-dropdown-menu hs-demo-select-combo-menu"
          id={listboxId}
          role="listbox"
        >
          {options.map((option, index) => (
            <button
              aria-selected={value === option.label}
              className={`${value === option.label ? "active" : ""}${
                activeIndex === index ? " highlighted" : ""
              }`.trim()}
              id={`${listboxId}-option-${index}`}
              key={option.value}
              onClick={() => selectOption(index)}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              type="button"
            >
              <span>{option.label}</span>
              {value === option.label && <Check aria-hidden="true" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const themeModes: Array<{
  id: ThemePreference;
  labelKey: "themeLight" | "themeDark" | "themeSystem";
}> = [
  { id: "light", labelKey: "themeLight" },
  { id: "dark", labelKey: "themeDark" },
  { id: "system", labelKey: "themeSystem" },
];

const readRailCollapsed = () => {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("pokerngkit-demo-rail-collapsed") === "true";
};

const clampFloatingOffset = (
  next: FloatingOffset,
  origin: FloatingOffset,
  rect: DOMRect,
): FloatingOffset => {
  const baseLeft = rect.left - origin.x;
  const baseTop = rect.top - origin.y;
  const minX = FLOATING_EDGE_PADDING - baseLeft;
  const maxX =
    window.innerWidth - FLOATING_EDGE_PADDING - rect.width - baseLeft;
  const minY = FLOATING_EDGE_PADDING - baseTop;
  const maxY =
    window.innerHeight - FLOATING_EDGE_PADDING - rect.height - baseTop;
  const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(
      Math.max(value, Math.min(minimum, maximum)),
      Math.max(minimum, maximum),
    );
  return {
    x: clamp(next.x, minX, maxX),
    y: clamp(next.y, minY, maxY),
  };
};

export default function HakuStyleDemo() {
  const { t, i18n } = useTranslation();
  const { preference, changeTheme } = useTheme();
  const [activeModule, setActiveModule] = useState("id");
  const [activeOperation, setActiveOperation] = useState<
    "generator" | "searcher"
  >("generator");
  const [running, setRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(readRailCollapsed);
  const [searchQuery, setSearchQuery] = useState("");
  const [resultState, setResultState] = useState<DemoResultState>("ready");
  const [openGroups, setOpenGroups] = useState(() => new Set<string>());
  const [activeTool, setActiveTool] = useState<DemoTool | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [floatingOffset, setFloatingOffset] = useState<FloatingOffset>({
    x: 0,
    y: 0,
  });
  const [floatingDragging, setFloatingDragging] = useState(false);
  const floatingPanelRef = useRef<HTMLElement>(null);
  const floatingDragRef = useRef<FloatingDragState | null>(null);
  const toolTriggerRefs = useRef<Record<DemoTool, HTMLButtonElement | null>>({
    encounter: null,
    iv: null,
    profile: null,
  });

  const modules = useMemo(
    () =>
      [
        {
          group: "GEN III",
          items: [
            { id: "id", label: t("idModule"), detail: t("version") },
            {
              id: "initialseed",
              label: t("initialSeedModule"),
              detail: t("initialSeedVersion"),
            },
            {
              id: "static",
              label: t("staticModule"),
              detail: t("staticVersion"),
            },
            { id: "wild", label: t("wildModule"), detail: t("wildVersion") },
          ],
        },
        {
          group: "GEN IV",
          items: [
            {
              id: "gen4id",
              label: t("gen4IdModule"),
              detail: t("gen4IdVersion"),
            },
            {
              id: "gen4static",
              label: t("gen4StaticModule"),
              detail: t("gen4StaticVersion"),
            },
          ],
        },
        {
          group: "GEN V",
          items: [
            {
              id: "gen5id",
              label: t("gen5IdModule"),
              detail: t("gen5IdVersion"),
            },
            {
              id: "gen5wild",
              label: t("gen5WildModule"),
              detail: t("gen5WildVersion"),
            },
          ],
        },
        {
          group: "GEN VIII",
          items: [
            {
              id: "gen8id",
              label: t("gen8IdModule"),
              detail: t("gen8IdVersion"),
            },
            {
              id: "gen8wild",
              label: t("gen8WildModule"),
              detail: t("gen8WildVersion"),
            },
          ],
        },
        {
          group: "RNG TOOLS",
          items: [
            {
              id: "researcher",
              label: t("researcherModule"),
              detail: t("researcherVersion"),
            },
          ],
        },
      ] satisfies Array<{ group: string; items: DemoModule[] }>,
    [t],
  );

  const selectedModule = modules
    .flatMap((group) => group.items)
    .find((item) => item.id === activeModule);

  const visibleGroups = modules
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        `${item.label} ${item.detail}`
          .toLocaleLowerCase()
          .includes(searchQuery.trim().toLocaleLowerCase()),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const toggleGroup = (group: string) => {
    if (railCollapsed) {
      setRailCollapsed(false);
      setOpenGroups(new Set([group]));
      return;
    }
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const selectModule = (group: string, id: string) => {
    setActiveModule(id);
    setOpenGroups(new Set([group]));
    setMobileRailOpen(false);
  };

  const isLoading = resultState === "loading" || running;
  const resultProgress =
    resultState === "loading"
      ? "58%"
      : resultState === "warning"
        ? "84%"
        : "34%";

  const setLanguage = (language: "zh" | "en" | "ja") => {
    void i18n.changeLanguage(language);
  };

  const toggleNavigation = () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      setMobileRailOpen((value) => !value);
      return;
    }
    setRailCollapsed((value) => !value);
  };

  const toolRailUsesHover = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const closeToolPanel = useCallback(() => {
    const previousTool = activeTool;
    setActiveTool(null);
    if (previousTool) {
      requestAnimationFrame(() =>
        toolTriggerRefs.current[previousTool]?.focus(),
      );
    }
  }, [activeTool]);

  const handleFloatingPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      event.button !== 0 ||
      (event.target as Element).closest("button, input, select, textarea, a")
    ) {
      return;
    }
    const panel = floatingPanelRef.current;
    if (!panel) return;
    floatingDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect: panel.getBoundingClientRect(),
      ...floatingOffset,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setFloatingDragging(true);
  };

  const handleFloatingPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = floatingDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setFloatingOffset(
      clampFloatingOffset(
        {
          x: drag.x + event.clientX - drag.startX,
          y: drag.y + event.clientY - drag.startY,
        },
        drag,
        drag.rect,
      ),
    );
  };

  const stopFloatingDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = floatingDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    floatingDragRef.current = null;
    setFloatingDragging(false);
  };

  const handleFloatingKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    let delta: FloatingOffset | undefined;
    switch (event.key) {
      case "ArrowDown":
        delta = { x: 0, y: 16 };
        break;
      case "ArrowLeft":
        delta = { x: -16, y: 0 };
        break;
      case "ArrowRight":
        delta = { x: 16, y: 0 };
        break;
      case "ArrowUp":
        delta = { x: 0, y: -16 };
        break;
    }
    if (!delta) return;
    const panel = floatingPanelRef.current;
    if (!panel) return;
    event.preventDefault();
    setFloatingOffset((current) =>
      clampFloatingOffset(
        { x: current.x + delta.x, y: current.y + delta.y },
        current,
        panel.getBoundingClientRect(),
      ),
    );
  };

  useEffect(() => {
    if (!activeTool) return;
    const frame = requestAnimationFrame(() =>
      floatingPanelRef.current?.focus(),
    );
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeToolPanel();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const panel = floatingPanelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", containFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("keydown", containFocus);
    };
  }, [activeTool, closeToolPanel]);

  useEffect(() => {
    localStorage.setItem(
      "pokerngkit-demo-rail-collapsed",
      String(railCollapsed),
    );
  }, [railCollapsed]);

  useEffect(() => {
    floatingDragRef.current = null;
    setFloatingDragging(false);
    setFloatingOffset({ x: 0, y: 0 });
  }, [activeTool]);

  const toolPanelCopy: Record<DemoTool, { detail: string; label: string }> = {
    encounter: {
      detail: "Local encounter data",
      label: t("encounterLookupModule"),
    },
    iv: { detail: "Gen III / Gen IV", label: t("ivCalculator") },
    profile: { detail: "Local save profile", label: t("profile") },
  };

  return (
    <div className="hs-demo-shell" data-demo-density="standard">
      <header className="hs-demo-topbar">
        <div className="hs-demo-topbar-leading">
          <button
            aria-label={t("openModules")}
            className="hs-demo-icon-button"
            aria-expanded={
              window.matchMedia("(max-width: 760px)").matches
                ? mobileRailOpen
                : !railCollapsed
            }
            onClick={toggleNavigation}
            title={t("openModules")}
            type="button"
          >
            <span className="hs-demo-menu-mobile-icon">
              {mobileRailOpen ? <X size={19} /> : <Menu size={19} />}
            </span>
            <span className="hs-demo-menu-desktop-icon">
              {railCollapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </span>
          </button>
          <div className="hs-demo-brand">
            <div className="hs-demo-brand-mark" aria-hidden="true">
              PR
            </div>
            <div>
              <strong>{t("brand")}</strong>
              <span>{t("subtitle")}</span>
            </div>
          </div>
        </div>
        <div className="hs-demo-topbar-actions">
          <span className="hs-demo-status">
            <Check size={14} /> {t("localOnly")}
          </span>
          <div
            aria-label={t("themeMode")}
            className="hs-demo-theme-mode-picker"
          >
            {themeModes.map(({ id, labelKey }) => {
              const Icon =
                id === "light" ? Sun : id === "dark" ? Moon : Monitor;
              return (
                <button
                  aria-label={t(labelKey)}
                  aria-pressed={preference === id}
                  className={preference === id ? "selected" : undefined}
                  key={id}
                  onClick={(event) =>
                    changeTheme(id, {
                      x: event.clientX,
                      y: event.clientY,
                    })
                  }
                  title={t(labelKey)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={15} />
                </button>
              );
            })}
          </div>
          <div className="hs-demo-language" aria-label={t("language")}>
            {(["zh", "en", "ja"] as const).map((language) => (
              <button
                className={i18n.language === language ? "selected" : undefined}
                key={language}
                onClick={() => setLanguage(language)}
                type="button"
              >
                {language === "zh" ? "中" : language === "en" ? "EN" : "日"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div
        className={`hs-demo-layout${railCollapsed ? " rail-collapsed" : ""}`}
      >
        <button
          aria-label={t("closeModules")}
          className={`hs-demo-rail-scrim${mobileRailOpen ? " visible" : ""}`}
          onClick={() => setMobileRailOpen(false)}
          type="button"
        />
        <aside
          className={`hs-demo-rail${mobileRailOpen ? " open" : ""}${
            railCollapsed ? " collapsed" : ""
          }`}
        >
          <div className="hs-demo-rail-search" role="search">
            <Search aria-hidden="true" size={16} />
            <input
              aria-label={t("modules")}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("modules")}
              type="search"
              value={searchQuery}
            />
            {searchQuery && (
              <button
                aria-label={t("clear")}
                onClick={() => setSearchQuery("")}
                title={t("clear")}
                type="button"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <nav aria-label={t("modules")} className="hs-demo-nav">
            {visibleGroups.map((group) => (
              <div className="hs-demo-nav-group" key={group.group}>
                <button
                  aria-expanded={
                    searchQuery.trim().length > 0 || openGroups.has(group.group)
                  }
                  className="hs-demo-nav-group-toggle"
                  onClick={() => toggleGroup(group.group)}
                  title={group.group}
                  type="button"
                >
                  <span className="hs-demo-nav-group-icon">
                    <GroupIcon group={group.group} />
                  </span>
                  <span className="hs-demo-nav-label">{group.group}</span>
                  <ChevronDown
                    className={
                      searchQuery.trim().length > 0 ||
                      openGroups.has(group.group)
                        ? "rotated"
                        : undefined
                    }
                    size={15}
                  />
                </button>
                {(searchQuery.trim().length > 0 ||
                  openGroups.has(group.group)) && (
                  <div className="hs-demo-nav-group-items">
                    {group.items.map((item) => (
                      <button
                        aria-current={
                          item.id === activeModule ? "page" : undefined
                        }
                        className={`hs-demo-nav-item${
                          item.id === activeModule ? " active" : ""
                        }`}
                        key={item.id}
                        onClick={() => selectModule(group.group, item.id)}
                        title={item.label}
                        type="button"
                      >
                        <span className="hs-demo-nav-item-copy">
                          <strong>{item.label}</strong>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {visibleGroups.length === 0 && (
              <div className="hs-demo-nav-empty">{t("empty")}</div>
            )}
          </nav>
        </aside>

        <main className="hs-demo-main">
          <div className="hs-demo-page-heading">
            <div>
              <h1>{selectedModule?.label ?? t("engine")}</h1>
              <p>{t("uiPreviewNotice")}</p>
            </div>
          </div>

          <div className="hs-demo-workspace-grid">
            <section className="hs-demo-panel hs-demo-config-panel">
              <div className="hs-demo-panel-heading">
                <div>
                  <div>
                    <h2>{t("idModule")}</h2>
                    <span>{t("version")}</span>
                  </div>
                </div>
                <span className="hs-demo-panel-state">
                  <Check size={14} /> {t("localOnly")}
                </span>
              </div>

              <div className="hs-demo-segmented" role="tablist">
                {(["generator", "searcher"] as const).map((operation) => (
                  <button
                    aria-selected={activeOperation === operation}
                    className={
                      activeOperation === operation ? "active" : undefined
                    }
                    key={operation}
                    onClick={() => setActiveOperation(operation)}
                    role="tab"
                    type="button"
                  >
                    {t(operation)}
                  </button>
                ))}
              </div>

              <div className="hs-demo-field-grid">
                <label className="hs-demo-field">
                  <span>{t("version")}</span>
                  <DemoCombobox
                    ariaLabel={t("version")}
                    defaultValue="emerald"
                    options={demoVersionOptions}
                  />
                </label>
                <label className="hs-demo-field">
                  <span>{t("pokemon")}</span>
                  <DemoCombobox
                    ariaLabel={t("pokemon")}
                    defaultValue="pikachu"
                    options={demoPokemonOptions}
                  />
                </label>
                <label className="hs-demo-field hs-demo-field-wide">
                  <span>{t("seed")}</span>
                  <input defaultValue="00A1C2D3" spellCheck="false" />
                  <small>HEX / 32-bit</small>
                </label>
                <label className="hs-demo-field">
                  <span>{t("initialAdvances")}</span>
                  <input defaultValue="0" inputMode="numeric" />
                </label>
                <label className="hs-demo-field">
                  <span>{t("maxAdvances")}</span>
                  <input defaultValue="100000" inputMode="numeric" />
                </label>
              </div>

              <div className="hs-demo-advanced">
                <button
                  aria-expanded={showAdvanced}
                  className="hs-demo-disclosure"
                  onClick={() => setShowAdvanced((value) => !value)}
                  type="button"
                >
                  <span>
                    <SlidersHorizontal size={16} /> {t("filters")}
                  </span>
                  <ChevronDown
                    className={showAdvanced ? "rotated" : undefined}
                    size={17}
                  />
                </button>
                {showAdvanced && (
                  <div className="hs-demo-filter-grid">
                    <label className="hs-demo-field">
                      <span>{t("tid")}</span>
                      <input placeholder={t("noFilter")} />
                    </label>
                    <label className="hs-demo-field">
                      <span>{t("sid")}</span>
                      <input placeholder={t("noFilter")} />
                    </label>
                    <label className="hs-demo-field">
                      <span>{t("tsv")}</span>
                      <input placeholder={t("noFilter")} />
                    </label>
                  </div>
                )}
              </div>

              <div className="hs-demo-actions">
                <button
                  className="hs-demo-primary-action"
                  onClick={() => {
                    setRunning((value) => {
                      const next = !value;
                      setResultState(next ? "loading" : "ready");
                      return next;
                    });
                  }}
                  type="button"
                >
                  {running ? <X size={17} /> : <Play size={17} />}
                  {running ? t("cancel") : t("run")}
                </button>
                <button className="hs-demo-secondary-action" type="button">
                  <Search size={17} />
                  {t("searcher")}
                </button>
              </div>
            </section>

            <section className="hs-demo-panel hs-demo-filter-panel">
              <div className="hs-demo-panel-heading">
                <div>
                  <div>
                    <h2>{t("filters")}</h2>
                    <span>{t("exactFilterHint")}</span>
                  </div>
                </div>
                <button
                  className="hs-demo-icon-button hs-demo-panel-icon"
                  title={t("filters")}
                  type="button"
                >
                  <SlidersHorizontal size={17} />
                </button>
              </div>
              <div className="hs-demo-filter-summary">
                <div>
                  <strong>3</strong>
                  <span>{t("filters")}</span>
                </div>
                <div>
                  <strong>0</strong>
                  <span>{t("noFilter")}</span>
                </div>
              </div>
              <div className="hs-demo-filter-list">
                <div>
                  <span>{t("tid")}</span>
                  <code>18427</code>
                  <button
                    aria-label={t("clear")}
                    title={t("clear")}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div>
                  <span>{t("sid")}</span>
                  <code>50211</code>
                  <button
                    aria-label={t("clear")}
                    title={t("clear")}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div>
                  <span>{t("tsv")}</span>
                  <code>0834</code>
                  <button
                    aria-label={t("clear")}
                    title={t("clear")}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="hs-demo-filter-note">
                <Check size={16} /> {t("exactFilterHint")}
              </div>
            </section>
          </div>

          <section
            aria-labelledby="hs-dropdown-preview-title"
            className="hs-demo-dropdown-showcase"
          >
            <div className="hs-demo-section-heading">
              <div>
                <h2 id="hs-dropdown-preview-title">下拉选框预览</h2>
              </div>
            </div>
            <div className="hs-demo-dropdown-preview-grid">
              <label className="hs-demo-field">
                <span>输入 + 按钮</span>
                <DemoCombobox
                  ariaLabel="游戏版本"
                  defaultValue="emerald"
                  options={demoVersionOptions}
                />
              </label>
              <div
                aria-label="候选版本"
                className="hs-demo-open-dropdown"
                role="listbox"
              >
                <span className="hs-demo-open-dropdown-label">候选版本</span>
                <div className="hs-demo-open-dropdown-menu">
                  {demoVersionOptions.map((option) => (
                    <button
                      aria-selected={option.value === "emerald"}
                      className={
                        option.value === "emerald" ? "active" : undefined
                      }
                      key={option.value}
                      role="option"
                      type="button"
                    >
                      <span>{option.label}</span>
                      {option.value === "emerald" && (
                        <Check aria-hidden="true" size={15} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="hs-demo-panel hs-demo-results-panel">
            <div className="hs-demo-results-heading">
              <div className="hs-demo-panel-heading">
                <div>
                  <div>
                    <h2>{t("results")}</h2>
                    <span>
                      {isLoading
                        ? t("workerPool")
                        : resultState === "empty"
                          ? t("empty")
                          : t("version")}
                    </span>
                  </div>
                </div>
                <span
                  className={`hs-demo-run-status${isLoading ? " running" : ""}`}
                >
                  <span /> {isLoading ? t("calculating") : t("ready")}
                </span>
              </div>
              <div className="hs-demo-result-actions">
                <span>5 / 100000</span>
                <button className="hs-demo-secondary-action" type="button">
                  <Download size={16} /> {t("exportCsv")}
                </button>
                <button
                  aria-label={t("clear")}
                  className="hs-demo-icon-button"
                  title={t("clear")}
                  type="button"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
            <div className="hs-demo-progress">
              <span style={{ width: resultProgress }} />
            </div>
            <div className="hs-demo-metrics">
              <span>
                {t("processed")}{" "}
                <strong>{isLoading ? "58,000" : "34,000"}</strong>
              </span>
              <span>
                {t("results")} <strong>5</strong>
              </span>
              <span>
                {t("workers")} <strong>4</strong>
              </span>
              <span>
                {t("elapsed")} <strong>0.84 s</strong>
              </span>
            </div>
            <div
              className="hs-demo-state-switcher"
              aria-label="Result state preview"
            >
              {(["ready", "loading", "empty", "error", "warning"] as const).map(
                (state) => (
                  <button
                    aria-pressed={resultState === state}
                    className={resultState === state ? "active" : undefined}
                    key={state}
                    onClick={() => {
                      setResultState(state);
                      setRunning(state === "loading");
                    }}
                    type="button"
                  >
                    {state === "ready"
                      ? t("ready")
                      : state === "loading"
                        ? t("calculating")
                        : state === "empty"
                          ? t("empty")
                          : state === "error"
                            ? "Error"
                            : "Warning"}
                  </button>
                ),
              )}
            </div>
            {resultState === "error" && (
              <div className="hs-demo-alert error">{t("wasmMissing")}</div>
            )}
            {resultState === "warning" && (
              <div className="hs-demo-alert warning">{t("limitReached")}</div>
            )}
            {resultState === "empty" ? (
              <div className="hs-demo-empty-state">
                <Search aria-hidden="true" size={20} />
                <span>{t("empty")}</span>
              </div>
            ) : (
              <div className="hs-demo-table-wrap">
                <table className="hs-demo-table">
                  <thead>
                    <tr>
                      <th>{t("rowAdvance")}</th>
                      <th>{t("rowTid")}</th>
                      <th>{t("rowSid")}</th>
                      <th>{t("rowTsv")}</th>
                      <th>Nature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoRows.map((row) => (
                      <tr key={row.advance}>
                        <td>{row.advance}</td>
                        <td>{row.tid}</td>
                        <td>{row.sid}</td>
                        <td>{row.tsv}</td>
                        <td>
                          <span className="hs-demo-nature">{row.nature}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section
            aria-labelledby="hs-panel-preview-title"
            className="hs-demo-panel-showcase"
          >
            <div className="hs-demo-section-heading">
              <div>
                <h2 id="hs-panel-preview-title">面板 UI 预览</h2>
              </div>
            </div>
            <div className="hs-demo-panel-showcase-grid">
              {(Object.keys(toolPanelCopy) as DemoTool[]).map((tool) => {
                const Icon =
                  tool === "profile"
                    ? UserRound
                    : tool === "iv"
                      ? Calculator
                      : MapPin;
                const copy = toolPanelCopy[tool];
                return (
                  <button
                    aria-controls="hs-demo-floating-panel"
                    aria-pressed={activeTool === tool}
                    className={`hs-demo-panel-preview-option${
                      activeTool === tool ? " active" : ""
                    }`}
                    key={tool}
                    onClick={() =>
                      setActiveTool((current) =>
                        current === tool ? null : tool,
                      )
                    }
                    type="button"
                  >
                    <span className="hs-demo-panel-preview-icon">
                      <Icon aria-hidden="true" size={19} />
                    </span>
                    <span>
                      <strong>{copy.label}</strong>
                      <small>{copy.detail}</small>
                    </span>
                    <span className="hs-demo-panel-preview-command">
                      {activeTool === tool ? "关闭" : "打开"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </main>

        <div
          aria-label={t("tools")}
          className={`hs-demo-tool-rail${toolsExpanded ? " expanded" : ""}`}
          onMouseEnter={() => {
            if (toolRailUsesHover()) setToolsExpanded(true);
          }}
          onMouseLeave={() => {
            if (toolRailUsesHover()) setToolsExpanded(false);
          }}
        >
          <div
            aria-label={t("tools")}
            className="hs-demo-tool-rail-actions"
            id="hs-demo-tool-actions"
          >
            <button
              aria-controls="hs-demo-floating-panel"
              aria-expanded={activeTool === "iv"}
              aria-label={t("ivCalculator")}
              className={activeTool === "iv" ? "active" : undefined}
              data-tone="brand"
              onClick={() => {
                if (!toolRailUsesHover()) setToolsExpanded(true);
                setActiveTool((current) => (current === "iv" ? null : "iv"));
              }}
              ref={(node) => {
                toolTriggerRefs.current.iv = node;
              }}
              title={t("ivCalculator")}
              type="button"
            >
              <Calculator aria-hidden="true" size={19} />
            </button>
            <button
              aria-controls="hs-demo-floating-panel"
              aria-expanded={activeTool === "encounter"}
              aria-label={t("encounterLookupModule")}
              className={activeTool === "encounter" ? "active" : undefined}
              data-tone="teal"
              onClick={() => {
                if (!toolRailUsesHover()) setToolsExpanded(true);
                setActiveTool((current) =>
                  current === "encounter" ? null : "encounter",
                );
              }}
              ref={(node) => {
                toolTriggerRefs.current.encounter = node;
              }}
              title={t("encounterLookupModule")}
              type="button"
            >
              <MapPin aria-hidden="true" size={19} />
            </button>
            <button
              aria-controls="hs-demo-floating-panel"
              aria-expanded={activeTool === "profile"}
              aria-label={t("profile")}
              className={activeTool === "profile" ? "active" : undefined}
              data-tone="amber"
              onClick={() => {
                if (!toolRailUsesHover()) setToolsExpanded(true);
                setActiveTool((current) =>
                  current === "profile" ? null : "profile",
                );
              }}
              ref={(node) => {
                toolTriggerRefs.current.profile = node;
              }}
              title={t("profile")}
              type="button"
            >
              <UserRound aria-hidden="true" size={19} />
            </button>
          </div>
          <button
            aria-controls="hs-demo-tool-actions"
            aria-expanded={toolsExpanded}
            aria-label={t("tools")}
            className="hs-demo-tool-rail-toggle"
            onClick={(event) => {
              if (toolRailUsesHover() && event.detail > 0) return;
              if (toolsExpanded) event.currentTarget.blur();
              setToolsExpanded((value) => !value);
            }}
            title={t("tools")}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" size={19} />
          </button>
        </div>
      </div>
      {activeTool && (
        <>
          <button
            aria-label="关闭面板预览"
            className="hs-demo-tool-scrim"
            onClick={closeToolPanel}
            type="button"
          />
          <section
            aria-labelledby="hs-demo-floating-panel-title"
            aria-modal="true"
            className={
              "hs-demo-floating-panel hs-demo-floating-panel-" +
              activeTool +
              (floatingDragging ? " dragging" : "")
            }
            id="hs-demo-floating-panel"
            ref={floatingPanelRef}
            role="dialog"
            style={{
              transform:
                "translate(calc(-50% + " +
                floatingOffset.x +
                "px), calc(-50% + " +
                floatingOffset.y +
                "px))",
            }}
            tabIndex={-1}
          >
            <header
              aria-label="拖动面板标题栏"
              className="hs-demo-floating-panel-heading"
              onKeyDown={handleFloatingKeyDown}
              onPointerCancel={stopFloatingDrag}
              onPointerDown={handleFloatingPointerDown}
              onPointerMove={handleFloatingPointerMove}
              onPointerUp={stopFloatingDrag}
              tabIndex={0}
            >
              <div>
                <h2 id="hs-demo-floating-panel-title">
                  {toolPanelCopy[activeTool].label}
                </h2>
                <small>{toolPanelCopy[activeTool].detail}</small>
              </div>
              <button
                aria-label="关闭面板预览"
                className="hs-demo-floating-panel-close"
                onClick={closeToolPanel}
                title="关闭面板预览"
                type="button"
              >
                <X aria-hidden="true" size={19} />
              </button>
            </header>
            {activeTool === "profile" && (
              <div className="hs-demo-floating-body">
                <label className="hs-demo-floating-field">
                  <span>当前档案</span>
                  <DemoCombobox
                    ariaLabel="当前档案"
                    defaultValue="emerald"
                    options={demoProfileOptions}
                  />
                </label>
                <div className="hs-demo-floating-field-grid">
                  <label className="hs-demo-floating-field">
                    <span>TID</span>
                    <input defaultValue="18427" inputMode="numeric" />
                  </label>
                  <label className="hs-demo-floating-field">
                    <span>SID</span>
                    <input defaultValue="50211" inputMode="numeric" />
                  </label>
                </div>
                <p className="hs-demo-floating-note">
                  仅保存在本机；切换档案不会改动当前模块参数。
                </p>
              </div>
            )}
            {activeTool === "iv" && (
              <div className="hs-demo-floating-body">
                <label className="hs-demo-floating-field">
                  <span>宝可梦</span>
                  <input defaultValue="Pikachu" />
                </label>
                <div className="hs-demo-floating-field-grid">
                  <label className="hs-demo-floating-field">
                    <span>等级</span>
                    <input defaultValue="50" inputMode="numeric" />
                  </label>
                  <label className="hs-demo-floating-field">
                    <span>性格</span>
                    <DemoCombobox
                      ariaLabel="性格"
                      defaultValue="timid"
                      options={demoNatureOptions}
                    />
                  </label>
                </div>
                <div className="hs-demo-floating-stat-list">
                  {[
                    ["HP", "31"],
                    ["Atk", "28"],
                    ["Def", "30"],
                    ["SpA", "31"],
                    ["SpD", "29"],
                    ["Spe", "31"],
                  ].map(([stat, value]) => (
                    <div key={stat}>
                      <span>{stat}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTool === "encounter" && (
              <div className="hs-demo-floating-body">
                <label className="hs-demo-floating-field">
                  <span>宝可梦</span>
                  <input defaultValue="Pikachu" />
                </label>
                <label className="hs-demo-floating-field">
                  <span>游戏版本</span>
                  <DemoCombobox
                    ariaLabel="游戏版本"
                    defaultValue="emerald"
                    options={demoEncounterVersionOptions}
                  />
                </label>
                <div className="hs-demo-floating-result">
                  <strong>Safari Zone Area 1</strong>
                  <span>草丛 · Lv.25-27 · 20%</span>
                </div>
              </div>
            )}
            <footer className="hs-demo-floating-footer">
              <button className="hs-demo-secondary-action" type="button">
                {t("clear")}
              </button>
              <button className="hs-demo-primary-action" type="button">
                <Check aria-hidden="true" size={16} />
                应用
              </button>
            </footer>
          </section>
        </>
      )}
      <footer className="hs-demo-footer">
        <span>{t("uiPreview")}</span>
        <span>{t("localOnly")}</span>
        <span>PokeFinder</span>
        <span>GPL-3.0-or-later</span>
      </footer>
    </div>
  );
}
