import { describe, expect, it } from "vitest";
import type { Gen3ProfileState } from "./domain";
import {
  Gen3ProfileRepository,
  type Gen3ProfilePrimaryStore,
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

const state: Gen3ProfileState = {
  schemaVersion: 1,
  selectedProfileId: "profile-1",
  profiles: [
    {
      id: "profile-1",
      name: "Ruby",
      version: "ruby",
      tid: 12345,
      sid: 54321,
      deadBattery: true,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
};

describe("Gen III profile repository", () => {
  it("mirrors IndexedDB data into localStorage", async () => {
    const mirror = new MemoryStorage();
    const primary: Gen3ProfilePrimaryStore = {
      read: async () => state,
      write: async () => undefined,
      clear: async () => undefined,
    };
    const repository = new Gen3ProfileRepository(primary, mirror);
    expect(await repository.load()).toEqual({
      state,
      storageMode: "indexeddb",
    });
    expect(mirror.length).toBe(1);
  });

  it("falls back to the localStorage mirror when IndexedDB fails", async () => {
    const mirror = new MemoryStorage();
    const primary: Gen3ProfilePrimaryStore = {
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
    const repository = new Gen3ProfileRepository(primary, mirror);
    expect(await repository.save(state)).toBe("localstorage");
    expect(await repository.load()).toEqual({
      state,
      storageMode: "localstorage",
    });
  });

  it("clears both the primary record and its mirror", async () => {
    const mirror = new MemoryStorage();
    let primaryCleared = false;
    const primary: Gen3ProfilePrimaryStore = {
      read: async () => undefined,
      write: async () => undefined,
      clear: async () => {
        primaryCleared = true;
      },
    };
    const repository = new Gen3ProfileRepository(primary, mirror);
    await repository.save(state);
    await repository.clear();
    expect(primaryCleared).toBe(true);
    expect(mirror.length).toBe(0);
  });
});
