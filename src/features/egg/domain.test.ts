import { describe, expect, it } from "vitest";
import {
  createGen3EggChunks,
  decodeGen3EggStates,
  isGen3EggParentCombinationValid,
  validateGen3EggRequest,
  type Gen3EggRequest,
} from "./domain";

const request: Gen3EggRequest = {
  game: "emerald",
  method: "normal",
  seedHeld: 0,
  seedPickup: 0,
  initialAdvancesHeld: 0,
  maxAdvancesHeld: 20_000,
  offsetHeld: 0,
  initialAdvancesPickup: 0,
  maxAdvancesPickup: 0,
  offsetPickup: 0,
  calibration: 18,
  minRedraws: 0,
  maxRedraws: 5,
  compatibility: 70,
  species: 1,
  genderRatio: 31,
  alternateGenderRatio: 31,
  tid: 12_345,
  sid: 54_321,
  parentA: {
    ivs: [31, 31, 31, 31, 31, 31],
    gender: "male",
    item: "none",
    nature: 0,
  },
  parentB: {
    ivs: [31, 31, 31, 31, 31, 31],
    gender: "female",
    item: "everstone",
    nature: 0,
  },
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

describe("Gen3 Egg domain", () => {
  it("splits inclusive held advances within the Wasm pair limit", () => {
    expect(createGen3EggChunks(request)).toEqual([
      {
        index: 0,
        initialAdvancesHeld: 0,
        maxAdvancesHeld: 16_665,
        stateCount: 16_666,
      },
      {
        index: 1,
        initialAdvancesHeld: 16_666,
        maxAdvancesHeld: 3_334,
        stateCount: 3_335,
      },
    ]);
  });

  it("enforces the upstream parent gender combinations", () => {
    expect(
      isGen3EggParentCombinationValid(request.parentA, request.parentB),
    ).toBe(true);
    expect(
      isGen3EggParentCombinationValid(
        { ...request.parentA, gender: "male" },
        { ...request.parentB, gender: "male" },
      ),
    ).toBe(false);
  });

  it("rejects paired range and RS/FRLG seed errors", () => {
    expect(
      validateGen3EggRequest({ ...request, minRedraws: 8, maxRedraws: 7 }),
    ).toContain("redraws");
    expect(
      validateGen3EggRequest({
        ...request,
        game: "rsfrlg",
        seedHeld: 0x1_0000,
      }),
    ).toContain("seed");
    expect(validateGen3EggRequest({ ...request, method: "mixed" })).toContain(
      "method",
    );
    expect(
      validateGen3EggRequest({
        ...request,
        filters: { ...request.filters, natureMask: 0x1ff_ffff },
      }),
    ).toEqual([]);
    expect(
      validateGen3EggRequest({
        ...request,
        filters: { ...request.filters, natureMask: 0x200_0000 },
      }),
    ).toContain("nature");
  });

  it("decodes the 22-word C ABI state schema", () => {
    const words = new Uint32Array([
      4, 8, 1, 0xf041_2a72, 0, 1, 22, 0, 31, 30, 29, 28, 27, 26, 2, 1, 0, 2, 0,
      1, 15, 70,
    ]);
    expect(decodeGen3EggStates(words.buffer)).toEqual([
      {
        advances: 4,
        pickupAdvances: 8,
        redraws: 1,
        pid: 0xf041_2a72,
        ability: 0,
        gender: 1,
        nature: 22,
        shiny: 0,
        ivs: [31, 30, 29, 28, 27, 26],
        inheritance: [2, 1, 0, 2, 0, 1],
        hiddenPower: 15,
        hiddenPowerStrength: 70,
      },
    ]);
  });
});
