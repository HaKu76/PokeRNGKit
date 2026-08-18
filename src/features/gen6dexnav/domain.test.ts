import { describe, expect, it } from "vitest";
import {
  decodeGen6DexNavResults,
  encodeGen6DexNavRequest,
  GEN6_DEXNAV_REQUEST_WORDS,
  validateGen6DexNavRequest,
  type Gen6DexNavRequest,
} from "./domain";
const slots = Array.from({ length: 13 }, () => ({ species: 261, level: 5 }));
const request: Gen6DexNavRequest = {
  tinySeed: 0x12345678,
  minFrame: 0,
  maxFrame: 31,
  tinyFrame: 0,
  encounterType: "grass",
  activeSearch: true,
  hasDexNav: true,
  searchLevel: 100,
  chainLength: 0,
  shinyCharm: false,
  compoundEyes: false,
  forcedShiny: false,
  navHa: false,
  navUnown: false,
  potential: 0,
  flute: 0,
  tsv: 0,
  trv: 0,
  slots,
  resultLimit: 100,
};
describe("Gen VI DexNav domain", () => {
  it("encodes the fixed request contract", () => {
    const encoded = encodeGen6DexNavRequest(request);
    expect(encoded).toHaveLength(GEN6_DEXNAV_REQUEST_WORDS);
    expect(encoded[0]).toBe(0x12345678);
    expect(encoded[44]).toBe(100);
  });
  it("decodes coordinates and flags", () => {
    const words = new Uint32Array(16);
    words[0] = 7;
    words[2] = 0xfff8 | (0x0007 << 16);
    words[3] = 2 | (3 << 8);
    words[5] = 31;
    words[6] = 201;
    words[7] = 30;
    words[8] = 5 | (3 << 8) | (1 << 16);
    const [result] = decodeGen6DexNavResults(words.buffer);
    expect(result).toMatchObject({
      frame: 7,
      x: -8,
      y: 7,
      slot: 2,
      slotType: 3,
      species: 201,
      potential: 3,
      forcedShiny: true,
    });
  });
  it("rejects browser ranges over five million", () => {
    expect(() =>
      validateGen6DexNavRequest({ ...request, maxFrame: 5_000_001 }),
    ).toThrow(/5000000/);
  });
});
