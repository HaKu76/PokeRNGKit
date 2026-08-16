import { describe, expect, it } from "vitest";
import { Gen7MainUiPreviewEngine } from "./Gen7MainUiPreviewEngine";

describe("Gen7MainUiPreviewEngine", () => {
  it("returns the documented SM Seed fixture", async () => {
    const results: number[] = [];
    const engine = new Gen7MainUiPreviewEngine();
    const summary = await engine.searchSeeds(
      {
        operation: "seed-search",
        version: "sun",
        mode: "initial",
        needles: [6, 10, 9, 15, 10, 0, 2, 7, 5, 8],
      },
      {
        onBatch: (batch) => results.push(...batch.map((result) => result.seed)),
      },
    );
    expect(results).toEqual([0xbd16_46f7]);
    expect(summary).toMatchObject({
      cancelled: false,
      percent: 100,
      resultCount: 1,
    });
  });

  it("returns deterministic QR and time-calculator preview states", async () => {
    const engine = new Gen7MainUiPreviewEngine();
    await expect(
      engine.searchQr({
        operation: "qr-search",
        seed: 0xbd16_46f7,
        minFrame: 417,
        maxFrame: 417,
        needles: [6, 10, 9, 15, 10, 0, 2, 7, 5, 8],
      }),
    ).resolves.toMatchObject({
      cancelled: false,
      results: [{ lastClockFrame: 426, afterQrFrame: 428 }],
    });
    await expect(
      engine.calculateTime({
        operation: "time-calculator",
        seed: 0,
        startingFrame: 418,
        targetFrame: 428,
        npc: 0,
        fidget: false,
        raining: false,
      }),
    ).resolves.toMatchObject({
      cancelled: false,
      result: { primaryFrames: 300, secondaryFrames: 0 },
    });
  });
});
