import {
  EMPTY_GEN8_PROFILE_STATE,
  parseGen8ProfileState,
  type Gen8ProfileState,
} from "./domain";

const DATABASE_NAME = "pokerngkit-gen8";
const DATABASE_VERSION = 1;
const OBJECT_STORE = "profile-data";
const PROFILE_KEY = "gen8-profiles";
const MIRROR_KEY = "pokerngkit-gen8-profiles-v1";
const MIRROR_DIRTY_KEY = "pokerngkit-gen8-profiles-v1-primary-pending";

export type Gen8ProfileStorageMode = "indexeddb" | "localstorage";

export interface Gen8ProfilePrimaryStore {
  read(): Promise<unknown | undefined>;
  write(state: Gen8ProfileState): Promise<void>;
  clear(): Promise<void>;
}

class IndexedDbGen8ProfileStore implements Gen8ProfilePrimaryStore {
  constructor(private readonly factory: IDBFactory) {}

  async read() {
    const database = await this.open();
    try {
      return await new Promise<unknown | undefined>((resolve, reject) => {
        const request = database
          .transaction(OBJECT_STORE, "readonly")
          .objectStore(OBJECT_STORE)
          .get(PROFILE_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  }

  async write(state: Gen8ProfileState) {
    const database = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(OBJECT_STORE, "readwrite");
        transaction.objectStore(OBJECT_STORE).put(state, PROFILE_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }

  async clear() {
    const database = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(OBJECT_STORE, "readwrite");
        transaction.objectStore(OBJECT_STORE).delete(PROFILE_KEY);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }

  private open() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(OBJECT_STORE)) {
          request.result.createObjectStore(OBJECT_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("PokeRNGKit Gen 8 IndexedDB upgrade was blocked."));
    });
  }
}

export interface Gen8ProfileLoadResult {
  state: Gen8ProfileState;
  storageMode: Gen8ProfileStorageMode;
}

export class Gen8ProfileRepository {
  private readonly primary?: Gen8ProfilePrimaryStore;

  constructor(
    primary:
      Gen8ProfilePrimaryStore | IDBFactory | undefined = typeof indexedDB ===
    "undefined"
      ? undefined
      : indexedDB,
    private readonly mirror: Storage | undefined = typeof localStorage ===
    "undefined"
      ? undefined
      : localStorage,
  ) {
    this.primary =
      primary && "open" in primary
        ? new IndexedDbGen8ProfileStore(primary as IDBFactory)
        : (primary as Gen8ProfilePrimaryStore | undefined);
  }

  async load(): Promise<Gen8ProfileLoadResult> {
    const mirrored = this.readMirror();
    if (mirrored && this.isMirrorDirty()) {
      if (this.primary) {
        try {
          await this.primary.write(mirrored);
          this.clearMirrorDirty();
          return { state: mirrored, storageMode: "indexeddb" };
        } catch {
          return { state: mirrored, storageMode: "localstorage" };
        }
      }
      return { state: mirrored, storageMode: "localstorage" };
    }

    if (this.primary) {
      try {
        const stored = await this.primary.read();
        if (stored !== undefined) {
          const state = parseGen8ProfileState(stored);
          try {
            this.writeMirror(state);
            this.clearMirrorDirty();
          } catch {
            // IndexedDB remains the canonical copy when the mirror is unavailable.
          }
          return { state, storageMode: "indexeddb" };
        }
      } catch {
        // The localStorage mirror recovers unavailable or corrupt IndexedDB data.
      }
    }

    if (mirrored) {
      if (this.primary) {
        try {
          await this.primary.write(mirrored);
          this.clearMirrorDirty();
          return { state: mirrored, storageMode: "indexeddb" };
        } catch {
          // Continue in localStorage fallback mode.
        }
      }
      return { state: mirrored, storageMode: "localstorage" };
    }

    return {
      state: { ...EMPTY_GEN8_PROFILE_STATE, profiles: [] },
      storageMode: this.primary ? "indexeddb" : "localstorage",
    };
  }

  async save(state: Gen8ProfileState): Promise<Gen8ProfileStorageMode> {
    const validated = parseGen8ProfileState(state);
    let primarySaved = false;
    if (this.primary) {
      try {
        await this.primary.write(validated);
        primarySaved = true;
      } catch {
        primarySaved = false;
      }
    }

    let mirrorSaved = false;
    try {
      this.writeMirror(validated);
      if (this.primary && !primarySaved) this.markMirrorDirty();
      else this.clearMirrorDirty();
      mirrorSaved = Boolean(this.mirror);
    } catch {
      // Keep the initial false value when the mirror rejects the write.
    }
    if (!primarySaved && !mirrorSaved) {
      throw new Error("Unable to save Gen 8 profiles in browser storage.");
    }
    return primarySaved ? "indexeddb" : "localstorage";
  }

  async clear() {
    let primaryCleared = !this.primary;
    if (this.primary) {
      try {
        await this.primary.clear();
        primaryCleared = true;
      } catch {
        primaryCleared = false;
      }
    }

    let mirrorCleared = !this.mirror;
    try {
      this.mirror?.removeItem(MIRROR_KEY);
      this.mirror?.removeItem(MIRROR_DIRTY_KEY);
      mirrorCleared = true;
    } catch {
      // Keep the initial false value when the mirror rejects the removal.
    }
    if (!primaryCleared || !mirrorCleared) {
      throw new Error("Unable to clear Gen 8 profiles from browser storage.");
    }
  }

  private readMirror() {
    try {
      const value = this.mirror?.getItem(MIRROR_KEY);
      if (!value) return undefined;
      return parseGen8ProfileState(JSON.parse(value));
    } catch {
      return undefined;
    }
  }

  private writeMirror(state: Gen8ProfileState) {
    this.mirror?.setItem(MIRROR_KEY, JSON.stringify(state));
  }

  private isMirrorDirty() {
    try {
      return this.mirror?.getItem(MIRROR_DIRTY_KEY) === "1";
    } catch {
      return false;
    }
  }

  private markMirrorDirty() {
    this.mirror?.setItem(MIRROR_DIRTY_KEY, "1");
  }

  private clearMirrorDirty() {
    try {
      this.mirror?.removeItem(MIRROR_DIRTY_KEY);
    } catch {
      // A stale marker only makes the valid mirror win on the next load.
    }
  }
}
