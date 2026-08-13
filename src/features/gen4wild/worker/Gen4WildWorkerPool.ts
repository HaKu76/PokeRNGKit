import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  createGen4WildChunks,
  createGen4WildSearcherChunks,
  decodeGen4WildSearcherStates,
  decodeGen4WildStates,
  gen4WildSearcherCombinationCount,
  GEN4_WILD_API_VERSION,
  GEN4_WILD_CHUNK_SIZE,
  GEN4_WILD_MAX_RESULTS,
  GEN4_WILD_SEARCHER_CHUNK_SIZE,
  type Gen4WildChunk,
  type Gen4WildGeneratorRequest,
  type Gen4WildSearcherChunk,
  type Gen4WildSearcherRequest,
  type Gen4WildSearcherState,
  type Gen4WildState,
} from "../domain";
import type { Gen4WildWorkerRequest, Gen4WildWorkerResponse } from "./messages";

export interface Gen4WildProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen4WildSummary extends Gen4WildProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen4WildOptions {
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  signal?: AbortSignal;
  onBatch?(states: Gen4WildState[]): void;
  onProgress?(progress: Gen4WildProgress): void;
}

export interface Gen4WildEngine {
  search(
    request: Gen4WildGeneratorRequest,
    options?: Gen4WildOptions,
  ): Promise<Gen4WildSummary>;
  cancel(): void;
  dispose(): void;
}

export interface Gen4WildSearcherOptions extends Omit<
  Gen4WildOptions,
  "onBatch"
> {
  onBatch?(states: Gen4WildSearcherState[]): void;
}

export interface Gen4WildSearcherEngine {
  search(
    request: Gen4WildSearcherRequest,
    options?: Gen4WildSearcherOptions,
  ): Promise<Gen4WildSummary>;
  cancel(): void;
  dispose(): void;
}

type Batch = Extract<Gen4WildWorkerResponse, { type: "batch" }>;

interface PendingChunk {
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  resolve(value: Batch): void;
  reject(error: Error): void;
}

export class Gen4WildWorkerClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: PendingChunk;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(new URL("./gen4wild.worker.ts", import.meta.url), {
      type: "module",
      name: `pokerngkit-gen4wild-${index}`,
    });
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Gen4WildWorkerResponse>) =>
      this.handleMessage(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen4 wild Worker crashed."));
    this.post({
      type: "init",
      moduleId: "gen4wild",
      moduleUrl,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN4_WILD_API_VERSION,
    });
  }

  async run(
    taskId: string,
    request: Gen4WildGeneratorRequest,
    chunk: Gen4WildChunk,
  ) {
    await this.ready;
    return this.request(taskId, "generator", chunk.index, {
      type: "task",
      moduleId: "gen4wild",
      apiVersion: GEN4_WILD_API_VERSION,
      taskId,
      operation: "generator",
      chunkIndex: chunk.index,
      request,
      chunk,
    });
  }

  async search(
    taskId: string,
    request: Gen4WildSearcherRequest,
    chunk: Gen4WildSearcherChunk,
  ) {
    await this.ready;
    return this.request(taskId, "searcher", chunk.index, {
      type: "task",
      moduleId: "gen4wild",
      apiVersion: GEN4_WILD_API_VERSION,
      taskId,
      operation: "searcher",
      chunkIndex: chunk.index,
      request,
      chunk,
    });
  }

  terminate() {
    this.fail(new Error("Gen4 wild Worker was terminated."));
    this.worker.terminate();
  }

  private request(
    taskId: string,
    operation: "generator" | "searcher",
    chunkIndex: number,
    message: Gen4WildWorkerRequest,
  ) {
    if (this.pending) {
      throw new Error("Gen4 wild Worker received overlapping chunks.");
    }
    return new Promise<Batch>((resolve, reject) => {
      this.pending = { taskId, operation, chunkIndex, resolve, reject };
      this.post(message);
    });
  }

  private post(message: Gen4WildWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handleMessage(message: Gen4WildWorkerResponse) {
    if (
      message.moduleId !== "gen4wild" ||
      message.apiVersion !== GEN4_WILD_API_VERSION
    ) {
      this.fail(new Error("Gen4 wild Worker response contract mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator") ||
        !message.operations.includes("searcher")
      ) {
        this.fail(new Error("Gen4 wild Worker capabilities mismatch."));
        return;
      }
      this.resolveReady?.();
      this.resolveReady = undefined;
      this.rejectReady = undefined;
      return;
    }
    if (message.type === "error") {
      this.fail(new Error(message.message));
      return;
    }
    if (
      !this.pending ||
      this.pending.taskId !== message.taskId ||
      this.pending.operation !== message.operation ||
      this.pending.chunkIndex !== message.chunkIndex
    ) {
      this.fail(new Error("Gen4 wild Worker returned an unknown batch."));
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

export function defaultGen4WildModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen4wild.mjs`,
    globalThis.location.href,
  ).href;
}

export function recommendedGen4WildWorkerCount() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

abstract class BasePool {
  protected clients: Gen4WildWorkerClient[] = [];
  protected running = false;
  protected cancelActive?: () => void;

  constructor(protected readonly moduleUrl = defaultGen4WildModuleUrl()) {}

  cancel() {
    this.cancelActive?.();
  }

  dispose() {
    this.resetClients();
  }

  protected ensureClients(count: number) {
    if (this.clients.length === count) return;
    this.resetClients();
    this.clients = Array.from(
      { length: count },
      (_, index) => new Gen4WildWorkerClient(index, this.moduleUrl),
    );
  }

  protected resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}

export class Gen4WildWorkerPool extends BasePool implements Gen4WildEngine {
  async search(
    request: Gen4WildGeneratorRequest,
    options: Gen4WildOptions = {},
  ): Promise<Gen4WildSummary> {
    if (this.running) {
      throw new Error("A Gen4 wild calculation is already running.");
    }
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen4WildChunks(
      request,
      options.chunkSize ?? GEN4_WILD_CHUNK_SIZE,
    );
    const totalStates = request.maxAdvances + 1;
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen4WildWorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN4_WILD_MAX_RESULTS;
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
        const states = decodeGen4WildStates(pendingBatches.get(nextBatch)!);
        pendingBatches.delete(nextBatch++);
        const remaining = maxResults - resultCount;
        if (states.length > remaining) {
          options.onBatch?.(states.slice(0, Math.max(0, remaining)));
          resultCount = maxResults;
          resultLimitReached = true;
          stopped = true;
          this.resetClients();
          return;
        }
        resultCount += states.length;
        options.onBatch?.(states);
        if (resultCount === maxResults && processedStates < totalStates) {
          resultLimitReached = true;
          stopped = true;
          this.resetClients();
          return;
        }
      }
    };

    try {
      this.ensureClients(workerCount);
      const work = async (client: Gen4WildWorkerClient) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.run(taskId, request, chunk);
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.processedCount;
            flushBatches();
            report();
          } catch (error) {
            if (!cancelled && !resultLimitReached) throw error;
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
}

export class Gen4WildSearcherWorkerPool
  extends BasePool
  implements Gen4WildSearcherEngine
{
  async search(
    request: Gen4WildSearcherRequest,
    options: Gen4WildSearcherOptions = {},
  ): Promise<Gen4WildSummary> {
    if (this.running) {
      throw new Error("A Gen4 wild search is already running.");
    }
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen4WildSearcherChunks(
      request,
      options.chunkSize ?? GEN4_WILD_SEARCHER_CHUNK_SIZE,
    );
    const totalStates = gen4WildSearcherCombinationCount(request);
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen4WildWorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN4_WILD_MAX_RESULTS;
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
        const states = decodeGen4WildSearcherStates(
          pendingBatches.get(nextBatch)!,
        );
        pendingBatches.delete(nextBatch++);
        const remaining = maxResults - resultCount;
        if (states.length > remaining) {
          options.onBatch?.(states.slice(0, Math.max(0, remaining)));
          resultCount = maxResults;
          resultLimitReached = true;
          stopped = true;
          this.resetClients();
          return;
        }
        resultCount += states.length;
        options.onBatch?.(states);
        if (resultCount === maxResults && processedStates < totalStates) {
          resultLimitReached = true;
          stopped = true;
          this.resetClients();
          return;
        }
      }
    };

    try {
      this.ensureClients(workerCount);
      const work = async (client: Gen4WildWorkerClient) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.search(taskId, request, chunk);
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.processedCount;
            flushBatches();
            report();
          } catch (error) {
            if (!cancelled && !resultLimitReached) throw error;
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
}
