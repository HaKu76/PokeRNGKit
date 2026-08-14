import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen4AdvanceMatches,
  GEN4_ADVANCE_API_VERSION,
  gen4AdvanceChunk,
  validateGen4AdvanceRequest,
  type Gen4AdvanceRequest,
} from "../domain";
import type {
  Gen4AdvanceEngine,
  Gen4AdvanceOptions,
  Gen4AdvanceSummary,
} from "../search";
import type {
  Gen4AdvanceWorkerRequest,
  Gen4AdvanceWorkerResponse,
} from "./messages";

type Batch = Extract<Gen4AdvanceWorkerResponse, { type: "batch" }>;

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen4advance.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen4AdvanceWorker implements Gen4AdvanceEngine {
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
  private running = false;

  async search(
    request: Gen4AdvanceRequest,
    options: Gen4AdvanceOptions = {},
  ): Promise<Gen4AdvanceSummary> {
    if (this.running)
      throw new Error("A Gen4 Advance Finder search is already running.");
    if (validateGen4AdvanceRequest(request).length > 0)
      throw new RangeError("Invalid Gen4 Advance Finder request.");
    if (options.signal?.aborted) return this.cancelledSummary(request, 0);

    this.cancelled = false;
    this.running = true;
    const startedAt = performance.now();
    const abort = () => this.cancel();
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      this.ensureWorker();
      await this.ready;
      const taskId = crypto.randomUUID();
      const chunk = gen4AdvanceChunk(request);
      const batch = await new Promise<Batch>((resolve, reject) => {
        this.pending = { taskId, resolve, reject };
        this.post({
          type: "task",
          moduleId: "gen4advance",
          apiVersion: GEN4_ADVANCE_API_VERSION,
          taskId,
          operation: "searcher",
          chunkIndex: 0,
          request,
          chunk,
        });
      });
      if (
        batch.chunkIndex !== 0 ||
        batch.processedCount !== request.rows.length ||
        batch.buffer.byteLength !== batch.resultCount * 8
      )
        throw new Error(
          "Gen4 Advance Finder Worker returned an invalid batch.",
        );
      return {
        matches: decodeGen4AdvanceMatches(batch.buffer),
        rows: request.rows,
        processedRows: batch.processedCount,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: false,
      };
    } catch (error) {
      if (this.cancelled)
        return this.cancelledSummary(request, performance.now() - startedAt);
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", abort);
      this.running = false;
    }
  }

  cancel() {
    this.cancelled = true;
    this.reset(new Error("Gen4 Advance Finder search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen4 Advance Finder Worker was disposed."));
  }

  private cancelledSummary(
    request: Gen4AdvanceRequest,
    elapsedMs: number,
  ): Gen4AdvanceSummary {
    return {
      matches: [],
      rows: request.rows,
      processedRows: 0,
      elapsedMs,
      workerCount: 1,
      cancelled: true,
    };
  }

  private ensureWorker() {
    if (this.worker) return;
    this.worker = new Worker(
      new URL("./gen4advance.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen4advance" },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen4AdvanceWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen4 Advance Finder Worker crashed."),
      );
    this.post({
      type: "init",
      moduleId: "gen4advance",
      moduleUrl: moduleUrl(),
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN4_ADVANCE_API_VERSION,
    });
  }

  private post(message: Gen4AdvanceWorkerRequest) {
    this.worker?.postMessage(message);
  }

  private handle(message: Gen4AdvanceWorkerResponse) {
    if (
      message.moduleId !== "gen4advance" ||
      message.apiVersion !== GEN4_ADVANCE_API_VERSION
    ) {
      this.fail(new Error("Gen4 Advance Finder Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("searcher")
      ) {
        this.fail(new Error("Gen4 Advance Finder Worker capability mismatch."));
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
        new Error("Gen4 Advance Finder Worker returned an unknown batch."),
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
