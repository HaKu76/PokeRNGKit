import { describe, expect, it } from "vitest";
import { getGen8UndergroundSpecies } from "../data";
import type { Gen8UndergroundRequest } from "../domain";
import { Gen8UndergroundUiPreviewEngine } from "./Gen8UndergroundUiPreviewEngine";

const value: Gen8UndergroundRequest = {
  profile: { version: "brilliantdiamond", tid: 12345, sid: 54321 },
  seed0: "1234567887654321",
  seed1: "8765432112345678",
  initialAdvances: 0,
  maxAdvances: 10,
  offset: 0,
  lead: 255,
  diglett: false,
  storyFlag: 1,
  levelFlag: 0,
  location: 2,
  filters: {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    heightMin: 0,
    heightMax: 255,
    weightMin: 0,
    weightMax: 255,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
    species: getGen8UndergroundSpecies("brilliantdiamond", 2, 1),
  },
  resultLimit: 100,
};

describe("Gen 8 Underground preview", () => {
  it("returns layout results for the selected species", async () => {
    const engine = new Gen8UndergroundUiPreviewEngine();
    const results: unknown[] = [];
    const summary = await engine.search(value, {
      onBatch: (batch) => results.push(...batch),
    });
    expect(summary.resultCount).toBe(11);
    expect(results).toHaveLength(11);
  });

  it("returns no rows when the species selection is empty", async () => {
    const engine = new Gen8UndergroundUiPreviewEngine();
    const summary = await engine.search({
      ...value,
      filters: { ...value.filters, species: [] },
    });
    expect(summary.resultCount).toBe(0);
  });

  it("honors a pre-aborted signal", async () => {
    const engine = new Gen8UndergroundUiPreviewEngine();
    const controller = new AbortController();
    controller.abort();
    const summary = await engine.search(value, { signal: controller.signal });
    expect(summary.cancelled).toBe(true);
  });
});
