import { describe, expect, it } from "vitest";
import type {
  Gen4WildGeneratorRequest,
  Gen4WildSearcherRequest,
} from "../domain";
import { Gen4WildSearcherUiPreviewEngine } from "./Gen4WildSearcherUiPreviewEngine";
import { Gen4WildUiPreviewEngine } from "./Gen4WildUiPreviewEngine";

const generatorRequest: Gen4WildGeneratorRequest = {
  seed: 0x1746b9c4,
  initialAdvances: 12,
  maxAdvances: 99,
  offset: 0,
  method: "methodJ",
  lead: "none",
  synchronizeNature: 0,
  feebasTile: false,
  pokeRadarShiny: false,
  unownRadio: false,
  happiness: 0,
  fixedSlot: 0,
  profile: {
    version: "platinum",
    tid: 12345,
    sid: 54321,
    nationalDex: true,
    unownDiscovered: Array(26).fill(false),
    unownPuzzles: Array(4).fill(false),
  },
  area: {
    id: "platinum-170-grass",
    game: "platinum",
    location: 170,
    name: "Route 222",
    encounter: "grass",
    rate: 30,
    slots: [
      {
        species: 278,
        form: 0,
        minLevel: 38,
        maxLevel: 40,
        stats: [40, 30, 30, 85, 55, 30],
        types: [11, 2],
        genderRatio: 127,
        items: [0, 0, 0],
        abilities: [51, 51, 0],
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
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
};

describe("Gen IV Wild UI preview engines", () => {
  it("generates deterministic Generator samples without Wasm", async () => {
    const advances: number[] = [];
    const summary = await new Gen4WildUiPreviewEngine(0).search(
      generatorRequest,
      {
        onBatch: (batch) =>
          advances.push(...batch.map((state) => state.advances)),
      },
    );
    expect(advances).toHaveLength(100);
    expect(advances[0]).toBe(12);
    expect(advances.at(-1)).toBe(111);
    expect(summary).toMatchObject({
      processedStates: 100,
      totalStates: 100,
      resultCount: 100,
      percent: 100,
      workerCount: 0,
      cancelled: false,
      resultLimitReached: false,
    });
  });

  it("stops Generator preview at the configured result limit", async () => {
    const results: number[] = [];
    const summary = await new Gen4WildUiPreviewEngine(0).search(
      generatorRequest,
      {
        maxResults: 3,
        onBatch: (batch) => results.push(...batch.map((state) => state.pid)),
      },
    );
    expect(results).toHaveLength(3);
    expect(summary.resultCount).toBe(3);
    expect(summary.resultLimitReached).toBe(true);
    expect(summary.processedStates).toBeLessThan(summary.totalStates);
  });

  it("enumerates Searcher IVs and keeps seed fields in valid ranges", async () => {
    const request: Gen4WildSearcherRequest = {
      ...generatorRequest,
      minAdvance: 0,
      maxAdvance: 1_000,
      minDelay: 600,
      maxDelay: 2_000,
      filters: {
        ...generatorRequest.filters,
        ivMin: [30, 31, 31, 31, 31, 30],
      },
    };
    const states: { ivs: number[]; delay: number; hour: number }[] = [];
    const summary = await new Gen4WildSearcherUiPreviewEngine(0).search(
      request,
      { onBatch: (batch) => states.push(...batch) },
    );
    expect(states).toHaveLength(4);
    expect(states[0].ivs).toEqual([30, 31, 31, 31, 31, 30]);
    expect(states.at(-1)?.ivs).toEqual([31, 31, 31, 31, 31, 31]);
    expect(
      states.every(
        (state) =>
          state.hour < 24 && state.delay >= 600 && state.delay <= 2_000,
      ),
    ).toBe(true);
    expect(summary).toMatchObject({
      processedStates: 4,
      totalStates: 4,
      resultCount: 4,
      percent: 100,
      workerCount: 0,
      cancelled: false,
    });
  });

  it("supports Searcher cancellation", async () => {
    const request: Gen4WildSearcherRequest = {
      ...generatorRequest,
      minAdvance: 0,
      maxAdvance: 1_000,
      minDelay: 600,
      maxDelay: 2_000,
    };
    const engine = new Gen4WildSearcherUiPreviewEngine(0);
    const summary = await engine.search(request, {
      onProgress: ({ processedStates }) => {
        if (processedStates > 0) engine.cancel();
      },
    });
    expect(summary.cancelled).toBe(true);
    expect(summary.processedStates).toBeLessThan(summary.totalStates);
  });
});
