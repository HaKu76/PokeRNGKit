import type {
  Gen5DsType,
  Gen5GameVersion,
  Gen5Language,
  Gen5Profile,
} from "../gen5profiles/domain";

export const GEN5_ID_MAX_RESULTS = 100_000;
export const GEN5_ID_MAX_EVALUATIONS = 250_000_000n;

export type Gen5IdMode = "search" | "seedFinder";

export interface Gen5IdProfile {
  version: Gen5GameVersion;
  language: Gen5Language;
  dsType: Gen5DsType;
  mac: string;
  vcount: number;
  timer0Min: number;
  timer0Max: number;
  gxstat: number;
  vframe: number;
  keypresses: Gen5Profile["keypresses"];
  skipLR: boolean;
}

interface Gen5IdRequestBase {
  mode: Gen5IdMode;
  profile: Gen5IdProfile;
  maxAdvances: number;
  resultLimit: number;
}

export interface Gen5IdSearchRequest extends Gen5IdRequestBase {
  mode: "search";
  startDate: string;
  endDate: string;
  pid: number;
  usePID: boolean;
  useXOR: boolean;
  tid: number;
  useTID: boolean;
  sid: number;
  useSID: boolean;
}

export interface Gen5IdSeedFinderRequest extends Gen5IdRequestBase {
  mode: "seedFinder";
  date: string;
  hour: number;
  minute: number;
  minSecond: number;
  maxSecond: number;
  tid: number;
}

export type Gen5IdRequest = Gen5IdSearchRequest | Gen5IdSeedFinderRequest;

export interface Gen5IdChunk {
  index: number;
  startUnit: number;
  unitCount: number;
}

export interface Gen5IdResult {
  seed: string;
  initialAdvances: number;
  advances: number;
  tid: number;
  sid: number;
  tsv: number;
  dateTime: string;
  timer0: number;
  buttonMask: number;
}

const HEX_12 = /^[0-9a-fA-F]{0,12}$/;
const HEX_16 = /^[0-9A-F]{16}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const DAY_MS = 86_400_000;

function isIntegerIn(value: unknown, minimum: number, maximum: number) {
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

export function isGen5IdButtonMaskAllowed(
  profile: Gen5IdProfile,
  mask: number,
) {
  return (
    isIntegerIn(mask, 0, 0xfff) &&
    profile.keypresses[popcount(mask)] === true &&
    validButtonMask(mask, profile.skipLR)
  );
}

export function countGen5IdKeypresses(profile: Gen5IdProfile) {
  let count = 0;
  for (let mask = 0; mask < 0x1000; mask += 1) {
    const held = popcount(mask);
    if (
      held <= 8 &&
      profile.keypresses[held] &&
      validButtonMask(mask, profile.skipLR)
    ) {
      count += 1;
    }
  }
  return count;
}

export function gen5IdProfile(profile: Gen5Profile): Gen5IdProfile {
  return {
    version: profile.version,
    language: profile.language,
    dsType: profile.dsType,
    mac: profile.mac,
    vcount: profile.vcount,
    timer0Min: profile.timer0Min,
    timer0Max: profile.timer0Max,
    gxstat: profile.gxstat,
    vframe: profile.vframe,
    keypresses: [...profile.keypresses] as Gen5Profile["keypresses"],
    skipLR: profile.skipLR,
  };
}

function validateProfile(profile: Gen5IdProfile) {
  if (
    !(["black", "white", "black2", "white2"] as const).includes(
      profile.version,
    ) ||
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
  if (!HEX_12.test(profile.mac))
    throw new TypeError("MAC must contain at most 12 hexadecimal digits.");
  if (!isIntegerIn(profile.vcount, 0, 0xff))
    throw new TypeError("VCount must be between 00 and FF.");
  if (
    !isIntegerIn(profile.timer0Min, 0, 0xffff) ||
    !isIntegerIn(profile.timer0Max, 0, 0xffff)
  ) {
    throw new TypeError("Timer0 must be between 0000 and FFFF.");
  }
  if (
    !isIntegerIn(profile.gxstat, 0, 99) ||
    !isIntegerIn(profile.vframe, 0, 99)
  ) {
    throw new TypeError("GxStat and VFrame must be between 00 and 63.");
  }
  if (
    !Array.isArray(profile.keypresses) ||
    profile.keypresses.length !== 9 ||
    !profile.keypresses.every((value) => typeof value === "boolean") ||
    typeof profile.skipLR !== "boolean"
  ) {
    throw new TypeError("Invalid Gen 5 profile keypress settings.");
  }
}

export function gen5IdUnitCount(request: Gen5IdRequest) {
  const timer0Count =
    request.profile.timer0Min > request.profile.timer0Max
      ? 0
      : request.profile.timer0Max - request.profile.timer0Min + 1;
  const keypressCount = countGen5IdKeypresses(request.profile);
  if (request.mode === "seedFinder")
    return request.minSecond > request.maxSecond
      ? 0
      : timer0Count * keypressCount;
  const start = parseDate(request.startDate);
  const end = parseDate(request.endDate);
  const dateCount = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
  return timer0Count * keypressCount * dateCount;
}

export function gen5IdCandidateCount(request: Gen5IdRequest) {
  const seconds =
    request.mode === "search"
      ? 86_400
      : request.minSecond > request.maxSecond
        ? 0
        : request.maxSecond - request.minSecond + 1;
  return gen5IdUnitCount(request) * seconds;
}

export function gen5IdEvaluationCount(request: Gen5IdRequest) {
  const seconds =
    request.mode === "search"
      ? 86_400n
      : request.minSecond > request.maxSecond
        ? 0n
        : BigInt(request.maxSecond - request.minSecond + 1);
  return (
    BigInt(gen5IdUnitCount(request)) *
    seconds *
    (BigInt(request.maxAdvances) + 1n)
  );
}

export function gen5IdTaskEvaluationCount(request: Gen5IdRequest) {
  const total = gen5IdEvaluationCount(request);
  if (
    request.mode === "search" &&
    !request.usePID &&
    !request.useTID &&
    !request.useSID
  ) {
    return total < BigInt(request.resultLimit)
      ? total
      : BigInt(request.resultLimit);
  }
  return total;
}

export function validateGen5IdRequest(request: Gen5IdRequest) {
  if (request.mode !== "search" && request.mode !== "seedFinder")
    throw new TypeError("Invalid Gen 5 ID operation.");
  validateProfile(request.profile);
  if (!isIntegerIn(request.maxAdvances, 0, 0xffff_ffff))
    throw new TypeError("Max Advances must be between 0 and 4294967295.");
  if (!isIntegerIn(request.resultLimit, 1, GEN5_ID_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");

  if (request.mode === "search") {
    const start = parseDate(request.startDate);
    const end = parseDate(request.endDate);
    if (start > end) throw new TypeError("Start date is after end date");
    if (!isIntegerIn(request.pid, 0, 0xffff_ffff))
      throw new TypeError("PID must be between 00000000 and FFFFFFFF.");
    if (
      !isIntegerIn(request.tid, 0, 0xffff) ||
      !isIntegerIn(request.sid, 0, 0xffff)
    ) {
      throw new TypeError("TID and SID must be between 0 and 65535.");
    }
    for (const value of [
      request.usePID,
      request.useXOR,
      request.useTID,
      request.useSID,
    ]) {
      if (typeof value !== "boolean")
        throw new TypeError("Invalid Gen 5 ID filter.");
    }
    if (request.useXOR && !request.usePID)
      throw new TypeError("Static/Wild requires PID.");
  } else {
    parseDate(request.date);
    if (!isIntegerIn(request.hour, 0, 23))
      throw new TypeError("Hour must be between 0 and 23.");
    if (!isIntegerIn(request.minute, 0, 59))
      throw new TypeError("Minute must be between 0 and 59.");
    if (
      !isIntegerIn(request.minSecond, 0, 59) ||
      !isIntegerIn(request.maxSecond, 0, 59)
    ) {
      throw new TypeError("Second Range must be between 0 and 59.");
    }
    if (!isIntegerIn(request.tid, 0, 0xffff))
      throw new TypeError("TID must be between 0 and 65535.");
  }

  if (gen5IdTaskEvaluationCount(request) > GEN5_ID_MAX_EVALUATIONS) {
    throw new TypeError("Gen 5 ID range exceeds the browser task limit.");
  }
  return request;
}

export function validateGen5IdResult(
  request: Gen5IdRequest,
  result: Gen5IdResult,
) {
  if (!HEX_16.test(result.seed))
    throw new TypeError("Gen 5 ID result contains an invalid Seed.");
  const dateTime = ISO_DATE_TIME.exec(result.dateTime);
  if (!dateTime)
    throw new TypeError("Gen 5 ID result contains an invalid date/time.");
  const date = parseDate(dateTime[1]);
  const hour = Number(dateTime[2]);
  const minute = Number(dateTime[3]);
  const second = Number(dateTime[4]);
  if (hour > 23 || minute > 59 || second > 59)
    throw new TypeError("Gen 5 ID result contains an invalid date/time.");

  if (
    !isIntegerIn(
      result.timer0,
      request.profile.timer0Min,
      request.profile.timer0Max,
    ) ||
    !isGen5IdButtonMaskAllowed(request.profile, result.buttonMask)
  ) {
    throw new TypeError("Gen 5 ID result contains invalid profile values.");
  }
  if (
    !isIntegerIn(result.initialAdvances, 0, 0xffff_ffff) ||
    !isIntegerIn(result.advances, 0, 0xffff_ffff) ||
    request.maxAdvances > 0xffff_ffff - result.initialAdvances ||
    result.advances < result.initialAdvances ||
    result.advances > result.initialAdvances + request.maxAdvances
  ) {
    throw new TypeError("Gen 5 ID result contains invalid advances.");
  }
  if (
    !isIntegerIn(result.tid, 0, 0xffff) ||
    !isIntegerIn(result.sid, 0, 0xffff) ||
    !isIntegerIn(result.tsv, 0, 0x1fff) ||
    result.tsv !== (result.tid ^ result.sid) >>> 3
  ) {
    throw new TypeError("Gen 5 ID result contains invalid ID values.");
  }

  const dateText = dateTime[1];
  if (request.mode === "seedFinder") {
    if (
      dateText !== request.date ||
      hour !== request.hour ||
      minute !== request.minute ||
      second < request.minSecond ||
      second > request.maxSecond ||
      result.tid !== request.tid
    ) {
      throw new TypeError(
        "Gen 5 ID result does not match the Seed Finder request.",
      );
    }
  } else {
    const start = parseDate(request.startDate);
    const end = parseDate(request.endDate);
    if (date < start || date > end)
      throw new TypeError(
        "Gen 5 ID result is outside the requested date range.",
      );
    if (request.useTID && result.tid !== request.tid)
      throw new TypeError("Gen 5 ID result does not match the requested TID.");
    if (request.useSID && result.sid !== request.sid)
      throw new TypeError("Gen 5 ID result does not match the requested SID.");
    if (request.usePID) {
      const psv = ((request.pid >>> 16) ^ (request.pid & 0xffff)) >>> 3;
      const pidBit = ((request.pid >>> 31) ^ (request.pid & 1)) !== 0;
      const idBit = ((result.tid & 1) ^ (result.sid & 1)) !== 0;
      if (result.tsv !== psv || (request.useXOR && idBit !== pidBit))
        throw new TypeError(
          "Gen 5 ID result does not match the requested PID.",
        );
    }
  }
  return result;
}

export function splitGen5IdRequest(
  request: Gen5IdRequest,
  workers: number,
): Gen5IdChunk[] {
  validateGen5IdRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  const unitCount = gen5IdUnitCount(request);
  if (unitCount === 0) return [];
  const seconds =
    request.mode === "search"
      ? 86_400
      : request.minSecond > request.maxSecond
        ? 0
        : request.maxSecond - request.minSecond + 1;
  const evaluationsPerUnit = seconds * (request.maxAdvances + 1);
  const responsiveUnits = Math.max(
    1,
    Math.floor(2_000_000 / Math.max(1, evaluationsPerUnit)),
  );
  const minimumChunks = Math.min(unitCount, Math.max(1, workers * 4));
  const chunkCount = Math.min(
    unitCount,
    Math.max(minimumChunks, Math.ceil(unitCount / responsiveUnits)),
  );
  const base = Math.floor(unitCount / chunkCount);
  const remainder = unitCount % chunkCount;
  const chunks: Gen5IdChunk[] = [];
  let startUnit = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const count = base + (index < remainder ? 1 : 0);
    chunks.push({ index, startUnit, unitCount: count });
    startUnit += count;
  }
  return chunks;
}

export function formatGen5IdButtons(mask: number) {
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

export function normalizeGen5IdHex(value: string, length: number) {
  return value
    .replace(/^0x/i, "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, length)
    .toUpperCase()
    .replace(/^0+(?=.)/, "");
}
