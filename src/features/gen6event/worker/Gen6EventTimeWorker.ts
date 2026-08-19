import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6EventTimeResults,
  GEN6_EVENT_TIME_API_VERSION,
  GEN6_EVENT_TIME_MAX_RESULTS,
  GEN6_EVENT_TIME_RESULT_WORDS,
  gen6EventTimeTaskCount,
  validateGen6EventTimeRequest,
  validateGen6EventTimeResult,
  type Gen6EventTimeRequest,
} from "../timeDomain";
import type {
  Gen6EventTimeEngine,
  Gen6EventTimeSearchOptions,
  Gen6EventTimeSummary,
} from "../timeSearch";
import type {
  Gen6EventTimeWorkerRequest,
  Gen6EventTimeWorkerResponse,
} from "./timeMessages";
interface Slot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}
interface Active {
  taskId: string;
  request: Gen6EventTimeRequest;
  options: Gen6EventTimeSearchOptions;
  startedAt: number;
  nextBatch: number;
  processed: number;
  results: number;
  total: number;
  limited: boolean;
  resolve(summary: Gen6EventTimeSummary): void;
  reject(error: Error): void;
  abort?(): void;
}
function moduleUrl(name: string) {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/${name}.mjs`,
    globalThis.location.href,
  ).href;
}
export class Gen6EventTimeWorker implements Gen6EventTimeEngine {
  private slot?: Slot;
  private active?: Active;
  async search(
    request: Gen6EventTimeRequest,
    options: Gen6EventTimeSearchOptions = {},
  ): Promise<Gen6EventTimeSummary> {
    if (this.active)
      throw new Error("A Gen VI Event Time Finder search is already running.");
    validateGen6EventTimeRequest(request);
    const resultLimit = Math.min(
      request.resultLimit,
      options.maxResults ?? GEN6_EVENT_TIME_MAX_RESULTS,
    );
    const workerRequest =
      resultLimit === request.resultLimit
        ? request
        : { ...request, resultLimit };
    const total = gen6EventTimeTaskCount(workerRequest);
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
    const completion = new Promise<Gen6EventTimeSummary>((resolve, reject) => {
      const active: Active = {
        taskId: crypto.randomUUID(),
        request: workerRequest,
        options,
        startedAt: performance.now(),
        nextBatch: 0,
        processed: 0,
        results: 0,
        total,
        limited: false,
        resolve,
        reject,
      };
      active.abort = () => this.cancel();
      this.active = active;
      options.signal?.addEventListener("abort", active.abort, { once: true });
    });
    try {
      await this.slot!.ready;
      const active = this.active as Active | undefined;
      if (!active) return completion;
      this.slot!.worker.postMessage({
        type: "task",
        moduleId: "gen6eventtimefinder",
        apiVersion: GEN6_EVENT_TIME_API_VERSION,
        taskId: active.taskId,
        operation: "event-time-search",
        request: workerRequest,
        stepSize: options.stepSize ?? 2048,
      } satisfies Gen6EventTimeWorkerRequest);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return completion;
  }
  cancel() {
    const active = this.active;
    if (!active) return;
    this.clear();
    this.reset();
    active.resolve({
      processedStates: active.processed,
      totalStates: active.total,
      resultCount: active.results,
      percent: active.total ? (active.processed / active.total) * 100 : 100,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled: true,
      resultLimitReached: active.limited,
    });
  }
  dispose() {
    if (this.active) {
      const active = this.active;
      this.clear();
      active.reject(new Error("Gen VI Event Time Finder Worker was disposed."));
    }
    this.reset();
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
      new URL("./gen6eventtimefinder.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen6eventtimefinder-1" },
    );
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({ data }: MessageEvent<Gen6EventTimeWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen VI Event Time Finder Worker crashed."),
      );
    worker.postMessage({
      type: "init",
      moduleId: "gen6eventtimefinder",
      moduleUrl: moduleUrl("gen6timefinder"),
      timeModuleUrl: moduleUrl("gen6timefinder"),
      eventModuleUrl: moduleUrl("gen6event"),
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_EVENT_TIME_API_VERSION,
    } satisfies Gen6EventTimeWorkerRequest);
    this.slot = slot;
  }
  private handle(slot: Slot, message: Gen6EventTimeWorkerResponse) {
    if (
      message.moduleId !== "gen6eventtimefinder" ||
      message.apiVersion !== GEN6_EVENT_TIME_API_VERSION
    )
      return this.fail(
        new Error("Gen VI Event Time Finder Worker response mismatch."),
      );
    if (message.type === "ready") {
      if (message.contractVersion !== RNG_MODULE_CONTRACT_VERSION)
        return this.fail(
          new Error("Gen VI Event Time Finder Worker capability mismatch."),
        );
      slot.resolveReady();
      return;
    }
    if (message.type === "error") return this.fail(new Error(message.message));
    const active = this.active;
    if (
      !active ||
      message.taskId !== active.taskId ||
      message.batchIndex !== active.nextBatch++ ||
      message.buffer.byteLength !==
        message.resultCount * GEN6_EVENT_TIME_RESULT_WORDS * 4 ||
      message.totalProcessed < active.processed ||
      message.totalResultCount < active.results
    )
      return this.fail(
        new Error("Gen VI Event Time Finder Worker returned an invalid batch."),
      );
    const decoded = decodeGen6EventTimeResults(message.buffer).map((result) =>
      validateGen6EventTimeResult(active.request, result),
    );
    active.processed = message.totalProcessed;
    active.results = message.totalResultCount;
    active.limited ||= message.limitReached;
    active.options.onBatch?.(decoded);
    const progress = {
      processedStates: active.processed,
      totalStates: active.total,
      resultCount: active.results,
      percent: active.total ? (active.processed / active.total) * 100 : 100,
    };
    active.options.onProgress?.(progress);
    if (!message.done) return;
    this.clear();
    active.resolve({
      ...progress,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled: false,
      resultLimitReached: active.limited,
    });
  }
  private clear() {
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
      this.clear();
      active.reject(error);
    }
    this.reset();
  }
  private reset() {
    this.slot?.worker.terminate();
    this.slot = undefined;
  }
}
