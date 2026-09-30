import { describe, expect, it } from "vitest";
import {
  roamerDraft,
  validateRoamer,
  supportsRoamer,
  type RoamerCatalog,
} from "./roamer";
const c: RoamerCatalog = {
  species: 0,
  state: 15,
  encounters: 4294967295,
  suggestedSpecies: 144,
};
describe("XY roamer", () => {
  it("preserves unset species and unusual original values", () => {
    expect(validateRoamer(c, roamerDraft(c))).toEqual({
      species: 0,
      state: 15,
      encounters: 4294967295,
    });
  });
  it("accepts the complete species/state/count ranges", () => {
    for (const species of [144, 145, 146])
      for (let state = 0; state < 5; state++)
        for (let encounters = 0; encounters <= 11; encounters++)
          expect(
            validateRoamer(c, {
              species,
              state,
              encounters: String(encounters),
            }),
          ).toEqual({ species, state, encounters });
  });
  it("rejects malformed and newly out-of-range fields", () => {
    for (const encounters of [
      "",
      "-1",
      "1.5",
      "12",
      "4294967296",
      "1e1",
      " 1",
      "00000000001",
    ])
      expect(() =>
        validateRoamer(c, { ...roamerDraft(c), encounters }),
      ).toThrow();
    for (const species of [-1, 1, 143, 147, NaN])
      expect(() => validateRoamer(c, { ...roamerDraft(c), species })).toThrow();
    for (const state of [-1, 5, 14, 16, NaN])
      expect(() => validateRoamer(c, { ...roamerDraft(c), state })).toThrow();
    expect(supportsRoamer("SAV6XY")).toBe(true);
    expect(supportsRoamer("SAV6AO")).toBe(false);
  });
});
