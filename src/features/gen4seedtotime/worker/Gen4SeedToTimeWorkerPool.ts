import {
  decodeGen4SeedToTimeCalibrations,
  decodeGen4SeedToTimeStates,
  GEN4_SEED_TO_TIME_API_VERSION,
  validateGen4SeedToTimeCalibrationRequest,
  validateGen4SeedToTimeRequest,
  type Gen4SeedToTimeCalibrationRequest,
  type Gen4SeedToTimeRequest,
} from "../domain";
import type {
  Gen4SeedToTimeCalibrationSummary,
  Gen4SeedToTimeSearchEngine,
  Gen4SeedToTimeSearchSummary,
} from "../search";
import type {
  Gen4SeedToTimeWorkerRequest,
  Gen4SeedToTimeWorkerResponse,
} from "./messages";

class Client {
  private readonly worker: Worker;
  private readonly ready: Promise<void>;
  private pending?: {
    taskId: string;
    resolve(message: Gen4SeedToTimeWorkerResponse): void;
    reject(error: Error): void;
  };
  private resolveReady?: () => void;
  private rejectReady?: (error: Error) => void;

  constructor(moduleUrl: string) {
    this.worker = new Worker(
      new URL("./gen4seedtotime.worker.ts", import.meta.url),
      { type: "module", name: "pokerngkit-gen4seedtotime" },
    );
    this.ready = new Promise((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
    this.worker.onmessage = ({
      data,
    }: MessageEvent<Gen4SeedToTimeWorkerResponse>) => this.handle(data);
    this.worker.onerror = (event) =>
      this.fail(
        new Error(event.message || "Gen4 Seed to Time Worker crashed."),
      );
    this.post({ type: "init", moduleUrl });
  }

  async run(message: Gen4SeedToTimeWorkerRequest) {
    await this.ready;
    if (message.type === "init") throw new Error("Invalid Worker task.");
    if (this.pending)
      throw new Error("Gen4 Seed to Time Worker received an overlapping task.");
    return new Promise<Gen4SeedToTimeWorkerResponse>((resolve, reject) => {
      this.pending = { taskId: message.taskId, resolve, reject };
      this.post(message);
    });
  }

  terminate() {
    this.fail(new Error("Gen4 Seed to Time Worker was terminated."));
    this.worker.terminate();
  }

  private post(message: Gen4SeedToTimeWorkerRequest) {
    this.worker.postMessage(message);
  }

  private handle(message: Gen4SeedToTimeWorkerResponse) {
    if (message.type === "ready") {
      if (message.apiVersion === GEN4_SEED_TO_TIME_API_VERSION)
        this.resolveReady?.();
      else this.rejectReady?.(new Error("Gen4 Seed to Time API mismatch."));
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
        new Error("Gen4 Seed to Time Worker returned an unknown task."),
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

export function defaultGen4SeedToTimeModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen4seedtotime.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen4SeedToTimeWorkerPool implements Gen4SeedToTimeSearchEngine {
  private client?: Client;

  constructor(private readonly moduleUrl = defaultGen4SeedToTimeModuleUrl()) {}

  async search(
    request: Gen4SeedToTimeRequest,
  ): Promise<Gen4SeedToTimeSearchSummary> {
    if (validateGen4SeedToTimeRequest(request).length)
      throw new RangeError("Invalid Gen4 Seed to Time request.");
    this.client ??= new Client(this.moduleUrl);
    const response = await this.client.run({
      type: "generate",
      taskId: crypto.randomUUID(),
      request,
    });
    if (response.type !== "generated")
      throw new Error("Gen4 Seed to Time Worker returned the wrong operation.");
    const states = decodeGen4SeedToTimeStates(response.buffer);
    if (states.length !== response.resultCount)
      throw new RangeError("Gen4 Seed to Time result count mismatch.");
    return {
      states,
      status: response.status,
      elapsedMs: response.elapsedMs,
      workerCount: 1,
      cancelled: false,
    };
  }

  async calibrate(
    request: Gen4SeedToTimeCalibrationRequest,
  ): Promise<Gen4SeedToTimeCalibrationSummary> {
    if (validateGen4SeedToTimeCalibrationRequest(request).length)
      throw new RangeError("Invalid Gen4 Seed to Time calibration request.");
    this.client ??= new Client(this.moduleUrl);
    const response = await this.client.run({
      type: "calibrate",
      taskId: crypto.randomUUID(),
      request,
    });
    if (response.type !== "calibrated")
      throw new Error("Gen4 Seed to Time Worker returned the wrong operation.");
    const states = decodeGen4SeedToTimeCalibrations(response.buffer);
    if (states.length !== response.resultCount)
      throw new RangeError("Gen4 Seed to Time calibration count mismatch.");
    return {
      states,
      elapsedMs: response.elapsedMs,
      workerCount: 1,
      cancelled: false,
    };
  }

  dispose() {
    this.client?.terminate();
    this.client = undefined;
  }
}
