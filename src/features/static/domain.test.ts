import { describe, expect, it } from "vitest";
import {
  createGen3StaticChunks,
  decodeGen3StaticStates,
  GEN3_STATIC_TEMPLATES,
  validateGen3StaticRequest,
  type Gen3StaticRequest,
} from "./domain";

const request: Gen3StaticRequest = {
  seed: 0x12345678,
  initialAdvances: 12,
  maxAdvances: 249_999,
  offset: 4,
  method: "method1",
  template: GEN3_STATIC_TEMPLATES[0],
  tid: 0,
  sid: 0,
  filters: {
    shiny: "any",
    gender: "any",
    ability: "any",
    nature: -1,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
};

describe("Gen3 Static domain", () => {
  it("splits inclusive advances into Wasm-sized chunks", () => {
    expect(createGen3StaticChunks(request)).toEqual([
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

  it("decodes the 48-byte C ABI state schema", () => {
    const words = new Uint32Array([
      7,
      0x84ea0b71,
      10,
      12,
      22,
      7,
      29,
      0,
      1,
      2,
      70,
      15 | (2 << 8),
    ]);

    expect(decodeGen3StaticStates(words.buffer)).toEqual([
      {
        advances: 7,
        pid: 0x84ea0b71,
        ivs: [10, 12, 22, 7, 29, 0],
        ability: 1,
        gender: 2,
        level: 70,
        nature: 15,
        shiny: 2,
      },
    ]);
  });

  it("rejects invalid IV ranges and advance overflow", () => {
    expect(
      validateGen3StaticRequest({
        ...request,
        filters: {
          ...request.filters,
          ivMin: [31, 0, 0, 0, 0, 0],
          ivMax: [30, 31, 31, 31, 31, 31],
        },
      }),
    ).toContain("iv0");

    expect(
      validateGen3StaticRequest({
        ...request,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toContain("advanceRange");
  });
});
