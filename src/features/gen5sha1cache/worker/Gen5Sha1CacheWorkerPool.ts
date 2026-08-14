import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  appendGen5Sha1CacheResults,
  createGen5Sha1CacheData,
  GEN5_SHA1CACHE_API_VERSION,
  GEN5_SHA1CACHE_BATCH_RESULT_LIMIT,
  GEN5_SHA1CACHE_RESULT_LIMIT,
  GEN5_SHA1CACHE_SECONDS_PER_UNIT,
  gen5Sha1CacheUnit,
  gen5Sha1CacheUnitCount,
  validateGen5Sha1CacheRequest,
  type Gen5Sha1CacheRequest,
  type Gen5Sha1CacheSeeds,
} from "../domain";
import type { Gen5Sha1CacheEngine, Gen5Sha1CacheOptions } from "../search";
import type {
  Gen5Sha1CacheWorkerRequest,
  Gen5Sha1CacheWorkerResponse,
} from "./messages";

type Batch = Extract<Gen5Sha1CacheWorkerResponse, { type: "batch" }>;

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
  prepared: Promise<void>;
  resolvePrepared(): void;
  rejectPrepared(error: Error): void;
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen5sha1cache.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(4, hardware - 1 || 1));
}

function copyBuffer(values: Uint32Array) {
  return new Uint32Array(values).buffer;
}

export class Gen5Sha1CacheWorkerPool implements Gen5Sha1CacheEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    { resolve(batch: Batch): void; reject(error: Error): void }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Gen5Sha1CacheRequest,
    options: Gen5Sha1CacheOptions = {},
  ) {
    if (this.searching || this.pending.size !== 0)
      throw new Error("A Gen 5 SHA1 Cache search is already running.");
    validateGen5Sha1CacheRequest(request);
    const requestedWorkerCount = options.workerCount ?? defaultWorkerCount();
    if (!Number.isInteger(requestedWorkerCount) || requestedWorkerCount < 1)
      throw new RangeError(
        "Gen 5 SHA1 Cache Worker count must be a positive integer.",
      );
    const totalUnits = gen5Sha1CacheUnitCount(request);
    const workerCount = Math.min(4, totalUnits, requestedWorkerCount);
    const cache = createGen5Sha1CacheData(request);
    if (options.signal?.aborted)
      return {
        cache,
        processedUnits: 0,
        totalUnits,
        resultCount: 0,
        percent: 0,
        elapsedMs: 0,
        workerCount,
        cancelled: true,
      };

    this.searching = true;
    this.cancelled = false;
    const startedAt = performance.now();
    const abort = () => this.cancel();
    options.signal?.addEventListener("abort", abort, { once: true });
    let processedUnits = 0;
    let resultCount = 0;
    let nextUnitIndex = 0;
    try {
      this.reset(new Error("Gen 5 SHA1 Cache Worker pool was reconfigured."));
      this.cancelled = false;
      this.createWorkers(workerCount);
      await Promise.all(this.workers.map((slot) => slot.ready));
      this.prepareWorkers(request.seeds);
      await Promise.all(this.workers.map((slot) => slot.prepared));
      const taskId = crypto.randomUUID();
      await Promise.all(
        this.workers.map(async (slot) => {
          while (!this.cancelled && nextUnitIndex < totalUnits) {
            const unit = gen5Sha1CacheUnit(request, nextUnitIndex);
            nextUnitIndex += 1;
            const remaining = GEN5_SHA1CACHE_RESULT_LIMIT - resultCount;
            if (remaining < 1)
              throw new RangeError(
                `Gen 5 SHA1 Cache exceeds the result limit of ${GEN5_SHA1CACHE_RESULT_LIMIT}.`,
              );
            const batch = await this.request(slot, taskId, unit.index, {
              type: "task",
              moduleId: "gen5sha1cache",
              apiVersion: GEN5_SHA1CACHE_API_VERSION,
              taskId,
              operation: "searcher",
              chunkIndex: unit.index,
              request: {
                profile: request.profile,
                resultLimit: Math.min(
                  GEN5_SHA1CACHE_BATCH_RESULT_LIMIT,
                  remaining,
                ),
              },
              chunk: unit,
            });
            if (
              batch.limitReached ||
              batch.processedCount !== GEN5_SHA1CACHE_SECONDS_PER_UNIT ||
              !Number.isInteger(batch.resultCount) ||
              batch.resultCount < 0 ||
              batch.resultCount > GEN5_SHA1CACHE_BATCH_RESULT_LIMIT ||
              batch.resultCount > GEN5_SHA1CACHE_RESULT_LIMIT - resultCount
            )
              throw new RangeError(
                `Gen 5 SHA1 Cache exceeds the result limit of ${GEN5_SHA1CACHE_RESULT_LIMIT}.`,
              );
            const appended = appendGen5Sha1CacheResults(
              cache,
              unit,
              batch.buffer,
              batch.resultCount,
            );
            if (appended !== batch.resultCount)
              throw new Error("Gen 5 SHA1 Cache result count mismatch.");
            processedUnits += 1;
            resultCount += appended;
            const progress = {
              processedUnits,
              totalUnits,
              resultCount,
              percent: Math.min(100, (processedUnits / totalUnits) * 100),
            };
            options.onProgress?.(progress);
          }
        }),
      );
      return {
        cache,
        processedUnits,
        totalUnits,
        resultCount,
        percent: Math.min(100, (processedUnits / totalUnits) * 100),
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled: false,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          cache,
          processedUnits,
          totalUnits,
          resultCount,
          percent: Math.min(100, (processedUnits / totalUnits) * 100),
          elapsedMs: performance.now() - startedAt,
          workerCount,
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
    this.reset(new Error("Gen 5 SHA1 Cache search was cancelled."));
  }

  dispose() {
    this.cancelled = true;
    this.reset(new Error("Gen 5 SHA1 Cache Worker pool was disposed."));
  }

  private request(
    slot: WorkerSlot,
    taskId: string,
    chunkIndex: number,
    message: Gen5Sha1CacheWorkerRequest,
  ) {
    return new Promise<Batch>((resolve, reject) => {
      this.pending.set(`${taskId}:${chunkIndex}`, { resolve, reject });
      slot.worker.postMessage(message);
    });
  }

  private createWorkers(count: number) {
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      let resolvePrepared!: () => void;
      let rejectPrepared!: (error: Error) => void;
      const prepared = new Promise<void>((resolve, reject) => {
        resolvePrepared = resolve;
        rejectPrepared = reject;
      });
      const worker = new Worker(
        new URL("./gen5sha1cache.worker.ts", import.meta.url),
        { type: "module", name: `pokerngkit-gen5sha1cache-${index + 1}` },
      );
      const slot = {
        worker,
        ready,
        resolveReady,
        rejectReady,
        prepared,
        resolvePrepared,
        rejectPrepared,
      };
      worker.onmessage = ({
        data,
      }: MessageEvent<Gen5Sha1CacheWorkerResponse>) => this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(
          new Error(event.message || "Gen 5 SHA1 Cache Worker crashed."),
        );
      const init: Gen5Sha1CacheWorkerRequest = {
        type: "init",
        moduleId: "gen5sha1cache",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN5_SHA1CACHE_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private prepareWorkers(seeds: Gen5Sha1CacheSeeds) {
    for (const slot of this.workers) {
      const entralink = copyBuffer(seeds.entralink);
      const normal = copyBuffer(seeds.normal);
      const roamer = copyBuffer(seeds.roamer);
      const message: Gen5Sha1CacheWorkerRequest = {
        type: "prepare",
        moduleId: "gen5sha1cache",
        apiVersion: GEN5_SHA1CACHE_API_VERSION,
        entralink,
        normal,
        roamer,
      };
      slot.worker.postMessage(message, [entralink, normal, roamer]);
    }
  }

  private handle(slot: WorkerSlot, message: Gen5Sha1CacheWorkerResponse) {
    if (
      message.moduleId !== "gen5sha1cache" ||
      message.apiVersion !== GEN5_SHA1CACHE_API_VERSION
    ) {
      this.reset(new Error("Gen 5 SHA1 Cache Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("searcher")
      ) {
        this.reset(new Error("Gen 5 SHA1 Cache capability mismatch."));
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "prepared") {
      slot.resolvePrepared();
      return;
    }
    if (message.type === "error") {
      this.reset(new Error(message.message));
      return;
    }
    if (
      message.operation !== "searcher" ||
      !Number.isSafeInteger(message.chunkIndex) ||
      message.chunkIndex < 0
    ) {
      this.reset(new Error("Gen 5 SHA1 Cache returned an invalid batch."));
      return;
    }
    const key = `${message.taskId}:${message.chunkIndex}`;
    const pending = this.pending.get(key);
    if (!pending) {
      this.reset(new Error("Gen 5 SHA1 Cache returned an unknown batch."));
      return;
    }
    this.pending.delete(key);
    pending.resolve(message);
  }

  private fail(error: Error) {
    this.workers.forEach((slot) => {
      slot.rejectReady(error);
      slot.rejectPrepared(error);
    });
    this.pending.forEach((pending) => pending.reject(error));
    this.pending.clear();
  }

  private reset(error: Error) {
    this.fail(error);
    this.workers.forEach((slot) => slot.worker.terminate());
    this.workers = [];
  }
}
