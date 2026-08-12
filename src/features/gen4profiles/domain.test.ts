import { describe, expect, it } from "vitest";
import {
  createGen4Profile,
  EMPTY_GEN4_UNOWN_DISCOVERED,
  EMPTY_GEN4_UNOWN_PUZZLES,
  parseGen4ProfileBackup,
  serializeGen4ProfileBackup,
  type Gen4ProfileState,
} from "./domain";

describe("Gen IV profile backups", () => {
  it("round-trips HGSS-only profile fields", () => {
    const profile = createGen4Profile({
      name: "HeartGold",
      version: "heartgold",
      tid: 12345,
      sid: 54321,
      nationalDex: true,
      unownDiscovered: [
        true,
        ...EMPTY_GEN4_UNOWN_DISCOVERED.slice(1),
      ] as typeof EMPTY_GEN4_UNOWN_DISCOVERED,
      unownPuzzles: [true, false, false, false],
    });
    const state: Gen4ProfileState = {
      schemaVersion: 1,
      profiles: [profile],
      selectedProfileId: profile.id,
    };
    expect(parseGen4ProfileBackup(serializeGen4ProfileBackup(state))).toEqual(
      state,
    );
  });

  it("clears HGSS-only fields for DPPt profiles", () => {
    const profile = createGen4Profile({
      name: "Platinum",
      version: "platinum",
      tid: 1,
      sid: 2,
      nationalDex: false,
      unownDiscovered: EMPTY_GEN4_UNOWN_DISCOVERED.map(
        () => true,
      ) as typeof EMPTY_GEN4_UNOWN_DISCOVERED,
      unownPuzzles: [true, true, true, true],
    });
    expect(profile.unownDiscovered).toEqual(EMPTY_GEN4_UNOWN_DISCOVERED);
    expect(profile.unownPuzzles).toEqual(EMPTY_GEN4_UNOWN_PUZZLES);
  });

  it("rejects out-of-range trainer ids", () => {
    const invalid = JSON.stringify({
      format: "pokerngkit.gen4-profiles",
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      selectedProfileId: null,
      profiles: [
        {
          id: "profile-1",
          name: "Diamond",
          version: "diamond",
          tid: 70000,
          sid: 0,
          nationalDex: false,
          unownDiscovered: EMPTY_GEN4_UNOWN_DISCOVERED,
          unownPuzzles: EMPTY_GEN4_UNOWN_PUZZLES,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    });
    expect(() => parseGen4ProfileBackup(invalid)).toThrow(
      "Invalid Gen IV profile list",
    );
  });
});
