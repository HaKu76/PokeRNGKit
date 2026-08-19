import { describe, expect, it } from "vitest";
import { GEN6_STATIONARY_TEMPLATES } from "./data";
import { gen6StationaryDefaultFilters } from "./domain";
import {
  decodeGen6StationaryTimeResults,
  gen6StationaryTimeEpochFromInput,
  gen6StationaryTimeTaskCount,
  validateGen6StationaryTimeRequest,
  type Gen6StationaryTimeRequest,
} from "./timeDomain";

const template = GEN6_STATIONARY_TEMPLATES.find((entry) => !entry.conceptual)!;
const request: Gen6StationaryTimeRequest = {
  version: template.versions[0],
  seed: 0,
  startEpoch: gen6StationaryTimeEpochFromInput("2000-01-01T00:00:00") as bigint,
  endEpoch: gen6StationaryTimeEpochFromInput("2000-01-01T00:00:01") as bigint,
  saveVariable: 1,
  timeVariable: 2,
  minFrame: 0,
  maxFrame: 2,
  delay: 0,
  considerDelay: true,
  tsv: 0,
  trv: 0,
  shinyCharm: false,
  syncNature: null,
  assumeSync: false,
  template,
  bankTarget: 1,
  bankGenderList: "",
  filters: gen6StationaryDefaultFilters(),
  resultLimit: 100,
};

describe("Gen VI Stationary Time Finder domain", () => {
  it("converts the upstream date range to Citra epoch milliseconds", () => {
    expect(request.startEpoch).toBe(0n);
    expect(request.endEpoch).toBe(1000n);
    expect(validateGen6StationaryTimeRequest(request)).toBe(request);
    expect(gen6StationaryTimeTaskCount(request)).toBe(6);
  });

  it("rejects a reversed range and oversized browser workload", () => {
    expect(() =>
      validateGen6StationaryTimeRequest({ ...request, endEpoch: -1000n }),
    ).toThrow();
    expect(() =>
      validateGen6StationaryTimeRequest({
        ...request,
        endEpoch: 5_000_000_000n,
      }),
    ).toThrow();
  });

  it("decodes the initial seed and epoch after the stationary words", () => {
    const words = new Uint32Array(19);
    words[16] = 0x1234_5678;
    words[17] = 1000;
    expect(decodeGen6StationaryTimeResults(words.buffer)[0]).toMatchObject({
      initialSeed: 0x1234_5678,
      epoch: 1000n,
      frame: 0,
    });
  });
});
