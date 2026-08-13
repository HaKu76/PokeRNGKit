/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN4_CHAINED_SID_API_VERSION,
  packGen4ChainedSidEntries,
} from "../domain";
import type {
  Gen4ChainedSidWorkerRequest,
  Gen4ChainedSidWorkerResponse,
} from "./messages";

interface Gen4ChainedSidEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen4chainedsid_api_version(): number;
  _gen4chainedsid_calculate(
    tid: number,
    entries: number,
    entryCount: number,
  ): number;
  _gen4chainedsid_result_ptr(): number;
  _gen4chainedsid_result_count(): number;
  _gen4chainedsid_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen4ChainedSidEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen4ChainedSidEmscriptenModule | undefined;

function post(
  message: Gen4ChainedSidWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen4ChainedSidWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen4chainedsid" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN4_CHAINED_SID_API_VERSION
  )
    throw new Error("Gen4 chained SID Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen4 chained SID Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen4chainedsid_api_version();
  if (apiVersion !== GEN4_CHAINED_SID_API_VERSION)
    throw new Error(
      `Gen4 chained SID Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen4chainedsid",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["searcher"],
  });
}

function calculate(
  message: Extract<Gen4ChainedSidWorkerRequest, { type: "task" }>,
) {
  if (!wasm)
    throw new Error("Gen4 chained SID Wasm module is not initialized.");
  const words = packGen4ChainedSidEntries(message.request.entries);
  const entriesPointer =
    words.length === 0 ? 0 : wasm._malloc(words.byteLength);
  try {
    if (entriesPointer !== 0) wasm.HEAPU32.set(words, entriesPointer >>> 2);
    const startedAt = performance.now();
    const resultCount = wasm._gen4chainedsid_calculate(
      message.request.tid,
      entriesPointer,
      message.request.entries.length,
    );
    const error = wasm._gen4chainedsid_last_error();
    if (error !== 0)
      throw new Error(`Gen4 chained SID Wasm returned error ${error}.`);
    if (resultCount !== wasm._gen4chainedsid_result_count())
      throw new Error(
        "Gen4 chained SID Wasm result count changed before copy.",
      );
    const resultPointer = wasm._gen4chainedsid_result_ptr() >>> 2;
    const results = wasm.HEAPU32.slice(
      resultPointer,
      resultPointer + resultCount,
    );
    post(
      {
        type: "batch",
        moduleId: "gen4chainedsid",
        apiVersion: GEN4_CHAINED_SID_API_VERSION,
        taskId: message.taskId,
        operation: "searcher",
        chunkIndex: message.chunkIndex,
        processedCount: message.chunk.stateCount,
        resultCount,
        elapsedMs: performance.now() - startedAt,
        buffer: results.buffer,
      },
      [results.buffer],
    );
  } finally {
    if (entriesPointer !== 0) wasm._free(entriesPointer);
  }
}

scope.onmessage = async ({
  data,
}: MessageEvent<Gen4ChainedSidWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else calculate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen4chainedsid",
      apiVersion: GEN4_CHAINED_SID_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code:
        data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
