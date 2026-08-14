import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  createGen4EggGeneratorChunks,
  createGen4EggSearcherChunks,
  decodeGen4EggSearcherStates,
  decodeGen4EggStates,
  gen4EggGeneratorCombinationCount,
  gen4EggSearcherSeedCount,
  GEN4_EGG_API_VERSION,
  GEN4_EGG_GENERATOR_CHUNK_SIZE,
  GEN4_EGG_MAX_RESULTS,
  GEN4_EGG_MAX_WASM_RESULTS,
  GEN4_EGG_SEARCHER_CHUNK_SIZE,
  type Gen4EggGeneratorChunk,
  type Gen4EggGeneratorRequest,
  type Gen4EggSearcherChunk,
  type Gen4EggSearcherRequest,
} from "../domain";
import type {
  Gen4EggGeneratorEngine,
  Gen4EggGeneratorOptions,
  Gen4EggSearcherEngine,
  Gen4EggSearcherOptions,
  Gen4EggSummary,
} from "../search";
import type { Gen4EggWorkerRequest, Gen4EggWorkerResponse } from "./messages";

type Batch = Extract<Gen4EggWorkerResponse, { type: "batch" }>;

interface PendingChunk {
  taskId: string;
  operation: "generator" | "searcher";
  resolve(value: Batch): void;
  reject(error: Error): void;
}

class Gen4EggWorkerClient {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: PendingChunk;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(new URL("./gen4egg.worker.ts", import.meta.url), {
      type: "module",
      name: `pokerngkit-gen4egg-${index}`,
    });
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({ data }: MessageEvent<Gen4EggWorkerResponse>) =>
      this.handleMessage(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen4 egg Worker crashed."));
    this.post({
      type: "init",
      moduleId: "gen4egg",
      moduleUrl,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN4_EGG_API_VERSION,
    });
  }

  async runGenerator(
    taskId: string,
    request: Gen4EggGeneratorRequest,
    chunk: Gen4EggGeneratorChunk,
  ) {
    return this.run(taskId, "generator", request, chunk);
  }

  async runSearcher(
    taskId: string,
    request: Gen4EggSearcherRequest,
    chunk: Gen4EggSearcherChunk,
  ) {
    return this.run(taskId, "searcher", request, chunk);
  }

  terminate() {
    this.fail(new Error("Gen4 egg Worker was terminated."));
    this.worker.terminate();
  }

  private async run(
    taskId: string,
    operation: "generator" | "searcher",
    request: Gen4EggGeneratorRequest | Gen4EggSearcherRequest,
    chunk: Gen4EggGeneratorChunk | Gen4EggSearcherChunk,
  ) {
    await this.ready;
    if (this.pending) {
      throw new Error("Gen4 egg Worker received overlapping chunks.");
    }
    return new Promise<Batch>((resolve, reject) => {
      this.pending = { taskId, operation, resolve, reject };
      this.post({
        type: "task",
        moduleId: "gen4egg",
        apiVersion: GEN4_EGG_API_VERSION,
        taskId,
        operation,
        chunkIndex: chunk.index,
        request,
        chunk,
      });
    });
  }

  private post(message: Gen4EggWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handleMessage(message: Gen4EggWorkerResponse) {
    if (
      message.moduleId !== "gen4egg" ||
      message.apiVersion !== GEN4_EGG_API_VERSION
    ) {
      this.fail(new Error("Gen4 egg Worker response contract mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator") ||
        !message.operations.includes("searcher")
      ) {
        this.fail(new Error("Gen4 egg Worker capabilities mismatch."));
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
      this.pending.operation !== message.operation
    ) {
      this.fail(new Error("Gen4 egg Worker returned an unknown batch."));
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

export function defaultGen4EggModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen4egg.mjs`,
    globalThis.location.href,
  ).href;
}

export function recommendedGen4EggWorkerCount() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

type Operation = "generator" | "searcher";
type Request = Gen4EggGeneratorRequest | Gen4EggSearcherRequest;
type Options = Gen4EggGeneratorOptions | Gen4EggSearcherOptions;
type Chunk = Gen4EggGeneratorChunk | Gen4EggSearcherChunk;

export class Gen4EggWorkerPool
  implements Gen4EggGeneratorEngine, Gen4EggSearcherEngine
{
  private clients: Gen4EggWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen4EggModuleUrl()) {}

  search(
    request: Gen4EggGeneratorRequest,
    options?: Gen4EggGeneratorOptions,
  ): Promise<Gen4EggSummary>;
  search(
    request: Gen4EggSearcherRequest,
    options?: Gen4EggSearcherOptions,
  ): Promise<Gen4EggSummary>;
  async search(
    request: Request,
    options: Options = {},
  ): Promise<Gen4EggSummary> {
    const operation: Operation =
      "seedHeld" in request ? "generator" : "searcher";
    return this.execute(operation, request, options);
  }

  cancel() {
    this.cancelActive?.();
  }

  dispose() {
    this.resetClients();
  }

  private async execute(
    operation: Operation,
    request: Request,
    options: Options,
  ): Promise<Gen4EggSummary> {
    if (this.running)
      throw new Error("A Gen4 egg calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const generator = operation === "generator";
    const chunks: Chunk[] = generator
      ? createGen4EggGeneratorChunks(
          request as Gen4EggGeneratorRequest,
          options.chunkSize ?? GEN4_EGG_GENERATOR_CHUNK_SIZE,
        )
      : createGen4EggSearcherChunks(
          request as Gen4EggSearcherRequest,
          options.chunkSize ?? GEN4_EGG_SEARCHER_CHUNK_SIZE,
        );
    const totalStates = generator
      ? gen4EggGeneratorCombinationCount(request as Gen4EggGeneratorRequest)
      : gen4EggSearcherSeedCount(request as Gen4EggSearcherRequest);
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen4EggWorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN4_EGG_MAX_RESULTS;
    const taskId = crypto.randomUUID();
    const pendingBatches = new Map<number, Batch>();
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

    const flush = () => {
      while (pendingBatches.has(nextBatch)) {
        const batch = pendingBatches.get(nextBatch)!;
        pendingBatches.delete(nextBatch++);
        const states = generator
          ? decodeGen4EggStates(batch.buffer)
          : decodeGen4EggSearcherStates(batch.buffer);
        const remaining = maxResults - resultCount;
        const visible = states.slice(0, Math.max(0, remaining));
        if (visible.length > 0) {
          if (generator) {
            (options as Gen4EggGeneratorOptions).onBatch?.(
              visible as ReturnType<typeof decodeGen4EggStates>,
            );
          } else {
            (options as Gen4EggSearcherOptions).onBatch?.(
              visible as ReturnType<typeof decodeGen4EggSearcherStates>,
            );
          }
        }
        resultCount += visible.length;
        if (
          states.length > remaining ||
          batch.resultCount >= GEN4_EGG_MAX_WASM_RESULTS
        ) {
          resultLimitReached = true;
          stopped = true;
          return;
        }
      }
    };

    try {
      this.ensureClients(workerCount);
      const work = async (client: Gen4EggWorkerClient) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = generator
              ? await client.runGenerator(
                  taskId,
                  request as Gen4EggGeneratorRequest,
                  chunk as Gen4EggGeneratorChunk,
                )
              : await client.runSearcher(
                  taskId,
                  request as Gen4EggSearcherRequest,
                  chunk as Gen4EggSearcherChunk,
                );
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch);
            processedStates += batch.processedCount;
            flush();
            report();
          } catch (error) {
            if (!cancelled) throw error;
          }
        }
      };
      await Promise.all(this.clients.slice(0, workerCount).map(work));
      if (cancelled) pendingBatches.clear();
      flush();
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

  private ensureClients(count: number) {
    if (this.clients.length === count) return;
    this.resetClients();
    this.clients = Array.from(
      { length: count },
      (_, index) => new Gen4EggWorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
