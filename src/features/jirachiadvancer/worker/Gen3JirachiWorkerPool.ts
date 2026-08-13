import {
  decodeGen3JirachiActions,
  GEN3_JIRACHI_API_VERSION,
  type Gen3JirachiRequest,
} from "../domain";
import type {
  Gen3JirachiSearchEngine,
  Gen3JirachiSearchSummary,
} from "../search";
import type {
  Gen3JirachiWorkerRequest,
  Gen3JirachiWorkerResponse,
} from "./messages";

export function defaultGen3JirachiModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen3jirachi.mjs`,
    globalThis.location.href,
  ).href;
}

export class Gen3JirachiWorkerPool implements Gen3JirachiSearchEngine {
  private worker?: Worker;
  private cancelActive?: () => void;
  private running = false;

  constructor(private readonly moduleUrl = defaultGen3JirachiModuleUrl()) {}

  async search(request: Gen3JirachiRequest): Promise<Gen3JirachiSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 Jirachi calculation is already running.");
    this.running = true;
    const startedAt = performance.now();
    const taskId = crypto.randomUUID();
    let cancelled = false;
    let resolveCancellation: (() => void) | undefined;
    const worker = new Worker(
      new URL("./gen3jirachi.worker.ts", import.meta.url),
      {
        type: "module",
        name: "pokerngkit-gen3jirachi",
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
        Extract<Gen3JirachiWorkerResponse, { type: "batch" }> | undefined
      >((resolve, reject) => {
        resolveCancellation = () => resolve(undefined);
        worker.onerror = (event) =>
          reject(new Error(event.message || "Gen3 Jirachi Worker crashed."));
        worker.onmessage = ({
          data,
        }: MessageEvent<Gen3JirachiWorkerResponse>) => {
          if (data.type === "error") reject(new Error(data.message));
          else if (data.type === "ready") {
            if (data.apiVersion !== GEN3_JIRACHI_API_VERSION)
              reject(new Error("Gen3 Jirachi API version mismatch."));
            else
              worker.postMessage({
                type: "run",
                taskId,
                request,
              } satisfies Gen3JirachiWorkerRequest);
          } else if (data.taskId === taskId) resolve(data);
          else
            reject(new Error("Gen3 Jirachi Worker returned an unknown task."));
        };
        worker.postMessage({
          type: "init",
          moduleUrl: this.moduleUrl,
        } satisfies Gen3JirachiWorkerRequest);
      });
      resolveCancellation = undefined;
      if (cancelled || !batch) {
        return {
          actions: [],
          targetAdvances: 0,
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      }
      if (batch.errorCode === 1) throw new RangeError("jirachi_outside_range");
      if (batch.errorCode === 2) throw new RangeError("jirachi_unobtainable");
      if (batch.errorCode !== 0)
        throw new Error("Gen3 Jirachi Wasm core rejected the request.");
      const actions = decodeGen3JirachiActions(batch.buffer);
      if (actions.length !== batch.resultCount)
        throw new RangeError(
          "Gen3 Jirachi result count does not match the Worker response.",
        );
      return {
        actions,
        targetAdvances: batch.targetAdvances,
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
