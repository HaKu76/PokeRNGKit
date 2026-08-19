import { describe, expect, it } from "vitest";
import { Gen6TinyHoneyUiPreviewEngine } from "./Gen6TinyHoneyUiPreviewEngine";
import type { Gen6TinyHoneyRequest } from "../domain";

const request: Gen6TinyHoneyRequest = {
  inputMode: "seed",
  seed: 0x1234,
  state: [0, 0, 0, 0],
  minIndex: 0,
  maxIndex: 4,
  longBlinkRand: 60,
  honeyDelay: 110,
  party: 6,
  bagAdvances: 27,
  oras: true,
  emulator: false,
  slotType: 4,
  filters: {
    disabled: false,
    synchronize: false,
    safeOnly: false,
    flute: 0,
    slotMask: 0,
  },
  slots: Array.from({ length: 5 }, () => ({ species: 75, level: 10 })),
  resultLimit: 20,
};

describe("Gen6 TinyFinder Honey Wild UI preview", () => {
  it("returns deterministic rows and progress", async () => {
    const engine = new Gen6TinyHoneyUiPreviewEngine();
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
