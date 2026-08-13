export const POKERUS_FINDER_API_VERSION = 1;
export const POKERUS_GEN3_MAX_FRAMES = 9_999_999;
export const POKERUS_DP_MAX_FRAMES = 99_999;

export type PokerusFinderMode = "gen3" | "dp" | "pthgss";

export interface PokerusGen3Request {
  seed: number;
  frame: number;
  delay: number;
  maxFrames: number;
}

export interface PokerusPtHgssRequest {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface PokerusFinderState {
  frame: number;
  seed: number;
  delay?: number;
  second?: number;
}

const isUint32 = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;

export function validatePokerusGen3Request(
  request: PokerusGen3Request,
): string[] {
  const errors: string[] = [];
  const isGen3 = request.maxFrames === POKERUS_GEN3_MAX_FRAMES;
  const isDp = request.maxFrames === POKERUS_DP_MAX_FRAMES;
  if (!isUint32(request.seed) || (isGen3 && request.seed > 0xffff))
    errors.push("seed");
  if (
    !Number.isInteger(request.frame) ||
    request.frame < 0 ||
    request.frame > request.maxFrames
  )
    errors.push("frame");
  if (
    !Number.isInteger(request.delay) ||
    request.delay < 0 ||
    request.delay > 999
  )
    errors.push("delay");
  if (
    !Number.isInteger(request.maxFrames) ||
    request.maxFrames < 1 ||
    (!isGen3 && !isDp)
  )
    errors.push("maxFrames");
  return errors;
}

export function validatePokerusPtHgssRequest(
  request: PokerusPtHgssRequest,
): string[] {
  const errors: string[] = [];
  if (
    !Number.isInteger(request.year) ||
    request.year < 2000 ||
    request.year > 2099
  )
    errors.push("year");
  if (
    !Number.isInteger(request.month) ||
    request.month < 1 ||
    request.month > 12
  )
    errors.push("month");
  if (!Number.isInteger(request.day) || request.day < 1 || request.day > 31)
    errors.push("day");
  if (!Number.isInteger(request.hour) || request.hour < 0 || request.hour > 23)
    errors.push("hour");
  if (
    !Number.isInteger(request.minute) ||
    request.minute < 0 ||
    request.minute > 59
  )
    errors.push("minute");
  return errors;
}

export function decodePokerusFinderStates(
  buffer: ArrayBuffer,
  hasDelay: boolean,
): PokerusFinderState[] {
  const words = new Uint32Array(buffer);
  const wordsPerState = hasDelay ? 4 : 2;
  if (words.length % wordsPerState !== 0)
    throw new RangeError("Invalid Pokerus Finder result buffer length.");
  const states = new Array<PokerusFinderState>(words.length / wordsPerState);
  for (
    let source = 0, target = 0;
    source < words.length;
    source += wordsPerState, target++
  ) {
    states[target] = hasDelay
      ? {
          frame: words[source],
          seed: words[source + 1],
          delay: words[source + 2],
          second: words[source + 3],
        }
      : { frame: words[source], seed: words[source + 1] };
  }
  return states;
}

export function formatPokerusSeed(seed: number, width?: 4 | 8) {
  const value = seed.toString(16).toUpperCase();
  return width === undefined ? value : value.padStart(width, "0");
}
