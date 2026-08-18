import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6PokeRadarResults,
  GEN6_POKERADAR_API_VERSION,
  GEN6_POKERADAR_RESULT_WORDS,
  gen6PokeRadarTaskCount,
  validateGen6PokeRadarRequest,
  type Gen6PokeRadarRequest,
} from "../domain";
import type {
  Gen6PokeRadarEngine,
  Gen6PokeRadarSearchOptions,
  Gen6PokeRadarSummary,
} from "../search";
import type {
  Gen6PokeRadarWorkerRequest,
  Gen6PokeRadarWorkerResponse,
} from "./messages";
interface Slot {
  worker: Worker;
  ready: Promise<void>;
  resolve(): void;
  reject(error: Error): void;
}
interface Active {
  taskId: string;
  request: Gen6PokeRadarRequest;
  options: Gen6PokeRadarSearchOptions;
  started: number;
  resolve(summary: Gen6PokeRadarSummary): void;
  reject(error: Error): void;
  processed: number;
  abort: () => void;
}
export class Gen6PokeRadarWorker implements Gen6PokeRadarEngine {
  private slot?: Slot;
  private active?: Active;
  async search(
    request: Gen6PokeRadarRequest,
    options: Gen6PokeRadarSearchOptions = {},
  ) {
    validateGen6PokeRadarRequest(request);
    if (this.active)
      throw new Error("A Gen VI Poke Radar search is already running.");
    if (options.signal?.aborted)
      return this.summary(request, 0, 0, true, false, 0);
    this.ensure();
    const taskId = crypto.randomUUID();
    let resolve!: (s: Gen6PokeRadarSummary) => void,
      reject!: (e: Error) => void;
    const completion = new Promise<Gen6PokeRadarSummary>((r, j) => {
      resolve = r;
      reject = j;
    });
    const abort = () => this.cancel();
    this.active = {
      taskId,
      request,
      options,
      started: performance.now(),
      resolve,
      reject,
      processed: 0,
      abort,
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      await this.slot!.ready;
      if (this.active)
        this.slot!.worker.postMessage({
          type: "task",
          moduleId: "gen6pokeradar",
          apiVersion: GEN6_POKERADAR_API_VERSION,
          taskId,
          request,
        } satisfies Gen6PokeRadarWorkerRequest);
    } catch (error) {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    }
    return completion;
  }
  cancel() {
    const active = this.active;
    if (!active) return;
    this.clear(active);
    active.resolve(
      this.summary(
        active.request,
        active.processed,
        0,
        true,
        false,
        performance.now() - active.started,
      ),
    );
    this.reset();
  }
  dispose() {
    if (this.active) {
      const active = this.active;
      this.clear(active);
      active.reject(new Error("Gen VI Poke Radar Worker was disposed."));
    }
    this.reset();
  }
  private summary(
    request: Gen6PokeRadarRequest,
    processed: number,
    count: number,
    cancelled: boolean,
    limit: boolean,
    elapsedMs: number,
  ): Gen6PokeRadarSummary {
    return {
      processedStates: processed,
      totalStates: gen6PokeRadarTaskCount(request),
      resultCount: count,
      percent: (processed / gen6PokeRadarTaskCount(request)) * 100,
      elapsedMs,
      workerCount: 1,
      cancelled,
      resultLimitReached: limit,
    };
  }
  private ensure() {
    if (this.slot) return;
    let resolve!: () => void, reject!: (e: Error) => void;
    const ready = new Promise<void>((r, j) => {
      resolve = r;
      reject = j;
    });
    const worker = new Worker(
      new URL("./gen6pokeradar.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen6pokeradar-1" },
    );
    const slot = { worker, ready, resolve, reject };
    worker.onmessage = ({ data }: MessageEvent<Gen6PokeRadarWorkerResponse>) =>
      this.handle(slot, data);
    worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen VI Poke Radar Worker crashed."),
      );
    worker.postMessage({
      type: "init",
      moduleId: "gen6pokeradar",
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/gen6pokeradar.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_POKERADAR_API_VERSION,
    } satisfies Gen6PokeRadarWorkerRequest);
    this.slot = slot;
  }
  private handle(slot: Slot, message: Gen6PokeRadarWorkerResponse) {
    if (
      message.moduleId !== "gen6pokeradar" ||
      message.apiVersion !== GEN6_POKERADAR_API_VERSION
    )
      return this.fail(
        new Error("Gen VI Poke Radar Worker response mismatch."),
      );
    if (message.type === "ready") {
      if (message.contractVersion !== RNG_MODULE_CONTRACT_VERSION)
        return this.fail(
          new Error("Gen VI Poke Radar Worker capability mismatch."),
        );
      slot.resolve();
      return;
    }
    if (message.type === "error") return this.fail(new Error(message.message));
    const active = this.active;
    if (
      !active ||
      active.taskId !== message.taskId ||
      message.buffer.byteLength !==
        message.resultCount * GEN6_POKERADAR_RESULT_WORDS * 4
    )
      return this.fail(
        new Error("Gen VI Poke Radar Worker returned an invalid batch."),
      );
    const results = decodeGen6PokeRadarResults(
      message.buffer,
      active.request.resultLimit,
    );
    active.processed = message.processedCount;
    const summary = this.summary(
      active.request,
      active.processed,
      results.length,
      false,
      message.limitReached,
      performance.now() - active.started,
    );
    active.options.onBatch?.(results);
    active.options.onProgress?.(summary);
    this.clear(active);
    active.resolve(summary);
  }
  private fail(error: Error) {
    this.slot?.reject(error);
    if (this.active) {
      const active = this.active;
      this.clear(active);
      active.reject(error);
    }
    this.reset();
  }
  private clear(active: Active) {
    active.options.signal?.removeEventListener("abort", active.abort);
    if (this.active === active) this.active = undefined;
  }
  private reset() {
    this.slot?.worker.terminate();
    this.slot = undefined;
  }
}
