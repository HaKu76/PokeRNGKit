import {
  createGen7IdChunks,
  decodeGen7IdStates,
  GEN7_ID_CHUNK_SIZE,
  GEN7_ID_MAX_RESULTS,
  type Gen7IdChunk,
  type Gen7IdRequest,
} from "../domain";
import type {
  Gen7IdSearchEngine,
  Gen7IdSearchOptions,
  Gen7IdSummary,
} from "../search";
import type {
  Gen7IdBatchMessage,
  Gen7IdWorkerRequest,
  Gen7IdWorkerResponse,
} from "./messages";
class Client {
  private worker: Worker;
  private ready: Promise<void>;
  private pending?: {
    taskId: string;
    resolve(message: Gen7IdBatchMessage): void;
    reject(error: Error): void;
  };
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;
  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(new URL("./gen7id.worker.ts", import.meta.url), {
      type: "module",
      name: `pokerngkit-gen7id-${index}`,
    });
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Gen7IdWorkerResponse>) =>
      this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen7 ID Worker crashed."));
    this.post({ type: "init", moduleUrl });
  }
  async run(taskId: string, request: Gen7IdRequest, chunk: Gen7IdChunk) {
    await this.ready;
    return new Promise<Gen7IdBatchMessage>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({ type: "run", taskId, request, chunk });
    });
  }
  terminate() {
    this.fail(new Error("Gen7 ID Worker was terminated."));
    this.worker.terminate();
  }
  private post(message: Gen7IdWorkerRequest) {
    this.worker.postMessage(message);
  }
  private handle(message: Gen7IdWorkerResponse) {
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
    if (!this.pending || this.pending.taskId !== message.taskId) {
      this.fail(new Error("Gen7 ID Worker returned an unknown task."));
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
function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen7id.mjs`,
    globalThis.location.href,
  ).href;
}
function workerCount() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}
export class Gen7IdWorkerPool implements Gen7IdSearchEngine {
  private clients: Client[] = [];
  private running = false;
  private cancelActive?: () => void;
  async search(
    request: Gen7IdRequest,
    options: Gen7IdSearchOptions = {},
  ): Promise<Gen7IdSummary> {
    if (this.running)
      throw new Error("A Gen7 ID calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen7IdChunks(
      request,
      options.chunkSize ?? GEN7_ID_CHUNK_SIZE,
    );
    const requestedWorkerCount = options.workerCount ?? workerCount();
    if (!Number.isInteger(requestedWorkerCount) || requestedWorkerCount < 1)
      throw new RangeError("Invalid Gen7 ID Worker count.");
    const count = Math.min(8, requestedWorkerCount, chunks.length);
    const maxResults = options.maxResults ?? GEN7_ID_MAX_RESULTS;
    if (!Number.isInteger(maxResults) || maxResults < 1)
      throw new RangeError("Invalid Gen7 ID result limit.");
    const taskId = crypto.randomUUID();
    const pending = new Map<number, ArrayBuffer>();
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
      this.reset();
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = () => {
      const progress = {
        processedStates,
        totalStates: request.maxAdvances - request.minAdvances + 1,
        resultCount,
        percent:
          (processedStates / (request.maxAdvances - request.minAdvances + 1)) *
          100,
      };
      options.onProgress?.(progress);
      return progress;
    };
    const flush = () => {
      while (pending.has(nextBatch)) {
        const states = decodeGen7IdStates(pending.get(nextBatch)!);
        pending.delete(nextBatch++);
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
      await this.ensure(count);
      const work = async (client: Client) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.run(taskId, request, chunk);
            if (stopped) return;
            if (
              batch.resultCount * 32 !== batch.buffer.byteLength ||
              batch.stateCount !== chunk.stateCount ||
              batch.chunkIndex !== chunk.index
            ) {
              throw new Error("Gen7 ID Worker returned an invalid batch.");
            }
            pending.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.stateCount;
            flush();
            report();
          } catch (error) {
            if (!cancelled) {
              stopped = true;
              this.reset();
              throw error;
            }
          }
        }
      };
      await Promise.all(this.clients.slice(0, count).map(work));
      flush();
      const progress = report();
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: count,
        cancelled,
        resultLimitReached,
      };
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
    this.reset();
  }
  private async ensure(count: number) {
    if (this.clients.length === count) return;
    this.reset();
    this.clients = Array.from(
      { length: count },
      (_, index) => new Client(index, moduleUrl()),
    );
  }
  private reset() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
