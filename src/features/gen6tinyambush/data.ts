export type Gen6TinyAmbushVersion = "x" | "y";

export interface Gen6TinyAmbushArea {
  readonly id: string;
  readonly game: Gen6TinyAmbushVersion;
  readonly map: number;
  readonly name: string;
  readonly species: readonly number[];
  readonly levels: readonly number[];
  readonly bagAdvances: number;
}

const AMBUSH_SPECIES = [
  22, 22, 22, 22, 22, 22, 22, 22, 227, 227, 635, 635,
] as const;
const AMBUSH_LEVELS = [57, 58, 59, 58, 59, 58, 57, 58, 57, 59, 59, 59] as const;

export const GEN6_TINY_AMBUSH_AREAS: readonly Gen6TinyAmbushArea[] = [
  {
    id: "x-victory-road-outside",
    game: "x",
    map: 327,
    name: "Victory Road - Outside",
    species: AMBUSH_SPECIES,
    levels: AMBUSH_LEVELS,
    bagAdvances: 27,
  },
  {
    id: "y-victory-road-outside",
    game: "y",
    map: 327,
    name: "Victory Road - Outside",
    species: AMBUSH_SPECIES,
    levels: AMBUSH_LEVELS,
    bagAdvances: 27,
  },
];
