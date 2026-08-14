import { describe, expect, it } from "vitest";
import {
  getGen5WildAreas,
  getGen5WildSpeciesLevelRange,
  getGen5WildSpeciesSlots,
  getGen5WildUniqueSpecies,
} from "./encounters";

describe("Gen 5 Wild encounters", () => {
  it("parses fixed Black grass encounter records", () => {
    const area = getGen5WildAreas("black", "grass", 0).find(
      (entry) => entry.location === 41,
    );
    expect(area).toBeDefined();
    expect(area).toMatchObject({ rate: 3, seasonal: false });
    expect(area?.slots).toHaveLength(12);
    expect(area?.slots[2]).toMatchObject({
      species: 595,
      form: 0,
      minLevel: 25,
      maxLevel: 25,
    });
  });

  it("selects seasonal data and exposes species-derived filters", () => {
    const areas = getGen5WildAreas("white2", "surfing", 3);
    const area = areas.find((entry) => entry.seasonal);
    expect(area).toBeDefined();
    expect(area?.slots).toHaveLength(5);
    const first = area!.slots[0];
    expect(getGen5WildUniqueSpecies(area!)).toContainEqual({
      species: first.species,
      form: first.form,
    });
    expect(
      getGen5WildSpeciesSlots(area!, first.species, first.form),
    ).toBeGreaterThan(0);
    expect(
      getGen5WildSpeciesLevelRange(area!, first.species, first.form),
    ).toMatchObject({
      minimum: expect.any(Number),
      maximum: expect.any(Number),
    });
  });
});
