/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6EggResults,
  encodeGen6EggRequest,
  GEN6_EGG_API_VERSION,
  GEN6_EGG_REQUEST_WORDS,
  GEN6_EGG_RESULT_WORDS,
  gen6EggResultPassesFilters,
} from "../domain";
import type { Gen6EggWorkerRequest, Gen6EggWorkerResponse } from "./messages";

interface Gen6EggWasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6egg_api_version(): number;
  _gen6egg_begin(pointer: number): number;
  _gen6egg_step(maximumStates: number): number;
  _gen6egg_result_ptr(): number;
  _gen6egg_result_count(): number;
  _gen6egg_step_processed(): number;
  _gen6egg_total_processed(): number;
  _gen6egg_done(): number;
  _gen6egg_last_error(): number;
}

type Gen6EggFactory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen6EggWasmModule>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen6EggWasmModule | undefined;

function post(message: Gen6EggWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen6EggWorkerRequest, { type: "init" }>,
) {
  if (
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_EGG_API_VERSION
  )
    throw new Error("Gen VI Egg Worker contract mismatch.");
  const imported = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Gen6EggFactory;
  };
  if (typeof imported.default !== "function")
    throw new TypeError("Gen VI Egg Wasm module has no default factory.");
  wasm = await imported.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6egg_api_version() !== GEN6_EGG_API_VERSION)
    throw new Error("Gen VI Egg Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6egg",
    apiVersion: GEN6_EGG_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["generator"],
  });
}

function run(message: Extract<Gen6EggWorkerRequest, { type: "task" }>) {
  const module = wasm;
  if (!module) throw new Error("Gen VI Egg Wasm module is not initialized.");
  const request = encodeGen6EggRequest(message.request);
  if (request.length !== GEN6_EGG_REQUEST_WORDS)
    throw new Error("Gen VI Egg request packing changed unexpectedly.");
  const pointer = module._malloc(request.byteLength);
  if (!pointer) throw new Error("Gen VI Egg Wasm allocation failed.");
  try {
    if (
      (pointer & 3) !== 0 ||
      pointer + request.byteLength > module.HEAPU32.byteLength
    )
      throw new RangeError("Gen VI Egg request pointer is invalid.");
    module.HEAPU32.set(request, pointer >>> 2);
    if (
      module._gen6egg_begin(pointer) !== 1 ||
      module._gen6egg_last_error() !== 0
    )
      throw new Error("Gen VI Egg Wasm begin failed.");
  } finally {
    module._free(pointer);
  }

  let batchIndex = 0;
  let totalResults = 0;
  const step = () => {
    try {
      module._gen6egg_step(message.stepSize);
      if (module._gen6egg_last_error() !== 0)
        throw new Error("Gen VI Egg Wasm step failed.");
      const resultCount = module._gen6egg_result_count();
      const resultPointer = module._gen6egg_result_ptr();
      const wordCount = resultCount * GEN6_EGG_RESULT_WORDS;
      if (
        resultCount &&
        (!resultPointer ||
          resultPointer + wordCount * 4 > module.HEAPU32.byteLength)
      )
        throw new RangeError("Gen VI Egg result pointer is invalid.");
      const raw = module.HEAPU32.slice(
        resultPointer >>> 2,
        (resultPointer >>> 2) + wordCount,
      );
      const candidates = decodeGen6EggResults(raw.buffer);
      const remaining = message.request.resultLimit - totalResults;
      const indexes = candidates
        .map((result, index) =>
          gen6EggResultPassesFilters(message.request, result) ? index : -1,
        )
        .filter((index) => index >= 0)
        .slice(0, remaining);
      const accepted = new Uint32Array(indexes.length * GEN6_EGG_RESULT_WORDS);
      indexes.forEach((sourceIndex, targetIndex) =>
        accepted.set(
          raw.subarray(
            sourceIndex * GEN6_EGG_RESULT_WORDS,
            (sourceIndex + 1) * GEN6_EGG_RESULT_WORDS,
          ),
          targetIndex * GEN6_EGG_RESULT_WORDS,
        ),
      );
      totalResults += indexes.length;
      const wasmDone = module._gen6egg_done() === 1;
      const limitReached =
        totalResults >= message.request.resultLimit && !wasmDone;
      const done = wasmDone || limitReached;
      const buffer = accepted.buffer;
      post(
        {
          type: "batch",
          moduleId: "gen6egg",
          apiVersion: GEN6_EGG_API_VERSION,
          taskId: message.taskId,
          batchIndex: batchIndex++,
          buffer,
          resultCount: indexes.length,
          totalProcessed: module._gen6egg_total_processed(),
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
        moduleId: "gen6egg",
        apiVersion: GEN6_EGG_API_VERSION,
        taskId: message.taskId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  step();
}

scope.onmessage = async ({ data }: MessageEvent<Gen6EggWorkerRequest>) => {
  try {
    if (data.moduleId !== "gen6egg")
      throw new Error("Unexpected Worker module id.");
    if (data.type === "init") await initialize(data);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6egg",
      apiVersion: GEN6_EGG_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
