import { describe, it, expect } from "vitest";
import {
  supportsPokeathlon4,
  ath4Number,
  ath4Id,
  ath4Pid,
  ath4Changed,
  ath4Batch,
  ath4PokemonPatch,
  ath4TrainerPatch,
  ath4PokemonDirty,
  ath4TrainerDirty,
  ath4Words,
  pokeathlon4Words,
  type Pokeathlon4Catalog,
  type Ath4Pokemon,
  type Ath4Trainer,
} from "./pokeathlon4";
import { ath4Labels } from "./pokeathlon4Labels";
const text = { zh: "测试", en: "Test", ja: "テスト" };
const catalog = (): Pokeathlon4Catalog => ({
  canEdit: true,
  sourceHash: "A".repeat(64),
  points: 0,
  dailyFlags: 0,
  cardFlags: 0,
  medals: Array<number>(493).fill(255),
  courses: [],
  personal: [],
  connections: [],
  counters: [],
  best: [],
  totalFirst: 0,
  globalScore: 0,
  trophies: 0,
  fameLevel: 0,
  speciesChoices: [0, 25, 201].map((id) => ({
    id,
    name: text,
    forms: Array.from({ length: id === 201 ? 28 : 1 }, (_, id) => ({
      id,
      name: text,
      sprite: "b_25",
      femaleSprite: "b_25",
    })),
  })),
  languageChoices: [0, 1, 2, 3, 4, 5, 7, 8].map((id) => ({ id, name: text })),
  cardChoices: [],
  cardStats: [],
});
const pokemon = (): Ath4Pokemon => ({
  species: 25,
  form: 0,
  gender: 0,
  shiny: false,
  pid: "FFFFFFFF",
  tid: 65535,
  sid: 123,
  sprite: "b_25",
});
const trainer = (): Ath4Trainer => ({
  name: "ABC",
  nameHex: "41".repeat(16),
  tid: 65535,
  sid: 1,
  language: 2,
});
const draft = (p: Ath4Pokemon | Ath4Trainer) =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)]));
describe("HGSS Pokéathlon workspace", () => {
  it("treats equivalent ID padding and PID casing as unchanged bytes", () => {
    const c = catalog(),
      p = pokemon(),
      pd = { ...draft(p), sid: "00123", pid: "ffffffff" };
    expect(ath4PokemonDirty(p, pd, true)).toBe(false);
    expect(ath4PokemonPatch(c, p, { ...pd, shiny: "true" }, true)).toEqual({
      shiny: true,
    });
    const t = trainer(),
      td = { ...draft(t), sid: "00001", nameHex: t.nameHex.toLowerCase() };
    expect(ath4TrainerDirty(t, td, true)).toBe(false);
    expect(ath4TrainerPatch(c, t, { ...td, language: "1" }, true)).toEqual({
      language: 1,
    });
  });
  it("uses three source label sets and descriptive trainer fields", () => {
    expect(supportsPokeathlon4("SAV4HGSS")).toBe(true);
    expect(supportsPokeathlon4("SAV4Pt")).toBe(false);
    for (const lang of ["zh", "en", "ja"] as const) {
      expect(pokeathlon4Words[lang].title).toBeTruthy();
      expect(Object.keys(ath4Words[lang]).sort()).toEqual(
        Object.keys(ath4Words.en).sort(),
      );
      for (const key of [
        "Tab_General",
        "Tab_Medals",
        "Tab_Counters",
        "Tab_Best",
        "Tab_Courses",
        "Tab_SelfEvent",
        "Tab_Connection",
        "L_TimeSpent",
        "L_CourseScoreMax",
        "B_MedalsGiveAll",
        "B_MedalsClearAll",
      ]) {
        expect(ath4Labels[lang][`SAV_Pokeathlon4.${key}`]).toBeTruthy();
      }
      expect(ath4Words[lang].name).not.toBe("OT");
    }
    expect(ath4Labels.zh["PokeathlonEvent4.HurdleDash"]).toBe("跨栏冲刺");
  });
  it("distinguishes bounded numeric controls from source ID/PID parsing", () => {
    expect(ath4Number("65535", 65535)).toBe(65535);
    for (const v of ["", "-1", "65536", "1.5", " 1", "0x10"])
      expect(() => ath4Number(v, 65535)).toThrow();
    for (const v of ["", " ", "-1", "65536", "1.5", "hello"])
      expect(ath4Id(v)).toBe(0);
    expect(ath4Id(" +00123 ")).toBe(123);
    expect(ath4Id("65535")).toBe(65535);
    expect(ath4Pid("ZG12H")).toBe(0x12);
    expect(ath4Pid("FFFFFFFF")).toBe(4294967295);
    expect(ath4Pid("")).toBe(0);
    expect(ath4Pid("123456789")).toBe(0);
  });
  it("preserves oversized old numbers and emits only explicit changes", () => {
    expect(ath4Changed([4294967295, 1], ["4294967295", "0"], () => 1)).toEqual([
      { id: 1, value: 0 },
    ]);
    expect(() =>
      ath4Changed([4294967295], ["4294967294"], () => 99999),
    ).toThrow();
    expect(() => ath4Changed([0], ["0"], () => 1)).toThrow();
    expect(() => ath4Changed([0], ["0", "1"], () => 1)).toThrow();
  });
  it("keeps identity flags independent and unknown original pairs untouched", () => {
    const c = catalog(),
      p = pokemon();
    expect(
      ath4PokemonPatch(c, p, { ...draft(p), shiny: "true" }, true),
    ).toEqual({ shiny: true });
    expect(
      ath4PokemonPatch(c, p, { ...draft(p), species: "201", form: "27" }, true),
    ).toEqual({ species: 201, form: 27 });
    expect(() =>
      ath4PokemonPatch(c, p, { ...draft(p), species: "201", form: "28" }, true),
    ).toThrow();
    const old = { ...p, species: 511, form: 31, gender: 3 };
    expect(ath4PokemonPatch(c, old, { ...draft(old), tid: "1" }, true)).toEqual(
      { tid: 1 },
    );
    expect(() =>
      ath4PokemonPatch(c, old, { ...draft(old), gender: "0" }, true),
    ).toThrow();
    expect(() =>
      ath4PokemonPatch(c, p, { ...draft(p), shiny: "true" }, false),
    ).toThrow();
    expect(() =>
      ath4PokemonPatch(
        { ...c, canEdit: false },
        p,
        { ...draft(p), shiny: "true" },
        true,
      ),
    ).toThrow();
  });
  it("keeps trainer bytes and unknown languages unless explicitly edited", () => {
    const c = catalog(),
      t = { ...trainer(), language: 255 };
    expect(ath4TrainerPatch(c, t, { ...draft(t), tid: "0" }, false)).toEqual({
      tid: 0,
    });
    expect(
      ath4TrainerPatch(c, t, { ...draft(t), language: "1" }, false),
    ).toEqual({ language: 1 });
    expect(
      ath4TrainerPatch(c, t, { ...draft(t), name: "ABCDEFG" }, false),
    ).toEqual({ name: "ABCDEFG" });
    expect(() =>
      ath4TrainerPatch(c, t, { ...draft(t), name: "ABCDEFGH" }, false),
    ).toThrow();
    expect(
      ath4TrainerPatch(c, t, { ...draft(t), nameHex: "FF".repeat(16) }, true),
    ).toEqual({ nameHex: "FF".repeat(16) });
    expect(() =>
      ath4TrainerPatch(c, t, { ...draft(t), nameHex: "00" }, true),
    ).toThrow();
    expect(() =>
      ath4TrainerPatch(c, t, { ...draft(t), language: "6" }, false),
    ).toThrow();
  });
  it("freezes all-species medal plans and blocks readonly writes", () => {
    const c = catalog();
    expect(ath4Batch(c, true)).toEqual({
      action: "medalsBatch",
      enabled: true,
      sourceHash: c.sourceHash,
    });
    expect(c.medals.every((v) => v === 255)).toBe(true);
    expect(() => ath4Batch({ ...c, canEdit: false }, false)).toThrow();
    expect(() => ath4Batch({ ...c, sourceHash: "old" }, false)).toThrow();
    expect(() => ath4Batch({ ...c, medals: [1] }, false)).toThrow();
  });
});
