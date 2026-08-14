/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen8EggRequest,
  GEN8_EGG_API_VERSION,
  GEN8_EGG_REQUEST_WORDS,
  GEN8_EGG_RESULT_WORDS,
  validateGen8EggRequest,
} from "../domain";
import type { Gen8EggWorkerRequest, Gen8EggWorkerResponse } from "./messages";

interface Gen8EggEmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen8egg_api_version(): number;
  _gen8egg_generate(requestPointer: number): number;
  _gen8egg_result_ptr(): number;
  _gen8egg_result_count(): number;
  _gen8egg_processed_count(): number;
  _gen8egg_limit_reached(): number;
  _gen8egg_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen8EggEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen8EggEmscriptenModule | undefined;

function post(message: Gen8EggWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen8EggWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen8egg" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN8_EGG_API_VERSION
  ) {
    throw new Error("Gen 8 Egg Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 8 Egg Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen8egg_api_version();
  if (apiVersion !== GEN8_EGG_API_VERSION)
    throw new Error(`Gen 8 Egg Wasm API ${apiVersion} does not match the UI.`);
  post({
    type: "ready",
    moduleId: "gen8egg",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator"],
  });
}

function generate(message: Extract<Gen8EggWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 8 Egg Wasm module is not initialized.");
  if (
    message.moduleId !== "gen8egg" ||
    message.apiVersion !== GEN8_EGG_API_VERSION ||
    message.operation !== "generator" ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunk.index !== message.chunkIndex
  ) {
    throw new TypeError("Invalid Gen 8 Egg Worker task.");
  }
  validateGen8EggRequest(message.request);
  const request = encodeGen8EggRequest(message.request, message.chunk);
  if (request.length !== GEN8_EGG_REQUEST_WORDS)
    throw new Error("Gen 8 Egg request packing changed unexpectedly.");
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 8 Egg Wasm allocation failed.");
  try {
    if ((requestPointer & 3) !== 0)
      throw new Error("Gen 8 Egg Wasm request pointer is not aligned.");
    if (requestPointer + request.byteLength > wasm.HEAPU8.byteLength)
      throw new RangeError("Gen 8 Egg Wasm request exceeds memory.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const resultCount = wasm._gen8egg_generate(requestPointer);
    const error = wasm._gen8egg_last_error();
    if (error !== 0) throw new Error(`Gen 8 Egg Wasm returned error ${error}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen8egg_result_count()
    ) {
      throw new Error("Gen 8 Egg Wasm returned an invalid result count.");
    }
    const resultPointer = wasm._gen8egg_result_ptr();
    const byteLength =
      resultCount * GEN8_EGG_RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer < 0 ||
      resultPointer + byteLength > wasm.HEAPU8.byteLength
    ) {
      throw new RangeError("Gen 8 Egg Wasm result pointer is invalid.");
    }
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * GEN8_EGG_RESULT_WORDS,
    );
    const processed = wasm._gen8egg_processed_count();
    const limitReached = wasm._gen8egg_limit_reached() === 1;
    if (
      !Number.isSafeInteger(processed) ||
      processed < 0 ||
      processed > message.chunk.count ||
      (!limitReached && processed !== message.chunk.count)
    ) {
      throw new Error("Gen 8 Egg Wasm returned an invalid processed count.");
    }
    post(
      {
        type: "batch",
        moduleId: "gen8egg",
        apiVersion: GEN8_EGG_API_VERSION,
        taskId: message.taskId,
        operation: "generator",
        chunkIndex: message.chunkIndex,
        processedCount: processed,
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

scope.onmessage = async ({ data }: MessageEvent<Gen8EggWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen8egg",
      apiVersion: GEN8_EGG_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
