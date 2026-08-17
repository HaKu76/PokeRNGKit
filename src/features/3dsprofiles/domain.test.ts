import { describe, expect, it } from "vitest";
import {
  createThreeDsProfile,
  DEFAULT_THREE_DS_PROFILE_DRAFT,
  formatThreeDsProfileSeeds,
  isThreeDsGen7Profile,
  parseThreeDsProfileBackup,
  parseThreeDsProfileState,
  serializeThreeDsProfileBackup,
  threeDsProfileUsesFourSeeds,
  validateThreeDsProfileDraft,
  type ThreeDsProfileState,
} from "./domain";

describe("3DSRNGTool profile domain", () => {
  it("keeps the upstream game order and two/four-word seed behavior", () => {
    expect(threeDsProfileUsesFourSeeds("transporter")).toBe(false);
    expect(threeDsProfileUsesFourSeeds("sun")).toBe(true);
    expect(
      formatThreeDsProfileSeeds({
        ...DEFAULT_THREE_DS_PROFILE_DRAFT,
        version: "omega-ruby",
        seeds: [1, 2, 3, 4],
      }),
    ).toBe("00000002,00000001");
    expect(
      formatThreeDsProfileSeeds({
        ...DEFAULT_THREE_DS_PROFILE_DRAFT,
        version: "ultra-moon",
        seeds: [1, 2, 3, 4],
      }),
    ).toBe("00000004,00000003,00000002,00000001");
  });

  it("only exposes Sun and Moon profiles to Gen VII workspaces", () => {
    const base = createThreeDsProfile({
      ...DEFAULT_THREE_DS_PROFILE_DRAFT,
      name: "Profile",
    });
    expect(isThreeDsGen7Profile({ ...base, version: "x" })).toBe(false);
    expect(isThreeDsGen7Profile({ ...base, version: "transporter" })).toBe(
      false,
    );
    expect(isThreeDsGen7Profile({ ...base, version: "sun" })).toBe(true);
    expect(isThreeDsGen7Profile({ ...base, version: "ultra-moon" })).toBe(true);
  });

  it("matches the upstream TSV, TRV, description and seed limits", () => {
    expect(() =>
      validateThreeDsProfileDraft({
        ...DEFAULT_THREE_DS_PROFILE_DRAFT,
        name: "Ultra Moon",
        tsv: 4095,
        trv: 15,
        seeds: [0, 1, 0xffff_fffe, 0xffff_ffff],
      }),
    ).not.toThrow();
    expect(() =>
      validateThreeDsProfileDraft({
        ...DEFAULT_THREE_DS_PROFILE_DRAFT,
        name: " ",
      }),
    ).toThrow("Description");
    expect(() =>
      validateThreeDsProfileDraft({
        ...DEFAULT_THREE_DS_PROFILE_DRAFT,
        name: "Profile",
        tsv: 4096,
      }),
    ).toThrow("TSV");
    expect(() =>
      validateThreeDsProfileDraft({
        ...DEFAULT_THREE_DS_PROFILE_DRAFT,
        name: "Profile",
        trv: 16,
      }),
    ).toThrow("TRV");
    expect(() =>
      validateThreeDsProfileDraft({
        ...DEFAULT_THREE_DS_PROFILE_DRAFT,
        name: "Profile",
        seeds: [0, 0, 0, 0x1_0000_0000],
      }),
    ).toThrow("Egg Seed");
  });

  it("round-trips the independent JSON backup format", () => {
    const profile = createThreeDsProfile({
      ...DEFAULT_THREE_DS_PROFILE_DRAFT,
      name: "Moon",
      version: "moon",
      tsv: 1234,
      trv: 8,
      shinyCharm: true,
      seeds: [0x11111111, 0x22222222, 0x33333333, 0x44444444],
    });
    const state: ThreeDsProfileState = {
      schemaVersion: 1,
      profiles: [profile],
      selectedProfileId: profile.id,
    };

    expect(
      parseThreeDsProfileBackup(serializeThreeDsProfileBackup(state)),
    ).toEqual(state);
  });

  it("rejects duplicate ids and invalid selected ids", () => {
    const profile = createThreeDsProfile({
      ...DEFAULT_THREE_DS_PROFILE_DRAFT,
      name: "X",
    });
    expect(() =>
      parseThreeDsProfileState({
        schemaVersion: 1,
        profiles: [profile, profile],
        selectedProfileId: profile.id,
      }),
    ).toThrow("Duplicate");
    expect(() =>
      parseThreeDsProfileState({
        schemaVersion: 1,
        profiles: [profile],
        selectedProfileId: "missing",
      }),
    ).toThrow("selected");
  });
});
