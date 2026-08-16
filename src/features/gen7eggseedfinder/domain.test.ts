import { describe, expect, it } from "vitest";
import {
  formatGen7EggSeedState,
  normalizeBinaryInput,
  splitGen7EggSeedSearch,
  validateGen7EggSeedSearchRequest,
  validateGen7MagikarpRequest,
} from "./domain";

describe("Gen 7 Egg Seed Finder domain", () => {
  it("splits an inclusive seed range into bounded chunks without gaps", () => {
    const chunks = splitGen7EggSeedSearch(
      {
        startSeed: 10,
        endSeed: 20,
        natureList: [0, 1, 2, 3, 4, 5, 6, 7],
        shinyCharm: false,
      },
      4,
    );
    expect(chunks).toEqual([
      { index: 0, startSeed: 10, endSeed: 13 },
      { index: 1, startSeed: 14, endSeed: 17 },
      { index: 2, startSeed: 18, endSeed: 20 },
    ]);
  });

  it("enforces eight natures and 127 binary gender values", () => {
    expect(() =>
      validateGen7EggSeedSearchRequest({
        startSeed: 0,
        endSeed: 1,
        natureList: [0],
        shinyCharm: false,
      } as never),
    ).toThrow();
    expect(
      validateGen7EggSeedSearchRequest({
        startSeed: 0,
        endSeed: 0,
        natureList: [25, 1, 2, 3, 4, 5, 6, 7],
        shinyCharm: false,
      }).natureList[0],
    ).toBe(25);
    expect(() => validateGen7MagikarpRequest({ bits: "0" })).toThrow();
    expect(validateGen7MagikarpRequest({ bits: "0".repeat(127) })).toEqual({
      bits: "0".repeat(127),
    });
    expect(normalizeBinaryInput("01 0\n1x")).toBe("0101x");
  });

  it("formats the state in the upstream reversed word order", () => {
    expect(
      formatGen7EggSeedState({
        state: [0x12345678, 0x23456789, 0x3456789a, 0x456789ab],
      }),
    ).toBe("456789AB,3456789A,23456789,12345678");
  });
});
