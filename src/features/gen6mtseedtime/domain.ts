export const GEN6_MT_SEED_TIME_API_VERSION = 1 as const;
export const GEN6_MT_SEED_TIME_REQUEST_WORDS = 10;
export const GEN6_MT_SEED_TIME_RESULT_WORDS = 8;
export const GEN6_MT_SEED_TIME_DATE_FRAMES = 200_000;
export const GEN6_MT_SEED_TIME_MAX_SECONDS = 5_000_000;
export const GEN6_MT_SEED_TIME_MAX_RESULTS = 100_000;

export type Gen6MtSeedTimeMode = "time" | "date";
export type Gen6MtSeedTimeGame = "xy" | "oras";

export interface Gen6MtSeedTimeRequest {
  mode: Gen6MtSeedTimeMode;
  game: Gen6MtSeedTimeGame;
  frame300Seed: number;
  currentSavePar: number;
  targetSeed: number;
  epoch: bigint;
  maxSeconds: number;
  specificDate: boolean;
  resultLimit: number;
}

export interface Gen6MtSeedTimeResult {
  epoch: bigint;
  frame300Seed: number;
  saveFrame: number;
  savePar: number;
  offsetSeconds: number;
  mode: Gen6MtSeedTimeMode;
  game: Gen6MtSeedTimeGame;
}

const EPOCH_OFFSET = 946_684_800_000n;
const UINT32_MAX = 0xffff_ffff;

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

export function gen6MtSeedTimeEpochFromInput(date: string, time = "00:00:00") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const clock = /^(\d{2}):(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match || !clock) return Number.NaN;
  const parts = [...match.slice(1), ...clock.slice(1)].map(Number);
  const milliseconds = Date.UTC(
    parts[0],
    parts[1] - 1,
    parts[2],
    parts[3],
    parts[4],
    parts[5],
  );
  const parsed = new Date(milliseconds);
  if (
    parsed.getUTCFullYear() !== parts[0] ||
    parsed.getUTCMonth() !== parts[1] - 1 ||
    parsed.getUTCDate() !== parts[2] ||
    parsed.getUTCHours() !== parts[3] ||
    parsed.getUTCMinutes() !== parts[4] ||
    parsed.getUTCSeconds() !== parts[5]
  )
    return Number.NaN;
  return BigInt(milliseconds) - EPOCH_OFFSET;
}

export function formatGen6MtSeedTimeEpoch(epoch: bigint) {
  return new Date(Number(epoch + EPOCH_OFFSET))
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export function gen6MtSeedTimeTaskCount(request: Gen6MtSeedTimeRequest) {
  return request.mode === "time"
    ? request.maxSeconds + 1
    : GEN6_MT_SEED_TIME_DATE_FRAMES;
}

export function validateGen6MtSeedTimeRequest(request: Gen6MtSeedTimeRequest) {
  if (request.mode !== "time" && request.mode !== "date")
    throw new TypeError("Invalid MT Seed Time Finder mode.");
  if (request.game !== "xy" && request.game !== "oras")
    throw new TypeError("Invalid game version.");
  if (
    !integerIn(request.frame300Seed, 0, UINT32_MAX) ||
    !integerIn(request.currentSavePar, 0, UINT32_MAX) ||
    !integerIn(request.targetSeed, 0, UINT32_MAX)
  )
    throw new TypeError("Seed and Save Parameter must be 32-bit words.");
  if (
    typeof request.epoch !== "bigint" ||
    request.epoch < 0n ||
    request.epoch % 1000n !== 0n
  )
    throw new TypeError("Target date/time must align to whole seconds.");
  if (!integerIn(request.maxSeconds, 0, GEN6_MT_SEED_TIME_MAX_SECONDS))
    throw new TypeError("Time search seconds exceed the browser range.");
  if (!integerIn(request.resultLimit, 1, GEN6_MT_SEED_TIME_MAX_RESULTS))
    throw new TypeError("Result limit is outside its range.");
  return request;
}

export function encodeGen6MtSeedTimeRequest(request: Gen6MtSeedTimeRequest) {
  validateGen6MtSeedTimeRequest(request);
  const epoch = request.epoch;
  return Uint32Array.from([
    request.mode === "time" ? 1 : 0,
    request.game === "xy" ? 1 : 0,
    request.frame300Seed,
    request.currentSavePar,
    request.targetSeed,
    Number(epoch & 0xffff_ffffn),
    Number((epoch >> 32n) & 0xffff_ffffn),
    request.maxSeconds,
    request.specificDate ? 1 : 0,
    request.resultLimit,
  ]);
}

export function decodeGen6MtSeedTimeResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_MT_SEED_TIME_RESULT_WORDS !== 0)
    throw new RangeError("Invalid MT Seed Time Finder result buffer.");
  return Array.from(
    { length: words.length / GEN6_MT_SEED_TIME_RESULT_WORDS },
    (_, index): Gen6MtSeedTimeResult => {
      const offset = index * GEN6_MT_SEED_TIME_RESULT_WORDS;
      return {
        epoch: (BigInt(words[offset + 1]) << 32n) | BigInt(words[offset]),
        frame300Seed: words[offset + 2],
        saveFrame: words[offset + 3] | 0,
        savePar: words[offset + 4],
        offsetSeconds: words[offset + 5],
        mode: words[offset + 6] === 1 ? "time" : "date",
        game: words[offset + 7] === 1 ? "xy" : "oras",
      };
    },
  );
}

export function formatGen6MtSeedTimeHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
