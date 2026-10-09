import { describe, it, expect } from "vitest";
import {
  roamer3Draft,
  roamer3Dirty,
  roamer3Edit,
  roamer3Words,
  supportsRoamer3,
  type Roamer3Catalog,
} from "./roamer3";
const c: Roamer3Catalog = {
  canEdit: true,
  species: 381,
  pid: "12345678",
  ivs: [31, 30, 29, 28, 27, 26],
  encounterIvs: [31, 6, 0, 0, 0, 0],
  glitched: true,
  level: 255,
  hp: 65535,
  active: false,
  shiny: false,
  sprite: "b_381",
  speciesChoices: [],
};
describe("Gen3 roamer fields", () => {
  it("preserves abnormal level and original active bytes through sparse patches", () => {
    const d = roamer3Draft(c);
    expect(roamer3Dirty(c, d)).toBe(false);
    expect(roamer3Edit(c, { ...d, hp: "0" })).toEqual({ hp: 0 });
    expect(roamer3Edit(c, { ...d, active: true })).toEqual({ active: true });
    expect(roamer3Edit(c, { ...d, level: "100" })).toEqual({ level: 100 });
    expect(() => roamer3Edit(c, { ...d, level: "254" })).toThrow();
  });
  it("retains per-IV changes including blank zero and upstream 99 input", () => {
    const d = roamer3Draft(c);
    expect(
      roamer3Edit(c, { ...d, ivs: ["", "99", ...d.ivs.slice(2)] }),
    ).toEqual({ ivs: [0, 99, null, null, null, null] });
    for (const v of ["100", "-1", "1e1", "1.0", "a"]) {
      expect(() =>
        roamer3Edit(c, { ...d, ivs: [v, ...d.ivs.slice(1)] }),
      ).toThrow();
    }
    expect(() => roamer3Edit(c, { ...d, ivs: [] })).toThrow();
  });
  it("normalizes PID while rejecting out-of-range fields and readonly saves", () => {
    const d = roamer3Draft(c);
    expect(roamer3Edit(c, { ...d, pid: "" })).toEqual({ pid: 0 });
    expect(roamer3Edit(c, { ...d, pid: "FFFFFFFF" })).toEqual({
      pid: 4294967295,
    });
    expect(roamer3Edit(c, { ...d, pid: "Az10" })).toEqual({ pid: 0xa10 });
    for (const hp of ["", "65536", "-1", "1e2"])
      expect(() => roamer3Edit(c, { ...d, hp })).toThrow();
    expect(() => roamer3Edit(c, { ...d, species: 387 })).toThrow();
    expect(() => roamer3Edit(c, { ...d, pid: "FFFFFFFFF" })).toThrow();
    expect(() =>
      roamer3Edit({ ...c, canEdit: false }, { ...d, hp: "0" }),
    ).toThrow();
  });
  it("keeps three-language controls and limits formats to Gen3 main games", () => {
    for (const f of ["SAV3RS", "SAV3E", "SAV3FRLG"])
      expect(supportsRoamer3(f)).toBe(true);
    for (const f of ["SAV6XY", "SAV3Colosseum", "SAV1"])
      expect(supportsRoamer3(f)).toBe(false);
    for (const w of Object.values(roamer3Words)) {
      expect(w.ivs).toHaveLength(6);
      expect(w.ivNote).toContain("31");
    }
  });
});
