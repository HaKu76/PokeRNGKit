export const ID3_API_VERSION = 2;
export const ID3_CHUNK_SIZE = 100_000;
export const ID3_MAX_TOTAL_STATES = 50_000_000;
export const ID3_MAX_RESULTS = 250_000;

export type Id3Mode = "xd-colo" | "fr-lg" | "rs";
export type Id3SearcherMode = "sid" | "pid";

export interface Id3Filters {
  tid?: number;
  sid?: number;
  tsv?: number;
}

export interface Id3Request {
  mode: Id3Mode;
  input: number;
  initialAdvances: number;
  maxAdvances: number;
  filters: Id3Filters;
}

export interface Id3State {
  advances: number;
  tid: number;
  sid: number;
  tsv: number;
}

export interface Id3Chunk {
  index: number;
  initialAdvances: number;
  maxAdvances: number;
  stateCount: number;
}

export interface Id3SearcherRequest {
  mode: Id3SearcherMode;
  tid: number;
  input: number;
}

export interface Id3SearcherState {
  seed: number;
  frame: number;
  tid: number;
  sid: number;
  tsv: number;
  shiny: 0 | 1 | 2;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function id3ModeToWasm(mode: Id3Mode): number {
  switch (mode) {
    case "xd-colo":
      return 0;
    case "fr-lg":
      return 1;
    case "rs":
      return 2;
  }
}

export function id3SearcherModeToWasm(mode: Id3SearcherMode): number {
  return mode === "sid" ? 0 : 1;
}

export function id3FilterFlags(filters: Id3Filters): number {
  return (
    (filters.tid === undefined ? 0 : 1) |
    (filters.sid === undefined ? 0 : 2) |
    (filters.tsv === undefined ? 0 : 4)
  );
}

export function validateId3Request(request: Id3Request): string[] {
  const errors: string[] = [];
  const isUint32 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
  const isUint16 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff;

  if (
    !isUint32(request.input) ||
    (request.mode !== "xd-colo" && !isUint16(request.input))
  ) {
    errors.push("input");
  }
  if (!isUint32(request.initialAdvances)) {
    errors.push("initialAdvances");
  }
  if (
    !isUint32(request.maxAdvances) ||
    request.maxAdvances + 1 > ID3_MAX_TOTAL_STATES
  ) {
    errors.push("maxAdvances");
  }
  if (request.initialAdvances + request.maxAdvances > 0xffff_ffff) {
    errors.push("advanceRange");
  }
  if (request.filters.tid !== undefined && !isUint16(request.filters.tid)) {
    errors.push("filterTid");
  }
  if (request.filters.sid !== undefined && !isUint16(request.filters.sid)) {
    errors.push("filterSid");
  }
  if (
    request.filters.tsv !== undefined &&
    (!Number.isInteger(request.filters.tsv) ||
      request.filters.tsv < 0 ||
      request.filters.tsv > 0x1fff)
  ) {
    errors.push("filterTsv");
  }

  return errors;
}

export function validateId3SearcherRequest(
  request: Id3SearcherRequest,
): string[] {
  const errors: string[] = [];
  const isUint16 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff;
  const isUint32 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;

  if (!isUint16(request.tid)) errors.push("tid");
  if (
    (request.mode === "sid" && !isUint16(request.input)) ||
    (request.mode === "pid" && !isUint32(request.input))
  ) {
    errors.push(request.mode);
  }
  return errors;
}

export function createId3Chunks(
  request: Id3Request,
  chunkSize = ID3_CHUNK_SIZE,
): Id3Chunk[] {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > ID3_CHUNK_SIZE
  ) {
    throw new RangeError(
      `ID3 chunk size must be between 1 and ${ID3_CHUNK_SIZE}.`,
    );
  }

  const chunks: Id3Chunk[] = [];
  const totalStates = request.maxAdvances + 1;

  for (let offset = 0, index = 0; offset < totalStates; index++) {
    const stateCount = Math.min(chunkSize, totalStates - offset);
    chunks.push({
      index,
      initialAdvances: request.initialAdvances + offset,
      maxAdvances: stateCount - 1,
      stateCount,
    });
    offset += stateCount;
  }

  return chunks;
}

export function decodeId3States(buffer: ArrayBuffer): Id3State[] {
  const words = new Uint32Array(buffer);
  if (words.length % 3 !== 0) {
    throw new RangeError("Invalid ID3 result buffer length.");
  }

  const states = new Array<Id3State>(words.length / 3);
  for (
    let source = 0, target = 0;
    source < words.length;
    source += 3, target++
  ) {
    const tidSid = words[source + 1];
    states[target] = {
      advances: words[source],
      tid: tidSid & 0xffff,
      sid: tidSid >>> 16,
      tsv: words[source + 2],
    };
  }
  return states;
}

export function decodeId3SearcherStates(
  buffer: ArrayBuffer,
): Id3SearcherState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 6 !== 0) {
    throw new RangeError("Invalid ID3 Searcher result buffer length.");
  }

  const states = new Array<Id3SearcherState>(words.length / 6);
  for (
    let source = 0, target = 0;
    source < words.length;
    source += 6, target++
  ) {
    const tidSid = words[source + 2];
    const tsvShiny = words[source + 3];
    const yearMonthDay = words[source + 4];
    const hourMinute = words[source + 5];
    states[target] = {
      seed: words[source],
      frame: words[source + 1],
      tid: tidSid & 0xffff,
      sid: tidSid >>> 16,
      tsv: tsvShiny & 0xffff,
      shiny: (tsvShiny >>> 16) as 0 | 1 | 2,
      year: yearMonthDay & 0xffff,
      month: (yearMonthDay >>> 16) & 0xff,
      day: yearMonthDay >>> 24,
      hour: hourMinute & 0xff,
      minute: (hourMinute >>> 8) & 0xff,
    };
  }
  return states;
}

export function calculateRsSeed(dateTime: Date): number {
  const year = dateTime.getFullYear();
  if (year < 2000 || year > 2099 || Number.isNaN(dateTime.getTime())) {
    throw new RangeError("Ruby/Sapphire date must be between 2000 and 2099.");
  }

  const base = Date.UTC(2000, 0, 1);
  const current = Date.UTC(year, dateTime.getMonth(), dateTime.getDate());
  const daysFrom2000 = Math.floor((current - base) / 86_400_000);
  const day = daysFrom2000 - (year > 2000 ? 366 : 0) + 1;
  const hour = dateTime.getHours();
  const minute = dateTime.getMinutes();
  const seed =
    1440 * day +
    960 * Math.floor(hour / 10) +
    60 * (hour % 10) +
    16 * Math.floor(minute / 10) +
    (minute % 10);

  return ((seed >>> 16) ^ (seed & 0xffff)) & 0xffff;
}

export function parseDecimal(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function parseHex(value: string): number | undefined {
  const trimmed = value.trim().replace(/^0x/i, "");
  if (trimmed === "") return 0;
  if (!/^[\da-f]+$/i.test(trimmed)) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 16);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

export function formatHex(value: number, width: number): string {
  return value.toString(16).toUpperCase().padStart(width, "0");
}
