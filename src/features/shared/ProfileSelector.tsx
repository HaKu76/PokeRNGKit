import { Settings2 } from "lucide-react";
import { Select } from "./Select";
import "./ProfileSelector.css";

export interface ProfileSelectorOption {
  id: string;
  name: string;
}

interface ProfileSelectorProps {
  disabled?: boolean;
  label: string;
  managerLabel: string;
  onOpenProfileManager(): void;
  onSelect(profileId: string | null): void;
  options: readonly ProfileSelectorOption[];
  selectedProfileId: string | null;
}

export function ProfileSelector({
  disabled = false,
  label,
  managerLabel,
  onOpenProfileManager,
  onSelect,
  options,
  selectedProfileId,
}: ProfileSelectorProps) {
  return (
    <div className="page-profile-selector">
      <label>
        <span>{label}</span>
        <Select
          disabled={disabled}
          onChange={(event) => onSelect(event.target.value || null)}
          value={selectedProfileId ?? ""}
        >
          <option value="">-</option>
          {options.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </Select>
      </label>
      <button
        aria-label={managerLabel}
        disabled={disabled}
        onClick={onOpenProfileManager}
        title={managerLabel}
        type="button"
      >
        <Settings2 aria-hidden="true" size={18} />
      </button>
    </div>
  );
}
