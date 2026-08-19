export const MISC_RNG_API_VERSION = 1;
export const MISC_RNG_MAX_HP = 1_000;
export const MISC_RNG_MAX_CATCH_RATE = 255;
export const MISC_RNG_MAX_RANDOM_RANGE = 0xffff_ffff;

export type MiscGeneration = 6 | 7;
export type RandomCompare = "less-than" | "greater-than" | "equal";

export interface CaptureRequest {
  readonly generation: MiscGeneration;
  readonly hpCurrent: number;
  readonly hpMax: number;
  readonly catchRate: number;
  readonly statusBonus: number;
  readonly ballBonus: number;
  readonly dexBonus: number;
  readonly oPowerBonus: number;
}

export interface CaptureOdds {
  readonly alwaysCapture: boolean;
  readonly criticalRate: number;
  readonly shakeRate: number;
  readonly criticalChance: number;
  readonly shakeChance: number;
  readonly successChance: number;
}

export interface CaptureAttempt {
  readonly criticalValue: number;
  readonly totalShakes: number;
  readonly shakeCount: number;
  readonly maxRandom: number;
  readonly success: boolean;
  readonly consumedRandoms: number;
}

export interface PokerusResult {
  readonly strain: number;
  readonly consumedRandoms: number;
}

export function validateCaptureRequest(request: CaptureRequest) {
  if (request.hpMax < 1 || request.hpMax > MISC_RNG_MAX_HP)
    throw new RangeError("Maximum HP must be between 1 and 1000.");
  if (request.hpCurrent < 0 || request.hpCurrent > request.hpMax)
    throw new RangeError("Current HP must be between 0 and maximum HP.");
  if (request.catchRate < 0 || request.catchRate > MISC_RNG_MAX_CATCH_RATE)
    throw new RangeError("Catch Rate must be between 0 and 255.");
  for (const [name, value] of [
    ["Status Bonus", request.statusBonus],
    ["Ball Bonus", request.ballBonus],
    ["Dex Bonus", request.dexBonus],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > 0x10000)
      throw new RangeError(`${name} must be between 0 and 65536.`);
  }
  if (![1, 1.5, 2, 2.5].includes(request.oPowerBonus))
    throw new RangeError("O-Power Bonus must be 1, 1.5, 2, or 2.5.");
  return request;
}

function multiply(value: bigint, factor: number) {
  return Number((value * BigInt(Math.round(factor)) + 0x800n) >> 12n);
}

function round4096(value: number) {
  return Math.round(value * 4096) / 4096;
}

export function calculateCaptureOdds(request: CaptureRequest): CaptureOdds {
  validateCaptureRequest(request);
  const hpFactor =
    BigInt(3 * request.hpMax - 2 * request.hpCurrent) *
    0x1000n *
    BigInt(request.catchRate);
  const afterBall = Math.floor(
    multiply(hpFactor, request.ballBonus) / (3 * request.hpMax),
  );
  const afterStatus =
    request.statusBonus === 0x1000
      ? afterBall
      : multiply(BigInt(afterBall), request.statusBonus);
  let value = Math.round(afterStatus * request.oPowerBonus);
  const alwaysCapture = value >= 0xff000;
  if (alwaysCapture) value = 0xff000;
  const criticalRate = Math.round(
    multiply(BigInt(value), request.dexBonus) / 4096 / 6,
  );
  const shakeRate = alwaysCapture
    ? 0xffff
    : value === 0
      ? 0
      : Math.floor(
          65536 / round4096(Math.pow(round4096(255 / (value / 4096)), 3 / 16)),
        );
  const criticalChance = criticalRate / 256;
  const shakeChance = shakeRate / 65536;
  const successChance = alwaysCapture
    ? 1
    : criticalChance * shakeChance + (1 - criticalChance) * shakeChance ** 4;
  return {
    alwaysCapture,
    criticalRate,
    shakeRate,
    criticalChance,
    shakeChance,
    successChance,
  };
}

function asRandomBigInt(value: bigint | number) {
  const random = typeof value === "bigint" ? value : BigInt(value >>> 0);
  return random & 0xffff_ffff_ffff_ffffn;
}

export function simulateCapture(
  odds: CaptureOdds,
  generation: MiscGeneration,
  randomValues: readonly (bigint | number)[],
): CaptureAttempt {
  if (randomValues.length === 0)
    throw new RangeError("At least one random value is required.");
  const first = asRandomBigInt(randomValues[0]);
  const criticalValue =
    generation === 6 ? Number((first >> 24n) & 0xffn) : Number(first & 0xffn);
  const totalShakes = criticalValue < odds.criticalRate ? 1 : 4;
  if (odds.alwaysCapture)
    return {
      criticalValue,
      totalShakes,
      shakeCount: totalShakes,
      maxRandom: 0,
      success: true,
      consumedRandoms: 1,
    };
  let shakeCount = 0;
  let maxRandom = 0;
  for (let index = 1; index <= totalShakes; index++) {
    if (randomValues[index] === undefined) break;
    const low16 = Number(asRandomBigInt(randomValues[index]) & 0xffffn);
    maxRandom = Math.max(maxRandom, low16);
    if (low16 < odds.shakeRate && shakeCount === index - 1) shakeCount = index;
  }
  return {
    criticalValue,
    totalShakes,
    shakeCount,
    maxRandom,
    success: shakeCount === totalShakes,
    consumedRandoms: Math.min(randomValues.length, totalShakes + 1),
  };
}

export function pokerusStrain(
  randomValues: readonly (bigint | number)[],
): PokerusResult {
  if (randomValues.length === 0)
    throw new RangeError("At least one random value is required.");
  const first = asRandomBigInt(randomValues[0]);
  const low16 = Number(first & 0xffffn);
  if (low16 !== 0x4000 && low16 !== 0x8000 && low16 !== 0xc000)
    return { strain: 0, consumedRandoms: 1 };
  let index = 1;
  let low8: number;
  do {
    if (randomValues[index] === undefined)
      return { strain: 0, consumedRandoms: index };
    low8 = Number(asRandomBigInt(randomValues[index]) & 0xffn);
    index++;
  } while ((low8 & 0x7) === 0);
  return {
    strain: (low8 & 0xf0) !== 0 ? low8 & 0x7 : low8,
    consumedRandoms: index,
  };
}

export function randomN(random: bigint | number, range: number) {
  if (
    !Number.isInteger(range) ||
    range < 1 ||
    range > MISC_RNG_MAX_RANDOM_RANGE
  )
    throw new RangeError("Random range must be between 1 and 4294967295.");
  return Number(asRandomBigInt(random) % BigInt(range));
}

export function compareRandom(
  value: number,
  compare: RandomCompare,
  target: number,
) {
  if (
    !Number.isInteger(target) ||
    target < 0 ||
    target > MISC_RNG_MAX_RANDOM_RANGE
  )
    throw new RangeError("Random target must be between 0 and 4294967295.");
  if (compare === "less-than") return value < target;
  if (compare === "greater-than") return value >= target;
  return value === target;
}

export function parseMiscHex(value: string) {
  const normalized = value.trim().replace(/^0x/i, "");
  if (normalized === "") return 0n;
  if (!/^[0-9a-f]{1,16}$/i.test(normalized))
    throw new RangeError("Random value must be a hexadecimal integer.");
  return BigInt(`0x${normalized}`);
}
