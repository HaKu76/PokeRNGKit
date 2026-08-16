import { describe, expect, it } from "vitest";
import {
  gen7EventDefaultSettings,
  type Gen7EventRequest,
  type Gen7EventResult,
} from "../domain";
import { Gen7EventUiPreviewEngine } from "./Gen7EventUiPreviewEngine";

const request: Gen7EventRequest = {
  version: "sun",
  seed: 0,
  minFrame: 418,
  maxFrame: 418,
  tsv: 0,
  trv: 0,
  npc: 0,
  delay: 62,
  considerDelay: true,
  event: gen7EventDefaultSettings("sun", 25),
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

describe("Gen7EventUiPreviewEngine", () => {
  it("honors fixed Event values in preview mode", async () => {
    const results: Gen7EventResult[] = [];
    const engine = new Gen7EventUiPreviewEngine();
    await engine.search(
      {
        ...request,
        maxFrame: request.minFrame,
        event: {
          ...request.event,
          ec: 0x1234_5678,
          pidType: "specified",
          pid: 0x89ab_cdef,
          natureLocked: true,
          nature: 12,
          abilityLocked: true,
          ability: 2,
          genderLocked: true,
          gender: 1,
          fixedIvs: [31, 30, 29, 28, 27, 26],
          randomPerfectIvCount: 0,
        },
        filters: { ...request.filters, disabled: true },
      },
      { onBatch: (batch) => results.push(...batch) },
    );
    expect(results[0]).toMatchObject({
      ec: 0x1234_5678,
      pid: 0x89ab_cdef,
      nature: 12,
      ability: 2,
      gender: 1,
      ivs: [31, 30, 29, 28, 27, 26],
      delay: 33,
    });
  });

  it("caps preview work and reports cancellation", async () => {
    const engine = new Gen7EventUiPreviewEngine();
    const summary = await engine.search({
      ...request,
      maxFrame: 10_000,
      filters: { ...request.filters, disabled: true },
    });
    expect(summary.totalStates).toBe(5_000);

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
