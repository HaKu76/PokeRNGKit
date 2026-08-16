import { describe, expect, it } from "vitest";
import {
  appendGen7MainNeedle,
  GEN7_MAIN_MAX_SEED_CHUNK,
  GEN7_MAIN_SEED_SPACE,
  gen7MainNeedleMinimum,
  gen7MainSeedOffset,
  gen7MainStartingFrame,
  splitGen7MainSeedSearch,
  validateGen7MainQrRequest,
  validateGen7MainSeedRequest,
  validateGen7MainTimeRequest,
} from "./domain";

describe("Gen 7 Main RNG domain", () => {
  it("preserves the SM and USUM startup offsets", () => {
    expect(gen7MainStartingFrame("sun")).toBe(418);
    expect(gen7MainStartingFrame("ultra-moon")).toBe(478);
    expect(gen7MainStartingFrame("moon", "id")).toBe(1012);
    expect(gen7MainStartingFrame("ultra-sun", "id")).toBe(1132);
    expect(gen7MainSeedOffset("sun", "initial")).toBe(417);
    expect(gen7MainSeedOffset("ultra-sun", "initial")).toBe(477);
    expect(gen7MainNeedleMinimum("initial")).toBe(8);
    expect(gen7MainNeedleMinimum("id")).toBe(9);
  });

  it("normalizes end-position clock hands with the upstream offset rule", () => {
    expect(appendGen7MainNeedle([], 3, 4, false)).toEqual([3]);
    expect(appendGen7MainNeedle([], 3, 4, true)).toEqual([16]);
    expect(() =>
      appendGen7MainNeedle(new Array(16).fill(0), 0, 4, true),
    ).toThrow(/full/);
  });

  it("splits the complete 32-bit Seed space without gaps", () => {
    const chunks = splitGen7MainSeedSearch(GEN7_MAIN_MAX_SEED_CHUNK);
    expect(chunks).toHaveLength(256);
    expect(chunks[0]).toEqual({
      index: 0,
      startSeed: 0,
      seedCount: GEN7_MAIN_MAX_SEED_CHUNK,
    });
    expect(chunks.at(-1)!.startSeed + chunks.at(-1)!.seedCount).toBe(
      GEN7_MAIN_SEED_SPACE,
    );
  });

  it("enforces needle, frame, and NPC boundaries", () => {
    expect(() =>
      validateGen7MainSeedRequest({
        operation: "seed-search",
        version: "sun",
        mode: "initial",
        needles: new Array(7).fill(0),
      }),
    ).toThrow(/8\.\.16/);
    expect(() =>
      validateGen7MainSeedRequest({
        operation: "seed-search",
        version: "sun",
        mode: "id",
        needles: new Array(9).fill(17),
      }),
    ).toThrow(/0 to 16/);
    expect(() =>
      validateGen7MainQrRequest({
        operation: "qr-search",
        seed: 0,
        minFrame: 500,
        maxFrame: 499,
        needles: [0, 1],
      }),
    ).toThrow(/range/);
    expect(() =>
      validateGen7MainTimeRequest({
        operation: "time-calculator",
        seed: 0,
        startingFrame: 418,
        targetFrame: 500,
        npc: 51,
        fidget: false,
        raining: false,
      }),
    ).toThrow(/invalid/);
  });
});
