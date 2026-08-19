import {
  type Gen7EventGameVersion,
  type Gen7EventIvTuple,
  type Gen7EventSettings,
  type Gen7EventResult,
} from "./domain";

export const GEN7_EVENT_TIME_API_VERSION = 1;
export const GEN7_EVENT_TIME_REQUEST_WORDS = 45;
export const GEN7_EVENT_TIME_RESULT_WORDS = 8;
export const GEN7_EVENT_TIME_STEP_SIZE = 2_048;
export const GEN7_EVENT_TIME_MAX_RESULTS = 100_000;
export const GEN7_EVENT_TIME_MAX_FRAME = 0xffff_ffff;
export const GEN7_EVENT_TIME_BROWSER_MAX_FRAME = 5_000_000;
export const GEN7_EVENT_TIME_BROWSER_MAX_STATES = 5_000_000;
export const GEN7_EVENT_TIME_MIN_EPOCH = 0n;

export type Gen7EventTimeIvTuple = Gen7EventIvTuple;

export interface Gen7EventTimeFilters {
  disabled: boolean;
  shiny: "any" | "shiny" | "square";
  gender: "any" | "male" | "female";
  ability: "any" | "first" | "second" | "hidden";
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen7EventTimeIvTuple;
  ivMax: Gen7EventTimeIvTuple;
}

export type Gen7EventTimeSettings = Pick<
  Gen7EventSettings,
  | "fixedIvs"
  | "randomPerfectIvCount"
  | "abilityLocked"
  | "ability"
  | "natureLocked"
  | "nature"
  | "genderLocked"
  | "gender"
  | "yourId"
  | "isEgg"
  | "otherInfo"
  | "pidType"
  | "tid"
  | "sid"
  | "ec"
  | "pid"
>;

export interface Gen7EventTimeRequest {
  version: Gen7EventGameVersion;
  startEpoch: bigint;
  endEpoch: bigint;
  tick: number;
  offset: number;
  profileTid: number;
  profileSid: number;
  minFrame: number;
  maxFrame: number;
  event: Gen7EventTimeSettings;
  filters: Gen7EventTimeFilters;
  resultLimit: number;
}

export interface Gen7EventTimeResult extends Pick<
  Gen7EventResult,
  | "frame"
  | "ec"
  | "pid"
  | "ivs"
  | "nature"
  | "ability"
  | "gender"
  | "hiddenPower"
  | "shiny"
> {
  initialSeed: number;
  epoch: bigint;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const EPOCH_OFFSET = 946_684_800_000n;

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

export function gen7EventTimeEpochFromInput(value: string, offset: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (!match) return Number.NaN;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const parts = [
    Number(yearText),
    Number(monthText),
    Number(dayText),
    Number(hourText),
    Number(minuteText),
    Number(secondText ?? 0),
  ] as const;
  const milliseconds = Date.UTC(
    parts[0],
    parts[1] - 1,
    parts[2],
    parts[3],
    parts[4],
    parts[5],
  );
  const normalized = new Date(milliseconds);
  if (
    normalized.getUTCFullYear() !== parts[0] ||
    normalized.getUTCMonth() !== parts[1] - 1 ||
    normalized.getUTCDate() !== parts[2] ||
    normalized.getUTCHours() !== parts[3] ||
    normalized.getUTCMinutes() !== parts[4] ||
    normalized.getUTCSeconds() !== parts[5]
  )
    return Number.NaN;
  return BigInt(milliseconds) + BigInt(offset) - EPOCH_OFFSET;
}

export function formatGen7EventTimeEpoch(epoch: bigint, offset: number) {
  return new Date(Number(epoch + EPOCH_OFFSET - BigInt(offset)))
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export function gen7EventTimeTaskCount(request: Gen7EventTimeRequest) {
  const seconds = (request.endEpoch - request.startEpoch) / 1000n;
  const frames = BigInt(request.maxFrame - request.minFrame + 1);
  const total = (seconds + 1n) * frames;
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("Event Time Finder search range is too large.");
  return Number(total);
}

export function validateGen7EventTimeRequest(request: Gen7EventTimeRequest) {
  if (!["sun", "moon", "ultra-sun", "ultra-moon"].includes(request.version))
    throw new TypeError("Unsupported Gen 7 game version.");
  if (
    typeof request.startEpoch !== "bigint" ||
    typeof request.endEpoch !== "bigint"
  )
    throw new TypeError("Time Finder epochs must be integers.");
  if (request.startEpoch < GEN7_EVENT_TIME_MIN_EPOCH)
    throw new RangeError("Start date must be at least 2000-01-01.");
  if (request.endEpoch < request.startEpoch)
    throw new RangeError("End date must not be before the start date.");
  if (!integerIn(request.tick, 0, UINT32_MAX))
    throw new TypeError("Tick must be between 00000000 and FFFFFFFF.");
  if (!integerIn(request.offset, 0, UINT32_MAX))
    throw new TypeError("Offset must be between 0 and 4294967295.");
  if (
    (request.startEpoch - BigInt(request.offset)) % 1000n !== 0n ||
    (request.endEpoch - BigInt(request.offset)) % 1000n !== 0n
  )
    throw new RangeError("Time Finder dates must align to whole seconds.");
  if (!integerIn(request.minFrame, 1, GEN7_EVENT_TIME_BROWSER_MAX_FRAME))
    throw new TypeError("Initial Frame must be at least 1.");
  if (!integerIn(request.maxFrame, request.minFrame, GEN7_EVENT_TIME_MAX_FRAME))
    throw new TypeError("Max Frame must be at least Initial Frame.");
  if (request.maxFrame > GEN7_EVENT_TIME_BROWSER_MAX_FRAME)
    throw new RangeError("The browser build supports frames through 5000000.");
  if (
    !integerIn(request.profileTid, 0, 65535) ||
    !integerIn(request.profileSid, 0, 65535)
  )
    throw new TypeError("Profile TID or SID is outside its range.");

  const event = request.event;
  if (!Array.isArray(event.fixedIvs) || event.fixedIvs.length !== 6)
    throw new TypeError("Six fixed IV settings are required.");
  for (const iv of event.fixedIvs)
    if (!integerIn(iv, -1, 31))
      throw new TypeError("Fixed IVs must use -1 or values from 0 to 31.");
  if (!integerIn(event.randomPerfectIvCount, 0, 99))
    throw new TypeError("Random perfect IV count must be between 0 and 99.");
  const freeIvs = event.fixedIvs.filter((iv) => iv < 0).length;
  if (event.randomPerfectIvCount > freeIvs || event.randomPerfectIvCount > 6)
    throw new TypeError(
      "Random perfect IV count exceeds the available IV slots.",
    );
  if (
    !boolean(event.abilityLocked) ||
    !boolean(event.natureLocked) ||
    !boolean(event.genderLocked) ||
    !boolean(event.yourId) ||
    !boolean(event.isEgg) ||
    !boolean(event.otherInfo)
  )
    throw new TypeError("Invalid Event flag.");
  if (
    !integerIn(event.ability, 0, event.abilityLocked ? 2 : 1) ||
    !integerIn(event.nature, 0, 24) ||
    !integerIn(event.gender, 0, 2) ||
    !["random", "nonshiny", "shiny", "specified"].includes(event.pidType)
  )
    throw new TypeError("Invalid Event lock or PID setting.");
  if (
    !integerIn(event.tid, 0, 65535) ||
    !integerIn(event.sid, 0, 65535) ||
    !integerIn(event.ec, 0, UINT32_MAX) ||
    !integerIn(event.pid, 0, UINT32_MAX)
  )
    throw new TypeError("Event IDs, EC or PID are outside their range.");

  const filters = request.filters;
  if (
    !boolean(filters.disabled) ||
    !["any", "shiny", "square"].includes(filters.shiny) ||
    !["any", "male", "female"].includes(filters.gender) ||
    !["any", "first", "second", "hidden"].includes(filters.ability) ||
    !integerIn(filters.natureMask, 0, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 0, 0xffff)
  )
    throw new TypeError("Invalid Event filter.");
  for (let index = 0; index < 6; index++) {
    if (
      !integerIn(filters.ivMin[index], 0, 31) ||
      !integerIn(filters.ivMax[index], filters.ivMin[index], 31)
    )
      throw new TypeError("IV filter minimums must not exceed maximums.");
  }
  if (!integerIn(request.resultLimit, 1, GEN7_EVENT_TIME_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  if (gen7EventTimeTaskCount(request) > GEN7_EVENT_TIME_BROWSER_MAX_STATES)
    throw new RangeError(
      "Event Time Finder range exceeds the browser task limit.",
    );
  return request;
}

export function gen7EventTimeResultPassesFilters(
  request: Gen7EventTimeRequest,
  result: Gen7EventTimeResult,
) {
  const filters = request.filters;
  if (filters.disabled) return true;
  if (filters.shiny === "shiny" && result.shiny === 0) return false;
  if (filters.shiny === "square" && result.shiny !== 2) return false;
  if (filters.gender === "male" && result.gender !== 1) return false;
  if (filters.gender === "female" && result.gender !== 2) return false;
  if (filters.ability === "first" && result.ability !== 1) return false;
  if (filters.ability === "second" && result.ability !== 2) return false;
  if (filters.ability === "hidden" && result.ability !== 3) return false;
  if (filters.natureMask !== 0 && !(filters.natureMask & (1 << result.nature)))
    return false;
  if (
    filters.hiddenPowerMask !== 0 &&
    !(filters.hiddenPowerMask & (1 << result.hiddenPower))
  )
    return false;
  return result.ivs.every(
    (iv, index) => iv >= filters.ivMin[index] && iv <= filters.ivMax[index],
  );
}

export function encodeGen7EventTimeRequest(
  request: Gen7EventTimeRequest,
  seed: number,
) {
  validateGen7EventTimeRequest(request);
  const event = request.event;
  const words = new Uint32Array(GEN7_EVENT_TIME_REQUEST_WORDS);
  words.set([
    seed >>> 0,
    request.minFrame,
    request.maxFrame,
    ["sun", "moon", "ultra-sun", "ultra-moon"].indexOf(request.version),
    event.tid,
    event.sid,
    request.profileTid,
    request.profileSid,
    event.yourId ? 1 : 0,
    event.otherInfo ? 1 : 0,
    ["random", "nonshiny", "shiny", "specified"].indexOf(event.pidType),
    event.ec,
    event.pid,
    event.randomPerfectIvCount,
    event.abilityLocked ? 1 : 0,
    event.ability,
    event.natureLocked ? 1 : 0,
    event.nature,
    event.genderLocked ? 1 : 0,
    event.gender,
  ]);
  let offset = 20;
  for (const iv of event.fixedIvs) words[offset++] = iv >>> 0;
  words[offset++] = request.filters.disabled ? 1 : 0;
  words[offset++] = { any: 0, shiny: 1, square: 2 }[request.filters.shiny];
  words[offset++] = { any: 0, male: 1, female: 2 }[request.filters.gender];
  words[offset++] = { any: 0, first: 1, second: 2, hidden: 3 }[
    request.filters.ability
  ];
  words[offset++] = request.filters.natureMask;
  words[offset++] = request.filters.hiddenPowerMask;
  for (const value of request.filters.ivMin) words[offset++] = value;
  for (const value of request.filters.ivMax) words[offset++] = value;
  words[offset++] = request.resultLimit;
  if (offset !== GEN7_EVENT_TIME_REQUEST_WORDS)
    throw new Error(
      "Gen 7 Event Time Finder request packing changed unexpectedly.",
    );
  return words;
}

export function decodeGen7EventTimeResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN7_EVENT_TIME_RESULT_WORDS !== 0)
    throw new RangeError(
      "Invalid Gen 7 Event Time Finder result buffer length.",
    );
  const results: Gen7EventTimeResult[] = [];
  for (
    let offset = 0;
    offset < words.length;
    offset += GEN7_EVENT_TIME_RESULT_WORDS
  ) {
    const metadata = words[offset + 4];
    const pid = words[offset + 2];
    const xorValue = (pid >>> 16) ^ (pid & 0xffff);
    const ivWord = words[offset + 3];
    results.push({
      frame: words[offset],
      ec: words[offset + 1],
      pid,
      ivs: [
        ivWord & 31,
        (ivWord >>> 5) & 31,
        (ivWord >>> 10) & 31,
        (ivWord >>> 15) & 31,
        (ivWord >>> 20) & 31,
        (ivWord >>> 25) & 31,
      ],
      nature: metadata & 31,
      ability: (metadata >>> 5) & 3,
      gender: (metadata >>> 7) & 3,
      hiddenPower: (metadata >>> 9) & 15,
      shiny: (metadata >>> 14) & 1 ? 2 : (metadata >>> 13) & 1,
      initialSeed: words[offset + 5],
      epoch: (BigInt(words[offset + 7]) << 32n) | BigInt(words[offset + 6]),
    });
    void xorValue;
  }
  return results;
}

export function validateGen7EventTimeResult(
  request: Gen7EventTimeRequest,
  result: Gen7EventTimeResult,
) {
  if (!integerIn(result.frame, request.minFrame, request.maxFrame))
    throw new TypeError("Event Time Finder frame is outside the request.");
  if (
    result.epoch < request.startEpoch ||
    result.epoch > request.endEpoch ||
    (result.epoch - request.startEpoch) % 1000n !== 0n
  )
    throw new TypeError("Event Time Finder epoch is outside the request.");
  if (!integerIn(result.initialSeed, 0, UINT32_MAX))
    throw new TypeError("Invalid Event Time Finder initial seed.");
  if (
    !integerIn(result.ec, 0, UINT32_MAX) ||
    !integerIn(result.pid, 0, UINT32_MAX)
  )
    throw new TypeError("Invalid Event Time Finder EC or PID.");
  if (
    result.ivs.length !== 6 ||
    result.ivs.some((iv) => !integerIn(iv, 0, 31)) ||
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.ability, 1, 3) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.hiddenPower, 0, 15) ||
    !integerIn(result.shiny, 0, 2)
  )
    throw new TypeError("Invalid Event Time Finder result metadata.");
  return result;
}

export function gen7EventTimeResultLimitReached(
  request: Gen7EventTimeRequest,
  epoch: bigint,
  totalResults: number,
  sessionLimitReached: boolean,
) {
  return (
    sessionLimitReached ||
    (totalResults >= request.resultLimit && epoch < request.endEpoch)
  );
}
