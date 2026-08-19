export const GEN6_MT_SEED_API_VERSION = 1 as const;
export const GEN6_MT_SEED_REQUEST_WORDS = 33;
export const GEN6_MT_SEED_RESULT_WORDS = 32;
export const GEN6_MT_SEED_MAX_FRAME = 10_000_000;
export const GEN6_MT_SEED_MIN_FRAME_MAX = 100_000;
export const GEN6_MT_SEED_MAX_RESULTS = 100_000;
export const GEN6_MT_SEED_MAX_TASKS = 5_000_000;
export const GEN6_MT_SEED_ALL_NATURES = 0x1ff_ffff;

export type Gen6MtSeedMode =
  "ivs" | "pid" | "ec" | "pid-reroll" | "ec-pid" | "horde";

export type Gen6MtSeedIvTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface Gen6MtSeedRequest {
  mode: Gen6MtSeedMode;
  startSeed: number;
  endSeed: number;
  minFrame: number;
  maxFrame: number;
  desiredPid: number;
  tsv: number;
  trv: number;
  shinyType: number;
  perfectIvs: number;
  ivMode: "perfect" | "specific";
  specificIvMask: number;
  natureMask: number;
  minIvs: Gen6MtSeedIvTuple;
  maxIvs: Gen6MtSeedIvTuple;
  abilityLocked: boolean;
  possibleHa: boolean;
  niceEc: boolean;
  hordeShinies: number;
  anyTsv: boolean;
  fast: boolean;
  showUnown: boolean;
  resultLimit: number;
}

export interface Gen6MtSeedResult {
  seed: number;
  frame: number;
  pid: number;
  psv: number;
  prv: number;
  ivs: Gen6MtSeedIvTuple;
  ivs2: Gen6MtSeedIvTuple;
  nature: number;
  ability: number;
  secondary: number;
  flags: number;
  aux: number;
  hordeJumps: [number, number, number, number, number];
  hordeSpecies: number;
}

const UINT32_MAX = 0xffff_ffff;
const MODES: readonly Gen6MtSeedMode[] = [
  "ivs",
  "pid",
  "ec",
  "pid-reroll",
  "ec-pid",
  "horde",
];

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function validateIvs(value: unknown, label: string) {
  if (
    !Array.isArray(value) ||
    value.length !== 6 ||
    value.some((iv) => !integerIn(iv, 0, 31))
  )
    throw new TypeError(`${label} must contain six IVs between 0 and 31.`);
}

export function gen6MtSeedTaskCount(request: Gen6MtSeedRequest) {
  return request.endSeed - request.startSeed + 1;
}

export function validateGen6MtSeedRequest(request: Gen6MtSeedRequest) {
  if (!MODES.includes(request.mode))
    throw new TypeError("Invalid Gen VI MT Seed mode.");
  if (
    !integerIn(request.startSeed, 0, UINT32_MAX) ||
    !integerIn(request.endSeed, 0, UINT32_MAX) ||
    request.endSeed < request.startSeed
  )
    throw new TypeError("Seed range must use unsigned 32-bit integers.");
  if (
    !integerIn(request.minFrame, 0, GEN6_MT_SEED_MIN_FRAME_MAX) ||
    !integerIn(request.maxFrame, request.minFrame, GEN6_MT_SEED_MAX_FRAME)
  )
    throw new TypeError("Frame range must be between 0 and 10000000.");
  if (!integerIn(request.desiredPid, 0, UINT32_MAX))
    throw new TypeError("PID/EC must be a 32-bit word.");
  if (!integerIn(request.tsv, 0, 4095) || !integerIn(request.trv, 0, 15))
    throw new TypeError("TSV/TRV range is invalid.");
  if (!integerIn(request.shinyType, 0, 3))
    throw new TypeError("Shiny type is invalid.");
  if (
    !integerIn(request.perfectIvs, 0, 3) ||
    !integerIn(request.specificIvMask, 0, 63)
  )
    throw new TypeError("IV setting is invalid.");
  if (!integerIn(request.natureMask, 1, GEN6_MT_SEED_ALL_NATURES))
    throw new TypeError("Nature mask is invalid.");
  validateIvs(request.minIvs, "Minimum IVs");
  validateIvs(request.maxIvs, "Maximum IVs");
  request.minIvs.forEach((minimum, index) => {
    if (request.maxIvs[index] < minimum)
      throw new TypeError("Maximum IV must not be smaller than minimum IV.");
  });
  if (!integerIn(request.hordeShinies, 2, 5))
    throw new TypeError("Horde shiny count must be between 2 and 5.");
  if (!integerIn(request.resultLimit, 1, GEN6_MT_SEED_MAX_RESULTS))
    throw new TypeError("Result limit is invalid.");
  if (
    request.mode === "horde" &&
    request.endSeed - request.startSeed + 1 > GEN6_MT_SEED_MAX_TASKS
  )
    throw new TypeError("Horde Seed range exceeds the browser search budget.");
  return request;
}

export function encodeGen6MtSeedRequest(request: Gen6MtSeedRequest) {
  validateGen6MtSeedRequest(request);
  return Uint32Array.from([
    MODES.indexOf(request.mode),
    request.startSeed,
    request.endSeed,
    request.minFrame,
    request.maxFrame,
    request.desiredPid,
    request.tsv,
    request.trv,
    request.shinyType,
    request.ivMode === "specific" ? 1 : 0,
    request.perfectIvs,
    request.specificIvMask,
    request.natureMask,
    ...request.minIvs,
    ...request.maxIvs,
    request.abilityLocked ? 1 : 0,
    request.possibleHa ? 1 : 0,
    request.niceEc ? 1 : 0,
    request.hordeShinies,
    request.anyTsv ? 1 : 0,
    request.fast ? 1 : 0,
    request.showUnown ? 1 : 0,
    request.resultLimit,
  ]);
}

export function decodeGen6MtSeedResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_MT_SEED_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen VI MT Seed result buffer.");
  return Array.from(
    { length: words.length / GEN6_MT_SEED_RESULT_WORDS },
    (_, index) => {
      const offset = index * GEN6_MT_SEED_RESULT_WORDS;
      return {
        seed: words[offset],
        frame: words[offset + 1],
        pid: words[offset + 2],
        psv: words[offset + 3],
        prv: words[offset + 4],
        ivs: [
          words[offset + 5],
          words[offset + 6],
          words[offset + 7],
          words[offset + 8],
          words[offset + 9],
          words[offset + 10],
        ] as Gen6MtSeedIvTuple,
        ivs2: [
          words[offset + 11],
          words[offset + 12],
          words[offset + 13],
          words[offset + 14],
          words[offset + 15],
          words[offset + 16],
        ] as Gen6MtSeedIvTuple,
        nature: words[offset + 17],
        ability: words[offset + 18],
        secondary: words[offset + 19],
        flags: words[offset + 20],
        aux: words[offset + 21],
        hordeJumps: [
          words[offset + 22],
          words[offset + 23],
          words[offset + 24],
          words[offset + 25],
          words[offset + 26],
        ],
        hordeSpecies: words[offset + 27],
      } satisfies Gen6MtSeedResult;
    },
  );
}

export function formatGen6MtSeedHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function normalizeGen6MtSeedHex(value: string) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 8)
    .toUpperCase();
}

export function parseGen6MtSeedHex(value: string) {
  const normalized = value.trim();
  return normalized === ""
    ? 0
    : /^[0-9a-f]{1,8}$/i.test(normalized)
      ? Number.parseInt(normalized, 16)
      : Number.NaN;
}
