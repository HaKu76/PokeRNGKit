import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6TinyHoneyResults,
  GEN6_TINY_HONEY_API_VERSION,
  GEN6_TINY_HONEY_RESULT_WORDS,
  gen6TinyHoneyTaskCount,
  validateGen6TinyHoneyRequest,
  type Gen6TinyHoneyRequest,
} from "../domain";
import type {
  Gen6TinyHoneyEngine,
  gen6TinyHoneySearchOptions,
  Gen6TinyHoneySummary,
} from "../search";
import type {
  Gen6TinyHoneyWorkerRequest,
  Gen6TinyHoneyWorkerResponse,
} from "./messages";

interface Slot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}
interface ActiveSearch {
  taskId: string;
  request: Gen6TinyHoneyRequest;
  options: gen6TinyHoneySearchOptions;
  startedAt: number;
  resolve(summary: Gen6TinyHoneySummary): void;
  reject(error: Error): void;
  processed: number;
  resultCount: number;
  abort?: () => void;
}

export class Gen6TinyHoneyWorker implements Gen6TinyHoneyEngine {
  private slot?: Slot;
  private active?: ActiveSearch;

  async search(
    request: Gen6TinyHoneyRequest,
    options: gen6TinyHoneySearchOptions = {},
  ): Promise<Gen6TinyHoneySummary> {
    validateGen6TinyHoneyRequest(request);
    if (this.active)
      throw new Error("A TinyFinder Honey Wild search is already running.");
    const totalStates = gen6TinyHoneyTaskCount(request);
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
    let resolveCompletion!: (summary: Gen6TinyHoneySummary) => void;
    let rejectCompletion!: (error: Error) => void;
    const completion = new Promise<Gen6TinyHoneySummary>((resolve, reject) => {
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
          moduleId: "gen6tinyhoney",
          apiVersion: GEN6_TINY_HONEY_API_VERSION,
          taskId,
          request,
          stepSize: 2048,
        } satisfies Gen6TinyHoneyWorkerRequest);
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
      active.reject(new Error("TinyFinder Honey Wild Worker was disposed."));
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
      new URL("./gen6tinyhoney.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen6tinyhoney-1" },
    );
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({ data }: MessageEvent<Gen6TinyHoneyWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "TinyFinder Honey Wild Worker crashed."),
      );
    worker.postMessage({
      type: "init",
      moduleId: "gen6tinyhoney",
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/gen6tinyhoney.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_TINY_HONEY_API_VERSION,
    } satisfies Gen6TinyHoneyWorkerRequest);
    this.slot = slot;
  }

  private handle(slot: Slot, message: Gen6TinyHoneyWorkerResponse) {
    if (
      message.moduleId !== "gen6tinyhoney" ||
      message.apiVersion !== GEN6_TINY_HONEY_API_VERSION
    )
      return this.fail(
        new Error("TinyFinder Honey Wild Worker response mismatch."),
      );
    if (message.type === "ready") {
      if (message.contractVersion !== RNG_MODULE_CONTRACT_VERSION)
        return this.fail(
          new Error("TinyFinder Honey Wild Worker capability mismatch."),
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
        message.resultCount * GEN6_TINY_HONEY_RESULT_WORDS * 4
    )
      return this.fail(
        new Error("TinyFinder Honey Wild Worker returned invalid results."),
      );
    const batch = decodeGen6TinyHoneyResults(
      message.buffer,
      active.request.resultLimit - active.resultCount,
    );
    active.processed = message.totalProcessed;
    active.resultCount = message.totalResultCount;
    if (batch.length) active.options.onBatch?.(batch);
    const totalStates = gen6TinyHoneyTaskCount(active.request);
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
  ): Gen6TinyHoneySummary {
    const totalStates = gen6TinyHoneyTaskCount(active.request);
    return {
      processedStates: active.processed,
      totalStates,
      resultCount: active.resultCount,
      percent: totalStates ? (active.processed / totalStates) * 100 : 100,
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
