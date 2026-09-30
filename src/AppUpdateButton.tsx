import { useSyncExternalStore, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { appUpdater } from "./appUpdate";
import "./AppUpdateButton.css";

export function AppUpdateButton({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const state = useSyncExternalStore(
    appUpdater.subscribe,
    appUpdater.getSnapshot,
  );
  if (state === "idle") return children;
  const label = t(
    state === "failed"
      ? "appUpdateRetry"
      : state === "applying"
        ? "appUpdateApplying"
        : "appUpdate",
  );
  return (
    <button
      type="button"
      className="app-update-button"
      title={label}
      aria-label={label}
      disabled={state === "applying"}
      onClick={() => {
        if (window.confirm(t("appUpdateConfirm"))) appUpdater.apply();
      }}
    >
      <RefreshCw size={16} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
