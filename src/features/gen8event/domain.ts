import type { Gen8Profile } from "../gen8profiles/domain";
import { getIvBaseStats } from "../gen4ivcalculator/gen4IvData";
import {
  passesPerfectIvFilter,
  validatePerfectIvFilter,
} from "../shared/perfectIvFilter";

export const GEN8_EVENT_API_VERSION = 2;
export const GEN8_EVENT_REQUEST_WORDS = 47;
export const GEN8_EVENT_RESULT_WORDS = 11;
export const GEN8_EVENT_MAX_RESULTS = 100_000;
export const GEN8_EVENT_MAX_EVALUATIONS = 250_000_000;
export const GEN8_EVENT_CHUNK_SIZE = 2_000;
export const GEN8_EVENT_WONDERCARD_SIZE = 732;

export type Gen8EventIvTuple = [number, number, number, number, number, number];
export type Gen8EventPidType =
  "nonshiny" | "random" | "star" | "square" | "static";
export type Gen8EventShinyFilter = "any" | "star" | "square" | "starSquare";
export type Gen8EventGenderFilter = "any" | "male" | "female";
export type Gen8EventAbilityFilter = "any" | "first" | "second" | "hidden";

export interface Gen8EventProfile {
  tid: number;
  sid: number;
}

export interface Gen8EventSettings {
  species: number;
  ivCount: number;
  level: number;
  pidType: Gen8EventPidType;
  ability: number;
  gender: number;
  nature: number | null;
  tid: number;
  sid: number;
  ec: number;
  pid: number;
  egg: boolean;
}

export interface Gen8EventFilters {
  disabled: boolean;
  shiny: Gen8EventShinyFilter;
  gender: Gen8EventGenderFilter;
  ability: Gen8EventAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
  ivMin: Gen8EventIvTuple;
  ivMax: Gen8EventIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
}

export interface Gen8EventRequest {
  profile: Gen8EventProfile;
  seed0: string;
  seed1: string;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  event: Gen8EventSettings;
  filters: Gen8EventFilters;
  resultLimit: number;
}

export interface Gen8EventChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen8EventResult {
  advances: number;
  ec: string;
  pid: string;
  shiny: number;
  nature: number;
  ability: number;
  abilityIndex: number;
  ivs: Gen8EventIvTuple;
  stats: Gen8EventIvTuple;
  hiddenPower: number;
  hiddenPowerStrength: number;
  gender: number;
  height: number;
  weight: number;
  characteristic: number;
}

export interface Gen8EventWondercard extends Gen8EventSettings {
  form: number;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const HEX_SEED_INPUT = /^[0-9a-fA-F]{0,16}$/;
const HEX_8 = /^[0-9A-F]{8}$/;
const NATURE_STAT_MAP = [1, 2, 5, 3, 4] as const;
const HIDDEN_POWER_ORDER = [0, 1, 2, 5, 3, 4] as const;

const PID_TYPE_VALUES: Record<Gen8EventPidType, number> = {
  nonshiny: 0,
  random: 1,
  star: 2,
  square: 3,
  static: 4,
};

const PID_TYPES = [
  "nonshiny",
  "random",
  "star",
  "square",
  "static",
] as const satisfies readonly Gen8EventPidType[];

const SHINY_FILTER_VALUES: Record<Gen8EventShinyFilter, number> = {
  any: 0,
  star: 1,
  square: 2,
  starSquare: 3,
};

const GENDER_FILTER_VALUES: Record<Gen8EventGenderFilter, number> = {
  any: 0,
  male: 1,
  female: 2,
};

const ABILITY_FILTER_VALUES: Record<Gen8EventAbilityFilter, number> = {
  any: 0,
  first: 1,
  second: 2,
  hidden: 3,
};

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

export function gen8EventProfile(profile: Gen8Profile): Gen8EventProfile {
  if (
    profile.version !== "brilliantdiamond" &&
    profile.version !== "shiningpearl"
  ) {
    throw new TypeError("Gen 8 Event requires a BDSP profile.");
  }
  return { tid: profile.tid, sid: profile.sid };
}

export function parseGen8EventDecimal(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export function parseGen8EventHex(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^[0-9a-fA-F]+$/.test(normalized)
    ? Number.parseInt(normalized, 16)
    : Number.NaN;
}

export function normalizeGen8EventSeed(value: string) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .padStart(16, "0");
}

export function formatGen8EventHex32(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function parseGen8EventWondercard(buffer: ArrayBuffer) {
  if (buffer.byteLength !== GEN8_EVENT_WONDERCARD_SIZE) {
    throw new RangeError("Wondercard is not the correct size");
  }
  const view = new DataView(buffer);
  const ivFlag = view.getUint8(0x2b2);
  const pidType = PID_TYPES[view.getUint8(0x290)];
  if (pidType === undefined) throw new TypeError("Invalid PID Type.");
  const card: Gen8EventWondercard = {
    tid: view.getUint16(0x20, true),
    sid: view.getUint16(0x22, true),
    ec: view.getUint32(0x28, true),
    pid: view.getUint32(0x2c, true),
    species: view.getUint16(0x288, true),
    form: view.getUint8(0x28a),
    gender: view.getUint8(0x28b),
    level: view.getUint8(0x28c),
    egg: view.getUint8(0x28d) === 1,
    nature: view.getUint8(0x28e) === 255 ? null : view.getUint8(0x28e),
    ability: view.getUint8(0x28f),
    pidType,
    ivCount: ivFlag >= 0xfc && ivFlag <= 0xfe ? ivFlag - 0xfb : 0,
  };
  validateGen8EventSettings(card);
  return card;
}

function validateProfile(profile: Gen8EventProfile) {
  if (!integerIn(profile.tid, 0, 0xffff) || !integerIn(profile.sid, 0, 0xffff))
    throw new TypeError("TID and SID must be between 0 and 65535.");
}

function validateGen8EventSettings(event: Gen8EventSettings) {
  if (!integerIn(event.species, 1, 493))
    throw new TypeError("Species must be between 1 and 493.");
  if (!integerIn(event.ivCount, 0, 3))
    throw new TypeError("IV Count must be between 0 and 3.");
  if (!integerIn(event.level, 1, 100))
    throw new TypeError("Level must be between 1 and 100.");
  if (!Object.hasOwn(PID_TYPE_VALUES, event.pidType))
    throw new TypeError("Invalid PID Type.");
  if (!integerIn(event.ability, 0, 4))
    throw new TypeError("Invalid Event Ability.");
  if (!integerIn(event.gender, 0, 2))
    throw new TypeError("Invalid Event Gender.");
  if (event.nature !== null && !integerIn(event.nature, 0, 24))
    throw new TypeError("Nature must be between 0 and 24.");
  if (!integerIn(event.tid, 0, 0xffff) || !integerIn(event.sid, 0, 0xffff))
    throw new TypeError("Event TID and SID must be between 0 and 65535.");
  if (
    !integerIn(event.ec, 0, UINT32_MAX) ||
    !integerIn(event.pid, 0, UINT32_MAX)
  )
    throw new TypeError("EC and PID must be 32-bit unsigned integers.");
  if (typeof event.egg !== "boolean")
    throw new TypeError("Egg must be boolean.");
}

function validateFilters(filters: Gen8EventFilters) {
  if (typeof filters.disabled !== "boolean")
    throw new TypeError("Invalid Gen 8 Event filter state.");
  if (
    !Object.hasOwn(SHINY_FILTER_VALUES, filters.shiny) ||
    !Object.hasOwn(GENDER_FILTER_VALUES, filters.gender) ||
    !Object.hasOwn(ABILITY_FILTER_VALUES, filters.ability)
  ) {
    throw new TypeError("Invalid Gen 8 Event filter choice.");
  }
  if (
    !integerIn(filters.natureMask, 1, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 1, ALL_HIDDEN_POWERS)
  ) {
    throw new TypeError("Select at least one Nature and Hidden Power type.");
  }
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
    throw new TypeError("Gen 8 Event IV filters require six ranges.");
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

export function gen8EventTaskCount(request: Gen8EventRequest) {
  return request.maxAdvances + 1;
}

export function validateGen8EventRequest(request: Gen8EventRequest) {
  validateProfile(request.profile);
  if (
    !HEX_SEED_INPUT.test(request.seed0) ||
    !HEX_SEED_INPUT.test(request.seed1)
  )
    throw new TypeError("Seeds must contain at most 16 hexadecimal digits.");
  if (
    normalizeGen8EventSeed(request.seed0) === "0000000000000000" &&
    normalizeGen8EventSeed(request.seed1) === "0000000000000000"
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
  )
    throw new TypeError(
      "Initial Advances plus Offset and Max Advances exceeds 4294967295.",
    );
  if (gen8EventTaskCount(request) > GEN8_EVENT_MAX_EVALUATIONS)
    throw new TypeError("Gen 8 Event range exceeds the browser task limit.");
  validateGen8EventSettings(request.event);
  validateFilters(request.filters);
  if (!integerIn(request.resultLimit, 1, GEN8_EVENT_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  return request;
}

export function splitGen8EventRequest(
  request: Gen8EventRequest,
  workers: number,
  chunkSize = GEN8_EVENT_CHUNK_SIZE,
) {
  validateGen8EventRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new TypeError("Chunk size must be a positive integer.");
  const count = gen8EventTaskCount(request);
  const targetChunks = Math.max(workers * 4, Math.ceil(count / chunkSize));
  const chunkCount = Math.min(count, targetChunks);
  const base = Math.floor(count / chunkCount);
  const remainder = count % chunkCount;
  const chunks: Gen8EventChunk[] = [];
  let start = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const current = base + (index < remainder ? 1 : 0);
    chunks.push({ index, start, count: current });
    start += current;
  }
  return chunks;
}

export function encodeGen8EventRequest(
  request: Gen8EventRequest,
  chunk: Gen8EventChunk,
) {
  validateGen8EventRequest(request);
  if (
    !Number.isInteger(chunk.index) ||
    chunk.index < 0 ||
    !Number.isInteger(chunk.start) ||
    chunk.start < 0 ||
    !Number.isInteger(chunk.count) ||
    chunk.count < 1 ||
    chunk.start + chunk.count > gen8EventTaskCount(request)
  ) {
    throw new TypeError("Invalid Gen 8 Event chunk.");
  }
  const seed0 = BigInt(`0x${normalizeGen8EventSeed(request.seed0)}`);
  const seed1 = BigInt(`0x${normalizeGen8EventSeed(request.seed1)}`);
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
    request.event.tid,
    request.event.sid,
    request.event.ec,
    request.event.pid,
    request.event.species,
    request.event.gender,
    request.event.egg ? 1 : 0,
    request.event.nature ?? 255,
    request.event.ability,
    PID_TYPE_VALUES[request.event.pidType],
    request.event.ivCount,
    request.event.level,
    request.filters.disabled ? 1 : 0,
    SHINY_FILTER_VALUES[request.filters.shiny],
    GENDER_FILTER_VALUES[request.filters.gender],
    ABILITY_FILTER_VALUES[request.filters.ability],
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    request.filters.heightMin,
    request.filters.heightMax,
    request.filters.weightMin,
    request.filters.weightMax,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    request.filters.disabled ? 31 : request.filters.perfectIvValue,
    request.filters.disabled ? 0 : request.filters.perfectIvCount,
    request.resultLimit,
  ]);
}

function byte(word: number, shift: number) {
  return (word >>> shift) & 0xff;
}

export function decodeGen8EventResults(
  buffer: ArrayBuffer,
  maximumResults = Number.POSITIVE_INFINITY,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN8_EVENT_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen 8 Event result buffer length.");
  const resultCount = Math.min(
    words.length / GEN8_EVENT_RESULT_WORDS,
    Math.max(0, Math.floor(maximumResults)),
  );
  return Array.from({ length: resultCount }, (_, index): Gen8EventResult => {
    const offset = index * GEN8_EVENT_RESULT_WORDS;
    const metadata = words[offset + 3];
    const measures = words[offset + 4];
    const ivs0 = words[offset + 5];
    const ivs1 = words[offset + 6];
    return {
      advances: words[offset],
      ec: formatGen8EventHex32(words[offset + 1]),
      pid: formatGen8EventHex32(words[offset + 2]),
      ability: metadata & 0x3,
      gender: (metadata >>> 2) & 0x3,
      nature: (metadata >>> 4) & 0x1f,
      shiny: (metadata >>> 9) & 0x3,
      characteristic: (metadata >>> 11) & 0x1f,
      height: byte(measures, 0),
      weight: byte(measures, 8),
      hiddenPower: byte(measures, 16),
      hiddenPowerStrength: byte(measures, 24),
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

export function gen8EventHiddenPower(ivs: Gen8EventIvTuple) {
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

export function gen8EventCharacteristic(ec: number, ivs: Gen8EventIvTuple) {
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

function computedStats(request: Gen8EventRequest, result: Gen8EventResult) {
  const base = getIvBaseStats("bdsp", request.event.species);
  const raised = NATURE_STAT_MAP[Math.floor(result.nature / 5)];
  const lowered = NATURE_STAT_MAP[result.nature % 5];
  const level = request.event.level;
  return base.map((value, index) => {
    const scaled = Math.floor(((2 * value + result.ivs[index]) * level) / 100);
    if (index === 0) return scaled + level + 10;
    const raw = scaled + 5;
    if (raised === lowered) return raw;
    if (index === raised) return Math.floor(raw * 1.1);
    if (index === lowered) return Math.floor(raw * 0.9);
    return raw;
  }) as Gen8EventIvTuple;
}

export function gen8EventTsv(request: Gen8EventRequest) {
  return request.event.egg
    ? request.profile.tid ^ request.profile.sid
    : request.event.tid ^ request.event.sid;
}

function expectedShiny(request: Gen8EventRequest, pid: number) {
  const tsv = gen8EventTsv(request);
  const psv = (pid >>> 16) ^ (pid & 0xffff);
  if (tsv === psv) return 2;
  return (tsv ^ psv) < 16 ? 1 : 0;
}

function resultPassesFilters(
  filters: Gen8EventFilters,
  result: Gen8EventResult,
) {
  if (filters.disabled) return true;
  const shiny =
    filters.shiny === "any" ||
    (filters.shiny === "star" && result.shiny === 1) ||
    (filters.shiny === "square" && result.shiny === 2) ||
    (filters.shiny === "starSquare" && result.shiny > 0);
  const gender =
    filters.gender === "any" ||
    (filters.gender === "male" && result.gender === 0) ||
    (filters.gender === "female" && result.gender === 1);
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

export function validateGen8EventResult(
  request: Gen8EventRequest,
  result: Gen8EventResult,
) {
  if (!HEX_8.test(result.ec) || !HEX_8.test(result.pid))
    throw new TypeError("Gen 8 Event result contains an invalid EC or PID.");
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
    !integerIn(result.height, 0, 255) ||
    !integerIn(result.weight, 0, 255) ||
    !integerIn(result.characteristic, 0, 29) ||
    !result.ivs.every((value) => integerIn(value, 0, 31)) ||
    !result.stats.every((value) => integerIn(value, 1, 999))
  ) {
    throw new TypeError("Gen 8 Event result contains invalid state values.");
  }
  const power = gen8EventHiddenPower(result.ivs);
  const ec = Number.parseInt(result.ec, 16) >>> 0;
  const pid = Number.parseInt(result.pid, 16) >>> 0;
  const event = request.event;
  const abilityAllowed =
    event.ability <= 2
      ? result.ability === event.ability
      : event.ability === 3
        ? result.ability <= 1
        : result.ability <= 2;
  if (
    power.type !== result.hiddenPower ||
    power.power !== result.hiddenPowerStrength ||
    gen8EventCharacteristic(ec, result.ivs) !== result.characteristic ||
    expectedShiny(request, pid) !== result.shiny ||
    computedStats(request, result).some(
      (value, index) => value !== result.stats[index],
    ) ||
    !abilityAllowed ||
    result.gender !== event.gender ||
    (event.nature !== null && result.nature !== event.nature) ||
    (event.ec !== 0 && ec !== event.ec) ||
    (event.pidType === "static" && pid !== event.pid) ||
    result.ivs.filter((value) => value === 31).length < event.ivCount ||
    !resultPassesFilters(request.filters, result)
  ) {
    throw new TypeError(
      "Gen 8 Event result contains inconsistent derived values.",
    );
  }
  return result;
}
