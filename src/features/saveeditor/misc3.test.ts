import { describe, it, expect } from "vitest";
import {
  supportsMisc3,
  misc3CoinEdit,
  misc3RivalEdit,
  misc3IconEdit,
  misc3MirageEdit,
  misc3Words,
  type Misc3Catalog,
} from "./misc3";
const catalog = (): Misc3Catalog => ({
  canEdit: true,
  coins: 65535,
  rival: { name: "OLD", hex: "0102030405060708", maxLength: 7 },
  icons: Array.from({ length: 6 }, (_, slot) => ({
    slot,
    species: 0,
    raw: 65535,
    sprite: "",
  })),
  speciesChoices: Array.from({ length: 387 }, (_, id) => ({
    id,
    name: { zh: `${id}`, en: `${id}`, ja: `${id}` },
  })),
  mirage: { current: 1, pid: "DEADBEEF", target: 48879, partyCount: 0 },
});
describe("Gen3 main settings", () => {
  it("restricts formats and provides three language labels", () => {
    for (const f of ["SAV3RS", "SAV3E", "SAV3FRLG"])
      expect(supportsMisc3(f)).toBe(true);
    expect(supportsMisc3("SAV3XD")).toBe(false);
    for (const w of Object.values(misc3Words)) {
      expect(w.empty).toBeTruthy();
      expect(w.iconNote).toBeTruthy();
    }
  });
  it("enforces coins and lossless-name input widths without mixing modes", () => {
    const c = catalog();
    expect(misc3CoinEdit(c, "9999")).toEqual({ action: "coins", coins: 9999 });
    for (const v of ["", "10000", "-1", "1.5", "0x10"])
      expect(() => misc3CoinEdit(c, v)).toThrow();
    expect(misc3RivalEdit(c, "text", "")).toEqual({
      action: "rival",
      name: "",
    });
    expect(misc3RivalEdit(c, "hex", "aabbccddeeff0011")).toEqual({
      action: "rival",
      nameHex: "AABBCCDDEEFF0011",
    });
    expect(() => misc3RivalEdit(c, "text", "ABCDEFGH")).toThrow();
    expect(() => misc3RivalEdit(c, "hex", "00")).toThrow();
  });
  it("keeps unknown raw icons until explicit replacement, including None", () => {
    const c = catalog(),
      d = Array<string>(6).fill("keep");
    expect(() => misc3IconEdit(c, d)).toThrow();
    d[3] = "0";
    expect(misc3IconEdit(c, d)).toEqual({
      action: "icons",
      icons: [{ slot: 3, species: 0 }],
    });
    d[5] = "386";
    expect(misc3IconEdit(c, d)).toEqual({
      action: "icons",
      icons: [
        { slot: 3, species: 0 },
        { slot: 5, species: 386 },
      ],
    });
    d[0] = "387";
    expect(() => misc3IconEdit(c, d)).toThrow();
  });
  it("uses the displayed raw PID even with an empty party and rejects unsupported/readonly writes", () => {
    const c = catalog();
    expect(misc3MirageEdit(c)).toEqual({ action: "mirage", pid: "DEADBEEF" });
    expect(() => misc3MirageEdit({ ...c, mirage: null })).toThrow();
    expect(() => misc3RivalEdit({ ...c, rival: null }, "text", "A")).toThrow();
    expect(() => misc3IconEdit({ ...c, icons: null }, [])).toThrow();
    expect(() => misc3CoinEdit({ ...c, canEdit: false }, "0")).toThrow();
    expect(() =>
      misc3MirageEdit({ ...c, mirage: { ...c.mirage!, pid: "FFF" } }),
    ).toThrow();
  });
});
