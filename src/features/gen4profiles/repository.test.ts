import { describe, expect, it } from "vitest";
import type { Gen4ProfileState, Gen4UnownDiscovered } from "./domain";
import {
  Gen4ProfileRepository,
  type Gen4ProfilePrimaryStore,
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

const state: Gen4ProfileState = {
  schemaVersion: 1,
  selectedProfileId: "profile-4",
  profiles: [
    {
      id: "profile-4",
      name: "Platinum",
      version: "platinum",
      tid: 12345,
      sid: 54321,
      nationalDex: true,
      unownDiscovered: Array.from(
        { length: 26 },
        () => false,
      ) as Gen4UnownDiscovered,
      unownPuzzles: [false, false, false, false],
      createdAt: 1,
      updatedAt: 1,
    },
  ],
};

describe("Gen IV profile repository", () => {
  it("mirrors IndexedDB data into the independent Gen IV localStorage key", async () => {
    const mirror = new MemoryStorage();
    const primary: Gen4ProfilePrimaryStore = {
      read: async () => state,
      write: async () => undefined,
      clear: async () => undefined,
    };
    const repository = new Gen4ProfileRepository(primary, mirror);
    expect(await repository.load()).toEqual({
      state,
      storageMode: "indexeddb",
    });
    expect(mirror.getItem("pokerngkit-gen4-profiles-v1")).not.toBeNull();
    expect(mirror.getItem("pokerngkit-gen3-profiles-v1")).toBeNull();
  });

  it("falls back to the localStorage mirror when IndexedDB fails", async () => {
    const mirror = new MemoryStorage();
    const primary: Gen4ProfilePrimaryStore = {
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
    const repository = new Gen4ProfileRepository(primary, mirror);
    expect(await repository.save(state)).toBe("localstorage");
    expect(await repository.load()).toEqual({
      state,
      storageMode: "localstorage",
    });
  });

  it("clears both the primary record and its mirror", async () => {
    const mirror = new MemoryStorage();
    let primaryCleared = false;
    const primary: Gen4ProfilePrimaryStore = {
      read: async () => undefined,
      write: async () => undefined,
      clear: async () => {
        primaryCleared = true;
      },
    };
    const repository = new Gen4ProfileRepository(primary, mirror);
    await repository.save(state);
    await repository.clear();
    expect(primaryCleared).toBe(true);
    expect(mirror.length).toBe(0);
  });
});
