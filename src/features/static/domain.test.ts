import { describe, expect, it } from "vitest";
import {
  createGen3StaticChunks,
  createGen3StaticSearcherChunks,
  decodeGen3StaticStates,
  gen3StaticSearcherCombinationCount,
  gen3HiddenPower,
  validateGen3StaticRequest,
  type Gen3StaticRequest,
  type Gen3StaticSearcherRequest,
} from "./domain";
import {
  GEN3_STATIC_TEMPLATES,
  gen3StaticCategoriesForVersion,
  gen3StaticTemplatesForVersion,
} from "./encounters";

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
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
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

  it("splits the reverse IV space into deterministic chunks", () => {
    const searcherRequest: Gen3StaticSearcherRequest = {
      method: request.method,
      template: request.template,
      tid: request.tid,
      sid: request.sid,
      filters: {
        ...request.filters,
        ivMin: [30, 30, 30, 30, 30, 30],
      },
    };
    expect(gen3StaticSearcherCombinationCount(searcherRequest)).toBe(64);
    expect(createGen3StaticSearcherChunks(searcherRequest, 40)).toEqual([
      { index: 0, startIndex: 0, stateCount: 40 },
      { index: 1, startIndex: 40, stateCount: 24 },
    ]);

    const perfectRequest = {
      ...searcherRequest,
      filters: {
        ...searcherRequest.filters,
        ivMin: [0, 0, 0, 0, 0, 0] as [
          number,
          number,
          number,
          number,
          number,
          number,
        ],
        perfectIvValue: 31,
        perfectIvCount: 5,
      },
    };
    expect(gen3StaticSearcherCombinationCount(perfectRequest)).toBe(187);
    expect(createGen3StaticSearcherChunks(perfectRequest, 200)).toEqual([
      { index: 0, startIndex: 0, stateCount: 187 },
    ]);
  });

  it("calculates the Generation III Hidden Power type and strength", () => {
    expect(gen3HiddenPower([10, 12, 22, 7, 29, 0])).toEqual({
      type: 11,
      power: 43,
    });
    expect(gen3HiddenPower([31, 31, 31, 31, 31, 31])).toEqual({
      type: 15,
      power: 70,
    });
  });

  it("filters all upstream handheld encounters by profile version", () => {
    expect(GEN3_STATIC_TEMPLATES).toHaveLength(67);
    expect(gen3StaticCategoriesForVersion("ruby")).not.toContain("gameCorner");
    expect(gen3StaticCategoriesForVersion("ruby")).not.toContain("events");
    expect(gen3StaticCategoriesForVersion("firered")).toContain("gameCorner");
    expect(
      gen3StaticTemplatesForVersion("leafgreen", "events").every((entry) =>
        entry.versions.includes("leafgreen"),
      ),
    ).toBe(true);
  });
});
