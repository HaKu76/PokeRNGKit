import { describe, expect, it } from "vitest";
import type {
  Gen4EventGeneratorRequest,
  Gen4EventSearcherRequest,
} from "../domain";
import { Gen4EventSearcherUiPreviewEngine } from "./Gen4EventSearcherUiPreviewEngine";
import { Gen4EventUiPreviewEngine } from "./Gen4EventUiPreviewEngine";

const generatorRequest: Gen4EventGeneratorRequest = {
  seed: 0x12345678,
  initialAdvances: 12,
  maxAdvances: 99,
  offset: 0,
  species: 1,
  nature: 0,
  level: 1,
  filters: {
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  },
};

describe("Gen IV Event UI preview engines", () => {
  it("generates deterministic Generator samples without Wasm", async () => {
    const states: { advances: number; ivs: number[] }[] = [];
    const summary = await new Gen4EventUiPreviewEngine(0).search(
      generatorRequest,
      { onBatch: (batch) => states.push(...batch) },
    );
    expect(states).toHaveLength(100);
    expect(states[0]).toEqual({
      advances: 12,
      ivs: [1, 27, 23, 16, 12, 20],
      hiddenPower: 1,
      hiddenPowerStrength: 33,
      call: 0,
      chatot: 98,
    });
    expect(states.at(-1)?.advances).toBe(111);
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

  it("enumerates Searcher IVs and keeps seed fields in valid ranges", async () => {
    const request: Gen4EventSearcherRequest = {
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
    const summary = await new Gen4EventSearcherUiPreviewEngine(0).search(
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
      resultLimitReached: false,
    });
  });

  it("supports Searcher cancellation", async () => {
    const request: Gen4EventSearcherRequest = {
      ...generatorRequest,
      minAdvance: 0,
      maxAdvance: 1_000,
      minDelay: 600,
      maxDelay: 2_000,
    };
    const engine = new Gen4EventSearcherUiPreviewEngine(0);
    const summary = await engine.search(request, {
      onProgress: ({ processedStates }) => {
        if (processedStates > 0) engine.cancel();
      },
    });
    expect(summary.cancelled).toBe(true);
    expect(summary.processedStates).toBeLessThan(summary.totalStates);
  });

  it("returns no preview seeds when the u32 Delay range is above 16 bits", async () => {
    const request: Gen4EventSearcherRequest = {
      ...generatorRequest,
      minAdvance: 0xffff_ffff,
      maxAdvance: 0xffff_ffff,
      minDelay: 0x1_0000,
      maxDelay: 0xffff_ffff,
      filters: {
        ...generatorRequest.filters,
        ivMin: [31, 31, 31, 31, 31, 31],
      },
    };
    const states: unknown[] = [];
    const summary = await new Gen4EventSearcherUiPreviewEngine(0).search(
      request,
      { onBatch: (batch) => states.push(...batch) },
    );
    expect(states).toEqual([]);
    expect(summary).toMatchObject({
      processedStates: 1,
      totalStates: 1,
      resultCount: 0,
      percent: 100,
      cancelled: false,
    });
  });
});
