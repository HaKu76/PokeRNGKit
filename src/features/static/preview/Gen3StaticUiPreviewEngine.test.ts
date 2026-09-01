import { describe, expect, it } from "vitest";
import type { Gen3StaticRequest } from "../domain";
import { GEN3_STATIC_TEMPLATES } from "../encounters";
import { Gen3StaticUiPreviewEngine } from "./Gen3StaticUiPreviewEngine";

const request: Gen3StaticRequest = {
  seed: 0x12345678,
  initialAdvances: 12,
  maxAdvances: 99,
  offset: 0,
  method: "method1",
  template: GEN3_STATIC_TEMPLATES[0],
  tid: 0,
  sid: 0,
  filters: {
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  },
};

describe("Gen3StaticUiPreviewEngine", () => {
  it("generates deterministic UI samples without a Wasm module", async () => {
    const engine = new Gen3StaticUiPreviewEngine(0);
    const advances: number[] = [];

    const summary = await engine.search(request, {
      onBatch: (batch) =>
        advances.push(...batch.map((state) => state.advances)),
    });

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

  it("supports cancellation between preview progress steps", async () => {
    const engine = new Gen3StaticUiPreviewEngine(0);

    const summary = await engine.search(
      { ...request, maxAdvances: 999 },
      {
        onProgress: ({ processedStates }) => {
          if (processedStates > 0) engine.cancel();
        },
      },
    );

    expect(summary.cancelled).toBe(true);
    expect(summary.processedStates).toBeLessThan(summary.totalStates);
  });

  it("applies the perfect IV value and count filter", async () => {
    const engine = new Gen3StaticUiPreviewEngine(0);
    const states: number[][] = [];

    await engine.search(
      {
        ...request,
        maxAdvances: 499,
        filters: {
          ...request.filters,
          perfectIvValue: 31,
          perfectIvCount: 1,
        },
      },
      { onBatch: (batch) => states.push(...batch.map((state) => state.ivs)) },
    );

    expect(states.length).toBeGreaterThan(0);
    expect(states.every((ivs) => ivs.some((iv) => iv === 31))).toBe(true);
  });
});
