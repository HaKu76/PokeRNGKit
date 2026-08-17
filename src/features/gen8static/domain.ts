import { getIvBaseStats } from "../gen4ivcalculator/gen4IvData";
import type { Gen8Profile } from "../gen8profiles/domain";
import type { Gen8StaticTemplate, Gen8StaticVersion } from "./data";

export const GEN8_STATIC_API_VERSION = 1;
export const GEN8_STATIC_REQUEST_WORDS = 41;
export const GEN8_STATIC_RESULT_WORDS = 11;
export const GEN8_STATIC_MAX_RESULTS = 100_000;
export const GEN8_STATIC_MAX_EVALUATIONS = 250_000_000;
export const GEN8_STATIC_CHUNK_SIZE = 2_000;

export type Gen8StaticIvTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Gen8StaticShinyFilter = "any" | "star" | "square" | "starSquare";
export type Gen8StaticGenderFilter = "any" | "male" | "female";
export type Gen8StaticAbilityFilter = "any" | "first" | "second" | "hidden";

export interface Gen8StaticProfile {
  version: Gen8StaticVersion;
  tid: number;
  sid: number;
}

export interface Gen8StaticFilters {
  disabled: boolean;
  shiny: Gen8StaticShinyFilter;
  gender: Gen8StaticGenderFilter;
  ability: Gen8StaticAbilityFilter;
  natureMask: number;
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
  ivMin: Gen8StaticIvTuple;
  ivMax: Gen8StaticIvTuple;
}

export interface Gen8StaticRequest {
  profile: Gen8StaticProfile;
  seed0: string;
  seed1: string;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  lead: number;
  template: Gen8StaticTemplate;
  filters: Gen8StaticFilters;
  resultLimit: number;
}

export interface Gen8StaticChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen8StaticResult {
  advances: number;
  ec: string;
  pid: string;
  shiny: number;
  nature: number;
  ability: number;
  abilityIndex: number;
  ivs: Gen8StaticIvTuple;
  stats: Gen8StaticIvTuple;
  gender: number;
  height: number;
  weight: number;
  characteristic: number;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const HEX_SEED_INPUT = /^[0-9a-fA-F]{0,16}$/;
const HEX_8 = /^[0-9A-F]{8}$/;
const NATURE_STAT_MAP = [1, 2, 5, 3, 4] as const;
const CHARACTERISTIC_ORDER = [0, 1, 2, 5, 3, 4] as const;

const SHINY_MASKS: Record<Gen8StaticShinyFilter, number> = {
  any: 255,
  star: 1 << 1,
  square: 1 << 2,
  starSquare: (1 << 1) | (1 << 2),
};
const GENDER_VALUES: Record<Gen8StaticGenderFilter, number> = {
  any: 255,
  male: 0,
  female: 1,
};
const ABILITY_VALUES: Record<Gen8StaticAbilityFilter, number> = {
  any: 255,
  first: 0,
  second: 1,
  hidden: 2,
};

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

export function gen8StaticProfile(profile: Gen8Profile): Gen8StaticProfile {
  if (
    profile.version !== "brilliantdiamond" &&
    profile.version !== "shiningpearl"
  ) {
    throw new TypeError("Gen 8 Static requires a BDSP profile.");
  }
  return { version: profile.version, tid: profile.tid, sid: profile.sid };
}

export function parseGen8StaticDecimal(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export function normalizeGen8StaticSeed(value: string) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .padStart(16, "0");
}

export function formatGen8StaticHex32(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function validateProfile(profile: Gen8StaticProfile) {
  if (
    (profile.version !== "brilliantdiamond" &&
      profile.version !== "shiningpearl") ||
    !integerIn(profile.tid, 0, 0xffff) ||
    !integerIn(profile.sid, 0, 0xffff)
  ) {
    throw new TypeError("Gen 8 Static requires a valid BDSP profile.");
  }
}

function validateTemplate(template: Gen8StaticTemplate) {
  if (
    !integerIn(template.index, 0, 46) ||
    typeof template.description !== "string" ||
    !template.description ||
    !Array.isArray(template.versions) ||
    template.versions.length < 1 ||
    !template.versions.every(
      (version) => version === "brilliantdiamond" || version === "shiningpearl",
    ) ||
    !integerIn(template.species, 1, 493) ||
    !integerIn(template.form, 0, 31) ||
    !integerIn(template.shiny, 0, 1) ||
    ![0, 1, 2, 255].includes(template.ability) ||
    ![0, 1, 2, 255].includes(template.gender) ||
    !integerIn(template.ivCount, 0, 3) ||
    !integerIn(template.level, 1, 100) ||
    typeof template.fateful !== "boolean" ||
    typeof template.roamer !== "boolean" ||
    !integerIn(template.genderRatio, 0, 255) ||
    !Array.isArray(template.abilityIds) ||
    template.abilityIds.length !== 3 ||
    !template.abilityIds.every((ability) => integerIn(ability, 0, 0xffff))
  ) {
    throw new TypeError("Invalid Gen 8 Static encounter template.");
  }
}

function validateFilters(filters: Gen8StaticFilters) {
  if (
    typeof filters.disabled !== "boolean" ||
    !Object.hasOwn(SHINY_MASKS, filters.shiny) ||
    !Object.hasOwn(GENDER_VALUES, filters.gender) ||
    !Object.hasOwn(ABILITY_VALUES, filters.ability) ||
    !integerIn(filters.natureMask, 1, ALL_NATURES) ||
    !integerIn(filters.heightMin, 0, 255) ||
    !integerIn(filters.heightMax, filters.heightMin, 255) ||
    !integerIn(filters.weightMin, 0, 255) ||
    !integerIn(filters.weightMax, filters.weightMin, 255) ||
    !Array.isArray(filters.ivMin) ||
    !Array.isArray(filters.ivMax) ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  ) {
    throw new TypeError("Invalid Gen 8 Static filter settings.");
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
}

export function gen8StaticTaskCount(request: Gen8StaticRequest) {
  return request.maxAdvances + 1;
}

export function validateGen8StaticRequest(request: Gen8StaticRequest) {
  validateProfile(request.profile);
  validateTemplate(request.template);
  if (!request.template.versions.includes(request.profile.version))
    throw new TypeError("The selected encounter is unavailable for this game.");
  if (
    !HEX_SEED_INPUT.test(request.seed0) ||
    !HEX_SEED_INPUT.test(request.seed1)
  ) {
    throw new TypeError("Seeds must contain at most 16 hexadecimal digits.");
  }
  if (
    normalizeGen8StaticSeed(request.seed0) === "0000000000000000" &&
    normalizeGen8StaticSeed(request.seed1) === "0000000000000000"
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
  if (gen8StaticTaskCount(request) > GEN8_STATIC_MAX_EVALUATIONS)
    throw new TypeError("Gen 8 Static range exceeds the browser task limit.");
  if (request.lead !== 255 && !integerIn(request.lead, 0, 26)) {
    throw new TypeError("Invalid Gen 8 Static lead.");
  }
  validateFilters(request.filters);
  if (!integerIn(request.resultLimit, 1, GEN8_STATIC_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  return request;
}

export function splitGen8StaticRequest(
  request: Gen8StaticRequest,
  workers: number,
  chunkSize = GEN8_STATIC_CHUNK_SIZE,
) {
  validateGen8StaticRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new TypeError("Chunk size must be a positive integer.");
  const count = gen8StaticTaskCount(request);
  const targetChunks = Math.max(workers * 4, Math.ceil(count / chunkSize));
  const chunkCount = Math.min(count, targetChunks);
  const base = Math.floor(count / chunkCount);
  const remainder = count % chunkCount;
  const chunks: Gen8StaticChunk[] = [];
  let start = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const current = base + (index < remainder ? 1 : 0);
    chunks.push({ index, start, count: current });
    start += current;
  }
  return chunks;
}

export function encodeGen8StaticRequest(
  request: Gen8StaticRequest,
  chunk: Gen8StaticChunk,
) {
  validateGen8StaticRequest(request);
  if (
    !Number.isInteger(chunk.index) ||
    chunk.index < 0 ||
    !Number.isInteger(chunk.start) ||
    chunk.start < 0 ||
    !Number.isInteger(chunk.count) ||
    chunk.count < 1 ||
    chunk.start + chunk.count > gen8StaticTaskCount(request)
  ) {
    throw new TypeError("Invalid Gen 8 Static chunk.");
  }
  const seed0 = BigInt(`0x${normalizeGen8StaticSeed(request.seed0)}`);
  const seed1 = BigInt(`0x${normalizeGen8StaticSeed(request.seed1)}`);
  return Uint32Array.from([
    Number(seed0 & 0xffff_ffffn),
    Number(seed0 >> 32n),
    Number(seed1 & 0xffff_ffffn),
    Number(seed1 >> 32n),
    request.initialAdvances,
    request.offset,
    chunk.start,
    chunk.count,
    request.profile.tid,
    request.profile.sid,
    request.template.species,
    request.template.form,
    request.template.shiny,
    request.template.ability,
    request.template.ivCount,
    request.template.level,
    request.template.fateful ? 1 : 0,
    request.template.roamer ? 1 : 0,
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
    request.resultLimit,
  ]);
}

function byte(word: number, shift: number) {
  return (word >>> shift) & 0xff;
}

export function decodeGen8StaticResults(
  buffer: ArrayBuffer,
  maximumResults = Number.POSITIVE_INFINITY,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN8_STATIC_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen 8 Static result buffer length.");
  const resultCount = Math.min(
    words.length / GEN8_STATIC_RESULT_WORDS,
    Math.max(0, Math.floor(maximumResults)),
  );
  return Array.from({ length: resultCount }, (_, index): Gen8StaticResult => {
    const offset = index * GEN8_STATIC_RESULT_WORDS;
    const metadata = words[offset + 3];
    const measures = words[offset + 4];
    const ivs0 = words[offset + 5];
    const ivs1 = words[offset + 6];
    return {
      advances: words[offset],
      ec: formatGen8StaticHex32(words[offset + 1]),
      pid: formatGen8StaticHex32(words[offset + 2]),
      ability: metadata & 0x3,
      gender: (metadata >>> 2) & 0x3,
      nature: (metadata >>> 4) & 0x1f,
      shiny: (metadata >>> 9) & 0x3,
      characteristic: (metadata >>> 11) & 0x1f,
      height: byte(measures, 0),
      weight: byte(measures, 8),
      ivs: [
        byte(ivs0, 0),
        byte(ivs0, 8),
        byte(ivs0, 16),
        byte(ivs0, 24),
        byte(ivs1, 0),
        byte(ivs1, 8),
      ],
      abilityIndex: words[offset + 7],
      stats: [
        words[offset + 8] & 0xffff,
        words[offset + 8] >>> 16,
        words[offset + 9] & 0xffff,
        words[offset + 9] >>> 16,
        words[offset + 10] & 0xffff,
        words[offset + 10] >>> 16,
      ],
    };
  });
}

export function gen8StaticCharacteristic(ec: number, ivs: Gen8StaticIvTuple) {
  const start = ec % 6;
  let selected = start;
  let maximum = 0;
  for (let offset = 0; offset < 6; offset += 1) {
    const index = (start + offset) % 6;
    if (ivs[CHARACTERISTIC_ORDER[index]] > maximum) {
      selected = index;
      maximum = ivs[CHARACTERISTIC_ORDER[index]];
    }
  }
  return selected * 5 + (maximum % 5);
}

function expectedShiny(request: Gen8StaticRequest, pid: number) {
  const tsv = request.profile.tid ^ request.profile.sid;
  const psv = (pid >>> 16) ^ (pid & 0xffff);
  if (tsv === psv) return 2;
  return (tsv ^ psv) < 16 ? 1 : 0;
}

function computedStats(request: Gen8StaticRequest, result: Gen8StaticResult) {
  const base = getIvBaseStats(
    "bdsp",
    request.template.species,
    request.template.form,
  );
  const raised = NATURE_STAT_MAP[Math.floor(result.nature / 5)];
  const lowered = NATURE_STAT_MAP[result.nature % 5];
  const level = request.template.level;
  return base.map((value, index) => {
    const scaled = Math.floor(((2 * value + result.ivs[index]) * level) / 100);
    if (index === 0) return scaled + level + 10;
    const raw = scaled + 5;
    if (raised === lowered) return raw;
    if (index === raised) return Math.floor(raw * 1.1);
    if (index === lowered) return Math.floor(raw * 0.9);
    return raw;
  }) as Gen8StaticIvTuple;
}

function resultPassesFilters(
  filters: Gen8StaticFilters,
  result: Gen8StaticResult,
) {
  if (filters.disabled) return true;
  return (
    (SHINY_MASKS[filters.shiny] & (1 << result.shiny)) !== 0 &&
    (filters.gender === "any" ||
      GENDER_VALUES[filters.gender] === result.gender) &&
    (filters.ability === "any" ||
      ABILITY_VALUES[filters.ability] === result.ability) &&
    (filters.natureMask & (1 << result.nature)) !== 0 &&
    result.height >= filters.heightMin &&
    result.height <= filters.heightMax &&
    result.weight >= filters.weightMin &&
    result.weight <= filters.weightMax &&
    result.ivs.every(
      (value, index) =>
        value >= filters.ivMin[index] && value <= filters.ivMax[index],
    )
  );
}

export function validateGen8StaticResult(
  request: Gen8StaticRequest,
  result: Gen8StaticResult,
) {
  if (!HEX_8.test(result.ec) || !HEX_8.test(result.pid))
    throw new TypeError("Gen 8 Static result contains an invalid EC or PID.");
  if (
    !integerIn(
      result.advances,
      request.initialAdvances,
      request.initialAdvances + request.maxAdvances,
    ) ||
    !integerIn(result.ability, 0, 2) ||
    !integerIn(result.abilityIndex, 0, 0xffff) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.shiny, 0, 2) ||
    !integerIn(result.height, 0, 255) ||
    !integerIn(result.weight, 0, 255) ||
    !integerIn(result.characteristic, 0, 29) ||
    !result.ivs.every((value) => integerIn(value, 0, 31)) ||
    !result.stats.every((value) => integerIn(value, 1, 999))
  ) {
    throw new TypeError("Gen 8 Static result contains invalid state values.");
  }
  const ec = Number.parseInt(result.ec, 16) >>> 0;
  const pid = Number.parseInt(result.pid, 16) >>> 0;
  const template = request.template;
  const fixedGender =
    template.genderRatio === 255
      ? 2
      : template.genderRatio === 254
        ? 1
        : template.genderRatio === 0
          ? 0
          : null;
  const perfectCount = template.roamer ? 3 : template.ivCount;
  const abilityAllowed = template.roamer
    ? result.ability <= 1
    : template.ability === 255
      ? result.ability <= 1
      : result.ability === template.ability;
  if (
    gen8StaticCharacteristic(ec, result.ivs) !== result.characteristic ||
    expectedShiny(request, pid) !== result.shiny ||
    computedStats(request, result).some(
      (value, index) => value !== result.stats[index],
    ) ||
    !abilityAllowed ||
    template.abilityIds[result.ability] !== result.abilityIndex ||
    (fixedGender !== null && result.gender !== fixedGender) ||
    (template.shiny === 1 && result.shiny !== 0) ||
    result.ivs.filter((value) => value === 31).length < perfectCount ||
    !resultPassesFilters(request.filters, result)
  ) {
    throw new TypeError(
      "Gen 8 Static result contains inconsistent derived values.",
    );
  }
  return result;
}

export function gen8StaticShinyMask(filter: Gen8StaticShinyFilter) {
  return SHINY_MASKS[filter];
}

export function gen8StaticGenderValue(filter: Gen8StaticGenderFilter) {
  return GENDER_VALUES[filter];
}

export function gen8StaticAbilityValue(filter: Gen8StaticAbilityFilter) {
  return ABILITY_VALUES[filter];
}
