import { afterEach, describe, expect, it, vi } from "vitest";
import { GEN7_EGG_SEED_FINDER_API_VERSION } from "../domain";
import { Gen7EggSeedFinderWorkerPool } from "./Gen7EggSeedFinderWorkerPool";
import type {
  Gen7EggSeedWorkerRequest,
  Gen7EggSeedWorkerResponse,
} from "./messages";

type SearchTask = Extract<Gen7EggSeedWorkerRequest, { type: "search" }>;

class ControlledWorker {
  static instances: ControlledWorker[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen7EggSeedWorkerResponse>) => void) | null =
    null;
  messages: Gen7EggSeedWorkerRequest[] = [];
  terminated = false;

  constructor() {
    ControlledWorker.instances.push(this);
  }

  postMessage(message: Gen7EggSeedWorkerRequest) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  reply(message: Gen7EggSeedWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen7EggSeedWorkerResponse>);
  }

  ready() {
    this.reply({
      type: "ready",
      apiVersion: GEN7_EGG_SEED_FINDER_API_VERSION,
    });
  }

  searchTasks() {
    return this.messages.filter(
      (message): message is SearchTask => message.type === "search",
    );
  }

  complete(task: SearchTask, marker: number) {
    const words = new Uint32Array([marker, marker + 1, marker + 2, marker + 3]);
    this.reply({
      type: "batch",
      taskId: task.taskId,
      chunkIndex: task.chunk.index,
      stateCount: task.chunk.endSeed - task.chunk.startSeed + 1,
      resultCount: 1,
      elapsedMs: 1,
      buffer: words.buffer,
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

describe("Gen7EggSeedFinderWorkerPool", () => {
  it("emits out-of-order Worker results in Seed range order", async () => {
    vi.stubGlobal("Worker", ControlledWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen7EggSeedFinderWorkerPool();
    const emitted: number[] = [];
    const running = engine.search(
      {
        startSeed: 0,
        endSeed: 3,
        natureList: [0, 1, 2, 3, 4, 5, 6, 7],
        shinyCharm: false,
      },
      {
        workerCount: 2,
        chunkSize: 2,
        onBatch: (batch) => emitted.push(...batch.map((item) => item.state[0])),
      },
    );
    await flush();

    const [first, second] = ControlledWorker.instances;
    first.ready();
    second.ready();
    await flush();
    const firstTask = first.searchTasks()[0];
    const secondTask = second.searchTasks()[0];
    expect(firstTask.chunk.index).toBe(0);
    expect(secondTask.chunk.index).toBe(1);

    second.complete(secondTask, 20);
    await flush();
    expect(emitted).toEqual([]);
    first.complete(firstTask, 10);

    await expect(running).resolves.toMatchObject({
      cancelled: false,
      resultCount: 2,
      results: [{ state: [10, 11, 12, 13] }, { state: [20, 21, 22, 23] }],
    });
    expect(emitted).toEqual([10, 20]);
  });

  it("returns completed prefix results when cancelled", async () => {
    vi.stubGlobal("Worker", ControlledWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen7EggSeedFinderWorkerPool();
    const running = engine.search(
      {
        startSeed: 0,
        endSeed: 5,
        natureList: [0, 1, 2, 3, 4, 5, 6, 7],
        shinyCharm: false,
      },
      { workerCount: 2, chunkSize: 2 },
    );
    await flush();

    const [first, second] = ControlledWorker.instances;
    first.ready();
    second.ready();
    await flush();
    first.complete(first.searchTasks()[0], 10);
    await flush();
    expect(first.searchTasks()).toHaveLength(2);

    engine.cancel();
    await expect(running).resolves.toMatchObject({
      cancelled: true,
      processedStates: 2,
      resultCount: 1,
      results: [{ state: [10, 11, 12, 13] }],
    });
  });
});
