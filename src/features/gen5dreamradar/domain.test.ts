import { describe, expect, it } from "vitest";
import {
  GEN5_DREAM_RADAR_MAX_EVALUATIONS,
  allowedGen5DreamRadarGenders,
  countGen5DreamRadarKeypresses,
  gen5DreamRadarCharacteristic,
  gen5DreamRadarEvaluationCount,
  gen5DreamRadarSearcherSeedCount,
  gen5DreamRadarTaskCount,
  splitGen5DreamRadarRequest,
  validateGen5DreamRadarRequest,
  validateGen5DreamRadarResult,
  type Gen5DreamRadarGeneratorRequest,
  type Gen5DreamRadarSearcherRequest,
} from "./domain";

const profile = {
  version: "black2" as const,
  language: "english" as const,
  dsType: "ds" as const,
  tid: 12345,
  sid: 54321,
  mac: "001122334455",
  vcount: 0x82,
  timer0Min: 0x1100,
  timer0Max: 0x1100,
  gxstat: 6,
  vframe: 8,
  keypresses: [
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ] as [
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
  ],
  skipLR: false,
  memoryLink: false,
};

const filters = {
  disabled: false,
  ivMin: [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number],
  ivMax: [31, 31, 31, 31, 31, 31] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ],
  natureMask: 0x1ff_ffff,
  hiddenPowerMask: 0xffff,
  perfectIvValue: 31,
  perfectIvCount: 0,
};

const generator: Gen5DreamRadarGeneratorRequest = {
  mode: "generator",
  profile,
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 9,
  badges: 0,
  slots: [{ encounter: 1, gender: 2 }],
  filters,
  resultLimit: 100_000,
};

const searcher: Gen5DreamRadarSearcherRequest = {
  ...generator,
  mode: "searcher",
  startDate: "2026-08-14",
  endDate: "2026-08-14",
};

describe("Gen 5 Dream Radar domain", () => {
  it("matches the upstream slot and gender restrictions", () => {
    expect(allowedGen5DreamRadarGenders(0)).toEqual([0, 1]);
    expect(allowedGen5DreamRadarGenders(1)).toEqual([2]);
    expect(allowedGen5DreamRadarGenders(7)).toEqual([1]);
    expect(allowedGen5DreamRadarGenders(8)).toEqual([2]);
    expect(allowedGen5DreamRadarGenders(23)).toEqual([0]);
    expect(() =>
      validateGen5DreamRadarRequest({
        ...generator,
        slots: [
          { encounter: 1, gender: 2 },
          { encounter: 23, gender: 0 },
        ],
      }),
    ).toThrow(/Slot 1/);
  });

  it("preserves the full Qt integer ranges and rejects cross-field overflow", () => {
    expect(() =>
      validateGen5DreamRadarRequest({ ...generator, seed: "" }),
    ).not.toThrow();
    expect(() =>
      validateGen5DreamRadarRequest({
        ...generator,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toThrow(/exceeds/);
    expect(() =>
      validateGen5DreamRadarRequest({ ...generator, badges: 9 }),
    ).toThrow(/Badges/);
    expect(() =>
      validateGen5DreamRadarRequest({
        ...generator,
        filters: { ...filters, ivMin: [0, 0, 0, 0, 0, 32] },
      }),
    ).toThrow(/IV range/);
  });

  it("counts Searcher5 candidates and caps pass-all work by the result limit", () => {
    expect(countGen5DreamRadarKeypresses(profile)).toBe(1);
    expect(gen5DreamRadarSearcherSeedCount(searcher)).toBe(86_400n);
    expect(gen5DreamRadarTaskCount(searcher)).toBe(10_000n);
    expect(gen5DreamRadarEvaluationCount(searcher)).toBe(100_000n);
    const selective = {
      ...searcher,
      filters: {
        ...filters,
        ivMin: [31, 31, 31, 31, 31, 31] as [
          number,
          number,
          number,
          number,
          number,
          number,
        ],
      },
    };
    expect(gen5DreamRadarTaskCount(selective)).toBe(86_400n);
    expect(gen5DreamRadarEvaluationCount(selective)).toBe(864_000n);
  });

  it("enforces the browser evaluation limit before creating Workers", () => {
    const request: Gen5DreamRadarSearcherRequest = {
      ...searcher,
      maxAdvances: 0xffff,
      filters: { ...filters, ivMin: [31, 31, 31, 31, 31, 31] },
    };
    expect(gen5DreamRadarEvaluationCount(request)).toBeGreaterThan(
      GEN5_DREAM_RADAR_MAX_EVALUATIONS,
    );
    expect(() => validateGen5DreamRadarRequest(request)).toThrow(/task limit/);
  });

  it("splits deterministic contiguous ranges", () => {
    const chunks = splitGen5DreamRadarRequest(generator, 3);
    expect(chunks).toHaveLength(10);
    expect(chunks.map(({ start, count }) => [start, count])).toEqual(
      Array.from({ length: 10 }, (_, index) => [index, 1]),
    );
  });

  it("validates derived result fields and selected-slot semantics", () => {
    const ivs = [19, 20, 12, 14, 9, 28] as const;
    const pid = 1_689_394_930;
    expect(
      validateGen5DreamRadarResult(generator, {
        seed: "0000000000000000",
        advances: 0,
        needle: 4,
        pid: pid.toString(16).toUpperCase().padStart(8, "0"),
        ability: 2,
        abilityIndex: 148,
        ivs: [...ivs],
        level: 5,
        nature: 1,
        gender: 2,
        hiddenPower: 7,
        hiddenPowerStrength: 40,
        characteristic: gen5DreamRadarCharacteristic(pid, [...ivs]),
      }).pid,
    ).toBe("64B21EF2");
  });
});
