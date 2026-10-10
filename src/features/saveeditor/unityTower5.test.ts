import { describe, it, expect } from "vitest";
import {
  tower5Action,
  tower5Frozen,
  tower5Patch,
  tower5Words,
  supportsUnityTower5,
  type Tower5Catalog,
  type Tower5Preview,
} from "./unityTower5";
import { localizeSaveError, saveEditorResources } from "./locales";
const hash = "A".repeat(64),
  target = "B".repeat(64),
  name = { zh: "国家", en: "Country", ja: "国" };
const c: Tower5Catalog = {
  canEdit: true,
  sourceHash: hash,
  country: 105,
  region: 50,
  ownSafe: true,
  ownListed: true,
  global: true,
  rawGlobal: 9,
  unlocked: true,
  rawUnlocked: 255,
  points: [
    {
      id: 0,
      country: 1,
      region: 0,
      point: 1,
      owned: false,
      countryName: name,
      regionName: name,
    },
    {
      id: (105 - 1) * 64 + 50,
      country: 105,
      region: 50,
      point: 1,
      owned: true,
      countryName: name,
      regionName: name,
    },
  ],
  floors: [
    { country: 1, name, legal: false, unlocked: false },
    { country: 105, name, legal: true, unlocked: true },
  ],
  rawHex: "A5",
};
describe("UnityTower5 frozen editor contract", () => {
  it("gates formats and uses exact source point labels in three languages", () => {
    expect(supportsUnityTower5("SAV5BW")).toBe(true);
    expect(supportsUnityTower5("SAV5B2W2")).toBe(true);
    expect(supportsUnityTower5("SAV4DP")).toBe(false);
    expect(tower5Words.zh.pointNames).toEqual(["无", "蓝", "黄", "红"]);
    expect(tower5Words.ja.pointNames[0]).toBe("ない");
  });
  it("uses actual IDs and validates all point encodings", () => {
    for (const point of [0, 1, 2, 3])
      expect(
        tower5Patch(c, { points: [{ id: c.points[1].id, point }] }).points?.[0]
          .id,
      ).toBe(c.points[1].id);
    for (const point of [-1, 4, 0.5])
      expect(() => tower5Patch(c, { points: [{ id: 0, point }] })).toThrow();
    expect(() => tower5Patch(c, { points: [{ id: 1, point: 0 }] })).toThrow();
  });
  it("preserves unspecified raw flags and accepts explicit false edits", () => {
    expect(tower5Patch(c, { global: false })).toEqual({
      action: "patch",
      sourceHash: hash,
      global: false,
    });
    expect(
      tower5Patch(c, { floors: [{ country: 105, unlocked: false }] })
        .floors?.[0].unlocked,
    ).toBe(false);
    expect(c.rawGlobal).toBe(9);
    expect(c.rawUnlocked).toBe(255);
  });
  it("rejects empty and duplicated patches", () => {
    for (const parts of [
      {},
      { points: [] },
      { floors: [] },
      {
        points: [
          { id: 0, point: 0 },
          { id: 0, point: 1 },
        ],
      },
      {
        floors: [
          { country: 1, unlocked: true },
          { country: 1, unlocked: false },
        ],
      },
      { floors: [{ country: 0, unlocked: true }] },
    ])
      expect(() => tower5Patch(c, parts)).toThrow();
  });
  it("permits safe unlisted own locations and blocks unsafe or stale edits", () => {
    expect(
      tower5Action(
        { ...c, ownListed: false, country: 255, region: 63 },
        "clear",
      ).action,
    ).toBe("clear");
    for (const bad of [
      { ...c, ownSafe: false },
      { ...c, canEdit: false },
      { ...c, sourceHash: "bad" },
    ])
      expect(() => tower5Action(bad, "all")).toThrow();
  });
  it("requires full source/target hashes for preview confirmation", () => {
    const p: Tower5Preview = {
      request: { action: "resave", sourceHash: hash, targetHash: target },
      result: { ...c, sourceHash: target },
      changedOffsets: [1],
    };
    expect(tower5Frozen(c, p)).toBe(p.request);
    expect(() => tower5Frozen(c, { ...p, result: c })).toThrow();
    expect(() =>
      tower5Frozen(c, { ...p, result: { ...p.result, ownSafe: false } }),
    ).toThrow();
    expect(() =>
      tower5Frozen(c, { ...p, request: { ...p.request, targetHash: "bad" } }),
    ).toThrow();
  });
  it("localizes field rejection and stale targets in every UI language", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(
        localizeSaveError(
          "UnityTower5: Invalid floor.",
          saveEditorResources[lang],
        ),
      ).toBe(tower5Words[lang].invalid);
      expect(
        localizeSaveError(
          "UnityTower5 preview target is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(tower5Words[lang].stale);
    }
  });
});
