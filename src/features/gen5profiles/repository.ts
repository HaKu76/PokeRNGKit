import {
  EMPTY_GEN5_PROFILE_STATE,
  parseGen5ProfileState,
  type Gen5ProfileState,
} from "./domain";

const DATABASE_NAME = "pokerngkit-gen5";
const DATABASE_VERSION = 1;
const OBJECT_STORE = "profile-data";
const PROFILE_KEY = "gen5-profiles";
const MIRROR_KEY = "pokerngkit-gen5-profiles-v1";

export type Gen5ProfileStorageMode = "indexeddb" | "localstorage";

export interface Gen5ProfilePrimaryStore {
  read(): Promise<unknown | undefined>;
  write(state: Gen5ProfileState): Promise<void>;
  clear(): Promise<void>;
}

class IndexedDbGen5ProfileStore implements Gen5ProfilePrimaryStore {
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

  async write(state: Gen5ProfileState) {
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
        if (!request.result.objectStoreNames.contains(OBJECT_STORE))
          request.result.createObjectStore(OBJECT_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("PokeRNGKit Gen 5 IndexedDB upgrade was blocked."));
    });
  }
}

export interface Gen5ProfileLoadResult {
  state: Gen5ProfileState;
  storageMode: Gen5ProfileStorageMode;
}

export class Gen5ProfileRepository {
  private readonly primary?: Gen5ProfilePrimaryStore;

  constructor(
    primary:
      Gen5ProfilePrimaryStore | IDBFactory | undefined = typeof indexedDB ===
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
        ? new IndexedDbGen5ProfileStore(primary as IDBFactory)
        : (primary as Gen5ProfilePrimaryStore | undefined);
  }

  async load(): Promise<Gen5ProfileLoadResult> {
    if (this.primary) {
      try {
        const stored = await this.primary.read();
        if (stored !== undefined) {
          const state = parseGen5ProfileState(stored);
          this.writeMirror(state);
          return { state, storageMode: "indexeddb" };
        }
      } catch {
        // The localStorage mirror is the recovery path for corrupt or unavailable IndexedDB.
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
      state: { ...EMPTY_GEN5_PROFILE_STATE, profiles: [] },
      storageMode: this.primary ? "indexeddb" : "localstorage",
    };
  }

  async save(state: Gen5ProfileState): Promise<Gen5ProfileStorageMode> {
    const validated = parseGen5ProfileState(state);
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
      // Keep the initial false value when the mirror rejects the write.
    }
    if (!primarySaved && !mirrorSaved)
      throw new Error("Unable to save Gen 5 profiles in browser storage.");
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
      // Keep the initial false value when the mirror rejects the removal.
    }
    if (!primaryCleared && !mirrorCleared)
      throw new Error("Unable to clear Gen 5 profiles from browser storage.");
  }

  private readMirror() {
    const value = this.mirror?.getItem(MIRROR_KEY);
    if (!value) return undefined;
    try {
      return parseGen5ProfileState(JSON.parse(value));
    } catch {
      return undefined;
    }
  }

  private writeMirror(state: Gen5ProfileState) {
    this.mirror?.setItem(MIRROR_KEY, JSON.stringify(state));
  }
}
