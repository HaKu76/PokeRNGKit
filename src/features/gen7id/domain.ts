export const GEN7_ID_API_VERSION = 1;
export const GEN7_ID_CHUNK_SIZE = 100_000;
export const GEN7_ID_MAX_TOTAL_STATES = 50_000_000;
export const GEN7_ID_MAX_RESULTS = 250_000;
export const GEN7_ID_MAX_ADVANCES = 1_000_000_000;

export type Gen7IdFilterMode = "none" | "tid" | "sid" | "full" | "g7tid";
export type Gen7GameVersion = "sun" | "moon" | "ultra-sun" | "ultra-moon";

export interface Gen7IdFilters {
  mode: Gen7IdFilterMode;
  value?: number;
  valueText?: string;
  tsv?: number;
  rand?: string;
}

export interface Gen7IdRequest {
  version: Gen7GameVersion;
  seed: number;
  minAdvances: number;
  maxAdvances: number;
  correction: number;
  filters: Gen7IdFilters;
}

export function gen7IdStartingFrame(version: Gen7GameVersion): number {
  return version === "sun" || version === "moon" ? 1012 : 1132;
}

export interface Gen7IdState {
  advances: number;
  rand64: bigint;
  tid: number;
  sid: number;
  tsv: number;
  trv: number;
  g7tid: number;
  clock: number;
}

export interface Gen7IdChunk {
  index: number;
  minAdvances: number;
  maxAdvances: number;
  stateCount: number;
}

export function validateGen7IdRequest(request: Gen7IdRequest): string[] {
  const errors: string[] = [];
  if (
    !(["sun", "moon", "ultra-sun", "ultra-moon"] as const).includes(
      request.version,
    )
  )
    errors.push("version");
  const uint32 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
  if (!uint32(request.seed)) errors.push("seed");
  if (
    !Number.isInteger(request.minAdvances) ||
    request.minAdvances < gen7IdStartingFrame(request.version) ||
    request.minAdvances > GEN7_ID_MAX_ADVANCES
  )
    errors.push("minAdvances");
  if (
    !Number.isInteger(request.maxAdvances) ||
    request.maxAdvances < 0 ||
    request.maxAdvances > GEN7_ID_MAX_ADVANCES
  )
    errors.push("maxAdvances");
  if (request.maxAdvances < request.minAdvances) errors.push("advanceRange");
  if (request.maxAdvances - request.minAdvances + 1 > GEN7_ID_MAX_TOTAL_STATES)
    errors.push("rangeTooLarge");
  if (
    !Number.isInteger(request.correction) ||
    request.correction < 0 ||
    request.correction > 16
  )
    errors.push("correction");
  if (request.filters.mode !== "none") {
    if (request.filters.mode === "full") {
      if (!uint32(request.filters.value ?? Number.NaN))
        errors.push("filterValue");
    } else {
      const width = request.filters.mode === "g7tid" ? 6 : 5;
      if (
        request.filters.valueText === undefined ||
        !new RegExp(`^\\d{1,${width}}$`).test(request.filters.valueText)
      )
        errors.push("filterValue");
    }
  }
  if (
    request.filters.tsv !== undefined &&
    (!Number.isInteger(request.filters.tsv) ||
      request.filters.tsv < 0 ||
      request.filters.tsv > 4095)
  )
    errors.push("tsv");
  if (
    request.filters.rand !== undefined &&
    !/^[0-9a-f]{1,16}$/i.test(request.filters.rand)
  )
    errors.push("rand");
  return errors;
}

export function createGen7IdChunks(
  request: Gen7IdRequest,
  chunkSize = GEN7_ID_CHUNK_SIZE,
): Gen7IdChunk[] {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > GEN7_ID_CHUNK_SIZE
  )
    throw new RangeError("Invalid Gen7 ID chunk size.");
  const chunks: Gen7IdChunk[] = [];
  const total = request.maxAdvances - request.minAdvances + 1;
  for (let offset = 0, index = 0; offset < total; index++) {
    const count = Math.min(chunkSize, total - offset);
    chunks.push({
      index,
      minAdvances: request.minAdvances + offset,
      maxAdvances: request.minAdvances + offset + count - 1,
      stateCount: count,
    });
    offset += count;
  }
  return chunks;
}

export function decodeGen7IdStates(buffer: ArrayBuffer): Gen7IdState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 8 !== 0)
    throw new RangeError("Invalid Gen7 ID result buffer length.");
  const states = new Array<Gen7IdState>(words.length / 8);
  for (
    let source = 0, target = 0;
    source < words.length;
    source += 8, target++
  ) {
    const tidSid = words[source + 2];
    const tsvTrv = words[source + 3];
    const rand64 = BigInt(words[source]) | (BigInt(words[source + 1]) << 32n);
    states[target] = {
      advances: words[source + 4],
      rand64,
      tid: tidSid & 0xffff,
      sid: tidSid >>> 16,
      tsv: tsvTrv & 0xffff,
      trv: tsvTrv >>> 16,
      g7tid: words[source + 5],
      clock: words[source + 6],
    };
  }
  return states;
}

export function parseHex(value: string): number | undefined {
  const trimmed = value.trim().replace(/^0x/i, "");
  if (trimmed === "") return 0;
  if (!/^[\da-f]+$/i.test(trimmed)) return undefined;
  const parsed = Number.parseInt(trimmed, 16);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parseDecimal(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parseFullId(value: string): number | undefined {
  const trimmed = value.trim();
  const parts = trimmed.split("/");
  if (parts.length === 2) {
    const tid = parseDecimal(parts[0]);
    const sid = parseDecimal(parts[1]);
    if (tid === undefined || tid > 0xffff || sid === undefined || sid > 0xffff)
      return undefined;
    return ((sid << 16) | tid) >>> 0;
  }
  return parseHex(trimmed);
}

export function formatHex64(value: bigint): string {
  return value.toString(16).toUpperCase().padStart(16, "0");
}
