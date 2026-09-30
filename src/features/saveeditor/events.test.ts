import { describe, it, expect } from "vitest";
import {
  eventDraft,
  eventGroup,
  eventIndex,
  validateEvents,
  validateEventFiles,
  supportsEvents,
  eventDiffText,
  type EventCatalog,
} from "./events";
const catalog: EventCatalog = {
  flags: [false, true, false],
  values: [0, 65535, 32768],
  flagLabels: [],
  workLabels: [],
  updatesQr: false,
  maximumValue: 65535,
  minimumValue: 0,
  flagGroups: [],
  workGroups: [],
  canEdit: true,
};
describe("event editing boundaries", () => {
  it("preserves signed Int32 values including negative drafts and rejects truncation", () => {
    const c: EventCatalog = {
      ...catalog,
      minimumValue: -2147483648,
      maximumValue: 2147483647,
      values: [0, -1, -2147483648],
    };
    for (const value of [
      -2147483648, -2147483647, -65536, -1, 1, 65535, 65536, 2147483647,
    ]) {
      const d = eventDraft(c);
      d.values[0] = String(value);
      expect(validateEvents(c, d).values).toEqual([{ index: 0, value }]);
    }
    for (const value of [
      "-2147483649",
      "2147483648",
      "4294967295",
      "-",
      "",
      "1.5",
      "1e3",
      "0x10",
      "+1",
      " 1",
      "00000000001",
    ]) {
      const d = eventDraft(c);
      d.values[2] = value;
      expect(() => validateEvents(c, d)).toThrow();
    }
    expect(() =>
      validateEvents({ ...c, minimumValue: 0 }, eventDraft(c)),
    ).toThrow();
    expect(() =>
      validateEvents({ ...catalog, minimumValue: -1 }, eventDraft(catalog)),
    ).toThrow();
    for (const lang of ["zh", "en", "ja"] as const)
      expect(
        eventDiffText(
          {
            setFlags: [],
            clearedFlags: [],
            values: [{ index: 999, before: -2147483648, after: 2147483647 }],
          },
          lang,
        ),
      ).toContain("999: -2147483648 → 2147483647");
  });
  it("maps raw split-group edges and all 72 unclassified work slots without crossing groups", () => {
    const c: EventCatalog = {
      ...catalog,
      flagGroups: [
        { category: 200, start: 0, count: 128 },
        { category: 201, start: 128, count: 512 },
        { category: 202, start: 640, count: 1536 },
        { category: 203, start: 2176, count: 1920 },
      ],
      workGroups: [
        { category: 200, start: 0, count: 32 },
        { category: 201, start: 32, count: 128 },
        { category: 202, start: 160, count: 512 },
        { category: 203, start: 672, count: 256 },
        { category: 204, start: 928, count: 72 },
      ],
    };
    for (const mode of ["flags", "values"] as const) {
      const groups = mode === "flags" ? c.flagGroups : c.workGroups;
      for (const g of groups)
        for (let i = g.start; i < g.start + g.count; i++)
          expect(eventGroup(c, mode, i)).toBe(g);
      const count = mode === "flags" ? 4096 : 1000;
      expect(eventGroup(c, mode, -1)).toBeUndefined();
      expect(eventGroup(c, mode, count)).toBeUndefined();
      expect(eventIndex(String(count - 1), count)).toBe(count - 1);
      expect(() => eventIndex(String(count), count)).toThrow();
    }
  });
  it("keeps Gen2 values byte-sized while preserving the five-digit decimal input", () => {
    const gen2: EventCatalog = {
      ...catalog,
      maximumValue: 255,
      values: [0, 255, 128],
    };
    for (let value = 0; value <= 255; value++) {
      const draft = eventDraft(gen2);
      draft.values[0] = String(value).padStart(5, "0");
      expect(validateEvents(gen2, draft).values).toEqual(
        value === 0 ? [] : [{ index: 0, value }],
      );
    }
    for (const value of ["256", "65535", "-1", "1.0", "1e2", ""]) {
      const draft = eventDraft(gen2);
      draft.values[2] = value;
      expect(() => validateEvents(gen2, draft)).toThrow();
    }
    expect(eventIndex("1999", 2000)).toBe(1999);
    expect(() => eventIndex("2000", 2000)).toThrow();
    expect(eventIndex("255", 256)).toBe(255);
    expect(() => eventIndex("256", 256)).toThrow();
  });
  it("refuses read-only catalogs and unknown value widths", () => {
    expect(() =>
      validateEvents({ ...catalog, canEdit: false }, eventDraft(catalog)),
    ).toThrow();
    for (const maximumValue of [0, 256, 65536, NaN])
      expect(() =>
        validateEvents({ ...catalog, maximumValue }, eventDraft(catalog)),
      ).toThrow();
  });
  it("keeps all drafts and sends only changed entries", () => {
    const draft = eventDraft(catalog);
    draft.flags[2] = true;
    draft.values[1] = "0";
    draft.values[0] = "65535";
    expect(validateEvents(catalog, draft)).toEqual({
      flags: [{ index: 2, value: true }],
      values: [
        { index: 0, value: 65535 },
        { index: 1, value: 0 },
      ],
    });
    expect(catalog.flags).toEqual([false, true, false]);
    expect(catalog.values).toEqual([0, 65535, 32768]);
    expect(validateEvents(catalog, eventDraft(catalog))).toEqual({
      flags: [],
      values: [],
    });
  });
  it.each([
    "",
    " ",
    "-1",
    "+1",
    "1.0",
    "1e2",
    "0x10",
    "65536",
    "000000",
    "NaN",
  ])("rejects invalid values even on a non-selected entry: %s", (v) => {
    const d = eventDraft(catalog);
    d.values[2] = v;
    expect(() => validateEvents(catalog, d)).toThrow();
  });
  it("checks complete array shapes", () => {
    expect(() =>
      validateEvents(catalog, { flags: [], values: ["0", "65535", "32768"] }),
    ).toThrow();
    expect(() =>
      validateEvents(catalog, { flags: [false, true, false], values: [] }),
    ).toThrow();
    expect(() =>
      validateEvents(catalog, {
        flags: [0 as unknown as boolean, true, false],
        values: ["0", "65535", "32768"],
      }),
    ).toThrow();
  });
  it("uses zero-based dynamic limits", () => {
    expect(eventIndex("0", 4960)).toBe(0);
    expect(eventIndex("4959", 4960)).toBe(4959);
    for (const value of ["4960", "-1", "1.5", "1e2", "", " 0", "000000"])
      expect(() => eventIndex(value, 4960)).toThrow();
    expect(() => eventIndex("0", 0)).toThrow();
  });
  it("bounds comparison before reading files", () => {
    expect(() =>
      validateEventFiles([{ size: 1 }, { size: 1048576 }]),
    ).not.toThrow();
    for (const sizes of [
      [],
      [1],
      [1, 1, 1],
      [0, 1],
      [1, 1048577],
      [1, NaN],
      [1, 1.5],
    ])
      expect(() =>
        validateEventFiles(sizes.map((size) => ({ size }))),
      ).toThrow();
  });
  it("limits the editor to the implemented layouts", () => {
    for (const f of [
      "SAV2",
      "SAV3RS",
      "SAV3E",
      "SAV3FRLG",
      "SAV4DP",
      "SAV4Pt",
      "SAV4HGSS",
      "SAV5BW",
      "SAV5B2W2",
      "SAV6XY",
      "SAV6AO",
      "SAV7SM",
      "SAV7USUM",
      "SAV7b",
    ])
      expect(supportsEvents(f)).toBe(true);
    for (const f of ["SAV8BS", "SAV3XD", "SAV9SV"])
      expect(supportsEvents(f)).toBe(false);
  });
  it("reports additions, removals and both values in all UI languages", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      const s = eventDiffText(
        {
          setFlags: [0, 7],
          clearedFlags: [8],
          values: [{ index: 5, before: 65535, after: 0 }],
        },
        lang,
      );
      expect(s).toContain("0, 7");
      expect(s).toContain("8");
      expect(s).toContain("5: 65535 → 0");
    }
  });
});
