export interface PokeSpotSlot {
  species: number;
  minLevel: number;
  maxLevel: number;
}

export interface PokeSpotLocation {
  id: 0 | 1 | 2;
  nameKey: "pokeSpotRock" | "pokeSpotOasis" | "pokeSpotCave";
  slots: [PokeSpotSlot, PokeSpotSlot, PokeSpotSlot];
}

// EncounterTableGenerator 7769c1df, Gen3/xd/pokespot.bin.
export const POKE_SPOT_LOCATIONS: PokeSpotLocation[] = [
  {
    id: 0,
    nameKey: "pokeSpotRock",
    slots: [
      { species: 27, minLevel: 10, maxLevel: 23 },
      { species: 207, minLevel: 10, maxLevel: 20 },
      { species: 328, minLevel: 10, maxLevel: 20 },
    ],
  },
  {
    id: 1,
    nameKey: "pokeSpotOasis",
    slots: [
      { species: 187, minLevel: 10, maxLevel: 20 },
      { species: 231, minLevel: 10, maxLevel: 20 },
      { species: 283, minLevel: 10, maxLevel: 20 },
    ],
  },
  {
    id: 2,
    nameKey: "pokeSpotCave",
    slots: [
      { species: 41, minLevel: 10, maxLevel: 21 },
      { species: 304, minLevel: 10, maxLevel: 21 },
      { species: 194, minLevel: 10, maxLevel: 21 },
    ],
  },
];
