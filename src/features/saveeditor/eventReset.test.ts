import { describe, it, expect } from "vitest";
import {
  validateEventReset,
  supportsEventReset,
  eventResetWords,
  type EventResetCatalog,
} from "./eventReset";
const catalog: EventResetCatalog = {
  canEdit: true,
  entries: [
    { id: "FlagEevee", name: "伊布", hidden: true },
    { id: "FlagMewtwo", name: "超梦", hidden: true },
    { id: "FlagZapdos", name: "闪电鸟", hidden: false },
  ],
};
describe("Gen1 event reset selection", () => {
  it("keeps stable IDs and independent selection copies", () => {
    const ids = ["FlagMewtwo", "FlagEevee"];
    const edit = validateEventReset(catalog, ids);
    expect(edit.ids).toEqual(ids);
    expect(edit.ids).not.toBe(ids);
    expect(catalog.entries.every((e) => typeof e.hidden === "boolean")).toBe(
      true,
    );
  });
  it("rejects empty, unknown, duplicate, stale and read-only selections", () => {
    for (const ids of [
      [],
      ["FlagZapdos"],
      ["unknown"],
      ["FlagEevee", "FlagEevee"],
      ["FlagEevee", "unknown"],
      ["flagEevee"],
      Array(22).fill("FlagEevee"),
    ])
      expect(() => validateEventReset(catalog, ids)).toThrow();
    expect(() =>
      validateEventReset({ ...catalog, canEdit: false }, ["FlagEevee"]),
    ).toThrow();
  });
  it("limits availability and supplies complete UI language keys", () => {
    expect(supportsEventReset("SAV1")).toBe(true);
    for (const f of ["SAV2", "SAV7b", "SAV8BS", ""])
      expect(supportsEventReset(f)).toBe(false);
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(Object.keys(eventResetWords[lang])).toEqual(
        Object.keys(eventResetWords.zh),
      );
      expect(Object.values(eventResetWords[lang]).every(Boolean)).toBe(true);
    }
  });
});
