import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen8RaidResults,
  GEN8_RAIDS_API_VERSION,
  GEN8_RAIDS_RESULT_WORDS,
  gen8RaidTaskCount,
  splitGen8RaidRequest,
  validateGen8RaidRequest,
  validateGen8RaidResult,
  type Gen8RaidRequest,
  type Gen8RaidResult,
} from "../domain";
import type {
  Gen8RaidEngine,
  Gen8RaidSearchOptions,
  Gen8RaidSummary,
} from "../search";
import type {
  Gen8RaidWorkerBatch,
  Gen8RaidWorkerRequest,
  Gen8RaidWorkerResponse,
} from "./messages";

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}
function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen8raids.mjs`,
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
export class Gen8RaidWorkerPool implements Gen8RaidEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    { resolve(batch: Gen8RaidWorkerBatch): void; reject(error: Error): void }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Gen8RaidRequest,
    options: Gen8RaidSearchOptions = {},
  ): Promise<Gen8RaidSummary> {
    if (this.searching || this.pending.size)
      throw new Error("A Gen 8 Raids search is already running.");
    validateGen8RaidRequest(request);
    const startedAt = performance.now();
    const totalStates = gen8RaidTaskCount(request);
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
    const chunks = splitGen8RaidRequest(
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
    const batches: Gen8RaidWorkerBatch[] = [];
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
            const batch = await new Promise<Gen8RaidWorkerBatch>(
              (resolve, reject) => {
                this.pending.set(`${taskId}:${chunk.index}`, {
                  resolve,
                  reject,
                });
                const message: Gen8RaidWorkerRequest = {
                  type: "task",
                  moduleId: "gen8raids",
                  apiVersion: GEN8_RAIDS_API_VERSION,
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
            )
              stoppedEarly = true;
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
      const accepted: Gen8RaidResult[] = [];
      for (const batch of batches) {
        if (
          batch.buffer.byteLength !==
          batch.resultCount *
            GEN8_RAIDS_RESULT_WORDS *
            Uint32Array.BYTES_PER_ELEMENT
        )
          throw new Error("Gen 8 Raids Worker batch length mismatch.");
        const remaining = resultLimit - accepted.length;
        if (remaining <= 0) continue;
        accepted.push(
          ...decodeGen8RaidResults(batch.buffer, remaining).map((result) =>
            validateGen8RaidResult(request, result),
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
    this.reset(new Error("Gen 8 Raids search was cancelled."));
  }
  dispose() {
    this.reset(new Error("Gen 8 Raids Worker pool was disposed."));
  }
  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 8 Raids Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen8raids.worker.ts", import.meta.url),
        { type: "module", name: `pokerngkit-gen8raids-${index + 1}` },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({ data }: MessageEvent<Gen8RaidWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(new Error(event.message || "Gen 8 Raids Worker crashed."));
      const init: Gen8RaidWorkerRequest = {
        type: "init",
        moduleId: "gen8raids",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN8_RAIDS_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }
  private handle(slot: WorkerSlot, message: Gen8RaidWorkerResponse) {
    if (
      message.moduleId !== "gen8raids" ||
      message.apiVersion !== GEN8_RAIDS_API_VERSION
    ) {
      this.reset(new Error("Gen 8 Raids Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      ) {
        this.reset(new Error("Gen 8 Raids Worker capability mismatch."));
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
      this.reset(new Error("Gen 8 Raids Worker returned an unknown batch."));
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
