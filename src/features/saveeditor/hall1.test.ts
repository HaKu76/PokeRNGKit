import { describe, expect, it } from "vitest";
import {
  hall1Byte,
  hall1Draft,
  hall1Dirty,
  hall1MemberEdit,
  hall1Words,
  supportsHall1,
  type Hall1Catalog,
} from "./hall1";
const catalog: Hall1Catalog = {
  count: 255,
  nicknameLength: 5,
  canEdit: true,
  speciesChoices: [],
  teams: [
    {
      count: 1,
      members: [
        {
          species: 25,
          speciesInternal: 84,
          level: 255,
          nickname: "ピカ",
          nicknameHex: "AAAABBBBBBBB",
          empty: false,
          defaultNickname: "ピカチュウ",
        },
      ],
    },
  ],
};
describe("Gen1 Hall of Fame editor", () => {
  it("keeps full byte ranges and rejects malformed numeric input", () => {
    for (const value of ["0", "49", "50", "255"])
      expect(hall1Byte(value)).toBe(Number(value));
    for (const value of ["", "256", "-1", "1.0", "1e2", "0x10", " 5", "0000"])
      expect(() => hall1Byte(value)).toThrow();
  });
  it("emits only changed fields and preserves unedited nickname bytes", () => {
    const d = hall1Draft(catalog.teams[0].members[0]);
    expect(
      hall1Dirty(catalog.teams[0].members[0], { ...d, mode: "text" }),
    ).toBe(false);
    expect(
      hall1Dirty(catalog.teams[0].members[0], {
        ...d,
        mode: "bytes",
        nicknameHex: d.nicknameHex.toLowerCase(),
      }),
    ).toBe(false);
    expect(
      hall1Dirty(catalog.teams[0].members[0], { ...d, mode: "default" }),
    ).toBe(true);
    expect(hall1MemberEdit(catalog, 0, 0, { ...d, level: "0" })).toEqual({
      action: "member",
      team: 0,
      slot: 0,
      fields: { level: 0 },
    });
    expect(hall1MemberEdit(catalog, 0, 0, { ...d, species: 0 })).toEqual({
      action: "member",
      team: 0,
      slot: 0,
      fields: { species: 0 },
    });
    expect(
      hall1MemberEdit(catalog, 0, 0, { ...d, mode: "default" }).fields,
    ).toEqual({ defaultNickname: true });
    expect(
      hall1MemberEdit(catalog, 0, 0, {
        ...d,
        mode: "bytes",
        nicknameHex: "abcdef123456",
      }).fields,
    ).toEqual({ nicknameHex: "ABCDEF123456" });
    expect(() => hall1MemberEdit(catalog, 0, 0, d)).toThrow();
    expect(() =>
      hall1MemberEdit({ ...catalog, canEdit: false }, 0, 0, {
        ...d,
        level: "0",
      }),
    ).toThrow();
    expect(() =>
      hall1MemberEdit(catalog, 0, 6, { ...d, level: "0" }),
    ).toThrow();
    expect(() =>
      hall1MemberEdit(catalog, 0, 0, {
        ...d,
        mode: "text",
        nickname: "123456",
      }),
    ).toThrow();
    expect(() =>
      hall1MemberEdit(catalog, 0, 0, {
        ...d,
        mode: "bytes",
        nicknameHex: "12GG",
      }),
    ).toThrow();
    expect(() =>
      hall1MemberEdit(catalog, 0, 0, { ...d, species: 152 }),
    ).toThrow();
  });
  it("exposes only Gen1 and complete three-language operation labels", () => {
    expect(supportsHall1("SAV1")).toBe(true);
    expect(supportsHall1("SAV2")).toBe(false);
    for (const words of Object.values(hall1Words)) {
      expect(Object.keys(words)).toEqual(Object.keys(hall1Words.zh));
      expect(Object.values(words).every(Boolean)).toBe(true);
    }
  });
});
