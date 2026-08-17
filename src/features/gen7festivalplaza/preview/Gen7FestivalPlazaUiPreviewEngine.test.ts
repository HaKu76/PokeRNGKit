import { describe, expect, it } from "vitest";
import type { Gen7FestivalPlazaRequest } from "../domain";
import { Gen7FestivalPlazaUiPreviewEngine } from "./Gen7FestivalPlazaUiPreviewEngine";

const request: Gen7FestivalPlazaRequest = {
  seed: 0,
  minFrame: 0,
  maxFrame: 10_000,
  version: "ultra-moon",
  npc: 2,
  delay: 20,
  rank: 18,
  starFilter: 5,
  facilityFilter: 3,
  npcTypeFilter: 11,
  colorFilter: 2,
  includeNpcStatus: true,
  resultLimit: 100_000,
};

describe("Gen7FestivalPlazaUiPreviewEngine", () => {
  it("caps preview work and preserves all selected filters", async () => {
    const results: {
      star: number;
      facility: number;
      npcType: number;
      color: number;
      statusLength: number;
    }[] = [];
    const engine = new Gen7FestivalPlazaUiPreviewEngine();
    const summary = await engine.search(request, {
      onBatch: (batch) =>
        results.push(
          ...batch.map((result) => ({
            star: result.star,
            facility: result.facility,
            npcType: result.npcType,
            color: result.color,
            statusLength: result.npcStatus.length,
          })),
        ),
    });
    expect(summary.totalStates).toBe(5_000);
    expect(summary.processedStates).toBe(5_000);
    expect(results).toHaveLength(5_000);
    expect(
      results.every(
        (result) =>
          result.star === 5 &&
          result.facility === 3 &&
          result.npcType === 11 &&
          result.color === 2 &&
          result.statusLength === 3,
      ),
    ).toBe(true);
  });

  it("reports cancellation before preview work starts", async () => {
    const controller = new AbortController();
    controller.abort();
    const engine = new Gen7FestivalPlazaUiPreviewEngine();
    await expect(
      engine.search(request, { signal: controller.signal }),
    ).resolves.toMatchObject({
      cancelled: true,
      processedStates: 0,
      percent: 0,
    });
  });
});
