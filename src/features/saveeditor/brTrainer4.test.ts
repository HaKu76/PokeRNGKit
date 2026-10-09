import { describe, expect, it } from "vitest";
import {
  brTrainerNumber,
  brTrainerText,
  brTrainerTime,
  brTrainerFlag,
  brTrainer4Words,
  type BrTrainer4Catalog,
} from "./brTrainer4";
import { brTrainer4Labels } from "./brTrainer4Labels";
import { localizeSaveError, saveEditorResources } from "./locales";
const c: BrTrainer4Catalog = {
  canEdit: true,
  profile: 3,
  sourceHash: "A".repeat(64),
  japanese: false,
  numbers: [
    {
      id: 0,
      source: "Money",
      value: 1,
      minimum: 0,
      maximum: 999999,
      choices: null,
    },
    {
      id: 1,
      source: "TID",
      value: 1,
      minimum: 0,
      maximum: 65535,
      choices: null,
    },
    {
      id: 6,
      source: "RecordTotalBattles",
      value: 1,
      minimum: 0,
      maximum: 16777215,
      choices: null,
    },
    {
      id: 5,
      source: "Language",
      value: 2,
      minimum: 0,
      maximum: 65535,
      choices: [{ id: 2, name: { zh: "英语", en: "English", ja: "英語" } }],
    },
  ],
  text: [
    {
      id: 0,
      source: "OTName",
      value: "Old",
      hex: "00".repeat(16),
      maximum: 7,
      bytes: 16,
      multiline: false,
    },
    {
      id: 1,
      source: "BirthMonth",
      value: "1",
      hex: "00".repeat(8),
      maximum: 4,
      bytes: 8,
      multiline: false,
    },
    {
      id: 3,
      source: "SelfIntroduction",
      value: "Old",
      hex: "00".repeat(108),
      maximum: 51,
      bytes: 108,
      multiline: true,
    },
    {
      id: 4,
      source: "PlayerID",
      value: "0",
      hex: "00".repeat(8),
      maximum: 16,
      bytes: 8,
      multiline: false,
    },
  ],
  flags: Array(11).fill(false),
  time: { hours: 1, minutes: 2, seconds: 3, hex: "00".repeat(8) },
  regions: [],
};
describe("BR trainer editor", () => {
  it("keeps source decimal limits and blank masked inputs", () => {
    expect(brTrainerNumber(c, 0, "").values?.[0].value).toBe("0");
    expect(brTrainerNumber(c, 1, "99999").values?.[0].value).toBe("65535");
    expect(brTrainerNumber(c, 6, "16777215").values?.[0].value).toBe(
      "16777215",
    );
    for (const value of ["16777216", "-1", "1e2", " 1", ""])
      expect(() => brTrainerNumber(c, 6, value)).toThrow();
    expect(() => brTrainerNumber(c, 5, "8")).toThrow();
    expect(() => brTrainerNumber(c, 1, "100000")).toThrow();
    expect(() => brTrainerNumber(c, 1, "000001")).toThrow();
  });
  it("validates actual terminated storage and UTF16 variable width", () => {
    expect(() => brTrainerText(c, 1, "1234")).toThrow();
    expect(brTrainerText(c, 1, "123").action).toBe("text");
    expect(() => brTrainerText(c, 0, "A\nB")).toThrow();
    expect(() => brTrainerText(c, 3, "Ⓟ".repeat(26))).toThrow();
    expect(brTrainerText(c, 3, "A\nⓅ").values?.[0].value).toBe("A\nⓅ");
    expect(brTrainerText(c, 4, "GH12").values?.[0].value).toBe(
      "0000000000000012",
    );
    expect(brTrainerText(c, 4, "").values?.[0].value).toBe("0000000000000000");
    expect(brTrainerText(c, 4, "f".repeat(16)).values?.[0].value).toBe(
      "F".repeat(16),
    );
    expect(() => brTrainerText(c, 4, "f".repeat(17))).toThrow();
  });
  it("uses exact raw bytes, complete time groups and explicit flag positions", () => {
    expect(brTrainerText(c, 0, "A".repeat(32), true).action).toBe("rawText");
    expect(() => brTrainerText(c, 0, "A".repeat(31), true)).toThrow();
    expect(brTrainerTime(c, "65535", "99", "99")).toMatchObject({
      hours: 65535,
      minutes: 99,
      seconds: 99,
    });
    expect(() => brTrainerTime(c, "65536", "0", "0")).toThrow();
    expect(() => brTrainerTime(c, "1", "", "0")).toThrow();
    expect(() => brTrainerTime(c, "1", "100", "0")).toThrow();
    expect(() => brTrainerTime(c, "000001", "0", "0")).toThrow();
    expect(() => brTrainerTime(c, "1", "001", "0")).toThrow();
    expect(brTrainerFlag(c, 10, true).values).toEqual([{ id: 10, value: "1" }]);
    expect(() => brTrainerFlag(c, 11, true)).toThrow();
    expect(() => brTrainerFlag({ ...c, canEdit: false }, 0, true)).toThrow();
    expect(() => brTrainerNumber({ ...c, profile: 4 }, 1, "0")).toThrow();
  });
  it("provides localized source labels, actions and failures", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(
        brTrainer4Labels[lang]["SAV_Trainer4BR.L_RecordTotalBattles"],
      ).toBeTruthy();
      expect(brTrainer4Words[lang].title).toBeTruthy();
      expect(
        localizeSaveError(
          "Invalid BR trainer candidate.",
          saveEditorResources[lang],
        ),
      ).toBe(brTrainer4Words[lang].invalid);
    }
  });
});
