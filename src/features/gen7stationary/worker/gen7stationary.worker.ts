/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen7StationaryRequest,
  GEN7_STATIONARY_API_VERSION,
  GEN7_STATIONARY_REQUEST_WORDS,
  GEN7_STATIONARY_RESULT_WORDS,
  validateGen7StationaryRequest,
} from "../domain";
import type {
  Gen7StationaryWorkerRequest,
  Gen7StationaryWorkerResponse,
  Gen7StationaryWorkerTask,
} from "./messages";

interface Gen7StationaryEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen7stationary_api_version(): number;
  _gen7stationary_begin(requestPointer: number): number;
  _gen7stationary_step(maximumStates: number): number;
  _gen7stationary_result_ptr(): number;
  _gen7stationary_result_count(): number;
  _gen7stationary_step_processed(): number;
  _gen7stationary_total_processed(): number;
  _gen7stationary_total_results(): number;
  _gen7stationary_done(): number;
  _gen7stationary_limit_reached(): number;
  _gen7stationary_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen7StationaryEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen7StationaryEmscriptenModule | undefined;
let activeTaskId: string | undefined;

function post(
  message: Gen7StationaryWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function nextTask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function initialize(
  message: Extract<Gen7StationaryWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen7stationary" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN7_STATIONARY_API_VERSION
  ) {
    throw new Error("Gen 7 Stationary Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 7 Stationary Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen7stationary_api_version();
  if (apiVersion !== GEN7_STATIONARY_API_VERSION)
    throw new Error(
      `Gen 7 Stationary Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen7stationary",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator"],
  });
}

function copyResults(resultCount: number) {
  if (!wasm) throw new Error("Gen 7 Stationary Wasm is unavailable.");
  if (
    !Number.isInteger(resultCount) ||
    resultCount < 0 ||
    resultCount !== wasm._gen7stationary_result_count()
  ) {
    throw new Error("Gen 7 Stationary Wasm returned an invalid result count.");
  }
  const resultPointer = wasm._gen7stationary_result_ptr();
  const wordLength = resultCount * GEN7_STATIONARY_RESULT_WORDS;
  const byteLength = wordLength * Uint32Array.BYTES_PER_ELEMENT;
  if (
    (resultCount !== 0 && resultPointer === 0) ||
    (resultPointer & 3) !== 0 ||
    resultPointer < 0 ||
    resultPointer + byteLength > wasm.HEAPU32.byteLength
  ) {
    throw new RangeError("Gen 7 Stationary Wasm result pointer is invalid.");
  }
  return wasm.HEAPU32.slice(
    resultPointer >>> 2,
    (resultPointer >>> 2) + wordLength,
  );
}

async function run(message: Gen7StationaryWorkerTask) {
  if (!wasm)
    throw new Error("Gen 7 Stationary Wasm module is not initialized.");
  if (activeTaskId)
    throw new Error("A Gen 7 Stationary task is already running.");
  if (
    message.moduleId !== "gen7stationary" ||
    message.apiVersion !== GEN7_STATIONARY_API_VERSION ||
    message.operation !== "generator" ||
    !Number.isInteger(message.stepSize) ||
    message.stepSize < 1 ||
    message.stepSize > 65_536
  ) {
    throw new TypeError("Invalid Gen 7 Stationary Worker task.");
  }
  validateGen7StationaryRequest(message.request);
  const request = encodeGen7StationaryRequest(message.request);
  if (request.length !== GEN7_STATIONARY_REQUEST_WORDS)
    throw new Error("Gen 7 Stationary request packing changed unexpectedly.");
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 7 Stationary Wasm allocation failed.");
  activeTaskId = message.taskId;
  try {
    if (
      (requestPointer & 3) !== 0 ||
      requestPointer + request.byteLength > wasm.HEAPU32.byteLength
    ) {
      throw new RangeError("Gen 7 Stationary Wasm request pointer is invalid.");
    }
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    if (wasm._gen7stationary_begin(requestPointer) !== 1) {
      throw new Error(
        `Gen 7 Stationary Wasm begin returned error ${wasm._gen7stationary_last_error()}.`,
      );
    }
  } finally {
    wasm._free(requestPointer);
  }

  let batchIndex = 0;
  while (activeTaskId === message.taskId) {
    const resultCount = wasm._gen7stationary_step(message.stepSize);
    const error = wasm._gen7stationary_last_error();
    if (error !== 0)
      throw new Error(`Gen 7 Stationary Wasm returned error ${error}.`);
    const copied = copyResults(resultCount);
    const processedCount = wasm._gen7stationary_step_processed();
    const totalProcessed = wasm._gen7stationary_total_processed();
    const totalResultCount = wasm._gen7stationary_total_results();
    const done = wasm._gen7stationary_done() === 1;
    const limitReached = wasm._gen7stationary_limit_reached() === 1;
    if (
      !Number.isInteger(processedCount) ||
      processedCount < 0 ||
      processedCount > message.stepSize ||
      !Number.isInteger(totalProcessed) ||
      totalProcessed < processedCount ||
      !Number.isInteger(totalResultCount) ||
      totalResultCount < resultCount ||
      totalResultCount > message.request.resultLimit
    ) {
      throw new Error("Gen 7 Stationary Wasm returned invalid progress.");
    }
    post(
      {
        type: "batch",
        moduleId: "gen7stationary",
        apiVersion: GEN7_STATIONARY_API_VERSION,
        taskId: message.taskId,
        operation: "generator",
        batchIndex: batchIndex++,
        buffer: copied.buffer,
        processedCount,
        totalProcessed,
        resultCount,
        totalResultCount,
        done,
        limitReached,
      },
      [copied.buffer],
    );
    if (done) {
      activeTaskId = undefined;
      return;
    }
    await nextTask();
  }
}

async function handle(message: Gen7StationaryWorkerRequest) {
  try {
    if (message.type === "init") await initialize(message);
    else await run(message);
  } catch (error) {
    const taskId = message.type === "task" ? message.taskId : undefined;
    if (activeTaskId === taskId) activeTaskId = undefined;
    post({
      type: "error",
      moduleId: "gen7stationary",
      apiVersion: GEN7_STATIONARY_API_VERSION,
      taskId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = ({ data }: MessageEvent<Gen7StationaryWorkerRequest>) => {
  void handle(data);
};
