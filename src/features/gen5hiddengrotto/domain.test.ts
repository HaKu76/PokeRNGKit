import { describe, expect, it } from "vitest";
import {
  GEN5_HIDDEN_GROTTO_MAX_EVALUATIONS,
  countGen5HiddenGrottoKeypresses,
  formatGen5HiddenGrottoButtons,
  gen5HiddenGrottoCharacteristic,
  gen5HiddenGrottoEvaluationCount,
  gen5HiddenGrottoSearcherSeedCount,
  gen5HiddenGrottoTaskCount,
  isGen5HiddenGrottoButtonMaskAllowed,
  normalizeGen5HiddenGrottoSeed,
  splitGen5HiddenGrottoRequest,
  validateGen5HiddenGrottoRequest,
  validateGen5HiddenGrottoResult,
  type Gen5HiddenGrottoGeneratorRequest,
  type Gen5HiddenGrottoSearcherRequest,
} from "./domain";
import { GEN5_HIDDEN_GROTTO_AREAS } from "./encounters";

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

const pokemonFilters = {
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
  natureMask: 0,
  hiddenPowerMask: 0,
  perfectIvValue: 31,
  perfectIvCount: 0,
  levelMin: 1,
  levelMax: 100,
};

const slotGenerator: Gen5HiddenGrottoGeneratorRequest = {
  operation: "slot-generator",
  profile,
  area: GEN5_HIDDEN_GROTTO_AREAS[0],
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 100,
  offset: 0,
  initialIvAdvances: 0,
  maxIvAdvances: 0,
  lead: { type: "none" },
  grottoPower: "none",
  selectedGroup: 0,
  selectedSlot: 0,
  gender: 0,
  slotFilters: { slotMask: 0, genderMask: 0, groupMask: 0 },
  pokemonFilters,
  resultLimit: 100_000,
  cache: null,
};

const pokemonGenerator: Gen5HiddenGrottoGeneratorRequest = {
  ...slotGenerator,
  operation: "pokemon-generator",
};

function withoutSeed(
  request: Gen5HiddenGrottoGeneratorRequest,
): Omit<Gen5HiddenGrottoGeneratorRequest, "seed"> {
  const copy = { ...request };
  delete (copy as Partial<Gen5HiddenGrottoGeneratorRequest>).seed;
  return copy;
}

const slotSearcher: Gen5HiddenGrottoSearcherRequest = {
  ...withoutSeed(slotGenerator),
  operation: "slot-searcher",
  startDate: "2026-08-14",
  endDate: "2026-08-14",
  maxAdvances: 0,
};

const pokemonSearcher: Gen5HiddenGrottoSearcherRequest = {
  ...withoutSeed(pokemonGenerator),
  operation: "pokemon-searcher",
  startDate: "2026-08-14",
  endDate: "2026-08-14",
  maxAdvances: 0,
};

describe("Gen 5 Hidden Grotto domain", () => {
  it("preserves upstream empty-value, empty-mask, and uint32 behavior", () => {
    expect(() =>
      validateGen5HiddenGrottoRequest({ ...slotGenerator, seed: "" }),
    ).not.toThrow();
    expect(() =>
      validateGen5HiddenGrottoRequest({
        ...slotGenerator,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).not.toThrow();
    expect(() => validateGen5HiddenGrottoRequest(slotGenerator)).not.toThrow();
    expect(() =>
      validateGen5HiddenGrottoRequest(pokemonGenerator),
    ).not.toThrow();
  });

  it("requires BW2 profiles and valid search dates and Keypresses", () => {
    expect(() =>
      validateGen5HiddenGrottoRequest({
        ...slotGenerator,
        profile: { ...profile, version: "black" as never },
      }),
    ).toThrow(/Black 2 or White 2/);
    expect(() =>
      validateGen5HiddenGrottoRequest({
        ...slotSearcher,
        profile: {
          ...profile,
          keypresses: profile.keypresses.map(
            () => false,
          ) as typeof profile.keypresses,
        },
      }),
    ).toThrow(/Keypresses/);
    expect(() =>
      validateGen5HiddenGrottoRequest({
        ...slotSearcher,
        startDate: "2026-08-15",
        endDate: "2026-08-14",
      }),
    ).toThrow(/Start date/);
    expect(() =>
      validateGen5HiddenGrottoRequest({ ...slotSearcher, offset: 1 }),
    ).toThrow(/Offset/);
  });

  it("enforces workflow-specific IV and filter settings", () => {
    expect(() =>
      validateGen5HiddenGrottoRequest({
        ...slotGenerator,
        initialIvAdvances: 1,
      }),
    ).toThrow(/Slot operations/);
    expect(() =>
      validateGen5HiddenGrottoRequest({
        ...pokemonGenerator,
        maxIvAdvances: 1,
      }),
    ).toThrow(/one IV Advances/);
    expect(() =>
      validateGen5HiddenGrottoRequest({
        ...pokemonSearcher,
        pokemonFilters: { ...pokemonFilters, disabled: true },
      }),
    ).toThrow(/cannot be disabled/);
  });

  it("enforces fixed-gender encounter slots", () => {
    const dittoArea = GEN5_HIDDEN_GROTTO_AREAS.find(
      (area) => area.location === 34,
    )!;
    expect(() =>
      validateGen5HiddenGrottoRequest({
        ...pokemonGenerator,
        area: dittoArea,
        gender: 0,
      }),
    ).toThrow(/does not allow/);
    expect(() =>
      validateGen5HiddenGrottoRequest({
        ...pokemonGenerator,
        area: dittoArea,
        gender: 2,
      }),
    ).not.toThrow();
  });

  it("estimates all four search paths before Worker creation", () => {
    expect(gen5HiddenGrottoSearcherSeedCount(slotSearcher)).toBe(86_400n);
    expect(gen5HiddenGrottoEvaluationCount(slotSearcher)).toBe(86_400n);
    expect(gen5HiddenGrottoEvaluationCount(pokemonSearcher)).toBe(172_800n);
    expect(
      gen5HiddenGrottoEvaluationCount({
        ...pokemonSearcher,
        cache: { key: "iv", mode: "iv", ivEntryCount: 2, shaEntryCount: 0 },
      }),
    ).toBe(86_401n);
    const shaRequest = {
      ...pokemonSearcher,
      cache: {
        key: "sha",
        mode: "iv-sha" as const,
        ivEntryCount: 2,
        shaEntryCount: 3,
      },
    };
    expect(gen5HiddenGrottoTaskCount(shaRequest)).toBe(3n);
    expect(gen5HiddenGrottoEvaluationCount(shaRequest)).toBe(3n);

    const oversized = { ...slotSearcher, maxAdvances: 3_000 };
    expect(gen5HiddenGrottoEvaluationCount(oversized)).toBeGreaterThan(
      GEN5_HIDDEN_GROTTO_MAX_EVALUATIONS,
    );
    expect(() => validateGen5HiddenGrottoRequest(oversized)).toThrow(
      /task limit/,
    );
  });

  it("splits generator and SHA cache tasks deterministically", () => {
    expect(
      splitGen5HiddenGrottoRequest({ ...slotGenerator, maxAdvances: 9 }, 3).map(
        ({ start, count }) => [start, count],
      ),
    ).toEqual(Array.from({ length: 10 }, (_, index) => [index, 1]));
    expect(
      splitGen5HiddenGrottoRequest(
        {
          ...pokemonSearcher,
          cache: {
            key: "sha",
            mode: "iv-sha",
            ivEntryCount: 2,
            shaEntryCount: 3,
          },
        },
        4,
      ),
    ).toEqual([
      { index: 0, start: 0, count: 1 },
      { index: 1, start: 1, count: 1 },
      { index: 2, start: 2, count: 1 },
    ]);
  });

  it("accepts upstream slot data with empty masks interpreted as Any", () => {
    expect(
      validateGen5HiddenGrottoResult(slotGenerator, {
        kind: "slot",
        seed: "0000000000000000",
        advances: 49,
        chatot: 2,
        needle: 0,
        group: 1,
        slot: 2,
        item: false,
        data: 183,
        gender: 0,
      }),
    ).toMatchObject({ group: 1, slot: 2, data: 183 });

    expect(() =>
      validateGen5HiddenGrottoResult(
        {
          ...slotGenerator,
          slotFilters: { slotMask: 1 << 3, groupMask: 1, genderMask: 1 },
        },
        {
          kind: "slot",
          seed: "0000000000000000",
          advances: 0,
          chatot: 0,
          needle: 0,
          group: 0,
          slot: 3,
          item: true,
          data: slotGenerator.area.items[0],
          gender: 1,
        },
      ),
    ).not.toThrow();
  });

  it("accepts wrapped IV advances and verifies derived Pokemon values", () => {
    const request = {
      ...pokemonSearcher,
      initialAdvances: 0xffff_ffff,
      maxAdvances: 1,
      initialIvAdvances: 0xffff_ffff,
      maxIvAdvances: 1,
    };
    const ivs = [31, 31, 31, 31, 31, 31] as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    const pid = 0x1234_5678;
    const result = {
      kind: "pokemon" as const,
      seed: "0000000000000000",
      advances: 0,
      ivAdvances: 0,
      chatot: 0,
      needle: 0,
      level: 10,
      species: 206,
      form: 0,
      pid: "12345678",
      shiny: 0 as const,
      nature: 0,
      ability: 0 as const,
      abilityIndex: 1,
      ivs,
      stats: [50, 50, 50, 50, 50, 50] as typeof ivs,
      hiddenPower: 15,
      hiddenPowerStrength: 70,
      gender: 0 as const,
      characteristic: gen5HiddenGrottoCharacteristic(pid, ivs),
      dateTime: "2026-08-14 00:00:00",
      timer0: 0x1100,
      buttonMask: 0,
    };
    expect(validateGen5HiddenGrottoResult(request, result)).toBe(result);
    expect(() =>
      validateGen5HiddenGrottoResult(request, {
        ...result,
        hiddenPowerStrength: 69,
      }),
    ).toThrow(/inconsistent/);
  });

  it("counts valid Keypresses and formats user-facing values", () => {
    expect(countGen5HiddenGrottoKeypresses(profile)).toBe(1);
    expect(isGen5HiddenGrottoButtonMaskAllowed(profile, 0)).toBe(true);
    expect(isGen5HiddenGrottoButtonMaskAllowed(profile, 0x300)).toBe(false);
    expect(formatGen5HiddenGrottoButtons(0)).toBe("None");
    expect(formatGen5HiddenGrottoButtons((1 << 4) | (1 << 7))).toBe(
      "A + Start",
    );
    expect(normalizeGen5HiddenGrottoSeed("0x0000-abcd xyz")).toBe("ABCD");
  });
});
