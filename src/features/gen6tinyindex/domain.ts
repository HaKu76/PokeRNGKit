export const GEN6_TINYINDEX_API_VERSION = 1;
export const GEN6_TINYINDEX_REQUEST_WORDS = 12;
export const GEN6_TINYINDEX_RESULT_WORDS = 8;
export const GEN6_TINYINDEX_MAX_INDEX = 10_000_000;
export const GEN6_TINYINDEX_MAX_MIN_INDEX = 250_000;
export const GEN6_TINYINDEX_MAX_RESULTS = 100_000;
export const GEN6_TINYINDEX_MAX_TASKS = 5_000_000;
export const GEN6_TINYINDEX_MAX_DATE_SECONDS = 31_622_400;
export const GEN6_TINYINDEX_STEP_SIZE = 2_048;

export type Gen6TinyIndexMode = "generator" | "date";
export type Gen6TinyIndexState = [number, number, number, number];

export interface Gen6TinyIndexFilters {
  disabled: boolean;
  regularExpression: boolean;
  indexText: string;
  stateText: string;
}

export interface Gen6TinyIndexRequest {
  mode: Gen6TinyIndexMode;
  state: Gen6TinyIndexState;
  baseSeed: number;
  minIndex: number;
  maxIndex: number;
  year: number;
  month: number;
  startSecond: number;
  secondCount: number;
  resultLimit: number;
  filters: Gen6TinyIndexFilters;
}

export interface Gen6TinyIndexResult {
  index: number;
  random: number;
  state: Gen6TinyIndexState;
  initialSeed: number;
  elapsedSecond: number;
}

interface PreparedFilters {
  disabled: boolean;
  regularExpression: boolean;
  indexLines: string[];
  indexPatterns: RegExp[];
  stateLines: string[];
  statePatterns: RegExp[];
}

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function splitLines(value: string) {
  return value === "" ? [] : value.replace(/\r\n?/g, "\n").split("\n");
}

function prepareFilters(filters: Gen6TinyIndexFilters): PreparedFilters {
  const indexLines = splitLines(filters.indexText);
  const stateLines = splitLines(filters.stateText);
  return {
    disabled: filters.disabled,
    regularExpression: filters.regularExpression,
    indexLines,
    indexPatterns:
      filters.regularExpression && !filters.disabled
        ? indexLines.map((line) => new RegExp(line))
        : [],
    stateLines,
    statePatterns:
      filters.regularExpression && !filters.disabled
        ? stateLines.map((line) => new RegExp(line))
        : [],
  };
}

function filtersMatch(
  filters: PreparedFilters,
  index: number,
  state: Gen6TinyIndexState,
) {
  if (filters.disabled) return true;
  if (filters.indexLines.length > 0) {
    const value = String(index);
    const matches = filters.regularExpression
      ? filters.indexPatterns.some((pattern) => pattern.test(value))
      : filters.indexLines.some(
          (line) => line !== "" && value.includes(line.trim()),
        );
    if (!matches) return false;
  }
  if (filters.stateLines.length > 0) {
    const value = formatGen6TinyIndexState(state);
    const matches = filters.regularExpression
      ? filters.statePatterns.some((pattern) => pattern.test(value))
      : filters.stateLines.some(
          (line) => line !== "" && value.includes(line.trim().toUpperCase()),
        );
    if (!matches) return false;
  }
  return true;
}

export function gen6TinyIndexTaskCount(request: Gen6TinyIndexRequest) {
  const indexes = request.maxIndex - request.minIndex + 1;
  return indexes * (request.mode === "date" ? request.secondCount : 1);
}

export function tinyFinderMonthOffsetSeconds(year: number, month: number) {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  let seconds = leap ? 86_400 : 0;
  for (let index = 0; index < month - 1; ++index)
    seconds += days[index] * 86_400;
  return seconds;
}

export function validateGen6TinyIndexRequest(request: Gen6TinyIndexRequest) {
  if (!(request.mode === "generator" || request.mode === "date"))
    throw new TypeError("TinyMT Index mode is invalid.");
  if (
    request.state.length !== 4 ||
    !request.state.every((value) => integerIn(value, 0, 0xffff_ffff))
  )
    throw new TypeError("TinyMT state must contain four 32-bit words.");
  if (!integerIn(request.baseSeed, 0, 0xffff_ffff))
    throw new TypeError("TinyMT initial seed must be a 32-bit word.");
  if (
    !integerIn(request.minIndex, 0, GEN6_TINYINDEX_MAX_MIN_INDEX) ||
    !integerIn(request.maxIndex, request.minIndex, GEN6_TINYINDEX_MAX_INDEX)
  )
    throw new TypeError("TinyMT Index range is invalid.");
  if (!integerIn(request.year, 2000, 2080) || !integerIn(request.month, 1, 12))
    throw new TypeError("TinyMT date year or month is invalid.");
  if (
    !integerIn(request.startSecond, 0, GEN6_TINYINDEX_MAX_DATE_SECONDS - 1) ||
    !integerIn(request.secondCount, 1, GEN6_TINYINDEX_MAX_DATE_SECONDS) ||
    request.startSecond + request.secondCount > GEN6_TINYINDEX_MAX_DATE_SECONDS
  )
    throw new TypeError("TinyMT date second range is invalid.");
  if (!integerIn(request.resultLimit, 1, GEN6_TINYINDEX_MAX_RESULTS))
    throw new TypeError("Result limit is outside 1..100000.");
  if (
    typeof request.filters.disabled !== "boolean" ||
    typeof request.filters.regularExpression !== "boolean" ||
    typeof request.filters.indexText !== "string" ||
    typeof request.filters.stateText !== "string"
  )
    throw new TypeError("TinyMT Index filters are invalid.");
  if (gen6TinyIndexTaskCount(request) > GEN6_TINYINDEX_MAX_TASKS)
    throw new TypeError("TinyMT Index browser tasks are limited to 5000000.");
  if (request.filters.regularExpression && !request.filters.disabled) {
    try {
      prepareFilters(request.filters);
    } catch {
      throw new TypeError("Regular expression filter is invalid.");
    }
  }
  return request;
}

export function encodeGen6TinyIndexRequest(request: Gen6TinyIndexRequest) {
  validateGen6TinyIndexRequest(request);
  return new Uint32Array([
    request.mode === "date" ? 1 : 0,
    ...request.state.map((value) => value >>> 0),
    request.baseSeed >>> 0,
    request.minIndex,
    request.maxIndex,
    request.year,
    request.month,
    request.startSecond,
    request.secondCount,
  ]);
}

export function decodeGen6TinyIndexResults(
  buffer: ArrayBuffer,
  limit = GEN6_TINYINDEX_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_TINYINDEX_RESULT_WORDS !== 0)
    throw new TypeError("TinyMT Index result buffer is not aligned.");
  return Array.from(
    {
      length: Math.min(words.length / GEN6_TINYINDEX_RESULT_WORDS, limit),
    },
    (_, index): Gen6TinyIndexResult => {
      const offset = index * GEN6_TINYINDEX_RESULT_WORDS;
      return {
        index: words[offset],
        random: words[offset + 1],
        state: [
          words[offset + 2],
          words[offset + 3],
          words[offset + 4],
          words[offset + 5],
        ],
        initialSeed: words[offset + 6],
        elapsedSecond: words[offset + 7],
      };
    },
  );
}

export function filterGen6TinyIndexPackedResults(
  words: Uint32Array,
  filters: Gen6TinyIndexFilters,
  limit = GEN6_TINYINDEX_MAX_RESULTS,
) {
  if (words.length % GEN6_TINYINDEX_RESULT_WORDS !== 0)
    throw new TypeError("TinyMT Index result buffer is not aligned.");
  const prepared = prepareFilters(filters);
  if (prepared.disabled && words.length / GEN6_TINYINDEX_RESULT_WORDS <= limit)
    return words;
  const output = new Uint32Array(
    Math.min(words.length, limit * GEN6_TINYINDEX_RESULT_WORDS),
  );
  let target = 0;
  for (
    let source = 0;
    source < words.length && target < output.length;
    source += GEN6_TINYINDEX_RESULT_WORDS
  ) {
    if (
      filtersMatch(prepared, words[source], [
        words[source + 2],
        words[source + 3],
        words[source + 4],
        words[source + 5],
      ])
    ) {
      output.set(
        words.subarray(source, source + GEN6_TINYINDEX_RESULT_WORDS),
        target,
      );
      target += GEN6_TINYINDEX_RESULT_WORDS;
    }
  }
  return output.slice(0, target);
}

export function gen6TinyIndexResultPassesFilters(
  request: Pick<Gen6TinyIndexRequest, "filters">,
  result: Gen6TinyIndexResult,
) {
  return filtersMatch(
    prepareFilters(request.filters),
    result.index,
    result.state,
  );
}

export function formatGen6TinyIndexHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function formatGen6TinyIndexState(state: readonly number[]) {
  return [...state].reverse().map(formatGen6TinyIndexHex).join(",");
}

export function formatGen6TinyIndexDate(
  request: Pick<Gen6TinyIndexRequest, "year">,
  elapsedSecond: number,
) {
  const date = new Date(Date.UTC(request.year, 0, 1, 13, 0, elapsedSecond));
  return date.toISOString().slice(0, 19);
}

export function parseGen6TinyIndexHex(value: string) {
  const trimmed = value.trim().replace(/^0x/i, "");
  if (trimmed === "") return 0;
  if (!/^[\da-f]{1,8}$/i.test(trimmed)) return undefined;
  return Number.parseInt(trimmed, 16) >>> 0;
}

export function parseGen6TinyIndexDecimal(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
