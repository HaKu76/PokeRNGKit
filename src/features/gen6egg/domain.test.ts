import { describe, expect, it } from "vitest";
import {
  decodeGen6EggResults,
  encodeGen6EggRequest,
  gen6EggResultPassesFilters,
  type Gen6EggRequest,
} from "./domain";

const request: Gen6EggRequest = {
  mainSeed: 0x12345678,
  minFrame: 0,
  maxFrame: 31,
  key0: 0x11111111,
  key1: 0x22222222,
  tsv: 0,
  trv: 0,
  genderRatio: "one-to-one",
  maleIvs: [31, 30, 29, 28, 27, 26],
  femaleIvs: [1, 2, 3, 4, 5, 6],
  maleAbility: 0,
  femaleAbility: 0,
  maleDitto: false,
  femaleDitto: false,
  maleItem: "destiny-knot",
  femaleItem: "everstone",
  nidoType: false,
  shinyCharm: false,
  masudaMethod: false,
  considerOtherTsv: false,
  acceptEgg: true,
  otherTsvs: [],
  filters: {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    natureInheritance: "any",
  },
  resultLimit: 100,
};

describe("Gen VI Egg domain", () => {
  it("encodes the fixed request layout", () => {
    const words = encodeGen6EggRequest(request);
    expect(words.length).toBe(154);
    expect([...words.slice(0, 12)]).toEqual([
      0x12345678, 0, 32, 0x11111111, 0x22222222, 0, 0, 126, 2, 1, 0, 48,
    ]);
  });
  it("decodes a result and applies filters", () => {
    const words = new Uint32Array(20);
    words[0] = 4;
    words[1] = 0xabcdef01;
    words[2] = 0x11111111;
    words[3] = 0x22222222;
    words[4] = 0x12345678;
    words[5] = 0x00010000;
    words[6] = 31;
    words[7] = 30;
    words[8] = 29;
    words[9] = 28;
    words[10] = 27;
    words[11] = 26;
    words[12] = 7 | (1 << 5) | (1 << 8);
    words[13] = 1;
    words[16] = 3;
    const [result] = decodeGen6EggResults(words.buffer);
    expect(result).toMatchObject({
      frame: 4,
      current: false,
      nature: 7,
      ability: 1,
      gender: 1,
    });
    expect(gen6EggResultPassesFilters(request, result)).toBe(true);
  });
  it("rejects inverted IV filters", () =>
    expect(() =>
      encodeGen6EggRequest({
        ...request,
        filters: {
          ...request.filters,
          ivMin: [31, 0, 0, 0, 0, 0],
          ivMax: [0, 31, 31, 31, 31, 31],
        },
      }),
    ).toThrow(/minimum exceeds maximum/));
});
