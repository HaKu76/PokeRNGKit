import { expect, it } from "vitest";
import { canEnableGsBall2, gsBall2Words, supportsGsBall2 } from "./gsBall2";
it("limits the GS Ball entry to Crystal saves", () => {
  expect(supportsGsBall2("SAV2", "C")).toBe(true);
  for (const [format, version] of [
    ["SAV2", "GS"],
    ["SAV1", "C"],
    ["SAV2", "c"],
  ])
    expect(supportsGsBall2(format, version)).toBe(false);
});
it("requires an available editable event that is not enabled", () => {
  for (const available of [true, false])
    for (const canEdit of [true, false])
      for (const enabled of [true, false])
        expect(canEnableGsBall2({ available, canEdit, enabled })).toBe(
          available && canEdit && !enabled,
        );
});
it("provides complete three-language status and action text", () => {
  for (const words of Object.values(gsBall2Words)) {
    expect(Object.keys(words)).toEqual(Object.keys(gsBall2Words.zh));
    expect(Object.values(words).every(Boolean)).toBe(true);
  }
});
