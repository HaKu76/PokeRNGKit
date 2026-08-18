import type { ThreeDsProfile } from "../3dsprofiles/domain";

export const GEN6_DEXNAV_API_VERSION = 1;
export const GEN6_DEXNAV_REQUEST_WORDS = 45;
export const GEN6_DEXNAV_RESULT_WORDS = 16;
export const GEN6_DEXNAV_MAX_RESULTS = 100_000;
export const GEN6_DEXNAV_MAX_FRAME = 1_000_000_000;
export const GEN6_DEXNAV_BROWSER_MAX_FRAME = 5_000_000;

export type Gen6DexNavEncounterType = "grass" | "tall-grass" | "surf";
export type Gen6DexNavFlute = -1 | 0 | 1;
export interface Gen6DexNavSlot {
  species: number;
  level: number;
}
export interface Gen6DexNavRequest {
  tinySeed: number;
  minFrame: number;
  maxFrame: number;
  tinyFrame: number;
  encounterType: Gen6DexNavEncounterType;
  activeSearch: boolean;
  hasDexNav: boolean;
  searchLevel: number;
  chainLength: number;
  shinyCharm: boolean;
  compoundEyes: boolean;
  forcedShiny: boolean;
  navHa: boolean;
  navUnown: boolean;
  potential: number;
  flute: Gen6DexNavFlute;
  tsv: number;
  trv: number;
  slots: readonly Gen6DexNavSlot[];
  resultLimit: number;
}
export interface Gen6DexNavResult {
  frame: number;
  x: number;
  y: number;
  slot: number;
  slotType: number;
  additionalDelay: number;
  lead: number;
  levelBoost: number;
  fluteBoost: number;
  boost: boolean;
  synchronize: boolean;
  hiddenAbility: boolean;
  eggMove: boolean;
  forcedShiny: boolean;
  species: number;
  level: number;
  grade: number;
  potential: number;
  heldItem: number;
  searchLevel: number;
  random: number;
}

const TYPE_CODES: Record<Gen6DexNavEncounterType, number> = {
  grass: 0,
  "tall-grass": 1,
  surf: 2,
};
const UINT32_MAX = 0xffff_ffff;

function integerIn(value: unknown, min: number, max: number) {
  return (
    Number.isInteger(value) && Number(value) >= min && Number(value) <= max
  );
}

export function gen6DexNavProfile(profile: ThreeDsProfile | undefined) {
  return {
    tsv: profile?.tsv ?? 0,
    trv: profile?.trv ?? 0,
    shinyCharm: profile?.shinyCharm ?? false,
  };
}

export function gen6DexNavTaskCount(request: Gen6DexNavRequest) {
  return request.maxFrame - request.minFrame + 1;
}

export function validateGen6DexNavRequest(request: Gen6DexNavRequest) {
  if (!integerIn(request.tinySeed, 0, UINT32_MAX))
    throw new TypeError("Tiny Seed must be a 32-bit unsigned integer.");
  if (
    !integerIn(request.minFrame, 0, GEN6_DEXNAV_MAX_FRAME) ||
    !integerIn(request.maxFrame, request.minFrame, GEN6_DEXNAV_MAX_FRAME)
  )
    throw new TypeError("Frame range is invalid.");
  if (request.maxFrame > GEN6_DEXNAV_BROWSER_MAX_FRAME)
    throw new TypeError("Gen VI DexNav browser frames are limited to 5000000.");
  if (!integerIn(request.tinyFrame, 0, GEN6_DEXNAV_MAX_FRAME))
    throw new TypeError("Tiny Frame is invalid.");
  if (!(request.encounterType in TYPE_CODES))
    throw new TypeError("Encounter type is invalid.");
  for (const value of [
    request.activeSearch,
    request.hasDexNav,
    request.shinyCharm,
    request.compoundEyes,
    request.forcedShiny,
    request.navHa,
    request.navUnown,
  ])
    if (typeof value !== "boolean")
      throw new TypeError("DexNav flags are invalid.");
  if (
    !integerIn(request.searchLevel, 0, 999) ||
    !integerIn(request.chainLength, 0, 999) ||
    !integerIn(request.potential, 0, 3)
  )
    throw new TypeError("DexNav level, chain, or potential is invalid.");
  if (
    !integerIn(request.flute, -1, 1) ||
    !integerIn(request.tsv, 0, 4095) ||
    !integerIn(request.trv, 0, 15)
  )
    throw new TypeError("DexNav profile values are invalid.");
  if (!integerIn(request.resultLimit, 1, GEN6_DEXNAV_MAX_RESULTS))
    throw new TypeError("Result limit is outside 1..100000.");
  const slotCount = request.encounterType === "surf" ? 5 : 12;
  if (request.slots.length < slotCount)
    throw new TypeError("DexNav slots are incomplete.");
  for (const slot of request.slots)
    if (!integerIn(slot.species, 0, 721) || !integerIn(slot.level, 0, 100))
      throw new TypeError("DexNav slot values are invalid.");
  return request;
}

export function encodeGen6DexNavRequest(request: Gen6DexNavRequest) {
  validateGen6DexNavRequest(request);
  const words = new Uint32Array(GEN6_DEXNAV_REQUEST_WORDS);
  words[0] = request.tinySeed >>> 0;
  words[1] = request.minFrame;
  words[2] = gen6DexNavTaskCount(request);
  words[3] = request.tinyFrame;
  words[4] = TYPE_CODES[request.encounterType];
  words[5] = Number(request.activeSearch);
  words[6] = Number(request.hasDexNav);
  words[7] = request.searchLevel;
  words[8] = request.chainLength;
  words[9] = Number(request.shinyCharm);
  words[10] = Number(request.compoundEyes);
  words[11] = Number(request.forcedShiny);
  words[12] = Number(request.navHa);
  words[13] = Number(request.navUnown);
  words[14] = request.potential;
  words[15] = request.flute >>> 0;
  words[16] = request.tsv;
  words[17] = request.trv;
  for (let i = 0; i < 13; i++) {
    words[18 + i] = request.slots[i]?.species ?? 0;
  }
  for (let i = 0; i < 13; i++) {
    words[31 + i] = request.slots[i]?.level ?? 0;
  }
  words[44] = request.resultLimit;
  return words;
}

export function decodeGen6DexNavResults(
  buffer: ArrayBuffer,
  limit = GEN6_DEXNAV_MAX_RESULTS,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_DEXNAV_RESULT_WORDS !== 0)
    throw new TypeError("DexNav result buffer is not aligned.");
  const count = Math.min(words.length / GEN6_DEXNAV_RESULT_WORDS, limit);
  return Array.from({ length: count }, (_, index): Gen6DexNavResult => {
    const offset = index * GEN6_DEXNAV_RESULT_WORDS;
    const coordinates = words[offset + 2];
    const slot = words[offset + 3];
    const details = words[offset + 4];
    const flags = words[offset + 5];
    const grade = words[offset + 8];
    return {
      frame: words[offset],
      random: words[offset + 1],
      x: ((coordinates & 0xffff) << 16) >> 16,
      y: ((coordinates >> 16) << 16) >> 16,
      slot: slot & 0xff,
      slotType: slot >>> 8,
      additionalDelay: details & 0xff,
      lead: (details >>> 8) & 0xff,
      levelBoost: (details >>> 16) & 0xff,
      fluteBoost: details >>> 24,
      boost: (flags & 1) !== 0,
      synchronize: (flags & 2) !== 0,
      hiddenAbility: (flags & 4) !== 0,
      eggMove: (flags & 8) !== 0,
      forcedShiny: (flags & 16) !== 0,
      species: words[offset + 6],
      level: words[offset + 7],
      grade: grade & 0xff,
      potential: (grade >>> 8) & 0xff,
      heldItem: (grade >>> 16) & 0xff,
      searchLevel: words[offset + 9],
    };
  });
}
