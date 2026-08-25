import type {
  Gen5DsType,
  Gen5GameVersion,
  Gen5Language,
  Gen5Profile,
} from "../gen5profiles/domain";
import {
  gen5WildEncounterValue,
  getGen5WildAreas,
  type Gen5WildArea,
  type Gen5WildEncounter,
  type Gen5WildSeason,
} from "./encounters";
import { validatePerfectIvFilter } from "../shared/perfectIvFilter";

export const GEN5_WILD_API_VERSION = 2;
export const GEN5_WILD_MAX_RESULTS = 100_000;
export const GEN5_WILD_MAX_EVALUATIONS = 250_000_000n;

export type Gen5WildMode = "generator" | "searcher";
export type Gen5WildIvTuple = [number, number, number, number, number, number];
export type Gen5WildLead =
  | { type: "none" }
  | { type: "synchronize"; nature: number }
  | { type: "cuteCharmFemale" }
  | { type: "cuteCharmMale" }
  | { type: "magnetPull" }
  | { type: "static" }
  | { type: "pressure" }
  | { type: "hustle" }
  | { type: "vitalSpirit" }
  | { type: "suctionCups" }
  | { type: "stickyHold" }
  | { type: "compoundEyes" };
export type Gen5WildLuckyPower = "none" | "level1" | "level2" | "level3";

export interface Gen5WildCacheDescriptor {
  key: string;
  mode: "iv" | "iv-sha";
  ivEntryCount: number;
  shaEntryCount: number;
}

export interface Gen5WildPreparedCache {
  descriptor: Gen5WildCacheDescriptor;
  ivEntries: Uint32Array;
  shaEntries?: Uint32Array;
}

export interface Gen5WildProfile {
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
  nsPokemonReleased: boolean;
}

export interface Gen5WildFilters {
  disabled: boolean;
  ivMin: Gen5WildIvTuple;
  ivMax: Gen5WildIvTuple;
  natureMask: number;
  hiddenPowerMask: number;
  ability: 0 | 1 | 255;
  gender: 0 | 1 | 255;
  shiny: 1 | 2 | 3 | 255;
  slotMask: number;
  levelMin: number;
  levelMax: number;
  perfectIvValue: number;
  perfectIvCount: number;
}

interface Gen5WildRequestBase {
  mode: Gen5WildMode;
  profile: Gen5WildProfile;
  area: Gen5WildArea;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  initialIvAdvances: number;
  maxIvAdvances: number;
  lead: Gen5WildLead;
  luckyPower: Gen5WildLuckyPower;
  filters: Gen5WildFilters;
  resultLimit: number;
  cache: Gen5WildCacheDescriptor | null;
}

export interface Gen5WildGeneratorRequest extends Gen5WildRequestBase {
  mode: "generator";
  seed: string;
}

export interface Gen5WildSearcherRequest extends Gen5WildRequestBase {
  mode: "searcher";
  startDate: string;
  endDate: string;
}

export type Gen5WildRequest =
  Gen5WildGeneratorRequest | Gen5WildSearcherRequest;

export interface Gen5WildChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen5WildResult {
  seed: string;
  advances: number;
  ivAdvances: number;
  chatot: number;
  needle: number;
  item: number;
  slot: number;
  level: number;
  species: number;
  form: number;
  pid: string;
  shiny: 0 | 1 | 2;
  nature: number;
  ability: 0 | 1 | 2;
  abilityIndex: number;
  ivs: Gen5WildIvTuple;
  stats: Gen5WildIvTuple;
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

export function isGen5WildButtonMaskAllowed(
  profile: Gen5WildProfile,
  mask: number,
) {
  return (
    integerIn(mask, 0, 0xfff) &&
    profile.keypresses[popcount(mask)] === true &&
    validButtonMask(mask, profile.skipLR)
  );
}

export function countGen5WildKeypresses(profile: Gen5WildProfile) {
  let count = 0;
  for (let mask = 0; mask < 0x1000; mask += 1) {
    if (isGen5WildButtonMaskAllowed(profile, mask)) count += 1;
  }
  return count;
}

export function gen5WildProfile(profile: Gen5Profile): Gen5WildProfile {
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
    nsPokemonReleased: profile.nsPokemonReleased,
  };
}

function validateProfile(profile: Gen5WildProfile, requireKeypress: boolean) {
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
    (requireKeypress && !countGen5WildKeypresses(profile))
  )
    throw new TypeError(
      "Profile must allow at least one valid Keypresses combination.",
    );
  for (const value of [
    profile.skipLR,
    profile.memoryLink,
    profile.shinyCharm,
    profile.nsPokemonReleased,
  ]) {
    if (typeof value !== "boolean")
      throw new TypeError("Invalid Gen 5 profile option.");
  }
}

function validateArea(area: Gen5WildArea, version: Gen5GameVersion) {
  if (
    area.version !== version ||
    !integerIn(area.location, 0, 0xff) ||
    !integerIn(area.season, 0, 3) ||
    !integerIn(area.rate, 1, 100) ||
    (area.slots.length !== 5 && area.slots.length !== 12) ||
    area.slots.some(
      (slot) =>
        !integerIn(slot.species, 1, 649) ||
        !integerIn(slot.form, 0, 31) ||
        !integerIn(slot.minLevel, 1, 100) ||
        !integerIn(slot.maxLevel, slot.minLevel, 100),
    )
  ) {
    throw new TypeError("Invalid Gen 5 Wild encounter area.");
  }
  const available = getGen5WildAreas(version, area.encounter, area.season);
  const expected = available.find((entry) => entry.location === area.location);
  if (
    !expected ||
    expected.rate !== area.rate ||
    expected.slots.length !== area.slots.length ||
    expected.slots.some(
      (slot, index) =>
        slot.species !== area.slots[index].species ||
        slot.form !== area.slots[index].form ||
        slot.minLevel !== area.slots[index].minLevel ||
        slot.maxLevel !== area.slots[index].maxLevel,
    )
  ) {
    throw new TypeError(
      "The selected encounter is unavailable for this profile.",
    );
  }
}

function validateFilters(filters: Gen5WildFilters, slotCount: number) {
  if (
    typeof filters.disabled !== "boolean" ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  )
    throw new TypeError("Wild filters require six IV values.");
  filters.ivMin.forEach((minimum, index) => {
    const maximum = filters.ivMax[index];
    if (
      !integerIn(minimum, 0, 31) ||
      !integerIn(maximum, 0, 31) ||
      minimum > maximum
    )
      throw new TypeError("Each IV range must be between 0 and 31.");
  });
  const allowedSlots = (1 << slotCount) - 1;
  if (
    !integerIn(filters.natureMask, 1, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 1, ALL_HIDDEN_POWERS) ||
    !integerIn(filters.slotMask, 1, allowedSlots) ||
    !integerIn(filters.levelMin, 1, 100) ||
    !integerIn(filters.levelMax, filters.levelMin, 100)
  )
    throw new TypeError("Invalid Wild range filter.");
  if (
    ![0, 1, 255].includes(filters.ability) ||
    ![0, 1, 255].includes(filters.gender) ||
    ![1, 2, 3, 255].includes(filters.shiny)
  )
    throw new TypeError("Invalid Wild filter selection.");
  if (!validatePerfectIvFilter(filters.perfectIvValue, filters.perfectIvCount))
    throw new TypeError("Perfect IV filter must use 0..31 and 0..6.");
}

export function gen5WildLeadValue(lead: Gen5WildLead) {
  if (lead.type === "none") return 255;
  if (lead.type === "synchronize") {
    if (!integerIn(lead.nature, 0, 24))
      throw new TypeError("Synchronize Nature must be between 0 and 24.");
    return lead.nature;
  }
  return {
    cuteCharmFemale: 25,
    cuteCharmMale: 26,
    magnetPull: 27,
    static: 28,
    pressure: 32,
    hustle: 32,
    vitalSpirit: 32,
    suctionCups: 33,
    stickyHold: 33,
    compoundEyes: 34,
  }[lead.type];
}

export function gen5WildLuckyPowerValue(power: Gen5WildLuckyPower) {
  return { none: 0, level1: 1, level2: 2, level3: 3 }[power];
}

export function gen5WildSearcherSeedCount(request: Gen5WildSearcherRequest) {
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
    BigInt(countGen5WildKeypresses(request.profile)) *
    86_400n
  );
}

export function gen5WildTaskCount(request: Gen5WildRequest) {
  return request.mode === "generator"
    ? BigInt(request.maxAdvances) + 1n
    : request.cache?.mode === "iv-sha"
      ? BigInt(request.cache.shaEntryCount)
      : gen5WildSearcherSeedCount(request);
}

export function gen5WildEvaluationCount(request: Gen5WildRequest) {
  if (request.mode === "generator") return BigInt(request.maxAdvances) + 1n;
  const ivCount = BigInt(request.maxIvAdvances) + 1n;
  const pidCount = BigInt(request.maxAdvances) + 1n;
  if (request.cache?.mode === "iv-sha")
    return BigInt(request.cache.shaEntryCount) * pidCount;
  const rawSeeds = gen5WildSearcherSeedCount(request);
  if (request.cache?.mode === "iv") {
    const expectedMatches =
      (rawSeeds * BigInt(request.cache.ivEntryCount) + MT_SEED_SPACE - 1n) /
      MT_SEED_SPACE;
    return rawSeeds + expectedMatches * pidCount;
  }
  return rawSeeds * ivCount * (pidCount + 1n);
}

export function validateGen5WildRequest(request: Gen5WildRequest) {
  if (request.mode !== "generator" && request.mode !== "searcher")
    throw new TypeError("Invalid Gen 5 Wild operation.");
  validateProfile(request.profile, request.mode === "searcher");
  validateArea(request.area, request.profile.version);
  validateFilters(request.filters, request.area.slots.length);
  gen5WildLeadValue(request.lead);
  gen5WildLuckyPowerValue(request.luckyPower);
  if (
    (request.profile.version === "black" ||
      request.profile.version === "white") &&
    request.luckyPower !== "none"
  )
    throw new TypeError(
      "Lucky Power is only available in Black 2 and White 2.",
    );
  if (
    (request.lead.type === "suctionCups" ||
      request.lead.type === "stickyHold") &&
    request.area.encounter !== "super-rod"
  )
    throw new TypeError(
      "Suction Cups and Sticky Hold are only available for Fishing.",
    );
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
  if (!integerIn(request.resultLimit, 1, GEN5_WILD_MAX_RESULTS))
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
  )
    throw new TypeError("Invalid Gen 5 Wild cache descriptor.");
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
  if (gen5WildEvaluationCount(request) > GEN5_WILD_MAX_EVALUATIONS)
    throw new TypeError("Gen 5 Wild range exceeds the browser task limit.");
  return request;
}

export function splitGen5WildRequest(
  request: Gen5WildRequest,
  workers: number,
) {
  validateGen5WildRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  const total = gen5WildTaskCount(request);
  if (total === 0n) return [];
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new TypeError("Gen 5 Wild task cannot be indexed safely.");
  const count = Number(total);
  const evaluationsPerUnit =
    request.mode === "generator"
      ? 1
      : Number(gen5WildEvaluationCount(request) / total);
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
  const chunks: Gen5WildChunk[] = [];
  let start = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const size = base + (index < remainder ? 1 : 0);
    chunks.push({ index, start, count: size });
    start += size;
  }
  return chunks;
}

function hiddenPower(ivs: Gen5WildIvTuple) {
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

export function gen5WildCharacteristic(pid: number, ivs: Gen5WildIvTuple) {
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

export function validateGen5WildResult(
  request: Gen5WildRequest,
  result: Gen5WildResult,
) {
  if (!HEX_16.test(result.seed) || !/^[0-9A-F]{8}$/.test(result.pid))
    throw new TypeError("Gen 5 Wild result contains an invalid Seed or PID.");
  const pid = Number.parseInt(result.pid, 16) >>> 0;
  const slot = request.area.slots[result.slot];
  if (
    !slot ||
    !integerIn(result.advances, 0, 0xffff_ffff) ||
    !integerIn(
      result.ivAdvances,
      request.initialIvAdvances,
      request.initialIvAdvances + request.maxIvAdvances,
    ) ||
    !integerIn(result.chatot, 0, 99) ||
    !integerIn(result.needle, 0, 7) ||
    !integerIn(result.item, 0, 0xffff) ||
    !integerIn(result.level, 1, 100) ||
    result.species !== slot.species ||
    result.form !== slot.form ||
    !integerIn(result.shiny, 0, 2) ||
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.ability, 0, 2) ||
    !integerIn(result.abilityIndex, 1, 0xffff) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.hiddenPower, 0, 15) ||
    !integerIn(result.hiddenPowerStrength, 30, 70) ||
    !integerIn(result.characteristic, 0, 29) ||
    result.ivs.length !== 6 ||
    !result.ivs.every((value) => integerIn(value, 0, 31)) ||
    result.stats.length !== 6 ||
    !result.stats.every((value) => integerIn(value, 1, 0xffff))
  )
    throw new TypeError("Gen 5 Wild result contains invalid state values.");
  const expected = hiddenPower(result.ivs);
  if (
    result.hiddenPower !== expected.type ||
    result.hiddenPowerStrength !== expected.power ||
    result.characteristic !== gen5WildCharacteristic(pid, result.ivs)
  )
    throw new TypeError(
      "Gen 5 Wild result contains inconsistent derived values.",
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
      (request.filters.slotMask & (1 << result.slot)) === 0 ||
      result.level < request.filters.levelMin ||
      result.level > request.filters.levelMax ||
      (request.filters.ability !== 255 &&
        request.filters.ability !== result.ability) ||
      (request.filters.gender !== 255 &&
        request.filters.gender !== result.gender) ||
      !shinyMatches
    )
      throw new TypeError("Gen 5 Wild result does not match the filters.");
  }
  if (request.mode === "generator") {
    if (
      result.seed !== request.seed.toUpperCase().padStart(16, "0") ||
      result.dateTime !== undefined
    )
      throw new TypeError(
        "Gen 5 Wild result does not match the generator request.",
      );
  } else {
    const match = result.dateTime && ISO_DATE_TIME.exec(result.dateTime);
    if (
      !match ||
      result.timer0 === undefined ||
      result.buttonMask === undefined
    )
      throw new TypeError(
        "Gen 5 Wild search result is missing profile metadata.",
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
      !isGen5WildButtonMaskAllowed(request.profile, result.buttonMask)
    )
      throw new TypeError(
        "Gen 5 Wild search result contains invalid profile metadata.",
      );
  }
  return result;
}

export function formatGen5WildButtons(mask: number) {
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

export function normalizeGen5WildSeed(value: string) {
  return value
    .replace(/^0x/i, "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .replace(/^0+(?=.)/, "");
}

export { gen5WildEncounterValue };
export type { Gen5WildArea, Gen5WildEncounter, Gen5WildSeason };
