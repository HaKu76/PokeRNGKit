import { describe, expect, it } from "vitest";
import {
  decodeGen6EventResults,
  encodeGen6EventRequest,
  GEN6_EVENT_REQUEST_WORDS,
  gen6EventDefaultSettings,
  gen6EventHiddenPower,
  parseGen6WonderCard,
  validateGen6EventRequest,
  type Gen6EventRequest,
} from "./domain";

const request: Gen6EventRequest = {
  version: "omega-ruby",
  seed: 0x1234_5678,
  minFrame: 0,
  maxFrame: 100,
  tsv: 1234,
  trv: 8,
  delay: 0,
  considerDelay: false,
  event: gen6EventDefaultSettings(25, 0),
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
  },
  resultLimit: 1000,
};

describe("Gen VI Event domain", () => {
  it("packs the complete 54-word ABI and random gender threshold", () => {
    const words = encodeGen6EventRequest(request);
    expect(words).toHaveLength(GEN6_EVENT_REQUEST_WORDS);
    expect(words[20]).toBe(0);
    expect(words[22]).toBe(126);
  });

  it("uses Gen VI hidden-power IV order", () => {
    expect(gen6EventHiddenPower([0, 0, 0, 1, 0, 0])).toBe(3);
    expect(gen6EventHiddenPower([1, 1, 1, 1, 1, 1])).toBe(15);
  });

  it("decodes compact event results", () => {
    const metadata = 4 | (2 << 5) | (1 << 7) | (7 << 9) | (2 << 13);
    const words = new Uint32Array([
      0,
      0x8c7f_0aac,
      0x1234_5678,
      0x0123_4567,
      metadata,
      31 | (30 << 8) | (29 << 16) | (28 << 24),
      27 | (26 << 8),
      0,
      9,
      0x0123,
      7,
      0,
      0,
      0,
      0,
      0,
    ]);
    expect(decodeGen6EventResults(words.buffer)[0]).toMatchObject({
      frame: 0,
      random: 0x8c7f_0aac,
      ec: 0x1234_5678,
      pid: 0x0123_4567,
      ivs: [31, 30, 29, 28, 27, 26],
      nature: 4,
      ability: 2,
      gender: 1,
      hiddenPower: 7,
      shiny: 2,
      frameUsed: 9,
    });
  });

  it("parses wc6 and wc6full payloads", () => {
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
    expect(parseGen6WonderCard("pikachu.wc6", card)).toMatchObject({
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
    expect(parseGen6WonderCard("pikachu.wc6full", full).species).toBe(25);
  });

  it("rejects invalid browser frame and IV combinations", () => {
    expect(() =>
      validateGen6EventRequest({ ...request, maxFrame: 5_000_001 }),
    ).toThrow(/5000000/);
    expect(() =>
      validateGen6EventRequest({
        ...request,
        event: {
          ...request.event,
          fixedIvs: [31, 31, 31, -1, -1, -1],
          randomPerfectIvCount: 3,
        },
      }),
    ).toThrow(/cannot exceed 5/);
  });
});
