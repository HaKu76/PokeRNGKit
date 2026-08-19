/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen6MainSeedRequest,
  GEN6_MAIN_SEED_API_VERSION,
  GEN6_MAIN_SEED_REQUEST_WORDS,
  GEN6_MAIN_SEED_RESULT_WORDS,
  validateGen6MainSeedRequest,
} from "../domain";
import type {
  Gen6MainSeedWorkerRequest,
  Gen6MainSeedWorkerResponse,
} from "./messages";

interface Gen6MainSeedWasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6mainseed_api_version(): number;
  _gen6mainseed_search(pointer: number): number;
  _gen6mainseed_result_ptr(): number;
  _gen6mainseed_result_count(): number;
  _gen6mainseed_processed_count(): number;
  _gen6mainseed_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen6MainSeedWasmModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen6MainSeedWasmModule | undefined;

function post(
  message: Gen6MainSeedWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen6MainSeedWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen6mainseed" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_MAIN_SEED_API_VERSION
  ) {
    throw new Error("Gen VI Main Seed Finder Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen VI Main Seed Finder Wasm has no factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6mainseed_api_version() !== GEN6_MAIN_SEED_API_VERSION)
    throw new Error("Gen VI Main Seed Finder Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6mainseed",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN6_MAIN_SEED_API_VERSION,
    operations: ["searcher"],
  });
}

function search(message: Extract<Gen6MainSeedWorkerRequest, { type: "task" }>) {
  const module = wasm;
  if (!module)
    throw new Error("Gen VI Main Seed Finder Wasm is not initialized.");
  if (
    message.moduleId !== "gen6mainseed" ||
    message.apiVersion !== GEN6_MAIN_SEED_API_VERSION ||
    message.operation !== "searcher" ||
    message.chunk.index !== message.chunkIndex
  ) {
    throw new TypeError("Invalid Gen VI Main Seed Finder Worker task.");
  }
  validateGen6MainSeedRequest(message.request);
  const request = encodeGen6MainSeedRequest(message.request, message.chunk);
  if (request.length !== GEN6_MAIN_SEED_REQUEST_WORDS)
    throw new Error("Gen VI Main Seed Finder request packing changed.");
  const pointer = module._malloc(request.byteLength);
  if (!pointer)
    throw new Error("Gen VI Main Seed Finder Wasm allocation failed.");
  const startedAt = performance.now();
  let resultCount: number;
  try {
    if (
      (pointer & 3) !== 0 ||
      pointer + request.byteLength > module.HEAPU32.byteLength
    ) {
      throw new RangeError(
        "Gen VI Main Seed Finder Wasm request pointer is invalid.",
      );
    }
    module.HEAPU32.set(request, pointer >>> 2);
    resultCount = module._gen6mainseed_search(pointer);
  } finally {
    module._free(pointer);
  }
  if (
    module._gen6mainseed_last_error() !== 0 ||
    resultCount !== module._gen6mainseed_result_count()
  ) {
    throw new Error("Gen VI Main Seed Finder Wasm search failed.");
  }
  const processedCount = module._gen6mainseed_processed_count();
  const expected = message.chunk.endSeed - message.chunk.startSeed + 1;
  if (processedCount !== expected)
    throw new Error("Gen VI Main Seed Finder processed count mismatch.");
  const resultPointer = module._gen6mainseed_result_ptr();
  const wordCount = resultCount * GEN6_MAIN_SEED_RESULT_WORDS;
  if (
    (resultCount !== 0 && resultPointer === 0) ||
    resultPointer + wordCount * 4 > module.HEAPU32.byteLength
  ) {
    throw new RangeError(
      "Gen VI Main Seed Finder Wasm result pointer is invalid.",
    );
  }
  const buffer = module.HEAPU32.slice(
    resultPointer >>> 2,
    (resultPointer >>> 2) + wordCount,
  ).buffer;
  post(
    {
      type: "batch",
      moduleId: "gen6mainseed",
      apiVersion: GEN6_MAIN_SEED_API_VERSION,
      taskId: message.taskId,
      operation: "searcher",
      chunkIndex: message.chunkIndex,
      processedCount,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer,
    },
    [buffer],
  );
}

scope.onmessage = async ({ data }: MessageEvent<Gen6MainSeedWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6mainseed",
      apiVersion: GEN6_MAIN_SEED_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code: "GEN6_MAIN_SEED_WORKER_ERROR",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
