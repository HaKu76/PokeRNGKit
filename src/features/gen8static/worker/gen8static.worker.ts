/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen8StaticRequest,
  GEN8_STATIC_API_VERSION,
  GEN8_STATIC_REQUEST_WORDS,
  GEN8_STATIC_RESULT_WORDS,
  validateGen8StaticRequest,
} from "../domain";
import type {
  Gen8StaticWorkerRequest,
  Gen8StaticWorkerResponse,
} from "./messages";

interface Gen8StaticWasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen8static_api_version(): number;
  _gen8static_generate(pointer: number): number;
  _gen8static_result_ptr(): number;
  _gen8static_result_count(): number;
  _gen8static_processed_count(): number;
  _gen8static_limit_reached(): number;
  _gen8static_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen8StaticWasmModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen8StaticWasmModule | undefined;

function post(
  message: Gen8StaticWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen8StaticWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen8static" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN8_STATIC_API_VERSION
  ) {
    throw new Error("Gen 8 Static Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 8 Static Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen8static_api_version() !== GEN8_STATIC_API_VERSION)
    throw new Error("Gen 8 Static Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen8static",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN8_STATIC_API_VERSION,
    operations: ["generator"],
  });
}

function generate(message: Extract<Gen8StaticWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 8 Static Wasm module is not initialized.");
  if (
    message.moduleId !== "gen8static" ||
    message.apiVersion !== GEN8_STATIC_API_VERSION ||
    message.operation !== "generator" ||
    message.chunk.index !== message.chunkIndex
  ) {
    throw new TypeError("Invalid Gen 8 Static Worker task.");
  }
  validateGen8StaticRequest(message.request);
  const request = encodeGen8StaticRequest(message.request, message.chunk);
  if (request.length !== GEN8_STATIC_REQUEST_WORDS)
    throw new Error("Gen 8 Static request packing changed unexpectedly.");
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 8 Static Wasm allocation failed.");
  try {
    if (
      (requestPointer & 3) !== 0 ||
      requestPointer + request.byteLength > wasm.HEAPU32.byteLength
    ) {
      throw new RangeError("Gen 8 Static Wasm request pointer is invalid.");
    }
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const resultCount = wasm._gen8static_generate(requestPointer);
    if (wasm._gen8static_last_error() !== 0)
      throw new Error("Gen 8 Static Wasm returned an error.");
    if (
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen8static_result_count()
    ) {
      throw new Error("Gen 8 Static Wasm returned an invalid result count.");
    }
    const resultPointer = wasm._gen8static_result_ptr();
    const wordLength = resultCount * GEN8_STATIC_RESULT_WORDS;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      resultPointer + wordLength * 4 > wasm.HEAPU32.byteLength
    ) {
      throw new RangeError("Gen 8 Static Wasm result pointer is invalid.");
    }
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + wordLength,
    );
    const processedCount = wasm._gen8static_processed_count();
    const limitReached = wasm._gen8static_limit_reached() === 1;
    if (
      processedCount < 0 ||
      processedCount > message.chunk.count ||
      (!limitReached && processedCount !== message.chunk.count)
    ) {
      throw new Error("Gen 8 Static Wasm returned an invalid processed count.");
    }
    post(
      {
        type: "batch",
        moduleId: "gen8static",
        apiVersion: GEN8_STATIC_API_VERSION,
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

scope.onmessage = async ({ data }: MessageEvent<Gen8StaticWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen8static",
      apiVersion: GEN8_STATIC_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
