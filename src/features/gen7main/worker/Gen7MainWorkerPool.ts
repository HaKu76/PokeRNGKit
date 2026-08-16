import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN7_MAIN_API_VERSION,
  GEN7_MAIN_SEED_SPACE,
  splitGen7MainSeedSearch,
  validateGen7MainQrRequest,
  validateGen7MainQrResult,
  validateGen7MainSeedRequest,
  validateGen7MainSeedResult,
  validateGen7MainTimeRequest,
  type Gen7MainQrRequest,
  type Gen7MainQrResult,
  type Gen7MainSeedRequest,
  type Gen7MainSeedResult,
  type Gen7MainTimeRequest,
} from "../domain";
import type {
  Gen7MainEngine,
  Gen7MainQrSummary,
  Gen7MainSearchOptions,
  Gen7MainSeedSummary,
  Gen7MainTimeSummary,
} from "../search";
import type {
  Gen7MainWorkerRequest,
  Gen7MainWorkerResponse,
  Gen7MainWorkerSeedBatch,
  Gen7MainWorkerTask,
} from "./messages";

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen7main.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(8, hardware - 1 || 1));
}

function finiteInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value))
    throw new TypeError(`${name} must be an integer.`);
  return value;
}

export class Gen7MainWorkerPool implements Gen7MainEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    {
      resolve(message: Gen7MainWorkerResponse): void;
      reject(error: Error): void;
    }
  >();
  private cancelled = false;
  private searching = false;

  async searchSeeds(
    request: Gen7MainSeedRequest,
    options: Gen7MainSearchOptions = {},
  ): Promise<Gen7MainSeedSummary> {
    if (this.searching)
      throw new Error("A Gen 7 Main RNG search is already running.");
    validateGen7MainSeedRequest(request);
    const chunks = splitGen7MainSeedSearch(options.chunkSize);
    const requestedWorkers = Math.max(
      1,
      Math.min(
        8,
        finiteInteger(
          options.workerCount ?? defaultWorkerCount(),
          "Worker count",
        ),
      ),
    );
    const workerCount = Math.min(requestedWorkers, chunks.length);
    const startedAt = performance.now();
    if (options.signal?.aborted)
      return this.cancelledSeedSummary(0, workerCount);

    this.searching = true;
    this.cancelled = false;
    const abort = () => this.cancel();
    options.signal?.addEventListener("abort", abort, { once: true });
    let processedSeeds = 0;
    let resultCount = 0;
    let nextChunk = 0;
    let nextChunkToEmit = 0;
    const completedBatches = new Map<number, Gen7MainSeedResult[]>();
    const taskId = crypto.randomUUID();
    try {
      this.ensureWorkers(workerCount);
      await Promise.all(this.workers.map((slot) => slot.ready));
      await Promise.all(
        this.workers.map(async (slot) => {
          while (!this.cancelled && nextChunk < chunks.length) {
            const chunk = chunks[nextChunk++];
            const key = `${taskId}:${chunk.index}`;
            const batchPromise = this.waitFor<Gen7MainWorkerSeedBatch>(key);
            const message: Gen7MainWorkerTask = {
              type: "task",
              moduleId: "gen7main",
              apiVersion: GEN7_MAIN_API_VERSION,
              taskId,
              operation: "seed-search",
              request,
              chunkIndex: chunk.index,
              chunk,
            };
            slot.worker.postMessage(message);
            const batch = await batchPromise;
            const decoded = this.decodeSeedBatch(batch);
            processedSeeds += batch.processedSeeds;
            resultCount += decoded.length;
            completedBatches.set(batch.chunkIndex, decoded);
            while (completedBatches.has(nextChunkToEmit)) {
              const orderedBatch = completedBatches.get(nextChunkToEmit)!;
              completedBatches.delete(nextChunkToEmit++);
              if (orderedBatch.length > 0) options.onBatch?.(orderedBatch);
            }
            options.onProgress?.({
              processedSeeds,
              totalSeeds: GEN7_MAIN_SEED_SPACE,
              resultCount,
              percent: (processedSeeds / GEN7_MAIN_SEED_SPACE) * 100,
            });
          }
        }),
      );
      return {
        processedSeeds,
        totalSeeds: GEN7_MAIN_SEED_SPACE,
        resultCount,
        percent: (processedSeeds / GEN7_MAIN_SEED_SPACE) * 100,
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled: false,
      };
    } catch (error) {
      if (this.cancelled)
        return this.cancelledSeedSummary(
          processedSeeds,
          workerCount,
          performance.now() - startedAt,
          resultCount,
        );
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", abort);
      this.searching = false;
      this.pending.clear();
    }
  }

  async searchQr(
    request: Gen7MainQrRequest,
    signal?: AbortSignal,
  ): Promise<Gen7MainQrSummary> {
    if (this.searching)
      throw new Error("A Gen 7 Main RNG search is already running.");
    validateGen7MainQrRequest(request);
    if (signal?.aborted) return { results: [], elapsedMs: 0, cancelled: true };
    this.searching = true;
    this.cancelled = false;
    const startedAt = performance.now();
    const abort = () => this.cancel();
    signal?.addEventListener("abort", abort, { once: true });
    const taskId = crypto.randomUUID();
    try {
      this.ensureWorkers(1);
      await this.workers[0].ready;
      const key = `${taskId}:qr`;
      const responsePromise =
        this.waitFor<Extract<Gen7MainWorkerResponse, { type: "qr-result" }>>(
          key,
        );
      this.workers[0].worker.postMessage({
        type: "task",
        moduleId: "gen7main",
        apiVersion: GEN7_MAIN_API_VERSION,
        taskId,
        operation: "qr-search",
        request,
      } satisfies Gen7MainWorkerTask);
      const response = await responsePromise;
      if (this.cancelled)
        return {
          results: [],
          elapsedMs: performance.now() - startedAt,
          cancelled: true,
        };
      const results = this.decodeQrResults(
        response.buffer,
        response.resultCount,
      );
      return {
        results,
        elapsedMs: performance.now() - startedAt,
        cancelled: false,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          results: [],
          elapsedMs: performance.now() - startedAt,
          cancelled: true,
        };
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      this.searching = false;
      this.pending.clear();
    }
  }

  async calculateTime(
    request: Gen7MainTimeRequest,
    signal?: AbortSignal,
  ): Promise<Gen7MainTimeSummary> {
    if (this.searching)
      throw new Error("A Gen 7 Main RNG calculation is already running.");
    validateGen7MainTimeRequest(request);
    if (signal?.aborted)
      return {
        result: { primaryFrames: 0, secondaryFrames: 0 },
        elapsedMs: 0,
        cancelled: true,
      };
    this.searching = true;
    this.cancelled = false;
    const startedAt = performance.now();
    const abort = () => this.cancel();
    signal?.addEventListener("abort", abort, { once: true });
    const taskId = crypto.randomUUID();
    try {
      this.ensureWorkers(1);
      await this.workers[0].ready;
      const key = `${taskId}:time`;
      const responsePromise =
        this.waitFor<Extract<Gen7MainWorkerResponse, { type: "time-result" }>>(
          key,
        );
      this.workers[0].worker.postMessage({
        type: "task",
        moduleId: "gen7main",
        apiVersion: GEN7_MAIN_API_VERSION,
        taskId,
        operation: "time-calculator",
        request,
      } satisfies Gen7MainWorkerTask);
      const response = await responsePromise;
      return {
        result: {
          primaryFrames: response.primaryFrames,
          secondaryFrames: response.secondaryFrames,
        },
        elapsedMs: performance.now() - startedAt,
        cancelled: this.cancelled,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          result: { primaryFrames: 0, secondaryFrames: 0 },
          elapsedMs: performance.now() - startedAt,
          cancelled: true,
        };
      throw error;
    } finally {
      signal?.removeEventListener("abort", abort);
      this.searching = false;
      this.pending.clear();
    }
  }

  cancel() {
    this.cancelled = true;
    this.reset(new Error("Gen 7 Main RNG Worker task was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen 7 Main RNG Worker pool was disposed."));
  }

  private cancelledSeedSummary(
    processedSeeds: number,
    workerCount: number,
    elapsedMs = 0,
    resultCount = 0,
  ) {
    return {
      processedSeeds,
      totalSeeds: GEN7_MAIN_SEED_SPACE,
      resultCount,
      percent: (processedSeeds / GEN7_MAIN_SEED_SPACE) * 100,
      elapsedMs,
      workerCount,
      cancelled: true,
    } satisfies Gen7MainSeedSummary;
  }

  private waitFor<T extends Gen7MainWorkerResponse>(key: string) {
    return new Promise<T>((resolve, reject) => {
      this.pending.set(key, {
        resolve: (message) => resolve(message as T),
        reject,
      });
    });
  }

  private decodeSeedBatch(batch: Gen7MainWorkerSeedBatch) {
    if (batch.buffer.byteLength % 8 !== 0)
      throw new Error("Gen 7 Main Seed batch length mismatch.");
    const words = new Uint32Array(batch.buffer);
    const results: Gen7MainSeedResult[] = [];
    for (let index = 0; index < words.length; index += 2) {
      results.push(
        validateGen7MainSeedResult({
          seed: words[index],
          correction: words[index + 1],
        }),
      );
    }
    return results;
  }

  private decodeQrResults(buffer: ArrayBuffer, resultCount: number) {
    if (buffer.byteLength !== resultCount * 8)
      throw new Error("Gen 7 Main QR batch length mismatch.");
    const words = new Uint32Array(buffer);
    const results: Gen7MainQrResult[] = [];
    for (let index = 0; index < words.length; index += 2)
      results.push(
        validateGen7MainQrResult({
          lastClockFrame: words[index],
          afterQrFrame: words[index + 1],
        }),
      );
    return results;
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 7 Main RNG Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen7main.worker.ts", import.meta.url),
        {
          type: "module",
          name: `pokerngkit-gen7main-${index + 1}`,
        },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({ data }: MessageEvent<Gen7MainWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(
          new Error(event.message || "Gen 7 Main RNG Worker crashed."),
        );
      worker.postMessage({
        type: "init",
        moduleId: "gen7main",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN7_MAIN_API_VERSION,
      } satisfies Gen7MainWorkerRequest);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen7MainWorkerResponse) {
    if (
      message.moduleId !== "gen7main" ||
      message.apiVersion !== GEN7_MAIN_API_VERSION
    ) {
      this.reset(new Error("Gen 7 Main RNG Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("seed-search") ||
        !message.operations.includes("qr-search") ||
        !message.operations.includes("time-calculator")
      ) {
        this.reset(new Error("Gen 7 Main RNG Worker capability mismatch."));
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "error") {
      this.reset(new Error(message.message));
      return;
    }
    const key =
      message.type === "seed-batch"
        ? `${message.taskId}:${message.chunkIndex}`
        : message.type === "qr-result"
          ? `${message.taskId}:qr`
          : `${message.taskId}:time`;
    const pending = this.pending.get(key);
    if (!pending) {
      this.reset(
        new Error("Gen 7 Main RNG Worker returned an unknown result."),
      );
      return;
    }
    this.pending.delete(key);
    pending.resolve(message);
  }

  private reset(error: Error) {
    this.workers.forEach((slot) => slot.rejectReady(error));
    this.pending.forEach((entry) => entry.reject(error));
    this.pending.clear();
    this.workers.forEach((slot) => slot.worker.terminate());
    this.workers = [];
  }
}
