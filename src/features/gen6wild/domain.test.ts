import { describe, expect, it } from "vitest";
import {
  decodeGen6WildResults,
  encodeGen6WildRequest,
  gen6WildAreas,
  gen6WildDefaultFilters,
  gen6WildHiddenPower,
  gen6WildSlots,
  validateGen6WildRequest,
  type Gen6WildRequest,
} from "./domain";

function request(overrides: Partial<Gen6WildRequest> = {}): Gen6WildRequest {
  const slots = gen6WildSlots(
    gen6WildAreas("omega-ruby", "normal")[0],
    "normal",
  );
  return {
    version: "omega-ruby",
    encounterType: "normal",
    seed: 0x12345678,
    minFrame: 0,
    maxFrame: 32,
    delay: 0,
    considerDelay: true,
    tsv: 0,
    trv: 0,
    shinyCharm: false,
    syncNature: null,
    lead: "none",
    tinySeed: 0xabcdef01,
    tinyFrame: 0,
    tinySynced: false,
    encounterRate: 100,
    partyPokemon: 0,
    pidRolls: 1,
    compoundEyes: false,
    hiddenAbility: false,
    flute: 0,
    hordeSlot: 1,
    slots,
    slotDistribution: [10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 4, 1],
    filters: gen6WildDefaultFilters(),
    resultLimit: 1000,
    ...overrides,
  };
}

describe("Gen VI Wild domain", () => {
  it("packs the fixed 96-word ABI and decodes result rows", () => {
    const packed = encodeGen6WildRequest(request());
    expect(packed).toHaveLength(96);
    const words = new Uint32Array(16);
    words[6] = 4 | (2 << 5) | (1 << 7) | (7 << 9) | (2 << 13) | (1 << 15);
    words[7] = 205 | (38 << 11) | (1 << 18);
    words[4] = 31 | (12 << 8) | (20 << 16) | (1 << 24);
    words[5] = 4 | (5 << 8);
    const [decoded] = decodeGen6WildResults(words.buffer);
    expect(decoded.ivs).toEqual([31, 12, 20, 1, 4, 5]);
    expect(decoded.nature).toBe(4);
    expect(decoded.species).toBe(205);
    expect(decoded.level).toBe(38);
  });

  it("expands horde level and version-specific slot data", () => {
    const area = gen6WildAreas("omega-ruby", "horde")[0];
    const slots = gen6WildSlots(area, "horde", 1, 0, "alpha-sapphire");
    expect(slots).toHaveLength(5);
    expect(slots.every((slot) => slot.level >= 1)).toBe(true);
  });

  it("rejects reversed IV ranges and out-of-budget frames", () => {
    expect(() =>
      validateGen6WildRequest(request({ maxFrame: 5_000_001 })),
    ).toThrow();
    expect(() =>
      validateGen6WildRequest(
        request({
          filters: {
            ...gen6WildDefaultFilters(),
            ivMin: [20, 0, 0, 0, 0, 0],
            ivMax: [10, 31, 31, 31, 31, 31],
          },
        }),
      ),
    ).toThrow();
  });

  it("matches the Gen VI Hidden Power bit ordering", () => {
    expect(gen6WildHiddenPower([1, 1, 1, 1, 1, 1])).toBe(15);
    expect(gen6WildHiddenPower([0, 0, 0, 1, 0, 0])).toBe(3);
  });
});
