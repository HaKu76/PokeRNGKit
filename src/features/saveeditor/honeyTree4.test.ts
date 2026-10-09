import { describe, expect, it } from "vitest";
import {
  honey4Edit,
  honey4Limits,
  honey4Trees,
  honey4Words,
  supportsHoneyTree4,
  type Honey4Catalog,
} from "./honeyTree4";
import { localizeSaveError, saveEditorResources } from "./locales";
const c: Honey4Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  munchlaxTrees: [10, 6, 9, 10],
  trees: Array.from({ length: 21 }, (_, id) => ({
    id,
    time: 0,
    shake: 0,
    group: 0,
    slot: 0,
    subTable: 255,
    rare: id === 10,
    species: 0,
    alternate: null,
    rawHex: "0".repeat(16),
    saveValues: [0, 0, 0, 0],
    saveHex: "0".repeat(16),
  })),
  choices: [],
};
describe("Honey Tree editor", () => {
  it("supports exactly the two Sinnoh layouts and all 21 tree identities", () => {
    expect(supportsHoneyTree4("SAV4DP")).toBe(true);
    expect(supportsHoneyTree4("SAV4Pt")).toBe(true);
    expect(supportsHoneyTree4("SAV4HGSS")).toBe(false);
    for (let id = 0; id < 21; id++)
      expect(honey4Edit(c, id, "catchable")).toEqual({
        action: "catchable",
        sourceHash: c.sourceHash,
        id,
      });
    for (const id of [-1, 21, 1.5])
      expect(() => honey4Edit(c, id, "save")).toThrow();
  });
  it("validates real window bounds and retains explicit zero-only partial patches", () => {
    for (const [field, max] of Object.entries(honey4Limits)) {
      expect(honey4Edit(c, 20, "patch", { [field]: 0 })).toMatchObject({
        [field]: 0,
      });
      expect(honey4Edit(c, 0, "patch", { [field]: max })).toMatchObject({
        [field]: max,
      });
      for (const value of [-1, max + 1, 0.5, NaN])
        expect(() => honey4Edit(c, 0, "patch", { [field]: value })).toThrow();
    }
    expect(() => honey4Edit(c, 0, "patch")).toThrow();
    expect(() => honey4Edit(c, 0, "save", { time: 0 })).toThrow();
    expect(() =>
      honey4Edit({ ...c, canEdit: false }, 0, "catchable"),
    ).toThrow();
    expect(() => honey4Edit({ ...c, sourceHash: "bad" }, 0, "save")).toThrow();
  });
  it("preserves rare-tree order and provides all three languages and localized errors", () => {
    expect(c.munchlaxTrees).toEqual([10, 6, 9, 10]);
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(honey4Trees[lang]).toHaveLength(21);
      expect(honey4Trees[lang].every(Boolean)).toBe(true);
      expect(honey4Words[lang].warning).toBeTruthy();
      expect(
        localizeSaveError(
          "Invalid HoneyTree4 fields.",
          saveEditorResources[lang],
        ),
      ).toBe(honey4Words[lang].invalid);
      expect(
        localizeSaveError(
          "HoneyTree4 preview is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(honey4Words[lang].stale);
    }
  });
});
