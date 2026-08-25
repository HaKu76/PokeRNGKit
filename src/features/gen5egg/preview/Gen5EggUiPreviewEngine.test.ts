import { describe, expect, it } from "vitest";
import type {
  Gen5EggGeneratorRequest,
  Gen5EggSearcherRequest,
} from "../domain";
import { Gen5EggUiPreviewEngine } from "./Gen5EggUiPreviewEngine";

const generator: Gen5EggGeneratorRequest = {
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
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 3,
  offset: 0,
  species: 29,
  masuda: true,
  parentA: {
    ivs: [31, 31, 31, 31, 31, 31],
    ability: 0,
    gender: "male",
    item: 0,
    nature: 0,
  },
  parentB: {
    ivs: [31, 31, 31, 31, 31, 31],
    ability: 2,
    gender: "female",
    item: 1,
    nature: 7,
  },
  filters: {
    disabled: false,
    shiny: "square",
    gender: "female",
    ability: "hidden",
    natureMask: 1 << 7,
    hiddenPowerMask: 1 << 15,
    perfectIvValue: 31,
    perfectIvCount: 0,
    ivMin: [31, 31, 31, 31, 31, 31],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
  resultLimit: 100_000,
};

describe("Gen5EggUiPreviewEngine", () => {
  it("returns a valid filtered special-species row", async () => {
    const rows: unknown[] = [];
    const engine = new Gen5EggUiPreviewEngine();
    const summary = await engine.search(generator, {
      onBatch: (batch) => rows.push(...batch),
    });
    expect(summary).toMatchObject({
      resultCount: 1,
      percent: 100,
      cancelled: false,
    });
    expect(rows[0]).toMatchObject({
      species: 32,
      nature: 7,
      ability: 2,
      gender: 1,
      shiny: 2,
      hiddenPower: 15,
    });
  });

  it("selects an allowed nonzero Searcher button mask", async () => {
    const request: Gen5EggSearcherRequest = {
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
    const engine = new Gen5EggUiPreviewEngine();
    await engine.search(request, {
      onBatch: (batch) => rows.push(...batch),
    });
    expect(rows[0]?.buttonMask).toBe(1);
  });

  it("honors an already-aborted search", async () => {
    const controller = new AbortController();
    controller.abort();
    const engine = new Gen5EggUiPreviewEngine();
    await expect(
      engine.search(generator, { signal: controller.signal }),
    ).resolves.toMatchObject({
      processedUnits: 0,
      resultCount: 0,
      cancelled: true,
    });
  });
});
