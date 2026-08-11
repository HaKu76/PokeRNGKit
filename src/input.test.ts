import { describe, expect, it } from "vitest";
import { normalizeDecimalInput, normalizeHexInput } from "./input";

describe("PokeFinder numeric input normalization", () => {
  it("keeps at most the configured hexadecimal digits", () => {
    expect(normalizeHexInput("0x12ab-cdEF99", 8)).toBe("12ABCDEF");
    expect(normalizeHexInput("", 8)).toBe("");
  });

  it("filters and bounds decimal input", () => {
    expect(normalizeDecimalInput("00070000x", 65535, 5)).toBe("70");
    expect(normalizeDecimalInput("99999", 8191, 4)).toBe("8191");
  });
});
