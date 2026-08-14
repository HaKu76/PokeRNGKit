import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import { GEN8_ID_API_VERSION, type Gen8IdRequest } from "../domain";
import { Gen8IdWorkerPool } from "./Gen8IdWorkerPool";
import type { Gen8IdWorkerRequest, Gen8IdWorkerResponse } from "./messages";

const request: Gen8IdRequest = {
  seed0: 0x4000_0000_0000_0000n,
  seed1: 0x4000_0000_0000_0000n,
  initialAdvances: 0,
  maxAdvances: 4,
  filters: { mode: "none", values: [] },
};

function bufferFor(message: Extract<Gen8IdWorkerRequest, { type: "task" }>) {
  const words = new Uint32Array(message.chunk.stateCount * 4);
  for (let index = 0; index < message.chunk.stateCount; index++) {
    const offset = index * 4;
    const advances =
      (message.request.initialAdvances + message.chunk.offset + index) >>> 0;
    const tidSid = advances + 1;
    const tid = tidSid & 0xffff;
    const sid = tidSid >>> 16;
    words[offset] = advances;
    words[offset + 1] = tidSid;
    words[offset + 2] = (tid ^ sid) >>> 4;
    words[offset + 3] = tidSid % 1_000_000;
  }
  return words.buffer;
}

abstract class MockWorkerBase {
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen8IdWorkerResponse>) => void) | null =
    null;
  terminated = false;

  postMessage(message: Gen8IdWorkerRequest) {
    if (message.type === "init") {
      queueMicrotask(() =>
        this.emit({
          type: "ready",
          moduleId: "gen8id",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: GEN8_ID_API_VERSION,
          operations: ["generator"],
        }),
      );
      return;
    }
    this.run(message);
  }

  terminate() {
    this.terminated = true;
  }

  protected abstract run(
    message: Extract<Gen8IdWorkerRequest, { type: "task" }>,
  ): void;

  protected batch(message: Extract<Gen8IdWorkerRequest, { type: "task" }>) {
    const buffer = bufferFor(message);
    this.emit({
      type: "batch",
      moduleId: "gen8id",
      apiVersion: GEN8_ID_API_VERSION,
      taskId: message.taskId,
      operation: "generator",
      chunkIndex: message.chunkIndex,
      processedCount: message.chunk.stateCount,
      resultCount: message.chunk.stateCount,
      elapsedMs: 0,
      buffer,
    });
  }

  protected emit(message: Gen8IdWorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<Gen8IdWorkerResponse>);
  }
}

class OutOfOrderWorker extends MockWorkerBase {
  protected run(message: Extract<Gen8IdWorkerRequest, { type: "task" }>) {
    setTimeout(() => this.batch(message), message.chunkIndex === 0 ? 5 : 0);
  }
}

class RecoveringWorker extends MockWorkerBase {
  static instances: RecoveringWorker[] = [];

  constructor() {
    super();
    RecoveringWorker.instances.push(this);
  }

  protected run(message: Extract<Gen8IdWorkerRequest, { type: "task" }>) {
    queueMicrotask(() => {
      if (RecoveringWorker.instances[0] === this)
        this.onerror?.({ message: "simulated crash" } as ErrorEvent);
      else this.batch(message);
    });
  }
}

class HangingWorker extends MockWorkerBase {
  static taskCount = 0;

  protected run() {
    HangingWorker.taskCount++;
  }
}

class LimitThenCrashWorker extends MockWorkerBase {
  static instances: LimitThenCrashWorker[] = [];
  private readonly index: number;

  constructor() {
    super();
    this.index = LimitThenCrashWorker.instances.length;
    LimitThenCrashWorker.instances.push(this);
  }

  protected run(message: Extract<Gen8IdWorkerRequest, { type: "task" }>) {
    if (this.index === 0) queueMicrotask(() => this.batch(message));
    else
      setTimeout(
        () => this.onerror?.({ message: "late crash" } as ErrorEvent),
        5,
      );
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  RecoveringWorker.instances = [];
  HangingWorker.taskCount = 0;
  LimitThenCrashWorker.instances = [];
});

describe("Gen8IdWorkerPool", () => {
  it("merges out-of-order Worker batches by chunk index", async () => {
    vi.stubGlobal("Worker", OutOfOrderWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const rows: number[] = [];
    const pool = new Gen8IdWorkerPool();

    const summary = await pool.search(request, {
      chunkSize: 2,
      workerCount: 2,
      onBatch: (batch) => rows.push(...batch.map((state) => state.advances)),
    });

    expect(rows).toEqual([0, 1, 2, 3]);
    expect(summary).toMatchObject({
      processedStates: 4,
      resultCount: 4,
      cancelled: false,
    });
    pool.dispose();
  });

  it("rebuilds its Workers after a fatal crash", async () => {
    vi.stubGlobal("Worker", RecoveringWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const pool = new Gen8IdWorkerPool();
    const oneState = { ...request, maxAdvances: 1 };

    await expect(pool.search(oneState, { workerCount: 1 })).rejects.toThrow(
      "simulated crash",
    );
    expect(RecoveringWorker.instances[0]?.terminated).toBe(true);
    await expect(
      pool.search(oneState, { workerCount: 1 }),
    ).resolves.toMatchObject({ processedStates: 1, resultCount: 1 });
    expect(RecoveringWorker.instances).toHaveLength(2);
    pool.dispose();
  });

  it("terminates active Workers and reports cancellation", async () => {
    vi.stubGlobal("Worker", HangingWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const pool = new Gen8IdWorkerPool();
    const pending = pool.search(request, { workerCount: 1 });

    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(HangingWorker.taskCount).toBe(1);
    pool.cancel();

    await expect(pending).resolves.toMatchObject({
      processedStates: 0,
      resultCount: 0,
      cancelled: true,
    });
    pool.dispose();
  });

  it("does not start Workers for an already aborted request", async () => {
    const controller = new AbortController();
    controller.abort();
    const pool = new Gen8IdWorkerPool();

    await expect(
      pool.search(request, {
        signal: controller.signal,
        workerCount: 1,
      }),
    ).resolves.toMatchObject({
      processedStates: 0,
      resultCount: 0,
      workerCount: 0,
      cancelled: true,
    });
    pool.dispose();
  });

  it("does not stay busy after rejecting an invalid chunk size", async () => {
    vi.stubGlobal("Worker", OutOfOrderWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const pool = new Gen8IdWorkerPool();

    await expect(pool.search(request, { chunkSize: 0 })).rejects.toThrow(
      "Invalid Gen8 ID chunk size",
    );
    await expect(
      pool.search(request, { chunkSize: 2, workerCount: 1 }),
    ).resolves.toMatchObject({ processedStates: 4, resultCount: 4 });
    pool.dispose();
  });

  it("keeps the completed result-limit summary after a late Worker crash", async () => {
    vi.stubGlobal("Worker", LimitThenCrashWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const rows: number[] = [];
    const pool = new Gen8IdWorkerPool();

    const summary = await pool.search(request, {
      chunkSize: 2,
      maxResults: 1,
      workerCount: 2,
      onBatch: (batch) => rows.push(...batch.map((state) => state.advances)),
    });

    expect(rows).toEqual([0]);
    expect(summary).toMatchObject({
      resultCount: 1,
      cancelled: false,
      resultLimitReached: true,
    });
    expect(
      LimitThenCrashWorker.instances.every((worker) => worker.terminated),
    ).toBe(true);
    pool.dispose();
  });
});
