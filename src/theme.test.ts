import { afterEach, describe, expect, it, vi } from "vitest";
import { readTheme, readThemePreference } from "./theme";

describe("theme preference", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the persisted light or dark preference", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "dark",
    });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(readTheme()).toBe("dark");
  });

  it("falls back to the operating system preference", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
    });
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(readTheme()).toBe("dark");
  });

  it("preserves the system preference and resolves it at read time", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "system",
    });
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(readThemePreference()).toBe("system");
    expect(readTheme()).toBe("dark");
  });
});
