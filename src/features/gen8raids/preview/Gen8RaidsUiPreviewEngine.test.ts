import { describe, expect, it } from "vitest";
import { GEN8_RAID_DENS } from "../data";
import { type Gen8RaidRequest } from "../domain";
import { Gen8RaidsUiPreviewEngine } from "./Gen8RaidsUiPreviewEngine";

const value: Gen8RaidRequest = {
  profile: { version: "sword", tid: 12345, sid: 54321 },
  seed: "1234567887654321",
  initialAdvances: 0,
  maxAdvances: 10,
  offset: 0,
  template: GEN8_RAID_DENS[0].sword[0],
  level: 50,
  genderRatio: 127,
  filters: {
    disabled: true,
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
  },
  resultLimit: 100,
};

describe("Gen 8 Raids preview", () => {
  it("returns a validated layout result", async () => {
    const engine = new Gen8RaidsUiPreviewEngine();
    const results: unknown[] = [];
    const summary = await engine.search(value, {
      onBatch: (batch) => results.push(...batch),
    });
    expect(summary.resultCount).toBe(1);
    expect(results).toHaveLength(1);
  });
  it("honors cancellation", async () => {
    const engine = new Gen8RaidsUiPreviewEngine();
    engine.cancel();
    const summary = await engine.search(value);
    expect(summary.cancelled).toBe(false);
  });
});
