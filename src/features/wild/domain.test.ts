import { describe, expect, it } from "vitest";
import {
  createGen3WildChunks,
  createGen3WildSearcherChunks,
  decodeGen3WildStates,
  decodeGen3WildSearcherStates,
  gen3WildSearcherCombinationCount,
  isGen3WildTanobyChamber,
  validateGen3WildRequest,
  validateGen3WildSearcherRequest,
  type Gen3WildRequest,
  type Gen3WildSearcherRequest,
} from "./domain";
import {
  GEN3_WILD_TANOBY_FORMS,
  getGen3WildSlotForm,
  getGen3WildSpeciesName,
} from "./tanoby";

const request: Gen3WildRequest = {
  seed: 0,
  initialAdvances: 0,
  maxAdvances: 100_000,
  offset: 0,
  method: "method1",
  lead: "none",
  synchronizeNature: 0,
  feebasTile: false,
  bike: false,
  item: "none",
  version: "emerald",
  tid: 12345,
  sid: 54321,
  area: {
    name: "Route 111",
    encounter: "land",
    rate: 10,
    feebasLocation: false,
    safariZone: false,
    slots: [
      {
        species: 328,
        form: 0,
        minLevel: 20,
        maxLevel: 20,
        genderRatio: 127,
        type1: 4,
        type2: 4,
      },
    ],
  },
  filters: {
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    encounterSlotMask: 0xfff,
    levelMin: 1,
    levelMax: 100,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  },
};

describe("Gen3 wild domain", () => {
  it("uses deterministic chunks that preserve the displayed advances", () => {
    const chunks = createGen3WildChunks(request);
    expect(chunks).toEqual([
      {
        index: 0,
        initialAdvances: 0,
        maxAdvances: 99_999,
        stateCount: 100_000,
      },
      { index: 1, initialAdvances: 100_000, maxAdvances: 0, stateCount: 1 },
    ]);
  });

  it("validates the uint32 advance sum", () => {
    expect(validateGen3WildRequest(request)).toEqual([]);
    expect(
      validateGen3WildRequest({
        ...request,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toContain("advanceRange");
  });

  it("validates every PokeFinder wild filter boundary", () => {
    expect(
      validateGen3WildRequest({
        ...request,
        filters: { ...request.filters, levelMin: 21, levelMax: 20 },
      }),
    ).toContain("level");
    expect(
      validateGen3WildRequest({
        ...request,
        filters: {
          ...request.filters,
          ivMin: [0, 0, 0, 0, 0, 32],
        },
      }),
    ).toContain("iv5");
    expect(
      validateGen3WildRequest({
        ...request,
        filters: { ...request.filters, hiddenPowerMask: 0 },
      }),
    ).toContain("hiddenPower");
    expect(
      validateGen3WildRequest({
        ...request,
        filters: { ...request.filters, encounterSlotMask: 0 },
      }),
    ).toContain("encounterSlot");
  });

  it("matches the Gen III Personal type boundary used by the bridge", () => {
    expect(
      validateGen3WildRequest({
        ...request,
        area: {
          ...request.area,
          slots: [{ ...request.area.slots[0], type1: 17 }],
        },
      }),
    ).toContain("slot");
  });

  it("decodes the fixed 60-byte Wasm record", () => {
    const words = new Uint32Array([
      7,
      0x12345678,
      1,
      2,
      3,
      4,
      5,
      6,
      1,
      0,
      20,
      17 | (2 << 8),
      3,
      328,
      0,
    ]);
    expect(decodeGen3WildStates(words.buffer)).toEqual([
      {
        advances: 7,
        pid: 0x12345678,
        ivs: [1, 2, 3, 4, 5, 6],
        ability: 1,
        gender: 0,
        level: 20,
        nature: 17,
        shiny: 2,
        encounterSlot: 3,
        species: 328,
        form: 0,
      },
    ]);
  });

  it("recognizes only the seven verified Tanoby Chamber labels", () => {
    expect(
      isGen3WildTanobyChamber("Seven Island Tanoby Ruins Monean Chamber"),
    ).toBe(true);
    expect(isGen3WildTanobyChamber("Seven Island Tanoby Ruins")).toBe(false);
    expect(
      isGen3WildTanobyChamber("Seven Island Tanoby Ruins Custom Chamber"),
    ).toBe(false);
  });

  it("maps all seven Tanoby Chamber Unown forms from EncounterTableGenerator", () => {
    expect(Object.keys(GEN3_WILD_TANOBY_FORMS)).toHaveLength(7);
    expect(
      GEN3_WILD_TANOBY_FORMS["Seven Island Tanoby Ruins Liptoo Chamber"],
    ).toEqual([2, 2, 2, 3, 3, 3, 7, 7, 7, 20, 20, 14]);
    expect(
      getGen3WildSlotForm("Seven Island Tanoby Ruins Viapois Chamber", 11),
    ).toBe(26);
    expect(getGen3WildSpeciesName("zh", 201, 27)).toBe("未知图腾 (?)");
  });

  it("rejects malformed Tanoby Chamber requests", () => {
    expect(
      validateGen3WildRequest({
        ...request,
        version: "firered",
        area: {
          ...request.area,
          name: "Seven Island Tanoby Ruins Liptoo Chamber",
        },
      }),
    ).toContain("tanobyChamber");
  });

  it("chunks the searcher IV Cartesian product in deterministic order", () => {
    const searcher: Gen3WildSearcherRequest = {
      method: request.method,
      lead: request.lead,
      feebasTile: request.feebasTile,
      bike: request.bike,
      item: request.item,
      version: request.version,
      tid: request.tid,
      sid: request.sid,
      area: request.area,
      filters: {
        ...request.filters,
        ivMin: [30, 31, 31, 31, 31, 30],
        ivMax: [31, 31, 31, 31, 31, 31],
        perfectIvValue: 31,
        perfectIvCount: 0,
      },
    };
    expect(gen3WildSearcherCombinationCount(searcher)).toBe(4);
    expect(createGen3WildSearcherChunks(searcher, 3)).toEqual([
      { index: 0, startIndex: 0, stateCount: 3 },
      { index: 1, startIndex: 3, stateCount: 1 },
    ]);
    expect(validateGen3WildSearcherRequest(searcher)).toEqual([]);

    const perfectSearcher = {
      ...searcher,
      filters: {
        ...searcher.filters,
        ivMin: [0, 0, 0, 0, 0, 0] as [
          number,
          number,
          number,
          number,
          number,
          number,
        ],
        ivMax: [31, 31, 31, 31, 31, 31] as [
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
    expect(gen3WildSearcherCombinationCount(perfectSearcher)).toBe(187);
  });

  it("decodes the first searcher result word as Seed", () => {
    const words = new Uint32Array([
      0x12345678, 0x87654321, 31, 30, 29, 28, 27, 26, 1, 0, 20, 17, 3, 328, 0,
    ]);
    expect(decodeGen3WildSearcherStates(words.buffer)[0]).toMatchObject({
      seed: 0x12345678,
      pid: 0x87654321,
      ivs: [31, 30, 29, 28, 27, 26],
    });
  });
});
