import { describe, expect, it } from "vitest";
import { gen7EventDefaultSettings } from "./domain";
import {
  decodeGen7EventTimeResults,
  encodeGen7EventTimeRequest,
  gen7EventTimeEpochFromInput,
  gen7EventTimeResultLimitReached,
  gen7EventTimeTaskCount,
  validateGen7EventTimeRequest,
  type Gen7EventTimeRequest,
} from "./timeDomain";

const request: Gen7EventTimeRequest = {
  version: "ultra-sun",
  startEpoch: gen7EventTimeEpochFromInput("2024-01-01T00:00:00", 55) as bigint,
  endEpoch: gen7EventTimeEpochFromInput("2024-01-01T00:00:00", 55) as bigint,
  tick: 0x041d_9cb9,
  offset: 55,
  minFrame: 478,
  maxFrame: 480,
  profileTid: 0,
  profileSid: 0,
  event: gen7EventDefaultSettings("ultra-sun"),
  filters: {
    disabled: true,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
  resultLimit: 100,
};

describe("Gen7 Event Time Finder domain", () => {
  it("counts one Event frame window per whole second", () => {
    expect(validateGen7EventTimeRequest(request)).toBe(request);
    expect(gen7EventTimeTaskCount(request)).toBe(3);
  });

  it("rejects invalid dates and browser workloads", () => {
    expect(() =>
      validateGen7EventTimeRequest({
        ...request,
        endEpoch: request.startEpoch - 1000n,
      }),
    ).toThrow();
    expect(() =>
      validateGen7EventTimeRequest({
        ...request,
        startEpoch: request.startEpoch + 1n,
      }),
    ).toThrow();
    expect(() =>
      validateGen7EventTimeRequest({
        ...request,
        endEpoch: request.startEpoch + 5_000_000n * 1000n,
      }),
    ).toThrow();
  });

  it("packs the independent Event Time Finder ABI", () => {
    const words = encodeGen7EventTimeRequest(request, 0x8eab_05d2);
    expect(words).toHaveLength(45);
    expect(words[0]).toBe(0x8eab_05d2);
    expect(words[1]).toBe(478);
    expect(words[2]).toBe(480);
    expect(words[3]).toBe(2);
    expect(words[44]).toBe(100);
  });

  it("decodes the upstream sixteen-column result payload", () => {
    const ivs =
      31 | (30 << 5) | (29 << 10) | (28 << 15) | (27 << 20) | (26 << 25);
    const metadata = 12 | (2 << 5) | (1 << 7) | (15 << 9) | (1 << 14);
    const words = Uint32Array.from([
      478,
      0x1234_5678,
      0x89ab_cdef,
      ivs,
      metadata,
      0x8eab_05d2,
      Number(request.startEpoch & 0xffff_ffffn),
      Number(request.startEpoch >> 32n),
    ]);
    expect(decodeGen7EventTimeResults(words.buffer)[0]).toMatchObject({
      frame: 478,
      ec: 0x1234_5678,
      pid: 0x89ab_cdef,
      ivs: [31, 30, 29, 28, 27, 26],
      nature: 12,
      ability: 2,
      gender: 1,
      hiddenPower: 15,
      shiny: 2,
      initialSeed: 0x8eab_05d2,
      epoch: request.startEpoch,
    });
  });

  it("reports a global result limit when later timestamps remain", () => {
    const ranged = {
      ...request,
      endEpoch: request.startEpoch + 1000n,
      resultLimit: 3,
    };
    expect(
      gen7EventTimeResultLimitReached(ranged, ranged.startEpoch, 3, false),
    ).toBe(true);
    expect(
      gen7EventTimeResultLimitReached(ranged, ranged.endEpoch, 3, false),
    ).toBe(false);
  });
});
