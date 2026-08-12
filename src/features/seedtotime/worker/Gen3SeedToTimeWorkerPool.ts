import {
  decodeGen3SeedToTimeStates,
  GEN3_SEED_TO_TIME_API_VERSION,
  type Gen3SeedToTimeRequest,
} from "../domain";
import type {
  Gen3SeedToTimeSearchEngine,
  Gen3SeedToTimeSearchOptions,
  Gen3SeedToTimeSearchSummary,
} from "../search";
import type {
  Gen3SeedToTimeWorkerBatchMessage,
  Gen3SeedToTimeWorkerRequest,
  Gen3SeedToTimeWorkerResponse,
} from "./messages";

class Client {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: {
    taskId: string;
    resolve(message: Gen3SeedToTimeWorkerBatchMessage): void;
    reject(error: Error): void;
  };
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen3seedtotime.worker.ts", import.meta.url),
      {
        type: "module",
        name: "pokerngkit-gen3seedtotime",
      },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen3SeedToTimeWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen3 Seed to Time Worker crashed."),
      );
    this.post({ type: "init", moduleUrl });
  }

  async run(taskId: string, request: Gen3SeedToTimeRequest) {
    await this.ready;
    if (this.pending) {
      throw new Error("Gen3 Seed to Time Worker received an overlapping task.");
    }
    return new Promise<Gen3SeedToTimeWorkerBatchMessage>((resolve, reject) => {
      this.pending = { taskId, resolve, reject };
      this.post({ type: "run", taskId, request });
    });
  }

  terminate() {
    this.fail(new Error("Gen3 Seed to Time Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Gen3SeedToTimeWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handle(message: Gen3SeedToTimeWorkerResponse) {
    if (message.type === "ready") {
      if (message.apiVersion !== GEN3_SEED_TO_TIME_API_VERSION) {
        this.fail(new Error("Gen3 Seed to Time API version mismatch."));
      } else {
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
      this.fail(
        new Error("Gen3 Seed to Time Worker returned an unknown task."),
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

export function defaultGen3SeedToTimeModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen3seedtotime.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen3SeedToTimeWorkerPool implements Gen3SeedToTimeSearchEngine {
  private client?: Client;
  private cancelActive?: () => void;
  private running = false;

  constructor(private readonly moduleUrl = defaultGen3SeedToTimeModuleUrl()) {}

  async search(
    request: Gen3SeedToTimeRequest,
    options: Gen3SeedToTimeSearchOptions = {},
  ): Promise<Gen3SeedToTimeSearchSummary> {
    if (this.running) {
      throw new Error("A Gen3 Seed to Time calculation is already running.");
    }
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
          originSeed: 0,
          advances: 0,
          states: [],
          elapsedMs: performance.now() - startedAt,
          workerCount: 0,
          cancelled: true,
        };
      }
      this.client ??= new Client(this.moduleUrl);
      const batch = await this.client.run(taskId, request);
      if (cancelled) {
        return {
          originSeed: 0,
          advances: 0,
          states: [],
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      }
      const states = decodeGen3SeedToTimeStates(batch.buffer);
      if (states.length !== batch.resultCount) {
        throw new RangeError(
          "Gen3 Seed to Time result buffer count does not match the Worker response.",
        );
      }
      if (batch.originSeed > 0xffff) {
        throw new RangeError(
          "Gen3 Seed to Time Worker returned an invalid origin Seed.",
        );
      }
      return {
        originSeed: batch.originSeed,
        advances: batch.advances,
        states,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: false,
      };
    } catch (error) {
      if (cancelled) {
        return {
          originSeed: 0,
          advances: 0,
          states: [],
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
