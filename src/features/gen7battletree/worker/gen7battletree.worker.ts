/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen7BattleTreeRequest,
  GEN7_BATTLETREE_API_VERSION,
  GEN7_BATTLETREE_REQUEST_WORDS,
  GEN7_BATTLETREE_RESULT_WORDS,
  validateGen7BattleTreeRequest,
} from "../domain";
import type {
  Gen7BattleTreeWorkerRequest,
  Gen7BattleTreeWorkerResponse,
  Gen7BattleTreeWorkerTask,
} from "./messages";

interface Gen7BattleTreeEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen7battletree_api_version(): number;
  _gen7battletree_begin(requestPointer: number): number;
  _gen7battletree_step(maximumStates: number): number;
  _gen7battletree_result_ptr(): number;
  _gen7battletree_result_count(): number;
  _gen7battletree_step_processed(): number;
  _gen7battletree_total_processed(): number;
  _gen7battletree_total_results(): number;
  _gen7battletree_done(): number;
  _gen7battletree_limit_reached(): number;
  _gen7battletree_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen7BattleTreeEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen7BattleTreeEmscriptenModule | undefined;
let activeTaskId: string | undefined;

function post(
  message: Gen7BattleTreeWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function nextTask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function initialize(
  message: Extract<Gen7BattleTreeWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen7battletree" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN7_BATTLETREE_API_VERSION
  ) {
    throw new Error("Gen 7 Battle Tree Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError(
      "Gen 7 Battle Tree Wasm module has no default factory.",
    );
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen7battletree_api_version();
  if (apiVersion !== GEN7_BATTLETREE_API_VERSION)
    throw new Error(
      `Gen 7 Battle Tree Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen7battletree",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator"],
  });
}

function copyResults(resultCount: number) {
  if (!wasm) throw new Error("Gen 7 Battle Tree Wasm is unavailable.");
  if (
    !Number.isInteger(resultCount) ||
    resultCount < 0 ||
    resultCount !== wasm._gen7battletree_result_count()
  ) {
    throw new Error("Gen 7 Battle Tree Wasm returned an invalid result count.");
  }
  const resultPointer = wasm._gen7battletree_result_ptr();
  const wordLength = resultCount * GEN7_BATTLETREE_RESULT_WORDS;
  const byteLength = wordLength * Uint32Array.BYTES_PER_ELEMENT;
  if (
    (resultCount !== 0 && resultPointer === 0) ||
    (resultPointer & 3) !== 0 ||
    resultPointer < 0 ||
    resultPointer + byteLength > wasm.HEAPU32.byteLength
  ) {
    throw new RangeError("Gen 7 Battle Tree Wasm result pointer is invalid.");
  }
  return wasm.HEAPU32.slice(
    resultPointer >>> 2,
    (resultPointer >>> 2) + wordLength,
  );
}

async function run(message: Gen7BattleTreeWorkerTask) {
  if (!wasm)
    throw new Error("Gen 7 Battle Tree Wasm module is not initialized.");
  if (activeTaskId)
    throw new Error("A Gen 7 Battle Tree task is already running.");
  if (
    message.moduleId !== "gen7battletree" ||
    message.apiVersion !== GEN7_BATTLETREE_API_VERSION ||
    message.operation !== "generator" ||
    !Number.isInteger(message.stepSize) ||
    message.stepSize < 1 ||
    message.stepSize > 65_536
  ) {
    throw new TypeError("Invalid Gen 7 Battle Tree Worker task.");
  }
  validateGen7BattleTreeRequest(message.request);
  const request = encodeGen7BattleTreeRequest(message.request);
  if (request.length !== GEN7_BATTLETREE_REQUEST_WORDS)
    throw new Error("Gen 7 Battle Tree request packing changed unexpectedly.");
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 7 Battle Tree Wasm allocation failed.");
  activeTaskId = message.taskId;
  try {
    if (
      (requestPointer & 3) !== 0 ||
      requestPointer + request.byteLength > wasm.HEAPU32.byteLength
    ) {
      throw new RangeError(
        "Gen 7 Battle Tree Wasm request pointer is invalid.",
      );
    }
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    if (wasm._gen7battletree_begin(requestPointer) !== 1) {
      throw new Error(
        `Gen 7 Battle Tree Wasm begin returned error ${wasm._gen7battletree_last_error()}.`,
      );
    }
  } finally {
    wasm._free(requestPointer);
  }

  let batchIndex = 0;
  while (activeTaskId === message.taskId) {
    const resultCount = wasm._gen7battletree_step(message.stepSize);
    const error = wasm._gen7battletree_last_error();
    if (error !== 0)
      throw new Error(`Gen 7 Battle Tree Wasm returned error ${error}.`);
    const copied = copyResults(resultCount);
    const processedCount = wasm._gen7battletree_step_processed();
    const totalProcessed = wasm._gen7battletree_total_processed();
    const totalResultCount = wasm._gen7battletree_total_results();
    const done = wasm._gen7battletree_done() === 1;
    const limitReached = wasm._gen7battletree_limit_reached() === 1;
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
      throw new Error("Gen 7 Battle Tree Wasm returned invalid progress.");
    }
    post(
      {
        type: "batch",
        moduleId: "gen7battletree",
        apiVersion: GEN7_BATTLETREE_API_VERSION,
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

async function handle(message: Gen7BattleTreeWorkerRequest) {
  try {
    if (message.type === "init") await initialize(message);
    else await run(message);
  } catch (error) {
    const taskId = message.type === "task" ? message.taskId : undefined;
    if (activeTaskId === taskId) activeTaskId = undefined;
    post({
      type: "error",
      moduleId: "gen7battletree",
      apiVersion: GEN7_BATTLETREE_API_VERSION,
      taskId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = ({ data }: MessageEvent<Gen7BattleTreeWorkerRequest>) => {
  void handle(data);
};
