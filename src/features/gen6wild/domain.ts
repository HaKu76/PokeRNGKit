import type { ThreeDsProfile } from "../3dsprofiles/domain";
import { GEN6_EVENT_PERSONAL } from "../gen6event/data";
import {
  GEN6_WILD_AREAS,
  GEN6_WILD_BABY_SPECIES,
  GEN6_WILD_LOCATIONS,
  GEN6_WILD_UNDISCOVERED_SPECIES,
  type Gen6WildArea,
  type Gen6WildType,
  type Gen6WildVersion,
} from "./data";

export const GEN6_WILD_API_VERSION = 1;
export const GEN6_WILD_REQUEST_WORDS = 96;
export const GEN6_WILD_RESULT_WORDS = 16;
export const GEN6_WILD_MAX_RESULTS = 100_000;
export const GEN6_WILD_BROWSER_MAX_FRAME = 5_000_000;
export const GEN6_WILD_MAX_FRAME = 1_000_000_000;
export const GEN6_WILD_SLOT_COUNT = 12;

export type Gen6WildLanguage = "en" | "ja" | "zh";
export type Gen6WildLead =
  | "none"
  | "synchronize"
  | "cute-charm-male"
  | "cute-charm-female"
  | "static"
  | "magnet-pull"
  | "compound-eyes"
  | "pressure"
  | "black-flute"
  | "white-flute";
export type Gen6WildShinyFilter = "any" | "shiny" | "square";
export type Gen6WildGenderFilter = "any" | "male" | "female" | "genderless";
export type Gen6WildAbilityFilter = "any" | "first" | "second" | "hidden";
export type Gen6WildItemFilter =
  "any" | "common" | "rare" | "very-rare" | "none";
export type Gen6WildIvTuple = [number, number, number, number, number, number];

export interface Gen6WildSlot {
  readonly species: number;
  readonly level: number;
  readonly genderRatio: number;
  readonly randomGender: boolean;
  readonly fixedThreeIv: boolean;
}

export interface Gen6WildFilters {
  disabled: boolean;
  shiny: Gen6WildShinyFilter;
  gender: Gen6WildGenderFilter;
  ability: Gen6WildAbilityFilter;
  item: Gen6WildItemFilter;
  natureMask: number;
  hiddenPowerMask: number;
  slotMask: number;
  ivMin: Gen6WildIvTuple;
  ivMax: Gen6WildIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
}

export interface Gen6WildRequest {
  version: Gen6WildVersion;
  encounterType: Gen6WildType;
  seed: number;
  minFrame: number;
  maxFrame: number;
  delay: number;
  considerDelay: boolean;
  tsv: number;
  trv: number;
  shinyCharm: boolean;
  syncNature: number | null;
  lead: Gen6WildLead;
  tinySeed: number;
  tinyFrame: number;
  tinySynced: boolean;
  encounterRate: number;
  partyPokemon: number;
  pidRolls: number;
  compoundEyes: boolean;
  hiddenAbility: boolean;
  flute: -1 | 0 | 1;
  hordeSlot: number;
  slots: readonly Gen6WildSlot[];
  slotDistribution: readonly number[];
  filters: Gen6WildFilters;
  resultLimit: number;
}

export interface Gen6WildResult {
  frame: number;
  random: number;
  ec: number;
  pid: number;
  ivs: Gen6WildIvTuple;
  nature: number;
  ability: number;
  gender: number;
  hiddenPower: number;
  shiny: number;
  synchronize: boolean;
  species: number;
  level: number;
  slot: number;
  item: number;
  frameUsed: number;
  psv: number;
  prv: number;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const SHINY_MASKS = { any: 7, shiny: 6, square: 4 } as const;
const GENDER_FILTERS = { any: 3, male: 1, female: 2, genderless: 0 } as const;
const ABILITY_FILTERS = { any: 0, first: 1, second: 2, hidden: 3 } as const;
const ITEM_FILTERS = {
  any: 4,
  common: 0,
  rare: 1,
  "very-rare": 2,
  none: 3,
} as const;
const LEAD_CODES: Record<Gen6WildLead, number> = {
  none: 0,
  synchronize: 1,
  "cute-charm-male": 2,
  "cute-charm-female": 3,
  static: 4,
  "magnet-pull": 5,
  "compound-eyes": 6,
  pressure: 8,
  "black-flute": 9,
  "white-flute": 10,
};
const TYPE_CODES: Record<Gen6WildType, number> = {
  normal: 0,
  horde: 1,
  "rock-smash": 2,
  fishing: 3,
};
const VERSION_CODES: Record<Gen6WildVersion, number> = {
  x: 0,
  y: 0,
  "omega-ruby": 1,
  "alpha-sapphire": 1,
};

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function areaFamily(version: Gen6WildVersion) {
  return version === "x" || version === "y" ? "x" : "omega-ruby";
}

export function gen6WildProfile(profile: ThreeDsProfile | undefined) {
  const version = profile?.version;
  const selected: Gen6WildVersion =
    version === "x" ||
    version === "y" ||
    version === "omega-ruby" ||
    version === "alpha-sapphire"
      ? version
      : "omega-ruby";
  return {
    version: selected,
    tsv: profile?.tsv ?? 0,
    trv: profile?.trv ?? 0,
    shinyCharm: profile?.shinyCharm ?? false,
  };
}

export function gen6WildAreas(version: Gen6WildVersion, type: Gen6WildType) {
  const family = areaFamily(version);
  return GEN6_WILD_AREAS.filter(
    (area) => area.version === family && area.type === type,
  );
}

export function gen6WildLocationName(
  area: Pick<Gen6WildArea, "location" | "index">,
  language: Gen6WildLanguage,
) {
  const base =
    GEN6_WILD_LOCATIONS[language][area.location] || `Location ${area.location}`;
  return area.index ? `${base} (${area.index})` : base;
}

export function gen6WildSlots(
  area: Gen6WildArea | undefined,
  type: Gen6WildType,
  hordeSlot = 1,
  rod = 0,
  version: Gen6WildVersion = area?.version === "x" ? "x" : "omega-ruby",
) {
  if (!area) return [] as Gen6WildSlot[];
  let species = [...area.species];
  let levels = [...area.levels];
  if (type === "horde") {
    const selectedIndex = Math.max(0, Math.min(2, hordeSlot - 1));
    const selected = species[selectedIndex] ?? 0;
    species = Array.from({ length: 5 }, () => selected);
    levels = Array.from({ length: 5 }, () => levels[0] ?? 1);
    const xyReplacement = new Map([
      [311, 312],
      [312, 311],
      [335, 336],
      [336, 335],
      [304, 228],
      [228, 304],
    ]);
    const orasReplacement = new Map([
      [311, 312],
      [312, 311],
      [303, 302],
      [109, 88],
      [273, 270],
    ]);
    const special =
      area.version === "x"
        ? new Map([
            [311, [312, 3, 2]],
            [335, [336, 1, 1]],
            [32, [29, 4, 0]],
            [128, [241, 1, 2]],
            [524, [703, 3, 2]],
            [709, [185, 3, 2]],
            [632, [631, 3, 2]],
          ])
        : new Map([
            [312, [311, 1, 2]],
            [43, [263, 4, 0]],
            [296, [74, 2, 1]],
          ]);
    const replacement = special.get(selected);
    if (replacement && replacement[2] === hordeSlot && replacement[1] > 0)
      species[replacement[1] - 1] = replacement[0];
    const versionReplacements =
      area.version === "x" ? xyReplacement : orasReplacement;
    if (version === "y" || version === "alpha-sapphire")
      species = species.map((value) => versionReplacements.get(value) ?? value);
    if (
      version === "alpha-sapphire" &&
      area.location === 230 &&
      selected === 270
    )
      species[3] = 333;
  } else if (type === "fishing") {
    const start = Math.max(0, Math.min(2, rod)) * 3;
    species = species.slice(start, start + 3);
    levels = levels.slice(start, start + 3);
  }
  return species.map((value, index) => {
    const personal = GEN6_EVENT_PERSONAL[value]?.forms[0];
    const ratio = personal?.genderRatio ?? 255;
    return {
      species: value,
      level: levels[index] ?? levels[0] ?? 1,
      genderRatio: ratio,
      randomGender: ratio > 15 && ratio < 239,
      fixedThreeIv:
        GEN6_WILD_UNDISCOVERED_SPECIES.includes(value) &&
        (version === "x" ||
          version === "y" ||
          !GEN6_WILD_BABY_SPECIES.includes(value)),
    };
  });
}

export function gen6WildDefaultFilters(): Gen6WildFilters {
  return {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    item: "any",
    natureMask: ALL_NATURES,
    hiddenPowerMask: ALL_HIDDEN_POWERS,
    slotMask: 0,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  };
}

export function gen6WildTaskCount(request: Gen6WildRequest) {
  return request.maxFrame - request.minFrame + 1;
}

export function validateGen6WildRequest(request: Gen6WildRequest) {
  if (
    !integerIn(request.seed, 0, UINT32_MAX) ||
    !integerIn(request.tinySeed, 0, UINT32_MAX)
  )
    throw new TypeError("Seeds must be 32-bit unsigned integers.");
  if (
    !integerIn(request.minFrame, 0, GEN6_WILD_MAX_FRAME) ||
    !integerIn(request.maxFrame, request.minFrame, GEN6_WILD_MAX_FRAME) ||
    request.maxFrame > GEN6_WILD_BROWSER_MAX_FRAME
  )
    throw new TypeError("Frame range is invalid for the browser.");
  if (
    !integerIn(request.delay, 0, 4000) ||
    !integerIn(request.tinyFrame, 0, GEN6_WILD_MAX_FRAME) ||
    !integerIn(request.tsv, 0, 4095) ||
    !integerIn(request.trv, 0, 15) ||
    !integerIn(request.encounterRate, 0, 100) ||
    !integerIn(request.partyPokemon, 0, 5) ||
    !integerIn(request.pidRolls, 1, 40) ||
    !integerIn(request.hordeSlot, 1, 3) ||
    ![-1, 0, 1].includes(request.flute)
  )
    throw new TypeError("Gen VI Wild input is outside the upstream range.");
  if (!(request.syncNature === null || integerIn(request.syncNature, 0, 24)))
    throw new TypeError("Synchronize nature is invalid.");
  if (
    !Object.hasOwn(TYPE_CODES, request.encounterType) ||
    !Object.hasOwn(LEAD_CODES, request.lead)
  )
    throw new TypeError("Encounter type or lead is invalid.");
  if (
    request.slots.length === 0 ||
    request.slots.length > GEN6_WILD_SLOT_COUNT ||
    request.slotDistribution.length !== request.slots.length
  )
    throw new TypeError("Wild slots are invalid.");
  if (request.slotDistribution.reduce((sum, value) => sum + value, 0) !== 100)
    throw new TypeError("Wild slot distribution must total 100.");
  request.slots.forEach((slot) => {
    if (
      !integerIn(slot.species, 0, 721) ||
      !integerIn(slot.level, 1, 100) ||
      !integerIn(slot.genderRatio, 0, 255)
    )
      throw new TypeError("Wild slot data is invalid.");
  });
  if (!integerIn(request.resultLimit, 1, GEN6_WILD_MAX_RESULTS))
    throw new TypeError("Result limit is outside 1..100000.");
  const filters = request.filters;
  if (
    !(filters.shiny in SHINY_MASKS) ||
    !(filters.gender in GENDER_FILTERS) ||
    !(filters.ability in ABILITY_FILTERS) ||
    !(filters.item in ITEM_FILTERS) ||
    !integerIn(filters.natureMask, 0, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 0, ALL_HIDDEN_POWERS) ||
    !integerIn(filters.slotMask, 0, 0xfff) ||
    !integerIn(filters.perfectIvValue, 0, 31) ||
    !integerIn(filters.perfectIvCount, 0, 6)
  )
    throw new TypeError("Gen VI Wild filters are invalid.");
  filters.ivMin.forEach((minimum, index) => {
    if (
      !integerIn(minimum, 0, 31) ||
      !integerIn(filters.ivMax[index], minimum, 31)
    )
      throw new TypeError("Each IV range must stay inside 0..31.");
  });
  return request;
}

export function encodeGen6WildRequest(request: Gen6WildRequest) {
  validateGen6WildRequest(request);
  return Uint32Array.from([
    VERSION_CODES[request.version],
    TYPE_CODES[request.encounterType],
    request.seed,
    request.minFrame,
    gen6WildTaskCount(request),
    request.delay,
    request.considerDelay ? 1 : 0,
    request.tsv,
    request.trv,
    request.shinyCharm ? 1 : 0,
    request.syncNature ?? 255,
    LEAD_CODES[request.lead],
    request.tinySeed,
    request.tinyFrame,
    request.tinySynced ? 1 : 0,
    request.encounterRate,
    request.partyPokemon,
    request.pidRolls,
    request.compoundEyes ? 1 : 0,
    request.hiddenAbility ? 1 : 0,
    request.flute >>> 0,
    request.hordeSlot,
    ...Array.from(
      { length: 13 },
      (_, index) => request.slots[index]?.species ?? 0,
    ),
    ...Array.from(
      { length: 13 },
      (_, index) => request.slots[index]?.level ?? 0,
    ),
    ...Array.from({ length: 13 }, (_, index) => {
      const slot = request.slots[index];
      return slot
        ? slot.genderRatio |
            (slot.randomGender ? 1 << 8 : 0) |
            (slot.fixedThreeIv ? 1 << 9 : 0)
        : 0;
    }),
    ...Array.from(
      { length: 12 },
      (_, index) => request.slotDistribution[index] ?? 0,
    ),
    request.filters.disabled ? 1 : 0,
    SHINY_MASKS[request.filters.shiny],
    GENDER_FILTERS[request.filters.gender],
    ABILITY_FILTERS[request.filters.ability],
    ALL_NATURES & (request.filters.natureMask || ALL_NATURES),
    request.filters.hiddenPowerMask || ALL_HIDDEN_POWERS,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    request.filters.perfectIvValue,
    request.filters.perfectIvCount,
    request.filters.slotMask,
    ITEM_FILTERS[request.filters.item],
    request.resultLimit,
  ]);
}

function byte(value: number, shift: number) {
  return (value >>> shift) & 0xff;
}

export function decodeGen6WildResults(
  buffer: ArrayBuffer,
  maximum = Number.POSITIVE_INFINITY,
) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN6_WILD_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen VI Wild result buffer.");
  const count = Math.min(
    words.length / GEN6_WILD_RESULT_WORDS,
    Math.max(0, Math.floor(maximum)),
  );
  return Array.from({ length: count }, (_, index): Gen6WildResult => {
    const offset = index * GEN6_WILD_RESULT_WORDS;
    const metadata = words[offset + 6];
    const encounter = words[offset + 7];
    const iv0 = words[offset + 4];
    const iv1 = words[offset + 5];
    return {
      frame: words[offset],
      random: words[offset + 1],
      ec: words[offset + 2],
      pid: words[offset + 3],
      ivs: [
        byte(iv0, 0),
        byte(iv0, 8),
        byte(iv0, 16),
        byte(iv0, 24),
        byte(iv1, 0),
        byte(iv1, 8),
      ],
      nature: metadata & 31,
      ability: (metadata >>> 5) & 3,
      gender: (metadata >>> 7) & 3,
      hiddenPower: (metadata >>> 9) & 15,
      shiny: (metadata >>> 13) & 3,
      synchronize: ((metadata >>> 15) & 1) !== 0,
      species: encounter & 0x7ff,
      level: (encounter >>> 11) & 0x7f,
      slot: (encounter >>> 18) & 0x3f,
      item: words[offset + 8],
      frameUsed: words[offset + 9],
      psv: words[offset + 10],
      prv: words[offset + 11],
    };
  });
}

export function gen6WildHiddenPower(ivs: readonly number[]) {
  const order = [0, 1, 2, 4, 5, 3];
  return Math.floor(
    (ivs.reduce((sum, value, index) => sum + ((value & 1) << order[index]), 0) *
      15) /
      63,
  );
}

export function gen6WildResultPassesFilters(
  request: Gen6WildRequest,
  result: Gen6WildResult,
) {
  const filters = request.filters;
  if (filters.disabled) return true;
  return (
    (SHINY_MASKS[filters.shiny] & (1 << result.shiny)) !== 0 &&
    (GENDER_FILTERS[filters.gender] === 3 ||
      GENDER_FILTERS[filters.gender] === result.gender) &&
    (ABILITY_FILTERS[filters.ability] === 0 ||
      ABILITY_FILTERS[filters.ability] === result.ability) &&
    (ITEM_FILTERS[filters.item] === 4 ||
      ITEM_FILTERS[filters.item] === result.item) &&
    (filters.natureMask & (1 << result.nature)) !== 0 &&
    (filters.hiddenPowerMask & (1 << result.hiddenPower)) !== 0 &&
    (filters.slotMask === 0 || (filters.slotMask & (1 << result.slot)) !== 0) &&
    result.ivs.filter((value) => value >= filters.perfectIvValue).length >=
      filters.perfectIvCount &&
    result.ivs.every(
      (value, index) =>
        value >= filters.ivMin[index] && value <= filters.ivMax[index],
    )
  );
}

export function formatGen6WildHex(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function gen6WildAreaFamily(version: Gen6WildVersion) {
  return version === "x" || version === "y" ? "XY" : "ORAS";
}
