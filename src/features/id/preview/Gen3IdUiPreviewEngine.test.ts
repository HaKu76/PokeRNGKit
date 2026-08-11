import { describe, expect, it } from "vitest";
import type { Id3Request } from "../domain";
import { Gen3IdUiPreviewEngine } from "./Gen3IdUiPreviewEngine";

const request: Id3Request = {
  mode: "xd-colo",
  input: 0,
  initialAdvances: 12,
  maxAdvances: 99,
  filters: {},
};

describe("Gen3IdUiPreviewEngine", () => {
  it("generates deterministic UI samples without a Wasm module", async () => {
    const engine = new Gen3IdUiPreviewEngine(0);
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
    const engine = new Gen3IdUiPreviewEngine(0);

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
