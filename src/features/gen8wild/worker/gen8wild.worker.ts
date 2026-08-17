/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen8WildRequest,
  GEN8_WILD_API_VERSION,
  GEN8_WILD_REQUEST_WORDS,
  GEN8_WILD_RESULT_WORDS,
  validateGen8WildRequest,
} from "../domain";
import type { Gen8WildWorkerRequest, Gen8WildWorkerResponse } from "./messages";

interface Gen8WildWasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen8wild_api_version(): number;
  _gen8wild_generate(pointer: number): number;
  _gen8wild_result_ptr(): number;
  _gen8wild_result_count(): number;
  _gen8wild_processed_count(): number;
  _gen8wild_limit_reached(): number;
  _gen8wild_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen8WildWasmModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen8WildWasmModule | undefined;

function post(message: Gen8WildWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen8WildWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen8wild" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN8_WILD_API_VERSION
  ) {
    throw new Error("Gen 8 Wild Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 8 Wild Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen8wild_api_version() !== GEN8_WILD_API_VERSION)
    throw new Error("Gen 8 Wild Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen8wild",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN8_WILD_API_VERSION,
    operations: ["generator"],
  });
}

function generate(message: Extract<Gen8WildWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 8 Wild Wasm is not initialized.");
  if (
    message.moduleId !== "gen8wild" ||
    message.apiVersion !== GEN8_WILD_API_VERSION ||
    message.operation !== "generator" ||
    message.chunk.index !== message.chunkIndex
  ) {
    throw new TypeError("Invalid Gen 8 Wild Worker task.");
  }
  validateGen8WildRequest(message.request);
  const request = encodeGen8WildRequest(message.request, message.chunk);
  if (request.length !== GEN8_WILD_REQUEST_WORDS)
    throw new Error("Gen 8 Wild request packing changed.");
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 8 Wild Wasm allocation failed.");
  try {
    if (
      (requestPointer & 3) !== 0 ||
      requestPointer + request.byteLength > wasm.HEAPU32.byteLength
    ) {
      throw new RangeError("Gen 8 Wild Wasm request pointer is invalid.");
    }
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const resultCount = wasm._gen8wild_generate(requestPointer);
    if (wasm._gen8wild_last_error() !== 0)
      throw new Error("Gen 8 Wild Wasm returned an error.");
    if (
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen8wild_result_count()
    ) {
      throw new Error("Gen 8 Wild Wasm returned an invalid result count.");
    }
    const resultPointer = wasm._gen8wild_result_ptr();
    const wordLength = resultCount * GEN8_WILD_RESULT_WORDS;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      resultPointer + wordLength * 4 > wasm.HEAPU32.byteLength
    ) {
      throw new RangeError("Gen 8 Wild Wasm result pointer is invalid.");
    }
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + wordLength,
    );
    const processedCount = wasm._gen8wild_processed_count();
    const limitReached = wasm._gen8wild_limit_reached() === 1;
    if (
      processedCount < 0 ||
      processedCount > message.chunk.count ||
      (!limitReached && processedCount !== message.chunk.count)
    ) {
      throw new Error("Gen 8 Wild Wasm returned an invalid processed count.");
    }
    post(
      {
        type: "batch",
        moduleId: "gen8wild",
        apiVersion: GEN8_WILD_API_VERSION,
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

scope.onmessage = async ({ data }: MessageEvent<Gen8WildWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen8wild",
      apiVersion: GEN8_WILD_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
