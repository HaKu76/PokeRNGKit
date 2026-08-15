import { describe, expect, it } from "vitest";
import { GEN7_STATIONARY_TEMPLATES } from "../data";
import {
  gen7StationaryEncounterFromTemplate,
  type Gen7StationaryRequest,
  type Gen7StationaryResult,
} from "../domain";
import { Gen7StationaryUiPreviewEngine } from "./Gen7StationaryUiPreviewEngine";

const template = GEN7_STATIONARY_TEMPLATES.find(
  (entry) => entry.family === "sm" && entry.conceptual,
)!;

const request: Gen7StationaryRequest = {
  version: "sun",
  seed: 0,
  minFrame: 418,
  maxFrame: 418,
  tsv: 0,
  trv: 0,
  shinyCharm: false,
  forcedShiny: false,
  syncNature: 0,
  considerDelay: true,
  pelagoShift: 0,
  encounter: {
    ...gen7StationaryEncounterFromTemplate(template),
    delay: 41,
  },
  filters: {
    disabled: true,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
    blink: "any",
  },
  resultLimit: 100_000,
};

describe("Gen7StationaryUiPreviewEngine", () => {
  it("uses integer upstream delay time for odd raw delays", async () => {
    const results: Gen7StationaryResult[] = [];
    const engine = new Gen7StationaryUiPreviewEngine();
    await engine.search(request, {
      onBatch: (batch) => results.push(...batch),
    });
    expect(results).toHaveLength(1);
    expect(results[0].delay).toBe(22);
  });

  it("caps main-thread preview work and reports cancellation", async () => {
    const engine = new Gen7StationaryUiPreviewEngine();
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
