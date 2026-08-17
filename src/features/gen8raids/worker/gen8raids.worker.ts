/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen8RaidRequest,
  GEN8_RAIDS_API_VERSION,
  GEN8_RAIDS_REQUEST_WORDS,
  GEN8_RAIDS_RESULT_WORDS,
  validateGen8RaidRequest,
} from "../domain";
import type { Gen8RaidWorkerRequest, Gen8RaidWorkerResponse } from "./messages";

interface Gen8RaidWasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen8raids_api_version(): number;
  _gen8raids_generate(pointer: number): number;
  _gen8raids_result_ptr(): number;
  _gen8raids_result_count(): number;
  _gen8raids_processed_count(): number;
  _gen8raids_limit_reached(): number;
  _gen8raids_last_error(): number;
}
type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen8RaidWasmModule>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen8RaidWasmModule | undefined;
function post(message: Gen8RaidWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}
async function initialize(
  message: Extract<Gen8RaidWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen8raids" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN8_RAIDS_API_VERSION
  )
    throw new Error("Gen 8 Raids Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 8 Raids Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen8raids_api_version() !== GEN8_RAIDS_API_VERSION)
    throw new Error("Gen 8 Raids Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen8raids",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN8_RAIDS_API_VERSION,
    operations: ["generator"],
  });
}
function generate(message: Extract<Gen8RaidWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 8 Raids Wasm module is not initialized.");
  if (
    message.moduleId !== "gen8raids" ||
    message.apiVersion !== GEN8_RAIDS_API_VERSION ||
    message.operation !== "generator" ||
    message.chunk.index !== message.chunkIndex
  )
    throw new TypeError("Invalid Gen 8 Raids Worker task.");
  validateGen8RaidRequest(message.request);
  const request = encodeGen8RaidRequest(message.request, message.chunk);
  if (request.length !== GEN8_RAIDS_REQUEST_WORDS)
    throw new Error("Gen 8 Raids request packing changed unexpectedly.");
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 8 Raids Wasm allocation failed.");
  try {
    if (
      (requestPointer & 3) !== 0 ||
      requestPointer + request.byteLength > wasm.HEAPU32.byteLength
    )
      throw new RangeError("Gen 8 Raids Wasm request pointer is invalid.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const resultCount = wasm._gen8raids_generate(requestPointer);
    if (wasm._gen8raids_last_error() !== 0)
      throw new Error("Gen 8 Raids Wasm returned an error.");
    if (
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen8raids_result_count()
    )
      throw new Error("Gen 8 Raids Wasm returned an invalid result count.");
    const resultPointer = wasm._gen8raids_result_ptr();
    const wordLength = resultCount * GEN8_RAIDS_RESULT_WORDS;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      resultPointer + wordLength * 4 > wasm.HEAPU32.byteLength
    )
      throw new RangeError("Gen 8 Raids Wasm result pointer is invalid.");
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + wordLength,
    );
    const processedCount = wasm._gen8raids_processed_count();
    const limitReached = wasm._gen8raids_limit_reached() === 1;
    if (
      processedCount < 0 ||
      processedCount > message.chunk.count ||
      (!limitReached && processedCount !== message.chunk.count)
    )
      throw new Error("Gen 8 Raids Wasm returned an invalid processed count.");
    post(
      {
        type: "batch",
        moduleId: "gen8raids",
        apiVersion: GEN8_RAIDS_API_VERSION,
        taskId: message.taskId,
        operation: "generator",
        chunkIndex: message.chunkIndex,
        processedCount,
        resultCount,
        limitReached,
        buffer: copied.buffer,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(requestPointer);
  }
}
scope.onmessage = async ({ data }: MessageEvent<Gen8RaidWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen8raids",
      apiVersion: GEN8_RAIDS_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
