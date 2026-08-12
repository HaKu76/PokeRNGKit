import { describe, expect, it } from "vitest";
import type {
  Gen4IvTuple,
  Gen4StaticGeneratorRequest,
  Gen4StaticSearcherRequest,
} from "../domain";
import { GEN4_STATIC_TEMPLATES } from "../domain";
import { Gen4StaticSearcherUiPreviewEngine } from "./Gen4StaticSearcherUiPreviewEngine";
import { Gen4StaticUiPreviewEngine } from "./Gen4StaticUiPreviewEngine";

const template = GEN4_STATIC_TEMPLATES.find(
  (entry) => entry.id === "starters-00",
)!;
const filters = {
  shiny: "any" as const,
  gender: "any" as const,
  ability: "any" as const,
  natureMask: 0x1ff_ffff,
  hiddenPowerMask: 0xffff,
  ivMin: [0, 0, 0, 0, 0, 0] as Gen4IvTuple,
  ivMax: [31, 31, 31, 31, 31, 31] as Gen4IvTuple,
};
const generatorRequest: Gen4StaticGeneratorRequest = {
  seed: 0x12345678,
  initialAdvances: 12,
  maxAdvances: 99,
  offset: 0,
  method: template.method,
  lead: "none",
  syncNature: 0,
  tid: 12345,
  sid: 54321,
  template,
  filters,
};

describe("Gen IV Static UI preview engines", () => {
  it("generates deterministic Generator samples without Wasm", async () => {
    const engine = new Gen4StaticUiPreviewEngine(0);
    const advances: number[] = [];
    const summary = await engine.search(generatorRequest, {
      onBatch: (batch) =>
        advances.push(...batch.map((state) => state.advances)),
    });
    expect(advances).toHaveLength(100);
    expect(advances[0]).toBe(12);
    expect(advances.at(-1)).toBe(111);
    expect(summary).toMatchObject({
      processedStates: 100,
      totalStates: 100,
      resultCount: 100,
      percent: 100,
      workerCount: 0,
      cancelled: false,
    });
  });

  it("generates valid-format Searcher samples and supports cancellation", async () => {
    const request: Gen4StaticSearcherRequest = {
      ...generatorRequest,
      minAdvance: 0,
      maxAdvance: 1000,
      minDelay: 600,
      maxDelay: 2000,
      filters: {
        ...filters,
        ivMin: [30, 30, 30, 30, 30, 30],
      },
    };
    const engine = new Gen4StaticSearcherUiPreviewEngine(0);
    const states: { delay: number; hour: number }[] = [];
    const summary = await engine.search(request, {
      onBatch: (batch) => states.push(...batch),
      onProgress: ({ processedStates }) => {
        if (processedStates > 0) engine.cancel();
      },
    });
    expect(states.length).toBeGreaterThan(0);
    expect(
      states.every(
        (state) => state.hour < 24 && state.delay >= 600 && state.delay <= 2000,
      ),
    ).toBe(true);
    expect(summary.cancelled).toBe(true);
    expect(summary.processedStates).toBeLessThan(summary.totalStates);
  });
});
