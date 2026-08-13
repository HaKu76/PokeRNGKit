import { describe, expect, it } from "vitest";
import type { Gen3WildRequest } from "../domain";
import { Gen3WildUiPreviewEngine } from "./Gen3WildUiPreviewEngine";

const request: Gen3WildRequest = {
  seed: 0x1234_5678,
  initialAdvances: 12,
  maxAdvances: 99,
  offset: 0,
  method: "method1",
  lead: "none",
  synchronizeNature: 0,
  feebasTile: false,
  bike: false,
  item: "none",
  version: "emerald",
  tid: 12345,
  sid: 54321,
  area: {
    name: "Route 111",
    encounter: "land",
    rate: 10,
    feebasLocation: false,
    safariZone: false,
    slots: [
      {
        species: 328,
        form: 0,
        minLevel: 20,
        maxLevel: 21,
        genderRatio: 127,
        type1: 4,
        type2: 4,
      },
    ],
  },
  filters: {
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    encounterSlotMask: 1,
    levelMin: 1,
    levelMax: 100,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
};

describe("Gen3WildUiPreviewEngine", () => {
  it("generates deterministic UI samples without a Wasm module", async () => {
    const engine = new Gen3WildUiPreviewEngine(0);
    const results: number[] = [];
    const summary = await engine.search(request, {
      onBatch: (batch) => results.push(...batch.map((state) => state.advances)),
    });

    expect(results).toHaveLength(100);
    expect(results[0]).toBe(12);
    expect(results.at(-1)).toBe(111);
    expect(summary).toMatchObject({
      processedStates: 100,
      totalStates: 100,
      resultCount: 100,
      percent: 100,
      workerCount: 0,
      cancelled: false,
    });
  });

  it("applies filters and supports cancellation", async () => {
    const filtered = await new Gen3WildUiPreviewEngine(0).search({
      ...request,
      filters: { ...request.filters, encounterSlotMask: 2 },
    });
    expect(filtered.resultCount).toBe(0);

    const engine = new Gen3WildUiPreviewEngine(0);
    const cancelled = await engine.search(
      { ...request, maxAdvances: 999 },
      {
        onProgress: ({ processedStates }) => {
          if (processedStates > 0) engine.cancel();
        },
      },
    );
    expect(cancelled.cancelled).toBe(true);
    expect(cancelled.processedStates).toBeLessThan(cancelled.totalStates);
  });

  it("preserves Tanoby Chamber forms in preview rows", async () => {
    const forms: number[] = [];
    await new Gen3WildUiPreviewEngine(0).search(
      {
        ...request,
        version: "firered",
        maxAdvances: 0,
        area: {
          ...request.area,
          name: "Seven Island Tanoby Ruins Liptoo Chamber",
          rate: 7,
          slots: request.area.slots.map((slot) => ({
            ...slot,
            species: 201,
            form: 2,
            minLevel: 25,
            maxLevel: 25,
            genderRatio: 255,
            type1: 13,
            type2: 13,
          })),
        },
      },
      { onBatch: (batch) => forms.push(...batch.map((state) => state.form)) },
    );
    expect(forms).toEqual([2]);
  });
});
