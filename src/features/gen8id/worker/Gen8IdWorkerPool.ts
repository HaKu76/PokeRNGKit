import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  createGen8IdChunks,
  decodeGen8IdStates,
  GEN8_ID_API_VERSION,
  GEN8_ID_CHUNK_SIZE,
  GEN8_ID_MAX_RESULTS,
  validateGen8IdRequest,
  type Gen8IdChunk,
  type Gen8IdRequest,
} from "../domain";
import type { Gen8IdEngine, Gen8IdOptions, Gen8IdSummary } from "../search";
import type { Gen8IdWorkerRequest, Gen8IdWorkerResponse } from "./messages";

type Batch = Extract<Gen8IdWorkerResponse, { type: "batch" }>;

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
    this.worker = new Worker(new URL("./gen8id.worker.ts", import.meta.url), {
      type: "module",
      name: `pokerngkit-gen8id-${index}`,
    });
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Gen8IdWorkerResponse>) =>
      this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen8 ID Worker crashed."));
    this.post({
      type: "init",
      moduleId: "gen8id",
      moduleUrl,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN8_ID_API_VERSION,
    });
  }

  async run(taskId: string, request: Gen8IdRequest, chunk: Gen8IdChunk) {
    await this.ready;
    return new Promise<Batch>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({
        type: "task",
        moduleId: "gen8id",
        apiVersion: GEN8_ID_API_VERSION,
        taskId,
        operation: "generator",
        chunkIndex: chunk.index,
        request,
        chunk,
      });
    });
  }

  terminate() {
    this.fail(new Error("Gen8 ID Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Gen8IdWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handle(message: Gen8IdWorkerResponse) {
    if (
      message.moduleId !== "gen8id" ||
      message.apiVersion !== GEN8_ID_API_VERSION
    ) {
      this.fail(new Error("Gen8 ID Worker response contract mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      ) {
        this.fail(new Error("Gen8 ID Worker capability mismatch."));
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
      message.operation !== "generator"
    ) {
      this.fail(new Error("Gen8 ID Worker returned an unknown batch."));
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
    `${import.meta.env.BASE_URL}wasm/gen8id.mjs`,
    globalThis.location.href,
  ).href;
}

function recommendedWorkers() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

export class Gen8IdWorkerPool implements Gen8IdEngine {
  private clients: Client[] = [];
  private running = false;
  private cancelActive?: () => void;

  async search(
    request: Gen8IdRequest,
    options: Gen8IdOptions = {},
  ): Promise<Gen8IdSummary> {
    if (this.running)
      throw new Error("A Gen8 ID calculation is already running.");
    const validationErrors = validateGen8IdRequest(request);
    if (validationErrors.length > 0)
      throw new RangeError(
        `Invalid Gen8 ID request: ${validationErrors.join(", ")}.`,
      );
    const requestedWorkers = options.workerCount ?? recommendedWorkers();
    if (!Number.isInteger(requestedWorkers) || requestedWorkers < 1)
      throw new RangeError("Invalid Gen8 ID Worker count.");
    const maxResults = options.maxResults ?? GEN8_ID_MAX_RESULTS;
    if (
      !Number.isInteger(maxResults) ||
      maxResults < 1 ||
      maxResults > GEN8_ID_MAX_RESULTS
    )
      throw new RangeError("Invalid Gen8 ID result limit.");

    const chunks = createGen8IdChunks(
      request,
      options.chunkSize ?? GEN8_ID_CHUNK_SIZE,
    );
    const count = Math.min(8, requestedWorkers, chunks.length);
    const taskId = crypto.randomUUID();
    this.running = true;
    const startedAt = performance.now();
    const pending = new Map<number, ArrayBuffer>();
    let nextChunk = 0;
    let nextBatch = 0;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = false;
    let resultLimitReached = false;
    let stopped = false;
    let activeWorkerCount = 0;

    const cancel = () => {
      if (stopped) return;
      stopped = true;
      cancelled = true;
      this.reset();
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();

    const report = () => {
      const progress = {
        processedStates,
        totalStates: request.maxAdvances,
        resultCount,
        percent:
          request.maxAdvances === 0
            ? 100
            : (processedStates / request.maxAdvances) * 100,
      };
      options.onProgress?.(progress);
      return progress;
    };

    const flush = () => {
      while (!stopped && pending.has(nextBatch)) {
        const states = decodeGen8IdStates(pending.get(nextBatch)!);
        pending.delete(nextBatch++);
        const remaining = maxResults - resultCount;
        if (states.length > remaining) {
          options.onBatch?.(states.slice(0, remaining));
          resultCount = maxResults;
          resultLimitReached = true;
          stopped = true;
          this.reset();
          return;
        }
        resultCount += states.length;
        options.onBatch?.(states);
        if (resultCount === maxResults && nextBatch < chunks.length) {
          resultLimitReached = true;
          stopped = true;
          this.reset();
        }
      }
    };

    try {
      if (!stopped) {
        this.ensure(count);
        activeWorkerCount = count;
      }
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
              batch.resultCount > chunk.stateCount ||
              !Number.isFinite(batch.elapsedMs) ||
              batch.elapsedMs < 0 ||
              batch.buffer.byteLength !== batch.resultCount * 16
            )
              throw new Error("Gen8 ID Worker returned an invalid batch.");
            pending.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.processedCount;
            flush();
            report();
          } catch (error) {
            if (!stopped) throw error;
          }
        }
      };
      await Promise.all(this.clients.slice(0, count).map(work));
      flush();
      return {
        ...report(),
        elapsedMs: performance.now() - startedAt,
        workerCount: activeWorkerCount,
        cancelled,
        resultLimitReached,
      };
    } catch (error) {
      this.reset();
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
    if (this.cancelActive) this.cancelActive();
    else this.reset();
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
