import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  gen8EventCharacteristic,
  gen8EventHiddenPower,
  type Gen8EventRequest,
} from "../domain";
import { Gen8EventWorkerPool } from "./Gen8EventWorkerPool";
import type {
  Gen8EventWorkerRequest,
  Gen8EventWorkerResponse,
} from "./messages";

type Gen8EventWorkerTask = Extract<Gen8EventWorkerRequest, { type: "task" }>;

const request: Gen8EventRequest = {
  profile: { tid: 12345, sid: 54321 },
  seed0: "1234567887654321",
  seed1: "8765432112345678",
  initialAdvances: 0,
  maxAdvances: 1,
  offset: 0,
  event: {
    species: 490,
    ivCount: 3,
    level: 1,
    pidType: "nonshiny",
    ability: 0,
    gender: 2,
    nature: null,
    tid: 0,
    sid: 0,
    ec: 0,
    pid: 0,
    egg: true,
  },
  filters: {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    heightMin: 0,
    heightMax: 255,
    weightMin: 0,
    weightMax: 255,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
  resultLimit: 100_000,
};

function resultBuffer(advances: number) {
  const words = new Uint32Array(11);
  const ivs = [15, 30, 31, 19, 31, 31] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const power = gen8EventHiddenPower(ivs);
  const ec = 0x2203_45d0;
  words[0] = advances;
  words[1] = ec;
  words[2] = 0x8fd2_66fa;
  words[3] = (2 << 2) | (24 << 4) | (gen8EventCharacteristic(ec, ivs) << 11);
  words[4] = 52 | (48 << 8) | (power.type << 16) | (power.power << 24);
  words[5] = 15 | (30 << 8) | (31 << 16) | (19 << 24);
  words[6] = 31 | (31 << 8);
  words[7] = 93;
  words[8] = 13 | (7 << 16);
  words[9] = 7 | (7 << 16);
  words[10] = 7 | (7 << 16);
  return words.buffer;
}

class OrderedWorker {
  static instances: OrderedWorker[] = [];
  static tasks: Gen8EventWorkerTask[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen8EventWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    OrderedWorker.instances.push(this);
  }

  postMessage(message: Gen8EventWorkerRequest) {
    if (message.type === "init") {
      queueMicrotask(() =>
        this.emit({
          type: "ready",
          moduleId: "gen8event",
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
        moduleId: "gen8event",
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

  protected emit(message: Gen8EventWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen8EventWorkerResponse>);
  }
}

class HoldingWorker extends OrderedWorker {
  override postMessage(message: Gen8EventWorkerRequest) {
    if (message.type === "init") super.postMessage(message);
  }
}

class InvalidLengthWorker extends OrderedWorker {
  override postMessage(message: Gen8EventWorkerRequest) {
    if (message.type === "init") {
      super.postMessage(message);
      return;
    }
    queueMicrotask(() =>
      this.emit({
        type: "batch",
        moduleId: "gen8event",
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

describe("Gen8EventWorkerPool", () => {
  it("restores deterministic chunk order before delivering rows", async () => {
    globals(OrderedWorker);
    const rows: number[] = [];
    const pool = new Gen8EventWorkerPool();
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
    const pool = new Gen8EventWorkerPool();
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
    const pool = new Gen8EventWorkerPool();
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
    const pool = new Gen8EventWorkerPool();
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
    const pool = new Gen8EventWorkerPool();
    await expect(pool.search(request, { workerCount: 1 })).rejects.toThrow(
      /length mismatch/,
    );
    pool.dispose();
  });
});
