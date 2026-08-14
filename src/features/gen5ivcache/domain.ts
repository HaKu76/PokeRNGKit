export const GEN5_IVCACHE_API_VERSION = 1;
export const GEN5_IVCACHE_TOTAL_SEEDS = 0x1_0000_0000;
export const GEN5_IVCACHE_CHUNK_SEEDS = 0x1_0000;
export const GEN5_IVCACHE_MAGIC = 0xd08c_b7c0;
export const GEN5_IVCACHE_RESULT_WORDS = 3;
export const GEN5_IVCACHE_MAX_BROWSER_INITIAL_ADVANCES = 0;
export const GEN5_IVCACHE_MAX_BROWSER_ADVANCES = 20;
export const GEN5_IVCACHE_RESULT_LIMIT = 1_000_000;
export const GEN5_IVCACHE_BATCH_RESULT_LIMIT = 65_536;

export type Gen5IvCacheType = "entralink" | "normal" | "roamer";

export interface Gen5IvCacheRequest {
  initialAdvances: number;
  maxAdvances: number;
}

export interface Gen5IvCacheChunk {
  index: number;
  startSeed: number;
  seedCount: number;
}

export interface Gen5IvCacheHit {
  type: Gen5IvCacheType;
  advanceIndex: number;
  seed: number;
}

export interface Gen5IvCacheData {
  request: Gen5IvCacheRequest;
  entralink: Map<number, number[]>;
  normal: Map<number, number[]>;
  roamer: Map<number, number[]>;
}

const CACHE_TYPES = ["entralink", "normal", "roamer"] as const;

function validU32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

export function parseGen5IvCacheAdvance(value: string) {
  if (value === "") return 0;
  if (!/^\d{1,10}$/.test(value)) return undefined;
  const parsed = Number(value);
  return validU32(parsed) ? parsed : undefined;
}

export function validateGen5IvCacheRequest(request: Gen5IvCacheRequest) {
  const errors: (keyof Gen5IvCacheRequest)[] = [];
  if (!validU32(request.initialAdvances)) errors.push("initialAdvances");
  if (!validU32(request.maxAdvances)) errors.push("maxAdvances");
  return errors;
}

export function validateGen5IvCacheExecution(request: Gen5IvCacheRequest) {
  const errors = validateGen5IvCacheRequest(request);
  if (
    validU32(request.initialAdvances) &&
    request.initialAdvances > GEN5_IVCACHE_MAX_BROWSER_INITIAL_ADVANCES
  )
    errors.push("initialAdvances");
  if (
    validU32(request.maxAdvances) &&
    request.maxAdvances > GEN5_IVCACHE_MAX_BROWSER_ADVANCES
  )
    errors.push("maxAdvances");
  return [...new Set(errors)];
}

export function gen5IvCacheChunkCount() {
  return Math.ceil(GEN5_IVCACHE_TOTAL_SEEDS / GEN5_IVCACHE_CHUNK_SEEDS);
}

export function gen5IvCacheChunk(index: number): Gen5IvCacheChunk {
  const totalChunks = gen5IvCacheChunkCount();
  if (!Number.isInteger(index) || index < 0 || index >= totalChunks)
    throw new RangeError("Invalid Gen 5 IV Cache chunk index.");
  const startSeed = index * GEN5_IVCACHE_CHUNK_SEEDS;
  return {
    index,
    startSeed,
    seedCount: Math.min(
      GEN5_IVCACHE_CHUNK_SEEDS,
      GEN5_IVCACHE_TOTAL_SEEDS - startSeed,
    ),
  };
}

export function createGen5IvCacheData(
  request: Gen5IvCacheRequest,
): Gen5IvCacheData {
  return {
    request: { ...request },
    entralink: new Map(),
    normal: new Map(),
    roamer: new Map(),
  };
}

export function appendGen5IvCacheHits(
  cache: Gen5IvCacheData,
  buffer: ArrayBuffer,
  resultCount: number,
  chunk: Gen5IvCacheChunk,
) {
  const words = new Uint32Array(buffer);
  if (words.length !== resultCount * GEN5_IVCACHE_RESULT_WORDS)
    throw new RangeError("Gen 5 IV Cache result buffer length mismatch.");
  for (let offset = 0; offset < words.length; offset += 3) {
    const type = CACHE_TYPES[words[offset]];
    if (!type) throw new RangeError("Gen 5 IV Cache returned an unknown type.");
    const advanceIndex = words[offset + 1];
    const maximum =
      cache.request.maxAdvances +
      (type === "entralink" ? 4 : type === "normal" ? 2 : 0);
    if (advanceIndex > maximum)
      throw new RangeError("Gen 5 IV Cache returned an invalid advance.");
    const seed = words[offset + 2];
    if (seed < chunk.startSeed || seed >= chunk.startSeed + chunk.seedCount)
      throw new RangeError("Gen 5 IV Cache returned a seed outside its chunk.");
    const bucket = cache[type].get(advanceIndex) ?? [];
    bucket.push(seed);
    cache[type].set(advanceIndex, bucket);
  }
}

function sortedBucket(
  cache: Gen5IvCacheData,
  type: Gen5IvCacheType,
  index: number,
) {
  return [...(cache[type].get(index) ?? [])].sort(
    (left, right) => left - right,
  );
}

export function gen5IvCacheHitCount(cache: Gen5IvCacheData) {
  return CACHE_TYPES.reduce(
    (total, type) =>
      total +
      [...cache[type].values()].reduce(
        (typeTotal, seeds) => typeTotal + seeds.length,
        0,
      ),
    0,
  );
}

export function serializeGen5IvCache(cache: Gen5IvCacheData) {
  const invalid = validateGen5IvCacheExecution(cache.request);
  if (invalid.length > 0)
    throw new RangeError("Invalid Gen 5 IV Cache request.");
  const bucketCounts = {
    entralink: cache.request.maxAdvances + 5,
    normal: cache.request.maxAdvances + 3,
    roamer: cache.request.maxAdvances + 1,
  } as const;
  const sorted = {
    entralink: new Map<number, number[]>(),
    normal: new Map<number, number[]>(),
    roamer: new Map<number, number[]>(),
  };
  let hitCount = 0;
  for (const type of CACHE_TYPES) {
    for (const index of cache[type].keys()) {
      const bucket = cache[type].get(index) ?? [];
      if (bucket.length > GEN5_IVCACHE_RESULT_LIMIT - hitCount)
        throw new RangeError(
          `Gen 5 IV Cache exceeds the result limit of ${GEN5_IVCACHE_RESULT_LIMIT}.`,
        );
      const seeds = sortedBucket(cache, type, index);
      sorted[type].set(index, seeds);
      hitCount += seeds.length;
    }
  }
  const countWords =
    bucketCounts.entralink + bucketCounts.normal + bucketCounts.roamer;
  const totalWords = 3 + countWords + hitCount;
  const buffer = new ArrayBuffer(totalWords * Uint32Array.BYTES_PER_ELEMENT);
  const view = new DataView(buffer);
  let word = 0;
  const write = (value: number) => {
    view.setUint32(word * Uint32Array.BYTES_PER_ELEMENT, value, true);
    word += 1;
  };
  write(GEN5_IVCACHE_MAGIC);
  write(cache.request.initialAdvances);
  write(cache.request.maxAdvances);
  for (const type of CACHE_TYPES)
    for (let index = 0; index < bucketCounts[type]; index++)
      write(sorted[type].get(index)?.length ?? 0);
  for (const type of CACHE_TYPES)
    for (let index = 0; index < bucketCounts[type]; index++)
      for (const seed of sorted[type].get(index) ?? []) write(seed);
  if (word !== totalWords)
    throw new Error("Gen 5 IV Cache serialization length mismatch.");
  return new Blob([buffer], { type: "application/octet-stream" });
}
