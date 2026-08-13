import { describe, expect, it } from "vitest";
import {
  createGen7IdChunks,
  decodeGen7IdStates,
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
      12345 | (54321 << 16),
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
});
