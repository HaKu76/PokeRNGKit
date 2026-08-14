/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen5EggRequest,
  GEN5_EGG_API_VERSION,
  GEN5_EGG_REQUEST_WORDS,
  GEN5_EGG_RESULT_WORDS,
  validateGen5EggRequest,
} from "../domain";
import type { Gen5EggWorkerRequest, Gen5EggWorkerResponse } from "./messages";

interface Gen5EggEmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen5egg_api_version(): number;
  _gen5egg_search(requestPointer: number): number;
  _gen5egg_result_ptr(): number;
  _gen5egg_result_count(): number;
  _gen5egg_processed_count(): number;
  _gen5egg_limit_reached(): number;
  _gen5egg_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen5EggEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen5EggEmscriptenModule | undefined;

function post(message: Gen5EggWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen5EggWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen5egg" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN5_EGG_API_VERSION
  ) {
    throw new Error("Gen 5 Egg Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 5 Egg Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen5egg_api_version();
  if (apiVersion !== GEN5_EGG_API_VERSION)
    throw new Error(`Gen 5 Egg Wasm API ${apiVersion} does not match the UI.`);
  post({
    type: "ready",
    moduleId: "gen5egg",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator", "searcher"],
  });
}

function search(message: Extract<Gen5EggWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 5 Egg Wasm module is not initialized.");
  if (
    message.moduleId !== "gen5egg" ||
    message.apiVersion !== GEN5_EGG_API_VERSION ||
    message.operation !== message.request.mode ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunk.index !== message.chunkIndex ||
    !Number.isInteger(message.chunk.start) ||
    !Number.isInteger(message.chunk.count) ||
    message.chunk.start < 0 ||
    message.chunk.count < 1
  ) {
    throw new TypeError("Invalid Gen 5 Egg Worker task.");
  }
  validateGen5EggRequest(message.request);
  const request = encodeGen5EggRequest(message.request, message.chunk);
  if (request.length !== GEN5_EGG_REQUEST_WORDS)
    throw new Error("Gen 5 Egg request packing changed unexpectedly.");
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 5 Egg Wasm allocation failed.");
  try {
    if ((requestPointer & 3) !== 0)
      throw new Error("Gen 5 Egg Wasm request pointer is not aligned.");
    if (requestPointer + request.byteLength > wasm.HEAPU8.byteLength)
      throw new RangeError("Gen 5 Egg Wasm request exceeds memory.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const resultCount = wasm._gen5egg_search(requestPointer);
    const error = wasm._gen5egg_last_error();
    if (error !== 0) throw new Error(`Gen 5 Egg Wasm returned error ${error}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen5egg_result_count()
    ) {
      throw new Error("Gen 5 Egg Wasm returned an invalid result count.");
    }
    const resultPointer = wasm._gen5egg_result_ptr();
    const byteLength =
      resultCount * GEN5_EGG_RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer < 0 ||
      resultPointer + byteLength > wasm.HEAPU8.byteLength
    ) {
      throw new RangeError("Gen 5 Egg Wasm result pointer is invalid.");
    }
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * GEN5_EGG_RESULT_WORDS,
    );
    const processed = wasm._gen5egg_processed_count();
    const limitReached = wasm._gen5egg_limit_reached() === 1;
    if (
      !Number.isSafeInteger(processed) ||
      processed < 0 ||
      processed > message.chunk.count ||
      (!limitReached && processed !== message.chunk.count)
    ) {
      throw new Error("Gen 5 Egg Wasm returned an invalid processed count.");
    }
    post(
      {
        type: "batch",
        moduleId: "gen5egg",
        apiVersion: GEN5_EGG_API_VERSION,
        taskId: message.taskId,
        operation: message.operation,
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

scope.onmessage = async ({ data }: MessageEvent<Gen5EggWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen5egg",
      apiVersion: GEN5_EGG_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
