import { describe, expect, it } from "vitest";
import type {
  Gen5EventGeneratorRequest,
  Gen5EventSearcherRequest,
} from "../domain";
import { Gen5EventUiPreviewEngine } from "./Gen5EventUiPreviewEngine";

const generator: Gen5EventGeneratorRequest = {
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
  },
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 3,
  offset: 0,
  event: {
    tid: 3013,
    sid: 0,
    species: 648,
    nature: 255,
    gender: 2,
    ability: 3,
    shiny: 0,
    level: 50,
    egg: false,
    ivs: [31, null, null, null, null, null],
  },
  filters: {
    disabled: false,
    ability: 1,
    gender: 1,
    shiny: 2,
    natureMask: 1 << 7,
    hiddenPowerMask: 0xffff,
    perfectIvValue: 31,
    perfectIvCount: 0,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
  resultLimit: 100_000,
};

describe("Gen5EventUiPreviewEngine", () => {
  it("returns deterministic rows that obey event settings and filters", async () => {
    const rows: unknown[] = [];
    const engine = new Gen5EventUiPreviewEngine();
    const summary = await engine.search(generator, {
      onBatch: (batch) => rows.push(...batch),
    });
    expect(summary).toMatchObject({ resultCount: 4, percent: 100 });
    expect(rows[0]).toMatchObject({
      seed: "0000000000000000",
      nature: 7,
      ability: 1,
      gender: 1,
      shiny: 2,
      level: 50,
    });
  });

  it("selects an allowed Searcher keypress", async () => {
    const request: Gen5EventSearcherRequest = {
      ...generator,
      mode: "searcher",
      startDate: "2026-08-14",
      endDate: "2026-08-14",
      maxAdvances: 0,
      profile: {
        ...generator.profile,
        keypresses: [
          false,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ],
      },
    };
    const rows: { buttonMask?: number }[] = [];
    const engine = new Gen5EventUiPreviewEngine();
    await engine.search(request, {
      onBatch: (batch) => rows.push(...batch),
    });
    expect(rows[0]?.buttonMask).toBe(1);
  });
});
