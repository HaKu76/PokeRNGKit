import {
  createGen3PokeSpotChunks,
  decodeGen3PokeSpotStates,
  GEN3_POKE_SPOT_API_VERSION,
  GEN3_POKE_SPOT_MAX_RESULTS,
  validateGen3PokeSpotRequest,
  type Gen3PokeSpotChunk,
  type Gen3PokeSpotRequest,
} from "../domain";
import type {
  Gen3PokeSpotEngine,
  Gen3PokeSpotOptions,
  Gen3PokeSpotSummary,
} from "../search";
import type {
  Gen3PokeSpotWorkerRequest,
  Gen3PokeSpotWorkerResponse,
} from "./messages";

type PokeSpotBatch = Extract<Gen3PokeSpotWorkerResponse, { type: "batch" }>;

interface PendingChunk {
  taskId: string;
  chunkIndex: number;
  resolve(message: PokeSpotBatch): void;
  reject(error: Error): void;
}

export function defaultGen3PokeSpotModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen3pokespot.mjs`,
    globalThis.location.href,
  ).href;
}

export function recommendedGen3PokeSpotWorkerCount() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

class Gen3PokeSpotWorkerClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: PendingChunk;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen3pokespot.worker.ts", import.meta.url),
      {
        type: "module",
        name: `pokerngkit-gen3pokespot-${index}`,
      },
    );
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen3PokeSpotWorkerResponse>) => this.handleMessage(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen3 PokeSpot Worker crashed."));
    this.post({ type: "init", moduleUrl });
  }

  async run(
    taskId: string,
    request: Gen3PokeSpotRequest,
    chunk: Gen3PokeSpotChunk,
  ) {
    await this.ready;
    if (this.pending)
      throw new Error("Gen3 PokeSpot Worker received overlapping chunks.");
    return new Promise<PokeSpotBatch>((resolve, reject) => {
      this.pending = { taskId, chunkIndex: chunk.index, resolve, reject };
      this.post({ type: "run", taskId, request, chunk });
    });
  }

  terminate() {
    this.fail(new Error("Gen3 PokeSpot Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Gen3PokeSpotWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handleMessage(message: Gen3PokeSpotWorkerResponse) {
    if (message.type === "ready") {
      if (message.apiVersion !== GEN3_POKE_SPOT_API_VERSION) {
        this.fail(new Error("Gen3 PokeSpot API version mismatch."));
      } else {
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
    if (
      !this.pending ||
      this.pending.taskId !== message.taskId ||
      this.pending.chunkIndex !== message.chunkIndex
    ) {
      this.fail(new Error("Gen3 PokeSpot Worker returned an unknown chunk."));
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

export class Gen3PokeSpotWorkerPool implements Gen3PokeSpotEngine {
  private clients: Gen3PokeSpotWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen3PokeSpotModuleUrl()) {}

  async search(
    request: Gen3PokeSpotRequest,
    options: Gen3PokeSpotOptions = {},
  ): Promise<Gen3PokeSpotSummary> {
    if (this.running)
      throw new Error("A Gen3 PokeSpot calculation is already running.");
    const errors = validateGen3PokeSpotRequest(request);
    if (errors.length)
      throw new RangeError(
        `Invalid Gen3 PokeSpot request: ${errors.join(", ")}`,
      );
    if (options.signal?.aborted) {
      const totalStates =
        (request.foodMaxAdvances + 1) * (request.encounterMaxAdvances + 1);
      return {
        processedStates: 0,
        totalStates,
        resultCount: 0,
        percent: 0,
        elapsedMs: 0,
        workerCount: 0,
        cancelled: true,
        resultLimitReached: false,
      };
    }

    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen3PokeSpotChunks(request);
    const totalStates =
      (request.foodMaxAdvances + 1) * (request.encounterMaxAdvances + 1);
    const requestedWorkerCount =
      options.workerCount ?? recommendedGen3PokeSpotWorkerCount();
    const workerCount = Math.min(
      Math.max(
        1,
        Number.isInteger(requestedWorkerCount) ? requestedWorkerCount : 1,
      ),
      8,
      chunks.length,
    );
    const maxResults = Math.max(
      1,
      Math.min(
        options.maxResults ?? GEN3_POKE_SPOT_MAX_RESULTS,
        GEN3_POKE_SPOT_MAX_RESULTS,
      ),
    );
    const taskId = crypto.randomUUID();
    const pendingBatches = new Map<number, PokeSpotBatch>();
    let nextChunk = 0;
    let nextBatch = 0;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;
    let stopped = cancelled;

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
        percent: (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return progress;
    };

    const flushBatches = () => {
      while (pendingBatches.has(nextBatch) && !stopped) {
        const batch = pendingBatches.get(nextBatch)!;
        pendingBatches.delete(nextBatch++);
        const states = decodeGen3PokeSpotStates(batch.buffer);
        if (states.length !== batch.resultCount)
          throw new RangeError(
            "Gen3 PokeSpot result count does not match the Worker response.",
          );
        const remaining = maxResults - resultCount;
        if (states.length > remaining) {
          options.onBatch?.(states.slice(0, Math.max(0, remaining)));
          resultCount = maxResults;
          resultLimitReached = true;
          stopped = true;
          this.resetClients();
          return;
        }
        resultCount += states.length;
        options.onBatch?.(states);
        if (
          batch.resultLimitReached ||
          (resultCount >= maxResults && nextBatch < chunks.length)
        ) {
          resultLimitReached = true;
          stopped = true;
          this.resetClients();
          return;
        }
      }
    };

    try {
      this.clients = Array.from(
        { length: workerCount },
        (_, index) => new Gen3PokeSpotWorkerClient(index, this.moduleUrl),
      );
      const work = async (client: Gen3PokeSpotWorkerClient) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.run(taskId, request, chunk);
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch);
            processedStates += batch.stateCount;
            flushBatches();
            report();
          } catch (error) {
            if (!cancelled && !stopped) throw error;
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
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.resetClients();
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

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
