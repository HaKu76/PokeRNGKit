import {
  decodeResults,
  validateGen7WildTimeRequest,
  type Gen7WildTimeRequest,
  type Gen7WildTimeResult,
} from "../timeDomain";
import type {
  Gen7WildTimeEngine,
  Gen7WildTimeProgress,
  Gen7WildTimeSummary,
} from "../timeSearch";
import type { Gen7WildTimeWorkerResponse } from "./timeMessages";

export class Gen7WildTimeWorker implements Gen7WildTimeEngine {
  private worker?: Worker;
  private taskId?: string;
  private reject?: (reason?: unknown) => void;
  private resolve?: (summary: Gen7WildTimeSummary) => void;
  private started = 0;
  private progress?: (value: Gen7WildTimeProgress) => void;
  private batch?: (results: Gen7WildTimeResult[]) => void;
  search(
    request: Gen7WildTimeRequest,
    options: {
      signal?: AbortSignal;
      onBatch?(results: Gen7WildTimeResult[]): void;
      onProgress?(value: Gen7WildTimeProgress): void;
    } = {},
  ) {
    validateGen7WildTimeRequest(request);
    this.dispose();
    const worker = new Worker(
      new URL("./gen7wildtimefinder.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker = worker;
    this.started = performance.now();
    this.progress = options.onProgress;
    this.batch = options.onBatch;
    return new Promise<Gen7WildTimeSummary>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      const taskId = crypto.randomUUID();
      this.taskId = taskId;
      this.worker!.onmessage = ({
        data,
      }: MessageEvent<Gen7WildTimeWorkerResponse>) => {
        if (data.type === "error") {
          reject(new Error(data.message));
          return;
        }
        if (data.type === "ready") {
          worker.postMessage({ type: "task", taskId, request });
          return;
        }
        const results = decodeResults(data.buffer);
        this.batch?.(results);
        const totalStates = Number(
          ((request.endEpoch - request.startEpoch) / 1000n + 1n) *
            BigInt(request.maxFrame - request.minFrame + 1),
        );
        this.progress?.({
          processedStates: data.total,
          totalStates,
          resultCount: data.results,
          percent: totalStates
            ? Math.min(100, (data.total / totalStates) * 100)
            : 100,
        });
        if (data.done) {
          resolve({
            processedStates: data.total,
            totalStates,
            resultCount: data.results,
            percent: 100,
            elapsedMs: performance.now() - this.started,
            cancelled: false,
            resultLimitReached: data.limited,
          });
          this.dispose();
        }
      };
      const moduleUrl = new URL(
        `${import.meta.env.BASE_URL}wasm/gen7wildtimefinder.mjs`,
        location.href,
      ).href;
      const initialSeedUrl = new URL(
        `${import.meta.env.BASE_URL}wasm/gen7timefinder.mjs`,
        location.href,
      ).href;
      worker.postMessage({ type: "init", moduleUrl, initialSeedUrl });
      options.signal?.addEventListener("abort", () => this.cancel(), {
        once: true,
      });
    });
  }
  cancel() {
    if (this.taskId) {
      this.worker?.terminate();
      this.worker = undefined;
      this.resolve?.({
        processedStates: 0,
        totalStates: 0,
        resultCount: 0,
        percent: 0,
        elapsedMs: performance.now() - this.started,
        cancelled: true,
        resultLimitReached: false,
      });
      this.taskId = undefined;
    }
  }
  dispose() {
    this.worker?.terminate();
    this.worker = undefined;
    this.taskId = undefined;
    this.reject = undefined;
    this.resolve = undefined;
  }
}
