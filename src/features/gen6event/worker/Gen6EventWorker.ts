import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6EventResults,
  GEN6_EVENT_API_VERSION,
  GEN6_EVENT_RESULT_WORDS,
  gen6EventTaskCount,
  validateGen6EventRequest,
  type Gen6EventRequest,
} from "../domain";
import type {
  Gen6EventEngine,
  Gen6EventSearchOptions,
  Gen6EventSummary,
} from "../search";
import type {
  Gen6EventWorkerRequest,
  Gen6EventWorkerResponse,
} from "./messages";

interface Slot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

interface ActiveSearch {
  taskId: string;
  request: Gen6EventRequest;
  options: Gen6EventSearchOptions;
  startedAt: number;
  resolve(summary: Gen6EventSummary): void;
  reject(error: Error): void;
  processed: number;
  abort?: () => void;
}

export class Gen6EventWorker implements Gen6EventEngine {
  private slot?: Slot;
  private active?: ActiveSearch;

  async search(
    request: Gen6EventRequest,
    options: Gen6EventSearchOptions = {},
  ): Promise<Gen6EventSummary> {
    validateGen6EventRequest(request);
    if (this.active)
      throw new Error("A Gen VI Event search is already running.");
    const totalStates = gen6EventTaskCount(request);
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
    let resolveCompletion!: (summary: Gen6EventSummary) => void;
    let rejectCompletion!: (error: Error) => void;
    const completion = new Promise<Gen6EventSummary>((resolve, reject) => {
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
        moduleId: "gen6event",
        apiVersion: GEN6_EVENT_API_VERSION,
        taskId,
        request,
      } satisfies Gen6EventWorkerRequest);
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
      totalStates: gen6EventTaskCount(active.request),
      resultCount: 0,
      percent: (active.processed / gen6EventTaskCount(active.request)) * 100,
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
      active.reject(new Error("Gen VI Event Worker was disposed."));
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
      new URL("./gen6event.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen6event-1" },
    );
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({ data }: MessageEvent<Gen6EventWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen VI Event Worker crashed."));
    worker.postMessage({
      type: "init",
      moduleId: "gen6event",
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/gen6event.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_EVENT_API_VERSION,
    } satisfies Gen6EventWorkerRequest);
    this.slot = slot;
  }

  private handle(slot: Slot, message: Gen6EventWorkerResponse) {
    if (
      message.moduleId !== "gen6event" ||
      message.apiVersion !== GEN6_EVENT_API_VERSION
    )
      return this.fail(new Error("Gen VI Event Worker response mismatch."));
    if (message.type === "ready") {
      if (message.contractVersion !== RNG_MODULE_CONTRACT_VERSION)
        return this.fail(new Error("Gen VI Event Worker capability mismatch."));
      slot.resolveReady();
      return;
    }
    if (message.type === "error") return this.fail(new Error(message.message));
    const active = this.active;
    if (
      !active ||
      active.taskId !== message.taskId ||
      message.buffer.byteLength !==
        message.resultCount * GEN6_EVENT_RESULT_WORDS * 4
    )
      return this.fail(
        new Error("Gen VI Event Worker returned an invalid batch."),
      );
    const results = decodeGen6EventResults(message.buffer);
    active.processed = message.processedCount;
    active.options.onBatch?.(results);
    const progress = {
      processedStates: active.processed,
      totalStates: gen6EventTaskCount(active.request),
      resultCount: results.length,
      percent: (active.processed / gen6EventTaskCount(active.request)) * 100,
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
