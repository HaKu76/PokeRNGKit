import { describe, expect, it } from "vitest";
import {
  decodeGen7BattleTreeResults,
  encodeGen7BattleTreeRequest,
  GEN7_BATTLETREE_REQUEST_WORDS,
  gen7BattleTreeTrainerLabel,
  validateGen7BattleTreeRequest,
  type Gen7BattleTreeRequest,
} from "./domain";

const request: Gen7BattleTreeRequest = {
  seed: 0x1234_5678,
  minFrame: 418,
  maxFrame: 518,
  version: "sun",
  npc: 0,
  delay: 0,
  streak: 1,
  trainerFilter: 254,
  resultLimit: 100_000,
};

describe("Gen 7 Battle Tree domain", () => {
  it("packs the complete request ABI and decodes 64-bit rows", () => {
    expect(encodeGen7BattleTreeRequest(request)).toHaveLength(
      GEN7_BATTLETREE_REQUEST_WORDS,
    );
    expect(
      decodeGen7BattleTreeResults(
        new Uint32Array([418, 422, 0, 0x89ab_cdef, 0x0123_4567, 192, 5]).buffer,
      )[0],
    ).toEqual({
      frame: 418,
      actualFrame: 422,
      realTimeFrames: 0,
      random: 0x0123_4567_89ab_cdefn,
      trainerId: 192,
      blink: 5,
      clock: Number(0x0123_4567_89ab_cdefn % 17n),
    });
  });

  it("preserves upstream trainer filter and special-name semantics", () => {
    expect(gen7BattleTreeTrainerLabel(192)).toBe("Grimsley");
    expect(gen7BattleTreeTrainerLabel(205)).toBe("Kukui");
    expect(gen7BattleTreeTrainerLabel(91)).toBe("91");
    expect(() =>
      validateGen7BattleTreeRequest({ ...request, trainerFilter: 254 }),
    ).not.toThrow();
    expect(() =>
      validateGen7BattleTreeRequest({ ...request, trainerFilter: 255 }),
    ).toThrow(/Trainer ID/);
  });

  it("enforces upstream control limits and the browser frame boundary", () => {
    expect(() =>
      validateGen7BattleTreeRequest({ ...request, streak: 0 }),
    ).toThrow(/Streak/);
    expect(() =>
      validateGen7BattleTreeRequest({ ...request, delay: 10_001 }),
    ).toThrow(/Delay/);
    expect(() =>
      validateGen7BattleTreeRequest({ ...request, maxFrame: 5_000_001 }),
    ).toThrow(/Maximum frame/);
  });
});
