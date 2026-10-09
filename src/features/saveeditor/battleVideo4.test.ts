import { describe, expect, it } from "vitest";
import {
  supportsBattleVideo4,
  video4Import,
  video4Confirmation,
  video4Words,
  type Video4Catalog,
  type Video4Preview,
} from "./battleVideo4";
import { localizeSaveError, saveEditorResources } from "./locales";
const c: Video4Catalog = {
  canEdit: true,
  index: 2,
  sourceHash: "A".repeat(64),
  slots: Array.from({ length: 4 }, (_, index) => ({
    index,
    available: true,
    valid: true,
    key: 1000 + index,
    magic: 123,
    revision: 9,
    blockID: 2 + index,
    teams: [],
  })),
};
const data = btoa("A".repeat(7520));
const preview: Video4Preview = {
  sourceHash: c.sourceHash,
  index: 2,
  inputDecrypted: true,
  video: c.slots[2],
};
describe("Battle video4 workspace", () => {
  it("supports only games with the extra-data slots", () => {
    expect(supportsBattleVideo4("SAV4Pt")).toBe(true);
    expect(supportsBattleVideo4("SAV4HGSS")).toBe(true);
    expect(supportsBattleVideo4("SAV4DP")).toBe(false);
    expect(supportsBattleVideo4("SAV4BR")).toBe(false);
  });
  it("requires complete binary size and an initialized selected target", () => {
    expect(video4Import(c, data)).toEqual({
      index: 2,
      data,
      sourceHash: c.sourceHash,
    });
    expect(() => video4Import(c, btoa("A".repeat(7519)))).toThrow();
    expect(() => video4Import({ ...c, canEdit: false }, data)).toThrow();
    expect(() => video4Import({ ...c, index: 4 }, data)).toThrow();
    expect(() =>
      video4Import(
        { ...c, slots: c.slots.map((v) => ({ ...v, available: false })) },
        data,
      ),
    ).toThrow();
    expect(() => video4Import({ ...c, sourceHash: "bad" }, data)).toThrow();
  });
  it("binds import confirmation to current source, slot and destination ownership", () => {
    const edit = video4Import(c, data);
    expect(video4Confirmation(c, edit, preview)).toEqual(edit);
    for (const other of [
      { ...preview, index: 1 },
      { ...preview, sourceHash: "B".repeat(64) },
      { ...preview, video: { ...preview.video, valid: false } },
      { ...preview, video: { ...preview.video, key: 9999 } },
      { ...preview, video: { ...preview.video, blockID: 99 } },
    ])
      expect(() => video4Confirmation(c, edit, other)).toThrow();
  });
  it("localizes operations, partial-data limits and failures", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(video4Words[lang].partial).toBeTruthy();
      expect(video4Words[lang].decrypted).toBeTruthy();
      expect(
        localizeSaveError(
          "Invalid battle video4 binary.",
          saveEditorResources[lang],
        ),
      ).toBe(video4Words[lang].invalid);
      expect(
        localizeSaveError(
          "Battle video4 preview is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(video4Words[lang].stale);
    }
  });
});
