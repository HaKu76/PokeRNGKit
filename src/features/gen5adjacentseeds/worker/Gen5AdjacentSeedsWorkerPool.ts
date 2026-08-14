import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN5_ADJACENT_SEEDS_API_VERSION,
  GEN5_ADJACENT_SEEDS_PREVIEW_COUNT,
  splitGen5AdjacentSeedsRequest,
  totalGen5AdjacentStates,
  validateGen5AdjacentPreviewRequest,
  validateGen5AdjacentSeedsRequest,
  type Gen5AdjacentPreviewRequest,
  type Gen5AdjacentSeedResult,
  type Gen5AdjacentSeedsRequest,
} from "../domain";
import type {
  Gen5AdjacentSeedsEngine,
  Gen5AdjacentSeedsOptions,
} from "../search";
import type {
  Gen5AdjacentSeedsWorkerRequest,
  Gen5AdjacentSeedsWorkerResponse,
} from "./messages";

const RESULT_WORDS = 8;
type Batch = Extract<Gen5AdjacentSeedsWorkerResponse, { type: "batch" }>;

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen5adjacentseeds.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(4, hardware - 1 || 1));
}

function decodeRows(buffer: ArrayBuffer): Gen5AdjacentSeedResult[] {
  const words = new Uint32Array(buffer);
  if (words.length % RESULT_WORDS !== 0)
    throw new Error("Gen 5 Adjacent Seeds result buffer is misaligned.");
  const rows: Gen5AdjacentSeedResult[] = [];
  for (let index = 0; index < words.length; index += RESULT_WORDS) {
    const seed = (BigInt(words[index + 1]) << 32n) | BigInt(words[index]);
    const date = words[index + 2];
    const time = words[index + 3];
    const year = date & 0xffff;
    const month = (date >>> 16) & 0xff;
    const day = date >>> 24;
    const hour = time & 0xff;
    const minute = (time >>> 8) & 0xff;
    const second = (time >>> 16) & 0xff;
    const ivsPacked = words[index + 6];
    const pidTarget = words[index + 7];
    rows.push({
      seed: seed.toString(16).toUpperCase().padStart(16, "0"),
      dateTime: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`,
      timer0: words[index + 4],
      ivAdvance: words[index + 5],
      ivs: [
        ivsPacked & 31,
        (ivsPacked >>> 5) & 31,
        (ivsPacked >>> 10) & 31,
        (ivsPacked >>> 15) & 31,
        (ivsPacked >>> 20) & 31,
        (ivsPacked >>> 25) & 31,
      ],
      pidAdvance: pidTarget & 0x7fff_ffff,
      target: (pidTarget & 0x8000_0000) !== 0,
    });
  }
  return rows;
}

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  resolveReady(): void;
  rejectReady(error: Error): void;
}

export class Gen5AdjacentSeedsWorkerPool implements Gen5AdjacentSeedsEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    { resolve(batch: Batch): void; reject(error: Error): void }
  >();
  private cancelled = false;
  private generating = false;

  async generate(
    request: Gen5AdjacentSeedsRequest,
    options: Gen5AdjacentSeedsOptions = {},
  ) {
    if (this.generating || this.pending.size !== 0)
      throw new Error("An Adjacent Seeds task is already running.");
    validateGen5AdjacentSeedsRequest(request);
    const totalStates = totalGen5AdjacentStates(request);
    const requestedWorkers = Math.max(
      1,
      Math.min(8, Math.floor(options.workerCount ?? defaultWorkerCount())),
    );
    const chunks = splitGen5AdjacentSeedsRequest(
      request,
      Math.min(requestedWorkers * 2, request.seconds * 2 + 1),
    );
    const activeWorkerCount = Math.min(requestedWorkers, chunks.length);
    if (options.signal?.aborted)
      return {
        results: [],
        processedStates: 0,
        totalStates,
        elapsedMs: 0,
        workerCount: activeWorkerCount,
        cancelled: true,
      };

    this.generating = true;
    this.cancelled = false;
    const startedAt = performance.now();
    const abort = () => this.cancel();
    options.signal?.addEventListener("abort", abort, { once: true });
    let processedStates = 0;
    let resultCount = 0;
    try {
      this.ensureWorkers(activeWorkerCount);
      await Promise.all(this.workers.map((slot) => slot.ready));
      const taskId = crypto.randomUUID();
      const batches: Batch[] = [];
      let nextChunk = 0;
      await Promise.all(
        this.workers.map(async (slot) => {
          while (!this.cancelled && nextChunk < chunks.length) {
            const chunk = chunks[nextChunk];
            nextChunk += 1;
            const batch = await this.request(slot, taskId, chunk.index, {
              type: "task",
              moduleId: "gen5adjacentseeds",
              apiVersion: GEN5_ADJACENT_SEEDS_API_VERSION,
              taskId,
              operation: "generator",
              chunkIndex: chunk.index,
              request: { kind: "generate", value: request },
              chunk: { kind: "generate", ...chunk },
            });
            processedStates += batch.processedCount;
            resultCount += batch.resultCount;
            options.onProgress?.({
              processedStates,
              totalStates,
              resultCount,
              percent: Math.min(100, (processedStates / totalStates) * 100),
            });
            batches.push(batch);
          }
        }),
      );
      batches.sort((left, right) => left.chunkIndex - right.chunkIndex);
      return {
        results: batches.flatMap((batch) => {
          const expected =
            batch.resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
          if (batch.buffer.byteLength !== expected)
            throw new Error("Gen 5 Adjacent Seeds batch length mismatch.");
          return decodeRows(batch.buffer);
        }),
        processedStates,
        totalStates,
        elapsedMs: performance.now() - startedAt,
        workerCount: activeWorkerCount,
        cancelled: false,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          results: [],
          processedStates,
          totalStates,
          elapsedMs: performance.now() - startedAt,
          workerCount: activeWorkerCount,
          cancelled: true,
        };
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", abort);
      this.pending.clear();
      this.generating = false;
    }
  }

  async preview(request: Gen5AdjacentPreviewRequest) {
    if (this.generating || this.pending.size !== 0)
      throw new Error("An Adjacent Seeds task is already running.");
    validateGen5AdjacentPreviewRequest(request);
    this.cancelled = false;
    if (this.workers.length === 0) this.ensureWorkers(1);
    await this.workers[0].ready;
    const taskId = crypto.randomUUID();
    const batch = await this.request(this.workers[0], taskId, 0, {
      type: "task",
      moduleId: "gen5adjacentseeds",
      apiVersion: GEN5_ADJACENT_SEEDS_API_VERSION,
      taskId,
      operation: "generator",
      chunkIndex: 0,
      request: { kind: "preview", value: request },
      chunk: { kind: "preview", index: 0 },
    });
    if (
      batch.resultCount !== GEN5_ADJACENT_SEEDS_PREVIEW_COUNT ||
      batch.buffer.byteLength !== GEN5_ADJACENT_SEEDS_PREVIEW_COUNT
    ) {
      throw new Error("Gen 5 Adjacent Seeds preview length mismatch.");
    }
    return [...new Uint8Array(batch.buffer)];
  }

  cancel() {
    this.cancelled = true;
    this.reset(new Error("Gen 5 Adjacent Seeds task was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen 5 Adjacent Seeds Worker pool was disposed."));
  }

  private request(
    slot: WorkerSlot,
    taskId: string,
    chunkIndex: number,
    message: Gen5AdjacentSeedsWorkerRequest,
  ) {
    return new Promise<Batch>((resolve, reject) => {
      this.pending.set(`${taskId}:${chunkIndex}`, { resolve, reject });
      slot.worker.postMessage(message);
    });
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 5 Adjacent Seeds Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen5adjacentseeds.worker.ts", import.meta.url),
        { type: "module", name: `pokerngkit-gen5adjacentseeds-${index + 1}` },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({
        data,
      }: MessageEvent<Gen5AdjacentSeedsWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(
          new Error(event.message || "Gen 5 Adjacent Seeds Worker crashed."),
        );
      const init: Gen5AdjacentSeedsWorkerRequest = {
        type: "init",
        moduleId: "gen5adjacentseeds",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN5_ADJACENT_SEEDS_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen5AdjacentSeedsWorkerResponse) {
    if (
      message.moduleId !== "gen5adjacentseeds" ||
      message.apiVersion !== GEN5_ADJACENT_SEEDS_API_VERSION
    ) {
      this.reset(new Error("Gen 5 Adjacent Seeds Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      ) {
        this.reset(new Error("Gen 5 Adjacent Seeds capability mismatch."));
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "error") {
      this.reset(new Error(message.message));
      return;
    }
    if (
      message.operation !== "generator" ||
      !Number.isInteger(message.chunkIndex) ||
      message.chunkIndex < 0
    ) {
      this.reset(new Error("Gen 5 Adjacent Seeds returned an invalid batch."));
      return;
    }
    const key = `${message.taskId}:${message.chunkIndex}`;
    const pending = this.pending.get(key);
    if (!pending) {
      this.reset(new Error("Gen 5 Adjacent Seeds returned an unknown batch."));
      return;
    }
    this.pending.delete(key);
    pending.resolve(message);
  }

  private fail(error: Error) {
    this.workers.forEach((slot) => slot.rejectReady(error));
    this.pending.forEach((pending) => pending.reject(error));
    this.pending.clear();
  }

  private reset(error: Error) {
    this.fail(error);
    this.workers.forEach((slot) => slot.worker.terminate());
    this.workers = [];
  }
}
