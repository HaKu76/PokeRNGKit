export const GEN7_MAIN_API_VERSION = 1;
export const GEN7_MAIN_MAX_FRAME = 100_000_000;
export const GEN7_MAIN_MAX_NEEDLES = 16;
export const GEN7_MAIN_MAX_SEED_CHUNK = 1 << 24;
export const GEN7_MAIN_SEED_SPACE = 0x1_0000_0000;

export type Gen7MainVersion = "sun" | "moon" | "ultra-sun" | "ultra-moon";
export type Gen7MainSeedMode = "initial" | "id";

export interface Gen7MainSeedRequest {
  operation: "seed-search";
  version: Gen7MainVersion;
  mode: Gen7MainSeedMode;
  needles: number[];
}

export interface Gen7MainQrRequest {
  operation: "qr-search";
  seed: number;
  minFrame: number;
  maxFrame: number;
  needles: number[];
}

export interface Gen7MainTimeRequest {
  operation: "time-calculator";
  seed: number;
  startingFrame: number;
  targetFrame: number;
  npc: number;
  fidget: boolean;
  raining: boolean;
}

export interface Gen7MainSeedResult {
  seed: number;
  correction: number;
}

export interface Gen7MainQrResult {
  lastClockFrame: number;
  afterQrFrame: number;
}

export interface Gen7MainTimeResult {
  primaryFrames: number;
  secondaryFrames: number;
}

export interface Gen7MainSeedChunk {
  index: number;
  startSeed: number;
  seedCount: number;
}

export function gen7MainIsUltra(version: Gen7MainVersion) {
  return version === "ultra-sun" || version === "ultra-moon";
}

export function gen7MainStartingFrame(
  version: Gen7MainVersion,
  mode: Gen7MainSeedMode | "normal" = "normal",
) {
  if (mode === "id") return gen7MainIsUltra(version) ? 1132 : 1012;
  return gen7MainIsUltra(version) ? 478 : 418;
}

export function gen7MainSeedOffset(
  version: Gen7MainVersion,
  mode: Gen7MainSeedMode,
) {
  if (mode === "id") return gen7MainIsUltra(version) ? 1132 : 1012;
  return gen7MainIsUltra(version) ? 477 : 417;
}

export function gen7MainNeedleMinimum(mode: Gen7MainSeedMode) {
  return mode === "id" ? 9 : 8;
}

function integerIn(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function validateNeedles(needles: number[], minimumLength: number) {
  if (
    !Array.isArray(needles) ||
    needles.length < minimumLength ||
    needles.length > GEN7_MAIN_MAX_NEEDLES ||
    needles.some((needle) => !integerIn(needle, 0, 16))
  ) {
    throw new RangeError(
      `Needle input must contain ${minimumLength}..${GEN7_MAIN_MAX_NEEDLES} values from 0 to 16.`,
    );
  }
}

export function validateGen7MainSeedRequest(request: Gen7MainSeedRequest) {
  if (
    request.operation !== "seed-search" ||
    !["sun", "moon", "ultra-sun", "ultra-moon"].includes(request.version) ||
    !["initial", "id"].includes(request.mode)
  ) {
    throw new TypeError("Invalid Gen 7 Main RNG seed search request.");
  }
  validateNeedles(request.needles, gen7MainNeedleMinimum(request.mode));
  return request;
}

export function validateGen7MainQrRequest(request: Gen7MainQrRequest) {
  if (
    request.operation !== "qr-search" ||
    !integerIn(request.seed, 0, 0xffffffff)
  )
    throw new TypeError("Invalid Gen 7 Main RNG QR request.");
  if (
    !integerIn(request.minFrame, 0, GEN7_MAIN_MAX_FRAME) ||
    !integerIn(request.maxFrame, 0, GEN7_MAIN_MAX_FRAME) ||
    request.minFrame > request.maxFrame
  ) {
    throw new RangeError("QR frame range is invalid.");
  }
  validateNeedles(request.needles, 2);
  return request;
}

export function validateGen7MainTimeRequest(request: Gen7MainTimeRequest) {
  if (
    request.operation !== "time-calculator" ||
    !integerIn(request.seed, 0, 0xffffffff)
  )
    throw new TypeError("Invalid Gen 7 Main RNG time request.");
  if (
    !integerIn(request.startingFrame, 0, GEN7_MAIN_MAX_FRAME) ||
    !integerIn(request.targetFrame, 0, GEN7_MAIN_MAX_FRAME) ||
    !integerIn(request.npc, 0, 50) ||
    typeof request.fidget !== "boolean" ||
    typeof request.raining !== "boolean"
  ) {
    throw new RangeError("Time calculator input is invalid.");
  }
  return request;
}

export function splitGen7MainSeedSearch(
  chunkSize = 1 << 20,
): Gen7MainSeedChunk[] {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 4 ||
    chunkSize > GEN7_MAIN_MAX_SEED_CHUNK
  )
    throw new RangeError("Seed search chunk size is invalid.");
  const chunks: Gen7MainSeedChunk[] = [];
  for (
    let startSeed = 0;
    startSeed < GEN7_MAIN_SEED_SPACE;
    startSeed += chunkSize
  ) {
    chunks.push({
      index: chunks.length,
      startSeed,
      seedCount: Math.min(chunkSize, GEN7_MAIN_SEED_SPACE - startSeed),
    });
  }
  return chunks;
}

export function formatGen7MainHex(value: number) {
  return (value >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function appendGen7MainNeedle(
  needles: number[],
  value: number,
  offset: number,
  useEndPosition: boolean,
) {
  if (!integerIn(value, 0, 16) || !integerIn(offset, 0, 16))
    throw new RangeError("Clock hand must be between 0 and 16.");
  const adjusted = useEndPosition ? (value + 17 - offset) % 17 : value;
  if (needles.length >= GEN7_MAIN_MAX_NEEDLES)
    throw new RangeError("The clock sequence is full.");
  return [...needles, adjusted];
}

const STARTUP_KEY = "pokerngkit-gen7-main-startup";
const CONTEXT_KEY = "pokerngkit-gen7-main-context";

export interface Gen7MainContext {
  version: Gen7MainVersion;
  seed: number;
  normalFrame: number;
  idCorrection: number;
}

export function loadGen7MainStartup(storage?: Storage) {
  try {
    return (storage ?? globalThis.localStorage).getItem(STARTUP_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveGen7MainStartup(value: boolean, storage?: Storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(STARTUP_KEY, String(value));
  } catch {
    // Browser storage is optional for the calculator.
  }
}

export function loadGen7MainContext(
  storage?: Storage,
): Gen7MainContext | undefined {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(CONTEXT_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<Gen7MainContext>;
    if (
      !["sun", "moon", "ultra-sun", "ultra-moon"].includes(
        value.version ?? "",
      ) ||
      !integerIn(value.seed ?? Number.NaN, 0, 0xffffffff) ||
      !integerIn(value.normalFrame ?? Number.NaN, 0, GEN7_MAIN_MAX_FRAME) ||
      !integerIn(value.idCorrection ?? Number.NaN, 0, 16)
    )
      return undefined;
    return value as Gen7MainContext;
  } catch {
    return undefined;
  }
}

export function saveGen7MainContext(
  context: Gen7MainContext,
  storage?: Storage,
) {
  try {
    (storage ?? globalThis.localStorage).setItem(
      CONTEXT_KEY,
      JSON.stringify(context),
    );
  } catch {
    // Browser storage is optional for the calculator.
  }
}

export function validateGen7MainSeedResult(result: Gen7MainSeedResult) {
  if (
    !integerIn(result.seed, 0, 0xffffffff) ||
    !integerIn(result.correction, 0, 16)
  )
    throw new RangeError("Gen 7 Main RNG returned an invalid Seed result.");
  return result;
}

export function validateGen7MainQrResult(result: Gen7MainQrResult) {
  if (
    !integerIn(
      result.lastClockFrame,
      0,
      GEN7_MAIN_MAX_FRAME + GEN7_MAIN_MAX_NEEDLES,
    ) ||
    !integerIn(
      result.afterQrFrame,
      0,
      GEN7_MAIN_MAX_FRAME + GEN7_MAIN_MAX_NEEDLES,
    )
  )
    throw new RangeError("Gen 7 Main RNG returned an invalid QR result.");
  return result;
}

export function validateGen7MainTimeResult(result: Gen7MainTimeResult) {
  if (
    !Number.isSafeInteger(result.primaryFrames) ||
    !Number.isSafeInteger(result.secondaryFrames)
  )
    throw new RangeError("Gen 7 Main RNG returned an invalid time result.");
  return result;
}
