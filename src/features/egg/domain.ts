export { gen3HiddenPower } from "../shared/gen3HiddenPower";
import { validatePerfectIvFilter } from "../shared/perfectIvFilter";

export const GEN3_EGG_API_VERSION = 2;
export const GEN3_EGG_HELD_CHUNK_SIZE = 20_000;
export const GEN3_EGG_MAX_HELD_STATES = 1_000_000;
export const GEN3_EGG_MAX_PICKUP_STATES = 1_000_000;
// The value keeps PokeFinder's Emerald 5000 / 5000 / 0..5 defaults valid.
export const GEN3_EGG_MAX_COMBINED_STATES = 150_060_006;
export const GEN3_EGG_MAX_PAIRS_PER_WASM_CALL = 100_000;
export const GEN3_EGG_MAX_RESULTS = 250_000;
export const GEN3_EGG_REQUEST_WORDS = 56;
export const GEN3_EGG_RESULT_WORDS = 22;
export const GEN3_EGG_ALLOWED_SPECIES = new Set([
  1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 29, 32, 37, 41, 43, 46, 48, 50, 52, 54,
  56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86, 88, 90, 92, 95, 96,
  98, 100, 102, 104, 108, 109, 111, 113, 114, 115, 116, 118, 120, 122, 123, 127,
  128, 129, 131, 133, 137, 138, 140, 142, 143, 147, 152, 155, 158, 161, 163,
  165, 167, 170, 172, 173, 174, 175, 177, 179, 183, 185, 187, 190, 191, 193,
  194, 198, 200, 202, 203, 204, 206, 207, 209, 211, 213, 214, 215, 216, 218,
  220, 222, 223, 225, 226, 227, 228, 231, 234, 235, 236, 238, 239, 240, 241,
  246, 252, 255, 258, 261, 263, 265, 270, 273, 276, 278, 280, 283, 285, 287,
  290, 292, 293, 296, 298, 299, 300, 302, 303, 304, 307, 309, 311, 312, 313,
  314, 315, 316, 318, 320, 322, 324, 325, 327, 328, 331, 333, 335, 336, 337,
  338, 339, 341, 343, 345, 347, 349, 351, 352, 353, 355, 357, 358, 359, 360,
  361, 363, 366, 369, 370, 371, 374,
]);

export type Gen3EggGame = "emerald" | "rsfrlg";
export type Gen3EggMethod = "normal" | "split" | "alternate" | "mixed";
export type Gen3EggShinyFilter = "any" | "star" | "square" | "star-square";
export type Gen3EggGenderFilter = "any" | "male" | "female";
export type Gen3EggAbilityFilter = "any" | "first" | "second";
export type Gen3EggParentGender = "male" | "female" | "genderless" | "ditto";
export type Gen3EggParentItem = "none" | "everstone";

export interface Gen3EggParent {
  ivs: [number, number, number, number, number, number];
  gender: Gen3EggParentGender;
  item: Gen3EggParentItem;
  nature: number;
}

export interface Gen3EggFilters {
  shiny: Gen3EggShinyFilter;
  gender: Gen3EggGenderFilter;
  ability: Gen3EggAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: [number, number, number, number, number, number];
  ivMax: [number, number, number, number, number, number];
  perfectIvValue: number;
  perfectIvCount: number;
}

export interface Gen3EggRequest {
  game: Gen3EggGame;
  method: Gen3EggMethod;
  seedHeld: number;
  seedPickup: number;
  initialAdvancesHeld: number;
  maxAdvancesHeld: number;
  offsetHeld: number;
  initialAdvancesPickup: number;
  maxAdvancesPickup: number;
  offsetPickup: number;
  calibration: number;
  minRedraws: number;
  maxRedraws: number;
  compatibility: 20 | 50 | 70;
  species: number;
  genderRatio: number;
  alternateGenderRatio: number;
  tid: number;
  sid: number;
  parentA: Gen3EggParent;
  parentB: Gen3EggParent;
  filters: Gen3EggFilters;
}

export interface Gen3EggState {
  advances: number;
  pickupAdvances: number;
  redraws: number;
  pid: number;
  ability: number;
  gender: number;
  nature: number;
  shiny: number;
  ivs: [number, number, number, number, number, number];
  inheritance: [number, number, number, number, number, number];
  hiddenPower: number;
  hiddenPowerStrength: number;
}

export interface Gen3EggChunk {
  index: number;
  initialAdvancesHeld: number;
  maxAdvancesHeld: number;
  stateCount: number;
}

const UINT32_MAX = 0xffff_ffff;
const NATURE_MASK_ALL = 0x1ff_ffff;
const HIDDEN_POWER_MASK_ALL = 0xffff;

export function eggGameToWasm(game: Gen3EggGame) {
  return game === "emerald" ? 0 : 1;
}

export function eggMethodToWasm(game: Gen3EggGame, method: Gen3EggMethod) {
  if (game === "emerald") {
    if (method === "normal") return 0;
    if (method === "split") return 1;
    if (method === "alternate") return 2;
    throw new RangeError(`Invalid ${game} egg method: ${method}.`);
  }
  const code = { normal: 3, split: 4, alternate: 5, mixed: 6 }[method];
  if (code === undefined) {
    throw new RangeError(`Invalid ${game} egg method: ${method}.`);
  }
  return code;
}

export function isGen3EggMethodValid(game: Gen3EggGame, method: Gen3EggMethod) {
  return game === "emerald"
    ? method === "normal" || method === "split" || method === "alternate"
    : true;
}

export function eggShinyFilterToWasm(filter: Gen3EggShinyFilter) {
  return { any: 0, star: 1, square: 2, "star-square": 3 }[filter];
}

export function eggGenderFilterToWasm(filter: Gen3EggGenderFilter) {
  return { any: 0, male: 1, female: 2 }[filter];
}

export function eggAbilityFilterToWasm(filter: Gen3EggAbilityFilter) {
  return { any: 0, first: 1, second: 2 }[filter];
}

export function eggParentGenderToWasm(gender: Gen3EggParentGender) {
  return { male: 0, female: 1, genderless: 2, ditto: 3 }[gender];
}

export function eggParentItemToWasm(item: Gen3EggParentItem) {
  return item === "everstone" ? 1 : 0;
}

export function isGen3EggParentCombinationValid(
  parentA: Gen3EggParent,
  parentB: Gen3EggParent,
) {
  const left = eggParentGenderToWasm(parentA.gender);
  const right = eggParentGenderToWasm(parentB.gender);
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

export function gen3EggCombinedStateCount(request: Gen3EggRequest) {
  const redrawCount =
    request.game === "emerald"
      ? request.maxRedraws - request.minRedraws + 1
      : 1;
  return (
    (request.maxAdvancesHeld + 1) *
    (request.maxAdvancesPickup + 1) *
    redrawCount
  );
}

export function validateGen3EggRequest(request: Gen3EggRequest): string[] {
  const errors: string[] = [];
  const isUint32 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= UINT32_MAX;
  const isUint16 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff;
  const isByte = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xff;

  if (!isGen3EggMethodValid(request.game, request.method)) {
    errors.push("method");
  }

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
    if (!isUint32(value)) errors.push(name);
  }
  if (request.maxAdvancesHeld + 1 > GEN3_EGG_MAX_HELD_STATES) {
    errors.push("maxAdvancesHeld");
  }
  if (request.maxAdvancesPickup + 1 > GEN3_EGG_MAX_PICKUP_STATES) {
    errors.push("maxAdvancesPickup");
  }
  if (
    request.initialAdvancesHeld + request.offsetHeld + request.maxAdvancesHeld >
    UINT32_MAX
  ) {
    errors.push("heldAdvanceRange");
  }
  if (
    request.initialAdvancesPickup +
      request.offsetPickup +
      request.maxAdvancesPickup >
    UINT32_MAX
  ) {
    errors.push("pickupAdvanceRange");
  }
  const redrawCount =
    request.game === "emerald"
      ? request.maxRedraws - request.minRedraws + 1
      : 1;
  if (
    (request.maxAdvancesPickup + 1) * redrawCount >
    GEN3_EGG_MAX_PAIRS_PER_WASM_CALL
  ) {
    errors.push("pickupRange");
  }
  if (gen3EggCombinedStateCount(request) > GEN3_EGG_MAX_COMBINED_STATES) {
    errors.push("combinedRange");
  }
  if (
    request.game === "rsfrlg" &&
    (request.seedHeld > 0xffff || request.seedPickup > 0xffff)
  ) {
    errors.push("seed");
  }
  if (
    !isByte(request.calibration) ||
    !isByte(request.minRedraws) ||
    !isByte(request.maxRedraws) ||
    request.minRedraws > request.maxRedraws
  ) {
    errors.push("redraws");
  }
  if (
    request.compatibility !== 20 &&
    request.compatibility !== 50 &&
    request.compatibility !== 70
  ) {
    errors.push("compatibility");
  }
  if (
    !Number.isInteger(request.species) ||
    !GEN3_EGG_ALLOWED_SPECIES.has(request.species)
  ) {
    errors.push("species");
  }
  if (!isByte(request.genderRatio) || !isByte(request.alternateGenderRatio)) {
    errors.push("genderRatio");
  }
  if (!isUint16(request.tid)) errors.push("tid");
  if (!isUint16(request.sid)) errors.push("sid");
  if (!isGen3EggParentCombinationValid(request.parentA, request.parentB)) {
    errors.push("parents");
  }
  for (const [name, parent] of [
    ["parentA", request.parentA],
    ["parentB", request.parentB],
  ] as const) {
    if (
      !Number.isInteger(parent.nature) ||
      parent.nature < 0 ||
      parent.nature > 24
    ) {
      errors.push(`${name}Nature`);
    }
    for (const [index, iv] of parent.ivs.entries()) {
      if (!Number.isInteger(iv) || iv < 0 || iv > 31)
        errors.push(`${name}Iv${index}`);
    }
  }
  if (
    !Number.isInteger(request.filters.natureMask) ||
    request.filters.natureMask < 1 ||
    request.filters.natureMask > NATURE_MASK_ALL
  ) {
    errors.push("nature");
  }
  if (
    !Number.isInteger(request.filters.hiddenPowerMask) ||
    request.filters.hiddenPowerMask < 1 ||
    request.filters.hiddenPowerMask > HIDDEN_POWER_MASK_ALL
  ) {
    errors.push("hiddenPower");
  }
  for (let index = 0; index < 6; index++) {
    const minimum = request.filters.ivMin[index];
    const maximum = request.filters.ivMax[index];
    if (
      !Number.isInteger(minimum) ||
      !Number.isInteger(maximum) ||
      minimum < 0 ||
      maximum > 31 ||
      minimum > maximum
    ) {
      errors.push(`iv${index}`);
    }
  }
  if (
    !validatePerfectIvFilter(
      request.filters.perfectIvValue,
      request.filters.perfectIvCount,
    )
  ) {
    errors.push("perfectIvs");
  }
  return errors;
}

export function createGen3EggChunks(
  request: Gen3EggRequest,
  chunkSize = GEN3_EGG_HELD_CHUNK_SIZE,
): Gen3EggChunk[] {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > GEN3_EGG_HELD_CHUNK_SIZE
  ) {
    throw new RangeError(
      `Gen3 egg chunk size must be between 1 and ${GEN3_EGG_HELD_CHUNK_SIZE}.`,
    );
  }
  const redrawCount =
    request.game === "emerald"
      ? request.maxRedraws - request.minRedraws + 1
      : 1;
  const maxHeldForPickupRange = Math.floor(
    GEN3_EGG_MAX_PAIRS_PER_WASM_CALL /
      ((request.maxAdvancesPickup + 1) * redrawCount),
  );
  if (maxHeldForPickupRange < 1) {
    throw new RangeError("Gen3 egg pickup range exceeds the Wasm call limit.");
  }
  const totalStates = request.maxAdvancesHeld + 1;
  const effectiveChunkSize = Math.min(chunkSize, maxHeldForPickupRange);
  const chunks: Gen3EggChunk[] = [];
  for (let offset = 0, index = 0; offset < totalStates; index++) {
    const stateCount = Math.min(effectiveChunkSize, totalStates - offset);
    chunks.push({
      index,
      initialAdvancesHeld: request.initialAdvancesHeld + offset,
      maxAdvancesHeld: stateCount - 1,
      stateCount,
    });
    offset += stateCount;
  }
  return chunks;
}

export function encodeGen3EggRequest(request: Gen3EggRequest): Uint32Array {
  const values = new Uint32Array(GEN3_EGG_REQUEST_WORDS);
  values.set([
    eggGameToWasm(request.game),
    eggMethodToWasm(request.game, request.method),
    request.seedHeld,
    request.seedPickup,
    request.initialAdvancesHeld,
    request.maxAdvancesHeld,
    request.offsetHeld,
    request.initialAdvancesPickup,
    request.maxAdvancesPickup,
    request.offsetPickup,
    request.calibration,
    request.minRedraws,
    request.maxRedraws,
    request.compatibility,
    request.species,
    request.genderRatio,
    request.alternateGenderRatio,
    request.tid,
    request.sid,
    eggShinyFilterToWasm(request.filters.shiny),
    eggGenderFilterToWasm(request.filters.gender),
    eggAbilityFilterToWasm(request.filters.ability),
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    ...request.parentA.ivs,
    ...request.parentB.ivs,
    eggParentGenderToWasm(request.parentA.gender),
    eggParentGenderToWasm(request.parentB.gender),
    eggParentItemToWasm(request.parentA.item),
    eggParentItemToWasm(request.parentB.item),
    request.parentA.nature,
    request.parentB.nature,
    request.filters.perfectIvValue,
    request.filters.perfectIvCount,
  ]);
  return values;
}

export function decodeGen3EggStates(buffer: ArrayBuffer): Gen3EggState[] {
  const words = new Uint32Array(buffer);
  if (words.length % GEN3_EGG_RESULT_WORDS !== 0) {
    throw new RangeError("Invalid Gen3 egg result buffer length.");
  }
  const states = new Array<Gen3EggState>(words.length / GEN3_EGG_RESULT_WORDS);
  for (
    let source = 0, target = 0;
    source < words.length;
    source += GEN3_EGG_RESULT_WORDS, target++
  ) {
    states[target] = {
      advances: words[source],
      pickupAdvances: words[source + 1],
      redraws: words[source + 2],
      pid: words[source + 3],
      ability: words[source + 4],
      gender: words[source + 5],
      nature: words[source + 6],
      shiny: words[source + 7],
      ivs: [
        words[source + 8],
        words[source + 9],
        words[source + 10],
        words[source + 11],
        words[source + 12],
        words[source + 13],
      ],
      inheritance: [
        words[source + 14],
        words[source + 15],
        words[source + 16],
        words[source + 17],
        words[source + 18],
        words[source + 19],
      ],
      hiddenPower: words[source + 20],
      hiddenPowerStrength: words[source + 21],
    };
  }
  return states;
}
