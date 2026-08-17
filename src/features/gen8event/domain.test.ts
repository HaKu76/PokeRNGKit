import { describe, expect, it } from "vitest";
import {
  decodeGen8EventResults,
  encodeGen8EventRequest,
  formatGen8EventHex32,
  gen8EventHiddenPower,
  parseGen8EventDecimal,
  parseGen8EventHex,
  parseGen8EventWondercard,
  splitGen8EventRequest,
  validateGen8EventRequest,
  validateGen8EventResult,
  type Gen8EventRequest,
} from "./domain";

const request: Gen8EventRequest = {
  profile: { tid: 12345, sid: 54321 },
  seed0: "1234567887654321",
  seed1: "8765432112345678",
  initialAdvances: 0,
  maxAdvances: 9,
  offset: 0,
  event: {
    species: 490,
    ivCount: 3,
    level: 1,
    pidType: "nonshiny",
    ability: 0,
    gender: 2,
    nature: null,
    tid: 0,
    sid: 0,
    ec: 0,
    pid: 0,
    egg: true,
  },
  filters: {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    heightMin: 0,
    heightMax: 255,
    weightMin: 0,
    weightMax: 255,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
  resultLimit: 100_000,
};

function validResult() {
  const ivs = [15, 30, 31, 19, 31, 31] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const power = gen8EventHiddenPower(ivs);
  return {
    advances: 0,
    ec: "220345D0",
    pid: "8FD266FA",
    shiny: 0,
    nature: 24,
    ability: 0,
    abilityIndex: 93,
    ivs,
    stats: [13, 7, 7, 7, 7, 7] as [
      number,
      number,
      number,
      number,
      number,
      number,
    ],
    hiddenPower: power.type,
    hiddenPowerStrength: power.power,
    gender: 2,
    height: 52,
    weight: 48,
    characteristic: 11,
  };
}

describe("Gen 8 Event domain", () => {
  it("keeps upstream seed and unsigned advance boundaries", () => {
    expect(() => validateGen8EventRequest(request)).not.toThrow();
    expect(() =>
      validateGen8EventRequest({ ...request, seed0: "", seed1: "" }),
    ).toThrow("Please insert missing seed information");
    expect(() =>
      validateGen8EventRequest({
        ...request,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toThrow(/exceeds/);
    expect(() =>
      validateGen8EventRequest({ ...request, maxAdvances: 250_000_000 }),
    ).toThrow(/task limit/);
  });

  it("parses empty inputs and imports all WB8 settings with corrected radix", () => {
    expect(parseGen8EventDecimal("")).toBe(0);
    expect(parseGen8EventHex("")).toBe(0);
    expect(parseGen8EventHex("ABCD")).toBe(0xabcd);
    expect(formatGen8EventHex32(0xabcd)).toBe("0000ABCD");
    const buffer = new ArrayBuffer(732);
    const view = new DataView(buffer);
    view.setUint16(0x20, 12345, true);
    view.setUint16(0x22, 54321, true);
    view.setUint32(0x28, 0x1234_abcd, true);
    view.setUint32(0x2c, 0x8765_4321, true);
    view.setUint16(0x288, 490, true);
    view.setUint8(0x28b, 2);
    view.setUint8(0x28c, 50);
    view.setUint8(0x28d, 1);
    view.setUint8(0x28e, 24);
    view.setUint8(0x28f, 4);
    view.setUint8(0x290, 3);
    view.setUint8(0x2b2, 0xfe);
    expect(parseGen8EventWondercard(buffer)).toMatchObject({
      tid: 12345,
      sid: 54321,
      ec: 0x1234_abcd,
      pid: 0x8765_4321,
      species: 490,
      level: 50,
      egg: true,
      nature: 24,
      ability: 4,
      pidType: "square",
      ivCount: 3,
    });
    expect(() => parseGen8EventWondercard(new ArrayBuffer(731))).toThrow(
      /correct size/,
    );
    view.setUint8(0x290, 5);
    expect(() => parseGen8EventWondercard(buffer)).toThrow(/PID Type/);
  });

  it("splits inclusive advances and packs the 45-word request", () => {
    expect(
      splitGen8EventRequest(request, 3).map(({ start, count }) => [
        start,
        count,
      ]),
    ).toEqual(Array.from({ length: 10 }, (_, index) => [index, 1]));
    const encoded = encodeGen8EventRequest(request, {
      index: 0,
      start: 0,
      count: 1,
    });
    expect(encoded).toHaveLength(45);
    expect([...encoded.slice(8, 22)]).toEqual([
      12345, 54321, 0, 0, 0, 0, 490, 2, 1, 255, 0, 0, 3, 1,
    ]);
    expect(encoded[23]).toBe(0);
    expect(
      encodeGen8EventRequest(
        { ...request, filters: { ...request.filters, shiny: "starSquare" } },
        { index: 0, start: 0, count: 1 },
      )[23],
    ).toBe(3);
  });

  it("validates the upstream Manaphy row and limits decoded rows", () => {
    const result = validResult();
    expect(validateGen8EventResult(request, result)).toEqual(result);
    expect(() =>
      validateGen8EventResult(request, {
        ...result,
        hiddenPowerStrength: result.hiddenPowerStrength - 1,
      }),
    ).toThrow(/derived values/);
    const buffer = new Uint32Array(11 * 2);
    buffer[0] = 10;
    buffer[11] = 20;
    expect(decodeGen8EventResults(buffer.buffer, 1)).toHaveLength(1);
    expect(decodeGen8EventResults(buffer.buffer, 1)[0].advances).toBe(10);
  });
});
