import { describe, expect, it } from "vitest";
import {
  misc4Number,
  misc4Bulk,
  misc4Backdrops,
  misc4Pixel,
  misc4Image,
  misc4Frozen,
  misc4Actions,
  supportsMisc4,
  misc4Words,
  type Misc4Catalog,
} from "./misc4";
import { localizeSaveError, saveEditorResources } from "./locales";
const name = { zh: "记录", en: "Record", ja: "記録" };
const c: Misc4Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  groups: ["general", "seals", "poketch", "backdrops", "records32"].map(
    (id) => ({ id, name }),
  ),
  rows: [
    {
      key: "r32.0",
      group: "records32",
      name,
      value: 99999999,
      minimum: 0,
      maximum: 4294967295,
      width: 10,
      writable: true,
      choices: null,
      storeMaximum: 99999999,
    },
    {
      key: "app",
      group: "poketch",
      name,
      value: -128,
      minimum: -1,
      maximum: 24,
      width: 3,
      writable: true,
      choices: [
        { id: -1, name },
        { id: 0, name },
      ],
      storeMaximum: null,
    },
    {
      key: "count",
      group: "poketch",
      name,
      value: 99,
      minimum: 0,
      maximum: 25,
      width: 2,
      writable: false,
      choices: null,
      storeMaximum: null,
    },
  ],
  backdrops: Array(18).fill(18),
  backdropChoices: [],
  pixels: Array(480).fill(0),
  hallAvailable: false,
};
describe("Misc4 save tools", () => {
  it("supports all three layouts and GUI integer ranges independently of storage clamps", () => {
    for (const f of ["SAV4DP", "SAV4Pt", "SAV4HGSS"])
      expect(supportsMisc4(f)).toBe(true);
    expect(supportsMisc4("SAV4BR")).toBe(false);
    expect(misc4Number(c, "r32.0", 4294967295).values).toEqual([
      { key: "r32.0", value: 4294967295 },
    ]);
    for (const v of [-1, 4294967296, 0.5, NaN])
      expect(() => misc4Number(c, "r32.0", v)).toThrow();
    expect(misc4Number(c, "app", -1).values?.[0].value).toBe(-1);
    expect(() => misc4Number(c, "app", 1)).toThrow();
    expect(() => misc4Number(c, "count", 0)).toThrow();
  });
  it("restricts bulk commands to source operations and separates record resave from collections", () => {
    expect(misc4Bulk(c, "records32", "resave").group).toBe("records");
    expect(misc4Actions("seals")).toEqual(["all", "legal", "clear"]);
    expect(misc4Actions("bf.0.0.0")).toEqual([]);
    expect(() => misc4Bulk(c, "general", "clear")).toThrow();
    expect(() => misc4Bulk(c, "poketch", "clear")).toThrow();
    expect(misc4Backdrops(c, Array(18).fill(0)).backdrops).toHaveLength(18);
    for (const a of [[0], Array(18).fill(19), Array(18).fill(-1)])
      expect(() => misc4Backdrops(c, a)).toThrow();
  });
  it("preserves exact dot coordinates and decoded image transport limits", () => {
    for (const id of [0, 479]) expect(misc4Pixel(c, id).pixel).toBe(id);
    for (const id of [-1, 480, 1.5]) expect(() => misc4Pixel(c, id)).toThrow();
    expect(misc4Image(c, Array(1440).fill(255), 2058).imageSize).toBe(2058);
    expect(() => misc4Image(c, Array(1440).fill(256), 200)).toThrow();
    expect(() => misc4Image(c, Array(1440).fill(0), 2059)).toThrow();
    expect(() => misc4Pixel({ ...c, pixels: null }, 0)).toThrow();
  });
  it("requires a frozen target and source and localizes operation errors", () => {
    const request = {
        ...misc4Number(c, "r32.0", 0),
        targetHash: "B".repeat(64),
      },
      p = { request, changed: [], data: [], backdrops: null, pixels: null };
    expect(misc4Frozen(c, p)).toEqual(request);
    expect(() =>
      misc4Frozen(c, {
        ...p,
        request: { ...request, sourceHash: "C".repeat(64) },
      }),
    ).toThrow();
    expect(() => misc4Frozen({ ...c, canEdit: false }, p)).toThrow();
    for (const l of ["zh", "en", "ja"] as const) {
      expect(misc4Words[l].backdropNote).toBeTruthy();
      expect(misc4Words[l].imageNote).toBeTruthy();
      expect(
        localizeSaveError(
          "Invalid Misc4 numeric fields.",
          saveEditorResources[l],
        ),
      ).toBe(misc4Words[l].invalid);
      expect(
        localizeSaveError(
          "Misc4 preview target is stale.",
          saveEditorResources[l],
        ),
      ).toBe(misc4Words[l].stale);
    }
  });
});
