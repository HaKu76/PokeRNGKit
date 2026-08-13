import {
  decodeGen3PidToIvStates,
  GEN3_PID_TO_IV_API_VERSION,
  type Gen3PidToIvRequest,
} from "../domain";
import type {
  Gen3PidToIvSearchEngine,
  Gen3PidToIvSearchSummary,
} from "../search";
import type {
  Gen3PidToIvWorkerRequest,
  Gen3PidToIvWorkerResponse,
} from "./messages";

export function defaultGen3PidToIvModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen3pidtoiv.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen3PidToIvWorkerPool implements Gen3PidToIvSearchEngine {
  private worker?: Worker;
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen3PidToIvModuleUrl()) {}

  async search(request: Gen3PidToIvRequest): Promise<Gen3PidToIvSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 PID to IVs calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const taskId = crypto.randomUUID();
    let cancelled = false;
    let resolveCancellation: (() => void) | undefined;
    const worker = new Worker(
      new URL("./gen3pidtoiv.worker.ts", import.meta.url),
      {
        type: "module",
        name: "pokerngkit-gen3pidtoiv",
      },
    );
    this.worker = worker;
    this.cancelActive = () => {
      cancelled = true;
      worker.onerror = null;
      worker.onmessage = null;
      worker.terminate();
      resolveCancellation?.();
      if (this.worker === worker) this.worker = undefined;
    };
    try {
      const batch = await new Promise<
        Extract<Gen3PidToIvWorkerResponse, { type: "batch" }> | undefined
      >((resolve, reject) => {
        resolveCancellation = () => resolve(undefined);
        worker.onerror = (event) =>
          reject(new Error(event.message || "Gen3 PID to IVs Worker crashed."));
        worker.onmessage = ({
          data,
        }: MessageEvent<Gen3PidToIvWorkerResponse>) => {
          if (data.type === "error") reject(new Error(data.message));
          else if (data.type === "ready") {
            if (data.apiVersion !== GEN3_PID_TO_IV_API_VERSION) {
              reject(new Error("Gen3 PID to IVs API version mismatch."));
            } else {
              const message: Gen3PidToIvWorkerRequest = {
                type: "run",
                taskId,
                request,
              };
              worker.postMessage(message);
            }
          } else if (data.taskId === taskId) resolve(data);
          else
            reject(
              new Error("Gen3 PID to IVs Worker returned an unknown task."),
            );
        };
        const message: Gen3PidToIvWorkerRequest = {
          type: "init",
          moduleUrl: this.moduleUrl,
        };
        worker.postMessage(message);
      });
      resolveCancellation = undefined;
      if (cancelled || !batch) {
        return {
          states: [],
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      }
      const states = decodeGen3PidToIvStates(batch.buffer);
      if (states.length !== batch.resultCount) {
        throw new RangeError(
          "Gen3 PID to IVs result count does not match the Worker response.",
        );
      }
      return {
        states,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: false,
      };
    } finally {
      resolveCancellation = undefined;
      worker.terminate();
      if (this.worker === worker) this.worker = undefined;
      this.cancelActive = undefined;
      this.running = false;
    }
  }

  cancel() {
    this.cancelActive?.();
  }

  dispose() {
    this.cancel();
    this.worker?.terminate();
    this.worker = undefined;
  }
}
