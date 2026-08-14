import { describe, expect, it } from "vitest";
import {
  createGen5Profile,
  DEFAULT_GEN5_PROFILE_DRAFT,
  GEN5_NEEDLE_DIRECTIONS,
  gen5CalibrationDefaults,
  parseGen5ProfileBackup,
  serializeGen5ProfileBackup,
  splitGen5CalibrationRequest,
  validateGen5CalibrationRequest,
  type Gen5CalibrationRequest,
  type Gen5ProfileState,
} from "./domain";

function calibration(
  overrides: Partial<Gen5CalibrationRequest> = {},
): Gen5CalibrationRequest {
  return {
    mode: "seed",
    version: "black",
    language: "english",
    dsType: "ds",
    mac: "0009BF123456",
    buttonMask: 0,
    date: "2000-01-01",
    hour: 0,
    minute: 0,
    minSeconds: 0,
    maxSeconds: 59,
    minVCount: 0x50,
    maxVCount: 0x50,
    minTimer0: 0x0c60,
    maxTimer0: 0x0c60,
    minGxStat: 6,
    maxGxStat: 6,
    minVFrame: 0,
    maxVFrame: 0x10,
    minIVs: [0, 0, 0, 0, 0, 0],
    maxIVs: [31, 31, 31, 31, 31, 31],
    needles: [],
    needleType: "unova-link",
    memoryLink: false,
    seed: "0123456789ABCDEF",
    resultLimit: 1000,
    ...overrides,
  };
}

describe("Gen V profile domain", () => {
  it("keeps needle directions in PokeFinder order", () => {
    expect(GEN5_NEEDLE_DIRECTIONS).toEqual([
      ["↑", 0],
      ["↗", 1],
      ["→", 2],
      ["↘", 3],
      ["↓", 4],
      ["↙", 5],
      ["←", 6],
      ["↖", 7],
    ]);
  });

  it("round-trips all profile fields through the backup schema", () => {
    const profile = createGen5Profile({
      ...DEFAULT_GEN5_PROFILE_DRAFT,
      name: "Black 2",
      version: "black2",
      memoryLink: true,
      nsPokemonReleased: true,
      shinyCharm: true,
    });
    const state: Gen5ProfileState = {
      schemaVersion: 1,
      profiles: [profile],
      selectedProfileId: profile.id,
    };

    expect(parseGen5ProfileBackup(serializeGen5ProfileBackup(state))).toEqual(
      state,
    );
  });

  it("clears sequel-only settings for Black and White profiles", () => {
    const profile = createGen5Profile({
      ...DEFAULT_GEN5_PROFILE_DRAFT,
      name: "Black",
      memoryLink: true,
      nsPokemonReleased: true,
      shinyCharm: true,
    });

    expect(profile.memoryLink).toBe(false);
    expect(profile.nsPokemonReleased).toBe(false);
    expect(profile.shinyCharm).toBe(false);
  });

  it("matches the upstream empty hexadecimal and default keypress behavior", () => {
    const profile = createGen5Profile({
      ...DEFAULT_GEN5_PROFILE_DRAFT,
      name: "Black",
    });

    expect(profile.mac).toBe("0");
    expect(profile.tid).toBe(0);
    expect(profile.sid).toBe(0);
    expect(profile.vcount).toBe(0);
    expect(profile.timer0Min).toBe(0);
    expect(profile.keypresses).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(() =>
      validateGen5CalibrationRequest(
        calibration({ mac: "", seed: "", minVFrame: 0, maxVFrame: 0 }),
      ),
    ).not.toThrow();
  });

  it("does not add a Timer0 cross-field constraint to profile storage", () => {
    expect(() =>
      createGen5Profile({
        ...DEFAULT_GEN5_PROFILE_DRAFT,
        name: "Black",
        timer0Min: 0xffff,
        timer0Max: 0,
      }),
    ).not.toThrow();
  });

  it("uses the PokeFinder calibration defaults for each platform group", () => {
    expect(gen5CalibrationDefaults("black", "ds")).toEqual({
      minVCount: 0x50,
      maxVCount: 0x70,
      minTimer0: 0x0c60,
      maxTimer0: 0x0ca0,
    });
    expect(gen5CalibrationDefaults("black2", "ds")).toEqual({
      minVCount: 0x70,
      maxVCount: 0x90,
      minTimer0: 0x10e0,
      maxTimer0: 0x1130,
    });
    expect(gen5CalibrationDefaults("white", "3ds")).toEqual({
      minVCount: 0x80,
      maxVCount: 0x92,
      minTimer0: 0x1140,
      maxTimer0: 0x12d0,
    });
    expect(gen5CalibrationDefaults("white2", "dsi")).toEqual({
      minVCount: 0xa0,
      maxVCount: 0xc0,
      minTimer0: 0x1400,
      maxTimer0: 0x1900,
    });
  });

  it("accepts the full hexadecimal GxStat and VFrame ranges", () => {
    expect(() =>
      validateGen5CalibrationRequest(
        calibration({
          minGxStat: 0x63,
          maxGxStat: 0x63,
          minVFrame: 0x63,
          maxVFrame: 0x63,
        }),
      ),
    ).not.toThrow();
    expect(() =>
      validateGen5CalibrationRequest(
        calibration({ minVFrame: 0x64, maxVFrame: 0x64 }),
      ),
    ).toThrow("VFrame Min must not exceed VFrame Max");
  });

  it("splits the inclusive VFrame interval without gaps", () => {
    expect(splitGen5CalibrationRequest(calibration(), 4)).toEqual([
      { index: 0, minVFrame: 0, maxVFrame: 4 },
      { index: 1, minVFrame: 5, maxVFrame: 8 },
      { index: 2, minVFrame: 9, maxVFrame: 12 },
      { index: 3, minVFrame: 13, maxVFrame: 16 },
    ]);
  });

  it("rejects invalid Worker-only request fields", () => {
    expect(() =>
      validateGen5CalibrationRequest(
        calibration({ memoryLink: "yes" as unknown as boolean }),
      ),
    ).toThrow("Memory Link must be a boolean");
    expect(() => splitGen5CalibrationRequest(calibration(), 0)).toThrow(
      "Worker count must be a positive integer",
    );
  });
});
