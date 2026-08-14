import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  createGen4EventChunks,
  decodeGen4EventStates,
  GEN4_EVENT_API_VERSION,
  GEN4_EVENT_CHUNK_SIZE,
  GEN4_EVENT_MAX_RESULTS,
  type Gen4EventChunk,
  type Gen4EventGeneratorRequest,
  type Gen4EventSearcherChunk,
  type Gen4EventSearcherRequest,
} from "../domain";
import type {
  Gen4EventGeneratorEngine,
  Gen4EventGeneratorOptions,
  Gen4EventSummary,
} from "../search";
import type {
  Gen4EventWorkerRequest,
  Gen4EventWorkerResponse,
} from "./messages";

type Batch = Extract<Gen4EventWorkerResponse, { type: "batch" }>;

interface PendingChunk {
  taskId: string;
  resolve(value: Batch): void;
  reject(error: Error): void;
}

export class Gen4EventWorkerClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: PendingChunk;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen4event.worker.ts", import.meta.url),
      {
        type: "module",
        name: `pokerngkit-gen4event-${index}`,
      },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Gen4EventWorkerResponse>) =>
      this.handleMessage(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen4 event Worker crashed."));
    this.post({
      type: "init",
      moduleId: "gen4event",
      moduleUrl,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN4_EVENT_API_VERSION,
    });
  }

  async run(
    taskId: string,
    request: Gen4EventGeneratorRequest,
    chunk: Gen4EventChunk,
  ) {
    await this.ready;
    return this.request(taskId, {
      type: "task",
      moduleId: "gen4event",
      apiVersion: GEN4_EVENT_API_VERSION,
      taskId,
      operation: "generator",
      chunkIndex: chunk.index,
      request,
      chunk,
    });
  }

  async search(
    taskId: string,
    request: Gen4EventSearcherRequest,
    chunk: Gen4EventSearcherChunk,
  ) {
    await this.ready;
    return this.request(taskId, {
      type: "task",
      moduleId: "gen4event",
      apiVersion: GEN4_EVENT_API_VERSION,
      taskId,
      operation: "searcher",
      chunkIndex: chunk.index,
      request,
      chunk,
    });
  }

  terminate() {
    this.fail(new Error("Gen4 event Worker was terminated."));
    this.worker.terminate();
  }

  private request(taskId: string, message: Gen4EventWorkerRequest) {
    if (this.pending)
      throw new Error("Gen4 event Worker received overlapping chunks.");
    return new Promise<Batch>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post(message);
    });
  }

  private post(message: Gen4EventWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handleMessage(message: Gen4EventWorkerResponse) {
    if (
      message.moduleId !== "gen4event" ||
      message.apiVersion !== GEN4_EVENT_API_VERSION
    ) {
      this.fail(new Error("Gen4 event Worker response contract mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator") ||
        !message.operations.includes("searcher")
      ) {
        this.fail(new Error("Gen4 event Worker capabilities mismatch."));
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
      this.fail(new Error("Gen4 event Worker returned an unknown batch."));
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

export function defaultGen4EventModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen4event.mjs`,
    globalThis.location.href,
  ).href;
}

export function recommendedGen4EventWorkerCount() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

export class Gen4EventWorkerPool implements Gen4EventGeneratorEngine {
  private clients: Gen4EventWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen4EventModuleUrl()) {}

  async search(
    request: Gen4EventGeneratorRequest,
    options: Gen4EventGeneratorOptions = {},
  ): Promise<Gen4EventSummary> {
    if (this.running)
      throw new Error("A Gen4 event calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen4EventChunks(
      request,
      options.chunkSize ?? GEN4_EVENT_CHUNK_SIZE,
    );
    const totalStates = request.maxAdvances + 1;
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen4EventWorkerCount(),
      chunks.length,
    );
    const maxResults = Math.min(
      options.maxResults ?? GEN4_EVENT_MAX_RESULTS,
      GEN4_EVENT_MAX_RESULTS,
    );
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
        const states = decodeGen4EventStates(pendingBatches.get(nextBatch)!);
        pendingBatches.delete(nextBatch++);
        const visible = states.slice(0, Math.max(0, maxResults - resultCount));
        if (visible.length > 0) options.onBatch?.(visible);
        resultCount += visible.length;
        if (visible.length < states.length) {
          resultLimitReached = true;
          stopped = true;
          return;
        }
        if (resultCount >= maxResults) {
          resultLimitReached = true;
          stopped = true;
          return;
        }
      }
    };

    try {
      this.ensureClients(workerCount);
      const work = async (client: Gen4EventWorkerClient) => {
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
      (_, index) => new Gen4EventWorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
