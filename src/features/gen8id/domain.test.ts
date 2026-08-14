import { describe, expect, it } from "vitest";
import {
  createGen8IdChunks,
  decodeGen8IdStates,
  formatGen8IdSeed,
  GEN8_ID_MAX_EVALUATIONS,
  normalizeGen8IdFilterText,
  parseGen8IdFilters,
  parseGen8IdSeed,
  splitGen8IdSeed,
  validateGen8IdPackedResults,
  validateGen8IdRequest,
  type Gen8IdRequest,
} from "./domain";

function request(overrides: Partial<Gen8IdRequest> = {}): Gen8IdRequest {
  return {
    seed0: 0x4000_0000_0000_0000n,
    seed1: 0x4000_0000_0000_0000n,
    initialAdvances: 0,
    maxAdvances: 100_001,
    filters: { mode: "none", values: [] },
    ...overrides,
  };
}

describe("Gen8 ID domain", () => {
  it("enforces the upstream seed and advance boundaries", () => {
    expect(validateGen8IdRequest(request())).toEqual([]);
    expect(validateGen8IdRequest(request({ seed0: 0n, seed1: 0n }))).toContain(
      "seeds",
    );
    expect(
      validateGen8IdRequest(
        request({ initialAdvances: 0xffff_ffff, maxAdvances: 2 }),
      ),
    ).toEqual([]);
    expect(
      validateGen8IdRequest(request({ initialAdvances: 1, maxAdvances: 0 })),
    ).toEqual([]);
    expect(
      validateGen8IdRequest(request({ maxAdvances: GEN8_ID_MAX_EVALUATIONS })),
    ).toEqual([]);
    expect(
      validateGen8IdRequest(
        request({ maxAdvances: GEN8_ID_MAX_EVALUATIONS + 1 }),
      ),
    ).toContain("evaluations");
  });

  it("creates deterministic count-based chunks", () => {
    expect(createGen8IdChunks(request())).toEqual([
      { index: 0, offset: 0, stateCount: 100_000 },
      { index: 1, offset: 100_000, stateCount: 1 },
    ]);
  });

  it("parses every visible upstream filter mode", () => {
    expect(parseGen8IdFilters("tid", "0\n65535")).toEqual({
      mode: "tid",
      values: [0, 65535],
    });
    expect(parseGen8IdFilters("tidSid", "2056/49216")).toEqual({
      mode: "tidSid",
      values: [0xc0400808],
    });
    expect(parseGen8IdFilters("pid", "C0400000")).toEqual({
      mode: "pid",
      values: [0xc0400000],
    });
    expect(parseGen8IdFilters("tsv", "8191")).toEqual({
      mode: "tsv",
      values: [8191],
    });
    expect(parseGen8IdFilters("displayTid", "999999")).toEqual({
      mode: "displayTid",
      values: [999999],
    });
    expect(parseGen8IdFilters("tid", "\n")).toEqual({
      mode: "tid",
      values: [],
    });
    expect(parseGen8IdFilters("tidSid", "123/")).toEqual({
      mode: "tidSid",
      values: [123],
    });
  });

  it("normalizes filter text with the upstream Qt clamping rules", () => {
    expect(normalizeGen8IdFilterText("tid", "00012x\n999999")).toBe(
      "12\n65535",
    );
    expect(normalizeGen8IdFilterText("tidSid", "/123\n456/\n1/2/3")).toBe(
      "65535/123\n456/\n1/23",
    );
    expect(
      normalizeGen8IdFilterText(
        "pid",
        "C0400000\n1FFFFFFFF\n000000001\n00000000FFFFFFFF",
      ),
    ).toBe("c0400000\nffffffff\n1\nffffffff");
    expect(normalizeGen8IdFilterText("tsv", "9000")).toBe("8191");
    expect(normalizeGen8IdFilterText("displayTid", "1000000")).toBe("999999");
  });

  it("rejects malformed filters instead of changing their meaning", () => {
    expect(parseGen8IdFilters("tidSid", "1/2/3")).toBeUndefined();
    expect(parseGen8IdFilters("pid", "100000000")).toBeUndefined();
    expect(parseGen8IdFilters("tsv", "8192")).toBeUndefined();
    expect(parseGen8IdFilters("displayTid", "1000000")).toBeUndefined();
  });

  it("accepts an empty value list for the selected visible mode", () => {
    expect(
      validateGen8IdRequest(
        request({ filters: { mode: "displayTid", values: [] } }),
      ),
    ).toEqual([]);
  });

  it("rejects unknown runtime filter modes", () => {
    expect(
      validateGen8IdRequest(
        request({
          filters: { mode: "bogus", values: [] } as never,
        }),
      ),
    ).toContain("filters");
  });

  it("decodes the packed result ABI", () => {
    const words = new Uint32Array([8, (49666 << 16) | 16392, 2080, 927368]);
    expect(decodeGen8IdStates(words.buffer)).toEqual([
      {
        advances: 8,
        tid: 16392,
        sid: 49666,
        tsv: 2080,
        displayTid: 927368,
      },
    ]);
  });

  it("rejects impossible zero TID/SID result rows", () => {
    const input = request({ maxAdvances: 1 });
    const chunk = { index: 0, offset: 0, stateCount: 1 };
    expect(() =>
      validateGen8IdPackedResults(new Uint32Array([0, 1, 0, 1]), input, chunk),
    ).not.toThrow();
    expect(() =>
      validateGen8IdPackedResults(new Uint32Array([0, 0, 0, 0]), input, chunk),
    ).toThrow("invalid result row");
  });

  it("parses, splits and formats 64-bit hexadecimal seeds", () => {
    const seed = parseGen8IdSeed("0xFEDCBA9876543210");
    expect(seed).toBe(0xfedc_ba98_7654_3210n);
    expect(splitGen8IdSeed(seed!)).toEqual([0x76543210, 0xfedcba98]);
    expect(formatGen8IdSeed(1n)).toBe("0000000000000001");
    expect(parseGen8IdSeed("")).toBe(0n);
    expect(parseGen8IdSeed("10000000000000000")).toBeUndefined();
  });
});
