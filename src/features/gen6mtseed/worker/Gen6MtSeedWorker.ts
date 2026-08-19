import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6MtSeedResults,
  GEN6_MT_SEED_API_VERSION,
  GEN6_MT_SEED_RESULT_WORDS,
  gen6MtSeedTaskCount,
  validateGen6MtSeedRequest,
  type Gen6MtSeedRequest,
} from "../domain";
import type {
  Gen6MtSeedEngine,
  Gen6MtSeedSearchOptions,
  Gen6MtSeedSummary,
} from "../search";
import type {
  Gen6MtSeedWorkerRequest,
  Gen6MtSeedWorkerResponse,
} from "./messages";

export class Gen6MtSeedWorker implements Gen6MtSeedEngine {
  private worker?: Worker;
  private ready?: Promise<void>;
  private active?: {
    taskId: string;
    request: Gen6MtSeedRequest;
    options: Gen6MtSeedSearchOptions;
    startedAt: number;
    resolve: (summary: Gen6MtSeedSummary) => void;
    reject: (error: Error) => void;
    processed: number;
    results: number;
    abort: () => void;
  };

  async search(
    request: Gen6MtSeedRequest,
    options: Gen6MtSeedSearchOptions = {},
  ): Promise<Gen6MtSeedSummary> {
    validateGen6MtSeedRequest(request);
    if (this.active)
      throw new Error("A Gen VI MT Seed search is already running.");
    if (options.signal?.aborted)
      return {
        processedStates: 0,
        totalStates: gen6MtSeedTaskCount(request),
        resultCount: 0,
        percent: 0,
        elapsedMs: 0,
        workerCount: 1 as const,
        cancelled: true,
        resultLimitReached: false,
      };
    this.ensureWorker();
    const taskId = crypto.randomUUID();
    const completion = new Promise<Gen6MtSeedSummary>((resolve, reject) => {
      const abort = () => this.cancel();
      this.active = {
        taskId,
        request,
        options,
        startedAt: performance.now(),
        resolve,
        reject,
        processed: 0,
        results: 0,
        abort,
      };
      options.signal?.addEventListener("abort", abort, { once: true });
    });
    try {
      await this.ready;
      if (this.isActive(taskId))
        this.worker!.postMessage({
          type: "task",
          moduleId: "gen6mtseed",
          apiVersion: GEN6_MT_SEED_API_VERSION,
          taskId,
          request,
          stepSize: 2048,
        } satisfies Gen6MtSeedWorkerRequest);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return completion;
  }
  cancel() {
    const active = this.active;
    if (!active) return;
    this.clear(active);
    active.resolve(this.summary(active, true, false));
    this.reset();
  }
  dispose() {
    if (this.active) {
      const active = this.active;
      this.clear(active);
      active.reject(new Error("Gen VI MT Seed Worker was disposed."));
    }
    this.reset();
  }
  private ensureWorker() {
    if (this.worker) return;
    let resolveReady!: () => void;
    this.ready = new Promise((resolve) => {
      resolveReady = resolve;
    });
    const worker = new Worker(
      new URL("./gen6mtseed.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen6mtseed-1" },
    );
    this.worker = worker;
    worker.onmessage = ({ data }: MessageEvent<Gen6MtSeedWorkerResponse>) => {
      if (
        data.moduleId !== "gen6mtseed" ||
        data.apiVersion !== GEN6_MT_SEED_API_VERSION
      )
        return this.fail(new Error("Gen VI MT Seed Worker response mismatch."));
      if (data.type === "ready") {
        if (data.contractVersion !== RNG_MODULE_CONTRACT_VERSION)
          return this.fail(
            new Error("Gen VI MT Seed Worker capability mismatch."),
          );
        resolveReady();
        return;
      }
      if (data.type === "error") return this.fail(new Error(data.message));
      const active = this.active;
      if (
        !active ||
        active.taskId !== data.taskId ||
        data.buffer.byteLength !==
          data.resultCount * GEN6_MT_SEED_RESULT_WORDS * 4
      )
        return this.fail(
          new Error("Gen VI MT Seed Worker returned invalid results."),
        );
      const batch = decodeGen6MtSeedResults(data.buffer);
      active.processed = data.totalProcessed;
      active.results = data.totalResultCount;
      active.options.onBatch?.(batch);
      active.options.onProgress?.({
        processedStates: active.processed,
        totalStates: gen6MtSeedTaskCount(active.request),
        resultCount: active.results,
        percent: (active.processed / gen6MtSeedTaskCount(active.request)) * 100,
      });
      if (data.done) {
        this.clear(active);
        active.resolve(this.summary(active, false, data.limitReached));
      }
    };
    worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen VI MT Seed Worker crashed."));
    worker.postMessage({
      type: "init",
      moduleId: "gen6mtseed",
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/gen6mtseed.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_MT_SEED_API_VERSION,
    } satisfies Gen6MtSeedWorkerRequest);
  }
  private summary(
    active: {
      startedAt: number;
      processed: number;
      results: number;
      request: Gen6MtSeedRequest;
    },
    cancelled: boolean,
    resultLimitReached: boolean,
  ): Gen6MtSeedSummary {
    const totalStates = gen6MtSeedTaskCount(active.request);
    return {
      processedStates: active.processed,
      totalStates,
      resultCount: active.results,
      percent: totalStates ? (active.processed / totalStates) * 100 : 100,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled,
      resultLimitReached,
    };
  }
  private isActive(taskId: string) {
    return this.active?.taskId === taskId;
  }
  private fail(error: Error) {
    if (this.active) {
      const active = this.active;
      this.clear(active);
      active.reject(error);
    }
    this.reset();
  }
  private clear(active: {
    abort: () => void;
    options: Gen6MtSeedSearchOptions;
  }) {
    active.options.signal?.removeEventListener("abort", active.abort);
    if (this.active === active) this.active = undefined;
  }
  private reset() {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
  }
}
