/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6TinyRockSmashResults,
  encodeGen6TinyRockSmashRequest,
  GEN6_TINY_ROCKSMASH_API_VERSION,
  GEN6_TINY_ROCKSMASH_REQUEST_WORDS,
  GEN6_TINY_ROCKSMASH_RESULT_WORDS,
} from "../domain";
import type {
  Gen6TinyRockSmashWorkerRequest,
  Gen6TinyRockSmashWorkerResponse,
} from "./messages";

interface WasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6tinyrocksmash_api_version(): number;
  _gen6tinyrocksmash_begin(pointer: number): number;
  _gen6tinyrocksmash_step(maximumStates: number): number;
  _gen6tinyrocksmash_result_ptr(): number;
  _gen6tinyrocksmash_result_count(): number;
  _gen6tinyrocksmash_step_processed(): number;
  _gen6tinyrocksmash_total_processed(): number;
  _gen6tinyrocksmash_done(): number;
  _gen6tinyrocksmash_limit_reached(): number;
  _gen6tinyrocksmash_last_error(): number;
}
type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<WasmModule>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: WasmModule | undefined;

function post(
  message: Gen6TinyRockSmashWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen6TinyRockSmashWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen6tinyrocksmash" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_TINY_ROCKSMASH_API_VERSION
  )
    throw new Error("TinyFinder Rock Smash Worker contract mismatch.");
  const imported = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof imported.default !== "function")
    throw new TypeError("TinyFinder Rock Smash Wasm factory is missing.");
  wasm = await imported.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6tinyrocksmash_api_version() !== GEN6_TINY_ROCKSMASH_API_VERSION)
    throw new Error("TinyFinder Rock Smash Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6tinyrocksmash",
    apiVersion: GEN6_TINY_ROCKSMASH_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["generator"],
  });
}

function run(
  message: Extract<Gen6TinyRockSmashWorkerRequest, { type: "task" }>,
) {
  const module = wasm;
  if (!module)
    throw new Error("TinyFinder Rock Smash Wasm is not initialized.");
  const request = encodeGen6TinyRockSmashRequest(message.request);
  if (request.length !== GEN6_TINY_ROCKSMASH_REQUEST_WORDS)
    throw new Error("TinyFinder Rock Smash request packing changed.");
  const pointer = module._malloc(request.byteLength);
  if (!pointer)
    throw new Error("TinyFinder Rock Smash Wasm allocation failed.");
  try {
    module.HEAPU32.set(request, pointer >>> 2);
    if (
      module._gen6tinyrocksmash_begin(pointer) !== 1 ||
      module._gen6tinyrocksmash_last_error() !== 0
    )
      throw new Error("TinyFinder Rock Smash Wasm begin failed.");
  } finally {
    module._free(pointer);
  }

  let batchIndex = 0;
  let totalResults = 0;
  const step = () => {
    try {
      module._gen6tinyrocksmash_step(message.stepSize);
      if (module._gen6tinyrocksmash_last_error() !== 0)
        throw new Error("TinyFinder Rock Smash Wasm step failed.");
      const resultCount = module._gen6tinyrocksmash_result_count();
      const resultPointer = module._gen6tinyrocksmash_result_ptr();
      const wordCount = resultCount * GEN6_TINY_ROCKSMASH_RESULT_WORDS;
      if (
        resultCount > message.stepSize ||
        module._gen6tinyrocksmash_step_processed() > message.stepSize ||
        (resultCount > 0 &&
          (!resultPointer ||
            resultPointer + wordCount * 4 > module.HEAPU32.byteLength))
      )
        throw new RangeError(
          "TinyFinder Rock Smash result pointer is invalid.",
        );
      const raw = module.HEAPU32.slice(
        resultPointer >>> 2,
        (resultPointer >>> 2) + wordCount,
      );
      const batch = decodeGen6TinyRockSmashResults(raw.buffer);
      totalResults += batch.length;
      const done =
        module._gen6tinyrocksmash_done() === 1 ||
        totalResults >= message.request.resultLimit;
      const buffer = batch.length ? raw.buffer : new Uint32Array().buffer;
      post(
        {
          type: "batch",
          moduleId: "gen6tinyrocksmash",
          apiVersion: GEN6_TINY_ROCKSMASH_API_VERSION,
          taskId: message.taskId,
          batchIndex: batchIndex++,
          buffer,
          resultCount: batch.length,
          totalProcessed: module._gen6tinyrocksmash_total_processed(),
          totalResultCount: totalResults,
          done,
          limitReached:
            module._gen6tinyrocksmash_limit_reached() === 1 ||
            totalResults >= message.request.resultLimit,
        },
        [buffer],
      );
      if (!done) setTimeout(step, 0);
    } catch (error) {
      post({
        type: "error",
        moduleId: "gen6tinyrocksmash",
        apiVersion: GEN6_TINY_ROCKSMASH_API_VERSION,
        taskId: message.taskId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  step();
}

scope.onmessage = async ({
  data,
}: MessageEvent<Gen6TinyRockSmashWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6tinyrocksmash",
      apiVersion: GEN6_TINY_ROCKSMASH_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
