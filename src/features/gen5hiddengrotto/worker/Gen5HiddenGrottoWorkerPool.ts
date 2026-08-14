import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN5_HIDDEN_GROTTO_API_VERSION,
  gen5HiddenGrottoTaskCount,
  splitGen5HiddenGrottoRequest,
  validateGen5HiddenGrottoRequest,
  validateGen5HiddenGrottoResult,
  type Gen5HiddenGrottoPreparedCache,
  type Gen5HiddenGrottoRequest,
  type Gen5HiddenGrottoResult,
} from "../domain";
import type {
  Gen5HiddenGrottoEngine,
  Gen5HiddenGrottoOptions,
  Gen5HiddenGrottoSummary,
} from "../search";
import type {
  Gen5HiddenGrottoWorkerBatch,
  Gen5HiddenGrottoWorkerRequest,
  Gen5HiddenGrottoWorkerResponse,
} from "./messages";

const RESULT_WORDS = 16;
type Batch = Gen5HiddenGrottoWorkerBatch;

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen5hiddengrotto.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(4, hardware - 1 || 1));
}

function dateTime(words: Uint32Array, offset: number) {
  const date = words[offset + 2];
  if (!date) return undefined;
  const seconds = words[offset + 3];
  const dateText = `${date & 0xffff}-${String((date >>> 16) & 0xff).padStart(2, "0")}-${String(date >>> 24).padStart(2, "0")}`;
  return `${dateText} ${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(
    Math.floor((seconds % 3600) / 60),
  ).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function stats(words: Uint32Array, offset: number) {
  return [
    words[offset + 13] & 0xffff,
    words[offset + 13] >>> 16,
    words[offset + 14] & 0xffff,
    words[offset + 14] >>> 16,
    words[offset + 15] & 0xffff,
    words[offset + 15] >>> 16,
  ] as [number, number, number, number, number, number];
}

function decode(buffer: ArrayBuffer, request: Gen5HiddenGrottoRequest) {
  const words = new Uint32Array(buffer);
  if (words.length % RESULT_WORDS !== 0)
    throw new Error(
      "Gen 5 Hidden Grotto Worker returned a misaligned result buffer.",
    );
  const results: Gen5HiddenGrottoResult[] = [];
  for (let offset = 0; offset < words.length; offset += RESULT_WORDS) {
    const seed = (BigInt(words[offset + 1]) << 32n) | BigInt(words[offset]);
    const metadata = words[offset + 8];
    const searchDateTime = dateTime(words, offset);
    const common = {
      seed: seed.toString(16).toUpperCase().padStart(16, "0"),
      advances: words[offset + 5],
      dateTime: searchDateTime,
      timer0: searchDateTime ? words[offset + 4] & 0xffff : undefined,
      buttonMask: searchDateTime ? words[offset + 4] >>> 16 : undefined,
    };
    if (request.operation.startsWith("slot")) {
      results.push(
        validateGen5HiddenGrottoResult(request, {
          ...common,
          kind: "slot",
          data: words[offset + 7] & 0xffff,
          chatot: metadata & 0x7f,
          needle: (metadata >>> 7) & 7,
          gender: ((metadata >>> 10) & 3) as 0 | 1,
          group: (metadata >>> 12) & 3,
          slot: (metadata >>> 14) & 0xf,
          item: ((metadata >>> 18) & 1) === 1,
        }),
      );
      continue;
    }
    const ivWords = words[offset + 9];
    const ivWords2 = words[offset + 10];
    const ivs = [
      ivWords & 0xff,
      (ivWords >>> 8) & 0xff,
      (ivWords >>> 16) & 0xff,
      (ivWords >>> 24) & 0xff,
      ivWords2 & 0xff,
      (ivWords2 >>> 8) & 0xff,
    ] as [number, number, number, number, number, number];
    const speciesForm = words[offset + 11] & 0xffff;
    results.push(
      validateGen5HiddenGrottoResult(request, {
        ...common,
        kind: "pokemon",
        ivAdvances: words[offset + 6],
        chatot: metadata & 0x7f,
        needle: (metadata >>> 7) & 7,
        ability: ((metadata >>> 10) & 3) as 0 | 1 | 2,
        gender: ((metadata >>> 12) & 3) as 0 | 1 | 2,
        level: (metadata >>> 14) & 0x7f,
        nature: (metadata >>> 21) & 0x1f,
        shiny: 0,
        pid: words[offset + 7].toString(16).toUpperCase().padStart(8, "0"),
        ivs,
        hiddenPower: (ivWords2 >>> 16) & 0xff,
        hiddenPowerStrength: (ivWords2 >>> 24) & 0xff,
        species: speciesForm & 0x7ff,
        form: (speciesForm >>> 11) & 0x1f,
        characteristic: words[offset + 11] >>> 16,
        abilityIndex: words[offset + 12] & 0xffff,
        stats: stats(words, offset),
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

export class Gen5HiddenGrottoWorkerPool implements Gen5HiddenGrottoEngine {
  private workers: WorkerSlot[] = [];
  private pending = new Map<
    string,
    {
      operation: Gen5HiddenGrottoRequest["operation"];
      resolve(batch: Batch): void;
      reject(error: Error): void;
    }
  >();
  private cancelled = false;
  private searching = false;

  async search(
    request: Gen5HiddenGrottoRequest,
    options: Gen5HiddenGrottoOptions = {},
  ): Promise<Gen5HiddenGrottoSummary> {
    if (this.searching || this.pending.size !== 0)
      throw new Error("A Gen 5 Hidden Grotto search is already running.");
    validateGen5HiddenGrottoRequest(request);
    const cache = this.cacheForRequest(request, options.cache);
    const startedAt = performance.now();
    const totalUnits = Number(gen5HiddenGrottoTaskCount(request));
    const requestedWorkers = Math.max(
      1,
      Math.min(4, Math.floor(options.workerCount ?? defaultWorkerCount())),
    );
    const chunks = splitGen5HiddenGrottoRequest(request, requestedWorkers);
    const activeWorkerCount = Math.min(requestedWorkers, chunks.length || 1);
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
                operation: request.operation,
                resolve,
                reject,
              });
              const message: Gen5HiddenGrottoWorkerRequest = {
                type: "task",
                moduleId: "gen5hiddengrotto",
                apiVersion: GEN5_HIDDEN_GROTTO_API_VERSION,
                taskId,
                operation: request.operation,
                chunkIndex: chunk.index,
                request,
                chunk,
              };
              slot.worker.postMessage(message);
            });
            batches.push(batch);
            processedUnits += batch.processedCount;
            receivedResults += batch.resultCount;
            if (
              batch.limitReached ||
              (receivedResults >= request.resultLimit &&
                nextChunk < chunks.length)
            )
              stoppedEarly = true;
            options.onProgress?.({
              processedUnits,
              totalUnits,
              resultCount: Math.min(receivedResults, request.resultLimit),
              percent:
                totalUnits === 0 ? 100 : (processedUnits / totalUnits) * 100,
            });
          }
        }),
      );
      batches.sort((left, right) => left.chunkIndex - right.chunkIndex);
      const allResults = batches.flatMap((batch) => {
        if (
          batch.buffer.byteLength !==
          batch.resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT
        )
          throw new Error("Gen 5 Hidden Grotto Worker batch length mismatch.");
        return decode(batch.buffer, request);
      });
      const accepted = allResults.slice(0, request.resultLimit);
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
          allResults.length > request.resultLimit,
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
    this.reset(new Error("Gen 5 Hidden Grotto search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Gen 5 Hidden Grotto Worker pool was disposed."));
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Gen 5 Hidden Grotto Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen5hiddengrotto.worker.ts", import.meta.url),
        {
          type: "module",
          name: `pokerngkit-gen5hiddengrotto-${index + 1}`,
        },
      );
      const slot: WorkerSlot = {
        worker,
        ready,
        cacheKey: null,
        resolveReady,
        rejectReady,
      };
      worker.onmessage = ({
        data,
      }: MessageEvent<Gen5HiddenGrottoWorkerResponse>) =>
        this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(
          new Error(event.message || "Gen 5 Hidden Grotto Worker crashed."),
        );
      const init: Gen5HiddenGrottoWorkerRequest = {
        type: "init",
        moduleId: "gen5hiddengrotto",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN5_HIDDEN_GROTTO_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen5HiddenGrottoWorkerResponse) {
    if (
      message.moduleId !== "gen5hiddengrotto" ||
      message.apiVersion !== GEN5_HIDDEN_GROTTO_API_VERSION
    ) {
      this.reset(new Error("Gen 5 Hidden Grotto Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("slot-generator") ||
        !message.operations.includes("slot-searcher") ||
        !message.operations.includes("pokemon-generator") ||
        !message.operations.includes("pokemon-searcher")
      ) {
        this.reset(
          new Error("Gen 5 Hidden Grotto Worker capability mismatch."),
        );
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
        this.reset(
          new Error("Gen 5 Hidden Grotto Worker cache response mismatch."),
        );
        return;
      }
      slot.cacheReady = undefined;
      slot.cacheKey = message.cacheKey || null;
      pending.resolve();
      return;
    }
    if (!Number.isInteger(message.chunkIndex) || message.chunkIndex < 0) {
      this.reset(
        new Error("Gen 5 Hidden Grotto Worker returned an invalid batch."),
      );
      return;
    }
    const key = `${message.taskId}:${message.chunkIndex}`;
    const pending = this.pending.get(key);
    if (!pending || pending.operation !== message.operation) {
      this.reset(
        new Error(
          "Gen 5 Hidden Grotto Worker returned an unknown workflow batch.",
        ),
      );
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
    request: Gen5HiddenGrottoRequest,
    cache?: Gen5HiddenGrottoPreparedCache,
  ) {
    if (request.cache === null) {
      if (cache)
        throw new TypeError(
          "Gen 5 Hidden Grotto cache data was provided without a cache descriptor.",
        );
      return undefined;
    }
    if (!cache)
      throw new TypeError("Gen 5 Hidden Grotto cache data is missing.");
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
    )
      throw new TypeError(
        "Gen 5 Hidden Grotto cache data does not match its descriptor.",
      );
    return cache;
  }

  private loadCache(slot: WorkerSlot, cache?: Gen5HiddenGrottoPreparedCache) {
    const key = cache?.descriptor.key ?? "";
    if (slot.cacheKey === (key || null)) return Promise.resolve();
    if (slot.cacheReady)
      return Promise.reject(
        new Error(
          "Gen 5 Hidden Grotto Worker is already loading a search cache.",
        ),
      );
    return new Promise<void>((resolve, reject) => {
      slot.cacheReady = { key, resolve, reject };
      if (!cache) {
        const message: Gen5HiddenGrottoWorkerRequest = {
          type: "cache-clear",
          moduleId: "gen5hiddengrotto",
          apiVersion: GEN5_HIDDEN_GROTTO_API_VERSION,
        };
        slot.worker.postMessage(message);
        return;
      }
      const ivEntries = cache.ivEntries.slice().buffer;
      const shaEntries = cache.shaEntries?.slice().buffer;
      const message: Gen5HiddenGrottoWorkerRequest = {
        type: "cache",
        moduleId: "gen5hiddengrotto",
        apiVersion: GEN5_HIDDEN_GROTTO_API_VERSION,
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

export { decode as decodeGen5HiddenGrottoResults };
