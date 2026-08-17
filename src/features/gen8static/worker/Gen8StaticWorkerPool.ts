import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen8StaticResults,
  GEN8_STATIC_API_VERSION,
  GEN8_STATIC_RESULT_WORDS,
  gen8StaticTaskCount,
  splitGen8StaticRequest,
  validateGen8StaticRequest,
  validateGen8StaticResult,
  type Gen8StaticRequest,
  type Gen8StaticResult,
} from "../domain";
import type {
  Gen8StaticEngine,
  Gen8StaticSearchOptions,
  Gen8StaticSummary,
} from "../search";
import type {
  Gen8StaticWorkerBatch,
  Gen8StaticWorkerRequest,
  Gen8StaticWorkerResponse,
} from "./messages";

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen8static.mjs`,
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

export class Gen8StaticWorkerPool implements Gen8StaticEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    { resolve(batch: Gen8StaticWorkerBatch): void; reject(error: Error): void }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Gen8StaticRequest,
    options: Gen8StaticSearchOptions = {},
  ): Promise<Gen8StaticSummary> {
    if (this.searching || this.pending.size)
      throw new Error("A Gen 8 Static search is already running.");
    validateGen8StaticRequest(request);
    const startedAt = performance.now();
    const totalStates = gen8StaticTaskCount(request);
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
    const chunks = splitGen8StaticRequest(
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
    const batches: Gen8StaticWorkerBatch[] = [];
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
            const batch = await new Promise<Gen8StaticWorkerBatch>(
              (resolve, reject) => {
                this.pending.set(`${taskId}:${chunk.index}`, {
                  resolve,
                  reject,
                });
                const message: Gen8StaticWorkerRequest = {
                  type: "task",
                  moduleId: "gen8static",
                  apiVersion: GEN8_STATIC_API_VERSION,
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
      batches.sort((left, right) => left.chunkIndex - right.chunkIndex);
      const accepted: Gen8StaticResult[] = [];
      for (const batch of batches) {
        if (
          batch.buffer.byteLength !==
          batch.resultCount *
            GEN8_STATIC_RESULT_WORDS *
            Uint32Array.BYTES_PER_ELEMENT
        ) {
          throw new Error("Gen 8 Static Worker batch length mismatch.");
        }
        const remaining = resultLimit - accepted.length;
        if (remaining <= 0) continue;
        accepted.push(
          ...decodeGen8StaticResults(batch.buffer, remaining).map((result) =>
            validateGen8StaticResult(request, result),
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
    this.reset(new Error("Gen 8 Static search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen 8 Static Worker pool was disposed."));
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 8 Static Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen8static.worker.ts", import.meta.url),
        { type: "module", name: `pokerngkit-gen8static-${index + 1}` },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({ data }: MessageEvent<Gen8StaticWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(new Error(event.message || "Gen 8 Static Worker crashed."));
      const init: Gen8StaticWorkerRequest = {
        type: "init",
        moduleId: "gen8static",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN8_STATIC_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen8StaticWorkerResponse) {
    if (
      message.moduleId !== "gen8static" ||
      message.apiVersion !== GEN8_STATIC_API_VERSION
    ) {
      this.reset(new Error("Gen 8 Static Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      ) {
        this.reset(new Error("Gen 8 Static Worker capability mismatch."));
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
      this.reset(new Error("Gen 8 Static Worker returned an unknown batch."));
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
