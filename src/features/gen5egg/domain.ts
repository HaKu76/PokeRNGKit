import type {
  Gen5DsType,
  Gen5GameVersion,
  Gen5Language,
  Gen5Profile,
} from "../gen5profiles/domain";
import { GEN5_EGG_SPECIES_SET, getGen5EggBaseStats } from "./data";

export const GEN5_EGG_API_VERSION = 1;
export const GEN5_EGG_REQUEST_WORDS = 71;
export const GEN5_EGG_RESULT_WORDS = 16;
export const GEN5_EGG_MAX_RESULTS = 100_000;
export const GEN5_EGG_MAX_EVALUATIONS = 250_000_000n;
export const GEN5_EGG_MAX_WASM_RESULTS = 100_000;
export const GEN5_EGG_GENERATOR_CHUNK_SIZE = 2_000;
export const GEN5_EGG_SEARCHER_CHUNK_SIZE = 64;

export type Gen5EggMode = "generator" | "searcher";
export type Gen5EggIvTuple = [number, number, number, number, number, number];
export type Gen5EggParentGender = "male" | "female" | "genderless" | "ditto";
export type Gen5EggParentAbility = 0 | 1 | 2;
export type Gen5EggParentItem = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Gen5EggShinyFilter =
  "any" | "notShiny" | "star" | "square" | "starSquare";
export type Gen5EggGenderFilter = "any" | "male" | "female" | "genderless";
export type Gen5EggAbilityFilter = "any" | "first" | "second" | "hidden";

export interface Gen5EggParent {
  ivs: Gen5EggIvTuple;
  ability: Gen5EggParentAbility;
  gender: Gen5EggParentGender;
  item: Gen5EggParentItem;
  nature: number;
}

export interface Gen5EggFilters {
  disabled: boolean;
  shiny: Gen5EggShinyFilter;
  gender: Gen5EggGenderFilter;
  ability: Gen5EggAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen5EggIvTuple;
  ivMax: Gen5EggIvTuple;
}

export interface Gen5EggProfile {
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

interface Gen5EggRequestBase {
  mode: Gen5EggMode;
  profile: Gen5EggProfile;
  initialAdvances: number;
  maxAdvances: number;
  species: number;
  masuda: boolean;
  parentA: Gen5EggParent;
  parentB: Gen5EggParent;
  filters: Gen5EggFilters;
  resultLimit: number;
}

export interface Gen5EggGeneratorRequest extends Gen5EggRequestBase {
  mode: "generator";
  seed: string;
  offset: number;
}

export interface Gen5EggSearcherRequest extends Gen5EggRequestBase {
  mode: "searcher";
  startDate: string;
  endDate: string;
}

export type Gen5EggRequest = Gen5EggGeneratorRequest | Gen5EggSearcherRequest;

export interface Gen5EggChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen5EggResult {
  seed: string;
  advances: number;
  chatot: number;
  needle: number;
  pid: string;
  shiny: number;
  nature: number;
  ability: number;
  abilityIndex: number;
  ivs: Gen5EggIvTuple;
  stats: Gen5EggIvTuple;
  inheritance: Gen5EggIvTuple;
  hiddenPower: number;
  hiddenPowerStrength: number;
  gender: number;
  characteristic: number;
  species: number;
  dateTime?: string;
  timer0?: number;
  buttonMask?: number;
}

const UINT32_MAX = 0xffff_ffff;
const HEX_12 = /^[0-9a-fA-F]{0,12}$/;
const HEX_16 = /^[0-9A-F]{16}$/;
const HEX_SEED_INPUT = /^[0-9a-fA-F]{0,16}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const DAY_MS = 86_400_000;

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

export function isGen5EggButtonMaskAllowed(
  profile: Gen5EggProfile,
  mask: number,
) {
  return (
    integerIn(mask, 0, 0xfff) &&
    profile.keypresses[popcount(mask)] === true &&
    validButtonMask(mask, profile.skipLR)
  );
}

export function countGen5EggKeypresses(profile: Gen5EggProfile) {
  let count = 0;
  for (let mask = 0; mask < 0x1000; mask += 1) {
    if (isGen5EggButtonMaskAllowed(profile, mask)) count += 1;
  }
  return count;
}

export function gen5EggProfile(profile: Gen5Profile): Gen5EggProfile {
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

export function gen5EggParentGenderToWasm(gender: Gen5EggParentGender) {
  return { male: 0, female: 1, genderless: 2, ditto: 3 }[gender];
}

export function gen5EggShinyFilterToWasm(filter: Gen5EggShinyFilter) {
  return {
    any: 0,
    notShiny: 1,
    star: 2,
    square: 3,
    starSquare: 4,
  }[filter];
}

export function gen5EggGenderFilterToWasm(filter: Gen5EggGenderFilter) {
  return { any: 0, male: 1, female: 2, genderless: 3 }[filter];
}

export function gen5EggAbilityFilterToWasm(filter: Gen5EggAbilityFilter) {
  return { any: 0, first: 1, second: 2, hidden: 3 }[filter];
}

export function gen5EggVersionToWasm(version: Gen5GameVersion) {
  return { black: 0, white: 1, black2: 2, white2: 3 }[version];
}

export function gen5EggLanguageToWasm(language: Gen5Language) {
  return {
    english: 0,
    spanish: 1,
    french: 2,
    italian: 3,
    german: 4,
    japanese: 5,
    korean: 6,
  }[language];
}

export function gen5EggDsTypeToWasm(dsType: Gen5DsType) {
  return { ds: 0, dsi: 1, "3ds": 2 }[dsType];
}

export function isGen5EggParentCombinationValid(
  parentA: Gen5EggParent,
  parentB: Gen5EggParent,
) {
  const left = gen5EggParentGenderToWasm(parentA.gender);
  const right = gen5EggParentGenderToWasm(parentB.gender);
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

export function shouldReorderGen5EggParents(
  parentA: Gen5EggParent,
  parentB: Gen5EggParent,
) {
  const left = gen5EggParentGenderToWasm(parentA.gender);
  const right = gen5EggParentGenderToWasm(parentB.gender);
  return (
    (left === 1 && right === 0) ||
    (left === 1 && right === 3) ||
    (left === 3 && right === 0) ||
    (left === 3 && right === 2)
  );
}

export function mapGen5EggInheritanceSource(
  source: number,
  parentsReordered: boolean,
) {
  if (!integerIn(source, 0, 2))
    throw new TypeError("Invalid Gen 5 Egg inheritance source.");
  if (!parentsReordered || source === 0) return source;
  return source === 1 ? 2 : 1;
}

export function parseGen5EggDecimal(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export function canonicalGen5EggParents(
  parentA: Gen5EggParent,
  parentB: Gen5EggParent,
) {
  return shouldReorderGen5EggParents(parentA, parentB)
    ? ([parentB, parentA] as const)
    : ([parentA, parentB] as const);
}

function validateProfile(profile: Gen5EggProfile) {
  if (
    !(["black", "white", "black2", "white2"] as const).includes(profile.version)
  )
    throw new TypeError("Invalid Gen 5 game version.");
  if (
    !(
      [
        "english",
        "spanish",
        "french",
        "italian",
        "german",
        "japanese",
        "korean",
      ] as const
    ).includes(profile.language) ||
    !(["ds", "dsi", "3ds"] as const).includes(profile.dsType)
  ) {
    throw new TypeError("Invalid Gen 5 profile platform.");
  }
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
  ) {
    throw new TypeError("Timer0 must use an ascending 0000 to FFFF range.");
  }
  if (!integerIn(profile.gxstat, 0, 99) || !integerIn(profile.vframe, 0, 99))
    throw new TypeError("GxStat and VFrame must be between 00 and 63.");
  if (
    !Array.isArray(profile.keypresses) ||
    profile.keypresses.length !== 9 ||
    !profile.keypresses.every((value) => typeof value === "boolean") ||
    typeof profile.skipLR !== "boolean" ||
    typeof profile.memoryLink !== "boolean" ||
    typeof profile.shinyCharm !== "boolean"
  ) {
    throw new TypeError("Invalid Gen 5 profile settings.");
  }
}

function validateParent(parent: Gen5EggParent, name: string) {
  if (!Array.isArray(parent.ivs) || parent.ivs.length !== 6)
    throw new TypeError(`${name} IVs require six values.`);
  if (!parent.ivs.every((value) => integerIn(value, 0, 31)))
    throw new TypeError(`${name} IVs must be between 0 and 31.`);
  if (!integerIn(parent.ability, 0, 2))
    throw new TypeError(`${name} Ability is invalid.`);
  if (
    !("male female genderless ditto".split(" ") as string[]).includes(
      parent.gender,
    )
  )
    throw new TypeError(`${name} Gender is invalid.`);
  if (!integerIn(parent.item, 0, 7))
    throw new TypeError(`${name} Item is invalid.`);
  if (!integerIn(parent.nature, 0, 24))
    throw new TypeError(`${name} Nature must be between 0 and 24.`);
}

function validateFilters(filters: Gen5EggFilters) {
  if (typeof filters.disabled !== "boolean")
    throw new TypeError("Invalid Gen 5 Egg filter state.");
  if (
    !("any notShiny star square starSquare".split(" ") as string[]).includes(
      filters.shiny,
    ) ||
    !("any male female genderless".split(" ") as string[]).includes(
      filters.gender,
    ) ||
    !("any first second hidden".split(" ") as string[]).includes(
      filters.ability,
    )
  ) {
    throw new TypeError("Invalid Gen 5 Egg filter choice.");
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
    throw new TypeError("Gen 5 Egg IV filters require six ranges.");
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

export function gen5EggSearcherSeedCount(request: Gen5EggSearcherRequest) {
  const start = parseDate(request.startDate);
  const end = parseDate(request.endDate);
  if (start > end) return 0n;
  const days = BigInt(
    Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1,
  );
  return (
    days *
    BigInt(request.profile.timer0Max - request.profile.timer0Min + 1) *
    BigInt(countGen5EggKeypresses(request.profile)) *
    86_400n
  );
}

export function gen5EggTaskCount(request: Gen5EggRequest) {
  return request.mode === "generator"
    ? BigInt(request.maxAdvances) + 1n
    : gen5EggSearcherSeedCount(request);
}

export function gen5EggEvaluationCount(request: Gen5EggRequest) {
  return request.mode === "generator"
    ? gen5EggTaskCount(request)
    : gen5EggTaskCount(request) * (BigInt(request.maxAdvances) + 1n);
}

export function validateGen5EggRequest(request: Gen5EggRequest) {
  if (request.mode !== "generator" && request.mode !== "searcher")
    throw new TypeError("Invalid Gen 5 Egg operation.");
  validateProfile(request.profile);
  if (!integerIn(request.initialAdvances, 0, UINT32_MAX))
    throw new TypeError("Initial Advances must be between 0 and 4294967295.");
  if (!integerIn(request.maxAdvances, 0, UINT32_MAX))
    throw new TypeError("Max Advances must be between 0 and 4294967295.");
  if (request.initialAdvances + request.maxAdvances > UINT32_MAX)
    throw new TypeError(
      "Initial Advances plus Max Advances exceeds 4294967295.",
    );
  if (!GEN5_EGG_SPECIES_SET.has(request.species))
    throw new TypeError("Egg Specie is not available in Generation V.");
  if (typeof request.masuda !== "boolean")
    throw new TypeError("Masuda must be a boolean.");
  validateParent(request.parentA, "Parent A");
  validateParent(request.parentB, "Parent B");
  if (!isGen5EggParentCombinationValid(request.parentA, request.parentB))
    throw new TypeError(
      "Gender of selected parents are not compatible for breeding",
    );
  validateFilters(request.filters);
  if (!integerIn(request.resultLimit, 1, GEN5_EGG_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");

  const [parentA, parentB] = canonicalGen5EggParents(
    request.parentA,
    request.parentB,
  );
  if (
    !request.filters.disabled &&
    request.filters.ability === "hidden" &&
    !(
      parentA.gender === "male" &&
      parentB.gender === "female" &&
      parentB.ability === 2
    )
  ) {
    throw new TypeError("Parents incompatible for breeding Hidden Ability!");
  }

  if (request.mode === "generator") {
    if (!HEX_SEED_INPUT.test(request.seed))
      throw new TypeError("Seed must contain at most 16 hexadecimal digits.");
    if (!integerIn(request.offset, 0, UINT32_MAX))
      throw new TypeError("Offset must be between 0 and 4294967295.");
    if (
      request.initialAdvances + request.offset + request.maxAdvances >
      UINT32_MAX
    )
      throw new TypeError(
        "Initial Advances plus Offset and Max Advances exceeds 4294967295.",
      );
  } else {
    const start = parseDate(request.startDate);
    const end = parseDate(request.endDate);
    if (start > end) throw new TypeError("Start date is after end date");
    if (request.filters.disabled)
      throw new TypeError("Searcher filters cannot be disabled.");
  }
  if (gen5EggEvaluationCount(request) > GEN5_EGG_MAX_EVALUATIONS)
    throw new TypeError("Gen 5 Egg range exceeds the browser task limit.");
  return request;
}

export function splitGen5EggRequest(
  request: Gen5EggRequest,
  workers: number,
  chunkSize = request.mode === "generator"
    ? GEN5_EGG_GENERATOR_CHUNK_SIZE
    : GEN5_EGG_SEARCHER_CHUNK_SIZE,
) {
  validateGen5EggRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new TypeError("Chunk size must be a positive integer.");
  const taskCount = gen5EggTaskCount(request);
  if (taskCount > BigInt(Number.MAX_SAFE_INTEGER))
    throw new TypeError("Gen 5 Egg task cannot be indexed safely.");
  const count = Number(taskCount);
  if (count === 0) return [];
  const evaluationsPerUnit =
    request.mode === "generator" ? 1 : request.maxAdvances + 1;
  const responsiveSize = Math.max(
    1,
    Math.floor(1_000_000 / Math.max(1, evaluationsPerUnit)),
  );
  const size = Math.max(1, Math.min(chunkSize, responsiveSize));
  const targetChunks = Math.max(workers * 4, Math.ceil(count / size));
  const chunkCount = Math.min(count, targetChunks);
  const base = Math.floor(count / chunkCount);
  const remainder = count % chunkCount;
  const chunks: Gen5EggChunk[] = [];
  let start = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const current = base + (index < remainder ? 1 : 0);
    chunks.push({ index, start, count: current });
    start += current;
  }
  return chunks;
}

function keypressCountMask(keypresses: Gen5Profile["keypresses"]) {
  return keypresses.reduce(
    (mask, enabled, index) => mask | (enabled ? 1 << index : 0),
    0,
  );
}

function dateWords(value: string) {
  const date = parseDate(value);
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
}

export function encodeGen5EggRequest(
  request: Gen5EggRequest,
  chunk: Gen5EggChunk,
) {
  validateGen5EggRequest(request);
  const [parentA, parentB] = canonicalGen5EggParents(
    request.parentA,
    request.parentB,
  );
  const mac = BigInt(`0x${request.profile.mac || "0"}`);
  const seed =
    request.mode === "generator"
      ? BigInt(`0x${normalizeGen5EggSeed(request.seed)}`)
      : 0n;
  const start =
    request.mode === "searcher" ? dateWords(request.startDate) : [0, 0, 0];
  const end =
    request.mode === "searcher" ? dateWords(request.endDate) : [0, 0, 0];
  return Uint32Array.from([
    request.mode === "generator" ? 0 : 1,
    gen5EggVersionToWasm(request.profile.version),
    gen5EggLanguageToWasm(request.profile.language),
    gen5EggDsTypeToWasm(request.profile.dsType),
    Number(mac & 0xffff_ffffn),
    Number((mac >> 32n) & 0xffffn),
    request.profile.vcount,
    request.profile.timer0Min,
    request.profile.timer0Max,
    request.profile.gxstat,
    request.profile.vframe,
    keypressCountMask(request.profile.keypresses),
    request.profile.skipLR ? 1 : 0,
    request.profile.memoryLink ? 1 : 0,
    request.profile.shinyCharm ? 1 : 0,
    request.profile.tid,
    request.profile.sid,
    request.initialAdvances,
    request.maxAdvances,
    request.mode === "generator" ? request.offset : 0,
    request.resultLimit,
    request.species,
    request.masuda ? 1 : 0,
    ...parentA.ivs,
    ...parentB.ivs,
    parentA.ability,
    parentB.ability,
    gen5EggParentGenderToWasm(parentA.gender),
    gen5EggParentGenderToWasm(parentB.gender),
    parentA.item,
    parentB.item,
    parentA.nature,
    parentB.nature,
    request.filters.disabled ? 1 : 0,
    gen5EggShinyFilterToWasm(request.filters.shiny),
    gen5EggGenderFilterToWasm(request.filters.gender),
    gen5EggAbilityFilterToWasm(request.filters.ability),
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    Number(seed & 0xffff_ffffn),
    Number(seed >> 32n),
    ...start,
    ...end,
    chunk.start,
    chunk.count,
  ]);
}

function byte(word: number, shift: number) {
  return (word >>> shift) & 0xff;
}

function formatDateTime(dateWord: number, seconds: number) {
  const year = dateWord & 0xffff;
  const month = (dateWord >>> 16) & 0xff;
  const day = dateWord >>> 24;
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds % 3600) / 60);
  const second = seconds % 60;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

export function decodeGen5EggResults(
  buffer: ArrayBuffer,
  maximumResults = Number.POSITIVE_INFINITY,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN5_EGG_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen 5 Egg result buffer length.");
  const resultCount = Math.min(
    words.length / GEN5_EGG_RESULT_WORDS,
    Math.max(0, Math.floor(maximumResults)),
  );
  return Array.from({ length: resultCount }, (_, index): Gen5EggResult => {
    const offset = index * GEN5_EGG_RESULT_WORDS;
    const seed = (BigInt(words[offset + 1]) << 32n) | BigInt(words[offset]);
    const date = words[offset + 2];
    const seconds = words[offset + 3];
    const timer0Buttons = words[offset + 4];
    const metadata = words[offset + 7];
    const ivs0 = words[offset + 8];
    const ivs1 = words[offset + 9];
    const inheritance = words[offset + 10];
    const result: Gen5EggResult = {
      seed: seed.toString(16).toUpperCase().padStart(16, "0"),
      advances: words[offset + 5],
      pid: words[offset + 6].toString(16).toUpperCase().padStart(8, "0"),
      chatot: metadata & 0x7f,
      needle: (metadata >>> 7) & 0x7,
      ability: (metadata >>> 10) & 0x3,
      gender: (metadata >>> 12) & 0x3,
      nature: (metadata >>> 14) & 0x1f,
      shiny: (metadata >>> 19) & 0x3,
      characteristic: (metadata >>> 21) & 0x1f,
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
      abilityIndex: words[offset + 11],
      stats: [
        words[offset + 12] & 0xffff,
        words[offset + 12] >>> 16,
        words[offset + 13] & 0xffff,
        words[offset + 13] >>> 16,
        words[offset + 14] & 0xffff,
        words[offset + 14] >>> 16,
      ],
      species: words[offset + 15],
    };
    if (date !== 0) {
      result.dateTime = formatDateTime(date, seconds);
      result.timer0 = timer0Buttons & 0xffff;
      result.buttonMask = timer0Buttons >>> 16;
    }
    return result;
  });
}

function hiddenPower(ivs: Gen5EggIvTuple) {
  const order = [0, 1, 2, 5, 3, 4] as const;
  let type = 0;
  let power = 0;
  order.forEach((ivIndex, bit) => {
    type |= (ivs[ivIndex] & 1) << bit;
    power |= ((ivs[ivIndex] >>> 1) & 1) << bit;
  });
  return {
    type: Math.floor((type * 15) / 63),
    power: 30 + Math.floor((power * 40) / 63),
  };
}

export function gen5EggCharacteristic(pid: number, ivs: Gen5EggIvTuple) {
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

function computedStats(result: Gen5EggResult) {
  const base = getGen5EggBaseStats(result.species);
  const statMap = [1, 2, 5, 3, 4];
  const raised = statMap[Math.floor(result.nature / 5)];
  const lowered = statMap[result.nature % 5];
  return base.map((value, index) => {
    if (index === 0)
      return Math.floor((2 * value + result.ivs[index]) / 100) + 11;
    const raw = Math.floor((2 * value + result.ivs[index]) / 100) + 5;
    if (raised === lowered) return raw;
    if (index === raised) return Math.floor(raw * 1.1);
    if (index === lowered) return Math.floor(raw * 0.9);
    return raw;
  }) as Gen5EggIvTuple;
}

export function validateGen5EggResult(
  request: Gen5EggRequest,
  result: Gen5EggResult,
) {
  if (!HEX_16.test(result.seed) || !/^[0-9A-F]{8}$/.test(result.pid))
    throw new TypeError("Gen 5 Egg result contains an invalid Seed or PID.");
  if (
    !integerIn(result.advances, 0, UINT32_MAX) ||
    !integerIn(result.chatot, 0, 99) ||
    !integerIn(result.needle, 0, 7) ||
    !integerIn(result.ability, 0, 2) ||
    !integerIn(result.abilityIndex, 1, 0xffff) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.shiny, 0, 2) ||
    !integerIn(result.hiddenPower, 0, 15) ||
    !integerIn(result.hiddenPowerStrength, 30, 70) ||
    !integerIn(result.characteristic, 0, 29) ||
    !GEN5_EGG_SPECIES_SET.has(result.species) ||
    !result.ivs.every((value) => integerIn(value, 0, 31)) ||
    !result.inheritance.every((value) => integerIn(value, 0, 2)) ||
    !result.stats.every((value) => integerIn(value, 1, 999))
  ) {
    throw new TypeError("Gen 5 Egg result contains invalid state values.");
  }
  const power = hiddenPower(result.ivs);
  const pid = Number.parseInt(result.pid, 16) >>> 0;
  const characteristicEc =
    request.profile.version === "black2" || request.profile.version === "white2"
      ? 0
      : pid;
  if (
    power.type !== result.hiddenPower ||
    power.power !== result.hiddenPowerStrength ||
    gen5EggCharacteristic(characteristicEc, result.ivs) !==
      result.characteristic ||
    computedStats(result).some((value, index) => value !== result.stats[index])
  ) {
    throw new TypeError(
      "Gen 5 Egg result contains inconsistent derived values.",
    );
  }
  if (request.mode === "generator") {
    if (
      result.dateTime !== undefined ||
      result.timer0 !== undefined ||
      result.buttonMask !== undefined
    )
      throw new TypeError("Generator result contains Searcher metadata.");
  } else if (
    result.dateTime === undefined ||
    !integerIn(
      result.timer0,
      request.profile.timer0Min,
      request.profile.timer0Max,
    ) ||
    result.buttonMask === undefined ||
    !isGen5EggButtonMaskAllowed(request.profile, result.buttonMask)
  ) {
    throw new TypeError(
      "Searcher result is missing valid date or profile metadata.",
    );
  }
  return result;
}

export function normalizeGen5EggSeed(value: string) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .padStart(16, "0");
}

export function formatGen5EggButtons(mask: number) {
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
  const selected = labels.filter((_, index) => (mask & (1 << index)) !== 0);
  return selected.length === 0 ? "None" : selected.join("+");
}
