import { describe, expect, it } from "vitest";
import {
  decodeGen4ChainedSidResults,
  packGen4ChainedSidEntries,
  validateGen4ChainedSidRequest,
  type Gen4ChainedSidRequest,
} from "./domain";

const request: Gen4ChainedSidRequest = {
  tid: 12345,
  entries: [
    {
      ivs: [7, 29, 18, 14, 23, 22],
      ability: 22,
      gender: 0,
      nature: 11,
      ability0: 22,
      ability1: 22,
      genderRatio: 127,
    },
  ],
};

describe("Gen4 chained SID domain", () => {
  it("validates the upstream TID and stat limits", () => {
    expect(validateGen4ChainedSidRequest(request)).toEqual([]);
    expect(validateGen4ChainedSidRequest({ ...request, tid: 65536 })).toEqual([
      "tid",
    ]);
    expect(
      validateGen4ChainedSidRequest({
        ...request,
        entries: [{ ...request.entries[0], ivs: [652, 0, 0, 0, 0, 0] }],
      }),
    ).toEqual(["entries"]);
  });

  it("packs the fixed twelve-word entry", () => {
    expect(Array.from(packGen4ChainedSidEntries(request.entries))).toEqual([
      7, 29, 18, 14, 23, 22, 22, 0, 11, 22, 22, 127,
    ]);
  });

  it("decodes SID candidates", () => {
    expect(
      decodeGen4ChainedSidResults(new Uint32Array([0, 8, 54320]).buffer),
    ).toEqual([0, 8, 54320]);
  });
});
