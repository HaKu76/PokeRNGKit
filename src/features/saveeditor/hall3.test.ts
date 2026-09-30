import { describe, it, expect } from "vitest";
import {
  hall3Draft,
  hall3Dirty,
  hall3Id,
  hall3Pid,
  hall3MemberEdit,
  supportsHall3,
  hall3Words,
  type Hall3Catalog,
} from "./hall3";
const m = {
  species: 25,
  speciesInternal: 25,
  level: 127,
  tid: 123,
  sid: 456,
  pid: "FFFFFFFF",
  nickname: "PIKA",
  nicknameHex: "010203040506070809FF",
  shiny: false,
  form: 0,
  sprite: "b_25",
};
const c: Hall3Catalog = {
  available: true,
  canEdit: true,
  version: 1,
  versions: [],
  teams: [[m]],
  speciesChoices: [],
};
describe("Gen3 Hall of Fame", () => {
  it("matches upstream ID and hexadecimal cleanup including empty values", () => {
    expect(hall3Id("")).toBe(0);
    expect(hall3Id("9a999")).toBe(9999);
    expect(hall3Id("99999")).toBe(65535);
    expect(hall3Pid("")).toBe(0);
    expect(hall3Pid("aZ01")).toBe(0xa01);
    expect(hall3Pid("FFFFFFFF")).toBe(4294967295);
  });
  it("preserves unchanged nonstandard levels and nickname bytes", () => {
    const d = hall3Draft(m);
    expect(hall3Dirty(m, d)).toBe(false);
    expect(hall3MemberEdit(c, 0, 0, { ...d, tid: "" }).fields).toEqual({
      tid: 0,
    });
    expect(hall3MemberEdit(c, 0, 0, { ...d, level: "255" }).fields).toEqual({
      level: 255,
    });
    expect(hall3MemberEdit(c, 0, 0, { ...d, species: 0 }).fields).toEqual({
      species: 0,
    });
    expect(
      hall3Dirty(m, {
        ...d,
        mode: "bytes",
        nicknameHex: d.nicknameHex.toLowerCase(),
      }),
    ).toBe(false);
  });
  it("rejects invalid edits and supports exact raw nickname replacement", () => {
    const d = hall3Draft(m);
    for (const level of ["", "256", "-1", "1e2", "1.0"])
      expect(() => hall3MemberEdit(c, 0, 0, { ...d, level })).toThrow();
    for (const nicknameHex of ["FF", "G".repeat(20)])
      expect(() =>
        hall3MemberEdit(c, 0, 0, { ...d, mode: "bytes", nicknameHex }),
      ).toThrow();
    expect(
      hall3MemberEdit(c, 0, 0, {
        ...d,
        mode: "bytes",
        nicknameHex: "aa".repeat(10),
      }).fields,
    ).toEqual({ nicknameHex: "AA".repeat(10) });
    expect(() =>
      hall3MemberEdit({ ...c, canEdit: false }, 0, 0, { ...d, tid: "0" }),
    ).toThrow();
    expect(() => hall3MemberEdit(c, 50, 0, d)).toThrow();
    expect(() =>
      hall3MemberEdit(c, 0, 0, { ...d, pid: "FFFFFFFFF" }),
    ).toThrow();
  });
  it("restricts formats and exposes localized scopes", () => {
    for (const f of ["SAV3RS", "SAV3E", "SAV3FRLG"])
      expect(supportsHall3(f)).toBe(true);
    for (const f of ["SAV1", "SAV3Colosseum", "SAV4DP"])
      expect(supportsHall3(f)).toBe(false);
    for (const w of Object.values(hall3Words)) {
      expect(w.all).toContain("50");
      expect(w.levelNote).toContain("100");
    }
  });
});
