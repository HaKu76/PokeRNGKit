import { describe, expect, it } from "vitest";
import {
  opowerDraft,
  supportsOPowers,
  validateOPowers,
  type OPowerCatalog,
} from "./opowers";
import { opowerNames } from "./opowerNames";
const catalog: OPowerCatalog = {
  states: [1, 255, ...Array(63).fill(0)],
  stateKeys: [],
  points: 255,
  fieldKeys: [],
  battleKeys: [],
  field1: Array(10).fill(0),
  field2: Array(10).fill(255),
  battle1: Array(7).fill(1),
  battle2: Array(7).fill(2),
};
describe("O-Powers", () => {
  it("keeps all groups and does not interpret unknown flags as unlocked", () => {
    const draft = opowerDraft(catalog);
    const edit = validateOPowers(draft);
    expect(edit.states?.slice(0, 2)).toEqual([true, false]);
    expect(edit.field2).toEqual(Array(10).fill(255));
    expect(edit.points).toBe(255);
    edit.states![0] = false;
    expect(draft.states[0]).toBe(true);
  });
  it("rejects invalid counts, byte values and empty inputs", () => {
    for (const value of ["", "-1", "256", "1.5", "1e2", " 1", "0000", "１２"]) {
      expect(() =>
        validateOPowers({ ...opowerDraft(catalog), points: value }),
      ).toThrow();
      const draft = opowerDraft(catalog);
      draft.battle2[6] = value;
      expect(() => validateOPowers(draft)).toThrow();
    }
    for (const key of [
      "states",
      "field1",
      "field2",
      "battle1",
      "battle2",
    ] as const) {
      const draft = opowerDraft(catalog);
      draft[key] = [];
      expect(() => validateOPowers(draft)).toThrow();
    }
  });
  it("contains all 82 upstream names in three languages and only enables XY/ORAS", () => {
    expect(Object.keys(opowerNames)).toHaveLength(82);
    for (const item of Object.values(opowerNames))
      for (const lang of ["zh", "en", "ja"] as const)
        expect(item[lang].length).toBeGreaterThan(0);
    expect(opowerNames["OPower6BattleType.Sp_Attack"].zh).toBe("特攻");
    for (const format of ["SAV6XY", "SAV6AO"])
      expect(supportsOPowers(format)).toBe(true);
    for (const format of ["SAV6AODemo", "SAV7SM", "SAV4HGSS"])
      expect(supportsOPowers(format)).toBe(false);
  });
});
