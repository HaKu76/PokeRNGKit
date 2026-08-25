import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import type { Gen5EventGeneratorRequest } from "../domain";
import { Gen5EventWorkerPool } from "./Gen5EventWorkerPool";
import type {
  Gen5EventWorkerRequest,
  Gen5EventWorkerResponse,
} from "./messages";

type Gen5EventWorkerTask = Extract<Gen5EventWorkerRequest, { type: "task" }>;

const request: Gen5EventGeneratorRequest = {
  mode: "generator",
  profile: {
    version: "black",
    language: "english",
    dsType: "ds",
    tid: 12345,
    sid: 54321,
    mac: "001122334455",
    vcount: 0x60,
    timer0Min: 0x0c80,
    timer0Max: 0x0c80,
    gxstat: 6,
    vframe: 8,
    keypresses: [true, false, false, false, false, false, false, false, false],
    skipLR: false,
    memoryLink: false,
  },
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 1,
  offset: 0,
  event: {
    tid: 0,
    sid: 0,
    species: 1,
    nature: 0,
    gender: 2,
    ability: 3,
    shiny: 0,
    level: 1,
    egg: false,
    ivs: [null, null, null, null, null, null],
  },
  filters: {
    disabled: true,
    ability: 255,
    gender: 255,
    shiny: 255,
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  },
  resultLimit: 100_000,
};

function resultBuffer(advances: number) {
  const words = new Uint32Array(11);
  const pid = 0x1234_5678;
  words[5] = advances;
  words[6] = pid;
  words[7] = 50 | (4 << 7) | (1 << 14);
  words[8] = 0x1f1f_1f1f;
  words[9] = 31 | (31 << 8) | (15 << 16) | (70 << 24);
  words[10] = 1;
  return words.buffer;
}

class OrderedWorker {
  static instances: OrderedWorker[] = [];
  static tasks: Gen5EventWorkerTask[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen5EventWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    OrderedWorker.instances.push(this);
  }

  postMessage(message: Gen5EventWorkerRequest) {
    if (message.type === "init") {
      queueMicrotask(() =>
        this.emit({
          type: "ready",
          moduleId: "gen5event",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 2,
          operations: ["generator", "searcher"],
        }),
      );
      return;
    }
    OrderedWorker.tasks.push(message);
    const emit = () =>
      this.emit({
        type: "batch",
        moduleId: "gen5event",
        apiVersion: 2,
        taskId: message.taskId,
        operation: message.operation,
        chunkIndex: message.chunkIndex,
        processedCount: message.chunk.count,
        resultCount: 1,
        limitReached: false,
        buffer: resultBuffer(40 + message.chunkIndex),
      });
    if (message.chunkIndex === 0) setTimeout(emit, 5);
    else queueMicrotask(emit);
  }

  terminate() {
    this.terminated = true;
  }

  protected emit(message: Gen5EventWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen5EventWorkerResponse>);
  }
}

class HoldingWorker extends OrderedWorker {
  override postMessage(message: Gen5EventWorkerRequest) {
    if (message.type === "init") super.postMessage(message);
  }
}

class InvalidLengthWorker extends OrderedWorker {
  override postMessage(message: Gen5EventWorkerRequest) {
    if (message.type === "init") {
      super.postMessage(message);
      return;
    }
    queueMicrotask(() =>
      this.emit({
        type: "batch",
        moduleId: "gen5event",
        apiVersion: 2,
        taskId: message.taskId,
        operation: message.operation,
        chunkIndex: message.chunkIndex,
        processedCount: message.chunk.count,
        resultCount: 1,
        limitReached: false,
        buffer: new ArrayBuffer(0),
      }),
    );
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  OrderedWorker.instances = [];
  OrderedWorker.tasks = [];
});

function globals(worker: typeof OrderedWorker) {
  vi.stubGlobal("Worker", worker);
  vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
}

describe("Gen5EventWorkerPool", () => {
  it("restores deterministic chunk order before delivering rows", async () => {
    globals(OrderedWorker);
    const rows: number[] = [];
    const pool = new Gen5EventWorkerPool();
    const summary = await pool.search(request, {
      workerCount: 2,
      chunkSize: 1,
      onBatch: (batch) => rows.push(...batch.map((result) => result.advances)),
    });
    expect(rows).toEqual([40, 41]);
    expect(summary).toMatchObject({
      processedUnits: 2,
      resultCount: 2,
      cancelled: false,
    });
    pool.dispose();
  });

  it("rejects invalid numeric options before Worker creation", async () => {
    globals(OrderedWorker);
    const pool = new Gen5EventWorkerPool();
    await expect(
      pool.search(request, { maxResults: Number.NaN }),
    ).rejects.toThrow(/finite/);
    await expect(
      pool.search(request, { workerCount: Infinity }),
    ).rejects.toThrow(/finite/);
    expect(OrderedWorker.instances).toHaveLength(0);
  });

  it("passes the effective maxResults to Worker tasks and limits decoding", async () => {
    globals(OrderedWorker);
    const pool = new Gen5EventWorkerPool();
    const summary = await pool.search(request, {
      maxResults: 1,
      workerCount: 4,
    });
    expect(OrderedWorker.instances).toHaveLength(1);
    expect(OrderedWorker.tasks).toHaveLength(1);
    expect(OrderedWorker.tasks[0].request.resultLimit).toBe(1);
    expect(summary.resultCount).toBe(1);
    pool.dispose();
  });

  it("terminates pending Workers and reports cancellation", async () => {
    globals(HoldingWorker);
    const pool = new Gen5EventWorkerPool();
    const running = pool.search(request, { workerCount: 1, chunkSize: 1 });
    await Promise.resolve();
    await Promise.resolve();
    pool.cancel();
    await expect(running).resolves.toMatchObject({ cancelled: true });
    expect(OrderedWorker.instances.every((worker) => worker.terminated)).toBe(
      true,
    );
  });

  it("rejects a Worker batch whose declared result length is wrong", async () => {
    globals(InvalidLengthWorker);
    const pool = new Gen5EventWorkerPool();
    await expect(
      pool.search(request, { workerCount: 1, chunkSize: 1 }),
    ).rejects.toThrow(/length mismatch/);
    pool.dispose();
  });
});
