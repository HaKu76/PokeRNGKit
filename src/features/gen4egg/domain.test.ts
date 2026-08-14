import { describe, expect, it } from "vitest";
import {
  GEN4_EGG_SPECIES,
  getGen4EggAlternateSpecies,
  getGen4EggGenderRatio,
  getGen4EggGenderRatios,
} from "./data";
import {
  calculateGen4EggPoketch,
  createGen4EggGeneratorChunks,
  createGen4EggSearcherChunks,
  decodeGen4EggSearcherStates,
  decodeGen4EggStates,
  encodeGen4EggRequest,
  GEN4_EGG_GENERATOR_RESULT_WORDS,
  GEN4_EGG_REQUEST_WORDS,
  GEN4_EGG_SEARCHER_RESULT_WORDS,
  gen4EggSearcherSeedCount,
  isGen4EggParentCombinationValid,
  validateGen4EggGeneratorRequest,
  validateGen4EggSearcherRequest,
  type Gen4EggGeneratorRequest,
  type Gen4EggParent,
  type Gen4EggParentGender,
  type Gen4EggSearcherRequest,
} from "./domain";

const generatorRequest: Gen4EggGeneratorRequest = {
  game: "dppt",
  seedHeld: 0x1234_5678,
  seedPickup: 0x9abc_def0,
  initialAdvancesHeld: 10,
  maxAdvancesHeld: 4_500,
  offsetHeld: 2,
  initialAdvancesPickup: 20,
  maxAdvancesPickup: 5,
  offsetPickup: 3,
  species: 29,
  genderRatio: 254,
  alternateGenderRatio: 0,
  tid: 12_345,
  sid: 54_321,
  masuda: true,
  parentA: {
    ivs: [31, 30, 29, 28, 27, 26],
    gender: "male",
  },
  parentB: {
    ivs: [0, 1, 2, 3, 4, 5],
    gender: "female",
  },
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

const searcherRequest: Gen4EggSearcherRequest = {
  game: "hgss",
  initialAdvancesHeld: 10,
  maxAdvancesHeld: 30,
  initialAdvancesPickup: 20,
  maxAdvancesPickup: 100,
  minDelay: 600,
  maxDelay: 600,
  species: generatorRequest.species,
  genderRatio: generatorRequest.genderRatio,
  alternateGenderRatio: generatorRequest.alternateGenderRatio,
  tid: generatorRequest.tid,
  sid: generatorRequest.sid,
  masuda: generatorRequest.masuda,
  parentA: generatorRequest.parentA,
  parentB: generatorRequest.parentB,
  filters: generatorRequest.filters,
};

function parent(gender: Gen4EggParentGender): Gen4EggParent {
  return { ivs: [31, 31, 31, 31, 31, 31], gender };
}

describe("Gen4 Egg data", () => {
  it("loads the upstream Gen4 allowlist and special paired species", () => {
    expect(GEN4_EGG_SPECIES).toHaveLength(221);
    expect(GEN4_EGG_SPECIES[0]).toBe(1);
    expect(GEN4_EGG_SPECIES.at(-1)).toBe(489);
    expect(GEN4_EGG_SPECIES).toContain(29);
    expect(GEN4_EGG_SPECIES).toContain(314);
    expect(GEN4_EGG_SPECIES).not.toContain(493);
    expect(getGen4EggAlternateSpecies(29)).toBe(32);
    expect(getGen4EggAlternateSpecies(314)).toBe(313);
    expect(getGen4EggAlternateSpecies(1)).toBeUndefined();
  });

  it("reads matching DPPt and HGSS personal gender ratios", () => {
    expect(getGen4EggGenderRatio("dppt", 29)).toBe(254);
    expect(getGen4EggGenderRatio("hgss", 32)).toBe(0);
    expect(getGen4EggGenderRatio("dppt", 314)).toBe(254);
    expect(getGen4EggGenderRatio("hgss", 313)).toBe(0);
    expect(getGen4EggGenderRatios("dppt", 29)).toEqual({
      genderRatio: 254,
      alternateGenderRatio: 0,
    });
    expect(getGen4EggGenderRatios("hgss", 1)).toEqual({
      genderRatio: 31,
      alternateGenderRatio: 31,
    });
    expect(() => getGen4EggGenderRatio("dppt", 494)).toThrow(RangeError);
  });
});

describe("Gen4 Egg domain", () => {
  it("enforces all upstream-compatible parent gender combinations", () => {
    const valid: [Gen4EggParentGender, Gen4EggParentGender][] = [
      ["male", "female"],
      ["female", "male"],
      ["ditto", "female"],
      ["female", "ditto"],
      ["male", "ditto"],
      ["ditto", "male"],
      ["genderless", "ditto"],
      ["ditto", "genderless"],
    ];
    for (const [left, right] of valid) {
      expect(isGen4EggParentCombinationValid(parent(left), parent(right))).toBe(
        true,
      );
    }
    expect(
      isGen4EggParentCombinationValid(parent("male"), parent("male")),
    ).toBe(false);
    expect(
      isGen4EggParentCombinationValid(parent("genderless"), parent("female")),
    ).toBe(false);
    expect(
      isGen4EggParentCombinationValid(parent("ditto"), parent("ditto")),
    ).toBe(false);
  });

  it("validates generator field ranges, paired filters and overflow", () => {
    expect(validateGen4EggGeneratorRequest(generatorRequest)).toEqual([]);
    expect(
      validateGen4EggGeneratorRequest({
        ...generatorRequest,
        tid: 0x1_0000,
        species: 494,
        genderRatio: 256,
      }),
    ).toEqual(expect.arrayContaining(["tid", "species", "genderRatio"]));
    expect(
      validateGen4EggGeneratorRequest({
        ...generatorRequest,
        initialAdvancesHeld: 0xffff_ffff,
        maxAdvancesHeld: 1,
      }),
    ).toContain("heldAdvanceRange");
    expect(
      validateGen4EggGeneratorRequest({
        ...generatorRequest,
        initialAdvancesPickup: 0xffff_ffff,
        offsetPickup: 1,
      }),
    ).toContain("pickupAdvanceRange");
    expect(
      validateGen4EggGeneratorRequest({
        ...generatorRequest,
        maxAdvancesHeld: 10_000,
        maxAdvancesPickup: 10_000,
      }),
    ).toContain("combinationRange");
    expect(
      validateGen4EggGeneratorRequest({
        ...generatorRequest,
        parentA: { ...generatorRequest.parentA, ivs: [32, 30, 29, 28, 27, 26] },
        filters: {
          ...generatorRequest.filters,
          natureMask: 0,
          hiddenPowerMask: 0x1_0000,
          ivMin: [31, 0, 0, 0, 0, 0],
          ivMax: [30, 31, 31, 31, 31, 31],
        },
      }),
    ).toEqual(
      expect.arrayContaining(["parentAIv0", "nature", "hiddenPower", "iv0"]),
    );
  });

  it("validates search delay, advance and search-space ranges", () => {
    expect(validateGen4EggSearcherRequest(searcherRequest)).toEqual([]);
    expect(
      validateGen4EggSearcherRequest({
        ...searcherRequest,
        minDelay: 601,
      }),
    ).toContain("delayRange");
    expect(
      validateGen4EggSearcherRequest({
        ...searcherRequest,
        initialAdvancesHeld: 0xffff_ffff,
        maxAdvancesHeld: 1,
      }),
    ).toContain("heldAdvanceRange");
    expect(
      validateGen4EggSearcherRequest({
        ...searcherRequest,
        minDelay: 0,
        maxDelay: 10_000,
      }),
    ).toContain("searchRange");
    expect(
      validateGen4EggSearcherRequest({
        ...searcherRequest,
        maxAdvancesHeld: 10_000,
        maxAdvancesPickup: 10_000,
      }),
    ).toContain("combinationRange");
  });

  it("splits generator advances and search seeds deterministically", () => {
    expect(createGen4EggGeneratorChunks(generatorRequest)).toEqual([
      {
        index: 0,
        initialAdvancesHeld: 10,
        maxAdvancesHeld: 1_999,
        stateCount: 2_000,
      },
      {
        index: 1,
        initialAdvancesHeld: 2_010,
        maxAdvancesHeld: 1_999,
        stateCount: 2_000,
      },
      {
        index: 2,
        initialAdvancesHeld: 4_010,
        maxAdvancesHeld: 500,
        stateCount: 501,
      },
    ]);
    expect(gen4EggSearcherSeedCount(searcherRequest)).toBe(6_144);
    expect(createGen4EggSearcherChunks(searcherRequest, 2_500)).toEqual([
      { index: 0, startIndex: 0, stateCount: 2_500 },
      { index: 1, startIndex: 2_500, stateCount: 2_500 },
      { index: 2, startIndex: 5_000, stateCount: 1_144 },
    ]);
    expect(
      createGen4EggGeneratorChunks(
        {
          ...generatorRequest,
          maxAdvancesHeld: 100_000,
          maxAdvancesPickup: 0,
        },
        200_000,
      ).map((chunk) => chunk.stateCount),
    ).toEqual([100_000, 1]);
    expect(
      createGen4EggSearcherChunks(
        { ...searcherRequest, minDelay: 0, maxDelay: 20 },
        200_000,
      ).map((chunk) => chunk.stateCount),
    ).toEqual([100_000, 29_024]);
    expect(() => createGen4EggGeneratorChunks(generatorRequest, 0)).toThrow(
      RangeError,
    );
    expect(() => createGen4EggSearcherChunks(searcherRequest, 0)).toThrow(
      RangeError,
    );
  });

  it("encodes the complete 48-word Generator and Searcher requests", () => {
    const generator = encodeGen4EggRequest(generatorRequest);
    expect(generator).toHaveLength(GEN4_EGG_REQUEST_WORDS);
    expect(Array.from(generator.slice(0, 15))).toEqual([
      0, 0x1234_5678, 0x9abc_def0, 10, 4_500, 2, 20, 5, 3, 29, 254, 0, 12_345,
      54_321, 1,
    ]);
    expect(Array.from(generator.slice(46))).toEqual([0, 0]);

    const searcher = encodeGen4EggRequest(searcherRequest);
    expect(searcher).toHaveLength(GEN4_EGG_REQUEST_WORDS);
    expect(Array.from(searcher.slice(0, 9))).toEqual([
      1, 0, 0, 10, 30, 0, 20, 100, 0,
    ]);
    expect(Array.from(searcher.slice(46))).toEqual([600, 600]);
  });

  it("decodes the 23-word Generator and 25-word Searcher records", () => {
    const stateWords = [
      4, 8, 0xf041_2a72, 0, 1, 22, 2, 31, 30, 29, 28, 27, 26, 2, 1, 0, 2, 0, 1,
      15, 70, 2, 63,
    ];
    expect(stateWords).toHaveLength(GEN4_EGG_GENERATOR_RESULT_WORDS);
    expect(decodeGen4EggStates(Uint32Array.from(stateWords).buffer)).toEqual([
      {
        advances: 4,
        pickupAdvances: 8,
        pid: 0xf041_2a72,
        ability: 0,
        gender: 1,
        nature: 22,
        shiny: 2,
        ivs: [31, 30, 29, 28, 27, 26],
        inheritance: [2, 1, 0, 2, 0, 1],
        hiddenPower: 15,
        hiddenPowerStrength: 70,
        call: 2,
        chatot: 63,
      },
    ]);

    const searcherWords = [0x0017_0258, 600, ...stateWords];
    expect(searcherWords).toHaveLength(GEN4_EGG_SEARCHER_RESULT_WORDS);
    expect(
      decodeGen4EggSearcherStates(Uint32Array.from(searcherWords).buffer)[0],
    ).toEqual({
      seed: 0x0017_0258,
      delay: 600,
      advances: 4,
      pickupAdvances: 8,
      pid: 0xf041_2a72,
      ability: 0,
      gender: 1,
      nature: 22,
      shiny: 2,
      ivs: [31, 30, 29, 28, 27, 26],
      inheritance: [2, 1, 0, 2, 0, 1],
      hiddenPower: 15,
      hiddenPowerStrength: 70,
      call: 2,
      chatot: 63,
    });
    expect(() => decodeGen4EggStates(new Uint32Array(22).buffer)).toThrow(
      RangeError,
    );
    expect(() =>
      decodeGen4EggSearcherStates(new Uint32Array(24).buffer),
    ).toThrow(RangeError);
  });

  it("calculates the DPPt Poketch boundaries", () => {
    expect(calculateGen4EggPoketch(0)).toEqual({
      happinessDoubleTaps: 0,
      coinFlipTaps: 0,
      note: "doNotSwitchToHappiness",
    });
    expect(calculateGen4EggPoketch(11)).toEqual({
      happinessDoubleTaps: 0,
      coinFlipTaps: 11,
      note: "doNotSwitchToHappiness",
    });
    expect(calculateGen4EggPoketch(12)).toEqual({
      happinessDoubleTaps: 0,
      coinFlipTaps: 0,
      note: "switchOnceWithoutClicking",
    });
    expect(calculateGen4EggPoketch(24)).toEqual({
      happinessDoubleTaps: 1,
      coinFlipTaps: 0,
      note: "none",
    });
    expect(() => calculateGen4EggPoketch(0x1_0000_0000)).toThrow(RangeError);
  });
});
