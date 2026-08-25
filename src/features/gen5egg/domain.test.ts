import { describe, expect, it } from "vitest";
import {
  countGen5EggKeypresses,
  decodeGen5EggResults,
  encodeGen5EggRequest,
  formatGen5EggButtons,
  gen5EggCharacteristic,
  gen5EggEvaluationCount,
  gen5EggSearcherSeedCount,
  isGen5EggButtonMaskAllowed,
  mapGen5EggInheritanceSource,
  normalizeGen5EggSeed,
  parseGen5EggDecimal,
  splitGen5EggRequest,
  validateGen5EggRequest,
  validateGen5EggResult,
  type Gen5EggGeneratorRequest,
  type Gen5EggSearcherRequest,
} from "./domain";

const profile = {
  version: "black" as const,
  language: "english" as const,
  dsType: "ds" as const,
  tid: 12345,
  sid: 54321,
  mac: "001122334455",
  vcount: 0x60,
  timer0Min: 0x0c80,
  timer0Max: 0x0c80,
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
};

const parentA = {
  ivs: [31, 31, 31, 31, 31, 31] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ],
  ability: 0 as const,
  gender: "male" as const,
  item: 0 as const,
  nature: 0,
};

const parentB = {
  ...parentA,
  ability: 2 as const,
  gender: "female" as const,
};

const filters = {
  disabled: false,
  shiny: "any" as const,
  gender: "any" as const,
  ability: "any" as const,
  natureMask: 0x1ff_ffff,
  hiddenPowerMask: 0xffff,
  perfectIvValue: 31,
  perfectIvCount: 0,
  ivMin: [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number],
  ivMax: [31, 31, 31, 31, 31, 31] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ],
};

const generator: Gen5EggGeneratorRequest = {
  mode: "generator",
  profile,
  seed: "",
  initialAdvances: 0,
  maxAdvances: 9,
  offset: 0,
  species: 1,
  masuda: false,
  parentA,
  parentB,
  filters,
  resultLimit: 100_000,
};

const searcher: Gen5EggSearcherRequest = {
  ...generator,
  mode: "searcher",
  startDate: "2026-08-14",
  endDate: "2026-08-14",
  maxAdvances: 0,
};

describe("Gen 5 Egg domain", () => {
  it("keeps the upstream empty Seed and unsigned input boundaries", () => {
    expect(() => validateGen5EggRequest(generator)).not.toThrow();
    expect(normalizeGen5EggSeed("")).toBe("0000000000000000");
    expect(() =>
      validateGen5EggRequest({
        ...generator,
        seed: "1234567890ABCDEF0",
      }),
    ).toThrow(/16 hexadecimal/);
    expect(() =>
      validateGen5EggRequest({
        ...generator,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toThrow(/exceeds/);
    expect(() =>
      validateGen5EggRequest({
        ...generator,
        offset: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toThrow(/Offset and Max Advances/);
  });

  it("parses empty decimal controls as zero and rejects non-numeric text", () => {
    expect(parseGen5EggDecimal("")).toBe(0);
    expect(parseGen5EggDecimal("   ")).toBe(0);
    expect(parseGen5EggDecimal("42")).toBe(42);
    expect(parseGen5EggDecimal("4x")).toBeNaN();
  });

  it("enforces parent order, compatibility, and hidden ability ancestry", () => {
    expect(() =>
      validateGen5EggRequest({
        ...generator,
        parentB: { ...parentB, gender: "male" },
      }),
    ).toThrow(/not compatible/);
    expect(() =>
      validateGen5EggRequest({
        ...generator,
        filters: { ...filters, ability: "hidden" },
        parentB: { ...parentB, ability: 1 },
      }),
    ).toThrow(/Hidden Ability/);
    expect(() =>
      validateGen5EggRequest({
        ...generator,
        filters: { ...filters, ability: "hidden" },
      }),
    ).not.toThrow();
  });

  it("counts only valid profile keypress combinations", () => {
    expect(countGen5EggKeypresses(profile)).toBe(1);
    expect(isGen5EggButtonMaskAllowed(profile, 0)).toBe(true);
    expect(
      isGen5EggButtonMaskAllowed(
        {
          ...profile,
          keypresses: [
            false,
            true,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
          ],
        },
        1,
      ),
    ).toBe(true);
    expect(isGen5EggButtonMaskAllowed(profile, 0xc00)).toBe(false);
    expect(formatGen5EggButtons(0)).toBe("None");
    expect(formatGen5EggButtons(0b01)).toBe("R");
    expect(formatGen5EggButtons(0b10)).toBe("L");
    expect(formatGen5EggButtons(0b11)).toBe("R+L");
  });

  it("keeps inheritance labels aligned with the submitted parent order", () => {
    expect(mapGen5EggInheritanceSource(0, true)).toBe(0);
    expect(mapGen5EggInheritanceSource(1, false)).toBe(1);
    expect(mapGen5EggInheritanceSource(2, false)).toBe(2);
    expect(mapGen5EggInheritanceSource(1, true)).toBe(2);
    expect(mapGen5EggInheritanceSource(2, true)).toBe(1);
  });

  it("computes the inclusive Searcher seed and evaluation budget", () => {
    expect(gen5EggSearcherSeedCount(searcher)).toBe(86_400n);
    expect(gen5EggEvaluationCount(searcher)).toBe(86_400n);
    expect(() =>
      validateGen5EggRequest({ ...searcher, maxAdvances: 3000 }),
    ).toThrow(/task limit/);
    expect(() =>
      validateGen5EggRequest({
        ...searcher,
        startDate: "2026-08-15",
        endDate: "2026-08-14",
      }),
    ).toThrow("Start date is after end date");
  });

  it("splits deterministic Generator frames and packs 73 words", () => {
    expect(
      splitGen5EggRequest(generator, 3).map(({ start, count }) => [
        start,
        count,
      ]),
    ).toEqual(Array.from({ length: 10 }, (_, index) => [index, 1]));
    const reordered = {
      ...generator,
      parentA: { ...parentB, gender: "female" as const },
      parentB: { ...parentA, gender: "male" as const },
    };
    const encoded = encodeGen5EggRequest(reordered, {
      index: 0,
      start: 0,
      count: 1,
    });
    expect(encoded).toHaveLength(73);
    expect([...encoded.slice(23, 29)]).toEqual(parentA.ivs);
    expect(encoded[37]).toBe(0);
    expect(encoded[38]).toBe(1);
  });

  it("validates derived values and the BW2 EC characteristic rule", () => {
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
      seed: "0000000000000000",
      advances: 39,
      chatot: 50,
      needle: 4,
      pid: "12345678",
      shiny: 0,
      nature: 0,
      ability: 0,
      abilityIndex: 1,
      ivs,
      stats: [12, 6, 6, 6, 6, 6] as [
        number,
        number,
        number,
        number,
        number,
        number,
      ],
      inheritance: [0, 0, 0, 0, 0, 0] as [
        number,
        number,
        number,
        number,
        number,
        number,
      ],
      hiddenPower: 15,
      hiddenPowerStrength: 70,
      gender: 0,
      characteristic: gen5EggCharacteristic(pid, ivs),
      species: 1,
    };
    expect(validateGen5EggResult(generator, result).advances).toBe(39);
    expect(() =>
      validateGen5EggResult(
        {
          ...generator,
          profile: { ...profile, version: "black2" },
        },
        {
          ...result,
          characteristic: gen5EggCharacteristic(0, ivs),
        },
      ),
    ).not.toThrow();
    expect(() =>
      validateGen5EggResult(generator, {
        ...result,
        hiddenPowerStrength: 69,
      }),
    ).toThrow(/derived values/);
  });

  it("decodes only the requested number of result rows", () => {
    const buffer = new Uint32Array(16 * 2);
    buffer[5] = 10;
    buffer[16 + 5] = 20;
    expect(decodeGen5EggResults(buffer.buffer, 1)).toHaveLength(1);
    expect(decodeGen5EggResults(buffer.buffer, 1)[0].advances).toBe(10);
  });
});
