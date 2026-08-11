import { decodeId3SearcherStates, type Id3SearcherRequest } from "../domain";
import type {
  Id3SearcherEngine,
  Id3SearcherOptions,
  Id3SearcherSummary,
} from "../searcher";
import type {
  Id3WorkerRequest,
  Id3WorkerResponse,
  Id3WorkerSearchBatchMessage,
} from "./messages";

function defaultModuleUrl(): string {
  const relative = `${import.meta.env.BASE_URL}wasm/gen3id.mjs`;
  return new URL(relative, globalThis.location.href).href;
}

class SearcherClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;
  private pending?: {
    taskId: string;
    resolve(message: Id3WorkerSearchBatchMessage): void;
    reject(error: Error): void;
  };

  constructor(moduleUrl: string) {
    this.worker = new Worker(new URL("./gen3id.worker.ts", import.meta.url), {
      type: "module",
      name: "pokerngkit-gen3id-searcher",
    });
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Id3WorkerResponse>) =>
      this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "ID3 Searcher Worker crashed."));
    this.post({ type: "init", moduleUrl });
  }

  async search(
    taskId: string,
    request: Id3SearcherRequest,
  ): Promise<Id3WorkerSearchBatchMessage> {
    await this.ready;
    return new Promise((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({ type: "search", taskId, request });
    });
  }

  terminate() {
    this.fail(new Error("ID3 Searcher Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Id3WorkerRequest) {
    this.worker.postMessage(message);
  }

  private handle(message: Id3WorkerResponse) {
    if (message.type === "ready") {
      this.resolveReady?.();
      this.resolveReady = undefined;
      this.rejectReady = undefined;
      return;
    }
    if (message.type === "error") {
      this.fail(new Error(message.message));
      return;
    }
    if (message.type !== "search-batch") {
      this.fail(new Error("ID3 Searcher Worker returned an unexpected batch."));
      return;
    }
    if (!this.pending || this.pending.taskId !== message.taskId) {
      this.fail(new Error("ID3 Searcher Worker returned an unknown task."));
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

export class Gen3IdSearcherWorkerPool implements Id3SearcherEngine {
  private client?: SearcherClient;
  private running = false;
  private cancelled = false;

  constructor(private readonly moduleUrl = defaultModuleUrl()) {}

  async search(
    request: Id3SearcherRequest,
    options: Id3SearcherOptions = {},
  ): Promise<Id3SearcherSummary> {
    if (this.running) throw new Error("An ID3 search is already running.");
    this.running = true;
    this.cancelled = options.signal?.aborted ?? false;
    const startedAt = performance.now();
    const cancel = () => this.cancel();
    options.signal?.addEventListener("abort", cancel, { once: true });
    options.onProgress?.({
      processedTasks: 0,
      totalTasks: 1,
      resultCount: 0,
      percent: 0,
    });

    try {
      if (this.cancelled) throw new Error("ID3 search was cancelled.");
      this.client ??= new SearcherClient(this.moduleUrl);
      const message = await this.client.search(crypto.randomUUID(), request);
      if (this.cancelled) throw new Error("ID3 search was cancelled.");
      const states = decodeId3SearcherStates(message.buffer);
      options.onBatch?.(states);
      const progress = {
        processedTasks: 1,
        totalTasks: 1,
        resultCount: states.length,
        percent: 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: false,
      };
    } catch (error) {
      if (!this.cancelled) throw error;
      return {
        processedTasks: 0,
        totalTasks: 1,
        resultCount: 0,
        percent: 0,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: true,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.running = false;
    }
  }

  cancel() {
    if (!this.running) return;
    this.cancelled = true;
    this.client?.terminate();
    this.client = undefined;
  }

  dispose() {
    this.client?.terminate();
    this.client = undefined;
  }
}
