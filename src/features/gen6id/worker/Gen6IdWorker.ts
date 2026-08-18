import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6IdResults,
  GEN6_ID_API_VERSION,
  GEN6_ID_RESULT_WORDS,
  GEN6_ID_STEP_SIZE,
  gen6IdTaskCount,
  validateGen6IdRequest,
  type Gen6IdRequest,
} from "../domain";
import type {
  Gen6IdEngine,
  Gen6IdSearchOptions,
  Gen6IdSummary,
} from "../search";
import type { Gen6IdWorkerRequest, Gen6IdWorkerResponse } from "./messages";

interface Slot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

interface ActiveSearch {
  taskId: string;
  request: Gen6IdRequest;
  options: Gen6IdSearchOptions;
  startedAt: number;
  resolve(summary: Gen6IdSummary): void;
  reject(error: Error): void;
  processed: number;
  resultCount: number;
  abort?: () => void;
}

export class Gen6IdWorker implements Gen6IdEngine {
  private slot?: Slot;
  private active?: ActiveSearch;

  async search(request: Gen6IdRequest, options: Gen6IdSearchOptions = {}) {
    validateGen6IdRequest(request);
    if (this.active) throw new Error("A Gen VI ID search is already running.");
    const totalStates = gen6IdTaskCount(request);
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
      } satisfies Gen6IdSummary;
    this.ensureWorker();
    const taskId = crypto.randomUUID();
    let resolveCompletion!: (summary: Gen6IdSummary) => void;
    let rejectCompletion!: (error: Error) => void;
    const completion = new Promise<Gen6IdSummary>((resolve, reject) => {
      resolveCompletion = resolve;
      rejectCompletion = reject;
    });
    const abort = () => this.cancel();
    this.active = {
      taskId,
      request,
      options,
      startedAt: performance.now(),
      resolve: resolveCompletion,
      reject: rejectCompletion,
      processed: 0,
      resultCount: 0,
      abort,
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      await this.slot!.ready;
      if (this.active?.taskId === taskId)
        this.slot!.worker.postMessage({
          type: "task",
          moduleId: "gen6id",
          apiVersion: GEN6_ID_API_VERSION,
          taskId,
          request,
          stepSize: GEN6_ID_STEP_SIZE,
        } satisfies Gen6IdWorkerRequest);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return completion;
  }

  cancel() {
    const active = this.active;
    if (!active) return;
    this.clearActive(active);
    active.resolve(this.summary(active, true, false));
    this.resetWorker();
  }

  dispose() {
    if (this.active) {
      const active = this.active;
      this.clearActive(active);
      active.reject(new Error("Gen VI ID Worker was disposed."));
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
    const worker = new Worker(new URL("./gen6id.worker.ts", import.meta.url), {
      type: "module",
      name: "pokerngkit-gen6id-1",
    });
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({ data }: MessageEvent<Gen6IdWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen VI ID Worker crashed."));
    worker.postMessage({
      type: "init",
      moduleId: "gen6id",
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/gen6id.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_ID_API_VERSION,
    } satisfies Gen6IdWorkerRequest);
    this.slot = slot;
  }

  private handle(slot: Slot, message: Gen6IdWorkerResponse) {
    if (
      message.moduleId !== "gen6id" ||
      message.apiVersion !== GEN6_ID_API_VERSION
    )
      return this.fail(new Error("Gen VI ID Worker response mismatch."));
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      )
        return this.fail(new Error("Gen VI ID Worker capability mismatch."));
      slot.resolveReady();
      return;
    }
    if (message.type === "error") return this.fail(new Error(message.message));
    const active = this.active;
    if (
      !active ||
      active.taskId !== message.taskId ||
      message.buffer.byteLength !==
        message.resultCount * GEN6_ID_RESULT_WORDS * 4
    )
      return this.fail(
        new Error("Gen VI ID Worker returned an invalid batch."),
      );
    const batch = decodeGen6IdResults(
      message.buffer,
      active.request.resultLimit - active.resultCount,
    );
    active.processed = message.totalProcessed;
    active.resultCount = message.totalResultCount;
    if (batch.length) active.options.onBatch?.(batch);
    const totalStates = gen6IdTaskCount(active.request);
    active.options.onProgress?.({
      processedStates: active.processed,
      totalStates,
      resultCount: active.resultCount,
      percent: (active.processed / totalStates) * 100,
    });
    if (!message.done) return;
    this.clearActive(active);
    active.resolve(this.summary(active, false, message.limitReached));
  }

  private summary(
    active: ActiveSearch,
    cancelled: boolean,
    resultLimitReached: boolean,
  ): Gen6IdSummary {
    const totalStates = gen6IdTaskCount(active.request);
    return {
      processedStates: active.processed,
      totalStates,
      resultCount: active.resultCount,
      percent: (active.processed / totalStates) * 100,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled,
      resultLimitReached,
    };
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
