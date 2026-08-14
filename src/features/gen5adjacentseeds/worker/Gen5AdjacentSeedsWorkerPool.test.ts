import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import type { Gen5AdjacentSeedsRequest } from "../domain";
import { Gen5AdjacentSeedsWorkerPool } from "./Gen5AdjacentSeedsWorkerPool";
import type {
  Gen5AdjacentSeedsWorkerRequest,
  Gen5AdjacentSeedsWorkerResponse,
} from "./messages";

const request: Gen5AdjacentSeedsRequest = {
  version: "black",
  language: "english",
  dsType: "ds",
  mac: "0",
  vcount: 0,
  timer0Min: 0,
  timer0Max: 0,
  gxstat: 0,
  vframe: 0,
  memoryLink: false,
  dateTime: "2000-01-01T00:00:00",
  seconds: 1,
  buttonMask: 0,
  encounter: "standard",
  initialIVAdvance: 0,
  maxIVAdvances: 0,
};

class RecoveringWorker {
  static instances: RecoveringWorker[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage:
    ((event: MessageEvent<Gen5AdjacentSeedsWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    RecoveringWorker.instances.push(this);
  }

  postMessage(message: Gen5AdjacentSeedsWorkerRequest) {
    queueMicrotask(() => {
      if (message.type === "init") {
        this.emit({
          type: "ready",
          moduleId: "gen5adjacentseeds",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 1,
          operations: ["generator"],
        });
        return;
      }
      if (RecoveringWorker.instances[0] === this) {
        this.onerror?.({ message: "simulated crash" } as ErrorEvent);
        return;
      }
      const processedCount =
        message.chunk.kind === "generate"
          ? message.chunk.maxSecondOffset - message.chunk.minSecondOffset + 1
          : 25;
      this.emit({
        type: "batch",
        moduleId: "gen5adjacentseeds",
        apiVersion: 1,
        taskId: message.taskId,
        operation: "generator",
        chunkIndex: message.chunkIndex,
        processedCount,
        resultCount: 0,
        elapsedMs: 0,
        buffer: new ArrayBuffer(0),
      });
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: Gen5AdjacentSeedsWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen5AdjacentSeedsWorkerResponse>);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  RecoveringWorker.instances = [];
});

describe("Gen5AdjacentSeedsWorkerPool", () => {
  it("rebuilds its Worker after a fatal crash", async () => {
    vi.stubGlobal("Worker", RecoveringWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const pool = new Gen5AdjacentSeedsWorkerPool();

    await expect(pool.generate(request, { workerCount: 1 })).rejects.toThrow(
      "simulated crash",
    );
    expect(RecoveringWorker.instances[0]?.terminated).toBe(true);

    await expect(
      pool.generate(request, { workerCount: 1 }),
    ).resolves.toMatchObject({
      processedStates: 3,
      results: [],
      cancelled: false,
    });
    expect(RecoveringWorker.instances).toHaveLength(2);
    pool.dispose();
  });
});
