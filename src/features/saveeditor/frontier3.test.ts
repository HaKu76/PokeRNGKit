import { describe, it, expect } from "vitest";
import {
  frontier3RecordDraft,
  frontier3GlobalDraft,
  frontier3RecordEdit,
  frontier3GlobalEdit,
  frontier3Words,
  supportsFrontier3,
  type Frontier3Catalog,
} from "./frontier3";
const c: Frontier3Catalog = {
  canEdit: true,
  pass: false,
  bp: 65535,
  earned: 65535,
  symbols: Array.from({ length: 7 }, (_, facility) => ({
    facility,
    silver: false,
    gold: true,
  })),
  facilities: [
    {
      id: 0,
      modeCount: 4,
      records: [
        {
          mode: 0,
          record: 0,
          continue: true,
          stats: [
            { id: 1, value: 65535 },
            { id: 4, value: 9999 },
          ],
        },
      ],
    },
    {
      id: 3,
      modeCount: 1,
      records: [
        {
          mode: 0,
          record: 1,
          continue: false,
          stats: [
            { id: 1, value: 0 },
            { id: 4, value: 0 },
          ],
        },
      ],
    },
  ],
};
describe("Emerald Battle Frontier", () => {
  it("keeps old out-of-range stats untouched in continuation-only patches", () => {
    const d = frontier3RecordDraft(c.facilities[0].records[0]);
    expect(frontier3RecordEdit(c, 0, 0, 0, { ...d, continue: false })).toEqual({
      action: "record",
      facility: 0,
      mode: 0,
      record: 0,
      continue: false,
    });
    expect(
      frontier3RecordEdit(c, 0, 0, 0, { ...d, stats: ["0", "9999"] }).stats,
    ).toEqual([{ id: 1, value: 0 }]);
    for (const value of ["", "10000", "-1", "1e2", "1.0"])
      expect(() =>
        frontier3RecordEdit(c, 0, 0, 0, { ...d, stats: [value, "9999"] }),
      ).toThrow();
  });
  it("restricts positions to the loaded mode and level combinations", () => {
    const d = frontier3RecordDraft(c.facilities[0].records[0]);
    for (const pos of [
      [0, 4, 0],
      [3, 1, 1],
      [7, 0, 0],
      [0, 0, 2],
      [0.5, 0, 0],
    ])
      expect(() =>
        frontier3RecordEdit(c, ...(pos as [number, number, number]), d),
      ).toThrow();
    expect(() =>
      frontier3RecordEdit({ ...c, canEdit: false }, 0, 0, 0, {
        ...d,
        continue: false,
      }),
    ).toThrow();
    expect(() =>
      frontier3RecordEdit(c, 0, 0, 0, { ...d, stats: [] }),
    ).toThrow();
  });
  it("preserves gold-only symbols and raw BP until explicitly edited", () => {
    const d = frontier3GlobalDraft(c);
    expect(frontier3GlobalEdit(c, { ...d, pass: true })).toEqual({
      action: "global",
      pass: true,
    });
    expect(frontier3GlobalEdit(c, { ...d, earned: "0" })).toEqual({
      action: "global",
      earned: 0,
    });
    expect(
      frontier3GlobalEdit(c, { ...d, symbols: ["2", ...d.symbols.slice(1)] }),
    ).toEqual({ action: "global", symbols: [{ facility: 0, level: 2 }] });
    expect(frontier3GlobalEdit(c, { ...d, bp: "9999" })).toEqual({
      action: "global",
      bp: 9999,
    });
    for (const patch of [
      { bp: "10000" },
      { earned: "65536" },
      { symbols: ["3", ...d.symbols.slice(1)] },
      { symbols: [] },
    ])
      expect(() => frontier3GlobalEdit(c, { ...d, ...patch })).toThrow();
    expect(() => frontier3GlobalEdit(c, d)).toThrow();
  });
  it("exposes all seven facilities and six stat labels in three languages", () => {
    expect(supportsFrontier3("SAV3E")).toBe(true);
    for (const f of ["SAV3RS", "SAV3FRLG", "SAV4HGSS"])
      expect(supportsFrontier3(f)).toBe(false);
    for (const w of Object.values(frontier3Words)) {
      expect(w.facilities).toHaveLength(7);
      expect(w.stats).toHaveLength(6);
      expect(w.records).toHaveLength(2);
      expect(w.levels).toHaveLength(3);
    }
  });
});
