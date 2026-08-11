import {
  ID3_CHUNK_SIZE,
  ID3_MAX_RESULTS,
  createId3Chunks,
  decodeId3States,
  type Id3Chunk,
  type Id3Request,
} from "../domain";
import type {
  Id3SearchEngine,
  Id3SearchOptions,
  Id3SearchSummary,
} from "../search";
import type {
  Id3WorkerBatchMessage,
  Id3WorkerRequest,
  Id3WorkerResponse,
} from "./messages";

interface PendingChunk {
  taskId: string;
  resolve(message: Id3WorkerBatchMessage): void;
  reject(error: Error): void;
}

class Id3WorkerClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: PendingChunk;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(new URL("./gen3id.worker.ts", import.meta.url), {
      type: "module",
      name: `pokerngkit-gen3id-${index}`,
    });
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Id3WorkerResponse>) =>
      this.handleMessage(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "ID3 Worker crashed."));
    this.post({ type: "init", moduleUrl });
  }

  async run(
    taskId: string,
    request: Id3Request,
    chunk: Id3Chunk,
  ): Promise<Id3WorkerBatchMessage> {
    await this.ready;
    if (this.pending) {
      throw new Error("ID3 Worker received overlapping chunks.");
    }

    return new Promise((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({
        type: "run",
        taskId,
        chunk,
        mode: request.mode,
        input: request.input,
        filters: request.filters,
      });
    });
  }

  terminate() {
    this.fail(new Error("ID3 Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Id3WorkerRequest) {
    this.worker.postMessage(message);
  }

  private handleMessage(message: Id3WorkerResponse) {
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

    if (message.type !== "batch") {
      this.fail(new Error("ID3 Worker returned an unexpected batch."));
      return;
    }

    if (!this.pending || this.pending.taskId !== message.taskId) {
      this.fail(new Error("ID3 Worker returned a batch for an unknown task."));
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

export function recommendedId3WorkerCount(): number {
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  return Math.max(1, Math.min(8, hardwareConcurrency - 1));
}

function defaultModuleUrl(): string {
  const relative = `${import.meta.env.BASE_URL}wasm/gen3id.mjs`;
  return new URL(relative, globalThis.location.href).href;
}

export class Gen3IdWorkerPool implements Id3SearchEngine {
  private clients: Id3WorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultModuleUrl()) {}

  async search(
    request: Id3Request,
    options: Id3SearchOptions = {},
  ): Promise<Id3SearchSummary> {
    if (this.running) {
      throw new Error("An ID3 calculation is already running.");
    }
    this.running = true;

    const startedAt = performance.now();
    const chunks = createId3Chunks(
      request,
      options.chunkSize ?? ID3_CHUNK_SIZE,
    );
    const totalStates = request.maxAdvances + 1;
    const workerCount = Math.min(
      options.workerCount ?? recommendedId3WorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? ID3_MAX_RESULTS;
    const taskId = crypto.randomUUID();
    const pendingBatches = new Map<number, ArrayBuffer>();
    let nextChunk = 0;
    let nextBatch = 0;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = false;
    let resultLimitReached = false;
    let stopped = false;

    const cancel = () => {
      if (stopped) return;
      cancelled = true;
      stopped = true;
      this.resetClients();
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });

    const report = () => {
      const progress = {
        processedStates,
        totalStates,
        resultCount,
        percent:
          totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return progress;
    };

    const flushBatches = () => {
      while (pendingBatches.has(nextBatch)) {
        const states = decodeId3States(pendingBatches.get(nextBatch)!);
        pendingBatches.delete(nextBatch);
        nextBatch++;

        const remaining = maxResults - resultCount;
        if (states.length > remaining) {
          options.onBatch?.(states.slice(0, Math.max(0, remaining)));
          resultCount = maxResults;
          resultLimitReached = true;
          stopped = true;
          return;
        }

        resultCount += states.length;
        options.onBatch?.(states);
      }
    };

    try {
      await this.ensureClients(workerCount);

      const work = async (client: Id3WorkerClient) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;

          try {
            const batch = await client.run(taskId, request, chunk);
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.stateCount;
            flushBatches();
            report();
          } catch (error) {
            if (!cancelled) throw error;
          }
        }
      };

      await Promise.all(this.clients.slice(0, workerCount).map(work));
      flushBatches();
      const progress = report();
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled,
        resultLimitReached,
      };
    } catch (error) {
      if (!cancelled) {
        this.resetClients();
      }
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.cancelActive = undefined;
      this.running = false;
    }
  }

  cancel() {
    this.cancelActive?.();
  }

  dispose() {
    this.resetClients();
  }

  private async ensureClients(count: number) {
    if (this.clients.length === count) return;
    this.resetClients();
    this.clients = Array.from(
      { length: count },
      (_, index) => new Id3WorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
