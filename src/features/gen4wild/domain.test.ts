import { describe, expect, it } from "vitest";
import {
  createGen4WildChunks,
  createGen4WildSearcherChunks,
  decodeGen4WildSearcherStates,
  decodeGen4WildStates,
  gen4WildSearcherCombinationCount,
  packGen4WildSlots,
  validateGen4WildGeneratorRequest,
  validateGen4WildSearcherRequest,
  type Gen4IvTuple,
  type Gen4WildArea,
  type Gen4WildGeneratorRequest,
  type Gen4WildSearcherRequest,
} from "./domain";

const slot = {
  species: 278,
  form: 0,
  minLevel: 38,
  maxLevel: 40,
  stats: [40, 30, 30, 85, 55, 30] as const,
  types: [11, 2] as const,
  genderRatio: 127,
  items: [0, 0, 0] as const,
  abilities: [51, 51, 0] as const,
};

const area: Gen4WildArea = {
  id: "platinum-170-grass",
  game: "platinum",
  location: 170,
  name: "Route 222",
  encounter: "grass",
  rate: 30,
  slots: [slot],
};

const generatorRequest: Gen4WildGeneratorRequest = {
  seed: 0x1746b9c4,
  initialAdvances: 12,
  maxAdvances: 100_000,
  offset: 4,
  method: "methodJ",
  lead: "none",
  synchronizeNature: 0,
  feebasTile: false,
  pokeRadarShiny: false,
  unownRadio: false,
  happiness: 0,
  fixedSlot: 0,
  profile: {
    version: "platinum",
    tid: 12345,
    sid: 54321,
    nationalDex: true,
    unownDiscovered: Array(26).fill(false),
    unownPuzzles: Array(4).fill(false),
  },
  area,
  filters: {
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    encounterSlotMask: 1,
    levelMin: 1,
    levelMax: 100,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  },
};

const searcherRequest: Gen4WildSearcherRequest = {
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

describe("Gen IV Wild domain", () => {
  it("splits inclusive advances and IV combinations deterministically", () => {
    expect(createGen4WildChunks(generatorRequest)).toEqual([
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
    expect(gen4WildSearcherCombinationCount(searcherRequest)).toBe(64);
    expect(createGen4WildSearcherChunks(searcherRequest, 40)).toEqual([
      { index: 0, startIndex: 0, stateCount: 40 },
      { index: 1, startIndex: 40, stateCount: 24 },
    ]);

    const perfectSearcher = {
      ...searcherRequest,
      filters: {
        ...searcherRequest.filters,
        ivMin: [0, 0, 0, 0, 0, 0] as Gen4IvTuple,
        perfectIvValue: 31,
        perfectIvCount: 5,
      },
    };
    expect(gen4WildSearcherCombinationCount(perfectSearcher)).toBe(187);
  });

  it("packs 19-word slots and decodes 22-word result records", () => {
    expect(Array.from(packGen4WildSlots([slot]))).toEqual([
      278, 0, 38, 40, 40, 30, 30, 85, 55, 30, 11, 2, 127, 0, 0, 0, 51, 51, 0,
    ]);

    const generator = new Uint32Array([
      7, 50, 0x59b3c393, 27, 23, 6, 31, 22, 19, 1, 1, 38, 22, 0, 4, 278, 0, 0,
      6, 70, 1, 7,
    ]);
    expect(decodeGen4WildStates(generator.buffer)[0]).toEqual({
      advances: 7,
      battleAdvances: 50,
      pid: 0x59b3c393,
      ivs: [27, 23, 6, 31, 22, 19],
      ability: 1,
      gender: 1,
      level: 38,
      nature: 22,
      shiny: 0,
      encounterSlot: 4,
      species: 278,
      form: 0,
      item: 0,
      hiddenPower: 6,
      hiddenPowerStrength: 70,
      call: 1,
      chatot: 7,
    });

    const searcher = new Uint32Array([
      0x00170258, 600, 23, 19, 0x59b3c393, 27, 23, 6, 31, 22, 19, 1, 1, 38, 22,
      0, 4, 278, 0, 0, 6, 70,
    ]);
    expect(decodeGen4WildSearcherStates(searcher.buffer)[0]).toMatchObject({
      seed: 0x00170258,
      delay: 600,
      hour: 23,
      advances: 19,
      pid: 0x59b3c393,
      ivs: [27, 23, 6, 31, 22, 19],
      encounterSlot: 4,
      species: 278,
      hiddenPower: 6,
      hiddenPowerStrength: 70,
    });
  });

  it("validates profile, method, fixed-slot and numeric boundaries", () => {
    expect(validateGen4WildGeneratorRequest(generatorRequest)).toEqual([]);
    expect(
      validateGen4WildGeneratorRequest({
        ...generatorRequest,
        profile: { ...generatorRequest.profile, version: "diamond" },
      }),
    ).toContain("area");
    expect(
      validateGen4WildGeneratorRequest({
        ...generatorRequest,
        area: {
          ...area,
          slots: [{ ...slot, maxLevel: 256 }],
        },
      }),
    ).toContain("area");
    expect(
      validateGen4WildGeneratorRequest({
        ...generatorRequest,
        method: "methodJ",
        area: { ...area, encounter: "honey-tree" },
      }),
    ).toContain("method");
    expect(
      validateGen4WildGeneratorRequest({
        ...generatorRequest,
        method: "pokeRadar",
        area: { ...area, slots: [slot, slot] },
        filters: { ...generatorRequest.filters, encounterSlotMask: 3 },
      }),
    ).toContain("fixedSlot");
    expect(
      validateGen4WildSearcherRequest({
        ...searcherRequest,
        maxDelay: 65_536,
      }),
    ).toContain("delayRange");
  });

  it("requires a flawless IV for Bug Catching Contest and HGSS Safari searches", () => {
    const heartGoldRequest: Gen4WildSearcherRequest = {
      ...searcherRequest,
      method: "methodK",
      profile: { ...searcherRequest.profile, version: "heartgold" },
      area: {
        ...area,
        id: "heartgold-148-grass",
        game: "heartgold",
        location: 148,
      },
    };
    expect(validateGen4WildSearcherRequest(heartGoldRequest)).toContain(
      "flawlessIv",
    );
    expect(
      validateGen4WildSearcherRequest({
        ...heartGoldRequest,
        filters: {
          ...heartGoldRequest.filters,
          ivMin: [31, 30, 30, 30, 30, 30],
        },
      }),
    ).not.toContain("flawlessIv");

    expect(
      validateGen4WildSearcherRequest({
        ...heartGoldRequest,
        area: {
          ...heartGoldRequest.area,
          location: 100,
          encounter: "bug-catching-contest",
        },
      }),
    ).toContain("flawlessIv");
  });

  it("rejects malformed ABI record lengths", () => {
    expect(() => decodeGen4WildStates(new Uint32Array(21).buffer)).toThrow(
      RangeError,
    );
    expect(() =>
      decodeGen4WildSearcherStates(new Uint32Array(23).buffer),
    ).toThrow(RangeError);
  });
});
