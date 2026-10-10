import { describe, it, expect } from "vitest";
import {
  supportsSuperTrain6,
  st6Record,
  st6Bags,
  st6BagChoices,
  st6Resave,
  st6Frozen,
  type St6Catalog,
  type St6Preview,
} from "./superTrain6";
import { st6Words } from "./superTrain6Words";
import { localizeSaveError, saveEditorResources } from "./locales";
const name = { zh: "训练", en: "Training", ja: "トレーニング" };
function catalog(): St6Catalog {
  return {
    canEdit: true,
    sourceHash: "A".repeat(64),
    stages: Array.from({ length: 32 }, (_, index) => ({
      index,
      name,
      holders: [0, 1].map((lane) => ({
        lane,
        species: 25,
        form: 255,
        gender: 255,
        name,
        sprite: "b_25",
        time: "NaN",
        timeBits: "7FA6A6A6",
        rawHex: "A6".repeat(4),
      })),
    })),
    bags: Array.from({ length: 12 }, (_, index) => ({
      index,
      id: 1,
      name,
      sourceReadable: true,
    })),
    bagChoices: [
      { id: 0, name: { zh: "---", en: "---", ja: "---" } },
      { id: 1, name },
      { id: 2, name: { zh: "", en: "Bag", ja: "バッグ" } },
    ],
    species: [
      { id: 0, name },
      { id: 25, name },
    ],
    numberSymbols: {
      naN: { zh: "NaN", en: "NaN", ja: "NaN" },
      positiveInfinity: { zh: "∞", en: "∞", ja: "∞" },
      negativeInfinity: { zh: "-∞", en: "-∞", ja: "-∞" },
    },
    rawHex: "A6".repeat(0x318),
  };
}
describe("Gen VI Super Training", () => {
  it("routes exact XY and ORAS formats", () => {
    expect(["SAV6XY", "SAV6AO"].every(supportsSuperTrain6)).toBe(true);
    expect(["SAV6AODemo", "SAV5B2W2", "SAV7SM"].some(supportsSuperTrain6)).toBe(
      false,
    );
  });
  it("addresses all source stages and both record groups while hiding unused records", () => {
    const c = catalog();
    for (const stage of [0, 31])
      for (const lane of [0, 1])
        expect(st6Record(c, "zh", stage, lane, { species: 25 }).stage).toBe(
          stage,
        );
    expect(() => st6Record(c, "en", 32, 0, { time: "1" })).toThrow();
    expect(() => st6Record(c, "en", 0, 2, { time: "1" })).toThrow();
  });
  it("forwards text unchanged to native TryParse instead of replacing blank or invalid values", () => {
    const c = catalog();
    for (const value of [
      "",
      "bad",
      "255",
      "256",
      "-1",
      "+255",
      " 255 ",
      "NaN",
      "Infinity",
      "1e39",
      "-0",
      "1,234.5",
    ]) {
      const e = st6Record(c, "ja", 0, 0, {
        form: value,
        gender: value,
        time: value,
      });
      expect(e.form).toBe(value);
      expect(e.gender).toBe(value);
      expect(e.time).toBe(value);
    }
    expect(() =>
      st6Record(c, "en", 0, 0, { time: "x".repeat(32768) }),
    ).toThrow();
  });
  it("rejects empty, foreign or invalid species fields and stale catalogs", () => {
    const c = catalog();
    expect(() => st6Record(c, "en", 0, 0, {})).toThrow();
    expect(() => st6Record(c, "en", 0, 0, { species: undefined })).toThrow();
    expect(() => st6Record(c, "en", 0, 0, { species: 65535 })).toThrow();
    expect(() =>
      st6Record({ ...c, canEdit: false }, "en", 0, 0, { time: "1" }),
    ).toThrow();
    expect(() =>
      st6Record({ ...c, sourceHash: "short" }, "en", 0, 0, { time: "1" }),
    ).toThrow();
  });
  it("filters source bag choices by active-language nonempty names", () => {
    const c = catalog();
    expect(st6BagChoices(c, "zh").map((b) => b.id)).toEqual([0, 1]);
    expect(st6BagChoices(c, "en").map((b) => b.id)).toEqual([0, 1, 2]);
    expect(() => st6Bags(c, "zh", [{ index: 0, id: 2 }])).toThrow();
  });
  it("sends bag selections for native packing without clearing or rearranging client data", () => {
    const c = catalog(),
      before = structuredClone(c.bags),
      changes = Array.from({ length: 12 }, (_, index) => ({ index, id: 0 }));
    expect(st6Bags(c, "en", changes).bags).toBe(changes);
    expect(c.bags).toEqual(before);
    expect(st6Bags(c, "en", [{ index: 11, id: 2 }]).bags?.[0].index).toBe(11);
  });
  it("rejects duplicate, out-of-range or empty bag plans", () => {
    const c = catalog();
    for (const b of [
      [],
      [
        { index: 0, id: 1 },
        { index: 0, id: 0 },
      ],
      [{ index: 12, id: 1 }],
      [{ index: 0, id: 255 }],
      [{ index: 0.5, id: 1 }],
    ])
      expect(() => st6Bags(c, "en", b)).toThrow();
  });
  it("allows read-safe bag repair while source resave rejects unreadable old values", () => {
    const c = catalog();
    c.bags[11] = { ...c.bags[11], id: 255, sourceReadable: false };
    expect(() => st6Resave(c, "en")).toThrow();
    expect(st6Bags(c, "en", [{ index: 11, id: 0 }]).action).toBe("bags");
    expect(st6Record(c, "en", 0, 0, { time: "1" }).action).toBe("record");
  });
  it("freezes parsing language and complete source/target hashes for confirmation", () => {
    const c = catalog(),
      p: St6Preview = {
        request: {
          action: "resave",
          sourceHash: c.sourceHash,
          uiLanguage: "ja",
          targetHash: "B".repeat(64),
        },
        result: { ...c, sourceHash: "B".repeat(64) },
        changedOffsets: [1, 99999],
        ignoredFields: ["Time"],
      };
    expect(st6Frozen(c, p)).toBe(p.request);
    expect(st6Frozen(c, p).uiLanguage).toBe("ja");
    expect(() =>
      st6Frozen(c, {
        ...p,
        result: { ...p.result, sourceHash: "C".repeat(64) },
      }),
    ).toThrow();
    expect(() =>
      st6Frozen(c, { ...p, request: { ...p.request, targetHash: "short" } }),
    ).toThrow();
  });
  it("localizes operation, ignored-input and new error labels in all three languages", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      const w = st6Words[lang];
      expect(w.ignored).toBeTruthy();
      expect(w.bagNote).toBeTruthy();
      expect(
        localizeSaveError(
          "SuperTrain6 invalid time import.",
          saveEditorResources[lang],
        ),
      ).toBe(w.invalid);
      expect(
        localizeSaveError(
          "SuperTrain6 preview target is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(w.stale);
    }
  });
});
