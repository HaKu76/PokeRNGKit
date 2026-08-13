import { describe, expect, it } from "vitest";
import type { Gen4ChainedSidRequest } from "../domain";
import { Gen4ChainedSidUiPreviewEngine } from "./Gen4ChainedSidUiPreviewEngine";

const request: Gen4ChainedSidRequest = {
  tid: 12345,
  entries: [
    {
      ivs: [7, 29, 18, 14, 23, 22],
      ability: 22,
      gender: 0,
      nature: 11,
      ability0: 22,
      ability1: 22,
      genderRatio: 127,
    },
  ],
};

describe("Gen4ChainedSidUiPreviewEngine", () => {
  it("returns deterministic UI-only candidates", async () => {
    const summary = await new Gen4ChainedSidUiPreviewEngine().calculate(
      request,
    );
    expect(summary).toMatchObject({
      processedEntries: 1,
      workerCount: 1,
      cancelled: false,
    });
    expect(summary.candidates).toHaveLength(327);
  });

  it("honors an already aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const summary = await new Gen4ChainedSidUiPreviewEngine().calculate(
      request,
      { signal: controller.signal },
    );
    expect(summary.cancelled).toBe(true);
    expect(summary.processedEntries).toBe(0);
  });
});
