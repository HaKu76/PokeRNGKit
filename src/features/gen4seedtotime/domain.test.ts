import { describe, expect, it } from "vitest";
import {
  decodeGen4SeedToTimeCalibrations,
  decodeGen4SeedToTimeStates,
  formatGen4Sequence,
  validateGen4SeedToTimeCalibrationRequest,
  validateGen4SeedToTimeRequest,
} from "./domain";

const roamers = {
  raikou: { enabled: false, route: 0 },
  entei: { enabled: false, route: 0 },
  lati: { enabled: false, route: 0 },
};

describe("Gen4 Seed to Time domain", () => {
  it("accepts the upstream input limits", () => {
    expect(
      validateGen4SeedToTimeRequest({
        seed: 0xffff_ffff,
        year: 2099,
        forceSecond: true,
        second: 59,
        mode: "dppt",
        ...roamers,
      }),
    ).toEqual([]);
    expect(
      validateGen4SeedToTimeRequest({
        seed: 0,
        year: 2100,
        forceSecond: false,
        second: 60,
        mode: "dppt",
        ...roamers,
      }),
    ).toEqual(["year", "second"]);
  });

  it("caps calibration output before Worker allocation", () => {
    expect(
      validateGen4SeedToTimeCalibrationRequest({
        target: {
          year: 2000,
          month: 1,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
          delay: 0,
        },
        delayCalibration: 1_000_000,
        secondCalibration: 500,
        mode: "dppt",
        ...roamers,
      }),
    ).toContain("resultCount");
  });

  it("decodes upstream state and calibration layouts", () => {
    expect(
      decodeGen4SeedToTimeStates(
        new Uint32Array([2000, 7, 29, 0, 53, 0, 0]).buffer,
      ),
    ).toHaveLength(1);
    expect(
      decodeGen4SeedToTimeCalibrations(
        new Uint32Array([0, 2000, 7, 29, 0, 53, 0, 0, 0, 0, 0, 0, 0, 0]).buffer,
      ),
    ).toHaveLength(1);
  });

  it("formats packed DPPt and HGSS sequences", () => {
    expect(formatGen4Sequence(1, 0, 3, "dppt")).toBe("H, T, T");
    expect(formatGen4Sequence(36, 0, 3, "hgss", 1)).toBe("(E skipped)  K, P");
  });
});
