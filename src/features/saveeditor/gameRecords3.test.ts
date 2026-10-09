import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  gameRecord3Draft,
  gameRecord3Edit,
  packFameTime3,
  supportsGameRecords3,
  gameRecords3Words,
  type GameRecord3Catalog,
} from "./gameRecords3";
import { saveRecordName } from "./recordNames";
const c: GameRecord3Catalog = {
  canEdit: true,
  entries: [
    { index: 0, name: "Saved Game", value: 0 },
    { index: 1, name: "First Hof Play Time", value: 4294967295 },
  ],
  time: {
    hours: 9999,
    minutes: 59,
    seconds: 59,
    rawHours: 65535,
    rawMinutes: 255,
    rawSeconds: 255,
  },
};
describe("Gen3 game records", () => {
  it("retains full unsigned values and rejects malformed decimals", () => {
    const d = gameRecord3Draft(c, 1);
    expect(d.value).toBe("4294967295");
    for (const value of ["0", "1", "2147483648", "4294967295"])
      expect(gameRecord3Edit(c, 1, "value", { ...d, value })).toEqual({
        action: "value",
        index: 1,
        value: Number(value),
      });
    for (const value of ["", "-1", "4294967296", "1e2", "1.0", " 5", "0x10"])
      expect(() => gameRecord3Edit(c, 1, "value", { ...d, value })).toThrow();
  });
  it("keeps raw time distinct from display fields and packs only a time request", () => {
    const d = gameRecord3Draft(c, 1);
    expect(d.hours).toBe("9999");
    expect(c.entries[1].value).toBe(4294967295);
    expect(gameRecord3Edit(c, 1, "time", d)).toEqual({
      action: "time",
      index: 1,
      hours: 9999,
      minutes: 59,
      seconds: 59,
    });
    expect(packFameTime3(9999, 59, 59)).toBe(0x270f3b3b);
    expect(packFameTime3(1, 2, 3)).toBe(0x00010203);
    for (const patch of [
      { hours: "10000" },
      { hours: "-1" },
      { minutes: "60" },
      { seconds: "60" },
      { seconds: "" },
    ])
      expect(() => gameRecord3Edit(c, 1, "time", { ...d, ...patch })).toThrow();
    expect(() => gameRecord3Edit(c, 0, "time", d)).toThrow();
    expect(() =>
      gameRecord3Edit({ ...c, canEdit: false }, 1, "value", d),
    ).toThrow();
    expect(() => gameRecord3Edit(c, 52, "value", d)).toThrow();
  });
  it("covers all exact upstream Gen3 names in Chinese and Japanese", () => {
    const source = readFileSync(
      new URL(
        "../../../third_party/pkhex/PKHeX.Core/Saves/Substructures/Gen3/Record3.cs",
        import.meta.url,
      ),
      "utf8",
    );
    const keys = [
      ...new Set(
        [...source.matchAll(/^\s*([A-Z_0-9]+)\s*=\s*\d+/gm)]
          .map((m) => m[1])
          .filter((k) => k !== "NUM_GAME_STATS"),
      ),
    ];
    expect(keys).toHaveLength(52);
    for (const key of keys) {
      const name = key
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/(^| )\S/g, (x) => x.toUpperCase());
      expect(saveRecordName(name, "zh")).not.toBe(name);
      expect(saveRecordName(name, "ja")).not.toBe(name);
      expect(saveRecordName(name, "en")).toBe(name);
    }
  });
  it("limits formats and provides localized modes", () => {
    for (const f of ["SAV3RS", "SAV3E", "SAV3FRLG"])
      expect(supportsGameRecords3(f)).toBe(true);
    expect(supportsGameRecords3("SAV6XY")).toBe(false);
    for (const w of Object.values(gameRecords3Words))
      expect(w.time.length).toBeGreaterThan(0);
  });
});
