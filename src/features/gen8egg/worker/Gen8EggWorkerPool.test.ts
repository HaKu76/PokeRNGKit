import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import { gen8EggCharacteristic, type Gen8EggRequest } from "../domain";
import { Gen8EggWorkerPool } from "./Gen8EggWorkerPool";
import type { Gen8EggWorkerRequest, Gen8EggWorkerResponse } from "./messages";

type Gen8EggWorkerTask = Extract<Gen8EggWorkerRequest, { type: "task" }>;

const request: Gen8EggRequest = {
  profile: {
    tid: 12345,
    sid: 54321,
    shinyCharm: true,
    ovalCharm: true,
  },
  seed0: "1234567887654321",
  seed1: "8765432112345678",
  initialAdvances: 0,
  maxAdvances: 1,
  offset: 0,
  compatibility: 70,
  species: 1,
  masuda: true,
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
  },
  resultLimit: 100_000,
};

function resultBuffer(advances: number) {
  const words = new Uint32Array(13);
  const ivs = [31, 31, 31, 31, 31, 31] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const ec = 0x1234_5678;
  const psv = request.profile.tid ^ request.profile.sid ^ 0x10;
  words[0] = advances;
  words[1] = 0x5a0f_5eed;
  words[2] = ec;
  words[3] = (psv << 16) >>> 0;
  words[4] = gen8EggCharacteristic(ec, ivs) << 11;
  words[5] = 0x1f1f_1f1f;
  words[6] = 31 | (31 << 8) | (15 << 16) | (70 << 24);
  words[8] = 1;
  words[9] = 12 | (6 << 16);
  words[10] = 6 | (6 << 16);
  words[11] = 6 | (6 << 16);
  words[12] = 1;
  return words.buffer;
}

class OrderedWorker {
  static instances: OrderedWorker[] = [];
  static tasks: Gen8EggWorkerTask[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen8EggWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    OrderedWorker.instances.push(this);
  }

  postMessage(message: Gen8EggWorkerRequest) {
    if (message.type === "init") {
      queueMicrotask(() =>
        this.emit({
          type: "ready",
          moduleId: "gen8egg",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 1,
          operations: ["generator"],
        }),
      );
      return;
    }
    OrderedWorker.tasks.push(message);
    const emit = () =>
      this.emit({
        type: "batch",
        moduleId: "gen8egg",
        apiVersion: 1,
        taskId: message.taskId,
        operation: "generator",
        chunkIndex: message.chunkIndex,
        processedCount: message.chunk.count,
        resultCount: 1,
        limitReached: false,
        buffer: resultBuffer(message.chunk.start),
      });
    if (message.chunkIndex === 0) setTimeout(emit, 5);
    else queueMicrotask(emit);
  }

  terminate() {
    this.terminated = true;
  }

  protected emit(message: Gen8EggWorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<Gen8EggWorkerResponse>);
  }
}

class HoldingWorker extends OrderedWorker {
  override postMessage(message: Gen8EggWorkerRequest) {
    if (message.type === "init") super.postMessage(message);
  }
}

class InvalidLengthWorker extends OrderedWorker {
  override postMessage(message: Gen8EggWorkerRequest) {
    if (message.type === "init") {
      super.postMessage(message);
      return;
    }
    queueMicrotask(() =>
      this.emit({
        type: "batch",
        moduleId: "gen8egg",
        apiVersion: 1,
        taskId: message.taskId,
        operation: "generator",
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

describe("Gen8EggWorkerPool", () => {
  it("restores deterministic chunk order before delivering rows", async () => {
    globals(OrderedWorker);
    const rows: number[] = [];
    const pool = new Gen8EggWorkerPool();
    const summary = await pool.search(request, {
      workerCount: 2,
      onBatch: (batch) => rows.push(...batch.map((result) => result.advances)),
    });
    expect(rows).toEqual([0, 1]);
    expect(summary).toMatchObject({
      processedStates: 2,
      resultCount: 2,
      cancelled: false,
    });
    pool.dispose();
  });

  it("rejects invalid numeric options before Worker creation", async () => {
    globals(OrderedWorker);
    const pool = new Gen8EggWorkerPool();
    await expect(
      pool.search(request, { maxResults: Number.NaN }),
    ).rejects.toThrow(/finite/);
    await expect(
      pool.search(request, { workerCount: Infinity }),
    ).rejects.toThrow(/finite/);
    expect(OrderedWorker.instances).toHaveLength(0);
  });

  it("passes the effective result limit to Worker tasks", async () => {
    globals(OrderedWorker);
    const pool = new Gen8EggWorkerPool();
    const summary = await pool.search(request, {
      maxResults: 1,
      workerCount: 4,
    });
    expect(OrderedWorker.instances).toHaveLength(1);
    expect(OrderedWorker.tasks).toHaveLength(1);
    expect(OrderedWorker.tasks[0].request.resultLimit).toBe(1);
    expect(summary).toMatchObject({
      resultCount: 1,
      resultLimitReached: true,
    });
    pool.dispose();
  });

  it("terminates pending Workers and reports cancellation", async () => {
    globals(HoldingWorker);
    const pool = new Gen8EggWorkerPool();
    const running = pool.search(request, { workerCount: 1 });
    await Promise.resolve();
    await Promise.resolve();
    pool.cancel();
    await expect(running).resolves.toMatchObject({ cancelled: true });
    expect(OrderedWorker.instances.every((worker) => worker.terminated)).toBe(
      true,
    );
  });

  it("rejects a batch whose declared result length is wrong", async () => {
    globals(InvalidLengthWorker);
    const pool = new Gen8EggWorkerPool();
    await expect(pool.search(request, { workerCount: 1 })).rejects.toThrow(
      /length mismatch/,
    );
    pool.dispose();
  });
});
