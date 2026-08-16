/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen7EventRequest,
  GEN7_EVENT_API_VERSION,
  GEN7_EVENT_REQUEST_WORDS,
  GEN7_EVENT_RESULT_WORDS,
  validateGen7EventRequest,
} from "../domain";
import type {
  Gen7EventWorkerRequest,
  Gen7EventWorkerResponse,
  Gen7EventWorkerTask,
} from "./messages";

interface Gen7EventEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen7event_api_version(): number;
  _gen7event_begin(requestPointer: number): number;
  _gen7event_step(maximumStates: number): number;
  _gen7event_result_ptr(): number;
  _gen7event_result_count(): number;
  _gen7event_step_processed(): number;
  _gen7event_total_processed(): number;
  _gen7event_total_results(): number;
  _gen7event_done(): number;
  _gen7event_limit_reached(): number;
  _gen7event_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen7EventEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen7EventEmscriptenModule | undefined;
let activeTaskId: string | undefined;

function post(message: Gen7EventWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

function nextTask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function initialize(
  message: Extract<Gen7EventWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen7event" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN7_EVENT_API_VERSION
  ) {
    throw new Error("Gen 7 Event Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 7 Event Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen7event_api_version();
  if (apiVersion !== GEN7_EVENT_API_VERSION)
    throw new Error(
      `Gen 7 Event Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen7event",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator"],
  });
}

function copyResults(resultCount: number) {
  if (!wasm) throw new Error("Gen 7 Event Wasm is unavailable.");
  if (
    !Number.isInteger(resultCount) ||
    resultCount < 0 ||
    resultCount !== wasm._gen7event_result_count()
  ) {
    throw new Error("Gen 7 Event Wasm returned an invalid result count.");
  }
  const resultPointer = wasm._gen7event_result_ptr();
  const wordLength = resultCount * GEN7_EVENT_RESULT_WORDS;
  const byteLength = wordLength * Uint32Array.BYTES_PER_ELEMENT;
  if (
    (resultCount !== 0 && resultPointer === 0) ||
    (resultPointer & 3) !== 0 ||
    resultPointer < 0 ||
    resultPointer + byteLength > wasm.HEAPU32.byteLength
  ) {
    throw new RangeError("Gen 7 Event Wasm result pointer is invalid.");
  }
  return wasm.HEAPU32.slice(
    resultPointer >>> 2,
    (resultPointer >>> 2) + wordLength,
  );
}

async function run(message: Gen7EventWorkerTask) {
  if (!wasm) throw new Error("Gen 7 Event Wasm module is not initialized.");
  if (activeTaskId) throw new Error("A Gen 7 Event task is already running.");
  if (
    message.moduleId !== "gen7event" ||
    message.apiVersion !== GEN7_EVENT_API_VERSION ||
    message.operation !== "generator" ||
    !Number.isInteger(message.stepSize) ||
    message.stepSize < 1 ||
    message.stepSize > 65_536
  ) {
    throw new TypeError("Invalid Gen 7 Event Worker task.");
  }
  validateGen7EventRequest(message.request);
  const request = encodeGen7EventRequest(message.request);
  if (request.length !== GEN7_EVENT_REQUEST_WORDS)
    throw new Error("Gen 7 Event request packing changed unexpectedly.");
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 7 Event Wasm allocation failed.");
  activeTaskId = message.taskId;
  try {
    if (
      (requestPointer & 3) !== 0 ||
      requestPointer + request.byteLength > wasm.HEAPU32.byteLength
    ) {
      throw new RangeError("Gen 7 Event Wasm request pointer is invalid.");
    }
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    if (wasm._gen7event_begin(requestPointer) !== 1) {
      throw new Error(
        `Gen 7 Event Wasm begin returned error ${wasm._gen7event_last_error()}.`,
      );
    }
  } finally {
    wasm._free(requestPointer);
  }

  let batchIndex = 0;
  while (activeTaskId === message.taskId) {
    const resultCount = wasm._gen7event_step(message.stepSize);
    const error = wasm._gen7event_last_error();
    if (error !== 0)
      throw new Error(`Gen 7 Event Wasm returned error ${error}.`);
    const copied = copyResults(resultCount);
    const processedCount = wasm._gen7event_step_processed();
    const totalProcessed = wasm._gen7event_total_processed();
    const totalResultCount = wasm._gen7event_total_results();
    const done = wasm._gen7event_done() === 1;
    const limitReached = wasm._gen7event_limit_reached() === 1;
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
      throw new Error("Gen 7 Event Wasm returned invalid progress.");
    }
    post(
      {
        type: "batch",
        moduleId: "gen7event",
        apiVersion: GEN7_EVENT_API_VERSION,
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

async function handle(message: Gen7EventWorkerRequest) {
  try {
    if (message.type === "init") await initialize(message);
    else await run(message);
  } catch (error) {
    const taskId = message.type === "task" ? message.taskId : undefined;
    if (activeTaskId === taskId) activeTaskId = undefined;
    post({
      type: "error",
      moduleId: "gen7event",
      apiVersion: GEN7_EVENT_API_VERSION,
      taskId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = ({ data }: MessageEvent<Gen7EventWorkerRequest>) => {
  void handle(data);
};
