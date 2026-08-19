import { describe, expect, it } from "vitest";
import {
  decodeGen6TinyIndexResults,
  encodeGen6TinyIndexRequest,
  filterGen6TinyIndexPackedResults,
  formatGen6TinyIndexDate,
  formatGen6TinyIndexState,
  parseGen6TinyIndexDecimal,
  parseGen6TinyIndexHex,
  tinyFinderMonthOffsetSeconds,
  validateGen6TinyIndexRequest,
  type Gen6TinyIndexRequest,
} from "./domain";

const request: Gen6TinyIndexRequest = {
  mode: "date",
  state: [0, 0, 0, 0],
  baseSeed: 111,
  minIndex: 35,
  maxIndex: 40,
  year: 2024,
  month: 2,
  startSecond: 10,
  secondCount: 20,
  resultLimit: 100,
  filters: {
    disabled: false,
    regularExpression: false,
    indexText: "",
    stateText: "",
  },
};

describe("Gen VI TinyMT Index domain", () => {
  it("preserves TinyFinder date and request packing semantics", () => {
    expect(tinyFinderMonthOffsetSeconds(2024, 2)).toBe(2_764_800);
    expect(tinyFinderMonthOffsetSeconds(2023, 2)).toBe(2_678_400);
    expect([...encodeGen6TinyIndexRequest(request)]).toEqual([
      1, 0, 0, 0, 0, 111, 35, 40, 2024, 2, 10, 20,
    ]);
    expect(formatGen6TinyIndexDate(request, 2_764_810)).toBe(
      "2024-02-02T13:00:10",
    );
  });

  it("decodes and filters Index and TinyMT state", () => {
    const words = new Uint32Array([
      35, 0x44dddddc, 0x11111111, 0x22222222, 0x33333333, 0x44444444,
      0x12345678, 86_400,
    ]);
    const [result] = decodeGen6TinyIndexResults(words.buffer);
    expect(result).toMatchObject({
      index: 35,
      random: 0x44dddddc,
      initialSeed: 0x12345678,
      elapsedSecond: 86_400,
    });
    expect(formatGen6TinyIndexState(result.state)).toBe(
      "44444444,33333333,22222222,11111111",
    );
    expect(
      filterGen6TinyIndexPackedResults(words, {
        ...request.filters,
        indexText: "35",
        stateText: "44444444,3333",
      }),
    ).toEqual(words);
  });

  it("matches empty values and rejects unsafe browser tasks", () => {
    expect(parseGen6TinyIndexHex("")).toBe(0);
    expect(parseGen6TinyIndexDecimal("")).toBe(0);
    expect(() =>
      validateGen6TinyIndexRequest({
        ...request,
        maxIndex: 1_000_000,
        secondCount: 20,
      }),
    ).toThrow(/limited/);
    expect(() =>
      validateGen6TinyIndexRequest({
        ...request,
        filters: {
          ...request.filters,
          regularExpression: true,
          indexText: "[",
        },
      }),
    ).toThrow(/Regular expression/);
  });
});
