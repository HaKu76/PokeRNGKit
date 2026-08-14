import { describe, expect, it } from "vitest";
import { researcherDefaultCustom, type ResearcherRequest } from "./domain";
import { searchResearcherRows } from "./search";

const request: ResearcherRequest = {
  rng: "lcrng",
  seedWords: Array(8).fill(0),
  initialAdvances: 0,
  maxAdvances: 3,
  customs: Array.from({ length: 10 }, () => researcherDefaultCustom("lcrng")),
};

const rows = [
  { advances: 0, prng: 0x1234_5678n, customs: [7n] },
  { advances: 1, prng: 0xabcd_5678n, customs: [8n] },
  { advances: 2, prng: 0x1234_9999n, customs: [7n] },
].map((row) => ({
  ...row,
  customs: [...row.customs, ...Array(9).fill(0n)],
}));

describe("searchResearcherRows", () => {
  it("finds PRNG segments from a requested start row", () => {
    expect(searchResearcherRows(rows, request, 5, 0x1234n)?.index).toBe(0);
    expect(searchResearcherRows(rows, request, 5, 0x1234n, 1)?.index).toBe(2);
  });

  it("finds custom columns and reports misses", () => {
    expect(searchResearcherRows(rows, request, 13, 8n)?.index).toBe(1);
    expect(searchResearcherRows(rows, request, 13, 99n)).toBeUndefined();
  });
});
