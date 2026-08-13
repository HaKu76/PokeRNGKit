export const GEN3_NGC_SEED_API_VERSION = 1;
export const GEN3_NGC_SEED_RESULT_WORDS = 1;
export type Gen3NgcSeedMode = "gales" | "colo" | "channel";

export interface Gen3NgcSeedRequest {
  mode: Gen3NgcSeedMode;
  playerIndex?: number;
  enemyIndex?: number;
  enemyHp?: [number, number];
  playerHp?: [number, number];
  partyLead?: number;
  trainer?: number;
  patterns?: number[];
  seeds?: number[] | Uint32Array;
}

export interface Gen3NgcSeedState {
  seed: number;
}

const isUint32 = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
const isHp = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 714;
const channelPatternValues = new Set([
  11, 12, 13, 15, 16, 17, 22, 24, 26, 30, 32, 34,
]);

export function validateGen3NgcSeedRequest(
  request: Gen3NgcSeedRequest,
): string[] {
  const errors: string[] = [];
  if (!(["gales", "colo", "channel"] as const).includes(request.mode))
    errors.push("mode");
  if (request.mode === "gales") {
    if (
      !Number.isInteger(request.playerIndex) ||
      request.playerIndex! < 0 ||
      request.playerIndex! > 4
    )
      errors.push("playerIndex");
    if (
      !Number.isInteger(request.enemyIndex) ||
      request.enemyIndex! < 0 ||
      request.enemyIndex! > 4
    )
      errors.push("enemyIndex");
    if (!request.enemyHp || !request.enemyHp.every(isHp))
      errors.push("enemyHp");
    if (!request.playerHp || !request.playerHp.every(isHp))
      errors.push("playerHp");
  } else if (request.mode === "colo") {
    if (
      !Number.isInteger(request.partyLead) ||
      request.partyLead! < 0 ||
      request.partyLead! > 7
    )
      errors.push("partyLead");
    if (
      !Number.isInteger(request.trainer) ||
      request.trainer! < 0 ||
      request.trainer! > 2
    )
      errors.push("trainer");
  } else if (
    !request.patterns ||
    request.patterns.length < 10 ||
    request.patterns.some((pattern) => !channelPatternValues.has(pattern))
  ) {
    errors.push("patterns");
  }
  if (request.mode === "channel" && request.seeds !== undefined)
    errors.push("seeds");
  if (
    request.mode !== "channel" &&
    request.seeds &&
    request.seeds.some((seed) => !isUint32(seed))
  )
    errors.push("seeds");
  return errors;
}

export function decodeGen3NgcSeedStates(
  buffer: ArrayBuffer,
): Gen3NgcSeedState[] {
  const words = new Uint32Array(buffer);
  if (words.length % GEN3_NGC_SEED_RESULT_WORDS !== 0)
    throw new RangeError("Invalid NGC Seed result buffer length.");
  return Array.from(words, (seed) => ({ seed }));
}

export function formatGen3NgcSeed(seed: number) {
  return seed.toString(16).toUpperCase();
}
