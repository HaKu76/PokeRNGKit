import { describe, expect, it } from "vitest";
import {
  createGen4EventChunks,
  createGen4EventSearcherChunks,
  decodeGen4EventSearcherStates,
  decodeGen4EventStates,
  gen4EventSearcherCombinationCount,
  validateGen4EventGeneratorRequest,
  validateGen4EventSearcherRequest,
  type Gen4EventGeneratorRequest,
  type Gen4EventSearcherRequest,
} from "./domain";

const generatorRequest: Gen4EventGeneratorRequest = {
  seed: 0,
  initialAdvances: 12,
  maxAdvances: 1_249,
  offset: 4,
  species: 1,
  nature: 0,
  level: 1,
  filters: {
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
};

const searcherRequest: Gen4EventSearcherRequest = {
  ...generatorRequest,
  minAdvance: 0,
  maxAdvance: 1_000,
  minDelay: 600,
  maxDelay: 2_000,
  filters: {
    ...generatorRequest.filters,
    ivMin: [30, 30, 30, 30, 30, 30],
  },
};

describe("Gen IV Event domain", () => {
  it("splits inclusive advances into deterministic Wasm chunks", () => {
    expect(createGen4EventChunks(generatorRequest)).toEqual([
      {
        index: 0,
        initialAdvances: 12,
        maxAdvances: 499,
        stateCount: 500,
      },
      {
        index: 1,
        initialAdvances: 512,
        maxAdvances: 499,
        stateCount: 500,
      },
      {
        index: 2,
        initialAdvances: 1_012,
        maxAdvances: 249,
        stateCount: 250,
      },
    ]);
  });

  it("decodes Generator and Searcher C ABI records", () => {
    const generator = new Uint32Array([7, 0, 0, 0, 11, 26, 30, 3, 65, 0, 0]);
    expect(decodeGen4EventStates(generator.buffer)[0]).toEqual({
      advances: 7,
      ivs: [0, 0, 0, 11, 26, 30],
      hiddenPower: 3,
      hiddenPowerStrength: 65,
      call: 0,
      chatot: 0,
    });

    const searcher = new Uint32Array([
      0x00170258, 600, 23, 19, 0, 0, 0, 11, 26, 30, 3, 65,
    ]);
    expect(decodeGen4EventSearcherStates(searcher.buffer)[0]).toEqual({
      seed: 0x00170258,
      delay: 600,
      hour: 23,
      advances: 19,
      ivs: [0, 0, 0, 11, 26, 30],
      hiddenPower: 3,
      hiddenPowerStrength: 65,
    });
  });

  it("validates IV ranges and inclusive u32 inputs", () => {
    expect(
      validateGen4EventGeneratorRequest({
        ...generatorRequest,
        filters: {
          ...generatorRequest.filters,
          ivMin: [31, 0, 0, 0, 0, 0],
          ivMax: [30, 31, 31, 31, 31, 31],
        },
      }),
    ).toContain("iv0");
    expect(
      validateGen4EventGeneratorRequest({
        ...generatorRequest,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
        offset: 0,
      }),
    ).toContain("advanceRange");
    expect(
      validateGen4EventSearcherRequest({
        ...searcherRequest,
        minAdvance: 0xffff_ffff,
        maxAdvance: 0xffff_ffff,
        minDelay: 0xffff_ffff,
        maxDelay: 0xffff_ffff,
      }),
    ).toEqual([]);
    expect(
      validateGen4EventSearcherRequest({
        ...searcherRequest,
        minDelay: 2_001,
        maxDelay: 2_000,
      }),
    ).toContain("delayRange");
  });

  it("enumerates IV combinations in fixed chunks", () => {
    expect(gen4EventSearcherCombinationCount(searcherRequest)).toBe(64);
    expect(createGen4EventSearcherChunks(searcherRequest, 40)).toEqual([
      { index: 0, startIndex: 0, stateCount: 40 },
      { index: 1, startIndex: 40, stateCount: 24 },
    ]);
  });

  it("rejects non-positive chunk sizes and caps C ABI calls", () => {
    expect(() => createGen4EventChunks(generatorRequest, 0)).toThrow(
      RangeError,
    );
    expect(
      createGen4EventChunks(
        { ...generatorRequest, maxAdvances: 100_000 },
        200_000,
      ),
    ).toEqual([
      {
        index: 0,
        initialAdvances: 12,
        maxAdvances: 99_999,
        stateCount: 100_000,
      },
      {
        index: 1,
        initialAdvances: 100_012,
        maxAdvances: 0,
        stateCount: 1,
      },
    ]);
  });

  it("rejects Searcher IV products above two million combinations", () => {
    const oversized: Gen4EventSearcherRequest = {
      ...searcherRequest,
      filters: {
        ...searcherRequest.filters,
        ivMin: [0, 0, 0, 0, 0, 0],
        ivMax: [11, 11, 11, 11, 11, 11],
      },
    };
    expect(gen4EventSearcherCombinationCount(oversized)).toBe(2_985_984);
    expect(validateGen4EventSearcherRequest(oversized)).toContain(
      "searchRange",
    );
  });

  it("rejects malformed result buffers", () => {
    expect(() => decodeGen4EventStates(new Uint32Array(10).buffer)).toThrow(
      RangeError,
    );
    expect(() =>
      decodeGen4EventSearcherStates(new Uint32Array(11).buffer),
    ).toThrow(RangeError);
  });
});
