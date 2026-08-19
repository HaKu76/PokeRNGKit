import { describe, expect, it } from "vitest";
import {
  decodeGen6TinyAmbushResults,
  encodeGen6TinyAmbushRequest,
  GEN6_TINY_AMBUSH_REQUEST_WORDS,
  gen6TinyAmbushAreas,
  validateGen6TinyAmbushRequest,
  type Gen6TinyAmbushRequest,
} from "./domain";

function request(): Gen6TinyAmbushRequest {
  return {
    inputMode: "state",
    seed: 0,
    state: [0x12345678, 0x9abcdef0, 0x13572468, 0x24681357],
    minIndex: 27,
    maxIndex: 100,
    filters: { disabled: false, synchronize: false, slotMask: 0 },
    slots: Array.from({ length: 12 }, (_, index) => ({
      species: 22 + index,
      level: 57 + (index % 3),
    })),
    resultLimit: 100,
  };
}

describe("gen6tinyambush domain", () => {
  it("exposes the XY Victory Road ambush table", () => {
    expect(gen6TinyAmbushAreas("x")).toHaveLength(1);
    expect(gen6TinyAmbushAreas("y")[0]?.species).toHaveLength(12);
    expect(gen6TinyAmbushAreas("x")[0]?.bagAdvances).toBe(27);
  });

  it("packs a fixed-width request and validates slot masks", () => {
    const encoded = encodeGen6TinyAmbushRequest(request());
    expect(encoded).toHaveLength(GEN6_TINY_AMBUSH_REQUEST_WORDS);
    expect(() =>
      validateGen6TinyAmbushRequest({
        ...request(),
        filters: { disabled: false, synchronize: false, slotMask: 0x1000 },
      }),
    ).toThrow();
  });

  it("decodes the fixed result protocol", () => {
    const words = new Uint32Array(16);
    words[0] = 27;
    words[1] = 42;
    words[7] = 1;
    words[8] = 12;
    words[9] = 2;
    words[10] = 635;
    words[11] = 59;
    const result = decodeGen6TinyAmbushResults(words.buffer)[0];
    expect(result).toMatchObject({
      index: 27,
      rand100: 42,
      synchronize: true,
      slot: 12,
      itemSlot: 2,
      species: 635,
      level: 59,
    });
  });
});
