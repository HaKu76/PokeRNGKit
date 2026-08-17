import { describe, expect, it } from "vitest";
import { GEN8_STATIC_CATEGORIES } from "./data";
import {
  decodeGen8StaticResults,
  encodeGen8StaticRequest,
  GEN8_STATIC_REQUEST_WORDS,
  normalizeGen8StaticSeed,
  splitGen8StaticRequest,
  validateGen8StaticRequest,
  validateGen8StaticResult,
  type Gen8StaticRequest,
} from "./domain";

function request(): Gen8StaticRequest {
  return {
    profile: { version: "brilliantdiamond", tid: 12345, sid: 54321 },
    seed0: "1234567887654321",
    seed1: "8765432112345678",
    initialAdvances: 0,
    maxAdvances: 9,
    offset: 0,
    lead: 255,
    template: GEN8_STATIC_CATEGORIES[0].templates[0],
    filters: {
      disabled: true,
      shiny: "any",
      gender: "any",
      ability: "any",
      natureMask: 0x1ff_ffff,
      heightMin: 0,
      heightMax: 255,
      weightMin: 0,
      weightMax: 255,
      ivMin: [0, 0, 0, 0, 0, 0],
      ivMax: [31, 31, 31, 31, 31, 31],
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

describe("Gen 8 Static domain", () => {
  it("normalizes 64-bit seeds and packs the fixed-width request", () => {
    expect(normalizeGen8StaticSeed("abc")).toBe("0000000000000ABC");
    const packed = encodeGen8StaticRequest(request(), {
      index: 0,
      start: 0,
      count: 10,
    });
    expect(packed).toHaveLength(GEN8_STATIC_REQUEST_WORDS);
    expect(Array.from(packed.slice(4, 19))).toEqual([
      0, 0, 0, 10, 12345, 54321, 387, 0, 0, 255, 0, 5, 0, 0, 255,
    ]);
  });

  it("uses inclusive Max Advances and deterministic chunks", () => {
    const chunks = splitGen8StaticRequest(request(), 2, 3);
    expect(chunks.reduce((sum, chunk) => sum + chunk.count, 0)).toBe(10);
    expect(chunks.map((chunk) => chunk.start)).toEqual([
      0, 2, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it("rejects zero seeds, overflow and version-incompatible templates", () => {
    expect(() =>
      validateGen8StaticRequest({ ...request(), seed0: "", seed1: "" }),
    ).toThrow("Please insert missing seed information");
    expect(() =>
      validateGen8StaticRequest({
        ...request(),
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toThrow("exceeds 4294967295");
    expect(() =>
      validateGen8StaticRequest({
        ...request(),
        profile: {
          version: "shiningpearl",
          tid: 12345,
          sid: 54321,
        },
        template: GEN8_STATIC_CATEGORIES[5].templates[2],
      }),
    ).toThrow("unavailable for this game");
  });

  it("decodes and validates the upstream Turtwig first state", () => {
    const ivs = [4, 23, 15, 30, 19, 26];
    const stats = [20, 12, 12, 11, 12, 8];
    const metadata = (22 << 4) | (20 << 11);
    const measures = 124 | (99 << 8);
    const words = Uint32Array.from([
      0,
      570639824,
      570642538,
      metadata,
      measures,
      packBytes(ivs, 0),
      packBytes(ivs, 4),
      65,
      packStats(stats, 0),
      packStats(stats, 2),
      packStats(stats, 4),
    ]);
    const result = decodeGen8StaticResults(words.buffer)[0];
    expect(result).toMatchObject({
      advances: 0,
      ec: "220345D0",
      pid: "2203506A",
      ability: 0,
      gender: 0,
      nature: 22,
      shiny: 0,
      characteristic: 20,
      height: 124,
      weight: 99,
      ivs,
      stats,
    });
    expect(validateGen8StaticResult(request(), result)).toBe(result);
  });
});
