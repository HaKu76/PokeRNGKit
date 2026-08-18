import { describe, expect, it, vi } from "vitest";
import { Gen6PokeRadarUiPreviewEngine } from "./Gen6PokeRadarUiPreviewEngine";
describe("Gen VI Poke Radar preview", () => {
  it("streams one row per frame", async () => {
    const onBatch = vi.fn();
    const summary = await new Gen6PokeRadarUiPreviewEngine().search(
      {
        tinySeed: 1,
        minFrame: 0,
        maxFrame: 4,
        tinyFrame: 0,
        partySize: 6,
        chainLength: 0,
        boost: false,
        resultLimit: 100,
      },
      { onBatch },
    );
    expect(summary.resultCount).toBe(5);
    expect(onBatch.mock.calls[0][0]).toHaveLength(5);
  });
});
