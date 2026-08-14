import type { Gen8Profile } from "../gen8profiles/domain";
import { GEN8_EGG_SPECIES_SET, getGen8EggBaseStats } from "./data";

export const GEN8_EGG_API_VERSION = 1;
export const GEN8_EGG_REQUEST_WORDS = 53;
export const GEN8_EGG_RESULT_WORDS = 13;
export const GEN8_EGG_MAX_RESULTS = 100_000;
export const GEN8_EGG_MAX_EVALUATIONS = 250_000_000;
export const GEN8_EGG_CHUNK_SIZE = 2_000;

export type Gen8EggIvTuple = [number, number, number, number, number, number];
export type Gen8EggParentGender = "male" | "female" | "genderless" | "ditto";
export type Gen8EggParentAbility = 0 | 1 | 2;
export type Gen8EggParentItem = 0 | 1 | 8;
export type Gen8EggCompatibility = 20 | 50 | 70;
export type Gen8EggShinyFilter =
  "any" | "notShiny" | "star" | "square" | "starSquare";
export type Gen8EggGenderFilter = "any" | "male" | "female" | "genderless";
export type Gen8EggAbilityFilter = "any" | "first" | "second" | "hidden";

export interface Gen8EggParent {
  ivs: Gen8EggIvTuple;
  ability: Gen8EggParentAbility;
  gender: Gen8EggParentGender;
  item: Gen8EggParentItem;
  nature: number;
}

export interface Gen8EggFilters {
  disabled: boolean;
  shiny: Gen8EggShinyFilter;
  gender: Gen8EggGenderFilter;
  ability: Gen8EggAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen8EggIvTuple;
  ivMax: Gen8EggIvTuple;
}

export interface Gen8EggProfile {
  tid: number;
  sid: number;
  shinyCharm: boolean;
  ovalCharm: boolean;
}

export interface Gen8EggRequest {
  profile: Gen8EggProfile;
  seed0: string;
  seed1: string;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  compatibility: Gen8EggCompatibility;
  species: number;
  masuda: boolean;
  parentA: Gen8EggParent;
  parentB: Gen8EggParent;
  filters: Gen8EggFilters;
  resultLimit: number;
}

export interface Gen8EggChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen8EggResult {
  advances: number;
  seed: string;
  ec: string;
  pid: string;
  shiny: number;
  nature: number;
  ability: number;
  abilityIndex: number;
  ivs: Gen8EggIvTuple;
  stats: Gen8EggIvTuple;
  inheritance: Gen8EggIvTuple;
  hiddenPower: number;
  hiddenPowerStrength: number;
  gender: number;
  characteristic: number;
  species: number;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const HEX_SEED_INPUT = /^[0-9a-fA-F]{0,16}$/;
const HEX_8 = /^[0-9A-F]{8}$/;
const NATURE_STAT_MAP = [1, 2, 5, 3, 4] as const;
const HIDDEN_POWER_ORDER = [0, 1, 2, 5, 3, 4] as const;

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

export function gen8EggProfile(profile: Gen8Profile): Gen8EggProfile {
  if (
    profile.version !== "brilliantdiamond" &&
    profile.version !== "shiningpearl"
  ) {
    throw new TypeError("Gen 8 Eggs require a BDSP profile.");
  }
  return {
    tid: profile.tid,
    sid: profile.sid,
    shinyCharm: profile.shinyCharm,
    ovalCharm: profile.ovalCharm,
  };
}

export function gen8EggParentGenderToWasm(gender: Gen8EggParentGender) {
  return { male: 0, female: 1, genderless: 2, ditto: 3 }[gender];
}

export function gen8EggShinyFilterToWasm(filter: Gen8EggShinyFilter) {
  return {
    any: 0,
    notShiny: 1,
    star: 2,
    square: 3,
    starSquare: 4,
  }[filter];
}

export function gen8EggGenderFilterToWasm(filter: Gen8EggGenderFilter) {
  return { any: 0, male: 1, female: 2, genderless: 3 }[filter];
}

export function gen8EggAbilityFilterToWasm(filter: Gen8EggAbilityFilter) {
  return { any: 0, first: 1, second: 2, hidden: 3 }[filter];
}

export function isGen8EggParentCombinationValid(
  parentA: Gen8EggParent,
  parentB: Gen8EggParent,
) {
  const left = gen8EggParentGenderToWasm(parentA.gender);
  const right = gen8EggParentGenderToWasm(parentB.gender);
  return (
    (left === 0 && right === 1) ||
    (left === 1 && right === 0) ||
    (left === 3 && right === 1) ||
    (left === 1 && right === 3) ||
    (left === 0 && right === 3) ||
    (left === 3 && right === 0) ||
    (left === 2 && right === 3) ||
    (left === 3 && right === 2)
  );
}

export function shouldReorderGen8EggParents(
  parentA: Gen8EggParent,
  parentB: Gen8EggParent,
) {
  const left = gen8EggParentGenderToWasm(parentA.gender);
  const right = gen8EggParentGenderToWasm(parentB.gender);
  return (
    (left === 1 && right === 0) ||
    (left === 1 && right === 3) ||
    (left === 3 && right === 0) ||
    (left === 3 && right === 2)
  );
}

export function canonicalGen8EggParents(
  parentA: Gen8EggParent,
  parentB: Gen8EggParent,
) {
  return shouldReorderGen8EggParents(parentA, parentB)
    ? ([parentB, parentA] as const)
    : ([parentA, parentB] as const);
}

export function mapGen8EggInheritanceSource(
  source: number,
  parentsReordered: boolean,
) {
  if (!integerIn(source, 0, 2))
    throw new TypeError("Invalid Gen 8 Egg inheritance source.");
  if (!parentsReordered || source === 0) return source;
  return source === 1 ? 2 : 1;
}

export function parseGen8EggDecimal(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export function normalizeGen8EggSeed(value: string) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .padStart(16, "0");
}

export function effectiveGen8EggCompatibility(
  compatibility: Gen8EggCompatibility,
  ovalCharm: boolean,
) {
  if (!ovalCharm) return compatibility;
  return compatibility === 20 ? 40 : compatibility === 50 ? 80 : 88;
}

function validateProfile(profile: Gen8EggProfile) {
  if (!integerIn(profile.tid, 0, 0xffff) || !integerIn(profile.sid, 0, 0xffff))
    throw new TypeError("TID and SID must be between 0 and 65535.");
  if (
    typeof profile.shinyCharm !== "boolean" ||
    typeof profile.ovalCharm !== "boolean"
  ) {
    throw new TypeError("Invalid Gen 8 Egg profile options.");
  }
}

function validateParent(parent: Gen8EggParent, name: string) {
  if (!Array.isArray(parent.ivs) || parent.ivs.length !== 6)
    throw new TypeError(`${name} IVs require six values.`);
  if (!parent.ivs.every((value) => integerIn(value, 0, 31)))
    throw new TypeError(`${name} IVs must be between 0 and 31.`);
  if (!integerIn(parent.ability, 0, 2))
    throw new TypeError(`${name} Ability is invalid.`);
  if (
    !(["male", "female", "genderless", "ditto"] as string[]).includes(
      parent.gender,
    )
  ) {
    throw new TypeError(`${name} Gender is invalid.`);
  }
  if (![0, 1, 8].includes(parent.item))
    throw new TypeError(`${name} Item is invalid.`);
  if (!integerIn(parent.nature, 0, 24))
    throw new TypeError(`${name} Nature must be between 0 and 24.`);
}

function validateFilters(filters: Gen8EggFilters) {
  if (typeof filters.disabled !== "boolean")
    throw new TypeError("Invalid Gen 8 Egg filter state.");
  if (
    !(["any", "notShiny", "star", "square", "starSquare"] as string[]).includes(
      filters.shiny,
    ) ||
    !(["any", "male", "female", "genderless"] as string[]).includes(
      filters.gender,
    ) ||
    !(["any", "first", "second", "hidden"] as string[]).includes(
      filters.ability,
    )
  ) {
    throw new TypeError("Invalid Gen 8 Egg filter choice.");
  }
  if (
    !integerIn(filters.natureMask, 1, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 1, ALL_HIDDEN_POWERS)
  ) {
    throw new TypeError("Select at least one Nature and Hidden Power type.");
  }
  if (
    !Array.isArray(filters.ivMin) ||
    !Array.isArray(filters.ivMax) ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  ) {
    throw new TypeError("Gen 8 Egg IV filters require six ranges.");
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

export function gen8EggTaskCount(request: Gen8EggRequest) {
  return request.maxAdvances + 1;
}

export function validateGen8EggRequest(request: Gen8EggRequest) {
  validateProfile(request.profile);
  if (
    !HEX_SEED_INPUT.test(request.seed0) ||
    !HEX_SEED_INPUT.test(request.seed1)
  )
    throw new TypeError("Seeds must contain at most 16 hexadecimal digits.");
  if (
    normalizeGen8EggSeed(request.seed0) === "0000000000000000" &&
    normalizeGen8EggSeed(request.seed1) === "0000000000000000"
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
  if (gen8EggTaskCount(request) > GEN8_EGG_MAX_EVALUATIONS)
    throw new TypeError("Gen 8 Egg range exceeds the browser task limit.");
  if (![20, 50, 70].includes(request.compatibility))
    throw new TypeError("Compatibility must be 20, 50, or 70.");
  if (!GEN8_EGG_SPECIES_SET.has(request.species))
    throw new TypeError("Egg Specie is not available in BDSP.");
  if (typeof request.masuda !== "boolean")
    throw new TypeError("Masuda must be a boolean.");
  validateParent(request.parentA, "Parent A");
  validateParent(request.parentB, "Parent B");
  if (!isGen8EggParentCombinationValid(request.parentA, request.parentB))
    throw new TypeError(
      "Gender of selected parents are not compatible for breeding",
    );
  validateFilters(request.filters);
  if (!integerIn(request.resultLimit, 1, GEN8_EGG_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");

  const [parentA, parentB] = canonicalGen8EggParents(
    request.parentA,
    request.parentB,
  );
  const abilityParent = parentB.gender === "ditto" ? parentA : parentB;
  if (
    !request.filters.disabled &&
    request.filters.ability === "hidden" &&
    abilityParent.ability !== 2
  ) {
    throw new TypeError("Parents incompatible for breeding Hidden Ability!");
  }
  return request;
}

export function splitGen8EggRequest(
  request: Gen8EggRequest,
  workers: number,
  chunkSize = GEN8_EGG_CHUNK_SIZE,
) {
  validateGen8EggRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new TypeError("Chunk size must be a positive integer.");
  const count = gen8EggTaskCount(request);
  const targetChunks = Math.max(workers * 4, Math.ceil(count / chunkSize));
  const chunkCount = Math.min(count, targetChunks);
  const base = Math.floor(count / chunkCount);
  const remainder = count % chunkCount;
  const chunks: Gen8EggChunk[] = [];
  let start = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const current = base + (index < remainder ? 1 : 0);
    chunks.push({ index, start, count: current });
    start += current;
  }
  return chunks;
}

export function encodeGen8EggRequest(
  request: Gen8EggRequest,
  chunk: Gen8EggChunk,
) {
  validateGen8EggRequest(request);
  if (
    !Number.isInteger(chunk.index) ||
    chunk.index < 0 ||
    !Number.isInteger(chunk.start) ||
    chunk.start < 0 ||
    !Number.isInteger(chunk.count) ||
    chunk.count < 1 ||
    chunk.start + chunk.count > gen8EggTaskCount(request)
  ) {
    throw new TypeError("Invalid Gen 8 Egg chunk.");
  }
  const [parentA, parentB] = canonicalGen8EggParents(
    request.parentA,
    request.parentB,
  );
  const seed0 = BigInt(`0x${normalizeGen8EggSeed(request.seed0)}`);
  const seed1 = BigInt(`0x${normalizeGen8EggSeed(request.seed1)}`);
  return Uint32Array.from([
    Number(seed0 & 0xffff_ffffn),
    Number(seed0 >> 32n),
    Number(seed1 & 0xffff_ffffn),
    Number(seed1 >> 32n),
    request.initialAdvances,
    request.offset,
    chunk.start,
    chunk.count,
    effectiveGen8EggCompatibility(
      request.compatibility,
      request.profile.ovalCharm,
    ),
    request.profile.tid,
    request.profile.sid,
    request.profile.shinyCharm ? 1 : 0,
    request.species,
    request.masuda ? 1 : 0,
    ...parentA.ivs,
    ...parentB.ivs,
    parentA.ability,
    parentB.ability,
    gen8EggParentGenderToWasm(parentA.gender),
    gen8EggParentGenderToWasm(parentB.gender),
    parentA.item,
    parentB.item,
    parentA.nature,
    parentB.nature,
    request.filters.disabled ? 1 : 0,
    gen8EggShinyFilterToWasm(request.filters.shiny),
    gen8EggGenderFilterToWasm(request.filters.gender),
    gen8EggAbilityFilterToWasm(request.filters.ability),
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    request.resultLimit,
  ]);
}

function byte(word: number, shift: number) {
  return (word >>> shift) & 0xff;
}

export function decodeGen8EggResults(
  buffer: ArrayBuffer,
  maximumResults = Number.POSITIVE_INFINITY,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN8_EGG_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen 8 Egg result buffer length.");
  const resultCount = Math.min(
    words.length / GEN8_EGG_RESULT_WORDS,
    Math.max(0, Math.floor(maximumResults)),
  );
  return Array.from({ length: resultCount }, (_, index): Gen8EggResult => {
    const offset = index * GEN8_EGG_RESULT_WORDS;
    const metadata = words[offset + 4];
    const ivs0 = words[offset + 5];
    const ivs1 = words[offset + 6];
    const inheritance = words[offset + 7];
    return {
      advances: words[offset],
      seed: words[offset + 1].toString(16).toUpperCase().padStart(8, "0"),
      ec: words[offset + 2].toString(16).toUpperCase().padStart(8, "0"),
      pid: words[offset + 3].toString(16).toUpperCase().padStart(8, "0"),
      ability: metadata & 0x3,
      gender: (metadata >>> 2) & 0x3,
      nature: (metadata >>> 4) & 0x1f,
      shiny: (metadata >>> 9) & 0x3,
      characteristic: (metadata >>> 11) & 0x1f,
      ivs: [
        byte(ivs0, 0),
        byte(ivs0, 8),
        byte(ivs0, 16),
        byte(ivs0, 24),
        byte(ivs1, 0),
        byte(ivs1, 8),
      ],
      hiddenPower: byte(ivs1, 16),
      hiddenPowerStrength: byte(ivs1, 24),
      inheritance: [
        inheritance & 0x3,
        (inheritance >>> 2) & 0x3,
        (inheritance >>> 4) & 0x3,
        (inheritance >>> 6) & 0x3,
        (inheritance >>> 8) & 0x3,
        (inheritance >>> 10) & 0x3,
      ],
      abilityIndex: words[offset + 8],
      stats: [
        words[offset + 9] & 0xffff,
        words[offset + 9] >>> 16,
        words[offset + 10] & 0xffff,
        words[offset + 10] >>> 16,
        words[offset + 11] & 0xffff,
        words[offset + 11] >>> 16,
      ],
      species: words[offset + 12],
    };
  });
}

export function gen8EggHiddenPower(ivs: Gen8EggIvTuple) {
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

export function gen8EggCharacteristic(ec: number, ivs: Gen8EggIvTuple) {
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

function computedStats(result: Gen8EggResult) {
  const base = getGen8EggBaseStats(result.species);
  const raised = NATURE_STAT_MAP[Math.floor(result.nature / 5)];
  const lowered = NATURE_STAT_MAP[result.nature % 5];
  return base.map((value, index) => {
    if (index === 0)
      return Math.floor((2 * value + result.ivs[index]) / 100) + 11;
    const raw = Math.floor((2 * value + result.ivs[index]) / 100) + 5;
    if (raised === lowered) return raw;
    if (index === raised) return Math.floor(raw * 1.1);
    if (index === lowered) return Math.floor(raw * 0.9);
    return raw;
  }) as Gen8EggIvTuple;
}

function expectedShiny(request: Gen8EggRequest, pid: number) {
  const tsv = request.profile.tid ^ request.profile.sid;
  const psv = (pid >>> 16) ^ (pid & 0xffff);
  if (tsv === psv) return 2;
  return (tsv ^ psv) < 16 ? 1 : 0;
}

function resultPassesFilters(filters: Gen8EggFilters, result: Gen8EggResult) {
  if (filters.disabled) return true;
  const shiny =
    filters.shiny === "any" ||
    (filters.shiny === "notShiny" && result.shiny === 0) ||
    (filters.shiny === "star" && result.shiny === 1) ||
    (filters.shiny === "square" && result.shiny === 2) ||
    (filters.shiny === "starSquare" && result.shiny > 0);
  const gender =
    filters.gender === "any" ||
    (filters.gender === "male" && result.gender === 0) ||
    (filters.gender === "female" && result.gender === 1) ||
    (filters.gender === "genderless" && result.gender === 2);
  const ability =
    filters.ability === "any" ||
    (filters.ability === "first" && result.ability === 0) ||
    (filters.ability === "second" && result.ability === 1) ||
    (filters.ability === "hidden" && result.ability === 2);
  return (
    shiny &&
    gender &&
    ability &&
    (filters.natureMask & (1 << result.nature)) !== 0 &&
    (filters.hiddenPowerMask & (1 << result.hiddenPower)) !== 0 &&
    result.ivs.every(
      (value, index) =>
        value >= filters.ivMin[index] && value <= filters.ivMax[index],
    )
  );
}

export function validateGen8EggResult(
  request: Gen8EggRequest,
  result: Gen8EggResult,
) {
  if (
    !HEX_8.test(result.seed) ||
    !HEX_8.test(result.ec) ||
    !HEX_8.test(result.pid)
  )
    throw new TypeError(
      "Gen 8 Egg result contains an invalid Seed, EC, or PID.",
    );
  if (
    !integerIn(
      result.advances,
      request.initialAdvances,
      request.initialAdvances + request.maxAdvances,
    ) ||
    !integerIn(result.ability, 0, 2) ||
    !integerIn(result.abilityIndex, 1, 0xffff) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.shiny, 0, 2) ||
    !integerIn(result.hiddenPower, 0, 15) ||
    !integerIn(result.hiddenPowerStrength, 30, 70) ||
    !integerIn(result.characteristic, 0, 29) ||
    !GEN8_EGG_SPECIES_SET.has(result.species) ||
    !result.ivs.every((value) => integerIn(value, 0, 31)) ||
    !result.inheritance.every((value) => integerIn(value, 0, 2)) ||
    !result.stats.every((value) => integerIn(value, 1, 999))
  ) {
    throw new TypeError("Gen 8 Egg result contains invalid state values.");
  }
  const power = gen8EggHiddenPower(result.ivs);
  const ec = Number.parseInt(result.ec, 16) >>> 0;
  const pid = Number.parseInt(result.pid, 16) >>> 0;
  if (
    power.type !== result.hiddenPower ||
    power.power !== result.hiddenPowerStrength ||
    gen8EggCharacteristic(ec, result.ivs) !== result.characteristic ||
    expectedShiny(request, pid) !== result.shiny ||
    computedStats(result).some(
      (value, index) => value !== result.stats[index],
    ) ||
    !resultPassesFilters(request.filters, result)
  ) {
    throw new TypeError(
      "Gen 8 Egg result contains inconsistent derived values.",
    );
  }
  return result;
}
