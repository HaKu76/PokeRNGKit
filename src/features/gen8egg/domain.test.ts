import { describe, expect, it } from "vitest";
import {
  decodeGen8EggResults,
  effectiveGen8EggCompatibility,
  encodeGen8EggRequest,
  gen8EggCharacteristic,
  mapGen8EggInheritanceSource,
  normalizeGen8EggSeed,
  parseGen8EggDecimal,
  splitGen8EggRequest,
  validateGen8EggRequest,
  validateGen8EggResult,
  type Gen8EggFilters,
  type Gen8EggParent,
  type Gen8EggRequest,
} from "./domain";

const parentA: Gen8EggParent = {
  ivs: [31, 31, 31, 31, 31, 31],
  ability: 0,
  gender: "male",
  item: 0,
  nature: 0,
};

const parentB: Gen8EggParent = {
  ...parentA,
  ability: 2,
  gender: "female",
};

const filters: Gen8EggFilters = {
  disabled: false,
  shiny: "any",
  gender: "any",
  ability: "any",
  natureMask: 0x1ff_ffff,
  hiddenPowerMask: 0xffff,
  ivMin: [0, 0, 0, 0, 0, 0],
  ivMax: [31, 31, 31, 31, 31, 31],
};

const request: Gen8EggRequest = {
  profile: {
    tid: 12345,
    sid: 54321,
    shinyCharm: true,
    ovalCharm: true,
  },
  seed0: "1234567887654321",
  seed1: "8765432112345678",
  initialAdvances: 0,
  maxAdvances: 9,
  offset: 0,
  compatibility: 70,
  species: 1,
  masuda: true,
  parentA,
  parentB,
  filters,
  resultLimit: 100_000,
};

function validResult() {
  const ivs = [31, 31, 31, 31, 31, 31] as const;
  const psv = request.profile.tid ^ request.profile.sid ^ 0x10;
  const ec = 0x1234_5678;
  return {
    advances: 0,
    seed: "5A0F5EED",
    ec: "12345678",
    pid: ((psv << 16) >>> 0).toString(16).toUpperCase().padStart(8, "0"),
    shiny: 0,
    nature: 0,
    ability: 0,
    abilityIndex: 1,
    ivs: [...ivs] as [number, number, number, number, number, number],
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
    characteristic: gen8EggCharacteristic(ec, [...ivs]),
    species: 1,
  };
}

describe("Gen 8 Egg domain", () => {
  it("keeps upstream seed and unsigned advance boundaries", () => {
    expect(() => validateGen8EggRequest(request)).not.toThrow();
    expect(normalizeGen8EggSeed("")).toBe("0000000000000000");
    expect(() =>
      validateGen8EggRequest({ ...request, seed0: "", seed1: "" }),
    ).toThrow("Please insert missing seed information");
    expect(() =>
      validateGen8EggRequest({
        ...request,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toThrow(/exceeds/);
    expect(() =>
      validateGen8EggRequest({ ...request, maxAdvances: 250_000_000 }),
    ).toThrow(/task limit/);
  });

  it("parses empty decimal inputs and applies the Oval Charm table", () => {
    expect(parseGen8EggDecimal("")).toBe(0);
    expect(parseGen8EggDecimal("  ")).toBe(0);
    expect(parseGen8EggDecimal("42")).toBe(42);
    expect(parseGen8EggDecimal("4x")).toBeNaN();
    expect(effectiveGen8EggCompatibility(20, true)).toBe(40);
    expect(effectiveGen8EggCompatibility(50, true)).toBe(80);
    expect(effectiveGen8EggCompatibility(70, true)).toBe(88);
    expect(effectiveGen8EggCompatibility(70, false)).toBe(70);
  });

  it("enforces parent compatibility and hidden-ability ancestry", () => {
    expect(() =>
      validateGen8EggRequest({
        ...request,
        parentB: { ...parentB, gender: "male" },
      }),
    ).toThrow(/not compatible/);
    expect(() =>
      validateGen8EggRequest({
        ...request,
        filters: { ...filters, ability: "hidden" },
        parentB: { ...parentB, ability: 1 },
      }),
    ).toThrow(/Hidden Ability/);
    expect(mapGen8EggInheritanceSource(1, true)).toBe(2);
    expect(mapGen8EggInheritanceSource(2, true)).toBe(1);
  });

  it("splits inclusive frames and packs the 53-word request", () => {
    expect(
      splitGen8EggRequest(request, 3).map(({ start, count }) => [start, count]),
    ).toEqual(Array.from({ length: 10 }, (_, index) => [index, 1]));
    const reordered: Gen8EggRequest = {
      ...request,
      parentA: { ...parentB, gender: "female" },
      parentB: { ...parentA, gender: "male" },
    };
    const encoded = encodeGen8EggRequest(reordered, {
      index: 0,
      start: 0,
      count: 1,
    });
    expect(encoded).toHaveLength(53);
    expect([...encoded.slice(14, 20)]).toEqual(parentA.ivs);
    expect(encoded[28]).toBe(0);
    expect(encoded[29]).toBe(1);
    expect(encoded[8]).toBe(88);
  });

  it("validates derived values and limits decoded rows", () => {
    const result = validResult();
    expect(validateGen8EggResult(request, result)).toEqual(result);
    expect(() =>
      validateGen8EggResult(request, {
        ...result,
        hiddenPowerStrength: 69,
      }),
    ).toThrow(/derived values/);
    const buffer = new Uint32Array(13 * 2);
    buffer[0] = 10;
    buffer[13] = 20;
    expect(decodeGen8EggResults(buffer.buffer, 1)).toHaveLength(1);
    expect(decodeGen8EggResults(buffer.buffer, 1)[0].advances).toBe(10);
  });
});
