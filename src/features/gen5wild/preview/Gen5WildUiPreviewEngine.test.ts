import { describe, expect, it, vi } from "vitest";
import type { Gen5WildGeneratorRequest } from "../domain";
import { getGen5WildAreas } from "../encounters";
import { Gen5WildUiPreviewEngine } from "./Gen5WildUiPreviewEngine";

const request: Gen5WildGeneratorRequest = {
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
    nsPokemonReleased: false,
  },
  area: getGen5WildAreas("black2", "grass", 0)[0],
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 9,
  offset: 0,
  initialIvAdvances: 0,
  maxIvAdvances: 0,
  lead: { type: "none" },
  luckyPower: "level3",
  filters: {
    disabled: false,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ability: 255,
    gender: 255,
    shiny: 255,
    slotMask: 0xfff,
    levelMin: 1,
    levelMax: 100,
  },
  resultLimit: 100,
  cache: null,
};

describe("Gen5WildUiPreviewEngine", () => {
  it("emits deterministic valid rows and honors maxResults", async () => {
    const onBatch = vi.fn();
    const engine = new Gen5WildUiPreviewEngine();
    await expect(
      engine.search(request, { maxResults: 2, onBatch }),
    ).resolves.toMatchObject({ resultCount: 2, workerCount: 1 });
    expect(onBatch).toHaveBeenCalledTimes(1);
    expect(onBatch.mock.calls[0][0]).toHaveLength(2);
    expect(onBatch.mock.calls[0][0][0]).toMatchObject({
      seed: "0000000000000000",
      slot: 0,
      species: request.area.slots[0].species,
    });
  });

  it("reports pre-aborted work without rows", async () => {
    const controller = new AbortController();
    controller.abort();
    const engine = new Gen5WildUiPreviewEngine();
    await expect(
      engine.search(request, { signal: controller.signal }),
    ).resolves.toMatchObject({ cancelled: true, resultCount: 0 });
  });
});
