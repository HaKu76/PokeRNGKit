import { describe, expect, it } from "vitest";
import {
  decodeGen6TinyHoneyResults,
  encodeGen6TinyHoneyRequest,
  gen6TinyHoneyAreas,
  gen6TinyHoneyTaskCount,
  validateGen6TinyHoneyRequest,
  type Gen6TinyHoneyRequest,
} from "./domain";

function request(): Gen6TinyHoneyRequest {
  return {
    inputMode: "state",
    seed: 0,
    state: [0x12345678, 0x9abcdef0, 0x13572468, 0x24681357],
    minIndex: 0,
    maxIndex: 3,
    longBlinkRand: 60,
    honeyDelay: 110,
    party: 6,
    bagAdvances: 27,
    oras: true,
    emulator: false,
    slotType: 4,
    filters: {
      disabled: false,
      synchronize: false,
      safeOnly: false,
      flute: 0,
      slotMask: 0,
    },
    slots: Array.from({ length: 5 }, () => ({ species: 75, level: 10 })),
    resultLimit: 100,
  };
}

describe("Gen6 TinyFinder Honey Wild domain", () => {
  it("packs the fixed TinyFinder request contract", () => {
    const encoded = encodeGen6TinyHoneyRequest(request());
    expect(encoded).toHaveLength(44);
    expect(encoded[0]).toBe(1);
    expect(encoded[8]).toBe(60);
    expect(encoded[19]).toBe(100);
  });

  it("keeps area families and task budget bounded", () => {
    expect(gen6TinyHoneyAreas("alpha-sapphire").length).toBeGreaterThan(0);
    expect(gen6TinyHoneyTaskCount(request())).toBe(4);
    expect(() =>
      validateGen6TinyHoneyRequest({ ...request(), maxIndex: 10_000_001 }),
    ).toThrow();
  });

  it("decodes timeline and packed flags", () => {
    const words = new Uint32Array(24);
    words[0] = 7;
    words[1] = 91;
    words[6] = 0xdeadbeef;
    words[7] = 0;
    words[8] = 0b111;
    words[9] = 3;
    words[10] = 2;
    words[11] = 4;
    words[12] = 276;
    words[13] = 3;
    words[14] = 318;
    words[15] = 366;
    words[16] = 576;
    words[22] = 299;
    words[23] = 10;
    const [result] = decodeGen6TinyHoneyResults(words.buffer);
    expect(result).toMatchObject({
      index: 7,
      initialSeed: 0xdeadbeef,
      trigger: true,
      synchronize: true,
      risky: true,
      slot: 3,
      itemSlot: 2,
      flute: 4,
      actualDelay: 276,
      species: 299,
      level: 10,
    });
    expect(result.timeline).toEqual([318, 366, 576]);
  });
});
