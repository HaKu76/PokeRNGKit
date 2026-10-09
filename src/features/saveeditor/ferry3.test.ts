import { describe, it, expect } from "vitest";
import {
  supportsFerry3,
  ferry3FlagEdit,
  ferry3TicketEdit,
  ferry3Plan,
  ferry3Words,
  type Ferry3Catalog,
} from "./ferry3";
const catalog = (): Ferry3Catalog => ({
  canEdit: true,
  japanese: false,
  sourceHash: "A".repeat(64),
  flags: [
    { index: 0x864, value: false },
    { index: 0x8b3, value: true },
  ],
  tickets: [
    {
      id: 376,
      name: { zh: "古航海图", en: "Old Sea Map", ja: "ふるびたかいず" },
      present: false,
    },
  ],
  plans: [
    {
      includeOldSeaMap: false,
      status: "ready",
      have: [],
      missing: [265, 275, 370, 371],
      additions: [265, 275, 370, 371].map((id, slot) => ({ id, slot })),
    },
    {
      includeOldSeaMap: true,
      status: "ready",
      have: [],
      missing: [265, 275, 370, 371, 376],
      additions: [265, 275, 370, 371, 376].map((id, slot) => ({ id, slot })),
    },
  ],
});
describe("Emerald ferry", () => {
  it("limits the entry to Emerald and retains all ten localized flags", () => {
    expect(supportsFerry3("SAV3E")).toBe(true);
    for (const f of ["SAV3RS", "SAV3FRLG", "SAV1", "SAV8BS"])
      expect(supportsFerry3(f)).toBe(false);
    for (const words of Object.values(ferry3Words)) {
      expect(words.labels).toHaveLength(10);
      expect(Object.values(words.statuses)).toHaveLength(4);
      expect(words.unreleased).toBeTruthy();
    }
  });
  it("writes only changed flags and refuses empty or readonly drafts", () => {
    const c = catalog();
    expect(ferry3FlagEdit(c, [true, true])).toEqual({
      action: "flags",
      flags: [{ index: 0x864, value: true }],
    });
    expect(() => ferry3FlagEdit(c, [false, true])).toThrow();
    expect(() => ferry3FlagEdit(c, [true])).toThrow();
    expect(() =>
      ferry3FlagEdit({ ...c, canEdit: false }, [true, true]),
    ).toThrow();
  });
  it("uses the reviewed regional plan and exact source fingerprint", () => {
    const c = catalog();
    expect(ferry3Plan(c, false).missing).toHaveLength(4);
    expect(ferry3Plan(c, true).missing).toHaveLength(5);
    expect(ferry3TicketEdit(c, false)).toEqual({
      action: "tickets",
      includeOldSeaMap: false,
      sourceHash: c.sourceHash,
    });
    c.plans[0].includeOldSeaMap = true;
    expect(ferry3TicketEdit(c, false)).toEqual({
      action: "tickets",
      includeOldSeaMap: true,
      sourceHash: c.sourceHash,
    });
    expect(ferry3TicketEdit(c, true).action).toBe("tickets");
  });
  it("refuses blocked or obsolete previews without producing edits", () => {
    for (const status of ["complete", "space", "occupied"] as const) {
      const c = catalog();
      c.plans[0].status = status;
      expect(() => ferry3TicketEdit(c, false)).toThrow();
    }
    expect(() =>
      ferry3TicketEdit({ ...catalog(), canEdit: false }, true),
    ).toThrow();
    for (const sourceHash of ["", "abc", "G".repeat(64)])
      expect(() =>
        ferry3TicketEdit({ ...catalog(), sourceHash }, true),
      ).toThrow();
  });
});
