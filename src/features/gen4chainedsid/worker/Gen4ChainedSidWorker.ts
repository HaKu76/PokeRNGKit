import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen4ChainedSidResults,
  GEN4_CHAINED_SID_API_VERSION,
  gen4ChainedSidChunk,
  validateGen4ChainedSidRequest,
  type Gen4ChainedSidRequest,
} from "../domain";
import type {
  Gen4ChainedSidEngine,
  Gen4ChainedSidOptions,
  Gen4ChainedSidSummary,
} from "../search";
import type {
  Gen4ChainedSidWorkerRequest,
  Gen4ChainedSidWorkerResponse,
} from "./messages";

type Batch = Extract<Gen4ChainedSidWorkerResponse, { type: "batch" }>;

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen4chainedsid.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen4ChainedSidWorker implements Gen4ChainedSidEngine {
  private worker?: Worker;
  private ready?: Promise<void>;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;
  private pending?: {
    taskId: string;
    resolve(batch: Batch): void;
    reject(error: Error): void;
  };
  private cancelled = false;

  async calculate(
    request: Gen4ChainedSidRequest,
    options: Gen4ChainedSidOptions = {},
  ): Promise<Gen4ChainedSidSummary> {
    if (this.pending)
      throw new Error("A Gen4 chained SID calculation is already running.");
    if (validateGen4ChainedSidRequest(request).length > 0)
      throw new RangeError("Invalid Gen4 chained SID request.");
    if (options.signal?.aborted)
      return {
        candidates: [],
        processedEntries: 0,
        elapsedMs: 0,
        workerCount: 1,
        cancelled: true,
      };

    this.cancelled = false;
    const startedAt = performance.now();
    const abort = () => this.cancel();
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      this.ensureWorker();
      await this.ready;
      const taskId = crypto.randomUUID();
      const chunk = gen4ChainedSidChunk(request);
      const batch = await new Promise<Batch>((resolve, reject) => {
        this.pending = { taskId, resolve, reject };
        this.post({
          type: "task",
          moduleId: "gen4chainedsid",
          apiVersion: GEN4_CHAINED_SID_API_VERSION,
          taskId,
          operation: "searcher",
          chunkIndex: 0,
          request,
          chunk,
        });
      });
      if (
        batch.chunkIndex !== 0 ||
        batch.processedCount !== request.entries.length ||
        batch.buffer.byteLength !== batch.resultCount * 4
      )
        throw new Error("Gen4 chained SID Worker returned an invalid batch.");
      return {
        candidates: decodeGen4ChainedSidResults(batch.buffer),
        processedEntries: batch.processedCount,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: false,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          candidates: [],
          processedEntries: 0,
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", abort);
    }
  }

  cancel() {
    this.cancelled = true;
    this.reset(new Error("Gen4 chained SID calculation was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen4 chained SID Worker was disposed."));
  }

  private ensureWorker() {
    if (this.worker) return;
    this.worker = new Worker(
      new URL("./gen4chainedsid.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen4chainedsid" },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen4ChainedSidWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen4 chained SID Worker crashed."));
    this.post({
      type: "init",
      moduleId: "gen4chainedsid",
      moduleUrl: moduleUrl(),
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN4_CHAINED_SID_API_VERSION,
    });
  }

  private post(message: Gen4ChainedSidWorkerRequest) {
    this.worker?.postMessage(message);
  }

  private handle(message: Gen4ChainedSidWorkerResponse) {
    if (
      message.moduleId !== "gen4chainedsid" ||
      message.apiVersion !== GEN4_CHAINED_SID_API_VERSION
    ) {
      this.fail(new Error("Gen4 chained SID Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("searcher")
      ) {
        this.fail(new Error("Gen4 chained SID Worker capability mismatch."));
        return;
      }
      this.resolveReady?.();
      this.resolveReady = undefined;
      this.rejectReady = undefined;
      return;
    }
    if (message.type === "error") {
      this.fail(new Error(message.message));
      return;
    }
    if (!this.pending || this.pending.taskId !== message.taskId) {
      this.fail(
        new Error("Gen4 chained SID Worker returned an unknown batch."),
      );
      return;
    }
    const pending = this.pending;
    this.pending = undefined;
    pending.resolve(message);
  }

  private fail(error: Error) {
    this.rejectReady?.(error);
    this.resolveReady = undefined;
    this.rejectReady = undefined;
    this.pending?.reject(error);
    this.pending = undefined;
  }

  private reset(error: Error) {
    this.fail(error);
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
  }
}
