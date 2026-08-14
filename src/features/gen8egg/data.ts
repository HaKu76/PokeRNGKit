/*
 * Derived from PokeFinder 4.3.2 EggSettings.cpp and BDSP personal data.
 * PokeFinder is licensed under GPL-3.0-or-later.
 */

import { GEN4_EGG_SPECIES } from "../gen4egg/data";
import {
  getIvBaseStats,
  getIvSpeciesName,
} from "../gen4ivcalculator/gen4IvData";

export const GEN8_EGG_SPECIES = GEN4_EGG_SPECIES;
export const GEN8_EGG_SPECIES_SET = new Set<number>(GEN8_EGG_SPECIES);

export function getGen8EggAlternateSpecies(species: number) {
  if (species === 29 || species === 32) return species === 29 ? 32 : 29;
  if (species === 313 || species === 314) return species === 313 ? 314 : 313;
  return undefined;
}

export function getGen8EggSpeciesName(language: string, species: number) {
  return getIvSpeciesName(language, species);
}

export function getGen8EggBaseStats(species: number) {
  return getIvBaseStats("bdsp", species);
}
