import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  gen5WildCharacteristic,
  type Gen5WildGeneratorRequest,
} from "../domain";
import { getGen5WildAreas } from "../encounters";
import { Gen5WildWorkerPool } from "./Gen5WildWorkerPool";
import type { Gen5WildWorkerRequest, Gen5WildWorkerResponse } from "./messages";

const request: Gen5WildGeneratorRequest = {
  mode: "generator",
  profile: {
    version: "black",
    language: "english",
    dsType: "ds",
    tid: 12345,
    sid: 54321,
    mac: "001122334455",
    vcount: 0x60,
    timer0Min: 0xc80,
    timer0Max: 0xc80,
    gxstat: 6,
    vframe: 8,
    keypresses: [true, false, false, false, false, false, false, false, false],
    skipLR: false,
    memoryLink: false,
    shinyCharm: false,
    nsPokemonReleased: false,
  },
  area: getGen5WildAreas("black", "grass", 0)[0],
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 1,
  offset: 0,
  initialIvAdvances: 0,
  maxIvAdvances: 0,
  lead: { type: "none" },
  luckyPower: "none",
  filters: {
    disabled: false,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ability: 255,
    gender: 255,
    shiny: 255,
    slotMask: 0xfff,
    levelMin: 1,
    levelMax: 100,
  },
  resultLimit: 100,
  cache: null,
};

function resultBuffer(task: Extract<Gen5WildWorkerRequest, { type: "task" }>) {
  const slot = task.request.area.slots[0];
  const ivs = [31, 31, 31, 31, 31, 31] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const pid = 0x1234_5678;
  const characteristic = gen5WildCharacteristic(pid, ivs);
  const metadata = slot.minLevel << 14;
  return new Uint32Array([
    0,
    0,
    0,
    0,
    0,
    task.chunk.start,
    0,
    pid,
    metadata,
    0x1f1f_1f1f,
    0x460f_1f1f,
    slot.species | (slot.form << 11) | (characteristic << 16),
    1 << 16,
    50 | (50 << 16),
    50 | (50 << 16),
    50 | (50 << 16),
  ]).buffer;
}

class CompletingWorker {
  static instances: CompletingWorker[] = [];
  static tasks: Array<Extract<Gen5WildWorkerRequest, { type: "task" }>> = [];
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen5WildWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    CompletingWorker.instances.push(this);
  }

  postMessage(message: Gen5WildWorkerRequest) {
    queueMicrotask(() => {
      if (message.type === "init") {
        this.emit({
          type: "ready",
          moduleId: "gen5wild",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 2,
          operations: ["generator", "searcher"],
        });
      } else if (message.type === "task") {
        CompletingWorker.tasks.push(message);
        this.emit({
          type: "batch",
          moduleId: "gen5wild",
          apiVersion: 2,
          taskId: message.taskId,
          operation: message.operation,
          chunkIndex: message.chunkIndex,
          processedCount: message.chunk.count,
          resultCount: 1,
          limitReached: message.request.resultLimit === 1,
          buffer: resultBuffer(message),
        });
      }
    });
  }

  terminate() {
    this.terminated = true;
  }

  protected emit(message: Gen5WildWorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<Gen5WildWorkerResponse>);
  }
}

class HoldingWorker extends CompletingWorker {
  override postMessage(message: Gen5WildWorkerRequest) {
    if (message.type === "init") {
      queueMicrotask(() =>
        this.emit({
          type: "ready",
          moduleId: "gen5wild",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 2,
          operations: ["generator", "searcher"],
        }),
      );
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  CompletingWorker.instances = [];
  CompletingWorker.tasks = [];
});

function globals(worker: typeof CompletingWorker) {
  vi.stubGlobal("Worker", worker);
  vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
}

describe("Gen5WildWorkerPool", () => {
  it("passes maxResults to Workers and limits decoding", async () => {
    globals(CompletingWorker);
    const pool = new Gen5WildWorkerPool();
    await expect(
      pool.search(request, { maxResults: 1, workerCount: 4 }),
    ).resolves.toMatchObject({ resultCount: 1, workerCount: 1 });
    expect(CompletingWorker.tasks).toHaveLength(1);
    expect(CompletingWorker.tasks[0].request.resultLimit).toBe(1);
    pool.dispose();
  });

  it("rejects invalid numeric options before Worker creation", async () => {
    globals(CompletingWorker);
    const pool = new Gen5WildWorkerPool();
    await expect(
      pool.search(request, { maxResults: Number.NaN }),
    ).rejects.toThrow(/finite/);
    await expect(
      pool.search(request, { workerCount: Infinity }),
    ).rejects.toThrow(/finite/);
    expect(CompletingWorker.instances).toHaveLength(0);
  });

  it("terminates pending Workers and reports cancellation", async () => {
    globals(HoldingWorker);
    const pool = new Gen5WildWorkerPool();
    const running = pool.search(request, { workerCount: 1 });
    await Promise.resolve();
    await Promise.resolve();
    pool.cancel();
    await expect(running).resolves.toMatchObject({
      cancelled: true,
      resultCount: 0,
    });
    expect(
      CompletingWorker.instances.every((worker) => worker.terminated),
    ).toBe(true);
  });
});
