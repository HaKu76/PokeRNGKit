import { describe, expect, it } from "vitest";
import { GEN3_STATIC_TEMPLATES, type Gen3StaticRequest } from "../domain";
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
    nature: -1,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
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
});
