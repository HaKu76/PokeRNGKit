import { describe, expect, it } from "vitest";
import {
  decodeGen4SwarmAdvances,
  decodeGen4SwarmSeed,
  gen4SwarmEncounters,
  packGen4SwarmAdvanceRequest,
  packGen4SwarmSeedRequest,
  validateGen4SwarmRequest,
  type Gen4SwarmAdvanceRequest,
} from "./domain";

describe("Gen4 Swarm domain", () => {
  it("keeps the upstream encounter table lengths and limits", () => {
    expect(gen4SwarmEncounters.dp).toHaveLength(28);
    expect(gen4SwarmEncounters.pt).toHaveLength(22);
    expect(gen4SwarmEncounters.hg).toHaveLength(20);
    expect(
      validateGen4SwarmRequest({
        mode: "seed",
        game: "pt",
        targetIndex: 21,
        minDelay: 600,
        minHour: 0,
        mtAdvances: 9999,
      }),
    ).toEqual([]);
  });

  it("validates seed and advance ranges", () => {
    const request: Gen4SwarmAdvanceRequest = {
      mode: "advances",
      game: "dp",
      seed: 0xabcd,
      targetIndex: 9,
      minAdvance: 10,
      maxAdvance: 20,
    };
    expect(validateGen4SwarmRequest(request)).toEqual([]);
    expect(
      validateGen4SwarmRequest({ ...request, maxAdvance: 100_011 }),
    ).toContain("advanceRange");
    expect(validateGen4SwarmRequest({ ...request, targetIndex: 28 })).toContain(
      "targetIndex",
    );
    expect(
      validateGen4SwarmRequest({
        mode: "seed",
        game: "hg",
        targetIndex: 0,
        minDelay: 599,
        minHour: 24,
        mtAdvances: 10,
      }),
    ).toEqual(["minDelay", "minHour"]);
  });

  it("packs requests and decodes fixed-width results", () => {
    expect(
      Array.from(
        packGen4SwarmAdvanceRequest({
          mode: "advances",
          game: "dp",
          seed: 0xabcd,
          targetIndex: 9,
          minAdvance: 10,
          maxAdvance: 20,
        }),
      ),
    ).toEqual([0, 0xabcd, 9, 10, 20]);
    expect(
      Array.from(
        packGen4SwarmSeedRequest({
          mode: "seed",
          game: "ss",
          targetIndex: 1,
          minDelay: 600,
          minHour: 3,
          mtAdvances: 5,
        }),
      ),
    ).toEqual([3, 1, 600, 3, 5]);
    expect(decodeGen4SwarmAdvances(new Uint32Array([15, 9]).buffer)).toEqual([
      { advance: 15, encounterIndex: 9 },
    ]);
    expect(
      decodeGen4SwarmSeed(new Uint32Array([0x01020304, 2, 700, 4]).buffer),
    ).toEqual([{ seed: 0x01020304, hour: 2, delay: 700, mtAdvances: 4 }]);
  });
});
