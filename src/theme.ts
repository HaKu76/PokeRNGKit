import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

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

export function readTheme(): Theme {
  if (typeof localStorage === "undefined") return systemTheme();
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : systemTheme();
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function initializeTheme() {
  applyTheme(readTheme());
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => applyTheme(theme), [theme]);

  const changeTheme = (nextTheme: Theme, origin?: ThemeTransitionOrigin) => {
    const commitTheme = () => {
      applyTheme(nextTheme);
      setTheme(nextTheme);
    };

    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
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
    root.dataset.themeTransition = nextTheme;

    const transition = viewTransitionDocument.startViewTransition(commitTheme);
    void transition.finished.finally(() => {
      delete root.dataset.themeTransition;
    });
  };

  return { theme, changeTheme };
}
