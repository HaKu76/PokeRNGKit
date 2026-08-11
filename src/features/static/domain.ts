export const GEN3_STATIC_API_VERSION = 1;
export const GEN3_STATIC_CHUNK_SIZE = 100_000;
export const GEN3_STATIC_MAX_TOTAL_STATES = 50_000_000;
export const GEN3_STATIC_MAX_RESULTS = 250_000;

export type Gen3StaticMethod = "method1" | "method4";
export type Gen3StaticShinyFilter =
  "any" | "none" | "shiny" | "star" | "square";
export type Gen3StaticGenderFilter = "any" | "male" | "female" | "genderless";
export type Gen3StaticAbilityFilter = "any" | "first" | "second";

export interface Gen3StaticTemplate {
  id: string;
  category: "legends" | "events" | "roamers";
  species: number;
  level: number;
  genderRatio: number;
  buggedRoamer: boolean;
}

export const GEN3_STATIC_TEMPLATES: Gen3StaticTemplate[] = [
  {
    id: "mewtwo",
    category: "legends",
    species: 150,
    level: 70,
    genderRatio: 255,
    buggedRoamer: false,
  },
  {
    id: "rayquaza",
    category: "legends",
    species: 384,
    level: 70,
    genderRatio: 255,
    buggedRoamer: false,
  },
  {
    id: "regirock",
    category: "legends",
    species: 377,
    level: 40,
    genderRatio: 255,
    buggedRoamer: false,
  },
  {
    id: "regice",
    category: "legends",
    species: 378,
    level: 40,
    genderRatio: 255,
    buggedRoamer: false,
  },
  {
    id: "registeel",
    category: "legends",
    species: 379,
    level: 40,
    genderRatio: 255,
    buggedRoamer: false,
  },
  {
    id: "deoxys",
    category: "events",
    species: 386,
    level: 30,
    genderRatio: 255,
    buggedRoamer: false,
  },
  {
    id: "latios",
    category: "roamers",
    species: 381,
    level: 40,
    genderRatio: 0,
    buggedRoamer: true,
  },
  {
    id: "latias",
    category: "roamers",
    species: 380,
    level: 40,
    genderRatio: 254,
    buggedRoamer: true,
  },
];

export interface Gen3StaticFilters {
  shiny: Gen3StaticShinyFilter;
  gender: Gen3StaticGenderFilter;
  ability: Gen3StaticAbilityFilter;
  nature: number;
  ivMin: [number, number, number, number, number, number];
  ivMax: [number, number, number, number, number, number];
}

export interface Gen3StaticRequest {
  seed: number;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  method: Gen3StaticMethod;
  template: Gen3StaticTemplate;
  tid: number;
  sid: number;
  filters: Gen3StaticFilters;
}

export interface Gen3StaticState {
  advances: number;
  pid: number;
  ivs: [number, number, number, number, number, number];
  ability: number;
  gender: number;
  level: number;
  nature: number;
  shiny: number;
}

export interface Gen3StaticChunk {
  index: number;
  initialAdvances: number;
  maxAdvances: number;
  stateCount: number;
}

export function staticMethodToWasm(method: Gen3StaticMethod): number {
  return method === "method4" ? 4 : 1;
}

export function staticShinyFilterToWasm(filter: Gen3StaticShinyFilter): number {
  return { any: 0, none: 1, shiny: 2, star: 3, square: 4 }[filter];
}

export function staticGenderFilterToWasm(
  filter: Gen3StaticGenderFilter,
): number {
  return { any: 0, male: 1, female: 2, genderless: 3 }[filter];
}

export function staticAbilityFilterToWasm(
  filter: Gen3StaticAbilityFilter,
): number {
  return { any: 0, first: 1, second: 2 }[filter];
}

export function validateGen3StaticRequest(
  request: Gen3StaticRequest,
): string[] {
  const errors: string[] = [];
  const isUint32 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
  const isUint16 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff;

  if (!isUint32(request.seed)) errors.push("seed");
  if (!isUint32(request.initialAdvances)) errors.push("initialAdvances");
  if (!isUint32(request.offset)) errors.push("offset");
  if (
    !isUint32(request.maxAdvances) ||
    request.maxAdvances + 1 > GEN3_STATIC_MAX_TOTAL_STATES
  ) {
    errors.push("maxAdvances");
  }
  if (
    request.initialAdvances + request.offset + request.maxAdvances >
    0xffff_ffff
  ) {
    errors.push("advanceRange");
  }
  if (!isUint16(request.tid)) errors.push("tid");
  if (!isUint16(request.sid)) errors.push("sid");
  if (
    !Number.isInteger(request.template.species) ||
    request.template.species < 1 ||
    request.template.species > 1025
  ) {
    errors.push("species");
  }
  if (
    !Number.isInteger(request.template.level) ||
    request.template.level < 1 ||
    request.template.level > 100
  ) {
    errors.push("level");
  }
  if (
    !Number.isInteger(request.template.genderRatio) ||
    request.template.genderRatio < 0 ||
    request.template.genderRatio > 255
  ) {
    errors.push("genderRatio");
  }
  if (request.filters.nature < -1 || request.filters.nature > 24)
    errors.push("nature");
  for (let index = 0; index < 6; index++) {
    if (
      !Number.isInteger(request.filters.ivMin[index]) ||
      !Number.isInteger(request.filters.ivMax[index]) ||
      request.filters.ivMin[index] < 0 ||
      request.filters.ivMax[index] > 31 ||
      request.filters.ivMin[index] > request.filters.ivMax[index]
    ) {
      errors.push(`iv${index}`);
    }
  }
  return errors;
}

export function createGen3StaticChunks(
  request: Gen3StaticRequest,
  chunkSize = GEN3_STATIC_CHUNK_SIZE,
): Gen3StaticChunk[] {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > GEN3_STATIC_CHUNK_SIZE
  ) {
    throw new RangeError(
      `Gen3 static chunk size must be between 1 and ${GEN3_STATIC_CHUNK_SIZE}.`,
    );
  }
  const chunks: Gen3StaticChunk[] = [];
  const totalStates = request.maxAdvances + 1;
  for (let offset = 0, index = 0; offset < totalStates; index++) {
    const stateCount = Math.min(chunkSize, totalStates - offset);
    chunks.push({
      index,
      initialAdvances: request.initialAdvances + offset,
      maxAdvances: stateCount - 1,
      stateCount,
    });
    offset += stateCount;
  }
  return chunks;
}

export function decodeGen3StaticStates(buffer: ArrayBuffer): Gen3StaticState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 12 !== 0)
    throw new RangeError("Invalid Gen3 static result buffer length.");
  const states = new Array<Gen3StaticState>(words.length / 12);
  for (
    let source = 0, target = 0;
    source < words.length;
    source += 12, target++
  ) {
    const natureShiny = words[source + 11];
    states[target] = {
      advances: words[source],
      pid: words[source + 1],
      ivs: [
        words[source + 2],
        words[source + 3],
        words[source + 4],
        words[source + 5],
        words[source + 6],
        words[source + 7],
      ],
      ability: words[source + 8],
      gender: words[source + 9],
      level: words[source + 10],
      nature: natureShiny & 0xff,
      shiny: natureShiny >>> 8,
    };
  }
  return states;
}
