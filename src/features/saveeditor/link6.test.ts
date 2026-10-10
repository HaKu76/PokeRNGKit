import { describe, it, expect } from "vitest";
import {
  LINK6_FILE_SIZE,
  supportsLink6,
  link6Patch,
  link6Number,
  link6Import,
  link6Export,
  link6Resave,
  link6Frozen,
  type Link6Catalog,
  type Link6Preview,
} from "./link6";
import { link6Words } from "./link6Words";
import { localizeSaveError, saveEditorResources } from "./locales";
const catalog = (): Link6Catalog => ({
  canEdit: true,
  sourceHash: "A".repeat(64),
  enabled: true,
  flags: 166,
  origin: "Source",
  battlePoints: 9999,
  pokemiles: 65535,
  internalChecksumValid: true,
  storedChecksum: 1,
  calculatedChecksum: 1,
  items: [],
  pokemon: [],
  rawHex: "",
  blockHex: "",
});
describe("Generation VI Pokémon Link", () => {
  it("limits routing to XY and ORAS", () => {
    expect(["SAV6XY", "SAV6AO"].every(supportsLink6)).toBe(true);
    expect(["SAV5B2W2", "SAV7SM", "SAV6"].some(supportsLink6)).toBe(false);
  });
  it("validates decimal values at source bounds without silently converting blank or invalid input", () => {
    expect(link6Number("9999", 9999)).toBe(9999);
    expect(link6Number("65535", 65535)).toBe(65535);
    expect(link6Number(" 0 ", 9999)).toBe(0);
    for (const text of ["", " ", "-1", "1.5", "1e3", "FFFF", "10000"])
      expect(() => link6Number(text, 9999)).toThrow();
  });
  it("allows only the two enabled upstream editable controls", () => {
    const c = catalog();
    expect(link6Patch(c, { battlePoints: 0, pokemiles: 65535 })).toEqual({
      action: "patch",
      sourceHash: c.sourceHash,
      battlePoints: 0,
      pokemiles: 65535,
    });
    for (const fields of [
      {},
      { battlePoints: 10000 },
      { pokemiles: -1 },
      { pokemiles: 65536 },
      { battlePoints: 1.5 },
      { battlePoints: 0, origin: "invented" },
    ])
      expect(() => link6Patch(c, fields)).toThrow();
    expect(() =>
      link6Patch({ ...c, enabled: false }, { battlePoints: 0 }),
    ).toThrow();
    expect(() =>
      link6Patch({ ...c, canEdit: false }, { battlePoints: 0 }),
    ).toThrow();
  });
  it("preserves availability of explicit resave for disabled records and blocks unreadable BP", () => {
    const c = catalog();
    expect(link6Resave({ ...c, enabled: false })).toEqual({
      action: "resave",
      sourceHash: c.sourceHash,
    });
    expect(() => link6Resave({ ...c, battlePoints: 10000 })).toThrow();
    expect(() => link6Resave({ ...c, sourceHash: "short" })).toThrow();
  });
  it("imports every raw byte at the exact source pl6 size without changing original data", () => {
    const data = Uint8Array.from(
        { length: LINK6_FILE_SIZE },
        (_, i) => i % 256,
      ),
      original = data.slice(),
      e = link6Import(catalog(), data);
    expect(e.action).toBe("import");
    expect(
      Uint8Array.from(atob(e.dataBase64!), (x) => x.charCodeAt(0)),
    ).toEqual(original);
    expect(data).toEqual(original);
    for (const length of [0, 2630, 2632])
      expect(() => link6Import(catalog(), new Uint8Array(length))).toThrow();
  });
  it("exports raw records without an edit request and follows the enabled gate", () => {
    const c = catalog();
    expect(link6Export({ ...c, canEdit: false })).toEqual({
      action: "export",
      sourceHash: c.sourceHash,
    });
    expect(() => link6Export({ ...c, enabled: false })).toThrow();
    expect(() => link6Export({ ...c, sourceHash: "short" })).toThrow();
  });
  it("applies only a full-file frozen preview from the current source", () => {
    const c = catalog(),
      p: Link6Preview = {
        request: {
          action: "resave",
          sourceHash: c.sourceHash,
          targetHash: "B".repeat(64),
        },
        result: { ...c, sourceHash: "B".repeat(64) },
        changedOffsets: [0, 12345],
      };
    expect(link6Frozen(c, p)).toBe(p.request);
    for (const changed of [
      { ...p, request: { ...p.request, sourceHash: "C".repeat(64) } },
      { ...p, request: { ...p.request, targetHash: "short" } },
      { ...p, result: { ...p.result, sourceHash: "C".repeat(64) } },
      { ...p, result: { ...p.result, canEdit: false } },
      { ...p, request: { ...p.request, action: "export" as const } },
    ])
      expect(() => link6Frozen(c, changed)).toThrow();
  });
  it("localizes errors before generic import/runtime fallbacks in all UI languages", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      const words = saveEditorResources[lang];
      expect(localizeSaveError("Link6: Invalid import data.", words)).toBe(
        link6Words[lang].invalid,
      );
      expect(localizeSaveError("Link6 preview target is stale.", words)).toBe(
        link6Words[lang].stale,
      );
      expect(link6Words[lang].note).toBeTruthy();
      expect(link6Words[lang].resaveNote).toBeTruthy();
    }
  });
  it("allows BP repair without constraining an untouched old value", () => {
    const c = { ...catalog(), battlePoints: 65535 };
    expect(link6Patch(c, { battlePoints: 9999 }).battlePoints).toBe(9999);
    expect(link6Patch(c, { pokemiles: 0 }).battlePoints).toBeUndefined();
  });
});
