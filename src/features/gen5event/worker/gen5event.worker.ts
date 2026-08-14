/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen5EventRequest,
  GEN5_EVENT_API_VERSION,
  GEN5_EVENT_REQUEST_WORDS,
  GEN5_EVENT_RESULT_WORDS,
  validateGen5EventRequest,
} from "../domain";
import type {
  Gen5EventWorkerRequest,
  Gen5EventWorkerResponse,
} from "./messages";

interface Gen5EventEmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen5event_api_version(): number;
  _gen5event_search(requestPointer: number): number;
  _gen5event_result_ptr(): number;
  _gen5event_result_count(): number;
  _gen5event_processed_count(): number;
  _gen5event_limit_reached(): number;
  _gen5event_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen5EventEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen5EventEmscriptenModule | undefined;

function post(message: Gen5EventWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen5EventWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen5event" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN5_EVENT_API_VERSION
  )
    throw new Error("Gen 5 Event Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 5 Event Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen5event_api_version();
  if (apiVersion !== GEN5_EVENT_API_VERSION)
    throw new Error(
      `Gen 5 Event Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen5event",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator", "searcher"],
  });
}

function search(message: Extract<Gen5EventWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 5 Event Wasm module is not initialized.");
  if (
    message.moduleId !== "gen5event" ||
    message.apiVersion !== GEN5_EVENT_API_VERSION ||
    message.operation !== message.request.mode ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunk.index !== message.chunkIndex ||
    !Number.isInteger(message.chunk.start) ||
    !Number.isInteger(message.chunk.count) ||
    message.chunk.start < 0 ||
    message.chunk.count < 1
  )
    throw new TypeError("Invalid Gen 5 Event Worker task.");
  validateGen5EventRequest(message.request);
  const request = encodeGen5EventRequest(message.request, message.chunk);
  if (request.length !== GEN5_EVENT_REQUEST_WORDS)
    throw new Error("Gen 5 Event request packing changed unexpectedly.");
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 5 Event Wasm allocation failed.");
  try {
    if ((requestPointer & 3) !== 0)
      throw new Error("Gen 5 Event Wasm request pointer is not aligned.");
    if (requestPointer + request.byteLength > wasm.HEAPU8.byteLength)
      throw new RangeError("Gen 5 Event Wasm request exceeds memory.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const resultCount = wasm._gen5event_search(requestPointer);
    const errorCode = wasm._gen5event_last_error();
    if (errorCode !== 0)
      throw new Error(`Gen 5 Event Wasm returned error ${errorCode}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen5event_result_count()
    )
      throw new Error("Gen 5 Event Wasm returned an invalid result count.");
    const resultPointer = wasm._gen5event_result_ptr();
    const byteLength =
      resultCount * GEN5_EVENT_RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer < 0 ||
      resultPointer + byteLength > wasm.HEAPU8.byteLength
    )
      throw new RangeError("Gen 5 Event Wasm result pointer is invalid.");
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * GEN5_EVENT_RESULT_WORDS,
    );
    const processedCount = wasm._gen5event_processed_count();
    const limitReached = wasm._gen5event_limit_reached() === 1;
    if (
      !Number.isSafeInteger(processedCount) ||
      processedCount < 0 ||
      processedCount > message.chunk.count ||
      (!limitReached && processedCount !== message.chunk.count)
    )
      throw new Error("Gen 5 Event Wasm returned an invalid processed count.");
    post(
      {
        type: "batch",
        moduleId: "gen5event",
        apiVersion: GEN5_EVENT_API_VERSION,
        taskId: message.taskId,
        operation: message.operation,
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

scope.onmessage = async ({ data }: MessageEvent<Gen5EventWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen5event",
      apiVersion: GEN5_EVENT_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
