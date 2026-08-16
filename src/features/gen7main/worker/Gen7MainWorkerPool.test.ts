import { afterEach, describe, expect, it, vi } from "vitest";
import { GEN7_MAIN_API_VERSION, GEN7_MAIN_MAX_SEED_CHUNK } from "../domain";
import { Gen7MainWorkerPool } from "./Gen7MainWorkerPool";
import type {
  Gen7MainWorkerRequest,
  Gen7MainWorkerResponse,
  Gen7MainWorkerSeedTask,
} from "./messages";

class ControlledWorker {
  static instances: ControlledWorker[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen7MainWorkerResponse>) => void) | null =
    null;
  messages: Gen7MainWorkerRequest[] = [];
  terminated = false;

  constructor() {
    ControlledWorker.instances.push(this);
  }

  postMessage(message: Gen7MainWorkerRequest) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  reply(message: Gen7MainWorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<Gen7MainWorkerResponse>);
  }

  ready() {
    this.reply({
      type: "ready",
      moduleId: "gen7main",
      apiVersion: GEN7_MAIN_API_VERSION,
      contractVersion: 1,
      operations: ["seed-search", "qr-search", "time-calculator"],
    });
  }

  seedTask() {
    return this.messages.find(
      (message): message is Gen7MainWorkerSeedTask =>
        message.type === "task" && message.operation === "seed-search",
    );
  }

  complete(task: Gen7MainWorkerSeedTask, seed: number) {
    const words = new Uint32Array([seed, 0]);
    this.reply({
      type: "seed-batch",
      moduleId: "gen7main",
      apiVersion: GEN7_MAIN_API_VERSION,
      taskId: task.taskId,
      operation: "seed-search",
      chunkIndex: task.chunkIndex,
      buffer: words.buffer,
      processedSeeds: task.chunk.seedCount,
    });
  }
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.unstubAllGlobals();
  ControlledWorker.instances = [];
});

describe("Gen7MainWorkerPool", () => {
  it("waits for every Worker and emits out-of-order chunks deterministically", async () => {
    vi.stubGlobal("Worker", ControlledWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen7MainWorkerPool();
    const emitted: number[] = [];
    const running = engine.searchSeeds(
      {
        operation: "seed-search",
        version: "sun",
        mode: "initial",
        needles: [0, 1, 2, 3, 4, 5, 6, 7],
      },
      {
        workerCount: 2,
        chunkSize: GEN7_MAIN_MAX_SEED_CHUNK,
        onBatch: (batch) => emitted.push(...batch.map((result) => result.seed)),
      },
    );
    await flush();

    const [first, second] = ControlledWorker.instances;
    first.ready();
    await flush();
    expect(first.seedTask()).toBeUndefined();
    expect(second.seedTask()).toBeUndefined();

    second.ready();
    await flush();
    const firstTask = first.seedTask()!;
    const secondTask = second.seedTask()!;
    expect(firstTask.chunkIndex).toBe(0);
    expect(secondTask.chunkIndex).toBe(1);

    second.complete(secondTask, 0x2000);
    await flush();
    expect(emitted).toEqual([]);
    first.complete(firstTask, 0x1000);
    await flush();
    expect(emitted).toEqual([0x1000, 0x2000]);

    engine.cancel();
    await expect(running).resolves.toMatchObject({
      cancelled: true,
      resultCount: 2,
      processedSeeds: GEN7_MAIN_MAX_SEED_CHUNK * 2,
    });
  });
});
