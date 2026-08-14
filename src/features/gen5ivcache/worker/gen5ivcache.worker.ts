/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN5_IVCACHE_API_VERSION,
  GEN5_IVCACHE_BATCH_RESULT_LIMIT,
  GEN5_IVCACHE_CHUNK_SEEDS,
  GEN5_IVCACHE_RESULT_WORDS,
  GEN5_IVCACHE_TOTAL_SEEDS,
  validateGen5IvCacheExecution,
} from "../domain";
import type {
  Gen5IvCacheWorkerRequest,
  Gen5IvCacheWorkerResponse,
} from "./messages";

interface Gen5IvCacheEmscriptenModule {
  HEAPU32: Uint32Array;
  _gen5ivcache_api_version(): number;
  _gen5ivcache_search(
    initialAdvances: number,
    maxAdvances: number,
    startSeed: number,
    seedCount: number,
  ): number;
  _gen5ivcache_result_ptr(): number;
  _gen5ivcache_result_count(): number;
  _gen5ivcache_processed_count(): number;
  _gen5ivcache_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen5IvCacheEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen5IvCacheEmscriptenModule | undefined;

function post(
  message: Gen5IvCacheWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen5IvCacheWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen5ivcache" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN5_IVCACHE_API_VERSION
  )
    throw new Error("Gen 5 IV Cache Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 5 IV Cache Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen5ivcache_api_version();
  if (apiVersion !== GEN5_IVCACHE_API_VERSION)
    throw new Error(
      `Gen 5 IV Cache Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen5ivcache",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["searcher"],
  });
}

function search(message: Extract<Gen5IvCacheWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 5 IV Cache Wasm module is not initialized.");
  if (
    message.moduleId !== "gen5ivcache" ||
    message.apiVersion !== GEN5_IVCACHE_API_VERSION ||
    message.operation !== "searcher" ||
    message.chunk.index !== message.chunkIndex ||
    !Number.isInteger(message.chunk.startSeed) ||
    !Number.isInteger(message.chunk.seedCount) ||
    message.chunk.startSeed < 0 ||
    message.chunk.seedCount <= 0 ||
    message.chunk.seedCount > GEN5_IVCACHE_CHUNK_SEEDS ||
    message.chunk.startSeed + message.chunk.seedCount >
      GEN5_IVCACHE_TOTAL_SEEDS ||
    validateGen5IvCacheExecution(message.request).length > 0
  )
    throw new TypeError("Invalid Gen 5 IV Cache Worker task.");

  const startedAt = performance.now();
  const resultCount = wasm._gen5ivcache_search(
    message.request.initialAdvances,
    message.request.maxAdvances,
    message.chunk.startSeed,
    message.chunk.seedCount,
  );
  const error = wasm._gen5ivcache_last_error();
  if (error !== 0)
    throw new Error(`Gen 5 IV Cache Wasm returned error ${error}.`);
  if (
    !Number.isInteger(resultCount) ||
    resultCount < 0 ||
    resultCount > GEN5_IVCACHE_BATCH_RESULT_LIMIT ||
    resultCount !== wasm._gen5ivcache_result_count() ||
    wasm._gen5ivcache_processed_count() !== message.chunk.seedCount
  )
    throw new Error("Gen 5 IV Cache Wasm returned inconsistent metadata.");
  const pointer = wasm._gen5ivcache_result_ptr();
  const wordCount = resultCount * GEN5_IVCACHE_RESULT_WORDS;
  if (
    (resultCount !== 0 && pointer === 0) ||
    (pointer & 3) !== 0 ||
    pointer + wordCount * Uint32Array.BYTES_PER_ELEMENT >
      wasm.HEAPU32.byteLength
  )
    throw new RangeError("Gen 5 IV Cache Wasm result pointer is invalid.");
  const copied = wasm.HEAPU32.slice(pointer >>> 2, (pointer >>> 2) + wordCount);
  post(
    {
      type: "batch",
      moduleId: "gen5ivcache",
      apiVersion: GEN5_IVCACHE_API_VERSION,
      taskId: message.taskId,
      operation: "searcher",
      chunkIndex: message.chunkIndex,
      processedCount: message.chunk.seedCount,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer: copied.buffer,
    },
    [copied.buffer],
  );
}

scope.onmessage = async ({ data }: MessageEvent<Gen5IvCacheWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen5ivcache",
      apiVersion: GEN5_IVCACHE_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code: data.type === "init" ? "initialization_failed" : "search_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
