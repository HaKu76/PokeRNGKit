/*
 * Derived from PokeFinder 4.3.2 Encounters5.cpp.
 * PokeFinder is licensed under GPL-3.0-or-later.
 */

import type { Gen5GameVersion } from "../gen5profiles/domain";
import { GEN5_WILD_ENCOUNTER_BASE64 } from "./encounterData";

export type Gen5WildEncounter =
  | "grass"
  | "dark-grass"
  | "rustling-grass"
  | "surfing"
  | "rippling-surfing"
  | "super-rod"
  | "rippling-fishing";

export type Gen5WildSeason = 0 | 1 | 2 | 3;

export interface Gen5WildSlot {
  species: number;
  form: number;
  minLevel: number;
  maxLevel: number;
}

export interface Gen5WildArea {
  version: Gen5GameVersion;
  location: number;
  seasonal: boolean;
  season: Gen5WildSeason;
  encounter: Gen5WildEncounter;
  rate: number;
  slots: readonly Gen5WildSlot[];
}

const SEASON_BYTES = 232;
const encounterCache = new Map<string, readonly Gen5WildArea[]>();
const dataCache: Partial<Record<Gen5GameVersion, Uint8Array>> = {};

const layout: Record<
  Gen5WildEncounter,
  { rateOffset: number; slotOffset: number; count: 5 | 12; dynamic: boolean }
> = {
  grass: { rateOffset: 0, slotOffset: 8, count: 12, dynamic: false },
  "dark-grass": { rateOffset: 1, slotOffset: 56, count: 12, dynamic: false },
  "rustling-grass": {
    rateOffset: 2,
    slotOffset: 104,
    count: 12,
    dynamic: false,
  },
  surfing: { rateOffset: 3, slotOffset: 152, count: 5, dynamic: true },
  "rippling-surfing": {
    rateOffset: 4,
    slotOffset: 172,
    count: 5,
    dynamic: true,
  },
  "super-rod": { rateOffset: 5, slotOffset: 192, count: 5, dynamic: true },
  "rippling-fishing": {
    rateOffset: 6,
    slotOffset: 212,
    count: 5,
    dynamic: true,
  },
};

function encounterData(version: Gen5GameVersion) {
  return (dataCache[version] ??= Uint8Array.from(
    atob(GEN5_WILD_ENCOUNTER_BASE64[version]),
    (character) => character.charCodeAt(0),
  ));
}

function readU16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

export function gen5WildEncounterValue(encounter: Gen5WildEncounter) {
  return {
    grass: 0,
    "dark-grass": 1,
    "rustling-grass": 2,
    surfing: 4,
    "rippling-surfing": 5,
    "super-rod": 8,
    "rippling-fishing": 9,
  }[encounter];
}

export function getGen5WildAreas(
  version: Gen5GameVersion,
  encounter: Gen5WildEncounter,
  season: Gen5WildSeason,
) {
  const key = `${version}:${encounter}:${season}`;
  const cached = encounterCache.get(key);
  if (cached) return cached;

  const bytes = encounterData(version);
  const selectedLayout = layout[encounter];
  const areas: Gen5WildArea[] = [];
  for (let offset = 0; offset < bytes.length;) {
    if (offset + 2 > bytes.length)
      throw new Error("Gen 5 Wild encounter data is truncated.");
    const location = bytes[offset];
    const seasonCount = bytes[offset + 1];
    const recordBytes = 2 + seasonCount * SEASON_BYTES;
    if (
      (seasonCount !== 1 && seasonCount !== 4) ||
      offset + recordBytes > bytes.length
    ) {
      throw new Error("Gen 5 Wild encounter data has an invalid record.");
    }
    const selectedSeason = season < seasonCount ? season : 0;
    const seasonOffset = offset + 2 + selectedSeason * SEASON_BYTES;
    const rate = bytes[seasonOffset + selectedLayout.rateOffset];
    if (rate !== 0) {
      const slots: Gen5WildSlot[] = [];
      for (let index = 0; index < selectedLayout.count; index += 1) {
        const slotOffset = seasonOffset + selectedLayout.slotOffset + index * 4;
        const packedSpecies = readU16(bytes, slotOffset);
        const firstLevel = bytes[slotOffset + 2];
        const secondLevel = bytes[slotOffset + 3];
        slots.push({
          species: packedSpecies & 0x7ff,
          form: packedSpecies >>> 11,
          minLevel: selectedLayout.dynamic ? secondLevel : firstLevel,
          maxLevel: firstLevel,
        });
      }
      areas.push({
        version,
        location,
        seasonal: seasonCount > 1,
        season,
        encounter,
        rate,
        slots,
      });
    }
    offset += recordBytes;
  }
  encounterCache.set(key, areas);
  return areas;
}

export function getGen5WildUniqueSpecies(area: Gen5WildArea) {
  const unique = new Map<number, { species: number; form: number }>();
  area.slots.forEach((slot) => {
    const key = slot.species | (slot.form << 11);
    if (!unique.has(key))
      unique.set(key, { species: slot.species, form: slot.form });
  });
  return [...unique.values()];
}

export function getGen5WildSpeciesSlots(
  area: Gen5WildArea,
  species: number,
  form: number,
) {
  return area.slots.reduce(
    (mask, slot, index) =>
      slot.species === species && slot.form === form
        ? mask | (1 << index)
        : mask,
    0,
  );
}

export function getGen5WildSpeciesLevelRange(
  area: Gen5WildArea,
  species: number,
  form: number,
) {
  const slots = area.slots.filter(
    (slot) => slot.species === species && slot.form === form,
  );
  if (slots.length === 0) return undefined;
  return {
    minimum: Math.min(...slots.map((slot) => slot.minLevel)),
    maximum: Math.max(...slots.map((slot) => slot.maxLevel)),
  };
}
