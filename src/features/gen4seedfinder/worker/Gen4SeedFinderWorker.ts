import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen4SeedFinderResults,
  GEN4_SEED_FINDER_API_VERSION,
  gameToWasm,
  packGen4SeedFinderFilter,
  validateGen4SeedFinderRequest,
  type Gen4SeedFinderRequest,
} from "../domain";
import type { Gen4SeedFinderEngine, Gen4SeedFinderSummary } from "../search";
import type {
  Gen4SeedFinderWorkerRequest,
  Gen4SeedFinderWorkerResponse,
} from "./messages";

type Batch = Extract<Gen4SeedFinderWorkerResponse, { type: "batch" }>;

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen4seedfinder.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen4SeedFinderWorker implements Gen4SeedFinderEngine {
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
    request: Gen4SeedFinderRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<Gen4SeedFinderSummary> {
    if (this.running)
      throw new Error("A Gen IV Seed Finder search is already running.");
    if (validateGen4SeedFinderRequest(request).length)
      throw new RangeError("Invalid Gen IV Seed Finder request.");
    if (options.signal?.aborted)
      return { results: [], elapsedMs: 0, workerCount: 1, cancelled: true };
    this.cancelled = false;
    this.running = true;
    const startedAt = performance.now();
    const abort = () => this.cancel();
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      this.ensureWorker();
      await this.ready;
      const taskId = crypto.randomUUID();
      const batch = await new Promise<Batch>((resolve, reject) => {
        this.pending = { taskId, resolve, reject };
        this.post({
          type: "task",
          moduleId: "gen4seedfinder",
          apiVersion: GEN4_SEED_FINDER_API_VERSION,
          taskId,
          operation: "searcher",
          chunkIndex: 0,
          request,
          chunk: { index: 0, stateCount: 1 },
        });
      });
      if (
        batch.chunkIndex !== 0 ||
        batch.processedCount !== 1 ||
        batch.buffer.byteLength !== batch.resultCount * 40
      )
        throw new Error("Gen IV Seed Finder Worker returned an invalid batch.");
      const results = decodeGen4SeedFinderResults(batch.buffer);
      if (results.length !== batch.resultCount)
        throw new Error("Gen IV Seed Finder result count mismatch.");
      return {
        results,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: false,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          results: [],
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", abort);
      this.running = false;
    }
  }

  cancel() {
    this.cancelled = true;
    this.reset(new Error("Gen IV Seed Finder search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen IV Seed Finder Worker was disposed."));
  }

  private ensureWorker() {
    if (this.worker) return;
    this.worker = new Worker(
      new URL("./gen4seedfinder.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen4seedfinder" },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen4SeedFinderWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen IV Seed Finder Worker crashed."),
      );
    this.post({
      type: "init",
      moduleId: "gen4seedfinder",
      moduleUrl: moduleUrl(),
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN4_SEED_FINDER_API_VERSION,
    });
  }

  private post(message: Gen4SeedFinderWorkerRequest) {
    this.worker?.postMessage(message);
  }

  private handle(message: Gen4SeedFinderWorkerResponse) {
    if (
      message.moduleId !== "gen4seedfinder" ||
      message.apiVersion !== GEN4_SEED_FINDER_API_VERSION
    ) {
      this.fail(new Error("Gen IV Seed Finder Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("searcher")
      ) {
        this.fail(new Error("Gen IV Seed Finder Worker capability mismatch."));
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
        new Error("Gen IV Seed Finder Worker returned an unknown batch."),
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

export { gameToWasm, packGen4SeedFinderFilter };
