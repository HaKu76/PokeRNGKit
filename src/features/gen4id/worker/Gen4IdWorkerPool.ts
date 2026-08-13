import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  createGen4IdChunks,
  decodeGen4IdStates,
  GEN4_ID_API_VERSION,
  GEN4_ID_MAX_RESULTS,
  gen4IdTotalStates,
  type Gen4IdChunk,
  type Gen4IdRequest,
} from "../domain";
import type { Gen4IdEngine, Gen4IdOptions, Gen4IdSummary } from "../search";
import type { Gen4IdWorkerRequest, Gen4IdWorkerResponse } from "./messages";

type Batch = Extract<Gen4IdWorkerResponse, { type: "batch" }>;

class Client {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: {
    taskId: string;
    resolve(value: Batch): void;
    reject(error: Error): void;
  };
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(new URL("./gen4id.worker.ts", import.meta.url), {
      type: "module",
      name: `pokerngkit-gen4id-${index}`,
    });
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Gen4IdWorkerResponse>) =>
      this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen4 ID Worker crashed."));
    this.post({
      type: "init",
      moduleId: "gen4id",
      moduleUrl,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN4_ID_API_VERSION,
    });
  }

  async run(taskId: string, request: Gen4IdRequest, chunk: Gen4IdChunk) {
    await this.ready;
    return new Promise<Batch>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({
        type: "task",
        moduleId: "gen4id",
        apiVersion: GEN4_ID_API_VERSION,
        taskId,
        operation: request.operation,
        chunkIndex: chunk.index,
        request,
        chunk,
      });
    });
  }

  terminate() {
    this.fail(new Error("Gen4 ID Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Gen4IdWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handle(message: Gen4IdWorkerResponse) {
    if (
      message.moduleId !== "gen4id" ||
      message.apiVersion !== GEN4_ID_API_VERSION
    ) {
      this.fail(new Error("Gen4 ID Worker response contract mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator") ||
        !message.operations.includes("searcher")
      ) {
        this.fail(new Error("Gen4 ID Worker capability mismatch."));
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
      this.fail(new Error("Gen4 ID Worker returned an unknown batch."));
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
}

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen4id.mjs`,
    globalThis.location.href,
  ).href;
}

function recommendedWorkers() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

export class Gen4IdWorkerPool implements Gen4IdEngine {
  private clients: Client[] = [];
  private running = false;
  private cancelActive?: () => void;

  async search(
    request: Gen4IdRequest,
    options: Gen4IdOptions = {},
  ): Promise<Gen4IdSummary> {
    if (this.running)
      throw new Error("A Gen4 ID calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen4IdChunks(request);
    const totalStates = gen4IdTotalStates(request);
    const count = Math.min(
      8,
      options.workerCount ?? recommendedWorkers(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN4_ID_MAX_RESULTS;
    const taskId = crypto.randomUUID();
    const pending = new Map<number, ArrayBuffer>();
    let nextChunk = 0;
    let nextBatch = 0;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = false;
    let resultLimitReached = false;
    let stopped = false;
    const cancel = () => {
      if (stopped) return;
      stopped = true;
      cancelled = true;
      this.reset();
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = () => {
      const progress = {
        processedStates,
        totalStates,
        resultCount,
        percent:
          totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return progress;
    };
    const flush = () => {
      while (pending.has(nextBatch)) {
        const states = decodeGen4IdStates(pending.get(nextBatch)!);
        pending.delete(nextBatch++);
        const remaining = maxResults - resultCount;
        if (states.length > remaining) {
          options.onBatch?.(states.slice(0, Math.max(0, remaining)));
          resultCount = maxResults;
          resultLimitReached = true;
          stopped = true;
          return;
        }
        resultCount += states.length;
        options.onBatch?.(states);
      }
    };
    try {
      this.ensure(count);
      const work = async (client: Client) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.run(taskId, request, chunk);
            if (stopped) return;
            if (
              batch.chunkIndex !== chunk.index ||
              batch.processedCount !== chunk.stateCount ||
              batch.buffer.byteLength !== batch.resultCount * 24
            )
              throw new Error("Gen4 ID Worker returned an invalid batch.");
            pending.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.processedCount;
            flush();
            report();
          } catch (error) {
            if (!cancelled) throw error;
          }
        }
      };
      await Promise.all(this.clients.slice(0, count).map(work));
      flush();
      return {
        ...report(),
        elapsedMs: performance.now() - startedAt,
        workerCount: count,
        cancelled,
        resultLimitReached,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.cancelActive = undefined;
      this.running = false;
    }
  }

  cancel() {
    this.cancelActive?.();
  }
  dispose() {
    this.reset();
  }
  private ensure(count: number) {
    if (this.clients.length === count) return;
    this.reset();
    this.clients = Array.from(
      { length: count },
      (_, index) => new Client(index, moduleUrl()),
    );
  }
  private reset() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
