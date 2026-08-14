import { describe, expect, it } from "vitest";
import { GEN5_IVCACHE_TOTAL_SEEDS } from "../domain";
import { Gen5IvCacheUiPreviewEngine } from "./Gen5IvCacheUiPreviewEngine";

describe("Gen5IvCacheUiPreviewEngine", () => {
  it("returns deterministic cache buckets and complete progress", async () => {
    const progress: number[] = [];
    const engine = new Gen5IvCacheUiPreviewEngine();
    const summary = await engine.search(
      { initialAdvances: 0, maxAdvances: 5 },
      { onProgress: (state) => progress.push(state.percent) },
    );
    expect(summary.cancelled).toBe(false);
    expect(summary.processedSeeds).toBe(GEN5_IVCACHE_TOTAL_SEEDS);
    expect(summary.resultCount).toBe(3);
    expect(summary.cache.entralink.get(0)).toEqual([0x1234_5678]);
    expect(summary.cache.normal.get(0)).toEqual([0x8765_4321]);
    expect(summary.cache.roamer.get(0)).toEqual([0x0102_0304]);
    expect(progress).toEqual([100]);
  });
});
