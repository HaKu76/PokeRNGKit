import { describe, it, expect } from "vitest";
import {
  supportsSecretBase3,
  base3Digits,
  base3Pid,
  base3TrainerDraft,
  base3MemberDraft,
  base3TrainerEdit,
  base3MemberEdit,
  base3FormQuery,
  base3Letters,
  secretBase3Words,
  type SecretBase3Catalog,
  type Base3Entry,
} from "./secretBase3";
const base = (): Base3Entry => ({
  slot: 19,
  name: "BASE",
  nameHex: "01020304050607",
  language: 2,
  location: 255,
  class: 4,
  tid: 65535,
  sid: 65535,
  gender: 1,
  times: 255,
  registry: 3,
  battled: true,
  members: Array.from({ length: 6 }, (_, slot) => ({
    slot,
    species: 201,
    rawSpecies: 201,
    pid: "12345678",
    heldItem: 65535,
    moves: [65535, 65535, 65535, 65535],
    level: 255,
    ev: 255,
    form: 0,
    sprite: "",
  })),
});
const catalog = (b: Base3Entry): SecretBase3Catalog => ({
  canEdit: true,
  bases: [b],
  speciesChoices: [0, 25, 201].map((id) => ({
    id,
    name: { zh: "", en: "", ja: "" },
  })),
  moveChoices: [0, 354].map((id) => ({ id, name: { zh: "", en: "", ja: "" } })),
  itemChoices: [0, 1].map((id) => ({ id, name: { zh: "", en: "", ja: "" } })),
});
describe("Gen3 secret bases", () => {
  it("uses actual physical slots and exact decimal/hex normalization", () => {
    expect(supportsSecretBase3("SAV3RS")).toBe(true);
    expect(supportsSecretBase3("SAV3E")).toBe(true);
    expect(supportsSecretBase3("SAV3FRLG")).toBe(false);
    expect(base3Digits("", 65535, 5)).toBe("0");
    expect(base3Digits("99999", 65535, 5)).toBe("65535");
    expect(base3Digits("999", 255, 3)).toBe("255");
    expect(base3Pid("")).toBe("0");
    expect(base3Pid("badcafe")).toBe("BADCAFE");
    expect(base3Pid("G")).toBe("FFFFFFFF");
  });
  it("preserves unselected registry bits and sends only changed trainer fields", () => {
    const b = base(),
      c = catalog(b),
      d = base3TrainerDraft(b);
    d.tid = "0";
    expect(base3TrainerEdit(c, b, d, "text")).toEqual({
      action: "trainer",
      base: 19,
      trainer: { tid: 0 },
    });
    d.registry = "1";
    expect(base3TrainerEdit(c, b, d, "text").action).toBe("trainer");
    d.name = "ABCDEFGH";
    expect(() => base3TrainerEdit(c, b, d, "text")).toThrow();
  });
  it("retains old fields and makes empty species an explicit full clear", () => {
    const b = base(),
      c = catalog(b),
      p = b.members[5],
      d = base3MemberDraft(p);
    d.pid = "0";
    expect(base3MemberEdit(c, b, p, d)).toEqual({
      action: "member",
      base: 19,
      member: 5,
      pokemon: { pid: 0 },
    });
    d.species = "0";
    expect(base3MemberEdit(c, b, p, d)).toEqual({
      action: "member",
      base: 19,
      member: 5,
      pokemon: { species: 0 },
    });
    d.species = "keep";
    d.level = "101";
    expect(() => base3MemberEdit(c, b, p, d)).toThrow();
  });
  it("uses whitelist choices and nonmutating form queries", () => {
    const b = base(),
      c = catalog(b),
      p = b.members[0],
      d = base3MemberDraft(p);
    d.item = "2";
    expect(() => base3MemberEdit(c, b, p, d)).toThrow();
    expect(base3FormQuery(c, b, p, "FFFFFFFF", 27)).toEqual({
      base: 19,
      member: 0,
      pid: 4294967295,
      form: 27,
    });
    expect(() => base3FormQuery(c, b, p, "0", 28)).toThrow();
    expect(() =>
      base3FormQuery({ ...c, canEdit: false }, b, p, "0", 0),
    ).toThrow();
    expect(base3Letters).toHaveLength(28);
    for (const w of Object.values(secretBase3Words)) {
      expect(w.classes).toHaveLength(5);
      expect(w.previewNote).toBeTruthy();
    }
  });
});
