import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6DexNavResults,
  GEN6_DEXNAV_API_VERSION,
  GEN6_DEXNAV_RESULT_WORDS,
  gen6DexNavTaskCount,
  validateGen6DexNavRequest,
  type Gen6DexNavRequest,
} from "../domain";
import type {
  Gen6DexNavEngine,
  Gen6DexNavSearchOptions,
  Gen6DexNavSummary,
} from "../search";
import type {
  Gen6DexNavWorkerRequest,
  Gen6DexNavWorkerResponse,
} from "./messages";
interface Slot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}
interface Active {
  taskId: string;
  request: Gen6DexNavRequest;
  options: Gen6DexNavSearchOptions;
  startedAt: number;
  resolve(summary: Gen6DexNavSummary): void;
  reject(error: Error): void;
  processed: number;
  abort?: () => void;
}
export class Gen6DexNavWorker implements Gen6DexNavEngine {
  private slot?: Slot;
  private active?: Active;
  async search(
    request: Gen6DexNavRequest,
    options: Gen6DexNavSearchOptions = {},
  ) {
    validateGen6DexNavRequest(request);
    if (this.active)
      throw new Error("A Gen VI DexNav search is already running.");
    if (options.signal?.aborted)
      return this.summary(request, 0, 0, 0, true, false, 0);
    this.ensureWorker();
    const taskId = crypto.randomUUID();
    let resolve!: (summary: Gen6DexNavSummary) => void;
    let reject!: (error: Error) => void;
    const completion = new Promise<Gen6DexNavSummary>((r, j) => {
      resolve = r;
      reject = j;
    });
    const abort = () => this.cancel();
    this.active = {
      taskId,
      request,
      options,
      startedAt: performance.now(),
      resolve,
      reject,
      processed: 0,
      abort,
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      await this.slot!.ready;
      if (this.active)
        this.slot!.worker.postMessage({
          type: "task",
          moduleId: "gen6dexnav",
          apiVersion: GEN6_DEXNAV_API_VERSION,
          taskId,
          request,
        } satisfies Gen6DexNavWorkerRequest);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return completion;
  }
  cancel() {
    const active = this.active;
    if (!active) return;
    this.clear(active);
    active.resolve(
      this.summary(
        active.request,
        active.processed,
        0,
        (active.processed / gen6DexNavTaskCount(active.request)) * 100,
        true,
        false,
        performance.now() - active.startedAt,
      ),
    );
    this.reset();
  }
  dispose() {
    if (this.active) {
      const active = this.active;
      this.clear(active);
      active.reject(new Error("Gen VI DexNav Worker was disposed."));
    }
    this.reset();
  }
  private summary(
    request: Gen6DexNavRequest,
    processed: number,
    count: number,
    percent: number,
    cancelled: boolean,
    limit: boolean,
    elapsedMs: number,
  ): Gen6DexNavSummary {
    return {
      processedStates: processed,
      totalStates: gen6DexNavTaskCount(request),
      resultCount: count,
      percent,
      elapsedMs,
      workerCount: 1,
      cancelled,
      resultLimitReached: limit,
    };
  }
  private ensureWorker() {
    if (this.slot) return;
    let resolveReady!: () => void;
    let rejectReady!: (error: Error) => void;
    const ready = new Promise<void>((r, j) => {
      resolveReady = r;
      rejectReady = j;
    });
    const worker = new Worker(
      new URL("./gen6dexnav.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen6dexnav-1" },
    );
    const slot = { worker, ready, resolveReady, rejectReady };
    worker.onmessage = ({ data }: MessageEvent<Gen6DexNavWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen VI DexNav Worker crashed."));
    worker.postMessage({
      type: "init",
      moduleId: "gen6dexnav",
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/gen6dexnav.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_DEXNAV_API_VERSION,
    } satisfies Gen6DexNavWorkerRequest);
    this.slot = slot;
  }
  private handle(slot: Slot, message: Gen6DexNavWorkerResponse) {
    if (
      message.moduleId !== "gen6dexnav" ||
      message.apiVersion !== GEN6_DEXNAV_API_VERSION
    )
      return this.fail(new Error("Gen VI DexNav Worker response mismatch."));
    if (message.type === "ready") {
      if (message.contractVersion !== RNG_MODULE_CONTRACT_VERSION)
        return this.fail(
          new Error("Gen VI DexNav Worker capability mismatch."),
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
        message.resultCount * GEN6_DEXNAV_RESULT_WORDS * 4
    )
      return this.fail(
        new Error("Gen VI DexNav Worker returned an invalid batch."),
      );
    const results = decodeGen6DexNavResults(
      message.buffer,
      active.request.resultLimit,
    );
    active.processed = message.processedCount;
    const progress = {
      processedStates: active.processed,
      totalStates: gen6DexNavTaskCount(active.request),
      resultCount: results.length,
      percent: (active.processed / gen6DexNavTaskCount(active.request)) * 100,
    };
    active.options.onBatch?.(results);
    active.options.onProgress?.(progress);
    this.clear(active);
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
      this.clear(active);
      active.reject(error);
    }
    this.reset();
  }
  private clear(active: Active) {
    if (active.abort)
      active.options.signal?.removeEventListener("abort", active.abort);
    if (this.active === active) this.active = undefined;
  }
  private reset() {
    this.slot?.worker.terminate();
    this.slot = undefined;
  }
}
