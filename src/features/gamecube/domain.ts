import type { Gen3GameVersion } from "../profiles/domain";
import { validatePerfectIvFilter } from "../shared/perfectIvFilter";

export const GEN3_GAMECUBE_API_VERSION = 2;
export const GEN3_GAMECUBE_RESULT_WORDS = 12;
export const GEN3_GAMECUBE_MAX_TOTAL_STATES = 50_000_000;
export const GEN3_GAMECUBE_MAX_RESULTS = 250_000;

export type GameCubeCategory = "non-shadow" | "channel" | "shadow";
export type GameCubeOperation = "generator" | "searcher";
export type GameCubeShinyFilter = "any" | "star" | "square" | "star-square";
export type GameCubeGenderFilter = "any" | "male" | "female";
export type GameCubeAbilityFilter = "any" | "first" | "second";

export interface GameCubeLock {
  nature: number;
  gender: number;
  genderRatio: number;
}

export interface GameCubeTemplate {
  id: string;
  description: string;
  version: Gen3GameVersion;
  species: number;
  level: number;
  shiny: number;
  shadowType: number;
  locks: GameCubeLock[];
  genderRatio?: number;
  abilitySlots?: [number, number];
  personalStats?: [number, number, number, number, number, number];
}

export interface GameCubeFilters {
  shiny: GameCubeShinyFilter;
  gender: GameCubeGenderFilter;
  ability: GameCubeAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: [number, number, number, number, number, number];
  ivMax: [number, number, number, number, number, number];
  perfectIvValue: number;
  perfectIvCount: number;
}

export interface GameCubeRequest {
  operation: GameCubeOperation;
  category: GameCubeCategory;
  version: Gen3GameVersion;
  template: GameCubeTemplate;
  seed: number;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  firstShadowUnset: boolean;
  tid: number;
  sid: number;
  filters: GameCubeFilters;
}

export interface GameCubeState {
  advancesOrSeed: number;
  pid: number;
  ivs: [number, number, number, number, number, number];
  ability: number;
  gender: number;
  level: number;
  nature: number;
  shiny: number;
}

export interface GameCubeChunk {
  index: number;
  request: GameCubeRequest;
  ivMin: [number, number, number, number, number, number];
  ivMax: [number, number, number, number, number, number];
  stateCount: number;
}

export function categoryToWasm(category: GameCubeCategory) {
  return { "non-shadow": 0, channel: 1, shadow: 2 }[category];
}

export function shinyToWasm(filter: GameCubeShinyFilter) {
  return { any: 255, star: 1, square: 2, "star-square": 3 }[filter];
}

export function genderToWasm(filter: GameCubeGenderFilter) {
  return { any: 255, male: 0, female: 1 }[filter];
}

export function abilityToWasm(filter: GameCubeAbilityFilter) {
  return { any: 255, first: 0, second: 1 }[filter];
}

export function versionToWasm(
  version: Gen3GameVersion,
  category: GameCubeCategory,
) {
  return category === "channel" ? 96 : version === "colosseum" ? 64 : 32;
}

export function validateGameCubeRequest(request: GameCubeRequest): string[] {
  const errors: string[] = [];
  const uint32 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
  const uint16 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff;
  if (!(["generator", "searcher"] as const).includes(request.operation))
    errors.push("operation");
  if (
    !(["non-shadow", "channel", "shadow"] as const).includes(request.category)
  )
    errors.push("category");
  if (request.version !== "xd" && request.version !== "colosseum")
    errors.push("version");
  if (!uint32(request.seed)) errors.push("seed");
  if (!uint32(request.initialAdvances)) errors.push("initialAdvances");
  if (!uint32(request.offset)) errors.push("offset");
  if (
    !uint32(request.maxAdvances) ||
    request.maxAdvances + 1 > GEN3_GAMECUBE_MAX_TOTAL_STATES
  )
    errors.push("maxAdvances");
  if (
    request.initialAdvances + request.offset + request.maxAdvances >
    0xffff_ffff
  )
    errors.push("advanceRange");
  if (!uint16(request.tid)) errors.push("tid");
  if (!uint16(request.sid)) errors.push("sid");
  if (
    !Number.isInteger(request.template.species) ||
    request.template.species < 1 ||
    request.template.species > 386
  )
    errors.push("species");
  if (
    !Number.isInteger(request.template.level) ||
    request.template.level < 1 ||
    request.template.level > 100
  )
    errors.push("level");
  if (
    request.template.version !== "xd" &&
    request.template.version !== "colosseum"
  )
    errors.push("templateVersion");
  if (
    !Number.isInteger(request.template.shiny) ||
    request.template.shiny < 0 ||
    request.template.shiny > 2
  )
    errors.push("templateShiny");
  if (
    !Number.isInteger(request.template.shadowType) ||
    request.template.shadowType < 0 ||
    request.template.shadowType > 4
  )
    errors.push("shadowType");
  if (request.template.locks.length > 5) errors.push("locks");
  request.template.locks.forEach((lock, index) => {
    if (
      !Number.isInteger(lock.nature) ||
      lock.nature < 0 ||
      lock.nature > 24 ||
      !Number.isInteger(lock.gender) ||
      lock.gender < 0 ||
      lock.gender > 2 ||
      !Number.isInteger(lock.genderRatio) ||
      lock.genderRatio < 0 ||
      lock.genderRatio > 255
    )
      errors.push(`lock${index}`);
  });
  if (
    request.template.genderRatio !== undefined &&
    (!Number.isInteger(request.template.genderRatio) ||
      request.template.genderRatio < 0 ||
      request.template.genderRatio > 255)
  )
    errors.push("genderRatio");
  if (
    request.template.abilitySlots?.some(
      (value) => !Number.isInteger(value) || value < 0 || value > 0xffff,
    )
  )
    errors.push("abilitySlots");
  if (
    request.template.personalStats?.some(
      (value) => !Number.isInteger(value) || value < 0 || value > 255,
    )
  )
    errors.push("personalStats");
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
  if (
    request.operation === "searcher" &&
    request.filters.ivMin.reduce(
      (total, minimum, index) =>
        total * (request.filters.ivMax[index] - minimum + 1),
      1,
    ) > GEN3_GAMECUBE_MAX_TOTAL_STATES
  )
    errors.push("searchRange");
  return errors;
}

export function createGameCubeChunks(
  request: GameCubeRequest,
  chunkSize = 100_000,
) {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError("Invalid Gen3 GameCube chunk size.");
  }
  const chunks: GameCubeChunk[] = [];
  if (request.operation === "generator") {
    const total = request.maxAdvances + 1;
    for (
      let offset = 0, index = 0;
      offset < total;
      offset += chunkSize, index++
    ) {
      const count = Math.min(chunkSize, total - offset);
      chunks.push({
        index,
        request: {
          ...request,
          initialAdvances: request.initialAdvances + offset,
          maxAdvances: count - 1,
        },
        ivMin: request.filters.ivMin,
        ivMax: request.filters.ivMax,
        stateCount: count,
      });
    }
    return chunks;
  }
  const minimum = request.filters.ivMin;
  const maximum = request.filters.ivMax;
  const appendRanges = (
    ivMin: [number, number, number, number, number, number],
    ivMax: [number, number, number, number, number, number],
  ) => {
    const stateCount = ivMax.reduce(
      (total, value, dimension) => total * (value - ivMin[dimension] + 1),
      1,
    );
    if (stateCount <= chunkSize) {
      chunks.push({
        index: chunks.length,
        request,
        ivMin,
        ivMax,
        stateCount,
      });
      return;
    }
    const dimension = ivMin.findIndex((value, index) => value < ivMax[index]);
    if (dimension < 0) {
      throw new RangeError("Gen3 GameCube search chunk cannot be split.");
    }
    const midpoint = Math.floor((ivMin[dimension] + ivMax[dimension]) / 2);
    const firstMax = [...ivMax] as typeof ivMax;
    firstMax[dimension] = midpoint;
    appendRanges(ivMin, firstMax);
    const secondMin = [...ivMin] as typeof ivMin;
    secondMin[dimension] = midpoint + 1;
    appendRanges(secondMin, ivMax);
  };
  appendRanges([...minimum] as typeof minimum, [...maximum] as typeof maximum);
  return chunks;
}

export function decodeGameCubeStates(buffer: ArrayBuffer): GameCubeState[] {
  const words = new Uint32Array(buffer);
  if (words.length % GEN3_GAMECUBE_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen3 GameCube result buffer length.");
  const states: GameCubeState[] = [];
  for (
    let index = 0;
    index < words.length;
    index += GEN3_GAMECUBE_RESULT_WORDS
  ) {
    const ivs = [
      words[index + 2],
      words[index + 3],
      words[index + 4],
      words[index + 5],
      words[index + 6],
      words[index + 7],
    ] as GameCubeState["ivs"];
    const ability = words[index + 8];
    const gender = words[index + 9];
    const level = words[index + 10];
    const nature = words[index + 11] & 0xff;
    const shiny = words[index + 11] >>> 8;
    if (
      ivs.some((value) => value > 31) ||
      ability > 1 ||
      gender > 2 ||
      level < 1 ||
      level > 100 ||
      nature > 24 ||
      shiny > 2
    )
      throw new RangeError("Gen3 GameCube core returned an invalid state.");
    states.push({
      advancesOrSeed: words[index],
      pid: words[index + 1],
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
