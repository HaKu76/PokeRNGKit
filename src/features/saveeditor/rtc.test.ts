import { describe, it, expect } from "vitest";
import { rtcDraft, validateRtc, supportsRtc, type RtcCatalog } from "./rtc";
const catalog: RtcCatalog = {
  initial: [65535, 255, 254, 253],
  elapsed: [734, 23, 59, 59],
};
describe("save clocks", () => {
  it("preserves unusual original values and handles endpoints", () => {
    expect(validateRtc(catalog, rtcDraft(catalog))).toEqual({
      action: "edit",
      ...catalog,
    });
    const draft = rtcDraft(catalog);
    draft.initial = ["0", "0", "0", "0"];
    expect(validateRtc(catalog, draft).initial).toEqual([0, 0, 0, 0]);
  });
  it("rejects new out-of-range values and malformed drafts", () => {
    for (const values of [
      ["65536", "0", "0", "0"],
      ["0", "24", "0", "0"],
      ["0", "0", "60", "0"],
      ["0", "0", "0", "60"],
      ["0", "255", "0", "0"],
      [],
      ["0", "0", "0", "0", "0"],
    ])
      expect(() =>
        validateRtc(catalog, { ...rtcDraft(catalog), elapsed: values }),
      ).toThrow();
    for (const value of ["", "-1", "1.5", "1e2", " 1", "000000", "１２"]) {
      const draft = rtcDraft(catalog);
      draft.initial[0] = value;
      expect(() => validateRtc(catalog, draft)).toThrow();
    }
  });
  it("only exposes the Hoenn clocks", () => {
    for (const format of ["SAV3RS", "SAV3E"])
      expect(supportsRtc(format)).toBe(true);
    for (const format of ["SAV3FRLG", "SAV3Colosseum", "SAV4HGSS"])
      expect(supportsRtc(format)).toBe(false);
  });
});
