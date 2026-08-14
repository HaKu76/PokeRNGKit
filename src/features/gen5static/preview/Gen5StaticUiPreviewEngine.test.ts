import { describe, expect, it } from "vitest";
import type { Gen5StaticGeneratorRequest } from "../domain";
import { gen5StaticTemplatesForVersion } from "../encounters";
import { Gen5StaticUiPreviewEngine } from "./Gen5StaticUiPreviewEngine";

const request: Gen5StaticGeneratorRequest = {
  mode: "generator",
  profile: {
    version: "black2",
    language: "english",
    dsType: "ds",
    tid: 12345,
    sid: 54321,
    mac: "001122334455",
    vcount: 0x82,
    timer0Min: 0x1100,
    timer0Max: 0x1100,
    gxstat: 6,
    vframe: 8,
    keypresses: [true, false, false, false, false, false, false, false, false],
    skipLR: false,
    memoryLink: false,
    shinyCharm: true,
  },
  template: gen5StaticTemplatesForVersion("starters", "black2")[0],
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 3,
  offset: 0,
  initialIvAdvances: 0,
  maxIvAdvances: 0,
  lead: { type: "none" },
  luckyPower: "none",
  filters: {
    disabled: false,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    natureMask: 1 << 7,
    hiddenPowerMask: 1 << 10,
    ability: 1,
    gender: 1,
    shiny: 1,
  },
  resultLimit: 100_000,
  cache: null,
};

describe("Gen5StaticUiPreviewEngine", () => {
  it("returns deterministic rows that obey all active filters", async () => {
    const rows: unknown[] = [];
    const engine = new Gen5StaticUiPreviewEngine();
    const summary = await engine.search(request, {
      onBatch: (results) => rows.push(...results),
    });
    expect(summary).toMatchObject({
      resultCount: 4,
      percent: 100,
      cancelled: false,
    });
    expect(rows[0]).toMatchObject({
      seed: "0000000000000000",
      nature: 7,
      hiddenPower: 10,
      ability: 1,
      gender: 1,
      shiny: 1,
    });
  });

  it("ignores configured filters when filtering is disabled", async () => {
    const rows: unknown[] = [];
    const engine = new Gen5StaticUiPreviewEngine();
    const summary = await engine.search(
      {
        ...request,
        filters: { ...request.filters, disabled: true },
      },
      { onBatch: (results) => rows.push(...results) },
    );
    expect(summary.resultCount).toBe(4);
    expect(rows[0]).toMatchObject({
      nature: 0,
      ivs: [31, 30, 29, 28, 27, 26],
      ability: 0,
      gender: 0,
      shiny: 0,
    });
  });
});
