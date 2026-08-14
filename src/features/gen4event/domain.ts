export const GEN4_EVENT_API_VERSION = 1;
export const GEN4_EVENT_CHUNK_SIZE = 500;
export const GEN4_EVENT_MAX_STATES_PER_CALL = 100_000;
export const GEN4_EVENT_MAX_TOTAL_STATES = 2_000_000;
export const GEN4_EVENT_MAX_RESULTS = 100_000;

export type Gen4EventIvTuple = [number, number, number, number, number, number];

export interface Gen4EventFilters {
  hiddenPowerMask: number;
  ivMin: Gen4EventIvTuple;
  ivMax: Gen4EventIvTuple;
}

export interface Gen4EventCommonRequest {
  species: number;
  nature: number;
  level: number;
  filters: Gen4EventFilters;
}

export interface Gen4EventGeneratorRequest extends Gen4EventCommonRequest {
  seed: number;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
}

export interface Gen4EventSearcherRequest extends Gen4EventCommonRequest {
  minAdvance: number;
  maxAdvance: number;
  minDelay: number;
  maxDelay: number;
}

export interface Gen4EventState {
  advances: number;
  ivs: Gen4EventIvTuple;
  hiddenPower: number;
  hiddenPowerStrength: number;
  call: number;
  chatot: number;
}

export interface Gen4EventSearcherState {
  seed: number;
  delay: number;
  hour: number;
  advances: number;
  ivs: Gen4EventIvTuple;
  hiddenPower: number;
  hiddenPowerStrength: number;
}

export interface Gen4EventChunk {
  index: number;
  initialAdvances: number;
  maxAdvances: number;
  stateCount: number;
}

export interface Gen4EventSearcherChunk {
  index: number;
  startIndex: number;
  stateCount: number;
}

function validU32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function validateCommon(request: Gen4EventCommonRequest) {
  const errors: string[] = [];
  if (
    !Number.isInteger(request.species) ||
    request.species < 1 ||
    request.species > 493
  )
    errors.push("species");
  if (
    !Number.isInteger(request.nature) ||
    request.nature < 0 ||
    request.nature > 24
  )
    errors.push("nature");
  if (
    !Number.isInteger(request.level) ||
    request.level < 1 ||
    request.level > 100
  )
    errors.push("level");
  if (
    !Number.isInteger(request.filters.hiddenPowerMask) ||
    request.filters.hiddenPowerMask < 1 ||
    request.filters.hiddenPowerMask > 0xffff
  )
    errors.push("hiddenPower");
  request.filters.ivMin.forEach((minimum, index) => {
    const maximum = request.filters.ivMax[index];
    if (
      !Number.isInteger(minimum) ||
      !Number.isInteger(maximum) ||
      minimum < 0 ||
      maximum > 31 ||
      minimum > maximum
    )
      errors.push(`iv${index}`);
  });
  return errors;
}

export function validateGen4EventGeneratorRequest(
  request: Gen4EventGeneratorRequest,
) {
  const errors = validateCommon(request);
  if (!validU32(request.seed)) errors.push("seed");
  if (!validU32(request.initialAdvances)) errors.push("initialAdvances");
  if (
    !validU32(request.maxAdvances) ||
    request.maxAdvances + 1 > GEN4_EVENT_MAX_TOTAL_STATES
  )
    errors.push("maxAdvances");
  if (!validU32(request.offset)) errors.push("offset");
  if (
    request.initialAdvances + request.offset + request.maxAdvances >
    0xffff_ffff
  )
    errors.push("advanceRange");
  return errors;
}

export function gen4EventSearcherCombinationCount(
  request: Gen4EventSearcherRequest,
) {
  return request.filters.ivMin.reduce(
    (total, minimum, index) =>
      total * (request.filters.ivMax[index] - minimum + 1),
    1,
  );
}

export function validateGen4EventSearcherRequest(
  request: Gen4EventSearcherRequest,
) {
  const errors = validateCommon(request);
  if (
    !validU32(request.minAdvance) ||
    !validU32(request.maxAdvance) ||
    request.minAdvance > request.maxAdvance
  )
    errors.push("advanceRange");
  if (
    !validU32(request.minDelay) ||
    !validU32(request.maxDelay) ||
    request.minDelay > request.maxDelay
  )
    errors.push("delayRange");
  if (gen4EventSearcherCombinationCount(request) > GEN4_EVENT_MAX_TOTAL_STATES)
    errors.push("searchRange");
  return errors;
}

export function createGen4EventChunks(
  request: Gen4EventGeneratorRequest,
  chunkSize = GEN4_EVENT_CHUNK_SIZE,
) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new RangeError("Gen4 event chunk size must be a positive integer.");
  chunkSize = Math.min(chunkSize, GEN4_EVENT_MAX_STATES_PER_CALL);
  const chunks: Gen4EventChunk[] = [];
  const total = request.maxAdvances + 1;
  for (let start = 0, index = 0; start < total; index++) {
    const count = Math.min(chunkSize, total - start);
    chunks.push({
      index,
      initialAdvances: request.initialAdvances + start,
      maxAdvances: count - 1,
      stateCount: count,
    });
    start += count;
  }
  return chunks;
}

export function createGen4EventSearcherChunks(
  request: Gen4EventSearcherRequest,
  chunkSize = GEN4_EVENT_CHUNK_SIZE,
) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new RangeError("Gen4 event chunk size must be a positive integer.");
  chunkSize = Math.min(chunkSize, GEN4_EVENT_MAX_STATES_PER_CALL);
  const chunks: Gen4EventSearcherChunk[] = [];
  const total = gen4EventSearcherCombinationCount(request);
  for (let start = 0, index = 0; start < total; index++) {
    const count = Math.min(chunkSize, total - start);
    chunks.push({ index, startIndex: start, stateCount: count });
    start += count;
  }
  return chunks;
}

export function decodeGen4EventStates(buffer: ArrayBuffer): Gen4EventState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 11 !== 0)
    throw new RangeError("Invalid Gen4 event result buffer length.");
  return Array.from({ length: words.length / 11 }, (_, row) => {
    const offset = row * 11;
    return {
      advances: words[offset],
      ivs: [
        words[offset + 1],
        words[offset + 2],
        words[offset + 3],
        words[offset + 4],
        words[offset + 5],
        words[offset + 6],
      ],
      hiddenPower: words[offset + 7],
      hiddenPowerStrength: words[offset + 8],
      call: words[offset + 9],
      chatot: words[offset + 10],
    };
  });
}

export function decodeGen4EventSearcherStates(
  buffer: ArrayBuffer,
): Gen4EventSearcherState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 12 !== 0)
    throw new RangeError("Invalid Gen4 event search result buffer length.");
  return Array.from({ length: words.length / 12 }, (_, row) => {
    const offset = row * 12;
    return {
      seed: words[offset],
      delay: words[offset + 1],
      hour: words[offset + 2],
      advances: words[offset + 3],
      ivs: [
        words[offset + 4],
        words[offset + 5],
        words[offset + 6],
        words[offset + 7],
        words[offset + 8],
        words[offset + 9],
      ],
      hiddenPower: words[offset + 10],
      hiddenPowerStrength: words[offset + 11],
    };
  });
}
