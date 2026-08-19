import { describe, expect, it } from "vitest";
import { Gen6TinyAmbushUiPreviewEngine } from "./Gen6TinyAmbushUiPreviewEngine";
import type { Gen6TinyAmbushRequest } from "../domain";

const request: Gen6TinyAmbushRequest = {
  inputMode: "seed",
  seed: 0x12345678,
  state: [0, 0, 0, 0],
  minIndex: 27,
  maxIndex: 32,
  filters: { disabled: false, synchronize: false, slotMask: 0 },
  slots: Array.from({ length: 12 }, (_, index) => ({
    species: 22 + index,
    level: 57 + (index % 3),
  })),
  resultLimit: 10,
};

describe("Gen6TinyAmbushUiPreviewEngine", () => {
  it("streams preview rows and progress", async () => {
    const batches: number[] = [];
    const engine = new Gen6TinyAmbushUiPreviewEngine();
    const summary = await engine.search(request, {
      onBatch: (batch) => batches.push(batch.length),
    });
    expect(batches.reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
    expect(summary.processedStates).toBe(6);
  });

  it("applies synchronization and slot filters", async () => {
    const engine = new Gen6TinyAmbushUiPreviewEngine();
    const rows: number[] = [];
    await engine.search(
      {
        ...request,
        filters: { disabled: false, synchronize: true, slotMask: 1 },
      },
      { onBatch: (batch) => rows.push(...batch.map((result) => result.slot)) },
    );
    expect(rows.every((slot) => slot === 1)).toBe(true);
  });
});
