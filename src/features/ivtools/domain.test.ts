import { describe, expect, it } from "vitest";
import {
  createRangeBounds,
  formatIvTemplate,
  getIvRangeBounds,
  parseIvTemplate,
  parseIvTemplates,
} from "./domain";

describe("iv tools", () => {
  it("maps the upstream judge tiers to closed IV ranges", () => {
    expect(getIvRangeBounds("veryGood")).toEqual([26, 29]);
    expect(
      createRangeBounds([
        "perfect",
        "fantastic",
        "noGood",
        "-",
        "decent",
        "prettyGood",
      ]),
    ).toEqual({
      min: [31, 30, 0, 0, 1, 16],
      max: [31, 30, 0, 31, 15, 25],
    });
  });

  it("accepts exactly six IV values and formats the upstream template shape", () => {
    const template = parseIvTemplate("HPIce = 31, 0, 30, 31, 31, 31");
    expect(template).toEqual({
      name: "HPIce",
      values: [31, 0, 30, 31, 31, 31],
    });
    expect(formatIvTemplate(template!)).toBe("HPIce = 31,0,30,31,31,31");
    expect(parseIvTemplate("bad = 1,2,3")).toBeUndefined();
    expect(parseIvTemplate("bad = 1,2,3,4,5,32")).toBeUndefined();
  });

  it("keeps valid template order while dropping invalid lines", () => {
    expect(
      parseIvTemplates("A = 1,2,3,4,5,6;bad;B = 0,0,0,0,0,0").map(
        (item) => item.name,
      ),
    ).toEqual(["A", "B"]);
  });
});
