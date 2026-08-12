import { describe, expect, it } from "vitest";
import {
  calculateGen4IvRange,
  calculateGen4NextLevels,
  formatGen4IvCandidates,
} from "./domain";
import type { Gen4BaseStats } from "./gen4IvData";

const bulbasaur: Gen4BaseStats = [45, 49, 49, 65, 65, 45];

describe("Generation IV IV calculator", () => {
  it("recovers exact IVs from a level 100 neutral-nature observation", () => {
    const candidates = calculateGen4IvRange(
      bulbasaur,
      [{ level: 100, stats: [231, 134, 134, 166, 166, 126] }],
      0,
    );
    expect(candidates).toEqual([[31], [31], [31], [31], [31], [31]]);
  });

  it("applies Generation IV characteristic and Hidden Power filters", () => {
    const candidates = calculateGen4IvRange(
      bulbasaur,
      [{ level: 100, stats: [231, 134, 134, 166, 166, 126] }],
      0,
      1,
      15,
    );
    expect(candidates[0]).toEqual([31]);
    expect(
      candidates.every((values) => values.every((iv) => iv % 2 === 1)),
    ).toBe(true);
  });

  it("keeps PokeFinder's continuous range when nature is unspecified", () => {
    const candidates = calculateGen4IvRange(
      [1, 1, 1, 1, 1, 1],
      [{ level: 22, stats: [32, 10, 10, 10, 10, 10] }],
    );
    expect(candidates[1]).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]);
  });

  it("formats ranges and reports the next useful level", () => {
    expect(formatGen4IvCandidates([0, 1, 2, 5, 7, 8])).toBe("0-2, 5, 7-8");
    expect(
      calculateGen4NextLevels(
        bulbasaur,
        [[30, 31], [31], [31], [31], [31], [31]],
        5,
        0,
      )[0],
    ).toBeGreaterThan(5);
  });
});
