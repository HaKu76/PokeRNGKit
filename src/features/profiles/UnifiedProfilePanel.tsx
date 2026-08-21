import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Gen3ProfileManager } from "./Gen3ProfileControls";
import type { Gen3ProfilesController } from "./useGen3Profiles";
import { Gen4ProfileManager } from "../gen4profiles/Gen4ProfileControls";
import type { Gen4ProfilesController } from "../gen4profiles/useGen4Profiles";
import { ThreeDsProfilesPanel } from "../3dsprofiles/ThreeDsProfilesPanel";
import type { ThreeDsProfilesController } from "../3dsprofiles/useThreeDsProfiles";
import { Gen5ProfilesPanel } from "../gen5profiles/Gen5ProfilesPanel";
import { Gen8ProfilesPanel } from "../gen8profiles/Gen8ProfilesPanel";
import type { Gen8ProfilesController } from "../gen8profiles/useGen8Profiles";

type ProfileTab = "gen3" | "gen4" | "gen5" | "threeDs" | "gen8";

interface UnifiedProfilePanelProps {
  gen3: Gen3ProfilesController;
  gen4: Gen4ProfilesController;
  gen8: Gen8ProfilesController;
  threeDs: ThreeDsProfilesController;
  uiPreviewMode?: boolean;
}

const tabs: readonly { id: ProfileTab; label: string }[] = [
  { id: "gen3", label: "profileManager3" },
  { id: "gen4", label: "profileManager4" },
  { id: "gen5", label: "gen5ProfilesModule" },
  { id: "threeDs", label: "threeDsProfilesGen67Title" },
  { id: "gen8", label: "gen8ProfilesModule" },
];

export function UnifiedProfilePanel({
  gen3,
  gen4,
  gen8,
  threeDs,
  uiPreviewMode = false,
}: UnifiedProfilePanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ProfileTab>("gen3");

  return (
    <div className="unified-profile-panel">
      <nav
        aria-label={t("profile")}
        className="unified-profile-tabs"
        role="tablist"
      >
        {tabs.map((entry) => (
          <button
            aria-selected={tab === entry.id}
            className={tab === entry.id ? "selected" : undefined}
            key={entry.id}
            onClick={() => setTab(entry.id)}
            role="tab"
            type="button"
          >
            {t(entry.label)}
          </button>
        ))}
      </nav>
      <section
        aria-label={t(
          tabs.find((entry) => entry.id === tab)?.label ?? "profile",
        )}
        className="unified-profile-content"
        role="tabpanel"
      >
        {tab === "gen3" ? (
          <Gen3ProfileManager controller={gen3} embedded />
        ) : tab === "gen4" ? (
          <Gen4ProfileManager controller={gen4} embedded />
        ) : tab === "gen5" ? (
          <Gen5ProfilesPanel uiPreviewMode={uiPreviewMode} />
        ) : tab === "threeDs" ? (
          <ThreeDsProfilesPanel controller={threeDs} />
        ) : (
          <Gen8ProfilesPanel controller={gen8} />
        )}
      </section>
    </div>
  );
}
