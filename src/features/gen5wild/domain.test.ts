import { describe, expect, it } from "vitest";
import {
  GEN5_WILD_MAX_EVALUATIONS,
  gen5WildCharacteristic,
  gen5WildEvaluationCount,
  gen5WildSearcherSeedCount,
  splitGen5WildRequest,
  validateGen5WildRequest,
  validateGen5WildResult,
  type Gen5WildGeneratorRequest,
  type Gen5WildSearcherRequest,
} from "./domain";
import { getGen5WildAreas } from "./encounters";

const profile = {
  version: "black" as const,
  language: "english" as const,
  dsType: "ds" as const,
  tid: 12345,
  sid: 54321,
  mac: "001122334455",
  vcount: 0x60,
  timer0Min: 0xc80,
  timer0Max: 0xc80,
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
  shinyCharm: false,
  nsPokemonReleased: false,
};
const area = getGen5WildAreas("black", "grass", 0).find(
  (entry) => entry.location === 41,
)!;
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
  ability: 255 as const,
  gender: 255 as const,
  shiny: 255 as const,
  slotMask: 0xfff,
  levelMin: 1,
  levelMax: 100,
};
const generator: Gen5WildGeneratorRequest = {
  mode: "generator",
  profile,
  area,
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
const searcher: Gen5WildSearcherRequest = {
  ...generator,
  mode: "searcher",
  startDate: "2026-08-14",
  endDate: "2026-08-14",
  maxAdvances: 0,
};

describe("Gen 5 Wild domain", () => {
  it("preserves upstream u32 and Keypress behavior", () => {
    expect(() =>
      validateGen5WildRequest({ ...generator, seed: "" }),
    ).not.toThrow();
    expect(() =>
      validateGen5WildRequest({
        ...generator,
        profile: {
          ...profile,
          keypresses: profile.keypresses.map(
            () => false,
          ) as typeof profile.keypresses,
        },
      }),
    ).not.toThrow();
    expect(() =>
      validateGen5WildRequest({
        ...searcher,
        profile: {
          ...profile,
          keypresses: profile.keypresses.map(
            () => false,
          ) as typeof profile.keypresses,
        },
      }),
    ).toThrow(/Keypresses/);
    expect(() =>
      validateGen5WildRequest({
        ...generator,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toThrow(/exceeds/);
    for (const type of ["suctionCups", "stickyHold"] as const) {
      expect(() =>
        validateGen5WildRequest({ ...generator, lead: { type } }),
      ).toThrow(/Fishing/);
    }
  });

  it("estimates raw and cached searches before Worker creation", () => {
    expect(gen5WildSearcherSeedCount(searcher)).toBe(86_400n);
    expect(gen5WildEvaluationCount(searcher)).toBe(172_800n);
    expect(
      gen5WildEvaluationCount({
        ...searcher,
        cache: {
          key: "iv-sha",
          mode: "iv-sha",
          ivEntryCount: 2,
          shaEntryCount: 3,
        },
      }),
    ).toBe(3n);
    const oversized = { ...searcher, maxAdvances: 0xffff, maxIvAdvances: 0xff };
    expect(gen5WildEvaluationCount(oversized)).toBeGreaterThan(
      GEN5_WILD_MAX_EVALUATIONS,
    );
    expect(() => validateGen5WildRequest(oversized)).toThrow(/task limit/);
  });

  it("splits generator frames deterministically", () => {
    expect(
      splitGen5WildRequest(generator, 3).map(({ start, count }) => [
        start,
        count,
      ]),
    ).toEqual(Array.from({ length: 10 }, (_, index) => [index, 1]));
  });

  it("accepts the fixed Black grass result", () => {
    const ivs = [17, 18, 22, 27, 19, 27] as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    const pid = 0x839a_e73d;
    expect(
      validateGen5WildResult(generator, {
        seed: "0000000000000000",
        advances: 39,
        ivAdvances: 0,
        chatot: 95,
        needle: 7,
        item: 0,
        slot: 2,
        level: 25,
        species: 595,
        form: 0,
        pid: "839AE73D",
        shiny: 0,
        nature: 23,
        ability: 0,
        abilityIndex: 14,
        ivs,
        stats: [64, 33, 35, 36, 37, 44],
        hiddenPower: 13,
        hiddenPowerStrength: 69,
        gender: 1,
        characteristic: gen5WildCharacteristic(pid, ivs),
      }).species,
    ).toBe(595);
  });
});
