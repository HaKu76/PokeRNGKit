/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN8_ID_API_VERSION,
  GEN8_ID_CHUNK_SIZE,
  gen8IdFilterModeToWasm,
  splitGen8IdSeed,
  validateGen8IdPackedResults,
  validateGen8IdRequest,
  type Gen8IdChunk,
  type Gen8IdRequest,
} from "../domain";
import type { Gen8IdWorkerRequest, Gen8IdWorkerResponse } from "./messages";

interface Gen8IdEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen8id_api_version(): number;
  _gen8id_generate(...args: number[]): number;
  _gen8id_result_ptr(): number;
  _gen8id_result_count(): number;
  _gen8id_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen8IdEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen8IdEmscriptenModule | undefined;

function post(message: Gen8IdWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen8IdWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen8id" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN8_ID_API_VERSION
  )
    throw new Error("Gen8 ID Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen8 ID Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen8id_api_version();
  if (apiVersion !== GEN8_ID_API_VERSION)
    throw new Error(`Gen8 ID Wasm API ${apiVersion} does not match the UI.`);
  post({
    type: "ready",
    moduleId: "gen8id",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator"],
  });
}

function isValidChunk(request: Gen8IdRequest, chunk: Gen8IdChunk) {
  return (
    Number.isInteger(chunk.index) &&
    chunk.index >= 0 &&
    Number.isInteger(chunk.offset) &&
    chunk.offset >= 0 &&
    Number.isInteger(chunk.stateCount) &&
    chunk.stateCount >= 1 &&
    chunk.stateCount <= GEN8_ID_CHUNK_SIZE &&
    chunk.offset + chunk.stateCount <= request.maxAdvances
  );
}

function calculate(message: Extract<Gen8IdWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen8 ID Wasm module is not initialized.");
  if (
    message.moduleId !== "gen8id" ||
    message.apiVersion !== GEN8_ID_API_VERSION ||
    message.operation !== "generator" ||
    typeof message.taskId !== "string" ||
    message.taskId.length === 0 ||
    message.chunkIndex !== message.chunk.index ||
    validateGen8IdRequest(message.request).length > 0 ||
    !isValidChunk(message.request, message.chunk)
  )
    throw new Error("Gen8 ID Worker received an invalid task.");

  const { request, chunk } = message;
  const values = request.filters.values;
  const pointer = values.length === 0 ? 0 : wasm._malloc(values.length * 4);
  try {
    if (values.length > 0 && pointer === 0)
      throw new Error("Gen8 ID Wasm filter allocation failed.");
    if (pointer !== 0) wasm.HEAPU32.set(values, pointer >>> 2);
    const [seed0Low, seed0High] = splitGen8IdSeed(request.seed0);
    const [seed1Low, seed1High] = splitGen8IdSeed(request.seed1);
    const startedAt = performance.now();
    const resultCount = wasm._gen8id_generate(
      seed0Low,
      seed0High,
      seed1Low,
      seed1High,
      request.initialAdvances,
      chunk.offset,
      chunk.stateCount,
      gen8IdFilterModeToWasm(request.filters.mode),
      pointer,
      values.length,
    );
    const error = wasm._gen8id_last_error();
    if (error !== 0) throw new Error(`Gen8 ID Wasm returned error ${error}.`);
    if (
      resultCount !== wasm._gen8id_result_count() ||
      resultCount > chunk.stateCount
    )
      throw new Error("Gen8 ID Wasm returned an inconsistent result count.");

    const resultPointer = wasm._gen8id_result_ptr();
    const resultOffset = resultPointer >>> 2;
    const resultWords = resultCount * 4;
    if (
      resultPointer % 4 !== 0 ||
      (resultCount > 0 && resultPointer === 0) ||
      resultOffset + resultWords > wasm.HEAPU32.length
    )
      throw new Error("Gen8 ID Wasm returned an invalid result buffer.");
    const words = wasm.HEAPU32.slice(resultOffset, resultOffset + resultWords);
    validateGen8IdPackedResults(words, request, chunk);
    post(
      {
        type: "batch",
        moduleId: "gen8id",
        apiVersion: GEN8_ID_API_VERSION,
        taskId: message.taskId,
        operation: "generator",
        chunkIndex: chunk.index,
        processedCount: chunk.stateCount,
        resultCount,
        elapsedMs: performance.now() - startedAt,
        buffer: words.buffer,
      },
      [words.buffer],
    );
  } finally {
    if (pointer !== 0) wasm._free(pointer);
  }
}

scope.onmessage = async ({ data }: MessageEvent<Gen8IdWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else calculate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen8id",
      apiVersion: GEN8_ID_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code:
        data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
