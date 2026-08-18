import type { ThreeDsProfile } from "../3dsprofiles/domain";
import {
  gen6EventFormCount,
  gen6EventPersonalForm,
  type Gen6EventVersion,
} from "./data";

export const GEN6_EVENT_API_VERSION = 1;
export const GEN6_EVENT_REQUEST_WORDS = 54;
export const GEN6_EVENT_RESULT_WORDS = 16;
export const GEN6_EVENT_MAX_RESULTS = 100_000;
export const GEN6_EVENT_MAX_FRAME = 1_000_000_000;
export const GEN6_EVENT_BROWSER_MAX_FRAME = 5_000_000;

export type { Gen6EventVersion } from "./data";
export type Gen6EventLanguage = "en" | "ja" | "zh";
export type Gen6EventIvTuple = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Gen6EventPidType = "random" | "nonshiny" | "shiny" | "specified";
export type Gen6EventShinyFilter = "any" | "shiny" | "square";
export type Gen6EventGenderFilter = "any" | "male" | "female" | "genderless";
export type Gen6EventAbilityFilter = "any" | "first" | "second" | "hidden";

export interface Gen6EventSettings {
  species: number;
  form: number;
  level: number;
  fixedIvs: Gen6EventIvTuple;
  randomPerfectIvCount: number;
  abilityLocked: boolean;
  ability: number;
  natureLocked: boolean;
  nature: number;
  genderLocked: boolean;
  gender: number;
  yourId: boolean;
  isEgg: boolean;
  otherInfo: boolean;
  pidType: Gen6EventPidType;
  tid: number;
  sid: number;
  ec: number;
  pid: number;
}

export interface Gen6EventFilters {
  disabled: boolean;
  shiny: Gen6EventShinyFilter;
  gender: Gen6EventGenderFilter;
  ability: Gen6EventAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen6EventIvTuple;
  ivMax: Gen6EventIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
}

export interface Gen6EventRequest {
  version: Gen6EventVersion;
  seed: number;
  minFrame: number;
  maxFrame: number;
  tsv: number;
  trv: number;
  delay: number;
  considerDelay: boolean;
  event: Gen6EventSettings;
  filters: Gen6EventFilters;
  resultLimit: number;
}

export interface Gen6EventResult {
  frame: number;
  random: number;
  ec: number;
  pid: number;
  ivs: Gen6EventIvTuple;
  nature: number;
  ability: number;
  gender: number;
  hiddenPower: number;
  shiny: number;
  delay: number;
  frameUsed: number;
  psv: number;
  prv: number;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const SHINY_MASKS = { any: 7, shiny: 6, square: 4 } as const;
const GENDER_FILTERS = { any: 255, male: 1, female: 2, genderless: 0 } as const;
const ABILITY_FILTERS = { any: 255, first: 1, second: 2, hidden: 3 } as const;
const PID_TYPE_VALUES: Record<Gen6EventPidType, number> = {
  random: 0,
  nonshiny: 1,
  shiny: 2,
  specified: 3,
};
const PID_TYPE_ORDER: readonly Gen6EventPidType[] = [
  "specified",
  "random",
  "shiny",
  "nonshiny",
];
const HIDDEN_POWER_ORDER = [0, 1, 2, 4, 5, 3] as const;
const GEN6_EVENT_VERSIONS: Record<Gen6EventVersion, true> = {
  x: true,
  y: true,
  "omega-ruby": true,
  "alpha-sapphire": true,
};

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function boolean(value: unknown) {
  return typeof value === "boolean";
}

function tuple(values: readonly number[], allowUnknown = false) {
  if (
    values.length !== 6 ||
    !values.every((value) => integerIn(value, allowUnknown ? -1 : 0, 31))
  )
    throw new TypeError("Six IV values are required.");
  return values as Gen6EventIvTuple;
}

export function gen6EventProfile(profile: ThreeDsProfile | undefined) {
  const version = profile?.version;
  if (
    version !== "x" &&
    version !== "y" &&
    version !== "omega-ruby" &&
    version !== "alpha-sapphire"
  ) {
    return { version: "omega-ruby" as Gen6EventVersion, tsv: 0, trv: 0 };
  }
  return { version, tsv: profile?.tsv ?? 0, trv: profile?.trv ?? 0 };
}

export function gen6EventDefaultSettings(
  species = 0,
  form = 0,
): Gen6EventSettings {
  gen6EventPersonalForm(species, form);
  return {
    species,
    form,
    level: 0,
    fixedIvs: [-1, -1, -1, -1, -1, -1],
    randomPerfectIvCount: 0,
    abilityLocked: true,
    ability: 0,
    natureLocked: false,
    nature: 0,
    genderLocked: false,
    gender: 0,
    yourId: false,
    isEgg: false,
    otherInfo: false,
    pidType: "random",
    tid: 0,
    sid: 0,
    ec: 0,
    pid: 0,
  };
}

export function parseGen6EventDecimal(value: string) {
  return value === "" ? 0 : Number.parseInt(value, 10);
}

export function parseGen6EventHex(value: string) {
  return value === "" ? 0 : Number.parseInt(value, 16);
}

export function formatGen6EventHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function gen6EventEffectiveIdentity(request: Gen6EventRequest) {
  return request.event.yourId
    ? { tsv: request.tsv, trv: request.trv }
    : {
        tsv: ((request.event.tid ^ request.event.sid) >>> 4) & 0xfff,
        trv: (request.event.tid ^ request.event.sid) & 0xf,
      };
}

export function gen6EventGenderSetting(genderRatio: number) {
  if (genderRatio === 0) return { setting: 1, random: false } as const;
  if (genderRatio === 0xfe) return { setting: 2, random: false } as const;
  if (genderRatio > 0x0f && genderRatio < 0xef)
    return { setting: genderRatio - 1, random: true } as const;
  return { setting: 0, random: false } as const;
}

export function validateGen6EventRequest(request: Gen6EventRequest) {
  if (!Object.hasOwn(GEN6_EVENT_VERSIONS, request.version))
    throw new TypeError("Unsupported Gen VI Event game version.");
  if (!integerIn(request.seed, 0, UINT32_MAX))
    throw new TypeError("Seed must be a 32-bit unsigned integer.");
  if (
    !integerIn(request.minFrame, 0, GEN6_EVENT_MAX_FRAME) ||
    !integerIn(request.maxFrame, request.minFrame, GEN6_EVENT_MAX_FRAME)
  )
    throw new TypeError("Frame range is invalid.");
  if (request.maxFrame > GEN6_EVENT_BROWSER_MAX_FRAME)
    throw new RangeError("Gen VI Event browser frames are limited to 5000000.");
  if (!integerIn(request.tsv, 0, 4095) || !integerIn(request.trv, 0, 15))
    throw new TypeError("TSV/TRV is invalid.");
  if (!integerIn(request.delay, 0, 4000) || !boolean(request.considerDelay))
    throw new TypeError("Delay must be between 0 and 4000.");

  const event = request.event;
  if (
    !integerIn(event.species, 0, 721) ||
    !integerIn(event.form, 0, gen6EventFormCount(event.species) - 1)
  )
    throw new TypeError("Species or form is outside Gen VI.");
  if (!integerIn(event.level, 0, 100))
    throw new TypeError("Level must be between 0 and 100.");
  tuple(event.fixedIvs, true);
  if (!integerIn(event.randomPerfectIvCount, 0, 5))
    throw new TypeError("Guaranteed random IVs must be between 0 and 5.");
  if (
    event.randomPerfectIvCount +
      event.fixedIvs.filter((value) => value >= 0).length >
    5
  )
    throw new TypeError(
      "Fixed IVs plus guaranteed random IVs cannot exceed 5.",
    );
  for (const flag of [
    event.abilityLocked,
    event.natureLocked,
    event.genderLocked,
    event.yourId,
    event.isEgg,
    event.otherInfo,
  ]) {
    if (!boolean(flag)) throw new TypeError("Invalid Gen VI Event flag.");
  }
  if (
    !integerIn(event.ability, 0, event.abilityLocked ? 3 : 1) ||
    !integerIn(event.nature, 0, 24) ||
    !integerIn(event.gender, 0, 2) ||
    !Object.hasOwn(PID_TYPE_VALUES, event.pidType)
  )
    throw new TypeError("Invalid locked Event setting.");
  if (!integerIn(event.tid, 0, 65535) || !integerIn(event.sid, 0, 65535))
    throw new TypeError("Event TID and SID must be between 0 and 65535.");
  if (
    !integerIn(event.ec, 0, UINT32_MAX) ||
    !integerIn(event.pid, 0, UINT32_MAX)
  )
    throw new TypeError("Event EC and PID must be 32-bit unsigned integers.");

  const filters = request.filters;
  if (
    !boolean(filters.disabled) ||
    !(filters.shiny in SHINY_MASKS) ||
    !(filters.gender in GENDER_FILTERS) ||
    !(filters.ability in ABILITY_FILTERS) ||
    !integerIn(filters.natureMask, 0, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 0, ALL_HIDDEN_POWERS) ||
    !integerIn(filters.perfectIvValue, 0, 31) ||
    !integerIn(filters.perfectIvCount, 0, 6)
  )
    throw new TypeError("Invalid Gen VI Event filter settings.");
  tuple(filters.ivMin);
  tuple(filters.ivMax);
  filters.ivMin.forEach((minimum, index) => {
    if (minimum > filters.ivMax[index])
      throw new TypeError("Each IV range must have minimum <= maximum.");
  });
  if (!integerIn(request.resultLimit, 1, GEN6_EVENT_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  return request;
}

export function gen6EventTaskCount(request: Gen6EventRequest) {
  validateGen6EventRequest(request);
  return request.maxFrame - request.minFrame + 1;
}

export function encodeGen6EventRequest(request: Gen6EventRequest) {
  validateGen6EventRequest(request);
  const personal = gen6EventPersonalForm(
    request.event.species,
    request.event.form,
  );
  const gender = gen6EventGenderSetting(personal.genderRatio);
  const effectiveIdentity = gen6EventEffectiveIdentity(request);
  const effectiveGenderLocked = request.event.genderLocked || !gender.random;
  const effectiveGender = request.event.genderLocked ? request.event.gender : 0;
  const words = new Uint32Array(GEN6_EVENT_REQUEST_WORDS);
  words.set([
    request.seed,
    request.minFrame,
    gen6EventTaskCount(request),
    request.delay,
    request.considerDelay ? 1 : 0,
    effectiveIdentity.tsv,
    effectiveIdentity.trv,
    request.version === "omega-ruby" || request.version === "alpha-sapphire"
      ? 1
      : 0,
    request.event.yourId ? 1 : 0,
    request.event.isEgg ? 1 : 0,
    request.event.otherInfo ? 1 : 0,
    PID_TYPE_VALUES[request.event.pidType],
    request.event.tid,
    request.event.sid,
    request.event.ec,
    request.event.pid,
    request.event.abilityLocked ? 1 : 0,
    request.event.ability,
    request.event.natureLocked ? 1 : 0,
    request.event.nature,
    effectiveGenderLocked ? 1 : 0,
    effectiveGender,
    gender.setting,
    request.event.species,
    request.event.form,
    request.event.level,
    request.event.randomPerfectIvCount,
  ]);
  let offset = 27;
  for (const iv of request.event.fixedIvs)
    words[offset++] = iv < 0 ? 0xffff_ffff : iv;
  words[offset++] = request.filters.disabled ? 1 : 0;
  words[offset++] = SHINY_MASKS[request.filters.shiny];
  words[offset++] = GENDER_FILTERS[request.filters.gender];
  words[offset++] = ABILITY_FILTERS[request.filters.ability];
  words[offset++] = request.filters.natureMask || ALL_NATURES;
  words[offset++] = request.filters.hiddenPowerMask || ALL_HIDDEN_POWERS;
  for (const value of request.filters.ivMin) words[offset++] = value;
  for (const value of request.filters.ivMax) words[offset++] = value;
  words[offset++] = request.filters.perfectIvValue;
  words[offset++] = request.filters.perfectIvCount;
  words[offset++] = request.resultLimit;
  if (offset !== GEN6_EVENT_REQUEST_WORDS)
    throw new Error("Gen VI Event request packing changed unexpectedly.");
  return words;
}

function byte(word: number, shift: number) {
  return (word >>> shift) & 0xff;
}

export function decodeGen6EventResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_EVENT_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen VI Event result buffer length.");
  return Array.from(
    { length: words.length / GEN6_EVENT_RESULT_WORDS },
    (_, index): Gen6EventResult => {
      const offset = index * GEN6_EVENT_RESULT_WORDS;
      const metadata = words[offset + 4];
      const iv0 = words[offset + 5];
      const iv1 = words[offset + 6];
      return {
        frame: words[offset],
        random: words[offset + 1],
        ec: words[offset + 2],
        pid: words[offset + 3],
        ivs: [
          byte(iv0, 0),
          byte(iv0, 8),
          byte(iv0, 16),
          byte(iv0, 24),
          byte(iv1, 0),
          byte(iv1, 8),
        ],
        nature: metadata & 31,
        ability: (metadata >>> 5) & 3,
        gender: (metadata >>> 7) & 3,
        hiddenPower: (metadata >>> 9) & 15,
        shiny: (metadata >>> 13) & 3,
        delay: words[offset + 7],
        frameUsed: words[offset + 8],
        psv: words[offset + 9],
        prv: words[offset + 10],
      };
    },
  );
}

export function validateGen6EventResult(
  request: Gen6EventRequest,
  result: Gen6EventResult,
) {
  if (!integerIn(result.frame, request.minFrame, request.maxFrame))
    throw new TypeError("Gen VI Event result frame is outside the request.");
  if (
    !integerIn(result.random, 0, UINT32_MAX) ||
    !integerIn(result.ec, 0, UINT32_MAX) ||
    !integerIn(result.pid, 0, UINT32_MAX) ||
    !integerIn(result.frameUsed, 0, UINT32_MAX)
  )
    throw new TypeError("Invalid Gen VI Event result value.");
  tuple(result.ivs);
  if (
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.ability, 0, 3) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.hiddenPower, 0, 15) ||
    !integerIn(result.shiny, 0, 2) ||
    !integerIn(result.delay, 0, 4000)
  )
    throw new TypeError("Invalid Gen VI Event metadata.");
  const xorValue = (result.pid >>> 16) ^ (result.pid & 0xffff);
  if (result.psv !== xorValue >>> 4 || result.prv !== (xorValue & 15))
    throw new TypeError("Gen VI Event PSV or PRV mismatch.");
  return result;
}

export function gen6EventHiddenPower(ivs: Gen6EventIvTuple) {
  const bits = ivs.reduce(
    (sum, value, index) => sum + ((value & 1) << HIDDEN_POWER_ORDER[index]),
    0,
  );
  return Math.floor((bits * 15) / 63);
}

export function gen6EventResultPassesFilters(
  request: Gen6EventRequest,
  result: Gen6EventResult,
) {
  const filters = request.filters;
  if (filters.disabled) return true;
  if ((SHINY_MASKS[filters.shiny] & (1 << result.shiny)) === 0) return false;
  const gender = GENDER_FILTERS[filters.gender];
  if (gender !== 255 && gender !== result.gender) return false;
  const ability = ABILITY_FILTERS[filters.ability];
  if (ability !== 255 && ability !== result.ability) return false;
  if (((filters.natureMask || ALL_NATURES) & (1 << result.nature)) === 0)
    return false;
  if (
    ((filters.hiddenPowerMask || ALL_HIDDEN_POWERS) &
      (1 << result.hiddenPower)) ===
    0
  )
    return false;
  if (
    result.ivs.filter((value) => value >= filters.perfectIvValue).length <
    filters.perfectIvCount
  )
    return false;
  return result.ivs.every(
    (value, index) =>
      value >= filters.ivMin[index] && value <= filters.ivMax[index],
  );
}

export function parseGen6WonderCard(fileName: string, bytes: Uint8Array) {
  const lowerName = fileName.toLowerCase();
  const full = lowerName.endsWith(".wc6full");
  if (!full && !lowerName.endsWith(".wc6"))
    throw new TypeError("Only .wc6 and .wc6full files are supported.");
  const start = full ? 0x208 : 0;
  if (bytes.byteLength < start + 0x108)
    throw new RangeError("The Wonder Card file is truncated.");
  const data = bytes.subarray(start, start + 0x108);
  if (data[0x51] !== 0)
    throw new TypeError("The Wonder Card does not contain a Pokemon.");
  const read16 = (offset: number) =>
    new DataView(data.buffer, data.byteOffset, data.byteLength).getUint16(
      offset,
      true,
    );
  const read32 = (offset: number) =>
    new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(
      offset,
      true,
    );
  const species = read16(0x82);
  const form = data[0x84];
  const abilityCode = data[0xa2];
  const natureCode = data[0xa0];
  const genderCode = data[0xa1];
  const pidCode = data[0xa3];
  const level = data[0xd0];
  if (
    species > 721 ||
    abilityCode > 4 ||
    (natureCode !== 0xff && natureCode > 24) ||
    genderCode > 3 ||
    pidCode > 3 ||
    level > 100 ||
    form >= gen6EventFormCount(species)
  )
    throw new TypeError("The Wonder Card contains unsupported Event settings.");
  const reorder = [0, 1, 2, 4, 5, 3] as const;
  const rawIvs = reorder.map((offset) => data[0xaf + offset]);
  const ivFlag = rawIvs.find((value) => value >= 0xfc && value <= 0xfe) ?? 0;
  const fixedIvs = rawIvs.map((value) =>
    ivFlag === 0 && value <= 31 ? value : -1,
  ) as unknown as Gen6EventIvTuple;
  return {
    species,
    form,
    level,
    fixedIvs,
    randomPerfectIvCount: ivFlag === 0 ? 0 : ivFlag - 0xfb,
    abilityLocked: abilityCode < 3,
    ability: abilityCode < 3 ? abilityCode + 1 : abilityCode - 3,
    natureLocked: natureCode !== 0xff,
    nature: natureCode === 0xff ? 0 : natureCode,
    genderLocked: genderCode !== 3,
    gender: genderCode === 3 ? 0 : (genderCode + 1) % 3,
    yourId: data[0xb5] === 3,
    isEgg: data[0xd1] === 1,
    otherInfo: true,
    pidType: PID_TYPE_ORDER[pidCode],
    tid: read16(0x68),
    sid: read16(0x6a),
    ec: read32(0x70),
    pid: pidCode === 3 ? read32(0xd4) : 0,
  } satisfies Gen6EventSettings;
}
