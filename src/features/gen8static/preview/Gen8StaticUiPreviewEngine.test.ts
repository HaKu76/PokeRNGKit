import { describe, expect, it } from "vitest";
import { GEN8_STATIC_CATEGORIES } from "../data";
import type { Gen8StaticRequest } from "../domain";
import { Gen8StaticUiPreviewEngine } from "./Gen8StaticUiPreviewEngine";

const value: Gen8StaticRequest = {
  profile: { version: "brilliantdiamond", tid: 12345, sid: 54321 },
  seed0: "1234567887654321",
  seed1: "8765432112345678",
  initialAdvances: 0,
  maxAdvances: 10,
  offset: 0,
  lead: 255,
  template: GEN8_STATIC_CATEGORIES[0].templates[0],
  filters: {
    disabled: true,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    heightMin: 0,
    heightMax: 255,
    weightMin: 0,
    weightMax: 255,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
  resultLimit: 100,
};

describe("Gen 8 Static preview", () => {
  it("returns a validated layout result", async () => {
    const engine = new Gen8StaticUiPreviewEngine();
    const results: unknown[] = [];
    const summary = await engine.search(value, {
      onBatch: (batch) => results.push(...batch),
    });
    expect(summary.resultCount).toBe(1);
    expect(results).toHaveLength(1);
  });

  it("honors a pre-aborted signal", async () => {
    const engine = new Gen8StaticUiPreviewEngine();
    const controller = new AbortController();
    controller.abort();
    const summary = await engine.search(value, { signal: controller.signal });
    expect(summary.cancelled).toBe(true);
  });
});
