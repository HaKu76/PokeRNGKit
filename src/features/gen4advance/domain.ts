export const GEN4_ADVANCE_API_VERSION = 2;
export const GEN4_ADVANCE_MAX_ROWS = 1_000_000;
export const GEN4_ADVANCE_MAX_TOKENS = 100_000;

export type Gen4AdvanceMode = "calls" | "chatot" | "needles";
export type Gen4AdvanceCallToken = 0 | 1 | 2;
export type Gen4AdvanceChatotToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type Gen4AdvanceNeedleToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Gen4AdvanceToken =
  Gen4AdvanceCallToken | Gen4AdvanceChatotToken | Gen4AdvanceNeedleToken;

export interface Gen4AdvanceRow {
  advances: number;
  value: number;
}

export interface Gen4AdvanceRequest {
  mode: Gen4AdvanceMode;
  rows: Gen4AdvanceRow[];
  tokens: Gen4AdvanceToken[];
}

export interface Gen4AdvanceMatch {
  row: number;
  advances: number;
}

export interface Gen4AdvanceChunk {
  index: 0;
  stateCount: number;
}

export const gen4AdvanceCallLabels = ["E", "K", "P"] as const;
export const gen4AdvanceChatotLabels = [
  "Any",
  "High",
  "Mid-High",
  "Mid",
  "Mid-Low",
  "Low",
  "High / Mid-High",
  "Mid-High / Mid",
  "Mid / Mid-Low",
  "Mid-Low / Low",
] as const;
export const gen4AdvanceNeedleLabels = [
  "\u2191",
  "\u2197",
  "\u2192",
  "\u2198",
  "\u2193",
  "\u2199",
  "\u2190",
  "\u2196",
  "Any",
] as const;

function validU32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

export function gen4AdvanceModeToWasm(mode: Gen4AdvanceMode) {
  return mode === "calls" ? 0 : mode === "chatot" ? 1 : 2;
}

function valueMaximum(mode: Gen4AdvanceMode) {
  return mode === "calls" ? 2 : mode === "chatot" ? 99 : 7;
}

function tokenMaximum(mode: Gen4AdvanceMode) {
  return mode === "calls" ? 2 : mode === "chatot" ? 9 : 8;
}

export function validateGen4AdvanceRequest(request: Gen4AdvanceRequest) {
  const errors: string[] = [];
  if (
    request.rows.length === 0 ||
    request.rows.length > GEN4_ADVANCE_MAX_ROWS ||
    request.rows.some(
      (row) =>
        !validU32(row.advances) ||
        !Number.isInteger(row.value) ||
        row.value < 0 ||
        row.value > valueMaximum(request.mode),
    )
  )
    errors.push("rows");
  if (
    request.tokens.length === 0 ||
    request.tokens.length > GEN4_ADVANCE_MAX_TOKENS ||
    request.tokens.length > request.rows.length ||
    request.tokens.some(
      (token) =>
        !Number.isInteger(token) ||
        token < 0 ||
        token > tokenMaximum(request.mode),
    )
  )
    errors.push("tokens");
  return errors;
}

function parseAdvance(text: string) {
  if (!/^\d{1,10}$/.test(text)) return undefined;
  const value = Number(text);
  return validU32(value) ? value : undefined;
}

function parseValue(mode: Gen4AdvanceMode, text: string) {
  if (mode === "calls") {
    const normalized = text.toUpperCase();
    const value = gen4AdvanceCallLabels.indexOf(
      normalized as (typeof gen4AdvanceCallLabels)[number],
    );
    if (value >= 0) return value;
  }
  if (!/^\d{1,2}$/.test(text)) return undefined;
  const value = Number(text);
  return value <= valueMaximum(mode) ? value : undefined;
}

export function parseGen4AdvanceRows(mode: Gen4AdvanceMode, text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0 || lines.length > GEN4_ADVANCE_MAX_ROWS)
    return undefined;
  const rows: Gen4AdvanceRow[] = [];
  for (const line of lines) {
    const parts = line.split(/[\s,;\t]+/).filter(Boolean);
    if (parts.length !== 2) return undefined;
    const advances = parseAdvance(parts[0]);
    const value = parseValue(mode, parts[1]);
    if (advances === undefined || value === undefined) return undefined;
    rows.push({ advances, value });
  }
  return rows;
}

export function packGen4AdvanceRows(rows: Gen4AdvanceRow[]) {
  const words = new Uint32Array(rows.length * 2);
  rows.forEach((row, index) => {
    words[index * 2] = row.advances;
    words[index * 2 + 1] = row.value;
  });
  return words;
}

export function packGen4AdvanceTokens(tokens: Gen4AdvanceToken[]) {
  return Uint32Array.from(tokens);
}

export function decodeGen4AdvanceMatches(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % 2 !== 0)
    throw new RangeError("Invalid Gen4 Advance Finder result buffer length.");
  return Array.from({ length: words.length / 2 }, (_, index) => ({
    row: words[index * 2],
    advances: words[index * 2 + 1],
  }));
}

export function gen4AdvanceChunk(
  request: Gen4AdvanceRequest,
): Gen4AdvanceChunk {
  return { index: 0, stateCount: request.rows.length };
}

export function gen4AdvanceTokenLabel(
  mode: Gen4AdvanceMode,
  token: Gen4AdvanceToken,
) {
  if (mode === "calls")
    return gen4AdvanceCallLabels[token as Gen4AdvanceCallToken];
  if (mode === "chatot")
    return gen4AdvanceChatotLabels[token as Gen4AdvanceChatotToken];
  return gen4AdvanceNeedleLabels[token as Gen4AdvanceNeedleToken];
}
