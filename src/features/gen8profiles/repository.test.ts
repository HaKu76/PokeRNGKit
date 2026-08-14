import { describe, expect, it } from "vitest";
import {
  createGen8Profile,
  DEFAULT_GEN8_PROFILE_DRAFT,
  type Gen8ProfileState,
} from "./domain";
import {
  Gen8ProfileRepository,
  type Gen8ProfilePrimaryStore,
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

const profile = createGen8Profile({
  ...DEFAULT_GEN8_PROFILE_DRAFT,
  name: "Shining Pearl",
  version: "shiningpearl",
  tid: 12345,
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

describe("Gen 8 profile repository", () => {
  it("mirrors IndexedDB data into the independent Gen 8 localStorage key", async () => {
    const mirror = new MemoryStorage();
    const primary: Gen8ProfilePrimaryStore = {
      read: async () => state,
      write: async () => undefined,
      clear: async () => undefined,
    };
    const repository = new Gen8ProfileRepository(primary, mirror);

    expect(await repository.load()).toEqual({
      state,
      storageMode: "indexeddb",
    });
    expect(mirror.getItem("pokerngkit-gen8-profiles-v1")).not.toBeNull();
    expect(mirror.getItem("pokerngkit-gen5-profiles-v1")).toBeNull();
  });

  it("falls back to the localStorage mirror when IndexedDB fails", async () => {
    const mirror = new MemoryStorage();
    const primary: Gen8ProfilePrimaryStore = {
      read: async () => {
        throw new Error("blocked");
      },
      write: async () => {
        throw new Error("blocked");
      },
      clear: async () => {
        throw new Error("blocked");
      },
    };
    const repository = new Gen8ProfileRepository(primary, mirror);

    expect(await repository.save(state)).toBe("localstorage");
    expect(await repository.load()).toEqual({
      state,
      storageMode: "localstorage",
    });
  });

  it("keeps mirror-only saves newer than stale IndexedDB data", async () => {
    const mirror = new MemoryStorage();
    let stored = state;
    let primaryWritable = false;
    const primary: Gen8ProfilePrimaryStore = {
      read: async () => stored,
      write: async (value) => {
        if (!primaryWritable) throw new Error("blocked");
        stored = value;
      },
      clear: async () => undefined,
    };
    const newerProfile = createGen8Profile({
      ...DEFAULT_GEN8_PROFILE_DRAFT,
      name: "Sword",
      version: "sword",
    });
    const newerState: Gen8ProfileState = {
      schemaVersion: 1,
      profiles: [newerProfile],
      selectedProfileId: newerProfile.id,
    };

    expect(
      await new Gen8ProfileRepository(primary, mirror).save(newerState),
    ).toBe("localstorage");
    primaryWritable = true;

    expect(await new Gen8ProfileRepository(primary, mirror).load()).toEqual({
      state: newerState,
      storageMode: "indexeddb",
    });
    expect(stored).toEqual(newerState);
  });

  it("loads valid IndexedDB data when localStorage is inaccessible", async () => {
    const primary: Gen8ProfilePrimaryStore = {
      read: async () => state,
      write: async () => undefined,
      clear: async () => undefined,
    };

    expect(
      await new Gen8ProfileRepository(
        primary,
        new MemoryStorage({ get: true, set: true, remove: true }),
      ).load(),
    ).toEqual({ state, storageMode: "indexeddb" });
  });

  it("restores a valid mirror into an available primary store", async () => {
    const mirror = new MemoryStorage();
    await new Gen8ProfileRepository(undefined, mirror).save(state);
    let restored: Gen8ProfileState | undefined;
    const primary: Gen8ProfilePrimaryStore = {
      read: async () => undefined,
      write: async (value) => {
        restored = value;
      },
      clear: async () => undefined,
    };

    expect(await new Gen8ProfileRepository(primary, mirror).load()).toEqual({
      state,
      storageMode: "indexeddb",
    });
    expect(restored).toEqual(state);
  });

  it("ignores a corrupt mirror instead of exposing invalid profile data", async () => {
    const mirror = new MemoryStorage();
    mirror.setItem("pokerngkit-gen8-profiles-v1", "{not-json");

    expect(await new Gen8ProfileRepository(undefined, mirror).load()).toEqual({
      state: { schemaVersion: 1, profiles: [], selectedProfileId: null },
      storageMode: "localstorage",
    });
  });

  it("clears both the primary record and only the Gen 8 mirror", async () => {
    const mirror = new MemoryStorage();
    mirror.setItem("pokerngkit-gen5-profiles-v1", "preserve");
    let primaryCleared = false;
    const primary: Gen8ProfilePrimaryStore = {
      read: async () => undefined,
      write: async () => undefined,
      clear: async () => {
        primaryCleared = true;
      },
    };
    const repository = new Gen8ProfileRepository(primary, mirror);
    await repository.save(state);
    await repository.clear();

    expect(primaryCleared).toBe(true);
    expect(mirror.getItem("pokerngkit-gen8-profiles-v1")).toBeNull();
    expect(mirror.getItem("pokerngkit-gen5-profiles-v1")).toBe("preserve");
  });

  it("reports a partial clear instead of allowing the remaining copy to revive", async () => {
    const mirror = new MemoryStorage();
    const primary: Gen8ProfilePrimaryStore = {
      read: async () => state,
      write: async () => undefined,
      clear: async () => {
        throw new Error("blocked");
      },
    };
    const repository = new Gen8ProfileRepository(primary, mirror);
    await repository.save(state);

    await expect(repository.clear()).rejects.toThrow("Unable to clear");

    const writablePrimary: Gen8ProfilePrimaryStore = {
      read: async () => state,
      write: async () => undefined,
      clear: async () => undefined,
    };
    await expect(
      new Gen8ProfileRepository(
        writablePrimary,
        new MemoryStorage({ remove: true }),
      ).clear(),
    ).rejects.toThrow("Unable to clear");
  });
});
