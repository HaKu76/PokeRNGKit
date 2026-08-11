import {
  createGen3StaticChunks,
  decodeGen3StaticStates,
  GEN3_STATIC_CHUNK_SIZE,
  GEN3_STATIC_MAX_RESULTS,
  type Gen3StaticChunk,
  type Gen3StaticRequest,
  type Gen3StaticSearcherChunk,
  type Gen3StaticSearcherRequest,
} from "../domain";
import type {
  Gen3StaticSearchEngine,
  Gen3StaticSearchOptions,
  Gen3StaticSearchSummary,
} from "../search";
import type {
  Gen3StaticWorkerBatchMessage,
  Gen3StaticWorkerRequest,
  Gen3StaticWorkerResponse,
} from "./messages";

interface PendingChunk {
  taskId: string;
  resolve(message: Gen3StaticWorkerBatchMessage): void;
  reject(error: Error): void;
}

export class Gen3StaticWorkerClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: PendingChunk;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen3static.worker.ts", import.meta.url),
      {
        type: "module",
        name: `pokerngkit-gen3static-${index}`,
      },
    );
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen3StaticWorkerResponse>) => this.handleMessage(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen3 static Worker crashed."));
    this.post({ type: "init", moduleUrl });
  }

  async run(
    taskId: string,
    request: Gen3StaticRequest,
    chunk: Gen3StaticChunk,
  ): Promise<Gen3StaticWorkerBatchMessage> {
    await this.ready;
    if (this.pending)
      throw new Error("Gen3 static Worker received overlapping chunks.");
    return new Promise((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({ type: "run", taskId, chunk, request });
    });
  }

  async search(
    taskId: string,
    request: Gen3StaticSearcherRequest,
    chunk: Gen3StaticSearcherChunk,
  ): Promise<Gen3StaticWorkerBatchMessage> {
    await this.ready;
    if (this.pending)
      throw new Error("Gen3 static Worker received overlapping chunks.");
    return new Promise((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({ type: "search", taskId, chunk, request });
    });
  }

  terminate() {
    this.fail(new Error("Gen3 static Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Gen3StaticWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handleMessage(message: Gen3StaticWorkerResponse) {
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
      this.fail(
        new Error("Gen3 static Worker returned a batch for an unknown task."),
      );
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

export function recommendedGen3StaticWorkerCount(): number {
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  return Math.max(1, Math.min(8, hardwareConcurrency - 1));
}

export function defaultGen3StaticModuleUrl(): string {
  const relative = `${import.meta.env.BASE_URL}wasm/gen3static.mjs`;
  return new URL(relative, globalThis.location.href).href;
}

export class Gen3StaticWorkerPool implements Gen3StaticSearchEngine {
  private clients: Gen3StaticWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen3StaticModuleUrl()) {}

  async search(
    request: Gen3StaticRequest,
    options: Gen3StaticSearchOptions = {},
  ): Promise<Gen3StaticSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 static calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen3StaticChunks(
      request,
      options.chunkSize ?? GEN3_STATIC_CHUNK_SIZE,
    );
    const totalStates = request.maxAdvances + 1;
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen3StaticWorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN3_STATIC_MAX_RESULTS;
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
        const states = decodeGen3StaticStates(pendingBatches.get(nextBatch)!);
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
      const work = async (client: Gen3StaticWorkerClient) => {
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
      if (!cancelled) this.resetClients();
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
      (_, index) => new Gen3StaticWorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
