import {
  isGen5WildButtonMaskAllowed,
  type Gen5WildPreparedCache,
  type Gen5WildRequest,
  type Gen5WildSearcherRequest,
} from "./domain";

const IV_MAGIC = 0xd08c_b7c0;
const SHA_MAGIC = 0x3c50_a97e;
const BASE_JD = 2_451_545;
const MAX_SEEDS = 1_000_000;
const MAX_SHA_ENTRIES = 1_000_000;
let nextCacheIdentity = 1;

type CacheType = "entralink" | "normal" | "roamer";

export interface Gen5WildIvCache {
  identity: number;
  name: string;
  initialAdvances: number;
  maxAdvances: number;
  buckets: Record<CacheType, readonly Uint32Array[]>;
  seedCount: number;
}

export interface Gen5WildShaCache {
  identity: number;
  name: string;
  initialAdvances: number;
  maxAdvances: number;
  mac: string;
  startDate: string;
  endDate: string;
  version: number;
  timer0Min: number;
  timer0Max: number;
  dsType: number;
  language: number;
  gxstat: number;
  vcount: number;
  vframe: number;
  entries: Record<CacheType, Uint32Array>;
}

function cacheIdentity() {
  const identity = nextCacheIdentity;
  nextCacheIdentity =
    nextCacheIdentity === Number.MAX_SAFE_INTEGER ? 1 : nextCacheIdentity + 1;
  return identity;
}

function cacheFingerprint(values?: Uint32Array) {
  if (!values) return "none";
  let forward = 0x811c_9dc5;
  let reverse = 0x9e37_79b9;
  for (let index = 0; index < values.length; index += 1) {
    forward = Math.imul(forward ^ values[index], 0x0100_0193) >>> 0;
    reverse =
      Math.imul(reverse ^ values[values.length - index - 1], 0x0100_0193) >>> 0;
  }
  return [
    values.length.toString(16),
    forward.toString(16).padStart(8, "0"),
    reverse.toString(16).padStart(8, "0"),
  ].join("-");
}

function dateFromJulianDay(value: number) {
  const offset = value - BASE_JD;
  if (!Number.isInteger(offset) || offset < 0 || offset > 36_524)
    throw new TypeError("Invalid SHA1 Cache");
  return new Date(Date.UTC(2000, 0, 1) + offset * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function dateOffset(value: string) {
  return Math.round(
    (new Date(`${value}T00:00:00.000Z`).getTime() - Date.UTC(2000, 0, 1)) /
      86_400_000,
  );
}

export function parseGen5WildIvCache(
  buffer: ArrayBuffer,
  name: string,
): Gen5WildIvCache {
  if (buffer.byteLength < 12 || buffer.byteLength % 4 !== 0)
    throw new TypeError("Invalid IV Cache");
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== IV_MAGIC)
    throw new TypeError("Invalid IV Cache");
  const initialAdvances = view.getUint32(4, true);
  const maxAdvances = view.getUint32(8, true);
  const totalWords = buffer.byteLength / 4;
  const lengths = {
    entralink: maxAdvances + 5,
    normal: maxAdvances + 3,
    roamer: maxAdvances + 1,
  } as const;
  const countWords = lengths.entralink + lengths.normal + lengths.roamer;
  if (!Number.isSafeInteger(countWords) || 3 + countWords > totalWords)
    throw new TypeError("Invalid IV Cache");
  const counts: Record<CacheType, number[]> = {
    entralink: [],
    normal: [],
    roamer: [],
  };
  let word = 3;
  for (const type of ["entralink", "normal", "roamer"] as const) {
    for (let index = 0; index < lengths[type]; index += 1) {
      counts[type].push(view.getUint32(word * 4, true));
      word += 1;
    }
  }
  const seedCount = Object.values(counts).reduce(
    (total, values) => total + values.reduce((sum, count) => sum + count, 0),
    0,
  );
  if (
    !Number.isSafeInteger(seedCount) ||
    seedCount > MAX_SEEDS ||
    word + seedCount !== totalWords
  ) {
    throw new TypeError("Invalid IV Cache");
  }
  const buckets: Record<CacheType, Uint32Array[]> = {
    entralink: [],
    normal: [],
    roamer: [],
  };
  for (const type of ["entralink", "normal", "roamer"] as const) {
    for (const count of counts[type]) {
      const values = new Uint32Array(count);
      for (let index = 0; index < count; index += 1) {
        values[index] = view.getUint32(word * 4, true);
        word += 1;
      }
      buckets[type].push(values);
    }
  }
  return {
    identity: cacheIdentity(),
    name,
    initialAdvances,
    maxAdvances,
    buckets,
    seedCount,
  };
}

export function parseGen5WildShaCache(
  buffer: ArrayBuffer,
  name: string,
): Gen5WildShaCache {
  if (buffer.byteLength < 54 || (buffer.byteLength - 54) % 16 !== 0)
    throw new TypeError("Invalid SHA1 Cache");
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== SHA_MAGIC)
    throw new TypeError("Invalid SHA1 Cache");
  const counts = [
    view.getUint32(42, true),
    view.getUint32(46, true),
    view.getUint32(50, true),
  ];
  const entryCount = counts.reduce((sum, count) => sum + count, 0);
  if (
    !Number.isSafeInteger(entryCount) ||
    entryCount > MAX_SHA_ENTRIES ||
    54 + entryCount * 16 !== buffer.byteLength
  ) {
    throw new TypeError("Invalid SHA1 Cache");
  }
  const entries = {
    entralink: new Uint32Array(counts[0] * 4),
    normal: new Uint32Array(counts[1] * 4),
    roamer: new Uint32Array(counts[2] * 4),
  };
  let byteOffset = 54;
  for (const type of ["entralink", "normal", "roamer"] as const) {
    for (let index = 0; index < entries[type].length; index += 1) {
      entries[type][index] = view.getUint32(byteOffset, true);
      byteOffset += 4;
    }
  }
  const mac =
    (BigInt(view.getUint32(16, true)) << 32n) |
    BigInt(view.getUint32(12, true));
  return {
    identity: cacheIdentity(),
    name,
    initialAdvances: view.getUint32(4, true),
    maxAdvances: view.getUint32(8, true),
    mac: mac.toString(16).toUpperCase(),
    endDate: dateFromJulianDay(view.getUint32(20, true)),
    startDate: dateFromJulianDay(view.getUint32(24, true)),
    version: view.getUint32(28, true),
    timer0Max: view.getUint16(32, true),
    timer0Min: view.getUint16(34, true),
    dsType: view.getUint8(37),
    language: view.getUint8(38),
    gxstat: view.getUint8(39),
    vcount: view.getUint8(40),
    vframe: view.getUint8(41),
    entries,
  };
}

export function gen5WildFastSearchEligible(
  request: Gen5WildSearcherRequest,
  ivCache?: Gen5WildIvCache,
) {
  if (!ivCache) return false;
  if (
    request.initialIvAdvances < ivCache.initialAdvances ||
    request.initialIvAdvances + request.maxIvAdvances >
      ivCache.initialAdvances + ivCache.maxAdvances
  ) {
    return false;
  }
  const minimum = request.filters.ivMin;
  return (
    minimum[0] >= 30 &&
    minimum[2] >= 30 &&
    minimum[4] >= 30 &&
    (minimum[1] >= 30 || minimum[3] >= 30) &&
    (minimum[5] >= 30 || request.filters.ivMax[5] <= 1)
  );
}

function shaProfileCompatible(
  request: Gen5WildSearcherRequest,
  ivCache: Gen5WildIvCache,
  shaCache: Gen5WildShaCache,
) {
  const profile = request.profile;
  const game =
    1 << (["black", "white", "black2", "white2"].indexOf(profile.version) + 12);
  const language = [
    "english",
    "french",
    "german",
    "italian",
    "japanese",
    "korean",
    "spanish",
  ].indexOf(profile.language);
  const dsType = ["ds", "dsi", "3ds"].indexOf(profile.dsType);
  return (
    shaCache.initialAdvances === ivCache.initialAdvances &&
    shaCache.maxAdvances === ivCache.maxAdvances &&
    BigInt(`0x${shaCache.mac || "0"}`) === BigInt(`0x${profile.mac || "0"}`) &&
    shaCache.version === game &&
    shaCache.timer0Min === profile.timer0Min &&
    shaCache.timer0Max === profile.timer0Max &&
    shaCache.dsType === dsType &&
    shaCache.language === language &&
    shaCache.gxstat === profile.gxstat &&
    shaCache.vcount === profile.vcount &&
    shaCache.vframe === profile.vframe &&
    request.startDate >= shaCache.startDate &&
    request.endDate <= shaCache.endDate
  );
}

export function prepareGen5WildCache(
  request: Gen5WildSearcherRequest,
  ivCache?: Gen5WildIvCache,
  shaCache?: Gen5WildShaCache,
): Gen5WildPreparedCache | undefined {
  if (!gen5WildFastSearchEligible(request, ivCache) || !ivCache)
    return undefined;
  const type = "normal";
  const pairs: number[] = [];
  const seedSet = new Set<number>();
  const bw =
    request.profile.version === "black" || request.profile.version === "white";
  for (
    let advance = request.initialIvAdvances;
    advance <= request.initialIvAdvances + request.maxIvAdvances;
    advance += 1
  ) {
    const bucket = type === "normal" && !bw ? advance + 2 : advance;
    for (const seed of ivCache.buckets[type][bucket] ?? []) {
      pairs.push(advance, seed);
      seedSet.add(seed);
    }
  }
  if (pairs.length === 0) return undefined;
  const ivEntries = new Uint32Array(pairs);
  let shaEntries: Uint32Array | undefined;
  if (shaCache && shaProfileCompatible(request, ivCache, shaCache)) {
    const start = dateOffset(request.startDate);
    const end = dateOffset(request.endDate);
    const source = shaCache.entries[type];
    const selected: number[] = [];
    for (let offset = 0; offset < source.length; offset += 4) {
      const keyLow = source[offset];
      const keyHigh = source[offset + 1];
      const button = keyLow & 0xfff;
      const date = keyHigh & 0xffff;
      const seedHigh = source[offset + 3];
      if (
        date >= start &&
        date <= end &&
        seedSet.has(seedHigh) &&
        isGen5WildButtonMaskAllowed(request.profile, button)
      ) {
        selected.push(keyLow, keyHigh, source[offset + 2], seedHigh);
      }
    }
    if (selected.length !== 0) shaEntries = new Uint32Array(selected);
  }
  const mode = shaEntries ? "iv-sha" : "iv";
  const key = [
    ivCache.identity,
    ivCache.name,
    ivCache.seedCount,
    shaCache?.identity ?? 0,
    shaCache?.name ?? "",
    type,
    request.initialIvAdvances,
    request.maxIvAdvances,
    request.startDate,
    request.endDate,
    mode,
    cacheFingerprint(ivEntries),
    cacheFingerprint(shaEntries),
  ].join(":");
  return {
    descriptor: {
      key,
      mode,
      ivEntryCount: ivEntries.length / 2,
      shaEntryCount: shaEntries ? shaEntries.length / 4 : 0,
    },
    ivEntries,
    shaEntries,
  };
}

export function withGen5WildCache(
  request: Gen5WildRequest,
  cache?: Gen5WildPreparedCache,
): Gen5WildRequest {
  return { ...request, cache: cache?.descriptor ?? null };
}
