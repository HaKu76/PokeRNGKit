import { describe, expect, it } from "vitest";
import {
  GEN5_HIDDEN_GROTTO_AREAS,
  getGen5HiddenGrottoAllowedGenders,
  getGen5HiddenGrottoMatchMasks,
  getGen5HiddenGrottoUniqueItems,
  getGen5HiddenGrottoUniqueSpecies,
} from "./encounters";

describe("Gen 5 Hidden Grotto encounters", () => {
  it("contains the 20 upstream BW2 locations and fixed area shapes", () => {
    expect(GEN5_HIDDEN_GROTTO_AREAS.map((area) => area.location)).toEqual([
      45, 106, 126, 107, 135, 111, 121, 136, 118, 34, 130, 131, 123, 137, 9, 8,
      101, 138, 100, 127,
    ]);
    expect(
      GEN5_HIDDEN_GROTTO_AREAS.every(
        (area) =>
          area.pokemon.length === 12 &&
          area.items.length === 16 &&
          area.hiddenItems.length === 16,
      ),
    ).toBe(true);
  });

  it("keeps the first upstream area and fixed-gender slots", () => {
    const first = GEN5_HIDDEN_GROTTO_AREAS[0];
    expect(first.pokemon.map((slot) => slot.species)).toEqual([
      206, 507, 183, 206, 507, 183, 206, 507, 183, 206, 507, 183,
    ]);
    expect(first.pokemon[0]).toMatchObject({
      genderThreshold: 30,
      minLevel: 10,
      maxLevel: 15,
    });

    const ditto = GEN5_HIDDEN_GROTTO_AREAS.find((area) => area.location === 34)!
      .pokemon[0];
    expect(getGen5HiddenGrottoAllowedGenders(ditto)).toEqual([2]);
  });

  it("derives unique quick filters and their union masks", () => {
    const area = GEN5_HIDDEN_GROTTO_AREAS[0];
    expect(getGen5HiddenGrottoUniqueSpecies(area)).toEqual([206, 507, 183]);
    expect(getGen5HiddenGrottoUniqueItems(area)).toContain(82);

    const speciesOnly = getGen5HiddenGrottoMatchMasks(area, 183, null);
    expect(speciesOnly.groupMask).toBe(0xf);
    expect(speciesOnly.slotMask).toBe(1 << 2);

    const combined = getGen5HiddenGrottoMatchMasks(area, 183, 82);
    expect(combined.groupMask).toBe(0xf);
    expect(combined.slotMask).toBe((1 << 2) | (1 << 3));
  });
});
