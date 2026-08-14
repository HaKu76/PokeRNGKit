import { describe, expect, it } from "vitest";
import {
  decodeGen4AdvanceMatches,
  packGen4AdvanceRows,
  parseGen4AdvanceRows,
  validateGen4AdvanceRequest,
  type Gen4AdvanceRequest,
} from "./domain";

const request: Gen4AdvanceRequest = {
  mode: "chatot",
  rows: [
    { advances: 100, value: 83 },
    { advances: 101, value: 72 },
    { advances: 102, value: 55 },
  ],
  tokens: [1, 2, 3],
};

describe("Gen4 Advance Finder domain", () => {
  it("validates upstream call and Chatot ranges", () => {
    expect(validateGen4AdvanceRequest(request)).toEqual([]);
    expect(
      validateGen4AdvanceRequest({
        ...request,
        rows: [{ advances: 0, value: 100 }],
        tokens: [0],
      }),
    ).toEqual(["rows"]);
    expect(
      validateGen4AdvanceRequest({ ...request, mode: "calls", tokens: [3] }),
    ).toEqual(["rows", "tokens"]);
    expect(
      validateGen4AdvanceRequest({
        ...request,
        mode: "needles",
        rows: [
          { advances: 0, value: 7 },
          { advances: 1, value: 0 },
        ],
        tokens: [7, 8],
      }),
    ).toEqual([]);
  });

  it("parses decimal advances with numeric or letter calls", () => {
    expect(parseGen4AdvanceRows("calls", "40,E\n41 1\n42;P")).toEqual([
      { advances: 40, value: 0 },
      { advances: 41, value: 1 },
      { advances: 42, value: 2 },
    ]);
    expect(parseGen4AdvanceRows("chatot", "100,99\n101,0")).toEqual([
      { advances: 100, value: 99 },
      { advances: 101, value: 0 },
    ]);
    expect(parseGen4AdvanceRows("needles", "200,7\n201,0")).toEqual([
      { advances: 200, value: 7 },
      { advances: 201, value: 0 },
    ]);
  });

  it("packs source rows and decodes result pairs", () => {
    expect(Array.from(packGen4AdvanceRows(request.rows))).toEqual([
      100, 83, 101, 72, 102, 55,
    ]);
    expect(
      decodeGen4AdvanceMatches(new Uint32Array([0, 100, 4, 104]).buffer),
    ).toEqual([
      { row: 0, advances: 100 },
      { row: 4, advances: 104 },
    ]);
  });
});
