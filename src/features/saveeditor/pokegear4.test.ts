import { describe, it, expect } from "vitest";
import {
  supportsPokeGear4,
  gear4SlotEdit,
  gear4BatchEdit,
  gear4Contact,
  pokegear4Words,
  type PokeGear4Catalog,
} from "./pokegear4";
const catalog = (): PokeGear4Catalog => ({
  canEdit: true,
  player: 3,
  sourceHash: "A".repeat(64),
  slots: Array<number>(75).fill(-128),
  choices: [
    { id: -1, source: "None" },
    ...Array.from({ length: 75 }, (_, id) => ({
      id,
      source: id === 0 ? "Mother" : `Contact_${id}`,
    })),
  ],
  plans: (["all", "nonTrainers", "clear"] as const).map((action) => ({
    action,
    slots: Array<number>(75).fill(-1),
  })),
});
describe("PokeGear4 contacts", () => {
  it("uses only HGSS and localizes operations/role descriptions", () => {
    const c = catalog();
    expect(supportsPokeGear4("SAV4HGSS")).toBe(true);
    expect(supportsPokeGear4("SAV4DP")).toBe(false);
    expect(gear4Contact(c, 0, "zh")).toBe("母亲");
    expect(gear4Contact(c, -1, "ja")).toBe("空き");
    expect(gear4Contact(c, -128, "en")).toContain("-128");
    for (const w of Object.values(pokegear4Words)) {
      expect(w.replace).toBeTruthy();
      expect(Object.keys(w.actions)).toHaveLength(3);
    }
  });
  it("distinguishes known choices from signed raw values", () => {
    const c = catalog();
    expect(gear4SlotEdit(c, 74, "choice", "-1")).toEqual({
      action: "slots",
      slots: [{ slot: 74, value: -1 }],
    });
    expect(gear4SlotEdit(c, 0, "raw", "-128")).toEqual({
      action: "slots",
      slots: [{ slot: 0, value: -128 }],
    });
    expect(() => gear4SlotEdit(c, 0, "choice", "127")).toThrow();
    for (const v of ["", "-129", "128", "1.5", "0x10", " 0"])
      expect(() => gear4SlotEdit(c, 0, "raw", v)).toThrow();
  });
  it("freezes batch source and rejects malformed plans or readonly writes", () => {
    const c = catalog();
    expect(gear4BatchEdit(c, "all")).toEqual({
      action: "all",
      sourceHash: c.sourceHash,
    });
    c.plans[0].slots.pop();
    expect(() => gear4BatchEdit(c, "all")).toThrow();
    expect(() =>
      gear4BatchEdit({ ...catalog(), sourceHash: "bad" }, "clear"),
    ).toThrow();
    expect(() =>
      gear4SlotEdit({ ...catalog(), canEdit: false }, 0, "raw", "0"),
    ).toThrow();
  });
  it("uses all 75 physical positions without sorting or deduplication", () => {
    const c = catalog();
    c.slots[1] = c.slots[2] = 0;
    c.slots[3] = -1;
    expect(gear4SlotEdit(c, 3, "raw", "75")).toEqual({
      action: "slots",
      slots: [{ slot: 3, value: 75 }],
    });
    expect(c.slots.slice(0, 4)).toEqual([-128, 0, 0, -1]);
    expect(() => gear4SlotEdit(c, 75, "raw", "0")).toThrow();
  });
});
