import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GEN5_SHA1CACHE_API_VERSION,
  GEN5_SHA1CACHE_SECONDS_PER_UNIT,
  gen5Sha1CacheUnitCount,
  type Gen5Sha1CacheRequest,
} from "../domain";
import { Gen5Sha1CacheWorkerPool } from "./Gen5Sha1CacheWorkerPool";
import type {
  Gen5Sha1CacheWorkerRequest,
  Gen5Sha1CacheWorkerResponse,
} from "./messages";

class FakeWorker {
  onmessage?: (event: MessageEvent<Gen5Sha1CacheWorkerResponse>) => void;
  onerror?: (event: ErrorEvent) => void;
  terminated = false;

  constructor() {}

  postMessage(message: Gen5Sha1CacheWorkerRequest) {
    queueMicrotask(() => {
      if (this.terminated) return;
      if (message.type === "init") {
        this.emit({
          type: "ready",
          moduleId: "gen5sha1cache",
          contractVersion: 1,
          apiVersion: GEN5_SHA1CACHE_API_VERSION,
          operations: ["searcher"],
        });
      } else if (message.type === "prepare") {
        this.emit({
          type: "prepared",
          moduleId: "gen5sha1cache",
          apiVersion: GEN5_SHA1CACHE_API_VERSION,
        });
      } else {
        const buffer =
          message.chunkIndex === 0
            ? new Uint32Array([0x89ab_cdef, 0x0123_4567, 1, 1]).buffer
            : new ArrayBuffer(0);
        this.emit({
          type: "batch",
          moduleId: "gen5sha1cache",
          apiVersion: GEN5_SHA1CACHE_API_VERSION,
          taskId: message.taskId,
          operation: "searcher",
          chunkIndex: message.chunkIndex,
          processedCount: GEN5_SHA1CACHE_SECONDS_PER_UNIT,
          resultCount: message.chunkIndex === 0 ? 1 : 0,
          elapsedMs: 1,
          buffer,
          limitReached: false,
        });
      }
    });
  }

  terminate() {
    this.terminated = true;
  }

  private emit(message: Gen5Sha1CacheWorkerResponse) {
    this.onmessage?.({
      data: message,
    } as MessageEvent<Gen5Sha1CacheWorkerResponse>);
  }
}

function request(): Gen5Sha1CacheRequest {
  return {
    profile: {
      version: "black",
      language: "english",
      dsType: "ds",
      mac: "0",
      vcount: 0x60,
      timer0Min: 0xc7f,
      timer0Max: 0xc7f,
      gxstat: 6,
      vframe: 8,
    },
    startDate: "2000-01-01",
    endDate: "2000-01-01",
    seeds: {
      initialAdvances: 0,
      maxAdvances: 0,
      entralink: new Uint32Array([1]),
      normal: new Uint32Array([2]),
      roamer: new Uint32Array([3]),
    },
  };
}

describe("Gen5Sha1CacheWorkerPool", () => {
  beforeEach(() => {
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("location", { href: "http://localhost/" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prepares seed lists once and merges every search unit", async () => {
    const value = request();
    const onProgress = vi.fn();
    const pool = new Gen5Sha1CacheWorkerPool();
    const result = await pool.search(value, { workerCount: 1, onProgress });
    expect(result.cancelled).toBe(false);
    expect(result.processedUnits).toBe(gen5Sha1CacheUnitCount(value));
    expect(result.resultCount).toBe(1);
    expect(result.cache.normal).toHaveLength(1);
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ percent: 100, resultCount: 1 }),
    );
    pool.dispose();
  });

  it("rejects invalid Worker counts before creating a Worker", async () => {
    const pool = new Gen5Sha1CacheWorkerPool();
    await expect(pool.search(request(), { workerCount: 0 })).rejects.toThrow(
      "positive integer",
    );
    pool.dispose();
  });
});
