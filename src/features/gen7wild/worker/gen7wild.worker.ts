/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen7WildRequest,
  GEN7_WILD_API_VERSION,
  GEN7_WILD_REQUEST_WORDS,
  GEN7_WILD_RESULT_WORDS,
} from "../domain";
import type {
  Gen7WildWorkerBatch,
  Gen7WildWorkerRequest,
  Gen7WildWorkerResponse,
} from "./messages";

interface Gen7WildWasmModule {
  HEAPU32: Uint32Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _gen7wild_api_version(): number;
  _gen7wild_begin(pointer: number): number;
  _gen7wild_step(maximumStates: number): number;
  _gen7wild_result_ptr(): number;
  _gen7wild_result_count(): number;
  _gen7wild_step_processed(): number;
  _gen7wild_total_processed(): number;
  _gen7wild_total_results(): number;
  _gen7wild_done(): number;
  _gen7wild_limit_reached(): number;
  _gen7wild_last_error(): number;
}

type Gen7WildModuleFactory = (options?: {
  locateFile?(path: string): string;
}) => Promise<Gen7WildWasmModule>;

const scope = self as DedicatedWorkerGlobalScope;
let moduleInstance: Gen7WildWasmModule | undefined;
let initializedUrl = "";

function send(message: Gen7WildWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function initialize(
  message: Extract<Gen7WildWorkerRequest, { type: "init" }>,
) {
  if (
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN7_WILD_API_VERSION
  ) {
    throw new Error("Gen 7 Wild Worker contract version mismatch.");
  }
  if (moduleInstance && initializedUrl === message.moduleUrl) {
    send({
      type: "ready",
      moduleId: "gen7wild",
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN7_WILD_API_VERSION,
      operations: ["generator"],
    });
    return;
  }
  const imported = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default: Gen7WildModuleFactory;
  };
  const wasmUrl = new URL("gen7wild.wasm", message.moduleUrl).href;
  moduleInstance = await imported.default({
    locateFile: (path) => (path.endsWith(".wasm") ? wasmUrl : path),
  });
  if (moduleInstance._gen7wild_api_version() !== GEN7_WILD_API_VERSION) {
    throw new Error("Gen 7 Wild Wasm API version mismatch.");
  }
  initializedUrl = message.moduleUrl;
  send({
    type: "ready",
    moduleId: "gen7wild",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN7_WILD_API_VERSION,
    operations: ["generator"],
  });
}

function runTask(message: Extract<Gen7WildWorkerRequest, { type: "task" }>) {
  const wasm = moduleInstance;
  if (!wasm) throw new Error("Gen 7 Wild Worker is not initialized.");
  if (message.apiVersion !== GEN7_WILD_API_VERSION) {
    throw new Error("Gen 7 Wild task API version mismatch.");
  }
  const packed = encodeGen7WildRequest(message.request);
  if (packed.length !== GEN7_WILD_REQUEST_WORDS) {
    throw new Error("Gen 7 Wild packed request length mismatch.");
  }
  const pointer = wasm._malloc(packed.byteLength);
  if (!pointer) throw new Error("Gen 7 Wild request allocation failed.");
  try {
    wasm.HEAPU32.set(packed, pointer >>> 2);
    if (wasm._gen7wild_begin(pointer) !== 1) {
      throw new Error(
        `Gen 7 Wild begin failed with error ${wasm._gen7wild_last_error()}.`,
      );
    }
  } finally {
    wasm._free(pointer);
  }

  let batchIndex = 0;
  const step = () => {
    try {
      wasm._gen7wild_step(message.stepSize);
      const error = wasm._gen7wild_last_error();
      if (error !== 0)
        throw new Error(`Gen 7 Wild step failed with error ${error}.`);
      const resultCount = wasm._gen7wild_result_count();
      const resultPointer = wasm._gen7wild_result_ptr();
      const wordCount = resultCount * GEN7_WILD_RESULT_WORDS;
      const words =
        wordCount === 0
          ? new Uint32Array()
          : wasm.HEAPU32.slice(
              resultPointer >>> 2,
              (resultPointer >>> 2) + wordCount,
            );
      const buffer = words.buffer;
      const response: Gen7WildWorkerBatch = {
        type: "batch",
        moduleId: "gen7wild",
        apiVersion: GEN7_WILD_API_VERSION,
        taskId: message.taskId,
        operation: "generator",
        batchIndex: batchIndex++,
        buffer,
        resultCount,
        totalProcessed: wasm._gen7wild_total_processed(),
        totalResultCount: wasm._gen7wild_total_results(),
        done: wasm._gen7wild_done() === 1,
        limitReached: wasm._gen7wild_limit_reached() === 1,
      };
      send(response, [buffer]);
      if (!response.done) setTimeout(step, 0);
    } catch (error) {
      send({
        type: "error",
        moduleId: "gen7wild",
        apiVersion: GEN7_WILD_API_VERSION,
        taskId: message.taskId,
        message: errorMessage(error),
      });
    }
  };
  step();
}

scope.onmessage = async ({ data }: MessageEvent<Gen7WildWorkerRequest>) => {
  try {
    if (data.moduleId !== "gen7wild")
      throw new Error("Unexpected Worker module id.");
    if (data.type === "init") await initialize(data);
    else runTask(data);
  } catch (error) {
    send({
      type: "error",
      moduleId: "gen7wild",
      apiVersion: GEN7_WILD_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: errorMessage(error),
    });
  }
};
