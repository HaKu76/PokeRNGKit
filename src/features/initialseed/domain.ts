export const GEN3_INITIAL_SEED_API_VERSION = 1;
export const GEN3_INITIAL_SEED_TARGET_CHUNK_SIZE = 500_000;
export const GEN3_INITIAL_SEED_MAX_RESULTS = 65_536;
export const GEN3_INITIAL_SEED_DEFAULT_MAX_RESULTS = 100;
export const GEN3_INITIAL_SEED_MAX_TOTAL_STATES = 0xffff_ffff;

export type Gen3InitialSeedOperation = "rs-ids" | "frlg-rse";

export interface Gen3RsInitialSeedRequest {
  tid: number;
  sid: number;
}

export interface Gen3TargetInitialSeedRequest {
  targetSeed: number;
  maxResults: number;
}

export interface Gen3InitialSeedState {
  initialSeed: number;
  advances: number;
}

export interface Gen3InitialSeedChunk {
  index: number;
  startAdvance: number;
  stateCount: number;
}

const isUint16 = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffff;
const isUint32 = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;

export function validateGen3RsInitialSeedRequest(
  request: Gen3RsInitialSeedRequest,
): string[] {
  const errors: string[] = [];
  if (!isUint16(request.tid)) errors.push("tid");
  if (!isUint16(request.sid)) errors.push("sid");
  return errors;
}

export function validateGen3TargetInitialSeedRequest(
  request: Gen3TargetInitialSeedRequest,
): string[] {
  const errors: string[] = [];
  if (!isUint32(request.targetSeed)) errors.push("targetSeed");
  if (
    !Number.isInteger(request.maxResults) ||
    request.maxResults < 1 ||
    request.maxResults > GEN3_INITIAL_SEED_MAX_RESULTS
  ) {
    errors.push("maxResults");
  }
  return errors;
}

export function createGen3InitialSeedTargetChunk(
  index: number,
  startAdvance: number,
  chunkSize = GEN3_INITIAL_SEED_TARGET_CHUNK_SIZE,
): Gen3InitialSeedChunk | undefined {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > GEN3_INITIAL_SEED_TARGET_CHUNK_SIZE ||
    startAdvance >= GEN3_INITIAL_SEED_MAX_TOTAL_STATES
  ) {
    return undefined;
  }
  return {
    index,
    startAdvance,
    stateCount: Math.min(
      chunkSize,
      GEN3_INITIAL_SEED_MAX_TOTAL_STATES - startAdvance,
    ),
  };
}

export function decodeGen3InitialSeedStates(
  buffer: ArrayBuffer,
): Gen3InitialSeedState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 2 !== 0) {
    throw new RangeError("Invalid Gen3 initial seed result buffer length.");
  }
  const states = new Array<Gen3InitialSeedState>(words.length / 2);
  for (let source = 0, target = 0; source < words.length; source += 2, target++) {
    states[target] = {
      initialSeed: words[source],
      advances: words[source + 1],
    };
  }
  return states;
}
