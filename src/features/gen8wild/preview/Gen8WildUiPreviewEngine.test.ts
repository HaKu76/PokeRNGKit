import { describe, expect, it } from "vitest";
import type { Gen8WildRequest } from "../domain";
import { Gen8WildUiPreviewEngine } from "./Gen8WildUiPreviewEngine";

const value: Gen8WildRequest = {
  profile: {
    version: "brilliantdiamond",
    tid: 12345,
    sid: 54321,
    nationalDex: false,
  },
  seed0: "1234567887654321",
  seed1: "8765432112345678",
  initialAdvances: 0,
  maxAdvances: 10,
  offset: 0,
  encounter: "grass",
  location: 170,
  time: 0,
  radar: false,
  swarm: false,
  replacement: [0, 0],
  feebasTile: false,
  lead: 255,
  honeyIndex: 0,
  filters: {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    slotMask: 0xfff,
    levelMin: 1,
    levelMax: 100,
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

describe("Gen 8 Wild preview", () => {
  it("returns a representative row", async () => {
    const engine = new Gen8WildUiPreviewEngine();
    const results: unknown[] = [];
    const summary = await engine.search(value, {
      onBatch: (batch) => results.push(...batch),
    });
    expect(summary.resultCount).toBe(1);
    expect(results).toHaveLength(1);
  });

  it("rejects an unavailable area", async () => {
    const engine = new Gen8WildUiPreviewEngine();
    await expect(
      engine.search({ ...value, encounter: "rockSmash", location: 170 }),
    ).rejects.toThrow();
  });

  it("honors a pre-aborted signal", async () => {
    const engine = new Gen8WildUiPreviewEngine();
    const controller = new AbortController();
    controller.abort();
    const summary = await engine.search(value, { signal: controller.signal });
    expect(summary.cancelled).toBe(true);
  });
});
