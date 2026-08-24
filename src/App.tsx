import { useVirtualizer } from "@tanstack/react-virtual";
import {
  cloneElement,
  Component,
  type FormEvent,
  lazy,
  type ReactElement,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Calculator,
  BookOpen,
  Check,
  ChevronDown,
  Dices,
  FlaskConical,
  KeyRound,
  ListChecks,
  Menu,
  Monitor,
  Moon,
  Paintbrush,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SlidersHorizontal,
  Sun,
  RadioTower,
  UserRound,
  X,
} from "lucide-react";
import {
  calculateRsSeed,
  formatHex,
  parseDecimal,
  parseHex,
  validateId3Request,
  type Id3Mode,
  type Id3Request,
  type Id3ShinyFilter,
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
import { UnifiedProfilePanel } from "./features/profiles/UnifiedProfilePanel";
import {
  gen3EggProfileOrDefault,
  gen3GameCubeProfileOrDefault,
  gen3PokeSpotProfileOrDefault,
  gen3StaticProfileOrDefault,
} from "./features/profiles/domain";
import { useGen3Profiles } from "./features/profiles/useGen3Profiles";
import {
  Gen3SeedToolsPanel,
  type Gen3SeedToolTab,
} from "./features/gen3seedtools/Gen3SeedToolsPanel";
import { Gen3SpindaPainterPanel } from "./features/spindapainter/Gen3SpindaPainterPanel";
import { Gen3IvToPidPanel } from "./features/ivtopid/Gen3IvToPidPanel";
import { Gen3PidToIvPanel } from "./features/pidtoiv/Gen3PidToIvPanel";
import { Gen3JirachiAdvancerPanel } from "./features/jirachiadvancer/Gen3JirachiAdvancerPanel";
import { Gen3PokeSpotPanel } from "./features/pokespot/Gen3PokeSpotPanel";
import { Gen3GameCubePanel } from "./features/gamecube/Gen3GameCubePanel";
import { Gen3StaticPanel } from "./features/static/Gen3StaticPanel";
import { Gen3WildPanel } from "./features/wild/Gen3WildPanel";
import { Gen7IdPanel } from "./features/gen7id/Gen7IdPanel";
import { Gen7StationaryPanel } from "./features/gen7stationary/Gen7StationaryPanel";
import { Gen7WildPanel } from "./features/gen7wild/Gen7WildPanel";
import { Gen7SosPanel } from "./features/gen7sos/Gen7SosPanel";
import { Gen7EggPanel } from "./features/gen7egg/Gen7EggPanel";
import { Gen7BattleTreePanel } from "./features/gen7battletree/Gen7BattleTreePanel";
import { Gen7EventPanel } from "./features/gen7event/Gen7EventPanel";
import { Gen7EventTimePanel } from "./features/gen7event/Gen7EventTimePanel";
import { Gen7WildTimePanel } from "./features/gen7wildtimefinder/Gen7WildTimePanel";
import { Gen7IdTimePanel } from "./features/gen7idtimefinder/Gen7IdTimePanel";
import { Gen7MainPanel } from "./features/gen7main/Gen7MainPanel";
import { Gen7EggSeedFinderPanel } from "./features/gen7eggseedfinder/Gen7EggSeedFinderPanel";
import { Gen7FestivalPlazaPanel } from "./features/gen7festivalplaza/Gen7FestivalPlazaPanel";
import { Gen6BankPanel } from "./features/gen6bank/Gen6BankPanel";
import { Gen6StationaryPanel } from "./features/gen6stationary/Gen6StationaryPanel";
import { Gen6EventPanel } from "./features/gen6event/Gen6EventPanel";
import { Gen6WildPanel } from "./features/gen6wild/Gen6WildPanel";
import { Gen6DexNavPanel } from "./features/gen6dexnav/Gen6DexNavPanel";
import { Gen6PokeRadarPanel } from "./features/gen6pokeradar/Gen6PokeRadarPanel";
import { Gen6EggPanel } from "./features/gen6egg/Gen6EggPanel";
import { Gen6IdPanel } from "./features/gen6id/Gen6IdPanel";
import { Gen6MainSeedPanel } from "./features/gen6mainseed/Gen6MainSeedPanel";
import { Gen6MtSeedPanel } from "./features/gen6mtseed/Gen6MtSeedPanel";
import { Gen6MtSeedTimePanel } from "./features/gen6mtseedtime/Gen6MtSeedTimePanel";
import { Gen6TinyTimelinePanel } from "./features/gen6tinytimeline/Gen6TinyTimelinePanel";
import { Gen6TinyIndexPanel } from "./features/gen6tinyindex/Gen6TinyIndexPanel";
import { Gen6TinyRockSmashPanel } from "./features/gen6tinyrocksmash/Gen6TinyRockSmashPanel";
import { Gen6TinyHoneyPanel } from "./features/gen6tinyhoney/Gen6TinyHoneyPanel";
import { Gen6TinyAmbushPanel } from "./features/gen6tinyambush/Gen6TinyAmbushPanel";
import { ThreeDsProfilesPanel } from "./features/3dsprofiles/ThreeDsProfilesPanel";
import { ThreeDsProfileSelector } from "./features/3dsprofiles/ThreeDsProfileSelector";
import { useThreeDsProfiles } from "./features/3dsprofiles/useThreeDsProfiles";
import { PokerusFinderPanel } from "./features/pokerusfinder/PokerusFinderPanel";
import { ContributionsPanel } from "./features/contributions/ContributionsPanel";
import { SponsorshipPanel } from "./features/sponsorship/SponsorshipPanel";
import { IvCalculator } from "./features/gen4ivcalculator/Gen4IvCalculator";
import { DEFAULT_GEN4_PROFILE } from "./features/gen4profiles/domain";
import { useGen4Profiles } from "./features/gen4profiles/useGen4Profiles";
import { Gen4StaticPanel } from "./features/gen4static/Gen4StaticPanel";
import { Gen4WildPanel } from "./features/gen4wild/Gen4WildPanel";
import { Gen4EggPanel } from "./features/gen4egg/Gen4EggPanel";
import { Gen4AdvancePanel } from "./features/gen4advance/Gen4AdvancePanel";
import { Gen4EventPanel } from "./features/gen4event/Gen4EventPanel";
import { Gen4IdPanel } from "./features/gen4id/Gen4IdPanel";
import { Gen4SeedToTimePanel } from "./features/gen4seedtotime/Gen4SeedToTimePanel";
import { Gen4SeedFinderPanel } from "./features/gen4seedfinder/Gen4SeedFinderPanel";
import { Gen4ChainedSidPanel } from "./features/gen4chainedsid/Gen4ChainedSidPanel";
import { Gen4SwarmPanel } from "./features/gen4swarm/Gen4SwarmPanel";
import { Gen5ProfilesPanel } from "./features/gen5profiles/Gen5ProfilesPanel";
import { Gen5IdPanel } from "./features/gen5id/Gen5IdPanel";
import { Gen5AdjacentSeedsPanel } from "./features/gen5adjacentseeds/Gen5AdjacentSeedsPanel";
import type { Gen5AdjacentSeedsInitialContext } from "./features/gen5adjacentseeds/domain";
import { Gen5IvCachePanel } from "./features/gen5ivcache/Gen5IvCachePanel";
import { Gen5Sha1CachePanel } from "./features/gen5sha1cache/Gen5Sha1CachePanel";
import { Gen5DreamRadarPanel } from "./features/gen5dreamradar/Gen5DreamRadarPanel";
import { Gen5StaticPanel } from "./features/gen5static/Gen5StaticPanel";
import { Gen5WildPanel } from "./features/gen5wild/Gen5WildPanel";
import { Gen5HiddenGrottoPanel } from "./features/gen5hiddengrotto/Gen5HiddenGrottoPanel";
import { Gen5EggPanel } from "./features/gen5egg/Gen5EggPanel";
import { Gen5EventPanel } from "./features/gen5event/Gen5EventPanel";
import { Gen8IdPanel } from "./features/gen8id/Gen8IdPanel";
import { Gen8ProfilesPanel } from "./features/gen8profiles/Gen8ProfilesPanel";
import { useGen8Profiles } from "./features/gen8profiles/useGen8Profiles";
import { Gen8EggPanel } from "./features/gen8egg/Gen8EggPanel";
import { Gen8EventPanel } from "./features/gen8event/Gen8EventPanel";
import { ResearcherPanel } from "./features/researcher/ResearcherPanel";
import { KeyBvPanel } from "./features/keybv/KeyBvPanel";
import { MiscRngPanel } from "./features/miscrng/MiscRngPanel";
import { TsvListPanel } from "./features/tsvlist/TsvListPanel";
import { IvToolsPanel } from "./features/ivtools/IvToolsPanel";
import { FloatingToolPanel } from "./features/shared/FloatingToolPanel";
import { Select } from "./features/shared/Select";
import { Gen3PaintingPanel } from "./features/gen3painting/Gen3PaintingPanel";
import { Gen3WorkflowTipsPanel } from "./features/gen3workflow/Gen3WorkflowTipsPanel";
import { ProfileSelector } from "./features/shared/ProfileSelector";
import { useOverlayScrollLock } from "./features/shared/useOverlayScrollLock";
import { normalizeDecimalInput, normalizeHexInput } from "./input";
import { useTheme } from "./theme";

const Gen8RaidsPanel = lazy(async () => {
  const module = await import("./features/gen8raids/Gen8RaidsPanel");
  return { default: module.Gen8RaidsPanel };
});

const Gen8StaticPanel = lazy(async () => {
  const module = await import("./features/gen8static/Gen8StaticPanel");
  return { default: module.Gen8StaticPanel };
});

const Gen8UndergroundPanel = lazy(async () => {
  const module =
    await import("./features/gen8underground/Gen8UndergroundPanel");
  return { default: module.Gen8UndergroundPanel };
});

const Gen8WildPanel = lazy(async () => {
  const module = await import("./features/gen8wild/Gen8WildPanel");
  return { default: module.Gen8WildPanel };
});

const Gen8DenMapPanel = lazy(async () => {
  const module = await import("./features/gen8denmap/Gen8DenMapPanel");
  return { default: module.Gen8DenMapPanel };
});

type SortKey = keyof Id3State;
type SupportedLanguage = "zh" | "en" | "ja";
type ActiveModule =
  | "id"
  | "gen3seedtools"
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
  | "gen4seedfinder"
  | "gen4static"
  | "gen4egg"
  | "gen4event"
  | "gen4chainedsid"
  | "gen4advance"
  | "gen4swarm"
  | "gen5profiles"
  | "gen5id"
  | "gen5adjacentseeds"
  | "gen5ivcache"
  | "gen5sha1cache"
  | "gen5dreamradar"
  | "gen5static"
  | "gen5wild"
  | "gen5hiddengrotto"
  | "gen5egg"
  | "gen5event"
  | "gen6stationary"
  | "gen6timefinder"
  | "gen6bank"
  | "gen6event"
  | "gen6eventtimefinder"
  | "gen6wild"
  | "gen6dexnav"
  | "gen6pokeradar"
  | "gen6egg"
  | "gen6id"
  | "gen6mainseed"
  | "gen6mtseed"
  | "gen6mtseedtime"
  | "gen6tinytimeline"
  | "gen6tinyindex"
  | "gen6tinyrocksmash"
  | "gen6tinyhoney"
  | "gen6tinyambush"
  | "gen7timefinder"
  | "gen7eventtimefinder"
  | "gen7wildtimefinder"
  | "gen7idtimefinder"
  | "gen7stationary"
  | "gen7wild"
  | "gen7sos"
  | "gen7egg"
  | "gen7battletree"
  | "gen7event"
  | "gen7main"
  | "gen7eggseedfinder"
  | "gen7festivalplaza"
  | "gen7id"
  | "threedsprofiles"
  | "gen8profiles"
  | "gen8id"
  | "gen8egg"
  | "gen8event"
  | "gen8raids"
  | "gen8static"
  | "gen8underground"
  | "gen8wild"
  | "gen8denmap"
  | "researcher"
  | "pokerusfinder"
  | "gen4wild";

type ModuleNavigationItem = {
  id: ActiveModule;
  label: string;
  pokerusMode?: "gen3" | "pthgss";
};

type ModuleNavigationGroup = {
  id: string;
  label: string;
  marker: string;
  items: readonly ModuleNavigationItem[];
};

type CachedWorkspace = ReactElement<{
  "aria-hidden"?: boolean;
  hidden?: boolean;
  inert?: boolean;
}>;

class WorkspaceCache extends Component<{
  activeKey: string;
  children: CachedWorkspace;
}> {
  private readonly workspaces = new Map<string, CachedWorkspace>();

  render() {
    const { activeKey, children } = this.props;
    this.workspaces.set(activeKey, children);

    return (
      <>
        {[...this.workspaces].map(([key, workspace]) => {
          const active = key === activeKey;
          return cloneElement(workspace, {
            "aria-hidden": active ? undefined : true,
            hidden: !active,
            inert: active ? undefined : true,
            key,
          });
        })}
      </>
    );
  }
}

const moduleNavigationGroups: readonly ModuleNavigationGroup[] = [
  {
    id: "gen3",
    label: "GEN III",
    marker: "3",
    items: [
      { id: "id", label: "idModule" },
      { id: "gen3seedtools", label: "seedToolsModule" },
      { id: "static", label: "staticModule" },
      { id: "wild", label: "wildModule" },
      { id: "ivtopid", label: "ivToPidModule" },
      { id: "egg", label: "eggModule" },
      { id: "spindapainter", label: "spindaPainterModule" },
      {
        id: "pokerusfinder",
        label: "pokerusFinderModule",
        pokerusMode: "gen3",
      },
      { id: "gamecube", label: "gameCubeModule" },
      { id: "pidtoiv", label: "pidToIvModule" },
      { id: "pokespot", label: "pokeSpotModule" },
      { id: "jirachiadvancer", label: "jirachiAdvancerModule" },
    ],
  },
  {
    id: "gen4",
    label: "GEN IV",
    marker: "4",
    items: [
      { id: "gen4id", label: "gen4IdModule" },
      { id: "gen4seedfinder", label: "gen4SeedFinderModule" },
      { id: "gen4seedtotime", label: "gen4SeedToTimeModule" },
      { id: "gen4static", label: "gen4StaticModule" },
      { id: "gen4wild", label: "gen4WildModule" },
      { id: "gen4egg", label: "gen4EggModule" },
      { id: "gen4event", label: "gen4EventModule" },
      { id: "gen4chainedsid", label: "gen4ChainedSidModule" },
      { id: "gen4advance", label: "gen4AdvanceModule" },
      {
        id: "pokerusfinder",
        label: "pokerusFinderModule",
        pokerusMode: "pthgss",
      },
    ],
  },
  {
    id: "gen5",
    label: "GEN V",
    marker: "5",
    items: [
      { id: "gen5id", label: "gen5IdModule" },
      { id: "gen5adjacentseeds", label: "gen5AdjacentSeedsModule" },
      { id: "gen5ivcache", label: "gen5IvCacheModule" },
      { id: "gen5sha1cache", label: "gen5Sha1CacheModule" },
      { id: "gen5dreamradar", label: "gen5DreamRadarModule" },
      { id: "gen5static", label: "gen5StaticModule" },
      { id: "gen5wild", label: "gen5WildModule" },
      { id: "gen5hiddengrotto", label: "gen5HiddenGrottoModule" },
      { id: "gen5egg", label: "gen5EggModule" },
      { id: "gen5event", label: "gen5EventModule" },
    ],
  },
  {
    id: "gen6",
    label: "GEN VI",
    marker: "6",
    items: [
      { id: "gen6stationary", label: "gen6StationaryModule" },
      { id: "gen6timefinder", label: "gen6StationaryTimeModule" },
      { id: "gen6bank", label: "gen6BankModule" },
      { id: "gen6event", label: "gen6EventModule" },
      { id: "gen6eventtimefinder", label: "gen6EventTimeModule" },
      { id: "gen6wild", label: "gen6WildModule" },
      { id: "gen6dexnav", label: "gen6DexNavModule" },
      { id: "gen6pokeradar", label: "gen6PokeRadarModule" },
      { id: "gen6egg", label: "gen6EggModule" },
      { id: "gen6id", label: "gen6IdModule" },
      { id: "gen6mainseed", label: "gen6MainSeedModule" },
      { id: "gen6mtseed", label: "gen6MtSeedModule" },
      { id: "gen6mtseedtime", label: "gen6MtSeedTimeModule" },
      { id: "gen6tinytimeline", label: "gen6TinyTimelineModule" },
      { id: "gen6tinyindex", label: "gen6TinyIndexModule" },
      { id: "gen6tinyrocksmash", label: "gen6TinyRockSmashModule" },
      { id: "gen6tinyhoney", label: "gen6TinyHoneyModule" },
      { id: "gen6tinyambush", label: "gen6TinyAmbushModule" },
    ],
  },
  {
    id: "gen7",
    label: "GEN VII",
    marker: "7",
    items: [
      { id: "gen7id", label: "gen7IdModule" },
      { id: "gen7timefinder", label: "gen7StationaryTimeModule" },
      { id: "gen7eventtimefinder", label: "gen7EventTimeModule" },
      { id: "gen7wildtimefinder", label: "gen7WildTimeModule" },
      { id: "gen7idtimefinder", label: "gen7IdTimeModule" },
      { id: "gen7main", label: "gen7MainModule" },
      { id: "gen7stationary", label: "gen7StationaryModule" },
      { id: "gen7wild", label: "gen7WildModule" },
      { id: "gen7sos", label: "gen7SosModule" },
      { id: "gen7egg", label: "gen7EggModule" },
      { id: "gen7event", label: "gen7EventModule" },
      { id: "gen7eggseedfinder", label: "gen7EggSeedFinderModule" },
      { id: "gen7battletree", label: "gen7BattleTreeModule" },
      { id: "gen7festivalplaza", label: "gen7FestivalPlazaModule" },
    ],
  },
  {
    id: "3ds",
    label: "3DSRNGTOOL",
    marker: "3D",
    items: [],
  },
  {
    id: "gen8",
    label: "GEN VIII",
    marker: "8",
    items: [
      { id: "gen8id", label: "gen8IdModule" },
      { id: "gen8egg", label: "gen8EggModule" },
      { id: "gen8event", label: "gen8EventModule" },
      { id: "gen8raids", label: "gen8RaidsModule" },
      { id: "gen8static", label: "gen8StaticModule" },
      { id: "gen8underground", label: "gen8UndergroundModule" },
      { id: "gen8wild", label: "gen8WildModule" },
      { id: "gen8denmap", label: "gen8DenMapModule" },
    ],
  },
  {
    id: "tools",
    label: "RNG TOOLS",
    marker: "R",
    items: [],
  },
];

function readModuleRailCollapsed() {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("pokerngkit-module-rail-collapsed") === "true";
}

function normalizeModuleNavigationLabel(label: string) {
  return label
    .replace(/^(?:第(?:三|四|五|六|七|八)世代|[3-8]代|Gen\s*[3-8])\s*/iu, "")
    .trim();
}

function ModuleNavigation({
  activeModule,
  collapsed,
  onGroupToggle,
  onSearchChange,
  onSelect,
  openGroups,
  pokerusInitialMode,
  searchQuery,
}: {
  activeModule: ActiveModule;
  collapsed: boolean;
  onGroupToggle: (group: string) => void;
  onSearchChange: (query: string) => void;
  onSelect: (group: string, item: ModuleNavigationItem) => void;
  openGroups: ReadonlySet<string>;
  pokerusInitialMode: "gen3" | "pthgss";
  searchQuery: string;
}) {
  const { t } = useTranslation();
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const visibleGroups = moduleNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const translatedLabel = t(item.label);
        const navigationLabel = normalizeModuleNavigationLabel(translatedLabel);
        return (
          translatedLabel.toLocaleLowerCase().includes(normalizedQuery) ||
          navigationLabel.toLocaleLowerCase().includes(normalizedQuery)
        );
      }),
    }))
    .filter((group) => group.items.length > 0);
  const searching = normalizedQuery.length > 0;

  return (
    <>
      <div
        aria-label={t("modules")}
        className="module-rail-search"
        inert={collapsed ? true : undefined}
        role="search"
      >
        <Search aria-hidden="true" size={16} />
        <input
          aria-label={t("modules")}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("modules")}
          type="search"
          value={searchQuery}
        />
        {searchQuery && (
          <button
            aria-label={t("clear")}
            onClick={() => onSearchChange("")}
            title={t("clear")}
            type="button"
          >
            <X aria-hidden="true" size={15} />
          </button>
        )}
      </div>
      <nav aria-label={t("modules")} className="module-navigation">
        {visibleGroups.map((group) => {
          const expanded = searching || openGroups.has(group.id);
          return (
            <section className="module-nav-group" key={group.id}>
              <button
                aria-expanded={expanded}
                aria-label={group.label}
                className="module-nav-group-toggle"
                onClick={() => onGroupToggle(group.id)}
                title={group.label}
                type="button"
              >
                <span aria-hidden="true" className="module-generation-icon">
                  {group.marker}
                </span>
                <span className="module-nav-group-label">{group.label}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={expanded ? "rotated" : undefined}
                  size={16}
                />
              </button>
              {expanded && (
                <div className="module-nav-group-items">
                  {group.items.map((item) => {
                    const selected =
                      item.id === activeModule &&
                      (!item.pokerusMode ||
                        item.pokerusMode === pokerusInitialMode);
                    const translatedLabel = t(item.label);
                    const navigationLabel =
                      normalizeModuleNavigationLabel(translatedLabel);
                    return (
                      <button
                        aria-current={selected ? "page" : undefined}
                        className={`module-entry${selected ? " active" : ""}`}
                        key={`${group.id}-${item.id}-${item.pokerusMode ?? ""}`}
                        onClick={() => onSelect(group.id, item)}
                        title={translatedLabel}
                        type="button"
                      >
                        <strong>{navigationLabel}</strong>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {visibleGroups.length === 0 && (
          <div className="module-navigation-empty">{t("empty")}</div>
        )}
      </nav>
    </>
  );
}

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
  const { preference, changeTheme } = useTheme();
  const profiles = useGen3Profiles();
  const gen4Profiles = useGen4Profiles();
  const threeDsProfiles = useThreeDsProfiles();
  const gen8Profiles = useGen8Profiles();
  const [activeModule, setActiveModule] = useState<ActiveModule>("id");
  const [gen3SeedToolsTab, setGen3SeedToolsTab] =
    useState<Gen3SeedToolTab>("initialseed");
  const [pokerusInitialMode, setPokerusInitialMode] = useState<
    "gen3" | "pthgss"
  >("gen3");
  const [moduleRailOpen, setModuleRailOpen] = useState(false);
  const [moduleRailCollapsed, setModuleRailCollapsed] = useState(
    readModuleRailCollapsed,
  );
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [openModuleGroups, setOpenModuleGroups] = useState(
    () => new Set<string>(),
  );
  const [ivCalculatorExpanded, setIvCalculatorExpanded] = useState(false);
  const [encounterLookupExpanded, setEncounterLookupExpanded] = useState(false);
  const [contributionsExpanded, setContributionsExpanded] = useState(false);
  const [sponsorshipExpanded, setSponsorshipExpanded] = useState(false);
  const [unifiedProfileExpanded, setUnifiedProfileExpanded] = useState(false);
  const [researcherExpanded, setResearcherExpanded] = useState(false);
  const [keyBvExpanded, setKeyBvExpanded] = useState(false);
  const [miscRngExpanded, setMiscRngExpanded] = useState(false);
  const [tsvListExpanded, setTsvListExpanded] = useState(false);
  const [ivToolsExpanded, setIvToolsExpanded] = useState(false);
  const [gen3PaintingExpanded, setGen3PaintingExpanded] = useState(false);
  const [gen3WorkflowExpanded, setGen3WorkflowExpanded] = useState(false);
  const [gen4SwarmExpanded, setGen4SwarmExpanded] = useState(false);
  const [floatingToolsExpanded, setFloatingToolsExpanded] = useState(false);
  const [gen5AdjacentSeedsContext, setGen5AdjacentSeedsContext] =
    useState<Gen5AdjacentSeedsInitialContext>();
  const gen5AdjacentSeedsRequestId = useRef(0);
  const openGen5AdjacentSeeds = (
    context: Omit<Gen5AdjacentSeedsInitialContext, "requestId">,
  ) => {
    gen5AdjacentSeedsRequestId.current += 1;
    setGen5AdjacentSeedsContext({
      ...context,
      requestId: gen5AdjacentSeedsRequestId.current,
    });
    setActiveModule("gen5adjacentseeds");
  };
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
  const [filterPid, setFilterPid] = useState("");
  const [filterIdShiny, setFilterIdShiny] =
    useState<Id3ShinyFilter>("star-square");
  const [gen3StaticTransfer, setGen3StaticTransfer] = useState<{
    seed: number;
    requestId: number;
  }>();
  const gen3WorkflowRequestId = useRef(0);
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

  useOverlayScrollLock(moduleRailOpen && !wideViewport, moduleRailRef);

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
    const getFocusableElements = () =>
      rail
        ? Array.from(
            rail.querySelectorAll<HTMLElement>(
              'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((element) => element.offsetParent !== null)
        : [];

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
      if (!window.matchMedia("(min-width: 901px)").matches) {
        menuButton?.focus();
      }
    };
  }, [moduleRailOpen, wideViewport]);
  useEffect(() => {
    localStorage.setItem(
      "pokerngkit-module-rail-collapsed",
      String(moduleRailCollapsed),
    );
  }, [moduleRailCollapsed]);

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
    setSponsorshipExpanded(false);
    setUnifiedProfileExpanded(false);
  };

  const closeProfilePanels = () => {
    setUnifiedProfileExpanded(false);
  };

  const openGen4IvCalculator = openIvCalculator;

  const openGen3IdForPid = (pid: number, seed: number) => {
    void seed;
    setFilterPid(formatHex(pid, 8));
    setFilterIdShiny("star-square");
    setMode("fr-lg");
    setIdOperation("generator");
    setActiveModule("id");
    setOpenModuleGroups(new Set(["gen3"]));
    setModuleRailOpen(false);
    closeFloatingTools();
  };

  const openGen3Painting = () => {
    toggleFloatingTool("gen3Painting");
  };

  const applyPaintingSeedToStatic = (seed: number) => {
    gen3WorkflowRequestId.current += 1;
    setGen3StaticTransfer({
      seed,
      requestId: gen3WorkflowRequestId.current,
    });
    closeFloatingTools();
    setActiveModule("static");
    setOpenModuleGroups(new Set(["gen3"]));
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
        pid: filterPid.trim() ? (parseHex(filterPid) ?? Number.NaN) : undefined,
        shiny: filterPid.trim() ? filterIdShiny : undefined,
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
      [t("rowAdvance"), t("rowTid"), t("rowSid"), t("rowTsv"), t("shiny")],
      ...sortedResults.map((state) => [
        state.advances,
        state.tid,
        state.sid,
        state.tsv,
        t(
          state.shiny === 2
            ? "shinySquare"
            : state.shiny === 1
              ? "shinyStar"
              : "shinyNone",
        ),
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
  const gen5Module =
    activeModule === "gen5profiles" ||
    activeModule === "gen5id" ||
    activeModule === "gen5adjacentseeds" ||
    activeModule === "gen5ivcache" ||
    activeModule === "gen5sha1cache" ||
    activeModule === "gen5dreamradar" ||
    activeModule === "gen5static" ||
    activeModule === "gen5wild" ||
    activeModule === "gen5hiddengrotto" ||
    activeModule === "gen5egg" ||
    activeModule === "gen5event";
  const gen6Module =
    activeModule === "gen6stationary" ||
    activeModule === "gen6timefinder" ||
    activeModule === "gen6bank" ||
    activeModule === "gen6event" ||
    activeModule === "gen6eventtimefinder" ||
    activeModule === "gen6wild" ||
    activeModule === "gen6dexnav" ||
    activeModule === "gen6pokeradar" ||
    activeModule === "gen6egg" ||
    activeModule === "gen6id" ||
    activeModule === "gen6mainseed" ||
    activeModule === "gen6mtseed" ||
    activeModule === "gen6mtseedtime" ||
    activeModule === "gen6tinytimeline" ||
    activeModule === "gen6tinyindex" ||
    activeModule === "gen6tinyrocksmash" ||
    activeModule === "gen6tinyhoney" ||
    activeModule === "gen6tinyambush";
  const gen7Module =
    activeModule === "gen7timefinder" ||
    activeModule === "gen7eventtimefinder" ||
    activeModule === "gen7wildtimefinder" ||
    activeModule === "gen7idtimefinder" ||
    activeModule === "gen7stationary" ||
    activeModule === "gen7wild" ||
    activeModule === "gen7sos" ||
    activeModule === "gen7egg" ||
    activeModule === "gen7battletree" ||
    activeModule === "gen7event" ||
    activeModule === "gen7main" ||
    activeModule === "gen7eggseedfinder" ||
    activeModule === "gen7festivalplaza" ||
    activeModule === "gen7id";
  const threeDsProfilesModule = activeModule === "threedsprofiles";
  const gen8Module =
    activeModule === "gen8profiles" ||
    activeModule === "gen8id" ||
    activeModule === "gen8egg" ||
    activeModule === "gen8event" ||
    activeModule === "gen8raids" ||
    activeModule === "gen8static" ||
    activeModule === "gen8underground" ||
    activeModule === "gen8wild" ||
    activeModule === "gen8denmap";
  const gen3ProfileScope =
    activeModule === "static" ||
    activeModule === "wild" ||
    activeModule === "egg"
      ? "handheld"
      : activeModule === "gamecube"
        ? "gamecube"
        : activeModule === "pokespot"
          ? "xd"
          : undefined;
  const gen3ProfileOptions = profiles.profiles.filter((profile) =>
    gen3ProfileScope === "handheld"
      ? profile.version !== "xd" && profile.version !== "colosseum"
      : gen3ProfileScope === "gamecube"
        ? profile.version === "xd" || profile.version === "colosseum"
        : gen3ProfileScope === "xd"
          ? profile.version === "xd"
          : false,
  );
  const gen3SelectedProfileId = gen3ProfileOptions.some(
    (profile) => profile.id === profiles.selectedProfileId,
  )
    ? profiles.selectedProfileId
    : null;
  const gen4ProfileModule =
    activeModule === "gen4static" ||
    activeModule === "gen4wild" ||
    activeModule === "gen4egg" ||
    activeModule === "gen4event";
  const gen4SelectedProfileId = gen4ProfileModule
    ? gen4Profiles.selectedProfileId
    : null;
  const researcherModule = activeModule === "researcher";
  const pokerusModule = activeModule === "pokerusfinder";
  const profileTools = true;
  const profileLabel = t("profile");
  const changeUnifiedProfileExpanded = (expanded: boolean) => {
    setUnifiedProfileExpanded(expanded);
    if (expanded) {
      setModuleRailOpen(false);
      setIvCalculatorExpanded(false);
      setEncounterLookupExpanded(false);
      setContributionsExpanded(false);
      setSponsorshipExpanded(false);
    }
  };
  const activeFloatingTool = sponsorshipExpanded
    ? "sponsorship"
    : contributionsExpanded
      ? "contributions"
      : ivCalculatorExpanded
        ? "iv"
        : encounterLookupExpanded
          ? "encounter"
          : researcherExpanded
            ? "researcher"
            : gen4SwarmExpanded
              ? "gen4Swarm"
              : keyBvExpanded
                ? "keybv"
                : miscRngExpanded
                  ? "miscRng"
                  : tsvListExpanded
                    ? "tsvList"
                    : ivToolsExpanded
                      ? "ivTools"
                      : gen3PaintingExpanded
                        ? "gen3Painting"
                        : gen3WorkflowExpanded
                          ? "gen3Workflow"
                          : profileTools && unifiedProfileExpanded
                            ? "profile"
                            : undefined;

  const closeFloatingTools = () => {
    setEncounterLookupExpanded(false);
    setIvCalculatorExpanded(false);
    setContributionsExpanded(false);
    setSponsorshipExpanded(false);
    setUnifiedProfileExpanded(false);
    setResearcherExpanded(false);
    setGen4SwarmExpanded(false);
    setKeyBvExpanded(false);
    setMiscRngExpanded(false);
    setTsvListExpanded(false);
    setIvToolsExpanded(false);
    setGen3PaintingExpanded(false);
    setGen3WorkflowExpanded(false);
    closeProfilePanels();
  };

  const toolRailUsesHover = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const toggleModuleGroup = (group: string) => {
    if (moduleRailCollapsed) {
      setModuleRailCollapsed(false);
      setOpenModuleGroups(new Set([group]));
      return;
    }
    setOpenModuleGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const selectModule = (group: string, item: ModuleNavigationItem) => {
    closeFloatingTools();
    if (item.pokerusMode) setPokerusInitialMode(item.pokerusMode);
    setActiveModule(item.id);
    setModuleRailOpen(false);
    setModuleSearchQuery("");
    setOpenModuleGroups(new Set([group]));
  };

  const toggleFloatingTool = (
    tool:
      | "contributions"
      | "encounter"
      | "iv"
      | "profile"
      | "researcher"
      | "gen4Swarm"
      | "keybv"
      | "miscRng"
      | "tsvList"
      | "ivTools"
      | "gen3Painting"
      | "gen3Workflow"
      | "sponsorship",
  ) => {
    const expanded = activeFloatingTool !== tool;
    setModuleRailOpen(false);
    closeFloatingTools();
    if (!expanded) return;
    if (tool === "sponsorship") setSponsorshipExpanded(true);
    else if (tool === "contributions") setContributionsExpanded(true);
    else if (tool === "encounter") setEncounterLookupExpanded(true);
    else if (tool === "iv") setIvCalculatorExpanded(true);
    else if (tool === "researcher") setResearcherExpanded(true);
    else if (tool === "gen4Swarm") setGen4SwarmExpanded(true);
    else if (tool === "keybv") setKeyBvExpanded(true);
    else if (tool === "miscRng") setMiscRngExpanded(true);
    else if (tool === "tsvList") setTsvListExpanded(true);
    else if (tool === "ivTools") setIvToolsExpanded(true);
    else if (tool === "gen3Painting") setGen3PaintingExpanded(true);
    else if (tool === "gen3Workflow") setGen3WorkflowExpanded(true);
    else if (tool === "profile") changeUnifiedProfileExpanded(true);
  };

  const openProfileManager = () => {
    if (activeFloatingTool === "profile") return;
    toggleFloatingTool("profile");
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
            {wideViewport && moduleRailCollapsed ? (
              <PanelLeftOpen aria-hidden="true" size={19} />
            ) : wideViewport ? (
              <PanelLeftClose aria-hidden="true" size={19} />
            ) : (
              <Menu aria-hidden="true" size={19} />
            )}
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
            </div>
          </div>
        </div>
        <div className="topbar-meta">
          <span className="app-status">
            <Check aria-hidden="true" size={14} />
            {t(uiPreviewMode ? "uiPreview" : "ready")}
          </span>
          <div aria-label={t("themeMode")} className="theme-switch">
            {[
              { value: "light" as const, label: "themeLight", Icon: Sun },
              { value: "dark" as const, label: "themeDark", Icon: Moon },
              {
                value: "system" as const,
                label: "themeSystem",
                Icon: Monitor,
              },
            ].map(({ value, label, Icon }) => (
              <button
                aria-pressed={preference === value}
                className={preference === value ? "selected" : undefined}
                key={value}
                onClick={(event) =>
                  changeTheme(value, {
                    x: event.clientX,
                    y: event.clientY,
                  })
                }
                title={t(label)}
                type="button"
              >
                <Icon aria-hidden="true" size={16} />
              </button>
            ))}
          </div>
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
          aria-hidden={!wideViewport && !moduleRailOpen}
          className={`module-rail${moduleRailOpen ? " open" : ""}${
            moduleRailCollapsed ? " collapsed" : ""
          }`}
          id="module-rail"
          inert={!wideViewport && !moduleRailOpen ? true : undefined}
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
                <X aria-hidden="true" size={19} />
              </button>
            </div>
          )}
          <ModuleNavigation
            activeModule={activeModule}
            collapsed={wideViewport && moduleRailCollapsed}
            onGroupToggle={toggleModuleGroup}
            onSearchChange={setModuleSearchQuery}
            onSelect={selectModule}
            openGroups={openModuleGroups}
            pokerusInitialMode={pokerusInitialMode}
            searchQuery={moduleSearchQuery}
          />
          <nav aria-label={t("modules")} className="module-navigation" hidden>
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
                activeModule === "gen3seedtools"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen3seedtools");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">02</span>
              <span>
                <strong>{t("seedToolsModule")}</strong>
                <small>{t("seedToolsVersion")}</small>
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
                activeModule === "gen4seedfinder"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen4seedfinder");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">16</span>
              <span>
                <strong>{t("gen4SeedFinderModule")}</strong>
                <small>{t("gen4SeedFinderVersion")}</small>
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
            <button
              className={
                activeModule === "gen5adjacentseeds"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5adjacentseeds");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">26</span>
              <span>
                <strong>{t("gen5AdjacentSeedsModule")}</strong>
                <small>{t("gen5AdjacentSeedsVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen5ivcache"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5ivcache");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">27</span>
              <span>
                <strong>{t("gen5IvCacheModule")}</strong>
                <small>{t("gen5IvCacheVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen5sha1cache"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5sha1cache");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">28</span>
              <span>
                <strong>{t("gen5Sha1CacheModule")}</strong>
                <small>{t("gen5Sha1CacheVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen5dreamradar"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5dreamradar");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">29</span>
              <span>
                <strong>{t("gen5DreamRadarModule")}</strong>
                <small>{t("gen5DreamRadarVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen5static"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5static");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">30</span>
              <span>
                <strong>{t("gen5StaticModule")}</strong>
                <small>{t("gen5StaticVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen5wild"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5wild");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">31</span>
              <span>
                <strong>{t("gen5WildModule")}</strong>
                <small>{t("gen5WildVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen5hiddengrotto"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5hiddengrotto");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">32</span>
              <span>
                <strong>{t("gen5HiddenGrottoModule")}</strong>
                <small>{t("gen5HiddenGrottoVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen5egg"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5egg");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">33</span>
              <span>
                <strong>{t("gen5EggModule")}</strong>
                <small>{t("gen5EggVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen5event"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen5event");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">34</span>
              <span>
                <strong>{t("gen5EventModule")}</strong>
                <small>{t("gen5EventVersion")}</small>
              </span>
            </button>
            <div className="rail-section-label">GEN VI</div>
            <button
              className={
                activeModule === "gen6stationary"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen6stationary");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">VI</span>
              <span>
                <strong>{t("gen6StationaryModule")}</strong>
                <small>{t("gen6StationaryVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen6timefinder"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen6timefinder");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">TF1</span>
              <span>
                <strong>{t("gen6StationaryTimeModule")}</strong>
                <small>{t("gen6StationaryTimeVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen6bank"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen6bank");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">VI+</span>
              <span>
                <strong>{t("gen6BankModule")}</strong>
                <small>{t("gen6BankVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen6event"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen6event");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">VI*</span>
              <span>
                <strong>{t("gen6EventModule")}</strong>
                <small>{t("gen6EventVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen6eventtimefinder"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen6eventtimefinder");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">TF2</span>
              <span>
                <strong>{t("gen6EventTimeModule")}</strong>
                <small>{t("gen6EventTimeVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen6wild"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen6wild");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">VI~</span>
              <span>
                <strong>{t("gen6WildModule")}</strong>
                <small>{t("gen6WildVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen6dexnav"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen6dexnav");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">VI#</span>
              <span>
                <strong>{t("gen6DexNavModule")}</strong>
                <small>{t("gen6DexNavVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen6pokeradar"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen6pokeradar");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">VI^</span>
              <span>
                <strong>{t("gen6PokeRadarModule")}</strong>
                <small>{t("gen6PokeRadarVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen6egg"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen6egg");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">VI E</span>
              <span>
                <strong>{t("gen6EggModule")}</strong>
                <small>{t("gen6EggVersion")}</small>
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
              <span className="module-index">35</span>
              <span>
                <strong>{t("gen7IdModule")}</strong>
                <small>{t("gen7IdVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7timefinder"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7timefinder");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">36</span>
              <span>
                <strong>{t("gen7StationaryTimeModule")}</strong>
                <small>{t("gen7StationaryTimeVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7eventtimefinder"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7eventtimefinder");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">37</span>
              <span>
                <strong>{t("gen7EventTimeModule")}</strong>
                <small>{t("gen7EventTimeVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7wildtimefinder"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7wildtimefinder");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">38</span>
              <span>
                <strong>{t("gen7WildTimeModule")}</strong>
                <small>{t("gen7WildTimeVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7idtimefinder"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7idtimefinder");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">39</span>
              <span>
                <strong>{t("gen7IdTimeModule")}</strong>
                <small>{t("gen7IdTimeVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7main"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7main");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">38</span>
              <span>
                <strong>{t("gen7MainModule")}</strong>
                <small>{t("gen7MainVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7stationary"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7stationary");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">39</span>
              <span>
                <strong>{t("gen7StationaryModule")}</strong>
                <small>{t("gen7StationaryVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7wild"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7wild");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">40</span>
              <span>
                <strong>{t("gen7WildModule")}</strong>
                <small>{t("gen7WildVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7sos"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7sos");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">41</span>
              <span>
                <strong>{t("gen7SosModule")}</strong>
                <small>{t("gen7SosVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7egg"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7egg");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">42</span>
              <span>
                <strong>{t("gen7EggModule")}</strong>
                <small>{t("gen7EggVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7event"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7event");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">43</span>
              <span>
                <strong>{t("gen7EventModule")}</strong>
                <small>{t("gen7EventVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7eggseedfinder"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7eggseedfinder");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">44</span>
              <span>
                <strong>{t("gen7EggSeedFinderModule")}</strong>
                <small>{t("gen7EggSeedFinderVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7battletree"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7battletree");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">45</span>
              <span>
                <strong>{t("gen7BattleTreeModule")}</strong>
                <small>{t("gen7BattleTreeVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen7festivalplaza"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen7festivalplaza");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">46</span>
              <span>
                <strong>{t("gen7FestivalPlazaModule")}</strong>
                <small>{t("gen7FestivalPlazaVersion")}</small>
              </span>
            </button>
            <div className="rail-section-label">3DSRNGTOOL</div>
            <button
              className={
                activeModule === "threedsprofiles"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("threedsprofiles");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">45</span>
              <span>
                <strong>{t("threeDsProfilesModule")}</strong>
                <small>{t("threeDsProfilesVersion")}</small>
              </span>
            </button>
            <div className="rail-section-label">GEN VIII</div>
            <button
              className={
                activeModule === "gen8profiles"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen8profiles");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">46</span>
              <span>
                <strong>{t("gen8ProfilesModule")}</strong>
                <small>{t("gen8ProfilesVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen8id"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen8id");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">47</span>
              <span>
                <strong>{t("gen8IdModule")}</strong>
                <small>{t("gen8IdVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen8egg"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen8egg");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">48</span>
              <span>
                <strong>{t("gen8EggModule")}</strong>
                <small>{t("gen8EggVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen8event"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen8event");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">49</span>
              <span>
                <strong>{t("gen8EventModule")}</strong>
                <small>{t("gen8EventVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen8raids"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen8raids");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">50</span>
              <span>
                <strong>{t("gen8RaidsModule")}</strong>
                <small>{t("gen8RaidsVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen8static"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen8static");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">51</span>
              <span>
                <strong>{t("gen8StaticModule")}</strong>
                <small>{t("gen8StaticVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen8underground"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen8underground");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">52</span>
              <span>
                <strong>{t("gen8UndergroundModule")}</strong>
                <small>{t("gen8UndergroundVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen8wild"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen8wild");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">53</span>
              <span>
                <strong>{t("gen8WildModule")}</strong>
                <small>{t("gen8WildVersion")}</small>
              </span>
            </button>
            <button
              className={
                activeModule === "gen8denmap"
                  ? "module-entry active"
                  : "module-entry"
              }
              onClick={() => {
                setActiveModule("gen8denmap");
                setModuleRailOpen(false);
              }}
              type="button"
            >
              <span className="module-index">54</span>
              <span>
                <strong>{t("gen8DenMapModule")}</strong>
                <small>{t("gen8DenMapVersion")}</small>
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
              <span className="module-index">55</span>
              <span>
                <strong>{t("researcherModule")}</strong>
                <small>{t("researcherVersion")}</small>
              </span>
            </button>
          </nav>
          <div className="rail-footer" hidden>
            <span className="rail-dot" />
            {t("localOnly")}
          </div>
        </aside>

        <WorkspaceCache
          activeKey={
            activeModule === "pokerusfinder"
              ? `${activeModule}-${pokerusInitialMode}`
              : activeModule
          }
        >
          <main className="main-content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  {activeModule === "gen4id" ||
                  activeModule === "gen4seedfinder" ||
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
                      : gen6Module
                        ? "GEN VI / RNG LAB"
                        : threeDsProfilesModule
                          ? "3DSRNGTOOL"
                          : gen7Module
                            ? "GEN VII / RNG LAB"
                            : gen8Module
                              ? "GEN VIII / RNG LAB"
                              : researcherModule || pokerusModule
                                ? "RNG TOOLS"
                                : "GEN III / RNG LAB"}
                </div>
                <h1>
                  {t(
                    activeModule === "id"
                      ? "engine"
                      : activeModule === "gen3seedtools"
                        ? "seedToolsEngine"
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
                                            : activeModule === "gen4seedfinder"
                                              ? "gen4SeedFinderEngine"
                                              : activeModule ===
                                                  "gen4seedtotime"
                                                ? "gen4SeedToTimeModule"
                                                : activeModule ===
                                                    "gen5profiles"
                                                  ? "gen5ProfilesEngine"
                                                  : activeModule === "gen5id"
                                                    ? "gen5IdEngine"
                                                    : activeModule ===
                                                        "gen5adjacentseeds"
                                                      ? "gen5AdjacentSeedsEngine"
                                                      : activeModule ===
                                                          "gen5ivcache"
                                                        ? "gen5IvCacheEngine"
                                                        : activeModule ===
                                                            "gen5sha1cache"
                                                          ? "gen5Sha1CacheEngine"
                                                          : activeModule ===
                                                              "gen5dreamradar"
                                                            ? "gen5DreamRadarEngine"
                                                            : activeModule ===
                                                                "gen5static"
                                                              ? "gen5StaticEngine"
                                                              : activeModule ===
                                                                  "gen5wild"
                                                                ? "gen5WildEngine"
                                                                : activeModule ===
                                                                    "gen5hiddengrotto"
                                                                  ? "gen5HiddenGrottoEngine"
                                                                  : activeModule ===
                                                                      "gen5egg"
                                                                    ? "gen5EggEngine"
                                                                    : activeModule ===
                                                                        "gen5event"
                                                                      ? "gen5EventEngine"
                                                                      : activeModule ===
                                                                          "researcher"
                                                                        ? "researcherEngine"
                                                                        : activeModule ===
                                                                            "gen6stationary"
                                                                          ? "gen6StationaryEngine"
                                                                          : activeModule ===
                                                                              "gen6timefinder"
                                                                            ? "gen6StationaryTimeModule"
                                                                            : activeModule ===
                                                                                "gen6bank"
                                                                              ? "gen6BankEngine"
                                                                              : activeModule ===
                                                                                  "gen6event"
                                                                                ? "gen6EventEngine"
                                                                                : activeModule ===
                                                                                    "gen6eventtimefinder"
                                                                                  ? "gen6EventTimeModule"
                                                                                  : activeModule ===
                                                                                      "gen6wild"
                                                                                    ? "gen6WildEngine"
                                                                                    : activeModule ===
                                                                                        "gen6dexnav"
                                                                                      ? "gen6DexNavEngine"
                                                                                      : activeModule ===
                                                                                          "gen6pokeradar"
                                                                                        ? "gen6PokeRadarEngine"
                                                                                        : activeModule ===
                                                                                            "gen6egg"
                                                                                          ? "gen6EggEngine"
                                                                                          : activeModule ===
                                                                                              "gen6id"
                                                                                            ? "gen6IdEngine"
                                                                                            : activeModule ===
                                                                                                "gen6mainseed"
                                                                                              ? "gen6MainSeedEngine"
                                                                                              : activeModule ===
                                                                                                  "gen6mtseed"
                                                                                                ? "gen6MtSeedModule"
                                                                                                : activeModule ===
                                                                                                    "gen6mtseedtime"
                                                                                                  ? "gen6MtSeedTimeModule"
                                                                                                  : activeModule ===
                                                                                                      "gen6tinyindex"
                                                                                                    ? "gen6TinyIndexEngine"
                                                                                                    : activeModule ===
                                                                                                        "gen6tinyrocksmash"
                                                                                                      ? "gen6TinyRockSmashEngine"
                                                                                                      : activeModule ===
                                                                                                          "gen6tinyhoney"
                                                                                                        ? "gen6TinyHoneyEngine"
                                                                                                        : activeModule ===
                                                                                                            "gen6tinyambush"
                                                                                                          ? "gen6TinyAmbushEngine"
                                                                                                          : activeModule ===
                                                                                                              "gen6tinytimeline"
                                                                                                            ? "gen6TinyTimelineEngine"
                                                                                                            : activeModule ===
                                                                                                                "gen7id"
                                                                                                              ? "gen7IdEngine"
                                                                                                              : activeModule ===
                                                                                                                  "gen7timefinder"
                                                                                                                ? "gen7StationaryTimeEngine"
                                                                                                                : activeModule ===
                                                                                                                    "gen7eventtimefinder"
                                                                                                                  ? "gen7EventTimeEngine"
                                                                                                                  : activeModule ===
                                                                                                                      "gen7wildtimefinder"
                                                                                                                    ? "gen7WildTimeEngine"
                                                                                                                    : activeModule ===
                                                                                                                        "gen7idtimefinder"
                                                                                                                      ? "gen7IdTimeEngine"
                                                                                                                      : activeModule ===
                                                                                                                          "gen7stationary"
                                                                                                                        ? "gen7StationaryEngine"
                                                                                                                        : activeModule ===
                                                                                                                            "gen7wild"
                                                                                                                          ? "gen7WildEngine"
                                                                                                                          : activeModule ===
                                                                                                                              "gen7sos"
                                                                                                                            ? "gen7SosEngine"
                                                                                                                            : activeModule ===
                                                                                                                                "gen7egg"
                                                                                                                              ? "gen7EggEngine"
                                                                                                                              : activeModule ===
                                                                                                                                  "gen7battletree"
                                                                                                                                ? "gen7BattleTreeEngine"
                                                                                                                                : activeModule ===
                                                                                                                                    "gen7event"
                                                                                                                                  ? "gen7EventEngine"
                                                                                                                                  : activeModule ===
                                                                                                                                      "gen7main"
                                                                                                                                    ? "gen7MainEngine"
                                                                                                                                    : activeModule ===
                                                                                                                                        "gen7eggseedfinder"
                                                                                                                                      ? "gen7EggSeedFinderModule"
                                                                                                                                      : activeModule ===
                                                                                                                                          "gen7festivalplaza"
                                                                                                                                        ? "gen7FestivalPlazaEngine"
                                                                                                                                        : activeModule ===
                                                                                                                                            "threedsprofiles"
                                                                                                                                          ? "threeDsProfilesEngine"
                                                                                                                                          : activeModule ===
                                                                                                                                              "gen8id"
                                                                                                                                            ? "gen8IdEngine"
                                                                                                                                            : activeModule ===
                                                                                                                                                "gen8egg"
                                                                                                                                              ? "gen8EggEngine"
                                                                                                                                              : activeModule ===
                                                                                                                                                  "gen8event"
                                                                                                                                                ? "gen8EventEngine"
                                                                                                                                                : activeModule ===
                                                                                                                                                    "gen8profiles"
                                                                                                                                                  ? "gen8ProfilesEngine"
                                                                                                                                                  : activeModule ===
                                                                                                                                                      "gen8raids"
                                                                                                                                                    ? "gen8RaidsEngine"
                                                                                                                                                    : activeModule ===
                                                                                                                                                        "gen8static"
                                                                                                                                                      ? "gen8StaticEngine"
                                                                                                                                                      : activeModule ===
                                                                                                                                                          "gen8underground"
                                                                                                                                                        ? "gen8UndergroundEngine"
                                                                                                                                                        : activeModule ===
                                                                                                                                                            "gen8denmap"
                                                                                                                                                          ? "gen8DenMapEngine"
                                                                                                                                                          : activeModule ===
                                                                                                                                                              "gen8wild"
                                                                                                                                                            ? "gen8WildEngine"
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
              <div className="page-heading-tools">
                {gen3ProfileScope && (
                  <ProfileSelector
                    disabled={profiles.loading}
                    label={t("profile")}
                    managerLabel={t("profileManager3")}
                    onOpenProfileManager={() => toggleFloatingTool("profile")}
                    onSelect={(profileId) =>
                      void profiles.selectProfile(profileId)
                    }
                    options={gen3ProfileOptions}
                    selectedProfileId={gen3SelectedProfileId}
                  />
                )}
                {gen4ProfileModule && (
                  <ProfileSelector
                    disabled={gen4Profiles.loading}
                    label={t("profile")}
                    managerLabel={t("profileManager4")}
                    onOpenProfileManager={() => toggleFloatingTool("profile")}
                    onSelect={(profileId) =>
                      void gen4Profiles.selectProfile(profileId)
                    }
                    options={gen4Profiles.profiles}
                    selectedProfileId={gen4SelectedProfileId}
                  />
                )}
                {(gen6Module || gen7Module) &&
                  activeModule !== "gen6id" &&
                  activeModule !== "gen6mainseed" &&
                  activeModule !== "gen6tinytimeline" &&
                  activeModule !== "gen6tinyindex" && (
                    <ThreeDsProfileSelector
                      controller={threeDsProfiles}
                      onOpenProfileManager={() => toggleFloatingTool("profile")}
                    />
                  )}
                <div className="heading-version">
                  {t(
                    activeModule === "id"
                      ? "version"
                      : activeModule === "gen3seedtools"
                        ? "seedToolsVersion"
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
                                            : activeModule === "gen4seedfinder"
                                              ? "gen4SeedFinderVersion"
                                              : activeModule ===
                                                  "gen4seedtotime"
                                                ? "gen4SeedToTimeVersion"
                                                : activeModule ===
                                                    "gen5profiles"
                                                  ? "gen5ProfilesVersion"
                                                  : activeModule === "gen5id"
                                                    ? "gen5IdVersion"
                                                    : activeModule ===
                                                        "gen5adjacentseeds"
                                                      ? "gen5AdjacentSeedsVersion"
                                                      : activeModule ===
                                                          "gen5ivcache"
                                                        ? "gen5IvCacheVersion"
                                                        : activeModule ===
                                                            "gen5sha1cache"
                                                          ? "gen5Sha1CacheVersion"
                                                          : activeModule ===
                                                              "gen5dreamradar"
                                                            ? "gen5DreamRadarVersion"
                                                            : activeModule ===
                                                                "gen5static"
                                                              ? "gen5StaticVersion"
                                                              : activeModule ===
                                                                  "gen5wild"
                                                                ? "gen5WildVersion"
                                                                : activeModule ===
                                                                    "gen5hiddengrotto"
                                                                  ? "gen5HiddenGrottoVersion"
                                                                  : activeModule ===
                                                                      "gen5egg"
                                                                    ? "gen5EggVersion"
                                                                    : activeModule ===
                                                                        "gen5event"
                                                                      ? "gen5EventVersion"
                                                                      : activeModule ===
                                                                          "researcher"
                                                                        ? "researcherVersion"
                                                                        : activeModule ===
                                                                            "gen6stationary"
                                                                          ? "gen6StationaryVersion"
                                                                          : activeModule ===
                                                                              "gen6timefinder"
                                                                            ? "gen6StationaryTimeVersion"
                                                                            : activeModule ===
                                                                                "gen6bank"
                                                                              ? "gen6BankVersion"
                                                                              : activeModule ===
                                                                                  "gen6event"
                                                                                ? "gen6EventVersion"
                                                                                : activeModule ===
                                                                                    "gen6eventtimefinder"
                                                                                  ? "gen6EventTimeVersion"
                                                                                  : activeModule ===
                                                                                      "gen6wild"
                                                                                    ? "gen6WildVersion"
                                                                                    : activeModule ===
                                                                                        "gen6dexnav"
                                                                                      ? "gen6DexNavVersion"
                                                                                      : activeModule ===
                                                                                          "gen6pokeradar"
                                                                                        ? "gen6PokeRadarVersion"
                                                                                        : activeModule ===
                                                                                            "gen6egg"
                                                                                          ? "gen6EggVersion"
                                                                                          : activeModule ===
                                                                                              "gen6id"
                                                                                            ? "gen6IdVersion"
                                                                                            : activeModule ===
                                                                                                "gen6mainseed"
                                                                                              ? "gen6MainSeedVersion"
                                                                                              : activeModule ===
                                                                                                  "gen6mtseed"
                                                                                                ? "gen6MtSeedVersion"
                                                                                                : activeModule ===
                                                                                                    "gen6mtseedtime"
                                                                                                  ? "gen6MtSeedVersion"
                                                                                                  : activeModule ===
                                                                                                      "gen6tinyindex"
                                                                                                    ? "gen6TinyIndexVersion"
                                                                                                    : activeModule ===
                                                                                                        "gen6tinyrocksmash"
                                                                                                      ? "gen6TinyRockSmashVersion"
                                                                                                      : activeModule ===
                                                                                                          "gen6tinyhoney"
                                                                                                        ? "gen6TinyHoneyApiVersion"
                                                                                                        : activeModule ===
                                                                                                            "gen6tinyambush"
                                                                                                          ? "gen6TinyAmbushVersion"
                                                                                                          : activeModule ===
                                                                                                              "gen6tinytimeline"
                                                                                                            ? "gen6TinyTimelineVersion"
                                                                                                            : activeModule ===
                                                                                                                "gen7id"
                                                                                                              ? "gen7IdVersion"
                                                                                                              : activeModule ===
                                                                                                                  "gen7timefinder"
                                                                                                                ? "gen7StationaryVersion"
                                                                                                                : activeModule ===
                                                                                                                    "gen7eventtimefinder"
                                                                                                                  ? "gen7EventTimeVersion"
                                                                                                                  : activeModule ===
                                                                                                                      "gen7wildtimefinder"
                                                                                                                    ? "gen7WildTimeVersion"
                                                                                                                    : activeModule ===
                                                                                                                        "gen7idtimefinder"
                                                                                                                      ? "gen7IdTimeVersion"
                                                                                                                      : activeModule ===
                                                                                                                          "gen7stationary"
                                                                                                                        ? "gen7StationaryTimeVersion"
                                                                                                                        : activeModule ===
                                                                                                                            "gen7wild"
                                                                                                                          ? "gen7WildVersion"
                                                                                                                          : activeModule ===
                                                                                                                              "gen7sos"
                                                                                                                            ? "gen7SosVersion"
                                                                                                                            : activeModule ===
                                                                                                                                "gen7egg"
                                                                                                                              ? "gen7EggVersion"
                                                                                                                              : activeModule ===
                                                                                                                                  "gen7battletree"
                                                                                                                                ? "gen7BattleTreeVersion"
                                                                                                                                : activeModule ===
                                                                                                                                    "gen7event"
                                                                                                                                  ? "gen7EventVersion"
                                                                                                                                  : activeModule ===
                                                                                                                                      "gen7main"
                                                                                                                                    ? "gen7MainVersion"
                                                                                                                                    : activeModule ===
                                                                                                                                        "gen7eggseedfinder"
                                                                                                                                      ? "gen7EggSeedFinderVersion"
                                                                                                                                      : activeModule ===
                                                                                                                                          "gen7festivalplaza"
                                                                                                                                        ? "gen7FestivalPlazaVersion"
                                                                                                                                        : activeModule ===
                                                                                                                                            "threedsprofiles"
                                                                                                                                          ? "threeDsProfilesVersion"
                                                                                                                                          : activeModule ===
                                                                                                                                              "gen8id"
                                                                                                                                            ? "gen8IdVersion"
                                                                                                                                            : activeModule ===
                                                                                                                                                "gen8egg"
                                                                                                                                              ? "gen8EggVersion"
                                                                                                                                              : activeModule ===
                                                                                                                                                  "gen8event"
                                                                                                                                                ? "gen8EventVersion"
                                                                                                                                                : activeModule ===
                                                                                                                                                    "gen8profiles"
                                                                                                                                                  ? "gen8ProfilesVersion"
                                                                                                                                                  : activeModule ===
                                                                                                                                                      "gen8raids"
                                                                                                                                                    ? "gen8RaidsVersion"
                                                                                                                                                    : activeModule ===
                                                                                                                                                        "gen8static"
                                                                                                                                                      ? "gen8StaticVersion"
                                                                                                                                                      : activeModule ===
                                                                                                                                                          "gen8underground"
                                                                                                                                                        ? "gen8UndergroundVersion"
                                                                                                                                                        : activeModule ===
                                                                                                                                                            "gen8denmap"
                                                                                                                                                          ? "gen8DenMapVersion"
                                                                                                                                                          : activeModule ===
                                                                                                                                                              "gen8wild"
                                                                                                                                                            ? "gen8WildVersion"
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
                              normalizeDecimalInput(
                                event.target.value,
                                8191,
                                4,
                              ),
                            )
                          }
                          placeholder={t("noFilter")}
                          value={filterTsv}
                        />
                        <small>DEC / 0 - 8191</small>
                      </label>
                      <label className="field">
                        <span>{t("targetPid")}</span>
                        <input
                          maxLength={8}
                          onChange={(event) =>
                            setFilterPid(
                              normalizeHexInput(event.target.value, 8),
                            )
                          }
                          placeholder={t("noFilter")}
                          value={filterPid}
                        />
                        <small>HEX / 32-bit</small>
                      </label>
                      <label className="field">
                        <span>{t("shiny")}</span>
                        <Select
                          disabled={!filterPid.trim()}
                          onChange={(event) =>
                            setFilterIdShiny(
                              event.target.value as Id3ShinyFilter,
                            )
                          }
                          value={filterIdShiny}
                        >
                          <option value="star-square">
                            {t("shinyStarSquare")}
                          </option>
                          <option value="star">{t("shinyStar")}</option>
                          <option value="square">{t("shinySquare")}</option>
                          <option value="any">{t("any")}</option>
                        </Select>
                        <small>{t("idTargetPidShinyHint")}</small>
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
                        {String(results.length)} /{" "}
                        {String(progress.totalStates)}
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
                        className="virtual-table id-generator-table"
                        style={{
                          height: `${rowVirtualizer.getTotalSize() + 38}px`,
                        }}
                      >
                        <div className="table-header">
                          {(
                            [
                              "advances",
                              "tid",
                              "sid",
                              "tsv",
                              "shiny",
                            ] as SortKey[]
                          ).map((key) => (
                            <button
                              key={key}
                              onClick={() => toggleSort(key)}
                              type="button"
                            >
                              {t(
                                key === "advances"
                                  ? "rowAdvance"
                                  : key === "shiny"
                                    ? "shiny"
                                    : `row${key.charAt(0).toUpperCase()}${key.slice(1)}`,
                              )}
                              {sortLabel(key)}
                            </button>
                          ))}
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
                              <span>
                                {state.tid.toString().padStart(5, "0")}
                              </span>
                              <span>
                                {state.sid.toString().padStart(5, "0")}
                              </span>
                              <span>
                                {state.tsv.toString().padStart(4, "0")}
                              </span>
                              <span>
                                {t(
                                  state.shiny === 2
                                    ? "shinySquare"
                                    : state.shiny === 1
                                      ? "shinyStar"
                                      : "shinyNone",
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : activeModule === "gen3seedtools" ? (
              <Gen3SeedToolsPanel
                activeTab={gen3SeedToolsTab}
                onTabChange={setGen3SeedToolsTab}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "static" ? (
              <Gen3StaticPanel
                initialTransfer={gen3StaticTransfer}
                onOpenIvCalculator={openIvCalculator}
                onFindCompatibleId={openGen3IdForPid}
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
            ) : activeModule === "gen4seedfinder" ? (
              <Gen4SeedFinderPanel uiPreviewMode={uiPreviewMode} />
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
                onOpenProfileManager={openProfileManager}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen5adjacentseeds" ? (
              <Gen5AdjacentSeedsPanel
                initialContext={gen5AdjacentSeedsContext}
                onOpenIvCalculator={openIvCalculator}
                onOpenProfileManager={openProfileManager}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen5ivcache" ? (
              <Gen5IvCachePanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen5sha1cache" ? (
              <Gen5Sha1CachePanel
                onOpenProfileManager={openProfileManager}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen5dreamradar" ? (
              <Gen5DreamRadarPanel
                onOpenProfileManager={openProfileManager}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen5static" ? (
              <Gen5StaticPanel
                onOpenAdjacentSeeds={openGen5AdjacentSeeds}
                onOpenProfileManager={openProfileManager}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen5wild" ? (
              <Gen5WildPanel
                onOpenAdjacentSeeds={openGen5AdjacentSeeds}
                onOpenProfileManager={openProfileManager}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen5hiddengrotto" ? (
              <Gen5HiddenGrottoPanel
                onOpenAdjacentSeeds={openGen5AdjacentSeeds}
                onOpenProfileManager={openProfileManager}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen5egg" ? (
              <Gen5EggPanel
                onOpenAdjacentSeeds={openGen5AdjacentSeeds}
                onOpenIvCalculator={openIvCalculator}
                onOpenProfileManager={openProfileManager}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen5event" ? (
              <Gen5EventPanel
                onOpenProfileManager={openProfileManager}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "researcher" ? (
              <ResearcherPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen6stationary" ? (
              <Gen6StationaryPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen6timefinder" ? (
              <Gen6StationaryPanel
                profile={threeDsProfiles.selectedProfile}
                timeFinderMode
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen6bank" ? (
              <Gen6BankPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen6event" ? (
              <Gen6EventPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen6eventtimefinder" ? (
              <Gen6EventPanel
                profile={threeDsProfiles.selectedProfile}
                timeFinderMode
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen6wild" ? (
              <Gen6WildPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen6dexnav" ? (
              <Gen6DexNavPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen6pokeradar" ? (
              <Gen6PokeRadarPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen6egg" ? (
              <Gen6EggPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen6id" ? (
              <Gen6IdPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen6mainseed" ? (
              <Gen6MainSeedPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen6mtseed" ? (
              <Gen6MtSeedPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen6mtseedtime" ? (
              <Gen6MtSeedTimePanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen6tinytimeline" ? (
              <Gen6TinyTimelinePanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen6tinyindex" ? (
              <Gen6TinyIndexPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen6tinyrocksmash" ? (
              <Gen6TinyRockSmashPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen6tinyhoney" ? (
              <Gen6TinyHoneyPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen6tinyambush" ? (
              <Gen6TinyAmbushPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen7timefinder" ? (
              <Gen7StationaryPanel
                profile={threeDsProfiles.selectedProfile}
                timeFinderMode
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen7eventtimefinder" ? (
              <Gen7EventTimePanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen7wildtimefinder" ? (
              <Gen7WildTimePanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen7idtimefinder" ? (
              <Gen7IdTimePanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen7stationary" ? (
              <Gen7StationaryPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen7wild" ? (
              <Gen7WildPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen7sos" ? (
              <Gen7SosPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen7egg" ? (
              <Gen7EggPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen7battletree" ? (
              <Gen7BattleTreePanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen7event" ? (
              <Gen7EventPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen7main" ? (
              <Gen7MainPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen7eggseedfinder" ? (
              <Gen7EggSeedFinderPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen7festivalplaza" ? (
              <Gen7FestivalPlazaPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen7id" ? (
              <Gen7IdPanel
                profile={threeDsProfiles.selectedProfile}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "threedsprofiles" ? (
              <ThreeDsProfilesPanel controller={threeDsProfiles} />
            ) : activeModule === "gen8id" ? (
              <Gen8IdPanel uiPreviewMode={uiPreviewMode} />
            ) : activeModule === "gen8egg" ? (
              <Gen8EggPanel
                onOpenIvCalculator={openGen4IvCalculator}
                onOpenProfileManager={openProfileManager}
                profiles={gen8Profiles}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen8event" ? (
              <Gen8EventPanel
                onOpenIvCalculator={openGen4IvCalculator}
                onOpenProfileManager={openProfileManager}
                profiles={gen8Profiles}
                uiPreviewMode={uiPreviewMode}
              />
            ) : activeModule === "gen8raids" ? (
              <Suspense fallback={null}>
                <Gen8RaidsPanel
                  onOpenProfileManager={openProfileManager}
                  profiles={gen8Profiles}
                  uiPreviewMode={uiPreviewMode}
                />
              </Suspense>
            ) : activeModule === "gen8static" ? (
              <Suspense fallback={null}>
                <Gen8StaticPanel
                  onOpenProfileManager={openProfileManager}
                  profiles={gen8Profiles}
                  uiPreviewMode={uiPreviewMode}
                />
              </Suspense>
            ) : activeModule === "gen8underground" ? (
              <Suspense fallback={null}>
                <Gen8UndergroundPanel
                  onOpenProfileManager={openProfileManager}
                  profiles={gen8Profiles}
                  uiPreviewMode={uiPreviewMode}
                />
              </Suspense>
            ) : activeModule === "gen8wild" ? (
              <Suspense fallback={null}>
                <Gen8WildPanel
                  onOpenProfileManager={openProfileManager}
                  profiles={gen8Profiles}
                  uiPreviewMode={uiPreviewMode}
                />
              </Suspense>
            ) : activeModule === "gen8denmap" ? (
              <Suspense fallback={null}>
                <Gen8DenMapPanel />
              </Suspense>
            ) : activeModule === "gen8profiles" ? (
              <Gen8ProfilesPanel controller={gen8Profiles} />
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
        </WorkspaceCache>
      </div>
      <div className="floating-tools">
        <Gen3PaintingPanel
          expanded={activeFloatingTool === "gen3Painting"}
          onApplyToStatic={applyPaintingSeedToStatic}
          onExpandedChange={(expanded) => {
            setGen3PaintingExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setGen3WorkflowExpanded(false);
              closeProfilePanels();
            }
          }}
        />
        <Gen3WorkflowTipsPanel
          expanded={activeFloatingTool === "gen3Workflow"}
          onExpandedChange={(expanded) => {
            setGen3WorkflowExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setGen3PaintingExpanded(false);
              closeProfilePanels();
            }
          }}
          onOpenId={() => {
            setActiveModule("id");
            setIdOperation("generator");
            closeFloatingTools();
          }}
          onOpenInitialSeed={() => {
            setGen3SeedToolsTab("initialseed");
            setActiveModule("gen3seedtools");
            closeFloatingTools();
          }}
          onOpenSeedToTime={() => {
            setGen3SeedToolsTab("seedtotime");
            setActiveModule("gen3seedtools");
            closeFloatingTools();
          }}
          onOpenPainting={() => openGen3Painting()}
        />
        <IvToolsPanel
          expanded={activeFloatingTool === "ivTools"}
          onExpandedChange={(expanded) => {
            setIvToolsExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setIvCalculatorExpanded(false);
              setEncounterLookupExpanded(false);
              setContributionsExpanded(false);
              setSponsorshipExpanded(false);
              setResearcherExpanded(false);
              setKeyBvExpanded(false);
              setMiscRngExpanded(false);
              setTsvListExpanded(false);
              closeProfilePanels();
            }
          }}
        />
        <SponsorshipPanel
          expanded={activeFloatingTool === "sponsorship"}
          onExpandedChange={(expanded) => {
            setSponsorshipExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setIvCalculatorExpanded(false);
              setEncounterLookupExpanded(false);
              setContributionsExpanded(false);
              closeProfilePanels();
            }
          }}
        />
        <ContributionsPanel
          expanded={activeFloatingTool === "contributions"}
          onExpandedChange={(expanded) => {
            setContributionsExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setIvCalculatorExpanded(false);
              setEncounterLookupExpanded(false);
              setSponsorshipExpanded(false);
              closeProfilePanels();
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
              setSponsorshipExpanded(false);
              closeProfilePanels();
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
              setSponsorshipExpanded(false);
              closeProfilePanels();
            }
          }}
        />
        <Gen4SwarmPanel
          expanded={activeFloatingTool === "gen4Swarm"}
          onExpandedChange={(expanded) => {
            setGen4SwarmExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setIvCalculatorExpanded(false);
              setEncounterLookupExpanded(false);
              setContributionsExpanded(false);
              setSponsorshipExpanded(false);
              setResearcherExpanded(false);
              setKeyBvExpanded(false);
              setMiscRngExpanded(false);
              setTsvListExpanded(false);
              setIvToolsExpanded(false);
              closeProfilePanels();
            }
          }}
        />
        <FloatingToolPanel
          className="researcher-float-panel"
          closeLabel={t("collapse")}
          expanded={activeFloatingTool === "researcher"}
          id="researcher-floating-panel"
          label={t("researcherModule")}
          onExpandedChange={(expanded) => {
            setResearcherExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setIvCalculatorExpanded(false);
              setEncounterLookupExpanded(false);
              setContributionsExpanded(false);
              setSponsorshipExpanded(false);
              setUnifiedProfileExpanded(false);
              closeProfilePanels();
            }
          }}
          subtitle={t("researcherEngine")}
          tone="teal"
          triggerId="researcher-trigger"
        >
          <ResearcherPanel uiPreviewMode={uiPreviewMode} />
        </FloatingToolPanel>
        <KeyBvPanel
          expanded={activeFloatingTool === "keybv"}
          onExpandedChange={(expanded) => {
            setKeyBvExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setIvCalculatorExpanded(false);
              setEncounterLookupExpanded(false);
              setContributionsExpanded(false);
              setSponsorshipExpanded(false);
              setResearcherExpanded(false);
              closeProfilePanels();
            }
          }}
        />
        <MiscRngPanel
          expanded={activeFloatingTool === "miscRng"}
          onExpandedChange={(expanded) => {
            setMiscRngExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setIvCalculatorExpanded(false);
              setEncounterLookupExpanded(false);
              setContributionsExpanded(false);
              setSponsorshipExpanded(false);
              setResearcherExpanded(false);
              setKeyBvExpanded(false);
              closeProfilePanels();
            }
          }}
        />
        <TsvListPanel
          expanded={activeFloatingTool === "tsvList"}
          onExpandedChange={(expanded) => {
            setTsvListExpanded(expanded);
            if (expanded) {
              setModuleRailOpen(false);
              setIvCalculatorExpanded(false);
              setEncounterLookupExpanded(false);
              setContributionsExpanded(false);
              setSponsorshipExpanded(false);
              setUnifiedProfileExpanded(false);
              setResearcherExpanded(false);
              setKeyBvExpanded(false);
              setMiscRngExpanded(false);
              closeProfilePanels();
            }
          }}
        />
        <FloatingToolPanel
          className="unified-profile-float-panel"
          closeLabel={t("collapse")}
          expanded={activeFloatingTool === "profile"}
          id="unified-profile-panel"
          label={profileLabel}
          onExpandedChange={changeUnifiedProfileExpanded}
          tone="brand"
          triggerId="unified-profile-trigger"
        >
          <UnifiedProfilePanel
            gen3={profiles}
            gen4={gen4Profiles}
            gen8={gen8Profiles}
            threeDs={threeDsProfiles}
            uiPreviewMode={uiPreviewMode}
          />
        </FloatingToolPanel>
        <div
          aria-label={t("tools")}
          className={`floating-tool-rail${floatingToolsExpanded ? " expanded" : ""}`}
          onMouseEnter={() => {
            if (toolRailUsesHover()) setFloatingToolsExpanded(true);
          }}
          onMouseLeave={() => {
            if (toolRailUsesHover()) setFloatingToolsExpanded(false);
          }}
        >
          <nav
            aria-label={t("tools")}
            className="floating-tool-actions"
            id="floating-tool-actions"
          >
            <button
              aria-controls="gen3-workflow-tips-panel"
              aria-expanded={activeFloatingTool === "gen3Workflow"}
              aria-haspopup="dialog"
              aria-label="Tips"
              className={
                activeFloatingTool === "gen3Workflow" ? "active" : undefined
              }
              data-tone="brand"
              id="gen3-workflow-tips-trigger"
              onClick={() => {
                if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                toggleFloatingTool("gen3Workflow");
              }}
              title="Tips"
              type="button"
            >
              <BookOpen aria-hidden="true" size={19} />
            </button>
            <button
              aria-controls="gen3-painting-panel"
              aria-expanded={activeFloatingTool === "gen3Painting"}
              aria-haspopup="dialog"
              aria-label="Target Painting Timer"
              className={
                activeFloatingTool === "gen3Painting" ? "active" : undefined
              }
              data-tone="teal"
              id="gen3-painting-trigger"
              onClick={() => {
                if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                toggleFloatingTool("gen3Painting");
              }}
              title="Target Painting Timer"
              type="button"
            >
              <Paintbrush aria-hidden="true" size={19} />
            </button>
            <button
              aria-controls="gen4-swarm-panel"
              aria-expanded={activeFloatingTool === "gen4Swarm"}
              aria-haspopup="dialog"
              aria-label={t("gen4SwarmModule")}
              className={
                activeFloatingTool === "gen4Swarm" ? "active" : undefined
              }
              data-tone="amber"
              id="gen4-swarm-trigger"
              onClick={() => {
                if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                toggleFloatingTool("gen4Swarm");
              }}
              title={t("gen4SwarmModule")}
              type="button"
            >
              <RadioTower aria-hidden="true" size={19} />
            </button>
            <button
              aria-controls="iv-tools-panel"
              aria-expanded={activeFloatingTool === "ivTools"}
              aria-haspopup="dialog"
              aria-label={t("ivToolsModule")}
              className={
                activeFloatingTool === "ivTools" ? "active" : undefined
              }
              data-tone="teal"
              id="iv-tools-trigger"
              onClick={() => {
                if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                toggleFloatingTool("ivTools");
              }}
              title={t("ivToolsModule")}
              type="button"
            >
              <SlidersHorizontal aria-hidden="true" size={19} />
            </button>
            <button
              aria-controls="iv-calculator-panel"
              aria-expanded={activeFloatingTool === "iv"}
              aria-haspopup="dialog"
              aria-label={t("ivCalculator")}
              className={activeFloatingTool === "iv" ? "active" : undefined}
              data-tone="teal"
              id="iv-calculator-trigger"
              onClick={() => {
                if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                toggleFloatingTool("iv");
              }}
              title={t("ivCalculator")}
              type="button"
            >
              <Calculator aria-hidden="true" size={19} />
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
              onClick={() => {
                if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                toggleFloatingTool("encounter");
              }}
              title={t("encounterLookupModule")}
              type="button"
            >
              <Search aria-hidden="true" size={19} />
            </button>
            {profileTools && (
              <button
                aria-controls="unified-profile-panel"
                aria-expanded={activeFloatingTool === "profile"}
                aria-haspopup="dialog"
                aria-label={profileLabel}
                className={
                  activeFloatingTool === "profile" ? "active" : undefined
                }
                data-tone="brand"
                id="unified-profile-trigger"
                onClick={() => {
                  if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                  toggleFloatingTool("profile");
                }}
                title={profileLabel}
                type="button"
              >
                <UserRound aria-hidden="true" size={19} />
              </button>
            )}
            <button
              aria-controls="researcher-floating-panel"
              aria-expanded={activeFloatingTool === "researcher"}
              aria-haspopup="dialog"
              aria-label={t("researcherModule")}
              className={
                activeFloatingTool === "researcher" ? "active" : undefined
              }
              data-tone="teal"
              id="researcher-trigger"
              onClick={() => {
                if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                toggleFloatingTool("researcher");
              }}
              title={t("researcherModule")}
              type="button"
            >
              <FlaskConical aria-hidden="true" size={19} />
            </button>
            <button
              aria-controls="keybv-panel"
              aria-expanded={activeFloatingTool === "keybv"}
              aria-haspopup="dialog"
              aria-label={t("keyBvModule")}
              className={activeFloatingTool === "keybv" ? "active" : undefined}
              data-tone="amber"
              id="keybv-trigger"
              onClick={() => {
                if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                toggleFloatingTool("keybv");
              }}
              title={t("keyBvModule")}
              type="button"
            >
              <KeyRound aria-hidden="true" size={19} />
            </button>
            <button
              aria-controls="misc-rng-panel"
              aria-expanded={activeFloatingTool === "miscRng"}
              aria-haspopup="dialog"
              aria-label={t("miscRngModule")}
              className={
                activeFloatingTool === "miscRng" ? "active" : undefined
              }
              data-tone="teal"
              id="misc-rng-trigger"
              onClick={() => {
                if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                toggleFloatingTool("miscRng");
              }}
              title={t("miscRngModule")}
              type="button"
            >
              <Dices aria-hidden="true" size={19} />
            </button>
            <button
              aria-controls="tsv-list-panel"
              aria-expanded={activeFloatingTool === "tsvList"}
              aria-haspopup="dialog"
              aria-label={t("tsvListModule")}
              className={
                activeFloatingTool === "tsvList" ? "active" : undefined
              }
              data-tone="teal"
              id="tsv-list-trigger"
              onClick={() => {
                if (!toolRailUsesHover()) setFloatingToolsExpanded(true);
                toggleFloatingTool("tsvList");
              }}
              title={t("tsvListModule")}
              type="button"
            >
              <ListChecks aria-hidden="true" size={19} />
            </button>
          </nav>
          <button
            aria-controls="floating-tool-actions"
            aria-expanded={floatingToolsExpanded}
            aria-label={t("tools")}
            className="floating-tool-toggle"
            onClick={(event) => {
              if (toolRailUsesHover() && event.detail > 0) return;
              if (floatingToolsExpanded) event.currentTarget.blur();
              setFloatingToolsExpanded((current) => !current);
            }}
            title={t("tools")}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" size={19} />
          </button>
        </div>
      </div>
      <footer className="legal-footer">
        <button
          aria-controls="sponsorship-panel"
          aria-expanded={activeFloatingTool === "sponsorship"}
          aria-haspopup="dialog"
          className="legal-footer-action"
          id="sponsorship-trigger"
          onClick={() => toggleFloatingTool("sponsorship")}
          type="button"
        >
          {t("sponsorship")}
        </button>
        <button
          aria-controls="contributions-panel"
          aria-expanded={activeFloatingTool === "contributions"}
          aria-haspopup="dialog"
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
