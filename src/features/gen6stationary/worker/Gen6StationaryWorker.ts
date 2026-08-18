import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6StationaryResults,
  GEN6_STATIONARY_API_VERSION,
  GEN6_STATIONARY_RESULT_WORDS,
  gen6StationaryTaskCount,
  validateGen6StationaryRequest,
  type Gen6StationaryRequest,
} from "../domain";
import type {
  Gen6StationaryEngine,
  Gen6StationarySearchOptions,
  Gen6StationarySummary,
} from "../search";
import type {
  Gen6StationaryWorkerRequest,
  Gen6StationaryWorkerResponse,
} from "./messages";

interface Slot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}
interface ActiveSearch {
  taskId: string;
  request: Gen6StationaryRequest;
  options: Gen6StationarySearchOptions;
  startedAt: number;
  resolve(summary: Gen6StationarySummary): void;
  reject(error: Error): void;
  processed: number;
  abort?: () => void;
}
export interface Gen6WorkerConfig {
  moduleId: "gen6stationary" | "gen6bank";
  moduleFile: "gen6stationary" | "gen6bank";
  workerName: string;
}
const DEFAULT_CONFIG: Gen6WorkerConfig = {
  moduleId: "gen6stationary",
  moduleFile: "gen6stationary",
  workerName: "pokerngkit-gen6stationary-1",
};
export class Gen6StationaryWorker implements Gen6StationaryEngine {
  private readonly config: Gen6WorkerConfig;
  private slot?: Slot;
  private active?: ActiveSearch;
  constructor(config: Gen6WorkerConfig = DEFAULT_CONFIG) {
    this.config = config;
  }
  async search(
    request: Gen6StationaryRequest,
    options: Gen6StationarySearchOptions = {},
  ) {
    validateGen6StationaryRequest(request);
    if (this.active)
      throw new Error("A Gen VI Stationary search is already running.");
    const totalStates = gen6StationaryTaskCount(request);
    const startedAt = performance.now();
    if (options.signal?.aborted)
      return {
        processedStates: 0,
        totalStates,
        resultCount: 0,
        percent: 0,
        elapsedMs: 0,
        workerCount: 1,
        cancelled: true,
        resultLimitReached: false,
      } as Gen6StationarySummary;
    this.ensureWorker();
    const taskId = crypto.randomUUID();
    let resolveCompletion!: (summary: Gen6StationarySummary) => void;
    let rejectCompletion!: (error: Error) => void;
    const completion = new Promise<Gen6StationarySummary>((resolve, reject) => {
      resolveCompletion = resolve;
      rejectCompletion = reject;
    });
    const abort = () => this.cancel();
    this.active = {
      taskId,
      request,
      options,
      startedAt,
      resolve: resolveCompletion,
      reject: rejectCompletion,
      processed: 0,
      abort,
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      await this.slot!.ready;
      if (!this.active) return completion;
      const message: Gen6StationaryWorkerRequest = {
        type: "task",
        moduleId: this.config.moduleId,
        apiVersion: GEN6_STATIONARY_API_VERSION,
        taskId,
        request,
      };
      this.slot!.worker.postMessage(message);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return completion;
  }
  cancel() {
    const active = this.active;
    if (!active) return;
    this.clearActive(active);
    active.resolve({
      processedStates: active.processed,
      totalStates: gen6StationaryTaskCount(active.request),
      resultCount: 0,
      percent:
        (active.processed / gen6StationaryTaskCount(active.request)) * 100,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled: true,
      resultLimitReached: false,
    });
    this.resetWorker();
  }
  dispose() {
    if (this.active) {
      const active = this.active;
      this.clearActive(active);
      active.reject(new Error("Gen VI Stationary Worker was disposed."));
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
      new URL("./gen6stationary.worker.ts", import.meta.url),
      { type: "module", name: this.config.workerName },
    );
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({ data }: MessageEvent<Gen6StationaryWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen VI Stationary Worker crashed."),
      );
    worker.postMessage({
      type: "init",
      moduleId: this.config.moduleId,
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/${this.config.moduleFile}.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_STATIONARY_API_VERSION,
    } satisfies Gen6StationaryWorkerRequest);
    this.slot = slot;
  }
  private handle(slot: Slot, message: Gen6StationaryWorkerResponse) {
    if (
      message.moduleId !== this.config.moduleId ||
      message.apiVersion !== GEN6_STATIONARY_API_VERSION
    )
      return this.fail(
        new Error("Gen VI Stationary Worker response mismatch."),
      );
    if (message.type === "ready") {
      if (message.contractVersion !== RNG_MODULE_CONTRACT_VERSION)
        return this.fail(
          new Error("Gen VI Stationary Worker capability mismatch."),
        );
      slot.resolveReady();
      return;
    }
    if (message.type === "error") return this.fail(new Error(message.message));
    const active = this.active;
    if (
      !active ||
      active.taskId !== message.taskId ||
      message.buffer.byteLength !==
        message.resultCount * GEN6_STATIONARY_RESULT_WORDS * 4
    )
      return this.fail(
        new Error("Gen VI Stationary Worker returned an invalid batch."),
      );
    const results = decodeGen6StationaryResults(
      message.buffer,
      active.request.resultLimit,
    );
    active.processed = message.processedCount;
    active.options.onBatch?.(results);
    const progress = {
      processedStates: active.processed,
      totalStates: gen6StationaryTaskCount(active.request),
      resultCount: results.length,
      percent:
        (active.processed / gen6StationaryTaskCount(active.request)) * 100,
    };
    active.options.onProgress?.(progress);
    this.clearActive(active);
    active.resolve({
      ...progress,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled: false,
      resultLimitReached: message.limitReached,
    });
  }
  private fail(error: Error) {
    this.slot?.rejectReady(error);
    if (this.active) {
      const active = this.active;
      this.clearActive(active);
      active.reject(error);
    }
    this.resetWorker();
  }
  private clearActive(active: ActiveSearch) {
    if (active.abort)
      active.options.signal?.removeEventListener("abort", active.abort);
    if (this.active === active) this.active = undefined;
  }
  private resetWorker() {
    this.slot?.worker.terminate();
    this.slot = undefined;
  }
}
