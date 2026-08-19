import { describe, expect, it } from "vitest";
import {
  decodeGen6MtSeedResults,
  encodeGen6MtSeedRequest,
  GEN6_MT_SEED_REQUEST_WORDS,
  GEN6_MT_SEED_RESULT_WORDS,
  validateGen6MtSeedRequest,
  type Gen6MtSeedRequest,
} from "./domain";

const request: Gen6MtSeedRequest = {
  mode: "ivs",
  startSeed: 0,
  endSeed: 1,
  minFrame: 1,
  maxFrame: 100,
  desiredPid: 0,
  tsv: 0,
  trv: 0,
  shinyType: 0,
  perfectIvs: 3,
  ivMode: "perfect",
  specificIvMask: 0,
  natureMask: 0x1ff_ffff,
  minIvs: [0, 0, 0, 0, 0, 0],
  maxIvs: [31, 31, 31, 31, 31, 31],
  abilityLocked: false,
  possibleHa: false,
  niceEc: false,
  hordeShinies: 4,
  anyTsv: true,
  fast: true,
  showUnown: false,
  resultLimit: 100,
};

describe("Gen VI MT Seed domain", () => {
  it("packs the TinyFinder search controls into the fixed ABI", () => {
    expect(encodeGen6MtSeedRequest(request)).toHaveLength(
      GEN6_MT_SEED_REQUEST_WORDS,
    );
  });

  it("rejects inverted IV ranges and oversized horde searches", () => {
    expect(() =>
      validateGen6MtSeedRequest({
        ...request,
        minIvs: [0, 31, 0, 0, 0, 0],
        maxIvs: [0, 30, 31, 31, 31, 31],
      }),
    ).toThrow("Maximum IV");
    expect(() =>
      validateGen6MtSeedRequest({
        ...request,
        mode: "horde",
        endSeed: 5_000_000,
      }),
    ).toThrow("budget");
  });

  it("decodes the fixed 32-word result shape", () => {
    const words = new Uint32Array(GEN6_MT_SEED_RESULT_WORDS);
    words[0] = 0xabcd;
    words[5] = 31;
    words[11] = 30;
    words[22] = 7;
    expect(decodeGen6MtSeedResults(words.buffer)[0]).toMatchObject({
      seed: 0xabcd,
      ivs: [31, 0, 0, 0, 0, 0],
      ivs2: [30, 0, 0, 0, 0, 0],
      hordeJumps: [7, 0, 0, 0, 0],
    });
  });
});
