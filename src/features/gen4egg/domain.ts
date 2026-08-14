export const GEN4_EGG_API_VERSION = 1;
export const GEN4_EGG_REQUEST_WORDS = 48;
export const GEN4_EGG_GENERATOR_RESULT_WORDS = 23;
export const GEN4_EGG_SEARCHER_RESULT_WORDS = 25;
export const GEN4_EGG_GENERATOR_CHUNK_SIZE = 2_000;
export const GEN4_EGG_SEARCHER_CHUNK_SIZE = 256;
export const GEN4_EGG_MAX_STATES_PER_CALL = 100_000;
export const GEN4_EGG_MAX_WASM_RESULTS = 100_000;
export const GEN4_EGG_MAX_RESULTS = 100_000;
export const GEN4_EGG_MAX_COMBINATIONS = 100_000_000;
export const GEN4_EGG_MAX_SEARCH_SEEDS = 50_000_000;

export type Gen4EggGame = "dppt" | "hgss";
export type Gen4EggIvTuple = [number, number, number, number, number, number];
export type Gen4EggParentGender = "male" | "female" | "genderless" | "ditto";
export type Gen4EggShinyFilter =
  "any" | "notShiny" | "star" | "square" | "starSquare";
export type Gen4EggGenderFilter = "any" | "male" | "female" | "genderless";
export type Gen4EggAbilityFilter = "any" | "first" | "second";

export interface Gen4EggParent {
  ivs: Gen4EggIvTuple;
  gender: Gen4EggParentGender;
}

export interface Gen4EggFilters {
  shiny: Gen4EggShinyFilter;
  gender: Gen4EggGenderFilter;
  ability: Gen4EggAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen4EggIvTuple;
  ivMax: Gen4EggIvTuple;
}

interface Gen4EggCommonRequest {
  game: Gen4EggGame;
  species: number;
  genderRatio: number;
  alternateGenderRatio: number;
  tid: number;
  sid: number;
  masuda: boolean;
  parentA: Gen4EggParent;
  parentB: Gen4EggParent;
  filters: Gen4EggFilters;
}

export interface Gen4EggGeneratorRequest extends Gen4EggCommonRequest {
  seedHeld: number;
  seedPickup: number;
  initialAdvancesHeld: number;
  maxAdvancesHeld: number;
  offsetHeld: number;
  initialAdvancesPickup: number;
  maxAdvancesPickup: number;
  offsetPickup: number;
}

export interface Gen4EggSearcherRequest extends Gen4EggCommonRequest {
  initialAdvancesHeld: number;
  maxAdvancesHeld: number;
  initialAdvancesPickup: number;
  maxAdvancesPickup: number;
  minDelay: number;
  maxDelay: number;
}

export interface Gen4EggState {
  advances: number;
  pickupAdvances: number;
  pid: number;
  ability: number;
  gender: number;
  nature: number;
  shiny: number;
  ivs: Gen4EggIvTuple;
  inheritance: Gen4EggIvTuple;
  hiddenPower: number;
  hiddenPowerStrength: number;
  call: number;
  chatot: number;
}

export interface Gen4EggSearcherState extends Gen4EggState {
  seed: number;
  delay: number;
}

export interface Gen4EggGeneratorChunk {
  index: number;
  initialAdvancesHeld: number;
  maxAdvancesHeld: number;
  stateCount: number;
}

export interface Gen4EggSearcherChunk {
  index: number;
  startIndex: number;
  stateCount: number;
}

const UINT32_MAX = 0xffff_ffff;
const UINT16_MAX = 0xffff;
const NATURE_MASK_ALL = 0x1ff_ffff;
const HIDDEN_POWER_MASK_ALL = 0xffff;

export function gen4EggGameToWasm(game: Gen4EggGame) {
  return game === "dppt" ? 0 : 1;
}

export function gen4EggParentGenderToWasm(gender: Gen4EggParentGender) {
  return { male: 0, female: 1, genderless: 2, ditto: 3 }[gender];
}

export function gen4EggShinyFilterToWasm(filter: Gen4EggShinyFilter) {
  return {
    any: 0,
    notShiny: 1,
    star: 2,
    square: 3,
    starSquare: 4,
  }[filter];
}

export function gen4EggGenderFilterToWasm(filter: Gen4EggGenderFilter) {
  return { any: 0, male: 1, female: 2, genderless: 3 }[filter];
}

export function gen4EggAbilityFilterToWasm(filter: Gen4EggAbilityFilter) {
  return { any: 0, first: 1, second: 2 }[filter];
}

export function isGen4EggParentCombinationValid(
  parentA: Gen4EggParent,
  parentB: Gen4EggParent,
) {
  const left = gen4EggParentGenderToWasm(parentA.gender);
  const right = gen4EggParentGenderToWasm(parentB.gender);
  return (
    (left === 0 && right === 1) ||
    (left === 1 && right === 0) ||
    (left === 3 && right === 1) ||
    (left === 1 && right === 3) ||
    (left === 0 && right === 3) ||
    (left === 3 && right === 0) ||
    (left === 2 && right === 3) ||
    (left === 3 && right === 2)
  );
}

export function gen4EggGeneratorCombinationCount(
  request: Gen4EggGeneratorRequest,
) {
  return (request.maxAdvancesHeld + 1) * (request.maxAdvancesPickup + 1);
}

export function gen4EggSearcherSeedCount(request: Gen4EggSearcherRequest) {
  return 256 * 24 * (request.maxDelay - request.minDelay + 1);
}

function validUint32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;
}

function validateCommon(request: Gen4EggCommonRequest) {
  const errors: string[] = [];
  if (
    !Number.isInteger(request.species) ||
    request.species < 1 ||
    request.species > 493
  )
    errors.push("species");
  if (
    !Number.isInteger(request.genderRatio) ||
    request.genderRatio < 0 ||
    request.genderRatio > 255
  )
    errors.push("genderRatio");
  if (
    !Number.isInteger(request.alternateGenderRatio) ||
    request.alternateGenderRatio < 0 ||
    request.alternateGenderRatio > 255
  )
    errors.push("alternateGenderRatio");
  if (
    !Number.isInteger(request.tid) ||
    request.tid < 0 ||
    request.tid > UINT16_MAX
  )
    errors.push("tid");
  if (
    !Number.isInteger(request.sid) ||
    request.sid < 0 ||
    request.sid > UINT16_MAX
  )
    errors.push("sid");
  if (!isGen4EggParentCombinationValid(request.parentA, request.parentB))
    errors.push("parents");
  for (const [name, parent] of [
    ["parentA", request.parentA],
    ["parentB", request.parentB],
  ] as const) {
    parent.ivs.forEach((iv, index) => {
      if (!Number.isInteger(iv) || iv < 0 || iv > 31)
        errors.push(`${name}Iv${index}`);
    });
  }
  if (
    !Number.isInteger(request.filters.natureMask) ||
    request.filters.natureMask < 1 ||
    request.filters.natureMask > NATURE_MASK_ALL
  )
    errors.push("nature");
  if (
    !Number.isInteger(request.filters.hiddenPowerMask) ||
    request.filters.hiddenPowerMask < 1 ||
    request.filters.hiddenPowerMask > HIDDEN_POWER_MASK_ALL
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

export function validateGen4EggGeneratorRequest(
  request: Gen4EggGeneratorRequest,
) {
  const errors = validateCommon(request);
  for (const [name, value] of [
    ["seedHeld", request.seedHeld],
    ["seedPickup", request.seedPickup],
    ["initialAdvancesHeld", request.initialAdvancesHeld],
    ["maxAdvancesHeld", request.maxAdvancesHeld],
    ["offsetHeld", request.offsetHeld],
    ["initialAdvancesPickup", request.initialAdvancesPickup],
    ["maxAdvancesPickup", request.maxAdvancesPickup],
    ["offsetPickup", request.offsetPickup],
  ] as const) {
    if (!validUint32(value)) errors.push(name);
  }
  if (
    request.initialAdvancesHeld + request.offsetHeld + request.maxAdvancesHeld >
    UINT32_MAX
  )
    errors.push("heldAdvanceRange");
  if (
    request.initialAdvancesPickup +
      request.offsetPickup +
      request.maxAdvancesPickup >
    UINT32_MAX
  )
    errors.push("pickupAdvanceRange");
  if (gen4EggGeneratorCombinationCount(request) > GEN4_EGG_MAX_COMBINATIONS)
    errors.push("combinationRange");
  return errors;
}

export function validateGen4EggSearcherRequest(
  request: Gen4EggSearcherRequest,
) {
  const errors = validateCommon(request);
  for (const [name, value] of [
    ["initialAdvancesHeld", request.initialAdvancesHeld],
    ["maxAdvancesHeld", request.maxAdvancesHeld],
    ["initialAdvancesPickup", request.initialAdvancesPickup],
    ["maxAdvancesPickup", request.maxAdvancesPickup],
    ["minDelay", request.minDelay],
    ["maxDelay", request.maxDelay],
  ] as const) {
    if (!validUint32(value)) errors.push(name);
  }
  if (request.initialAdvancesHeld + request.maxAdvancesHeld > UINT32_MAX)
    errors.push("heldAdvanceRange");
  if (request.initialAdvancesPickup + request.maxAdvancesPickup > UINT32_MAX)
    errors.push("pickupAdvanceRange");
  if (request.minDelay > request.maxDelay) errors.push("delayRange");
  const seedCount = gen4EggSearcherSeedCount(request);
  if (!Number.isSafeInteger(seedCount) || seedCount > GEN4_EGG_MAX_SEARCH_SEEDS)
    errors.push("searchRange");
  if (
    (request.maxAdvancesHeld + 1) * (request.maxAdvancesPickup + 1) >
    GEN4_EGG_MAX_COMBINATIONS
  )
    errors.push("combinationRange");
  return errors;
}

export function createGen4EggGeneratorChunks(
  request: Gen4EggGeneratorRequest,
  chunkSize = GEN4_EGG_GENERATOR_CHUNK_SIZE,
) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new RangeError("Gen4 egg chunk size must be positive.");
  chunkSize = Math.min(chunkSize, GEN4_EGG_MAX_STATES_PER_CALL);
  const chunks: Gen4EggGeneratorChunk[] = [];
  const total = request.maxAdvancesHeld + 1;
  for (let start = 0, index = 0; start < total; index++) {
    const stateCount = Math.min(chunkSize, total - start);
    chunks.push({
      index,
      initialAdvancesHeld: request.initialAdvancesHeld + start,
      maxAdvancesHeld: stateCount - 1,
      stateCount,
    });
    start += stateCount;
  }
  return chunks;
}

export function createGen4EggSearcherChunks(
  request: Gen4EggSearcherRequest,
  chunkSize = GEN4_EGG_SEARCHER_CHUNK_SIZE,
) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1)
    throw new RangeError("Gen4 egg search chunk size must be positive.");
  chunkSize = Math.min(chunkSize, GEN4_EGG_MAX_STATES_PER_CALL);
  const chunks: Gen4EggSearcherChunk[] = [];
  const total = gen4EggSearcherSeedCount(request);
  for (let start = 0, index = 0; start < total; index++) {
    const stateCount = Math.min(chunkSize, total - start);
    chunks.push({ index, startIndex: start, stateCount });
    start += stateCount;
  }
  return chunks;
}

export function encodeGen4EggRequest(
  request: Gen4EggGeneratorRequest | Gen4EggSearcherRequest,
) {
  const generator = "seedHeld" in request;
  return Uint32Array.from([
    gen4EggGameToWasm(request.game),
    generator ? request.seedHeld : 0,
    generator ? request.seedPickup : 0,
    request.initialAdvancesHeld,
    request.maxAdvancesHeld,
    generator ? request.offsetHeld : 0,
    request.initialAdvancesPickup,
    request.maxAdvancesPickup,
    generator ? request.offsetPickup : 0,
    request.species,
    request.genderRatio,
    request.alternateGenderRatio,
    request.tid,
    request.sid,
    request.masuda ? 1 : 0,
    gen4EggShinyFilterToWasm(request.filters.shiny),
    gen4EggGenderFilterToWasm(request.filters.gender),
    gen4EggAbilityFilterToWasm(request.filters.ability),
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    ...request.parentA.ivs,
    ...request.parentB.ivs,
    gen4EggParentGenderToWasm(request.parentA.gender),
    gen4EggParentGenderToWasm(request.parentB.gender),
    generator ? 0 : request.minDelay,
    generator ? 0 : request.maxDelay,
  ]);
}

function stateAt(words: Uint32Array, offset: number): Gen4EggState {
  return {
    advances: words[offset],
    pickupAdvances: words[offset + 1],
    pid: words[offset + 2],
    ability: words[offset + 3],
    gender: words[offset + 4],
    nature: words[offset + 5],
    shiny: words[offset + 6],
    ivs: [
      words[offset + 7],
      words[offset + 8],
      words[offset + 9],
      words[offset + 10],
      words[offset + 11],
      words[offset + 12],
    ],
    inheritance: [
      words[offset + 13],
      words[offset + 14],
      words[offset + 15],
      words[offset + 16],
      words[offset + 17],
      words[offset + 18],
    ],
    hiddenPower: words[offset + 19],
    hiddenPowerStrength: words[offset + 20],
    call: words[offset + 21],
    chatot: words[offset + 22],
  };
}

export function decodeGen4EggStates(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN4_EGG_GENERATOR_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen4 egg Generator result buffer length.");
  return Array.from(
    { length: words.length / GEN4_EGG_GENERATOR_RESULT_WORDS },
    (_, index) => stateAt(words, index * GEN4_EGG_GENERATOR_RESULT_WORDS),
  );
}

export function decodeGen4EggSearcherStates(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN4_EGG_SEARCHER_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen4 egg Searcher result buffer length.");
  return Array.from(
    { length: words.length / GEN4_EGG_SEARCHER_RESULT_WORDS },
    (_, index): Gen4EggSearcherState => {
      const offset = index * GEN4_EGG_SEARCHER_RESULT_WORDS;
      return {
        seed: words[offset],
        delay: words[offset + 1],
        ...stateAt(words, offset + 2),
      };
    },
  );
}

export interface Gen4EggPoketchResult {
  happinessDoubleTaps: number;
  coinFlipTaps: number;
  note: "none" | "doNotSwitchToHappiness" | "switchOnceWithoutClicking";
}

export function calculateGen4EggPoketch(
  advances: number,
): Gen4EggPoketchResult {
  if (!validUint32(advances)) throw new RangeError("Invalid egg advance.");
  if (advances < 12) {
    return {
      happinessDoubleTaps: 0,
      coinFlipTaps: advances,
      note: "doNotSwitchToHappiness",
    };
  }
  const target = advances - 12;
  const happinessDoubleTaps = Math.floor(target / 12);
  return {
    happinessDoubleTaps,
    coinFlipTaps: target % 12,
    note: happinessDoubleTaps === 0 ? "switchOnceWithoutClicking" : "none",
  };
}
