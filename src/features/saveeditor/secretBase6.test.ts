import { describe, it, expect } from "vitest";
import {
  supportsSecretBase6,
  sb6PropertyValid,
  sb6Patch,
  sb6Choices,
  sb6Record,
  sb6File,
  sb6Command,
  sb6Window,
  sb6Frozen,
  type Sb6Field,
  type Sb6Catalog,
  type Sb6Preview,
} from "./secretBase6";
import { sb6Label, sb6Words } from "./secretBase6Words";
import { localizeSaveError, saveEditorResources } from "./locales";
const name = { zh: "名", en: "Name", ja: "名前" };
const choice = (id: number) => ({ id, name });
const field = (
  id: string,
  value: string,
  maximum = 255,
  textMaximum = 3,
  kind: Sb6Field["kind"] = "number",
  minimum = 0,
): Sb6Field => ({
  id,
  value,
  maximum,
  textMaximum,
  kind,
  minimum,
  storedTextMaximum: 0,
  choices: null,
});
function catalog(): Sb6Catalog {
  const properties = [
    field("TrainerName", "Source", 0, 32767, "text"),
    field("BaseLocation", "3", 2147483647, 20, "number", -2147483648),
    field("BoppoyamaScore", "255", 255, 20),
    field("IsNew", "0", 1, 1, "boolean"),
    field("Rank", "0", 2147483647, 20, "enum", -2147483648),
  ];
  const placements = Array.from({ length: 28 }, (_, index) => ({
    index,
    good: 65535,
    x: 0,
    y: 0,
    rotation: 0,
    param1: 65535,
    param2: 65535,
    rawHex: "A6".repeat(12),
  }));
  const p = {
    index: 0,
    species: 25,
    name,
    sprite: "b_25",
    isEgg: true,
    rawAbilityNumber: 255,
    rawHex: "A6".repeat(52),
    fields: [
      field("Species", "25", 65535, 5),
      field("Form", "0", 31, 2),
      field("AbilitySlot", "127", 2, 1),
      field("Gender", "0", 2, 1),
      field("IV_HP", "255", 99, 2),
      field("EV_HP", "255", 999, 3),
      field("PP1", "3", 3, 1),
      field("Level", "255"),
      field("Friendship", "255"),
      field("Ec", "FFFFFFFF", 4294967295, 8, "hex"),
      field("Shiny", "1", 1, 1, "boolean"),
      field("Move1", "33", 65535, 5),
    ],
  };
  return {
    canEdit: true,
    sourceHash: "A".repeat(64),
    capturedRecord: 0,
    rawCapturedRecord: 0,
    bases: [
      {
        index: 0,
        self: true,
        isEmpty: false,
        isDummiedLocation: false,
        name: "Own",
        properties,
        placements,
        pokemon: [],
        rawHex: "A6".repeat(784),
      },
      {
        index: 1,
        self: false,
        isEmpty: false,
        isDummiedLocation: false,
        name: "Other",
        properties: [...properties, field("Language", "255", 255, 20)],
        placements,
        pokemon: [p],
        rawHex: "A6".repeat(992),
      },
    ],
    stock: [],
    species: [choice(25), choice(29), choice(678)],
    items: [choice(0)],
    moves: [choice(0), choice(33)],
    balls: [choice(4)],
    natures: [choice(0)],
    speciesInfo: [
      {
        species: 25,
        forms: [choice(0)],
        formSelectable: false,
        dualGender: true,
        fixedGender: -1,
        formInfo: [
          {
            index: 0,
            abilities: [choice(0), choice(1), choice(2)],
            fixedGender: -1,
          },
        ],
      },
      {
        species: 29,
        forms: [choice(0)],
        formSelectable: false,
        dualGender: false,
        fixedGender: 1,
        formInfo: [
          {
            index: 0,
            abilities: [choice(0), choice(1), choice(2)],
            fixedGender: -1,
          },
        ],
      },
      {
        species: 678,
        forms: [choice(0), choice(1)],
        formSelectable: true,
        dualGender: true,
        fixedGender: -1,
        formInfo: [
          {
            index: 0,
            abilities: [choice(0), choice(1), choice(2)],
            fixedGender: 0,
          },
          {
            index: 1,
            abilities: [choice(0), choice(1), choice(2)],
            fixedGender: 1,
          },
        ],
      },
    ],
    rawHex: "A6".repeat(0x7ad0),
  };
}
describe("ORAS secret bases", () => {
  it("routes only ORAS", () => {
    expect(supportsSecretBase6("SAV6AO")).toBe(true);
    for (const f of ["SAV6XY", "SAV6AODemo", "SAV3E", "SAV7SM"])
      expect(supportsSecretBase6(f)).toBe(false);
  });
  it("matches primitive property conversion bounds including signed hex values", () => {
    const c = catalog(),
      byte = c.bases[0].properties[2],
      signed = c.bases[0].properties[1];
    for (const v of ["0", "255", "0xFF"])
      expect(sb6PropertyValid(byte, v)).toBe(true);
    for (const v of ["-1", "256", "0x100", "", "1.5"])
      expect(sb6PropertyValid(byte, v)).toBe(false);
    for (const v of ["-2147483648", "2147483647", "0xFFFFFFFF"])
      expect(sb6PropertyValid(signed, v)).toBe(true);
    expect(sb6PropertyValid(signed, "2147483648")).toBe(false);
    expect(sb6PropertyValid(signed, "0x100000000")).toBe(false);
  });
  it("preserves raw property text for Core truncation and enum conversion", () => {
    const c = catalog(),
      text = "A".repeat(32);
    expect(
      sb6Patch(c, 0, "property", [{ id: "TrainerName", value: text }])
        .fields?.[0].value,
    ).toBe(text);
    expect(sb6PropertyValid(c.bases[0].properties[4], "Gold")).toBe(true);
    expect(sb6PropertyValid(c.bases[0].properties[4], "-1")).toBe(true);
    expect(() =>
      sb6Patch(c, 0, "property", [{ id: "Language", value: "1" }]),
    ).toThrow();
    expect(() =>
      sb6Patch(c, 0, "property", [{ id: "IsEmpty", value: "1" }]),
    ).toThrow();
  });
  it("supports every placement slot, the -1 sentinel and preserves read-only parameters", () => {
    const c = catalog();
    for (const index of [0, 27])
      expect(
        sb6Patch(
          c,
          0,
          "placement",
          [
            { id: "Good", value: "-1" },
            { id: "X", value: "65535" },
            { id: "Rotation", value: "255" },
          ],
          index,
        ).placement,
      ).toBe(index);
    for (const [id, value] of [
      ["Good", "-2"],
      ["X", "65536"],
      ["Rotation", "256"],
      ["Param1", "0"],
    ])
      expect(() => sb6Patch(c, 0, "placement", [{ id, value }], 0)).toThrow();
    expect(() =>
      sb6Patch(c, 0, "placement", [{ id: "X", value: "0" }], 28),
    ).toThrow();
  });
  it("uses source numeric mask widths, explicit blank rejection and source conversion endpoints", () => {
    const c = catalog();
    for (const [id, value] of [
      ["IV_HP", "99"],
      ["IV_HP", "1_"],
      ["EV_HP", "999"],
      ["Level", "0"],
      ["Friendship", "255"],
      ["Ec", ""],
    ])
      expect(sb6Patch(c, 1, "member", [{ id, value }], 0).fields).toEqual([
        { id, value },
      ]);
    for (const [id, value] of [
      ["IV_HP", "255"],
      ["IV_HP", ""],
      ["EV_HP", "1 2"],
      ["Level", "256"],
      ["PP1", "4"],
      ["IsEgg", "0"],
    ])
      expect(() => sb6Patch(c, 1, "member", [{ id, value }], 0)).toThrow();
    expect(() =>
      sb6Patch(c, 0, "member", [{ id: "Level", value: "1" }], 0),
    ).toThrow();
  });
  it("derives source form, ability and gender choices from the entire draft", () => {
    const c = catalog(),
      p = c.bases[1].pokemon[0];
    expect(
      sb6Choices(c, p, "Gender", { Species: "29" })?.map((c) => c.id),
    ).toEqual([1]);
    expect(
      sb6Choices(c, p, "Gender", { Species: "678", Form: "1" })?.map(
        (c) => c.id,
      ),
    ).toEqual([1]);
    expect(
      sb6Choices(c, p, "AbilitySlot", { Species: "678", Form: "1" })?.map(
        (c) => c.id,
      ),
    ).toEqual([0, 1, 2]);
    expect(() =>
      sb6Patch(
        c,
        1,
        "member",
        [
          { id: "Species", value: "678" },
          { id: "Form", value: "1" },
          { id: "Gender", value: "0" },
        ],
        0,
      ),
    ).toThrow();
  });
  it("keeps full unsigned captured-record values for Core signed conversion", () => {
    const c = catalog();
    for (const v of ["0", "999999999", "2147483648", "4294967295"])
      expect(sb6Record(c, v).capturedRecord).toBe(v);
    for (const v of ["-1", "4294967296", "", "1e3"])
      expect(() => sb6Record(c, v)).toThrow();
  });
  it("imports exactly the two source sb6 layouts without altering bytes", () => {
    const c = catalog();
    for (const size of [784, 992]) {
      const data = new Uint8Array(size).fill(0x35),
        original = data.slice(),
        request = sb6File(c, 1, data);
      expect(atob(request.dataBase64!).length).toBe(size);
      expect(data).toEqual(original);
    }
    for (const size of [0, 783, 785, 991, 993])
      expect(() => sb6File(c, 0, new Uint8Array(size))).toThrow();
  });
  it("protects own-base deletion and explicit global batch targeting", () => {
    const c = catalog();
    expect(() => sb6Command(c, "delete", 0)).toThrow();
    expect(sb6Command(c, "delete", 1).base).toBe(1);
    expect(sb6Command(c, "goods").base).toBeUndefined();
    expect(() => sb6Command(c, "goods", 0)).toThrow();
    expect(() => sb6Command({ ...c, canEdit: false }, "goods")).toThrow();
  });
  it("separates source SaveCurrent export from record submission and rejects unreadable slots", () => {
    const c = catalog();
    expect(sb6Window(c, "resave", 0, 0)).toEqual({
      action: "resave",
      sourceHash: c.sourceHash,
      base: 0,
      placement: 0,
    });
    const negative = { ...c, capturedRecord: -1 };
    expect(() => sb6Window(negative, "resave", 0, 0)).toThrow();
    expect(sb6Window(negative, "export", 0, 0).action).toBe("export");
    const p = c.bases[1].pokemon[0];
    p.fields.find((f) => f.id === "PP1")!.value = "4";
    expect(() => sb6Window(c, "resave", 1, 0, 0)).toThrow();
  });
  it("requires complete source and target hashes for confirmation", () => {
    const c = catalog(),
      p: Sb6Preview = {
        request: {
          action: "goods",
          sourceHash: c.sourceHash,
          targetHash: "B".repeat(64),
        },
        result: { ...c, sourceHash: "B".repeat(64) },
        changedOffsets: [42],
      };
    expect(sb6Frozen(c, p)).toBe(p.request);
    expect(() =>
      sb6Frozen(c, {
        ...p,
        result: { ...p.result, sourceHash: "C".repeat(64) },
      }),
    ).toThrow();
    expect(() =>
      sb6Frozen(c, { ...p, request: { ...p.request, targetHash: "short" } }),
    ).toThrow();
    expect(() =>
      sb6Patch(c, 0, "property", [
        { id: "IsNew", value: "1" },
        { id: "IsNew", value: "0" },
      ]),
    ).toThrow();
  });
  it("localizes every field and all new error routes", () => {
    for (const lang of ["zh", "en", "ja"] as const) {
      const w = sb6Words[lang];
      for (const id of [
        "TrainerName",
        "SayConfettiBall",
        "IV_SPD",
        "EV_SPE",
        "Move4",
        "PP4",
      ])
        expect(sb6Label(id, w)).not.toBe(id);
      expect(
        localizeSaveError(
          "SecretBase6: Invalid import data.",
          saveEditorResources[lang],
        ),
      ).toBe(w.invalid);
      expect(
        localizeSaveError(
          "SecretBase6 preview target is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(w.stale);
    }
  });
});
