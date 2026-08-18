import type { ThreeDsProfile } from "../3dsprofiles/domain";
import {
  type Gen6StationaryIvTuple,
  type Gen6StationaryTemplate,
  type Gen6StationaryVersion,
} from "./data";

export type { Gen6StationaryIvTuple } from "./data";

export const GEN6_STATIONARY_API_VERSION = 2;
export const GEN6_STATIONARY_REQUEST_WORDS = 49;
export const GEN6_STATIONARY_RESULT_WORDS = 16;
export const GEN6_STATIONARY_MAX_RESULTS = 100_000;
export const GEN6_STATIONARY_BROWSER_MAX_FRAME = 5_000_000;
export const GEN6_STATIONARY_MAX_FRAME = 1_000_000_000;
export const GEN6_STATIONARY_GENDER_LIST_LENGTH = 20;

export const GEN6_STATIONARY_GENDER_RATIOS = [
  { value: 0xff, setting: 0, random: false, label: "Genderless" },
  { value: 0x00, setting: 1, random: false, label: "Male" },
  { value: 0xfe, setting: 2, random: false, label: "Female" },
  { value: 0x1f, setting: 30, random: true, label: "87.5% Male" },
  { value: 0x3f, setting: 62, random: true, label: "75% Male" },
  { value: 0x7f, setting: 126, random: true, label: "50% Male" },
  { value: 0xbf, setting: 190, random: true, label: "25% Male" },
  { value: 0xe1, setting: 224, random: true, label: "12.5% Male" },
] as const;

export type Gen6StationaryShinyFilter = "any" | "shiny" | "square";
export type Gen6StationaryGenderFilter =
  "any" | "male" | "female" | "genderless";
export type Gen6StationaryAbilityFilter = "any" | "first" | "second" | "hidden";

export interface Gen6StationaryFilters {
  disabled: boolean;
  shiny: Gen6StationaryShinyFilter;
  gender: Gen6StationaryGenderFilter;
  ability: Gen6StationaryAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen6StationaryIvTuple;
  ivMax: Gen6StationaryIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
}

export interface Gen6StationaryRequest {
  version: Gen6StationaryVersion;
  seed: number;
  minFrame: number;
  maxFrame: number;
  delay: number;
  considerDelay: boolean;
  tsv: number;
  trv: number;
  shinyCharm: boolean;
  syncNature: number | null;
  assumeSync: boolean;
  template: Gen6StationaryTemplate;
  bankTarget: number;
  bankGenderList: string;
  filters: Gen6StationaryFilters;
  resultLimit: number;
}

export interface Gen6StationaryResult {
  frame: number;
  random: number;
  ec: number;
  pid: number;
  ivs: Gen6StationaryIvTuple;
  nature: number;
  ability: number;
  gender: number;
  hiddenPower: number;
  shiny: number;
  synchronize: boolean;
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
const SUPPORTED_GENDER_SETTINGS: ReadonlySet<number> = new Set(
  GEN6_STATIONARY_GENDER_RATIOS.map((entry) => entry.setting),
);
const HIDDEN_POWER_ORDER = [0, 1, 2, 4, 5, 3] as const;

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function tuple(values: readonly number[]) {
  if (values.length !== 6 || !values.every((value) => integerIn(value, 0, 31)))
    throw new TypeError("IV ranges must contain six values between 0 and 31.");
  return values as Gen6StationaryIvTuple;
}

function fixedTuple(values: readonly number[]) {
  if (values.length !== 6 || !values.every((value) => integerIn(value, -1, 31)))
    throw new TypeError("Fixed IVs must contain six values between -1 and 31.");
  return values as Gen6StationaryIvTuple;
}

export function gen6StationaryProfile(profile: ThreeDsProfile | undefined) {
  const version = profile?.version;
  if (
    !version ||
    !["x", "y", "omega-ruby", "alpha-sapphire", "transporter"].includes(version)
  )
    return {
      version: "omega-ruby" as Gen6StationaryVersion,
      tsv: 0,
      trv: 0,
      shinyCharm: false,
    };
  return {
    version: version as Gen6StationaryVersion,
    tsv: profile.tsv,
    trv: profile.trv,
    shinyCharm: profile.shinyCharm,
  };
}

export function gen6StationaryDefaultFilters(): Gen6StationaryFilters {
  return {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: ALL_NATURES,
    hiddenPowerMask: ALL_HIDDEN_POWERS,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  };
}

export function gen6StationaryTaskCount(request: Gen6StationaryRequest) {
  return request.maxFrame - request.minFrame + 1;
}

export function encodeGen6StationaryGenderList(
  value: string,
  fallback: "0" | "1" = "0",
) {
  const normalized = value.padEnd(GEN6_STATIONARY_GENDER_LIST_LENGTH, fallback);
  let encoded = 0;
  let multiplier = 1;
  for (const digit of normalized) {
    encoded += Number(digit) * multiplier;
    multiplier *= 3;
  }
  return encoded >>> 0;
}

export function validateGen6StationaryRequest(request: Gen6StationaryRequest) {
  if (!integerIn(request.seed, 0, UINT32_MAX))
    throw new TypeError("Seed must be a 32-bit unsigned integer.");
  if (
    !integerIn(request.minFrame, 0, GEN6_STATIONARY_MAX_FRAME) ||
    !integerIn(request.maxFrame, request.minFrame, GEN6_STATIONARY_MAX_FRAME)
  )
    throw new TypeError("Frame range is invalid.");
  if (request.maxFrame > GEN6_STATIONARY_BROWSER_MAX_FRAME)
    throw new TypeError(
      "Gen VI Stationary browser frames are limited to 5000000.",
    );
  if (
    !integerIn(request.delay, 0, 4000) ||
    typeof request.considerDelay !== "boolean"
  )
    throw new TypeError("Delay must be between 0 and 4000.");
  if (!integerIn(request.tsv, 0, 4095) || !integerIn(request.trv, 0, 15))
    throw new TypeError("TSV/TRV is invalid.");
  if (
    typeof request.shinyCharm !== "boolean" ||
    typeof request.assumeSync !== "boolean" ||
    (request.syncNature !== null && !integerIn(request.syncNature, 0, 24))
  )
    throw new TypeError("Invalid Shiny Charm or Synchronize value.");
  if (!integerIn(request.bankTarget, 1, request.template.numOfPokemon))
    throw new TypeError("Bank target is outside the available Pokemon range.");
  if (
    typeof request.bankGenderList !== "string" ||
    !/^[012]{0,20}$/.test(request.bankGenderList)
  )
    throw new TypeError(
      "Bank gender list must contain at most 20 base-3 digits.",
    );
  const template = request.template;
  if (
    !template.versions.includes(request.version) ||
    !integerIn(template.species, 0, 721) ||
    !integerIn(template.level, 0, 100) ||
    !integerIn(template.genderRatio, 0, 255) ||
    !SUPPORTED_GENDER_SETTINGS.has(template.genderSetting) ||
    typeof template.randomGender !== "boolean" ||
    !integerIn(template.ability, 0, 3) ||
    !integerIn(template.nature, 0, 255) ||
    !integerIn(template.perfectIvCount, 0, 6) ||
    !integerIn(template.numOfPokemon, 1, GEN6_STATIONARY_GENDER_LIST_LENGTH) ||
    (template.otTsv !== null && !integerIn(template.otTsv, 0, 4095))
  )
    throw new TypeError("Invalid Gen VI Stationary Pokemon template.");
  fixedTuple(template.ivs);
  if (
    template.perfectIvCount > template.ivs.filter((value) => value < 0).length
  )
    throw new TypeError("Perfect IV count exceeds the random IV slots.");
  if (!integerIn(request.resultLimit, 1, GEN6_STATIONARY_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  const filters = request.filters;
  if (
    typeof filters.disabled !== "boolean" ||
    !(filters.shiny in SHINY_MASKS) ||
    !(filters.gender in GENDER_FILTERS) ||
    !(filters.ability in ABILITY_FILTERS) ||
    !integerIn(filters.natureMask, 0, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 0, ALL_HIDDEN_POWERS) ||
    !integerIn(filters.perfectIvValue, 0, 31) ||
    !integerIn(filters.perfectIvCount, 0, 6)
  )
    throw new TypeError("Invalid Gen VI Stationary filter settings.");
  tuple(filters.ivMin);
  tuple(filters.ivMax);
  filters.ivMin.forEach((minimum, index) => {
    if (minimum > filters.ivMax[index])
      throw new TypeError("Each IV range must have minimum <= maximum.");
  });
  return request;
}

export function encodeGen6StationaryRequest(request: Gen6StationaryRequest) {
  validateGen6StationaryRequest(request);
  const fixed = request.template.ivs.map((value) =>
    value < 0 ? 0xffff_ffff : value,
  );
  return Uint32Array.from([
    request.seed,
    request.minFrame,
    gen6StationaryTaskCount(request),
    request.delay,
    request.considerDelay ? 1 : 0,
    request.tsv,
    request.trv,
    request.shinyCharm ? 1 : 0,
    request.syncNature ?? 255,
    request.template.perfectIvCount,
    request.template.alwaysSync ? 1 : 0,
    request.template.shinyLocked ? 1 : 0,
    request.assumeSync ? 1 : 0,
    request.template.bank ? 1 : 0,
    request.bankTarget,
    request.template.species,
    request.template.genderRatio,
    request.template.ability,
    request.template.nature,
    request.template.numOfPokemon,
    request.template.otTsv ?? 0xffff_ffff,
    ...fixed,
    request.filters.disabled ? 1 : 0,
    SHINY_MASKS[request.filters.shiny],
    GENDER_FILTERS[request.filters.gender],
    ABILITY_FILTERS[request.filters.ability],
    request.filters.natureMask || ALL_NATURES,
    request.filters.hiddenPowerMask || ALL_HIDDEN_POWERS,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    request.filters.perfectIvValue,
    request.filters.perfectIvCount,
    request.resultLimit,
    encodeGen6StationaryGenderList(
      request.bankGenderList,
      request.template.randomGender ? "1" : "0",
    ),
  ]);
}

export function formatGen6StationaryHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function byte(word: number, shift: number) {
  return (word >>> shift) & 0xff;
}

export function decodeGen6StationaryResults(
  buffer: ArrayBuffer,
  maximum = Number.POSITIVE_INFINITY,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_STATIONARY_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen VI Stationary result buffer length.");
  const count = Math.min(
    words.length / GEN6_STATIONARY_RESULT_WORDS,
    Math.max(0, Math.floor(maximum)),
  );
  return Array.from({ length: count }, (_, index): Gen6StationaryResult => {
    const offset = index * GEN6_STATIONARY_RESULT_WORDS;
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
      nature: (metadata >>> 0) & 31,
      ability: (metadata >>> 5) & 3,
      gender: (metadata >>> 7) & 3,
      hiddenPower: (metadata >>> 9) & 15,
      shiny: (metadata >>> 13) & 3,
      synchronize: ((metadata >>> 15) & 1) !== 0,
      delay: words[offset + 7],
      frameUsed: words[offset + 8],
      psv: words[offset + 9],
      prv: words[offset + 10],
    };
  });
}

export function gen6StationaryHiddenPower(ivs: Gen6StationaryIvTuple) {
  const bits = ivs.reduce(
    (sum, value, index) => sum + ((value & 1) << HIDDEN_POWER_ORDER[index]),
    0,
  );
  return Math.floor((bits * 15) / 63);
}

export function gen6StationaryResultPassesFilters(
  request: Gen6StationaryRequest,
  result: Gen6StationaryResult,
) {
  const filters = request.filters;
  if (filters.disabled) return true;
  if ((SHINY_MASKS[filters.shiny] & (1 << result.shiny)) === 0) return false;
  const gender = GENDER_FILTERS[filters.gender];
  if (gender !== 255 && gender !== result.gender) return false;
  const ability = ABILITY_FILTERS[filters.ability];
  if (ability !== 255 && ability !== result.ability) return false;
  const natureMask = filters.natureMask || ALL_NATURES;
  if ((natureMask & (1 << result.nature)) === 0) return false;
  const powerMask = filters.hiddenPowerMask || ALL_HIDDEN_POWERS;
  if ((powerMask & (1 << result.hiddenPower)) === 0) return false;
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
