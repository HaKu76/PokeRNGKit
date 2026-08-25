import { validatePerfectIvFilter } from "../shared/perfectIvFilter";

export const GEN3_POKE_SPOT_API_VERSION = 2;
export const GEN3_POKE_SPOT_RESULT_WORDS = 16;
export const GEN3_POKE_SPOT_CHUNK_SIZE = 100_000;
export const GEN3_POKE_SPOT_TARGET_COMBINATIONS_PER_CHUNK = 1_000_000;
export const GEN3_POKE_SPOT_MAX_TOTAL_STATES = 100_020_001;
export const GEN3_POKE_SPOT_MAX_RESULTS = 250_000;

export type PokeSpotShinyFilter = "any" | "star" | "square" | "star-square";
export type PokeSpotGenderFilter = "any" | "male" | "female";
export type PokeSpotAbilityFilter = "any" | "first" | "second";

export interface Gen3PokeSpotFilters {
  shiny: PokeSpotShinyFilter;
  gender: PokeSpotGenderFilter;
  ability: PokeSpotAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  slotMask: number;
  ivMin: [number, number, number, number, number, number];
  ivMax: [number, number, number, number, number, number];
  perfectIvValue: number;
  perfectIvCount: number;
}

export interface Gen3PokeSpotRequest {
  foodSeed: number;
  encounterSeed: number;
  foodInitialAdvances: number;
  foodMaxAdvances: number;
  encounterInitialAdvances: number;
  encounterMaxAdvances: number;
  foodOffset: number;
  encounterOffset: number;
  location: 0 | 1 | 2;
  tid: number;
  sid: number;
  filters: Gen3PokeSpotFilters;
}

export interface Gen3PokeSpotChunk {
  index: number;
  foodInitialAdvances: number;
  foodMaxAdvances: number;
  foodStateCount: number;
  stateCount: number;
}

export interface Gen3PokeSpotState {
  foodAdvances: number;
  encounterAdvances: number;
  pid: number;
  species: number;
  slot: number;
  ivs: [number, number, number, number, number, number];
  ability: number;
  gender: number;
  level: number;
  nature: number;
  shiny: number;
}

const isUint32 = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;

export function pokeSpotShinyFilterToWasm(filter: PokeSpotShinyFilter) {
  return { any: 0, star: 1, square: 2, "star-square": 3 }[filter];
}

export function pokeSpotGenderFilterToWasm(filter: PokeSpotGenderFilter) {
  return { any: 0, male: 1, female: 2 }[filter];
}

export function pokeSpotAbilityFilterToWasm(filter: PokeSpotAbilityFilter) {
  return { any: 0, first: 1, second: 2 }[filter];
}

export function validateGen3PokeSpotRequest(request: Gen3PokeSpotRequest) {
  const errors: string[] = [];
  for (const key of [
    "foodSeed",
    "encounterSeed",
    "foodInitialAdvances",
    "foodMaxAdvances",
    "encounterInitialAdvances",
    "encounterMaxAdvances",
    "foodOffset",
    "encounterOffset",
  ] as const) {
    if (!isUint32(request[key])) errors.push(key);
  }
  if (
    request.foodInitialAdvances + request.foodOffset + request.foodMaxAdvances >
    0xffff_ffff
  )
    errors.push("foodAdvanceRange");
  if (
    request.encounterInitialAdvances +
      request.encounterOffset +
      request.encounterMaxAdvances >
    0xffff_ffff
  )
    errors.push("encounterAdvanceRange");
  if (
    (request.foodMaxAdvances + 1) * (request.encounterMaxAdvances + 1) >
    GEN3_POKE_SPOT_MAX_TOTAL_STATES
  )
    errors.push("searchRange");
  if (![0, 1, 2].includes(request.location)) errors.push("location");
  if (!Number.isInteger(request.tid) || request.tid < 0 || request.tid > 0xffff)
    errors.push("tid");
  if (!Number.isInteger(request.sid) || request.sid < 0 || request.sid > 0xffff)
    errors.push("sid");
  if (
    !Number.isInteger(request.filters.natureMask) ||
    request.filters.natureMask < 1 ||
    request.filters.natureMask > 0x1ff_ffff
  )
    errors.push("nature");
  if (
    !Number.isInteger(request.filters.hiddenPowerMask) ||
    request.filters.hiddenPowerMask < 1 ||
    request.filters.hiddenPowerMask > 0xffff
  )
    errors.push("hiddenPower");
  if (
    !Number.isInteger(request.filters.slotMask) ||
    request.filters.slotMask < 1 ||
    request.filters.slotMask > 7
  )
    errors.push("slot");
  for (let index = 0; index < 6; index++) {
    const minimum = request.filters.ivMin[index];
    const maximum = request.filters.ivMax[index];
    if (
      !Number.isInteger(minimum) ||
      !Number.isInteger(maximum) ||
      minimum < 0 ||
      maximum > 31 ||
      minimum > maximum
    )
      errors.push(`iv${index}`);
  }
  if (
    !validatePerfectIvFilter(
      request.filters.perfectIvValue,
      request.filters.perfectIvCount,
    )
  )
    errors.push("perfectIvs");
  return errors;
}

export function createGen3PokeSpotChunks(
  request: Gen3PokeSpotRequest,
  chunkSize = Math.max(
    1,
    Math.min(
      GEN3_POKE_SPOT_CHUNK_SIZE,
      Math.floor(
        GEN3_POKE_SPOT_TARGET_COMBINATIONS_PER_CHUNK /
          (request.encounterMaxAdvances + 1),
      ),
    ),
  ),
) {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > GEN3_POKE_SPOT_CHUNK_SIZE
  )
    throw new RangeError("Invalid Gen3 PokeSpot chunk size.");
  const totalFoodStates = request.foodMaxAdvances + 1;
  const encounterStateCount = request.encounterMaxAdvances + 1;
  const chunks: Gen3PokeSpotChunk[] = [];
  for (let offset = 0, index = 0; offset < totalFoodStates; index++) {
    const foodStateCount = Math.min(chunkSize, totalFoodStates - offset);
    chunks.push({
      index,
      foodInitialAdvances: request.foodInitialAdvances + offset,
      foodMaxAdvances: foodStateCount - 1,
      foodStateCount,
      stateCount: foodStateCount * encounterStateCount,
    });
    offset += foodStateCount;
  }
  return chunks;
}

export function decodeGen3PokeSpotStates(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN3_POKE_SPOT_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen3 PokeSpot result buffer length.");
  const states: Gen3PokeSpotState[] = [];
  for (
    let index = 0;
    index < words.length;
    index += GEN3_POKE_SPOT_RESULT_WORDS
  ) {
    const ivs = [
      words[index + 5],
      words[index + 6],
      words[index + 7],
      words[index + 8],
      words[index + 9],
      words[index + 10],
    ] as Gen3PokeSpotState["ivs"];
    const species = words[index + 3];
    const slot = words[index + 4];
    const ability = words[index + 11];
    const gender = words[index + 12];
    const level = words[index + 13];
    const nature = words[index + 14];
    const shiny = words[index + 15];
    if (
      species < 1 ||
      species > 386 ||
      slot > 2 ||
      ivs.some((value) => value > 31) ||
      ability > 1 ||
      gender > 2 ||
      level < 1 ||
      level > 100 ||
      nature > 24 ||
      shiny > 2
    )
      throw new RangeError("Gen3 PokeSpot core returned an invalid state.");
    states.push({
      foodAdvances: words[index],
      encounterAdvances: words[index + 1],
      pid: words[index + 2],
      species,
      slot,
      ivs,
      ability,
      gender,
      level,
      nature,
      shiny,
    });
  }
  return states;
}
