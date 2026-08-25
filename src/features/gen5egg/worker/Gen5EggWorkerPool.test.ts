import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import { gen5EggCharacteristic, type Gen5EggGeneratorRequest } from "../domain";
import { Gen5EggWorkerPool } from "./Gen5EggWorkerPool";
import type { Gen5EggWorkerRequest, Gen5EggWorkerResponse } from "./messages";

type Gen5EggWorkerTask = Extract<Gen5EggWorkerRequest, { type: "task" }>;

const request: Gen5EggGeneratorRequest = {
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
    shinyCharm: false,
  },
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 1,
  offset: 0,
  species: 1,
  masuda: false,
  parentA: {
    ivs: [31, 31, 31, 31, 31, 31],
    ability: 0,
    gender: "male",
    item: 0,
    nature: 0,
  },
  parentB: {
    ivs: [31, 31, 31, 31, 31, 31],
    ability: 2,
    gender: "female",
    item: 0,
    nature: 0,
  },
  filters: {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
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
  const words = new Uint32Array(16);
  const ivs = [31, 31, 31, 31, 31, 31] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  words[5] = advances;
  words[6] = 0x1234_5678;
  words[7] = 50 | (4 << 7) | (gen5EggCharacteristic(0x1234_5678, ivs) << 21);
  words[8] = 0x1f1f_1f1f;
  words[9] = 31 | (31 << 8) | (15 << 16) | (70 << 24);
  words[11] = 1;
  words[12] = 12 | (6 << 16);
  words[13] = 6 | (6 << 16);
  words[14] = 6 | (6 << 16);
  words[15] = 1;
  return words.buffer;
}

class OrderedWorker {
  static instances: OrderedWorker[] = [];
  static tasks: Gen5EggWorkerTask[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen5EggWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    OrderedWorker.instances.push(this);
  }

  postMessage(message: Gen5EggWorkerRequest) {
    if (message.type === "init") {
      queueMicrotask(() =>
        this.emit({
          type: "ready",
          moduleId: "gen5egg",
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
        moduleId: "gen5egg",
        apiVersion: 2,
        taskId: message.taskId,
        operation: message.operation,
        chunkIndex: message.chunkIndex,
        processedCount: message.chunk.count,
        resultCount: 1,
        limitReached: false,
        buffer: resultBuffer(39 + message.chunkIndex),
      });
    if (message.chunkIndex === 0) setTimeout(emit, 5);
    else queueMicrotask(emit);
  }

  terminate() {
    this.terminated = true;
  }

  protected emit(message: Gen5EggWorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<Gen5EggWorkerResponse>);
  }
}

class HoldingWorker extends OrderedWorker {
  override postMessage(message: Gen5EggWorkerRequest) {
    if (message.type === "init") super.postMessage(message);
  }
}

class InvalidLengthWorker extends OrderedWorker {
  override postMessage(message: Gen5EggWorkerRequest) {
    if (message.type === "init") {
      super.postMessage(message);
      return;
    }
    queueMicrotask(() =>
      this.emit({
        type: "batch",
        moduleId: "gen5egg",
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

describe("Gen5EggWorkerPool", () => {
  it("restores deterministic chunk order before delivering rows", async () => {
    globals(OrderedWorker);
    const rows: number[] = [];
    const pool = new Gen5EggWorkerPool();
    const summary = await pool.search(request, {
      workerCount: 2,
      onBatch: (batch) => rows.push(...batch.map((result) => result.advances)),
    });
    expect(rows).toEqual([39, 40]);
    expect(summary).toMatchObject({
      processedUnits: 2,
      resultCount: 2,
      cancelled: false,
    });
    pool.dispose();
  });

  it("rejects invalid numeric options before Worker creation", async () => {
    globals(OrderedWorker);
    const pool = new Gen5EggWorkerPool();
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
    const pool = new Gen5EggWorkerPool();
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
    const pool = new Gen5EggWorkerPool();
    const running = pool.search(request, { workerCount: 1 });
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
    const pool = new Gen5EggWorkerPool();
    await expect(pool.search(request, { workerCount: 1 })).rejects.toThrow(
      /length mismatch/,
    );
    pool.dispose();
  });
});
