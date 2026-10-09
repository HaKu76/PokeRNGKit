import { MAX_SAVE_BYTES, type SaveEditorResult } from "./domain";

export class SaveEditorClient {
  private worker?: Worker;
  private nextId = 0;
  private pending = new Map<
    number,
    {
      resolve(value: SaveEditorResult): void;
      reject(error: Error): void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  run(
    bytes: Uint8Array,
    edit?: string,
    kind:
      | "boxBinaryPreview"
      | "boxBinaryCommit"
      | "boxBinaryDiscard"
      | "boxBinaryExport"
      | "boxImportPreview"
      | "boxImportCommit"
      | "boxImportDiscard"
      | "boxArchive"
      | "filePreview"
      | "fileExport"
      | "fileDiscard"
      | "fileCatalog"
      | "propertyCatalog"
      | "propertyPreview"
      | "propertyCommit"
      | "propertyDiscard"
      | "pokedex9a"
      | "pokedex9aEdit"
      | "pokedex9"
      | "pokedex9Edit"
      | "pokedex8a"
      | "pokedex8aEdit"
      | "pokedex8"
      | "pokedex8Edit"
      | "pokedex8b"
      | "pokedex8bEdit"
      | "pokedex7"
      | "pokedex7Edit"
      | "pokedex6"
      | "pokedex6Edit"
      | "pokedex5"
      | "pokedex5Edit"
      | "pokedex4"
      | "pokedex4Edit"
      | "pokedex"
      | "pokedexEdit"
      | "exportWorkingCopy"
      | "trainer"
      | "inventory"
      | "events"
      | "eventsEdit"
      | "eventsCompare"
      | "gsBall2"
      | "gsBall2Edit"
      | "hall3"
      | "hall3Edit"
      | "hall1"
      | "hall1Edit"
      | "eventReset"
      | "eventResetEdit"
      | "decorations3"
      | "decorations3Edit"
      | "roamer3"
      | "roamer3Edit"
      | "roamer"
      | "roamerEdit"
      | "rtc"
      | "rtcEdit"
      | "opowers"
      | "opowersEdit"
      | "food"
      | "foodEdit"
      | "records"
      | "recordEdit"
      | "inventoryEdit"
      | "inventoryBatch"
      | "pokemon"
      | "pokemonRaw"
      | "legality"
      | "box"
      | "storage"
      | "pokemonImport"
      | "historyCatalog"
      | "memoryCatalog"
      | "ribbons"
      | "relearnSuggestion"
      | "originCatalog"
      | "pokemonExport" = "trainer",
  ): Promise<SaveEditorResult> {
    if (!bytes.length || bytes.length > MAX_SAVE_BYTES)
      return Promise.reject(
        new Error("Save file must be between 1 byte and 32 MiB."),
      );
    if (!this.worker) {
      this.worker = new Worker(
        new URL("./saveeditor.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = ({ data }) => {
        const request = this.pending.get(data.id);
        if (!request) return;
        clearTimeout(request.timer);
        this.pending.delete(data.id);
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data);
      };
      this.worker.onerror = (event) =>
        this.dispose(
          event.message ||
            "Save editor could not start. Check that its local runtime assets are installed.",
        );
    }
    const id = ++this.nextId;
    const copy = new Uint8Array(bytes);
    const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          this.dispose(
            "Save editor timed out. Your original file is unchanged.",
          ),
        120_000,
      );
      this.pending.set(id, { resolve, reject, timer });
      this.worker!.postMessage({ id, bytes: copy, base, edit, kind }, [
        copy.buffer,
      ]);
    });
  }

  dispose(message = "Cancelled") {
    this.worker?.terminate();
    this.worker = undefined;
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error(message));
    }
    this.pending.clear();
  }

  discardPropertyPreview(bytes: Uint8Array, token: string) {
    if (this.worker)
      void this.run(bytes, token, "propertyDiscard").catch(() => {});
  }

  discardFilePreview(bytes: Uint8Array, token: string) {
    if (this.worker) void this.run(bytes, token, "fileDiscard").catch(() => {});
  }

  discardBoxImport(bytes: Uint8Array, token: string) {
    if (this.worker)
      void this.run(bytes, token, "boxImportDiscard").catch(() => {});
  }

  discardBoxBinary(bytes: Uint8Array, token: string) {
    if (this.worker)
      void this.run(bytes, token, "boxBinaryDiscard").catch(() => {});
  }
}
