import { describe, expect, it, vi } from "vitest";
import { Gen6DexNavUiPreviewEngine } from "./Gen6DexNavUiPreviewEngine";
describe("Gen VI DexNav UI preview", () => {
  it("streams deterministic rows", async () => {
    const engine = new Gen6DexNavUiPreviewEngine();
    const onBatch = vi.fn();
    const slots = Array.from({ length: 13 }, () => ({
      species: 261,
      level: 5,
    }));
    const summary = await engine.search(
      {
        tinySeed: 1,
        minFrame: 0,
        maxFrame: 4,
        tinyFrame: 0,
        encounterType: "grass",
        activeSearch: true,
        hasDexNav: true,
        searchLevel: 100,
        chainLength: 0,
        shinyCharm: false,
        compoundEyes: false,
        forcedShiny: false,
        navHa: false,
        navUnown: false,
        potential: 0,
        flute: 0,
        tsv: 0,
        trv: 0,
        slots,
        resultLimit: 100,
      },
      { onBatch },
    );
    expect(summary.resultCount).toBe(5);
    expect(onBatch.mock.calls[0][0]).toHaveLength(5);
  });
});
