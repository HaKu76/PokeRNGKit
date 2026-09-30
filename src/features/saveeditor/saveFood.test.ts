import { describe, expect, it } from "vitest";
import {
  validateFood,
  supportsFood,
  validatePokeBlocks,
  type SaveFoodCatalog,
} from "./saveFood";
const puffs: SaveFoodCatalog = {
  kind: "puffs",
  values: [255, 1, 26],
  count: -1,
  names: [],
};
const beans: SaveFoodCatalog = {
  kind: "beans",
  values: [0, 255],
  count: null,
  names: [],
};
describe("food editing", () => {
  it("keeps original UInt32 block counts and rejects new out-of-range values", () => {
    const blocks = {
      values: [4294967295, ...Array<number>(11).fill(0)],
      names: [],
      occupiedPlots: 30,
      plotCount: 90,
    };
    const values = blocks.values.map(String);
    expect(validatePokeBlocks(blocks, values).blockValues?.[0]).toBe(
      4294967295,
    );
    for (const value of ["", "-1", "1.5", "1000", "4294967295", " 0", "1e2"])
      expect(() =>
        validatePokeBlocks(
          blocks,
          values.map((v, i) => (i === 1 ? value : v)),
        ),
      ).toThrow();
    expect(
      validatePokeBlocks(blocks, Array<string>(12).fill("999")).blockValues,
    ).toEqual(Array<number>(12).fill(999));
    expect(() => validatePokeBlocks(blocks, [])).toThrow();
  });
  it("preserves untouched abnormal puffs and rejects new ones", () => {
    expect(validateFood(puffs, ["255", "2", "26"], "-1")).toEqual({
      action: "edit",
      values: [255, 2, 26],
      count: -1,
    });
    expect(() => validateFood(puffs, ["255", "255", "26"], "5")).toThrow();
    expect(() => validateFood(puffs, ["255", "2", "26"], "101")).toThrow();
    expect(() => validateFood(puffs, ["255", "2", "26"], "-2")).toThrow();
    expect(validateFood(puffs, ["0", "1", "26"], "100").count).toBe(100);
  });
  it("validates integer bean counts without adding a puff count", () => {
    expect(validateFood(beans, ["255", "0"], "0")).toEqual({
      action: "edit",
      values: [255, 0],
    });
    for (const value of ["", "-1", "256", "1.5", " 1", "1e2", "NaN"])
      expect(() => validateFood(beans, [value, "0"], "0")).toThrow();
    expect(() => validateFood(beans, ["0"], "0")).toThrow();
  });
  it("only exposes games with the corresponding Core blocks", () => {
    for (const format of [
      "SAV3RS",
      "SAV3E",
      "SAV4DP",
      "SAV4Pt",
      "SAV8BS",
      "SAV6XY",
      "SAV6AO",
      "SAV7SM",
      "SAV7USUM",
    ])
      expect(supportsFood(format)).toBe(true);
    for (const format of ["SAV6AODemo", "SAV7b", "SAV4HGSS", "SAV3FRLG"])
      expect(supportsFood(format)).toBe(false);
  });
});
