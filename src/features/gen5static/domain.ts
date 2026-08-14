import type {
  Gen5DsType,
  Gen5GameVersion,
  Gen5Language,
  Gen5Profile,
} from "../gen5profiles/domain";
import {
  gen5StaticCategoriesForVersion,
  gen5StaticTemplatesForVersion,
  type Gen5StaticCategory,
  type Gen5StaticTemplate,
} from "./encounters";

export const GEN5_STATIC_API_VERSION = 1;
export const GEN5_STATIC_MAX_RESULTS = 100_000;
export const GEN5_STATIC_MAX_EVALUATIONS = 250_000_000n;

export type Gen5StaticMode = "generator" | "searcher";
export type Gen5StaticIvTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Gen5StaticLead =
  | { type: "none" }
  | { type: "synchronize"; nature: number }
  | { type: "cuteCharmFemale" }
  | { type: "cuteCharmMale" };
export type Gen5StaticLuckyPower = "none" | "level3";

export interface Gen5StaticCacheDescriptor {
  key: string;
  mode: "iv" | "iv-sha";
  ivEntryCount: number;
  shaEntryCount: number;
}

export interface Gen5StaticPreparedCache {
  descriptor: Gen5StaticCacheDescriptor;
  ivEntries: Uint32Array;
  shaEntries?: Uint32Array;
}

export interface Gen5StaticProfile {
  version: Gen5GameVersion;
  language: Gen5Language;
  dsType: Gen5DsType;
  tid: number;
  sid: number;
  mac: string;
  vcount: number;
  timer0Min: number;
  timer0Max: number;
  gxstat: number;
  vframe: number;
  keypresses: Gen5Profile["keypresses"];
  skipLR: boolean;
  memoryLink: boolean;
  shinyCharm: boolean;
}

export interface Gen5StaticFilters {
  disabled: boolean;
  ivMin: Gen5StaticIvTuple;
  ivMax: Gen5StaticIvTuple;
  natureMask: number;
  hiddenPowerMask: number;
  ability: 0 | 1 | 255;
  gender: 0 | 1 | 255;
  shiny: 1 | 2 | 3 | 255;
}

interface Gen5StaticRequestBase {
  mode: Gen5StaticMode;
  profile: Gen5StaticProfile;
  template: Gen5StaticTemplate;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  initialIvAdvances: number;
  maxIvAdvances: number;
  lead: Gen5StaticLead;
  luckyPower: Gen5StaticLuckyPower;
  filters: Gen5StaticFilters;
  resultLimit: number;
  cache: Gen5StaticCacheDescriptor | null;
}

export interface Gen5StaticGeneratorRequest extends Gen5StaticRequestBase {
  mode: "generator";
  seed: string;
}

export interface Gen5StaticSearcherRequest extends Gen5StaticRequestBase {
  mode: "searcher";
  startDate: string;
  endDate: string;
}

export type Gen5StaticRequest =
  Gen5StaticGeneratorRequest | Gen5StaticSearcherRequest;

export interface Gen5StaticChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen5StaticResult {
  seed: string;
  advances: number;
  ivAdvances: number;
  chatot: number;
  needle: number;
  pid: string;
  shiny: 0 | 1 | 2;
  nature: number;
  ability: 0 | 1 | 2;
  abilityIndex: number;
  ivs: Gen5StaticIvTuple;
  hiddenPower: number;
  hiddenPowerStrength: number;
  gender: 0 | 1 | 2;
  characteristic: number;
  dateTime?: string;
  timer0?: number;
  buttonMask?: number;
}

const HEX_12 = /^[0-9a-fA-F]{0,12}$/;
const HEX_16 = /^[0-9A-F]{16}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const DAY_MS = 86_400_000;
const MT_SEED_SPACE = 0x1_0000_0000n;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function parseDate(value: string) {
  const match = ISO_DATE.exec(value);
  if (!match) throw new TypeError("Date must use YYYY-MM-DD.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 2000 ||
    year > 2099 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TypeError(
      "Date must be valid and between 2000-01-01 and 2099-12-31.",
    );
  }
  return date;
}

function popcount(value: number) {
  let bits = value;
  let count = 0;
  while (bits !== 0) {
    count += bits & 1;
    bits >>>= 1;
  }
  return count;
}

function validButtonMask(mask: number, skipLR: boolean) {
  if (skipLR && (mask & 0x3) !== 0) return false;
  if ((mask & 0xc00) === 0xc00) return false;
  if ((mask & 0x300) === 0x300) return false;
  if ((mask & 0xc3) === 0xc3) return false;
  return true;
}

export function isGen5StaticButtonMaskAllowed(
  profile: Gen5StaticProfile,
  mask: number,
) {
  return (
    integerIn(mask, 0, 0xfff) &&
    profile.keypresses[popcount(mask)] === true &&
    validButtonMask(mask, profile.skipLR)
  );
}

export function countGen5StaticKeypresses(profile: Gen5StaticProfile) {
  let count = 0;
  for (let mask = 0; mask < 0x1000; mask += 1) {
    if (isGen5StaticButtonMaskAllowed(profile, mask)) count += 1;
  }
  return count;
}

export function gen5StaticProfile(profile: Gen5Profile): Gen5StaticProfile {
  return {
    version: profile.version,
    language: profile.language,
    dsType: profile.dsType,
    tid: profile.tid,
    sid: profile.sid,
    mac: profile.mac,
    vcount: profile.vcount,
    timer0Min: profile.timer0Min,
    timer0Max: profile.timer0Max,
    gxstat: profile.gxstat,
    vframe: profile.vframe,
    keypresses: [...profile.keypresses] as Gen5Profile["keypresses"],
    skipLR: profile.skipLR,
    memoryLink: profile.memoryLink,
    shinyCharm: profile.shinyCharm,
  };
}

function validateProfile(profile: Gen5StaticProfile) {
  if (
    !("black white black2 white2".split(" ") as Gen5GameVersion[]).includes(
      profile.version,
    )
  )
    throw new TypeError("Invalid Gen 5 version.");
  if (
    !(
      "english spanish french italian german japanese korean".split(
        " ",
      ) as Gen5Language[]
    ).includes(profile.language)
  )
    throw new TypeError("Invalid Gen 5 language.");
  if (!("ds dsi 3ds".split(" ") as Gen5DsType[]).includes(profile.dsType))
    throw new TypeError("Invalid DS type.");
  if (!integerIn(profile.tid, 0, 0xffff) || !integerIn(profile.sid, 0, 0xffff))
    throw new TypeError("TID and SID must be between 0 and 65535.");
  if (!HEX_12.test(profile.mac))
    throw new TypeError("MAC must contain at most 12 hexadecimal digits.");
  if (!integerIn(profile.vcount, 0, 0xff))
    throw new TypeError("VCount must be between 00 and FF.");
  if (
    !integerIn(profile.timer0Min, 0, 0xffff) ||
    !integerIn(profile.timer0Max, 0, 0xffff) ||
    profile.timer0Min > profile.timer0Max
  )
    throw new TypeError("Timer0 Min must not exceed Timer0 Max.");
  if (!integerIn(profile.gxstat, 0, 99) || !integerIn(profile.vframe, 0, 99))
    throw new TypeError("GxStat and VFrame must be between 00 and 63.");
  if (
    profile.keypresses.length !== 9 ||
    !profile.keypresses.every((value) => typeof value === "boolean") ||
    !countGen5StaticKeypresses(profile)
  )
    throw new TypeError(
      "Profile must allow at least one valid Keypresses combination.",
    );
}

function validateTemplate(
  template: Gen5StaticTemplate,
  version: Gen5GameVersion,
) {
  const available = gen5StaticTemplatesForVersion(template.category, version);
  if (!available.some((entry) => entry.id === template.id))
    throw new TypeError(
      "The selected encounter is unavailable for this profile.",
    );
  if (
    !integerIn(template.level, 1, 100) ||
    !integerIn(template.species, 1, 649)
  )
    throw new TypeError("Invalid Gen 5 static encounter.");
}

function validateFilters(filters: Gen5StaticFilters) {
  if (
    typeof filters.disabled !== "boolean" ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  )
    throw new TypeError("Static filters require six IV values.");
  filters.ivMin.forEach((minimum, index) => {
    const maximum = filters.ivMax[index];
    if (
      !integerIn(minimum, 0, 31) ||
      !integerIn(maximum, 0, 31) ||
      minimum > maximum
    )
      throw new TypeError("Each IV range must be between 0 and 31.");
  });
  if (
    !integerIn(filters.natureMask, 1, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 1, ALL_HIDDEN_POWERS)
  )
    throw new TypeError("Select at least one Nature and Hidden Power type.");
  if (
    ![0, 1, 255].includes(filters.ability) ||
    ![0, 1, 255].includes(filters.gender) ||
    ![1, 2, 3, 255].includes(filters.shiny)
  )
    throw new TypeError("Invalid Static filter selection.");
}

function leadValue(lead: Gen5StaticLead) {
  if (lead.type === "none") return 255;
  if (lead.type === "cuteCharmFemale") return 25;
  if (lead.type === "cuteCharmMale") return 26;
  if (!integerIn(lead.nature, 0, 24))
    throw new TypeError("Synchronize Nature must be between 0 and 24.");
  return lead.nature;
}

export function gen5StaticLeadValue(lead: Gen5StaticLead) {
  return leadValue(lead);
}

export function gen5StaticSearcherSeedCount(
  request: Gen5StaticSearcherRequest,
) {
  const start = parseDate(request.startDate);
  const end = parseDate(request.endDate);
  if (start > end) return 0n;
  const days = BigInt(
    Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1,
  );
  const timer0Count = BigInt(
    request.profile.timer0Max - request.profile.timer0Min + 1,
  );
  return (
    days *
    timer0Count *
    BigInt(countGen5StaticKeypresses(request.profile)) *
    86_400n
  );
}

export function gen5StaticTaskCount(request: Gen5StaticRequest) {
  return request.mode === "generator"
    ? BigInt(request.maxAdvances) + 1n
    : request.cache?.mode === "iv-sha"
      ? BigInt(request.cache.shaEntryCount)
      : gen5StaticSearcherSeedCount(request);
}

export function gen5StaticEvaluationCount(request: Gen5StaticRequest) {
  if (request.mode === "generator") return BigInt(request.maxAdvances) + 1n;
  const ivCount = BigInt(request.maxIvAdvances) + 1n;
  const pidCount = BigInt(request.maxAdvances) + 1n;
  if (request.cache?.mode === "iv-sha")
    return BigInt(request.cache.shaEntryCount) * pidCount;
  const rawSeeds = gen5StaticSearcherSeedCount(request);
  if (request.cache?.mode === "iv") {
    const expectedMatches =
      (rawSeeds * BigInt(request.cache.ivEntryCount) + MT_SEED_SPACE - 1n) /
      MT_SEED_SPACE;
    return rawSeeds + expectedMatches * pidCount;
  }
  return rawSeeds * ivCount * (pidCount + 1n);
}

export function validateGen5StaticRequest(request: Gen5StaticRequest) {
  if (request.mode !== "generator" && request.mode !== "searcher")
    throw new TypeError("Invalid Gen 5 Static operation.");
  validateProfile(request.profile);
  validateTemplate(request.template, request.profile.version);
  validateFilters(request.filters);
  leadValue(request.lead);
  if (request.luckyPower !== "none" && request.luckyPower !== "level3")
    throw new TypeError("Invalid Lucky Power.");
  for (const [name, value] of [
    ["Initial Advances", request.initialAdvances],
    ["Max Advances", request.maxAdvances],
    ["Offset", request.offset],
    ["Initial IV Advances", request.initialIvAdvances],
    ["Max IV Advances", request.maxIvAdvances],
  ] as const) {
    if (!integerIn(value, 0, 0xffff_ffff))
      throw new TypeError(`${name} must be between 0 and 4294967295.`);
  }
  if (
    request.initialAdvances + request.offset + request.maxAdvances >
    0xffff_ffff
  )
    throw new TypeError(
      "Initial Advances plus Offset plus Max Advances exceeds 4294967295.",
    );
  if (request.initialIvAdvances + request.maxIvAdvances > 0xffff_ffff)
    throw new TypeError(
      "Initial IV Advances plus Max IV Advances exceeds 4294967295.",
    );
  if (!integerIn(request.resultLimit, 1, GEN5_STATIC_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  if (
    request.cache !== null &&
    (typeof request.cache.key !== "string" ||
      request.cache.key.length === 0 ||
      request.cache.key.length > 512 ||
      (request.cache.mode !== "iv" && request.cache.mode !== "iv-sha") ||
      !integerIn(request.cache.ivEntryCount, 1, 1_000_000) ||
      !integerIn(request.cache.shaEntryCount, 0, 1_000_000) ||
      (request.cache.mode === "iv-sha" && request.cache.shaEntryCount < 1))
  ) {
    throw new TypeError("Invalid Gen 5 Static cache descriptor.");
  }
  if (request.mode === "generator") {
    const normalized = request.seed.toUpperCase().padStart(16, "0");
    if (!HEX_16.test(normalized))
      throw new TypeError("Seed must contain at most 16 hexadecimal digits.");
    if (request.maxIvAdvances !== 0)
      throw new TypeError("Generator uses one IV Advances value.");
    if (request.cache !== null)
      throw new TypeError("Generator does not use search caches.");
  } else {
    const start = parseDate(request.startDate);
    const end = parseDate(request.endDate);
    if (start > end) throw new TypeError("Start date is after end date");
    if (request.filters.disabled)
      throw new TypeError("Searcher filters cannot be disabled.");
    if (request.offset !== 0) throw new TypeError("Searcher Offset must be 0.");
  }
  if (gen5StaticEvaluationCount(request) > GEN5_STATIC_MAX_EVALUATIONS)
    throw new TypeError("Gen 5 Static range exceeds the browser task limit.");
  return request;
}

export function splitGen5StaticRequest(
  request: Gen5StaticRequest,
  workers: number,
) {
  validateGen5StaticRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  const total = gen5StaticTaskCount(request);
  if (total === 0n) return [];
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new TypeError("Gen 5 Static task cannot be indexed safely.");
  const count = Number(total);
  const evaluationsPerUnit =
    request.mode === "generator"
      ? 1
      : Number(gen5StaticEvaluationCount(request) / total);
  const responsiveUnits = Math.max(
    1,
    Math.floor(500_000 / Math.max(1, evaluationsPerUnit)),
  );
  const chunkCount = Math.min(
    count,
    Math.max(workers * 4, Math.ceil(count / responsiveUnits)),
  );
  const base = Math.floor(count / chunkCount);
  const remainder = count % chunkCount;
  const chunks: Gen5StaticChunk[] = [];
  let start = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const size = base + (index < remainder ? 1 : 0);
    chunks.push({ index, start, count: size });
    start += size;
  }
  return chunks;
}

function hiddenPower(ivs: Gen5StaticIvTuple) {
  const order = [0, 1, 2, 5, 3, 4] as const;
  let typeBits = 0;
  let powerBits = 0;
  order.forEach((ivIndex, bit) => {
    typeBits |= (ivs[ivIndex] & 1) << bit;
    powerBits |= ((ivs[ivIndex] >>> 1) & 1) << bit;
  });
  return {
    type: Math.floor((typeBits * 15) / 63),
    power: 30 + Math.floor((powerBits * 40) / 63),
  };
}

export function gen5StaticCharacteristic(pid: number, ivs: Gen5StaticIvTuple) {
  const order = [0, 1, 2, 5, 3, 4] as const;
  const start = pid % 6;
  let selected = start;
  let maximum = 0;
  for (let offset = 0; offset < 6; offset += 1) {
    const index = (start + offset) % 6;
    if (ivs[order[index]] > maximum) {
      selected = index;
      maximum = ivs[order[index]];
    }
  }
  return selected * 5 + (maximum % 5);
}

export function validateGen5StaticResult(
  request: Gen5StaticRequest,
  result: Gen5StaticResult,
) {
  if (!HEX_16.test(result.seed) || !/^[0-9A-F]{8}$/.test(result.pid))
    throw new TypeError("Gen 5 Static result contains an invalid Seed or PID.");
  const pid = Number.parseInt(result.pid, 16) >>> 0;
  if (
    !integerIn(result.advances, 0, 0xffff_ffff) ||
    !integerIn(
      result.ivAdvances,
      request.initialIvAdvances,
      request.initialIvAdvances + request.maxIvAdvances,
    ) ||
    !integerIn(result.chatot, 0, 99) ||
    !integerIn(result.needle, 0, 7) ||
    !integerIn(result.shiny, 0, 2) ||
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.ability, 0, 2) ||
    !integerIn(result.abilityIndex, 1, 0xffff) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.hiddenPower, 0, 15) ||
    !integerIn(result.hiddenPowerStrength, 30, 70) ||
    !integerIn(result.characteristic, 0, 29) ||
    result.ivs.length !== 6 ||
    !result.ivs.every((value) => integerIn(value, 0, 31))
  )
    throw new TypeError("Gen 5 Static result contains invalid state values.");
  const expected = hiddenPower(result.ivs);
  if (
    result.hiddenPower !== expected.type ||
    result.hiddenPowerStrength !== expected.power ||
    result.characteristic !== gen5StaticCharacteristic(pid, result.ivs)
  )
    throw new TypeError(
      "Gen 5 Static result contains inconsistent derived values.",
    );
  if (!request.filters.disabled) {
    const shinyMatches =
      request.filters.shiny === 255 ||
      (request.filters.shiny & result.shiny) !== 0;
    if (
      result.ivs.some(
        (value, index) =>
          value < request.filters.ivMin[index] ||
          value > request.filters.ivMax[index],
      ) ||
      (request.filters.natureMask & (1 << result.nature)) === 0 ||
      (request.filters.hiddenPowerMask & (1 << result.hiddenPower)) === 0 ||
      (request.filters.ability !== 255 &&
        request.filters.ability !== result.ability) ||
      (request.filters.gender !== 255 &&
        request.filters.gender !== result.gender) ||
      !shinyMatches
    ) {
      throw new TypeError("Gen 5 Static result does not match the filters.");
    }
  }
  if (request.mode === "generator") {
    if (
      result.seed !== request.seed.toUpperCase().padStart(16, "0") ||
      result.dateTime !== undefined
    )
      throw new TypeError(
        "Gen 5 Static result does not match the generator request.",
      );
  } else {
    const match = result.dateTime && ISO_DATE_TIME.exec(result.dateTime);
    if (
      !match ||
      result.timer0 === undefined ||
      result.buttonMask === undefined
    )
      throw new TypeError(
        "Gen 5 Static search result is missing profile metadata.",
      );
    const date = parseDate(match[1]);
    if (
      date < parseDate(request.startDate) ||
      date > parseDate(request.endDate) ||
      Number(match[2]) > 23 ||
      Number(match[3]) > 59 ||
      Number(match[4]) > 59 ||
      !integerIn(
        result.timer0,
        request.profile.timer0Min,
        request.profile.timer0Max,
      ) ||
      !isGen5StaticButtonMaskAllowed(request.profile, result.buttonMask)
    )
      throw new TypeError(
        "Gen 5 Static search result contains invalid profile metadata.",
      );
  }
  return result;
}

export function formatGen5StaticButtons(mask: number) {
  if (mask === 0) return "None";
  const labels = [
    "R",
    "L",
    "X",
    "Y",
    "A",
    "B",
    "Select",
    "Start",
    "Right",
    "Left",
    "Up",
    "Down",
  ];
  return labels.filter((_, index) => (mask & (1 << index)) !== 0).join(" + ");
}

export function normalizeGen5StaticSeed(value: string) {
  return value
    .replace(/^0x/i, "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .replace(/^0+(?=.)/, "");
}

export { gen5StaticCategoriesForVersion };
export type { Gen5StaticCategory, Gen5StaticTemplate };
