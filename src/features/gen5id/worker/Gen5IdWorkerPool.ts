import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  gen5IdCandidateCount,
  splitGen5IdRequest,
  validateGen5IdRequest,
  validateGen5IdResult,
  type Gen5IdRequest,
  type Gen5IdResult,
} from "../domain";
import type { Gen5IdEngine, Gen5IdOptions, Gen5IdSummary } from "../search";
import type { Gen5IdWorkerRequest, Gen5IdWorkerResponse } from "./messages";

const GEN5_ID_API_VERSION = 1;
const RESULT_WORDS = 9;
type Batch = Extract<Gen5IdWorkerResponse, { type: "batch" }>;

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen5id.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(4, hardware - 1 || 1));
}

function decode(buffer: ArrayBuffer, request: Gen5IdRequest): Gen5IdResult[] {
  const words = new Uint32Array(buffer);
  if (words.length % RESULT_WORDS !== 0)
    throw new Error("Gen 5 ID Worker returned a misaligned result buffer.");
  const results: Gen5IdResult[] = [];
  for (let index = 0; index < words.length; index += RESULT_WORDS) {
    const seed = (BigInt(words[index + 1]) << 32n) | BigInt(words[index]);
    const date = words[index + 2];
    const seconds = words[index + 3];
    const year = date & 0xffff;
    const month = (date >>> 16) & 0xff;
    const day = date >>> 24;
    const hour = Math.floor(seconds / 3600);
    const minute = Math.floor((seconds % 3600) / 60);
    const second = seconds % 60;
    const part = (value: number) => String(value).padStart(2, "0");
    results.push(
      validateGen5IdResult(request, {
        seed: seed.toString(16).toUpperCase().padStart(16, "0"),
        dateTime: `${year}-${part(month)}-${part(day)} ${part(hour)}:${part(minute)}:${part(second)}`,
        timer0: words[index + 4] & 0xffff,
        buttonMask: words[index + 4] >>> 16,
        initialAdvances: words[index + 5],
        advances: words[index + 6],
        tid: words[index + 7] & 0xffff,
        sid: words[index + 7] >>> 16,
        tsv: words[index + 8],
      }),
    );
  }
  return results;
}

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

export class Gen5IdWorkerPool implements Gen5IdEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    {
      operation: "generator" | "searcher";
      resolve(batch: Batch): void;
      reject(error: Error): void;
    }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Gen5IdRequest,
    options: Gen5IdOptions = {},
  ): Promise<Gen5IdSummary> {
    if (this.searching || this.pending.size !== 0)
      throw new Error("A Gen 5 ID search is already running.");
    validateGen5IdRequest(request);
    const startedAt = performance.now();
    const totalSeeds = gen5IdCandidateCount(request);
    const requestedWorkers = Math.max(
      1,
      Math.min(8, Math.floor(options.workerCount ?? defaultWorkerCount())),
    );
    const chunks = splitGen5IdRequest(request, requestedWorkers);
    const activeWorkerCount = Math.min(requestedWorkers, chunks.length || 1);
    if (options.signal?.aborted || chunks.length === 0) {
      return {
        processedSeeds: 0,
        totalSeeds,
        resultCount: 0,
        percent: totalSeeds === 0 ? 100 : 0,
        elapsedMs: 0,
        workerCount: chunks.length === 0 ? 0 : activeWorkerCount,
        cancelled: options.signal?.aborted ?? false,
        resultLimitReached: false,
      };
    }

    this.searching = true;
    this.cancelled = false;
    const cancel = () => this.cancel();
    options.signal?.addEventListener("abort", cancel, { once: true });
    let processedSeeds = 0;
    let receivedResults = 0;
    let nextChunk = 0;
    let stoppedEarly = false;
    const batches: Batch[] = [];
    try {
      this.ensureWorkers(activeWorkerCount);
      await Promise.all(this.workers.map((slot) => slot.ready));
      const taskId = crypto.randomUUID();
      await Promise.all(
        this.workers.map(async (slot) => {
          while (
            !this.cancelled &&
            !stoppedEarly &&
            nextChunk < chunks.length
          ) {
            const chunk = chunks[nextChunk];
            nextChunk += 1;
            const batch = await new Promise<Batch>((resolve, reject) => {
              const key = `${taskId}:${chunk.index}`;
              const operation =
                request.mode === "search" ? "searcher" : "generator";
              this.pending.set(key, { operation, resolve, reject });
              const message: Gen5IdWorkerRequest = {
                type: "task",
                moduleId: "gen5id",
                apiVersion: GEN5_ID_API_VERSION,
                taskId,
                operation,
                chunkIndex: chunk.index,
                request,
                chunk,
              };
              slot.worker.postMessage(message);
            });
            batches.push(batch);
            processedSeeds += batch.processedCount;
            receivedResults += batch.resultCount;
            if (
              batch.limitReached ||
              (receivedResults >= request.resultLimit &&
                nextChunk < chunks.length)
            ) {
              stoppedEarly = true;
            }
            options.onProgress?.({
              processedSeeds,
              totalSeeds,
              resultCount: Math.min(receivedResults, request.resultLimit),
              percent:
                totalSeeds === 0 ? 100 : (processedSeeds / totalSeeds) * 100,
            });
          }
        }),
      );
      batches.sort((left, right) => left.chunkIndex - right.chunkIndex);
      const allResults = batches.flatMap((batch) => {
        if (
          batch.buffer.byteLength !==
          batch.resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT
        ) {
          throw new Error("Gen 5 ID Worker batch length mismatch.");
        }
        return decode(batch.buffer, request);
      });
      const accepted = allResults.slice(0, request.resultLimit);
      if (accepted.length !== 0) options.onBatch?.(accepted);
      const resultLimitReached =
        stoppedEarly ||
        batches.some((batch) => batch.limitReached) ||
        allResults.length > request.resultLimit;
      return {
        processedSeeds,
        totalSeeds,
        resultCount: accepted.length,
        percent: totalSeeds === 0 ? 100 : (processedSeeds / totalSeeds) * 100,
        elapsedMs: performance.now() - startedAt,
        workerCount: activeWorkerCount,
        cancelled: false,
        resultLimitReached,
      };
    } catch (error) {
      if (this.cancelled) {
        return {
          processedSeeds,
          totalSeeds,
          resultCount: 0,
          percent: totalSeeds === 0 ? 100 : (processedSeeds / totalSeeds) * 100,
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
    this.reset(new Error("Gen 5 ID search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen 5 ID Worker pool was disposed."));
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 5 ID Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen5id.worker.ts", import.meta.url),
        {
          type: "module",
          name: `pokerngkit-gen5id-${index + 1}`,
        },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({ data }: MessageEvent<Gen5IdWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(new Error(event.message || "Gen 5 ID Worker crashed."));
      const init: Gen5IdWorkerRequest = {
        type: "init",
        moduleId: "gen5id",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN5_ID_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen5IdWorkerResponse) {
    if (
      message.moduleId !== "gen5id" ||
      message.apiVersion !== GEN5_ID_API_VERSION
    ) {
      this.reset(new Error("Gen 5 ID Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator") ||
        !message.operations.includes("searcher")
      ) {
        this.reset(new Error("Gen 5 ID Worker capability mismatch."));
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
      this.reset(new Error("Gen 5 ID Worker returned an invalid batch."));
      return;
    }
    const key = `${message.taskId}:${message.chunkIndex}`;
    const pending = this.pending.get(key);
    if (!pending) {
      this.reset(new Error("Gen 5 ID Worker returned an unknown batch."));
      return;
    }
    if (message.operation !== pending.operation) {
      this.reset(new Error("Gen 5 ID Worker returned the wrong operation."));
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
