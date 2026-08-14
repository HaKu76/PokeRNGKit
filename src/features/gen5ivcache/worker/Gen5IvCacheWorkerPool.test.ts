import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import type { Gen5IvCacheRequest } from "../domain";
import { Gen5IvCacheWorkerPool } from "./Gen5IvCacheWorkerPool";
import type {
  Gen5IvCacheWorkerRequest,
  Gen5IvCacheWorkerResponse,
} from "./messages";

const request: Gen5IvCacheRequest = {
  initialAdvances: 0,
  maxAdvances: 0,
};

class RecoveringWorker {
  static instances: RecoveringWorker[] = [];
  static abortNext: (() => void) | undefined;

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen5IvCacheWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    RecoveringWorker.instances.push(this);
  }

  postMessage(message: Gen5IvCacheWorkerRequest) {
    queueMicrotask(() => {
      if (message.type === "init") {
        this.emit({
          type: "ready",
          moduleId: "gen5ivcache",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 1,
          operations: ["searcher"],
        });
        return;
      }
      if (RecoveringWorker.instances[0] === this) {
        this.onerror?.({ message: "simulated crash" } as ErrorEvent);
        return;
      }
      const abort = RecoveringWorker.abortNext;
      RecoveringWorker.abortNext = undefined;
      abort?.();
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: Gen5IvCacheWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen5IvCacheWorkerResponse>);
  }
}

class ProgressFailureWorker {
  static instances: ProgressFailureWorker[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen5IvCacheWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    ProgressFailureWorker.instances.push(this);
  }

  postMessage(message: Gen5IvCacheWorkerRequest) {
    queueMicrotask(() => {
      if (message.type === "init") {
        this.onmessage?.({
          data: {
            type: "ready",
            moduleId: "gen5ivcache",
            contractVersion: RNG_MODULE_CONTRACT_VERSION,
            apiVersion: 1,
            operations: ["searcher"],
          },
        } as unknown as MessageEvent<Gen5IvCacheWorkerResponse>);
        return;
      }
      this.onmessage?.({
        data: {
          type: "batch",
          moduleId: "gen5ivcache",
          apiVersion: 1,
          taskId: message.taskId,
          operation: "searcher",
          chunkIndex: message.chunkIndex,
          processedCount: message.chunk.seedCount,
          resultCount: 0,
          elapsedMs: 0,
          buffer: new ArrayBuffer(0),
        },
      } as unknown as MessageEvent<Gen5IvCacheWorkerResponse>);
    });
  }

  terminate() {
    this.terminated = true;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  RecoveringWorker.instances = [];
  RecoveringWorker.abortNext = undefined;
});

describe("Gen5IvCacheWorkerPool", () => {
  it.each([0, Number.NaN, Number.POSITIVE_INFINITY, 1.5])(
    "rejects invalid Worker count %s",
    async (workerCount) => {
      const pool = new Gen5IvCacheWorkerPool();
      await expect(pool.search(request, { workerCount })).rejects.toThrow(
        "positive integer",
      );
      pool.dispose();
    },
  );

  it("rebuilds its Worker after a fatal crash", async () => {
    vi.stubGlobal("Worker", RecoveringWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const pool = new Gen5IvCacheWorkerPool();

    await expect(pool.search(request, { workerCount: 1 })).rejects.toThrow(
      "simulated crash",
    );
    expect(RecoveringWorker.instances[0]?.terminated).toBe(true);

    const controller = new AbortController();
    RecoveringWorker.abortNext = () => controller.abort();
    await expect(
      pool.search(request, { signal: controller.signal, workerCount: 1 }),
    ).resolves.toMatchObject({ cancelled: true });
    expect(RecoveringWorker.instances).toHaveLength(2);
    pool.dispose();
  });

  it("rebuilds its Worker when progress handling fails", async () => {
    vi.stubGlobal("Worker", ProgressFailureWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const pool = new Gen5IvCacheWorkerPool();

    await expect(
      pool.search(request, {
        workerCount: 1,
        onProgress: () => {
          throw new Error("progress failed");
        },
      }),
    ).rejects.toThrow("progress failed");
    expect(ProgressFailureWorker.instances[0]?.terminated).toBe(true);

    const controller = new AbortController();
    queueMicrotask(() => controller.abort());
    await expect(
      pool.search(request, { signal: controller.signal, workerCount: 1 }),
    ).resolves.toMatchObject({ cancelled: true });
    expect(ProgressFailureWorker.instances).toHaveLength(2);
    pool.dispose();
  });
});
