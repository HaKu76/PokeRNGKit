import { describe, expect, it } from "vitest";
import { researcherDefaultCustom, type ResearcherRequest } from "../domain";
import { ResearcherUiPreviewEngine } from "./ResearcherUiPreviewEngine";

function request(): ResearcherRequest {
  return {
    rng: "lcrng",
    seedWords: Array(8).fill(0),
    initialAdvances: 0,
    maxAdvances: 4,
    customs: Array.from({ length: 10 }, () => researcherDefaultCustom("lcrng")),
  };
}

describe("ResearcherUiPreviewEngine", () => {
  it("returns deterministic rows and progress", async () => {
    const progress: number[] = [];
    const summary = await new ResearcherUiPreviewEngine().generate(request(), {
      onProgress: (processed) => progress.push(processed),
    });
    expect(summary.cancelled).toBe(false);
    expect(summary.processedStates).toBe(4);
    expect(summary.rows).toHaveLength(4);
    expect(summary.rows[0].advances).toBe(0);
    expect(summary.rows[0].prng).toBe(0x9e3779b9n);
    expect(progress).toEqual([1, 2, 3, 4]);
  });

  it("honors cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const summary = await new ResearcherUiPreviewEngine().generate(request(), {
      signal: controller.signal,
    });
    expect(summary.cancelled).toBe(true);
    expect(summary.rows).toHaveLength(0);
  });
});
