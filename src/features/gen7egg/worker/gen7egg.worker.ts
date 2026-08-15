/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen7EggRequest,
  GEN7_EGG_API_VERSION,
  GEN7_EGG_REQUEST_WORDS,
  GEN7_EGG_RESULT_WORDS,
} from "../domain";
import type {
  Gen7EggWorkerBatch,
  Gen7EggWorkerRequest,
  Gen7EggWorkerResponse,
} from "./messages";

interface Gen7EggWasmModule {
  HEAPU32: Uint32Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _gen7egg_api_version(): number;
  _gen7egg_begin(pointer: number): number;
  _gen7egg_step(maximumStates: number): number;
  _gen7egg_result_ptr(): number;
  _gen7egg_result_count(): number;
  _gen7egg_total_processed(): number;
  _gen7egg_total_results(): number;
  _gen7egg_done(): number;
  _gen7egg_limit_reached(): number;
  _gen7egg_target_found(): number;
  _gen7egg_summary_accepts(): number;
  _gen7egg_summary_rejects(): number;
  _gen7egg_last_error(): number;
}

type Gen7EggModuleFactory = (options?: {
  locateFile?(path: string): string;
}) => Promise<Gen7EggWasmModule>;

const scope = self as DedicatedWorkerGlobalScope;
let moduleInstance: Gen7EggWasmModule | undefined;
let initializedUrl = "";

function send(message: Gen7EggWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function initialize(
  message: Extract<Gen7EggWorkerRequest, { type: "init" }>,
) {
  if (
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN7_EGG_API_VERSION
  ) {
    throw new Error("Gen 7 Egg Worker contract version mismatch.");
  }
  if (moduleInstance && initializedUrl === message.moduleUrl) {
    send({
      type: "ready",
      moduleId: "gen7egg",
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN7_EGG_API_VERSION,
      operations: ["generator"],
    });
    return;
  }
  const imported = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default: Gen7EggModuleFactory;
  };
  const wasmUrl = new URL("gen7egg.wasm", message.moduleUrl).href;
  moduleInstance = await imported.default({
    locateFile: (path) => (path.endsWith(".wasm") ? wasmUrl : path),
  });
  if (moduleInstance._gen7egg_api_version() !== GEN7_EGG_API_VERSION) {
    throw new Error("Gen 7 Egg Wasm API version mismatch.");
  }
  initializedUrl = message.moduleUrl;
  send({
    type: "ready",
    moduleId: "gen7egg",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN7_EGG_API_VERSION,
    operations: ["generator"],
  });
}

function runTask(message: Extract<Gen7EggWorkerRequest, { type: "task" }>) {
  const wasm = moduleInstance;
  if (!wasm) throw new Error("Gen 7 Egg Worker is not initialized.");
  if (message.apiVersion !== GEN7_EGG_API_VERSION) {
    throw new Error("Gen 7 Egg task API version mismatch.");
  }
  const packed = encodeGen7EggRequest(message.request);
  if (packed.length !== GEN7_EGG_REQUEST_WORDS) {
    throw new Error("Gen 7 Egg packed request length mismatch.");
  }
  const pointer = wasm._malloc(packed.byteLength);
  if (!pointer) throw new Error("Gen 7 Egg request allocation failed.");
  try {
    wasm.HEAPU32.set(packed, pointer >>> 2);
    if (wasm._gen7egg_begin(pointer) !== 1) {
      throw new Error(
        `Gen 7 Egg begin failed with error ${wasm._gen7egg_last_error()}.`,
      );
    }
  } finally {
    wasm._free(pointer);
  }

  let batchIndex = 0;
  const step = () => {
    try {
      wasm._gen7egg_step(message.stepSize);
      const error = wasm._gen7egg_last_error();
      if (error !== 0) {
        throw new Error(`Gen 7 Egg step failed with error ${error}.`);
      }
      const resultCount = wasm._gen7egg_result_count();
      const resultPointer = wasm._gen7egg_result_ptr();
      const wordCount = resultCount * GEN7_EGG_RESULT_WORDS;
      const words =
        wordCount === 0
          ? new Uint32Array()
          : wasm.HEAPU32.slice(
              resultPointer >>> 2,
              (resultPointer >>> 2) + wordCount,
            );
      const buffer = words.buffer;
      const response: Gen7EggWorkerBatch = {
        type: "batch",
        moduleId: "gen7egg",
        apiVersion: GEN7_EGG_API_VERSION,
        taskId: message.taskId,
        operation: "generator",
        batchIndex: batchIndex++,
        buffer,
        resultCount,
        totalProcessed: wasm._gen7egg_total_processed(),
        totalResultCount: wasm._gen7egg_total_results(),
        done: wasm._gen7egg_done() === 1,
        limitReached: wasm._gen7egg_limit_reached() === 1,
        targetFound: wasm._gen7egg_target_found() === 1,
        acceptedEggs: wasm._gen7egg_summary_accepts(),
        rejectedEggs: wasm._gen7egg_summary_rejects(),
      };
      send(response, [buffer]);
      if (!response.done) setTimeout(step, 0);
    } catch (error) {
      send({
        type: "error",
        moduleId: "gen7egg",
        apiVersion: GEN7_EGG_API_VERSION,
        taskId: message.taskId,
        message: errorMessage(error),
      });
    }
  };
  step();
}

scope.onmessage = async ({ data }: MessageEvent<Gen7EggWorkerRequest>) => {
  try {
    if (data.moduleId !== "gen7egg") {
      throw new Error("Unexpected Worker module id.");
    }
    if (data.type === "init") await initialize(data);
    else runTask(data);
  } catch (error) {
    send({
      type: "error",
      moduleId: "gen7egg",
      apiVersion: GEN7_EGG_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: errorMessage(error),
    });
  }
};
