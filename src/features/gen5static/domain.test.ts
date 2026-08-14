import { describe, expect, it } from "vitest";
import {
  GEN5_STATIC_MAX_EVALUATIONS,
  gen5StaticCategoriesForVersion,
  gen5StaticCharacteristic,
  gen5StaticEvaluationCount,
  gen5StaticSearcherSeedCount,
  splitGen5StaticRequest,
  validateGen5StaticRequest,
  validateGen5StaticResult,
  type Gen5StaticGeneratorRequest,
  type Gen5StaticSearcherRequest,
} from "./domain";
import { gen5StaticTemplatesForVersion } from "./encounters";

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
  shinyCharm: true,
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
  ability: 255 as const,
  gender: 255 as const,
  shiny: 255 as const,
};

const template = gen5StaticTemplatesForVersion("starters", "black2")[0];

const generator: Gen5StaticGeneratorRequest = {
  mode: "generator",
  profile,
  template,
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 9,
  offset: 0,
  initialIvAdvances: 0,
  maxIvAdvances: 0,
  lead: { type: "none" },
  luckyPower: "none",
  filters,
  resultLimit: 100_000,
  cache: null,
};

const searcher: Gen5StaticSearcherRequest = {
  ...generator,
  mode: "searcher",
  startDate: "2026-08-14",
  endDate: "2026-08-14",
  maxAdvances: 0,
};

describe("Gen 5 Static domain", () => {
  it("exposes the version-specific encounter categories", () => {
    expect(gen5StaticCategoriesForVersion("black")).toEqual([
      "starters",
      "fossils",
      "gifts",
      "stationary",
      "legends",
      "events",
      "roamers",
    ]);
    expect(gen5StaticCategoriesForVersion("black2")).toEqual([
      "starters",
      "fossils",
      "gifts",
      "stationary",
      "legends",
      "curtis",
      "yancy",
    ]);
  });

  it("preserves upstream u32 inputs and rejects cross-field overflow", () => {
    expect(() =>
      validateGen5StaticRequest({ ...generator, seed: "" }),
    ).not.toThrow();
    expect(() =>
      validateGen5StaticRequest({
        ...generator,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toThrow(/exceeds/);
    expect(() => validateGen5StaticRequest({ ...searcher, offset: 1 })).toThrow(
      /Offset/,
    );
    expect(() =>
      validateGen5StaticRequest({
        ...generator,
        filters: { ...filters, ability: 2 as never },
      }),
    ).toThrow(/filter/);
  });

  it("estimates raw and cached search paths independently", () => {
    expect(gen5StaticSearcherSeedCount(searcher)).toBe(86_400n);
    expect(gen5StaticEvaluationCount(searcher)).toBe(172_800n);
    expect(
      gen5StaticEvaluationCount({
        ...searcher,
        cache: {
          key: "iv",
          mode: "iv",
          ivEntryCount: 1000,
          shaEntryCount: 0,
        },
      }),
    ).toBe(86_401n);
    expect(
      gen5StaticEvaluationCount({
        ...searcher,
        cache: {
          key: "iv-sha",
          mode: "iv-sha",
          ivEntryCount: 1000,
          shaEntryCount: 3,
        },
      }),
    ).toBe(3n);
  });

  it("enforces the browser budget before Worker creation", () => {
    const request: Gen5StaticSearcherRequest = {
      ...searcher,
      maxAdvances: 0xffff,
      maxIvAdvances: 0xff,
    };
    expect(gen5StaticEvaluationCount(request)).toBeGreaterThan(
      GEN5_STATIC_MAX_EVALUATIONS,
    );
    expect(() => validateGen5StaticRequest(request)).toThrow(/task limit/);
  });

  it("splits deterministic generator ranges", () => {
    expect(
      splitGen5StaticRequest(generator, 3).map(({ start, count }) => [
        start,
        count,
      ]),
    ).toEqual(Array.from({ length: 10 }, (_, index) => [index, 1]));
  });

  it("accepts upstream absolute advances and verifies active filters", () => {
    const ivs = [31, 31, 31, 31, 31, 31] as const;
    const pid = 0x1234_5678;
    expect(
      validateGen5StaticResult(generator, {
        seed: "0000000000000000",
        advances: 46,
        ivAdvances: 0,
        chatot: 52,
        needle: 4,
        pid: "12345678",
        shiny: 0,
        nature: 21,
        ability: 0,
        abilityIndex: template.personal.abilities[0],
        ivs: [...ivs],
        hiddenPower: 15,
        hiddenPowerStrength: 70,
        gender: 0,
        characteristic: gen5StaticCharacteristic(pid, [...ivs]),
      }).advances,
    ).toBe(46);
    expect(() =>
      validateGen5StaticResult(
        { ...generator, filters: { ...filters, ability: 1 } },
        {
          seed: "0000000000000000",
          advances: 46,
          ivAdvances: 0,
          chatot: 52,
          needle: 4,
          pid: "12345678",
          shiny: 0,
          nature: 21,
          ability: 0,
          abilityIndex: template.personal.abilities[0],
          ivs: [...ivs],
          hiddenPower: 15,
          hiddenPowerStrength: 70,
          gender: 0,
          characteristic: gen5StaticCharacteristic(pid, [...ivs]),
        },
      ),
    ).toThrow(/filters/);
  });
});
