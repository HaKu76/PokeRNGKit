import { describe, expect, it } from "vitest";
import {
  parseGen5StaticIvCache,
  parseGen5StaticShaCache,
  prepareGen5StaticCache,
} from "./cache";
import type { Gen5StaticSearcherRequest } from "./domain";
import { gen5StaticTemplatesForVersion } from "./encounters";

const IV_MAGIC = 0xd08c_b7c0;
const SHA_MAGIC = 0x3c50_a97e;
const BASE_JD = 2_451_545;

function ivCache(seedHigh: number) {
  const words = new Uint32Array(13);
  words[0] = IV_MAGIC;
  words[1] = 0;
  words[2] = 0;
  words[10] = 1;
  words[12] = seedHigh;
  return words.buffer;
}

function julianDay(value: string) {
  return (
    BASE_JD +
    Math.round(
      (new Date(`${value}T00:00:00.000Z`).getTime() - Date.UTC(2000, 0, 1)) /
        86_400_000,
    )
  );
}

function shaCache(seedHigh: number, dates = ["2026-08-14"]) {
  const buffer = new ArrayBuffer(54 + dates.length * 16);
  const view = new DataView(buffer);
  view.setUint32(0, SHA_MAGIC, true);
  view.setUint32(12, 0x2233_4455, true);
  view.setUint32(16, 0x11, true);
  view.setUint32(20, julianDay(dates.at(-1) ?? "2026-08-14"), true);
  view.setUint32(24, julianDay(dates[0] ?? "2026-08-14"), true);
  view.setUint32(28, 1 << 14, true);
  view.setUint16(32, 0x1100, true);
  view.setUint16(34, 0x1100, true);
  view.setUint8(37, 0);
  view.setUint8(38, 0);
  view.setUint8(39, 6);
  view.setUint8(40, 0x82);
  view.setUint8(41, 8);
  view.setUint32(46, dates.length, true);
  dates.forEach((date, index) => {
    const offset = 54 + index * 16;
    view.setUint32(offset, 0, true);
    view.setUint32(offset + 4, Math.round(julianDay(date) - BASE_JD), true);
    view.setUint32(offset + 8, 0x89ab_cdef + index, true);
    view.setUint32(offset + 12, seedHigh, true);
  });
  return buffer;
}

const request: Gen5StaticSearcherRequest = {
  mode: "searcher",
  profile: {
    version: "black2",
    language: "english",
    dsType: "ds",
    tid: 12345,
    sid: 54321,
    mac: "001122334455",
    vcount: 0x82,
    timer0Min: 0x1100,
    timer0Max: 0x1100,
    gxstat: 6,
    vframe: 8,
    keypresses: [true, false, false, false, false, false, false, false, false],
    skipLR: false,
    memoryLink: false,
    shinyCharm: true,
  },
  template: gen5StaticTemplatesForVersion("starters", "black2")[0],
  startDate: "2026-08-14",
  endDate: "2026-08-14",
  initialAdvances: 0,
  maxAdvances: 0,
  offset: 0,
  initialIvAdvances: 0,
  maxIvAdvances: 0,
  lead: { type: "none" },
  luckyPower: "none",
  filters: {
    disabled: false,
    ivMin: [30, 30, 30, 0, 30, 30],
    ivMax: [31, 31, 31, 31, 31, 31],
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ability: 255,
    gender: 255,
    shiny: 255,
  },
  resultLimit: 100_000,
  cache: null,
};

describe("Gen 5 Static caches", () => {
  it("parses compatible IV and SHA1 cache headers", () => {
    const iv = parseGen5StaticIvCache(ivCache(0x1234_5678), "static.ivcache");
    const sha = parseGen5StaticShaCache(
      shaCache(0x1234_5678),
      "static.sha1cache",
    );
    expect(iv).toMatchObject({
      initialAdvances: 0,
      maxAdvances: 0,
      seedCount: 1,
    });
    expect(sha).toMatchObject({
      mac: "1122334455",
      startDate: "2026-08-14",
      endDate: "2026-08-14",
      timer0Min: 0x1100,
      timer0Max: 0x1100,
    });
  });

  it("prepares IV+SHA entries for a compatible profile", () => {
    const iv = parseGen5StaticIvCache(ivCache(0x1234_5678), "static.ivcache");
    const sha = parseGen5StaticShaCache(
      shaCache(0x1234_5678),
      "static.sha1cache",
    );
    expect(prepareGen5StaticCache(request, iv, sha)?.descriptor).toMatchObject({
      mode: "iv-sha",
      ivEntryCount: 1,
      shaEntryCount: 1,
    });
  });

  it("falls back to IV-only when a compatible SHA file has no selected entries", () => {
    const iv = parseGen5StaticIvCache(ivCache(0x1234_5678), "static.ivcache");
    const sha = parseGen5StaticShaCache(
      shaCache(0x8765_4321),
      "static.sha1cache",
    );
    expect(prepareGen5StaticCache(request, iv, sha)?.descriptor).toMatchObject({
      mode: "iv",
      ivEntryCount: 1,
      shaEntryCount: 0,
    });
  });

  it("distinguishes same-name caches with equal counts but different contents", () => {
    const first = parseGen5StaticIvCache(
      ivCache(0x1234_5678),
      "static.ivcache",
    );
    const second = parseGen5StaticIvCache(
      ivCache(0x8765_4321),
      "static.ivcache",
    );
    const firstKey = prepareGen5StaticCache(request, first)?.descriptor.key;
    const secondKey = prepareGen5StaticCache(request, second)?.descriptor.key;
    expect(firstKey).toBeTruthy();
    expect(secondKey).toBeTruthy();
    expect(firstKey).not.toBe(secondKey);
  });

  it("reloads filtered SHA entries when the request date range changes", () => {
    const iv = parseGen5StaticIvCache(ivCache(0x1234_5678), "static.ivcache");
    const sha = parseGen5StaticShaCache(
      shaCache(0x1234_5678, ["2026-08-14", "2026-08-15"]),
      "static.sha1cache",
    );
    const narrow = prepareGen5StaticCache(request, iv, sha);
    const wide = prepareGen5StaticCache(
      { ...request, endDate: "2026-08-15" },
      iv,
      sha,
    );
    expect(narrow?.descriptor.shaEntryCount).toBe(1);
    expect(wide?.descriptor.shaEntryCount).toBe(2);
    expect(narrow?.descriptor.key).not.toBe(wide?.descriptor.key);
  });

  it("rejects truncated cache files", () => {
    expect(() =>
      parseGen5StaticIvCache(new ArrayBuffer(8), "bad.ivcache"),
    ).toThrow(/Invalid IV Cache/);
    expect(() =>
      parseGen5StaticShaCache(new ArrayBuffer(55), "bad.sha1cache"),
    ).toThrow(/Invalid SHA1 Cache/);
  });
});
