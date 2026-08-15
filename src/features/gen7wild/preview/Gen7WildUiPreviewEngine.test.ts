import { describe, expect, it } from "vitest";
import {
  gen7WildAreas,
  gen7WildEncounterFromArea,
  type Gen7WildRequest,
  type Gen7WildResult,
} from "../domain";
import { Gen7WildUiPreviewEngine } from "./Gen7WildUiPreviewEngine";

const area = gen7WildAreas("ultra-sun", "normal")[0];
const request: Gen7WildRequest = {
  version: "ultra-sun",
  seed: 0x1234_5678,
  minFrame: 478,
  maxFrame: 478,
  tsv: 0,
  trv: 0,
  shinyCharm: false,
  syncNature: null,
  lead: "none",
  considerDelay: true,
  encounter: gen7WildEncounterFromArea({
    version: "ultra-sun",
    category: "normal",
    area,
    night: false,
    bubbling: false,
    fishingOverview: false,
    trigger: "default",
  }),
  filters: {
    disabled: true,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0,
    hiddenPowerMask: 0,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
    blink: "any",
    slotMask: 0,
    specialOnly: false,
    level: 0,
  },
  resultLimit: 100_000,
};

describe("Gen7WildUiPreviewEngine", () => {
  it("emits a result through the shared Wild request contract", async () => {
    const results: Gen7WildResult[] = [];
    const engine = new Gen7WildUiPreviewEngine();
    const summary = await engine.search(request, {
      onBatch: (batch) => results.push(...batch),
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ frame: 478 });
    expect(results[0].slot).toBeGreaterThanOrEqual(1);
    expect(results[0].slot).toBeLessThanOrEqual(request.encounter.slots.length);
    expect(
      request.encounter.slots.some(
        (slot) =>
          slot.species === results[0].species && slot.form === results[0].form,
      ),
    ).toBe(true);
    expect(summary).toMatchObject({
      cancelled: false,
      processedStates: 1,
      totalStates: 1,
    });
  });

  it("caps main-thread preview work and reports cancellation", async () => {
    const engine = new Gen7WildUiPreviewEngine();
    const summary = await engine.search({
      ...request,
      maxFrame: 10_000,
    });
    expect(summary.totalStates).toBe(5_000);
    expect(summary.processedStates).toBe(5_000);

    const controller = new AbortController();
    controller.abort();
    await expect(
      engine.search(request, { signal: controller.signal }),
    ).resolves.toMatchObject({
      cancelled: true,
      processedStates: 0,
      percent: 0,
    });
  });
});
