import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen5EventResults,
  GEN5_EVENT_API_VERSION,
  GEN5_EVENT_RESULT_WORDS,
  gen5EventTaskCount,
  splitGen5EventRequest,
  validateGen5EventRequest,
  validateGen5EventResult,
  type Gen5EventRequest,
  type Gen5EventResult,
} from "../domain";
import type {
  Gen5EventEngine,
  Gen5EventSearchOptions,
  Gen5EventSummary,
} from "../search";
import type {
  Gen5EventWorkerBatch,
  Gen5EventWorkerRequest,
  Gen5EventWorkerResponse,
} from "./messages";

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen5event.mjs`,
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

export class Gen5EventWorkerPool implements Gen5EventEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    {
      operation: "generator" | "searcher";
      resolve(batch: Gen5EventWorkerBatch): void;
      reject(error: Error): void;
    }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Gen5EventRequest,
    options: Gen5EventSearchOptions = {},
  ): Promise<Gen5EventSummary> {
    if (this.searching || this.pending.size !== 0)
      throw new Error("A Gen 5 Event search is already running.");
    validateGen5EventRequest(request);
    const startedAt = performance.now();
    const totalUnits = Number(gen5EventTaskCount(request));
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
    const chunks = splitGen5EventRequest(
      request,
      requestedWorkers,
      options.chunkSize,
    );
    const activeWorkerCount = Math.min(
      requestedWorkers,
      chunks.length || 1,
      resultLimit,
    );
    const workerRequest =
      resultLimit === request.resultLimit
        ? request
        : { ...request, resultLimit };
    if (options.signal?.aborted || chunks.length === 0)
      return {
        processedUnits: 0,
        totalUnits,
        resultCount: 0,
        percent: totalUnits === 0 ? 100 : 0,
        elapsedMs: 0,
        workerCount: chunks.length === 0 ? 0 : activeWorkerCount,
        cancelled: options.signal?.aborted ?? false,
        resultLimitReached: false,
      };

    this.searching = true;
    this.cancelled = false;
    const cancel = () => this.cancel();
    options.signal?.addEventListener("abort", cancel, { once: true });
    let processedUnits = 0;
    let receivedResults = 0;
    let nextChunk = 0;
    let stoppedEarly = false;
    const batches: Gen5EventWorkerBatch[] = [];
    try {
      this.ensureWorkers(activeWorkerCount);
      await Promise.all(this.workers.map((slot) => slot.ready));
      if (this.cancelled)
        return {
          processedUnits,
          totalUnits,
          resultCount: 0,
          percent: totalUnits === 0 ? 100 : (processedUnits / totalUnits) * 100,
          elapsedMs: performance.now() - startedAt,
          workerCount: activeWorkerCount,
          cancelled: true,
          resultLimitReached: false,
        };
      const taskId = crypto.randomUUID();
      await Promise.all(
        this.workers.map(async (slot) => {
          while (
            !this.cancelled &&
            !stoppedEarly &&
            nextChunk < chunks.length
          ) {
            const chunk = chunks[nextChunk++];
            const batch = await new Promise<Gen5EventWorkerBatch>(
              (resolve, reject) => {
                const key = `${taskId}:${chunk.index}`;
                this.pending.set(key, {
                  operation: request.mode,
                  resolve,
                  reject,
                });
                const message: Gen5EventWorkerRequest = {
                  type: "task",
                  moduleId: "gen5event",
                  apiVersion: GEN5_EVENT_API_VERSION,
                  taskId,
                  operation: request.mode,
                  chunkIndex: chunk.index,
                  request: workerRequest,
                  chunk,
                };
                slot.worker.postMessage(message);
              },
            );
            batches.push(batch);
            processedUnits += batch.processedCount;
            receivedResults += batch.resultCount;
            if (
              batch.limitReached ||
              (receivedResults >= resultLimit && nextChunk < chunks.length)
            )
              stoppedEarly = true;
            options.onProgress?.({
              processedUnits,
              totalUnits,
              resultCount: Math.min(receivedResults, resultLimit),
              percent:
                totalUnits === 0 ? 100 : (processedUnits / totalUnits) * 100,
            });
          }
        }),
      );
      batches.sort((left, right) => left.chunkIndex - right.chunkIndex);
      const accepted: Gen5EventResult[] = [];
      for (const batch of batches) {
        if (
          batch.buffer.byteLength !==
          batch.resultCount *
            GEN5_EVENT_RESULT_WORDS *
            Uint32Array.BYTES_PER_ELEMENT
        )
          throw new Error("Gen 5 Event Worker batch length mismatch.");
        const remaining = resultLimit - accepted.length;
        if (remaining <= 0) continue;
        accepted.push(
          ...decodeGen5EventResults(batch.buffer, remaining).map((result) =>
            validateGen5EventResult(request, result),
          ),
        );
      }
      if (accepted.length !== 0) options.onBatch?.(accepted);
      return {
        processedUnits,
        totalUnits,
        resultCount: accepted.length,
        percent: totalUnits === 0 ? 100 : (processedUnits / totalUnits) * 100,
        elapsedMs: performance.now() - startedAt,
        workerCount: activeWorkerCount,
        cancelled: false,
        resultLimitReached:
          stoppedEarly ||
          batches.some((batch) => batch.limitReached) ||
          receivedResults > resultLimit,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          processedUnits,
          totalUnits,
          resultCount: 0,
          percent: totalUnits === 0 ? 100 : (processedUnits / totalUnits) * 100,
          elapsedMs: performance.now() - startedAt,
          workerCount: activeWorkerCount,
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
    this.reset(new Error("Gen 5 Event search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen 5 Event Worker pool was disposed."));
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 5 Event Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen5event.worker.ts", import.meta.url),
        {
          type: "module",
          name: `pokerngkit-gen5event-${index + 1}`,
        },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({ data }: MessageEvent<Gen5EventWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(new Error(event.message || "Gen 5 Event Worker crashed."));
      const init: Gen5EventWorkerRequest = {
        type: "init",
        moduleId: "gen5event",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN5_EVENT_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen5EventWorkerResponse) {
    if (
      message.moduleId !== "gen5event" ||
      message.apiVersion !== GEN5_EVENT_API_VERSION
    ) {
      this.reset(new Error("Gen 5 Event Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator") ||
        !message.operations.includes("searcher")
      ) {
        this.reset(new Error("Gen 5 Event Worker capability mismatch."));
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
      this.reset(new Error("Gen 5 Event Worker returned an invalid batch."));
      return;
    }
    const key = `${message.taskId}:${message.chunkIndex}`;
    const pending = this.pending.get(key);
    if (!pending) {
      this.reset(new Error("Gen 5 Event Worker returned an unknown batch."));
      return;
    }
    if (message.operation !== pending.operation) {
      this.reset(new Error("Gen 5 Event Worker returned the wrong operation."));
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
