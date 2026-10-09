import { describe, expect, it } from "vitest";
import {
  battlePassNumber,
  battlePassText,
  battlePassOperation,
  battlePass4Words,
  type BattlePass4Catalog,
} from "./battlePass4";
import { battlePass4Labels } from "./battlePass4Labels";
import { localizeSaveError, saveEditorResources } from "./locales";
const names = { zh: "名称", en: "Name", ja: "名前" };
const c: BattlePass4Catalog = {
  canEdit: true,
  profile: 3,
  index: 0,
  sourceHash: "A".repeat(64),
  passes: [{ index: 0, type: 0, name: "Old", available: true, issued: true }],
  numbers: [
    {
      id: 1,
      source: "TID",
      value: 0,
      minimum: 0,
      maximum: 99999,
      choices: null,
    },
    {
      id: 26,
      source: "Battles",
      value: 0,
      minimum: -2147483648,
      maximum: 2147483647,
      choices: null,
    },
    {
      id: 25,
      source: "Language",
      value: 1,
      minimum: 0,
      maximum: 65535,
      choices: [{ id: 1, name: names }],
    },
  ],
  text: [
    {
      id: 1,
      source: "Greeting",
      value: "Old",
      hex: "00".repeat(52),
      maximum: 25,
      bytes: 52,
      multiline: false,
    },
    {
      id: 2,
      source: "SentOut",
      value: "Old",
      hex: "00".repeat(56),
      maximum: 27,
      bytes: 56,
      multiline: true,
    },
    {
      id: 8,
      source: "BirthMonth",
      value: "",
      hex: "00".repeat(8),
      maximum: 4,
      bytes: 8,
      multiline: false,
    },
    {
      id: 12,
      source: "PlayerID",
      value: "0",
      hex: "00".repeat(8),
      maximum: 16,
      bytes: 8,
      multiline: false,
    },
  ],
  flags: [],
  members: [],
  regions: [],
};
describe("Battle Pass editing boundaries", () => {
  it("keeps five-digit IDs, zero blank IDs and signed battle records", () => {
    expect(battlePassNumber(c, 1, "99999").values?.[0].value).toBe("99999");
    expect(battlePassNumber(c, 1, "").values?.[0].value).toBe("0");
    expect(battlePassNumber(c, 26, "-2147483648").values?.[0].value).toBe(
      "-2147483648",
    );
    for (const value of ["", "2147483648", "1.2", "1e2", " 1"])
      expect(() => battlePassNumber(c, 26, value)).toThrow();
    expect(() => battlePassNumber(c, 25, "0")).toThrow();
  });
  it("validates variables, line breaks, UTF16 and actual terminated storage", () => {
    expect(battlePassText(c, 2, "A\nⓅ").values?.[0].value).toBe("A\nⓅ");
    expect(() => battlePassText(c, 1, "A\nB")).toThrow();
    expect(() => battlePassText(c, 2, "Ⓟ".repeat(14))).toThrow();
    expect(() => battlePassText(c, 2, "😀".repeat(12) + "ⓅⓅ")).toThrow();
    expect(battlePassText(c, 8, "123").action).toBe("text");
    expect(() => battlePassText(c, 8, "1234")).toThrow();
    expect(() => battlePassText(c, 12, "xyz")).toThrow();
  });
  it("requires exact raw field bytes and immutable preview coordinates", () => {
    expect(battlePassText(c, 8, "F".repeat(16), true).action).toBe("rawText");
    expect(() => battlePassText(c, 8, "F".repeat(15), true)).toThrow();
    expect(
      battlePassOperation(c, "swap", { other: 1, profile: 0, index: 10 })
        .profile,
    ).toBe(3);
    expect(() => battlePassOperation(c, "swap", { other: 2 })).toThrow();
    expect(() =>
      battlePassOperation(
        { ...c, passes: [{ ...c.passes[0], type: 1 }] },
        "delete",
      ),
    ).toThrow();
    expect(() =>
      battlePassOperation(c, "import", { data: btoa("a") }),
    ).toThrow();
    expect(() =>
      battlePassOperation({ ...c, canEdit: false }, "unlockCustom"),
    ).toThrow();
  });
  it("uses active-language window labels and errors", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(battlePass4Words[lang].title).toBeTruthy();
      expect(battlePass4Labels[lang]["SAV_BattlePass"]).toBeTruthy();
      expect(
        localizeSaveError(
          "Invalid Battle Pass number.",
          saveEditorResources[lang],
        ),
      ).toBe(battlePass4Words[lang].invalid);
      expect(battlePass4Labels[lang]["BattlePassType.Rental"]).toBeTruthy();
    }
  });
});
