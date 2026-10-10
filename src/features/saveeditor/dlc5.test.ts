import { describe, it, expect } from "vitest";
import {
  dlc5Import,
  dlc5Frozen,
  dlc5Export,
  dlc5Words,
  dlc5Titles,
  supportsDlc5,
  type Dlc5Slot,
  type Dlc5Catalog,
  type Dlc5Preview,
} from "./dlc5";
import { localizeSaveError, saveEditorResources } from "./locales";
const slot: Dlc5Slot = {
  kind: "memory",
  index: 0,
  extension: "ml5",
  size: 1024,
  importSizes: [1024],
  uninitialized: true,
  canExport: true,
  name: "",
  description: "",
  about: "",
  valid: null,
  magic: null,
  flags: null,
  downloadState: null,
  downloadCount: null,
  teams: [],
};
const c: Dlc5Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  slots: [slot],
};
describe("Generation 5 DLC files", () => {
  it("supports only both Gen5 layouts and transfers raw bytes without altering content", () => {
    expect(supportsDlc5("SAV5BW")).toBe(true);
    expect(supportsDlc5("SAV5B2W2")).toBe(true);
    expect(supportsDlc5("SAV4DP")).toBe(false);
    const bytes = Uint8Array.from({ length: 1024 }, (_, i) => i % 256),
      edit = dlc5Import(c, slot, bytes, "input.ml5");
    expect(edit).toMatchObject({
      kind: "memory",
      index: 0,
      sourceHash: c.sourceHash,
    });
    expect(edit.fileName).toBeUndefined();
    expect(Uint8Array.from(atob(edit.data), (v) => v.charCodeAt(0))).toEqual(
      bytes,
    );
  });
  it("honors every accepted musical length and sends the complete filename to Core", () => {
    const s = {
      ...slot,
      kind: "musical" as const,
      size: 0x1fc00,
      importSizes: [0x1fc00, 0x17d78],
    };
    for (const size of s.importSizes) {
      const edit = dlc5Import(
        { ...c, slots: [s] },
        s,
        new Uint8Array(size),
        "42 - Name (EN).pms",
      );
      expect(edit.fileName).toBe("42 - Name (EN).pms");
      expect(atob(edit.data).length).toBe(size);
    }
    for (const name of ["", "x".repeat(1025), "A\0B"])
      expect(() =>
        dlc5Import({ ...c, slots: [s] }, s, new Uint8Array(s.size), name),
      ).toThrow();
  });
  it("rejects incompatible lengths, unknown slots, stale hashes and disabled editing", () => {
    expect(() => dlc5Import(c, slot, new Uint8Array(1023), "a")).toThrow();
    expect(() =>
      dlc5Import(c, { ...slot, index: 2 }, new Uint8Array(1024), "a"),
    ).toThrow();
    expect(() =>
      dlc5Import({ ...c, sourceHash: "bad" }, slot, new Uint8Array(1024), "a"),
    ).toThrow();
    expect(() =>
      dlc5Import({ ...c, canEdit: false }, slot, new Uint8Array(1024), "a"),
    ).toThrow();
  });
  it("binds a frozen preview to its source, group, slot, size and complete target hash", () => {
    const p: Dlc5Preview = {
      request: {
        ...dlc5Import(c, slot, new Uint8Array(1024), "a"),
        targetHash: "B".repeat(64),
      },
      result: slot,
      inputSize: 1024,
      inputDecrypted: null,
      changedOffsets: [],
    };
    expect(dlc5Frozen(c, p)).toEqual(p.request);
    expect(() =>
      dlc5Frozen(c, { ...p, request: { ...p.request, targetHash: undefined } }),
    ).toThrow();
    expect(() =>
      dlc5Frozen(c, {
        ...p,
        request: { ...p.request, sourceHash: "C".repeat(64) },
      }),
    ).toThrow();
    expect(() =>
      dlc5Frozen(c, { ...p, result: { ...slot, index: 1 } }),
    ).toThrow();
    expect(() =>
      dlc5Frozen(c, { ...p, result: { ...slot, kind: "video" } }),
    ).toThrow();
    expect(() => dlc5Frozen(c, { ...p, inputSize: 1023 })).toThrow();
  });
  it("allows raw empty exports, limits decrypt to videos, and respects the dex-skin gate", () => {
    expect(dlc5Export(slot, false)).toEqual({
      kind: "memory",
      index: 0,
      decrypted: false,
    });
    expect(() => dlc5Export(slot, true)).toThrow();
    expect(dlc5Export({ ...slot, kind: "video" }, true).decrypted).toBe(true);
    expect(() =>
      dlc5Export({ ...slot, kind: "dexSkin", canExport: false }, false),
    ).toThrow();
  });
  it("localizes all groups, source limitations and both prefixed and stale failures", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      for (const title of Object.values(dlc5Titles))
        expect(title[lang]).toBeTruthy();
      expect(dlc5Words[lang].videoNote).toBeTruthy();
      expect(dlc5Words[lang].testNote).toBeTruthy();
      expect(dlc5Words[lang].musicalNote).toContain("20");
      expect(
        localizeSaveError("Dlc5: Invalid file.", saveEditorResources[lang]),
      ).toBe(dlc5Words[lang].invalid);
      expect(
        localizeSaveError(
          "Dlc5 preview target is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(dlc5Words[lang].stale);
    }
  });
});
