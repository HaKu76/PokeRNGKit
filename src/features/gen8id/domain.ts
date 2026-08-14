export const GEN8_ID_API_VERSION = 2;
export const GEN8_ID_CHUNK_SIZE = 100_000;
export const GEN8_ID_MAX_RESULTS = 100_000;
export const GEN8_ID_MAX_FILTER_VALUES = 4096;
export const GEN8_ID_MAX_ADVANCES = 0xffff_ffff;
export const GEN8_ID_MAX_EVALUATIONS = 250_000_000;
export const GEN8_ID_MAX_SEED = 0xffff_ffff_ffff_ffffn;

export type Gen8IdFilterMode =
  "none" | "tid" | "sid" | "tidSid" | "pid" | "tsv" | "displayTid";

export interface Gen8IdFilters {
  mode: Gen8IdFilterMode;
  values: number[];
}

export interface Gen8IdRequest {
  seed0: bigint;
  seed1: bigint;
  initialAdvances: number;
  maxAdvances: number;
  filters: Gen8IdFilters;
}

export interface Gen8IdChunk {
  index: number;
  offset: number;
  stateCount: number;
}

export interface Gen8IdState {
  advances: number;
  tid: number;
  sid: number;
  tsv: number;
  displayTid: number;
}

const GEN8_ID_FILTER_MODES: readonly Gen8IdFilterMode[] = [
  "none",
  "tid",
  "sid",
  "tidSid",
  "pid",
  "tsv",
  "displayTid",
];

function isUint32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function isUint64(value: bigint) {
  return value >= 0n && value <= GEN8_ID_MAX_SEED;
}

export function gen8IdFilterModeToWasm(mode: Gen8IdFilterMode) {
  return {
    none: 0,
    tid: 1,
    sid: 2,
    tidSid: 3,
    pid: 4,
    tsv: 5,
    displayTid: 6,
  }[mode];
}

export function validateGen8IdFilters(filters: Gen8IdFilters) {
  if (!GEN8_ID_FILTER_MODES.includes(filters.mode)) return false;
  if (filters.mode === "none") return filters.values.length === 0;
  if (filters.values.length > GEN8_ID_MAX_FILTER_VALUES) return false;

  for (const value of filters.values) {
    if (!isUint32(value)) return false;
    if ((filters.mode === "tid" || filters.mode === "sid") && value > 0xffff)
      return false;
    if (filters.mode === "tsv" && value > 0x1fff) return false;
    if (filters.mode === "displayTid" && value > 999_999) return false;
  }
  return true;
}

export function validateGen8IdRequest(request: Gen8IdRequest): string[] {
  const errors: string[] = [];
  if (!isUint64(request.seed0)) errors.push("seed0");
  if (!isUint64(request.seed1)) errors.push("seed1");
  if (request.seed0 === 0n && request.seed1 === 0n) errors.push("seeds");
  if (!isUint32(request.initialAdvances)) errors.push("initialAdvances");
  if (!isUint32(request.maxAdvances)) errors.push("maxAdvances");
  else if (request.maxAdvances > GEN8_ID_MAX_EVALUATIONS)
    errors.push("evaluations");
  if (!validateGen8IdFilters(request.filters)) errors.push("filters");
  return errors;
}

export function createGen8IdChunks(
  request: Gen8IdRequest,
  chunkSize = GEN8_ID_CHUNK_SIZE,
): Gen8IdChunk[] {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > GEN8_ID_CHUNK_SIZE
  )
    throw new RangeError("Invalid Gen8 ID chunk size.");
  if (validateGen8IdRequest(request).length > 0)
    throw new RangeError("Invalid Gen8 ID request.");

  const chunks: Gen8IdChunk[] = [];
  for (let offset = 0, index = 0; offset < request.maxAdvances; index++) {
    const stateCount = Math.min(chunkSize, request.maxAdvances - offset);
    chunks.push({
      index,
      offset,
      stateCount,
    });
    offset += stateCount;
  }
  return chunks;
}

export function decodeGen8IdStates(buffer: ArrayBuffer): Gen8IdState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 4 !== 0)
    throw new RangeError("Invalid Gen8 ID result buffer length.");
  return Array.from({ length: words.length / 4 }, (_, row) => {
    const offset = row * 4;
    const tidSid = words[offset + 1];
    return {
      advances: words[offset],
      tid: tidSid & 0xffff,
      sid: tidSid >>> 16,
      tsv: words[offset + 2],
      displayTid: words[offset + 3],
    };
  });
}

export function validateGen8IdPackedResults(
  words: Uint32Array,
  request: Gen8IdRequest,
  chunk: Gen8IdChunk,
) {
  const filterValues =
    request.filters.mode === "pid"
      ? new Set(
          request.filters.values.map(
            (pid) => ((pid >>> 16) ^ (pid & 0xffff)) >>> 4,
          ),
        )
      : new Set(request.filters.values);
  const unfiltered =
    request.filters.mode === "none" || request.filters.values.length === 0;
  const chunkStart = (request.initialAdvances + chunk.offset) >>> 0;
  let previousOffset = -1;

  if (unfiltered && words.length !== chunk.stateCount * 4)
    throw new Error("Gen8 ID Wasm omitted an unfiltered result row.");

  for (let index = 0; index < words.length; index += 4) {
    const advances = words[index];
    const tidSid = words[index + 1];
    const tsv = words[index + 2];
    const displayTid = words[index + 3];
    const tid = tidSid & 0xffff;
    const sid = tidSid >>> 16;
    const relativeOffset = (advances - chunkStart) >>> 0;
    const matches =
      filterValues.size === 0 ||
      request.filters.mode === "none" ||
      (request.filters.mode === "tid" && filterValues.has(tid)) ||
      (request.filters.mode === "sid" && filterValues.has(sid)) ||
      (request.filters.mode === "tidSid" && filterValues.has(tidSid)) ||
      ((request.filters.mode === "pid" || request.filters.mode === "tsv") &&
        filterValues.has(tsv)) ||
      (request.filters.mode === "displayTid" && filterValues.has(displayTid));

    if (
      relativeOffset >= chunk.stateCount ||
      relativeOffset <= previousOffset ||
      (unfiltered && relativeOffset !== index / 4) ||
      tidSid === 0 ||
      tsv !== (tid ^ sid) >>> 4 ||
      displayTid !== tidSid % 1_000_000 ||
      !matches
    )
      throw new Error("Gen8 ID Wasm returned an invalid result row.");
    previousOffset = relativeOffset;
  }
}

function parseDecimal(value: string, maximum: number) {
  if (!/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : undefined;
}

function parsePid(value: string) {
  if (!/^[0-9a-f]{1,8}$/i.test(value)) return undefined;
  return Number.parseInt(value, 16) >>> 0;
}

function normalizeDecimalLine(value: string, maximum: number) {
  const digits = value.replace(/\D/g, "");
  if (digits === "") return "";
  const parsed = Number(digits);
  return String(
    Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : maximum,
  );
}

function normalizeTidSidLine(value: string) {
  let filtered = value.replace(/[^0-9/]/g, "");
  const firstSlash = filtered.indexOf("/");
  if (firstSlash >= 0) {
    filtered =
      filtered.slice(0, firstSlash + 1) +
      filtered.slice(firstSlash + 1).replaceAll("/", "");
  }
  if (filtered === "") return "";
  if (firstSlash < 0) return normalizeDecimalLine(filtered, 0xffff);

  const [tidText, sidText] = filtered.split("/");
  if (sidText === "") return filtered;
  const tid = normalizeDecimalLine(tidText, 0xffff) || "65535";
  return `${tid}/${normalizeDecimalLine(sidText, 0xffff)}`;
}

export function normalizeGen8IdFilterText(
  mode: Exclude<Gen8IdFilterMode, "none">,
  text: string,
) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (mode === "tidSid") return normalizeTidSidLine(line);
      if (mode === "pid") {
        const hex = line.replace(/[^0-9a-f]/gi, "");
        if (hex === "") return "";
        const normalized = hex.replace(/^0+(?=.)/, "");
        if (normalized.length > 8) return "ffffffff";
        return Number.parseInt(normalized, 16).toString(16);
      }
      return normalizeDecimalLine(
        line,
        mode === "tsv" ? 0x1fff : mode === "displayTid" ? 999_999 : 0xffff,
      );
    })
    .join("\n");
}

export function parseGen8IdFilters(
  mode: Gen8IdFilterMode,
  text: string,
): Gen8IdFilters | undefined {
  if (mode === "none") return { mode, values: [] };
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { mode, values: [] };
  if (lines.length > GEN8_ID_MAX_FILTER_VALUES) return undefined;

  const values: number[] = [];
  for (const line of lines) {
    if (mode === "tidSid") {
      const parts = line.split("/");
      if (parts.length !== 2) return undefined;
      const tid = parts[0] === "" ? 0 : parseDecimal(parts[0], 0xffff);
      const sid = parts[1] === "" ? 0 : parseDecimal(parts[1], 0xffff);
      if (tid === undefined || sid === undefined) return undefined;
      values.push(((sid << 16) | tid) >>> 0);
      continue;
    }

    const value =
      mode === "pid"
        ? parsePid(line)
        : parseDecimal(
            line,
            mode === "tsv" ? 0x1fff : mode === "displayTid" ? 999_999 : 0xffff,
          );
    if (value === undefined) return undefined;
    values.push(value);
  }
  return { mode, values };
}

export function parseGen8IdSeed(value: string): bigint | undefined {
  const normalized = value.trim().replace(/^0x/i, "");
  if (normalized === "") return 0n;
  if (!/^[0-9a-f]{1,16}$/i.test(normalized)) return undefined;
  return BigInt(`0x${normalized}`);
}

export function splitGen8IdSeed(value: bigint): [number, number] {
  if (!isUint64(value)) throw new RangeError("Invalid Gen8 ID seed.");
  return [Number(value & 0xffff_ffffn), Number(value >> 32n)];
}

export function formatGen8IdSeed(value: bigint) {
  return value.toString(16).toUpperCase().padStart(16, "0");
}
