import { describe, expect, it } from "vitest";
import {
  createGen3Profile,
  DEFAULT_GEN3_PROFILE,
  gen3StaticProfileOrDefault,
  parseGen3ProfileBackup,
  serializeGen3ProfileBackup,
  type Gen3ProfileState,
} from "./domain";

describe("Gen III profile backups", () => {
  it("round-trips a validated backup", () => {
    const profile = createGen3Profile({
      name: "Emerald",
      version: "emerald",
      tid: 12345,
      sid: 54321,
      deadBattery: true,
    });
    const state: Gen3ProfileState = {
      schemaVersion: 1,
      profiles: [profile],
      selectedProfileId: profile.id,
    };
    expect(parseGen3ProfileBackup(serializeGen3ProfileBackup(state))).toEqual({
      ...state,
      profiles: [{ ...profile, deadBattery: false }],
    });
  });

  it("rejects duplicate ids and out-of-range trainer ids", () => {
    const invalid = JSON.stringify({
      format: "pokerngkit.gen3-profiles",
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      selectedProfileId: null,
      profiles: [
        {
          id: "same",
          name: "A",
          version: "ruby",
          tid: 70000,
          sid: 0,
          deadBattery: false,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    });
    expect(() => parseGen3ProfileBackup(invalid)).toThrow(
      "Invalid Gen III profile list",
    );
  });

  it("keeps GameCube profiles out of handheld Static calculations", () => {
    const emerald = createGen3Profile({
      name: "Emerald",
      version: "emerald",
      tid: 1,
      sid: 2,
      deadBattery: false,
    });
    const xd = createGen3Profile({
      name: "XD",
      version: "xd",
      tid: 3,
      sid: 4,
      deadBattery: false,
    });

    expect(gen3StaticProfileOrDefault(emerald)).toBe(emerald);
    expect(gen3StaticProfileOrDefault(xd)).toBe(DEFAULT_GEN3_PROFILE);
  });
});
