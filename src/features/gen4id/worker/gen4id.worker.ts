/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN4_ID_API_VERSION,
  gen4IdFilterModeToWasm,
  type Gen4IdGeneratorRequest,
} from "../domain";
import type { Gen4IdWorkerRequest, Gen4IdWorkerResponse } from "./messages";

interface Gen4IdEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen4id_api_version(): number;
  _gen4id_generate(...args: number[]): number;
  _gen4id_search(...args: number[]): number;
  _gen4id_result_ptr(): number;
  _gen4id_result_count(): number;
  _gen4id_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen4IdEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen4IdEmscriptenModule | undefined;

function post(message: Gen4IdWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen4IdWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen4id" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN4_ID_API_VERSION
  )
    throw new Error("Gen4 ID Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen4 ID Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen4id_api_version();
  if (apiVersion !== GEN4_ID_API_VERSION)
    throw new Error(`Gen4 ID Wasm API ${apiVersion} does not match the UI.`);
  post({
    type: "ready",
    moduleId: "gen4id",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator", "searcher"],
  });
}

function calculate(message: Extract<Gen4IdWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen4 ID Wasm module is not initialized.");
  const { request, chunk } = message;
  const values = request.filters.values;
  const pointer = values.length === 0 ? 0 : wasm._malloc(values.length * 4);
  try {
    if (pointer !== 0) wasm.HEAPU32.set(values, pointer >>> 2);
    const filterCount =
      values.length /
      (request.filters.mode === "tidSid" || request.filters.mode === "tidPid"
        ? 2
        : 1);
    const startedAt = performance.now();
    const resultCount =
      request.operation === "generator"
        ? wasm._gen4id_generate(
            chunk.second!,
            chunk.minDelay,
            chunk.maxDelay,
            request.year,
            (request as Gen4IdGeneratorRequest).month,
            (request as Gen4IdGeneratorRequest).day,
            (request as Gen4IdGeneratorRequest).hour,
            (request as Gen4IdGeneratorRequest).minute,
            gen4IdFilterModeToWasm(request.filters.mode),
            pointer,
            filterCount,
          )
        : wasm._gen4id_search(
            chunk.minDelay,
            chunk.maxDelay,
            request.year,
            gen4IdFilterModeToWasm(request.filters.mode),
            pointer,
            filterCount,
          );
    const error = wasm._gen4id_last_error();
    if (error !== 0) throw new Error(`Gen4 ID Wasm returned error ${error}.`);
    if (resultCount !== wasm._gen4id_result_count())
      throw new Error("Gen4 ID Wasm result count changed before copy.");
    const resultPointer = wasm._gen4id_result_ptr() >>> 2;
    const words = wasm.HEAPU32.slice(
      resultPointer,
      resultPointer + resultCount * 6,
    );
    post(
      {
        type: "batch",
        moduleId: "gen4id",
        apiVersion: GEN4_ID_API_VERSION,
        taskId: message.taskId,
        operation: request.operation,
        chunkIndex: chunk.index,
        processedCount: chunk.stateCount,
        resultCount,
        elapsedMs: performance.now() - startedAt,
        buffer: words.buffer,
      },
      [words.buffer],
    );
  } finally {
    if (pointer !== 0) wasm._free(pointer);
  }
}

scope.onmessage = async ({ data }: MessageEvent<Gen4IdWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else calculate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen4id",
      apiVersion: GEN4_ID_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code:
        data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
