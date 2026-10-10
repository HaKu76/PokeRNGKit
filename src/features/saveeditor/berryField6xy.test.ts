import { describe, it, expect } from "vitest";
import {
  berry6xyPlot,
  supportsBerryField6XY,
  type Berry6XYCatalog,
} from "./berryField6xy";
import { localizeSaveError, saveEditorResources } from "./locales";
import { berry6xyWords } from "./berryField6xy";
const c: Berry6XYCatalog = {
  editable: false,
  sourceHash: "A".repeat(64),
  count: 32,
  rawHex: "A6",
  plots: Array.from({ length: 32 }, (_, index) => ({
    index,
    values: [0, 1, 255, 256, 32767, 32768, 65534, 65535],
    rawHex: "A6".repeat(16),
  })),
};
describe("XY Berry Field reads", () => {
  it("rejects unexpected editable catalogs and localizes read errors", () => {
    expect(() =>
      berry6xyPlot({ ...c, editable: true } as unknown as Berry6XYCatalog, 0),
    ).toThrow();
    for (const lang of ["zh", "en", "ja"] as const)
      expect(
        localizeSaveError(
          "BerryField6XY: unsupported format",
          saveEditorResources[lang],
        ),
      ).toBe(berry6xyWords[lang].invalid);
  });
  it("uses the source's 32 physical slots and eight UInt16 values", () => {
    for (let index = 0; index < 32; index++)
      expect(berry6xyPlot(c, index)).toBe(c.plots[index]);
  });
  it("rejects the four inaccessible source GUI rows and invalid indices", () => {
    for (const index of [-1, 32, 33, 34, 35, 0.5, NaN])
      expect(() => berry6xyPlot(c, index)).toThrow();
  });
  it("rejects corrupt layout, source hashes, values and raw lengths", () => {
    for (const bad of [
      { ...c, count: 36 },
      { ...c, plots: c.plots.slice(0, 31) },
      { ...c, sourceHash: "bad" },
    ])
      expect(() => berry6xyPlot(bad, 0)).toThrow();
    for (const p of [
      { ...c.plots[0], index: 1 },
      { ...c.plots[0], values: [1] },
      { ...c.plots[0], values: [-1, ...c.plots[0].values.slice(1)] },
      { ...c.plots[0], values: [65536, ...c.plots[0].values.slice(1)] },
      { ...c.plots[0], rawHex: "bad" },
    ])
      expect(() =>
        berry6xyPlot({ ...c, plots: [p, ...c.plots.slice(1)] }, 0),
      ).toThrow();
  });
  it("offers reads only for X/Y", () => {
    expect(supportsBerryField6XY("SAV6XY")).toBe(true);
    for (const format of ["SAV6AO", "SAV5B2W2", "SAV7SM"])
      expect(supportsBerryField6XY(format)).toBe(false);
  });
});
