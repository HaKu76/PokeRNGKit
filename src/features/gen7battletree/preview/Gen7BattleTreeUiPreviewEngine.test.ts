import { describe, expect, it } from "vitest";
import type { Gen7BattleTreeRequest } from "../domain";
import { Gen7BattleTreeUiPreviewEngine } from "./Gen7BattleTreeUiPreviewEngine";

const request: Gen7BattleTreeRequest = {
  seed: 0,
  minFrame: 0,
  maxFrame: 10_000,
  version: "ultra-sun",
  npc: 0,
  delay: 20,
  streak: 10,
  trainerFilter: 254,
  resultLimit: 100_000,
};

describe("Gen7BattleTreeUiPreviewEngine", () => {
  it("caps preview work and produces special trainers on tenth battles", async () => {
    const results: number[] = [];
    const engine = new Gen7BattleTreeUiPreviewEngine();
    const summary = await engine.search(request, {
      onBatch: (batch) =>
        results.push(...batch.map((result) => result.trainerId)),
    });
    expect(summary.totalStates).toBe(5_000);
    expect(summary.processedStates).toBe(5_000);
    expect(
      results.every((trainerId) => trainerId >= 192 && trainerId <= 205),
    ).toBe(true);
  });

  it("reports cancellation before preview work starts", async () => {
    const controller = new AbortController();
    controller.abort();
    const engine = new Gen7BattleTreeUiPreviewEngine();
    await expect(
      engine.search(request, { signal: controller.signal }),
    ).resolves.toMatchObject({
      cancelled: true,
      processedStates: 0,
      percent: 0,
    });
  });
});
