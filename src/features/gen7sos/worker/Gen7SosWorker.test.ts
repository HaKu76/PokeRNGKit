import { describe, expect, it } from "vitest";
import {
  encodeGen7SosRequest,
  GEN7_SOS_REQUEST_WORDS,
  type Gen7SosCallRequest,
} from "../domain";

describe("Gen 7 SOS Worker protocol", () => {
  it("keeps the request word count aligned with the Wasm ABI", () => {
    const request: Gen7SosCallRequest = {
      mode: "calls",
      seed: 0,
      minFrame: 0,
      maxFrame: 0,
      delay: 10_000,
      chainLength: 255,
      levelMin: 1,
      levelMax: 100,
      weather: true,
      existingPerfectIvMask: 0x3f,
      callConditions: {
        callRate: 15,
        hpBonus: 5,
        adrenalineOrb: true,
        intimidate: true,
        lastCallSucceeded: true,
        lastCallFailed: true,
        superEffective: true,
      },
      filters: {
        disabled: true,
        successOnly: false,
        syncOnly: false,
        hiddenAbilityOnly: false,
        slotMask: 0,
        level: 0,
      },
      resultLimit: 1,
    };
    expect(encodeGen7SosRequest(request)).toHaveLength(GEN7_SOS_REQUEST_WORDS);
  });
});
