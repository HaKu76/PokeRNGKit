import { describe, it, expect } from "vitest";
import {
  br4Profile,
  br4Flag,
  br4Batch,
  br4GearWords,
  supportsBr4Gear,
  type Br4GearCatalog,
} from "./br4";
import { br4Labels } from "./br4Labels";
const catalog = (): Br4GearCatalog => ({
  canEdit: true,
  profile: 2,
  sourceHash: "A".repeat(64),
  gear: [
    {
      id: 0,
      model: 1,
      category: 0,
      shared: false,
      unlocked: false,
      name: { zh: "Gear", en: "Gear", ja: "装備" },
    },
    {
      id: 130,
      model: 1,
      category: 9,
      shared: true,
      unlocked: true,
      name: { zh: "Badge", en: "Badge", ja: "バッジ" },
    },
  ],
  outfits: [false, false, false, false, false, false],
  plans: [
    { action: "all", unlocked: 2, changed: [0], targetHex: "FF".repeat(192) },
    {
      action: "defaults",
      unlocked: 1,
      changed: [130],
      targetHex: "00".repeat(192),
    },
  ],
});
describe("Battle Revolution profiles and gear", () => {
  it("selects four explicit players without accepting fractional or absent slots", () => {
    for (let i = 0; i < 4; i++) expect(br4Profile(i)).toBe(i);
    for (const v of [-1, 4, 1.5, NaN]) expect(() => br4Profile(v)).toThrow();
    expect(supportsBr4Gear("SAV4BR")).toBe(true);
    expect(supportsBr4Gear("SAV4HGSS")).toBe(false);
  });
  it("writes only defined gear positions and independent outfit flags", () => {
    const c = catalog();
    expect(br4Flag(c, "gear", 130, false)).toEqual({
      action: "gear",
      profile: 2,
      flags: [{ id: 130, enabled: false }],
    });
    expect(br4Flag(c, "outfits", 5, true)).toEqual({
      action: "outfits",
      profile: 2,
      flags: [{ id: 5, enabled: true }],
    });
    for (const id of [-1, 129, 1536])
      expect(() => br4Flag(c, "gear", id, true)).toThrow();
    expect(() => br4Flag(c, "outfits", 6, true)).toThrow();
    expect(() => br4Flag({ ...c, canEdit: false }, "gear", 0, true)).toThrow();
    expect(c.outfits.every((v) => !v)).toBe(true);
  });
  it("binds bulk operations to the exact file, player and complete flag block", () => {
    const c = catalog();
    expect(br4Batch(c, "defaults")).toEqual({
      action: "defaults",
      profile: 2,
      sourceHash: c.sourceHash,
    });
    expect(() => br4Batch({ ...c, sourceHash: "stale" }, "all")).toThrow();
    expect(() => br4Batch({ ...c, profile: 4 }, "all")).toThrow();
    expect(() => br4Batch({ ...c, plans: [] }, "all")).toThrow();
    c.plans[0].targetHex = "FF";
    expect(() => br4Batch(c, "all")).toThrow();
  });
  it("uses descriptive active-language operations and source model/category labels", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(Object.keys(br4GearWords[lang]).sort()).toEqual(
        Object.keys(br4GearWords.en).sort(),
      );
      for (const key of [
        "SAV_Gear",
        "ModelBR.YoungBoy",
        "GearCategory.Badges",
        "SAV_Gear.B_Clear",
        "SAV_Gear.B_UnlockAll",
      ])
        expect(br4Labels[lang][key]).toBeTruthy();
      expect(br4GearWords[lang].names).toHaveLength(6);
    }
    expect(br4Labels.zh["SAV_Gear.B_Clear"]).toBe("重置装扮为默认");
  });
});
