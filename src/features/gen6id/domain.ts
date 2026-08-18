export const GEN6_ID_API_VERSION = 1;
export const GEN6_ID_REQUEST_WORDS = 6;
export const GEN6_ID_RESULT_WORDS = 8;
export const GEN6_ID_MAX_FRAME = 1_000_000_000;
export const GEN6_ID_BROWSER_MAX_FRAME = 5_000_000;
export const GEN6_ID_MAX_RESULTS = 100_000;
export const GEN6_ID_STEP_SIZE = 2_048;

export type Gen6IdStateTuple = [number, number, number, number];
export type Gen6IdFilterMode = "tid" | "sid" | "full";

export interface Gen6IdFilters {
  mode: Gen6IdFilterMode;
  disabled: boolean;
  regularExpression: boolean;
  idText: string;
  tsvText: string;
  stateText: string;
}

export interface Gen6IdRequest {
  state: Gen6IdStateTuple;
  minFrame: number;
  maxFrame: number;
  resultLimit: number;
  filters: Gen6IdFilters;
}

export interface Gen6IdResult {
  frame: number;
  random: number;
  tid: number;
  sid: number;
  tsv: number;
  trv: number;
  state: Gen6IdStateTuple;
}

interface PreparedFilters {
  disabled: boolean;
  mode: Gen6IdFilterMode;
  regularExpression: boolean;
  idLines: string[];
  idValues: Set<number>;
  idPatterns: RegExp[];
  tsvLines: string[];
  tsvValues: Set<number>;
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

function parseUnsignedDecimal(value: string) {
  const trimmed = value.trim();
  if (!/^\+?\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return integerIn(parsed, 0, 0xffff_ffff) ? parsed : undefined;
}

function parseFullIdLine(value: string) {
  let input = value.replaceAll(" ", "");
  const commentIndex = input.lastIndexOf("//");
  if (commentIndex > 0) input = input.slice(0, commentIndex);
  if (input.includes("/")) {
    const parts = input.split("/");
    if (parts.length !== 2) return undefined;
    const tid = parseUnsignedDecimal(parts[0]);
    const sid = parseUnsignedDecimal(parts[1]);
    if (tid === undefined || sid === undefined) return undefined;
    return ((sid << 16) | tid) >>> 0;
  }
  if (!/^[\da-f]+$/i.test(input)) return undefined;
  const parsed = Number.parseInt(input, 16);
  return integerIn(parsed, 0, 0xffff_ffff) ? parsed >>> 0 : undefined;
}

function compilePatterns(lines: string[], enabled: boolean) {
  return enabled ? lines.map((line) => new RegExp(line)) : [];
}

function prepareFilters(filters: Gen6IdFilters): PreparedFilters {
  const idLines = splitLines(filters.idText);
  const tsvLines = splitLines(filters.tsvText);
  const stateLines = splitLines(filters.stateText);
  return {
    disabled: filters.disabled,
    mode: filters.mode,
    regularExpression: filters.regularExpression,
    idLines,
    idValues: new Set(
      filters.mode === "full"
        ? idLines.flatMap((line) => {
            const value = parseFullIdLine(line);
            return value === undefined ? [] : [value];
          })
        : [],
    ),
    idPatterns: compilePatterns(
      filters.mode === "full" ? [] : idLines,
      filters.regularExpression && !filters.disabled,
    ),
    tsvLines,
    tsvValues: new Set(
      tsvLines
        .map((line) => line.trim())
        .filter((line) => /^\+?\d+$/.test(line))
        .map(Number)
        .filter((value) => integerIn(value, 0, 4095)),
    ),
    stateLines,
    statePatterns: compilePatterns(
      stateLines,
      filters.regularExpression && !filters.disabled,
    ),
  };
}

function preparedFiltersMatch(
  filters: PreparedFilters,
  tid: number,
  sid: number,
  tsv: number,
  state: Gen6IdStateTuple,
) {
  if (filters.disabled) return true;
  if (filters.idLines.length > 0) {
    if (filters.mode === "full") {
      if (!filters.idValues.has((sid * 0x1_0000 + tid) >>> 0)) return false;
    } else {
      const value = (filters.mode === "sid" ? sid : tid)
        .toString()
        .padStart(5, "0");
      const matched = filters.regularExpression
        ? filters.idPatterns.some((pattern) => pattern.test(value))
        : filters.idLines.some((line) => line !== "" && value.includes(line));
      if (!matched) return false;
    }
  }
  if (filters.tsvLines.length > 0 && !filters.tsvValues.has(tsv)) return false;
  if (filters.stateLines.length > 0) {
    const value = formatGen6IdState(state);
    const matched = filters.regularExpression
      ? filters.statePatterns.some((pattern) => pattern.test(value))
      : filters.stateLines.some(
          (line) => line !== "" && value.includes(line.toUpperCase()),
        );
    if (!matched) return false;
  }
  return true;
}

export function gen6IdTaskCount(request: Gen6IdRequest) {
  return request.maxFrame - request.minFrame + 1;
}

export function validateGen6IdRequest(request: Gen6IdRequest) {
  if (
    request.state.length !== 4 ||
    !request.state.every((value) => integerIn(value, 0, 0xffff_ffff))
  )
    throw new TypeError("TinyMT state must contain four 32-bit words.");
  if (
    !integerIn(request.minFrame, 0, GEN6_ID_MAX_FRAME) ||
    !integerIn(request.maxFrame, request.minFrame, GEN6_ID_MAX_FRAME)
  )
    throw new TypeError("Frame range is invalid.");
  if (request.maxFrame > GEN6_ID_BROWSER_MAX_FRAME)
    throw new TypeError("Gen VI ID browser frames are limited to 5000000.");
  if (!integerIn(request.resultLimit, 1, GEN6_ID_MAX_RESULTS))
    throw new TypeError("Result limit is outside 1..100000.");
  if (!(request.filters.mode in { tid: 1, sid: 1, full: 1 }))
    throw new TypeError("ID filter mode is invalid.");
  if (
    typeof request.filters.disabled !== "boolean" ||
    typeof request.filters.regularExpression !== "boolean" ||
    typeof request.filters.idText !== "string" ||
    typeof request.filters.tsvText !== "string" ||
    typeof request.filters.stateText !== "string"
  )
    throw new TypeError("ID filters are invalid.");
  if (request.filters.regularExpression && !request.filters.disabled) {
    try {
      prepareFilters(request.filters);
    } catch {
      throw new TypeError("Regular expression filter is invalid.");
    }
  }
  return request;
}

export function encodeGen6IdRequest(request: Gen6IdRequest) {
  validateGen6IdRequest(request);
  return new Uint32Array([
    ...request.state.map((value) => value >>> 0),
    request.minFrame,
    gen6IdTaskCount(request),
  ]);
}

export function decodeGen6IdResults(
  buffer: ArrayBuffer,
  limit = GEN6_ID_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_ID_RESULT_WORDS !== 0)
    throw new TypeError("Gen VI ID result buffer is not aligned.");
  return Array.from(
    { length: Math.min(words.length / GEN6_ID_RESULT_WORDS, limit) },
    (_, index): Gen6IdResult => {
      const offset = index * GEN6_ID_RESULT_WORDS;
      const random = words[offset + 1];
      const xorValue = (random & 0xffff) ^ (random >>> 16);
      return {
        frame: words[offset],
        random,
        tid: random & 0xffff,
        sid: random >>> 16,
        tsv: xorValue >>> 4,
        trv: xorValue & 15,
        state: [
          words[offset + 2],
          words[offset + 3],
          words[offset + 4],
          words[offset + 5],
        ],
      };
    },
  );
}

export function formatGen6IdState(state: Gen6IdStateTuple) {
  return [...state]
    .reverse()
    .map((value) => value.toString(16).toUpperCase().padStart(8, "0"))
    .join(",");
}

export function formatGen6IdRandom(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function parseGen6IdHex(value: string) {
  const trimmed = value.trim().replace(/^0x/i, "");
  if (trimmed === "") return 0;
  if (!/^[\da-f]{1,8}$/i.test(trimmed)) return undefined;
  return Number.parseInt(trimmed, 16) >>> 0;
}

export function parseGen6IdDecimal(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function gen6IdResultPassesFilters(
  request: Pick<Gen6IdRequest, "filters">,
  result: Gen6IdResult,
) {
  const filters = prepareFilters(request.filters);
  return preparedFiltersMatch(
    filters,
    result.tid,
    result.sid,
    result.tsv,
    result.state,
  );
}

export function filterGen6IdPackedResults(
  words: Uint32Array,
  filters: Gen6IdFilters,
  limit = GEN6_ID_MAX_RESULTS,
) {
  if (words.length % GEN6_ID_RESULT_WORDS !== 0)
    throw new TypeError("Gen VI ID result buffer is not aligned.");
  const prepared = prepareFilters(filters);
  if (prepared.disabled && words.length / GEN6_ID_RESULT_WORDS <= limit)
    return words;
  const output = new Uint32Array(
    Math.min(words.length, limit * GEN6_ID_RESULT_WORDS),
  );
  let target = 0;
  for (
    let source = 0;
    source < words.length && target < output.length;
    source += GEN6_ID_RESULT_WORDS
  ) {
    const random = words[source + 1];
    const tid = random & 0xffff;
    const sid = random >>> 16;
    if (
      preparedFiltersMatch(prepared, tid, sid, (tid ^ sid) >>> 4, [
        words[source + 2],
        words[source + 3],
        words[source + 4],
        words[source + 5],
      ])
    ) {
      output.set(words.subarray(source, source + GEN6_ID_RESULT_WORDS), target);
      target += GEN6_ID_RESULT_WORDS;
    }
  }
  return output.slice(0, target);
}
