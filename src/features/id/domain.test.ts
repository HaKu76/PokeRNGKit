import { describe, expect, it } from "vitest";
import {
  calculateRsSeed,
  createId3Chunks,
  decodeId3States,
  id3FilterFlags,
  validateId3Request,
  type Id3Request,
} from "./domain";

const request: Id3Request = {
  mode: "xd-colo",
  input: 0,
  initialAdvances: 12,
  maxAdvances: 249_999,
  filters: {},
};

describe("ID3 domain", () => {
  it("splits inclusive advances into Wasm-sized chunks", () => {
    expect(createId3Chunks(request)).toEqual([
      {
        index: 0,
        initialAdvances: 12,
        maxAdvances: 99_999,
        stateCount: 100_000,
      },
      {
        index: 1,
        initialAdvances: 100_012,
        maxAdvances: 99_999,
        stateCount: 100_000,
      },
      {
        index: 2,
        initialAdvances: 200_012,
        maxAdvances: 49_999,
        stateCount: 50_000,
      },
    ]);
  });

  it("decodes the 12-byte C ABI state schema", () => {
    const words = new Uint32Array([7, 1234 | (5678 << 16), 640]);
    expect(decodeId3States(words.buffer)).toEqual([
      { advances: 7, tid: 1234, sid: 5678, tsv: 640 },
    ]);
  });

  it("matches the upstream Ruby/Sapphire date seed baseline", () => {
    expect(calculateRsSeed(new Date(2000, 0, 1, 0, 0))).toBe(0x05a0);
    expect(calculateRsSeed(new Date(2000, 0, 2, 0, 0))).toBe(0x0b40);
  });

  it("builds combined exact filter flags", () => {
    expect(id3FilterFlags({ tid: 1, sid: 2, tsv: 3 })).toBe(7);
  });

  it("rejects ranges that overflow the 32-bit advance counter", () => {
    expect(
      validateId3Request({
        ...request,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toContain("advanceRange");
  });
});
