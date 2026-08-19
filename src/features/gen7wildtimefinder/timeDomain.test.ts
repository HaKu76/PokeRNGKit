import { describe, expect, it } from "vitest";
import {
  encodeRequest,
  epochFromInput,
  resultPassesFilters,
  validateGen7WildTimeRequest,
  type Gen7WildTimeRequest,
} from "./timeDomain";

function request(): Gen7WildTimeRequest {
  return {
    version: "ultra-sun",
    startEpoch: epochFromInput("2024-01-01T00:00:00", 55) as bigint,
    endEpoch: epochFromInput("2024-01-01T00:00:01", 55) as bigint,
    tick: 0x041d9cb9,
    offset: 55,
    minFrame: 478,
    maxFrame: 478,
    encounter: "grass",
    synchronize: false,
    synchronizeNature: 0,
    genderRatio: 255,
    tid: 0,
    sid: 0,
    shinyCharm: false,
    filters: {
      disabled: false,
      shiny: "any",
      gender: "any",
      ability: "any",
      natureMask: 0x1ff_ffff,
      hiddenPowerMask: 0xffff,
      slotMask: 0,
      ivMin: [0, 0, 0, 0, 0, 0],
      ivMax: [31, 31, 31, 31, 31, 31],
    },
    resultLimit: 100,
  };
}

describe("Gen VII Wild Time Finder domain", () => {
  it("packs the fixed-width Wasm request", () => {
    expect(encodeRequest(request(), 0x8eab05d2)).toHaveLength(30);
  });

  it("rejects reversed time and frame ranges", () => {
    const value = request();
    value.endEpoch = value.startEpoch - 1000n;
    expect(() => validateGen7WildTimeRequest(value)).toThrow();
    value.endEpoch = value.startEpoch;
    value.maxFrame = value.minFrame - 1;
    expect(() => validateGen7WildTimeRequest(value)).toThrow();
  });

  it("applies the slot and IV filters to decoded results", () => {
    const value = request();
    value.filters.slotMask = 1;
    expect(
      resultPassesFilters(value, {
        epoch: value.startEpoch,
        initialSeed: 1,
        frame: 478,
        ec: 1,
        pid: 1,
        ivs: [31, 31, 31, 31, 31, 31],
        nature: 0,
        ability: 1,
        gender: 0,
        hiddenPower: 0,
        shiny: 0,
        slot: 1,
      }),
    ).toBe(true);
  });
});
