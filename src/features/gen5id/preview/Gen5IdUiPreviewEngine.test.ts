import { describe, expect, it, vi } from "vitest";
import type { Gen5IdSeedFinderRequest } from "../domain";
import { Gen5IdUiPreviewEngine } from "./Gen5IdUiPreviewEngine";

const request: Gen5IdSeedFinderRequest = {
  mode: "seedFinder",
  profile: {
    version: "black2",
    language: "english",
    dsType: "ds",
    mac: "09BFC097CE56",
    vcount: 0x48,
    timer0Min: 0x972,
    timer0Max: 0x972,
    gxstat: 6,
    vframe: 5,
    keypresses: [true, false, false, false, false, false, false, false, false],
    skipLR: false,
  },
  date: "2000-01-01",
  hour: 12,
  minute: 34,
  minSecond: 20,
  maxSecond: 30,
  tid: 12345,
  maxAdvances: 100,
  resultLimit: 100,
};

describe("Gen5IdUiPreviewEngine", () => {
  it("returns deterministic layout-only rows through the production contract", async () => {
    const engine = new Gen5IdUiPreviewEngine();
    const onBatch = vi.fn();
    const onProgress = vi.fn();
    const summary = await engine.search(request, { onBatch, onProgress });
    const results = onBatch.mock.calls[0][0];
    expect(results).toHaveLength(11);
    expect(results[0]).toMatchObject({
      initialAdvances: 34,
      tid: 12345,
      dateTime: "2000-01-01 12:34:20",
      timer0: 0x972,
    });
    expect(summary).toMatchObject({
      processedSeeds: 11,
      totalSeeds: 11,
      resultCount: 11,
      cancelled: false,
      resultLimitReached: false,
    });
    expect(onProgress).toHaveBeenCalledOnce();
  });

  it("honors an already-aborted request", async () => {
    const engine = new Gen5IdUiPreviewEngine();
    const controller = new AbortController();
    controller.abort();
    const summary = await engine.search(request, { signal: controller.signal });
    expect(summary.cancelled).toBe(true);
    expect(summary.resultCount).toBe(0);
  });
});
