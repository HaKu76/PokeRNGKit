export const GEN4_ID_API_VERSION = 1;
export const GEN4_ID_GENERATOR_CHUNK_DELAYS = 100_000;
export const GEN4_ID_SEARCHER_CHUNK_DELAYS = 16;
export const GEN4_ID_MAX_RESULTS = 100_000;
export const GEN4_ID_INFINITE_MAX_ADJUSTED_DELAY = 0xe8ffff;
export const GEN4_ID_MAX_FILTER_VALUES = 4096;

export type Gen4IdOperation = "generator" | "searcher";
export type Gen4IdFilterMode =
  "none" | "tid" | "sid" | "tidSid" | "pid" | "tidPid" | "tsv";

export interface Gen4IdFilters {
  mode: Gen4IdFilterMode;
  values: number[];
}

export interface Gen4IdGeneratorRequest {
  operation: "generator";
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  minDelay: number;
  maxDelay: number;
  filters: Gen4IdFilters;
}

export interface Gen4IdSearcherRequest {
  operation: "searcher";
  year: number;
  minDelay: number;
  maxDelay: number;
  infinite: boolean;
  filters: Gen4IdFilters;
}

export type Gen4IdRequest = Gen4IdGeneratorRequest | Gen4IdSearcherRequest;

export interface Gen4IdState {
  seed: number;
  delay: number;
  tid: number;
  sid: number;
  tsv: number;
  seconds?: number;
}

export interface Gen4IdChunk {
  index: number;
  second?: number;
  minDelay: number;
  maxDelay: number;
  stateCount: number;
}

function validU32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function validDate(request: Gen4IdGeneratorRequest) {
  if (
    request.year < 2000 ||
    request.year > 2099 ||
    request.month < 1 ||
    request.month > 12 ||
    request.day < 1 ||
    request.hour < 0 ||
    request.hour > 23 ||
    request.minute < 0 ||
    request.minute > 59
  )
    return false;
  const lastDay = new Date(request.year, request.month, 0).getDate();
  return request.day <= lastDay;
}

function filterWidth(mode: Gen4IdFilterMode) {
  return mode === "tidSid" || mode === "tidPid" ? 2 : 1;
}

export function gen4IdFilterModeToWasm(mode: Gen4IdFilterMode) {
  return {
    none: 0,
    tid: 1,
    sid: 2,
    tidSid: 3,
    pid: 4,
    tidPid: 5,
    tsv: 6,
  }[mode];
}

export function validateGen4IdFilters(filters: Gen4IdFilters) {
  if (filters.mode === "none") return filters.values.length === 0;
  const width = filterWidth(filters.mode);
  if (
    filters.values.length === 0 ||
    filters.values.length % width !== 0 ||
    filters.values.length / width > GEN4_ID_MAX_FILTER_VALUES
  )
    return false;
  for (let index = 0; index < filters.values.length; index += width) {
    const first = filters.values[index];
    const second = width === 2 ? filters.values[index + 1] : undefined;
    if (!Number.isInteger(first) || first < 0 || first > 0xffff) return false;
    if (filters.mode === "tidSid" && (second! < 0 || second! > 0xffff))
      return false;
    const tsv = width === 2 ? second : first;
    if (
      (filters.mode === "pid" ||
        filters.mode === "tidPid" ||
        filters.mode === "tsv") &&
      (!Number.isInteger(tsv) || tsv! < 0 || tsv! > 0x1fff)
    )
      return false;
  }
  return true;
}

export function validateGen4IdRequest(request: Gen4IdRequest): string[] {
  const errors: string[] = [];
  if (
    !Number.isInteger(request.year) ||
    request.year < 2000 ||
    request.year > 2099
  )
    errors.push("year");
  if (
    !validU32(request.minDelay) ||
    !validU32(request.maxDelay) ||
    request.minDelay > request.maxDelay
  )
    errors.push("delayRange");
  if (request.maxDelay > 0xffff_ffff - (request.year - 2000))
    errors.push("adjustedDelay");
  if (!validateGen4IdFilters(request.filters)) errors.push("filters");
  if (request.operation === "generator" && !validDate(request))
    errors.push("dateTime");
  return errors;
}

export function gen4IdEffectiveMaxDelay(request: Gen4IdRequest) {
  if (request.operation !== "searcher" || !request.infinite)
    return request.maxDelay;
  return GEN4_ID_INFINITE_MAX_ADJUSTED_DELAY - (request.year - 2000);
}

export function gen4IdTotalStates(request: Gen4IdRequest) {
  const delays = gen4IdEffectiveMaxDelay(request) - request.minDelay + 1;
  return delays * (request.operation === "generator" ? 60 : 256 * 24);
}

export function createGen4IdChunks(request: Gen4IdRequest): Gen4IdChunk[] {
  const chunks: Gen4IdChunk[] = [];
  const maximum = gen4IdEffectiveMaxDelay(request);
  const chunkDelays =
    request.operation === "generator"
      ? GEN4_ID_GENERATOR_CHUNK_DELAYS
      : GEN4_ID_SEARCHER_CHUNK_DELAYS;
  const seconds = request.operation === "generator" ? 60 : 1;
  for (let second = 0, index = 0; second < seconds; second++) {
    for (let minimum = request.minDelay; minimum <= maximum; index++) {
      const maxDelay = Math.min(maximum, minimum + chunkDelays - 1);
      const delayCount = maxDelay - minimum + 1;
      chunks.push({
        index,
        second: request.operation === "generator" ? second : undefined,
        minDelay: minimum,
        maxDelay,
        stateCount:
          delayCount * (request.operation === "generator" ? 1 : 256 * 24),
      });
      minimum = maxDelay + 1;
    }
  }
  return chunks;
}

export function decodeGen4IdStates(buffer: ArrayBuffer): Gen4IdState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 6 !== 0)
    throw new RangeError("Invalid Gen4 ID result buffer length.");
  return Array.from({ length: words.length / 6 }, (_, row) => {
    const offset = row * 6;
    return {
      seed: words[offset],
      delay: words[offset + 1],
      tid: words[offset + 2],
      sid: words[offset + 3],
      tsv: words[offset + 4],
      seconds:
        words[offset + 5] === 0xffff_ffff ? undefined : words[offset + 5],
    };
  });
}

function parseDecimal(value: string, maximum: number) {
  if (!/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : undefined;
}

function parsePid(value: string) {
  if (!/^[0-9a-f]{1,8}$/i.test(value)) return undefined;
  const pid = Number.parseInt(value, 16) >>> 0;
  return ((pid >>> 16) ^ (pid & 0xffff)) >>> 3;
}

export function parseGen4IdFilters(
  mode: Gen4IdFilterMode,
  text: string,
): Gen4IdFilters | undefined {
  if (mode === "none") return { mode, values: [] };
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0 || lines.length > GEN4_ID_MAX_FILTER_VALUES)
    return undefined;
  const values: number[] = [];
  for (const line of lines) {
    if (mode === "tidSid" || mode === "tidPid") {
      const parts = line.split("/");
      if (parts.length !== 2) return undefined;
      const tid = parseDecimal(parts[0], 0xffff);
      const second =
        mode === "tidSid" ? parseDecimal(parts[1], 0xffff) : parsePid(parts[1]);
      if (tid === undefined || second === undefined) return undefined;
      values.push(tid, second);
    } else {
      const value =
        mode === "pid"
          ? parsePid(line)
          : parseDecimal(line, mode === "tsv" ? 0x1fff : 0xffff);
      if (value === undefined) return undefined;
      values.push(value);
    }
  }
  return { mode, values };
}

export function parseGen4IdDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

export function formatGen4IdSeed(seed: number) {
  return seed.toString(16).toUpperCase().padStart(8, "0");
}
