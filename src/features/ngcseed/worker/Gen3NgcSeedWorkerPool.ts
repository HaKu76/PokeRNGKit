import {
  decodeGen3NgcSeedStates,
  GEN3_NGC_SEED_API_VERSION,
  validateGen3NgcSeedRequest,
  type Gen3NgcSeedRequest,
  type Gen3NgcSeedState,
} from "../domain";
import type {
  Gen3NgcSeedSearchEngine,
  Gen3NgcSeedSearchOptions,
  Gen3NgcSeedSearchSummary,
} from "../search";
import type {
  Gen3NgcSeedWorkerBatchMessage,
  Gen3NgcSeedWorkerRequest,
  Gen3NgcSeedWorkerResponse,
} from "./messages";

interface Chunk {
  index: number;
  rangeStart: number;
  stateCount: number;
}

class Client {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: {
    taskId: string;
    resolve(message: Gen3NgcSeedWorkerBatchMessage): void;
    reject(error: Error): void;
  };
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen3ngcseed.worker.ts", import.meta.url),
      { type: "module", name: `pokerngkit-gen3ngcseed-${index}` },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen3NgcSeedWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "NGC Seed Worker crashed."));
    this.post({ type: "init", moduleUrl });
  }

  async run(taskId: string, request: Gen3NgcSeedRequest, chunk: Chunk) {
    await this.ready;
    if (this.pending)
      throw new Error("NGC Seed Worker received an overlapping chunk.");
    return new Promise<Gen3NgcSeedWorkerBatchMessage>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      const chunkSeeds = request.seeds
        ? request.seeds instanceof Uint32Array
          ? request.seeds.slice(
              chunk.rangeStart,
              chunk.rangeStart + chunk.stateCount,
            )
          : Uint32Array.from(
              request.seeds.slice(
                chunk.rangeStart,
                chunk.rangeStart + chunk.stateCount,
              ),
            )
        : undefined;
      this.post(
        {
          type: "run",
          taskId,
          request: chunkSeeds ? { ...request, seeds: chunkSeeds } : request,
          chunkIndex: chunk.index,
          rangeStart: chunk.rangeStart,
          stateCount: chunk.stateCount,
        },
        chunkSeeds ? [chunkSeeds.buffer] : [],
      );
    });
  }

  terminate() {
    this.fail(new Error("NGC Seed Worker was terminated."));
    this.worker.terminate();
  }

  private post(
    message: Gen3NgcSeedWorkerRequest,
    transfer: Transferable[] = [],
  ) {
    this.worker.postMessage(message, transfer);
  }

  private handle(message: Gen3NgcSeedWorkerResponse) {
    if (message.type === "ready") {
      if (message.apiVersion !== GEN3_NGC_SEED_API_VERSION)
        this.fail(new Error("NGC Seed API version mismatch."));
      else {
        this.resolveReady?.();
        this.resolveReady = undefined;
        this.rejectReady = undefined;
      }
      return;
    }
    if (message.type === "error") {
      this.fail(new Error(message.message));
      return;
    }
    if (!this.pending || this.pending.taskId !== message.taskId) {
      this.fail(new Error("NGC Seed Worker returned an unknown task."));
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

function recommendedWorkerCount() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

export function defaultGen3NgcSeedModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen3ngcseed.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen3NgcSeedWorkerPool implements Gen3NgcSeedSearchEngine {
  private clients: Client[] = [];
  private cancelActive?: () => void;
  private running = false;

  constructor(private readonly moduleUrl = defaultGen3NgcSeedModuleUrl()) {}

  async search(
    request: Gen3NgcSeedRequest,
    options: Gen3NgcSeedSearchOptions = {},
  ): Promise<Gen3NgcSeedSearchSummary> {
    if (this.running) throw new Error("An NGC Seed search is already running.");
    if (validateGen3NgcSeedRequest(request).length > 0)
      throw new RangeError("Invalid NGC Seed search request.");
    if (request.seeds && request.seeds.length === 0) {
      const progress = { processed: 0, total: 0, resultCount: 0, percent: 100 };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: 0,
        workerCount: 0,
        cancelled: false,
      };
    }
    this.running = true;
    const startedAt = performance.now();
    const taskId = crypto.randomUUID();
    const initialSearch = !request.seeds?.length;
    const total = initialSearch
      ? request.mode === "channel"
        ? 0xbffffffe
        : 0x1_0000
      : request.seeds!.length;
    const recommendedCount = recommendedWorkerCount();
    const chunks = this.createChunks(request, total);
    const workerCount = Math.min(recommendedCount, chunks.length);
    const pending = new Map<number, Gen3NgcSeedState[]>();
    let nextChunk = 0;
    let nextBatch = 0;
    let processed = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;

    const cancel = () => {
      cancelled = true;
      this.resetClients();
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = () => {
      const progress = {
        processed,
        total,
        resultCount,
        percent: total === 0 ? 100 : (processed / total) * 100,
      };
      options.onProgress?.(progress);
      return progress;
    };
    const flush = () => {
      while (pending.has(nextBatch)) {
        const states = pending.get(nextBatch)!;
        pending.delete(nextBatch++);
        resultCount += states.length;
        options.onBatch?.(states);
      }
    };

    try {
      if (cancelled)
        return {
          ...report(),
          elapsedMs: 0,
          workerCount: 0,
          cancelled: true,
        };
      await this.ensureClients(workerCount);
      const work = async (client: Client) => {
        while (!cancelled) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          const batch = await client.run(taskId, request, chunk);
          if (cancelled) return;
          if (
            batch.chunkIndex !== chunk.index ||
            batch.processed !== chunk.stateCount ||
            batch.total !== chunk.stateCount ||
            pending.has(batch.chunkIndex)
          )
            throw new Error("NGC Seed Worker returned an invalid batch.");
          const states = decodeGen3NgcSeedStates(batch.buffer);
          if (states.length !== batch.resultCount)
            throw new Error(
              "NGC Seed Worker returned an invalid result count.",
            );
          pending.set(batch.chunkIndex, states);
          processed += batch.processed;
          flush();
          report();
        }
      };
      await Promise.all(this.clients.map(work));
      flush();
      return {
        ...report(),
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled,
      };
    } catch (error) {
      if (!cancelled) {
        this.resetClients();
        throw error;
      }
      return {
        ...report(),
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled: true,
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
    this.resetClients();
  }

  private createChunks(request: Gen3NgcSeedRequest, total: number): Chunk[] {
    const chunkSize = request.seeds?.length
      ? 50_000
      : request.mode === "channel"
        ? 2_000_000
        : 256;
    const chunkCount = Math.ceil(total / chunkSize);
    let start =
      request.seeds?.length || request.mode !== "channel" ? 0 : 0x40000001;
    return Array.from({ length: chunkCount }, (_, index) => {
      const stateCount = Math.min(chunkSize, total - index * chunkSize);
      const chunk = { index, rangeStart: start, stateCount };
      start += stateCount;
      return chunk;
    });
  }

  private async ensureClients(count: number) {
    if (this.clients.length === count) return;
    this.resetClients();
    this.clients = Array.from(
      { length: count },
      (_, index) => new Client(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
