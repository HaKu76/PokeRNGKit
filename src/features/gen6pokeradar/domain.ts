export const GEN6_POKERADAR_API_VERSION = 1,
  GEN6_POKERADAR_REQUEST_WORDS = 8,
  GEN6_POKERADAR_RESULT_WORDS = 16,
  GEN6_POKERADAR_MAX_RESULTS = 100_000,
  GEN6_POKERADAR_MAX_FRAME = 1_000_000_000,
  GEN6_POKERADAR_BROWSER_MAX_FRAME = 5_000_000;
export type Gen6PokeRadarPatchState = "bad" | "good" | "shiny" | "empty";
export interface Gen6PokeRadarPatch {
  ring: number;
  direction: number;
  location: number;
  state: Gen6PokeRadarPatchState;
  x: number;
  y: number;
}
export interface Gen6PokeRadarRequest {
  tinySeed: number;
  minFrame: number;
  maxFrame: number;
  tinyFrame: number;
  partySize: number;
  chainLength: number;
  boost: boolean;
  resultLimit: number;
}
export interface Gen6PokeRadarResult {
  frame: number;
  music: number;
  musicType: "A" | "-" | "M";
  boost: boolean;
  shiny: boolean;
  patches: [
    Gen6PokeRadarPatch,
    Gen6PokeRadarPatch,
    Gen6PokeRadarPatch,
    Gen6PokeRadarPatch,
    Gen6PokeRadarPatch,
  ];
}
const UINT32_MAX = 0xffff_ffff;
function integerIn(value: unknown, min: number, max: number) {
  return (
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max
  );
}
export function gen6PokeRadarTaskCount(request: Gen6PokeRadarRequest) {
  return request.maxFrame - request.minFrame + 1;
}
export function validateGen6PokeRadarRequest(request: Gen6PokeRadarRequest) {
  if (!integerIn(request.tinySeed, 0, UINT32_MAX))
    throw new TypeError("Tiny Seed must be a 32-bit unsigned integer.");
  if (
    !integerIn(request.minFrame, 0, GEN6_POKERADAR_MAX_FRAME) ||
    !integerIn(request.maxFrame, request.minFrame, GEN6_POKERADAR_MAX_FRAME)
  )
    throw new TypeError("Frame range is invalid.");
  if (request.maxFrame > GEN6_POKERADAR_BROWSER_MAX_FRAME)
    throw new TypeError(
      "Gen VI Poke Radar browser frames are limited to 5000000.",
    );
  if (
    !integerIn(request.tinyFrame, 0, GEN6_POKERADAR_MAX_FRAME) ||
    !integerIn(request.partySize, 0, 6) ||
    !integerIn(request.chainLength, 0, 100) ||
    typeof request.boost !== "boolean"
  )
    throw new TypeError("Poke Radar settings are invalid.");
  if (!integerIn(request.resultLimit, 1, GEN6_POKERADAR_MAX_RESULTS))
    throw new TypeError("Result limit is outside 1..100000.");
  return request;
}
export function encodeGen6PokeRadarRequest(request: Gen6PokeRadarRequest) {
  validateGen6PokeRadarRequest(request);
  return new Uint32Array([
    request.tinySeed >>> 0,
    request.minFrame,
    gen6PokeRadarTaskCount(request),
    request.tinyFrame,
    request.partySize,
    request.chainLength,
    Number(request.boost),
    request.resultLimit,
  ]);
}
const STATES = ["bad", "good", "shiny", "empty"] as const;
function decodePatch(word: number): Gen6PokeRadarPatch {
  return {
    ring: word & 15,
    direction: (word >>> 4) & 15,
    location: (word >>> 8) & 15,
    state: STATES[(word >>> 12) & 3],
    x: (word >>> 16) & 15,
    y: (word >>> 20) & 15,
  };
}
export function decodeGen6PokeRadarResults(
  buffer: ArrayBuffer,
  limit = GEN6_POKERADAR_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_POKERADAR_RESULT_WORDS !== 0)
    throw new TypeError("Poke Radar result buffer is not aligned.");
  return Array.from(
    { length: Math.min(words.length / GEN6_POKERADAR_RESULT_WORDS, limit) },
    (_, index): Gen6PokeRadarResult => {
      const offset = index * GEN6_POKERADAR_RESULT_WORDS,
        metadata = words[offset + 1];
      return {
        frame: words[offset],
        music: metadata & 0xff,
        musicType: (["A", "-", "M"] as const)[(metadata >>> 8) & 3] ?? "-",
        boost: (metadata & (1 << 16)) !== 0,
        shiny: (metadata & (1 << 17)) !== 0,
        patches: [
          decodePatch(words[offset + 2]),
          decodePatch(words[offset + 3]),
          decodePatch(words[offset + 4]),
          decodePatch(words[offset + 5]),
          decodePatch(words[offset + 6]),
        ],
      };
    },
  );
}
export function gen6PokeRadarOverview(result: Gen6PokeRadarResult) {
  const grid = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => "#"),
  );
  grid[4][4] = "C";
  const chars = { bad: "B", good: "G", shiny: "S", empty: "X" } as const;
  for (const patch of result.patches)
    if (grid[patch.y]?.[patch.x] === "#")
      grid[patch.y][patch.x] = chars[patch.state];
  return grid.map((row) => row.join(""));
}
export function formatGen6PokeRadarPatch(patch: Gen6PokeRadarPatch) {
  return `${patch.state.charAt(0).toUpperCase()} (${patch.x},${patch.y})`;
}
