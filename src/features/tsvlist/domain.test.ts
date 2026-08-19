import { describe, expect, it } from "vitest";
import {
  formatTsvListText,
  parseTsvListText,
  TSV_LIST_MAX,
  TSV_LIST_MAX_ENTRIES,
  TSV_LIST_MIN,
} from "./domain";

describe("TSV list domain", () => {
  it("parses the upstream line editor format and ignores invalid values", () => {
    expect(parseTsvListText("12\n12, 4095\n-1\n4096\nabc\n0")).toEqual([
      12, 4095, 0,
    ]);
  });

  it("serializes unique values in stable insertion order", () => {
    expect(formatTsvListText([3, 1, 3, TSV_LIST_MIN, TSV_LIST_MAX])).toBe(
      "3\n1\n0\n4095",
    );
  });

  it("caps the list at the 4096-bit mask size", () => {
    const input = Array.from(
      { length: TSV_LIST_MAX_ENTRIES + 20 },
      (_, index) => index,
    ).join(",");
    const parsed = parseTsvListText(input);
    expect(parsed).toHaveLength(TSV_LIST_MAX_ENTRIES);
    expect(parsed.at(-1)).toBe(TSV_LIST_MAX);
  });
});
