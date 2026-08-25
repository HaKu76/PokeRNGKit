import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  gen5HiddenGrottoCharacteristic,
  type Gen5HiddenGrottoGeneratorRequest,
  type Gen5HiddenGrottoPreparedCache,
  type Gen5HiddenGrottoRequest,
  type Gen5HiddenGrottoSearcherRequest,
} from "../domain";
import { GEN5_HIDDEN_GROTTO_AREAS } from "../encounters";
import {
  decodeGen5HiddenGrottoResults,
  Gen5HiddenGrottoWorkerPool,
} from "./Gen5HiddenGrottoWorkerPool";
import type {
  Gen5HiddenGrottoWorkerRequest,
  Gen5HiddenGrottoWorkerResponse,
} from "./messages";

const generator: Gen5HiddenGrottoGeneratorRequest = {
  operation: "slot-generator",
  profile: {
    version: "black2",
    language: "english",
    dsType: "ds",
    tid: 12345,
    sid: 54321,
    mac: "001122334455",
    vcount: 0x82,
    timer0Min: 0x1100,
    timer0Max: 0x1100,
    gxstat: 6,
    vframe: 8,
    keypresses: [true, false, false, false, false, false, false, false, false],
    skipLR: false,
    memoryLink: false,
    shinyCharm: true,
  },
  area: GEN5_HIDDEN_GROTTO_AREAS[0],
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 0,
  offset: 0,
  initialIvAdvances: 0,
  maxIvAdvances: 0,
  lead: { type: "none" },
  grottoPower: "none",
  selectedGroup: 0,
  selectedSlot: 0,
  gender: 0,
  slotFilters: { slotMask: 0, genderMask: 0, groupMask: 0 },
  pokemonFilters: {
    disabled: false,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
    natureMask: 0,
    hiddenPowerMask: 0,
    levelMin: 1,
    levelMax: 100,
  },
  resultLimit: 100,
  cache: null,
};

const descriptor = {
  key: "hidden-grotto-cache",
  mode: "iv-sha" as const,
  ivEntryCount: 1,
  shaEntryCount: 1,
};

function withoutSeed(
  source: Gen5HiddenGrottoGeneratorRequest,
): Omit<Gen5HiddenGrottoGeneratorRequest, "seed"> {
  const copy = { ...source };
  delete (copy as Partial<Gen5HiddenGrottoGeneratorRequest>).seed;
  return copy;
}

const searcher: Gen5HiddenGrottoSearcherRequest = {
  ...withoutSeed(generator),
  operation: "pokemon-searcher",
  startDate: "2026-08-14",
  endDate: "2026-08-14",
  pokemonFilters: {
    ...generator.pokemonFilters,
    ivMin: [30, 30, 30, 0, 30, 30],
    levelMin: 10,
    levelMax: 15,
  },
  cache: descriptor,
};

const cache: Gen5HiddenGrottoPreparedCache = {
  descriptor,
  ivEntries: new Uint32Array([0, 0x1234_5678]),
  shaEntries: new Uint32Array([0, 9_722, 0, 0x1234_5678]),
};

function slotResultBuffer(
  task: Extract<Gen5HiddenGrottoWorkerRequest, { type: "task" }>,
) {
  const metadata = 0;
  return new Uint32Array([
    0,
    0,
    0,
    0,
    0,
    task.request.initialAdvances + task.chunk.start,
    0,
    task.request.area.pokemon[0].species,
    metadata,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]).buffer;
}

function pokemonResultBuffer(request: Gen5HiddenGrottoRequest) {
  const ivs = [31, 31, 31, 31, 31, 31] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const pid = 0x1234_5678;
  const characteristic = gen5HiddenGrottoCharacteristic(pid, ivs);
  const date = 2026 | (8 << 16) | (14 << 24);
  const timer0Buttons = request.profile.timer0Min;
  const metadata = 10 << 14;
  return new Uint32Array([
    0,
    0,
    date,
    0,
    timer0Buttons,
    0,
    0,
    pid,
    metadata,
    0x1f1f_1f1f,
    0x460f_1f1f,
    206 | (characteristic << 16),
    1,
    50 | (50 << 16),
    50 | (50 << 16),
    50 | (50 << 16),
  ]).buffer;
}

class CompletingWorker {
  static instances: CompletingWorker[] = [];
  static messages: Gen5HiddenGrottoWorkerRequest[] = [];
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage:
    ((event: MessageEvent<Gen5HiddenGrottoWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    CompletingWorker.instances.push(this);
  }

  postMessage(message: Gen5HiddenGrottoWorkerRequest) {
    CompletingWorker.messages.push(message);
    queueMicrotask(() => {
      if (message.type === "init") {
        this.emit({
          type: "ready",
          moduleId: "gen5hiddengrotto",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 2,
          operations: [
            "slot-generator",
            "slot-searcher",
            "pokemon-generator",
            "pokemon-searcher",
          ],
        });
      } else if (message.type === "cache") {
        this.emit({
          type: "cache-ready",
          moduleId: "gen5hiddengrotto",
          apiVersion: 2,
          cacheKey: message.cacheKey,
        });
      } else if (message.type === "cache-clear") {
        this.emit({
          type: "cache-ready",
          moduleId: "gen5hiddengrotto",
          apiVersion: 2,
          cacheKey: "",
        });
      } else {
        const buffer =
          message.operation === "pokemon-searcher"
            ? pokemonResultBuffer(message.request)
            : slotResultBuffer(message);
        this.emit({
          type: "batch",
          moduleId: "gen5hiddengrotto",
          apiVersion: 2,
          taskId: message.taskId,
          operation: message.operation,
          chunkIndex: message.chunkIndex,
          processedCount: message.chunk.count,
          resultCount: 1,
          limitReached: false,
          buffer,
        });
      }
    });
  }

  terminate() {
    this.terminated = true;
  }

  protected emit(message: Gen5HiddenGrottoWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen5HiddenGrottoWorkerResponse>);
  }
}

class HoldingWorker extends CompletingWorker {
  override postMessage(message: Gen5HiddenGrottoWorkerRequest) {
    CompletingWorker.messages.push(message);
    if (message.type === "init") {
      queueMicrotask(() =>
        this.emit({
          type: "ready",
          moduleId: "gen5hiddengrotto",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 2,
          operations: [
            "slot-generator",
            "slot-searcher",
            "pokemon-generator",
            "pokemon-searcher",
          ],
        }),
      );
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  CompletingWorker.instances = [];
  CompletingWorker.messages = [];
});

function globals(worker: typeof CompletingWorker) {
  vi.stubGlobal("Worker", worker);
  vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
}

describe("Gen5HiddenGrottoWorkerPool", () => {
  it("handshakes all four workflows and decodes a 16-word Slot batch", async () => {
    globals(CompletingWorker);
    const onBatch = vi.fn();
    const pool = new Gen5HiddenGrottoWorkerPool();
    await expect(
      pool.search(generator, { workerCount: 1, onBatch }),
    ).resolves.toMatchObject({
      resultCount: 1,
      workerCount: 1,
    });
    expect(onBatch.mock.calls[0][0][0]).toMatchObject({
      kind: "slot",
      data: 206,
      group: 0,
      slot: 0,
    });
    const init = CompletingWorker.messages.find(
      (message) => message.type === "init",
    );
    expect(init).toMatchObject({
      moduleId: "gen5hiddengrotto",
      apiVersion: 2,
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
    });
    pool.dispose();
  });

  it("loads matching IV+SHA cache words before a Pokemon search", async () => {
    globals(CompletingWorker);
    const pool = new Gen5HiddenGrottoWorkerPool();
    await expect(
      pool.search(searcher, { workerCount: 1, cache }),
    ).resolves.toMatchObject({
      totalUnits: 1,
      resultCount: 1,
    });
    const cacheMessage = CompletingWorker.messages.find(
      (message) => message.type === "cache",
    );
    expect(cacheMessage).toMatchObject({
      cacheKey: descriptor.key,
      mode: "iv-sha",
      ivEntryCount: 1,
      shaEntryCount: 1,
    });
    expect(
      new Uint32Array(
        cacheMessage && cacheMessage.type === "cache"
          ? cacheMessage.ivEntries
          : new ArrayBuffer(0),
      ),
    ).toEqual(cache.ivEntries);
    pool.dispose();
  });

  it("rejects misaligned result buffers and mismatched cache descriptors", async () => {
    expect(() =>
      decodeGen5HiddenGrottoResults(new Uint32Array(15).buffer, generator),
    ).toThrow(/misaligned/);
    globals(CompletingWorker);
    const pool = new Gen5HiddenGrottoWorkerPool();
    await expect(
      pool.search(searcher, {
        cache: { ...cache, descriptor: { ...descriptor, key: "wrong" } },
      }),
    ).rejects.toThrow(/does not match/);
    expect(CompletingWorker.instances).toHaveLength(0);
  });

  it("terminates pending Workers and reports cancellation", async () => {
    globals(HoldingWorker);
    const pool = new Gen5HiddenGrottoWorkerPool();
    const running = pool.search(generator, { workerCount: 1 });
    for (
      let index = 0;
      index < 10 &&
      !CompletingWorker.messages.some((message) => message.type === "task");
      index += 1
    ) {
      await Promise.resolve();
    }
    expect(
      CompletingWorker.messages.some((message) => message.type === "task"),
    ).toBe(true);
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
