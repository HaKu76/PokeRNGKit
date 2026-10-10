import { describe, it, expect } from "vitest";
import {
  gl5Number,
  gl5Patch,
  gl5Resave,
  gl5Frozen,
  gl5Words,
  supportsGlobalLink5,
  type Gl5Catalog,
} from "./globalLink5";
import { localizeSaveError, saveEditorResources } from "./locales";
const name = { zh: "道具", en: "Item", ja: "アイテム" };
const c: Gl5Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  scalars: [
    {
      id: "uploadCount",
      name,
      value: -1,
      minimum: -2147483648,
      maximum: 2147483647,
    },
    { id: "selected", name, value: 127, minimum: 0, maximum: 255 },
  ],
  flags: [{ id: "slot", name, value: true, raw: 255 }],
  date: { empty: false, valid: false, value: null, rawHex: "07200DC8" },
  items: Array.from({ length: 20 }, (_, index) => ({
    index,
    id: 65535,
    count: 247,
    name,
    sprite: "bitem_unk",
  })),
  choices: [
    { id: 0, name },
    { id: 1, name },
  ],
  furniture: Array.from({ length: 5 }, (_, index) => ({
    index,
    value: 65535,
    name: "Old",
    rawHex: "AA",
  })),
  rawHex: "AA",
};
describe("Global Link local edits", () => {
  it("preserves full Int32 range and accepts source integer signs/whitespace", () => {
    for (const text of ["-2147483648", "2147483647", "+9", " 9 ", "-0"])
      expect(gl5Number(text, -2147483648, 2147483647)).toBe(Number(text));
    for (const text of ["", "1.5", "2147483648", "-2147483649", "1e2"])
      expect(() => gl5Number(text, -2147483648, 2147483647)).toThrow();
    expect(supportsGlobalLink5("SAV5BW")).toBe(true);
    expect(supportsGlobalLink5("SAV5B2W2")).toBe(true);
    expect(supportsGlobalLink5("SAV4DP")).toBe(false);
  });
  it("sends GUI selection 255 to Core rather than applying the seven-bit mask in JS", () => {
    expect(
      gl5Patch(c, { scalars: [{ id: "selected", value: 255 }] }).scalars?.[0]
        .value,
    ).toBe(255);
    expect(() =>
      gl5Patch(c, { scalars: [{ id: "selected", value: 256 }] }),
    ).toThrow();
    expect(
      gl5Patch(c, { flags: [{ id: "slot", value: true }] }).flags?.[0].value,
    ).toBe(true);
  });
  it("keeps unknown old item identities during quantity-only edits and uses actual candidates for new IDs", () => {
    expect(gl5Patch(c, { items: [{ index: 19, count: 255 }] }).items).toEqual([
      { index: 19, count: 255 },
    ]);
    expect(
      gl5Patch(c, { items: [{ index: 0, id: 0, count: 255 }] }).items?.[0]
        .count,
    ).toBe(255);
    for (const fields of [
      { index: 0, id: 65535 },
      { index: 20, count: 1 },
      { index: 0, count: 256 },
      { index: 0 },
    ])
      expect(() => gl5Patch(c, { items: [fields] })).toThrow();
  });
  it("validates real calendar dates, leap days and source year limits without computing stored bytes", () => {
    for (const date of ["2000-01-01", "2000-02-29", "2099-12-31"])
      expect(gl5Patch(c, { dateSet: true, date }).date).toBe(date);
    for (const date of [
      "1999-12-31",
      "2100-01-01",
      "2001-02-29",
      "2000-13-01",
      "20xx-01-01",
    ])
      expect(() => gl5Patch(c, { dateSet: true, date })).toThrow();
    expect(gl5Patch(c, { dateSet: false }).dateSet).toBe(false);
    expect(() => gl5Patch(c, { dateSet: false, date: "2000-01-01" })).toThrow();
  });
  it("preserves 32767-character source input and leaves name conversion to Core", () => {
    const name = "A".repeat(32767);
    expect(
      gl5Patch(c, { furniture: [{ index: 4, name }] }).furniture?.[0].name,
    ).toBe(name);
    expect(() =>
      gl5Patch(c, { furniture: [{ index: 0, name: name + "A" }] }),
    ).toThrow();
    expect(() =>
      gl5Patch(c, { furniture: [{ index: 5, name: "A" }] }),
    ).toThrow();
    expect(() =>
      gl5Patch(c, { furniture: [{ index: 0, value: 65536 }] }),
    ).toThrow();
  });
  it("separates resave, rejects duplicate/empty edits and binds confirmation to full output", () => {
    expect(() => gl5Patch(c, {})).toThrow();
    expect(() =>
      gl5Patch(c, {
        items: [
          { index: 0, count: 1 },
          { index: 0, count: 2 },
        ],
      }),
    ).toThrow();
    const request = { ...gl5Resave(c), targetHash: "B".repeat(64) },
      p = {
        request,
        result: { ...c, sourceHash: request.targetHash },
        changedOffsets: [],
      };
    expect(gl5Frozen(c, p)).toEqual(request);
    expect(() => gl5Frozen(c, { ...p, result: c })).toThrow();
    expect(() => gl5Frozen({ ...c, canEdit: false }, p)).toThrow();
  });
  it("localizes byte masking/name truncation and operation errors", () => {
    for (const l of ["zh", "en", "ja"] as const) {
      expect(gl5Words[l].nameNote).toContain("32767");
      expect(gl5Words[l].selectedNote).toContain("255");
      expect(
        localizeSaveError(
          "GlobalLink5: Invalid fields.",
          saveEditorResources[l],
        ),
      ).toBe(gl5Words[l].invalid);
      expect(
        localizeSaveError(
          "GlobalLink5 preview target is stale.",
          saveEditorResources[l],
        ),
      ).toBe(gl5Words[l].stale);
    }
  });
});
