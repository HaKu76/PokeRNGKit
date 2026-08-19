import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6TinyTimelineResults,
  GEN6_TINYTIMELINE_API_VERSION,
  GEN6_TINYTIMELINE_RESULT_WORDS,
  validateGen6TinyTimelineRequest,
  type Gen6TinyTimelineRequest,
} from "../domain";
import type {
  Gen6TinyTimelineEngine,
  Gen6TinyTimelineSearchOptions,
  Gen6TinyTimelineSummary,
} from "../search";
import type {
  Gen6TinyTimelineWorkerRequest,
  Gen6TinyTimelineWorkerResponse,
} from "./messages";

type Slot = {
  worker: Worker;
  ready: Promise<void>;
  resolveReady: () => void;
  rejectReady: (error: Error) => void;
};

export class Gen6TinyTimelineWorker implements Gen6TinyTimelineEngine {
  private slot?: Slot;
  private active?: {
    taskId: string;
    request: Gen6TinyTimelineRequest;
    options: Gen6TinyTimelineSearchOptions;
    startedAt: number;
    resolve: (summary: Gen6TinyTimelineSummary) => void;
    reject: (error: Error) => void;
    processed: number;
    resultCount: number;
    abort?: () => void;
  };

  search(
    request: Gen6TinyTimelineRequest,
    options: Gen6TinyTimelineSearchOptions = {},
  ) {
    validateGen6TinyTimelineRequest(request);
    if (this.active)
      throw new Error("A Gen VI Tiny Timeline search is already running.");
    this.ensureWorker();
    const startedAt = performance.now();
    const totalStates = Math.max(
      0,
      request.targetFrame - request.startingFrame + 1,
    );
    return new Promise<Gen6TinyTimelineSummary>((resolve, reject) => {
      const active: NonNullable<Gen6TinyTimelineWorker["active"]> = {
        taskId: crypto.randomUUID(),
        request,
        options,
        startedAt,
        resolve,
        reject,
        processed: 0,
        resultCount: 0,
        abort: undefined,
      };
      this.active = active;
      if (options.signal?.aborted) {
        this.cancel();
        return;
      }
      active.abort = () => this.cancel();
      options.signal?.addEventListener("abort", active.abort, { once: true });
      this.slot!.ready.then(() => {
        if (this.active !== active) return;
        this.slot!.worker.postMessage({
          type: "task",
          moduleId: "gen6tinytimeline",
          apiVersion: GEN6_TINYTIMELINE_API_VERSION,
          taskId: active.taskId,
          request,
        } satisfies Gen6TinyTimelineWorkerRequest);
      }).catch((error) => this.fail(error));
      void totalStates;
    });
  }

  cancel() {
    const active = this.active;
    if (!active) return;
    this.clearActive(active);
    active.resolve(this.summary(active, true, false));
    this.resetWorker();
  }

  dispose() {
    const active = this.active;
    if (active) {
      this.clearActive(active);
      active.reject(new Error("Gen VI Tiny Timeline Worker was disposed."));
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
      new URL("./gen6tinytimeline.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen6tinytimeline-1" },
    );
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({
      data,
    }: MessageEvent<Gen6TinyTimelineWorkerResponse>) => this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen VI Tiny Timeline Worker crashed."),
      );
    worker.postMessage({
      type: "init",
      moduleId: "gen6tinytimeline",
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/gen6tinytimeline.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_TINYTIMELINE_API_VERSION,
    } satisfies Gen6TinyTimelineWorkerRequest);
    this.slot = slot;
  }

  private handle(slot: Slot, message: Gen6TinyTimelineWorkerResponse) {
    if (
      message.moduleId !== "gen6tinytimeline" ||
      message.apiVersion !== GEN6_TINYTIMELINE_API_VERSION
    )
      return this.fail(
        new Error("Gen VI Tiny Timeline Worker response mismatch."),
      );
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      )
        return this.fail(
          new Error("Gen VI Tiny Timeline Worker capability mismatch."),
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
        message.resultCount * GEN6_TINYTIMELINE_RESULT_WORDS * 4
    )
      return this.fail(
        new Error("Gen VI Tiny Timeline Worker returned an invalid batch."),
      );
    const batch = decodeGen6TinyTimelineResults(
      message.buffer,
      active.request.resultLimit - active.resultCount,
    );
    active.processed = message.processedCount;
    active.resultCount += batch.length;
    if (batch.length) active.options.onBatch?.(batch);
    const totalStates = Math.max(
      0,
      active.request.targetFrame - active.request.startingFrame + 1,
    );
    active.options.onProgress?.({
      processedStates: active.processed,
      totalStates,
      resultCount: active.resultCount,
      percent: totalStates ? (active.processed / totalStates) * 100 : 100,
    });
    this.clearActive(active);
    active.resolve(this.summary(active, false, message.limitReached));
  }

  private summary(
    active: NonNullable<Gen6TinyTimelineWorker["active"]>,
    cancelled: boolean,
    resultLimitReached: boolean,
  ): Gen6TinyTimelineSummary {
    const totalStates = Math.max(
      0,
      active.request.targetFrame - active.request.startingFrame + 1,
    );
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
    const active = this.active;
    if (active) {
      this.clearActive(active);
      active.reject(error);
    }
    this.resetWorker();
  }

  private clearActive(active: NonNullable<Gen6TinyTimelineWorker["active"]>) {
    if (active.abort)
      active.options.signal?.removeEventListener("abort", active.abort);
    if (this.active === active) this.active = undefined;
  }

  private resetWorker() {
    this.slot?.worker.terminate();
    this.slot = undefined;
  }
}
