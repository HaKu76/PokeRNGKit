import { describe, expect, it } from "vitest";
import {
  decodeGen7EventResults,
  encodeGen7EventRequest,
  GEN7_EVENT_REQUEST_WORDS,
  gen7EventDefaultSettings,
  gen7EventHiddenPower,
  gen7EventStartingFrame,
  parseGen7WonderCard,
  validateGen7EventRequest,
  type Gen7EventRequest,
} from "./domain";

export const gen7EventTestRequest: Gen7EventRequest = {
  version: "sun",
  seed: 0x1234_5678,
  minFrame: 418,
  maxFrame: 518,
  tsv: 1234,
  trv: 8,
  npc: 0,
  delay: 62,
  considerDelay: true,
  event: gen7EventDefaultSettings("sun", 25),
  filters: {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
    blink: "any",
  },
  resultLimit: 100_000,
};

describe("Gen 7 Event domain", () => {
  it("uses upstream starting frames and packs the complete ABI", () => {
    expect(gen7EventStartingFrame("sun")).toBe(418);
    expect(gen7EventStartingFrame("ultra-sun")).toBe(478);
    expect(encodeGen7EventRequest(gen7EventTestRequest)).toHaveLength(
      GEN7_EVENT_REQUEST_WORDS,
    );
  });

  it("encodes random species gender as its upstream threshold", () => {
    const words = encodeGen7EventRequest(gen7EventTestRequest);
    expect(words[22]).toBe(0);
    expect(words[23]).toBe(126);
    expect(words[24]).toBe(126);
  });

  it("rejects fixed IV and guaranteed perfect IV combinations over five", () => {
    expect(() =>
      validateGen7EventRequest({
        ...gen7EventTestRequest,
        event: {
          ...gen7EventTestRequest.event,
          fixedIvs: [31, 31, 31, -1, -1, -1],
          randomPerfectIvCount: 3,
        },
      }),
    ).toThrow(/cannot exceed 5/);
  });

  it("decodes the compact result record", () => {
    const ivs = [31, 30, 29, 28, 27, 26] as const;
    const packedIvs = ivs.reduce(
      (word, value, index) => word | (value << (index * 5)),
      0,
    );
    const hiddenPower = gen7EventHiddenPower([...ivs]);
    const metadata =
      3 | (2 << 5) | (1 << 7) | (hiddenPower << 9) | (1 << 13) | (5 << 16);
    const words = new Uint32Array([
      418,
      60,
      0x89ab_cdef,
      0x0123_4567,
      0x7654_3210,
      0x1234_5678,
      packedIvs,
      metadata,
      33,
    ]);
    expect(decodeGen7EventResults(words.buffer)[0]).toMatchObject({
      frame: 418,
      random: 0x0123_4567_89ab_cdefn,
      ivs: [...ivs],
      nature: 3,
      ability: 2,
      gender: 1,
      hiddenPower,
      shiny: 1,
      blink: 5,
      delay: 33,
    });
  });

  it("parses wc7 and wc7full card payloads", () => {
    const card = new Uint8Array(0x108);
    card[0x82] = 25;
    card[0xa0] = 0xff;
    card[0xa1] = 3;
    card[0xa2] = 3;
    card[0xa3] = 1;
    card[0xaf] = 0xfd;
    card[0xb0] = 0xfd;
    card[0xb1] = 0xfd;
    card[0xb2] = 0xfd;
    card[0xb3] = 0xfd;
    card[0xb4] = 0xfd;
    card[0xd0] = 50;
    expect(parseGen7WonderCard("pikachu.wc7", card)).toMatchObject({
      species: 25,
      level: 50,
      randomPerfectIvCount: 2,
      abilityLocked: false,
      natureLocked: false,
      genderLocked: false,
      pidType: "random",
    });

    const full = new Uint8Array(0x310);
    full.set(card, 0x208);
    expect(parseGen7WonderCard("pikachu.wc7full", full).species).toBe(25);
  });
});
