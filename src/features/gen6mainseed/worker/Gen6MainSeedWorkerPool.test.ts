import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN6_MAIN_SEED_API_VERSION,
  type Gen6MainSeedTwoWildRequest,
} from "../domain";
import { Gen6MainSeedWorkerPool } from "./Gen6MainSeedWorkerPool";
import type {
  Gen6MainSeedWorkerRequest,
  Gen6MainSeedWorkerResponse,
} from "./messages";

type SearchTask = Extract<Gen6MainSeedWorkerRequest, { type: "task" }>;

class ControlledWorker {
  static instances: ControlledWorker[] = [];
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage:
    ((event: MessageEvent<Gen6MainSeedWorkerResponse>) => void) | null = null;
  messages: Gen6MainSeedWorkerRequest[] = [];
  terminated = false;

  constructor() {
    ControlledWorker.instances.push(this);
  }

  postMessage(message: Gen6MainSeedWorkerRequest) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  reply(message: Gen6MainSeedWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen6MainSeedWorkerResponse>);
  }

  ready() {
    this.reply({
      type: "ready",
      moduleId: "gen6mainseed",
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN6_MAIN_SEED_API_VERSION,
      operations: ["searcher"],
    });
  }

  tasks() {
    return this.messages.filter(
      (message): message is SearchTask => message.type === "task",
    );
  }

  complete(task: SearchTask, seed: number) {
    if (task.request.mode !== "two-wilds") {
      throw new Error("Controlled worker fixture expects two-wild input.");
    }
    const buffer = Uint32Array.from([
      seed,
      task.request.firstMinFrame,
      1,
      task.request.secondMinFrame,
      2,
      0,
    ]).buffer;
    this.reply({
      type: "batch",
      moduleId: "gen6mainseed",
      apiVersion: GEN6_MAIN_SEED_API_VERSION,
      taskId: task.taskId,
      operation: "searcher",
      chunkIndex: task.chunkIndex,
      processedCount: task.chunk.endSeed - task.chunk.startSeed + 1,
      resultCount: 1,
      elapsedMs: 1,
      buffer,
    });
  }
}

const request: Gen6MainSeedTwoWildRequest = {
  mode: "two-wilds",
  startSeed: 0,
  endSeed: 3,
  firstIvs: [1, 2, 3, 4, 5, 6],
  firstMinFrame: 10,
  firstMaxFrame: 20,
  secondIvs: [7, 8, 9, 10, 11, 12],
  secondMinFrame: 30,
  secondMaxFrame: 40,
};

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.unstubAllGlobals();
  ControlledWorker.instances = [];
});

describe("Gen VI Main Seed Finder Worker Pool", () => {
  it("emits out-of-order Worker results in Seed order", async () => {
    vi.stubGlobal("Worker", ControlledWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen6MainSeedWorkerPool();
    const emitted: number[] = [];
    const running = engine.search(request, {
      workerCount: 2,
      chunkSize: 2,
      onBatch: (batch) => emitted.push(...batch.map((result) => result.seed)),
    });
    await flush();
    const [first, second] = ControlledWorker.instances;
    first.ready();
    second.ready();
    await flush();
    const firstTask = first.tasks()[0];
    const secondTask = second.tasks()[0];
    second.complete(secondTask, 2);
    await flush();
    expect(emitted).toEqual([]);
    first.complete(firstTask, 0);
    await expect(running).resolves.toMatchObject({
      resultCount: 2,
      cancelled: false,
    });
    expect(emitted).toEqual([0, 2]);
  });

  it("returns the completed prefix when cancelled", async () => {
    vi.stubGlobal("Worker", ControlledWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen6MainSeedWorkerPool();
    const running = engine.search(
      { ...request, endSeed: 5 },
      { workerCount: 2, chunkSize: 2 },
    );
    await flush();
    const [first, second] = ControlledWorker.instances;
    first.ready();
    second.ready();
    await flush();
    first.complete(first.tasks()[0], 0);
    await flush();
    engine.cancel();
    await expect(running).resolves.toMatchObject({
      processedStates: 2,
      resultCount: 1,
      cancelled: true,
      results: [{ seed: 0 }],
    });
  });
});
