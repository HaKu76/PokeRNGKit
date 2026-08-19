import {
  decodeGen7IdTimeResults,
  validateGen7IdTimeRequest,
  validateGen7IdTimeResult,
  GEN7_ID_TIME_API_VERSION,
  GEN7_ID_TIME_RESULT_WORDS,
  type Gen7IdTimeRequest,
  type Gen7IdTimeResult,
} from "../timeDomain";
import type {
  Gen7IdTimeSearchEngine,
  Gen7IdTimeProgress,
  Gen7IdTimeSearchOptions,
  Gen7IdTimeSummary,
} from "../timeSearch";
import type { Gen7IdTimeWorkerResponse } from "./timeMessages";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";

export class Gen7IdTimeWorker implements Gen7IdTimeSearchEngine {
  private worker?: Worker;
  private taskId?: string;
  private startedAt = 0;
  private resolve?: (summary: Gen7IdTimeSummary) => void;
  private reject?: (reason?: unknown) => void;
  private onBatch?: (results: Gen7IdTimeResult[]) => void;
  private onProgress?: (progress: Gen7IdTimeProgress) => void;
  private request?: Gen7IdTimeRequest;
  private processedStates = 0;
  private resultCount = 0;
  private resultLimitReached = false;
  private nextBatchIndex = 0;

  search(
    request: Gen7IdTimeRequest,
    options: Gen7IdTimeSearchOptions = {},
  ): Promise<Gen7IdTimeSummary> {
    validateGen7IdTimeRequest(request);
    this.dispose();
    const taskId = crypto.randomUUID();
    const worker = new Worker(
      new URL("./gen7idtimefinder.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen7idtimefinder" },
    );
    this.worker = worker;
    this.taskId = taskId;
    this.request = request;
    this.startedAt = performance.now();
    this.onBatch = options.onBatch;
    this.onProgress = options.onProgress;
    this.processedStates = 0;
    this.resultCount = 0;
    this.resultLimitReached = false;
    this.nextBatchIndex = 0;
    const totalStates = this.totalStates(request);
    const cancel = () => this.cancel();
    options.signal?.addEventListener("abort", cancel, { once: true });
    return new Promise<Gen7IdTimeSummary>((resolve, reject) => {
      this.resolve = (summary) => {
        options.signal?.removeEventListener("abort", cancel);
        resolve(summary);
      };
      this.reject = (reason) => {
        options.signal?.removeEventListener("abort", cancel);
        reject(reason);
      };
      worker.onmessage = ({ data }: MessageEvent<Gen7IdTimeWorkerResponse>) => {
        if (
          data.moduleId !== "gen7idtimefinder" ||
          data.apiVersion !== GEN7_ID_TIME_API_VERSION
        ) {
          this.fail(
            new Error("Gen 7 ID Time Finder Worker response mismatch."),
          );
          return;
        }
        if (data.type === "error") {
          this.fail(new Error(data.message));
          return;
        }
        if (data.type === "ready") {
          if (
            data.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
            !data.operations.includes("id-time-search")
          ) {
            this.fail(
              new Error("Gen 7 ID Time Finder Worker capability mismatch."),
            );
            return;
          }
          worker.postMessage({
            type: "task",
            moduleId: "gen7idtimefinder",
            apiVersion: GEN7_ID_TIME_API_VERSION,
            taskId,
            operation: "id-time-search",
            request,
          });
          return;
        }
        this.handleBatch(data, totalStates);
      };
      worker.onerror = (event) =>
        this.fail(
          new Error(event.message || "Gen 7 ID Time Finder Worker crashed."),
        );
      worker.postMessage({
        type: "init",
        moduleId: "gen7idtimefinder",
        apiVersion: GEN7_ID_TIME_API_VERSION,
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        initialSeedModuleUrl: new URL(
          `${import.meta.env.BASE_URL}wasm/gen7timefinder.mjs`,
          location.href,
        ).href,
        idModuleUrl: new URL(
          `${import.meta.env.BASE_URL}wasm/gen7id.mjs`,
          location.href,
        ).href,
      });
    });
  }

  cancel() {
    if (!this.taskId) return;
    const summary = this.summary(true);
    this.worker?.terminate();
    this.worker = undefined;
    this.taskId = undefined;
    this.resolve?.(summary);
    this.resolve = undefined;
    this.reject = undefined;
  }

  dispose() {
    this.worker?.terminate();
    this.worker = undefined;
    this.taskId = undefined;
    this.resolve = undefined;
    this.reject = undefined;
    this.onBatch = undefined;
    this.onProgress = undefined;
    this.request = undefined;
  }

  private totalStates(request: Gen7IdTimeRequest) {
    return Number(
      ((request.endEpoch - request.startEpoch) / 1000n + 1n) *
        BigInt(request.maxFrame - request.minFrame + 1),
    );
  }

  private handleBatch(
    message: Extract<Gen7IdTimeWorkerResponse, { type: "batch" }>,
    totalStates: number,
  ) {
    const request = this.request;
    if (
      !request ||
      !this.taskId ||
      message.taskId !== this.taskId ||
      message.operation !== "id-time-search" ||
      message.batchIndex !== this.nextBatchIndex++ ||
      message.buffer.byteLength !==
        message.resultCount *
          GEN7_ID_TIME_RESULT_WORDS *
          Uint32Array.BYTES_PER_ELEMENT ||
      message.totalProcessed < this.processedStates ||
      message.totalProcessed > totalStates ||
      message.totalResultCount < this.resultCount ||
      message.totalResultCount > request.resultLimit
    ) {
      this.fail(
        new Error("Gen 7 ID Time Finder Worker returned an invalid batch."),
      );
      return;
    }
    const decoded = decodeGen7IdTimeResults(message.buffer).map((result) =>
      validateGen7IdTimeResult(request, result),
    );
    this.processedStates = message.totalProcessed;
    this.resultCount = message.totalResultCount;
    this.resultLimitReached ||= message.limitReached;
    if (decoded.length) this.onBatch?.(decoded);
    const progress = {
      processedStates: this.processedStates,
      totalStates,
      resultCount: this.resultCount,
      percent: totalStates
        ? Math.min(100, (this.processedStates / totalStates) * 100)
        : 100,
    };
    this.onProgress?.(progress);
    if (!message.done) return;
    const summary: Gen7IdTimeSummary = {
      ...progress,
      percent: 100,
      elapsedMs: performance.now() - this.startedAt,
      workerCount: 1,
      cancelled: false,
      resultLimitReached: this.resultLimitReached,
    };
    this.taskId = undefined;
    this.worker?.terminate();
    this.worker = undefined;
    this.resolve?.(summary);
    this.resolve = undefined;
    this.reject = undefined;
  }

  private summary(cancelled: boolean): Gen7IdTimeSummary {
    const totalStates = this.request ? this.totalStates(this.request) : 0;
    return {
      processedStates: this.processedStates,
      totalStates,
      resultCount: this.resultCount,
      percent: totalStates
        ? Math.min(100, (this.processedStates / totalStates) * 100)
        : 0,
      elapsedMs: performance.now() - this.startedAt,
      workerCount: 1,
      cancelled,
      resultLimitReached: this.resultLimitReached,
    };
  }

  private fail(error: Error) {
    this.worker?.terminate();
    this.worker = undefined;
    this.taskId = undefined;
    this.reject?.(error);
    this.resolve = undefined;
    this.reject = undefined;
  }
}
