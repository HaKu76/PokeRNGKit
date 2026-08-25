import type { Gen8Profile } from "../gen8profiles/domain";
import {
  passesPerfectIvFilter,
  validatePerfectIvFilter,
} from "../shared/perfectIvFilter";
import type { Gen8WildEncounter, Gen8WildVersion } from "./data";
import {
  getGen8WildLocations,
  getGen8WildReplacementOptions,
  getGen8WildSlots,
  type Gen8WildEncounterSettings,
} from "./encounters";

export const GEN8_WILD_API_VERSION = 2;
export const GEN8_WILD_REQUEST_WORDS = 50;
export const GEN8_WILD_RESULT_WORDS = 12;
export const GEN8_WILD_MAX_RESULTS = 100_000;
export const GEN8_WILD_MAX_EVALUATIONS = 250_000_000;
export const GEN8_WILD_CHUNK_SIZE = 2_000;

export type Gen8WildIvTuple = [number, number, number, number, number, number];
export type Gen8WildShinyFilter = "any" | "star" | "square" | "starSquare";
export type Gen8WildGenderFilter = "any" | "male" | "female";
export type Gen8WildAbilityFilter = "any" | "first" | "second";

export interface Gen8WildProfile {
  version: Gen8WildVersion;
  tid: number;
  sid: number;
  nationalDex: boolean;
}

export interface Gen8WildFilters {
  disabled: boolean;
  shiny: Gen8WildShinyFilter;
  gender: Gen8WildGenderFilter;
  ability: Gen8WildAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  slotMask: number;
  levelMin: number;
  levelMax: number;
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
  ivMin: Gen8WildIvTuple;
  ivMax: Gen8WildIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
}

export interface Gen8WildRequest {
  profile: Gen8WildProfile;
  seed0: string;
  seed1: string;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  encounter: Gen8WildEncounter;
  location: number;
  time: 0 | 1 | 2;
  radar: boolean;
  swarm: boolean;
  replacement: readonly [number, number];
  feebasTile: boolean;
  lead: number;
  honeyIndex: number;
  filters: Gen8WildFilters;
  resultLimit: number;
}

export interface Gen8WildChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen8WildResult {
  advances: number;
  item: number;
  slot: number;
  species: number;
  form: number;
  level: number;
  ec: string;
  pid: string;
  shiny: number;
  nature: number;
  ability: number;
  abilityIndex: number;
  ivs: Gen8WildIvTuple;
  stats: Gen8WildIvTuple;
  hiddenPower: number;
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
  ...Array.from({ length: 33 }, (_, index) => index),
  34,
  255,
]);
const HONEY_LEADS = new Set([
  ...Array.from({ length: 27 }, (_, index) => index),
  255,
]);
const ENCOUNTER_VALUES: Record<Gen8WildEncounter, number> = {
  grass: 0,
  honeyTree: 1,
  rockSmash: 2,
  surfing: 3,
  oldRod: 4,
  goodRod: 5,
  superRod: 6,
};
const SHINY_VALUES: Record<Gen8WildShinyFilter, number> = {
  any: 255,
  star: 1,
  square: 2,
  starSquare: 3,
};
const GENDER_VALUES: Record<Gen8WildGenderFilter, number> = {
  any: 255,
  male: 0,
  female: 1,
};
const ABILITY_VALUES: Record<Gen8WildAbilityFilter, number> = {
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

export function gen8WildProfile(profile: Gen8Profile): Gen8WildProfile {
  if (
    profile.version !== "brilliantdiamond" &&
    profile.version !== "shiningpearl"
  ) {
    throw new TypeError("Gen 8 Wild requires a BDSP profile.");
  }
  return {
    version: profile.version,
    tid: profile.tid,
    sid: profile.sid,
    nationalDex: profile.nationalDex,
  };
}

export function parseGen8WildDecimal(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export function normalizeGen8WildSeed(value: string) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .padStart(16, "0");
}

export function formatGen8WildHex32(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function gen8WildSettings(
  request: Gen8WildRequest,
): Gen8WildEncounterSettings {
  return {
    ...request.profile,
    encounter: request.encounter,
    location: request.location,
    time: request.time,
    radar: request.radar,
    swarm: request.swarm,
    replacement: request.replacement,
    feebasTile: request.feebasTile,
  };
}

function validateProfile(profile: Gen8WildProfile) {
  if (
    (profile.version !== "brilliantdiamond" &&
      profile.version !== "shiningpearl") ||
    !integerIn(profile.tid, 0, 0xffff) ||
    !integerIn(profile.sid, 0, 0xffff) ||
    typeof profile.nationalDex !== "boolean"
  ) {
    throw new TypeError("Gen 8 Wild requires a valid BDSP profile.");
  }
}

function validateEncounter(request: Gen8WildRequest) {
  if (!Object.hasOwn(ENCOUNTER_VALUES, request.encounter)) {
    throw new TypeError("Invalid Gen 8 Wild encounter type.");
  }
  const locations = getGen8WildLocations(
    request.profile.version,
    request.encounter,
  );
  if (!locations.includes(request.location)) {
    throw new TypeError("Invalid Gen 8 Wild location.");
  }
  if (
    !integerIn(request.time, 0, 2) ||
    typeof request.radar !== "boolean" ||
    typeof request.swarm !== "boolean" ||
    typeof request.feebasTile !== "boolean" ||
    !Array.isArray(request.replacement) ||
    request.replacement.length !== 2 ||
    !request.replacement.every((species) => integerIn(species, 0, 493))
  ) {
    throw new TypeError("Invalid Gen 8 Wild encounter settings.");
  }
  const replacements = new Set<number>([
    0,
    ...getGen8WildReplacementOptions(
      request.profile.nationalDex,
      request.location,
    ),
  ]);
  if (!request.replacement.every((species) => replacements.has(species))) {
    throw new TypeError("Invalid Gen 8 Wild replacement Pokemon.");
  }
  const slots = getGen8WildSlots(gen8WildSettings(request));
  if (slots.length === 0) throw new TypeError("Gen 8 Wild area has no slots.");
  if (
    request.encounter === "honeyTree" &&
    (!integerIn(request.honeyIndex, 0, slots.length - 1) ||
      request.filters.slotMask !== 1 << request.honeyIndex)
  ) {
    throw new TypeError("Please select one encounter slot");
  }
  if (
    request.encounter !== "honeyTree" &&
    !integerIn(request.honeyIndex, 0, 11)
  ) {
    throw new TypeError("Invalid Gen 8 Wild Honey Tree slot.");
  }
  return slots;
}

function validateFilters(filters: Gen8WildFilters, slotCount: number) {
  if (
    typeof filters.disabled !== "boolean" ||
    !Object.hasOwn(SHINY_VALUES, filters.shiny) ||
    !Object.hasOwn(GENDER_VALUES, filters.gender) ||
    !Object.hasOwn(ABILITY_VALUES, filters.ability) ||
    !integerIn(filters.natureMask, 1, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 1, ALL_HIDDEN_POWERS) ||
    !integerIn(filters.slotMask, 1, (1 << slotCount) - 1) ||
    !integerIn(filters.levelMin, 1, 100) ||
    !integerIn(filters.levelMax, filters.levelMin, 100) ||
    !integerIn(filters.heightMin, 0, 255) ||
    !integerIn(filters.heightMax, filters.heightMin, 255) ||
    !integerIn(filters.weightMin, 0, 255) ||
    !integerIn(filters.weightMax, filters.weightMin, 255) ||
    !Array.isArray(filters.ivMin) ||
    !Array.isArray(filters.ivMax) ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  ) {
    throw new TypeError("Invalid Gen 8 Wild filter settings.");
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
  if (!validatePerfectIvFilter(filters.perfectIvValue, filters.perfectIvCount))
    throw new TypeError("Perfect IV filter must use 0..31 and 0..6.");
}

export function gen8WildTaskCount(request: Gen8WildRequest) {
  return request.maxAdvances + 1;
}

export function validateGen8WildRequest(request: Gen8WildRequest) {
  validateProfile(request.profile);
  if (
    !HEX_SEED_INPUT.test(request.seed0) ||
    !HEX_SEED_INPUT.test(request.seed1)
  ) {
    throw new TypeError("Seeds must contain at most 16 hexadecimal digits.");
  }
  if (
    normalizeGen8WildSeed(request.seed0) === "0000000000000000" &&
    normalizeGen8WildSeed(request.seed1) === "0000000000000000"
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
  if (gen8WildTaskCount(request) > GEN8_WILD_MAX_EVALUATIONS) {
    throw new TypeError("Gen 8 Wild range exceeds the browser task limit.");
  }
  if (!VALID_LEADS.has(request.lead)) {
    throw new TypeError("Invalid Gen 8 Wild lead.");
  }
  if (request.encounter === "honeyTree" && !HONEY_LEADS.has(request.lead)) {
    throw new TypeError("Invalid Honey Tree lead.");
  }
  const slots = validateEncounter(request);
  validateFilters(request.filters, slots.length);
  if (!integerIn(request.resultLimit, 1, GEN8_WILD_MAX_RESULTS)) {
    throw new TypeError("Result limit must be between 1 and 100000.");
  }
  return request;
}

export function splitGen8WildRequest(
  request: Gen8WildRequest,
  workers: number,
  chunkSize = GEN8_WILD_CHUNK_SIZE,
) {
  validateGen8WildRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new TypeError("Chunk size must be a positive integer.");
  const total = gen8WildTaskCount(request);
  const chunks: Gen8WildChunk[] = [];
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
  const seed = BigInt(`0x${normalizeGen8WildSeed(value)}`);
  return [Number(seed & 0xffff_ffffn), Number(seed >> 32n)] as const;
}

export function encodeGen8WildRequest(
  request: Gen8WildRequest,
  chunk: Gen8WildChunk,
) {
  validateGen8WildRequest(request);
  if (
    !Number.isInteger(chunk.index) ||
    chunk.index < 0 ||
    !Number.isInteger(chunk.start) ||
    chunk.start < 0 ||
    !Number.isInteger(chunk.count) ||
    chunk.count < 1 ||
    chunk.start + chunk.count > gen8WildTaskCount(request)
  ) {
    throw new TypeError("Invalid Gen 8 Wild chunk.");
  }
  const [seed0Low, seed0High] = splitSeed(request.seed0);
  const [seed1Low, seed1High] = splitSeed(request.seed1);
  const words = new Uint32Array(GEN8_WILD_REQUEST_WORDS);
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
    ENCOUNTER_VALUES[request.encounter],
    request.location,
    request.time,
    request.radar ? 1 : 0,
    request.swarm ? 1 : 0,
    request.replacement[0],
    request.replacement[1],
    request.feebasTile ? 1 : 0,
    request.lead,
    request.honeyIndex,
    request.filters.disabled ? 1 : 0,
    SHINY_VALUES[request.filters.shiny],
    GENDER_VALUES[request.filters.gender],
    ABILITY_VALUES[request.filters.ability],
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    request.filters.slotMask,
    request.filters.levelMin,
    request.filters.levelMax,
    request.filters.heightMin,
    request.filters.heightMax,
    request.filters.weightMin,
    request.filters.weightMax,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    request.filters.disabled ? 31 : request.filters.perfectIvValue,
    request.filters.disabled ? 0 : request.filters.perfectIvCount,
    request.offset,
    request.resultLimit,
    request.profile.nationalDex ? 1 : 0,
  ]);
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
  ] as Gen8WildIvTuple;
}

function unpackStats(words: Uint32Array, offset: number) {
  return [
    words[offset] & 0xffff,
    words[offset] >>> 16,
    words[offset + 1] & 0xffff,
    words[offset + 1] >>> 16,
    words[offset + 2] & 0xffff,
    words[offset + 2] >>> 16,
  ] as Gen8WildIvTuple;
}

export function decodeGen8WildResults(
  buffer: ArrayBuffer,
  maximum = GEN8_WILD_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN8_WILD_RESULT_WORDS !== 0) {
    throw new RangeError("Invalid Gen 8 Wild result buffer length.");
  }
  const count = Math.min(words.length / GEN8_WILD_RESULT_WORDS, maximum);
  return Array.from({ length: count }, (_, index) => {
    const offset = index * GEN8_WILD_RESULT_WORDS;
    const encounter = words[offset + 3];
    const metadata = words[offset + 4];
    const measures = words[offset + 11];
    return {
      advances: words[offset],
      item: encounter & 0xffff,
      species: encounter >>> 16,
      level: metadata & 0x7f,
      ability: (metadata >>> 7) & 0x3,
      gender: (metadata >>> 9) & 0x3,
      nature: (metadata >>> 11) & 0x1f,
      shiny: (metadata >>> 16) & 0x3,
      slot: (metadata >>> 18) & 0xf,
      form: (metadata >>> 22) & 0x1f,
      ec: formatGen8WildHex32(words[offset + 1]),
      pid: formatGen8WildHex32(words[offset + 2]),
      ivs: unpackIvs(words, offset + 5),
      abilityIndex: words[offset + 7],
      stats: unpackStats(words, offset + 8),
      height: measures & 0xff,
      weight: (measures >>> 8) & 0xff,
      characteristic: (measures >>> 16) & 0x1f,
      hiddenPower: (measures >>> 21) & 0xf,
    } satisfies Gen8WildResult;
  });
}

export function validateGen8WildResult(
  request: Gen8WildRequest,
  result: Gen8WildResult,
) {
  const slots = getGen8WildSlots(gen8WildSettings(request));
  const slot = slots[result.slot];
  if (
    !integerIn(
      result.advances,
      request.initialAdvances,
      request.initialAdvances + request.maxAdvances,
    ) ||
    !HEX_8.test(result.ec) ||
    !HEX_8.test(result.pid) ||
    !slot ||
    result.species !== slot.species ||
    !integerIn(result.form, 0, result.species === 201 ? 27 : 0) ||
    !integerIn(result.level, slot.minLevel, slot.maxLevel) ||
    !integerIn(result.item, 0, 0xffff) ||
    !integerIn(result.shiny, 0, 2) ||
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.ability, 0, 1) ||
    !integerIn(result.abilityIndex, 0, 0xffff) ||
    !integerIn(result.hiddenPower, 0, 15) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.height, 0, 255) ||
    !integerIn(result.weight, 0, 255) ||
    !integerIn(result.characteristic, 0, 29) ||
    result.ivs.some((value) => !integerIn(value, 0, 31)) ||
    result.stats.some((value) => !integerIn(value, 1, 999)) ||
    (!request.filters.disabled &&
      !passesPerfectIvFilter(
        result.ivs,
        request.filters.perfectIvValue,
        request.filters.perfectIvCount,
      ))
  ) {
    throw new RangeError("Invalid Gen 8 Wild result.");
  }
  return result;
}
