import { describe, expect, it } from "vitest";
import {
  createGen7IdChunks,
  createGen7IdStateMatcher,
  decodeGen7IdStates,
  filterGen7IdPackedStates,
  gen7IdStartingFrame,
  parseFullId,
  validateGen7IdRequest,
  type Gen7IdRequest,
} from "./domain";

const request: Gen7IdRequest = {
  version: "sun",
  seed: 0,
  minAdvances: 1012,
  maxAdvances: 201_011,
  correction: 0,
  filters: { mode: "none" },
};

describe("Gen7 ID domain", () => {
  it("uses the local 3DSRNGTool ID starting frames", () => {
    expect(gen7IdStartingFrame("sun")).toBe(1012);
    expect(gen7IdStartingFrame("moon")).toBe(1012);
    expect(gen7IdStartingFrame("ultra-sun")).toBe(1132);
    expect(gen7IdStartingFrame("ultra-moon")).toBe(1132);
  });

  it("splits inclusive frames into deterministic Wasm chunks", () => {
    expect(createGen7IdChunks(request)).toEqual([
      {
        index: 0,
        minAdvances: 1012,
        maxAdvances: 101_011,
        stateCount: 100_000,
      },
      {
        index: 1,
        minAdvances: 101_012,
        maxAdvances: 201_011,
        stateCount: 100_000,
      },
    ]);
  });

  it("preserves fixed-width decimal substring filters", () => {
    expect(
      validateGen7IdRequest({
        ...request,
        filters: { mode: "tid", valueText: "001" },
      }),
    ).toEqual([]);
    expect(
      validateGen7IdRequest({
        ...request,
        filters: { mode: "g7tid", valueText: "000001" },
      }),
    ).toEqual([]);
  });

  it("rejects frames before the selected game's ID start", () => {
    expect(
      validateGen7IdRequest({
        ...request,
        version: "ultra-sun",
        minAdvances: 1012,
      }),
    ).toContain("minAdvances");
  });

  it("parses the upstream full ID formats", () => {
    expect(parseFullId("12345/54321")).toBe(((54321 << 16) | 12345) >>> 0);
    expect(parseFullId("D4313039")).toBe(0xd4313039);
  });

  it("decodes the 32-byte C ABI state schema", () => {
    const words = new Uint32Array([
      0x89abcdef,
      0x01234567,
      (12345 | (54321 << 16)) >>> 0,
      3870 | (8 << 16),
      1012,
      321337,
      7,
      0,
    ]);
    expect(decodeGen7IdStates(words.buffer)[0]).toEqual({
      advances: 1012,
      rand64: 0x0123456789abcdefn,
      tid: 12345,
      sid: 54321,
      tsv: 3870,
      trv: 8,
      g7tid: 321337,
      clock: 7,
    });
  });

  it("matches upstream multiline ID, TSV, and random-number lists", () => {
    const matches = createGen7IdStateMatcher({
      mode: "tid",
      idText: "00012\n99999",
      tsvText: "12\nnot-a-tsv",
      randText: "ABCD",
    });
    expect(
      matches({
        tid: 12,
        sid: 34,
        tsv: 12,
        g7tid: 1234,
        rand64: 0x000000000000abcdn,
      }),
    ).toBe(true);
    expect(
      matches({
        tid: 12,
        sid: 34,
        tsv: 13,
        g7tid: 1234,
        rand64: 0x000000000000abcdn,
      }),
    ).toBe(false);
  });

  it("parses Full ID comments and applies regex to ID and random lists", () => {
    const matches = createGen7IdStateMatcher({
      mode: "full",
      idText: "12345 / 54321 // save slot",
      randText: "^00000000D431.*",
      regularExpression: true,
    });
    expect(
      matches({
        tid: 12345,
        sid: 54321,
        tsv: 0,
        g7tid: 0,
        rand64: 0xd4313039n,
      }),
    ).toBe(true);
    expect(
      matches({
        tid: 12345,
        sid: 54320,
        tsv: 0,
        g7tid: 0,
        rand64: 0xd4313039n,
      }),
    ).toBe(false);

    const wrappedFields = createGen7IdStateMatcher({
      mode: "full",
      idText: "65536/1",
    });
    expect(
      wrappedFields({
        tid: 0,
        sid: 1,
        tsv: 0,
        g7tid: 0,
        rand64: 0n,
      }),
    ).toBe(true);
  });

  it("matches each ID line as a regular expression when enabled", () => {
    const matches = createGen7IdStateMatcher({
      mode: "tid",
      idText: "^12...$\n^54...$",
      regularExpression: true,
    });
    expect(
      matches({
        tid: 12345,
        sid: 0,
        tsv: 0,
        g7tid: 0,
        rand64: 0n,
      }),
    ).toBe(true);
  });

  it("can bypass every list with Disable Filters", () => {
    const words = new Uint32Array([
      0x0000abcd,
      0x12345678,
      12345 | (54321 << 16),
      12,
      1012,
      321337,
      0,
      0,
    ]);
    expect(
      filterGen7IdPackedStates(words, {
        mode: "g7tid",
        disabled: true,
        idText: "does-not-match",
      }),
    ).toBe(words);
  });

  it("filters packed Worker output without changing the accepted state", () => {
    const first = [
      0x0000abcd,
      0x12345678,
      (12345 | (54321 << 16)) >>> 0,
      12,
      1012,
      321337,
      0,
      0,
    ];
    const words = new Uint32Array([
      ...first,
      0x11111111,
      0x22222222,
      1 | (2 << 16),
      13,
      1013,
      131073,
      1,
      0,
    ]);
    expect([
      ...filterGen7IdPackedStates(words, { mode: "none", tsvText: "12" }),
    ]).toEqual(first);
  });

  it("rejects malformed regular expressions before a search", () => {
    expect(
      validateGen7IdRequest({
        ...request,
        filters: {
          mode: "tid",
          regularExpression: true,
          idText: "[",
        },
      }),
    ).toContain("regularExpression");
    expect(
      validateGen7IdRequest({
        ...request,
        filters: {
          mode: "tid",
          disabled: true,
          regularExpression: true,
          idText: "[",
        },
      }),
    ).toEqual([]);
  });
});
