import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import type { Gen5DreamRadarGeneratorRequest } from "../domain";
import { Gen5DreamRadarWorkerPool } from "./Gen5DreamRadarWorkerPool";
import type {
  Gen5DreamRadarWorkerRequest,
  Gen5DreamRadarWorkerResponse,
} from "./messages";

const request: Gen5DreamRadarGeneratorRequest = {
  mode: "generator",
  profile: {
    version: "black2",
    language: "english",
    dsType: "ds",
    tid: 12345,
    sid: 54321,
    mac: "0",
    vcount: 0,
    timer0Min: 0,
    timer0Max: 0,
    gxstat: 0,
    vframe: 0,
    keypresses: [true, false, false, false, false, false, false, false, false],
    skipLR: false,
    memoryLink: false,
  },
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 0,
  badges: 0,
  slots: [{ encounter: 1, gender: 2 }],
  filters: {
    disabled: true,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    natureMask: 0x1ffffff,
    hiddenPowerMask: 0xffff,
  },
  resultLimit: 100,
};

class RecoveringWorker {
  static instances: RecoveringWorker[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage:
    ((event: MessageEvent<Gen5DreamRadarWorkerResponse>) => void) | null = null;
  terminated = false;

  constructor() {
    RecoveringWorker.instances.push(this);
  }

  postMessage(message: Gen5DreamRadarWorkerRequest) {
    queueMicrotask(() => {
      if (message.type === "init") {
        this.emit({
          type: "ready",
          moduleId: "gen5dreamradar",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 1,
          operations: ["generator", "searcher"],
        });
        return;
      }
      if (RecoveringWorker.instances[0] === this) {
        this.onerror?.({ message: "simulated crash" } as ErrorEvent);
        return;
      }
      this.emit({
        type: "batch",
        moduleId: "gen5dreamradar",
        apiVersion: 1,
        taskId: message.taskId,
        operation: "generator",
        chunkIndex: message.chunkIndex,
        processedCount: message.chunk.count,
        resultCount: 0,
        limitReached: false,
        buffer: new ArrayBuffer(0),
      });
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: Gen5DreamRadarWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen5DreamRadarWorkerResponse>);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  RecoveringWorker.instances = [];
});

describe("Gen5DreamRadarWorkerPool", () => {
  it("rebuilds its Worker after a fatal crash", async () => {
    vi.stubGlobal("Worker", RecoveringWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const pool = new Gen5DreamRadarWorkerPool();

    await expect(pool.search(request, { workerCount: 1 })).rejects.toThrow(
      "simulated crash",
    );
    expect(RecoveringWorker.instances[0]?.terminated).toBe(true);

    await expect(
      pool.search(request, { workerCount: 1 }),
    ).resolves.toMatchObject({
      processedUnits: 1,
      resultCount: 0,
      cancelled: false,
    });
    expect(RecoveringWorker.instances).toHaveLength(2);
    pool.dispose();
  });
});
