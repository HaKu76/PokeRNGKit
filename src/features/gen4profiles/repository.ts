import {
  EMPTY_GEN4_PROFILE_STATE,
  parseGen4ProfileState,
  type Gen4ProfileState,
} from "./domain";

const DATABASE_NAME = "pokerngkit";
const DATABASE_VERSION = 1;
const OBJECT_STORE = "app-data";
const PROFILE_KEY = "gen4-profiles";
const MIRROR_KEY = "pokerngkit-gen4-profiles-v1";

export type Gen4ProfileStorageMode = "indexeddb" | "localstorage";

export interface Gen4ProfilePrimaryStore {
  read(): Promise<unknown | undefined>;
  write(state: Gen4ProfileState): Promise<void>;
  clear(): Promise<void>;
}

class IndexedDbGen4ProfileStore implements Gen4ProfilePrimaryStore {
  constructor(private readonly indexedDb: IDBFactory) {}

  async read() {
    const database = await this.open();
    try {
      return await new Promise<unknown | undefined>((resolve, reject) => {
        const transaction = database.transaction(OBJECT_STORE, "readonly");
        const request = transaction.objectStore(OBJECT_STORE).get(PROFILE_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  }

  async write(state: Gen4ProfileState) {
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
      const request = this.indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(OBJECT_STORE)) {
          request.result.createObjectStore(OBJECT_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("PokeRNGKit IndexedDB upgrade was blocked."));
    });
  }
}

export interface Gen4ProfileLoadResult {
  state: Gen4ProfileState;
  storageMode: Gen4ProfileStorageMode;
}

export class Gen4ProfileRepository {
  private readonly primary?: Gen4ProfilePrimaryStore;

  constructor(
    primary:
      Gen4ProfilePrimaryStore | IDBFactory | undefined = typeof indexedDB ===
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
        ? new IndexedDbGen4ProfileStore(primary as IDBFactory)
        : (primary as Gen4ProfilePrimaryStore | undefined);
  }

  async load(): Promise<Gen4ProfileLoadResult> {
    if (this.primary) {
      try {
        const stored = await this.primary.read();
        if (stored !== undefined) {
          const state = parseGen4ProfileState(stored);
          this.writeMirror(state);
          return { state, storageMode: "indexeddb" };
        }
      } catch {
        // The mirror is the recovery path when IndexedDB is unavailable.
      }
    }

    const mirrored = this.readMirror();
    if (mirrored) {
      if (this.primary) {
        try {
          await this.primary.write(mirrored);
          return { state: mirrored, storageMode: "indexeddb" };
        } catch {
          // Continue in localStorage fallback mode.
        }
      }
      return { state: mirrored, storageMode: "localstorage" };
    }

    return {
      state: { ...EMPTY_GEN4_PROFILE_STATE, profiles: [] },
      storageMode: this.primary ? "indexeddb" : "localstorage",
    };
  }

  async save(state: Gen4ProfileState): Promise<Gen4ProfileStorageMode> {
    const validated = parseGen4ProfileState(state);
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
      mirrorSaved = Boolean(this.mirror);
    } catch {
      // Keep the fallback result false when storage rejects the write.
    }
    if (!primarySaved && !mirrorSaved) {
      throw new Error("Unable to save Gen IV profiles in browser storage.");
    }
    return primarySaved ? "indexeddb" : "localstorage";
  }

  async clear() {
    let primaryCleared = false;
    if (this.primary) {
      try {
        await this.primary.clear();
        primaryCleared = true;
      } catch {
        primaryCleared = false;
      }
    }
    let mirrorCleared = false;
    try {
      this.mirror?.removeItem(MIRROR_KEY);
      mirrorCleared = Boolean(this.mirror);
    } catch {
      // Keep the fallback result false when storage rejects the removal.
    }
    if (!primaryCleared && !mirrorCleared) {
      throw new Error("Unable to clear Gen IV profiles from browser storage.");
    }
  }

  private readMirror() {
    const value = this.mirror?.getItem(MIRROR_KEY);
    if (!value) return undefined;
    try {
      return parseGen4ProfileState(JSON.parse(value));
    } catch {
      return undefined;
    }
  }

  private writeMirror(state: Gen4ProfileState) {
    this.mirror?.setItem(MIRROR_KEY, JSON.stringify(state));
  }
}
