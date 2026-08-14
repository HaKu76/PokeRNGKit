/*
 * Derived from PokeFinder 4.3.2 EggSettings.cpp and Gen V personal data.
 * PokeFinder is licensed under GPL-3.0-or-later.
 */

import {
  getIvBaseStats,
  getIvSpeciesName,
} from "../gen4ivcalculator/gen4IvData";
import { GEN4_EGG_SPECIES } from "../gen4egg/data";

const GEN5_ONLY_EGG_SPECIES = [
  495, 498, 501, 504, 506, 509, 511, 513, 515, 517, 519, 522, 524, 527, 529,
  531, 532, 535, 538, 539, 540, 543, 546, 548, 550, 551, 554, 556, 557, 559,
  561, 562, 564, 566, 568, 570, 572, 574, 577, 580, 582, 585, 587, 588, 590,
  592, 594, 595, 597, 599, 602, 605, 607, 610, 613, 615, 616, 618, 619, 621,
  622, 624, 626, 627, 629, 631, 632, 633, 636,
] as const;

export const GEN5_EGG_SPECIES = [
  ...GEN4_EGG_SPECIES,
  ...GEN5_ONLY_EGG_SPECIES,
] as const;

export const GEN5_EGG_SPECIES_SET = new Set<number>(GEN5_EGG_SPECIES);

export function getGen5EggAlternateSpecies(species: number) {
  if (species === 29 || species === 32) return species === 29 ? 32 : 29;
  if (species === 313 || species === 314) return species === 313 ? 314 : 313;
  return undefined;
}

export function getGen5EggSpeciesName(language: string, species: number) {
  return getIvSpeciesName(language, species);
}

export function getGen5EggBaseStats(species: number) {
  return getIvBaseStats("bw2", species);
}
