import {
  ENCOUNTER_LOOKUP_DATA,
  ENCOUNTER_LOOKUP_GAME_NAMES,
  ENCOUNTER_LOOKUP_LOCATIONS,
  ENCOUNTER_LOOKUP_SPECIES,
  type EncounterLookupGame,
  type EncounterLookupLanguage,
} from "./data";

export type EncounterLookupType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface EncounterLookupGameOption {
  game: EncounterLookupGame;
  generation: 3 | 4 | 5 | 8;
  locationGroup: string;
  maxSpecies: 386 | 493 | 649;
}

export interface EncounterLookupSpeciesOption {
  id: number;
  name: string;
}

export interface EncounterLookupResult {
  encounter: EncounterLookupType;
  location: string;
  locationId: number;
  maxLevel: number;
  minLevel: number;
}

export const ENCOUNTER_LOOKUP_GAMES: readonly EncounterLookupGameOption[] = [
  { game: "ruby", generation: 3, locationGroup: "rs", maxSpecies: 386 },
  { game: "sapphire", generation: 3, locationGroup: "rs", maxSpecies: 386 },
  { game: "fire-red", generation: 3, locationGroup: "frlg", maxSpecies: 386 },
  { game: "leaf-green", generation: 3, locationGroup: "frlg", maxSpecies: 386 },
  { game: "emerald", generation: 3, locationGroup: "e", maxSpecies: 386 },
  { game: "diamond", generation: 4, locationGroup: "dppt", maxSpecies: 493 },
  { game: "pearl", generation: 4, locationGroup: "dppt", maxSpecies: 493 },
  { game: "platinum", generation: 4, locationGroup: "dppt", maxSpecies: 493 },
  { game: "heart-gold", generation: 4, locationGroup: "hgss", maxSpecies: 493 },
  { game: "soul-silver", generation: 4, locationGroup: "hgss", maxSpecies: 493 },
  { game: "black", generation: 5, locationGroup: "bw", maxSpecies: 649 },
  { game: "white", generation: 5, locationGroup: "bw", maxSpecies: 649 },
  { game: "black-2", generation: 5, locationGroup: "bw2", maxSpecies: 649 },
  { game: "white-2", generation: 5, locationGroup: "bw2", maxSpecies: 649 },
  {
    game: "brilliant-diamond",
    generation: 8,
    locationGroup: "bdsp",
    maxSpecies: 493,
  },
  {
    game: "shining-pearl",
    generation: 8,
    locationGroup: "bdsp",
    maxSpecies: 493,
  },
] as const;

const GAME_OPTIONS = new Map(
  ENCOUNTER_LOOKUP_GAMES.map((option) => [option.game, option]),
);

export function getEncounterLookupGameName(
  game: EncounterLookupGame,
  language: EncounterLookupLanguage,
): string {
  return ENCOUNTER_LOOKUP_GAME_NAMES[game][language];
}

export function getEncounterLookupSpecies(
  game: EncounterLookupGame,
  language: EncounterLookupLanguage,
): EncounterLookupSpeciesOption[] {
  const maximum = GAME_OPTIONS.get(game)?.maxSpecies ?? 0;
  return ENCOUNTER_LOOKUP_SPECIES[language]
    .slice(1, maximum + 1)
    .map((name, index) => ({ id: index + 1, name }));
}

export function findEncounterLookup(
  game: EncounterLookupGame,
  species: number,
  language: EncounterLookupLanguage,
): EncounterLookupResult[] {
  const option = GAME_OPTIONS.get(game);
  if (
    !option ||
    !Number.isInteger(species) ||
    species < 1 ||
    species > option.maxSpecies
  ) {
    return [];
  }

  const locations = ENCOUNTER_LOOKUP_LOCATIONS[option.locationGroup];
  return ENCOUNTER_LOOKUP_DATA[game]
    .filter((row) => row[0] === species)
    .map((row) => ({
      locationId: row[1],
      encounter: row[2] as EncounterLookupType,
      minLevel: row[3],
      maxLevel: row[4],
      location:
        locations[language][String(row[1])] ??
        locations.en[String(row[1])] ??
        String(row[1]),
    }));
}
