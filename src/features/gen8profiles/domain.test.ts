import { describe, expect, it } from "vitest";
import {
  createGen8Profile,
  DEFAULT_GEN8_BDSP_PROFILE,
  DEFAULT_GEN8_PROFILE_DRAFT,
  DEFAULT_GEN8_SWSH_PROFILE,
  GEN8_GAME_VERSIONS,
  parseGen8ProfileBackup,
  parseGen8ProfileState,
  serializeGen8ProfileBackup,
  validateGen8ProfileDraft,
  type Gen8ProfileState,
} from "./domain";

describe("Gen 8 profile domain", () => {
  it("matches the four upstream Profile8 game versions", () => {
    expect(GEN8_GAME_VERSIONS).toEqual([
      "sword",
      "shield",
      "brilliantdiamond",
      "shiningpearl",
    ]);
    expect(DEFAULT_GEN8_SWSH_PROFILE.version).toBe("sword");
    expect(DEFAULT_GEN8_BDSP_PROFILE.version).toBe("brilliantdiamond");
  });

  it("round-trips every Profile8 field through the independent backup format", () => {
    const profile = createGen8Profile({
      ...DEFAULT_GEN8_PROFILE_DRAFT,
      name: "  Brilliant Diamond  ",
      version: "brilliantdiamond",
      tid: 65535,
      sid: 54321,
      nationalDex: true,
      shinyCharm: true,
      ovalCharm: true,
    });
    const state: Gen8ProfileState = {
      schemaVersion: 1,
      profiles: [profile],
      selectedProfileId: profile.id,
    };

    expect(profile.name).toBe("  Brilliant Diamond  ");
    expect(parseGen8ProfileBackup(serializeGen8ProfileBackup(state))).toEqual(
      state,
    );
  });

  it("accepts the complete unsigned 16-bit TID and SID range", () => {
    expect(() =>
      validateGen8ProfileDraft({
        ...DEFAULT_GEN8_PROFILE_DRAFT,
        name: "Sword",
        tid: 0,
        sid: 65535,
      }),
    ).not.toThrow();
  });

  it("rejects invalid names, versions, ids and options", () => {
    expect(() =>
      validateGen8ProfileDraft({
        ...DEFAULT_GEN8_PROFILE_DRAFT,
        name: "   ",
      }),
    ).toThrow("Enter a profile name");
    expect(() =>
      validateGen8ProfileDraft({
        ...DEFAULT_GEN8_PROFILE_DRAFT,
        name: "Sword",
        version: "diamond" as "sword",
      }),
    ).toThrow("Invalid Gen 8 version");
    expect(() =>
      validateGen8ProfileDraft({
        ...DEFAULT_GEN8_PROFILE_DRAFT,
        name: "Sword",
        tid: 65536,
      }),
    ).toThrow("TID and SID");
    expect(() =>
      validateGen8ProfileDraft({
        ...DEFAULT_GEN8_PROFILE_DRAFT,
        name: "Sword",
        ovalCharm: 1 as unknown as boolean,
      }),
    ).toThrow("Invalid Gen 8 profile option");
  });

  it("rejects duplicate ids and a selection outside the profile list", () => {
    const profile = createGen8Profile({
      ...DEFAULT_GEN8_PROFILE_DRAFT,
      name: "Shield",
      version: "shield",
    });

    expect(() =>
      parseGen8ProfileState({
        schemaVersion: 1,
        profiles: [profile, { ...profile }],
        selectedProfileId: profile.id,
      }),
    ).toThrow("Duplicate Gen 8 profile id");
    expect(() =>
      parseGen8ProfileState({
        schemaVersion: 1,
        profiles: [profile],
        selectedProfileId: "missing-profile",
      }),
    ).toThrow("Invalid selected Gen 8 profile id");
  });
});
