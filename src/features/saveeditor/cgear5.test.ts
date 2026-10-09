import { describe, it, expect } from "vitest";
import {
  CGEAR5_PIXEL_BYTES,
  CGEAR5_RAW_BYTES,
  cgear5Base64,
  cgear5Bytes,
  cgear5Import,
  cgear5Frozen,
  cgear5Words,
  supportsCGear5,
  type CGear5Catalog,
  type CGear5Preview,
} from "./cgear5";
import { cgear5PngDimensions } from "./cgear5Image";
import { localizeSaveError, saveEditorResources } from "./locales";

const c: CGear5Catalog = {
  canEdit: true,
  sourceHash: "A".repeat(64),
  extension: "psk",
  uninitialized: true,
  hasSkin: false,
  checksum: 0,
  downloadState: 0,
  downloadCount: 0,
  raw: cgear5Base64(new Uint8Array(CGEAR5_RAW_BYTES)),
  pixels: null,
  renderable: false,
};
describe("C-Gear background imports", () => {
  it("supports both Gen5 layouts and preserves complete byte transport", () => {
    expect(supportsCGear5("SAV5BW")).toBe(true);
    expect(supportsCGear5("SAV5B2W2")).toBe(true);
    expect(supportsCGear5("SAV4DP")).toBe(false);
    const bytes = Uint8Array.from(
      { length: CGEAR5_PIXEL_BYTES },
      (_, i) => i % 256,
    );
    expect(cgear5Bytes(cgear5Base64(bytes), CGEAR5_PIXEL_BYTES)).toEqual(bytes);
    expect(cgear5Import(c, "raw", c.raw)).toMatchObject({
      action: "raw",
      data: c.raw,
    });
    expect(cgear5Import(c, "image", cgear5Base64(bytes)).data).toBe(
      cgear5Base64(bytes),
    );
  });
  it("rejects malformed lengths, hashes and disabled writes without interpreting skin data", () => {
    for (const size of [CGEAR5_RAW_BYTES - 1, CGEAR5_RAW_BYTES + 1])
      expect(() =>
        cgear5Import(c, "raw", cgear5Base64(new Uint8Array(size))),
      ).toThrow();
    expect(() => cgear5Import(c, "image", c.raw)).toThrow();
    expect(() =>
      cgear5Import({ ...c, canEdit: false }, "raw", c.raw),
    ).toThrow();
    expect(() =>
      cgear5Import({ ...c, sourceHash: "bad" }, "raw", c.raw),
    ).toThrow();
    expect(() => cgear5Bytes("not base64!", CGEAR5_RAW_BYTES)).toThrow();
  });
  it("binds confirmation to source, complete output and the target game", () => {
    const target = "B".repeat(64);
    const p: CGear5Preview = {
      request: { ...cgear5Import(c, "raw", c.raw), targetHash: target },
      result: { ...c, sourceHash: target },
      colors: null,
      tiles: null,
      pixelChanges: null,
      changedOffsets: [],
    };
    expect(cgear5Frozen(c, p)).toEqual(p.request);
    expect(() =>
      cgear5Frozen(c, { ...p, request: { ...p.request, sourceHash: target } }),
    ).toThrow();
    expect(() =>
      cgear5Frozen(c, {
        ...p,
        request: { ...p.request, targetHash: undefined },
      }),
    ).toThrow();
    expect(() =>
      cgear5Frozen(c, {
        ...p,
        result: { ...p.result, sourceHash: c.sourceHash },
      }),
    ).toThrow();
    expect(() =>
      cgear5Frozen(c, { ...p, result: { ...p.result, extension: "cgb" } }),
    ).toThrow();
    // Capacity warnings and unrenderable source-compatible raw imports do not silently forbid confirmation.
    expect(
      cgear5Frozen(c, { ...p, tiles: 700, colors: 16, pixelChanges: 49000 }),
    ).toEqual(p.request);
  });
  it("checks PNG dimensions before browser allocation, independent of filename or extension", () => {
    const bytes = new Uint8Array(33);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    bytes.set([73, 72, 68, 82], 12);
    const view = new DataView(bytes.buffer);
    view.setUint32(8, 13);
    view.setUint32(16, 256);
    view.setUint32(20, 192);
    expect(() => cgear5PngDimensions(bytes)).not.toThrow();
    for (const [w, h] of [
      [255, 192],
      [256, 193],
      [0xffffffff, 192],
    ]) {
      view.setUint32(16, w);
      view.setUint32(20, h);
      expect(() => cgear5PngDimensions(bytes)).toThrow();
    }
    expect(() => cgear5PngDimensions(new Uint8Array(32))).toThrow();
    bytes[0] = 0;
    expect(() => cgear5PngDimensions(bytes)).toThrow();
  });
  it("localizes image limits, conversion and stale errors in all active languages", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(cgear5Words[lang].imageNote).toContain("256×192");
      expect(cgear5Words[lang].overflow).toContain("255");
      expect(
        localizeSaveError(
          "Invalid CGear5 input size.",
          saveEditorResources[lang],
        ),
      ).toBe(cgear5Words[lang].invalid);
      expect(
        localizeSaveError(
          "CGear5 preview target is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(cgear5Words[lang].stale);
    }
  });
});
