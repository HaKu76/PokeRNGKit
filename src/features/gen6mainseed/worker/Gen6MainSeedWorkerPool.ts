import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6MainSeedResults,
  GEN6_MAIN_SEED_API_VERSION,
  GEN6_MAIN_SEED_CHUNK_SIZE,
  GEN6_MAIN_SEED_RESULT_WORDS,
  gen6MainSeedChunkAt,
  gen6MainSeedChunkCount,
  gen6MainSeedTaskCount,
  validateGen6MainSeedRequest,
  validateGen6MainSeedResult,
  type Gen6MainSeedRequest,
  type Gen6MainSeedResult,
} from "../domain";
import type { Gen6MainSeedEngine, Gen6MainSeedSearchOptions } from "../search";
import type { Gen6MainSeedSummary } from "../types";
import type {
  Gen6MainSeedWorkerBatch,
  Gen6MainSeedWorkerRequest,
  Gen6MainSeedWorkerResponse,
} from "./messages";

class Client {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;
  private pending?: {
    taskId: string;
    chunkIndex: number;
    resolve(message: Gen6MainSeedWorkerBatch): void;
    reject(error: Error): void;
  };

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen6mainseed.worker.ts", import.meta.url),
      {
        type: "module",
        name: `pokerngkit-gen6mainseed-${index + 1}`,
      },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen6MainSeedWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen VI Main Seed Finder Worker crashed."),
      );
    this.post({
      type: "init",
      moduleId: "gen6mainseed",
      moduleUrl,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_MAIN_SEED_API_VERSION,
    });
  }

  async run(message: Extract<Gen6MainSeedWorkerRequest, { type: "task" }>) {
    await this.ready;
    if (this.pending)
      throw new Error("Gen VI Main Seed Finder Worker is already busy.");
    return new Promise<Gen6MainSeedWorkerBatch>((resolve, reject) => {
      this.pending = {
        taskId: message.taskId,
        chunkIndex: message.chunkIndex,
        resolve,
        reject,
      };
      this.post(message);
    });
  }

  terminate(error: Error) {
    this.fail(error);
    this.worker.terminate();
  }

  private post(message: Gen6MainSeedWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handle(message: Gen6MainSeedWorkerResponse) {
    if (
      message.moduleId !== "gen6mainseed" ||
      message.apiVersion !== GEN6_MAIN_SEED_API_VERSION
    ) {
      this.fail(new Error("Gen VI Main Seed Finder Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("searcher")
      ) {
        this.fail(
          new Error("Gen VI Main Seed Finder Worker capability mismatch."),
        );
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
      this.pending.chunkIndex !== message.chunkIndex ||
      message.operation !== "searcher"
    ) {
      this.fail(
        new Error("Gen VI Main Seed Finder Worker returned an unknown batch."),
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

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen6mainseed.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(8, hardware - 1 || 1));
}

function positiveInteger(value: number | undefined, fallback: number) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1)
    throw new TypeError(
      "Worker count and chunk size must be positive integers.",
    );
  return resolved;
}

export class Gen6MainSeedWorkerPool implements Gen6MainSeedEngine {
  private clients: Client[] = [];
  private running = false;
  private cancelActive?: () => void;

  async search(
    request: Gen6MainSeedRequest,
    options: Gen6MainSeedSearchOptions = {},
  ): Promise<Gen6MainSeedSummary> {
    validateGen6MainSeedRequest(request);
    if (this.running)
      throw new Error("A Gen VI Main Seed Finder search is already running.");
    const requestedWorkers = Math.min(
      8,
      positiveInteger(options.workerCount, defaultWorkerCount()),
    );
    const chunkSize = positiveInteger(
      options.chunkSize,
      GEN6_MAIN_SEED_CHUNK_SIZE,
    );
    const chunkCount = gen6MainSeedChunkCount(request, chunkSize);
    const workerCount = Math.min(requestedWorkers, chunkCount);
    const totalStates = gen6MainSeedTaskCount(request);
    const startedAt = performance.now();
    const allResults: Gen6MainSeedResult[] = [];
    const pending = new Map<number, Gen6MainSeedResult[]>();
    let nextChunk = 0;
    let nextBatch = 0;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = false;
    let stopped = false;
    this.running = true;

    const report = () => {
      const progress = {
        processedStates,
        totalStates,
        resultCount,
        percent: totalStates ? (processedStates / totalStates) * 100 : 100,
      };
      options.onProgress?.(progress);
      return progress;
    };
    const flush = () => {
      while (pending.has(nextBatch)) {
        const batch = pending.get(nextBatch)!;
        pending.delete(nextBatch++);
        resultCount += batch.length;
        allResults.push(...batch);
        if (batch.length) options.onBatch?.(batch);
      }
    };
    const cancel = () => {
      if (stopped) return;
      cancelled = true;
      stopped = true;
      this.reset(new Error("Gen VI Main Seed Finder search was cancelled."));
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();

    try {
      if (!stopped) await this.ensure(workerCount);
      const taskId = crypto.randomUUID();
      const runClient = async (client: Client) => {
        while (!stopped) {
          const index = nextChunk++;
          if (index >= chunkCount) return;
          const chunk = gen6MainSeedChunkAt(request, index, chunkSize);
          const message = await client.run({
            type: "task",
            moduleId: "gen6mainseed",
            apiVersion: GEN6_MAIN_SEED_API_VERSION,
            taskId,
            operation: "searcher",
            chunkIndex: chunk.index,
            request,
            chunk,
          });
          if (stopped) return;
          const expected = chunk.endSeed - chunk.startSeed + 1;
          if (
            message.processedCount !== expected ||
            message.buffer.byteLength !==
              message.resultCount *
                GEN6_MAIN_SEED_RESULT_WORDS *
                Uint32Array.BYTES_PER_ELEMENT
          ) {
            throw new Error(
              "Gen VI Main Seed Finder Worker returned an invalid batch.",
            );
          }
          pending.set(
            chunk.index,
            decodeGen6MainSeedResults(message.buffer).map((result) =>
              validateGen6MainSeedResult(request, result),
            ),
          );
          processedStates += message.processedCount;
          flush();
          report();
        }
      };
      await Promise.all(this.clients.slice(0, workerCount).map(runClient));
      flush();
      return {
        ...report(),
        results: allResults,
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled,
      };
    } catch (cause) {
      if (!cancelled) throw cause;
      flush();
      return {
        ...report(),
        results: allResults,
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
    this.reset(new Error("Gen VI Main Seed Finder Worker pool was disposed."));
  }

  private async ensure(count: number) {
    if (this.clients.length === count) return;
    this.reset(new Error("Gen VI Main Seed Finder Worker pool was resized."));
    this.clients = Array.from(
      { length: count },
      (_, index) => new Client(index, moduleUrl()),
    );
  }

  private reset(error: Error) {
    for (const client of this.clients) client.terminate(error);
    this.clients = [];
  }
}
