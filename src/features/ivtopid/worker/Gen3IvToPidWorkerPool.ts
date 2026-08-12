import {
  decodeGen3IvToPidStates,
  type Gen3IvToPidRequest,
  GEN3_IVTOPID_API_VERSION,
} from "../domain";
import type {
  Gen3IvToPidSearchEngine,
  Gen3IvToPidSearchOptions,
  Gen3IvToPidSearchSummary,
} from "../search";
import type {
  Gen3IvToPidWorkerBatchMessage,
  Gen3IvToPidWorkerRequest,
  Gen3IvToPidWorkerResponse,
} from "./messages";

class Client {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: {
    taskId: string;
    resolve(message: Gen3IvToPidWorkerBatchMessage): void;
    reject(error: Error): void;
  };
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen3ivtopid.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen3ivtopid" },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen3IvToPidWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(new Error(event.message || "Gen3 IVs to PID Worker crashed."));
    this.post({ type: "init", moduleUrl });
  }

  async run(taskId: string, request: Gen3IvToPidRequest) {
    await this.ready;
    if (this.pending) {
      throw new Error("Gen3 IVs to PID Worker received an overlapping task.");
    }
    return new Promise<Gen3IvToPidWorkerBatchMessage>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({ type: "run", taskId, request });
    });
  }

  terminate() {
    this.fail(new Error("Gen3 IVs to PID Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Gen3IvToPidWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handle(message: Gen3IvToPidWorkerResponse) {
    if (message.type === "ready") {
      if (message.apiVersion !== GEN3_IVTOPID_API_VERSION)
        this.fail(new Error("Gen3 IVs to PID API version mismatch."));
      else {
        this.resolveReady?.();
        this.resolveReady = undefined;
        this.rejectReady = undefined;
      }
      return;
    }
    if (message.type === "error") {
      this.fail(new Error(message.message));
      return;
    }
    if (!this.pending || this.pending.taskId !== message.taskId) {
      this.fail(new Error("Gen3 IVs to PID Worker returned an unknown task."));
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

export function defaultGen3IvToPidModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen3ivtopid.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen3IvToPidWorkerPool implements Gen3IvToPidSearchEngine {
  private client?: Client;
  private cancelActive?: () => void;
  private running = false;

  constructor(private readonly moduleUrl = defaultGen3IvToPidModuleUrl()) {}

  async search(
    request: Gen3IvToPidRequest,
    options: Gen3IvToPidSearchOptions = {},
  ): Promise<Gen3IvToPidSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 IVs to PID calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const taskId = crypto.randomUUID();
    let cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      cancelled = true;
      this.client?.terminate();
      this.client = undefined;
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    try {
      if (cancelled) {
        return {
          processed: 0,
          resultCount: 0,
          percent: 0,
          elapsedMs: performance.now() - startedAt,
          workerCount: 0,
          cancelled: true,
        };
      }
      this.client ??= new Client(this.moduleUrl);
      const batch = await this.client.run(taskId, request);
      if (cancelled)
        return {
          processed: 0,
          resultCount: 0,
          percent: 0,
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      const states = decodeGen3IvToPidStates(batch.buffer);
      options.onBatch?.(states);
      const progress = {
        processed: 1,
        resultCount: states.length,
        percent: 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: false,
      };
    } catch (error) {
      if (cancelled) {
        return {
          processed: 0,
          resultCount: 0,
          percent: 0,
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      }
      this.client?.terminate();
      this.client = undefined;
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
    if (this.cancelActive) {
      this.cancelActive();
      return;
    }
    this.client?.terminate();
    this.client = undefined;
  }
}
