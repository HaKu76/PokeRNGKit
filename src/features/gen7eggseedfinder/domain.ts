export const GEN7_EGG_SEED_FINDER_API_VERSION = 1 as const;
export const GEN7_EGG_SEED_FINDER_CHUNK_SIZE = 1 << 20;
export const GEN7_EGG_SEED_FINDER_PREVIEW_LIMIT = 65_536;
export const GEN7_EGG_SEED_FINDER_MAX_SEED = 0xffff_ffff;

export type NatureSequence = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface Gen7EggSeedSearchRequest {
  startSeed: number;
  endSeed: number;
  natureList: NatureSequence;
  shinyCharm: boolean;
}

export interface Gen7EggSeedChunk {
  index: number;
  startSeed: number;
  endSeed: number;
}

export interface Gen7EggSeedState {
  state: [number, number, number, number];
}

export interface Gen7EggSeedProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7EggSeedSummary extends Gen7EggSeedProgress {
  results: Gen7EggSeedState[];
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Gen7MagikarpRequest {
  bits: string;
}

export function validateGen7EggSeedSearchRequest(
  request: Gen7EggSeedSearchRequest,
) {
  const uint32 = (value: number) =>
    Number.isInteger(value) &&
    value >= 0 &&
    value <= GEN7_EGG_SEED_FINDER_MAX_SEED;
  if (!uint32(request.startSeed) || !uint32(request.endSeed))
    throw new TypeError("Seed range must use unsigned 32-bit integers.");
  if (request.endSeed < request.startSeed)
    throw new TypeError("Maximum Seed must not be smaller than Minimum Seed.");
  if (!Array.isArray(request.natureList) || request.natureList.length !== 8)
    throw new TypeError("Exactly eight natures are required.");
  if (
    request.natureList.some(
      (nature) => !Number.isInteger(nature) || nature < 0 || nature > 25,
    )
  )
    throw new TypeError("Nature values must be between 0 and 25.");
  if (typeof request.shinyCharm !== "boolean")
    throw new TypeError("Shiny Charm must be a boolean.");
  return request;
}

export function validateGen7MagikarpRequest(request: Gen7MagikarpRequest) {
  if (!/^[01]{127}$/.test(request.bits))
    throw new TypeError("Exactly 127 binary gender values are required.");
  return request;
}

export function splitGen7EggSeedSearch(
  request: Gen7EggSeedSearchRequest,
  chunkSize = GEN7_EGG_SEED_FINDER_CHUNK_SIZE,
): Gen7EggSeedChunk[] {
  validateGen7EggSeedSearchRequest(request);
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new TypeError("Chunk size must be a positive integer.");
  const chunks: Gen7EggSeedChunk[] = [];
  let cursor = request.startSeed;
  while (cursor <= request.endSeed) {
    const endSeed = Math.min(request.endSeed, cursor + chunkSize - 1);
    chunks.push({ index: chunks.length, startSeed: cursor, endSeed });
    if (endSeed === GEN7_EGG_SEED_FINDER_MAX_SEED) break;
    cursor = endSeed + 1;
  }
  return chunks;
}

export function formatGen7EggSeedState(state: Gen7EggSeedState) {
  return state.state
    .slice()
    .reverse()
    .map((word) => word.toString(16).toUpperCase().padStart(8, "0"))
    .join(",");
}

export function normalizeBinaryInput(value: string) {
  return value.replace(/\s/g, "");
}

export function normalizeSeedInput(value: string) {
  const digits = value.replace(/[^0-9a-f]/gi, "").slice(0, 8);
  return digits.toUpperCase();
}
