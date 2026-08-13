import type { Gen3GameVersion } from "../profiles/domain";
import { getGen3WildSlotForm, isGen3WildTanobyChamber } from "./tanoby";

export { isGen3WildTanobyChamber } from "./tanoby";

export const GEN3_WILD_API_VERSION = 4;
export const GEN3_WILD_CHUNK_SIZE = 100_000;
export const GEN3_WILD_SEARCHER_CHUNK_SIZE = 10_000;
export const GEN3_WILD_MAX_TOTAL_STATES = 50_000_000;
export const GEN3_WILD_MAX_RESULTS = 250_000;

export type Gen3WildMethod = "method1" | "method2" | "method4";
export type Gen3WildEncounter =
  "land" | "surf" | "rock-smash" | "old-rod" | "good-rod" | "super-rod";
export type Gen3WildLead =
  | "none"
  | "synchronize"
  | "cute-charm-f"
  | "cute-charm-m"
  | "pressure"
  | "hustle"
  | "vital-spirit"
  | "magnet-pull"
  | "static";
export type Gen3WildItem =
  "none" | "black-flute" | "cleanse-tag" | "white-flute";
export type Gen3WildShinyFilter = "any" | "star" | "square" | "star-square";
export type Gen3WildGenderFilter = "any" | "male" | "female";
export type Gen3WildAbilityFilter = "any" | "first" | "second";

export interface Gen3WildSlot {
  species: number;
  form: number;
  minLevel: number;
  maxLevel: number;
  genderRatio: number;
  type1: number;
  type2: number;
}

export interface Gen3WildArea {
  name: string;
  encounter: Gen3WildEncounter;
  rate: number;
  slots: Gen3WildSlot[];
  feebasLocation: boolean;
  safariZone: boolean;
}

export interface Gen3WildFilters {
  shiny: Gen3WildShinyFilter;
  gender: Gen3WildGenderFilter;
  ability: Gen3WildAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  encounterSlotMask: number;
  levelMin: number;
  levelMax: number;
  ivMin: [number, number, number, number, number, number];
  ivMax: [number, number, number, number, number, number];
}

export interface Gen3WildRequest {
  seed: number;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  method: Gen3WildMethod;
  lead: Gen3WildLead;
  synchronizeNature: number;
  feebasTile: boolean;
  bike: boolean;
  item: Gen3WildItem;
  version: Gen3GameVersion;
  tid: number;
  sid: number;
  area: Gen3WildArea;
  filters: Gen3WildFilters;
}

export interface Gen3WildSearcherRequest {
  method: Gen3WildMethod;
  lead: Gen3WildLead;
  feebasTile: boolean;
  bike: boolean;
  item: Gen3WildItem;
  version: Gen3GameVersion;
  tid: number;
  sid: number;
  area: Gen3WildArea;
  filters: Gen3WildFilters;
}

export interface Gen3WildState {
  advances: number;
  pid: number;
  ivs: [number, number, number, number, number, number];
  ability: number;
  gender: number;
  level: number;
  nature: number;
  shiny: number;
  encounterSlot: number;
  species: number;
  form: number;
}

export interface Gen3WildSearcherState {
  seed: number;
  pid: number;
  ivs: [number, number, number, number, number, number];
  ability: number;
  gender: number;
  level: number;
  nature: number;
  shiny: number;
  encounterSlot: number;
  species: number;
  form: number;
}

export interface Gen3WildChunk {
  index: number;
  initialAdvances: number;
  maxAdvances: number;
  stateCount: number;
}

export interface Gen3WildSearcherChunk {
  index: number;
  startIndex: number;
  stateCount: number;
}

export function wildMethodToWasm(method: Gen3WildMethod) {
  return { method1: 1, method2: 2, method4: 4 }[method];
}

export function wildEncounterToWasm(encounter: Gen3WildEncounter) {
  return {
    land: 0,
    "rock-smash": 3,
    surf: 4,
    "old-rod": 6,
    "good-rod": 7,
    "super-rod": 8,
  }[encounter];
}

export function wildLeadToWasm(lead: Gen3WildLead, synchronizeNature: number) {
  if (lead === "synchronize") return synchronizeNature;
  return {
    none: 255,
    "cute-charm-f": 25,
    "cute-charm-m": 26,
    "magnet-pull": 27,
    static: 28,
    pressure: 32,
    hustle: 32,
    "vital-spirit": 32,
  }[lead];
}

export function wildSearcherLeadToWasm(lead: Gen3WildLead) {
  return lead === "synchronize" ? 0 : wildLeadToWasm(lead, 0);
}

export function wildItemToWasm(item: Gen3WildItem) {
  return {
    none: 0,
    "black-flute": 1,
    "cleanse-tag": 2,
    "white-flute": 3,
  }[item];
}

export function wildShinyFilterToWasm(filter: Gen3WildShinyFilter) {
  return { any: 0, star: 1, square: 2, "star-square": 3 }[filter];
}

export function wildGenderFilterToWasm(filter: Gen3WildGenderFilter) {
  return { any: 0, male: 1, female: 2 }[filter];
}

export function wildAbilityFilterToWasm(filter: Gen3WildAbilityFilter) {
  return { any: 0, first: 1, second: 2 }[filter];
}

export function isRseVersion(version: Gen3GameVersion) {
  return version === "ruby" || version === "sapphire" || version === "emerald";
}

export function validateGen3WildRequest(request: Gen3WildRequest) {
  const errors: string[] = [];
  const uint32 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
  const uint16 = (value: number) =>
    Number.isInteger(value) && value >= 0 && value <= 0xffff;
  if (!uint32(request.seed)) errors.push("seed");
  if (!uint32(request.initialAdvances)) errors.push("initialAdvances");
  if (!uint32(request.maxAdvances)) errors.push("maxAdvances");
  if (!uint32(request.offset)) errors.push("offset");
  if (request.maxAdvances + 1 > GEN3_WILD_MAX_TOTAL_STATES)
    errors.push("maxAdvances");
  if (
    request.initialAdvances + request.offset + request.maxAdvances >
    0xffff_ffff
  )
    errors.push("advanceRange");
  if (!uint16(request.tid)) errors.push("tid");
  if (!uint16(request.sid)) errors.push("sid");
  if (!["method1", "method2", "method4"].includes(request.method))
    errors.push("method");
  if (
    ![
      "none",
      "synchronize",
      "cute-charm-f",
      "cute-charm-m",
      "pressure",
      "hustle",
      "vital-spirit",
      "magnet-pull",
      "static",
    ].includes(request.lead)
  )
    errors.push("lead");
  if (
    ![
      "land",
      "surf",
      "rock-smash",
      "old-rod",
      "good-rod",
      "super-rod",
    ].includes(request.area.encounter)
  )
    errors.push("encounter");
  if (
    !["none", "black-flute", "cleanse-tag", "white-flute"].includes(
      request.item,
    )
  )
    errors.push("item");
  if (
    !Number.isInteger(request.synchronizeNature) ||
    request.synchronizeNature < 0 ||
    request.synchronizeNature > 24
  )
    errors.push("synchronizeNature");
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
    !Number.isInteger(request.filters.encounterSlotMask) ||
    request.filters.encounterSlotMask < 1 ||
    request.filters.encounterSlotMask > 0xfff
  )
    errors.push("encounterSlot");
  if (!["any", "star", "square", "star-square"].includes(request.filters.shiny))
    errors.push("shiny");
  if (!["any", "male", "female"].includes(request.filters.gender))
    errors.push("gender");
  if (!["any", "first", "second"].includes(request.filters.ability))
    errors.push("ability");
  if (
    !Number.isInteger(request.filters.levelMin) ||
    !Number.isInteger(request.filters.levelMax) ||
    request.filters.levelMin < 1 ||
    request.filters.levelMax > 100 ||
    request.filters.levelMin > request.filters.levelMax
  )
    errors.push("level");
  for (let index = 0; index < 6; index++) {
    if (
      !Number.isInteger(request.filters.ivMin[index]) ||
      !Number.isInteger(request.filters.ivMax[index]) ||
      request.filters.ivMin[index] < 0 ||
      request.filters.ivMax[index] > 31 ||
      request.filters.ivMin[index] > request.filters.ivMax[index]
    )
      errors.push(`iv${index}`);
  }
  if (
    !Number.isInteger(request.area.rate) ||
    request.area.rate < 1 ||
    request.area.rate > 255 ||
    request.area.slots.length < 1 ||
    request.area.slots.length > 12
  )
    errors.push("area");
  for (const slot of request.area.slots) {
    if (
      !Number.isInteger(slot.species) ||
      slot.species < 1 ||
      slot.species > 1025 ||
      !Number.isInteger(slot.form) ||
      slot.form < 0 ||
      slot.form > 255 ||
      !Number.isInteger(slot.minLevel) ||
      slot.minLevel < 1 ||
      slot.minLevel > slot.maxLevel ||
      slot.maxLevel > 100 ||
      !Number.isInteger(slot.genderRatio) ||
      slot.genderRatio < 0 ||
      slot.genderRatio > 255 ||
      !Number.isInteger(slot.type1) ||
      slot.type1 < 0 ||
      slot.type1 > 16 ||
      !Number.isInteger(slot.type2) ||
      slot.type2 < 0 ||
      slot.type2 > 16
    )
      errors.push("slot");
  }
  if (
    isGen3WildTanobyChamber(request.area.name) &&
    ((request.version !== "firered" && request.version !== "leafgreen") ||
      request.area.encounter !== "land" ||
      request.area.rate !== 7 ||
      request.area.feebasLocation ||
      request.area.safariZone ||
      request.area.slots.length !== 12 ||
      request.area.slots.some(
        (slot, index) =>
          slot.species !== 201 ||
          slot.form !== getGen3WildSlotForm(request.area.name, index) ||
          slot.minLevel !== 25 ||
          slot.maxLevel !== 25,
      ))
  )
    errors.push("tanobyChamber");
  return errors;
}

export function gen3WildSearcherCombinationCount(
  request: Gen3WildSearcherRequest,
) {
  return request.filters.ivMin.reduce(
    (total, minimum, index) =>
      total * (request.filters.ivMax[index] - minimum + 1),
    1,
  );
}

export function validateGen3WildSearcherRequest(
  request: Gen3WildSearcherRequest,
) {
  const generatorShape: Gen3WildRequest = {
    ...request,
    seed: 0,
    initialAdvances: 0,
    maxAdvances: 0,
    offset: 0,
    synchronizeNature: 0,
  };
  const errors = validateGen3WildRequest(generatorShape).filter(
    (error) =>
      error !== "seed" &&
      error !== "initialAdvances" &&
      error !== "maxAdvances" &&
      error !== "offset" &&
      error !== "advanceRange" &&
      error !== "synchronizeNature",
  );
  if (
    errors.length === 0 &&
    gen3WildSearcherCombinationCount(request) > GEN3_WILD_MAX_TOTAL_STATES
  )
    errors.push("searchRange");
  return errors;
}

export function createGen3WildChunks(
  request: Gen3WildRequest,
  chunkSize = GEN3_WILD_CHUNK_SIZE,
) {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > GEN3_WILD_CHUNK_SIZE
  )
    throw new RangeError(
      `Gen3 wild chunk size must be between 1 and ${GEN3_WILD_CHUNK_SIZE}.`,
    );
  const chunks: Gen3WildChunk[] = [];
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

export function createGen3WildSearcherChunks(
  request: Gen3WildSearcherRequest,
  chunkSize = GEN3_WILD_SEARCHER_CHUNK_SIZE,
) {
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > GEN3_WILD_SEARCHER_CHUNK_SIZE
  )
    throw new RangeError(
      `Gen3 wild searcher chunk size must be between 1 and ${GEN3_WILD_SEARCHER_CHUNK_SIZE}.`,
    );
  const chunks: Gen3WildSearcherChunk[] = [];
  const totalStates = gen3WildSearcherCombinationCount(request);
  for (let startIndex = 0, index = 0; startIndex < totalStates; index++) {
    const stateCount = Math.min(chunkSize, totalStates - startIndex);
    chunks.push({ index, startIndex, stateCount });
    startIndex += stateCount;
  }
  return chunks;
}

export function packGen3WildSlots(slots: readonly Gen3WildSlot[]) {
  const words = new Uint32Array(slots.length * 6);
  slots.forEach((slot, index) => {
    const offset = index * 6;
    words[offset] = slot.species;
    words[offset + 1] = slot.form;
    words[offset + 2] = slot.minLevel;
    words[offset + 3] = slot.maxLevel;
    words[offset + 4] = slot.genderRatio;
    words[offset + 5] = slot.type1 | (slot.type2 << 8);
  });
  return words;
}

export function decodeGen3WildStates(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % 15 !== 0)
    throw new RangeError("Invalid Gen3 wild result buffer length.");
  const states = new Array<Gen3WildState>(words.length / 15);
  for (
    let source = 0, target = 0;
    source < words.length;
    source += 15, target++
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
      encounterSlot: words[source + 12],
      species: words[source + 13],
      form: words[source + 14],
    };
  }
  return states;
}

export function decodeGen3WildSearcherStates(buffer: ArrayBuffer) {
  return decodeGen3WildStates(buffer).map(
    ({ advances: seed, ...state }): Gen3WildSearcherState => ({
      seed,
      ...state,
    }),
  );
}
