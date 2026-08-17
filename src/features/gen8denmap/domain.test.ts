import { describe, expect, it } from "vitest";
import {
  GEN8_DEN_MAP_REGIONS,
  getGen8DenMapEntries,
  getGen8DenMapEntry,
  getGen8DenMapRegion,
} from "./domain";

describe("Gen 8 den map domain", () => {
  it("keeps the upstream region ranges and map dimensions", () => {
    expect(GEN8_DEN_MAP_REGIONS.map(({ start, end }) => [start, end])).toEqual([
      [0, 100],
      [100, 190],
      [190, 276],
    ]);
    expect(getGen8DenMapRegion("crownTundra")).toMatchObject({
      width: 1920,
      height: 2060,
    });
  });

  it("reuses all 276 raid den mappings, including the special entry", () => {
    expect(getGen8DenMapEntries("wildArea", "en")).toHaveLength(100);
    expect(getGen8DenMapEntries("isleOfArmor", "en")).toHaveLength(90);
    expect(getGen8DenMapEntries("crownTundra", "en")).toHaveLength(86);
    expect(getGen8DenMapEntry("wildArea", 16, "zh").info.index).toBe(16);
  });

  it("uses the upstream location translations", () => {
    expect(getGen8DenMapEntry("wildArea", 0, "en").locationName).toBe(
      "Rolling Fields",
    );
    expect(getGen8DenMapEntry("wildArea", 0, "zh-CN").locationName).toBe(
      "煦丽草原",
    );
    expect(getGen8DenMapEntry("crownTundra", 0, "ja").locationName).toBe(
      "Slippery Slope",
    );
  });

  it("rejects invalid regions and den indexes", () => {
    expect(() => getGen8DenMapRegion("invalid" as never)).toThrow(RangeError);
    expect(() => getGen8DenMapEntry("wildArea", -1, "en")).toThrow(RangeError);
    expect(() => getGen8DenMapEntry("crownTundra", 86, "en")).toThrow(
      RangeError,
    );
  });
});
