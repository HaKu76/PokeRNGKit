import { describe, expect, it } from "vitest";
import {
  supportsZygarde7,
  z7Patch,
  z7Action,
  z7Frozen,
  type Zygarde7Catalog,
} from "./zygarde7";
import { zygarde7Words } from "./zygarde7Words";
import { localizeSaveError, saveEditorResources } from "./locales";
function catalog(stickers = false): Zygarde7Catalog {
  return {
    canEdit: true,
    sourceHash: "A".repeat(64),
    stickers,
    total: 65534,
    collected: 10,
    entries: [0, 1, 2].map((state, index) => ({
      index,
      state,
      location: { zh: "位置", en: "Location", ja: "場所" },
    })),
  };
}
describe("Gen7 source collectible workflows", () => {
  it("labels the source Stored counter separately from lifetime collection", () => {
    expect(zygarde7Words.en.total).toBe("Stored");
    expect(zygarde7Words.zh.total).toBe("储存数量");
    expect(zygarde7Words.ja.total).toBe("キューブ内");
    expect(zygarde7Words.zh.note).toContain("增加储存数量");
  });
  it("routes the real SM and USUM formats without treating other saves as collectible grids", () => {
    for (const format of ["SAV7SM", "SAV7USUM"])
      expect(supportsZygarde7(format)).toBe(true);
    for (const format of ["SAV7b", "SAV6AO", "SAV7", "SAV6AODemo"])
      expect(supportsZygarde7(format)).toBe(false);
  });
  it("preserves independent counters and allows both UInt16 boundaries without inferred counts", () => {
    const c = catalog();
    for (const value of [0, 1, 95, 100, 65535])
      expect(z7Patch(c, undefined, value, value)).toMatchObject({
        total: value,
        collected: value,
      });
    expect(z7Patch(c, [{ index: 1, state: 2 }])).toMatchObject({
      entries: [{ index: 1, state: 2 }],
      total: undefined,
      collected: undefined,
    });
    for (const value of [-1, 65536, NaN, Infinity, 1.5])
      expect(() => z7Patch(c, undefined, value)).toThrow();
  });
  it("rejects duplicate/invalid states atomically while preserving or explicitly repairing an unknown old state", () => {
    const c = catalog();
    c.entries[1].state = 65535;
    expect(z7Patch(c, undefined, 0).entries).toBeUndefined();
    expect(z7Patch(c, [{ index: 1, state: 2 }]).entries).toEqual([
      { index: 1, state: 2 },
    ]);
    for (const rows of [
      [],
      [{ index: -1, state: 0 }],
      [{ index: 3, state: 0 }],
      [{ index: 0, state: 3 }],
      [{ index: 0, state: 1.5 }],
      [
        { index: 0, state: 0 },
        { index: 0, state: 1 },
      ],
    ])
      expect(() => z7Patch(c, rows)).toThrow();
    expect(() => z7Action(c, "giveAll")).toThrow();
    expect(() => z7Action(c, "resave")).toThrow();
    expect(c.entries[1].state).toBe(65535);
  });
  it("uses newly received entries for source overflow checks and the USUM independent total", () => {
    const sm = catalog(),
      uu = catalog(true);
    expect(() => z7Action(sm, "giveAll")).toThrow("overflow");
    expect(z7Action(uu, "giveAll").action).toBe("giveAll");
    uu.collected = 65535;
    expect(() => z7Action(uu, "giveAll")).toThrow("overflow");
    uu.entries.forEach((v) => (v.state = 2));
    expect(z7Action(uu, "giveAll").action).toBe("giveAll");
    expect(z7Action(sm, "resave").action).toBe("resave");
  });
  it("freezes the exact backend request and rejects old-source/target or read-only previews", () => {
    const c = catalog();
    const request = {
      ...z7Patch(c, [{ index: 0, state: 2 }]),
      targetHash: "B".repeat(64),
    };
    const p = {
      request,
      result: { ...c, sourceHash: request.targetHash },
      changedOffsets: [198],
    };
    expect(z7Frozen(c, p)).toBe(request);
    expect(() => z7Frozen(c, { ...p, result: c })).toThrow();
    expect(() =>
      z7Frozen(c, {
        ...p,
        request: { ...request, sourceHash: "C".repeat(64) },
      }),
    ).toThrow();
    expect(() => z7Frozen({ ...c, canEdit: false }, p)).toThrow();
  });
  it("localizes both game-specific names, states and all backend errors without relying on resource identity", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      const w = zygarde7Words[lang];
      expect(w.cells).not.toBe(w.stickers);
      expect(w.states).toHaveLength(3);
      expect(
        localizeSaveError("Zygarde7: Collectibles7 counter overflow.", {
          ...saveEditorResources[lang],
        }),
      ).toBe(w.invalid);
      expect(
        localizeSaveError(
          "Collectibles7 preview target is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(w.stale);
    }
  });
});
