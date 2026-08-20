export const GEN4_SEED_FINDER_API_VERSION = 1;
export const GEN4_SEED_FINDER_RESULT_WORDS = 10;
export const GEN4_SEED_FINDER_MAX_SEQUENCE = 32;
export const GEN4_SEED_FINDER_MAX_DELAY = 1_000_000;
export const GEN4_SEED_FINDER_MAX_DELAY_RANGE = 100_000;
export const GEN4_SEED_FINDER_MAX_RESULTS = 100_000;

export type Gen4SeedFinderGame = "dppt" | "hgss";

export interface Gen4SeedFinderRequest {
  readonly game: Gen4SeedFinderGame;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly minSecond: number;
  readonly maxSecond: number;
  readonly minDelay: number;
  readonly maxDelay: number;
  readonly filter: string;
  readonly sequenceCount: number;
}

export interface Gen4SeedFinderResult {
  readonly seed: number;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly delay: number;
  readonly sequenceLow: number;
  readonly sequenceHigh: number;
}

function isInteger(value: number) {
  return Number.isInteger(value);
}

function daysInMonth(year: number, month: number) {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month === 2 && (year % 4 === 0 || year % 400 === 0)
    ? 29
    : (days[month - 1] ?? 0);
}

export function sanitizeGen4SeedFinderFilter(
  value: string,
  game: Gen4SeedFinderGame,
) {
  const allowed = game === "dppt" ? /[HT]/i : /[EKP]/i;
  return [...value.toUpperCase()]
    .filter((character) => allowed.test(character))
    .join("");
}

export function packGen4SeedFinderFilter(
  filter: string,
  game: Gen4SeedFinderGame,
) {
  const sanitized = sanitizeGen4SeedFinderFilter(filter, game).slice(
    0,
    GEN4_SEED_FINDER_MAX_SEQUENCE,
  );
  let low = 0;
  let high = 0;
  for (const [index, character] of [...sanitized].entries()) {
    const value =
      game === "dppt"
        ? character === "H"
          ? 1
          : 0
        : character === "K"
          ? 1
          : character === "P"
            ? 2
            : 0;
    if (index < 16) low |= value << (index * 2);
    else high |= value << ((index - 16) * 2);
  }
  return {
    low: low >>> 0,
    high: high >>> 0,
    length: sanitized.length,
    value: sanitized,
  };
}

export function validateGen4SeedFinderRequest(request: Gen4SeedFinderRequest) {
  const errors: string[] = [];
  if (request.game !== "dppt" && request.game !== "hgss") errors.push("game");
  if (!isInteger(request.year) || request.year < 2000 || request.year > 2099)
    errors.push("year");
  if (!isInteger(request.month) || request.month < 1 || request.month > 12)
    errors.push("month");
  if (
    !isInteger(request.day) ||
    request.day < 1 ||
    request.day > daysInMonth(request.year, request.month)
  )
    errors.push("day");
  if (!isInteger(request.hour) || request.hour < 0 || request.hour > 23)
    errors.push("hour");
  if (!isInteger(request.minute) || request.minute < 0 || request.minute > 59)
    errors.push("minute");
  if (
    !isInteger(request.minSecond) ||
    request.minSecond < 0 ||
    request.minSecond > 59
  )
    errors.push("minSecond");
  if (
    !isInteger(request.maxSecond) ||
    request.maxSecond < request.minSecond ||
    request.maxSecond > 60
  )
    errors.push("maxSecond");
  if (
    !isInteger(request.minDelay) ||
    request.minDelay < 0 ||
    request.minDelay > GEN4_SEED_FINDER_MAX_DELAY
  )
    errors.push("minDelay");
  if (
    !isInteger(request.maxDelay) ||
    request.maxDelay < request.minDelay ||
    request.maxDelay > GEN4_SEED_FINDER_MAX_DELAY ||
    request.maxDelay - request.minDelay > GEN4_SEED_FINDER_MAX_DELAY_RANGE
  )
    errors.push("maxDelay");
  const packed = packGen4SeedFinderFilter(request.filter, request.game);
  if (
    !isInteger(request.sequenceCount) ||
    request.sequenceCount < 1 ||
    request.sequenceCount > GEN4_SEED_FINDER_MAX_SEQUENCE ||
    packed.length > request.sequenceCount
  )
    errors.push("sequenceCount");
  return errors;
}

export function decodeGen4SeedFinderResults(
  buffer: ArrayBuffer,
): Gen4SeedFinderResult[] {
  const words = new Uint32Array(buffer);
  if (words.length % GEN4_SEED_FINDER_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen IV Seed Finder result buffer.");
  return Array.from(
    { length: words.length / GEN4_SEED_FINDER_RESULT_WORDS },
    (_, index) => {
      const offset = index * GEN4_SEED_FINDER_RESULT_WORDS;
      return {
        seed: words[offset],
        year: words[offset + 1],
        month: words[offset + 2],
        day: words[offset + 3],
        hour: words[offset + 4],
        minute: words[offset + 5],
        second: words[offset + 6],
        delay: words[offset + 7],
        sequenceLow: words[offset + 8],
        sequenceHigh: words[offset + 9],
      };
    },
  );
}

export function formatGen4SeedFinderDate(
  result: Pick<
    Gen4SeedFinderResult,
    "year" | "month" | "day" | "hour" | "minute" | "second"
  >,
) {
  const two = (value: number) => String(value).padStart(2, "0");
  return `${result.year}-${two(result.month)}-${two(result.day)} ${two(result.hour)}:${two(result.minute)}:${two(result.second)}`;
}

export function formatGen4SeedFinderSequence(
  result: Pick<Gen4SeedFinderResult, "sequenceLow" | "sequenceHigh">,
  game: Gen4SeedFinderGame,
  length: number,
) {
  const bits =
    (BigInt(result.sequenceHigh) << 32n) | BigInt(result.sequenceLow);
  return Array.from({ length }, (_, index) => {
    const value = Number((bits >> BigInt(index * 2)) & 3n);
    return game === "dppt"
      ? value === 0
        ? "T"
        : "H"
      : (["E", "K", "P"][value] ?? "P");
  }).join("");
}

export function gameToWasm(game: Gen4SeedFinderGame) {
  return game === "dppt" ? 0 : 1;
}
