import { describe, expect, it } from "vitest";
import {
  appendGen5IvCacheHits,
  createGen5IvCacheData,
  gen5IvCacheChunk,
  gen5IvCacheChunkCount,
  GEN5_IVCACHE_MAX_BROWSER_ADVANCES,
  GEN5_IVCACHE_MAX_BROWSER_INITIAL_ADVANCES,
  GEN5_IVCACHE_MAGIC,
  GEN5_IVCACHE_RESULT_LIMIT,
  parseGen5IvCacheAdvance,
  serializeGen5IvCache,
  validateGen5IvCacheExecution,
  validateGen5IvCacheRequest,
} from "./domain";

describe("Gen 5 IV Cache domain", () => {
  it("matches Advance32Bit parsing and empty-value behavior", () => {
    expect(parseGen5IvCacheAdvance("")).toBe(0);
    expect(parseGen5IvCacheAdvance("4294967295")).toBe(0xffff_ffff);
    expect(parseGen5IvCacheAdvance("4294967296")).toBeUndefined();
    expect(parseGen5IvCacheAdvance("12A")).toBeUndefined();
    expect(
      validateGen5IvCacheRequest({
        initialAdvances: 0xffff_ffff,
        maxAdvances: 0xffff_ffff,
      }),
    ).toEqual([]);
    expect(
      validateGen5IvCacheExecution({
        initialAdvances: 0,
        maxAdvances: GEN5_IVCACHE_MAX_BROWSER_ADVANCES + 1,
      }),
    ).toEqual(["maxAdvances"]);
    expect(
      validateGen5IvCacheExecution({
        initialAdvances: GEN5_IVCACHE_MAX_BROWSER_INITIAL_ADVANCES,
        maxAdvances: GEN5_IVCACHE_MAX_BROWSER_ADVANCES,
      }),
    ).toEqual([]);
    expect(
      validateGen5IvCacheExecution({
        initialAdvances: GEN5_IVCACHE_MAX_BROWSER_INITIAL_ADVANCES + 1,
        maxAdvances: 0,
      }),
    ).toEqual(["initialAdvances"]);
  });

  it("covers the complete 32-bit seed space without overlap", () => {
    expect(gen5IvCacheChunkCount()).toBe(0x1_0000);
    expect(gen5IvCacheChunk(0)).toEqual({
      index: 0,
      startSeed: 0,
      seedCount: 0x1_0000,
    });
    expect(gen5IvCacheChunk(0xffff)).toEqual({
      index: 0xffff,
      startSeed: 0xffff_0000,
      seedCount: 0x1_0000,
    });
  });

  it("decodes packed hits and rejects invalid buckets", () => {
    const cache = createGen5IvCacheData({
      initialAdvances: 0,
      maxAdvances: 0,
    });
    appendGen5IvCacheHits(
      cache,
      Uint32Array.of(0, 4, 0x5678, 1, 2, 0x4321).buffer,
      2,
      { index: 0, startSeed: 0, seedCount: 0x1_0000 },
    );
    expect(cache.entralink.get(4)).toEqual([0x5678]);
    expect(cache.normal.get(2)).toEqual([0x4321]);
    expect(() =>
      appendGen5IvCacheHits(cache, Uint32Array.of(2, 1, 0).buffer, 1, {
        index: 0,
        startSeed: 0,
        seedCount: 0x1_0000,
      }),
    ).toThrow("invalid advance");
    expect(() =>
      appendGen5IvCacheHits(cache, Uint32Array.of(2, 0, 0x1_0000).buffer, 1, {
        index: 0,
        startSeed: 0,
        seedCount: 0x1_0000,
      }),
    ).toThrow("outside its chunk");
  });

  it("writes the upstream little-endian ivcache layout", async () => {
    const cache = createGen5IvCacheData({
      initialAdvances: 0,
      maxAdvances: 0,
    });
    cache.entralink.set(0, [5, 1]);
    cache.normal.set(0, [9]);
    cache.roamer.set(0, [3]);
    const blob = serializeGen5IvCache(cache);
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    const words = Array.from({ length: buffer.byteLength / 4 }, (_, index) =>
      view.getUint32(index * 4, true),
    );
    expect(words).toEqual([
      GEN5_IVCACHE_MAGIC,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      5,
      9,
      3,
    ]);
  });

  it("rejects cache serialization beyond the browser result limit", () => {
    const cache = createGen5IvCacheData({
      initialAdvances: 0,
      maxAdvances: 0,
    });
    const oversized: number[] = [];
    oversized.length = GEN5_IVCACHE_RESULT_LIMIT + 1;
    cache.normal.set(0, oversized);
    expect(() => serializeGen5IvCache(cache)).toThrow(/result limit/);
  });
});
