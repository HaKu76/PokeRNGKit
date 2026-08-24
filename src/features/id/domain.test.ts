import { describe, expect, it } from "vitest";
import {
  calculateRsSeed,
  createId3Chunks,
  decodeId3SearcherStates,
  decodeId3States,
  id3FilterFlags,
  parseHex,
  validateId3Request,
  validateId3SearcherRequest,
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
      { advances: 7, tid: 1234, sid: 5678, tsv: 640, shiny: 0 },
    ]);
  });

  it("matches the upstream Ruby/Sapphire date seed baseline", () => {
    expect(calculateRsSeed(new Date(2000, 0, 1, 0, 0))).toBe(0x05a0);
    expect(calculateRsSeed(new Date(2000, 0, 2, 0, 0))).toBe(0x0b40);
  });

  it("builds combined exact filter flags", () => {
    expect(id3FilterFlags({ tid: 1, sid: 2, tsv: 3 })).toBe(7);
  });

  it("interprets an empty Seed as zero", () => {
    expect(parseHex("")).toBe(0);
    expect(parseHex("   ")).toBe(0);
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

  it("validates the RS ID Searcher input widths", () => {
    expect(
      validateId3SearcherRequest({ mode: "sid", tid: 65535, input: 65535 }),
    ).toEqual([]);
    expect(
      validateId3SearcherRequest({ mode: "sid", tid: 0, input: 65536 }),
    ).toContain("sid");
    expect(
      validateId3SearcherRequest({ mode: "pid", tid: 0, input: 0xffffffff }),
    ).toEqual([]);
  });

  it("decodes the 24-byte ID Searcher schema", () => {
    const words = new Uint32Array([
      0x05a0,
      0,
      48163 | (64377 << 16),
      2283 | (2 << 16),
      2000 | (1 << 16) | (1 << 24),
      0,
    ]);
    expect(decodeId3SearcherStates(words.buffer)[0]).toEqual({
      seed: 0x05a0,
      frame: 0,
      tid: 48163,
      sid: 64377,
      tsv: 2283,
      shiny: 2,
      year: 2000,
      month: 1,
      day: 1,
      hour: 0,
      minute: 0,
    });
  });
});
