import { describe, expect, it } from "vitest";
import {
  decodeGen6TinyRockSmashResults,
  encodeGen6TinyRockSmashRequest,
  gen6TinyRockSmashAreas,
  gen6TinyRockSmashTaskCount,
  validateGen6TinyRockSmashRequest,
  type Gen6TinyRockSmashRequest,
} from "./domain";

function request(): Gen6TinyRockSmashRequest {
  return {
    inputMode: "state",
    seed: 0,
    state: [0x12345678, 0x9abcdef0, 0x13572468, 0x24681357],
    minIndex: 0,
    maxIndex: 3,
    longBlinkRand: 60,
    interactFrame: 300,
    oras: true,
    filters: {
      disabled: false,
      triggerOnly: false,
      synchronize: false,
      safeOnly: false,
      flute: 0,
      slotMask: 0,
    },
    slots: [
      { species: 75, level: 10 },
      { species: 74, level: 11 },
      { species: 299, level: 10 },
      { species: 74, level: 12 },
      { species: 299, level: 12 },
    ],
    resultLimit: 100,
  };
}

describe("Gen6 TinyFinder Rock Smash domain", () => {
  it("packs the fixed TinyFinder request contract", () => {
    const encoded = encodeGen6TinyRockSmashRequest(request());
    expect(encoded).toHaveLength(27);
    expect(encoded[0]).toBe(1);
    expect(encoded[8]).toBe(60);
    expect(encoded[16]).toBe(100);
  });

  it("keeps area families and task budget bounded", () => {
    expect(gen6TinyRockSmashAreas("alpha-sapphire").length).toBeGreaterThan(0);
    expect(gen6TinyRockSmashTaskCount(request())).toBe(4);
    expect(() =>
      validateGen6TinyRockSmashRequest({ ...request(), maxIndex: 10_000_001 }),
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
    const [result] = decodeGen6TinyRockSmashResults(words.buffer);
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
