import { describe, it, expect } from "vitest";
import {
  misc5Action,
  misc5Frozen,
  misc5Import,
  misc5Maximum,
  misc5Patch,
  supportsMisc5,
  type Misc5Catalog,
  type Misc5Preview,
} from "./misc5";
import { misc5Labels } from "./misc5Labels";
import { misc5Words } from "./misc5Words";
import { localizeSaveError, saveEditorResources } from "./locales";
const hash = "A".repeat(64),
  target = "B".repeat(64),
  name = { zh: "名称", en: "Name", ja: "名前" };
const c: Misc5Catalog = {
  canEdit: true,
  sourceHash: hash,
  fields: [
    {
      id: "whiteLevel",
      group: "entralink",
      name,
      value: 0,
      minimum: 0,
      maximum: 999,
      boolean: false,
      choices: null,
      rawHex: null,
    },
    {
      id: "blackLevel",
      group: "entralink",
      name,
      value: 65535,
      minimum: 0,
      maximum: 999,
      boolean: false,
      choices: null,
      rawHex: null,
    },
    {
      id: "whiteExp",
      group: "entralink",
      name,
      value: 49,
      minimum: 0,
      maximum: 4,
      boolean: false,
      choices: null,
      rawHex: null,
    },
    {
      id: "blackExp",
      group: "entralink",
      name,
      value: 49,
      minimum: 0,
      maximum: 49,
      boolean: false,
      choices: null,
      rawHex: null,
    },
    {
      id: "record32_0",
      group: "records",
      name,
      value: 0xffffffff,
      minimum: 0,
      maximum: 0xffffffff,
      boolean: false,
      choices: null,
      rawHex: null,
    },
    {
      id: "power0",
      group: "entralink",
      name,
      value: 255,
      minimum: 0,
      maximum: 255,
      boolean: false,
      choices: [{ id: 48, name }],
      rawHex: null,
    },
    {
      id: "forest9",
      group: "forest",
      name,
      value: 0,
      minimum: 0,
      maximum: 1,
      boolean: true,
      choices: null,
      rawHex: null,
    },
  ],
  missions: Array.from({ length: 45 }, (_, index) => ({
    index,
    name,
    score: 16383,
    total: 16383,
    level: 6,
    isNew: true,
    unlocked: false,
    raw: 0xffffffff,
  })),
  forest: Array.from({ length: 530 }, (_, index) => ({
    index,
    area: 1,
    species: 0,
    move: 0,
    gender: 3,
    form: 63,
    animation: 7,
    raw: 0xe0000400,
    sprite: "b_0",
    forms: [],
    genders: [0],
  })),
  speciesChoices: [
    { id: 0, name },
    { id: 25, name },
  ],
  moveChoices: [
    { id: 0, name },
    { id: 85, name },
  ],
  randomCandidates: 578,
  groups: ["entralink", "forest", "records"],
  rawHex: "A5",
  forestChoices: [
    { species: 0, forms: [{ id: 0, name }], genders: [0] },
    { species: 25, forms: [{ id: 0, name }], genders: [0, 1] },
  ],
  experienceLimits: Array.from({ length: 1000 }, (_, i) =>
    i < 9 ? i * 5 + 4 : 49,
  ),
  canExportFc: false,
};
describe("Misc5 source input and frozen preview contract", () => {
  it("uses only BW/B2W2 formats and pinned localized labels", () => {
    expect(supportsMisc5("SAV5BW")).toBe(true);
    expect(supportsMisc5("SAV5B2W2")).toBe(true);
    expect(supportsMisc5("SAV6XY")).toBe(false);
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(misc5Labels[lang].title.length).toBeGreaterThan(0);
      expect(
        localizeSaveError("Misc5: Invalid field.", saveEditorResources[lang]),
      ).toBe(misc5Words[lang].invalid);
      expect(
        localizeSaveError(
          "Misc5 preview target is stale.",
          saveEditorResources[lang],
        ),
      ).toBe(misc5Words[lang].stale);
    }
  });
  it("retains unusual old fields while validating only explicitly edited values", () => {
    expect(
      misc5Patch(c, { fields: [{ id: "forest9", value: 1 }] }).fields,
    ).toEqual([{ id: "forest9", value: 1 }]);
    expect(c.fields.find((f) => f.id === "power0")!.value).toBe(255);
    expect(
      misc5Patch(c, { fields: [{ id: "record32_0", value: 0xffffffff }] })
        .fields?.[0].value,
    ).toBe(0xffffffff);
    for (const value of [-1, 4294967296, 1.5])
      expect(() =>
        misc5Patch(c, { fields: [{ id: "record32_0", value }] }),
      ).toThrow();
    expect(() =>
      misc5Patch(c, { fields: [{ id: "power0", value: 255 }] }),
    ).toThrow();
    expect(
      misc5Patch(c, { fields: [{ id: "power0", value: 48 }] }).fields?.[0]
        .value,
    ).toBe(48);
  });
  it("uses Core-provided experience limits for joint level changes, including old excessive black levels", () => {
    const f = c.fields.find((f) => f.id === "whiteExp")!,
      black = c.fields.find((f) => f.id === "blackExp")!;
    expect(misc5Maximum(c, f, [])).toBe(4);
    expect(misc5Maximum(c, f, [{ id: "whiteLevel", value: 9 }])).toBe(49);
    expect(misc5Maximum(c, black, [{ id: "whiteLevel", value: 9 }])).toBe(49);
    expect(
      misc5Patch(c, {
        fields: [
          { id: "whiteExp", value: 49 },
          { id: "whiteLevel", value: 9 },
        ],
      }).fields,
    ).toHaveLength(2);
    expect(() =>
      misc5Patch(c, { fields: [{ id: "whiteExp", value: 5 }] }),
    ).toThrow();
    expect(() =>
      misc5Patch(c, {
        fields: [
          { id: "blackExp", value: 20 },
          { id: "whiteLevel", value: 9 },
          { id: "blackLevel", value: 3 },
        ],
      }),
    ).toThrow();
  });
  it("validates all mission positions, score limits and source level choices", () => {
    for (const index of [0, 44])
      for (const level of [0, 1, 2, 3, 7])
        expect(
          misc5Patch(c, {
            missions: [{ index, score: 9999, total: 0, level, isNew: false }],
          }).missions?.[0].index,
        ).toBe(index);
    for (const missions of [
      [{ index: 45, score: 0 }],
      [{ index: 0, level: 4 }],
      [{ index: 0, total: 10000 }],
      [{ index: 0 }],
    ])
      expect(() => misc5Patch(c, { missions })).toThrow();
    expect(
      misc5Patch(c, { missions: [{ index: 0, isNew: false }] }).missions?.[0],
    ).toEqual({ index: 0, isNew: false });
  });
  it("preserves old forest fields and constrains new species-dependent choices", () => {
    expect(
      misc5Patch(c, { forest: [{ index: 529, animation: 0 }] }).forest?.[0],
    ).toEqual({ index: 529, animation: 0 });
    expect(
      misc5Patch(c, {
        forest: [{ index: 0, species: 25, move: 85, form: 0, gender: 1 }],
      }).forest?.[0].species,
    ).toBe(25);
    for (const forest of [
      [{ index: 530, animation: 0 }],
      [{ index: 0, species: 650 }],
      [{ index: 0, move: 86 }],
      [{ index: 0, gender: 3 }],
      [{ index: 0, species: 25, form: 1 }],
      [{ index: 0, animation: 8 }],
      [{ index: 0 }],
    ])
      expect(() => misc5Patch(c, { forest })).toThrow();
  });
  it("rejects empty and duplicate patches and format-incompatible bulk operations", () => {
    for (const parts of [
      {},
      { fields: [] },
      {
        fields: [
          { id: "forest9", value: 0 },
          { id: "forest9", value: 1 },
        ],
      },
      {
        missions: [
          { index: 0, score: 0 },
          { index: 0, score: 1 },
        ],
      },
      {
        forest: [
          { index: 0, animation: 0 },
          { index: 0, animation: 1 },
        ],
      },
    ])
      expect(() => misc5Patch(c, parts)).toThrow();
    expect(misc5Action(c, "giveKeys").action).toBe("giveKeys");
    expect(() =>
      misc5Action({ ...c, canExportFc: true }, "missionUnlockAll"),
    ).toThrow();
    expect(() =>
      misc5Action({ ...c, randomCandidates: 529 }, "forestRandom"),
    ).toThrow();
  });
  it("imports exactly 488 bytes only for BW", () => {
    const bw = { ...c, canExportFc: true };
    const bytes = Uint8Array.from({ length: 488 }, (_, i) => i);
    const e = misc5Import(bw, bytes);
    expect(
      Uint8Array.from(atob(e.dataBase64!), (v) => v.charCodeAt(0)),
    ).toEqual(bytes);
    for (const size of [0, 487, 489])
      expect(() => misc5Import(bw, new Uint8Array(size))).toThrow();
    expect(() => misc5Import(c, bytes)).toThrow();
  });
  it("requires exact source/target hashes and 530 unique valid frozen draws", () => {
    const p: Misc5Preview = {
      request: {
        action: "forestRandom",
        sourceHash: hash,
        targetHash: target,
        frozenForest: Array.from({ length: 530 }, (_, sourceIndex) => ({
          sourceIndex,
          raw: 0xffffffff,
        })),
      },
      result: { ...c, sourceHash: target },
      changedOffsets: [1],
    };
    expect(misc5Frozen(c, p)).toBe(p.request);
    for (const request of [
      { ...p.request, sourceHash: target },
      { ...p.request, targetHash: "bad" },
      { ...p.request, frozenForest: undefined },
      { ...p.request, frozenForest: p.request.frozenForest!.slice(1) },
      {
        ...p.request,
        frozenForest: p.request.frozenForest!.map(() => ({
          sourceIndex: 0,
          raw: 0,
        })),
      },
    ])
      expect(() => misc5Frozen(c, { ...p, request })).toThrow();
    expect(() => misc5Frozen({ ...c, canEdit: false }, p)).toThrow();
    expect(() =>
      misc5Frozen(c, { ...p, result: { ...p.result, sourceHash: hash } }),
    ).toThrow();
  });
});
