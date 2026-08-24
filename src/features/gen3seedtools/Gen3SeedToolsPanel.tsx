import { useTranslation } from "react-i18next";
import { Gen3InitialSeedPanel } from "../initialseed/Gen3InitialSeedPanel";
import { Gen3NgcSeedPanel } from "../ngcseed/Gen3NgcSeedPanel";
import { Gen3SeedToTimePanel } from "../seedtotime/Gen3SeedToTimePanel";

export type Gen3SeedToolTab = "initialseed" | "seedtotime" | "ngcseed";

interface Gen3SeedToolsPanelProps {
  activeTab: Gen3SeedToolTab;
  onTabChange(tab: Gen3SeedToolTab): void;
  uiPreviewMode: boolean;
}

const tabs: readonly Gen3SeedToolTab[] = [
  "initialseed",
  "seedtotime",
  "ngcseed",
];

export function Gen3SeedToolsPanel({
  activeTab,
  onTabChange,
  uiPreviewMode,
}: Gen3SeedToolsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="seed-tools-workspace">
      <div
        aria-label={t("seedToolsEngine")}
        className="operation-tabs seed-tools-tabs"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            aria-controls={`gen3-seed-tools-${tab}`}
            aria-selected={activeTab === tab}
            className={activeTab === tab ? "active" : ""}
            id={`gen3-seed-tools-tab-${tab}`}
            key={tab}
            onClick={() => onTabChange(tab)}
            role="tab"
            type="button"
          >
            {t(
              tab === "initialseed"
                ? "initialSeedModule"
                : tab === "seedtotime"
                  ? "seedToTimeModule"
                  : "ngcSeedModule",
            )}
          </button>
        ))}
      </div>
      <div
        aria-hidden={activeTab !== "initialseed"}
        aria-labelledby="gen3-seed-tools-tab-initialseed"
        className="seed-tools-view"
        hidden={activeTab !== "initialseed"}
        id="gen3-seed-tools-initialseed"
        role="tabpanel"
      >
        <Gen3InitialSeedPanel uiPreviewMode={uiPreviewMode} />
      </div>
      <div
        aria-hidden={activeTab !== "seedtotime"}
        aria-labelledby="gen3-seed-tools-tab-seedtotime"
        className="seed-tools-view"
        hidden={activeTab !== "seedtotime"}
        id="gen3-seed-tools-seedtotime"
        role="tabpanel"
      >
        <Gen3SeedToTimePanel uiPreviewMode={uiPreviewMode} />
      </div>
      <div
        aria-hidden={activeTab !== "ngcseed"}
        aria-labelledby="gen3-seed-tools-tab-ngcseed"
        className="seed-tools-view"
        hidden={activeTab !== "ngcseed"}
        id="gen3-seed-tools-ngcseed"
        role="tabpanel"
      >
        <Gen3NgcSeedPanel uiPreviewMode={uiPreviewMode} />
      </div>
    </div>
  );
}
