import { describe, expect, it } from "vitest";
import {
  decodeGen6IdResults,
  encodeGen6IdRequest,
  filterGen6IdPackedResults,
  formatGen6IdState,
  parseGen6IdDecimal,
  parseGen6IdHex,
  validateGen6IdRequest,
  type Gen6IdRequest,
} from "./domain";

const request: Gen6IdRequest = {
  state: [0x11111111, 0x22222222, 0x33333333, 0x44444444],
  minFrame: 0,
  maxFrame: 31,
  resultLimit: 100,
  filters: {
    mode: "tid",
    disabled: false,
    regularExpression: false,
    idText: "",
    tsvText: "",
    stateText: "",
  },
};

describe("Gen VI ID domain", () => {
  it("encodes state, frame and count", () =>
    expect([...encodeGen6IdRequest(request)]).toEqual([
      0x11111111, 0x22222222, 0x33333333, 0x44444444, 0, 32,
    ]));

  it("decodes and filters the packed result layout", () => {
    const words = new Uint32Array(8);
    words.set([0, 0x44dddddc, 0x11111111, 0x22222222, 0x33333333, 0x44444444]);
    const [result] = decodeGen6IdResults(words.buffer);
    expect(result).toMatchObject({
      frame: 0,
      random: 0x44dddddc,
      tid: 56796,
      sid: 17629,
      tsv: 2448,
      trv: 1,
    });
    expect(formatGen6IdState(result.state)).toBe(
      "44444444,33333333,22222222,11111111",
    );
    expect(
      filterGen6IdPackedResults(words, {
        ...request.filters,
        idText: "567",
        tsvText: "2448",
        stateText: "44444444,3333",
      }),
    ).toEqual(words);
  });

  it("matches upstream empty input and browser limits", () => {
    expect(parseGen6IdHex("")).toBe(0);
    expect(parseGen6IdDecimal("")).toBe(0);
    expect(() =>
      validateGen6IdRequest({ ...request, maxFrame: 5_000_001 }),
    ).toThrow(/limited/);
    expect(() =>
      validateGen6IdRequest({
        ...request,
        filters: { ...request.filters, regularExpression: true, idText: "[" },
      }),
    ).toThrow(/Regular expression/);
  });
});
