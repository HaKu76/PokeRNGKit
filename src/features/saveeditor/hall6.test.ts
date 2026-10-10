import { describe, it, expect } from "vitest";
import {
  hall6Action,
  hall6Frozen,
  hall6Patch,
  hall6Trash,
  hall6Value,
  supportsHall6,
  type Hall6Catalog,
  type Hall6Member,
  type Hall6Preview,
} from "./hall6";
import { localizeSaveError, saveEditorResources } from "./locales";
import { hall6Words } from "./hall6Words";
const name = { zh: "名称", en: "Name", ja: "名前" },
  hash = "A".repeat(64),
  target = "B".repeat(64),
  choices = [
    { id: 0, name },
    { id: 1, name },
    { id: 25, name },
  ];
const member = (index: number): Hall6Member => ({
  index,
  editable: true,
  species: 25,
  heldItem: 0,
  moves: [1, 1, 1, 1],
  ec: "00000000",
  tid: 1,
  sid: 2,
  form: 0,
  gender: 0,
  level: 50,
  shiny: false,
  nicknamed: true,
  nickname: "Pika",
  trainerName: "Trainer",
  trainerGender: 0,
  sprite: "b_25",
  rawHex: "A6".repeat(72),
  trashHex: "A6".repeat(26),
  forms: [{ id: 0, name }],
  dualGender: true,
});
const c: Hall6Catalog = {
  canEdit: true,
  sourceHash: hash,
  teams: Array.from({ length: 16 }, (_, index) => ({
    index,
    hasData: true,
    clearIndex: 1024,
    date: "2001-02-03",
    dateEditable: true,
    year: 2001,
    month: 2,
    day: 3,
    rawIndex: 1,
    visibleMembers: 6,
    members: Array.from({ length: 6 }, (_, i) => member(i)),
    rawHex: "A6".repeat(436),
  })),
  species: choices,
  items: choices,
  moves: choices,
  trashSpecies: choices,
  trashLanguages: [{ id: 2, name }],
  specialChars: [0xe08d],
  rawHex: "A6",
  speciesInfo: [
    {
      id: 25,
      forms: [{ id: 0, name }],
      dualGender: true,
      formSelectable: false,
    },
    {
      id: 1,
      forms: [{ id: 0, name }],
      dualGender: false,
      formSelectable: false,
    },
  ],
};
describe("Gen6 Hall of Fame plans", () => {
  it("preserves exact real team/member targets and unspecified fields", () => {
    const e = hall6Patch(c, 15, 5, [{ id: "Tid", value: "" }]);
    expect(e).toEqual({
      action: "patch",
      sourceHash: hash,
      team: 15,
      member: 5,
      fields: [{ id: "Tid", value: "" }],
    });
    expect(hall6Value(c.teams[0], member(0), "ClearIndex")).toBe("1024");
  });
  it("keeps source mask width with empty input and core clamping", () => {
    for (const [id, value] of [
      ["Level", "999"],
      ["ClearIndex", "999"],
      ["Tid", "99999"],
      ["Sid", " _1 "],
      ["Level", ""],
    ])
      expect(() => hall6Patch(c, 0, 0, [{ id, value }])).not.toThrow();
    for (const [id, value] of [
      ["Tid", "123456"],
      ["Level", "1000"],
      ["Level", "-1"],
      ["ClearIndex", "abc"],
    ])
      expect(() => hall6Patch(c, 0, 0, [{ id, value }])).toThrow();
  });
  it("enforces source text/hex capacities while leaving EC parsing to Core", () => {
    expect(() =>
      hall6Patch(c, 0, 0, [{ id: "Ec", value: "x1A!b?" }]),
    ).not.toThrow();
    expect(() =>
      hall6Patch(c, 0, 0, [{ id: "Nickname", value: "x".repeat(12) }]),
    ).not.toThrow();
    expect(() =>
      hall6Patch(c, 0, 0, [{ id: "Nickname", value: "x".repeat(13) }]),
    ).toThrow();
    expect(() =>
      hall6Patch(c, 0, 0, [{ id: "Ec", value: "x".repeat(9) }]),
    ).toThrow();
  });
  it("validates actual dates 2000 through 2050 including leap days", () => {
    for (const date of ["2000-02-29", "2050-12-31"])
      expect(() =>
        hall6Patch(c, 0, 0, [{ id: "Date", value: date }]),
      ).not.toThrow();
    for (const date of [
      "1999-12-31",
      "2051-01-01",
      "2001-02-29",
      "2000-00-01",
      "bad",
    ])
      expect(() =>
        hall6Patch(c, 0, 0, [{ id: "Date", value: date }]),
      ).toThrow();
  });
  it("uses filtered choices and cross-field nickname/gender/form constraints", () => {
    expect(() =>
      hall6Patch(c, 0, 0, [{ id: "Species", value: "65535" }]),
    ).toThrow();
    expect(() => hall6Patch(c, 0, 0, [{ id: "Form", value: "31" }])).toThrow();
    expect(() =>
      hall6Patch(c, 0, 0, [
        { id: "Species", value: "1" },
        { id: "Gender", value: "1" },
      ]),
    ).toThrow();
    expect(() =>
      hall6Patch(c, 0, 0, [
        { id: "Nicknamed", value: "0" },
        { id: "Nickname", value: "New" },
      ]),
    ).toThrow();
    expect(() =>
      hall6Patch(c, 0, 0, [
        { id: "Nicknamed", value: "1" },
        { id: "Nickname", value: "New" },
      ]),
    ).not.toThrow();
  });
  it("protects the first clear and source-disabled members", () => {
    expect(() => hall6Action(c, 0, "delete")).toThrow();
    expect(hall6Action(c, 15, "delete", 5)).toEqual({
      action: "delete",
      sourceHash: hash,
      team: 15,
    });
    expect(() => hall6Action(c, 0, "resave")).toThrow();
    const readonly = {
      ...c,
      teams: c.teams.map((t, i) =>
        i
          ? t
          : {
              ...t,
              members: t.members.map((p) => ({ ...p, editable: false })),
            },
      ),
    };
    expect(() =>
      hall6Patch(readonly, 0, 0, [{ id: "Tid", value: "1" }]),
    ).toThrow();
    for (const team of [-1, 16, 0.5])
      expect(() =>
        hall6Patch(c, team, 0, [{ id: "Tid", value: "1" }]),
      ).toThrow();
  });
  it("requires the full 26-byte trash region and source layer choices", () => {
    expect(
      hall6Trash(c, 0, 0, { action: "hex", hex: "FF".repeat(26) }).trash?.hex,
    ).toHaveLength(52);
    for (const hex of ["FF".repeat(24), "GG".repeat(26), ""])
      expect(() => hall6Trash(c, 0, 0, { action: "hex", hex })).toThrow();
    for (const generation of [0, 6, 100])
      expect(() =>
        hall6Trash(c, 0, 0, {
          action: "layer",
          species: 25,
          language: 2,
          generation,
          uiLanguage: "zh",
        }),
      ).not.toThrow();
    for (const generation of [-1, 101, 0.5])
      expect(() =>
        hall6Trash(c, 0, 0, {
          action: "layer",
          species: 25,
          language: 2,
          generation,
          uiLanguage: "zh",
        }),
      ).toThrow();
  });
  it("rejects duplicate fields, false catalogs and stale full-file previews", () => {
    expect(() => hall6Patch(c, 0, 0, [])).toThrow();
    expect(() =>
      hall6Patch(c, 0, 0, [
        { id: "Tid", value: "1" },
        { id: "Tid", value: "2" },
      ]),
    ).toThrow();
    expect(() =>
      hall6Patch({ ...c, canEdit: false }, 0, 0, [{ id: "Tid", value: "1" }]),
    ).toThrow();
    const p: Hall6Preview = {
      request: { ...hall6Action(c, 0, "resave", 0), targetHash: target },
      result: { ...c, sourceHash: target },
      changedOffsets: [1],
    };
    expect(hall6Frozen(c, p)).toBe(p.request);
    expect(() => hall6Frozen(c, { ...p, result: c })).toThrow();
    expect(() =>
      hall6Frozen(c, { ...p, request: { ...p.request, targetHash: "bad" } }),
    ).toThrow();
  });
  it("limits formats and localizes errors without OT-only Chinese labels", () => {
    expect(supportsHall6("SAV6XY")).toBe(true);
    expect(supportsHall6("SAV6AO")).toBe(true);
    expect(supportsHall6("SAV7SM")).toBe(false);
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(
        localizeSaveError("Hall6: invalid position", saveEditorResources[lang]),
      ).toBe(hall6Words[lang].invalid);
      expect(
        localizeSaveError("Hall6 preview is stale", saveEditorResources[lang]),
      ).toBe(hall6Words[lang].stale);
    }
    expect(hall6Words.zh.fields.TrainerName).toBe("训练家姓名");
  });
});
