import { describe, expect, it } from "vitest";
import {
  createResearcherSeedWords,
  decodeResearcherRows,
  formatResearcherValue,
  normalizeResearcherLiteralInput,
  parseResearcherLiteral,
  parseResearcherSeed32,
  parseResearcherSeed64,
  researcherDefaultCustom,
  researcherOperandValue,
  researcherOperands,
  validateResearcherRequest,
  type ResearcherRequest,
  type ResearcherRow,
} from "./domain";

function request(
  overrides: Partial<ResearcherRequest> = {},
): ResearcherRequest {
  return {
    rng: "lcrng",
    seedWords: Array(8).fill(0),
    initialAdvances: 0,
    maxAdvances: 1000,
    customs: Array.from({ length: 10 }, () => researcherDefaultCustom("lcrng")),
    ...overrides,
  };
}

describe("Researcher domain", () => {
  it("parses fixed-radix seeds and preserves empty zero values", () => {
    expect(parseResearcherSeed32("")).toBe(0);
    expect(parseResearcherSeed32("FFFFFFFF")).toBe(0xffff_ffff);
    expect(parseResearcherSeed32("100000000")).toBeUndefined();
    expect(parseResearcherSeed32("GG")).toBeUndefined();
    expect(parseResearcherSeed64("FFFFFFFFFFFFFFFF")).toBe(
      0xffff_ffff_ffff_ffffn,
    );
  });

  it("packs the four upstream seed layouts", () => {
    expect(
      createResearcherSeedWords("lcrng", ["12345678"])?.slice(0, 2),
    ).toEqual([0x1234_5678, 0]);
    expect(
      createResearcherSeedWords("bwrng", ["1122334455667788"])?.slice(0, 2),
    ).toEqual([0x5566_7788, 0x1122_3344]);
    expect(
      createResearcherSeedWords("tinymt", ["1", "2", "3", "4"])?.slice(0, 8),
    ).toEqual([1, 0, 2, 0, 3, 0, 4, 0]);
    expect(
      createResearcherSeedWords("xorshift", ["1", "100000002"])?.slice(0, 4),
    ).toEqual([1, 0, 2, 1]);
  });

  it("parses custom literals in the selected radix", () => {
    expect(parseResearcherLiteral("99999999", false)).toBe(99_999_999n);
    expect(parseResearcherLiteral("FFFFFFFF", true)).toBe(0xffff_ffffn);
    expect(parseResearcherLiteral("FFFFFFFF", false)).toBeUndefined();
    expect(parseResearcherLiteral("0", false)).toBeUndefined();
    expect(parseResearcherLiteral("100000000", true)).toBeUndefined();
    expect(parseResearcherLiteral("", false)).toBe(0n);
    expect(normalizeResearcherLiteralInput("0000000000")).toBe("1");
    expect(normalizeResearcherLiteralInput("G")).toBe("1");
    expect(normalizeResearcherLiteralInput("")).toBe("");
    expect(normalizeResearcherLiteralInput("123456789A")).toBe("FFFFFFFF");
  });

  it("limits custom references to values calculated earlier in the row", () => {
    expect(researcherOperands("lcrng", 0)).toEqual([2, 5, 6, 8, 11, 12]);
    expect(researcherOperands("lcrng", 1)).toEqual([
      2, 5, 6, 8, 11, 12, 13, 23,
    ]);
    expect(researcherOperands("bwrng", 1)).toEqual([
      1, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 23,
    ]);
  });

  it("validates the browser state limit and u32 advance range", () => {
    expect(validateResearcherRequest(request())).toEqual([]);
    expect(
      validateResearcherRequest(request({ maxAdvances: 250_001 })),
    ).toContain("maxAdvances");
    expect(
      validateResearcherRequest(
        request({ initialAdvances: 0xffff_ffff, maxAdvances: 2 }),
      ),
    ).toContain("advanceRange");
  });

  it("decodes the packed Wasm row layout", () => {
    const words = new Uint32Array(23);
    words[0] = 42;
    words[1] = 0x5566_7788;
    words[2] = 0x1122_3344;
    words[3] = 0xaabb_ccdd;
    words[4] = 0x1234_5678;
    expect(decodeResearcherRows(words.buffer)).toEqual([
      {
        advances: 42,
        prng: 0x1122_3344_5566_7788n,
        customs: [0x1234_5678_aabb_ccddn, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
      },
    ]);
  });

  it("projects current and previous state segments", () => {
    const previous: ResearcherRow = {
      advances: 0,
      prng: 0x1122_3344_5566_7788n,
      customs: [9n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
    };
    const row: ResearcherRow = {
      advances: 1,
      prng: 0xaabb_ccdd_eeff_0011n,
      customs: [7n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n],
    };
    expect(researcherOperandValue(row, 3, "bwrng", previous)).toBe(
      0xaabb_ccddn,
    );
    expect(researcherOperandValue(row, 6, "bwrng", previous)).toBe(0xccddn);
    expect(researcherOperandValue(row, 12, "bwrng", previous)).toBe(0x3344n);
    expect(researcherOperandValue(row, 13, "bwrng", previous)).toBe(7n);
    expect(researcherOperandValue(row, 23, "bwrng", previous)).toBe(9n);
    expect(formatResearcherValue(0xabn, true, 4)).toBe("00AB");
  });
});
