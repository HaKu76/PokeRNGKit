import { describe, it, expect } from "vitest";
import {
  eventDraft,
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
};
describe("event editing boundaries", () => {
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
    ])
      expect(supportsEvents(f)).toBe(true);
    for (const f of ["SAV2", "SAV7b", "SAV8BS", "SAV3XD", "SAV9SV"])
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
