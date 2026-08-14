import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen8EggResults,
  GEN8_EGG_API_VERSION,
  GEN8_EGG_RESULT_WORDS,
  gen8EggTaskCount,
  splitGen8EggRequest,
  validateGen8EggRequest,
  validateGen8EggResult,
  type Gen8EggRequest,
  type Gen8EggResult,
} from "../domain";
import type {
  Gen8EggEngine,
  Gen8EggSearchOptions,
  Gen8EggSummary,
} from "../search";
import type {
  Gen8EggWorkerBatch,
  Gen8EggWorkerRequest,
  Gen8EggWorkerResponse,
} from "./messages";

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen8egg.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(4, hardware - 1 || 1));
}

function finiteOption(value: number, name: string) {
  if (!Number.isFinite(value))
    throw new TypeError(`${name} must be a finite number.`);
  return Math.floor(value);
}

export class Gen8EggWorkerPool implements Gen8EggEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    {
      resolve(batch: Gen8EggWorkerBatch): void;
      reject(error: Error): void;
    }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Gen8EggRequest,
    options: Gen8EggSearchOptions = {},
  ): Promise<Gen8EggSummary> {
    if (this.searching || this.pending.size !== 0)
      throw new Error("A Gen 8 Egg search is already running.");
    validateGen8EggRequest(request);
    const startedAt = performance.now();
    const totalStates = gen8EggTaskCount(request);
    const maximumResults =
      options.maxResults === undefined || options.maxResults === Infinity
        ? request.resultLimit
        : finiteOption(options.maxResults, "Max results");
    const resultLimit = Math.max(
      1,
      Math.min(request.resultLimit, maximumResults),
    );
    const workerCountOption =
      options.workerCount === undefined
        ? defaultWorkerCount()
        : finiteOption(options.workerCount, "Worker count");
    const requestedWorkers = Math.max(1, Math.min(8, workerCountOption));
    const chunks = splitGen8EggRequest(
      request,
      requestedWorkers,
      options.chunkSize,
    );
    const activeWorkerCount = Math.min(
      requestedWorkers,
      chunks.length,
      resultLimit,
    );
    const workerRequest =
      resultLimit === request.resultLimit
        ? request
        : { ...request, resultLimit };
    if (options.signal?.aborted) {
      return {
        processedStates: 0,
        totalStates,
        resultCount: 0,
        percent: 0,
        elapsedMs: 0,
        workerCount: activeWorkerCount,
        cancelled: true,
        resultLimitReached: false,
      };
    }

    this.searching = true;
    this.cancelled = false;
    const cancel = () => this.cancel();
    options.signal?.addEventListener("abort", cancel, { once: true });
    let processedStates = 0;
    let receivedResults = 0;
    let nextChunk = 0;
    let stoppedEarly = false;
    const batches: Gen8EggWorkerBatch[] = [];
    try {
      this.ensureWorkers(activeWorkerCount);
      await Promise.all(this.workers.map((slot) => slot.ready));
      if (this.cancelled) {
        return {
          processedStates,
          totalStates,
          resultCount: 0,
          percent: (processedStates / totalStates) * 100,
          elapsedMs: performance.now() - startedAt,
          workerCount: activeWorkerCount,
          cancelled: true,
          resultLimitReached: false,
        };
      }
      const taskId = crypto.randomUUID();
      await Promise.all(
        this.workers.map(async (slot) => {
          while (
            !this.cancelled &&
            !stoppedEarly &&
            nextChunk < chunks.length
          ) {
            const chunk = chunks[nextChunk++];
            const batch = await new Promise<Gen8EggWorkerBatch>(
              (resolve, reject) => {
                const key = `${taskId}:${chunk.index}`;
                this.pending.set(key, { resolve, reject });
                const message: Gen8EggWorkerRequest = {
                  type: "task",
                  moduleId: "gen8egg",
                  apiVersion: GEN8_EGG_API_VERSION,
                  taskId,
                  operation: "generator",
                  chunkIndex: chunk.index,
                  request: workerRequest,
                  chunk,
                };
                slot.worker.postMessage(message);
              },
            );
            batches.push(batch);
            processedStates += batch.processedCount;
            receivedResults += batch.resultCount;
            if (
              batch.limitReached ||
              (receivedResults >= resultLimit && nextChunk < chunks.length)
            ) {
              stoppedEarly = true;
            }
            options.onProgress?.({
              processedStates,
              totalStates,
              resultCount: Math.min(receivedResults, resultLimit),
              percent: (processedStates / totalStates) * 100,
            });
          }
        }),
      );
      batches.sort((left, right) => left.chunkIndex - right.chunkIndex);
      const accepted: Gen8EggResult[] = [];
      for (const batch of batches) {
        if (
          batch.buffer.byteLength !==
          batch.resultCount *
            GEN8_EGG_RESULT_WORDS *
            Uint32Array.BYTES_PER_ELEMENT
        ) {
          throw new Error("Gen 8 Egg Worker batch length mismatch.");
        }
        const remaining = resultLimit - accepted.length;
        if (remaining <= 0) continue;
        accepted.push(
          ...decodeGen8EggResults(batch.buffer, remaining).map((result) =>
            validateGen8EggResult(request, result),
          ),
        );
      }
      if (accepted.length !== 0) options.onBatch?.(accepted);
      return {
        processedStates,
        totalStates,
        resultCount: accepted.length,
        percent: (processedStates / totalStates) * 100,
        elapsedMs: performance.now() - startedAt,
        workerCount: activeWorkerCount,
        cancelled: false,
        resultLimitReached:
          stoppedEarly ||
          batches.some((batch) => batch.limitReached) ||
          receivedResults > resultLimit,
      };
    } catch (error) {
      if (this.cancelled) {
        return {
          processedStates,
          totalStates,
          resultCount: 0,
          percent: (processedStates / totalStates) * 100,
          elapsedMs: performance.now() - startedAt,
          workerCount: activeWorkerCount,
          cancelled: true,
          resultLimitReached: false,
        };
      }
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.pending.clear();
      this.searching = false;
    }
  }

  cancel() {
    this.cancelled = true;
    this.reset(new Error("Gen 8 Egg search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen 8 Egg Worker pool was disposed."));
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 8 Egg Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen8egg.worker.ts", import.meta.url),
        {
          type: "module",
          name: `pokerngkit-gen8egg-${index + 1}`,
        },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({ data }: MessageEvent<Gen8EggWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(new Error(event.message || "Gen 8 Egg Worker crashed."));
      const init: Gen8EggWorkerRequest = {
        type: "init",
        moduleId: "gen8egg",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN8_EGG_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen8EggWorkerResponse) {
    if (
      message.moduleId !== "gen8egg" ||
      message.apiVersion !== GEN8_EGG_API_VERSION
    ) {
      this.reset(new Error("Gen 8 Egg Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      ) {
        this.reset(new Error("Gen 8 Egg Worker capability mismatch."));
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "error") {
      this.reset(new Error(message.message));
      return;
    }
    if (!Number.isInteger(message.chunkIndex) || message.chunkIndex < 0) {
      this.reset(new Error("Gen 8 Egg Worker returned an invalid batch."));
      return;
    }
    const key = `${message.taskId}:${message.chunkIndex}`;
    const pending = this.pending.get(key);
    if (!pending) {
      this.reset(new Error("Gen 8 Egg Worker returned an unknown batch."));
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
