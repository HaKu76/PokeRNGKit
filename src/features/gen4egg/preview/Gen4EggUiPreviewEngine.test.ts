import { describe, expect, it } from "vitest";
import type {
  Gen4EggGeneratorRequest,
  Gen4EggIvTuple,
  Gen4EggSearcherRequest,
} from "../domain";
import { Gen4EggSearcherUiPreviewEngine } from "./Gen4EggSearcherUiPreviewEngine";
import { Gen4EggUiPreviewEngine } from "./Gen4EggUiPreviewEngine";

const common = {
  game: "dppt" as const,
  species: 1,
  genderRatio: 31,
  alternateGenderRatio: 31,
  tid: 12345,
  sid: 54321,
  masuda: false,
  parentA: {
    gender: "male" as const,
    ivs: [31, 31, 31, 31, 31, 31] as Gen4EggIvTuple,
  },
  parentB: {
    gender: "female" as const,
    ivs: [0, 0, 0, 0, 0, 0] as Gen4EggIvTuple,
  },
  filters: {
    shiny: "any" as const,
    gender: "any" as const,
    ability: "any" as const,
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0] as Gen4EggIvTuple,
    ivMax: [31, 31, 31, 31, 31, 31] as Gen4EggIvTuple,
  },
};

describe("Gen4EggUiPreviewEngine", () => {
  it("streams deterministic generator preview batches", async () => {
    const request: Gen4EggGeneratorRequest = {
      ...common,
      seedHeld: 0,
      seedPickup: 0,
      initialAdvancesHeld: 0,
      maxAdvancesHeld: 9,
      offsetHeld: 0,
      initialAdvancesPickup: 0,
      maxAdvancesPickup: 9,
      offsetPickup: 0,
    };
    const states: unknown[] = [];
    const summary = await new Gen4EggUiPreviewEngine(0).search(request, {
      onBatch: (batch) => states.push(...batch),
    });
    expect(summary.cancelled).toBe(false);
    expect(summary.processedStates).toBe(100);
    expect(states.length).toBeGreaterThan(0);
  });

  it("supports cancelling a Searcher preview", async () => {
    const request: Gen4EggSearcherRequest = {
      ...common,
      initialAdvancesHeld: 0,
      maxAdvancesHeld: 30,
      initialAdvancesPickup: 0,
      maxAdvancesPickup: 100,
      minDelay: 600,
      maxDelay: 700,
    };
    const engine = new Gen4EggSearcherUiPreviewEngine(1);
    const result = engine.search(request, {
      onProgress: () => engine.cancel(),
    });
    expect((await result).cancelled).toBe(true);
  });
});
