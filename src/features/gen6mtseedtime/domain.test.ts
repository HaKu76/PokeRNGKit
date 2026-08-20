import { describe, expect, it } from "vitest";
import {
  decodeGen6MtSeedTimeResults,
  encodeGen6MtSeedTimeRequest,
  gen6MtSeedTimeEpochFromInput,
  GEN6_MT_SEED_TIME_REQUEST_WORDS,
  validateGen6MtSeedTimeRequest,
  type Gen6MtSeedTimeRequest,
} from "./domain";

const request: Gen6MtSeedTimeRequest = {
  mode: "time",
  game: "xy",
  frame300Seed: 0,
  currentSavePar: 0,
  targetSeed: 0,
  epoch: gen6MtSeedTimeEpochFromInput("2022-01-01", "00:00:00") as bigint,
  maxSeconds: 10,
  specificDate: true,
  resultLimit: 100,
};
describe("Gen VI MT Seed Time domain", () => {
  it("parses and packs whole-second RTC input", () => {
    expect(typeof request.epoch).toBe("bigint");
    expect(encodeGen6MtSeedTimeRequest(request)).toHaveLength(
      GEN6_MT_SEED_TIME_REQUEST_WORDS,
    );
  });
  it("rejects non-aligned timestamps and excessive searches", () => {
    expect(() =>
      validateGen6MtSeedTimeRequest({ ...request, epoch: 1n }),
    ).toThrow("whole seconds");
    expect(() =>
      validateGen6MtSeedTimeRequest({ ...request, maxSeconds: 5_000_001 }),
    ).toThrow("range");
  });
  it("decodes date, frame and save parameter fields", () => {
    const words = new Uint32Array(8);
    words[0] = 123;
    words[2] = 0xabcd;
    words[3] = 0xffff_ffff;
    words[4] = 99;
    expect(decodeGen6MtSeedTimeResults(words.buffer)[0]).toMatchObject({
      frame300Seed: 0xabcd,
      saveFrame: -1,
      savePar: 99,
      offsetSeconds: 0,
    });
  });
});
