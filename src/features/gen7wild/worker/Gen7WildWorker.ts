import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen7WildResults,
  GEN7_WILD_API_VERSION,
  GEN7_WILD_MAX_RESULTS,
  GEN7_WILD_RESULT_WORDS,
  GEN7_WILD_STEP_SIZE,
  gen7WildTaskCount,
  validateGen7WildRequest,
  validateGen7WildResult,
  type Gen7WildRequest,
} from "../domain";
import type {
  Gen7WildEngine,
  Gen7WildSearchOptions,
  Gen7WildSummary,
} from "../search";
import type {
  Gen7WildWorkerBatch,
  Gen7WildWorkerRequest,
  Gen7WildWorkerResponse,
} from "./messages";

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

interface ActiveSearch {
  taskId: string;
  request: Gen7WildRequest;
  options: Gen7WildSearchOptions;
  startedAt: number;
  nextBatchIndex: number;
  processedStates: number;
  resultCount: number;
  totalStates: number;
  resultLimitReached: boolean;
  resolve(summary: Gen7WildSummary): void;
  reject(error: Error): void;
  abort?(): void;
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen7wild.mjs`,
    globalThis.location.href,
  ).href;
}

function finiteInteger(value: number, name: string) {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer.`);
  }
  return value;
}

export class Gen7WildWorker implements Gen7WildEngine {
  private slot?: WorkerSlot;
  private active?: ActiveSearch;

  async search(
    request: Gen7WildRequest,
    options: Gen7WildSearchOptions = {},
  ): Promise<Gen7WildSummary> {
    if (this.active) throw new Error("A Gen 7 Wild search is already running.");
    validateGen7WildRequest(request);
    const resultLimit = Math.max(
      1,
      Math.min(
        request.resultLimit,
        options.maxResults === undefined
          ? GEN7_WILD_MAX_RESULTS
          : finiteInteger(options.maxResults, "Max results"),
      ),
    );
    const stepSize =
      options.stepSize === undefined
        ? GEN7_WILD_STEP_SIZE
        : finiteInteger(options.stepSize, "Step size");
    if (stepSize < 1 || stepSize > 65_536) {
      throw new RangeError("Step size must be between 1 and 65536.");
    }
    const workerRequest =
      resultLimit === request.resultLimit
        ? request
        : { ...request, resultLimit };
    const totalStates = gen7WildTaskCount(workerRequest);
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
      };
    }

    this.ensureWorker();
    const completion = new Promise<Gen7WildSummary>((resolve, reject) => {
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
      if (!this.active) return completion;
      const message: Gen7WildWorkerRequest = {
        type: "task",
        moduleId: "gen7wild",
        apiVersion: GEN7_WILD_API_VERSION,
        taskId: this.active.taskId,
        operation: "generator",
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
    const summary: Gen7WildSummary = {
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
      active.reject(new Error("Gen 7 Wild Worker was disposed."));
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
      new URL("./gen7wild.worker.ts", import.meta.url),
      {
        type: "module",
        name: "pokerngkit-gen7wild-1",
      },
    );
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({ data }: MessageEvent<Gen7WildWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen 7 Wild Worker crashed."));
    const init: Gen7WildWorkerRequest = {
      type: "init",
      moduleId: "gen7wild",
      moduleUrl: moduleUrl(),
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN7_WILD_API_VERSION,
    };
    worker.postMessage(init);
    this.slot = slot;
  }

  private handle(slot: WorkerSlot, message: Gen7WildWorkerResponse) {
    if (
      message.moduleId !== "gen7wild" ||
      message.apiVersion !== GEN7_WILD_API_VERSION
    ) {
      this.fail(new Error("Gen 7 Wild Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      ) {
        this.fail(new Error("Gen 7 Wild Worker capability mismatch."));
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

  private handleBatch(message: Gen7WildWorkerBatch) {
    const active = this.active;
    if (
      !active ||
      message.taskId !== active.taskId ||
      message.operation !== "generator" ||
      message.batchIndex !== active.nextBatchIndex++ ||
      message.buffer.byteLength !==
        message.resultCount *
          GEN7_WILD_RESULT_WORDS *
          Uint32Array.BYTES_PER_ELEMENT ||
      message.totalProcessed < active.processedStates ||
      message.totalProcessed > active.totalStates ||
      message.totalResultCount < active.resultCount ||
      message.totalResultCount > active.request.resultLimit
    ) {
      this.fail(new Error("Gen 7 Wild Worker returned an invalid batch."));
      return;
    }
    const decoded = decodeGen7WildResults(message.buffer).map((result) =>
      validateGen7WildResult(active.request, result),
    );
    if (decoded.length !== message.resultCount) {
      this.fail(new Error("Gen 7 Wild Worker result count mismatch."));
      return;
    }
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
    const summary: Gen7WildSummary = {
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
    if (this.active.abort) {
      this.active.options.signal?.removeEventListener(
        "abort",
        this.active.abort,
      );
    }
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
      new Error("Gen 7 Wild Worker initialization was cancelled."),
    );
    this.slot?.worker.terminate();
    this.slot = undefined;
  }
}
