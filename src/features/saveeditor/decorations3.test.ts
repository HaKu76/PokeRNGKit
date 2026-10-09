import { describe, it, expect } from "vitest";
import {
  decoration3Edit,
  packDecorations3,
  supportsDecorations3,
  decorations3Words,
  type Decoration3Catalog,
} from "./decorations3";
const name = { zh: "小桌子", en: "Small Desk", ja: "小さな机" };
const c: Decoration3Catalog = {
  canEdit: true,
  categories: [
    {
      id: 0,
      name,
      slots: [0, 1, 255, 0],
      choices: [
        { id: 0, name },
        { id: 1, name },
      ],
    },
  ],
};
describe("Gen3 decoration editing", () => {
  it("packs empty slots stably while retaining duplicates and original abnormal IDs", () => {
    expect(packDecorations3([0, 1, 255, 0, 1])).toEqual([1, 255, 1, 0, 0]);
    expect(decoration3Edit(c, 0, [1, 1, 255, 0])).toEqual({
      category: 0,
      slots: [1, 1, 255, 0],
    });
    expect(decoration3Edit(c, 0, [0, 0, 0, 0]).slots).toEqual([0, 0, 0, 0]);
  });
  it("rejects out-of-category replacements, moved unknown IDs and bad lengths", () => {
    for (const slots of [
      [0, 2, 255, 0],
      [255, 1, 255, 0],
      [0, 1, 256, 0],
      [0, 1, -1, 0],
      [0, 1, 1.5, 0],
      [],
    ])
      expect(() => decoration3Edit(c, 0, slots)).toThrow();
    expect(() =>
      decoration3Edit({ ...c, canEdit: false }, 0, c.categories[0].slots),
    ).toThrow();
    expect(() => decoration3Edit(c, 8, [])).toThrow();
  });
  it("copies requests so later UI edits cannot change queued values", () => {
    const slots = [0, 1, 255, 0],
      edit = decoration3Edit(c, 0, slots);
    slots[0] = 1;
    expect(edit.slots[0]).toBe(0);
  });
  it("limits formats and provides three-language operation labels", () => {
    for (const f of ["SAV3RS", "SAV3E"])
      expect(supportsDecorations3(f)).toBe(true);
    for (const f of ["SAV3FRLG", "SAV6XY"])
      expect(supportsDecorations3(f)).toBe(false);
    for (const w of Object.values(decorations3Words))
      expect(w.organize.length).toBeGreaterThan(0);
  });
});
