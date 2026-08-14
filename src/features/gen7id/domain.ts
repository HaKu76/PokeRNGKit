export const GEN7_ID_API_VERSION = 1;
export const GEN7_ID_CHUNK_SIZE = 100_000;
export const GEN7_ID_MAX_TOTAL_STATES = 50_000_000;
export const GEN7_ID_MAX_RESULTS = 250_000;
export const GEN7_ID_MAX_ADVANCES = 1_000_000_000;

export type Gen7IdFilterMode = "none" | "tid" | "sid" | "full" | "g7tid";
export type Gen7GameVersion = "sun" | "moon" | "ultra-sun" | "ultra-moon";

export interface Gen7IdFilters {
  mode: Gen7IdFilterMode;
  /** The upstream ID_Disable/Skip checkbox. */
  disabled?: boolean;
  /** The upstream ID_RE checkbox. */
  regularExpression?: boolean;
  /** TextBox.Lines-compatible filter lists. */
  idText?: string;
  tsvText?: string;
  randText?: string;
  /** Legacy single-value fields kept for saved requests and older previews. */
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

function splitFilterLines(value: string): string[] {
  return value === "" ? [] : value.replace(/\r\n?/g, "\n").split("\n");
}

function parseUnsignedDecimal(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\+?\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 0xffff_ffff
    ? parsed
    : undefined;
}

function parseFullIdLine(value: string): number | undefined {
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
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 0xffff_ffff
    ? parsed
    : undefined;
}

function parseTsvLines(value: string): Set<number> {
  return new Set(
    splitFilterLines(value)
      .map((line) => line.trim())
      .filter((line) => /^\+?\d+$/.test(line))
      .map(Number)
      .filter(
        (entry) => Number.isSafeInteger(entry) && entry >= 0 && entry <= 4095,
      ),
  );
}

function legacyIdText(filters: Gen7IdFilters): string {
  if (filters.idText !== undefined) return filters.idText;
  if (filters.valueText !== undefined) return filters.valueText;
  if (filters.mode === "full" && filters.value !== undefined)
    return filters.value.toString(16).toUpperCase();
  return "";
}

function legacyTsvText(filters: Gen7IdFilters): string {
  if (filters.tsvText !== undefined) return filters.tsvText;
  return filters.tsv === undefined ? "" : String(filters.tsv);
}

function legacyRandText(filters: Gen7IdFilters): string {
  if (filters.randText !== undefined) return filters.randText;
  return filters.rand ?? "";
}

interface PreparedGen7IdFilters {
  disabled: boolean;
  mode: Gen7IdFilterMode;
  regularExpression: boolean;
  idLines: string[];
  idValues: Set<number>;
  idPatterns: RegExp[];
  tsvLines: string[];
  tsvValues: Set<number>;
  randLines: string[];
  randPatterns: RegExp[];
}

function compilePatterns(lines: string[], enabled: boolean): RegExp[] {
  return enabled ? lines.map((line) => new RegExp(line)) : [];
}

function prepareGen7IdFilters(filters: Gen7IdFilters): PreparedGen7IdFilters {
  const disabled = filters.disabled ?? false;
  const regularExpression = filters.regularExpression ?? false;
  const idLines = splitFilterLines(legacyIdText(filters));
  const tsvLines = splitFilterLines(legacyTsvText(filters));
  const randLines = splitFilterLines(legacyRandText(filters));
  return {
    disabled,
    mode: filters.mode,
    regularExpression,
    idLines,
    idValues: new Set(
      filters.mode === "full"
        ? idLines.flatMap((line) => {
            const parsed = parseFullIdLine(line);
            return parsed === undefined ? [] : [parsed];
          })
        : [],
    ),
    idPatterns: compilePatterns(
      filters.mode === "full" || filters.mode === "none" ? [] : idLines,
      regularExpression && !disabled,
    ),
    tsvLines,
    tsvValues: parseTsvLines(legacyTsvText(filters)),
    randLines,
    randPatterns: compilePatterns(randLines, regularExpression && !disabled),
  };
}

function preparedMatches(
  filters: PreparedGen7IdFilters,
  tid: number,
  sid: number,
  tsv: number,
  g7tid: number,
  randString: string,
): boolean {
  if (filters.disabled) return true;
  if (filters.idLines.length > 0) {
    if (filters.mode === "full") {
      if (!filters.idValues.has((sid * 0x1_0000 + tid) >>> 0)) return false;
    } else if (filters.mode !== "none") {
      const value = (
        filters.mode === "g7tid" ? g7tid : filters.mode === "sid" ? sid : tid
      )
        .toString()
        .padStart(filters.mode === "g7tid" ? 6 : 5, "0");
      const matched = filters.regularExpression
        ? filters.idPatterns.some((pattern) => pattern.test(value))
        : filters.idLines.some((line) => line !== "" && value.includes(line));
      if (!matched) return false;
    }
  }
  if (filters.tsvLines.length > 0 && !filters.tsvValues.has(tsv)) return false;
  if (filters.randLines.length > 0) {
    const matched = filters.regularExpression
      ? filters.randPatterns.some((pattern) => pattern.test(randString))
      : filters.randLines.some(
          (line) => line !== "" && randString.includes(line.toUpperCase()),
        );
    if (!matched) return false;
  }
  return true;
}

export function createGen7IdStateMatcher(
  filters: Gen7IdFilters,
): (
  state: Pick<Gen7IdState, "tid" | "sid" | "tsv" | "g7tid" | "rand64">,
) => boolean {
  const prepared = prepareGen7IdFilters(filters);
  return (state) =>
    preparedMatches(
      prepared,
      state.tid,
      state.sid,
      state.tsv,
      state.g7tid,
      formatHex64(state.rand64),
    );
}

/** Filter packed Wasm states without moving RNG work onto the React thread. */
export function filterGen7IdPackedStates(
  words: Uint32Array,
  filters: Gen7IdFilters,
): Uint32Array {
  if (words.length % 8 !== 0)
    throw new RangeError("Invalid Gen7 ID result buffer length.");
  const prepared = prepareGen7IdFilters(filters);
  if (prepared.disabled) return words;
  if (
    prepared.idLines.length === 0 &&
    prepared.tsvLines.length === 0 &&
    prepared.randLines.length === 0
  )
    return words;
  const output = new Uint32Array(words.length);
  let target = 0;
  for (let source = 0; source < words.length; source += 8) {
    const tidSid = words[source + 2];
    const tsvTrv = words[source + 3];
    const randString =
      prepared.randLines.length > 0
        ? `${words[source + 1].toString(16).padStart(8, "0")}${words[source]
            .toString(16)
            .padStart(8, "0")}`.toUpperCase()
        : "";
    if (
      preparedMatches(
        prepared,
        tidSid & 0xffff,
        tidSid >>> 16,
        tsvTrv & 0xffff,
        words[source + 5],
        randString,
      )
    ) {
      output.set(words.subarray(source, source + 8), target);
      target += 8;
    }
  }
  return output.slice(0, target);
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
    !(["none", "tid", "sid", "full", "g7tid"] as const).includes(
      request.filters.mode,
    )
  )
    errors.push("filterMode");
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
  if (request.filters.mode !== "none" && request.filters.idText === undefined) {
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
  const idText = legacyIdText(request.filters);
  const randText = legacyRandText(request.filters);
  if (request.filters.regularExpression && !request.filters.disabled) {
    try {
      if (request.filters.mode !== "full")
        compilePatterns(splitFilterLines(idText), true);
      compilePatterns(splitFilterLines(randText), true);
    } catch {
      errors.push("regularExpression");
    }
  }
  if (
    request.filters.tsv !== undefined &&
    request.filters.tsvText === undefined
  ) {
    if (
      !Number.isInteger(request.filters.tsv) ||
      request.filters.tsv < 0 ||
      request.filters.tsv > 4095
    )
      errors.push("tsv");
  }
  if (
    request.filters.rand !== undefined &&
    request.filters.randText === undefined &&
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
