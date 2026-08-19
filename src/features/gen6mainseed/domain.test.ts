import { describe, expect, it } from "vitest";
import {
  decodeGen6MainSeedResults,
  encodeGen6MainSeedRequest,
  formatGen6MainSeedHex,
  gen6MainSeedChunkAt,
  gen6MainSeedChunkCount,
  parseGen6MainSeedHex,
  validateGen6MainSeedRequest,
  type Gen6MainSeedOneWildRequest,
  type Gen6MainSeedTwoWildRequest,
} from "./domain";

const twoWilds: Gen6MainSeedTwoWildRequest = {
  mode: "two-wilds",
  startSeed: 0,
  endSeed: 0xffff_ffff,
  firstIvs: [29, 14, 5, 24, 8, 13],
  firstMinFrame: 250,
  firstMaxFrame: 600,
  secondIvs: [0, 14, 26, 17, 3, 26],
  secondMinFrame: 2_000,
  secondMaxFrame: 5_000,
};

const oneWild: Gen6MainSeedOneWildRequest = {
  mode: "one-wild-range",
  startSeed: 0,
  endSeed: 0x1000_0000,
  lowerIvs: [29, 14, 4, 24, 7, 13],
  upperIvs: [29, 14, 5, 24, 8, 13],
  minFrame: 250,
  maxFrame: 600,
  nature: 0,
};

describe("Gen VI Main Seed Finder domain", () => {
  it("accepts the upstream defaults and enforces cross-field limits", () => {
    expect(validateGen6MainSeedRequest(twoWilds)).toBe(twoWilds);
    expect(validateGen6MainSeedRequest(oneWild)).toBe(oneWild);
    expect(() =>
      validateGen6MainSeedRequest({
        ...twoWilds,
        firstMaxFrame: 2_001,
      }),
    ).toThrow(/Frame ranges/);
    expect(() =>
      validateGen6MainSeedRequest({
        ...oneWild,
        upperIvs: [29, 17, 5, 24, 8, 13],
      }),
    ).toThrow(/lower IV plus 2/);
    expect(() =>
      validateGen6MainSeedRequest({
        ...oneWild,
        endSeed: 0x1000_0001,
      }),
    ).toThrow(/0x10000000/);
  });

  it("derives inclusive chunks without materializing the full Seed range", () => {
    expect(gen6MainSeedChunkCount(twoWilds, 0x4000_0000)).toBe(4);
    expect(gen6MainSeedChunkAt(twoWilds, 3, 0x4000_0000)).toEqual({
      index: 3,
      startSeed: 0xc000_0000,
      endSeed: 0xffff_ffff,
    });
  });

  it("packs the 22-word request and decodes fixed-width results", () => {
    const chunk = gen6MainSeedChunkAt(oneWild, 0, 16);
    expect([...encodeGen6MainSeedRequest(oneWild, chunk)]).toEqual([
      1, 0, 0x1000_0000, 0, 15, 250, 600, 0, 0, 0, 29, 14, 4, 24, 7, 13, 29, 14,
      5, 24, 8, 13,
    ]);
    const nonZeroChunk = gen6MainSeedChunkAt(oneWild, 2, 16);
    expect([
      ...encodeGen6MainSeedRequest(oneWild, nonZeroChunk).slice(0, 5),
    ]).toEqual([1, 0, 0x1000_0000, 32, 47]);
    expect(
      decodeGen6MainSeedResults(
        Uint32Array.from([1, 250, 3, 0, 0, 127]).buffer,
      ),
    ).toEqual([
      {
        seed: 1,
        frame1: 250,
        nature1: 3,
        frame2: 0,
        nature2: 0,
        gender: 127,
      },
    ]);
  });

  it("matches the upstream empty Seed and uppercase display behavior", () => {
    expect(parseGen6MainSeedHex("")).toBe(0);
    expect(formatGen6MainSeedHex(0x12ab)).toBe("000012AB");
  });
});
