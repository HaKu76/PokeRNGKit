import { describe, expect, it } from "vitest";
import type { Gen8IdRequest } from "../domain";
import { Gen8IdUiPreviewEngine } from "./Gen8IdUiPreviewEngine";

function request(overrides: Partial<Gen8IdRequest> = {}): Gen8IdRequest {
  return {
    seed0: 0x4000_0000_0000_0000n,
    seed1: 0x4000_0000_0000_0000n,
    initialAdvances: 0,
    maxAdvances: 9,
    filters: { mode: "tid", values: [] },
    ...overrides,
  };
}

describe("Gen8IdUiPreviewEngine", () => {
  it("emits count-based preview rows with wrapped advances", async () => {
    const rows: number[] = [];
    const summary = await new Gen8IdUiPreviewEngine().search(
      request({ initialAdvances: 0xffff_fffe, maxAdvances: 3 }),
      {
        onBatch: (batch) => rows.push(...batch.map((state) => state.advances)),
      },
    );
    expect(rows).toEqual([0xffff_fffe, 0xffff_ffff, 0]);
    expect(summary.processedStates).toBe(3);
    expect(summary.cancelled).toBe(false);
  });

  it("treats an empty selected filter as no filtering", async () => {
    const rows: number[] = [];
    await new Gen8IdUiPreviewEngine().search(request(), {
      onBatch: (batch) => rows.push(...batch.map((state) => state.advances)),
    });
    expect(rows).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("applies selected filter values in preview mode", async () => {
    const first: number[] = [];
    await new Gen8IdUiPreviewEngine().search(request({ maxAdvances: 1 }), {
      onBatch: (batch) => first.push(...batch.map((state) => state.tid)),
    });
    const matches: number[] = [];
    await new Gen8IdUiPreviewEngine().search(
      request({ filters: { mode: "tid", values: first } }),
      {
        onBatch: (batch) =>
          matches.push(...batch.map((state) => state.advances)),
      },
    );
    expect(matches).toContain(0);
  });
});
