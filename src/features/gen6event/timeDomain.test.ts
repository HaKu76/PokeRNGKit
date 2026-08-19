import { describe, expect, it } from "vitest";
import { gen6EventDefaultSettings } from "./domain";
import {
  gen6EventTimeEpochFromInput,
  gen6EventTimeTaskCount,
  validateGen6EventTimeRequest,
  type Gen6EventTimeRequest,
} from "./timeDomain";

const request: Gen6EventTimeRequest = {
  version: "omega-ruby",
  seed: 0,
  startEpoch: 0n,
  endEpoch: 1000n,
  saveVariable: 1,
  timeVariable: 2,
  minFrame: 0,
  maxFrame: 2,
  tsv: 0,
  trv: 0,
  delay: 0,
  considerDelay: false,
  event: gen6EventDefaultSettings(25, 0),
  filters: {
    disabled: true,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  },
  resultLimit: 100,
};
describe("Gen VI Event Time Finder domain", () => {
  it("uses the 2000 Citra epoch and counts timestamp/frame states", () => {
    expect(gen6EventTimeEpochFromInput("2000-01-01T00:00:00")).toBe(0n);
    expect(validateGen6EventTimeRequest(request)).toBe(request);
    expect(gen6EventTimeTaskCount(request)).toBe(6);
  });
  it("rejects an invalid or oversized range", () => {
    expect(() =>
      validateGen6EventTimeRequest({ ...request, endEpoch: -1000n }),
    ).toThrow();
    expect(() =>
      validateGen6EventTimeRequest({ ...request, endEpoch: 5_000_000_000n }),
    ).toThrow();
  });
});
