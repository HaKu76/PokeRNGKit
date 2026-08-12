const PROFILE_PANEL_EXPANDED_KEY = "pokerngkit-gen3-profile-panel-expanded";

export function initialGen3ProfilePanelExpanded() {
  try {
    return localStorage.getItem(PROFILE_PANEL_EXPANDED_KEY) === "true";
  } catch {
    return false;
  }
}

export function persistGen3ProfilePanelExpanded(expanded: boolean) {
  try {
    localStorage.setItem(PROFILE_PANEL_EXPANDED_KEY, String(expanded));
  } catch {
    // The panel remains usable when storage is unavailable.
  }
}
