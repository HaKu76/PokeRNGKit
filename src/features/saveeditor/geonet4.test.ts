import { describe, expect, it } from "vitest";
import {
  geonet4Point,
  geonet4Global,
  geonet4Batch,
  geonet4Words,
  supportsGeonet4,
  type Geo4Catalog,
} from "./geonet4";
import { localizeSaveError, saveEditorResources } from "./locales";
const names = { zh: "地区", en: "Region", ja: "地域" };
const c: Geo4Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  country: 103,
  region: 1,
  ownValid: true,
  global: true,
  rawGlobal: 130,
  rows: [
    {
      id: 0,
      country: 1,
      region: 0,
      legal: true,
      owned: false,
      point: 1,
      countryName: names,
      regionName: names,
    },
    {
      id: 6529,
      country: 103,
      region: 1,
      legal: true,
      owned: true,
      point: 0,
      countryName: names,
      regionName: names,
    },
  ],
  plans: [
    {
      action: "all",
      counts: [0, 0, 1, 1],
      changed: [0, 6529],
      global: true,
      targetHex: "A".repeat(7462),
    },
  ],
};
describe("Geonet4 map tools", () => {
  it("supports all three Gen4 save layouts", () => {
    for (const f of ["SAV4DP", "SAV4Pt", "SAV4HGSS"])
      expect(supportsGeonet4(f)).toBe(true);
    expect(supportsGeonet4("SAV4BR")).toBe(false);
  });
  it("uses physical point identities and four exact color values", () => {
    for (let p = 0; p < 4; p++)
      expect(geonet4Point(c, 6529, p)).toMatchObject({
        action: "points",
        points: [{ id: 6529, point: p }],
      });
    for (const p of [-1, 4, 1.5]) expect(() => geonet4Point(c, 0, p)).toThrow();
    expect(() => geonet4Point(c, 1, 0)).toThrow();
    expect(geonet4Global(c, false)).toMatchObject({
      action: "global",
      global: false,
    });
  });
  it("requires editable registered coordinates and complete native previews", () => {
    expect(geonet4Batch(c, "all")).toEqual({
      action: "all",
      sourceHash: c.sourceHash,
    });
    expect(() => geonet4Batch(c, "clear")).toThrow();
    expect(() =>
      geonet4Batch(
        { ...c, plans: [{ ...c.plans[0], targetHex: "A".repeat(7461) }] },
        "all",
      ),
    ).toThrow();
    expect(() => geonet4Point({ ...c, ownValid: false }, 0, 0)).toThrow();
    expect(() => geonet4Global({ ...c, canEdit: false }, true)).toThrow();
    expect(() => geonet4Global({ ...c, sourceHash: "bad" }, true)).toThrow();
  });
  it("localizes point meanings, preservation rules and stale errors", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(geonet4Words[lang].points).toHaveLength(4);
      expect(geonet4Words[lang].batchNote).toBeTruthy();
      expect(
        localizeSaveError(
          "Invalid Geonet4 point fields.",
          saveEditorResources[lang],
        ),
      ).toBe(geonet4Words[lang].invalid);
      expect(
        localizeSaveError(
          "Geonet4 preview is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(geonet4Words[lang].stale);
    }
  });
});
