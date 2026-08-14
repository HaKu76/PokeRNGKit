import { describe, expect, it } from "vitest";
import type { Gen8EggFilters, Gen8EggParent, Gen8EggRequest } from "../domain";
import { Gen8EggUiPreviewEngine } from "./Gen8EggUiPreviewEngine";

const parentA: Gen8EggParent = {
  ivs: [31, 31, 31, 31, 31, 31],
  ability: 0,
  gender: "male",
  item: 0,
  nature: 0,
};

const parentB: Gen8EggParent = {
  ...parentA,
  ability: 2,
  gender: "female",
};

const filters: Gen8EggFilters = {
  disabled: false,
  shiny: "square",
  gender: "female",
  ability: "hidden",
  natureMask: 1 << 5,
  hiddenPowerMask: 1 << 15,
  ivMin: [31, 31, 31, 31, 31, 31],
  ivMax: [31, 31, 31, 31, 31, 31],
};

function request(overrides: Partial<Gen8EggRequest> = {}): Gen8EggRequest {
  return {
    profile: {
      tid: 12345,
      sid: 54321,
      shinyCharm: true,
      ovalCharm: true,
    },
    seed0: "1234567887654321",
    seed1: "8765432112345678",
    initialAdvances: 12,
    maxAdvances: 9,
    offset: 0,
    compatibility: 70,
    species: 1,
    masuda: true,
    parentA,
    parentB,
    filters,
    resultLimit: 100_000,
    ...overrides,
  };
}

describe("Gen8EggUiPreviewEngine", () => {
  it("emits a deterministic row that respects active filters", async () => {
    const rows: Awaited<ReturnType<Gen8EggUiPreviewEngine["search"]>>[] = [];
    const results: Array<{ nature: number; ability: number; gender: number }> =
      [];
    const summary = await new Gen8EggUiPreviewEngine().search(request(), {
      onBatch: (batch) => results.push(...batch),
    });
    rows.push(summary);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ nature: 5, ability: 2, gender: 1 });
    expect(summary).toMatchObject({
      processedStates: 10,
      resultCount: 1,
      cancelled: false,
    });
  });

  it("returns no row when the selected Hidden Power parity is impossible", async () => {
    const summary = await new Gen8EggUiPreviewEngine().search(
      request({
        filters: {
          ...filters,
          hiddenPowerMask: 1,
          ivMin: [31, 31, 31, 31, 31, 31],
          ivMax: [31, 31, 31, 31, 31, 31],
        },
      }),
    );
    expect(summary.resultCount).toBe(0);
  });

  it("reports cancellation from an active request", async () => {
    const engine = new Gen8EggUiPreviewEngine();
    const pending = engine.search(request());
    engine.cancel();
    await expect(pending).resolves.toMatchObject({
      processedStates: 0,
      resultCount: 0,
      cancelled: true,
    });
  });
});
