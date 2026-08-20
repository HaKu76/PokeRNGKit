import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen4SwarmAdvances,
  decodeGen4SwarmSeed,
  gen4SwarmChunk,
  validateGen4SwarmRequest,
  GEN4_SWARM_API_VERSION,
  type Gen4SwarmRequest,
} from "../domain";
import type {
  Gen4SwarmEngine,
  Gen4SwarmOptions,
  Gen4SwarmSummary,
} from "../search";
import type {
  Gen4SwarmWorkerRequest,
  Gen4SwarmWorkerResponse,
} from "./messages";

type Batch = Extract<Gen4SwarmWorkerResponse, { type: "batch" }>;

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen4swarm.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen4SwarmWorker implements Gen4SwarmEngine {
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
    request: Gen4SwarmRequest,
    options: Gen4SwarmOptions = {},
  ): Promise<Gen4SwarmSummary> {
    if (this.running)
      throw new Error("A Gen IV Swarm search is already running.");
    if (validateGen4SwarmRequest(request).length > 0)
      throw new RangeError("Invalid Gen IV Swarm request.");
    if (options.signal?.aborted) return this.cancelledSummary(request);
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
          moduleId: "gen4swarm",
          apiVersion: GEN4_SWARM_API_VERSION,
          taskId,
          operation: "searcher",
          chunkIndex: 0,
          request,
          chunk: gen4SwarmChunk(),
        });
      });
      if (
        batch.chunkIndex !== 0 ||
        batch.processedCount !== 1 ||
        batch.buffer.byteLength !==
          batch.resultCount * (request.mode === "advances" ? 8 : 16)
      )
        throw new Error("Gen IV Swarm Worker returned an invalid batch.");
      return {
        mode: request.mode,
        advances:
          request.mode === "advances"
            ? decodeGen4SwarmAdvances(batch.buffer)
            : [],
        seeds: request.mode === "seed" ? decodeGen4SwarmSeed(batch.buffer) : [],
        processedCount: batch.processedCount,
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
    this.reset(new Error("Gen IV Swarm search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen IV Swarm Worker was disposed."));
  }

  private cancelledSummary(
    request: Gen4SwarmRequest,
    elapsedMs = 0,
  ): Gen4SwarmSummary {
    return {
      mode: request.mode,
      advances: [],
      seeds: [],
      processedCount: 0,
      elapsedMs,
      workerCount: 1,
      cancelled: true,
    };
  }

  private ensureWorker() {
    if (this.worker) return;
    this.worker = new Worker(
      new URL("./gen4swarm.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen4swarm" },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Gen4SwarmWorkerResponse>) =>
      this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen IV Swarm Worker crashed."));
    this.post({
      type: "init",
      moduleId: "gen4swarm",
      moduleUrl: moduleUrl(),
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN4_SWARM_API_VERSION,
    });
  }

  private post(message: Gen4SwarmWorkerRequest) {
    this.worker?.postMessage(message);
  }

  private handle(message: Gen4SwarmWorkerResponse) {
    if (
      message.moduleId !== "gen4swarm" ||
      message.apiVersion !== GEN4_SWARM_API_VERSION
    ) {
      this.fail(new Error("Gen IV Swarm Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("searcher")
      ) {
        this.fail(new Error("Gen IV Swarm Worker capability mismatch."));
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
      this.fail(new Error("Gen IV Swarm Worker returned an unknown batch."));
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
