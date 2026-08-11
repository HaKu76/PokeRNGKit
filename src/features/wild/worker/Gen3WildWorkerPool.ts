import {
  createGen3WildChunks,
  createGen3WildSearcherChunks,
  decodeGen3WildStates,
  gen3WildSearcherCombinationCount,
  GEN3_WILD_CHUNK_SIZE,
  GEN3_WILD_MAX_RESULTS,
  type Gen3WildChunk,
  type Gen3WildRequest,
  type Gen3WildSearcherChunk,
  type Gen3WildSearcherRequest,
} from "../domain";
import type {
  Gen3WildSearchEngine,
  Gen3WildSearchOptions,
  Gen3WildSearchSummary,
} from "../search";
import type {
  Gen3WildWorkerBatchMessage,
  Gen3WildWorkerRequest,
  Gen3WildWorkerResponse,
} from "./messages";

interface PendingChunk {
  taskId: string;
  resolve(message: Gen3WildWorkerBatchMessage): void;
  reject(error: Error): void;
}

class Gen3WildWorkerClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: PendingChunk;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(new URL("./gen3wild.worker.ts", import.meta.url), {
      type: "module",
      name: `pokerngkit-gen3wild-${index}`,
    });
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Gen3WildWorkerResponse>) =>
      this.handleMessage(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen3 wild Worker crashed."));
    this.post({ type: "init", moduleUrl });
  }

  async run(taskId: string, request: Gen3WildRequest, chunk: Gen3WildChunk) {
    await this.ready;
    if (this.pending)
      throw new Error("Gen3 wild Worker received overlapping chunks.");
    return new Promise<Gen3WildWorkerBatchMessage>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({ type: "run", taskId, request, chunk });
    });
  }

  async search(
    taskId: string,
    request: Gen3WildSearcherRequest,
    chunk: Gen3WildSearcherChunk,
  ) {
    await this.ready;
    if (this.pending)
      throw new Error("Gen3 wild Worker received overlapping chunks.");
    return new Promise<Gen3WildWorkerBatchMessage>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({ type: "search", taskId, request, chunk });
    });
  }

  terminate() {
    this.fail(new Error("Gen3 wild Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Gen3WildWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handleMessage(message: Gen3WildWorkerResponse) {
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
      this.fail(new Error("Gen3 wild Worker returned an unknown batch."));
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

export function recommendedGen3WildWorkerCount() {
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  return Math.max(1, Math.min(8, hardwareConcurrency - 1));
}

export function defaultGen3WildModuleUrl() {
  const relative = `${import.meta.env.BASE_URL}wasm/gen3wild.mjs`;
  return new URL(relative, globalThis.location.href).href;
}

export class Gen3WildWorkerPool implements Gen3WildSearchEngine {
  private clients: Gen3WildWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen3WildModuleUrl()) {}

  async search(
    request: Gen3WildRequest,
    options: Gen3WildSearchOptions = {},
  ): Promise<Gen3WildSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 wild calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen3WildChunks(
      request,
      options.chunkSize ?? GEN3_WILD_CHUNK_SIZE,
    );
    const totalStates = request.maxAdvances + 1;
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen3WildWorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN3_WILD_MAX_RESULTS;
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
        const states = decodeGen3WildStates(pendingBatches.get(nextBatch)!);
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
      const work = async (client: Gen3WildWorkerClient) => {
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
      return {
        ...report(),
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

  async searchIvs(
    request: Gen3WildSearcherRequest,
    options: Gen3WildSearchOptions = {},
  ): Promise<Gen3WildSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 wild calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen3WildSearcherChunks(
      request,
      options.chunkSize ?? GEN3_WILD_CHUNK_SIZE,
    );
    const totalStates = gen3WildSearcherCombinationCount(request);
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen3WildWorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN3_WILD_MAX_RESULTS;
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
        const states = decodeGen3WildStates(pendingBatches.get(nextBatch)!);
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
      const work = async (client: Gen3WildWorkerClient) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.search(taskId, request, chunk);
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
      return {
        ...report(),
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
      (_, index) => new Gen3WildWorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
