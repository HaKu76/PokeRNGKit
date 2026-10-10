import { describe, it, expect } from "vitest";
import {
  avenue5Action,
  avenue5Patch,
  avenue5Valid,
  avenue5Import,
  avenue5Frozen,
  supportsAvenue5,
  avenue5Words,
  type Avenue5Catalog,
  type Avenue5Object,
  type Avenue5Field,
  type Avenue5Preview,
} from "./avenue5";
import { localizeSaveError, saveEditorResources } from "./locales";
const name = { zh: "字段", en: "Field", ja: "項目" },
  hash = "A".repeat(64),
  target = "B".repeat(64);
const field = (
  id: string,
  kind: Avenue5Field["kind"],
  maximum = 255,
  textMaximum = 0,
): Avenue5Field => ({
  id,
  kind,
  group: "general",
  name,
  value: "0",
  maximum,
  textMaximum,
  choices: null,
});
const o: Avenue5Object = {
  group: "visitors",
  index: 7,
  name: "角色",
  extension: "jav5",
  rawHex: "00",
  fields: [
    field("Country", "number"),
    field("Name", "text", 0, 7),
    field("Records", "list", 0, 32767),
    field("Date1", "date", 0, 32767),
    field("Shop", "shop", 0, 32767),
    field("Flag", "boolean", 1),
    {
      ...field("Language", "number"),
      choices: [
        { id: 1, name },
        { id: 8, name },
      ],
    },
  ],
};
const c: Avenue5Catalog = {
  canEdit: true,
  sourceHash: hash,
  objects: [o],
  rawHex: "00",
};
describe("Join Avenue plans", () => {
  it("supports only the B2W2 physical layout", () => {
    expect(supportsAvenue5("SAV5B2W2")).toBe(true);
    for (const f of ["SAV5BW", "SAV4HGSS", "SAV6XY"])
      expect(supportsAvenue5(f)).toBe(false);
  });
  it("allows full raw byte geography and preserves unspecified fields", () => {
    expect(avenue5Patch(c, o, [{ id: "Country", value: "255" }])).toEqual({
      action: "patch",
      sourceHash: hash,
      group: "visitors",
      index: 7,
      fields: [{ id: "Country", value: "255" }],
    });
    for (const value of ["", "-1", "256", "1.5", "1e2", "abc"])
      expect(() => avenue5Patch(c, o, [{ id: "Country", value }])).toThrow();
  });
  it("validates exact UTF16 text capacity and source numeric candidates", () => {
    expect(avenue5Valid(o.fields[1], "1234567")).toBe(true);
    expect(avenue5Valid(o.fields[1], "😀😀😀😀")).toBe(false);
    expect(avenue5Valid(o.fields[6], "8")).toBe(true);
    expect(avenue5Valid(o.fields[6], "255")).toBe(false);
    expect(avenue5Valid(o.fields[5], "2")).toBe(false);
  });
  it("keeps source lists/dates as text for core parsing and preview", () => {
    for (const value of ["", "0xFFFFFFFF;bad|2\n3", "2001-02-03", "0xFFFF"])
      expect(avenue5Valid(o.fields[2], value)).toBe(true);
    expect(avenue5Valid(o.fields[3], "invalid date")).toBe(true);
    expect(avenue5Valid(o.fields[2], "x".repeat(32768))).toBe(false);
  });
  it("requires complete shop tuples within all three source control bounds", () => {
    for (const value of ["-1,0,0", "7,9,3", "0,0,0"])
      expect(avenue5Valid(o.fields[4], value)).toBe(true);
    for (const value of [
      "8,9,3",
      "7,10,3",
      "7,9,4",
      "1,2",
      "1,,2",
      "-2,0,0",
      "1,1.5,0",
    ])
      expect(avenue5Valid(o.fields[4], value)).toBe(false);
  });
  it("rejects duplicate/unknown/empty patches and stale or absent targets", () => {
    for (const fields of [
      [],
      [
        { id: "Flag", value: "1" },
        { id: "Flag", value: "0" },
      ],
      [{ id: "missing", value: "0" }],
    ])
      expect(() => avenue5Patch(c, o, fields)).toThrow();
    expect(() =>
      avenue5Patch({ ...c, canEdit: false }, o, [{ id: "Flag", value: "1" }]),
    ).toThrow();
    expect(() =>
      avenue5Patch(c, { ...o, index: 8 }, [{ id: "Flag", value: "1" }]),
    ).toThrow();
    expect(() =>
      avenue5Action({ ...c, sourceHash: "invalid" }, o, "resave"),
    ).toThrow();
  });
  it("recognizes exact three import sizes and never offers self/settings files", () => {
    for (const n of [88, 96, 196]) {
      const p = avenue5Import(c, o, new Uint8Array(n));
      expect(atob(p.dataBase64!).length).toBe(n);
      expect(p.fields).toBeUndefined();
    }
    for (const n of [0, 87, 95, 195, 197])
      expect(() => avenue5Import(c, o, new Uint8Array(n))).toThrow();
    const self = { ...o, extension: null };
    expect(() =>
      avenue5Import({ ...c, objects: [self] }, self, new Uint8Array(88)),
    ).toThrow();
    expect(() =>
      avenue5Action({ ...c, objects: [self] }, self, "export"),
    ).toThrow();
    expect(avenue5Action({ ...c, canEdit: false }, o, "export").action).toBe(
      "export",
    );
  });
  it("requires full source and destination hashes when applying previews", () => {
    const p: Avenue5Preview = {
      request: { ...avenue5Action(c, o, "resave"), targetHash: target },
      result: { ...c, sourceHash: target },
      changedOffsets: [1],
    };
    expect(avenue5Frozen(c, p)).toBe(p.request);
    for (const bad of [
      { ...p, request: { ...p.request, sourceHash: target } },
      { ...p, result: { ...p.result, sourceHash: hash } },
      { ...p, request: { ...p.request, targetHash: "bad" } },
      { ...p, result: { ...p.result, canEdit: false } },
    ])
      expect(() => avenue5Frozen(c, bad)).toThrow();
  });
  it("localizes entity operations and worker errors in every active UI language", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(
        localizeSaveError("Avenue5: invalid fields", saveEditorResources[lang]),
      ).toBe(avenue5Words[lang].invalid);
      expect(
        localizeSaveError(
          "Avenue5 preview is stale",
          saveEditorResources[lang],
        ),
      ).toBe(avenue5Words[lang].stale);
      expect(avenue5Words[lang].import).not.toBe(avenue5Words[lang].export);
    }
  });
});
