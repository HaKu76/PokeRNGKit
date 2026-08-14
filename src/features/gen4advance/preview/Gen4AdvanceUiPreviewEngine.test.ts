import { describe, expect, it } from "vitest";
import type { Gen4AdvanceRequest } from "../domain";
import { Gen4AdvanceUiPreviewEngine } from "./Gen4AdvanceUiPreviewEngine";

const request: Gen4AdvanceRequest = {
  mode: "calls",
  rows: [
    { advances: 40, value: 0 },
    { advances: 41, value: 1 },
    { advances: 42, value: 2 },
    { advances: 43, value: 0 },
    { advances: 44, value: 1 },
    { advances: 45, value: 2 },
  ],
  tokens: [0, 1, 2],
};

describe("Gen4AdvanceUiPreviewEngine", () => {
  it("returns deterministic UI-only match rows", async () => {
    const summary = await new Gen4AdvanceUiPreviewEngine().search(request);
    expect(summary.matches).toEqual([
      { row: 0, advances: 40 },
      { row: 3, advances: 43 },
    ]);
    expect(summary.processedRows).toBe(6);
  });

  it("honors an already aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const summary = await new Gen4AdvanceUiPreviewEngine().search(request, {
      signal: controller.signal,
    });
    expect(summary.cancelled).toBe(true);
    expect(summary.processedRows).toBe(0);
  });
});
