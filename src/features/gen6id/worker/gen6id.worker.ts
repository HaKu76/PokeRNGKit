/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen6IdRequest,
  filterGen6IdPackedResults,
  GEN6_ID_API_VERSION,
  GEN6_ID_REQUEST_WORDS,
  GEN6_ID_RESULT_WORDS,
} from "../domain";
import type { Gen6IdWorkerRequest, Gen6IdWorkerResponse } from "./messages";

interface Gen6IdWasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6id_api_version(): number;
  _gen6id_begin(pointer: number): number;
  _gen6id_step(maximumStates: number): number;
  _gen6id_result_ptr(): number;
  _gen6id_result_count(): number;
  _gen6id_step_processed(): number;
  _gen6id_total_processed(): number;
  _gen6id_done(): number;
  _gen6id_last_error(): number;
}

type Gen6IdFactory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen6IdWasmModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen6IdWasmModule | undefined;

function post(message: Gen6IdWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen6IdWorkerRequest, { type: "init" }>,
) {
  if (
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_ID_API_VERSION
  )
    throw new Error("Gen VI ID Worker contract mismatch.");
  const imported = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Gen6IdFactory;
  };
  if (typeof imported.default !== "function")
    throw new TypeError("Gen VI ID Wasm module has no default factory.");
  wasm = await imported.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6id_api_version() !== GEN6_ID_API_VERSION)
    throw new Error("Gen VI ID Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6id",
    apiVersion: GEN6_ID_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["generator"],
  });
}

function run(message: Extract<Gen6IdWorkerRequest, { type: "task" }>) {
  const module = wasm;
  if (!module) throw new Error("Gen VI ID Wasm module is not initialized.");
  const request = encodeGen6IdRequest(message.request);
  if (request.length !== GEN6_ID_REQUEST_WORDS)
    throw new Error("Gen VI ID request packing changed unexpectedly.");
  const pointer = module._malloc(request.byteLength);
  if (!pointer) throw new Error("Gen VI ID Wasm allocation failed.");
  try {
    if (
      (pointer & 3) !== 0 ||
      pointer + request.byteLength > module.HEAPU32.byteLength
    )
      throw new RangeError("Gen VI ID request pointer is invalid.");
    module.HEAPU32.set(request, pointer >>> 2);
    if (
      module._gen6id_begin(pointer) !== 1 ||
      module._gen6id_last_error() !== 0
    )
      throw new Error("Gen VI ID Wasm begin failed.");
  } finally {
    module._free(pointer);
  }

  let batchIndex = 0;
  let totalResults = 0;
  const step = () => {
    try {
      module._gen6id_step(message.stepSize);
      if (module._gen6id_last_error() !== 0)
        throw new Error("Gen VI ID Wasm step failed.");
      const resultCount = module._gen6id_result_count();
      const resultPointer = module._gen6id_result_ptr();
      const wordCount = resultCount * GEN6_ID_RESULT_WORDS;
      if (
        resultCount > message.stepSize ||
        module._gen6id_step_processed() !== resultCount ||
        (resultCount > 0 &&
          (!resultPointer ||
            resultPointer + wordCount * 4 > module.HEAPU32.byteLength))
      )
        throw new RangeError("Gen VI ID Wasm result pointer is invalid.");
      const raw = module.HEAPU32.slice(
        resultPointer >>> 2,
        (resultPointer >>> 2) + wordCount,
      );
      const accepted = filterGen6IdPackedResults(
        raw,
        message.request.filters,
        message.request.resultLimit - totalResults,
      );
      const acceptedCount = accepted.length / GEN6_ID_RESULT_WORDS;
      totalResults += acceptedCount;
      const wasmDone = module._gen6id_done() === 1;
      const limitReached =
        totalResults >= message.request.resultLimit && !wasmDone;
      const done = wasmDone || limitReached;
      const buffer =
        accepted.buffer instanceof ArrayBuffer
          ? accepted.buffer
          : new Uint32Array(accepted).buffer;
      post(
        {
          type: "batch",
          moduleId: "gen6id",
          apiVersion: GEN6_ID_API_VERSION,
          taskId: message.taskId,
          batchIndex: batchIndex++,
          buffer,
          resultCount: acceptedCount,
          totalProcessed: module._gen6id_total_processed(),
          totalResultCount: totalResults,
          done,
          limitReached,
        },
        [buffer],
      );
      if (!done) setTimeout(step, 0);
    } catch (error) {
      post({
        type: "error",
        moduleId: "gen6id",
        apiVersion: GEN6_ID_API_VERSION,
        taskId: message.taskId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  step();
}

scope.onmessage = async ({ data }: MessageEvent<Gen6IdWorkerRequest>) => {
  try {
    if (data.moduleId !== "gen6id")
      throw new Error("Unexpected Worker module id.");
    if (data.type === "init") await initialize(data);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6id",
      apiVersion: GEN6_ID_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
