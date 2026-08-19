import { describe, expect, it } from "vitest";
import type { Gen6MainSeedTwoWildRequest } from "../domain";
import { Gen6MainSeedUiPreviewEngine } from "./Gen6MainSeedUiPreviewEngine";

const request: Gen6MainSeedTwoWildRequest = {
  mode: "two-wilds",
  startSeed: 10,
  endSeed: 12,
  firstIvs: [29, 14, 5, 24, 8, 13],
  firstMinFrame: 250,
  firstMaxFrame: 600,
  secondIvs: [0, 14, 26, 17, 3, 26],
  secondMinFrame: 2_000,
  secondMaxFrame: 5_000,
};

describe("Gen VI Main Seed Finder UI preview", () => {
  it("returns deterministic rows and progress", async () => {
    const rows: number[] = [];
    const summary = await new Gen6MainSeedUiPreviewEngine().search(request, {
      onBatch: (batch) => rows.push(...batch.map((result) => result.seed)),
    });
    expect(rows).toEqual([10, 11]);
    expect(summary).toMatchObject({
      processedStates: 3,
      resultCount: 2,
      cancelled: false,
    });
  });
});
