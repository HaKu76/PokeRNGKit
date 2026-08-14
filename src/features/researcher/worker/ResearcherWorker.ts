import {
  decodeResearcherRows,
  RESEARCHER_API_VERSION,
  RESEARCHER_CHUNK_STATES,
  validateResearcherRequest,
  type ResearcherRequest,
  type ResearcherRow,
} from "../domain";
import type {
  ResearcherEngine,
  ResearcherGenerateOptions,
  ResearcherSummary,
} from "../search";
import {
  RESEARCHER_CONTRACT_VERSION,
  RESEARCHER_MODULE_ID,
  type ResearcherWorkerRequest,
  type ResearcherWorkerResponse,
} from "./messages";

type Batch = Extract<ResearcherWorkerResponse, { type: "batch" }>;

export class ResearcherWorker implements ResearcherEngine {
  private worker?: Worker;
  private ready?: Promise<void>;
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;
  private pending?: {
    taskId: string;
    resolve: (batch: Batch) => void;
    reject: (error: Error) => void;
  };
  private running = false;
  private cancelled = false;

  async generate(
    request: ResearcherRequest,
    options: ResearcherGenerateOptions = {},
  ): Promise<ResearcherSummary> {
    if (this.running)
      throw new Error("A Researcher calculation is already running.");
    const errors = validateResearcherRequest(request);
    if (errors.length > 0)
      throw new RangeError(`Invalid Researcher request: ${errors.join(", ")}.`);
    const totalStates = request.maxAdvances;
    if (options.signal?.aborted)
      return {
        rows: [],
        processedStates: 0,
        totalStates,
        elapsedMs: 0,
        workerCount: 1,
        cancelled: true,
      };
    if (totalStates === 0)
      return {
        rows: [],
        processedStates: 0,
        totalStates,
        elapsedMs: 0,
        workerCount: 1,
        cancelled: false,
      };
    this.running = true;
    this.cancelled = false;
    const startedAt = performance.now();
    const taskId = crypto.randomUUID();
    const rows: ResearcherRow[] = [];
    const abort = () => this.cancel();
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      this.ensureWorker();
      await this.ready;
      let processedStates = 0;
      let chunkIndex = 0;
      while (processedStates < totalStates && !this.cancelled) {
        const stateCount = Math.min(
          RESEARCHER_CHUNK_STATES,
          totalStates - processedStates,
        );
        const batch = await this.runChunk(taskId, request, {
          index: chunkIndex,
          stateCount,
        });
        if (
          batch.taskId !== taskId ||
          batch.chunkIndex !== chunkIndex ||
          batch.processedCount !== stateCount ||
          batch.resultCount !== stateCount ||
          batch.buffer.byteLength !==
            stateCount * 23 * Uint32Array.BYTES_PER_ELEMENT
        )
          throw new Error("Researcher Worker returned an invalid batch.");
        const decoded = decodeResearcherRows(batch.buffer);
        rows.push(...decoded);
        options.onBatch?.(decoded);
        processedStates += stateCount;
        options.onProgress?.(processedStates, totalStates);
        chunkIndex++;
      }
      return {
        rows,
        processedStates,
        totalStates,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: this.cancelled,
      };
    } catch (error) {
      if (this.cancelled)
        return {
          rows,
          processedStates: rows.length,
          totalStates,
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", abort);
      this.running = false;
    }
  }

  cancel() {
    if (!this.running) return;
    this.cancelled = true;
    this.reset(new Error("Researcher calculation was cancelled."));
  }

  dispose() {
    this.reset(new Error("Researcher Worker was disposed."));
  }

  private runChunk(
    taskId: string,
    request: ResearcherRequest,
    chunk: { index: number; stateCount: number },
  ) {
    return new Promise<Batch>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({
        type: "task",
        moduleId: RESEARCHER_MODULE_ID,
        apiVersion: RESEARCHER_API_VERSION,
        taskId,
        operation: "generator",
        chunkIndex: chunk.index,
        request,
        chunk,
      });
    });
  }

  private ensureWorker() {
    if (this.worker) return;
    this.worker = new Worker(
      new URL("./researcher.worker.ts", import.meta.url),
      {
        type: "module",
        name: "pokerngkit-researcher",
      },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<ResearcherWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.reset(new Error(event.message || "Researcher Worker crashed."));
    this.post({
      type: "init",
      moduleId: RESEARCHER_MODULE_ID,
      moduleUrl: new URL(
        `${import.meta.env.BASE_URL}wasm/researcher.mjs`,
        globalThis.location.href,
      ).href,
      contractVersion: RESEARCHER_CONTRACT_VERSION,
      apiVersion: RESEARCHER_API_VERSION,
    });
  }

  private post(message: ResearcherWorkerRequest) {
    this.worker?.postMessage(message);
  }

  private handle(message: ResearcherWorkerResponse) {
    if (
      message.moduleId !== RESEARCHER_MODULE_ID ||
      message.apiVersion !== RESEARCHER_API_VERSION
    ) {
      this.reset(new Error("Researcher Worker response contract mismatch."));
      return;
    }
    if (message.type === "ready") {
      if (
        message.contractVersion !== RESEARCHER_CONTRACT_VERSION ||
        !message.operations.includes("generator")
      ) {
        this.reset(new Error("Researcher Worker capability mismatch."));
        return;
      }
      this.resolveReady?.();
      this.resolveReady = undefined;
      this.rejectReady = undefined;
      return;
    }
    if (message.type === "error") {
      this.reset(new Error(message.message));
      return;
    }
    if (!this.pending || this.pending.taskId !== message.taskId) {
      this.reset(new Error("Researcher Worker returned an unknown batch."));
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

  private reset(error: Error) {
    this.fail(error);
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
  }
}
