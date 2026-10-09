import { describe, expect, it } from "vitest";
import {
  supportsUnderground4,
  ug4Stat,
  ug4Slot,
  ug4Resave,
  ug4Frozen,
  ug4Words,
  type Ug4Catalog,
} from "./underground4";
import { localizeSaveError, saveEditorResources } from "./locales";
const name = { zh: "家具", en: "Goods", ja: "グッズ" };
const c: Ug4Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  stats: Array.from({ length: 13 }, (_, id) => ({
    id,
    name,
    value: 4294967295,
  })),
  pouches: ["goods", "spheres", "traps", "treasures"].map((kind) => ({
    kind,
    name,
    slots: Array.from({ length: 40 }, (_, id) => ({
      id,
      item: 255,
      size: kind === "spheres" ? 255 : null,
    })),
    choices: [
      { id: 0, name },
      { id: 1, name },
      { id: 2, name: { zh: "", en: "", ja: "" } },
    ],
  })),
};
describe("Underground4 editor", () => {
  it("supports only Sinnoh and respects all thirteen score limits", () => {
    for (const f of ["SAV4DP", "SAV4Pt"])
      expect(supportsUnderground4(f)).toBe(true);
    expect(supportsUnderground4("SAV4HGSS")).toBe(false);
    for (let id = 0; id < 13; id++)
      for (const value of [0, 999999])
        expect(ug4Stat(c, "zh", id, value).stats).toEqual([{ id, value }]);
    for (const value of [-1, 1000000, 1.5, NaN])
      expect(() => ug4Stat(c, "en", 0, value)).toThrow();
    expect(() => ug4Stat(c, "en", 13, 0)).toThrow();
  });
  it("uses real identities, keeps unknown old values and sends signed text to Core", () => {
    for (const text of ["-1", "+9", " 9", "01", "xx", "", "255"])
      expect(
        ug4Slot(c, "en", "spheres", 39, undefined, text).slots?.[0].sizeText,
      ).toBe(text);
    expect(ug4Slot(c, "en", "goods", 0, 0, undefined).slots?.[0]).toEqual({
      id: 0,
      item: 0,
    });
    expect(() => ug4Slot(c, "en", "goods", 0, 2, undefined)).toThrow();
    expect(() => ug4Slot(c, "en", "goods", 0, 0, "1")).toThrow();
    expect(() => ug4Slot(c, "en", "spheres", 0, 0, "100")).toThrow();
    expect(() => ug4Slot(c, "en", "spheres", 40, 0, "1")).toThrow();
    expect(() =>
      ug4Slot(c, "en", "spheres", 0, undefined, undefined),
    ).toThrow();
  });
  it("separates pouch resave from all-score normalization and requires frozen source/target", () => {
    expect(ug4Resave(c, "ja", "goods")).toMatchObject({
      action: "resavePouch",
      kind: "goods",
      language: "ja",
    });
    expect(ug4Resave(c, "zh")).toMatchObject({
      action: "resave",
      language: "zh",
    });
    expect(() => ug4Resave(c, "en", "unknown")).toThrow();
    const request = { ...ug4Resave(c, "en"), targetHash: "B".repeat(64) },
      preview = {
        request,
        stats: c.stats,
        pouches: c.pouches,
        changed: [],
        beforeHex: "",
        afterHex: "",
      };
    expect(ug4Frozen(c, preview)).toEqual(request);
    expect(() => ug4Frozen({ ...c, canEdit: false }, preview)).toThrow();
    expect(() =>
      ug4Frozen(c, {
        ...preview,
        request: { ...request, sourceHash: "C".repeat(64) },
      }),
    ).toThrow();
    expect(() =>
      ug4Frozen(c, { ...preview, request: { ...request, targetHash: "bad" } }),
    ).toThrow();
  });
  it("localizes resave, byte conversion and operation errors", () => {
    for (const l of ["zh", "en", "ja"] as const) {
      expect(ug4Words[l].sizeNote).toContain("255");
      expect(ug4Words[l].resaveNote).toBeTruthy();
      expect(
        localizeSaveError(
          "Invalid Underground4 item or sphere size.",
          saveEditorResources[l],
        ),
      ).toBe(ug4Words[l].invalid);
      expect(
        localizeSaveError(
          "Underground4 preview target is stale.",
          saveEditorResources[l],
        ),
      ).toBe(ug4Words[l].stale);
    }
  });
});
