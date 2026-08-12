import { describe, expect, it } from "vitest";
import {
  decodeGen3SeedToTimeStates,
  formatGen3SeedToTime,
  validateGen3SeedToTimeRequest,
} from "./domain";

describe("Gen3 Seed to Time domain", () => {
  it("accepts the exact upstream input bounds", () => {
    expect(validateGen3SeedToTimeRequest({ seed: 0, year: 2000 })).toEqual([]);
    expect(
      validateGen3SeedToTimeRequest({ seed: 0xffff_ffff, year: 2037 }),
    ).toEqual([]);
    expect(validateGen3SeedToTimeRequest({ seed: -1, year: 2000 })).toEqual([
      "seed",
    ]);
    expect(validateGen3SeedToTimeRequest({ seed: 0, year: 2038 })).toEqual([
      "year",
    ]);
  });

  it("decodes and formats the fixed PokeFinder time layout", () => {
    const words = new Uint32Array([2000, 3, 30, 18, 22]);
    const [state] = decodeGen3SeedToTimeStates(words.buffer);
    expect(state).toEqual({
      year: 2000,
      month: 3,
      day: 30,
      hour: 18,
      minute: 22,
    });
    expect(formatGen3SeedToTime(state)).toBe("2000-03-30 18:22:00");
  });

  it("rejects incomplete and invalid packed states", () => {
    expect(() =>
      decodeGen3SeedToTimeStates(new Uint32Array([2000]).buffer),
    ).toThrow("result buffer length");
    expect(() =>
      decodeGen3SeedToTimeStates(new Uint32Array([2000, 13, 1, 0, 0]).buffer),
    ).toThrow("invalid time");
    expect(() =>
      decodeGen3SeedToTimeStates(new Uint32Array([2001, 2, 29, 0, 0]).buffer),
    ).toThrow("invalid time");
  });
});
