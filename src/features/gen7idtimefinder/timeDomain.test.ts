import { describe, expect, it } from "vitest";
import {
  decodeGen7IdTimeResults,
  encodeGen7IdTimeResults,
  gen7IdTimeEpochFromInput,
  gen7IdTimeTaskCount,
  validateGen7IdTimeRequest,
  type Gen7IdTimeRequest,
  type Gen7IdTimeResult,
} from "./timeDomain";

const request: Gen7IdTimeRequest = {
  version: "ultra-sun",
  startEpoch: gen7IdTimeEpochFromInput("2024-01-01T00:00:00", 55) as bigint,
  endEpoch: gen7IdTimeEpochFromInput("2024-01-01T00:00:01", 55) as bigint,
  tick: 0x041d_9cb9,
  offset: 55,
  minFrame: 1132,
  maxFrame: 1134,
  correction: 0,
  filters: { mode: "none" },
  resultLimit: 100,
};

describe("Gen 7 ID Time Finder domain", () => {
  it("converts dates and counts ID frames per second", () => {
    expect(validateGen7IdTimeRequest(request)).toBe(request);
    expect(gen7IdTimeTaskCount(request)).toBe(6);
  });

  it("rejects dates that are not aligned with the profile offset", () => {
    expect(() =>
      validateGen7IdTimeRequest({
        ...request,
        endEpoch: request.endEpoch + 1n,
      }),
    ).toThrow();
  });

  it("round-trips the fixed ten-word result schema", () => {
    const result: Gen7IdTimeResult = {
      advances: 1132,
      rand64: 0x0123_4567_89ab_cdefn,
      tid: 12345,
      sid: 54321,
      tsv: 3870,
      trv: 8,
      g7tid: 321337,
      clock: 7,
      initialSeed: 0x8eab_05d2,
      epoch: request.startEpoch,
    };
    expect(
      decodeGen7IdTimeResults(encodeGen7IdTimeResults([result]).buffer)[0],
    ).toEqual(result);
  });
});
