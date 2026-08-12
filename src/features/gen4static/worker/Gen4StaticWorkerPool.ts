import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  createGen4StaticChunks,
  decodeGen4StaticStates,
  GEN4_STATIC_API_VERSION,
  GEN4_STATIC_CHUNK_SIZE,
  GEN4_STATIC_MAX_RESULTS,
  type Gen4StaticChunk,
  type Gen4StaticGeneratorRequest,
  type Gen4StaticSearcherChunk,
  type Gen4StaticSearcherRequest,
} from "../domain";
import type {
  Gen4StaticEngine,
  Gen4StaticOptions,
  Gen4StaticSummary,
} from "../search";
import type {
  Gen4StaticWorkerRequest,
  Gen4StaticWorkerResponse,
} from "./messages";

type Batch = Extract<Gen4StaticWorkerResponse, { type: "batch" }>;

interface PendingChunk {
  taskId: string;
  resolve(value: Batch): void;
  reject(error: Error): void;
}

export class Gen4StaticWorkerClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: PendingChunk;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen4static.worker.ts", import.meta.url),
      { type: "module", name: `pokerngkit-gen4static-${index}` },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen4StaticWorkerResponse>) => this.handleMessage(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen4 static Worker crashed."));
    this.post({
      type: "init",
      moduleId: "gen4static",
      moduleUrl,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN4_STATIC_API_VERSION,
    });
  }

  async run(
    taskId: string,
    request: Gen4StaticGeneratorRequest,
    chunk: Gen4StaticChunk,
  ) {
    await this.ready;
    return this.request(taskId, {
      type: "task",
      moduleId: "gen4static",
      apiVersion: GEN4_STATIC_API_VERSION,
      taskId,
      operation: "generator",
      chunkIndex: chunk.index,
      request,
      chunk,
    });
  }

  async search(
    taskId: string,
    request: Gen4StaticSearcherRequest,
    chunk: Gen4StaticSearcherChunk,
  ) {
    await this.ready;
    return this.request(taskId, {
      type: "task",
      moduleId: "gen4static",
      apiVersion: GEN4_STATIC_API_VERSION,
      taskId,
      operation: "searcher",
      chunkIndex: chunk.index,
      request,
      chunk,
    });
  }

  terminate() {
    this.fail(new Error("Gen4 static Worker was terminated."));
    this.worker.terminate();
  }

  private request(taskId: string, message: Gen4StaticWorkerRequest) {
    if (this.pending) {
      throw new Error("Gen4 static Worker received overlapping chunks.");
    }
    return new Promise<Batch>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post(message);
    });
  }

  private post(message: Gen4StaticWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handleMessage(message: Gen4StaticWorkerResponse) {
    if (
      message.moduleId !== "gen4static" ||
      message.apiVersion !== GEN4_STATIC_API_VERSION
    ) {
      this.fail(new Error("Gen4 static Worker response contract mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator") ||
        !message.operations.includes("searcher")
      ) {
        this.fail(new Error("Gen4 static Worker capabilities mismatch."));
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
    if (
      !this.pending ||
      this.pending.taskId !== message.taskId ||
      (message.operation !== "generator" && message.operation !== "searcher")
    ) {
      this.fail(new Error("Gen4 static Worker returned an unknown batch."));
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

export function defaultGen4StaticModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen4static.mjs`,
    globalThis.location.href,
  ).href;
}

export function recommendedGen4StaticWorkerCount() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

export class Gen4StaticWorkerPool implements Gen4StaticEngine {
  private clients: Gen4StaticWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen4StaticModuleUrl()) {}

  async search(
    request: Gen4StaticGeneratorRequest,
    options: Gen4StaticOptions = {},
  ): Promise<Gen4StaticSummary> {
    if (this.running) {
      throw new Error("A Gen4 static calculation is already running.");
    }
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen4StaticChunks(
      request,
      options.chunkSize ?? GEN4_STATIC_CHUNK_SIZE,
    );
    const totalStates = request.maxAdvances + 1;
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen4StaticWorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN4_STATIC_MAX_RESULTS;
    const taskId = crypto.randomUUID();
    const pendingBatches = new Map<number, ArrayBuffer>();
    let nextChunk = 0;
    let nextBatch = 0;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = false;
    let resultLimitReached = false;
    let stopped = false;

    const cancel = () => {
      if (stopped) return;
      cancelled = true;
      stopped = true;
      this.resetClients();
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

    const flushBatches = () => {
      while (pendingBatches.has(nextBatch)) {
        const states = decodeGen4StaticStates(pendingBatches.get(nextBatch)!);
        pendingBatches.delete(nextBatch++);
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
      this.ensureClients(workerCount);
      const work = async (client: Gen4StaticWorkerClient) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.run(taskId, request, chunk);
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.processedCount;
            flushBatches();
            report();
          } catch (error) {
            if (!cancelled) throw error;
          }
        }
      };
      await Promise.all(this.clients.slice(0, workerCount).map(work));
      flushBatches();
      return {
        ...report(),
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled,
        resultLimitReached,
      };
    } catch (error) {
      if (!cancelled) this.resetClients();
      throw error;
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
    this.resetClients();
  }

  private ensureClients(count: number) {
    if (this.clients.length === count) return;
    this.resetClients();
    this.clients = Array.from(
      { length: count },
      (_, index) => new Gen4StaticWorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
