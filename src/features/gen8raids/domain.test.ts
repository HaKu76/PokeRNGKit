import { describe, expect, it } from "vitest";
import { GEN8_RAID_DENS } from "./data";
import {
  decodeGen8RaidResults,
  encodeGen8RaidRequest,
  gen8RaidTaskCount,
  splitGen8RaidRequest,
  validateGen8RaidRequest,
  type Gen8RaidRequest,
} from "./domain";
import { Gen8RaidWorkerPool } from "./worker/Gen8RaidWorkerPool";

const template = GEN8_RAID_DENS[0].sword[0];
function request(): Gen8RaidRequest {
  return {
    profile: { version: "sword", tid: 12345, sid: 54321 },
    seed: "1234567887654321",
    initialAdvances: 3,
    maxAdvances: 9,
    offset: 2,
    template,
    level: 50,
    genderRatio: 127,
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
      perfectIvValue: 31,
      perfectIvCount: 0,
    },
    resultLimit: 100,
  };
}

describe("Gen 8 Raids domain", () => {
  it("packs 43 request words and splits inclusive frame ranges", () => {
    const value = request();
    expect(validateGen8RaidRequest(value)).toBe(value);
    expect(gen8RaidTaskCount(value)).toBe(10);
    const chunks = splitGen8RaidRequest(value, 2, 3);
    expect(chunks.reduce((sum, chunk) => sum + chunk.count, 0)).toBe(10);
    expect(encodeGen8RaidRequest(value, chunks[0])).toHaveLength(43);
  });

  it("rejects an overflowing advance window", () => {
    const value = request();
    value.initialAdvances = 0xffff_ffff;
    expect(() => validateGen8RaidRequest(value)).toThrow(/exceeds/);
  });

  it("rejects filter choices that are not exposed by the upstream Raid form", () => {
    const nonshiny = request();
    nonshiny.filters.shiny = "nonshiny" as typeof nonshiny.filters.shiny;
    expect(() => validateGen8RaidRequest(nonshiny)).toThrow(/filter choice/);

    const genderless = request();
    genderless.filters.gender =
      "genderless" as typeof genderless.filters.gender;
    expect(() => validateGen8RaidRequest(genderless)).toThrow(/filter choice/);
  });

  it("decodes packed result metadata and IVs", () => {
    const words = new Uint32Array(12);
    words[3] = 2 | (1 << 2) | (12 << 4) | (1 << 9) | (7 << 11);
    words[4] = 40 | (80 << 8);
    words[5] = 1 | (2 << 8) | (3 << 16) | (4 << 24);
    words[6] = 5 | (6 << 8);
    words[11] = 25 | (2 << 10) | (7 << 16) | (1 << 24);
    const [result] = decodeGen8RaidResults(words.buffer);
    expect(result).toMatchObject({
      ability: 2,
      gender: 1,
      nature: 12,
      shiny: 1,
      characteristic: 7,
      height: 40,
      weight: 80,
      ivs: [1, 2, 3, 4, 5, 6],
      species: 25,
      form: 2,
      starMask: 7,
      gigantamax: true,
    });
  });

  it("rejects non-finite Worker Pool options before creating Workers", async () => {
    const engine = new Gen8RaidWorkerPool();
    await expect(
      engine.search(request(), { workerCount: Number.NaN }),
    ).rejects.toThrow(/Worker count.*finite/);
    await expect(
      engine.search(request(), { maxResults: Number.POSITIVE_INFINITY }),
    ).rejects.toThrow(/Max results.*finite/);
  });
});
