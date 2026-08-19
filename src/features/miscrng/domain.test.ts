import { describe, expect, it } from "vitest";
import {
  calculateCaptureOdds,
  compareRandom,
  parseMiscHex,
  pokerusStrain,
  randomN,
  simulateCapture,
  validateCaptureRequest,
} from "./domain";

const baseCapture = {
  generation: 7 as const,
  hpCurrent: 1,
  hpMax: 208,
  catchRate: 3,
  statusBonus: 0x1000,
  ballBonus: 0x1000,
  dexBonus: 0x2800,
  oPowerBonus: 1,
};

describe("Misc RNG domain", () => {
  it("validates the upstream capture input bounds", () => {
    expect(() =>
      validateCaptureRequest({ ...baseCapture, hpCurrent: 209 }),
    ).toThrow(/Current HP/);
    expect(() =>
      validateCaptureRequest({ ...baseCapture, catchRate: 256 }),
    ).toThrow(/Catch Rate/);
    expect(() =>
      validateCaptureRequest({ ...baseCapture, oPowerBonus: 3 }),
    ).toThrow(/O-Power/);
  });

  it("calculates bounded capture odds and always-capture state", () => {
    const odds = calculateCaptureOdds(baseCapture);
    expect(odds.alwaysCapture).toBe(false);
    expect(odds.criticalRate).toBeGreaterThanOrEqual(0);
    expect(odds.shakeRate).toBeGreaterThanOrEqual(0);
    expect(odds.successChance).toBeGreaterThanOrEqual(0);
    expect(odds.successChance).toBeLessThanOrEqual(1);
    expect(
      calculateCaptureOdds({
        ...baseCapture,
        hpCurrent: 0,
        catchRate: 255,
        ballBonus: 0x8000,
        statusBonus: 0x2800,
        oPowerBonus: 2.5,
      }).alwaysCapture,
    ).toBe(true);
  });

  it("uses the generation-specific critical random byte and shake sequence", () => {
    const odds = {
      ...calculateCaptureOdds(baseCapture),
      criticalRate: 1,
      shakeRate: 0xffff,
    };
    const gen6 = simulateCapture(odds, 6, [0x01000000, 0, 0, 0, 0]);
    const gen7 = simulateCapture(odds, 7, [0x01000000, 0, 0, 0, 0]);
    expect(gen6.criticalValue).toBe(1);
    expect(gen6.totalShakes).toBe(4);
    expect(gen6.success).toBe(true);
    expect(gen7.criticalValue).toBe(0);
    expect(gen7.totalShakes).toBe(1);
    expect(gen7.success).toBe(true);
  });

  it("decodes Pokerus trigger, masked strains, and non-trigger values", () => {
    expect(pokerusStrain([0x4000n, 0x07n])).toEqual({
      strain: 7,
      consumedRandoms: 2,
    });
    expect(pokerusStrain([0x8000n, 0xa7n]).strain).toBe(7);
    expect(pokerusStrain([0x1234n, 0x07n])).toEqual({
      strain: 0,
      consumedRandoms: 1,
    });
  });

  it("matches upstream Random N modulo and comparisons", () => {
    const random = parseMiscHex("0x1234");
    expect(randomN(random, 100)).toBe(60);
    expect(compareRandom(60, "less-than", 100)).toBe(true);
    expect(compareRandom(60, "greater-than", 60)).toBe(true);
    expect(compareRandom(60, "equal", 60)).toBe(true);
  });
});
