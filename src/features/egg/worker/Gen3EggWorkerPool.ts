import {
  createGen3EggChunks,
  decodeGen3EggStates,
  GEN3_EGG_HELD_CHUNK_SIZE,
  GEN3_EGG_MAX_RESULTS,
  type Gen3EggChunk,
  type Gen3EggRequest,
} from "../domain";
import type {
  Gen3EggSearchEngine,
  Gen3EggSearchOptions,
  Gen3EggSearchSummary,
} from "../search";
import type {
  Gen3EggWorkerBatchMessage,
  Gen3EggWorkerRequest,
  Gen3EggWorkerResponse,
} from "./messages";

interface PendingChunk {
  taskId: string;
  resolve(message: Gen3EggWorkerBatchMessage): void;
  reject(error: Error): void;
}

class Gen3EggWorkerClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: PendingChunk;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(new URL("./gen3egg.worker.ts", import.meta.url), {
      type: "module",
      name: `pokerngkit-gen3egg-${index}`,
    });
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Gen3EggWorkerResponse>) =>
      this.handleMessage(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen3 egg Worker crashed."));
    this.post({ type: "init", moduleUrl });
  }

  async run(taskId: string, request: Gen3EggRequest, chunk: Gen3EggChunk) {
    await this.ready;
    if (this.pending) throw new Error("Gen3 egg Worker received overlapping chunks.");
    return new Promise<Gen3EggWorkerBatchMessage>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({ type: "run", taskId, request, chunk });
    });
  }

  terminate() {
    this.fail(new Error("Gen3 egg Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Gen3EggWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handleMessage(message: Gen3EggWorkerResponse) {
    if (message.type === "ready") {
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
      this.fail(new Error("Gen3 egg Worker returned a batch for an unknown task."));
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

function recommendedGen3EggWorkerCount() {
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  return Math.max(1, Math.min(8, hardwareConcurrency - 1));
}

function defaultGen3EggModuleUrl() {
  return new URL(`${import.meta.env.BASE_URL}wasm/gen3egg.mjs`, globalThis.location.href).href;
}

export class Gen3EggWorkerPool implements Gen3EggSearchEngine {
  private clients: Gen3EggWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen3EggModuleUrl()) {}

  async search(
    request: Gen3EggRequest,
    options: Gen3EggSearchOptions = {},
  ): Promise<Gen3EggSearchSummary> {
    if (this.running) throw new Error("A Gen3 egg calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen3EggChunks(request, options.chunkSize ?? GEN3_EGG_HELD_CHUNK_SIZE);
    const totalStates =
      (request.maxAdvancesHeld + 1) *
      (request.maxAdvancesPickup + 1) *
      (request.game === "emerald"
        ? request.maxRedraws - request.minRedraws + 1
        : 1);
    const workerCount = Math.min(options.workerCount ?? recommendedGen3EggWorkerCount(), chunks.length);
    const maxResults = options.maxResults ?? GEN3_EGG_MAX_RESULTS;
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
        percent: totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return progress;
    };
    const flush = () => {
      while (pendingBatches.has(nextBatch)) {
        const states = decodeGen3EggStates(pendingBatches.get(nextBatch)!);
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
      await this.ensureClients(workerCount);
      const work = async (client: Gen3EggWorkerClient) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.run(taskId, request, chunk);
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch.buffer);
            processedStates +=
              batch.stateCount *
              (request.maxAdvancesPickup + 1) *
              (request.game === "emerald"
                ? request.maxRedraws - request.minRedraws + 1
                : 1);
            resultLimitReached ||= batch.truncated;
            flush();
            report();
          } catch (error) {
            if (!cancelled) throw error;
          }
        }
      };
      await Promise.all(this.clients.slice(0, workerCount).map(work));
      flush();
      const progress = report();
      return {
        ...progress,
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

  private async ensureClients(count: number) {
    if (this.clients.length === count) return;
    this.resetClients();
    this.clients = Array.from({ length: count }, (_, index) => new Gen3EggWorkerClient(index, this.moduleUrl));
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
