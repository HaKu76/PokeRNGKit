import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import type { Gen5IdSeedFinderRequest } from "../domain";
import { Gen5IdWorkerPool } from "./Gen5IdWorkerPool";
import type { Gen5IdWorkerRequest, Gen5IdWorkerResponse } from "./messages";

const request: Gen5IdSeedFinderRequest = {
  mode: "seedFinder",
  profile: {
    version: "black",
    language: "english",
    dsType: "ds",
    mac: "0",
    vcount: 0,
    timer0Min: 0,
    timer0Max: 0,
    gxstat: 0,
    vframe: 0,
    keypresses: [true, false, false, false, false, false, false, false, false],
    skipLR: false,
  },
  date: "2000-01-01",
  hour: 0,
  minute: 0,
  minSecond: 0,
  maxSecond: 0,
  tid: 0,
  maxAdvances: 0,
  resultLimit: 1,
};

class RecoveringWorker {
  static instances: RecoveringWorker[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen5IdWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    RecoveringWorker.instances.push(this);
  }

  postMessage(message: Gen5IdWorkerRequest) {
    queueMicrotask(() => {
      if (message.type === "init") {
        this.emit({
          type: "ready",
          moduleId: "gen5id",
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
        moduleId: "gen5id",
        apiVersion: 1,
        taskId: message.taskId,
        operation: message.operation,
        chunkIndex: message.chunkIndex,
        processedCount: 1,
        resultCount: 0,
        elapsedMs: 0,
        buffer: new ArrayBuffer(0),
        limitReached: false,
      });
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: Gen5IdWorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<Gen5IdWorkerResponse>);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  RecoveringWorker.instances = [];
});

describe("Gen5IdWorkerPool", () => {
  it("rebuilds its Worker after a fatal crash", async () => {
    vi.stubGlobal("Worker", RecoveringWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const pool = new Gen5IdWorkerPool();

    await expect(pool.search(request, { workerCount: 1 })).rejects.toThrow(
      "simulated crash",
    );
    expect(RecoveringWorker.instances[0]?.terminated).toBe(true);

    await expect(
      pool.search(request, { workerCount: 1 }),
    ).resolves.toMatchObject({
      processedSeeds: 1,
      resultCount: 0,
      cancelled: false,
    });
    expect(RecoveringWorker.instances).toHaveLength(2);
    pool.dispose();
  });
});
