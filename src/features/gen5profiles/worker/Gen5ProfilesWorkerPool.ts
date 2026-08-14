import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  splitGen5CalibrationRequest,
  validateGen5CalibrationRequest,
  type Gen5CalibrationResult,
} from "../domain";
import type {
  Gen5CalibrationEngine,
  Gen5CalibrationOptions,
  Gen5CalibrationSummary,
} from "../search";
import type {
  Gen5ProfilesWorkerRequest,
  Gen5ProfilesWorkerResponse,
} from "./messages";

const GEN5_PROFILES_API_VERSION = 1;
const RESULT_WORDS = 4;
type Batch = Extract<Gen5ProfilesWorkerResponse, { type: "batch" }>;

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen5profiles.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(4, hardware - 1 || 1));
}

function decode(buffer: ArrayBuffer): Gen5CalibrationResult[] {
  const words = new Uint32Array(buffer);
  if (words.length % RESULT_WORDS !== 0)
    throw new Error(
      "Gen 5 profile Worker returned a misaligned result buffer.",
    );
  const decoded: Gen5CalibrationResult[] = [];
  for (let index = 0; index < words.length; index += RESULT_WORDS) {
    const seed = (BigInt(words[index + 1]) << 32n) | BigInt(words[index]);
    decoded.push({
      seed: seed.toString(16).toUpperCase().padStart(16, "0"),
      seconds: words[index + 2] & 0xff,
      vcount: (words[index + 2] >>> 8) & 0xff,
      timer0: words[index + 2] >>> 16,
      gxstat: words[index + 3] & 0xff,
      vframe: (words[index + 3] >>> 8) & 0xff,
    });
  }
  return decoded;
}

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

export class Gen5ProfilesWorkerPool implements Gen5CalibrationEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    { resolve(batch: Batch): void; reject(error: Error): void }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Parameters<Gen5CalibrationEngine["search"]>[0],
    options: Gen5CalibrationOptions = {},
  ): Promise<Gen5CalibrationSummary> {
    if (this.searching || this.pending.size !== 0)
      throw new Error("A Gen 5 profile calibration is already running.");
    validateGen5CalibrationRequest(request);
    const startedAt = performance.now();
    const totalStates =
      (request.maxSeconds - request.minSeconds + 1) *
      (request.maxVCount - request.minVCount + 1) *
      (request.maxTimer0 - request.minTimer0 + 1) *
      (request.maxGxStat - request.minGxStat + 1) *
      (request.maxVFrame - request.minVFrame + 1);
    const requestedWorkers = Math.max(
      1,
      Math.min(8, Math.floor(options.workerCount ?? defaultWorkerCount())),
    );
    const chunks = splitGen5CalibrationRequest(
      request,
      Math.min(8, requestedWorkers * 2),
    );
    const activeWorkerCount = Math.min(requestedWorkers, chunks.length);
    if (options.signal?.aborted)
      return {
        results: [],
        processedStates: 0,
        totalStates,
        elapsedMs: 0,
        workerCount: activeWorkerCount,
        cancelled: true,
        resultLimitReached: false,
      };

    this.searching = true;
    this.cancelled = false;
    const abort = () => this.cancel();
    options.signal?.addEventListener("abort", abort, { once: true });
    let processedStates = 0;
    let resultCount = 0;
    try {
      this.ensureWorkers(activeWorkerCount);
      await Promise.all(this.workers.map((slot) => slot.ready));
      const taskId = crypto.randomUUID();
      const batches: Batch[] = [];
      let nextChunk = 0;
      await Promise.all(
        this.workers.map(async (slot) => {
          while (!this.cancelled && nextChunk < chunks.length) {
            const chunk = chunks[nextChunk];
            nextChunk += 1;
            const batch = await new Promise<Batch>((resolve, reject) => {
              const key = `${taskId}:${chunk.index}`;
              this.pending.set(key, {
                resolve: (batch) => {
                  processedStates += batch.processedCount;
                  resultCount += batch.resultCount;
                  options.onProgress?.({
                    processedStates,
                    totalStates,
                    resultCount,
                    percent: (processedStates / totalStates) * 100,
                  });
                  resolve(batch);
                },
                reject,
              });
              const message: Gen5ProfilesWorkerRequest = {
                type: "task",
                moduleId: "gen5profiles",
                apiVersion: GEN5_PROFILES_API_VERSION,
                taskId,
                operation: "searcher",
                chunkIndex: chunk.index,
                request,
                chunk,
              };
              slot.worker.postMessage(message);
            });
            batches.push(batch);
          }
        }),
      );
      batches.sort((left, right) => left.chunkIndex - right.chunkIndex);
      const allResults = batches.flatMap((batch) => {
        if (
          batch.buffer.byteLength !==
          batch.resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT
        )
          throw new Error("Gen 5 profile Worker batch length mismatch.");
        return decode(batch.buffer);
      });
      const resultLimitReached =
        batches.some((batch) => batch.limitReached) ||
        allResults.length > request.resultLimit;
      return {
        results: allResults.slice(0, request.resultLimit),
        processedStates,
        totalStates,
        elapsedMs: performance.now() - startedAt,
        workerCount: activeWorkerCount,
        cancelled: false,
        resultLimitReached,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          results: [],
          processedStates,
          totalStates,
          elapsedMs: performance.now() - startedAt,
          workerCount: activeWorkerCount,
          cancelled: true,
          resultLimitReached: false,
        };
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", abort);
      this.pending.clear();
      this.searching = false;
    }
  }

  cancel() {
    this.cancelled = true;
    this.reset(new Error("Gen 5 profile calibration was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen 5 profile Worker pool was disposed."));
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 5 profile Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen5profiles.worker.ts", import.meta.url),
        { type: "module", name: `pokerngkit-gen5profiles-${index + 1}` },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({ data }: MessageEvent<Gen5ProfilesWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.fail(new Error(event.message || "Gen 5 profile Worker crashed."));
      const init: Gen5ProfilesWorkerRequest = {
        type: "init",
        moduleId: "gen5profiles",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN5_PROFILES_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen5ProfilesWorkerResponse) {
    if (
      message.moduleId !== "gen5profiles" ||
      message.apiVersion !== GEN5_PROFILES_API_VERSION
    ) {
      this.fail(new Error("Gen 5 profile Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("searcher")
      ) {
        this.fail(new Error("Gen 5 profile Worker capability mismatch."));
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "error") {
      this.fail(new Error(message.message));
      return;
    }
    if (
      !Number.isInteger(message.chunkIndex) ||
      message.chunkIndex < 0 ||
      message.operation !== "searcher"
    ) {
      this.fail(new Error("Gen 5 profile Worker returned an invalid batch."));
      return;
    }
    const key = `${message.taskId}:${message.chunkIndex}`;
    const pending = this.pending.get(key);
    if (!pending) {
      this.fail(new Error("Gen 5 profile Worker returned an unknown batch."));
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
