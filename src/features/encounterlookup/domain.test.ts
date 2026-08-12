import { describe, expect, it } from "vitest";
import {
  ENCOUNTER_LOOKUP_GAMES,
  findEncounterLookup,
  getEncounterLookupSpecies,
} from "./domain";
import { ENCOUNTER_LOOKUP_DATA } from "./data";

describe("Encounter Lookup domain", () => {
  it("uses PokeFinder's species limit for each supported generation", () => {
    expect(getEncounterLookupSpecies("ruby", "en")).toHaveLength(386);
    expect(getEncounterLookupSpecies("diamond", "en")).toHaveLength(493);
    expect(getEncounterLookupSpecies("black", "en")).toHaveLength(649);
    expect(
      getEncounterLookupSpecies("brilliant-diamond", "en"),
    ).toHaveLength(493);
  });

  it("contains query data for every PokeFinder Encounter Lookup game", () => {
    expect(ENCOUNTER_LOOKUP_GAMES).toHaveLength(16);
    for (const { game } of ENCOUNTER_LOOKUP_GAMES) {
      const firstRow = ENCOUNTER_LOOKUP_DATA[game][0];
      expect(firstRow).toBeDefined();
      if (firstRow) {
        expect(
          findEncounterLookup(game, firstRow[0], "en").length,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("rejects a species outside the selected game's Pokédex range", () => {
    expect(findEncounterLookup("ruby", 387, "en")).toEqual([]);
    expect(findEncounterLookup("black", 0, "en")).toEqual([]);
  });
});
