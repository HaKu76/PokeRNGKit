import { describe, expect, it } from "vitest";
import {
  createThreeDsProfile,
  DEFAULT_THREE_DS_PROFILE_DRAFT,
  type ThreeDsProfileState,
} from "./domain";
import {
  ThreeDsProfileRepository,
  type ThreeDsProfilePrimaryStore,
} from "./repository";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  constructor(
    private readonly failures: {
      get?: boolean;
      set?: boolean;
      remove?: boolean;
    } = {},
  ) {}

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    if (this.failures.get) throw new DOMException("blocked", "SecurityError");
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    if (this.failures.remove)
      throw new DOMException("blocked", "SecurityError");
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    if (this.failures.set) throw new DOMException("blocked", "SecurityError");
    this.values.set(key, value);
  }
}

const profile = createThreeDsProfile({
  ...DEFAULT_THREE_DS_PROFILE_DRAFT,
  name: "Ultra Sun",
  version: "ultra-sun",
  tsv: 1234,
  trv: 8,
  shinyCharm: true,
  seeds: [1, 2, 3, 4],
});
const state: ThreeDsProfileState = {
  schemaVersion: 1,
  profiles: [profile],
  selectedProfileId: profile.id,
};

describe("3DSRNGTool profile repository", () => {
  it("mirrors IndexedDB data into an independent localStorage key", async () => {
    const mirror = new MemoryStorage();
    const primary: ThreeDsProfilePrimaryStore = {
      read: async () => state,
      write: async () => undefined,
      clear: async () => undefined,
    };
    const repository = new ThreeDsProfileRepository(primary, mirror);

    expect(await repository.load()).toEqual({
      state,
      storageMode: "indexeddb",
    });
    expect(mirror.getItem("pokerngkit-3dsrngtool-profiles-v1")).not.toBeNull();
    expect(mirror.getItem("pokerngkit-gen8-profiles-v1")).toBeNull();
  });

  it("falls back to the mirror and restores it when IndexedDB recovers", async () => {
    const mirror = new MemoryStorage();
    let stored: ThreeDsProfileState | undefined;
    let writable = false;
    const primary: ThreeDsProfilePrimaryStore = {
      read: async () => stored,
      write: async (value) => {
        if (!writable) throw new Error("blocked");
        stored = value;
      },
      clear: async () => undefined,
    };

    expect(
      await new ThreeDsProfileRepository(primary, mirror).save(state),
    ).toBe("localstorage");
    writable = true;
    expect(await new ThreeDsProfileRepository(primary, mirror).load()).toEqual({
      state,
      storageMode: "indexeddb",
    });
    expect(stored).toEqual(state);
  });

  it("loads valid IndexedDB data when localStorage is inaccessible", async () => {
    const primary: ThreeDsProfilePrimaryStore = {
      read: async () => state,
      write: async () => undefined,
      clear: async () => undefined,
    };
    const repository = new ThreeDsProfileRepository(
      primary,
      new MemoryStorage({ get: true, set: true, remove: true }),
    );

    expect(await repository.load()).toEqual({
      state,
      storageMode: "indexeddb",
    });
  });

  it("ignores a corrupt mirror and clears only its own records", async () => {
    const mirror = new MemoryStorage();
    mirror.setItem("pokerngkit-3dsrngtool-profiles-v1", "{not-json");
    mirror.setItem("pokerngkit-gen8-profiles-v1", "preserve");
    let primaryCleared = false;
    const primary: ThreeDsProfilePrimaryStore = {
      read: async () => undefined,
      write: async () => undefined,
      clear: async () => {
        primaryCleared = true;
      },
    };
    const repository = new ThreeDsProfileRepository(primary, mirror);

    expect(await repository.load()).toEqual({
      state: { schemaVersion: 1, profiles: [], selectedProfileId: null },
      storageMode: "indexeddb",
    });
    await repository.save(state);
    await repository.clear();
    expect(primaryCleared).toBe(true);
    expect(mirror.getItem("pokerngkit-3dsrngtool-profiles-v1")).toBeNull();
    expect(mirror.getItem("pokerngkit-gen8-profiles-v1")).toBe("preserve");
  });
});
