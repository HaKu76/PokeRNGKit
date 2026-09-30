import { describe, expect, it } from "vitest";
import {
  sortFoodCase,
  validateFoodCase,
  type FoodCaseCatalog,
  type FoodCaseEntry,
} from "./foodCases";
const entry: FoodCaseEntry = {
  index: 7,
  type: 200,
  stats: [0, 1, 2, 3, 4, 255],
  level: 60,
  new: false,
};
const catalog: FoodCaseCatalog = {
  kind: "poffins8b",
  entries: [entry],
  types: [
    { value: 255, name: { zh: "无", en: "None", ja: "なし" } },
    { value: 0, name: { zh: "辣", en: "Spicy", ja: "辛い" } },
  ],
};
describe("food cases", () => {
  it("keeps an unknown original type and accepts BDSP byte-sized levels", () => {
    expect(
      validateFoodCase(
        catalog,
        entry,
        "200",
        entry.stats.map(String),
        "255",
        true,
      ),
    ).toEqual({
      index: 7,
      type: 200,
      stats: entry.stats,
      level: 255,
      new: true,
    });
    for (const bad of ["", "-1", "256", "1.5", "1e2"])
      expect(() =>
        validateFoodCase(
          catalog,
          entry,
          "0",
          [bad, "0", "0", "0", "0", "0"],
          "60",
          false,
        ),
      ).toThrow();
    expect(() =>
      validateFoodCase(
        catalog,
        entry,
        "201",
        entry.stats.map(String),
        "60",
        false,
      ),
    ).toThrow();
    expect(() =>
      validateFoodCase(
        catalog,
        entry,
        "0",
        entry.stats.map(String),
        "256",
        false,
      ),
    ).toThrow();
    expect(() =>
      validateFoodCase(catalog, entry, "0", [], "60", false),
    ).toThrow();
    expect(() =>
      validateFoodCase(
        catalog,
        { ...entry, index: 8 },
        "0",
        entry.stats.map(String),
        "60",
        false,
      ),
    ).toThrow();
  });
  it("omits read-only level and unsupported new marker in older formats", () => {
    for (const kind of ["blocks3", "poffins4"] as const)
      expect(
        validateFoodCase(
          { ...catalog, kind },
          entry,
          "0",
          entry.stats.map(String),
          "ignored",
          true,
        ),
      ).toEqual({ index: 7, type: 0, stats: entry.stats });
  });
  it("sorts the display without changing physical addresses or the input order", () => {
    const rows = [
      entry,
      { ...entry, index: 2, level: 80 },
      { ...entry, index: 9, level: 60 },
    ];
    expect(sortFoodCase(rows, "level", true).map((e) => e.index)).toEqual([
      2, 7, 9,
    ]);
    expect(rows.map((e) => e.index)).toEqual([7, 2, 9]);
    expect(sortFoodCase(rows, "index", false).map((e) => e.index)).toEqual([
      2, 7, 9,
    ]);
  });
});
