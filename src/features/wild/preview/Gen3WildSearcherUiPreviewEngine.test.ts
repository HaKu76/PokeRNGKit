import { describe, expect, it } from "vitest";
import type { Gen3WildSearcherRequest } from "../domain";
import { Gen3WildSearcherUiPreviewEngine } from "./Gen3WildSearcherUiPreviewEngine";

const request: Gen3WildSearcherRequest = {
  method: "method1",
  lead: "none",
  feebasTile: false,
  bike: false,
  item: "none",
  version: "emerald",
  tid: 12345,
  sid: 54321,
  area: {
    name: "Route 111",
    encounter: "land",
    rate: 10,
    feebasLocation: false,
    safariZone: false,
    slots: [
      {
        species: 328,
        form: 0,
        minLevel: 20,
        maxLevel: 21,
        genderRatio: 127,
        type1: 4,
        type2: 4,
      },
    ],
  },
  filters: {
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    encounterSlotMask: 1,
    levelMin: 1,
    levelMax: 100,
    ivMin: [30, 31, 31, 31, 31, 30],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
};

describe("Gen3WildSearcherUiPreviewEngine", () => {
  it("previews the IV search space without requiring Wasm", async () => {
    const states: number[][] = [];
    const summary = await new Gen3WildSearcherUiPreviewEngine(0).search(
      request,
      { onBatch: (batch) => states.push(...batch.map((state) => state.ivs)) },
    );
    expect(states).toHaveLength(4);
    expect(states[0]).toEqual([30, 31, 31, 31, 31, 30]);
    expect(states.at(-1)).toEqual([31, 31, 31, 31, 31, 31]);
    expect(summary).toMatchObject({
      processedStates: 4,
      totalStates: 4,
      resultCount: 4,
      percent: 100,
      workerCount: 0,
      cancelled: false,
    });
  });

  it("supports cancellation", async () => {
    const engine = new Gen3WildSearcherUiPreviewEngine(0);
    const summary = await engine.search(
      {
        ...request,
        filters: {
          ...request.filters,
          ivMin: [0, 0, 0, 0, 0, 0],
          ivMax: [31, 31, 31, 31, 31, 31],
        },
      },
      {
        onProgress: ({ processedStates }) => {
          if (processedStates > 0) engine.cancel();
        },
      },
    );
    expect(summary.cancelled).toBe(true);
    expect(summary.processedStates).toBeLessThan(summary.totalStates);
  });
});
