import { describe, expect, it } from "vitest";
import {
  createGen4StaticChunks,
  createGen4StaticSearcherChunks,
  decodeGen4StaticSearcherStates,
  decodeGen4StaticStates,
  GEN4_STATIC_TEMPLATES,
  gen4StaticCategoriesForVersion,
  gen4StaticSearcherCombinationCount,
  gen4StaticTemplatesForVersion,
  validateGen4StaticGeneratorRequest,
  validateGen4StaticSearcherRequest,
  type Gen4StaticGeneratorRequest,
  type Gen4StaticSearcherRequest,
} from "./domain";

const template = GEN4_STATIC_TEMPLATES.find(
  (entry) => entry.id === "starters-00",
)!;

const request: Gen4StaticGeneratorRequest = {
  seed: 0x12345678,
  initialAdvances: 12,
  maxAdvances: 1_249,
  offset: 4,
  method: template.method,
  lead: "none",
  syncNature: 0,
  tid: 12345,
  sid: 54321,
  template,
  filters: {
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
};

describe("Gen IV Static domain", () => {
  it("splits inclusive advances into deterministic Wasm chunks", () => {
    expect(createGen4StaticChunks(request)).toEqual([
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

  it("decodes generator and searcher C ABI records", () => {
    const generator = new Uint32Array([
      7, 0x84ea0b71, 10, 12, 22, 7, 29, 0, 1, 2, 70, 15, 2, 11, 43, 1, 62,
    ]);
    expect(decodeGen4StaticStates(generator.buffer)[0]).toEqual({
      advances: 7,
      pid: 0x84ea0b71,
      ivs: [10, 12, 22, 7, 29, 0],
      ability: 1,
      gender: 2,
      level: 70,
      nature: 15,
      shiny: 2,
      hiddenPower: 11,
      hiddenPowerStrength: 43,
      call: 1,
      chatot: 62,
    });

    const searcher = new Uint32Array([
      0x00170258, 600, 23, 19, 0x84ea0b71, 10, 12, 22, 7, 29, 0, 1, 2, 70, 15,
      2, 11, 43, 0, 0,
    ]);
    expect(decodeGen4StaticSearcherStates(searcher.buffer)[0]).toEqual({
      seed: 0x00170258,
      delay: 600,
      hour: 23,
      advances: 19,
      pid: 0x84ea0b71,
      ivs: [10, 12, 22, 7, 29, 0],
      ability: 1,
      gender: 2,
      level: 70,
      nature: 15,
      shiny: 2,
      hiddenPower: 11,
      hiddenPowerStrength: 43,
      call: 0,
      chatot: 0,
    });
  });

  it("validates IV, delay and advance ranges", () => {
    expect(
      validateGen4StaticGeneratorRequest({
        ...request,
        filters: {
          ...request.filters,
          ivMin: [31, 0, 0, 0, 0, 0],
          ivMax: [30, 31, 31, 31, 31, 31],
        },
      }),
    ).toContain("iv0");
    expect(
      validateGen4StaticGeneratorRequest({
        ...request,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toContain("advanceRange");

    const searcherRequest: Gen4StaticSearcherRequest = {
      ...request,
      minAdvance: 0,
      maxAdvance: 1000,
      minDelay: 600,
      maxDelay: 2000,
      filters: {
        ...request.filters,
        ivMin: [30, 30, 30, 30, 30, 30],
      },
    };
    expect(validateGen4StaticSearcherRequest(searcherRequest)).toEqual([]);
    expect(
      validateGen4StaticSearcherRequest({
        ...searcherRequest,
        minDelay: 2001,
      }),
    ).toContain("delayRange");
  });

  it("enumerates IV combinations in fixed chunks", () => {
    const searcherRequest: Gen4StaticSearcherRequest = {
      ...request,
      minAdvance: 0,
      maxAdvance: 1000,
      minDelay: 600,
      maxDelay: 2000,
      filters: {
        ...request.filters,
        ivMin: [30, 30, 30, 30, 30, 30],
      },
    };
    expect(gen4StaticSearcherCombinationCount(searcherRequest)).toBe(64);
    expect(createGen4StaticSearcherChunks(searcherRequest, 40)).toEqual([
      { index: 0, startIndex: 0, stateCount: 40 },
      { index: 1, startIndex: 40, stateCount: 24 },
    ]);
  });

  it("loads all 99 upstream templates and filters them by version", () => {
    expect(GEN4_STATIC_TEMPLATES).toHaveLength(99);
    expect(gen4StaticCategoriesForVersion("diamond")).not.toContain(
      "gameCorner",
    );
    expect(gen4StaticCategoriesForVersion("heartgold")).toContain("gameCorner");
    expect(
      gen4StaticTemplatesForVersion("platinum", "legends").every((entry) =>
        entry.versions.includes("platinum"),
      ),
    ).toBe(true);
    expect(
      GEN4_STATIC_TEMPLATES.find((entry) => entry.id === "stationary-08")
        ?.shinyLock,
    ).toBe("always");
  });
});
