import { describe, expect, it } from "vitest";
import type { Gen7SosCallRequest, Gen7SosResult } from "../domain";
import { Gen7SosUiPreviewEngine } from "./Gen7SosUiPreviewEngine";

const request: Gen7SosCallRequest = {
  mode: "calls",
  seed: 0x1234_5678,
  minFrame: 0,
  maxFrame: 9,
  delay: 0,
  chainLength: 30,
  levelMin: 10,
  levelMax: 13,
  weather: true,
  existingPerfectIvMask: 0,
  callConditions: {
    callRate: 9,
    hpBonus: 5,
    adrenalineOrb: true,
    intimidate: false,
    lastCallSucceeded: false,
    lastCallFailed: false,
    superEffective: false,
  },
  filters: {
    disabled: true,
    successOnly: false,
    syncOnly: false,
    hiddenAbilityOnly: false,
    slotMask: 0,
    level: 0,
  },
  resultLimit: 100,
};

describe("Gen7SosUiPreviewEngine", () => {
  it("emits deterministic SOS call rows", async () => {
    const results: Gen7SosResult[] = [];
    const engine = new Gen7SosUiPreviewEngine();
    const summary = await engine.search(request, {
      onBatch: (batch) => results.push(...batch),
    });
    expect(results).toHaveLength(10);
    expect(results[0]).toMatchObject({ mode: "calls", frame: 0 });
    expect(summary).toMatchObject({
      cancelled: false,
      processedStates: 10,
      totalStates: 10,
    });
  });

  it("honors pre-aborted searches", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      new Gen7SosUiPreviewEngine().search(request, {
        signal: controller.signal,
      }),
    ).resolves.toMatchObject({ cancelled: true, processedStates: 0 });
  });
});
