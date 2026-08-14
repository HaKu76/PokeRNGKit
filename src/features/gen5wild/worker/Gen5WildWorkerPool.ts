import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN5_WILD_API_VERSION,
  gen5WildTaskCount,
  splitGen5WildRequest,
  validateGen5WildRequest,
  validateGen5WildResult,
  type Gen5WildPreparedCache,
  type Gen5WildRequest,
  type Gen5WildResult,
} from "../domain";
import type {
  Gen5WildEngine,
  Gen5WildOptions,
  Gen5WildSummary,
} from "../search";
import type {
  Gen5WildWorkerBatch,
  Gen5WildWorkerRequest,
  Gen5WildWorkerResponse,
} from "./messages";

const RESULT_WORDS = 16;
type Batch = Gen5WildWorkerBatch;

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen5wild.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(4, hardware - 1 || 1));
}

function finiteOption(value: number, name: string) {
  if (!Number.isFinite(value))
    throw new TypeError(`${name} must be a finite number.`);
  return Math.floor(value);
}

function decode(
  buffer: ArrayBuffer,
  request: Gen5WildRequest,
  maximumResults = Number.POSITIVE_INFINITY,
) {
  const words = new Uint32Array(buffer);
  if (words.length % RESULT_WORDS !== 0)
    throw new Error("Gen 5 Wild Worker returned a misaligned result buffer.");
  const results: Gen5WildResult[] = [];
  for (
    let offset = 0;
    offset < words.length && results.length < maximumResults;
    offset += RESULT_WORDS
  ) {
    const seed = (BigInt(words[offset + 1]) << 32n) | BigInt(words[offset]);
    const date = words[offset + 2];
    const seconds = words[offset + 3];
    const metadata = words[offset + 8];
    const ivWords = words[offset + 9];
    const ivWords2 = words[offset + 10];
    const speciesForm = words[offset + 11];
    const itemAbilityIndex = words[offset + 12];
    const ivs = [
      ivWords & 0xff,
      (ivWords >>> 8) & 0xff,
      (ivWords >>> 16) & 0xff,
      (ivWords >>> 24) & 0xff,
      ivWords2 & 0xff,
      (ivWords2 >>> 8) & 0xff,
    ] as Gen5WildResult["ivs"];
    const stats = [
      words[offset + 13] & 0xffff,
      words[offset + 13] >>> 16,
      words[offset + 14] & 0xffff,
      words[offset + 14] >>> 16,
      words[offset + 15] & 0xffff,
      words[offset + 15] >>> 16,
    ] as Gen5WildResult["stats"];
    const dateText = date
      ? `${date & 0xffff}-${String((date >>> 16) & 0xff).padStart(2, "0")}-${String(date >>> 24).padStart(2, "0")}`
      : undefined;
    const dateTime = dateText
      ? `${dateText} ${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
      : undefined;
    results.push(
      validateGen5WildResult(request, {
        seed: seed.toString(16).toUpperCase().padStart(16, "0"),
        advances: words[offset + 5],
        ivAdvances: words[offset + 6],
        chatot: metadata & 0x7f,
        needle: (metadata >>> 7) & 7,
        ability: ((metadata >>> 10) & 3) as 0 | 1 | 2,
        gender: ((metadata >>> 12) & 3) as 0 | 1 | 2,
        level: (metadata >>> 14) & 0x7f,
        nature: (metadata >>> 21) & 0x1f,
        shiny: ((metadata >>> 26) & 3) as 0 | 1 | 2,
        slot: metadata >>> 28,
        pid: words[offset + 7].toString(16).toUpperCase().padStart(8, "0"),
        species: speciesForm & 0x7ff,
        form: (speciesForm >>> 11) & 0x1f,
        characteristic: (speciesForm >>> 16) & 0x1f,
        item: itemAbilityIndex & 0xffff,
        abilityIndex: itemAbilityIndex >>> 16,
        ivs,
        stats,
        hiddenPower: (ivWords2 >>> 16) & 0xff,
        hiddenPowerStrength: (ivWords2 >>> 24) & 0xff,
        dateTime,
        timer0: date ? words[offset + 4] & 0xffff : undefined,
        buttonMask: date ? words[offset + 4] >>> 16 : undefined,
      }),
    );
  }
  return results;
}

interface WorkerSlot {
  worker: Worker;
  ready: Promise<void>;
  cacheKey: string | null;
  cacheReady?: {
    key: string;
    resolve(): void;
    reject(error: Error): void;
  };
  resolveReady(): void;
  rejectReady(error: Error): void;
}

export class Gen5WildWorkerPool implements Gen5WildEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    {
      operation: "generator" | "searcher";
      resolve(batch: Batch): void;
      reject(error: Error): void;
    }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Gen5WildRequest,
    options: Gen5WildOptions = {},
  ): Promise<Gen5WildSummary> {
    if (this.searching || this.pending.size !== 0)
      throw new Error("A Gen 5 Wild search is already running.");
    validateGen5WildRequest(request);
    const cache = this.cacheForRequest(request, options.cache);
    const startedAt = performance.now();
    const totalUnits = Number(gen5WildTaskCount(request));
    const maximumResults =
      options.maxResults === undefined || options.maxResults === Infinity
        ? request.resultLimit
        : finiteOption(options.maxResults, "Max results");
    const resultLimit = Math.max(
      1,
      Math.min(request.resultLimit, maximumResults),
    );
    const workerCountOption =
      options.workerCount === undefined
        ? defaultWorkerCount()
        : finiteOption(options.workerCount, "Worker count");
    const requestedWorkers = Math.max(1, Math.min(4, workerCountOption));
    const chunks = splitGen5WildRequest(request, requestedWorkers);
    const activeWorkerCount = Math.min(
      requestedWorkers,
      chunks.length || 1,
      resultLimit,
    );
    const workerRequest =
      resultLimit === request.resultLimit
        ? request
        : { ...request, resultLimit };
    if (options.signal?.aborted || chunks.length === 0) {
      return {
        processedUnits: 0,
        totalUnits,
        resultCount: 0,
        percent: totalUnits === 0 ? 100 : 0,
        elapsedMs: 0,
        workerCount: chunks.length === 0 ? 0 : activeWorkerCount,
        cancelled: options.signal?.aborted ?? false,
        resultLimitReached: false,
      };
    }

    this.searching = true;
    this.cancelled = false;
    const cancel = () => this.cancel();
    options.signal?.addEventListener("abort", cancel, { once: true });
    let processedUnits = 0;
    let receivedResults = 0;
    let nextChunk = 0;
    let stoppedEarly = false;
    const batches: Batch[] = [];
    try {
      this.ensureWorkers(activeWorkerCount);
      await Promise.all(this.workers.map((slot) => slot.ready));
      await Promise.all(
        this.workers.map((slot) => this.loadCache(slot, cache)),
      );
      if (this.cancelled)
        return {
          processedUnits,
          totalUnits,
          resultCount: 0,
          percent: totalUnits === 0 ? 100 : (processedUnits / totalUnits) * 100,
          elapsedMs: performance.now() - startedAt,
          workerCount: activeWorkerCount,
          cancelled: true,
          resultLimitReached: false,
        };
      const taskId = crypto.randomUUID();
      await Promise.all(
        this.workers.map(async (slot) => {
          while (
            !this.cancelled &&
            !stoppedEarly &&
            nextChunk < chunks.length
          ) {
            const chunk = chunks[nextChunk++];
            const batch = await new Promise<Batch>((resolve, reject) => {
              const key = `${taskId}:${chunk.index}`;
              this.pending.set(key, {
                operation: request.mode,
                resolve,
                reject,
              });
              const message: Gen5WildWorkerRequest = {
                type: "task",
                moduleId: "gen5wild",
                apiVersion: GEN5_WILD_API_VERSION,
                taskId,
                operation: request.mode,
                chunkIndex: chunk.index,
                request: workerRequest,
                chunk,
              };
              slot.worker.postMessage(message);
            });
            batches.push(batch);
            processedUnits += batch.processedCount;
            receivedResults += batch.resultCount;
            if (
              batch.limitReached ||
              (receivedResults >= resultLimit && nextChunk < chunks.length)
            ) {
              stoppedEarly = true;
            }
            options.onProgress?.({
              processedUnits,
              totalUnits,
              resultCount: Math.min(receivedResults, resultLimit),
              percent:
                totalUnits === 0 ? 100 : (processedUnits / totalUnits) * 100,
            });
          }
        }),
      );
      batches.sort((left, right) => left.chunkIndex - right.chunkIndex);
      const accepted: Gen5WildResult[] = [];
      for (const batch of batches) {
        if (
          batch.buffer.byteLength !==
          batch.resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT
        )
          throw new Error("Gen 5 Wild Worker batch length mismatch.");
        const remaining = resultLimit - accepted.length;
        if (remaining <= 0) continue;
        accepted.push(...decode(batch.buffer, request, remaining));
      }
      if (accepted.length !== 0) options.onBatch?.(accepted);
      return {
        processedUnits,
        totalUnits,
        resultCount: accepted.length,
        percent: totalUnits === 0 ? 100 : (processedUnits / totalUnits) * 100,
        elapsedMs: performance.now() - startedAt,
        workerCount: activeWorkerCount,
        cancelled: false,
        resultLimitReached:
          stoppedEarly ||
          batches.some((batch) => batch.limitReached) ||
          receivedResults > resultLimit,
      };
    } catch (error) {
      if (this.cancelled) {
        return {
          processedUnits,
          totalUnits,
          resultCount: 0,
          percent: totalUnits === 0 ? 100 : (processedUnits / totalUnits) * 100,
          elapsedMs: performance.now() - startedAt,
          workerCount: activeWorkerCount,
          cancelled: true,
          resultLimitReached: false,
        };
      }
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.pending.clear();
      this.searching = false;
    }
  }

  cancel() {
    this.cancelled = true;
    this.reset(new Error("Gen 5 Wild search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen 5 Wild Worker pool was disposed."));
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 5 Wild Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen5wild.worker.ts", import.meta.url),
        {
          type: "module",
          name: `pokerngkit-gen5wild-${index + 1}`,
        },
      );
      const slot: WorkerSlot = {
        worker,
        ready,
        cacheKey: null,
        resolveReady,
        rejectReady,
      };
      worker.onmessage = ({ data }: MessageEvent<Gen5WildWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(new Error(event.message || "Gen 5 Wild Worker crashed."));
      const init: Gen5WildWorkerRequest = {
        type: "init",
        moduleId: "gen5wild",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN5_WILD_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen5WildWorkerResponse) {
    if (
      message.moduleId !== "gen5wild" ||
      message.apiVersion !== GEN5_WILD_API_VERSION
    ) {
      this.reset(new Error("Gen 5 Wild Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator") ||
        !message.operations.includes("searcher")
      ) {
        this.reset(new Error("Gen 5 Wild Worker capability mismatch."));
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "error") {
      this.reset(new Error(message.message));
      return;
    }
    if (message.type === "cache-ready") {
      const pending = slot.cacheReady;
      if (!pending || message.cacheKey !== pending.key) {
        this.reset(new Error("Gen 5 Wild Worker cache response mismatch."));
        return;
      }
      slot.cacheReady = undefined;
      slot.cacheKey = message.cacheKey || null;
      pending.resolve();
      return;
    }
    if (!Number.isInteger(message.chunkIndex) || message.chunkIndex < 0) {
      this.reset(new Error("Gen 5 Wild Worker returned an invalid batch."));
      return;
    }
    const key = `${message.taskId}:${message.chunkIndex}`;
    const pending = this.pending.get(key);
    if (!pending) {
      this.reset(new Error("Gen 5 Wild Worker returned an unknown batch."));
      return;
    }
    if (message.operation !== pending.operation) {
      this.reset(new Error("Gen 5 Wild Worker returned the wrong operation."));
      return;
    }
    this.pending.delete(key);
    pending.resolve(message);
  }

  private fail(error: Error) {
    this.workers.forEach((slot) => {
      slot.rejectReady(error);
      slot.cacheReady?.reject(error);
      slot.cacheReady = undefined;
    });
    this.pending.forEach((pending) => pending.reject(error));
    this.pending.clear();
  }

  private reset(error: Error) {
    this.fail(error);
    this.workers.forEach((slot) => slot.worker.terminate());
    this.workers = [];
  }

  private cacheForRequest(
    request: Gen5WildRequest,
    cache?: Gen5WildPreparedCache,
  ) {
    if (request.cache === null) {
      if (cache)
        throw new TypeError(
          "Gen 5 Wild cache data was provided without a cache descriptor.",
        );
      return undefined;
    }
    if (!cache) throw new TypeError("Gen 5 Wild cache data is missing.");
    const descriptor = cache.descriptor;
    if (
      descriptor.key !== request.cache.key ||
      descriptor.mode !== request.cache.mode ||
      descriptor.ivEntryCount !== request.cache.ivEntryCount ||
      descriptor.shaEntryCount !== request.cache.shaEntryCount ||
      cache.ivEntries.length !== descriptor.ivEntryCount * 2 ||
      (descriptor.mode === "iv-sha" &&
        cache.shaEntries?.length !== descriptor.shaEntryCount * 4) ||
      (descriptor.mode === "iv" && cache.shaEntries !== undefined)
    ) {
      throw new TypeError(
        "Gen 5 Wild cache data does not match its descriptor.",
      );
    }
    return cache;
  }

  private loadCache(slot: WorkerSlot, cache?: Gen5WildPreparedCache) {
    const key = cache?.descriptor.key ?? "";
    if (slot.cacheKey === (key || null)) return Promise.resolve();
    if (slot.cacheReady)
      return Promise.reject(
        new Error("Gen 5 Wild Worker is already loading a search cache."),
      );
    return new Promise<void>((resolve, reject) => {
      slot.cacheReady = { key, resolve, reject };
      if (!cache) {
        const message: Gen5WildWorkerRequest = {
          type: "cache-clear",
          moduleId: "gen5wild",
          apiVersion: GEN5_WILD_API_VERSION,
        };
        slot.worker.postMessage(message);
        return;
      }
      const ivEntries = cache.ivEntries.slice().buffer;
      const shaEntries = cache.shaEntries?.slice().buffer;
      const message: Gen5WildWorkerRequest = {
        type: "cache",
        moduleId: "gen5wild",
        apiVersion: GEN5_WILD_API_VERSION,
        cacheKey: key,
        mode: cache.descriptor.mode,
        ivEntries,
        ivEntryCount: cache.descriptor.ivEntryCount,
        shaEntries,
        shaEntryCount: cache.descriptor.shaEntryCount,
      };
      const transfer: Transferable[] = [ivEntries];
      if (shaEntries) transfer.push(shaEntries);
      slot.worker.postMessage(message, transfer);
    });
  }
}
