import { describe, expect, it } from "vitest";
import {
  countGen5IdKeypresses,
  formatGen5IdButtons,
  gen5IdCandidateCount,
  gen5IdEvaluationCount,
  gen5IdTaskEvaluationCount,
  gen5IdUnitCount,
  splitGen5IdRequest,
  validateGen5IdRequest,
  validateGen5IdResult,
  type Gen5IdProfile,
  type Gen5IdResult,
  type Gen5IdSearchRequest,
  type Gen5IdSeedFinderRequest,
} from "./domain";

const profile: Gen5IdProfile = {
  version: "black",
  language: "english",
  dsType: "ds",
  mac: "09BFC097CE56",
  vcount: 0x2e,
  timer0Min: 0x608,
  timer0Max: 0x608,
  gxstat: 6,
  vframe: 5,
  keypresses: [true, true, true, true, true, true, true, true, true],
  skipLR: false,
};

const noButtonProfile: Gen5IdProfile = {
  ...profile,
  keypresses: [true, false, false, false, false, false, false, false, false],
};

function searchRequest(
  overrides: Partial<Gen5IdSearchRequest> = {},
): Gen5IdSearchRequest {
  return {
    mode: "search",
    profile,
    startDate: "2000-01-01",
    endDate: "2000-01-01",
    pid: 0,
    usePID: false,
    useXOR: false,
    tid: 0,
    useTID: false,
    sid: 0,
    useSID: false,
    maxAdvances: 100,
    resultLimit: 100_000,
    ...overrides,
  };
}

function finderRequest(
  overrides: Partial<Gen5IdSeedFinderRequest> = {},
): Gen5IdSeedFinderRequest {
  return {
    mode: "seedFinder",
    profile,
    date: "2000-01-01",
    hour: 0,
    minute: 0,
    minSecond: 0,
    maxSecond: 59,
    tid: 18185,
    maxAdvances: 100,
    resultLimit: 100_000,
    ...overrides,
  };
}

describe("Gen 5 ID domain", () => {
  it("matches PokeFinder keypress combination rules", () => {
    expect(countGen5IdKeypresses(profile)).toBe(2144);
    expect(countGen5IdKeypresses({ ...profile, skipLR: true })).toBe(576);
    expect(formatGen5IdButtons(0)).toBe("None");
    expect(formatGen5IdButtons(0x411)).toBe("R + A + Up");
  });

  it("counts search and seed-finder candidates", () => {
    expect(gen5IdUnitCount(searchRequest())).toBe(2144);
    expect(gen5IdCandidateCount(searchRequest())).toBe(185_241_600);
    expect(gen5IdEvaluationCount(searchRequest())).toBe(18_709_401_600n);
    expect(gen5IdTaskEvaluationCount(searchRequest())).toBe(100_000n);
    expect(gen5IdUnitCount(finderRequest())).toBe(2144);
    expect(gen5IdCandidateCount(finderRequest())).toBe(128_640);
    expect(gen5IdEvaluationCount(finderRequest())).toBe(12_992_640n);
  });

  it("accepts the exact upstream numeric boundaries", () => {
    expect(() =>
      validateGen5IdRequest(
        finderRequest({
          hour: 23,
          minute: 59,
          minSecond: 59,
          maxSecond: 0,
          tid: 0xffff,
          maxAdvances: 0xffff_ffff,
          resultLimit: 100_000,
        }),
      ),
    ).not.toThrow();
  });

  it("rejects the upstream date error and browser-sized overflows", () => {
    expect(() =>
      validateGen5IdRequest(
        searchRequest({ startDate: "2000-01-02", endDate: "2000-01-01" }),
      ),
    ).toThrow("Start date is after end date");
    expect(
      gen5IdCandidateCount(finderRequest({ minSecond: 30, maxSecond: 20 })),
    ).toBe(0);
    expect(() => validateGen5IdRequest(searchRequest())).not.toThrow();
    expect(() =>
      validateGen5IdRequest(
        searchRequest({ endDate: "2000-01-02", useTID: true }),
      ),
    ).toThrow("browser task limit");
    expect(() =>
      validateGen5IdRequest(searchRequest({ useXOR: true })),
    ).toThrow("requires PID");
    expect(() =>
      validateGen5IdRequest(
        finderRequest({
          profile: noButtonProfile,
          minSecond: 0,
          maxSecond: 0,
          maxAdvances: 249_999_999,
        }),
      ),
    ).not.toThrow();
    expect(() =>
      validateGen5IdRequest(
        finderRequest({
          profile: noButtonProfile,
          minSecond: 0,
          maxSecond: 0,
          maxAdvances: 250_000_000,
        }),
      ),
    ).toThrow("browser task limit");
  });

  it("rejects decoded results with inconsistent semantics or advance overflow", () => {
    const request = searchRequest({ profile: noButtonProfile });
    const result: Gen5IdResult = {
      seed: "0000000000000000",
      initialAdvances: 25,
      advances: 25,
      tid: 18185,
      sid: 39382,
      tsv: 7131,
      dateTime: "2000-01-01 00:00:00",
      timer0: 0x608,
      buttonMask: 0,
    };
    expect(validateGen5IdResult(request, result)).toBe(result);
    expect(() => validateGen5IdResult(request, { ...result, tsv: 0 })).toThrow(
      "invalid ID values",
    );
    expect(() =>
      validateGen5IdResult(request, {
        ...result,
        initialAdvances: 0xffff_fff0,
        advances: 0xffff_fff0,
      }),
    ).toThrow("invalid advances");
    expect(() =>
      validateGen5IdResult(request, { ...result, buttonMask: 0xc00 }),
    ).toThrow("invalid profile values");
  });

  it("splits every unit once in deterministic order", () => {
    const fewKeys: Gen5IdProfile = {
      ...profile,
      keypresses: [true, true, false, false, false, false, false, false, false],
    };
    const request = searchRequest({ profile: fewKeys, maxAdvances: 0 });
    const chunks = splitGen5IdRequest(request, 2);
    expect(chunks).toHaveLength(8);
    expect(chunks[0].startUnit).toBe(0);
    for (let index = 1; index < chunks.length; index += 1) {
      expect(chunks[index].startUnit).toBe(
        chunks[index - 1].startUnit + chunks[index - 1].unitCount,
      );
    }
    const last = chunks.at(-1)!;
    expect(last.startUnit + last.unitCount).toBe(gen5IdUnitCount(request));
  });
});
