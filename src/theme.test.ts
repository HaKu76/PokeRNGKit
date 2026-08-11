import { afterEach, describe, expect, it, vi } from "vitest";
import { readTheme } from "./theme";

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
});
