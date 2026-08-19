export const GEN6_MAIN_SEED_API_VERSION = 1 as const;
export const GEN6_MAIN_SEED_REQUEST_WORDS = 22;
export const GEN6_MAIN_SEED_RESULT_WORDS = 6;
export const GEN6_MAIN_SEED_CHUNK_SIZE = 1 << 12;
export const GEN6_MAIN_SEED_MAX_SEED = 0xffff_ffff;
export const GEN6_MAIN_SEED_SINGLE_MAX_RANGE = 0x1000_0000;
export const GEN6_MAIN_SEED_FIRST_FRAME_MAX = 4_000;
export const GEN6_MAIN_SEED_SECOND_FRAME_MAX = 10_000;

export type Gen6MainSeedIvTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
];

interface Gen6MainSeedRequestBase {
  startSeed: number;
  endSeed: number;
}

export interface Gen6MainSeedTwoWildRequest extends Gen6MainSeedRequestBase {
  mode: "two-wilds";
  firstIvs: Gen6MainSeedIvTuple;
  firstMinFrame: number;
  firstMaxFrame: number;
  secondIvs: Gen6MainSeedIvTuple;
  secondMinFrame: number;
  secondMaxFrame: number;
}

export interface Gen6MainSeedOneWildRequest extends Gen6MainSeedRequestBase {
  mode: "one-wild-range";
  lowerIvs: Gen6MainSeedIvTuple;
  upperIvs: Gen6MainSeedIvTuple;
  minFrame: number;
  maxFrame: number;
  nature: number;
}

export type Gen6MainSeedRequest =
  Gen6MainSeedTwoWildRequest | Gen6MainSeedOneWildRequest;

export interface Gen6MainSeedChunk {
  index: number;
  startSeed: number;
  endSeed: number;
}

export interface Gen6MainSeedResult {
  seed: number;
  frame1: number;
  nature1: number;
  frame2: number;
  nature2: number;
  gender: number;
}

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
  ) {
    throw new TypeError(`${label} must contain six IVs between 0 and 31.`);
  }
}

export function gen6MainSeedTaskCount(request: Gen6MainSeedRequest) {
  return request.endSeed - request.startSeed + 1;
}

export function validateGen6MainSeedRequest(request: Gen6MainSeedRequest) {
  if (
    !integerIn(request.startSeed, 0, GEN6_MAIN_SEED_MAX_SEED) ||
    !integerIn(request.endSeed, 0, GEN6_MAIN_SEED_MAX_SEED)
  ) {
    throw new TypeError("Seed range must use unsigned 32-bit integers.");
  }
  if (request.endSeed < request.startSeed)
    throw new TypeError("Maximum Seed must not be smaller than Minimum Seed.");

  if (request.mode === "two-wilds") {
    validateIvs(request.firstIvs, "Pokemon 1 IVs");
    validateIvs(request.secondIvs, "Pokemon 2 IVs");
    if (
      !integerIn(request.firstMinFrame, 0, GEN6_MAIN_SEED_FIRST_FRAME_MAX) ||
      !integerIn(
        request.firstMaxFrame,
        request.firstMinFrame,
        GEN6_MAIN_SEED_FIRST_FRAME_MAX,
      ) ||
      !integerIn(
        request.secondMinFrame,
        request.firstMaxFrame,
        GEN6_MAIN_SEED_SECOND_FRAME_MAX,
      ) ||
      !integerIn(
        request.secondMaxFrame,
        request.secondMinFrame,
        GEN6_MAIN_SEED_SECOND_FRAME_MAX,
      )
    ) {
      throw new TypeError(
        "Frame ranges must satisfy Min 1 <= Max 1 <= Min 2 <= Max 2.",
      );
    }
  } else if (request.mode === "one-wild-range") {
    validateIvs(request.lowerIvs, "Lower IVs");
    validateIvs(request.upperIvs, "Upper IVs");
    if (
      !integerIn(request.minFrame, 0, GEN6_MAIN_SEED_FIRST_FRAME_MAX) ||
      !integerIn(
        request.maxFrame,
        request.minFrame,
        GEN6_MAIN_SEED_FIRST_FRAME_MAX,
      )
    ) {
      throw new TypeError("Encounter Frame Range must be between 0 and 4000.");
    }
    if (!integerIn(request.nature, 0, 24))
      throw new TypeError("Nature must be between 0 and 24.");
    request.lowerIvs.forEach((lower, index) => {
      const upper = request.upperIvs[index];
      if (upper < lower || upper > lower + 2)
        throw new TypeError(
          "Each upper IV must be between its lower IV and lower IV plus 2.",
        );
    });
    if (request.endSeed - request.startSeed > GEN6_MAIN_SEED_SINGLE_MAX_RANGE) {
      throw new TypeError("One-wild Seed Range must not exceed 0x10000000.");
    }
  } else {
    throw new TypeError("Invalid Gen VI Main Seed Finder mode.");
  }
  return request;
}

export function gen6MainSeedChunkCount(
  request: Gen6MainSeedRequest,
  chunkSize = GEN6_MAIN_SEED_CHUNK_SIZE,
) {
  validateGen6MainSeedRequest(request);
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new TypeError("Chunk size must be a positive integer.");
  return Math.ceil(gen6MainSeedTaskCount(request) / chunkSize);
}

export function gen6MainSeedChunkAt(
  request: Gen6MainSeedRequest,
  index: number,
  chunkSize = GEN6_MAIN_SEED_CHUNK_SIZE,
): Gen6MainSeedChunk {
  const count = gen6MainSeedChunkCount(request, chunkSize);
  if (!Number.isInteger(index) || index < 0 || index >= count)
    throw new RangeError("Invalid Gen VI Main Seed Finder chunk index.");
  const startSeed = request.startSeed + index * chunkSize;
  return {
    index,
    startSeed,
    endSeed: Math.min(request.endSeed, startSeed + chunkSize - 1),
  };
}

export function encodeGen6MainSeedRequest(
  request: Gen6MainSeedRequest,
  chunk: Gen6MainSeedChunk,
) {
  validateGen6MainSeedRequest(request);
  if (
    !Number.isInteger(chunk.index) ||
    chunk.index < 0 ||
    !Number.isInteger(chunk.startSeed) ||
    !Number.isInteger(chunk.endSeed) ||
    chunk.startSeed < request.startSeed ||
    chunk.endSeed > request.endSeed ||
    chunk.startSeed > chunk.endSeed
  ) {
    throw new TypeError("Invalid Gen VI Main Seed Finder chunk.");
  }
  const twoWilds = request.mode === "two-wilds";
  return Uint32Array.from([
    twoWilds ? 0 : 1,
    request.startSeed,
    request.endSeed,
    chunk.startSeed,
    chunk.endSeed,
    twoWilds ? request.firstMinFrame : request.minFrame,
    twoWilds ? request.firstMaxFrame : request.maxFrame,
    twoWilds ? request.secondMinFrame : 0,
    twoWilds ? request.secondMaxFrame : 0,
    twoWilds ? 0 : request.nature,
    ...(twoWilds ? request.firstIvs : request.lowerIvs),
    ...(twoWilds ? request.secondIvs : request.upperIvs),
  ]);
}

export function decodeGen6MainSeedResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_MAIN_SEED_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen VI Main Seed Finder result buffer.");
  return Array.from(
    { length: words.length / GEN6_MAIN_SEED_RESULT_WORDS },
    (_, index): Gen6MainSeedResult => {
      const offset = index * GEN6_MAIN_SEED_RESULT_WORDS;
      return {
        seed: words[offset],
        frame1: words[offset + 1],
        nature1: words[offset + 2],
        frame2: words[offset + 3],
        nature2: words[offset + 4],
        gender: words[offset + 5],
      };
    },
  );
}

export function validateGen6MainSeedResult(
  request: Gen6MainSeedRequest,
  result: Gen6MainSeedResult,
) {
  if (
    !integerIn(result.seed, request.startSeed, request.endSeed) ||
    !integerIn(result.nature1, 0, 24)
  ) {
    throw new TypeError("Invalid Gen VI Main Seed Finder result.");
  }
  if (request.mode === "two-wilds") {
    if (
      !integerIn(result.frame1, request.firstMinFrame, request.firstMaxFrame) ||
      !integerIn(
        result.frame2,
        request.secondMinFrame,
        request.secondMaxFrame,
      ) ||
      !integerIn(result.nature2, 0, 24) ||
      result.gender !== 0
    ) {
      throw new TypeError("Invalid two-wild Gen VI Main Seed result.");
    }
  } else if (
    !integerIn(result.frame1, request.minFrame, request.maxFrame) ||
    result.nature1 !== request.nature ||
    result.frame2 !== 0 ||
    result.nature2 !== 0 ||
    !integerIn(result.gender, 0, 251)
  ) {
    throw new TypeError("Invalid one-wild Gen VI Main Seed result.");
  }
  return result;
}

export function normalizeGen6MainSeedHex(value: string) {
  return value
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 8)
    .toUpperCase();
}

export function parseGen6MainSeedHex(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^[0-9a-fA-F]{1,8}$/.test(normalized)
    ? Number.parseInt(normalized, 16)
    : Number.NaN;
}

export function parseGen6MainSeedDecimal(value: string) {
  return /^\d+$/.test(value.trim()) ? Number(value) : Number.NaN;
}

export function formatGen6MainSeedHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
