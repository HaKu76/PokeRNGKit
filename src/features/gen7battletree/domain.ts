export const GEN7_BATTLETREE_API_VERSION = 1;
export const GEN7_BATTLETREE_REQUEST_WORDS = 9;
export const GEN7_BATTLETREE_RESULT_WORDS = 7;
export const GEN7_BATTLETREE_STEP_SIZE = 16_384;
export const GEN7_BATTLETREE_MAX_RESULTS = 100_000;
export const GEN7_BATTLETREE_MAX_FRAME = 5_000_000;

export type Gen7BattleTreeVersion = "sun" | "moon" | "ultra-sun" | "ultra-moon";

export interface Gen7BattleTreeRequest {
  seed: number;
  minFrame: number;
  maxFrame: number;
  version: Gen7BattleTreeVersion;
  npc: number;
  delay: number;
  streak: number;
  trainerFilter: number;
  resultLimit: number;
}

export interface Gen7BattleTreeResult {
  frame: number;
  actualFrame: number;
  realTimeFrames: number;
  random: bigint;
  trainerId: number;
  blink: number;
  clock: number;
}

const VERSION_VALUES: Record<Gen7BattleTreeVersion, number> = {
  sun: 0,
  moon: 1,
  "ultra-sun": 2,
  "ultra-moon": 3,
};

export const GEN7_BATTLETREE_SPECIAL_TRAINERS = [
  "Grimsley",
  "Anabel",
  "Wally",
  "Colress",
  "Cynthia",
  "Plumeria",
  "Guzma",
  "Kiawe",
  "Mallow",
  "Sina",
  "Dexio",
  "Red",
  "Blue",
  "Kukui",
] as const;

function integer(
  value: number,
  name: string,
  minimum: number,
  maximum: number,
) {
  if (!Number.isInteger(value) || value < minimum || value > maximum)
    throw new RangeError(`${name} must be between ${minimum} and ${maximum}.`);
}

export function validateGen7BattleTreeRequest(request: Gen7BattleTreeRequest) {
  if (!(request.version in VERSION_VALUES))
    throw new RangeError("Unsupported Gen 7 Battle Tree version.");
  integer(request.seed, "Seed", 0, 0xffff_ffff);
  integer(request.minFrame, "Starting frame", 0, 1_000_000_000);
  integer(request.maxFrame, "Maximum frame", 0, GEN7_BATTLETREE_MAX_FRAME);
  if (request.minFrame > request.maxFrame)
    throw new RangeError("Starting frame must not exceed maximum frame.");
  integer(request.npc, "NPC count", 0, 100);
  integer(request.delay, "Delay", 0, 10_000);
  integer(request.streak, "Streak", 1, 10_000);
  integer(request.trainerFilter, "Trainer ID", 0, 254);
  integer(request.resultLimit, "Result limit", 1, GEN7_BATTLETREE_MAX_RESULTS);
  return request;
}

export function gen7BattleTreeTaskCount(request: Gen7BattleTreeRequest) {
  validateGen7BattleTreeRequest(request);
  return request.maxFrame - request.minFrame + 1;
}

export function encodeGen7BattleTreeRequest(request: Gen7BattleTreeRequest) {
  validateGen7BattleTreeRequest(request);
  return new Uint32Array([
    request.seed,
    request.minFrame,
    request.maxFrame,
    VERSION_VALUES[request.version],
    request.npc,
    request.delay,
    request.streak,
    request.trainerFilter,
    request.resultLimit,
  ]);
}

export function decodeGen7BattleTreeResults(buffer: ArrayBuffer) {
  if (buffer.byteLength % (GEN7_BATTLETREE_RESULT_WORDS * 4) !== 0)
    throw new RangeError("Gen 7 Battle Tree result buffer is misaligned.");
  const words = new Uint32Array(buffer);
  const results: Gen7BattleTreeResult[] = [];
  for (
    let offset = 0;
    offset < words.length;
    offset += GEN7_BATTLETREE_RESULT_WORDS
  ) {
    const random =
      (BigInt(words[offset + 4]) << 32n) | BigInt(words[offset + 3]);
    results.push({
      frame: words[offset],
      actualFrame: words[offset + 1],
      realTimeFrames: words[offset + 2],
      random,
      trainerId: words[offset + 5],
      blink: words[offset + 6],
      clock: Number(random % 17n),
    });
  }
  return results;
}

export function validateGen7BattleTreeResult(
  request: Gen7BattleTreeRequest,
  result: Gen7BattleTreeResult,
) {
  integer(result.frame, "Result frame", request.minFrame, request.maxFrame);
  integer(result.actualFrame, "Actual frame", result.frame, 0xffff_ffff);
  integer(result.realTimeFrames, "Real time", 0, 0xffff_ffff);
  if (result.random < 0n || result.random > 0xffff_ffff_ffff_ffffn)
    throw new RangeError("Random Number is outside the 64-bit range.");
  integer(result.trainerId, "Trainer ID", 0, 205);
  integer(result.blink, "Blink", 0, 255);
  integer(result.clock, "Clock", 0, 16);
  if (request.trainerFilter < 209 && result.trainerId !== request.trainerFilter)
    throw new Error(
      "Gen 7 Battle Tree result does not match the trainer filter.",
    );
  return result;
}

export function gen7BattleTreeTrainerLabel(trainerId: number) {
  return trainerId >= 192 && trainerId <= 205
    ? GEN7_BATTLETREE_SPECIAL_TRAINERS[trainerId - 192]
    : String(trainerId);
}

export function formatGen7BattleTreeHex64(value: bigint) {
  return value.toString(16).toUpperCase().padStart(16, "0");
}
