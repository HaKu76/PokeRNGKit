import {
  decodeGen6StationaryResults,
  GEN6_STATIONARY_RESULT_WORDS,
  validateGen6StationaryRequest,
  type Gen6StationaryRequest,
  type Gen6StationaryResult,
} from "./domain";

export const GEN6_STATIONARY_TIME_API_VERSION = 1;
export const GEN6_STATIONARY_TIME_RESULT_WORDS = 19;
export const GEN6_STATIONARY_TIME_MAX_RESULTS = 100_000;
export const GEN6_STATIONARY_TIME_MAX_FRAME = 0xffff_ffff;
export const GEN6_STATIONARY_TIME_BROWSER_MAX_FRAME = 5_000_000;
export const GEN6_STATIONARY_TIME_BROWSER_MAX_STATES = 5_000_000;
export const GEN6_STATIONARY_TIME_MIN_EPOCH = 0n;

export interface Gen6StationaryTimeRequest extends Gen6StationaryRequest {
  startEpoch: bigint;
  endEpoch: bigint;
  saveVariable: number;
  timeVariable: number;
}

export interface Gen6StationaryTimeResult extends Gen6StationaryResult {
  initialSeed: number;
  epoch: bigint;
}

const EPOCH_OFFSET = 946_684_800_000n;

function integerIn(value: unknown, min: number, max: number) {
  return (
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max
  );
}

export function gen6StationaryTimeEpochFromInput(value: string, offset = 0) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (!match) return Number.NaN;
  const parts = match.slice(1).map(Number);
  const milliseconds = Date.UTC(
    parts[0],
    parts[1] - 1,
    parts[2],
    parts[3],
    parts[4],
    parts[5] ?? 0,
  );
  const date = new Date(milliseconds);
  if (
    date.getUTCFullYear() !== parts[0] ||
    date.getUTCMonth() !== parts[1] - 1 ||
    date.getUTCDate() !== parts[2] ||
    date.getUTCHours() !== parts[3] ||
    date.getUTCMinutes() !== parts[4] ||
    date.getUTCSeconds() !== (parts[5] ?? 0)
  )
    return Number.NaN;
  return BigInt(milliseconds) + BigInt(offset) - EPOCH_OFFSET;
}

export function formatGen6StationaryTimeEpoch(epoch: bigint, offset = 0) {
  return new Date(Number(epoch + EPOCH_OFFSET - BigInt(offset)))
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export function gen6StationaryTimeTaskCount(
  request: Gen6StationaryTimeRequest,
) {
  const seconds = (request.endEpoch - request.startEpoch) / 1000n;
  const frames = BigInt(request.maxFrame - request.minFrame + 1);
  const total = (seconds + 1n) * frames;
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("Gen VI Time Finder search range is too large.");
  return Number(total);
}

export function validateGen6StationaryTimeRequest(
  request: Gen6StationaryTimeRequest,
) {
  validateGen6StationaryRequest(request);
  if (
    !integerIn(request.saveVariable, 0, 0xffff_ffff) ||
    !integerIn(request.timeVariable, 0, 0xffff_ffff)
  )
    throw new TypeError("Save Variable or Time Variable is outside its range.");
  if (
    typeof request.startEpoch !== "bigint" ||
    typeof request.endEpoch !== "bigint"
  )
    throw new TypeError("Time Finder epochs must be integers.");
  if (request.startEpoch < GEN6_STATIONARY_TIME_MIN_EPOCH)
    throw new RangeError("Start date must be at least 2000-01-01.");
  if (request.endEpoch < request.startEpoch)
    throw new RangeError("End date must not be before the start date.");
  if (request.startEpoch % 1000n !== 0n || request.endEpoch % 1000n !== 0n)
    throw new RangeError("Time Finder dates must align to whole seconds.");
  if (!integerIn(request.minFrame, 0, GEN6_STATIONARY_TIME_BROWSER_MAX_FRAME))
    throw new TypeError("Initial Frame is outside the browser range.");
  if (
    !integerIn(
      request.maxFrame,
      request.minFrame,
      GEN6_STATIONARY_TIME_MAX_FRAME,
    ) ||
    request.maxFrame > GEN6_STATIONARY_TIME_BROWSER_MAX_FRAME
  )
    throw new TypeError("Max Frame is outside the browser range.");
  if (!integerIn(request.resultLimit, 1, GEN6_STATIONARY_TIME_MAX_RESULTS))
    throw new TypeError("Result limit is outside its range.");
  const states = gen6StationaryTimeTaskCount(request);
  if (states > GEN6_STATIONARY_TIME_BROWSER_MAX_STATES)
    throw new RangeError(
      "Gen VI Time Finder range exceeds the browser task limit.",
    );
  return request;
}

export function decodeGen6StationaryTimeResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_STATIONARY_TIME_RESULT_WORDS !== 0)
    throw new RangeError(
      "Invalid Gen VI Stationary Time Finder result buffer length.",
    );
  return Array.from(
    { length: words.length / GEN6_STATIONARY_TIME_RESULT_WORDS },
    (_, index): Gen6StationaryTimeResult => {
      const offset = index * GEN6_STATIONARY_TIME_RESULT_WORDS;
      const base = decodeGen6StationaryResults(
        words.slice(offset, offset + GEN6_STATIONARY_RESULT_WORDS).buffer,
      )[0];
      return {
        ...base,
        initialSeed: words[offset + 16],
        epoch: (BigInt(words[offset + 18]) << 32n) | BigInt(words[offset + 17]),
      };
    },
  );
}

export function validateGen6StationaryTimeResult(
  request: Gen6StationaryTimeRequest,
  result: Gen6StationaryTimeResult,
) {
  if (
    !integerIn(result.initialSeed, 0, 0xffff_ffff) ||
    result.epoch < request.startEpoch ||
    result.epoch > request.endEpoch ||
    result.epoch % 1000n !== 0n
  )
    throw new TypeError(
      "Gen VI Stationary Time Finder result is outside the request.",
    );
  return result;
}

export function gen6StationaryTimeResultLimitReached(
  request: Gen6StationaryTimeRequest,
  epoch: bigint,
  count: number,
  sessionLimitReached: boolean,
) {
  return (
    sessionLimitReached ||
    (count >= request.resultLimit && epoch < request.endEpoch)
  );
}
