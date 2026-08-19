import { describe, expect, it } from "vitest";
import {
  gen7StationaryEncounterFromTemplate,
  gen7StationaryTimeEpochFromInput,
  gen7StationaryTimeResultLimitReached,
  gen7StationaryTimeTaskCount,
  decodeGen7StationaryTimeResults,
  validateGen7StationaryTimeRequest,
  type Gen7StationaryTimeRequest,
} from "./domain";
import { GEN7_STATIONARY_TEMPLATES } from "./data";

const template = GEN7_STATIONARY_TEMPLATES.find(
  (entry) => entry.family === "usum" && entry.conceptual,
)!;

const request: Gen7StationaryTimeRequest = {
  version: "ultra-sun",
  startEpoch: gen7StationaryTimeEpochFromInput(
    "2024-01-01T00:00",
    55,
  ) as bigint,
  endEpoch: gen7StationaryTimeEpochFromInput("2024-01-01T00:00", 55) as bigint,
  tick: 0x041d_9cb9,
  offset: 55,
  minFrame: 478,
  maxFrame: 480,
  tsv: 0,
  trv: 0,
  shinyCharm: false,
  forcedShiny: false,
  syncNature: null,
  considerDelay: true,
  pelagoShift: 0,
  encounter: gen7StationaryEncounterFromTemplate(template),
  filters: {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
    blink: "any",
  },
  resultLimit: 100,
};

describe("Gen7 Stationary Time Finder", () => {
  it("converts local Citra time to a whole-second epoch", () => {
    expect(request.startEpoch).toBe(757382400055n);
  });

  it("counts one frame window per second", () => {
    expect(validateGen7StationaryTimeRequest(request)).toBe(request);
    expect(gen7StationaryTimeTaskCount(request)).toBe(3);
  });

  it("rejects a reversed or sub-second range", () => {
    expect(() =>
      validateGen7StationaryTimeRequest({
        ...request,
        endEpoch: request.startEpoch - 1000n,
      }),
    ).toThrow();
    expect(() =>
      validateGen7StationaryTimeRequest({
        ...request,
        startEpoch: request.startEpoch + 1n,
      }),
    ).toThrow();
  });

  it("rejects a total time and frame workload above the browser limit", () => {
    expect(() =>
      validateGen7StationaryTimeRequest({
        ...request,
        endEpoch: request.startEpoch + 5_000_000n * 1000n,
      }),
    ).toThrow();
  });

  it("reports a global result limit when later timestamps remain", () => {
    const rangedRequest = {
      ...request,
      endEpoch: request.startEpoch + 1000n,
      resultLimit: 3,
    };
    expect(
      gen7StationaryTimeResultLimitReached(
        rangedRequest,
        rangedRequest.startEpoch,
        3,
        false,
      ),
    ).toBe(true);
    expect(
      gen7StationaryTimeResultLimitReached(
        rangedRequest,
        rangedRequest.endEpoch,
        3,
        false,
      ),
    ).toBe(false);
  });

  it("decodes the stationary result with its initial seed and epoch", () => {
    const words = Uint32Array.from([
      478,
      0,
      0x89ab_cdef,
      0x0123_4567,
      0x1020_3040,
      0x5566_7788,
      31 | (31 << 5) | (31 << 10) | (31 << 15) | (31 << 20) | (31 << 25),
      7 | (1 << 5) | (2 << 7) | (15 << 9),
      12,
      0x8eab_05d2,
      Number(request.startEpoch & 0xffff_ffffn),
      Number(request.startEpoch >> 32n),
    ]);
    expect(decodeGen7StationaryTimeResults(words.buffer)[0]).toMatchObject({
      frame: 478,
      initialSeed: 0x8eab_05d2,
      epoch: request.startEpoch,
      random: 0x0123_4567_89ab_cdefn,
    });
  });
});
