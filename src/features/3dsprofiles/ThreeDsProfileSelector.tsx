import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ThreeDsProfilesController } from "./useThreeDsProfiles";
import "./ThreeDsProfileSelector.css";

export function ThreeDsProfileSelector({
  controller,
  onOpenProfileManager,
}: {
  controller: ThreeDsProfilesController;
  onOpenProfileManager(): void;
}) {
  const { t } = useTranslation();
  const persist = (operation: Promise<void>) => {
    void operation.catch(() => undefined);
  };
  return (
    <div className="threedsprofile-selector">
      {controller.profiles.length > 0 && (
        <label>
          <span>{t("threeDsProfilesProfile")}</span>
          <select
            aria-busy={controller.loading || controller.busy}
            disabled={controller.loading || controller.busy}
            onChange={(event) =>
              persist(controller.selectProfile(event.target.value || null))
            }
            value={controller.selectedProfileId ?? ""}
          >
            <option value="">-</option>
            {controller.profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        aria-label={String(t("threeDsProfilesModule"))}
        onClick={onOpenProfileManager}
        title={String(t("threeDsProfilesModule"))}
        type="button"
      >
        <Settings2 aria-hidden="true" size={18} />
      </button>
    </div>
  );
}
