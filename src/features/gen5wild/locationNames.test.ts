import { describe, expect, it } from "vitest";
import { getGen5WildLocationName } from "./locationNames";

describe("Gen 5 Wild location names", () => {
  it("parses every line instead of treating the location table as one entry", () => {
    expect(getGen5WildLocationName("en", "black", 41)).toBe(
      "Chargestone Cave 1F",
    );
    expect(getGen5WildLocationName("zh-CN", "white", 101)).toBe("11号道路");
    expect(getGen5WildLocationName("en", "black2", 119)).toBe("Route 11");
    expect(getGen5WildLocationName("zh-CN", "white2", 20)).toBe("电气石洞穴1F");
  });
});
