import { describe, expect, it } from "vitest";
import {
  decodeGen3NgcSeedStates,
  formatGen3NgcSeed,
  validateGen3NgcSeedRequest,
} from "./domain";
import { qtChecksumIso3309 } from "./precalc";

describe("Gen3 NGC Seed domain", () => {
  it("accepts the upstream Gales, Colo and Channel bounds", () => {
    expect(
      validateGen3NgcSeedRequest({
        mode: "gales",
        playerIndex: 4,
        enemyIndex: 4,
        enemyHp: [0, 714],
        playerHp: [714, 0],
      }),
    ).toEqual([]);
    expect(
      validateGen3NgcSeedRequest({ mode: "colo", partyLead: 7, trainer: 2 }),
    ).toEqual([]);
    expect(
      validateGen3NgcSeedRequest({
        mode: "channel",
        patterns: Array(10).fill(11),
      }),
    ).toEqual([]);
  });

  it("rejects invalid HP, indexes and Channel patterns", () => {
    expect(
      validateGen3NgcSeedRequest({
        mode: "invalid" as "gales",
      }),
    ).toContain("mode");
    expect(
      validateGen3NgcSeedRequest({
        mode: "gales",
        playerIndex: 5,
        enemyIndex: -1,
        enemyHp: [-1, 715],
        playerHp: [1, 1],
      }),
    ).toEqual(["playerIndex", "enemyIndex", "enemyHp"]);
    expect(
      validateGen3NgcSeedRequest({ mode: "colo", partyLead: 8, trainer: 3 }),
    ).toEqual(["partyLead", "trainer"]);
    expect(
      validateGen3NgcSeedRequest({
        mode: "channel",
        patterns: Array(10).fill(14),
      }),
    ).toEqual(["patterns"]);
    expect(
      validateGen3NgcSeedRequest({
        mode: "channel",
        patterns: Array(10).fill(11),
        seeds: [],
      }),
    ).toEqual(["seeds"]);
  });

  it("decodes and formats fixed-width Seed records", () => {
    expect(
      decodeGen3NgcSeedStates(new Uint32Array([0, 0x89abcdef]).buffer),
    ).toEqual([{ seed: 0 }, { seed: 0x89abcdef }]);
    expect(formatGen3NgcSeed(0x1234)).toBe("1234");
  });

  it("matches the Qt ISO 3309 checksum used by upstream Precalc files", () => {
    expect(qtChecksumIso3309(new Uint8Array())).toBe(0);
    expect(qtChecksumIso3309(new TextEncoder().encode("123456789"))).toBe(
      0x906e,
    );
  });
});
