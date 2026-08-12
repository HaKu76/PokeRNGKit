import {
  createGen3InitialSeedTargetChunk,
  decodeGen3InitialSeedStates,
  GEN3_INITIAL_SEED_MAX_TOTAL_STATES,
  GEN3_INITIAL_SEED_TARGET_CHUNK_SIZE,
  type Gen3InitialSeedChunk,
  type Gen3RsInitialSeedRequest,
  type Gen3TargetInitialSeedRequest,
} from "../domain";
import type {
  Gen3InitialSeedSearchOptions,
  Gen3InitialSeedSearchProgress,
  Gen3InitialSeedSearchSummary,
} from "../search";
import type {
  Gen3InitialSeedWorkerBatchMessage,
  Gen3InitialSeedWorkerRequest,
  Gen3InitialSeedWorkerResponse,
} from "./messages";

interface PendingChunk {
  taskId: string;
  resolve(message: Gen3InitialSeedWorkerBatchMessage): void;
  reject(error: Error): void;
}

export class Gen3InitialSeedWorkerClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: PendingChunk;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen3initialseed.worker.ts", import.meta.url),
      {
        type: "module",
        name: `pokerngkit-gen3initialseed-${index}`,
      },
    );
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen3InitialSeedWorkerResponse>) => this.handleMessage(data);
    this.worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen3 initial seed Worker crashed."),
      );
    this.post({ type: "init", moduleUrl });
  }

  async findRsIds(
    taskId: string,
    request: Gen3RsInitialSeedRequest,
  ): Promise<Gen3InitialSeedWorkerBatchMessage> {
    return this.run({ type: "rs-ids", taskId, request });
  }

  async findTarget(
    taskId: string,
    request: Gen3TargetInitialSeedRequest,
    chunk: Gen3InitialSeedChunk,
  ): Promise<Gen3InitialSeedWorkerBatchMessage> {
    return this.run({ type: "target", taskId, request, chunk });
  }

  terminate() {
    this.fail(new Error("Gen3 initial seed Worker was terminated."));
    this.worker.terminate();
  }

  private async run(
    message: Exclude<Gen3InitialSeedWorkerRequest, { type: "init" }>,
  ): Promise<Gen3InitialSeedWorkerBatchMessage> {
    await this.ready;
    if (this.pending) {
      throw new Error("Gen3 initial seed Worker received overlapping chunks.");
    }
    return new Promise((resolve, reject) => {
      this.pending = { taskId: message.taskId, resolve, reject };
      this.post(message);
    });
  }

  private post(message: Gen3InitialSeedWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handleMessage(message: Gen3InitialSeedWorkerResponse) {
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
      this.fail(
        new Error(
          "Gen3 initial seed Worker returned a batch for an unknown task.",
        ),
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
}

export function recommendedGen3InitialSeedWorkerCount(): number {
  const hardwareConcurrency = navigator.hardwareConcurrency || 2;
  return Math.max(1, Math.min(8, hardwareConcurrency - 1));
}

export function defaultGen3InitialSeedModuleUrl(): string {
  const relative = `${import.meta.env.BASE_URL}wasm/gen3initialseed.mjs`;
  return new URL(relative, globalThis.location.href).href;
}

export class Gen3InitialSeedWorkerPool {
  private clients: Gen3InitialSeedWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen3InitialSeedModuleUrl()) {}

  async findRsIds(
    request: Gen3RsInitialSeedRequest,
    options: Gen3InitialSeedSearchOptions = {},
  ): Promise<Gen3InitialSeedSearchSummary> {
    if (this.running) {
      throw new Error("A Gen3 initial seed calculation is already running.");
    }
    this.running = true;
    const startedAt = performance.now();
    const taskId = crypto.randomUUID();
    let cancelled = false;
    let stopped = false;
    let resultCount = 0;

    const cancel = () => {
      if (stopped) return;
      cancelled = true;
      stopped = true;
      this.resetClients();
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });

    try {
      await this.ensureClients(1);
      const batch = await this.clients[0].findRsIds(taskId, request);
      if (!stopped) {
        const states = decodeGen3InitialSeedStates(batch.buffer);
        resultCount = states.length;
        options.onBatch?.(states);
      }
      const progress = this.report(
        stopped ? 0 : 0x1_0000,
        0x1_0000,
        resultCount,
        options,
      );
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled,
        resultLimitReached: false,
      };
    } catch (error) {
      if (!cancelled) {
        this.resetClients();
        throw error;
      }
      const progress = this.report(0, 0x1_0000, resultCount, options);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: true,
        resultLimitReached: false,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.cancelActive = undefined;
      this.running = false;
    }
  }

  async findTarget(
    request: Gen3TargetInitialSeedRequest,
    options: Gen3InitialSeedSearchOptions = {},
  ): Promise<Gen3InitialSeedSearchSummary> {
    if (this.running) {
      throw new Error("A Gen3 initial seed calculation is already running.");
    }
    this.running = true;
    const startedAt = performance.now();
    const workerCount =
      options.workerCount ?? recommendedGen3InitialSeedWorkerCount();
    const chunkSize = options.chunkSize ?? GEN3_INITIAL_SEED_TARGET_CHUNK_SIZE;
    const taskId = crypto.randomUUID();
    const pendingBatches = new Map<number, ArrayBuffer>();
    let nextStartAdvance = 0;
    let nextChunkIndex = 0;
    let nextBatchIndex = 0;
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

    const report = () =>
      this.report(
        processedStates,
        GEN3_INITIAL_SEED_MAX_TOTAL_STATES,
        resultCount,
        options,
      );
    const flushBatches = () => {
      while (pendingBatches.has(nextBatchIndex)) {
        const states = decodeGen3InitialSeedStates(
          pendingBatches.get(nextBatchIndex)!,
        );
        pendingBatches.delete(nextBatchIndex);
        nextBatchIndex++;
        const remaining = request.maxResults - resultCount;
        if (states.length >= remaining) {
          const displayed = states.slice(0, Math.max(0, remaining));
          resultCount += displayed.length;
          options.onBatch?.(displayed);
          resultLimitReached = true;
          stopped = true;
          this.resetClients();
          return;
        }
        resultCount += states.length;
        options.onBatch?.(states);
      }
    };
    const nextChunk = () => {
      const chunk = createGen3InitialSeedTargetChunk(
        nextChunkIndex,
        nextStartAdvance,
        chunkSize,
      );
      if (!chunk) return undefined;
      nextChunkIndex++;
      nextStartAdvance += chunk.stateCount;
      return chunk;
    };

    try {
      await this.ensureClients(workerCount);
      const work = async (client: Gen3InitialSeedWorkerClient) => {
        while (!stopped) {
          const chunk = nextChunk();
          if (!chunk) return;
          try {
            const batch = await client.findTarget(taskId, request, chunk);
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.stateCount;
            flushBatches();
            report();
          } catch (error) {
            if (!cancelled && !resultLimitReached) throw error;
          }
        }
      };
      await Promise.all(this.clients.map(work));
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

  private report(
    processedStates: number,
    totalStates: number,
    resultCount: number,
    options: Gen3InitialSeedSearchOptions,
  ): Gen3InitialSeedSearchProgress {
    const progress = {
      processedStates,
      totalStates,
      resultCount,
      percent: totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
    };
    options.onProgress?.(progress);
    return progress;
  }

  private async ensureClients(count: number) {
    if (this.clients.length === count) return;
    this.resetClients();
    this.clients = Array.from(
      { length: count },
      (_, index) => new Gen3InitialSeedWorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
