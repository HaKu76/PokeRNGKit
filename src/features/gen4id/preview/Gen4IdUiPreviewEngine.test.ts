import { describe, expect, it } from "vitest";
import type { Gen4IdGeneratorRequest } from "../domain";
import { Gen4IdUiPreviewEngine } from "./Gen4IdUiPreviewEngine";

const request: Gen4IdGeneratorRequest = {
  operation: "generator",
  year: 2000,
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  minDelay: 5000,
  maxDelay: 5009,
  filters: { mode: "none", values: [] },
};

describe("Gen4IdUiPreviewEngine", () => {
  it("creates deterministic UI-only rows", async () => {
    const rows: number[] = [];
    const summary = await new Gen4IdUiPreviewEngine().search(request, {
      onBatch: (batch) => rows.push(...batch.map((state) => state.seed)),
    });
    expect(rows).toHaveLength(600);
    expect(summary).toMatchObject({
      processedStates: 600,
      totalStates: 600,
      resultCount: 600,
      cancelled: false,
    });
  });

  it("honors an already aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const summary = await new Gen4IdUiPreviewEngine().search(request, {
      signal: controller.signal,
    });
    expect(summary.cancelled).toBe(true);
    expect(summary.processedStates).toBe(0);
  });
});
