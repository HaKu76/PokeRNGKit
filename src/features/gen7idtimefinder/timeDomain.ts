import {
  createGen7IdStateMatcher,
  gen7IdStartingFrame,
  type Gen7GameVersion,
  type Gen7IdFilters,
  type Gen7IdState,
} from "../gen7id/domain";

export const GEN7_ID_TIME_API_VERSION = 1;
export const GEN7_ID_TIME_RESULT_WORDS = 10;
export const GEN7_ID_TIME_MAX_RESULTS = 100_000;
export const GEN7_ID_TIME_MAX_FRAME = 5_000_000;
export const GEN7_ID_TIME_MAX_STATES = 5_000_000;
export const GEN7_ID_TIME_MIN_EPOCH = 0n;
export const GEN7_ID_TIME_STEP_SIZE = 100_000;

export type Gen7IdTimeVersion = Gen7GameVersion;

export interface Gen7IdTimeRequest {
  version: Gen7IdTimeVersion;
  startEpoch: bigint;
  endEpoch: bigint;
  tick: number;
  offset: number;
  minFrame: number;
  maxFrame: number;
  correction: number;
  filters: Gen7IdFilters;
  resultLimit: number;
}

export interface Gen7IdTimeResult extends Gen7IdState {
  initialSeed: number;
  epoch: bigint;
}

const UINT32_MAX = 0xffff_ffff;
const EPOCH_OFFSET = 946_684_800_000n;

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

export function gen7IdTimeEpochFromInput(value: string, offset: number) {
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

export function formatGen7IdTimeEpoch(epoch: bigint, offset: number) {
  return new Date(Number(epoch + EPOCH_OFFSET - BigInt(offset)))
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export function gen7IdTimeTaskCount(request: Gen7IdTimeRequest) {
  const seconds = (request.endEpoch - request.startEpoch) / 1000n;
  const frames = BigInt(request.maxFrame - request.minFrame + 1);
  const total = (seconds + 1n) * frames;
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("Gen 7 ID Time Finder search range is too large.");
  return Number(total);
}

export function validateGen7IdTimeRequest(request: Gen7IdTimeRequest) {
  if (!["sun", "moon", "ultra-sun", "ultra-moon"].includes(request.version))
    throw new TypeError("Unsupported Gen 7 game version.");
  if (
    typeof request.startEpoch !== "bigint" ||
    typeof request.endEpoch !== "bigint"
  )
    throw new TypeError("Time Finder epochs must be integers.");
  if (request.startEpoch < GEN7_ID_TIME_MIN_EPOCH)
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
  const minimumFrame = gen7IdStartingFrame(request.version);
  if (!integerIn(request.minFrame, minimumFrame, GEN7_ID_TIME_MAX_FRAME))
    throw new TypeError("Initial Frame is outside the selected game's range.");
  if (!integerIn(request.maxFrame, request.minFrame, GEN7_ID_TIME_MAX_FRAME))
    throw new TypeError("Max Frame must be at least Initial Frame.");
  if (request.maxFrame > GEN7_ID_TIME_MAX_FRAME)
    throw new RangeError("The browser build supports frames through 5000000.");
  if (!integerIn(request.correction, 0, 16))
    throw new TypeError("Clock correction must be between 0 and 16.");
  if (!integerIn(request.resultLimit, 1, GEN7_ID_TIME_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  if (gen7IdTimeTaskCount(request) > GEN7_ID_TIME_MAX_STATES)
    throw new RangeError(
      "Gen 7 ID Time Finder range exceeds the browser task limit.",
    );
  return request;
}

export function gen7IdTimeResultPassesFilters(
  request: Gen7IdTimeRequest,
  result: Gen7IdTimeResult,
) {
  return createGen7IdStateMatcher(request.filters)(result);
}

export function encodeGen7IdTimeResults(states: readonly Gen7IdTimeResult[]) {
  const words = new Uint32Array(states.length * GEN7_ID_TIME_RESULT_WORDS);
  for (let index = 0; index < states.length; index++) {
    const state = states[index];
    const offset = index * GEN7_ID_TIME_RESULT_WORDS;
    words[offset] = Number(state.rand64 & 0xffff_ffffn);
    words[offset + 1] = Number((state.rand64 >> 32n) & 0xffff_ffffn);
    words[offset + 2] = (state.tid | (state.sid << 16)) >>> 0;
    words[offset + 3] = (state.tsv | (state.trv << 16)) >>> 0;
    words[offset + 4] = state.advances;
    words[offset + 5] = state.g7tid;
    words[offset + 6] = state.clock;
    words[offset + 7] = state.initialSeed;
    words[offset + 8] = Number(state.epoch & 0xffff_ffffn);
    words[offset + 9] = Number((state.epoch >> 32n) & 0xffff_ffffn);
  }
  return words;
}

export function decodeGen7IdTimeResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN7_ID_TIME_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen 7 ID Time Finder result buffer length.");
  const results = new Array<Gen7IdTimeResult>(
    words.length / GEN7_ID_TIME_RESULT_WORDS,
  );
  for (
    let source = 0, target = 0;
    source < words.length;
    source += GEN7_ID_TIME_RESULT_WORDS, target++
  ) {
    const tidSid = words[source + 2];
    const tsvTrv = words[source + 3];
    results[target] = {
      advances: words[source + 4],
      rand64: BigInt(words[source]) | (BigInt(words[source + 1]) << 32n),
      tid: tidSid & 0xffff,
      sid: tidSid >>> 16,
      tsv: tsvTrv & 0xffff,
      trv: tsvTrv >>> 16,
      g7tid: words[source + 5],
      clock: words[source + 6],
      initialSeed: words[source + 7],
      epoch: (BigInt(words[source + 9]) << 32n) | BigInt(words[source + 8]),
    };
  }
  return results;
}

export function validateGen7IdTimeResult(
  request: Gen7IdTimeRequest,
  result: Gen7IdTimeResult,
) {
  if (!integerIn(result.advances, request.minFrame, request.maxFrame))
    throw new TypeError("Gen 7 ID Time Finder frame is outside the request.");
  if (
    result.epoch < request.startEpoch ||
    result.epoch > request.endEpoch ||
    (result.epoch - request.startEpoch) % 1000n !== 0n
  )
    throw new TypeError("Gen 7 ID Time Finder epoch is outside the request.");
  if (!integerIn(result.initialSeed, 0, UINT32_MAX))
    throw new TypeError("Invalid Gen 7 ID Time Finder initial seed.");
  if (
    !integerIn(result.tid, 0, 0xffff) ||
    !integerIn(result.sid, 0, 0xffff) ||
    !integerIn(result.tsv, 0, 0xffff) ||
    !integerIn(result.trv, 0, 0xf) ||
    !integerIn(result.g7tid, 0, 999999) ||
    !integerIn(result.clock, 0, 16)
  )
    throw new TypeError("Invalid Gen 7 ID Time Finder result metadata.");
  return result;
}
