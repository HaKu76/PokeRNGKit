const PROFILE_PANEL_EXPANDED_KEY = "pokerngkit-gen4-profile-panel-expanded";

export function initialGen4ProfilePanelExpanded() {
  try {
    return localStorage.getItem(PROFILE_PANEL_EXPANDED_KEY) === "true";
  } catch {
    return false;
  }
}

export function persistGen4ProfilePanelExpanded(expanded: boolean) {
  try {
    localStorage.setItem(PROFILE_PANEL_EXPANDED_KEY, String(expanded));
  } catch {
    // The panel remains usable when storage is unavailable.
  }
}
