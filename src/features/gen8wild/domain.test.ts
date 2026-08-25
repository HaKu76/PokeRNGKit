import { describe, expect, it } from "vitest";
import {
  decodeGen8WildResults,
  encodeGen8WildRequest,
  gen8WildSettings,
  splitGen8WildRequest,
  validateGen8WildRequest,
  type Gen8WildRequest,
} from "./domain";
import { getGen8WildSlots } from "./encounters";

const request: Gen8WildRequest = {
  profile: {
    version: "brilliantdiamond",
    tid: 12345,
    sid: 54321,
    nationalDex: false,
  },
  seed0: "1234567887654321",
  seed1: "8765432112345678",
  initialAdvances: 0,
  maxAdvances: 9,
  offset: 0,
  encounter: "grass",
  location: 170,
  time: 0,
  radar: false,
  swarm: false,
  replacement: [0, 0],
  feebasTile: false,
  lead: 255,
  honeyIndex: 0,
  filters: {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    slotMask: 0xfff,
    levelMin: 1,
    levelMax: 100,
    heightMin: 0,
    heightMax: 255,
    weightMin: 0,
    weightMax: 255,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  },
  resultLimit: 100,
};

describe("Gen 8 Wild domain", () => {
  it("packs a 50-word request and preserves chunk order", () => {
    const chunks = splitGen8WildRequest(request, 2, 3);
    expect(chunks.map((chunk) => chunk.start)).toEqual([0, 3, 6, 8, 9]);
    expect(encodeGen8WildRequest(request, chunks[0])).toHaveLength(50);
  });

  it("requires one Honey Tree slot", () => {
    const slots = getGen8WildSlots(
      gen8WildSettings({
        ...request,
        encounter: "honeyTree",
        location: 145,
      }),
    );
    expect(slots.length).toBeGreaterThan(0);
    expect(() =>
      validateGen8WildRequest({
        ...request,
        encounter: "honeyTree",
        location: 145,
        filters: { ...request.filters, slotMask: 0xfff },
      }),
    ).toThrow("Please select one encounter slot");
  });

  it("rejects an all-zero seed pair and overflow", () => {
    expect(() =>
      validateGen8WildRequest({
        ...request,
        seed0: "0",
        seed1: "0",
      }),
    ).toThrow("Please insert missing seed information");
    expect(() =>
      validateGen8WildRequest({
        ...request,
        initialAdvances: 0xffff_fffe,
        maxAdvances: 2,
      }),
    ).toThrow(/exceeds/);
  });

  it("decodes the compact result layout", () => {
    const words = new Uint32Array(12);
    words[0] = 7;
    words[1] = 0x12345678;
    words[2] = 0x9abcdef0;
    words[3] = (278 << 16) | 151;
    words[4] = 41 | (16 << 11) | (5 << 18);
    words[5] = 0x13181012;
    words[6] = 0x00001002;
    words[7] = 93;
    words[11] = 72 | (97 << 8) | (14 << 16) | (3 << 21);
    const [result] = decodeGen8WildResults(words.buffer);
    expect(result).toMatchObject({
      advances: 7,
      species: 278,
      item: 151,
      slot: 5,
      nature: 16,
      ec: "12345678",
      pid: "9ABCDEF0",
      hiddenPower: 3,
    });
  });
});
