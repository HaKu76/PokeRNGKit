/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen8EventRequest,
  GEN8_EVENT_API_VERSION,
  GEN8_EVENT_REQUEST_WORDS,
  GEN8_EVENT_RESULT_WORDS,
  validateGen8EventRequest,
} from "../domain";
import type {
  Gen8EventWorkerRequest,
  Gen8EventWorkerResponse,
} from "./messages";

interface Gen8EventEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen8event_api_version(): number;
  _gen8event_generate(requestPointer: number): number;
  _gen8event_result_ptr(): number;
  _gen8event_result_count(): number;
  _gen8event_processed_count(): number;
  _gen8event_limit_reached(): number;
  _gen8event_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen8EventEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen8EventEmscriptenModule | undefined;

function post(message: Gen8EventWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen8EventWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen8event" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN8_EVENT_API_VERSION
  ) {
    throw new Error("Gen 8 Event Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 8 Event Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen8event_api_version();
  if (apiVersion !== GEN8_EVENT_API_VERSION)
    throw new Error(
      `Gen 8 Event Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen8event",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator"],
  });
}

function generate(message: Extract<Gen8EventWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 8 Event Wasm module is not initialized.");
  if (
    message.moduleId !== "gen8event" ||
    message.apiVersion !== GEN8_EVENT_API_VERSION ||
    message.operation !== "generator" ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunk.index !== message.chunkIndex
  ) {
    throw new TypeError("Invalid Gen 8 Event Worker task.");
  }
  validateGen8EventRequest(message.request);
  const request = encodeGen8EventRequest(message.request, message.chunk);
  if (request.length !== GEN8_EVENT_REQUEST_WORDS)
    throw new Error("Gen 8 Event request packing changed unexpectedly.");
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 8 Event Wasm allocation failed.");
  try {
    if ((requestPointer & 3) !== 0)
      throw new Error("Gen 8 Event Wasm request pointer is not aligned.");
    if (requestPointer + request.byteLength > wasm.HEAPU32.byteLength)
      throw new RangeError("Gen 8 Event Wasm request exceeds memory.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const resultCount = wasm._gen8event_generate(requestPointer);
    const error = wasm._gen8event_last_error();
    if (error !== 0)
      throw new Error(`Gen 8 Event Wasm returned error ${error}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen8event_result_count()
    ) {
      throw new Error("Gen 8 Event Wasm returned an invalid result count.");
    }
    const resultPointer = wasm._gen8event_result_ptr();
    const byteLength =
      resultCount * GEN8_EVENT_RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer < 0 ||
      resultPointer + byteLength > wasm.HEAPU32.byteLength
    ) {
      throw new RangeError("Gen 8 Event Wasm result pointer is invalid.");
    }
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * GEN8_EVENT_RESULT_WORDS,
    );
    const processed = wasm._gen8event_processed_count();
    const limitReached = wasm._gen8event_limit_reached() === 1;
    if (
      !Number.isSafeInteger(processed) ||
      processed < 0 ||
      processed > message.chunk.count ||
      (!limitReached && processed !== message.chunk.count)
    ) {
      throw new Error("Gen 8 Event Wasm returned an invalid processed count.");
    }
    post(
      {
        type: "batch",
        moduleId: "gen8event",
        apiVersion: GEN8_EVENT_API_VERSION,
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

scope.onmessage = async ({ data }: MessageEvent<Gen8EventWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen8event",
      apiVersion: GEN8_EVENT_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
