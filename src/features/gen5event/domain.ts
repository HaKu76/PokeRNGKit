import type {
  Gen5DsType,
  Gen5GameVersion,
  Gen5Language,
  Gen5Profile,
} from "../gen5profiles/domain";

export const GEN5_EVENT_API_VERSION = 1;
export const GEN5_EVENT_REQUEST_WORDS = 64;
export const GEN5_EVENT_RESULT_WORDS = 11;
export const GEN5_EVENT_MAX_RESULTS = 100_000;
export const GEN5_EVENT_MAX_EVALUATIONS = 250_000_000n;
export const GEN5_EVENT_GENERATOR_CHUNK_SIZE = 4_000;
export const GEN5_EVENT_SEARCHER_CHUNK_SIZE = 64;

export type Gen5EventMode = "generator" | "searcher";
export type Gen5EventIvTuple = [number, number, number, number, number, number];
export type Gen5EventOptionalIvTuple = [
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
];

export interface Gen5EventProfile {
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
}

export interface Gen5EventTemplate {
  tid: number;
  sid: number;
  species: number;
  nature: number;
  gender: 0 | 1 | 2;
  ability: 0 | 1 | 2 | 3;
  shiny: 0 | 1 | 2;
  level: number;
  egg: boolean;
  ivs: Gen5EventOptionalIvTuple;
}

export interface Gen5EventFilters {
  disabled: boolean;
  ability: 0 | 1 | 2 | 255;
  gender: 0 | 1 | 2 | 255;
  shiny: 1 | 2 | 3 | 255;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen5EventIvTuple;
  ivMax: Gen5EventIvTuple;
}

interface Gen5EventRequestBase {
  mode: Gen5EventMode;
  profile: Gen5EventProfile;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  event: Gen5EventTemplate;
  filters: Gen5EventFilters;
  resultLimit: number;
}

export interface Gen5EventGeneratorRequest extends Gen5EventRequestBase {
  mode: "generator";
  seed: string;
}

export interface Gen5EventSearcherRequest extends Gen5EventRequestBase {
  mode: "searcher";
  startDate: string;
  endDate: string;
}

export type Gen5EventRequest =
  Gen5EventGeneratorRequest | Gen5EventSearcherRequest;

export interface Gen5EventChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen5EventResult {
  seed: string;
  advances: number;
  chatot: number;
  needle: number;
  pid: string;
  shiny: 0 | 1 | 2;
  nature: number;
  ability: 0 | 1 | 2;
  abilityIndex: number;
  ivs: Gen5EventIvTuple;
  hiddenPower: number;
  hiddenPowerStrength: number;
  gender: 0 | 1 | 2;
  characteristic: number;
  level: number;
  dateTime?: string;
  timer0?: number;
  buttonMask?: number;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const HEX_12 = /^[0-9a-fA-F]{0,12}$/;
const HEX_16 = /^[0-9A-F]{16}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
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

export function isGen5EventButtonMaskAllowed(
  profile: Gen5EventProfile,
  mask: number,
) {
  return (
    integerIn(mask, 0, 0xfff) &&
    profile.keypresses[popcount(mask)] === true &&
    validButtonMask(mask, profile.skipLR)
  );
}

export function countGen5EventKeypresses(profile: Gen5EventProfile) {
  let count = 0;
  for (let mask = 0; mask < 0x1000; mask += 1) {
    if (isGen5EventButtonMaskAllowed(profile, mask)) count += 1;
  }
  return count;
}

export function gen5EventProfile(profile: Gen5Profile): Gen5EventProfile {
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
  };
}

function validateProfile(profile: Gen5EventProfile) {
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
    throw new TypeError("GxStat and VFrame must be between 0 and 99.");
  if (
    profile.keypresses.length !== 9 ||
    !profile.keypresses.every((value) => typeof value === "boolean")
  )
    throw new TypeError("Invalid Gen 5 profile Keypresses settings.");
}

function validateTemplate(event: Gen5EventTemplate) {
  if (!integerIn(event.tid, 0, 0xffff) || !integerIn(event.sid, 0, 0xffff))
    throw new TypeError("Event TID and SID must be between 0 and 65535.");
  if (!integerIn(event.species, 1, 649))
    throw new TypeError("Species must be between 1 and 649.");
  if (!integerIn(event.nature, 0, 24) && event.nature !== 255)
    throw new TypeError("Nature must be fixed or Random.");
  if (
    ![0, 1, 2].includes(event.gender) ||
    ![0, 1, 2, 3].includes(event.ability) ||
    ![0, 1, 2].includes(event.shiny)
  )
    throw new TypeError("Invalid Event Gender, Ability, or Shiny value.");
  if (!integerIn(event.level, 1, 100))
    throw new TypeError("Level must be between 1 and 100.");
  if (typeof event.egg !== "boolean" || event.ivs.length !== 6)
    throw new TypeError("Event settings require six IV values.");
  event.ivs.forEach((value) => {
    if (value !== null && !integerIn(value, 0, 31))
      throw new TypeError("Each fixed IV must be between 0 and 31.");
  });
}

function validateFilters(filters: Gen5EventFilters) {
  if (
    typeof filters.disabled !== "boolean" ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  )
    throw new TypeError("Event filters require six IV ranges.");
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
    ![0, 1, 2, 255].includes(filters.ability) ||
    ![0, 1, 2, 255].includes(filters.gender) ||
    ![1, 2, 3, 255].includes(filters.shiny)
  )
    throw new TypeError("Invalid Event filter selection.");
}

export function gen5EventSearcherSeedCount(request: Gen5EventSearcherRequest) {
  const start = parseDate(request.startDate);
  const end = parseDate(request.endDate);
  if (start > end) return 0n;
  const days = BigInt(
    Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1,
  );
  return (
    days *
    BigInt(request.profile.timer0Max - request.profile.timer0Min + 1) *
    BigInt(countGen5EventKeypresses(request.profile)) *
    86_400n
  );
}

export function gen5EventTaskCount(request: Gen5EventRequest) {
  return request.mode === "generator"
    ? BigInt(request.maxAdvances) + 1n
    : gen5EventSearcherSeedCount(request);
}

export function gen5EventEvaluationCount(request: Gen5EventRequest) {
  return request.mode === "generator"
    ? BigInt(request.maxAdvances) + 1n
    : gen5EventSearcherSeedCount(request) * (BigInt(request.maxAdvances) + 1n);
}

export function validateGen5EventRequest(request: Gen5EventRequest) {
  if (request.mode !== "generator" && request.mode !== "searcher")
    throw new TypeError("Invalid Gen 5 Event operation.");
  validateProfile(request.profile);
  validateTemplate(request.event);
  validateFilters(request.filters);
  for (const [name, value] of [
    ["Initial Advances", request.initialAdvances],
    ["Max Advances", request.maxAdvances],
    ["Offset", request.offset],
  ] as const) {
    if (!integerIn(value, 0, UINT32_MAX))
      throw new TypeError(`${name} must be between 0 and 4294967295.`);
  }
  if (
    request.initialAdvances + request.maxAdvances + request.offset >
    UINT32_MAX
  )
    throw new TypeError(
      "Initial Advances plus Max Advances plus Offset exceeds 4294967295.",
    );
  if (!integerIn(request.resultLimit, 1, GEN5_EVENT_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  if (request.mode === "generator") {
    if (!HEX_16.test(request.seed.toUpperCase().padStart(16, "0")))
      throw new TypeError("Seed must contain at most 16 hexadecimal digits.");
  } else {
    const start = parseDate(request.startDate);
    const end = parseDate(request.endDate);
    if (start > end) throw new TypeError("Start date is after end date");
    if (request.filters.disabled)
      throw new TypeError("Searcher filters cannot be disabled.");
    if (request.offset !== 0) throw new TypeError("Searcher Offset must be 0.");
  }
  if (gen5EventEvaluationCount(request) > GEN5_EVENT_MAX_EVALUATIONS)
    throw new TypeError("Gen 5 Event range exceeds the browser task limit.");
  return request;
}

export function splitGen5EventRequest(
  request: Gen5EventRequest,
  workers: number,
  chunkSize?: number,
) {
  validateGen5EventRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  const total = gen5EventTaskCount(request);
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new TypeError("Gen 5 Event task cannot be indexed safely.");
  const count = Number(total);
  const defaultChunk =
    request.mode === "generator"
      ? GEN5_EVENT_GENERATOR_CHUNK_SIZE
      : Math.max(
          1,
          Math.min(
            GEN5_EVENT_SEARCHER_CHUNK_SIZE,
            Math.floor(500_000 / (request.maxAdvances + 1)),
          ),
        );
  const size = chunkSize ?? defaultChunk;
  if (!Number.isFinite(size) || !Number.isInteger(size) || size < 1)
    throw new TypeError("Chunk size must be a positive finite integer.");
  const responsiveSize = Math.min(
    size,
    Math.max(1, Math.ceil(count / workers)),
  );
  const chunks: Gen5EventChunk[] = [];
  for (let start = 0, index = 0; start < count; index += 1) {
    const current = Math.min(responsiveSize, count - start);
    chunks.push({ index, start, count: current });
    start += current;
  }
  return chunks;
}

function hiddenPower(ivs: Gen5EventIvTuple) {
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

export function gen5EventCharacteristic(pid: number, ivs: Gen5EventIvTuple) {
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

export function validateGen5EventResult(
  request: Gen5EventRequest,
  result: Gen5EventResult,
) {
  if (!HEX_16.test(result.seed) || !/^[0-9A-F]{8}$/.test(result.pid))
    throw new TypeError("Gen 5 Event result contains an invalid Seed or PID.");
  const pid = Number.parseInt(result.pid, 16) >>> 0;
  if (
    !integerIn(result.advances, 0, UINT32_MAX) ||
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
    result.level !== request.event.level ||
    result.ivs.length !== 6 ||
    !result.ivs.every((value) => integerIn(value, 0, 31))
  )
    throw new TypeError("Gen 5 Event result contains invalid state values.");
  const expectedPower = hiddenPower(result.ivs);
  if (
    result.hiddenPower !== expectedPower.type ||
    result.hiddenPowerStrength !== expectedPower.power ||
    result.characteristic !== gen5EventCharacteristic(pid, result.ivs)
  )
    throw new TypeError("Gen 5 Event result contains inconsistent values.");
  request.event.ivs.forEach((fixed, index) => {
    if (fixed !== null && result.ivs[index] !== fixed)
      throw new TypeError("Gen 5 Event result changed a fixed IV.");
  });
  if (
    (request.event.nature !== 255 && result.nature !== request.event.nature) ||
    (request.event.gender < 2 && result.gender !== request.event.gender) ||
    (request.event.ability < 3 && result.ability !== request.event.ability) ||
    (request.event.ability === 3 && result.ability === 2) ||
    (request.event.shiny === 1 && result.shiny !== 0) ||
    (request.event.shiny === 2 && result.shiny === 0)
  )
    throw new TypeError("Gen 5 Event result does not match the wondercard.");
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
    )
      throw new TypeError("Gen 5 Event result does not match the filters.");
  }
  if (request.mode === "generator") {
    if (
      result.seed !== request.seed.toUpperCase().padStart(16, "0") ||
      result.dateTime !== undefined
    )
      throw new TypeError("Gen 5 Event result does not match the generator.");
  } else {
    const match = result.dateTime && ISO_DATE_TIME.exec(result.dateTime);
    if (
      !match ||
      result.timer0 === undefined ||
      result.buttonMask === undefined
    )
      throw new TypeError("Gen 5 Event search result is missing metadata.");
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
      !isGen5EventButtonMaskAllowed(request.profile, result.buttonMask)
    )
      throw new TypeError("Gen 5 Event search result has invalid metadata.");
  }
  return result;
}

function indexed<T extends string>(values: readonly T[], value: T) {
  const index = values.indexOf(value);
  if (index < 0)
    throw new TypeError(`Unsupported Gen 5 Event value: ${value}.`);
  return index;
}

function splitHex(value: string) {
  const parsed = BigInt(`0x${value || "0"}`);
  return [Number(parsed & 0xffff_ffffn), Number(parsed >> 32n)] as const;
}

function dateParts(value: string) {
  return value.split("-").map(Number) as [number, number, number];
}

export function encodeGen5EventRequest(
  request: Gen5EventRequest,
  chunk: Gen5EventChunk,
) {
  validateGen5EventRequest(request);
  const fixedMask = request.event.ivs.reduce<number>(
    (mask, value, index) => mask | (value === null ? 0 : 1 << index),
    0,
  );
  const [macLow, macHigh] = splitHex(request.profile.mac);
  const values: number[] = [
    request.mode === "generator" ? 0 : 1,
    indexed(
      ["black", "white", "black2", "white2"] as const,
      request.profile.version,
    ),
    indexed(
      [
        "english",
        "spanish",
        "french",
        "italian",
        "german",
        "japanese",
        "korean",
      ] as const,
      request.profile.language,
    ),
    indexed(["ds", "dsi", "3ds"] as const, request.profile.dsType),
    request.profile.tid,
    request.profile.sid,
    macLow,
    macHigh,
    request.profile.vcount,
    request.profile.timer0Min,
    request.profile.timer0Max,
    request.profile.gxstat,
    request.profile.vframe,
    request.profile.keypresses.reduce(
      (mask, enabled, index) => mask | (enabled ? 1 << index : 0),
      0,
    ),
    request.profile.skipLR ? 1 : 0,
    request.profile.memoryLink ? 1 : 0,
    request.initialAdvances,
    request.maxAdvances,
    request.offset,
    request.event.tid,
    request.event.sid,
    request.event.species,
    request.event.nature,
    request.event.gender,
    request.event.ability,
    request.event.shiny,
    request.event.level,
    request.event.egg ? 1 : 0,
    fixedMask,
    ...request.event.ivs.map((value) => value ?? 0),
    request.filters.disabled ? 1 : 0,
    request.filters.ability,
    request.filters.gender,
    request.filters.shiny,
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    request.resultLimit,
    ...(request.mode === "searcher"
      ? [...dateParts(request.startDate), ...dateParts(request.endDate)]
      : [0, 0, 0, 0, 0, 0]),
    ...(request.mode === "generator" ? [...splitHex(request.seed)] : [0, 0]),
    chunk.start,
    chunk.count,
  ];
  if (values.length !== GEN5_EVENT_REQUEST_WORDS)
    throw new Error("Gen 5 Event request packing changed unexpectedly.");
  return Uint32Array.from(values, (value) => value >>> 0);
}

export function decodeGen5EventResults(
  buffer: ArrayBuffer,
  maximumResults = Number.POSITIVE_INFINITY,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN5_EVENT_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen 5 Event result buffer length.");
  const results: Gen5EventResult[] = [];
  const resultWords = Math.min(
    words.length,
    Math.max(0, Math.floor(maximumResults)) * GEN5_EVENT_RESULT_WORDS,
  );
  for (
    let offset = 0;
    offset < resultWords;
    offset += GEN5_EVENT_RESULT_WORDS
  ) {
    const seed = (BigInt(words[offset + 1]) << 32n) | BigInt(words[offset]);
    const date = words[offset + 2];
    const seconds = words[offset + 3];
    const metadata = words[offset + 7];
    const ivWords = words[offset + 8];
    const ivWords2 = words[offset + 9];
    const ivs = [
      ivWords & 0xff,
      (ivWords >>> 8) & 0xff,
      (ivWords >>> 16) & 0xff,
      (ivWords >>> 24) & 0xff,
      ivWords2 & 0xff,
      (ivWords2 >>> 8) & 0xff,
    ] as Gen5EventIvTuple;
    const pid = words[offset + 6];
    const dateText = date
      ? `${date & 0xffff}-${String((date >>> 16) & 0xff).padStart(2, "0")}-${String(date >>> 24).padStart(2, "0")}`
      : undefined;
    results.push({
      seed: seed.toString(16).toUpperCase().padStart(16, "0"),
      advances: words[offset + 5],
      chatot: metadata & 0x7f,
      needle: (metadata >>> 7) & 7,
      ability: ((metadata >>> 10) & 3) as 0 | 1 | 2,
      gender: ((metadata >>> 12) & 3) as 0 | 1 | 2,
      level: (metadata >>> 14) & 0x7f,
      nature: (metadata >>> 21) & 0x1f,
      shiny: ((metadata >>> 26) & 3) as 0 | 1 | 2,
      pid: pid.toString(16).toUpperCase().padStart(8, "0"),
      abilityIndex: words[offset + 10],
      ivs,
      hiddenPower: (ivWords2 >>> 16) & 0xff,
      hiddenPowerStrength: (ivWords2 >>> 24) & 0xff,
      characteristic: gen5EventCharacteristic(pid, ivs),
      dateTime: dateText
        ? `${dateText} ${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
        : undefined,
      timer0: date ? words[offset + 4] & 0xffff : undefined,
      buttonMask: date ? words[offset + 4] >>> 16 : undefined,
    });
  }
  return results;
}

export function formatGen5EventButtons(mask: number) {
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

export function normalizeGen5EventSeed(value: string) {
  return value
    .replace(/^0x/i, "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .replace(/^0+(?=.)/, "");
}
