import { describe, expect, it } from "vitest";
import type { Gen5DreamRadarGeneratorRequest } from "../domain";
import { Gen5DreamRadarUiPreviewEngine } from "./Gen5DreamRadarUiPreviewEngine";

const request: Gen5DreamRadarGeneratorRequest = {
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
  maxAdvances: 9,
  badges: 0,
  slots: [{ encounter: 1, gender: 2 }],
  filters: {
    disabled: false,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    natureMask: 1 << 1,
    hiddenPowerMask: 1 << 7,
  },
  resultLimit: 100_000,
};

describe("Gen5DreamRadarUiPreviewEngine", () => {
  it("returns a deterministic row that obeys the active filters", async () => {
    const rows: unknown[] = [];
    const engine = new Gen5DreamRadarUiPreviewEngine();
    const summary = await engine.search(request, {
      onBatch: (results) => rows.push(...results),
    });
    expect(summary).toMatchObject({
      resultCount: 1,
      percent: 100,
      cancelled: false,
    });
    expect(rows[0]).toMatchObject({
      seed: "0000000000000000",
      abilityIndex: 148,
      nature: 1,
      hiddenPower: 7,
      gender: 2,
    });
  });
});
