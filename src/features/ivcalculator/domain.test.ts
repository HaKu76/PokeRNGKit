import { describe, expect, it } from "vitest";
import {
  calculateGen3IvRange,
  calculateGen3NextLevels,
  formatGen3IvCandidates,
} from "./domain";

const bulbasaur = [45, 49, 49, 65, 65, 45] as const;

describe("Generation III IV calculator", () => {
  it("recovers exact IVs from a level 100 neutral-nature observation", () => {
    const candidates = calculateGen3IvRange(
      bulbasaur,
      [{ level: 100, stats: [231, 134, 134, 166, 166, 126] }],
      0,
    );
    expect(candidates).toEqual([[31], [31], [31], [31], [31], [31]]);
  });

  it("intersects observations and applies Hidden Power parity", () => {
    const candidates = calculateGen3IvRange(
      bulbasaur,
      [
        { level: 5, stats: [20, 10, 10, 12, 12, 10] },
        { level: 6, stats: [22, 11, 11, 13, 13, 11] },
      ],
      0,
      15,
    );
    expect(
      candidates.every((values) => values.every((iv) => iv % 2 === 1)),
    ).toBe(true);
  });

  it("preserves PokeFinder's continuous range when nature is unspecified", () => {
    const candidates = calculateGen3IvRange(
      [1, 1, 1, 1, 1, 1],
      [{ level: 22, stats: [32, 10, 10, 10, 10, 10] }],
    );
    expect(candidates[1]).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]);
  });

  it("formats ranges and reports the next useful level", () => {
    expect(formatGen3IvCandidates([0, 1, 2, 5, 7, 8])).toBe("0-2, 5, 7-8");
    expect(
      calculateGen3NextLevels(
        bulbasaur,
        [[30, 31], [31], [31], [31], [31], [31]],
        5,
        0,
      )[0],
    ).toBeGreaterThan(5);
  });
});
