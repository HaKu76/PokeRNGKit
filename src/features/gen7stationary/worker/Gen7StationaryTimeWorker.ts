import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen7StationaryTimeResults,
  GEN7_STATIONARY_MAX_RESULTS,
  GEN7_STATIONARY_TIME_RESULT_WORDS,
  GEN7_TIMEFINDER_API_VERSION,
  gen7StationaryTimeTaskCount,
  validateGen7StationaryResult,
  validateGen7StationaryTimeRequest,
  type Gen7StationaryTimeRequest,
} from "../domain";
import type {
  Gen7StationaryTimeEngine,
  Gen7StationaryTimeProgress,
  Gen7StationaryTimeSearchOptions,
  Gen7StationaryTimeSummary,
} from "../search";
import type {
  Gen7StationaryTimeWorkerBatch,
  Gen7StationaryTimeWorkerRequest,
  Gen7StationaryTimeWorkerResponse,
} from "./timeMessages";

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

interface ActiveSearch {
  taskId: string;
  request: Gen7StationaryTimeRequest;
  options: Gen7StationaryTimeSearchOptions;
  startedAt: number;
  nextBatchIndex: number;
  processedStates: number;
  resultCount: number;
  totalStates: number;
  resultLimitReached: boolean;
  resolve(summary: Gen7StationaryTimeSummary): void;
  reject(error: Error): void;
  abort?(): void;
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen7timefinder.mjs`,
    globalThis.location.href,
  ).href;
}

function stationaryModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen7stationary.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen7StationaryTimeWorker implements Gen7StationaryTimeEngine {
  private slot?: WorkerSlot;
  private active?: ActiveSearch;

  async search(
    request: Gen7StationaryTimeRequest,
    options: Gen7StationaryTimeSearchOptions = {},
  ): Promise<Gen7StationaryTimeSummary> {
    if (this.active)
      throw new Error("A Gen 7 Time Finder search is already running.");
    validateGen7StationaryTimeRequest(request);
    const stepSize = options.stepSize ?? 2_048;
    if (!Number.isInteger(stepSize) || stepSize < 1 || stepSize > 65_536)
      throw new RangeError("Step size must be between 1 and 65536.");
    const resultLimit = Math.max(
      1,
      Math.min(
        request.resultLimit,
        options.maxResults === undefined
          ? GEN7_STATIONARY_MAX_RESULTS
          : Math.max(1, Math.floor(options.maxResults)),
      ),
    );
    const workerRequest =
      resultLimit === request.resultLimit
        ? request
        : { ...request, resultLimit };
    const totalStates = gen7StationaryTimeTaskCount(workerRequest);
    if (options.signal?.aborted) {
      return {
        processedStates: 0,
        totalStates,
        resultCount: 0,
        percent: 0,
        elapsedMs: 0,
        workerCount: 1,
        cancelled: true,
        resultLimitReached: false,
      };
    }
    this.ensureWorker();
    const completion = new Promise<Gen7StationaryTimeSummary>(
      (resolve, reject) => {
        const active: ActiveSearch = {
          taskId: crypto.randomUUID(),
          request: workerRequest,
          options,
          startedAt: performance.now(),
          nextBatchIndex: 0,
          processedStates: 0,
          resultCount: 0,
          totalStates,
          resultLimitReached: false,
          resolve,
          reject,
        };
        const abort = () => this.cancel();
        active.abort = abort;
        options.signal?.addEventListener("abort", abort, { once: true });
        this.active = active;
      },
    );
    try {
      await this.slot!.ready;
      if (!this.active) return completion;
      const active = this.active as ActiveSearch;
      const message: Gen7StationaryTimeWorkerRequest = {
        type: "task",
        moduleId: "gen7timefinder",
        apiVersion: GEN7_TIMEFINDER_API_VERSION,
        taskId: active.taskId,
        operation: "time-search",
        request: workerRequest,
        stepSize,
      };
      this.slot!.worker.postMessage(message);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return completion;
  }

  cancel() {
    if (!this.active) return;
    const active = this.active;
    const summary: Gen7StationaryTimeSummary = {
      processedStates: active.processedStates,
      totalStates: active.totalStates,
      resultCount: active.resultCount,
      percent:
        active.totalStates === 0
          ? 100
          : (active.processedStates / active.totalStates) * 100,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled: true,
      resultLimitReached: active.resultLimitReached,
    };
    this.clearActive();
    this.resetWorker();
    active.resolve(summary);
  }

  dispose() {
    if (this.active) {
      const active = this.active;
      this.clearActive();
      active.reject(new Error("Gen 7 Time Finder Worker was disposed."));
    }
    this.resetWorker();
  }

  private ensureWorker() {
    if (this.slot) return;
    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    const worker = new Worker(
      new URL("./gen7timefinder.worker.ts", import.meta.url),
      {
        type: "module",
        name: "pokerngkit-gen7timefinder-1",
      },
    );
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({
      data,
    }: MessageEvent<Gen7StationaryTimeWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen 7 Time Finder Worker crashed."),
      );
    const init: Gen7StationaryTimeWorkerRequest = {
      type: "init",
      moduleId: "gen7timefinder",
      moduleUrl: moduleUrl(),
      stationaryModuleUrl: stationaryModuleUrl(),
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN7_TIMEFINDER_API_VERSION,
    };
    worker.postMessage(init);
    this.slot = slot;
  }

  private handle(slot: WorkerSlot, message: Gen7StationaryTimeWorkerResponse) {
    if (
      message.moduleId !== "gen7timefinder" ||
      message.apiVersion !== GEN7_TIMEFINDER_API_VERSION
    ) {
      this.fail(new Error("Gen 7 Time Finder Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("time-search")
      ) {
        this.fail(new Error("Gen 7 Time Finder Worker capability mismatch."));
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "error") {
      this.fail(new Error(message.message));
      return;
    }
    this.handleBatch(message);
  }

  private handleBatch(message: Gen7StationaryTimeWorkerBatch) {
    const active = this.active;
    if (
      !active ||
      message.taskId !== active.taskId ||
      message.operation !== "time-search" ||
      message.batchIndex !== active.nextBatchIndex++ ||
      message.buffer.byteLength !==
        message.resultCount *
          GEN7_STATIONARY_TIME_RESULT_WORDS *
          Uint32Array.BYTES_PER_ELEMENT ||
      message.totalProcessed < active.processedStates ||
      message.totalProcessed > active.totalStates ||
      message.totalResultCount < active.resultCount ||
      message.totalResultCount > active.request.resultLimit
    ) {
      this.fail(
        new Error("Gen 7 Time Finder Worker returned an invalid batch."),
      );
      return;
    }
    const decoded = decodeGen7StationaryTimeResults(message.buffer).map(
      (result) => {
        validateGen7StationaryResult(
          { ...active.request, seed: result.initialSeed },
          result,
        );
        return result;
      },
    );
    active.processedStates = message.totalProcessed;
    active.resultCount = message.totalResultCount;
    active.resultLimitReached ||= message.limitReached;
    if (decoded.length !== 0) active.options.onBatch?.(decoded);
    const progress: Gen7StationaryTimeProgress = {
      processedStates: active.processedStates,
      totalStates: active.totalStates,
      resultCount: active.resultCount,
      percent:
        active.totalStates === 0
          ? 100
          : (active.processedStates / active.totalStates) * 100,
    };
    active.options.onProgress?.(progress);
    if (!message.done) return;
    this.clearActive();
    active.resolve({
      ...progress,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled: false,
      resultLimitReached: active.resultLimitReached,
    });
  }

  private clearActive() {
    if (!this.active) return;
    if (this.active.abort)
      this.active.options.signal?.removeEventListener(
        "abort",
        this.active.abort,
      );
    this.active = undefined;
  }

  private fail(error: Error) {
    this.slot?.rejectReady(error);
    if (this.active) {
      const active = this.active;
      this.clearActive();
      active.reject(error);
    }
    this.resetWorker();
  }

  private resetWorker() {
    this.slot?.rejectReady(
      new Error("Gen 7 Time Finder Worker initialization was cancelled."),
    );
    this.slot?.worker.terminate();
    this.slot = undefined;
  }
}
