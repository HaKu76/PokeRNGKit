/* Derived from PokeFinder 4.3.2 and EncounterTableGenerator Gen5 resources. GPL-3.0-or-later. */
import { getIvSpeciesName } from "../gen4ivcalculator/gen4IvData";
import { getGen4WildItemName } from "../gen4wild/domain";
import { getGen5WildLocationName } from "../gen5wild/locationNames";

export interface Gen5HiddenGrottoPokemonSlot {
  species: number;
  form: number;
  genderThreshold: number;
  minLevel: number;
  maxLevel: number;
}

export interface Gen5HiddenGrottoArea {
  location: number;
  pokemon: readonly Gen5HiddenGrottoPokemonSlot[];
  items: readonly number[];
  hiddenItems: readonly number[];
}

type CompactArea = readonly [
  location: number,
  species: readonly number[],
  genders: readonly number[],
  minLevel: number,
  maxLevel: number,
  items: readonly number[],
  hiddenItems: readonly number[],
];

const COMMON_ITEMS = [
  82, 2, 3, 4, 84, 2, 3, 4, 83, 77, 76, 79, 85, 25, 26, 17,
] as const;
const CAVE_ITEMS = [
  81, 2, 3, 4, 80, 2, 3, 4, 107, 77, 76, 79, 108, 25, 26, 17,
] as const;
const POND_ITEMS = [
  109, 2, 3, 4, 109, 2, 3, 4, 109, 77, 76, 79, 109, 25, 26, 17,
] as const;
const HIDDEN_ITEMS = [
  50, 72, 87, 95, 51, 73, 86, 96, 51, 74, 86, 97, 53, 75, 86, 98,
] as const;

const COMPACT_AREAS: readonly CompactArea[] = [
  [
    45,
    [206, 507, 183, 206, 507, 183, 206, 507, 183, 206, 507, 183],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    10,
    15,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    106,
    [572, 510, 590, 572, 510, 590, 572, 510, 590, 572, 510, 590],
    [60, 30, 30, 60, 30, 30, 60, 30, 30, 60, 30, 30],
    20,
    25,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    126,
    [214, 542, 415, 214, 542, 415, 214, 542, 415, 127, 542, 415],
    [30, 30, 5, 30, 30, 5, 30, 30, 5, 30, 30, 5],
    20,
    25,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    107,
    [206, 527, 590, 206, 527, 590, 206, 527, 590, 206, 527, 590],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    25,
    30,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    135,
    [299, 527, 590, 299, 527, 590, 299, 527, 590, 299, 527, 590],
    [0, 30, 30, 0, 30, 30, 0, 30, 30, 0, 30, 30],
    25,
    30,
    CAVE_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    111,
    [613, 505, 335, 613, 505, 335, 613, 505, 336, 613, 505, 336],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    30,
    35,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    121,
    [451, 114, 590, 451, 114, 590, 451, 114, 590, 451, 114, 590],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    35,
    40,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    136,
    [363, 425, 590, 363, 425, 590, 363, 425, 590, 363, 425, 590],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    35,
    40,
    CAVE_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    118,
    [626, 89, 510, 626, 89, 510, 626, 569, 510, 626, 569, 510],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    35,
    40,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    34,
    [132, 375, 35, 132, 375, 35, 132, 215, 35, 132, 215, 35],
    [0, 0, 60, 0, 0, 60, 0, 30, 60, 0, 30, 60],
    45,
    50,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    130,
    [619, 279, 591, 619, 279, 591, 619, 279, 591, 619, 279, 591],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    40,
    45,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    131,
    [207, 55, 335, 207, 55, 335, 207, 359, 336, 207, 359, 336],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    50,
    55,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    123,
    [37, 436, 591, 37, 436, 591, 37, 436, 591, 37, 436, 591],
    [10, 30, 30, 10, 30, 30, 10, 30, 30, 10, 30, 30],
    35,
    40,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    137,
    [333, 55, 591, 333, 55, 591, 333, 55, 591, 333, 55, 591],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    35,
    40,
    CAVE_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    9,
    [198, 12, 591, 198, 12, 591, 198, 12, 591, 198, 12, 286],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    55,
    60,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    8,
    [61, 371, 308, 61, 371, 308, 61, 371, 308, 61, 297, 308],
    [10, 30, 30, 10, 30, 30, 10, 30, 30, 10, 30, 30],
    55,
    60,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    101,
    [523, 310, 417, 523, 310, 417, 523, 310, 417, 523, 310, 417],
    [30, 30, 60, 30, 30, 60, 30, 30, 60, 30, 30, 60],
    55,
    60,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    138,
    [271, 48, 400, 271, 48, 400, 271, 48, 400, 271, 48, 400],
    [30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    55,
    60,
    POND_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    100,
    [210, 32, 505, 210, 32, 505, 210, 29, 505, 210, 29, 505],
    [30, 0, 30, 30, 0, 30, 30, 100, 30, 30, 100, 30],
    55,
    60,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
  [
    127,
    [149, 441, 99, 149, 441, 99, 149, 441, 222, 149, 441, 222],
    [10, 30, 30, 10, 30, 30, 10, 30, 60, 10, 30, 60],
    55,
    60,
    COMMON_ITEMS,
    HIDDEN_ITEMS,
  ],
];

export const GEN5_HIDDEN_GROTTO_AREAS: readonly Gen5HiddenGrottoArea[] =
  COMPACT_AREAS.map(
    ([location, species, genders, minLevel, maxLevel, items, hiddenItems]) => ({
      location,
      pokemon: species.map((value, index) => ({
        species: value,
        form: 0,
        genderThreshold: genders[index],
        minLevel,
        maxLevel,
      })),
      items: [...items],
      hiddenItems: [...hiddenItems],
    }),
  );

const FIXED_GENDERS: Readonly<Record<number, 0 | 1 | 2>> = {
  29: 1,
  32: 0,
  132: 2,
  375: 2,
  436: 2,
};

export function getGen5HiddenGrottoLocationName(
  language: string,
  location: number,
) {
  return getGen5WildLocationName(language, "black2", location);
}

export function getGen5HiddenGrottoSpeciesName(
  language: string,
  species: number,
  form = 0,
) {
  return getIvSpeciesName(language, species, form);
}

export function getGen5HiddenGrottoItemName(language: string, item: number) {
  return getGen4WildItemName(language, item);
}

export function getGen5HiddenGrottoAllowedGenders(
  slot: Gen5HiddenGrottoPokemonSlot,
) {
  const fixed = FIXED_GENDERS[slot.species];
  return fixed === undefined ? ([0, 1] as const) : ([fixed] as const);
}

export function getGen5HiddenGrottoUniqueSpecies(area: Gen5HiddenGrottoArea) {
  return [...new Set(area.pokemon.map((slot) => slot.species))];
}

export function getGen5HiddenGrottoUniqueItems(area: Gen5HiddenGrottoArea) {
  return [...new Set([...area.items, ...area.hiddenItems])];
}

export function getGen5HiddenGrottoMatchMasks(
  area: Gen5HiddenGrottoArea,
  species: number | null,
  item: number | null,
) {
  let groupMask = 0;
  let slotMask = 0;
  for (let group = 0; group < 4; group += 1) {
    for (let slot = 0; slot < 3; slot += 1) {
      if (
        species !== null &&
        area.pokemon[group * 3 + slot].species === species
      ) {
        groupMask |= 1 << group;
        slotMask |= 1 << slot;
      }
    }
    for (let slot = 0; slot < 4; slot += 1) {
      if (item !== null && area.items[group * 4 + slot] === item) {
        groupMask |= 1 << group;
        slotMask |= 1 << (slot + 3);
      }
      if (item !== null && area.hiddenItems[group * 4 + slot] === item) {
        groupMask |= 1 << group;
        slotMask |= 1 << (slot + 7);
      }
    }
  }
  return { groupMask, slotMask };
}
