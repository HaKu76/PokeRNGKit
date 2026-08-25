import { describe, expect, it } from "vitest";
import {
  countIvCombinations,
  ivCombinationAtIndex,
} from "./perfectIvCombinations";

const fullMin = [0, 0, 0, 0, 0, 0] as const;
const fullMax = [31, 31, 31, 31, 31, 31] as const;

describe("Perfect IV candidate combinations", () => {
  it("counts the intersection of ranges and a perfect-IV threshold", () => {
    expect(countIvCombinations(fullMin, fullMax, 31, 5)).toBe(187);
    expect(countIvCombinations(fullMin, fullMax, 31, 6)).toBe(1);
    expect(countIvCombinations(fullMin, fullMax, 31, 0)).toBe(32 ** 6);
    expect(countIvCombinations([30, 30, 30, 30, 30, 30], fullMax, 31, 5)).toBe(
      7,
    );
  });

  it("unranks filtered candidates in the existing HP-to-Spe order", () => {
    expect(ivCombinationAtIndex(0, fullMin, fullMax, 31, 5)).toEqual([
      0, 31, 31, 31, 31, 31,
    ]);
    expect(ivCombinationAtIndex(186, fullMin, fullMax, 31, 5)).toEqual([
      31, 31, 31, 31, 31, 31,
    ]);
  });
});
