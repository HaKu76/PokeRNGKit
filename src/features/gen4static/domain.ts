import { GEN4_STATIC_TEMPLATES } from "./encounters";
import { validatePerfectIvFilter } from "../shared/perfectIvFilter";

export const GEN4_STATIC_API_VERSION = 2;
export const GEN4_STATIC_CHUNK_SIZE = 500;
export const GEN4_STATIC_MAX_TOTAL_STATES = 2_000_000;
export const GEN4_STATIC_MAX_RESULTS = 100_000;

export type Gen4GameVersion =
  "diamond" | "pearl" | "platinum" | "heartgold" | "soulsilver";
export type Gen4StaticCategory =
  | "starters"
  | "fossils"
  | "gifts"
  | "gameCorner"
  | "stationary"
  | "legends"
  | "events"
  | "roamers";
export type Gen4StaticMethod = "method1" | "methodJ" | "methodK";
export type Gen4StaticLead =
  "none" | "synchronize" | "cuteCharmF" | "cuteCharmM";
export type Gen4StaticShiny = "any" | "notShiny" | "shiny";
export type Gen4StaticGender = "any" | "male" | "female" | "genderless";
export type Gen4StaticAbility = "any" | "first" | "second";
export type Gen4IvTuple = [number, number, number, number, number, number];

export interface Gen4StaticTemplate {
  id: string;
  category: Gen4StaticCategory;
  label: string;
  versions: Gen4GameVersion[];
  species: number;
  form: number;
  level: number;
  genderRatio: number;
  method: Gen4StaticMethod;
  shinyLock: "random" | "never" | "always";
}

export interface Gen4StaticFilters {
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen4IvTuple;
  ivMax: Gen4IvTuple;
  shiny: Gen4StaticShiny;
  gender: Gen4StaticGender;
  ability: Gen4StaticAbility;
  perfectIvValue: number;
  perfectIvCount: number;
}

export interface Gen4StaticGeneratorRequest {
  seed: number;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  method: Gen4StaticMethod;
  lead: Gen4StaticLead;
  syncNature: number;
  tid: number;
  sid: number;
  template: Gen4StaticTemplate;
  filters: Gen4StaticFilters;
}

export interface Gen4StaticSearcherRequest {
  minAdvance: number;
  maxAdvance: number;
  minDelay: number;
  maxDelay: number;
  method: Gen4StaticMethod;
  lead: Gen4StaticLead;
  syncNature: number;
  tid: number;
  sid: number;
  template: Gen4StaticTemplate;
  filters: Gen4StaticFilters;
}

export interface Gen4StaticState {
  advances: number;
  pid: number;
  ivs: Gen4IvTuple;
  ability: number;
  gender: number;
  level: number;
  nature: number;
  shiny: number;
  hiddenPower: number;
  hiddenPowerStrength: number;
  call: number;
  chatot: number;
}

export interface Gen4StaticSearcherState extends Gen4StaticState {
  seed: number;
  delay: number;
  hour: number;
}

export interface Gen4StaticChunk {
  index: number;
  initialAdvances: number;
  maxAdvances: number;
  stateCount: number;
}

export interface Gen4StaticSearcherChunk {
  index: number;
  startIndex: number;
  stateCount: number;
}

export const GEN4_STATIC_CATEGORIES: Gen4StaticCategory[] = [
  "starters",
  "fossils",
  "gifts",
  "gameCorner",
  "stationary",
  "legends",
  "events",
  "roamers",
];

export { GEN4_STATIC_TEMPLATES };

export function gen4StaticCategoriesForVersion(version: Gen4GameVersion) {
  return GEN4_STATIC_CATEGORIES.filter((category) =>
    GEN4_STATIC_TEMPLATES.some(
      (entry) =>
        entry.category === category && entry.versions.includes(version),
    ),
  );
}

export function gen4StaticTemplatesForVersion(
  version: Gen4GameVersion,
  category: Gen4StaticCategory,
) {
  return GEN4_STATIC_TEMPLATES.filter(
    (entry) => entry.category === category && entry.versions.includes(version),
  );
}

export function gen4StaticMethodToWasm(method: Gen4StaticMethod) {
  return { method1: 1, methodJ: 2, methodK: 3 }[method];
}
export function gen4StaticLeadCode(lead: Gen4StaticLead) {
  return { none: 0, synchronize: 1, cuteCharmF: 2, cuteCharmM: 3 }[lead];
}
export function gen4StaticShinyToWasm(filter: Gen4StaticShiny) {
  return { any: 0, notShiny: 1, shiny: 2 }[filter];
}
export function gen4StaticGenderToWasm(filter: Gen4StaticGender) {
  return { any: 0, male: 1, female: 2, genderless: 3 }[filter];
}
export function gen4StaticAbilityToWasm(filter: Gen4StaticAbility) {
  return { any: 0, first: 1, second: 2 }[filter];
}

export function gen4StaticSearcherCombinationCount(
  request: Gen4StaticSearcherRequest,
) {
  return request.filters.ivMin.reduce(
    (total, min, index) => total * (request.filters.ivMax[index] - min + 1),
    1,
  );
}

function validU32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}
function validU16(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

export function validateGen4StaticGeneratorRequest(
  request: Gen4StaticGeneratorRequest,
): string[] {
  const errors: string[] = [];
  if (!validU32(request.seed)) errors.push("seed");
  if (!validU32(request.initialAdvances)) errors.push("initialAdvances");
  if (
    !validU32(request.maxAdvances) ||
    request.maxAdvances + 1 > GEN4_STATIC_MAX_TOTAL_STATES
  )
    errors.push("maxAdvances");
  if (!validU32(request.offset)) errors.push("offset");
  if (
    request.initialAdvances + request.offset + request.maxAdvances >
    0xffff_ffff
  )
    errors.push("advanceRange");
  if (!validU16(request.tid)) errors.push("tid");
  if (!validU16(request.sid)) errors.push("sid");
  if (
    !Number.isInteger(request.syncNature) ||
    request.syncNature < 0 ||
    request.syncNature > 24
  )
    errors.push("syncNature");
  if (request.filters.natureMask < 1 || request.filters.natureMask > 0x1ff_ffff)
    errors.push("nature");
  if (
    request.filters.hiddenPowerMask < 1 ||
    request.filters.hiddenPowerMask > 0xffff
  )
    errors.push("hiddenPower");
  request.filters.ivMin.forEach((min, index) => {
    const max = request.filters.ivMax[index];
    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      min < 0 ||
      max > 31 ||
      min > max
    )
      errors.push(`iv${index}`);
  });
  if (
    !validatePerfectIvFilter(
      request.filters.perfectIvValue,
      request.filters.perfectIvCount,
    )
  )
    errors.push("perfectIvs");
  return errors;
}

export function validateGen4StaticSearcherRequest(
  request: Gen4StaticSearcherRequest,
): string[] {
  const errors = validateGen4StaticGeneratorRequest({
    ...request,
    seed: 0,
    initialAdvances: 0,
    maxAdvances: 0,
    offset: 0,
  }).filter(
    (e) =>
      ![
        "seed",
        "initialAdvances",
        "maxAdvances",
        "offset",
        "advanceRange",
      ].includes(e),
  );
  if (
    !validU32(request.minAdvance) ||
    !validU32(request.maxAdvance) ||
    request.minAdvance > request.maxAdvance
  )
    errors.push("advanceRange");
  if (
    !validU16(request.minDelay) ||
    !validU16(request.maxDelay) ||
    request.minDelay > request.maxDelay
  )
    errors.push("delayRange");
  if (
    gen4StaticSearcherCombinationCount(request) > GEN4_STATIC_MAX_TOTAL_STATES
  )
    errors.push("searchRange");
  return errors;
}

export function createGen4StaticChunks(
  request: Gen4StaticGeneratorRequest,
  chunkSize = GEN4_STATIC_CHUNK_SIZE,
): Gen4StaticChunk[] {
  const chunks: Gen4StaticChunk[] = [];
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

export function createGen4StaticSearcherChunks(
  request: Gen4StaticSearcherRequest,
  chunkSize = GEN4_STATIC_CHUNK_SIZE,
): Gen4StaticSearcherChunk[] {
  const chunks: Gen4StaticSearcherChunk[] = [];
  const total = gen4StaticSearcherCombinationCount(request);
  for (let start = 0, index = 0; start < total; index++) {
    const count = Math.min(chunkSize, total - start);
    chunks.push({ index, startIndex: start, stateCount: count });
    start += count;
  }
  return chunks;
}

export function decodeGen4StaticStates(buffer: ArrayBuffer): Gen4StaticState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 17 !== 0)
    throw new RangeError("Invalid Gen4 static result buffer length.");
  return Array.from({ length: words.length / 17 }, (_, row) => {
    const offset = row * 17;
    return {
      advances: words[offset],
      pid: words[offset + 1],
      ivs: [
        words[offset + 2],
        words[offset + 3],
        words[offset + 4],
        words[offset + 5],
        words[offset + 6],
        words[offset + 7],
      ],
      ability: words[offset + 8],
      gender: words[offset + 9],
      level: words[offset + 10],
      nature: words[offset + 11],
      shiny: words[offset + 12],
      hiddenPower: words[offset + 13],
      hiddenPowerStrength: words[offset + 14],
      call: words[offset + 15],
      chatot: words[offset + 16],
    };
  });
}

export function decodeGen4StaticSearcherStates(
  buffer: ArrayBuffer,
): Gen4StaticSearcherState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 20 !== 0)
    throw new RangeError("Invalid Gen4 static search result buffer length.");
  return Array.from({ length: words.length / 20 }, (_, row) => {
    const offset = row * 20;
    return {
      seed: words[offset],
      delay: words[offset + 1],
      hour: words[offset + 2],
      advances: words[offset + 3],
      pid: words[offset + 4],
      ivs: [
        words[offset + 5],
        words[offset + 6],
        words[offset + 7],
        words[offset + 8],
        words[offset + 9],
        words[offset + 10],
      ],
      ability: words[offset + 11],
      gender: words[offset + 12],
      level: words[offset + 13],
      nature: words[offset + 14],
      shiny: words[offset + 15],
      hiddenPower: words[offset + 16],
      hiddenPowerStrength: words[offset + 17],
      call: words[offset + 18],
      chatot: words[offset + 19],
    };
  });
}
