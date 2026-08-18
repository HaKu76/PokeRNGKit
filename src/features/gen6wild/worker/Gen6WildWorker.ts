import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6WildResults,
  GEN6_WILD_API_VERSION,
  GEN6_WILD_RESULT_WORDS,
  gen6WildTaskCount,
  validateGen6WildRequest,
  type Gen6WildRequest,
} from "../domain";
import type {
  Gen6WildEngine,
  Gen6WildSearchOptions,
  Gen6WildSummary,
} from "../search";
import type { Gen6WildWorkerRequest, Gen6WildWorkerResponse } from "./messages";

interface Slot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}
interface ActiveSearch {
  taskId: string;
  request: Gen6WildRequest;
  options: Gen6WildSearchOptions;
  startedAt: number;
  resolve(summary: Gen6WildSummary): void;
  reject(error: Error): void;
  processed: number;
  abort?: () => void;
}

export class Gen6WildWorker implements Gen6WildEngine {
  private slot?: Slot;
  private active?: ActiveSearch;

  async search(
    request: Gen6WildRequest,
    options: Gen6WildSearchOptions = {},
  ): Promise<Gen6WildSummary> {
    validateGen6WildRequest(request);
    if (this.active)
      throw new Error("A Gen VI Wild search is already running.");
    const totalStates = gen6WildTaskCount(request);
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
      };
    this.ensureWorker();
    const taskId = crypto.randomUUID();
    let resolveCompletion!: (summary: Gen6WildSummary) => void;
    let rejectCompletion!: (error: Error) => void;
    const completion = new Promise<Gen6WildSummary>((resolve, reject) => {
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
      this.slot!.worker.postMessage({
        type: "task",
        moduleId: "gen6wild",
        apiVersion: GEN6_WILD_API_VERSION,
        taskId,
        request,
      } satisfies Gen6WildWorkerRequest);
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
      totalStates: gen6WildTaskCount(active.request),
      resultCount: 0,
      percent: (active.processed / gen6WildTaskCount(active.request)) * 100,
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
      active.reject(new Error("Gen VI Wild Worker was disposed."));
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
      new URL("./gen6wild.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen6wild-1" },
    );
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({ data }: MessageEvent<Gen6WildWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen VI Wild Worker crashed."));
    worker.postMessage({
      type: "init",
      moduleId: "gen6wild",
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/gen6wild.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_WILD_API_VERSION,
    } satisfies Gen6WildWorkerRequest);
    this.slot = slot;
  }

  private handle(slot: Slot, message: Gen6WildWorkerResponse) {
    if (
      message.moduleId !== "gen6wild" ||
      message.apiVersion !== GEN6_WILD_API_VERSION
    )
      return this.fail(new Error("Gen VI Wild Worker response mismatch."));
    if (message.type === "ready") {
      if (message.contractVersion !== RNG_MODULE_CONTRACT_VERSION)
        return this.fail(new Error("Gen VI Wild Worker capability mismatch."));
      slot.resolveReady();
      return;
    }
    if (message.type === "error") return this.fail(new Error(message.message));
    const active = this.active;
    if (
      !active ||
      active.taskId !== message.taskId ||
      message.buffer.byteLength !==
        message.resultCount * GEN6_WILD_RESULT_WORDS * 4
    )
      return this.fail(
        new Error("Gen VI Wild Worker returned an invalid batch."),
      );
    const results = decodeGen6WildResults(
      message.buffer,
      active.request.resultLimit,
    );
    active.processed = message.processedCount;
    const progress = {
      processedStates: active.processed,
      totalStates: gen6WildTaskCount(active.request),
      resultCount: results.length,
      percent: (active.processed / gen6WildTaskCount(active.request)) * 100,
    };
    active.options.onBatch?.(results);
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
