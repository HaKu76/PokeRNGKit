import { afterEach, describe, expect, it, vi } from "vitest";
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import type {
  Gen5StaticPreparedCache,
  Gen5StaticSearcherRequest,
} from "../domain";
import { gen5StaticTemplatesForVersion } from "../encounters";
import { Gen5StaticWorkerPool } from "./Gen5StaticWorkerPool";
import type {
  Gen5StaticWorkerRequest,
  Gen5StaticWorkerResponse,
} from "./messages";

const cache: Gen5StaticPreparedCache = {
  descriptor: {
    key: "static-cache",
    mode: "iv-sha",
    ivEntryCount: 1,
    shaEntryCount: 1,
  },
  ivEntries: new Uint32Array([0, 0x1234_5678]),
  shaEntries: new Uint32Array([0, 0, 0x89ab_cdef, 0x1234_5678]),
};

const request: Gen5StaticSearcherRequest = {
  mode: "searcher",
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
  template: gen5StaticTemplatesForVersion("starters", "black2")[0],
  startDate: "2026-08-14",
  endDate: "2026-08-14",
  initialAdvances: 0,
  maxAdvances: 0,
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
  },
  resultLimit: 100,
  cache: cache.descriptor,
};

class CacheWorker {
  static instances: CacheWorker[] = [];

  messages: Gen5StaticWorkerRequest[] = [];
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<Gen5StaticWorkerResponse>) => void) | null =
    null;
  terminated = false;

  constructor() {
    CacheWorker.instances.push(this);
  }

  postMessage(message: Gen5StaticWorkerRequest) {
    this.messages.push(message);
    queueMicrotask(() => {
      if (message.type === "init") {
        this.emit({
          type: "ready",
          moduleId: "gen5static",
          contractVersion: RNG_MODULE_CONTRACT_VERSION,
          apiVersion: 2,
          operations: ["generator", "searcher"],
        });
      } else if (message.type === "cache") {
        this.emit({
          type: "cache-ready",
          moduleId: "gen5static",
          apiVersion: 2,
          cacheKey: message.cacheKey,
        });
      } else if (message.type === "cache-clear") {
        this.emit({
          type: "cache-ready",
          moduleId: "gen5static",
          apiVersion: 2,
          cacheKey: "",
        });
      } else {
        this.emit({
          type: "batch",
          moduleId: "gen5static",
          apiVersion: 2,
          taskId: message.taskId,
          operation: message.operation,
          chunkIndex: message.chunkIndex,
          processedCount: message.chunk.count,
          resultCount: 0,
          limitReached: false,
          buffer: new ArrayBuffer(0),
        });
      }
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: Gen5StaticWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen5StaticWorkerResponse>);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  CacheWorker.instances = [];
});

describe("Gen5StaticWorkerPool", () => {
  it("loads a prepared cache once per Worker before dispatching tasks", async () => {
    vi.stubGlobal("Worker", CacheWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const pool = new Gen5StaticWorkerPool();

    await expect(
      pool.search(request, { cache, workerCount: 1 }),
    ).resolves.toMatchObject({
      processedUnits: 1,
      resultCount: 0,
      cancelled: false,
    });
    await expect(
      pool.search(request, { cache, workerCount: 1 }),
    ).resolves.toMatchObject({
      processedUnits: 1,
      resultCount: 0,
      cancelled: false,
    });

    const messages = CacheWorker.instances[0].messages;
    expect(messages.filter((message) => message.type === "cache")).toHaveLength(
      1,
    );
    expect(messages.map((message) => message.type)).toEqual([
      "init",
      "cache",
      "task",
      "task",
    ]);
    pool.dispose();
  });
});
