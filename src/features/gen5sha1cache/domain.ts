/*
 * PokeRNGKit Gen V SHA1 Cache Finder domain
 * Copyright (C) 2026 Hakuhiro
 *
 * File layouts and search ordering are adapted from PokeFinder 4.3.2
 * IVCache, SHA1Cache and SHA1CacheSearcher (GPL-3.0-or-later).
 */
import type {
  Gen5DsType,
  Gen5GameVersion,
  Gen5Language,
  Gen5Profile,
} from "../gen5profiles/domain";

export const GEN5_SHA1CACHE_API_VERSION = 1;
export const GEN5_SHA1CACHE_IV_MAGIC = 0xd08c_b7c0;
export const GEN5_SHA1CACHE_MAGIC = 0x3c50_a97e;
export const GEN5_SHA1CACHE_MIN_DATE = "2000-01-01";
export const GEN5_SHA1CACHE_MAX_DATE = "2099-12-31";
export const GEN5_SHA1CACHE_BASE_JD = 2_451_545;
export const GEN5_SHA1CACHE_RESULT_WORDS = 4;
export const GEN5_SHA1CACHE_SECONDS_PER_UNIT = 86_400;
export const GEN5_SHA1CACHE_RESULT_LIMIT = 1_000_000;
export const GEN5_SHA1CACHE_BATCH_RESULT_LIMIT = 100_000;
export const GEN5_SHA1CACHE_SEED_LIMIT = 1_000_000;

export type Gen5Sha1CacheType = "entralink" | "normal" | "roamer";

export interface Gen5Sha1CacheProfile {
  version: Gen5GameVersion;
  language: Gen5Language;
  dsType: Gen5DsType;
  mac: string;
  vcount: number;
  timer0Min: number;
  timer0Max: number;
  gxstat: number;
  vframe: number;
}

export interface Gen5Sha1CacheSeeds {
  initialAdvances: number;
  maxAdvances: number;
  entralink: Uint32Array;
  normal: Uint32Array;
  roamer: Uint32Array;
}

export interface Gen5Sha1CacheRequest {
  profile: Gen5Sha1CacheProfile;
  startDate: string;
  endDate: string;
  seeds: Gen5Sha1CacheSeeds;
}

export interface Gen5Sha1CacheUnit {
  index: number;
  timer0: number;
  date: string;
  dateOffset: number;
  buttonMask: number;
}

export interface Gen5Sha1CacheEntry {
  keyLow: number;
  keyHigh: number;
  seedLow: number;
  seedHigh: number;
}

export interface Gen5Sha1CacheData {
  request: Gen5Sha1CacheRequest;
  entralink: Gen5Sha1CacheEntry[];
  normal: Gen5Sha1CacheEntry[];
  roamer: Gen5Sha1CacheEntry[];
}

const CACHE_TYPES = ["entralink", "normal", "roamer"] as const;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAC = /^[0-9a-fA-F]{1,12}$/;
const MS_PER_DAY = 86_400_000;

function popcount(value: number) {
  let count = 0;
  for (let bits = value; bits !== 0; bits >>>= 1) count += bits & 1;
  return count;
}

function validButtonMask(mask: number) {
  return (
    popcount(mask) <= 8 &&
    (mask & 0xc00) !== 0xc00 &&
    (mask & 0x300) !== 0x300 &&
    (mask & 0x0c3) !== 0x0c3
  );
}

export const GEN5_SHA1CACHE_BUTTON_MASKS = Object.freeze(
  Array.from({ length: 0x1000 }, (_, mask) => mask).filter(validButtonMask),
);

function integerIn(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function dateValue(value: string) {
  const match = ISO_DATE.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const milliseconds = Date.UTC(year, month - 1, day);
  const date = new Date(milliseconds);
  if (
    year < 2000 ||
    year > 2099 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return milliseconds;
}

export function gen5Sha1CacheDateOffset(value: string) {
  const milliseconds = dateValue(value);
  if (milliseconds === undefined)
    throw new RangeError("Date must be between 2000-01-01 and 2099-12-31.");
  return Math.round((milliseconds - Date.UTC(2000, 0, 1)) / MS_PER_DAY);
}

export function gen5Sha1CacheDateFromOffset(offset: number) {
  if (!integerIn(offset, 0, 36_524))
    throw new RangeError("Invalid Gen 5 SHA1 Cache date offset.");
  return new Date(Date.UTC(2000, 0, 1) + offset * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

export function gen5Sha1CacheProfile(
  profile: Gen5Profile,
): Gen5Sha1CacheProfile {
  return {
    version: profile.version,
    language: profile.language,
    dsType: profile.dsType,
    mac: profile.mac,
    vcount: profile.vcount,
    timer0Min: profile.timer0Min,
    timer0Max: profile.timer0Max,
    gxstat: profile.gxstat,
    vframe: profile.vframe,
  };
}

export function validateGen5Sha1CacheRequest(request: Gen5Sha1CacheRequest) {
  const profile = request.profile;
  if (
    !(["black", "white", "black2", "white2"] as const).includes(
      profile.version,
    ) ||
    !(
      [
        "english",
        "spanish",
        "french",
        "italian",
        "german",
        "japanese",
        "korean",
      ] as const
    ).includes(profile.language) ||
    !(["ds", "dsi", "3ds"] as const).includes(profile.dsType) ||
    !MAC.test(profile.mac || "0") ||
    !integerIn(profile.vcount, 0, 0xff) ||
    !integerIn(profile.timer0Min, 0, 0xffff) ||
    !integerIn(profile.timer0Max, 0, 0xffff) ||
    profile.timer0Min > profile.timer0Max ||
    !integerIn(profile.gxstat, 0, 99) ||
    !integerIn(profile.vframe, 0, 99)
  ) {
    throw new TypeError("Invalid Gen 5 profile.");
  }
  const start = dateValue(request.startDate);
  const end = dateValue(request.endDate);
  if (start === undefined || end === undefined)
    throw new TypeError(
      "Date must be valid and between 2000-01-01 and 2099-12-31.",
    );
  if (start > end) throw new RangeError("Start date is after end date");
  if (
    !integerIn(request.seeds.initialAdvances, 0, 0xffff_ffff) ||
    !integerIn(request.seeds.maxAdvances, 0, 0xffff_ffff) ||
    !CACHE_TYPES.every((type) => request.seeds[type] instanceof Uint32Array)
  ) {
    throw new TypeError("Invalid IV Cache");
  }
  const seedCount = CACHE_TYPES.reduce(
    (total, type) => total + request.seeds[type].length,
    0,
  );
  if (seedCount > GEN5_SHA1CACHE_SEED_LIMIT)
    throw new RangeError(
      `IV Cache exceeds the seed limit of ${GEN5_SHA1CACHE_SEED_LIMIT}.`,
    );
  return request;
}

export function gen5Sha1CacheDayCount(request: Gen5Sha1CacheRequest) {
  validateGen5Sha1CacheRequest(request);
  return (
    gen5Sha1CacheDateOffset(request.endDate) -
    gen5Sha1CacheDateOffset(request.startDate) +
    1
  );
}

export function gen5Sha1CacheUnitCount(request: Gen5Sha1CacheRequest) {
  const count =
    (request.profile.timer0Max - request.profile.timer0Min + 1) *
    gen5Sha1CacheDayCount(request) *
    GEN5_SHA1CACHE_BUTTON_MASKS.length;
  if (!Number.isSafeInteger(count))
    throw new RangeError("Gen 5 SHA1 Cache range is too large.");
  return count;
}

export function gen5Sha1CacheUnit(
  request: Gen5Sha1CacheRequest,
  index: number,
): Gen5Sha1CacheUnit {
  const total = gen5Sha1CacheUnitCount(request);
  if (!Number.isSafeInteger(index) || index < 0 || index >= total)
    throw new RangeError("Invalid Gen 5 SHA1 Cache unit index.");
  const days = gen5Sha1CacheDayCount(request);
  const unitsPerTimer0 = days * GEN5_SHA1CACHE_BUTTON_MASKS.length;
  const timer0Index = Math.floor(index / unitsPerTimer0);
  const remainder = index % unitsPerTimer0;
  const dateIndex = Math.floor(remainder / GEN5_SHA1CACHE_BUTTON_MASKS.length);
  const buttonIndex = remainder % GEN5_SHA1CACHE_BUTTON_MASKS.length;
  const dateOffset = gen5Sha1CacheDateOffset(request.startDate) + dateIndex;
  return {
    index,
    timer0: request.profile.timer0Min + timer0Index,
    date: gen5Sha1CacheDateFromOffset(dateOffset),
    dateOffset,
    buttonMask: GEN5_SHA1CACHE_BUTTON_MASKS[buttonIndex],
  };
}

function sortedUnique(values: number[]) {
  values.sort((left, right) => left - right);
  if (values.length < 2) return new Uint32Array(values);
  let write = 1;
  for (let read = 1; read < values.length; read += 1) {
    if (values[read] !== values[write - 1]) {
      values[write] = values[read];
      write += 1;
    }
  }
  return new Uint32Array(values.slice(0, write));
}

export function parseGen5IvCache(
  buffer: ArrayBuffer,
  version: Gen5GameVersion,
): Gen5Sha1CacheSeeds {
  if (buffer.byteLength < 12 || buffer.byteLength % 4 !== 0)
    throw new TypeError("Invalid IV Cache");
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== GEN5_SHA1CACHE_IV_MAGIC)
    throw new TypeError("Invalid IV Cache");
  const initialAdvances = view.getUint32(4, true);
  const maxAdvances = view.getUint32(8, true);
  const bucketCountWords = maxAdvances * 3 + 9;
  const totalWords = buffer.byteLength / 4;
  if (
    !Number.isSafeInteger(bucketCountWords) ||
    3 + bucketCountWords > totalWords
  )
    throw new TypeError("Invalid IV Cache");

  const counts: Record<Gen5Sha1CacheType, number[]> = {
    entralink: [],
    normal: [],
    roamer: [],
  };
  let word = 3;
  for (const [type, length] of [
    ["entralink", maxAdvances + 5],
    ["normal", maxAdvances + 3],
    ["roamer", maxAdvances + 1],
  ] as const) {
    for (let index = 0; index < length; index += 1) {
      counts[type].push(view.getUint32(word * 4, true));
      word += 1;
    }
  }
  const seedWords = CACHE_TYPES.reduce(
    (total, type) =>
      total + counts[type].reduce((sum, count) => sum + count, 0),
    0,
  );
  if (
    !Number.isSafeInteger(seedWords) ||
    seedWords > GEN5_SHA1CACHE_SEED_LIMIT ||
    word + seedWords !== totalWords
  )
    throw new TypeError("Invalid IV Cache");

  const selected: Record<Gen5Sha1CacheType, number[]> = {
    entralink: [],
    normal: [],
    roamer: [],
  };
  const bw = version === "black" || version === "white";
  for (const type of CACHE_TYPES) {
    for (let bucket = 0; bucket < counts[type].length; bucket += 1) {
      const include =
        type !== "normal" ||
        (bw ? bucket < counts.normal.length - 2 : bucket >= 2);
      for (let index = 0; index < counts[type][bucket]; index += 1) {
        const seed = view.getUint32(word * 4, true);
        word += 1;
        if (include) selected[type].push(seed);
      }
    }
  }
  if (word !== totalWords) throw new TypeError("Invalid IV Cache");
  return {
    initialAdvances,
    maxAdvances,
    entralink: sortedUnique(selected.entralink),
    normal: sortedUnique(selected.normal),
    roamer: sortedUnique(selected.roamer),
  };
}

export function createGen5Sha1CacheData(
  request: Gen5Sha1CacheRequest,
): Gen5Sha1CacheData {
  validateGen5Sha1CacheRequest(request);
  return { request, entralink: [], normal: [], roamer: [] };
}

export function appendGen5Sha1CacheResults(
  cache: Gen5Sha1CacheData,
  unit: Gen5Sha1CacheUnit,
  buffer: ArrayBuffer,
  resultCount: number,
) {
  const words = new Uint32Array(buffer);
  if (words.length !== resultCount * GEN5_SHA1CACHE_RESULT_WORDS)
    throw new RangeError("Gen 5 SHA1 Cache result buffer length mismatch.");
  let appended = 0;
  for (let offset = 0; offset < words.length; offset += 4) {
    const seedLow = words[offset];
    const seedHigh = words[offset + 1];
    const time = words[offset + 2];
    const category = words[offset + 3];
    if (
      time >= GEN5_SHA1CACHE_SECONDS_PER_UNIT ||
      category >= CACHE_TYPES.length
    )
      throw new RangeError("Gen 5 SHA1 Cache returned an invalid result.");
    const entry: Gen5Sha1CacheEntry = {
      keyLow: (unit.buttonMask | (time << 12)) >>> 0,
      keyHigh: (unit.dateOffset | (unit.timer0 << 16)) >>> 0,
      seedLow,
      seedHigh,
    };
    cache[CACHE_TYPES[category]].push(entry);
    appended += 1;
  }
  return appended;
}

function gameValue(version: Gen5GameVersion) {
  return (
    1 <<
    ((["black", "white", "black2", "white2"] as const).indexOf(version) + 12)
  );
}

function languageValue(language: Gen5Language) {
  return (
    [
      "english",
      "french",
      "german",
      "italian",
      "japanese",
      "korean",
      "spanish",
    ] as const
  ).indexOf(language);
}

function dsTypeValue(dsType: Gen5DsType) {
  return (["ds", "dsi", "3ds"] as const).indexOf(dsType);
}

function compareEntries(left: Gen5Sha1CacheEntry, right: Gen5Sha1CacheEntry) {
  return left.seedHigh - right.seedHigh || left.seedLow - right.seedLow;
}

export function serializeGen5Sha1Cache(cache: Gen5Sha1CacheData) {
  validateGen5Sha1CacheRequest(cache.request);
  const counts = CACHE_TYPES.map((type) => cache[type].length);
  const resultCount = counts.reduce((sum, count) => sum + count, 0);
  if (resultCount > GEN5_SHA1CACHE_RESULT_LIMIT)
    throw new RangeError(
      `Gen 5 SHA1 Cache exceeds the result limit of ${GEN5_SHA1CACHE_RESULT_LIMIT}.`,
    );
  const headerBytes = 54;
  const buffer = new ArrayBuffer(headerBytes + resultCount * 16);
  const view = new DataView(buffer);
  const profile = cache.request.profile;
  let offset = 0;
  const u32 = (value: number) => {
    view.setUint32(offset, value, true);
    offset += 4;
  };
  const u16 = (value: number) => {
    view.setUint16(offset, value, true);
    offset += 2;
  };
  const u8 = (value: number) => {
    view.setUint8(offset, value);
    offset += 1;
  };
  u32(GEN5_SHA1CACHE_MAGIC);
  u32(cache.request.seeds.initialAdvances);
  u32(cache.request.seeds.maxAdvances);
  const mac = BigInt(`0x${profile.mac || "0"}`);
  u32(Number(mac & 0xffff_ffffn));
  u32(Number(mac >> 32n));
  u32(GEN5_SHA1CACHE_BASE_JD + gen5Sha1CacheDateOffset(cache.request.endDate));
  u32(
    GEN5_SHA1CACHE_BASE_JD + gen5Sha1CacheDateOffset(cache.request.startDate),
  );
  u32(gameValue(profile.version));
  u16(profile.timer0Max);
  u16(profile.timer0Min);
  u8(0);
  u8(dsTypeValue(profile.dsType));
  u8(languageValue(profile.language));
  u8(profile.gxstat);
  u8(profile.vcount);
  u8(profile.vframe);
  counts.forEach(u32);
  if (offset !== headerBytes)
    throw new Error("Gen 5 SHA1 Cache header layout mismatch.");
  for (const type of CACHE_TYPES) {
    const sorted = [...cache[type]].sort(compareEntries);
    for (const entry of sorted) {
      u32(entry.keyLow);
      u32(entry.keyHigh);
      u32(entry.seedLow);
      u32(entry.seedHigh);
    }
  }
  if (offset !== buffer.byteLength)
    throw new Error("Gen 5 SHA1 Cache serialization length mismatch.");
  return buffer;
}
