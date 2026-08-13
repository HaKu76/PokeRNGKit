import {
  decodePokerusFinderStates,
  POKERUS_FINDER_API_VERSION,
  type PokerusGen3Request,
  type PokerusPtHgssRequest,
} from "../domain";
import type {
  PokerusFinderSearchEngine,
  PokerusFinderSearchSummary,
} from "../search";
import type {
  PokerusFinderWorkerRequest,
  PokerusFinderWorkerResponse,
} from "./messages";

class Client {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: {
    taskId: string;
    resolve(
      value: Extract<PokerusFinderWorkerResponse, { type: "batch" }>,
    ): void;
    reject(error: Error): void;
  };
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;
  constructor(moduleUrl: string) {
    this.worker = new Worker(
      new URL("./pokerusfinder.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-pokerusfinder" },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<PokerusFinderWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Pokerus Finder Worker crashed."));
    this.post({ type: "init", moduleUrl });
  }
  async run(
    message: Extract<
      PokerusFinderWorkerRequest,
      { type: "run-gen3" | "run-pthgss" }
    >,
  ) {
    await this.ready;
    if (this.pending)
      throw new Error("Pokerus Finder Worker received an overlapping task.");
    return new Promise<Extract<PokerusFinderWorkerResponse, { type: "batch" }>>(
      (resolve, reject) => {
        this.pending = { taskId: message.taskId, resolve, reject };
        this.post(message);
      },
    );
  }
  terminate() {
    this.fail(new Error("Pokerus Finder Worker was terminated."));
    this.worker.terminate();
  }
  private post(message: PokerusFinderWorkerRequest) {
    this.worker.postMessage(message);
  }
  private handle(message: PokerusFinderWorkerResponse) {
    if (message.type === "ready") {
      if (message.apiVersion !== POKERUS_FINDER_API_VERSION)
        this.fail(new Error("Pokerus Finder API version mismatch."));
      else {
        this.resolveReady?.();
        this.resolveReady = undefined;
        this.rejectReady = undefined;
      }
      return;
    }
    if (message.type === "error") {
      this.fail(new Error(message.message));
      return;
    }
    if (!this.pending || this.pending.taskId !== message.taskId) {
      this.fail(new Error("Pokerus Finder Worker returned an unknown task."));
      return;
    }
    const pending = this.pending;
    this.pending = undefined;
    pending.resolve(message);
  }
  private fail(error: Error) {
    this.rejectReady?.(error);
    this.resolveReady = undefined;
    this.rejectReady = undefined;
    this.pending?.reject(error);
    this.pending = undefined;
  }
}

export function defaultPokerusFinderModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/pokerusfinder.mjs`,
    globalThis.location.href,
  ).href;
}

export class PokerusFinderWorkerPool implements PokerusFinderSearchEngine {
  private client?: Client;
  private cancelActive?: () => void;
  private running = false;
  constructor(private readonly moduleUrl = defaultPokerusFinderModuleUrl()) {}
  private async run(
    message: Extract<
      PokerusFinderWorkerRequest,
      { type: "run-gen3" | "run-pthgss" }
    >,
    signal?: AbortSignal,
  ): Promise<PokerusFinderSearchSummary> {
    if (this.running)
      throw new Error("A Pokerus Finder calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    let cancelled = signal?.aborted ?? false;
    const cancel = () => {
      cancelled = true;
      this.client?.terminate();
      this.client = undefined;
    };
    this.cancelActive = cancel;
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      if (cancelled)
        return {
          states: [],
          processed: 0,
          total: 0,
          elapsedMs: 0,
          workerCount: 0,
          cancelled: true,
        };
      this.client ??= new Client(this.moduleUrl);
      const batch = await this.client.run(message);
      if (cancelled)
        return {
          states: [],
          processed: 0,
          total: batch.total,
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      const states = decodePokerusFinderStates(batch.buffer, batch.hasDelay);
      if (states.length !== batch.resultCount)
        throw new RangeError("Pokerus Finder result count mismatch.");
      return {
        states,
        processed: batch.processed,
        total: batch.total,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: false,
      };
    } catch (error) {
      if (cancelled)
        return {
          states: [],
          processed: 0,
          total: 0,
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      this.client?.terminate();
      this.client = undefined;
      throw error;
    } finally {
      signal?.removeEventListener("abort", cancel);
      this.cancelActive = undefined;
      this.running = false;
    }
  }
  searchGen3(
    request: PokerusGen3Request,
    options: { signal?: AbortSignal } = {},
  ) {
    return this.run(
      { type: "run-gen3", taskId: crypto.randomUUID(), request },
      options.signal,
    );
  }
  searchPtHgss(
    request: PokerusPtHgssRequest,
    options: { signal?: AbortSignal } = {},
  ) {
    return this.run(
      { type: "run-pthgss", taskId: crypto.randomUUID(), request },
      options.signal,
    );
  }
  cancel() {
    this.cancelActive?.();
  }
  dispose() {
    this.cancelActive?.();
    this.client?.terminate();
    this.client = undefined;
  }
}
