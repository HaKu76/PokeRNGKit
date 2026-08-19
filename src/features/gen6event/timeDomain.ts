import {
  decodeGen6EventResults,
  GEN6_EVENT_RESULT_WORDS,
  validateGen6EventRequest,
  type Gen6EventRequest,
  type Gen6EventResult,
} from "./domain";

export const GEN6_EVENT_TIME_API_VERSION = 1;
export const GEN6_EVENT_TIME_RESULT_WORDS = 19;
export const GEN6_EVENT_TIME_MAX_RESULTS = 100_000;
export const GEN6_EVENT_TIME_BROWSER_MAX_FRAME = 5_000_000;
export const GEN6_EVENT_TIME_MAX_FRAME = 0xffff_ffff;
export const GEN6_EVENT_TIME_MAX_STATES = 5_000_000;
const EPOCH_OFFSET = 946_684_800_000n;

export interface Gen6EventTimeRequest extends Gen6EventRequest {
  startEpoch: bigint;
  endEpoch: bigint;
  saveVariable: number;
  timeVariable: number;
}
export interface Gen6EventTimeResult extends Gen6EventResult {
  initialSeed: number;
  epoch: bigint;
}
function integerIn(value: unknown, min: number, max: number) {
  return (
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max
  );
}
export function gen6EventTimeEpochFromInput(value: string, offset = 0) {
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
export function formatGen6EventTimeEpoch(epoch: bigint, offset = 0) {
  return new Date(Number(epoch + EPOCH_OFFSET - BigInt(offset)))
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}
export function gen6EventTimeTaskCount(request: Gen6EventTimeRequest) {
  const total =
    ((request.endEpoch - request.startEpoch) / 1000n + 1n) *
    BigInt(request.maxFrame - request.minFrame + 1);
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("Gen VI Event Time Finder search range is too large.");
  return Number(total);
}
export function validateGen6EventTimeRequest(request: Gen6EventTimeRequest) {
  validateGen6EventRequest(request);
  if (
    request.startEpoch < 0n ||
    request.endEpoch < request.startEpoch ||
    request.startEpoch % 1000n !== 0n ||
    request.endEpoch % 1000n !== 0n
  )
    throw new RangeError(
      "Event Time Finder dates must be an ordered whole-second range from 2000-01-01.",
    );
  if (
    !integerIn(request.saveVariable, 0, 0xffff_ffff) ||
    !integerIn(request.timeVariable, 0, 0xffff_ffff)
  )
    throw new TypeError("Save Variable or Time Variable is outside its range.");
  if (
    request.maxFrame > GEN6_EVENT_TIME_BROWSER_MAX_FRAME ||
    request.minFrame < 0
  )
    throw new RangeError(
      "Gen VI Event Time Finder frames are limited to 5000000.",
    );
  if (gen6EventTimeTaskCount(request) > GEN6_EVENT_TIME_MAX_STATES)
    throw new RangeError(
      "Gen VI Event Time Finder range exceeds the browser task limit.",
    );
  return request;
}
export function decodeGen6EventTimeResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_EVENT_TIME_RESULT_WORDS !== 0)
    throw new RangeError(
      "Invalid Gen VI Event Time Finder result buffer length.",
    );
  return Array.from(
    { length: words.length / GEN6_EVENT_TIME_RESULT_WORDS },
    (_, index): Gen6EventTimeResult => {
      const offset = index * GEN6_EVENT_TIME_RESULT_WORDS;
      const base = decodeGen6EventResults(
        words.slice(offset, offset + GEN6_EVENT_RESULT_WORDS).buffer,
      )[0];
      return {
        ...base,
        initialSeed: words[offset + 16],
        epoch: (BigInt(words[offset + 18]) << 32n) | BigInt(words[offset + 17]),
      };
    },
  );
}
export function validateGen6EventTimeResult(
  request: Gen6EventTimeRequest,
  result: Gen6EventTimeResult,
) {
  if (
    result.epoch < request.startEpoch ||
    result.epoch > request.endEpoch ||
    result.epoch % 1000n !== 0n ||
    !integerIn(result.initialSeed, 0, 0xffff_ffff)
  )
    throw new TypeError(
      "Gen VI Event Time Finder result is outside the request.",
    );
  return result;
}
