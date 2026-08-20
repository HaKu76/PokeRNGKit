import { describe, expect, it } from "vitest";
import {
  decodeGen4SeedFinderResults,
  packGen4SeedFinderFilter,
  sanitizeGen4SeedFinderFilter,
  validateGen4SeedFinderRequest,
  type Gen4SeedFinderRequest,
} from "./domain";

const baseRequest = (
  overrides: Partial<Gen4SeedFinderRequest> = {},
): Gen4SeedFinderRequest => ({
  game: "dppt",
  year: 2005,
  month: 1,
  day: 1,
  hour: 17,
  minute: 0,
  minSecond: 0,
  maxSecond: 0,
  minDelay: 600,
  maxDelay: 800,
  filter: "HT",
  sequenceCount: 20,
  ...overrides,
});

describe("Gen IV Seed Finder domain", () => {
  it("sanitizes game-specific sequence filters", () => {
    expect(sanitizeGen4SeedFinderFilter("h-eTkpx", "dppt")).toBe("HT");
    expect(sanitizeGen4SeedFinderFilter("h-eTkpx", "hgss")).toBe("EKP");
    expect(packGen4SeedFinderFilter("HT", "dppt")).toMatchObject({
      low: 1,
      length: 2,
      value: "HT",
    });
  });

  it("rejects invalid date, ranges and sequence relationships", () => {
    expect(
      validateGen4SeedFinderRequest(
        baseRequest({ month: 2, day: 29, year: 2005 }),
      ),
    ).toContain("day");
    expect(
      validateGen4SeedFinderRequest(
        baseRequest({ minSecond: 40, maxSecond: 20 }),
      ),
    ).toContain("maxSecond");
    expect(
      validateGen4SeedFinderRequest(
        baseRequest({ filter: "HTHT", sequenceCount: 3 }),
      ),
    ).toContain("sequenceCount");
    expect(validateGen4SeedFinderRequest(baseRequest())).toEqual([]);
  });

  it("decodes fixed-width result records", () => {
    const buffer = Uint32Array.from([
      0x11111111, 2005, 1, 1, 17, 0, 16, 4364, 1, 0,
    ]).buffer;
    expect(decodeGen4SeedFinderResults(buffer)[0]).toEqual({
      seed: 0x11111111,
      year: 2005,
      month: 1,
      day: 1,
      hour: 17,
      minute: 0,
      second: 16,
      delay: 4364,
      sequenceLow: 1,
      sequenceHigh: 0,
    });
  });
});
