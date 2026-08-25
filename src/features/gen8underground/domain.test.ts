import { describe, expect, it } from "vitest";
import { getGen8UndergroundSpecies } from "./data";
import {
  decodeGen8UndergroundResults,
  encodeGen8UndergroundRequest,
  GEN8_UNDERGROUND_REQUEST_WORDS,
  normalizeGen8UndergroundSeed,
  splitGen8UndergroundRequest,
  validateGen8UndergroundRequest,
  validateGen8UndergroundResult,
  type Gen8UndergroundRequest,
} from "./domain";

function request(): Gen8UndergroundRequest {
  return {
    profile: { version: "brilliantdiamond", tid: 12345, sid: 54321 },
    seed0: "1234567887654321",
    seed1: "8765432112345678",
    initialAdvances: 0,
    maxAdvances: 9,
    offset: 0,
    lead: 255,
    diglett: false,
    storyFlag: 1,
    levelFlag: 0,
    location: 2,
    filters: {
      disabled: true,
      shiny: "any",
      gender: "any",
      ability: "any",
      natureMask: 0x1ff_ffff,
      hiddenPowerMask: 0xffff,
      heightMin: 0,
      heightMax: 255,
      weightMin: 0,
      weightMax: 255,
      ivMin: [0, 0, 0, 0, 0, 0],
      ivMax: [31, 31, 31, 31, 31, 31],
      perfectIvValue: 31,
      perfectIvCount: 0,
      species: getGen8UndergroundSpecies("brilliantdiamond", 2, 1),
    },
    resultLimit: 100_000,
  };
}

function packBytes(values: readonly number[], offset: number) {
  return values
    .slice(offset, offset + 4)
    .reduce((word, value, index) => word | (value << (index * 8)), 0);
}

function packStats(values: readonly number[], offset: number) {
  return values[offset] | (values[offset + 1] << 16);
}

describe("Gen 8 Underground domain", () => {
  it("normalizes seeds and packs the fixed-width request", () => {
    expect(normalizeGen8UndergroundSeed("abc")).toBe("0000000000000ABC");
    const value = request();
    const packed = encodeGen8UndergroundRequest(value, {
      index: 0,
      start: 0,
      count: 10,
    });
    expect(packed).toHaveLength(GEN8_UNDERGROUND_REQUEST_WORDS);
    expect(Array.from(packed.slice(4, 20))).toEqual([
      0, 0, 10, 12345, 54321, 0, 1, 2, 0, 0, 255, 1, 255, 255, 255, 0x1ff_ffff,
    ]);
    for (const species of value.filters.species) {
      expect(
        packed[38 + Math.floor(species / 32)] & (1 << (species % 32)),
      ).not.toBe(0);
    }
  });

  it("uses inclusive Max Advances and deterministic chunks", () => {
    const chunks = splitGen8UndergroundRequest(request(), 2, 3);
    expect(chunks.reduce((sum, chunk) => sum + chunk.count, 0)).toBe(10);
    expect(chunks.map((chunk) => chunk.start)).toEqual([0, 3, 6, 8, 9]);
  });

  it("allows an empty species selection and rejects invalid ranges", () => {
    const empty = request();
    empty.filters.disabled = false;
    empty.filters.species = [];
    expect(validateGen8UndergroundRequest(empty)).toBe(empty);

    const overflow = request();
    overflow.initialAdvances = 0xffff_ffff;
    overflow.maxAdvances = 1;
    expect(() => validateGen8UndergroundRequest(overflow)).toThrow(/exceeds/);

    const unavailable = request();
    unavailable.filters.species = [493];
    expect(() => validateGen8UndergroundRequest(unavailable)).toThrow(
      /species/,
    );
  });

  it("decodes and validates a packed upstream encounter", () => {
    const value = request();
    const ivs = [28, 1, 23, 10, 31, 20];
    const stats = [50, 34, 31, 39, 34, 31];
    const metadata = 198 | (17 << 10) | (1 << 19) | (18 << 21);
    const words = Uint32Array.from([
      0,
      2173469342,
      3329595061,
      413,
      metadata,
      packBytes(ivs, 0),
      packBytes(ivs, 4),
      26,
      packStats(stats, 0),
      packStats(stats, 2),
      packStats(stats, 4),
      14 | (210 << 8) | (20 << 16),
    ]);
    const result = decodeGen8UndergroundResults(words.buffer)[0];
    expect(result).toMatchObject({
      advances: 0,
      eggMove: 413,
      item: 0,
      species: 198,
      level: 17,
      ec: "818C829E",
      pid: "C67596B5",
      nature: 18,
      ivs,
      stats,
    });
    expect(validateGen8UndergroundResult(value, result)).toBe(result);
  });
});
