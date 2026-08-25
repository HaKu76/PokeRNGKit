import type { Gen8Profile } from "../gen8profiles/domain";
import {
  passesPerfectIvFilter,
  validatePerfectIvFilter,
} from "../shared/perfectIvFilter";
import { getGen8RaidPersonal, type Gen8RaidTemplate } from "./data";

export const GEN8_RAIDS_API_VERSION = 2;
export const GEN8_RAIDS_REQUEST_WORDS = 43;
export const GEN8_RAIDS_RESULT_WORDS = 12;
export const GEN8_RAIDS_MAX_RESULTS = 100_000;
export const GEN8_RAIDS_MAX_EVALUATIONS = 250_000_000;
export const GEN8_RAIDS_CHUNK_SIZE = 2_000;
export const GEN8_RAIDS_MAX_SPECIES = 898;

export type Gen8RaidIvTuple = [number, number, number, number, number, number];
export type Gen8RaidShinyFilter = "any" | "star" | "square" | "starSquare";
export type Gen8RaidGenderFilter = "any" | "male" | "female";
export type Gen8RaidAbilityFilter = "any" | "first" | "second" | "hidden";

export interface Gen8RaidProfile {
  version: "sword" | "shield";
  tid: number;
  sid: number;
}

export interface Gen8RaidRequest {
  profile: Gen8RaidProfile;
  seed: string;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  template: Gen8RaidTemplate;
  level: number;
  genderRatio: number;
  filters: Gen8RaidFilters;
  resultLimit: number;
}

export interface Gen8RaidFilters {
  disabled: boolean;
  shiny: Gen8RaidShinyFilter;
  gender: Gen8RaidGenderFilter;
  ability: Gen8RaidAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
  ivMin: Gen8RaidIvTuple;
  ivMax: Gen8RaidIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
}

export interface Gen8RaidChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen8RaidResult {
  advances: number;
  ec: string;
  pid: string;
  shiny: number;
  nature: number;
  ability: number;
  abilityIndex: number;
  ivs: Gen8RaidIvTuple;
  stats: Gen8RaidIvTuple;
  gender: number;
  height: number;
  weight: number;
  characteristic: number;
  species: number;
  form: number;
  starMask: number;
  gigantamax: boolean;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const HEX_SEED_INPUT = /^[0-9a-fA-F]{0,16}$/;
const HEX_8 = /^[0-9A-F]{8}$/;
const NATURE_STAT_MAP = [1, 2, 5, 3, 4] as const;
const HIDDEN_POWER_ORDER = [0, 1, 2, 5, 3, 4] as const;
const SHINY_MASKS: Record<Gen8RaidShinyFilter, number> = {
  any: 255,
  star: 2,
  square: 4,
  starSquare: 6,
};
const GENDER_VALUES: Record<Gen8RaidGenderFilter, number> = {
  any: 255,
  male: 0,
  female: 1,
};
const ABILITY_VALUES: Record<Gen8RaidAbilityFilter, number> = {
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

export function gen8RaidProfile(profile: Gen8Profile): Gen8RaidProfile {
  if (profile.version !== "sword" && profile.version !== "shield") {
    throw new TypeError("Gen 8 Raids require a Sword or Shield profile.");
  }
  return { version: profile.version, tid: profile.tid, sid: profile.sid };
}

export function parseGen8RaidDecimal(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export function parseGen8RaidHex(value: string) {
  const normalized = value.trim().replace(/^0x/i, "");
  if (normalized === "") return 0;
  return /^[0-9a-fA-F]+$/.test(normalized)
    ? Number.parseInt(normalized, 16)
    : Number.NaN;
}

export function normalizeGen8RaidSeed(value: string) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .padStart(16, "0");
}

export function formatGen8RaidHex32(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function validateProfile(profile: Gen8RaidProfile) {
  if (!(["sword", "shield"] as string[]).includes(profile.version))
    throw new TypeError("Invalid Sword/Shield profile version.");
  if (!integerIn(profile.tid, 0, 0xffff) || !integerIn(profile.sid, 0, 0xffff))
    throw new TypeError("TID and SID must be between 0 and 65535.");
}

function validateTemplate(template: Gen8RaidTemplate) {
  if (!integerIn(template.species, 1, GEN8_RAIDS_MAX_SPECIES))
    throw new TypeError("Species must be between 1 and 898.");
  if (!integerIn(template.form, 0, 31))
    throw new TypeError("Form must be between 0 and 31.");
  if (!integerIn(template.shiny, 0, 2))
    throw new TypeError("Invalid raid shiny type.");
  if (!integerIn(template.ability, 0, 4))
    throw new TypeError("Invalid raid ability.");
  if (!integerIn(template.gender, 0, 3))
    throw new TypeError("Invalid raid gender.");
  if (!integerIn(template.ivCount, 1, 6))
    throw new TypeError("IV Count must be between 1 and 6.");
  if (typeof template.gigantamax !== "boolean")
    throw new TypeError("Invalid Gigantamax flag.");
  if (!integerIn(template.starMask, 1, 31))
    throw new TypeError("Invalid raid star range.");
  if (!integerIn(template.level, 0, 100))
    throw new TypeError("Invalid raid template level.");
  getGen8RaidPersonal(template.species, template.form);
}

function validateFilters(filters: Gen8RaidFilters) {
  if (typeof filters.disabled !== "boolean")
    throw new TypeError("Invalid Gen 8 Raids filter state.");
  if (
    !Object.hasOwn(SHINY_MASKS, filters.shiny) ||
    !Object.hasOwn(GENDER_VALUES, filters.gender) ||
    !Object.hasOwn(ABILITY_VALUES, filters.ability)
  ) {
    throw new TypeError("Invalid Gen 8 Raids filter choice.");
  }
  if (!integerIn(filters.natureMask, 1, ALL_NATURES))
    throw new TypeError("Select at least one Nature.");
  if (!integerIn(filters.hiddenPowerMask, 1, ALL_HIDDEN_POWERS))
    throw new TypeError("Select at least one Hidden Power type.");
  if (
    !integerIn(filters.heightMin, 0, 255) ||
    !integerIn(filters.heightMax, filters.heightMin, 255) ||
    !integerIn(filters.weightMin, 0, 255) ||
    !integerIn(filters.weightMax, filters.weightMin, 255)
  ) {
    throw new TypeError("Height and Weight ranges must be between 0 and 255.");
  }
  if (
    !Array.isArray(filters.ivMin) ||
    !Array.isArray(filters.ivMax) ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  ) {
    throw new TypeError("Gen 8 Raids IV filters require six ranges.");
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

export function gen8RaidTaskCount(request: Gen8RaidRequest) {
  return request.maxAdvances + 1;
}

export function validateGen8RaidRequest(request: Gen8RaidRequest) {
  validateProfile(request.profile);
  if (!HEX_SEED_INPUT.test(request.seed))
    throw new TypeError("Seed must contain at most 16 hexadecimal digits.");
  if (normalizeGen8RaidSeed(request.seed) === "0000000000000000")
    throw new TypeError("Please insert a raid seed.");
  if (!integerIn(request.initialAdvances, 0, UINT32_MAX))
    throw new TypeError("Initial Advances must be between 0 and 4294967295.");
  if (!integerIn(request.maxAdvances, 0, UINT32_MAX))
    throw new TypeError("Max Advances must be between 0 and 4294967295.");
  if (!integerIn(request.offset, 0, UINT32_MAX))
    throw new TypeError("Offset must be between 0 and 4294967295.");
  if (
    request.initialAdvances + request.offset + request.maxAdvances >
    UINT32_MAX
  )
    throw new TypeError(
      "Initial Advances plus Offset and Max Advances exceeds 4294967295.",
    );
  if (gen8RaidTaskCount(request) > GEN8_RAIDS_MAX_EVALUATIONS)
    throw new TypeError("Gen 8 Raids range exceeds the browser task limit.");
  validateTemplate(request.template);
  if (!integerIn(request.level, 1, 100))
    throw new TypeError("Level must be between 1 and 100.");
  if (!integerIn(request.genderRatio, 0, 255))
    throw new TypeError("Gender Ratio must be between 0 and 255.");
  validateFilters(request.filters);
  if (!integerIn(request.resultLimit, 1, GEN8_RAIDS_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  return request;
}

export function splitGen8RaidRequest(
  request: Gen8RaidRequest,
  workers: number,
  chunkSize = GEN8_RAIDS_CHUNK_SIZE,
) {
  validateGen8RaidRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new TypeError("Chunk size must be a positive integer.");
  const count = gen8RaidTaskCount(request);
  const targetChunks = Math.max(workers * 4, Math.ceil(count / chunkSize));
  const chunkCount = Math.min(count, targetChunks);
  const base = Math.floor(count / chunkCount);
  const remainder = count % chunkCount;
  const chunks: Gen8RaidChunk[] = [];
  let start = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const current = base + (index < remainder ? 1 : 0);
    chunks.push({ index, start, count: current });
    start += current;
  }
  return chunks;
}

export function encodeGen8RaidRequest(
  request: Gen8RaidRequest,
  chunk: Gen8RaidChunk,
) {
  validateGen8RaidRequest(request);
  if (
    !Number.isInteger(chunk.index) ||
    chunk.index < 0 ||
    !Number.isInteger(chunk.start) ||
    chunk.start < 0 ||
    !Number.isInteger(chunk.count) ||
    chunk.count < 1 ||
    chunk.start + chunk.count > gen8RaidTaskCount(request)
  ) {
    throw new TypeError("Invalid Gen 8 Raids chunk.");
  }
  const seed = BigInt(`0x${normalizeGen8RaidSeed(request.seed)}`);
  const filters = request.filters;
  return Uint32Array.from([
    Number(seed & 0xffff_ffffn),
    Number(seed >> 32n),
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
    request.template.gender,
    request.template.ivCount,
    request.level,
    request.genderRatio,
    filters.disabled ? 1 : 0,
    filters.disabled ? 255 : SHINY_MASKS[filters.shiny],
    filters.disabled ? 255 : GENDER_VALUES[filters.gender],
    filters.disabled ? 255 : ABILITY_VALUES[filters.ability],
    filters.disabled ? ALL_NATURES : filters.natureMask,
    filters.disabled ? ALL_HIDDEN_POWERS : filters.hiddenPowerMask,
    filters.disabled ? 0 : filters.heightMin,
    filters.disabled ? 255 : filters.heightMax,
    filters.disabled ? 0 : filters.weightMin,
    filters.disabled ? 255 : filters.weightMax,
    ...filters.ivMin.map((value) => (filters.disabled ? 0 : value)),
    ...filters.ivMax.map((value) => (filters.disabled ? 31 : value)),
    filters.disabled ? 31 : filters.perfectIvValue,
    filters.disabled ? 0 : filters.perfectIvCount,
    request.resultLimit,
    request.template.starMask,
    request.template.gigantamax ? 1 : 0,
  ]);
}

function byte(word: number, shift: number) {
  return (word >>> shift) & 0xff;
}

export function decodeGen8RaidResults(
  buffer: ArrayBuffer,
  maximumResults = Number.POSITIVE_INFINITY,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN8_RAIDS_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen 8 Raids result buffer length.");
  const resultCount = Math.min(
    words.length / GEN8_RAIDS_RESULT_WORDS,
    Math.max(0, Math.floor(maximumResults)),
  );
  return Array.from({ length: resultCount }, (_, index): Gen8RaidResult => {
    const offset = index * GEN8_RAIDS_RESULT_WORDS;
    const metadata = words[offset + 3];
    const measures = words[offset + 4];
    const packedTemplate = words[offset + 11];
    return {
      advances: words[offset],
      ec: formatGen8RaidHex32(words[offset + 1]),
      pid: formatGen8RaidHex32(words[offset + 2]),
      ability: metadata & 3,
      gender: (metadata >>> 2) & 3,
      nature: (metadata >>> 4) & 31,
      shiny: (metadata >>> 9) & 3,
      characteristic: (metadata >>> 11) & 31,
      height: byte(measures, 0),
      weight: byte(measures, 8),
      ivs: [
        byte(words[offset + 5], 0),
        byte(words[offset + 5], 8),
        byte(words[offset + 5], 16),
        byte(words[offset + 5], 24),
        byte(words[offset + 6], 0),
        byte(words[offset + 6], 8),
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
      species: packedTemplate & 0x3ff,
      form: (packedTemplate >>> 10) & 0x3f,
      starMask: (packedTemplate >>> 16) & 0xff,
      gigantamax: ((packedTemplate >>> 24) & 1) === 1,
    };
  });
}

export function gen8RaidHiddenPower(ivs: Gen8RaidIvTuple) {
  let typeBits = 0;
  let powerBits = 0;
  HIDDEN_POWER_ORDER.forEach((ivIndex, bit) => {
    typeBits |= (ivs[ivIndex] & 1) << bit;
    powerBits |= ((ivs[ivIndex] >>> 1) & 1) << bit;
  });
  return {
    type: Math.floor((typeBits * 15) / 63),
    power: 30 + Math.floor((powerBits * 40) / 63),
  };
}

export function gen8RaidCharacteristic(ec: number, ivs: Gen8RaidIvTuple) {
  const start = ec % 6;
  let selected = start;
  let maximum = 0;
  for (let offset = 0; offset < 6; offset += 1) {
    const index = (start + offset) % 6;
    if (ivs[HIDDEN_POWER_ORDER[index]] > maximum) {
      selected = index;
      maximum = ivs[HIDDEN_POWER_ORDER[index]];
    }
  }
  return selected * 5 + (maximum % 5);
}

export function gen8RaidTsv(request: Gen8RaidRequest) {
  return request.profile.tid ^ request.profile.sid;
}

function computedStats(request: Gen8RaidRequest, result: Gen8RaidResult) {
  const base = getGen8RaidPersonal(result.species, result.form).stats;
  const raised = NATURE_STAT_MAP[Math.floor(result.nature / 5)];
  const lowered = NATURE_STAT_MAP[result.nature % 5];
  return base.map((value, index) => {
    const scaled = Math.floor(
      ((2 * value + result.ivs[index]) * request.level) / 100,
    );
    if (index === 0) return scaled + request.level + 10;
    const raw = scaled + 5;
    if (raised === lowered) return raw;
    if (index === raised) return Math.floor(raw * 1.1);
    if (index === lowered) return Math.floor(raw * 0.9);
    return raw;
  }) as Gen8RaidIvTuple;
}

function expectedShiny(request: Gen8RaidRequest, pid: number) {
  const psv = (pid >>> 16) ^ (pid & 0xffff);
  if (gen8RaidTsv(request) === psv) return 2;
  return (gen8RaidTsv(request) ^ psv) < 16 ? 1 : 0;
}

function resultPassesFilters(filters: Gen8RaidFilters, result: Gen8RaidResult) {
  if (filters.disabled) return true;
  const shiny = (SHINY_MASKS[filters.shiny] & (1 << result.shiny)) !== 0;
  const gender =
    filters.gender === "any" || GENDER_VALUES[filters.gender] === result.gender;
  const ability =
    filters.ability === "any" ||
    ABILITY_VALUES[filters.ability] === result.ability;
  const hiddenPower = gen8RaidHiddenPower(result.ivs).type;
  return (
    shiny &&
    gender &&
    ability &&
    (filters.natureMask & (1 << result.nature)) !== 0 &&
    (filters.hiddenPowerMask & (1 << hiddenPower)) !== 0 &&
    result.height >= filters.heightMin &&
    result.height <= filters.heightMax &&
    result.weight >= filters.weightMin &&
    result.weight <= filters.weightMax &&
    result.ivs.every(
      (value, index) =>
        value >= filters.ivMin[index] && value <= filters.ivMax[index],
    ) &&
    passesPerfectIvFilter(
      result.ivs,
      filters.perfectIvValue,
      filters.perfectIvCount,
    )
  );
}

export function validateGen8RaidResult(
  request: Gen8RaidRequest,
  result: Gen8RaidResult,
) {
  if (!HEX_8.test(result.ec) || !HEX_8.test(result.pid))
    throw new TypeError("Gen 8 Raids result contains an invalid EC or PID.");
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
    !integerIn(result.species, 1, GEN8_RAIDS_MAX_SPECIES) ||
    !result.ivs.every((value) => integerIn(value, 0, 31)) ||
    !result.stats.every((value) => integerIn(value, 1, 999))
  ) {
    throw new TypeError("Gen 8 Raids result contains invalid state values.");
  }
  const ec = Number.parseInt(result.ec, 16) >>> 0;
  const pid = Number.parseInt(result.pid, 16) >>> 0;
  const expectedShinyValue = expectedShiny(request, pid);
  if (
    result.species !== request.template.species ||
    result.form !== request.template.form ||
    result.starMask !== request.template.starMask ||
    result.gigantamax !== request.template.gigantamax ||
    gen8RaidCharacteristic(ec, result.ivs) !== result.characteristic ||
    computedStats(request, result).some(
      (value, index) => value !== result.stats[index],
    ) ||
    (request.template.shiny === 1 && result.shiny !== 0) ||
    (request.template.shiny === 2 && result.shiny !== 2) ||
    (request.template.ability <= 2 &&
      result.ability !== request.template.ability) ||
    (request.template.gender > 0 &&
      result.gender !== request.template.gender - 1) ||
    result.ivs.filter((value) => value === 31).length <
      request.template.ivCount ||
    expectedShinyValue !== result.shiny ||
    !resultPassesFilters(request.filters, result)
  ) {
    throw new TypeError(
      "Gen 8 Raids result contains inconsistent derived values.",
    );
  }
  return result;
}

export function gen8RaidShinyMask(filter: Gen8RaidShinyFilter) {
  return SHINY_MASKS[filter];
}
export function gen8RaidGenderValue(filter: Gen8RaidGenderFilter) {
  return GENDER_VALUES[filter];
}
export function gen8RaidAbilityValue(filter: Gen8RaidAbilityFilter) {
  return ABILITY_VALUES[filter];
}
