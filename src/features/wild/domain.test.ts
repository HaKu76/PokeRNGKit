import { describe, expect, it } from "vitest";
import {
  createGen3WildChunks,
  createGen3WildSearcherChunks,
  decodeGen3WildStates,
  validateGen3WildSearcherRequest,
  isGen3WildTanobyChamber,
  validateGen3WildRequest,
  type Gen3WildRequest,
} from "./domain";

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
  filters: { natureMask: 0x1ff_ffff },
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

  it("recognizes the full decomp labels for unsupported Tanoby Chambers", () => {
    expect(
      isGen3WildTanobyChamber("Seven Island Tanoby Ruins Monean Chamber"),
    ).toBe(true);
    expect(isGen3WildTanobyChamber("Seven Island Tanoby Ruins")).toBe(false);
  });

  it("splits an IV search range deterministically", () => {
    const search = {
      method: "method1" as const,
      lead: "none" as const,
      feebasTile: false,
      version: "emerald" as const,
      tid: 12345,
      sid: 54321,
      area: request.area,
      filters: {
        natureMask: 0x1ff_ffff,
        ivMin: [30, 30, 30, 30, 30, 30] as [
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
      },
    };
    expect(validateGen3WildSearcherRequest(search)).toEqual([]);
    expect(createGen3WildSearcherChunks(search, 16)).toEqual([
      { index: 0, startIndex: 0, stateCount: 16 },
      { index: 1, startIndex: 16, stateCount: 16 },
      { index: 2, startIndex: 32, stateCount: 16 },
      { index: 3, startIndex: 48, stateCount: 16 },
    ]);
  });

  it("rejects inverted IV ranges before dispatching a Worker", () => {
    expect(
      validateGen3WildSearcherRequest({
        method: "method1",
        lead: "none",
        feebasTile: false,
        version: "emerald",
        tid: 0,
        sid: 0,
        area: request.area,
        filters: {
          natureMask: 1,
          ivMin: [31, 0, 0, 0, 0, 0],
          ivMax: [30, 31, 31, 31, 31, 31],
        },
      }),
    ).toContain("ivRange");
  });
});
