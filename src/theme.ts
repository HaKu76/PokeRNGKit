import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

type ThemeTransitionOrigin = {
  x: number;
  y: number;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<void>;
  };
};

const THEME_STORAGE_KEY = "pokerngkit-theme";

function systemTheme(): Theme {
  return typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function readThemePreference(): ThemePreference {
  if (typeof localStorage === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function resolveTheme(preference: ThemePreference): Theme {
  return preference === "system" ? systemTheme() : preference;
}

export function readTheme(): Theme {
  return resolveTheme(readThemePreference());
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function initializeTheme() {
  applyTheme(resolveTheme(readThemePreference()));
}

export function useTheme() {
  const [preference, setPreference] =
    useState<ThemePreference>(readThemePreference);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(preference));

  useEffect(() => {
    const applyPreference = () => {
      const resolved = resolveTheme(preference);
      applyTheme(resolved);
      setTheme(resolved);
    };
    applyPreference();
    if (preference !== "system" || typeof matchMedia === "undefined") {
      return;
    }
    const mediaQuery = matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyPreference();
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, [preference]);

  const changeTheme = (
    nextPreference: ThemePreference,
    origin?: ThemeTransitionOrigin,
  ) => {
    const commitTheme = () => {
      const resolved = resolveTheme(nextPreference);
      applyTheme(resolved);
      setPreference(nextPreference);
      setTheme(resolved);
    };

    localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const viewTransitionDocument = document as ViewTransitionDocument;

    if (
      !origin ||
      reduceMotion ||
      !viewTransitionDocument.startViewTransition
    ) {
      commitTheme();
      return;
    }

    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y),
    );
    const root = document.documentElement;
    root.style.setProperty("--theme-transition-x", `${origin.x}px`);
    root.style.setProperty("--theme-transition-y", `${origin.y}px`);
    root.style.setProperty("--theme-transition-radius", `${radius}px`);
    root.dataset.themeTransition = resolveTheme(nextPreference);

    const transition = viewTransitionDocument.startViewTransition(commitTheme);
    void transition.finished.finally(() => {
      delete root.dataset.themeTransition;
    });
  };

  return { preference, theme, changeTheme };
}
