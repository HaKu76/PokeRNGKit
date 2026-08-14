import { describe, expect, it } from "vitest";
import {
  appendGen5Sha1CacheResults,
  createGen5Sha1CacheData,
  GEN5_SHA1CACHE_BASE_JD,
  GEN5_SHA1CACHE_BUTTON_MASKS,
  GEN5_SHA1CACHE_MAGIC,
  gen5Sha1CacheDateOffset,
  gen5Sha1CacheUnit,
  gen5Sha1CacheUnitCount,
  parseGen5IvCache,
  serializeGen5Sha1Cache,
  type Gen5Sha1CacheRequest,
} from "./domain";

function fixture() {
  const counts = [2, 1, 1, 1, 0, 1, 1, 1, 2];
  const words = [
    0xd08c_b7c0,
    0,
    0,
    ...counts,
    11,
    11,
    12,
    13,
    14,
    20,
    21,
    22,
    30,
    30,
  ];
  const buffer = new ArrayBuffer(words.length * 4);
  const view = new DataView(buffer);
  words.forEach((word, index) => view.setUint32(index * 4, word, true));
  return buffer;
}

function request(
  version: Gen5Sha1CacheRequest["profile"]["version"] = "black",
) {
  return {
    profile: {
      version,
      language: "spanish",
      dsType: "3ds",
      mac: "112233445566",
      vcount: 0x60,
      timer0Min: 0xc7f,
      timer0Max: 0xc80,
      gxstat: 6,
      vframe: 8,
    },
    startDate: "2000-01-01",
    endDate: "2000-01-02",
    seeds: parseGen5IvCache(fixture(), version),
  } satisfies Gen5Sha1CacheRequest;
}

describe("Gen 5 SHA1 Cache domain", () => {
  it("matches the DS date range and all upstream keypress combinations", () => {
    expect(gen5Sha1CacheDateOffset("2000-01-01")).toBe(0);
    expect(gen5Sha1CacheDateOffset("2099-12-31")).toBe(36_524);
    expect(GEN5_SHA1CACHE_BUTTON_MASKS[0]).toBe(0);
    expect(GEN5_SHA1CACHE_BUTTON_MASKS).not.toContain(0x300);
    expect(GEN5_SHA1CACHE_BUTTON_MASKS).not.toContain(0xc00);
    expect(GEN5_SHA1CACHE_BUTTON_MASKS).not.toContain(0xc3);
    expect(GEN5_SHA1CACHE_BUTTON_MASKS).toHaveLength(2_144);
    expect(GEN5_SHA1CACHE_BUTTON_MASKS.at(-1)).toBe(0xafc);
  });

  it("selects and deduplicates BW and BW2 Normal IV Cache buckets", () => {
    const bw = parseGen5IvCache(fixture(), "black");
    const bw2 = parseGen5IvCache(fixture(), "black2");
    expect([...bw.entralink]).toEqual([11, 12, 13, 14]);
    expect([...bw.normal]).toEqual([20]);
    expect([...bw2.normal]).toEqual([22]);
    expect([...bw.roamer]).toEqual([30]);
  });

  it("rejects truncated and trailing IV Cache data", () => {
    expect(() => parseGen5IvCache(fixture().slice(0, -4), "black")).toThrow(
      "Invalid IV Cache",
    );
    const trailing = new Uint8Array(fixture().byteLength + 4);
    trailing.set(new Uint8Array(fixture()));
    expect(() => parseGen5IvCache(trailing.buffer, "black")).toThrow(
      "Invalid IV Cache",
    );
  });

  it("rejects IV Cache files over the browser seed limit", () => {
    const wordCount = 3 + 9 + 1_000_001;
    const buffer = new ArrayBuffer(wordCount * 4);
    const view = new DataView(buffer);
    view.setUint32(0, 0xd08c_b7c0, true);
    view.setUint32(3 * 4, 1_000_001, true);
    expect(() => parseGen5IvCache(buffer, "black")).toThrow("Invalid IV Cache");
  });

  it("maps unit indexes in Timer0, date and keypress order", () => {
    const value = request();
    const keys = GEN5_SHA1CACHE_BUTTON_MASKS.length;
    expect(gen5Sha1CacheUnitCount(value)).toBe(4 * keys);
    expect(gen5Sha1CacheUnit(value, 0)).toMatchObject({
      timer0: 0xc7f,
      date: "2000-01-01",
      buttonMask: 0,
    });
    expect(gen5Sha1CacheUnit(value, keys)).toMatchObject({
      timer0: 0xc7f,
      date: "2000-01-02",
      buttonMask: 0,
    });
    expect(gen5Sha1CacheUnit(value, keys * 2)).toMatchObject({
      timer0: 0xc80,
      date: "2000-01-01",
      buttonMask: 0,
    });
  });

  it("decodes categories and writes the exact little-endian SHA1 Cache layout", () => {
    const value = request();
    const cache = createGen5Sha1CacheData(value);
    const unit = gen5Sha1CacheUnit(value, 0);
    const result = new Uint32Array([
      0x89ab_cdef, 0x0123_4567, 12_345, 0, 0x89ab_cdef, 0x0123_4567, 12_345, 2,
      0x0123_4567, 0x89ab_cdef, 1, 1,
    ]);
    expect(appendGen5Sha1CacheResults(cache, unit, result.buffer, 3)).toBe(3);
    const buffer = serializeGen5Sha1Cache(cache);
    const view = new DataView(buffer);
    expect(buffer.byteLength).toBe(54 + 48);
    expect(view.getUint32(0, true)).toBe(GEN5_SHA1CACHE_MAGIC);
    expect(view.getUint32(12, true)).toBe(0x3344_5566);
    expect(view.getUint32(16, true)).toBe(0x0000_1122);
    expect(view.getUint32(20, true)).toBe(GEN5_SHA1CACHE_BASE_JD + 1);
    expect(view.getUint32(24, true)).toBe(GEN5_SHA1CACHE_BASE_JD);
    expect(view.getUint32(28, true)).toBe(1 << 12);
    expect(view.getUint8(37)).toBe(2);
    expect(view.getUint8(38)).toBe(6);
    expect(view.getUint32(42, true)).toBe(1);
    expect(view.getUint32(46, true)).toBe(1);
    expect(view.getUint32(50, true)).toBe(1);
    expect(view.getUint32(54, true)).toBe(12_345 << 12);
    expect(view.getUint32(58, true)).toBe(0x0c7f_0000);
    expect(view.getUint32(62, true)).toBe(0x89ab_cdef);
    expect(view.getUint32(66, true)).toBe(0x0123_4567);
  });
});
