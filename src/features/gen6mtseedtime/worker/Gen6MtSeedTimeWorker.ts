import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6MtSeedTimeResults,
  GEN6_MT_SEED_TIME_API_VERSION,
  gen6MtSeedTimeTaskCount,
  validateGen6MtSeedTimeRequest,
  GEN6_MT_SEED_TIME_RESULT_WORDS,
  type Gen6MtSeedTimeRequest,
} from "../domain";
import type {
  Gen6MtSeedTimeEngine,
  Gen6MtSeedTimeSearchOptions,
  Gen6MtSeedTimeSummary,
} from "../search";
import type {
  Gen6MtSeedTimeWorkerRequest,
  Gen6MtSeedTimeWorkerResponse,
} from "./messages";
export class Gen6MtSeedTimeWorker implements Gen6MtSeedTimeEngine {
  private worker?: Worker;
  private ready?: Promise<void>;
  private active?: {
    taskId: string;
    request: Gen6MtSeedTimeRequest;
    options: Gen6MtSeedTimeSearchOptions;
    startedAt: number;
    processed: number;
    results: number;
    resolve(summary: Gen6MtSeedTimeSummary): void;
    reject(error: Error): void;
    abort(): void;
  };
  async search(
    request: Gen6MtSeedTimeRequest,
    options: Gen6MtSeedTimeSearchOptions = {},
  ): Promise<Gen6MtSeedTimeSummary> {
    validateGen6MtSeedTimeRequest(request);
    if (this.active)
      throw new Error("A Gen VI MT Seed Time search is already running.");
    const total = gen6MtSeedTimeTaskCount(request);
    if (options.signal?.aborted)
      return {
        processedStates: 0,
        totalStates: total,
        resultCount: 0,
        percent: 0,
        elapsedMs: 0,
        workerCount: 1,
        cancelled: true,
        resultLimitReached: false,
      };
    this.ensureWorker();
    const taskId = crypto.randomUUID();
    const completion = new Promise<Gen6MtSeedTimeSummary>((resolve, reject) => {
      const abort = () => this.cancel();
      this.active = {
        taskId,
        request,
        options,
        startedAt: performance.now(),
        processed: 0,
        results: 0,
        resolve,
        reject,
        abort,
      };
      options.signal?.addEventListener("abort", abort, { once: true });
    });
    try {
      await this.ready;
      if (this.isActive(taskId))
        this.worker!.postMessage({
          type: "task",
          moduleId: "gen6mtseedtime",
          apiVersion: GEN6_MT_SEED_TIME_API_VERSION,
          taskId,
          request,
          stepSize: 2048,
        } satisfies Gen6MtSeedTimeWorkerRequest);
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
      active.reject(new Error("Gen VI MT Seed Time Worker was disposed."));
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
      new URL("./gen6mtseedtime.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen6mtseedtime-1" },
    );
    this.worker = worker;
    worker.onmessage = ({
      data,
    }: MessageEvent<Gen6MtSeedTimeWorkerResponse>) => {
      if (
        data.moduleId !== "gen6mtseedtime" ||
        data.apiVersion !== GEN6_MT_SEED_TIME_API_VERSION
      )
        return this.fail(
          new Error("Gen VI MT Seed Time Worker response mismatch."),
        );
      if (data.type === "ready") {
        if (data.contractVersion !== RNG_MODULE_CONTRACT_VERSION)
          return this.fail(
            new Error("Gen VI MT Seed Time Worker capability mismatch."),
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
          data.resultCount * GEN6_MT_SEED_TIME_RESULT_WORDS * 4
      )
        return this.fail(
          new Error("Gen VI MT Seed Time Worker returned invalid results."),
        );
      const batch = decodeGen6MtSeedTimeResults(data.buffer);
      active.processed = data.totalProcessed;
      active.results = data.totalResultCount;
      active.options.onBatch?.(batch);
      active.options.onProgress?.({
        processedStates: active.processed,
        totalStates: gen6MtSeedTimeTaskCount(active.request),
        resultCount: active.results,
        percent:
          (active.processed / gen6MtSeedTimeTaskCount(active.request)) * 100,
      });
      if (data.done) {
        this.clear(active);
        active.resolve(this.summary(active, false, data.limitReached));
      }
    };
    worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen VI MT Seed Time Worker crashed."),
      );
    worker.postMessage({
      type: "init",
      moduleId: "gen6mtseedtime",
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/gen6mtseedtime.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_MT_SEED_TIME_API_VERSION,
    } satisfies Gen6MtSeedTimeWorkerRequest);
  }
  private summary(
    active: {
      startedAt: number;
      processed: number;
      results: number;
      request: Gen6MtSeedTimeRequest;
    },
    cancelled: boolean,
    resultLimitReached: boolean,
  ): Gen6MtSeedTimeSummary {
    const totalStates = gen6MtSeedTimeTaskCount(active.request);
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
  private clear(active: {
    abort: () => void;
    options: Gen6MtSeedTimeSearchOptions;
  }) {
    active.options.signal?.removeEventListener("abort", active.abort);
    if (this.active === active) this.active = undefined;
  }
  private fail(error: Error) {
    if (this.active) {
      const active = this.active;
      this.clear(active);
      active.reject(error);
    }
    this.reset();
  }
  private reset() {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
  }
}
