import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen8UndergroundResults,
  GEN8_UNDERGROUND_API_VERSION,
  GEN8_UNDERGROUND_RESULT_WORDS,
  gen8UndergroundTaskCount,
  splitGen8UndergroundRequest,
  validateGen8UndergroundRequest,
  validateGen8UndergroundResult,
  type Gen8UndergroundRequest,
  type Gen8UndergroundResult,
} from "../domain";
import type {
  Gen8UndergroundEngine,
  Gen8UndergroundSearchOptions,
  Gen8UndergroundSummary,
} from "../search";
import type {
  Gen8UndergroundWorkerBatch,
  Gen8UndergroundWorkerRequest,
  Gen8UndergroundWorkerResponse,
} from "./messages";

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen8underground.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(4, hardware - 1 || 1));
}

function boundedSearchOption(
  value: number | undefined,
  fallback: number,
  maximum: number,
  name: string,
) {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved))
    throw new TypeError(`${name} must be a finite number.`);
  return Math.max(1, Math.min(maximum, Math.floor(resolved)));
}

export class Gen8UndergroundWorkerPool implements Gen8UndergroundEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    {
      resolve(batch: Gen8UndergroundWorkerBatch): void;
      reject(error: Error): void;
    }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Gen8UndergroundRequest,
    options: Gen8UndergroundSearchOptions = {},
  ): Promise<Gen8UndergroundSummary> {
    if (this.searching || this.pending.size)
      throw new Error("A Gen 8 Underground search is already running.");
    validateGen8UndergroundRequest(request);
    const startedAt = performance.now();
    const totalStates = gen8UndergroundTaskCount(request);
    const resultLimit = boundedSearchOption(
      options.maxResults,
      request.resultLimit,
      request.resultLimit,
      "Max results",
    );
    const requestedWorkers = boundedSearchOption(
      options.workerCount,
      defaultWorkerCount(),
      8,
      "Worker count",
    );
    const chunks = splitGen8UndergroundRequest(
      request,
      requestedWorkers,
      options.chunkSize,
    );
    const workerCount = Math.min(requestedWorkers, chunks.length, resultLimit);
    if (options.signal?.aborted)
      return {
        processedStates: 0,
        totalStates,
        resultCount: 0,
        percent: 0,
        elapsedMs: 0,
        workerCount,
        cancelled: true,
        resultLimitReached: false,
      };
    this.searching = true;
    this.cancelled = false;
    const cancel = () => this.cancel();
    options.signal?.addEventListener("abort", cancel, { once: true });
    let processedStates = 0;
    let receivedResults = 0;
    let nextChunk = 0;
    let stoppedEarly = false;
    const batches: Gen8UndergroundWorkerBatch[] = [];
    try {
      this.ensureWorkers(workerCount);
      await Promise.all(this.workers.map((slot) => slot.ready));
      const taskId = crypto.randomUUID();
      await Promise.all(
        this.workers.map(async (slot) => {
          while (
            !this.cancelled &&
            !stoppedEarly &&
            nextChunk < chunks.length
          ) {
            const chunk = chunks[nextChunk++];
            const batch = await new Promise<Gen8UndergroundWorkerBatch>(
              (resolve, reject) => {
                this.pending.set(`${taskId}:${chunk.index}`, {
                  resolve,
                  reject,
                });
                const message: Gen8UndergroundWorkerRequest = {
                  type: "task",
                  moduleId: "gen8underground",
                  apiVersion: GEN8_UNDERGROUND_API_VERSION,
                  taskId,
                  operation: "generator",
                  chunkIndex: chunk.index,
                  request:
                    resultLimit === request.resultLimit
                      ? request
                      : { ...request, resultLimit },
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
      if (this.cancelled) {
        return {
          processedStates,
          totalStates,
          resultCount: 0,
          percent: (processedStates / totalStates) * 100,
          elapsedMs: performance.now() - startedAt,
          workerCount,
          cancelled: true,
          resultLimitReached: false,
        };
      }
      batches.sort((left, right) => left.chunkIndex - right.chunkIndex);
      const accepted: Gen8UndergroundResult[] = [];
      for (const batch of batches) {
        if (
          batch.buffer.byteLength !==
          batch.resultCount *
            GEN8_UNDERGROUND_RESULT_WORDS *
            Uint32Array.BYTES_PER_ELEMENT
        ) {
          throw new Error("Gen 8 Underground Worker batch length mismatch.");
        }
        const remaining = resultLimit - accepted.length;
        if (remaining <= 0) continue;
        accepted.push(
          ...decodeGen8UndergroundResults(batch.buffer, remaining).map(
            (result) => validateGen8UndergroundResult(request, result),
          ),
        );
      }
      if (accepted.length) options.onBatch?.(accepted);
      return {
        processedStates,
        totalStates,
        resultCount: accepted.length,
        percent: (processedStates / totalStates) * 100,
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled: false,
        resultLimitReached:
          stoppedEarly ||
          batches.some((batch) => batch.limitReached) ||
          receivedResults > resultLimit,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          processedStates,
          totalStates,
          resultCount: 0,
          percent: (processedStates / totalStates) * 100,
          elapsedMs: performance.now() - startedAt,
          workerCount,
          cancelled: true,
          resultLimitReached: false,
        };
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.pending.clear();
      this.searching = false;
    }
  }

  cancel() {
    this.cancelled = true;
    this.reset(new Error("Gen 8 Underground search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen 8 Underground Worker pool was disposed."));
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 8 Underground Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen8underground.worker.ts", import.meta.url),
        {
          type: "module",
          name: `pokerngkit-gen8underground-${index + 1}`,
        },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({
        data,
      }: MessageEvent<Gen8UndergroundWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(
          new Error(event.message || "Gen 8 Underground Worker crashed."),
        );
      const init: Gen8UndergroundWorkerRequest = {
        type: "init",
        moduleId: "gen8underground",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN8_UNDERGROUND_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen8UndergroundWorkerResponse) {
    if (
      message.moduleId !== "gen8underground" ||
      message.apiVersion !== GEN8_UNDERGROUND_API_VERSION
    ) {
      this.reset(new Error("Gen 8 Underground Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      ) {
        this.reset(new Error("Gen 8 Underground Worker capability mismatch."));
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "error") {
      this.reset(new Error(message.message));
      return;
    }
    const pending = this.pending.get(`${message.taskId}:${message.chunkIndex}`);
    if (!pending) {
      this.reset(
        new Error("Gen 8 Underground Worker returned an unknown batch."),
      );
      return;
    }
    this.pending.delete(`${message.taskId}:${message.chunkIndex}`);
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
