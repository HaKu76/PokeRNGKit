import { describe, expect, it } from "vitest";
import type { Id3Request } from "../domain";
import { Gen3IdUiPreviewEngine } from "./Gen3IdUiPreviewEngine";
import { Gen3IdSearcherUiPreviewEngine } from "./Gen3IdSearcherUiPreviewEngine";

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

describe("Gen3IdSearcherUiPreviewEngine", () => {
  it("returns the documented Ruby/Sapphire fixture", async () => {
    const engine = new Gen3IdSearcherUiPreviewEngine(0);
    const states: number[] = [];
    const summary = await engine.search(
      { mode: "sid", tid: 48163, input: 64377 },
      { onBatch: (batch) => states.push(...batch.map((state) => state.seed)) },
    );
    expect(states).toEqual([0x05a0, 0xc19b]);
    expect(summary.resultCount).toBe(2);
  });

  it("returns an empty result for an unmatched combination", async () => {
    const engine = new Gen3IdSearcherUiPreviewEngine(0);
    const summary = await engine.search({ mode: "sid", tid: 4, input: 0 });
    expect(summary.resultCount).toBe(0);
  });

  it("previews square and star PID candidates", async () => {
    const engine = new Gen3IdSearcherUiPreviewEngine(0);
    const shiny: number[] = [];
    const summary = await engine.search(
      { mode: "pid", tid: 48163, input: 0x0000475a },
      { onBatch: (batch) => shiny.push(...batch.map((state) => state.shiny)) },
    );
    expect(summary.resultCount).toBe(7);
    expect(shiny).toContain(1);
    expect(shiny).toContain(2);
  });
});
