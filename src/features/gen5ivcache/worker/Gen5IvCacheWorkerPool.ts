import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  appendGen5IvCacheHits,
  createGen5IvCacheData,
  gen5IvCacheChunk,
  gen5IvCacheChunkCount,
  GEN5_IVCACHE_API_VERSION,
  GEN5_IVCACHE_BATCH_RESULT_LIMIT,
  GEN5_IVCACHE_RESULT_LIMIT,
  GEN5_IVCACHE_TOTAL_SEEDS,
  validateGen5IvCacheExecution,
} from "../domain";
import type {
  Gen5IvCacheEngine,
  Gen5IvCacheOptions,
  Gen5IvCacheSummary,
} from "../search";
import type {
  Gen5IvCacheWorkerRequest,
  Gen5IvCacheWorkerResponse,
} from "./messages";

type Batch = Extract<Gen5IvCacheWorkerResponse, { type: "batch" }>;

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen5ivcache.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(4, hardware - 1 || 1));
}

export class Gen5IvCacheWorkerPool implements Gen5IvCacheEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    { resolve(batch: Batch): void; reject(error: Error): void }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Parameters<Gen5IvCacheEngine["search"]>[0],
    options: Gen5IvCacheOptions = {},
  ): Promise<Gen5IvCacheSummary> {
    if (this.searching || this.pending.size !== 0)
      throw new Error("A Gen 5 IV Cache search is already running.");
    if (validateGen5IvCacheExecution(request).length > 0)
      throw new RangeError("Invalid Gen 5 IV Cache request.");
    const startedAt = performance.now();
    const cache = createGen5IvCacheData(request);
    const totalChunks = gen5IvCacheChunkCount();
    const requestedWorkerCount = options.workerCount ?? defaultWorkerCount();
    if (
      !Number.isFinite(requestedWorkerCount) ||
      !Number.isInteger(requestedWorkerCount) ||
      requestedWorkerCount < 1
    )
      throw new RangeError(
        "Gen 5 IV Cache Worker count must be a positive integer.",
      );
    const activeWorkerCount = Math.min(totalChunks, 4, requestedWorkerCount);
    if (options.signal?.aborted)
      return {
        cache,
        processedSeeds: 0,
        totalSeeds: GEN5_IVCACHE_TOTAL_SEEDS,
        resultCount: 0,
        elapsedMs: 0,
        workerCount: activeWorkerCount,
        cancelled: true,
      };

    this.searching = true;
    this.cancelled = false;
    const abort = () => this.cancel();
    options.signal?.addEventListener("abort", abort, { once: true });
    let processedSeeds = 0;
    let resultCount = 0;
    let nextChunkIndex = 0;
    try {
      this.ensureWorkers(activeWorkerCount);
      await Promise.all(this.workers.map((slot) => slot.ready));
      const taskId = crypto.randomUUID();
      await Promise.all(
        this.workers.map(async (slot) => {
          while (!this.cancelled && nextChunkIndex < totalChunks) {
            const chunk = gen5IvCacheChunk(nextChunkIndex);
            nextChunkIndex += 1;
            const batch = await new Promise<Batch>((resolve, reject) => {
              const key = `${taskId}:${chunk.index}`;
              this.pending.set(key, { resolve, reject });
              const message: Gen5IvCacheWorkerRequest = {
                type: "task",
                moduleId: "gen5ivcache",
                apiVersion: GEN5_IVCACHE_API_VERSION,
                taskId,
                operation: "searcher",
                chunkIndex: chunk.index,
                request,
                chunk,
              };
              slot.worker.postMessage(message);
            });
            if (
              batch.processedCount !== chunk.seedCount ||
              !Number.isInteger(batch.resultCount) ||
              batch.resultCount < 0 ||
              batch.resultCount > GEN5_IVCACHE_BATCH_RESULT_LIMIT
            ) {
              const error = new Error(
                "Gen 5 IV Cache Worker returned inconsistent metadata.",
              );
              this.reset(error);
              throw error;
            }
            if (batch.resultCount > GEN5_IVCACHE_RESULT_LIMIT - resultCount) {
              const error = new RangeError(
                `Gen 5 IV Cache exceeds the result limit of ${GEN5_IVCACHE_RESULT_LIMIT}.`,
              );
              this.reset(error);
              throw error;
            }
            appendGen5IvCacheHits(
              cache,
              batch.buffer,
              batch.resultCount,
              chunk,
            );
            processedSeeds += batch.processedCount;
            resultCount += batch.resultCount;
            options.onProgress?.({
              processedSeeds,
              totalSeeds: GEN5_IVCACHE_TOTAL_SEEDS,
              resultCount,
              percent: (processedSeeds / GEN5_IVCACHE_TOTAL_SEEDS) * 100,
            });
          }
        }),
      );
      return {
        cache,
        processedSeeds,
        totalSeeds: GEN5_IVCACHE_TOTAL_SEEDS,
        resultCount,
        elapsedMs: performance.now() - startedAt,
        workerCount: activeWorkerCount,
        cancelled: false,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          cache,
          processedSeeds,
          totalSeeds: GEN5_IVCACHE_TOTAL_SEEDS,
          resultCount,
          elapsedMs: performance.now() - startedAt,
          workerCount: activeWorkerCount,
          cancelled: true,
        };
      this.reset(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", abort);
      this.pending.clear();
      this.searching = false;
    }
  }

  cancel() {
    this.cancelled = true;
    this.reset(new Error("Gen 5 IV Cache search was cancelled."));
  }

  dispose() {
    this.cancelled = true;
    this.reset(new Error("Gen 5 IV Cache Worker pool was disposed."));
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 5 IV Cache Worker pool was resized."));
    this.cancelled = false;
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen5ivcache.worker.ts", import.meta.url),
        { type: "module", name: `pokerngkit-gen5ivcache-${index + 1}` },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({ data }: MessageEvent<Gen5IvCacheWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(
          new Error(event.message || "Gen 5 IV Cache Worker crashed."),
        );
      const init: Gen5IvCacheWorkerRequest = {
        type: "init",
        moduleId: "gen5ivcache",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN5_IVCACHE_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen5IvCacheWorkerResponse) {
    if (
      message.moduleId !== "gen5ivcache" ||
      message.apiVersion !== GEN5_IVCACHE_API_VERSION
    ) {
      this.reset(new Error("Gen 5 IV Cache Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("searcher")
      ) {
        this.reset(new Error("Gen 5 IV Cache Worker capability mismatch."));
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "error") {
      this.reset(new Error(message.message));
      return;
    }
    if (
      message.operation !== "searcher" ||
      !Number.isInteger(message.chunkIndex) ||
      message.chunkIndex < 0
    ) {
      this.reset(new Error("Gen 5 IV Cache Worker returned an invalid batch."));
      return;
    }
    const key = `${message.taskId}:${message.chunkIndex}`;
    const pending = this.pending.get(key);
    if (!pending) {
      this.reset(new Error("Gen 5 IV Cache Worker returned an unknown batch."));
      return;
    }
    this.pending.delete(key);
    pending.resolve(message);
  }

  private fail(error: Error) {
    this.workers.forEach((slot) => slot.rejectReady(error));
    this.pending.forEach((pending) => pending.reject(error));
    this.pending.clear();
  }

  private reset(error: Error) {
    this.fail(error);
    this.workers.forEach((slot) => slot.worker.terminate());
    this.workers = [];
  }
}
