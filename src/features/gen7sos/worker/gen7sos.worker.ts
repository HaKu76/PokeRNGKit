/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen7SosRequest,
  GEN7_SOS_API_VERSION,
  GEN7_SOS_REQUEST_WORDS,
  GEN7_SOS_RESULT_WORDS,
} from "../domain";
import type {
  Gen7SosWorkerBatch,
  Gen7SosWorkerRequest,
  Gen7SosWorkerResponse,
} from "./messages";

interface Gen7SosWasmModule {
  HEAPU32: Uint32Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _gen7sos_api_version(): number;
  _gen7sos_begin(pointer: number): number;
  _gen7sos_step(maximumStates: number): number;
  _gen7sos_result_ptr(): number;
  _gen7sos_result_count(): number;
  _gen7sos_step_processed(): number;
  _gen7sos_total_processed(): number;
  _gen7sos_total_results(): number;
  _gen7sos_done(): number;
  _gen7sos_limit_reached(): number;
  _gen7sos_last_error(): number;
}

type Gen7SosModuleFactory = (options?: {
  locateFile?(path: string): string;
}) => Promise<Gen7SosWasmModule>;

const scope = self as DedicatedWorkerGlobalScope;
let moduleInstance: Gen7SosWasmModule | undefined;
let initializedUrl = "";

function send(message: Gen7SosWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function initialize(
  message: Extract<Gen7SosWorkerRequest, { type: "init" }>,
) {
  if (
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN7_SOS_API_VERSION
  ) {
    throw new Error("Gen 7 SOS Worker contract version mismatch.");
  }
  if (moduleInstance && initializedUrl === message.moduleUrl) {
    send({
      type: "ready",
      moduleId: "gen7sos",
      contractVersion: RNG_MODULE_CONTRACT_VERSION,
      apiVersion: GEN7_SOS_API_VERSION,
      operations: ["generator"],
    });
    return;
  }
  const imported = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default: Gen7SosModuleFactory;
  };
  const wasmUrl = new URL("gen7sos.wasm", message.moduleUrl).href;
  moduleInstance = await imported.default({
    locateFile: (path) => (path.endsWith(".wasm") ? wasmUrl : path),
  });
  if (moduleInstance._gen7sos_api_version() !== GEN7_SOS_API_VERSION) {
    throw new Error("Gen 7 SOS Wasm API version mismatch.");
  }
  initializedUrl = message.moduleUrl;
  send({
    type: "ready",
    moduleId: "gen7sos",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN7_SOS_API_VERSION,
    operations: ["generator"],
  });
}

function runTask(message: Extract<Gen7SosWorkerRequest, { type: "task" }>) {
  const wasm = moduleInstance;
  if (!wasm) throw new Error("Gen 7 SOS Worker is not initialized.");
  if (message.apiVersion !== GEN7_SOS_API_VERSION) {
    throw new Error("Gen 7 SOS task API version mismatch.");
  }
  const packed = encodeGen7SosRequest(message.request);
  if (packed.length !== GEN7_SOS_REQUEST_WORDS) {
    throw new Error("Gen 7 SOS packed request length mismatch.");
  }
  const pointer = wasm._malloc(packed.byteLength);
  if (!pointer) throw new Error("Gen 7 SOS request allocation failed.");
  try {
    wasm.HEAPU32.set(packed, pointer >>> 2);
    if (wasm._gen7sos_begin(pointer) !== 1) {
      throw new Error(
        `Gen 7 SOS begin failed with error ${wasm._gen7sos_last_error()}.`,
      );
    }
  } finally {
    wasm._free(pointer);
  }

  let batchIndex = 0;
  const step = () => {
    try {
      wasm._gen7sos_step(message.stepSize);
      const error = wasm._gen7sos_last_error();
      if (error !== 0)
        throw new Error(`Gen 7 SOS step failed with error ${error}.`);
      const resultCount = wasm._gen7sos_result_count();
      const resultPointer = wasm._gen7sos_result_ptr();
      const wordCount = resultCount * GEN7_SOS_RESULT_WORDS;
      const words =
        wordCount === 0
          ? new Uint32Array()
          : wasm.HEAPU32.slice(
              resultPointer >>> 2,
              (resultPointer >>> 2) + wordCount,
            );
      const buffer = words.buffer;
      const response: Gen7SosWorkerBatch = {
        type: "batch",
        moduleId: "gen7sos",
        apiVersion: GEN7_SOS_API_VERSION,
        taskId: message.taskId,
        operation: "generator",
        batchIndex: batchIndex++,
        buffer,
        resultCount,
        totalProcessed: wasm._gen7sos_total_processed(),
        totalResultCount: wasm._gen7sos_total_results(),
        done: wasm._gen7sos_done() === 1,
        limitReached: wasm._gen7sos_limit_reached() === 1,
      };
      send(response, [buffer]);
      if (!response.done) setTimeout(step, 0);
    } catch (error) {
      send({
        type: "error",
        moduleId: "gen7sos",
        apiVersion: GEN7_SOS_API_VERSION,
        taskId: message.taskId,
        message: errorMessage(error),
      });
    }
  };
  step();
}

scope.onmessage = async ({ data }: MessageEvent<Gen7SosWorkerRequest>) => {
  try {
    if (data.moduleId !== "gen7sos")
      throw new Error("Unexpected Worker module id.");
    if (data.type === "init") await initialize(data);
    else runTask(data);
  } catch (error) {
    send({
      type: "error",
      moduleId: "gen7sos",
      apiVersion: GEN7_SOS_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: errorMessage(error),
    });
  }
};
