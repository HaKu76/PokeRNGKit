import { describe, expect, it } from "vitest";
import { medals5Labels } from "./medals5Labels";
import { medals5Words } from "./medals5Words";
import { localizeSaveError, saveEditorResources } from "./locales";
import {
  medals5Action,
  medals5Date,
  medals5Frozen,
  medals5Import,
  medals5Patch,
  supportsMedals5,
  type Medals5Catalog,
  type Medals5Preview,
} from "./medals5";
const hash = "A".repeat(64),
  target = "B".repeat(64);
const c: Medals5Catalog = {
  canEdit: true,
  sourceHash: hash,
  rawHex: "A5",
  medals: Array.from({ length: 255 }, (_, index) => ({
    index,
    name: { zh: "奖牌", en: "Medal", ja: "メダル" },
    type: { zh: "类型", en: "Type", ja: "種類" },
    state: index === 0 ? 7 : 3,
    unread: true,
    canHaveDate: index !== 0,
    hasDate: index !== 0,
    validDate: false,
    date: null,
    rawHex: "FFFFFBA5",
  })),
  habitats: Array.from({ length: 90 }, (_, index) => ({
    index,
    grass: 1,
    surf: 2,
    fish: 3,
    complete: false,
    raw: 0xb9,
  })),
  settings: {
    pinned: 255,
    rank: 255,
    calculatedRank: 0,
    tutorial: true,
    tutorialRaw: 9,
    unknown90: 65535,
    unknown92: 255,
    lastEncounter: 255,
    viewed: true,
    viewedRaw: 3,
    capture: true,
    captureRaw: 255,
  },
};
describe("Medals5 input and frozen-preview contract", () => {
  it("localizes rejected edits and stale previews in every UI language", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(
        localizeSaveError(
          "Medals5: Invalid import size.",
          saveEditorResources[lang],
        ),
      ).toBe(medals5Words[lang].invalid);
      expect(
        localizeSaveError(
          "Medals5 preview target is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(medals5Words[lang].stale);
      expect(medals5Words[lang].importSize).toContain("1020");
    }
  });
  it("uses all pinned upstream enum translations in their actual numeric order", () => {
    for (const language of ["zh", "en", "ja"] as const) {
      const labels = medals5Labels[language];
      expect(labels.states).toHaveLength(5);
      expect(labels.ranks).toHaveLength(5);
      expect(labels.completion).toHaveLength(4);
      expect(labels.encounters).toHaveLength(3);
      expect(labels.states.every(Boolean)).toBe(true);
    }
    expect(medals5Labels.zh.title).toBe("奖牌编辑器");
    expect(medals5Labels.zh.states[3]).toBe("可获得");
    expect(medals5Labels.ja.ranks[4]).toBe("レジェンドメダリスト");
  });
  it("exposes only the real B2W2 format", () => {
    expect(supportsMedals5("SAV5B2W2")).toBe(true);
    for (const f of ["SAV5BW", "SAV4HGSS", "SAV6XY"])
      expect(supportsMedals5(f)).toBe(false);
  });
  it("keeps unknown stored states and settings out of unrelated patches", () => {
    expect(medals5Patch(c, { medals: [{ index: 0, unread: false }] })).toEqual({
      action: "patch",
      sourceHash: hash,
      medals: [{ index: 0, unread: false }],
    });
    expect(medals5Patch(c, { settings: { unknown92: 0 } }).settings).toEqual({
      unknown92: 0,
    });
    expect(c.settings.rank).toBe(255);
  });
  it("checks leap dates and source date-state eligibility", () => {
    for (const date of ["2000-01-01", "2000-02-29", "2099-12-31"])
      expect(medals5Date(date)).toBe(date);
    for (const date of [
      "1999-12-31",
      "2100-01-01",
      "2001-02-29",
      "2000-13-01",
      "",
      "2000-2-29",
    ])
      expect(() => medals5Date(date)).toThrow();
    expect(() =>
      medals5Patch(c, { medals: [{ index: 0, date: "2000-01-01" }] }),
    ).toThrow();
    expect(() =>
      medals5Patch(c, { medals: [{ index: 0, state: 3, date: "2000-01-01" }] }),
    ).toThrow();
    expect(
      medals5Patch(c, { medals: [{ index: 0, state: 4, date: "2000-01-01" }] })
        .medals?.[0].date,
    ).toBe("2000-01-01");
    expect(
      medals5Patch(c, { medals: [{ index: 1, date: "2000-01-01" }] })
        .medals?.[0].index,
    ).toBe(1);
  });
  it("validates all index, state, setting and habitat bounds", () => {
    for (const index of [0, 254])
      expect(
        medals5Patch(c, { medals: [{ index, state: 4 }] }).medals?.[0].index,
      ).toBe(index);
    for (const index of [-1, 255, 1.5])
      expect(() =>
        medals5Patch(c, { medals: [{ index, state: 0 }] }),
      ).toThrow();
    for (const state of [-1, 5, 0.5])
      expect(() =>
        medals5Patch(c, { medals: [{ index: 0, state }] }),
      ).toThrow();
    for (const settings of [
      { pinned: 256 },
      { rank: 5 },
      { unknown90: 65536 },
      { unknown92: -1 },
      { lastEncounter: 3 },
    ])
      expect(() => medals5Patch(c, { settings })).toThrow();
    expect(
      medals5Patch(c, {
        settings: {
          pinned: 255,
          rank: 4,
          unknown90: 65535,
          unknown92: 255,
          lastEncounter: 2,
        },
      }).settings?.pinned,
    ).toBe(255);
    for (const index of [0, 89])
      expect(
        medals5Patch(c, {
          habitats: [{ index, grass: 0, surf: 3, fish: 1, complete: true }],
        }).habitats?.[0].index,
      ).toBe(index);
    for (const habitats of [
      [{ index: 90, grass: 0 }],
      [{ index: 0, fish: 4 }],
      [{ index: 0 }],
    ])
      expect(() => medals5Patch(c, { habitats })).toThrow();
  });
  it("rejects empty and duplicate patches and requires explicit batch ranges", () => {
    for (const fields of [
      {},
      { settings: {} },
      { medals: [] },
      { medals: [{ index: 0 }] },
      {
        medals: [
          { index: 0, state: 0 },
          { index: 0, state: 1 },
        ],
      },
      {
        habitats: [
          { index: 1, grass: 0 },
          { index: 1, grass: 1 },
        ],
      },
    ])
      expect(() => medals5Patch(c, fields)).toThrow();
    for (const action of ["complete", "clear"] as const) {
      for (const indices of [undefined, [], [90], [0, 0]])
        expect(() => medals5Action(c, action, indices)).toThrow();
      expect(medals5Action(c, action, [0, 89]).indices).toEqual([0, 89]);
    }
    expect(medals5Action(c, "giveAll").action).toBe("giveAll");
    expect(() => medals5Action(c, "calculateRank", [0])).toThrow();
  });
  it("uses exactly the 1020-byte medal list, distinct from memory-link ml5", () => {
    const bytes = Uint8Array.from({ length: 1020 }, (_, i) => i);
    const request = medals5Import(c, bytes);
    expect(request.dataBase64?.length).toBe(1360);
    expect(
      Uint8Array.from(atob(request.dataBase64!), (v) => v.charCodeAt(0)),
    ).toEqual(bytes);
    for (const length of [0, 1019, 1021, 1024])
      expect(() => medals5Import(c, new Uint8Array(length))).toThrow();
  });
  it("requires full source/target hashes and freezes automatic dates", () => {
    const p: Medals5Preview = {
      request: {
        action: "giveAll",
        sourceHash: hash,
        targetHash: target,
        today: "2000-02-29",
      },
      result: { ...c, sourceHash: target },
      changedOffsets: [1],
    };
    expect(medals5Frozen(c, p)).toBe(p.request);
    for (const request of [
      { ...p.request, today: undefined },
      { ...p.request, today: "2100-01-01" },
      { ...p.request, sourceHash: target },
      { ...p.request, targetHash: "bad" },
    ])
      expect(() => medals5Frozen(c, { ...p, request })).toThrow();
    expect(() =>
      medals5Frozen(c, { ...p, result: { ...p.result, canEdit: false } }),
    ).toThrow();
    expect(() =>
      medals5Patch({ ...c, canEdit: false }, { settings: { rank: 0 } }),
    ).toThrow();
  });
});
