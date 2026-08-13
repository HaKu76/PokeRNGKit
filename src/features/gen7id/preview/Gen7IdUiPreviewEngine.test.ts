import { describe, expect, it } from "vitest";
import type { Gen7IdRequest } from "../domain";
import { Gen7IdUiPreviewEngine } from "./Gen7IdUiPreviewEngine";

const request: Gen7IdRequest = {
  version: "sun",
  seed: 0,
  minAdvances: 1012,
  maxAdvances: 1111,
  correction: 0,
  filters: { mode: "none" },
};

describe("Gen7IdUiPreviewEngine", () => {
  it("generates a deterministic UI sample without Wasm", async () => {
    const engine = new Gen7IdUiPreviewEngine();
    const advances: number[] = [];
    const summary = await engine.search(request, {
      onBatch: (batch) =>
        advances.push(...batch.map((state) => state.advances)),
    });
    expect(advances).toHaveLength(100);
    expect(advances[0]).toBe(1012);
    expect(advances.at(-1)).toBe(1111);
    expect(summary).toMatchObject({
      processedStates: 100,
      totalStates: 100,
      resultCount: 100,
      percent: 100,
      workerCount: 1,
      cancelled: false,
    });
  });

  it("caps preview work on the React main thread", async () => {
    const engine = new Gen7IdUiPreviewEngine();
    const summary = await engine.search({
      ...request,
      maxAdvances: 1_000_000,
    });
    expect(summary.processedStates).toBe(5000);
    expect(summary.totalStates).toBe(5000);
  });

  it("respects an already aborted preview request", async () => {
    const engine = new Gen7IdUiPreviewEngine();
    const controller = new AbortController();
    controller.abort();
    const summary = await engine.search(request, {
      signal: controller.signal,
    });
    expect(summary.cancelled).toBe(true);
    expect(summary.processedStates).toBe(0);
    expect(summary.percent).toBe(0);
  });
});
