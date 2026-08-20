import { DEFAULT_THREE_DS_GEN7_TIME_OFFSET } from "./domain";

export type ThreeDsProfileCalibratorVersion = "sun-moon" | "ultra-sun-moon";

export interface ThreeDsProfileCalibratorRequest {
  version: ThreeDsProfileCalibratorVersion;
  dateEpoch: bigint;
  initialSeed: number;
  baseTick: number;
  baseOffset: number;
  tickRange: number;
  offsetRange: number;
  resultLimit: number;
}

export interface ThreeDsProfileCalibratorResult {
  tick: number;
  offset: number;
}

export interface ThreeDsProfileCalibratorProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface ThreeDsProfileCalibratorSummary extends ThreeDsProfileCalibratorProgress {
  elapsedMs: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export const THREE_DS_PROFILE_CALIBRATOR_API_VERSION = 1;
export const THREE_DS_PROFILE_CALIBRATOR_RESULT_WORDS = 2;
export const THREE_DS_PROFILE_CALIBRATOR_MAX_RESULTS = 100_000;
export const THREE_DS_PROFILE_CALIBRATOR_MAX_STATES = 5_000_000;
export const THREE_DS_PROFILE_CALIBRATOR_MIN_EPOCH = 0n;
const UINT32_MAX = 0xffff_ffff;
const EPOCH_OFFSET = 946_684_800_000n;

export const THREE_DS_PROFILE_CALIBRATOR_DEFAULTS = {
  "sun-moon": {
    baseTick: 0x036e_c43b,
    baseOffset: DEFAULT_THREE_DS_GEN7_TIME_OFFSET,
    profileVersion: "sun" as const,
  },
  "ultra-sun-moon": {
    baseTick: 0x043b_1cf3,
    baseOffset: 56,
    profileVersion: "ultra-sun" as const,
  },
} as const;

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

export function profileCalibratorEpochFromInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (!match) return Number.NaN;
  const parts = match.slice(1).map((part) => Number(part ?? 0));
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
  return BigInt(milliseconds) - EPOCH_OFFSET;
}

export function profileCalibratorTaskCount(
  request: Pick<ThreeDsProfileCalibratorRequest, "tickRange" | "offsetRange">,
) {
  const total = BigInt(request.tickRange + 1) * BigInt(request.offsetRange + 1);
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("Profile Calibrator search range is too large.");
  return Number(total);
}

export function validateThreeDsProfileCalibratorRequest(
  request: ThreeDsProfileCalibratorRequest,
) {
  if (!(request.version in THREE_DS_PROFILE_CALIBRATOR_DEFAULTS))
    throw new TypeError("Unsupported Gen 7 Profile Calibrator version.");
  if (
    typeof request.dateEpoch !== "bigint" ||
    request.dateEpoch < THREE_DS_PROFILE_CALIBRATOR_MIN_EPOCH
  )
    throw new RangeError("Date/Time must be at least 2000-01-01.");
  if (!integerIn(request.initialSeed, 0, UINT32_MAX))
    throw new TypeError("Initial Seed must be between 00000000 and FFFFFFFF.");
  if (!integerIn(request.baseTick, 0, UINT32_MAX))
    throw new TypeError("Base Tick must be a 32-bit unsigned integer.");
  if (!integerIn(request.baseOffset, 0, UINT32_MAX))
    throw new TypeError("Base Offset must be a 32-bit unsigned integer.");
  if (!integerIn(request.tickRange, 0, UINT32_MAX))
    throw new TypeError("Tick Range must be between 0 and 4294967295.");
  if (!integerIn(request.offsetRange, 0, UINT32_MAX))
    throw new TypeError("Offset Range must be between 0 and 4294967295.");
  if (
    !integerIn(request.resultLimit, 1, THREE_DS_PROFILE_CALIBRATOR_MAX_RESULTS)
  )
    throw new TypeError("Result limit must be between 1 and 100000.");
  const totalStates = profileCalibratorTaskCount(request);
  if (totalStates > THREE_DS_PROFILE_CALIBRATOR_MAX_STATES)
    throw new RangeError(
      "Profile Calibrator range exceeds the browser task limit.",
    );
  return request;
}

export function encodeThreeDsProfileCalibratorResults(
  results: readonly ThreeDsProfileCalibratorResult[],
) {
  const words = new Uint32Array(
    results.length * THREE_DS_PROFILE_CALIBRATOR_RESULT_WORDS,
  );
  results.forEach((result, index) => {
    const offset = index * THREE_DS_PROFILE_CALIBRATOR_RESULT_WORDS;
    words[offset] = result.tick >>> 0;
    words[offset + 1] = result.offset >>> 0;
  });
  return words;
}

export function decodeThreeDsProfileCalibratorResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % THREE_DS_PROFILE_CALIBRATOR_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Profile Calibrator result buffer.");
  const results: ThreeDsProfileCalibratorResult[] = [];
  for (let index = 0; index < words.length; index += 2)
    results.push({ tick: words[index], offset: words[index + 1] });
  return results;
}

export function validateThreeDsProfileCalibratorResult(
  request: ThreeDsProfileCalibratorRequest,
  result: ThreeDsProfileCalibratorResult,
) {
  const tickDistance = Math.min(
    (result.tick - request.baseTick) >>> 0,
    (request.baseTick - result.tick) >>> 0,
  );
  const offsetDistance = Math.min(
    (result.offset - request.baseOffset) >>> 0,
    (request.baseOffset - result.offset) >>> 0,
  );
  if (tickDistance > request.tickRange || offsetDistance > request.offsetRange)
    throw new TypeError("Profile Calibrator result is outside the request.");
  return result;
}
