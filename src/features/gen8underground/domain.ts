import type { Gen8Profile } from "../gen8profiles/domain";
import { getGen8UndergroundSpecies, type Gen8UndergroundVersion } from "./data";

export const GEN8_UNDERGROUND_API_VERSION = 1;
export const GEN8_UNDERGROUND_REQUEST_WORDS = 54;
export const GEN8_UNDERGROUND_RESULT_WORDS = 12;
export const GEN8_UNDERGROUND_MAX_RESULTS = 100_000;
export const GEN8_UNDERGROUND_MAX_EVALUATIONS = 250_000_000;
export const GEN8_UNDERGROUND_CHUNK_SIZE = 500;

export const GEN8_UNDERGROUND_LEVEL_RANGES = [
  [16, 20],
  [25, 29],
  [29, 33],
  [33, 37],
  [36, 40],
  [39, 43],
  [42, 46],
  [50, 55],
  [58, 63],
] as const;

export type Gen8UndergroundIvTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Gen8UndergroundShinyFilter =
  "any" | "star" | "square" | "starSquare";
export type Gen8UndergroundGenderFilter = "any" | "male" | "female";
export type Gen8UndergroundAbilityFilter = "any" | "first" | "second";

export interface Gen8UndergroundProfile {
  version: Gen8UndergroundVersion;
  tid: number;
  sid: number;
}

export interface Gen8UndergroundFilters {
  disabled: boolean;
  shiny: Gen8UndergroundShinyFilter;
  gender: Gen8UndergroundGenderFilter;
  ability: Gen8UndergroundAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
  ivMin: Gen8UndergroundIvTuple;
  ivMax: Gen8UndergroundIvTuple;
  species: readonly number[];
}

export interface Gen8UndergroundRequest {
  profile: Gen8UndergroundProfile;
  seed0: string;
  seed1: string;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  lead: number;
  diglett: boolean;
  storyFlag: number;
  levelFlag: number;
  location: number;
  filters: Gen8UndergroundFilters;
  resultLimit: number;
}

export interface Gen8UndergroundChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen8UndergroundResult {
  advances: number;
  eggMove: number;
  item: number;
  species: number;
  level: number;
  ec: string;
  pid: string;
  shiny: number;
  nature: number;
  ability: number;
  abilityIndex: number;
  ivs: Gen8UndergroundIvTuple;
  stats: Gen8UndergroundIvTuple;
  gender: number;
  height: number;
  weight: number;
  characteristic: number;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const HEX_SEED_INPUT = /^[0-9a-fA-F]{0,16}$/;
const HEX_8 = /^[0-9A-F]{8}$/;
const VALID_LEADS = new Set([
  ...Array.from({ length: 25 }, (_, index) => index),
  25,
  26,
  32,
  34,
  255,
]);
const SHINY_MASKS: Record<Gen8UndergroundShinyFilter, number> = {
  any: 255,
  star: 1 << 1,
  square: 1 << 2,
  starSquare: (1 << 1) | (1 << 2),
};
const GENDER_VALUES: Record<Gen8UndergroundGenderFilter, number> = {
  any: 255,
  male: 0,
  female: 1,
};
const ABILITY_VALUES: Record<Gen8UndergroundAbilityFilter, number> = {
  any: 255,
  first: 0,
  second: 1,
};

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

export function gen8UndergroundProfile(
  profile: Gen8Profile,
): Gen8UndergroundProfile {
  if (
    profile.version !== "brilliantdiamond" &&
    profile.version !== "shiningpearl"
  ) {
    throw new TypeError("Gen 8 Underground requires a BDSP profile.");
  }
  return { version: profile.version, tid: profile.tid, sid: profile.sid };
}

export function parseGen8UndergroundDecimal(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export function normalizeGen8UndergroundSeed(value: string) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .padStart(16, "0");
}

export function formatGen8UndergroundHex32(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function validateProfile(profile: Gen8UndergroundProfile) {
  if (
    (profile.version !== "brilliantdiamond" &&
      profile.version !== "shiningpearl") ||
    !integerIn(profile.tid, 0, 0xffff) ||
    !integerIn(profile.sid, 0, 0xffff)
  ) {
    throw new TypeError("Gen 8 Underground requires a valid BDSP profile.");
  }
}

function validateFilters(
  request: Gen8UndergroundRequest,
  filters: Gen8UndergroundFilters,
) {
  if (
    typeof filters.disabled !== "boolean" ||
    !Object.hasOwn(SHINY_MASKS, filters.shiny) ||
    !Object.hasOwn(GENDER_VALUES, filters.gender) ||
    !Object.hasOwn(ABILITY_VALUES, filters.ability) ||
    !integerIn(filters.natureMask, 1, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 1, ALL_HIDDEN_POWERS) ||
    !integerIn(filters.heightMin, 0, 255) ||
    !integerIn(filters.heightMax, filters.heightMin, 255) ||
    !integerIn(filters.weightMin, 0, 255) ||
    !integerIn(filters.weightMax, filters.weightMin, 255) ||
    !Array.isArray(filters.ivMin) ||
    !Array.isArray(filters.ivMax) ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6 ||
    !Array.isArray(filters.species)
  ) {
    throw new TypeError("Invalid Gen 8 Underground filter settings.");
  }
  filters.ivMin.forEach((minimum, index) => {
    const maximum = filters.ivMax[index];
    if (
      !integerIn(minimum, 0, 31) ||
      !integerIn(maximum, 0, 31) ||
      minimum > maximum
    ) {
      throw new TypeError("Each IV range must be between 0 and 31.");
    }
  });
  const available = new Set(
    getGen8UndergroundSpecies(
      request.profile.version,
      request.location,
      request.storyFlag,
    ),
  );
  if (
    new Set(filters.species).size !== filters.species.length ||
    !filters.species.every(
      (species) => integerIn(species, 1, 493) && available.has(species),
    )
  ) {
    throw new TypeError("Invalid Gen 8 Underground species filter.");
  }
}

export function gen8UndergroundTaskCount(request: Gen8UndergroundRequest) {
  return request.maxAdvances + 1;
}

export function validateGen8UndergroundRequest(
  request: Gen8UndergroundRequest,
) {
  validateProfile(request.profile);
  if (
    !HEX_SEED_INPUT.test(request.seed0) ||
    !HEX_SEED_INPUT.test(request.seed1)
  ) {
    throw new TypeError("Seeds must contain at most 16 hexadecimal digits.");
  }
  if (
    normalizeGen8UndergroundSeed(request.seed0) === "0000000000000000" &&
    normalizeGen8UndergroundSeed(request.seed1) === "0000000000000000"
  ) {
    throw new TypeError("Please insert missing seed information");
  }
  if (!integerIn(request.initialAdvances, 0, UINT32_MAX))
    throw new TypeError("Initial Advances must be between 0 and 4294967295.");
  if (!integerIn(request.maxAdvances, 0, UINT32_MAX))
    throw new TypeError("Max Advances must be between 0 and 4294967295.");
  if (!integerIn(request.offset, 0, UINT32_MAX))
    throw new TypeError("Offset must be between 0 and 4294967295.");
  if (
    request.initialAdvances + request.offset + request.maxAdvances >
    UINT32_MAX
  ) {
    throw new TypeError(
      "Initial Advances plus Offset and Max Advances exceeds 4294967295.",
    );
  }
  if (gen8UndergroundTaskCount(request) > GEN8_UNDERGROUND_MAX_EVALUATIONS) {
    throw new TypeError(
      "Gen 8 Underground range exceeds the browser task limit.",
    );
  }
  if (!VALID_LEADS.has(request.lead))
    throw new TypeError("Invalid Gen 8 Underground lead.");
  if (
    typeof request.diglett !== "boolean" ||
    !integerIn(request.storyFlag, 1, 6) ||
    !integerIn(request.levelFlag, 0, 8) ||
    !integerIn(request.location, 2, 19)
  ) {
    throw new TypeError("Invalid Gen 8 Underground encounter settings.");
  }
  validateFilters(request, request.filters);
  if (!integerIn(request.resultLimit, 1, GEN8_UNDERGROUND_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  return request;
}

export function splitGen8UndergroundRequest(
  request: Gen8UndergroundRequest,
  workers: number,
  chunkSize = GEN8_UNDERGROUND_CHUNK_SIZE,
) {
  validateGen8UndergroundRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new TypeError("Chunk size must be a positive integer.");
  const total = gen8UndergroundTaskCount(request);
  const chunks: Gen8UndergroundChunk[] = [];
  for (let start = 0, index = 0; start < total; index += 1) {
    const remaining = total - start;
    const target = Math.max(
      1,
      Math.min(chunkSize, Math.ceil(remaining / Math.max(1, workers))),
    );
    chunks.push({ index, start, count: target });
    start += target;
  }
  return chunks;
}

function splitSeed(value: string) {
  const seed = BigInt(`0x${normalizeGen8UndergroundSeed(value)}`);
  return [Number(seed & 0xffff_ffffn), Number(seed >> 32n)] as const;
}

export function encodeGen8UndergroundRequest(
  request: Gen8UndergroundRequest,
  chunk: Gen8UndergroundChunk,
) {
  validateGen8UndergroundRequest(request);
  if (
    !Number.isInteger(chunk.index) ||
    chunk.index < 0 ||
    !Number.isInteger(chunk.start) ||
    chunk.start < 0 ||
    !Number.isInteger(chunk.count) ||
    chunk.count < 1 ||
    chunk.start + chunk.count > gen8UndergroundTaskCount(request)
  ) {
    throw new TypeError("Invalid Gen 8 Underground chunk.");
  }
  const [seed0Low, seed0High] = splitSeed(request.seed0);
  const [seed1Low, seed1High] = splitSeed(request.seed1);
  const words = new Uint32Array(GEN8_UNDERGROUND_REQUEST_WORDS);
  words.set([
    seed0Low,
    seed0High,
    seed1Low,
    seed1High,
    request.initialAdvances,
    chunk.start,
    chunk.count,
    request.profile.tid,
    request.profile.sid,
    request.profile.version === "brilliantdiamond" ? 0 : 1,
    request.storyFlag,
    request.location,
    request.diglett ? 1 : 0,
    request.levelFlag,
    request.lead,
    request.filters.disabled ? 1 : 0,
    SHINY_MASKS[request.filters.shiny],
    GENDER_VALUES[request.filters.gender],
    ABILITY_VALUES[request.filters.ability],
    request.filters.natureMask,
    request.filters.heightMin,
    request.filters.heightMax,
    request.filters.weightMin,
    request.filters.weightMax,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
  ]);
  request.filters.species.forEach((species) => {
    words[36 + Math.floor(species / 32)] |= 1 << (species % 32);
  });
  words[52] = request.offset;
  words[53] = request.resultLimit;
  return words;
}

function unpackIvs(words: Uint32Array, offset: number) {
  return [
    words[offset] & 0xff,
    (words[offset] >>> 8) & 0xff,
    (words[offset] >>> 16) & 0xff,
    (words[offset] >>> 24) & 0xff,
    words[offset + 1] & 0xff,
    (words[offset + 1] >>> 8) & 0xff,
  ] as Gen8UndergroundIvTuple;
}

function unpackStats(words: Uint32Array, offset: number) {
  return [
    words[offset] & 0xffff,
    words[offset] >>> 16,
    words[offset + 1] & 0xffff,
    words[offset + 1] >>> 16,
    words[offset + 2] & 0xffff,
    words[offset + 2] >>> 16,
  ] as Gen8UndergroundIvTuple;
}

export function decodeGen8UndergroundResults(
  buffer: ArrayBuffer,
  maximum = GEN8_UNDERGROUND_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN8_UNDERGROUND_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen 8 Underground result buffer length.");
  const count = Math.min(words.length / GEN8_UNDERGROUND_RESULT_WORDS, maximum);
  return Array.from({ length: count }, (_, index) => {
    const offset = index * GEN8_UNDERGROUND_RESULT_WORDS;
    const encounter = words[offset + 3];
    const metadata = words[offset + 4];
    const measures = words[offset + 11];
    return {
      advances: words[offset],
      eggMove: encounter & 0xffff,
      item: encounter >>> 16,
      species: metadata & 0x3ff,
      level: (metadata >>> 10) & 0x7f,
      ec: formatGen8UndergroundHex32(words[offset + 1]),
      pid: formatGen8UndergroundHex32(words[offset + 2]),
      ability: (metadata >>> 17) & 0x3,
      gender: (metadata >>> 19) & 0x3,
      nature: (metadata >>> 21) & 0x1f,
      shiny: (metadata >>> 26) & 0x3,
      height: measures & 0xff,
      weight: (measures >>> 8) & 0xff,
      characteristic: (measures >>> 16) & 0x1f,
      ivs: unpackIvs(words, offset + 5),
      abilityIndex: words[offset + 7],
      stats: unpackStats(words, offset + 8),
    } satisfies Gen8UndergroundResult;
  });
}

export function validateGen8UndergroundResult(
  request: Gen8UndergroundRequest,
  result: Gen8UndergroundResult,
) {
  const available = new Set<number>(
    getGen8UndergroundSpecies(
      request.profile.version,
      request.location,
      request.storyFlag,
    ),
  );
  const levels = GEN8_UNDERGROUND_LEVEL_RANGES[request.levelFlag];
  if (
    !integerIn(
      result.advances,
      request.initialAdvances,
      request.initialAdvances + request.maxAdvances,
    ) ||
    !HEX_8.test(result.ec) ||
    !HEX_8.test(result.pid) ||
    !available.has(result.species) ||
    !integerIn(result.level, levels[0], levels[1]) ||
    !integerIn(result.eggMove, 0, 0xffff) ||
    !integerIn(result.item, 0, 0xffff) ||
    !integerIn(result.shiny, 0, 2) ||
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.ability, 0, 1) ||
    !integerIn(result.abilityIndex, 0, 0xffff) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.height, 0, 255) ||
    !integerIn(result.weight, 0, 255) ||
    !integerIn(result.characteristic, 0, 29) ||
    result.ivs.some((value) => !integerIn(value, 0, 31)) ||
    result.stats.some((value) => !integerIn(value, 1, 999))
  ) {
    throw new RangeError("Invalid Gen 8 Underground result.");
  }
  return result;
}
