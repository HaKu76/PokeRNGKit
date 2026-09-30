import { describe, expect, it } from "vitest";
import { apricornOperation } from "./apricorns";
describe("apricorn pouch", () => {
  it("preserves physical order and all byte counts", () => {
    expect(
      apricornOperation("apricornEdit", [
        "0",
        "99",
        "100",
        "255",
        "1",
        "2",
        "3",
      ]),
    ).toEqual({
      pouch: -1,
      action: "apricornEdit",
      language: "en",
      shuffle: false,
      apricornValues: [0, 99, 100, 255, 1, 2, 3],
    });
    for (const bad of ["", "-1", "256", "1.5", "1e2", " 1", "１２", "0000"]) {
      const values = Array(7).fill("0");
      values[2] = bad;
      expect(() => apricornOperation("apricornEdit", values)).toThrow();
    }
    for (const values of [
      undefined,
      [],
      Array(6).fill("0"),
      Array(8).fill("0"),
    ])
      expect(() => apricornOperation("apricornEdit", values)).toThrow();
  });
  it("does not mix drafts into bulk actions", () => {
    for (const action of ["apricornFill", "apricornClear"] as const)
      expect(apricornOperation(action, ["255"])).toEqual({
        pouch: -1,
        action,
        language: "en",
        shuffle: false,
      });
  });
});
