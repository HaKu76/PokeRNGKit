import { describe, expect, it } from "vitest";
import {
  gen5HiddenGrottoFastSearchEligible,
  parseGen5HiddenGrottoIvCache,
  parseGen5HiddenGrottoShaCache,
  prepareGen5HiddenGrottoCache,
  withGen5HiddenGrottoCache,
} from "./cache";
import type { Gen5HiddenGrottoSearcherRequest } from "./domain";
import { GEN5_HIDDEN_GROTTO_AREAS } from "./encounters";

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

function shaCache(seedHigh: number, dates = ["2026-08-14"], buttonMask = 0) {
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
    view.setUint32(offset, buttonMask, true);
    view.setUint32(offset + 4, julianDay(date) - BASE_JD, true);
    view.setUint32(offset + 8, 0x89ab_cdef + index, true);
    view.setUint32(offset + 12, seedHigh, true);
  });
  return buffer;
}

const request: Gen5HiddenGrottoSearcherRequest = {
  operation: "pokemon-searcher",
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
  area: GEN5_HIDDEN_GROTTO_AREAS[0],
  startDate: "2026-08-14",
  endDate: "2026-08-14",
  initialAdvances: 0,
  maxAdvances: 0,
  offset: 0,
  initialIvAdvances: 0,
  maxIvAdvances: 0,
  lead: { type: "none" },
  grottoPower: "none",
  selectedGroup: 0,
  selectedSlot: 0,
  gender: 0,
  slotFilters: { slotMask: 0, genderMask: 0, groupMask: 0 },
  pokemonFilters: {
    disabled: false,
    ivMin: [30, 30, 30, 0, 30, 30],
    ivMax: [31, 31, 31, 31, 31, 31],
    natureMask: 0,
    hiddenPowerMask: 0,
    levelMin: 10,
    levelMax: 15,
  },
  resultLimit: 100_000,
  cache: null,
};

describe("Gen 5 Hidden Grotto caches", () => {
  it("reuses the compatible Gen 5 IV and SHA1 cache parsers", () => {
    const iv = parseGen5HiddenGrottoIvCache(
      ivCache(0x1234_5678),
      "grotto.ivcache",
    );
    const sha = parseGen5HiddenGrottoShaCache(
      shaCache(0x1234_5678),
      "grotto.sha1cache",
    );
    expect(iv).toMatchObject({
      initialAdvances: 0,
      maxAdvances: 0,
      seedCount: 1,
    });
    expect(iv.buckets.normal[2]).toEqual(new Uint32Array([0x1234_5678]));
    expect(sha).toMatchObject({
      mac: "1122334455",
      startDate: "2026-08-14",
      endDate: "2026-08-14",
      timer0Min: 0x1100,
      timer0Max: 0x1100,
    });
  });

  it("requires the upstream high-IV spread shape for fast search", () => {
    const iv = parseGen5HiddenGrottoIvCache(
      ivCache(0x1234_5678),
      "grotto.ivcache",
    );
    expect(gen5HiddenGrottoFastSearchEligible(request, iv)).toBe(true);
    expect(
      gen5HiddenGrottoFastSearchEligible(
        {
          ...request,
          pokemonFilters: {
            ...request.pokemonFilters,
            ivMin: [29, 30, 30, 0, 30, 30],
          },
        },
        iv,
      ),
    ).toBe(false);
    expect(
      gen5HiddenGrottoFastSearchEligible(
        { ...request, operation: "slot-searcher" },
        iv,
      ),
    ).toBe(false);
  });

  it("prepares IV+SHA entries for a compatible BW2 profile", () => {
    const iv = parseGen5HiddenGrottoIvCache(
      ivCache(0x1234_5678),
      "grotto.ivcache",
    );
    const sha = parseGen5HiddenGrottoShaCache(
      shaCache(0x1234_5678),
      "grotto.sha1cache",
    );
    const prepared = prepareGen5HiddenGrottoCache(request, iv, sha);
    expect(prepared?.descriptor).toMatchObject({
      mode: "iv-sha",
      ivEntryCount: 1,
      shaEntryCount: 1,
    });
    expect(prepared?.ivEntries).toEqual(new Uint32Array([0, 0x1234_5678]));
    expect(prepared?.shaEntries).toEqual(
      new Uint32Array([
        0,
        julianDay("2026-08-14") - BASE_JD,
        0x89ab_cdef,
        0x1234_5678,
      ]),
    );
    expect(withGen5HiddenGrottoCache(request, prepared).cache).toEqual(
      prepared?.descriptor,
    );
  });

  it("falls back to IV-only when SHA entries do not match seed or Keypresses", () => {
    const iv = parseGen5HiddenGrottoIvCache(
      ivCache(0x1234_5678),
      "grotto.ivcache",
    );
    const wrongSeed = parseGen5HiddenGrottoShaCache(
      shaCache(0x8765_4321),
      "grotto.sha1cache",
    );
    const wrongButtons = parseGen5HiddenGrottoShaCache(
      shaCache(0x1234_5678, ["2026-08-14"], 1),
      "grotto.sha1cache",
    );
    expect(
      prepareGen5HiddenGrottoCache(request, iv, wrongSeed)?.descriptor.mode,
    ).toBe("iv");
    expect(
      prepareGen5HiddenGrottoCache(request, iv, wrongButtons)?.descriptor.mode,
    ).toBe("iv");
  });

  it("changes the descriptor fingerprint for content and date subsets", () => {
    const first = parseGen5HiddenGrottoIvCache(
      ivCache(0x1234_5678),
      "grotto.ivcache",
    );
    const parsedSecond = parseGen5HiddenGrottoIvCache(
      ivCache(0x8765_4321),
      "grotto.ivcache",
    );
    const second = { ...parsedSecond, identity: first.identity };
    expect(
      prepareGen5HiddenGrottoCache(request, first)?.descriptor.key,
    ).not.toBe(prepareGen5HiddenGrottoCache(request, second)?.descriptor.key);

    const sha = parseGen5HiddenGrottoShaCache(
      shaCache(0x1234_5678, ["2026-08-14", "2026-08-15"]),
      "grotto.sha1cache",
    );
    const narrow = prepareGen5HiddenGrottoCache(request, first, sha);
    const wide = prepareGen5HiddenGrottoCache(
      { ...request, endDate: "2026-08-15" },
      first,
      sha,
    );
    expect(narrow?.descriptor.shaEntryCount).toBe(1);
    expect(wide?.descriptor.shaEntryCount).toBe(2);
    expect(narrow?.descriptor.key).not.toBe(wide?.descriptor.key);
  });

  it("rejects invalid or truncated cache files", () => {
    expect(() =>
      parseGen5HiddenGrottoIvCache(new ArrayBuffer(8), "bad.ivcache"),
    ).toThrow(/Invalid IV Cache/);
    expect(() =>
      parseGen5HiddenGrottoShaCache(new ArrayBuffer(55), "bad.sha1cache"),
    ).toThrow(/Invalid SHA1 Cache/);
  });
});
