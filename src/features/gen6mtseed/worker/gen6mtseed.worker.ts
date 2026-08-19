/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6MtSeedResults,
  encodeGen6MtSeedRequest,
  GEN6_MT_SEED_API_VERSION,
  GEN6_MT_SEED_REQUEST_WORDS,
  GEN6_MT_SEED_RESULT_WORDS,
} from "../domain";
import type {
  Gen6MtSeedWorkerRequest,
  Gen6MtSeedWorkerResponse,
} from "./messages";

interface WasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6mtseed_api_version(): number;
  _gen6mtseed_begin(pointer: number): number;
  _gen6mtseed_step(maximumStates: number): number;
  _gen6mtseed_result_ptr(): number;
  _gen6mtseed_result_count(): number;
  _gen6mtseed_step_processed(): number;
  _gen6mtseed_total_processed(): number;
  _gen6mtseed_done(): number;
  _gen6mtseed_limit_reached(): number;
  _gen6mtseed_last_error(): number;
}
type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<WasmModule>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: WasmModule | undefined;

function post(
  message: Gen6MtSeedWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen6MtSeedWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen6mtseed" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_MT_SEED_API_VERSION
  )
    throw new Error("Gen VI MT Seed Worker contract mismatch.");
  const imported = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof imported.default !== "function")
    throw new TypeError("Gen VI MT Seed Wasm factory is missing.");
  wasm = await imported.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6mtseed_api_version() !== GEN6_MT_SEED_API_VERSION)
    throw new Error("Gen VI MT Seed Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6mtseed",
    apiVersion: GEN6_MT_SEED_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["searcher"],
  });
}

function run(message: Extract<Gen6MtSeedWorkerRequest, { type: "task" }>) {
  const module = wasm;
  if (!module) throw new Error("Gen VI MT Seed Wasm is not initialized.");
  const request = encodeGen6MtSeedRequest(message.request);
  if (request.length !== GEN6_MT_SEED_REQUEST_WORDS)
    throw new Error("Gen VI MT Seed request packing changed.");
  const pointer = module._malloc(request.byteLength);
  if (!pointer) throw new Error("Gen VI MT Seed Wasm allocation failed.");
  try {
    module.HEAPU32.set(request, pointer >>> 2);
    if (
      module._gen6mtseed_begin(pointer) !== 1 ||
      module._gen6mtseed_last_error() !== 0
    )
      throw new Error("Gen VI MT Seed Wasm begin failed.");
  } finally {
    module._free(pointer);
  }
  let totalResults = 0;
  const step = () => {
    try {
      module._gen6mtseed_step(message.stepSize);
      if (module._gen6mtseed_last_error() !== 0)
        throw new Error("Gen VI MT Seed Wasm step failed.");
      const resultCount = module._gen6mtseed_result_count();
      const resultPointer = module._gen6mtseed_result_ptr();
      const wordCount = resultCount * GEN6_MT_SEED_RESULT_WORDS;
      if (
        resultCount > message.stepSize ||
        module._gen6mtseed_step_processed() > message.stepSize ||
        (resultCount > 0 &&
          (!resultPointer ||
            resultPointer + wordCount * 4 > module.HEAPU32.byteLength))
      )
        throw new RangeError("Gen VI MT Seed result pointer is invalid.");
      const raw = resultCount
        ? module.HEAPU32.slice(
            resultPointer >>> 2,
            (resultPointer >>> 2) + wordCount,
          )
        : new Uint32Array();
      const batch = decodeGen6MtSeedResults(raw.buffer);
      totalResults += batch.length;
      const done =
        module._gen6mtseed_done() === 1 ||
        module._gen6mtseed_limit_reached() === 1;
      const buffer = raw.buffer;
      post(
        {
          type: "batch",
          moduleId: "gen6mtseed",
          apiVersion: GEN6_MT_SEED_API_VERSION,
          taskId: message.taskId,
          buffer,
          resultCount: batch.length,
          totalProcessed: module._gen6mtseed_total_processed(),
          totalResultCount: totalResults,
          done,
          limitReached: module._gen6mtseed_limit_reached() === 1,
        },
        [buffer],
      );
      if (!done) setTimeout(step, 0);
    } catch (error) {
      post({
        type: "error",
        moduleId: "gen6mtseed",
        apiVersion: GEN6_MT_SEED_API_VERSION,
        taskId: message.taskId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  step();
}

scope.onmessage = async ({ data }: MessageEvent<Gen6MtSeedWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6mtseed",
      apiVersion: GEN6_MT_SEED_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
