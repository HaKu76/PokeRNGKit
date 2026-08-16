import {
  splitGen7EggSeedSearch,
  validateGen7EggSeedSearchRequest,
  validateGen7MagikarpRequest,
  type Gen7EggSeedProgress,
  type Gen7EggSeedSearchRequest,
  type Gen7EggSeedState,
  type Gen7EggSeedSummary,
  type Gen7MagikarpRequest,
} from "../domain";
import type { Gen7EggSeedEngine, Gen7EggSeedSearchOptions } from "../search";
import type {
  Gen7EggSeedWorkerRequest,
  Gen7EggSeedWorkerResponse,
} from "./messages";

class Client {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;
  private pending?: {
    taskId: string;
    resolve(message: Gen7EggSeedWorkerResponse): void;
    reject(error: Error): void;
  };

  constructor(index: number, moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen7eggseedfinder.worker.ts", import.meta.url),
      {
        type: "module",
        name: `pokerngkit-gen7eggseedfinder-${index + 1}`,
      },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen7EggSeedWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen 7 Egg Seed Finder Worker crashed."),
      );
    this.post({ type: "init", moduleUrl });
  }

  async run(message: Exclude<Gen7EggSeedWorkerRequest, { type: "init" }>) {
    await this.ready;
    return new Promise<Gen7EggSeedWorkerResponse>((resolve, reject) => {
      this.pending = { taskId: message.taskId, resolve, reject };
      this.post(message, message.type === "magikarp" ? [message.bits] : []);
    });
  }

  terminate() {
    this.fail(new Error("Gen 7 Egg Seed Finder Worker was terminated."));
    this.worker.terminate();
  }

  private post(
    message: Gen7EggSeedWorkerRequest,
    transfer: Transferable[] = [],
  ) {
    this.worker.postMessage(message, transfer);
  }

  private handle(message: Gen7EggSeedWorkerResponse) {
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
        new Error("Gen 7 Egg Seed Finder Worker returned an unknown task."),
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
    `${import.meta.env.BASE_URL}wasm/gen7eggseedfinder.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

function decodeStates(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % 4 !== 0)
    throw new RangeError("Invalid Gen 7 Egg Seed Finder result buffer.");
  const states: Gen7EggSeedState[] = [];
  for (let index = 0; index < words.length; index += 4)
    states.push({
      state: [
        words[index],
        words[index + 1],
        words[index + 2],
        words[index + 3],
      ],
    });
  return states;
}

export class Gen7EggSeedFinderWorkerPool implements Gen7EggSeedEngine {
  private clients: Client[] = [];
  private running = false;
  private cancelActive?: () => void;

  async search(
    request: Gen7EggSeedSearchRequest,
    options: Gen7EggSeedSearchOptions = {},
  ): Promise<Gen7EggSeedSummary> {
    validateGen7EggSeedSearchRequest(request);
    if (this.running)
      throw new Error(
        "A Gen 7 Egg Seed Finder calculation is already running.",
      );
    this.running = true;
    const startedAt = performance.now();
    const requested = options.workerCount ?? defaultWorkerCount();
    if (!Number.isInteger(requested) || requested < 1)
      throw new RangeError("Invalid Worker count.");
    const chunks = splitGen7EggSeedSearch(request, options.chunkSize);
    const workerCount = Math.min(8, requested, chunks.length);
    const taskId = crypto.randomUUID();
    const pending = new Map<number, Gen7EggSeedState[]>();
    let nextChunk = 0;
    let nextBatch = 0;
    let processedStates = 0;
    let resultCount = 0;
    const allResults: Gen7EggSeedState[] = [];
    let cancelled = false;
    let stopped = false;
    const cancel = () => {
      if (stopped) return;
      cancelled = true;
      stopped = true;
      this.reset();
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const totalStates = request.endSeed - request.startSeed + 1;
    const report = () => {
      const progress: Gen7EggSeedProgress = {
        processedStates,
        totalStates,
        resultCount,
        percent: (processedStates / totalStates) * 100,
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
        options.onBatch?.(batch);
      }
    };
    if (options.signal?.aborted) cancel();
    try {
      if (stopped) {
        const progress = report();
        return {
          ...progress,
          results: allResults,
          elapsedMs: performance.now() - startedAt,
          workerCount,
          cancelled,
        };
      }
      await this.ensure(workerCount);
      const runClient = async (client: Client) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          const message = await client.run({
            type: "search",
            taskId,
            request,
            chunk,
          });
          if (stopped) return;
          if (
            message.type !== "batch" ||
            message.taskId !== taskId ||
            message.chunkIndex !== chunk.index
          )
            throw new Error(
              "Gen 7 Egg Seed Finder Worker returned an invalid batch.",
            );
          const expected = chunk.endSeed - chunk.startSeed + 1;
          if (
            message.stateCount !== expected ||
            message.resultCount * 16 !== message.buffer.byteLength
          )
            throw new Error(
              "Gen 7 Egg Seed Finder Worker returned an invalid result size.",
            );
          pending.set(message.chunkIndex, decodeStates(message.buffer));
          processedStates += message.stateCount;
          flush();
          report();
        }
      };
      await Promise.all(this.clients.slice(0, workerCount).map(runClient));
      flush();
      const progress = report();
      return {
        ...progress,
        results: allResults,
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled,
      };
    } catch (cause) {
      if (!cancelled) throw cause;
      flush();
      const progress = report();
      return {
        ...progress,
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

  async magikarp(request: Gen7MagikarpRequest) {
    validateGen7MagikarpRequest(request);
    if (this.running)
      throw new Error(
        "A Gen 7 Egg Seed Finder calculation is already running.",
      );
    this.running = true;
    const taskId = crypto.randomUUID();
    try {
      await this.ensure(1);
      const bytes = new TextEncoder().encode(request.bits);
      const message = await this.clients[0].run({
        type: "magikarp",
        taskId,
        bits: bytes.buffer,
      });
      if (message.type !== "magikarp" || message.taskId !== taskId)
        throw new Error(
          "Gen 7 Egg Seed Finder Worker returned an invalid state.",
        );
      const words = new Uint32Array(message.buffer);
      if (words.length !== 4)
        throw new Error(
          "Gen 7 Egg Seed Finder Worker returned an invalid state size.",
        );
      return {
        state: [words[0], words[1], words[2], words[3]] as [
          number,
          number,
          number,
          number,
        ],
      };
    } finally {
      this.running = false;
    }
  }

  cancel() {
    this.cancelActive?.();
  }
  dispose() {
    this.reset();
  }

  private async ensure(count: number) {
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
