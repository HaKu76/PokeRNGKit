import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import { getGen8UndergroundSpecies } from "../data";
import type { Gen8UndergroundRequest } from "../domain";
import { Gen8UndergroundWorkerPool } from "./Gen8UndergroundWorkerPool";
import type {
  Gen8UndergroundWorkerRequest,
  Gen8UndergroundWorkerResponse,
} from "./messages";

type Task = Extract<Gen8UndergroundWorkerRequest, { type: "task" }>;

const request: Gen8UndergroundRequest = {
  profile: { version: "brilliantdiamond", tid: 12345, sid: 54321 },
  seed0: "1234567887654321",
  seed1: "8765432112345678",
  initialAdvances: 0,
  maxAdvances: 1,
  offset: 0,
  lead: 255,
  diglett: false,
  storyFlag: 1,
  levelFlag: 0,
  location: 2,
  filters: {
    disabled: true,
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
    perfectIvValue: 31,
    perfectIvCount: 0,
    species: getGen8UndergroundSpecies("brilliantdiamond", 2, 1),
  },
  resultLimit: 100,
};

function resultBuffer(advances: number) {
  const words = new Uint32Array(12);
  words[0] = advances;
  words[1] = 0x818c_f55e;
  words[2] = 0xc674_e435;
  words[3] = 413;
  words[4] = 198 | (17 << 10) | (1 << 19) | (18 << 21);
  words[5] = 28 | (1 << 8) | (23 << 16) | (10 << 24);
  words[6] = 31 | (20 << 8);
  words[7] = 26;
  words[8] = 50 | (34 << 16);
  words[9] = 31 | (39 << 16);
  words[10] = 34 | (31 << 16);
  words[11] = 14 | (210 << 8) | (20 << 16);
  return words.buffer;
}

class OrderedWorker {
  static instances: OrderedWorker[] = [];
  static tasks: Task[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage:
    ((event: MessageEvent<Gen8UndergroundWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    OrderedWorker.instances.push(this);
  }

  postMessage(message: Gen8UndergroundWorkerRequest) {
    if (message.type === "init") {
      queueMicrotask(() =>
        this.emit({
          type: "ready",
          moduleId: "gen8underground",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 2,
          operations: ["generator"],
        }),
      );
      return;
    }
    OrderedWorker.tasks.push(message);
    const emit = () =>
      this.emit({
        type: "batch",
        moduleId: "gen8underground",
        apiVersion: 2,
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

  protected emit(message: Gen8UndergroundWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen8UndergroundWorkerResponse>);
  }
}

class HoldingWorker extends OrderedWorker {
  override postMessage(message: Gen8UndergroundWorkerRequest) {
    if (message.type === "init") super.postMessage(message);
  }
}

class InvalidLengthWorker extends OrderedWorker {
  override postMessage(message: Gen8UndergroundWorkerRequest) {
    if (message.type === "init") {
      super.postMessage(message);
      return;
    }
    queueMicrotask(() =>
      this.emit({
        type: "batch",
        moduleId: "gen8underground",
        apiVersion: 2,
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

describe("Gen8UndergroundWorkerPool", () => {
  it("restores deterministic chunk order before delivering rows", async () => {
    globals(OrderedWorker);
    const rows: number[] = [];
    const pool = new Gen8UndergroundWorkerPool();
    const summary = await pool.search(request, {
      workerCount: 2,
      chunkSize: 1,
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
    const pool = new Gen8UndergroundWorkerPool();
    await expect(
      pool.search(request, { maxResults: Number.NaN }),
    ).rejects.toThrow(/finite/);
    await expect(
      pool.search(request, { workerCount: Infinity }),
    ).rejects.toThrow(/finite/);
    expect(OrderedWorker.instances).toHaveLength(0);
  });

  it("terminates pending Workers and reports cancellation", async () => {
    globals(HoldingWorker);
    const pool = new Gen8UndergroundWorkerPool();
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
    const pool = new Gen8UndergroundWorkerPool();
    await expect(pool.search(request, { workerCount: 1 })).rejects.toThrow(
      /length mismatch/,
    );
    pool.dispose();
  });
});
