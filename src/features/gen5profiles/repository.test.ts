import { describe, expect, it } from "vitest";
import {
  createGen5Profile,
  DEFAULT_GEN5_PROFILE_DRAFT,
  type Gen5ProfileState,
} from "./domain";
import {
  Gen5ProfileRepository,
  type Gen5ProfilePrimaryStore,
} from "./repository";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const profile = createGen5Profile({
  ...DEFAULT_GEN5_PROFILE_DRAFT,
  name: "White 2",
  version: "white2",
});
const state: Gen5ProfileState = {
  schemaVersion: 1,
  profiles: [profile],
  selectedProfileId: profile.id,
};

describe("Gen V profile repository", () => {
  it("mirrors IndexedDB data into the independent Gen V localStorage key", async () => {
    const mirror = new MemoryStorage();
    const primary: Gen5ProfilePrimaryStore = {
      read: async () => state,
      write: async () => undefined,
      clear: async () => undefined,
    };
    const repository = new Gen5ProfileRepository(primary, mirror);

    expect(await repository.load()).toEqual({
      state,
      storageMode: "indexeddb",
    });
    expect(mirror.getItem("pokerngkit-gen5-profiles-v1")).not.toBeNull();
    expect(mirror.getItem("pokerngkit-gen4-profiles-v1")).toBeNull();
  });

  it("falls back to the localStorage mirror when IndexedDB fails", async () => {
    const mirror = new MemoryStorage();
    const primary: Gen5ProfilePrimaryStore = {
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
    const repository = new Gen5ProfileRepository(primary, mirror);

    expect(await repository.save(state)).toBe("localstorage");
    expect(await repository.load()).toEqual({
      state,
      storageMode: "localstorage",
    });
  });

  it("restores a valid mirror into an available primary store", async () => {
    const mirror = new MemoryStorage();
    const fallback = new Gen5ProfileRepository(undefined, mirror);
    await fallback.save(state);
    let restored: Gen5ProfileState | undefined;
    const primary: Gen5ProfilePrimaryStore = {
      read: async () => undefined,
      write: async (value) => {
        restored = value;
      },
      clear: async () => undefined,
    };

    expect(await new Gen5ProfileRepository(primary, mirror).load()).toEqual({
      state,
      storageMode: "indexeddb",
    });
    expect(restored).toEqual(state);
  });

  it("clears both the primary record and its mirror", async () => {
    const mirror = new MemoryStorage();
    let primaryCleared = false;
    const primary: Gen5ProfilePrimaryStore = {
      read: async () => undefined,
      write: async () => undefined,
      clear: async () => {
        primaryCleared = true;
      },
    };
    const repository = new Gen5ProfileRepository(primary, mirror);
    await repository.save(state);
    await repository.clear();

    expect(primaryCleared).toBe(true);
    expect(mirror.length).toBe(0);
  });
});
