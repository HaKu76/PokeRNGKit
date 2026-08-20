import { describe, expect, it } from "vitest";
import {
  THREE_DS_PROFILE_CALIBRATOR_DEFAULTS,
  decodeThreeDsProfileCalibratorResults,
  encodeThreeDsProfileCalibratorResults,
  profileCalibratorEpochFromInput,
  profileCalibratorTaskCount,
  validateThreeDsProfileCalibratorRequest,
  validateThreeDsProfileCalibratorResult,
} from "./calibratorDomain";

const request = {
  version: "sun-moon" as const,
  dateEpoch: 757382400000n,
  initialSeed: 0x12345678,
  baseTick: THREE_DS_PROFILE_CALIBRATOR_DEFAULTS["sun-moon"].baseTick,
  baseOffset: 55,
  tickRange: 1000,
  offsetRange: 10,
  resultLimit: 100_000,
};

describe("3DS Gen VII Profile Calibrator domain", () => {
  it("converts Citra-compatible dates and counts both search dimensions", () => {
    expect(profileCalibratorEpochFromInput("2000-01-01T00:00:00")).toBe(0n);
    expect(profileCalibratorEpochFromInput("2024-01-01T00:00:00")).toBe(
      757382400000n,
    );
    expect(profileCalibratorTaskCount(request)).toBe(11_011);
  });

  it("keeps the upstream game defaults and validates the browser limit", () => {
    expect(THREE_DS_PROFILE_CALIBRATOR_DEFAULTS["sun-moon"]).toMatchObject({
      baseTick: 0x036e_c43b,
      baseOffset: 55,
    });
    expect(
      THREE_DS_PROFILE_CALIBRATOR_DEFAULTS["ultra-sun-moon"],
    ).toMatchObject({
      baseTick: 0x043b_1cf3,
      baseOffset: 56,
    });
    expect(() =>
      validateThreeDsProfileCalibratorRequest({
        ...request,
        tickRange: 5000,
        offsetRange: 1000,
      }),
    ).toThrow("browser task limit");
  });

  it("round-trips fixed-width results and accepts wrapped unsigned deltas", () => {
    const results = [
      { tick: 0x036e_c43b, offset: 55 },
      { tick: 0x036e_c43a, offset: 54 },
    ];
    const decoded = decodeThreeDsProfileCalibratorResults(
      encodeThreeDsProfileCalibratorResults(results).buffer,
    );
    expect(decoded).toEqual(results);
    expect(validateThreeDsProfileCalibratorResult(request, decoded[1])).toEqual(
      decoded[1],
    );
  });
});
