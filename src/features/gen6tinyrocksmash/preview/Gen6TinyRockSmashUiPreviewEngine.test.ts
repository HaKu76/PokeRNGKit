import { describe, expect, it } from "vitest";
import { Gen6TinyRockSmashUiPreviewEngine } from "./Gen6TinyRockSmashUiPreviewEngine";
import type { Gen6TinyRockSmashRequest } from "../domain";

const request: Gen6TinyRockSmashRequest = {
  inputMode: "seed",
  seed: 0x1234,
  state: [0, 0, 0, 0],
  minIndex: 0,
  maxIndex: 4,
  longBlinkRand: 60,
  interactFrame: 300,
  oras: true,
  filters: {
    disabled: false,
    triggerOnly: false,
    synchronize: false,
    safeOnly: false,
    flute: 0,
    slotMask: 0,
  },
  slots: Array.from({ length: 5 }, () => ({ species: 75, level: 10 })),
  resultLimit: 20,
};

describe("Gen6 TinyFinder Rock Smash UI preview", () => {
  it("returns deterministic rows and progress", async () => {
    const engine = new Gen6TinyRockSmashUiPreviewEngine();
    const batches: number[] = [];
    const summary = await engine.search(request, {
      onBatch: (batch) => batches.push(batch.length),
    });
    expect(summary.processedStates).toBe(5);
    expect(summary.resultCount).toBeGreaterThan(0);
    expect(batches).toEqual([summary.resultCount]);
    engine.dispose();
  });
});
