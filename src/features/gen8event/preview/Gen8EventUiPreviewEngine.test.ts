import { describe, expect, it } from "vitest";
import type { Gen8EventRequest } from "../domain";
import { Gen8EventUiPreviewEngine } from "./Gen8EventUiPreviewEngine";

function request(overrides: Partial<Gen8EventRequest> = {}): Gen8EventRequest {
  return {
    profile: { tid: 12345, sid: 54321 },
    seed0: "1234567887654321",
    seed1: "8765432112345678",
    initialAdvances: 12,
    maxAdvances: 9,
    offset: 0,
    event: {
      species: 1,
      ivCount: 0,
      level: 50,
      pidType: "random",
      ability: 4,
      gender: 1,
      nature: null,
      tid: 12345,
      sid: 54321,
      ec: 0,
      pid: 0,
      egg: false,
    },
    filters: {
      disabled: false,
      shiny: "square",
      gender: "female",
      ability: "hidden",
      natureMask: 1 << 5,
      hiddenPowerMask: 1 << 15,
      heightMin: 100,
      heightMax: 200,
      weightMin: 80,
      weightMax: 180,
      ivMin: [31, 31, 31, 31, 31, 31],
      ivMax: [31, 31, 31, 31, 31, 31],
    },
    resultLimit: 100_000,
    ...overrides,
  };
}

describe("Gen8EventUiPreviewEngine", () => {
  it("emits a deterministic row that respects active filters", async () => {
    const results: Array<{
      nature: number;
      ability: number;
      gender: number;
      height: number;
      weight: number;
    }> = [];
    const summary = await new Gen8EventUiPreviewEngine().search(request(), {
      onBatch: (batch) => results.push(...batch),
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      nature: 5,
      ability: 2,
      gender: 1,
      height: 100,
      weight: 80,
    });
    expect(summary).toMatchObject({
      processedStates: 10,
      resultCount: 1,
      cancelled: false,
    });
  });

  it("returns no row when PID Type conflicts with the shiny filter", async () => {
    const source = request();
    const summary = await new Gen8EventUiPreviewEngine().search({
      ...source,
      event: { ...source.event, pidType: "nonshiny" },
    });
    expect(summary.resultCount).toBe(0);
  });

  it("reports cancellation from an active request", async () => {
    const engine = new Gen8EventUiPreviewEngine();
    const pending = engine.search(request());
    engine.cancel();
    await expect(pending).resolves.toMatchObject({
      processedStates: 0,
      resultCount: 0,
      cancelled: true,
    });
  });
});
