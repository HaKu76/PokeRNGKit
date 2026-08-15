import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen7EggResults,
  GEN7_EGG_API_VERSION,
  GEN7_EGG_MAX_RESULTS,
  GEN7_EGG_RESULT_WORDS,
  GEN7_EGG_STEP_SIZE,
  gen7EggTaskCount,
  validateGen7EggExecutionRequest,
  validateGen7EggResult,
  type Gen7EggRequest,
} from "../domain";
import type {
  Gen7EggEngine,
  Gen7EggSearchOptions,
  Gen7EggSummary,
} from "../search";
import type {
  Gen7EggWorkerBatch,
  Gen7EggWorkerRequest,
  Gen7EggWorkerResponse,
} from "./messages";

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

interface ActiveSearch {
  taskId: string;
  request: Gen7EggRequest;
  options: Gen7EggSearchOptions;
  startedAt: number;
  nextBatchIndex: number;
  processedStates: number;
  resultCount: number;
  totalStates: number;
  resultLimitReached: boolean;
  targetFound: boolean;
  acceptedEggs: number;
  rejectedEggs: number;
  resolve(summary: Gen7EggSummary): void;
  reject(error: Error): void;
  abort?(): void;
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen7egg.mjs`,
    globalThis.location.href,
  ).href;
}

function finiteInteger(value: number, name: string) {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer.`);
  }
  return value;
}

export class Gen7EggWorker implements Gen7EggEngine {
  private slot?: WorkerSlot;
  private active?: ActiveSearch;

  async search(
    request: Gen7EggRequest,
    options: Gen7EggSearchOptions = {},
  ): Promise<Gen7EggSummary> {
    if (this.active) throw new Error("A Gen 7 Egg search is already running.");
    validateGen7EggExecutionRequest(request);
    const resultLimit = Math.max(
      1,
      Math.min(
        request.resultLimit,
        options.maxResults === undefined
          ? GEN7_EGG_MAX_RESULTS
          : finiteInteger(options.maxResults, "Max results"),
      ),
    );
    const stepSize =
      options.stepSize === undefined
        ? GEN7_EGG_STEP_SIZE
        : finiteInteger(options.stepSize, "Step size");
    if (stepSize < 1 || stepSize > 65_536) {
      throw new RangeError("Step size must be between 1 and 65536.");
    }
    const workerRequest =
      resultLimit === request.resultLimit
        ? request
        : { ...request, resultLimit };
    const totalStates = gen7EggTaskCount(workerRequest);
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
        targetFound: false,
        acceptedEggs: 0,
        rejectedEggs: 0,
      };
    }

    this.ensureWorker();
    const completion = new Promise<Gen7EggSummary>((resolve, reject) => {
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
        targetFound: false,
        acceptedEggs: 0,
        rejectedEggs: 0,
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
      if (!active) return completion;
      const message: Gen7EggWorkerRequest = {
        type: "task",
        moduleId: "gen7egg",
        apiVersion: GEN7_EGG_API_VERSION,
        taskId: active.taskId,
        operation: "generator",
        request: workerRequest,
        stepSize,
      };
      this.slot!.worker.postMessage(message);
    } catch (error) {
      if (this.active) {
        this.fail(error instanceof Error ? error : new Error(String(error)));
      }
    }
    return completion;
  }

  cancel() {
    if (!this.active) return;
    const active = this.active;
    const summary = this.summary(active, true);
    this.clearActive();
    this.resetWorker();
    active.resolve(summary);
  }

  dispose() {
    if (this.active) {
      const active = this.active;
      this.clearActive();
      active.reject(new Error("Gen 7 Egg Worker was disposed."));
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
    const worker = new Worker(new URL("./gen7egg.worker.ts", import.meta.url), {
      type: "module",
      name: "pokerngkit-gen7egg-1",
    });
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({ data }: MessageEvent<Gen7EggWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen 7 Egg Worker crashed."));
    const init: Gen7EggWorkerRequest = {
      type: "init",
      moduleId: "gen7egg",
      moduleUrl: moduleUrl(),
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN7_EGG_API_VERSION,
    };
    worker.postMessage(init);
    this.slot = slot;
  }

  private handle(slot: WorkerSlot, message: Gen7EggWorkerResponse) {
    if (
      message.moduleId !== "gen7egg" ||
      message.apiVersion !== GEN7_EGG_API_VERSION
    ) {
      this.fail(new Error("Gen 7 Egg Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      ) {
        this.fail(new Error("Gen 7 Egg Worker capability mismatch."));
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

  private handleBatch(message: Gen7EggWorkerBatch) {
    const active = this.active;
    if (
      !active ||
      message.taskId !== active.taskId ||
      message.operation !== "generator" ||
      message.batchIndex !== active.nextBatchIndex++ ||
      message.buffer.byteLength !==
        message.resultCount *
          GEN7_EGG_RESULT_WORDS *
          Uint32Array.BYTES_PER_ELEMENT ||
      message.totalProcessed < active.processedStates ||
      message.totalProcessed > active.totalStates ||
      message.totalResultCount < active.resultCount ||
      message.totalResultCount > active.request.resultLimit
    ) {
      this.fail(new Error("Gen 7 Egg Worker returned an invalid batch."));
      return;
    }
    const decoded = decodeGen7EggResults(message.buffer).map(
      validateGen7EggResult,
    );
    if (decoded.length !== message.resultCount) {
      this.fail(new Error("Gen 7 Egg Worker result count mismatch."));
      return;
    }
    active.processedStates = message.totalProcessed;
    active.resultCount = message.totalResultCount;
    active.resultLimitReached ||= message.limitReached;
    active.targetFound = message.targetFound;
    active.acceptedEggs = message.acceptedEggs;
    active.rejectedEggs = message.rejectedEggs;
    if (decoded.length !== 0) active.options.onBatch?.(decoded);
    active.options.onProgress?.({
      processedStates: active.processedStates,
      totalStates: active.totalStates,
      resultCount: active.resultCount,
      percent:
        active.totalStates === 0
          ? 100
          : (active.processedStates / active.totalStates) * 100,
    });
    if (!message.done) return;
    const summary = this.summary(active, false);
    this.clearActive();
    active.resolve(summary);
  }

  private summary(active: ActiveSearch, cancelled: boolean): Gen7EggSummary {
    return {
      processedStates: active.processedStates,
      totalStates: active.totalStates,
      resultCount: active.resultCount,
      percent:
        active.totalStates === 0
          ? 100
          : (active.processedStates / active.totalStates) * 100,
      elapsedMs: performance.now() - active.startedAt,
      workerCount: 1,
      cancelled,
      resultLimitReached: active.resultLimitReached,
      targetFound: active.targetFound,
      acceptedEggs: active.acceptedEggs,
      rejectedEggs: active.rejectedEggs,
    };
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
      new Error("Gen 7 Egg Worker initialization was cancelled."),
    );
    this.slot?.worker.terminate();
    this.slot = undefined;
  }
}
