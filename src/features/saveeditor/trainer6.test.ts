import { describe, expect, it } from "vitest";
import {
  supportsTrainer6,
  tr6IdInput,
  tr6Tsv,
  tr6Action,
  tr6Frozen,
  tr6Patch,
  tr6Position,
  tr6Trash,
  type Tr6Catalog,
  type Tr6Field,
} from "./trainer6";
import { trainerImage } from "./art";
import { localizeSaveError, saveEditorResources } from "./locales";
const name = { zh: "训练家", en: "Trainer", ja: "トレーナー" };
const number = (key: string, max: number, maxLength: number): Tr6Field => ({
  key,
  group: "maison",
  name,
  value: "65000",
  kind: "number",
  min: 0,
  max,
  maxLength,
  choices: [],
});
function catalog(): Tr6Catalog {
  return {
    canEdit: true,
    sourceHash: "A".repeat(64),
    fields: [
      number("Maison0", 9999, 4),
      number("Style", 255, 3),
      { ...number("Saying0", 0, 16), kind: "text", value: "Old" },
      {
        ...number("Sprite", 255, 3),
        kind: "choice",
        choices: [0, 37, 128].map((id) => ({ id, name })),
      },
    ],
    sprite: "tr_255",
    playerModel: 999,
    position: {
      canEdit: true,
      fields: [
        {
          key: "x",
          value: "1",
          display: "1.000000",
          min: "0",
          max: "65535",
          places: 6,
        },
      ],
    },
    nameTrash: "00".repeat(26),
    characters: [0xe081],
    trashSpecies: [{ id: 25, name }],
    trashLanguages: [{ id: 2, name }],
    basics: { name: "A", tid: 1, sid: 2, money: 9999999, gender: 0 },
    existing: {
      appearance6: null,
      gameVersion: { value: 24, choices: [] },
      spatialPosition: [],
      dates: [],
      position: null,
      gameOptions: null,
      canRecords: true,
      currencies: [],
      badges: { count: 8, value: 0 },
      geography: null,
      languages: [],
      canGender: true,
      canPlayTime: true,
      hours: 0,
      minutes: 0,
      seconds: 0,
    },
  };
}
describe("Generation VI source trainer window", () => {
  it("normalizes five digit IDs through ChangeFFFF and computes the source hover TSV", () => {
    expect(tr6IdInput("")).toBe("0");
    expect(tr6IdInput("99999")).toBe("65535");
    expect(tr6IdInput("00012")).toBe("00012");
    expect(tr6IdInput("65535")).toBe("65535");
    expect(tr6IdInput("1e2")).toBe("1e2");
    expect(tr6Tsv("65535", "00000")).toBe("4095");
    expect(tr6Tsv("00123", "00123")).toBe("0000");
  });
  it("opens only full X/Y and ORAS formats", () => {
    expect(supportsTrainer6("SAV6XY")).toBe(true);
    expect(supportsTrainer6("SAV6AO")).toBe(true);
    for (const format of ["SAV6AODemo", "SAV5B2W2", "SAV7SM", "SAV6"])
      expect(supportsTrainer6(format)).toBe(false);
  });
  it("accepts four digit Maison controls and preserves unknown old values until explicit patch", () => {
    const c = catalog();
    for (const value of ["", "0", "9999", "0001"])
      expect(tr6Patch(c, [{ key: "Maison0", value }]).fields?.[0].value).toBe(
        value,
      );
    for (const value of ["65000", "10000", "-1", "1e2", "0x10", " 1", "1.0"])
      expect(() => tr6Patch(c, [{ key: "Maison0", value }])).toThrow();
    expect(c.fields[0].value).toBe("65000");
  });
  it("passes Style clamping to Core without rewriting the frozen request", () => {
    expect(
      tr6Patch(catalog(), [{ key: "Style", value: "999" }]).fields,
    ).toEqual([{ key: "Style", value: "999" }]);
    expect(() =>
      tr6Patch(catalog(), [{ key: "Style", value: "1000" }]),
    ).toThrow();
  });
  it("accepts blank and sixteen UTF16 characters for sayings", () => {
    for (const value of ["", "A".repeat(16), "\uE081\uE08D", "汉字あいう"])
      expect(
        tr6Patch(catalog(), [{ key: "Saying0", value }]).fields?.[0].value,
      ).toBe(value);
    expect(() =>
      tr6Patch(catalog(), [{ key: "Saying0", value: "A".repeat(17) }]),
    ).toThrow();
  });
  it("uses real choice IDs, including holes and special source sprites", () => {
    for (const id of [0, 37, 128])
      expect(
        tr6Patch(catalog(), [{ key: "Sprite", value: String(id) }]).fields?.[0]
          .value,
      ).toBe(String(id));
    for (const value of ["", "17", "25", "255"])
      expect(() => tr6Patch(catalog(), [{ key: "Sprite", value }])).toThrow();
  });
  it("forwards source appearance conversion text and leaves bit truncation to Core", () => {
    const c = catalog();
    c.fields.push({
      ...number("Appearance.Version", 4294967295, 32767),
      kind: "property",
      group: "appearance",
    });
    for (const value of [
      "4294967295",
      "0xFFFFFFFF",
      "#FF",
      "-1",
      "White",
      "Black, Brown",
    ])
      expect(
        tr6Patch(c, [{ key: "Appearance.Version", value }]).fields,
      ).toEqual([{ key: "Appearance.Version", value }]);
    expect(() =>
      tr6Patch(c, [{ key: "Appearance.Version", value: "   " }]),
    ).toThrow();
    expect(() =>
      tr6Patch(c, [{ key: "Appearance.Version", value: "1".repeat(32768) }]),
    ).toThrow();
  });
  it("rejects missing, foreign and duplicate patches atomically", () => {
    for (const fields of [
      undefined,
      [],
      [{ key: "Foreign", value: "0" }],
      [
        { key: "Maison0", value: "1" },
        { key: "Maison0", value: "2" },
      ],
    ])
      expect(() => tr6Patch(catalog(), fields)).toThrow();
    expect(() =>
      tr6Patch({ ...catalog(), canEdit: false }, [
        { key: "Maison0", value: "0" },
      ]),
    ).toThrow();
  });
  it("keeps full window resave separate and restricts the source accessory button to XY", () => {
    expect(tr6Action(catalog(), "resave")).toEqual({
      action: "resave",
      sourceHash: "A".repeat(64),
    });
    expect(tr6Action(catalog(), "accessories").action).toBe("accessories");
    expect(() =>
      tr6Action({ ...catalog(), fields: [] }, "accessories"),
    ).toThrow();
  });
  it("supports every trash operation and validates exact raw widths and source layer candidates", () => {
    const c = catalog();
    for (const action of ["prepare", "clear"] as const)
      expect(tr6Trash(c, { action }).trash?.action).toBe(action);
    expect(tr6Trash(c, { action: "text", text: "" }).trash?.text).toBe("");
    expect(
      tr6Trash(c, { action: "hex", hex: "ab".repeat(26) }).trash?.hex,
    ).toBe("ab".repeat(26));
    expect(
      tr6Trash(c, {
        action: "layer",
        species: 25,
        language: 2,
        generation: 100,
        uiLanguage: "zh",
      }).trash?.generation,
    ).toBe(100);
    expect(() => tr6Trash(c, { action: "hex", hex: "00" })).toThrow();
    expect(() =>
      tr6Trash(c, { action: "text", text: "A".repeat(13) }),
    ).toThrow();
    expect(() =>
      tr6Trash(c, {
        action: "layer",
        species: 26,
        language: 2,
        generation: 6,
        uiLanguage: "zh",
      }),
    ).toThrow();
    expect(() =>
      tr6Trash(c, {
        action: "layer",
        species: 25,
        language: 2,
        generation: 101,
        uiLanguage: "ja",
      }),
    ).toThrow();
    expect(() => tr6Trash(c, { action: "clear", text: "A" })).toThrow();
  });
  it("freezes the actual complete-file target and rejects stale previews", () => {
    const c = catalog(),
      request = {
        ...tr6Patch(c, [{ key: "Maison0", value: "1" }]),
        targetHash: "B".repeat(64),
      },
      preview = {
        request,
        result: { ...c, sourceHash: request.targetHash },
        changedOffsets: [123],
        ignoredFields: [],
      };
    expect(tr6Frozen(c, preview)).toBe(request);
    expect(() => tr6Frozen(c, { ...preview, result: c })).toThrow();
    expect(() =>
      tr6Frozen(c, {
        ...preview,
        request: { ...request, sourceHash: "C".repeat(64) },
      }),
    ).toThrow();
  });
  it("uses bundled trainer artwork with the source tr_00 fallback", () => {
    expect(trainerImage("tr_37")).toContain("tr_37.png");
    for (const resource of ["tr_255", "missing", "../../evil"])
      expect(trainerImage(resource)).toContain("tr_00.png");
  });
  it("forwards numeric control text with a frozen language for source position saving", () => {
    const c = catalog();
    for (const value of [
      "",
      "-",
      "1e2",
      "1,234.5",
      "0.1234567890123456789012345678",
      "-999999999",
    ])
      expect(tr6Position(c, "ja", [{ key: "x", value }])).toMatchObject({
        action: "position",
        uiLanguage: "ja",
        fields: [{ key: "x", value }],
      });
    expect(() =>
      tr6Position({ ...c, position: { ...c.position, canEdit: false } }, "zh", [
        { key: "x", value: "1" },
      ]),
    ).toThrow();
    for (const fields of [
      [],
      [{ key: "foreign", value: "1" }],
      [
        { key: "x", value: "1" },
        { key: "x", value: "2" },
      ],
      [{ key: "x", value: "1".repeat(32768) }],
    ])
      expect(() => tr6Position(c, "en", fields)).toThrow();
  });
  it("localizes trainer failures before generic import failures", () => {
    for (const language of ["zh", "en", "ja"] as const) {
      expect(
        localizeSaveError(
          "Trainer6: invalid source date",
          saveEditorResources[language],
        ),
      ).toBe(saveEditorResources[language].trainer6Error);
      expect(
        localizeSaveError(
          "Trainer6: preview is stale",
          saveEditorResources[language],
        ),
      ).toBe(saveEditorResources[language].trainer6Stale);
    }
  });
});
