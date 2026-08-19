import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen7EventTimeResults,
  GEN7_EVENT_TIME_API_VERSION,
  GEN7_EVENT_TIME_MAX_RESULTS,
  GEN7_EVENT_TIME_RESULT_WORDS,
  GEN7_EVENT_TIME_STEP_SIZE,
  gen7EventTimeTaskCount,
  validateGen7EventTimeRequest,
  validateGen7EventTimeResult,
  type Gen7EventTimeRequest,
} from "../timeDomain";
import type {
  Gen7EventTimeEngine,
  Gen7EventTimeSearchOptions,
  Gen7EventTimeSummary,
} from "../timeSearch";
import type {
  Gen7EventTimeWorkerBatch,
  Gen7EventTimeWorkerRequest,
  Gen7EventTimeWorkerResponse,
} from "./timeMessages";

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

interface ActiveSearch {
  taskId: string;
  request: Gen7EventTimeRequest;
  options: Gen7EventTimeSearchOptions;
  startedAt: number;
  nextBatchIndex: number;
  processedStates: number;
  resultCount: number;
  totalStates: number;
  resultLimitReached: boolean;
  resolve(summary: Gen7EventTimeSummary): void;
  reject(error: Error): void;
  abort?(): void;
}

function moduleUrl(name: string) {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/${name}.mjs`,
    globalThis.location.href,
  ).href;
}

function finiteInteger(value: number, name: string) {
  if (!Number.isFinite(value) || !Number.isInteger(value))
    throw new TypeError(`${name} must be an integer.`);
  return value;
}

export class Gen7EventTimeWorker implements Gen7EventTimeEngine {
  private slot?: WorkerSlot;
  private active?: ActiveSearch;

  async search(
    request: Gen7EventTimeRequest,
    options: Gen7EventTimeSearchOptions = {},
  ) {
    if (this.active)
      throw new Error("A Gen 7 Event Time Finder search is already running.");
    validateGen7EventTimeRequest(request);
    const resultLimit = Math.max(
      1,
      Math.min(
        request.resultLimit,
        options.maxResults === undefined
          ? GEN7_EVENT_TIME_MAX_RESULTS
          : finiteInteger(options.maxResults, "Max results"),
      ),
    );
    const stepSize =
      options.stepSize === undefined
        ? GEN7_EVENT_TIME_STEP_SIZE
        : finiteInteger(options.stepSize, "Step size");
    if (stepSize < 1 || stepSize > 65_536)
      throw new RangeError("Step size must be between 1 and 65536.");
    const workerRequest =
      resultLimit === request.resultLimit
        ? request
        : { ...request, resultLimit };
    const totalStates = gen7EventTimeTaskCount(workerRequest);
    if (options.signal?.aborted) {
      return {
        processedStates: 0,
        totalStates,
        resultCount: 0,
        percent: 0,
        elapsedMs: 0,
        workerCount: 1,
        cancelled: true,
        resultLimitReached: false,
      } satisfies Gen7EventTimeSummary;
    }
    this.ensureWorker();
    const completion = new Promise<Gen7EventTimeSummary>((resolve, reject) => {
      const active: ActiveSearch = {
        taskId: crypto.randomUUID(),
        request: workerRequest,
        options,
        startedAt: performance.now(),
        nextBatchIndex: 0,
        processedStates: 0,
        resultCount: 0,
        totalStates,
        resultLimitReached: false,
        resolve,
        reject,
      };
      const abort = () => this.cancel();
      active.abort = abort;
      options.signal?.addEventListener("abort", abort, { once: true });
      this.active = active;
    });
    try {
      await this.slot!.ready;
      const active = this.active as ActiveSearch | undefined;
      if (active === undefined) return completion;
      const message: Gen7EventTimeWorkerRequest = {
        type: "task",
        moduleId: "gen7eventtimefinder",
        apiVersion: GEN7_EVENT_TIME_API_VERSION,
        taskId: active.taskId,
        operation: "event-time-search",
        request: workerRequest,
        stepSize,
      };
      this.slot!.worker.postMessage(message);
    } catch (error) {
      if (this.active)
        this.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return completion;
  }

  cancel() {
    if (!this.active) return;
    const active = this.active;
    const summary: Gen7EventTimeSummary = {
      processedStates: active.processedStates,
      totalStates: active.totalStates,
      resultCount: active.resultCount,
      percent:
        active.totalStates === 0
          ? 100
          : (active.processedStates / active.totalStates) * 100,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled: true,
      resultLimitReached: active.resultLimitReached,
    };
    this.clearActive();
    this.resetWorker();
    active.resolve(summary);
  }

  dispose() {
    if (this.active) {
      const active = this.active;
      this.clearActive();
      active.reject(new Error("Gen 7 Event Time Finder Worker was disposed."));
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
      new URL("./gen7eventtimefinder.worker.ts", import.meta.url),
      {
        type: "module",
        name: "pokerngkit-gen7eventtimefinder-1",
      },
    );
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({ data }: MessageEvent<Gen7EventTimeWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen 7 Event Time Finder Worker crashed."),
      );
    const init: Gen7EventTimeWorkerRequest = {
      type: "init",
      moduleId: "gen7eventtimefinder",
      moduleUrl: moduleUrl("gen7timefinder"),
      eventModuleUrl: moduleUrl("gen7eventtimefinder"),
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN7_EVENT_TIME_API_VERSION,
    };
    worker.postMessage(init);
    this.slot = slot;
  }

  private handle(slot: WorkerSlot, message: Gen7EventTimeWorkerResponse) {
    if (
      message.moduleId !== "gen7eventtimefinder" ||
      message.apiVersion !== GEN7_EVENT_TIME_API_VERSION
    ) {
      this.fail(new Error("Gen 7 Event Time Finder Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("event-time-search")
      ) {
        this.fail(
          new Error("Gen 7 Event Time Finder Worker capability mismatch."),
        );
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "error") {
      this.fail(new Error(message.message));
      return;
    }
    this.handleBatch(message);
  }

  private handleBatch(message: Gen7EventTimeWorkerBatch) {
    const active = this.active;
    if (
      !active ||
      message.taskId !== active.taskId ||
      message.operation !== "event-time-search" ||
      message.batchIndex !== active.nextBatchIndex++ ||
      message.buffer.byteLength !==
        message.resultCount *
          GEN7_EVENT_TIME_RESULT_WORDS *
          Uint32Array.BYTES_PER_ELEMENT ||
      message.totalProcessed < active.processedStates ||
      message.totalProcessed > active.totalStates ||
      message.totalResultCount < active.resultCount ||
      message.totalResultCount > active.request.resultLimit
    ) {
      this.fail(
        new Error("Gen 7 Event Time Finder Worker returned an invalid batch."),
      );
      return;
    }
    const decoded = decodeGen7EventTimeResults(message.buffer).map((result) =>
      validateGen7EventTimeResult(active.request, result),
    );
    active.processedStates = message.totalProcessed;
    active.resultCount = message.totalResultCount;
    active.resultLimitReached ||= message.limitReached;
    if (decoded.length !== 0) active.options.onBatch?.(decoded);
    const progress = {
      processedStates: active.processedStates,
      totalStates: active.totalStates,
      resultCount: active.resultCount,
      percent:
        active.totalStates === 0
          ? 100
          : (active.processedStates / active.totalStates) * 100,
    };
    active.options.onProgress?.(progress);
    if (!message.done) return;
    const summary: Gen7EventTimeSummary = {
      ...progress,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled: false,
      resultLimitReached: active.resultLimitReached,
    };
    this.clearActive();
    active.resolve(summary);
  }

  private clearActive() {
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
      this.clearActive();
      active.reject(error);
    }
    this.resetWorker();
  }

  private resetWorker() {
    this.slot?.rejectReady(
      new Error("Gen 7 Event Time Finder Worker initialization was cancelled."),
    );
    this.slot?.worker.terminate();
    this.slot = undefined;
  }
}
