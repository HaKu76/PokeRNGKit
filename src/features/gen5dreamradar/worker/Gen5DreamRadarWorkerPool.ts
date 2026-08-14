import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN5_DREAM_RADAR_API_VERSION,
  gen5DreamRadarFiltersAcceptAll,
  gen5DreamRadarSearcherSeedCount,
  gen5DreamRadarTaskCount,
  gen5DreamRadarCharacteristic,
  splitGen5DreamRadarRequest,
  validateGen5DreamRadarRequest,
  validateGen5DreamRadarResult,
  type Gen5DreamRadarRequest,
  type Gen5DreamRadarResult,
} from "../domain";
import type {
  Gen5DreamRadarEngine,
  Gen5DreamRadarOptions,
  Gen5DreamRadarSummary,
} from "../search";
import type {
  Gen5DreamRadarWorkerBatch,
  Gen5DreamRadarWorkerRequest,
  Gen5DreamRadarWorkerResponse,
} from "./messages";

const RESULT_WORDS = 11;
type Batch = Gen5DreamRadarWorkerBatch;

function moduleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen5dreamradar.mjs`,
    globalThis.location.href,
  ).href;
}

function defaultWorkerCount() {
  const hardware = globalThis.navigator?.hardwareConcurrency ?? 2;
  return Math.max(1, Math.min(4, hardware - 1 || 1));
}

function decode(buffer: ArrayBuffer, request: Gen5DreamRadarRequest) {
  const words = new Uint32Array(buffer);
  if (words.length % RESULT_WORDS !== 0)
    throw new Error("Dream Radar Worker returned a misaligned result buffer.");
  const results: Gen5DreamRadarResult[] = [];
  for (let offset = 0; offset < words.length; offset += RESULT_WORDS) {
    const seed = (BigInt(words[offset + 1]) << 32n) | BigInt(words[offset]);
    const metadata = words[offset + 7];
    const ivWords = words[offset + 8];
    const ivWords2 = words[offset + 9];
    const date = words[offset + 2];
    const seconds = words[offset + 3];
    const dateText = date
      ? `${date & 0xffff}-${String((date >>> 16) & 0xff).padStart(2, "0")}-${String(date >>> 24).padStart(2, "0")}`
      : undefined;
    const timeText = dateText
      ? `${dateText} ${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
      : undefined;
    results.push(
      validateGen5DreamRadarResult(request, {
        seed: seed.toString(16).toUpperCase().padStart(16, "0"),
        advances: words[offset + 5],
        needle: metadata & 7,
        pid: words[offset + 6].toString(16).toUpperCase().padStart(8, "0"),
        ability: (metadata >>> 3) & 3,
        gender: ((metadata >>> 5) & 3) as 0 | 1 | 2,
        level: (metadata >>> 7) & 0xff,
        nature: (metadata >>> 15) & 0x1f,
        abilityIndex: words[offset + 10] & 0xffff,
        ivs: [
          ivWords & 0xff,
          (ivWords >>> 8) & 0xff,
          (ivWords >>> 16) & 0xff,
          (ivWords >>> 24) & 0xff,
          ivWords2 & 0xff,
          (ivWords2 >>> 8) & 0xff,
        ],
        hiddenPower: (ivWords2 >>> 16) & 0xff,
        hiddenPowerStrength: (ivWords2 >>> 24) & 0xff,
        characteristic: gen5DreamRadarCharacteristic(words[offset + 6], [
          ivWords & 0xff,
          (ivWords >>> 8) & 0xff,
          (ivWords >>> 16) & 0xff,
          (ivWords >>> 24) & 0xff,
          ivWords2 & 0xff,
          (ivWords2 >>> 8) & 0xff,
        ]),
        dateTime: timeText,
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
  resolveReady(): void;
  rejectReady(error: Error): void;
}

export class Gen5DreamRadarWorkerPool implements Gen5DreamRadarEngine {
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
    request: Gen5DreamRadarRequest,
    options: Gen5DreamRadarOptions = {},
  ): Promise<Gen5DreamRadarSummary> {
    if (this.searching || this.pending.size !== 0)
      throw new Error("A Dream Radar search is already running.");
    validateGen5DreamRadarRequest(request);
    const startedAt = performance.now();
    const totalUnitsBigInt = gen5DreamRadarTaskCount(request);
    const truncatedByResultLimit =
      gen5DreamRadarFiltersAcceptAll(request.filters) &&
      (request.mode === "generator"
        ? BigInt(request.maxAdvances) + 1n > totalUnitsBigInt
        : gen5DreamRadarSearcherSeedCount(request) > totalUnitsBigInt);
    const totalUnits = Number(totalUnitsBigInt);
    const requestedWorkers = Math.max(
      1,
      Math.min(8, Math.floor(options.workerCount ?? defaultWorkerCount())),
    );
    const chunks = splitGen5DreamRadarRequest(request, requestedWorkers);
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
              const message: Gen5DreamRadarWorkerRequest = {
                type: "task",
                moduleId: "gen5dreamradar",
                apiVersion: GEN5_DREAM_RADAR_API_VERSION,
                taskId,
                operation: request.mode,
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
            ) {
              stoppedEarly = true;
            }
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
        ) {
          throw new Error("Dream Radar Worker batch length mismatch.");
        }
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
          allResults.length > request.resultLimit ||
          (truncatedByResultLimit && accepted.length >= request.resultLimit),
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
    this.reset(new Error("Dream Radar search was cancelled."));
  }

  dispose() {
    this.reset(new Error("Dream Radar Worker pool was disposed."));
  }

  private ensureWorkers(count: number) {
    if (this.workers.length === count) return;
    this.reset(new Error("Dream Radar Worker pool was resized."));
    this.workers = Array.from({ length: count }, (_, index) => {
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const worker = new Worker(
        new URL("./gen5dreamradar.worker.ts", import.meta.url),
        { type: "module", name: `pokerngkit-gen5dreamradar-${index + 1}` },
      );
      const slot = { worker, ready, resolveReady, rejectReady };
      worker.onmessage = ({
        data,
      }: MessageEvent<Gen5DreamRadarWorkerResponse>) => this.handle(slot, data);
      worker.onerror = (event) =>
        this.reset(new Error(event.message || "Dream Radar Worker crashed."));
      const init: Gen5DreamRadarWorkerRequest = {
        type: "init",
        moduleId: "gen5dreamradar",
        moduleUrl: moduleUrl(),
        contractVersion: RNG_MODULE_CONTRACT_VERSION,
        apiVersion: GEN5_DREAM_RADAR_API_VERSION,
      };
      worker.postMessage(init);
      return slot;
    });
  }

  private handle(slot: WorkerSlot, message: Gen5DreamRadarWorkerResponse) {
    if (
      message.moduleId !== "gen5dreamradar" ||
      message.apiVersion !== GEN5_DREAM_RADAR_API_VERSION
    ) {
      this.reset(new Error("Dream Radar Worker response mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
        !message.operations.includes("generator") ||
        !message.operations.includes("searcher")
      ) {
        this.reset(new Error("Dream Radar Worker capability mismatch."));
        return;
      }
      slot.resolveReady();
      return;
    }
    if (message.type === "error") {
      this.reset(new Error(message.message));
      return;
    }
    if (!Number.isInteger(message.chunkIndex) || message.chunkIndex < 0) {
      this.reset(new Error("Dream Radar Worker returned an invalid batch."));
      return;
    }
    const key = `${message.taskId}:${message.chunkIndex}`;
    const pending = this.pending.get(key);
    if (!pending) {
      this.reset(new Error("Dream Radar Worker returned an unknown batch."));
      return;
    }
    if (message.operation !== pending.operation) {
      this.reset(new Error("Dream Radar Worker returned the wrong operation."));
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
